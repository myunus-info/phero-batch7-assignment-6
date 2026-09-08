import express from "express";
import { AuthValidation } from "./auth.validation";
import { AuthController } from "./auth.controller";
import { authLimiter } from "../../middleware/rateLimiter";
import validateRequest from "../../middleware/validateRequest";

const router = express.Router();

router.post(
	"/register",
	authLimiter,
	validateRequest(AuthValidation.registerValidationSchema as any),
	AuthController.register,
);

router.post(
	"/login",
	authLimiter,
	validateRequest(AuthValidation.loginValidationSchema as any),
	AuthController.login,
);

router.post(
	"/google",
	authLimiter,
	validateRequest(AuthValidation.googleLoginValidationSchema as any),
	AuthController.googleLogin,
);

router.post("/refresh-token", AuthController.refreshToken);

router.post("/logout", AuthController.logout);

export const AuthRoutes = router;
