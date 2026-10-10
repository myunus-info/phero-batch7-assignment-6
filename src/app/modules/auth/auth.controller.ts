import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AuthService } from "./auth.service";
import handleCookies from "./auth.util";

const register = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.registerUser(req.body, req.ip);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "User registered successfully!",
    data: result,
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(req.body, req.ip);
  const { accessToken, refreshToken, ...responsePayload } = result;

  handleCookies({ type: "login", res, accessToken, refreshToken });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User logged in successfully!",
    data: responsePayload,
  });
});

const googleLogin = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.googleLogin(req.body, req.ip);
  const { accessToken, refreshToken, ...responsePayload } = result;

  handleCookies({ type: "login", res, accessToken, refreshToken });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Google login successful!",
    data: responsePayload,
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  const result = await AuthService.refreshToken(token);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Access token refreshed successfully!",
    data: result,
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  handleCookies({ type: "logout", res });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User logged out successfully!",
    data: null,
  });
});

export const AuthController = {
  register,
  login,
  googleLogin,
  refreshToken,
  logout,
};
