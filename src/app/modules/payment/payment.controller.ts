import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import pick from "../../utils/pick";
import { paginationFields } from "../../constants/pagination";
import { PaymentService } from "./payment.service";

const createCheckoutSession = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.createCheckoutSession(req.user!.userId, req.user!.email, req.body, req.ip);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Stripe checkout session initialized successfully!",
    data: result,
  });
});

const verifyCheckoutSession = catchAsync(async (req: Request, res: Response) => {
  const sessionId = (req.body.sessionId || req.query.sessionId) as string;
  const result = await PaymentService.verifyCheckoutSession(req.user!.userId, sessionId, req.ip);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: result,
  });
});

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string | undefined;
  const result = await PaymentService.handleWebhook(req.body, signature, req.ip);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: result,
  });
});

const getPaymentHistory = catchAsync(async (req: Request, res: Response) => {
  const paginationOptions = pick(req.query, paginationFields);

  const result = await PaymentService.getPaymentHistory(req.user!.userId, req.user!.role, paginationOptions);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Payment history fetched successfully!",
    meta: result.meta,
    data: result.data,
  });
});

export const PaymentController = {
  createCheckoutSession,
  verifyCheckoutSession,
  handleWebhook,
  getPaymentHistory,
};
