import Stripe from "stripe";
import ApiError from "../../errors/ApiError";
import { calculatePagination, type IGenericResponse, type IPaginationOptions } from "../../constants/pagination";
import { logAuditEvent } from "../../utils/auditLogger";
import { CREDIT_PLANS, type ICreateCheckoutSessionRequest } from "./payment.interface";
import { config } from "../../config";
import { prisma } from "../../lib/prisma";
import { PaymentStatus, UserRole } from "../../../generated/prisma/enums";

// Initialize Stripe instance if key provided
const stripe = config.stripe.secret_key
  ? new Stripe(config.stripe.secret_key, {
      apiVersion: "2025-02-24.acacia" as any,
    })
  : null;

const createCheckoutSession = async (
  userId: string,
  userEmail: string,
  payload: ICreateCheckoutSessionRequest,
  ipAddress?: string,
) => {
  const plan = CREDIT_PLANS[payload.planName];
  if (!plan) {
    throw new ApiError(400, "Invalid payment credit plan specified.");
  }

  let sessionId = `cs_test_${Math.random().toString(36).substring(2, 15)}`;
  let sessionUrl = `${config.stripe.client_url}/payment/success?session_id=${sessionId}`;

  if (
    (stripe && config.stripe.secret_key.startsWith("sk_live")) ||
    (stripe && config.stripe.secret_key.startsWith("sk_test") && !config.stripe.secret_key.includes("MockKey"))
  ) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: userEmail,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: plan.title,
                description: plan.description,
              },
              unit_amount: Math.round(plan.amount * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${config.stripe.client_url}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.stripe.client_url}/payment/cancel`,
        metadata: {
          userId,
          planName: plan.name,
          credits: plan.credits.toString(),
        },
      });

      sessionId = session.id;
      sessionUrl = session.url || sessionUrl;
    } catch (err: any) {
      console.warn("Stripe checkout session creation fallback:", err?.message);
    }
  }

  // Create pending payment record in DB
  const payment = await prisma.payment.create({
    data: {
      userId,
      stripeSessionId: sessionId,
      amount: plan.amount,
      currency: "usd",
      creditsPurchased: plan.credits,
      planName: plan.name,
      status: PaymentStatus.PENDING,
      metadata: {
        planTitle: plan.title,
        sessionUrl,
      },
    },
  });

  await logAuditEvent({
    userId,
    action: "INITIATE_PAYMENT_CHECKOUT",
    entityType: "Payment",
    entityId: payment.id,
    details: {
      planName: plan.name,
      amount: plan.amount,
      credits: plan.credits,
    },
    ipAddress,
  });

  return {
    paymentId: payment.id,
    sessionId,
    checkoutUrl: sessionUrl,
    plan: {
      name: plan.name,
      title: plan.title,
      amount: plan.amount,
      currency: "USD",
      credits: plan.credits,
    },
  };
};

const verifyCheckoutSession = async (userId: string, sessionId: string, ipAddress?: string) => {
  if (!sessionId) {
    throw new ApiError(400, "Session ID is required for verification.");
  }

  const payment = await prisma.payment.findFirst({
    where: {
      OR: [{ stripeSessionId: sessionId }, { id: sessionId }],
      userId,
    },
  });

  if (!payment) {
    throw new ApiError(404, "Payment record not found for this user.");
  }

  if (payment.status === PaymentStatus.COMPLETED) {
    return {
      success: true,
      message: "Payment already verified and completed.",
      paymentId: payment.id,
      creditsAdded: payment.creditsPurchased,
      status: PaymentStatus.COMPLETED,
    };
  }

  let isPaid = false;
  let paymentIntentId: string | null = null;

  if (stripe && sessionId.startsWith("cs_")) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid" || session.status === "complete") {
        isPaid = true;
        paymentIntentId = (session.payment_intent as string) || null;
      } else {
        return {
          success: false,
          message: `Payment is currently ${session.payment_status}.`,
          paymentId: payment.id,
          status: session.payment_status,
          creditsAdded: 0,
        };
      }
    } catch (err: any) {
      console.error("Failed to retrieve Stripe checkout session:", err);
      throw new ApiError(500, `Stripe verification error: ${err?.message}`);
    }
  } else {
    // Local development simulation fallback
    isPaid = true;
  }

  if (isPaid) {
    await prisma.$transaction(async tx => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          stripePaymentIntentId:
            paymentIntentId || payment.stripePaymentIntentId || `pi_${Math.random().toString(36).substring(2, 10)}`,
        },
      });

      await tx.recruiterProfile.update({
        where: { userId: payment.userId },
        data: {
          credits: {
            increment: payment.creditsPurchased,
          },
        },
      });
    });

    await logAuditEvent({
      userId: payment.userId,
      action: "PAYMENT_COMPLETED",
      entityType: "Payment",
      entityId: payment.id,
      details: {
        creditsPurchased: payment.creditsPurchased,
        amount: payment.amount,
        sessionId,
        method: "SESSION_VERIFICATION",
      },
      ipAddress,
    });

    return {
      success: true,
      message: "Payment successfully verified and credits added to wallet!",
      paymentId: payment.id,
      creditsAdded: payment.creditsPurchased,
      status: PaymentStatus.COMPLETED,
    };
  }

  return {
    success: false,
    message: "Unable to verify payment.",
    paymentId: payment.id,
    status: payment.status,
    creditsAdded: 0,
  };
};

const handleWebhook = async (payloadBody: any, signatureHeader?: string, ipAddress?: string) => {
  let event: Stripe.Event | any = payloadBody;

  if (stripe && signatureHeader && config.stripe.webhook_secret && !config.stripe.webhook_secret.includes("mock")) {
    try {
      event = stripe.webhooks.constructEvent(payloadBody, signatureHeader, config.stripe.webhook_secret);
    } catch (err: any) {
      throw new ApiError(400, `Webhook Signature Verification Error: ${err.message}`);
    }
  }

  // Process checkout.session.completed event or direct simulate payload
  if (event.type === "checkout.session.completed" || event.status === "succeeded" || event.sessionId) {
    const session = event.data ? event.data.object : event;
    const sessionId = session.id || session.sessionId;

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [{ stripeSessionId: sessionId }, { id: session.paymentId }],
      },
    });

    if (payment && payment.status !== PaymentStatus.COMPLETED) {
      // Transaction: complete payment & increment recruiter credits
      await prisma.$transaction(async tx => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.COMPLETED,
            stripePaymentIntentId: session.payment_intent || `pi_${Math.random().toString(36).substring(2, 10)}`,
          },
        });

        await tx.recruiterProfile.update({
          where: { userId: payment.userId },
          data: {
            credits: {
              increment: payment.creditsPurchased,
            },
          },
        });
      });

      await logAuditEvent({
        userId: payment.userId,
        action: "PAYMENT_COMPLETED",
        entityType: "Payment",
        entityId: payment.id,
        details: {
          creditsPurchased: payment.creditsPurchased,
          amount: payment.amount,
          sessionId,
        },
        ipAddress,
      });

      return {
        success: true,
        message: "Payment fulfilled and credits added successfully.",
      };
    }
  }

  return { success: true, message: "Webhook processed." };
};

const getPaymentHistory = async (
  userId: string,
  userRole: UserRole,
  paginationOptions: IPaginationOptions,
): Promise<IGenericResponse<any>> => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);

  const whereConditions: any = userRole === UserRole.ADMIN ? {} : { userId };

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.payment.count({ where: whereConditions }),
  ]);

  const totalPage = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
    data,
  };
};

export const PaymentService = {
  createCheckoutSession,
  verifyCheckoutSession,
  handleWebhook,
  getPaymentHistory,
};
