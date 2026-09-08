import express from "express";
import { PaymentValidation } from "./payment.validation";
import { PaymentController } from "./payment.controller";
import auth from "../../middleware/auth";
import { UserRole } from "../../../generated/prisma/enums";
import validateRequest from "../../middleware/validateRequest";

const router = express.Router();

router.post(
	"/create-checkout-session",
	auth(UserRole.RECRUITER, UserRole.ADMIN),
	validateRequest(
		PaymentValidation.createCheckoutSessionValidationSchema as any,
	),
	PaymentController.createCheckoutSession,
);

router.post(
	"/webhook",
	express.raw({ type: "application/json" }),
	PaymentController.handleWebhook,
);

router.get(
	"/my-history",
	auth(UserRole.ADMIN, UserRole.RECRUITER),
	PaymentController.getPaymentHistory,
);

export const PaymentRoutes = router;
