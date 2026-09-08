import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { UserService } from "./user.service";
import httpStatus from "http-status";

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
	const result = await UserService.getMyProfile(req.user!.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User profile retrieved successfully!",
		data: result,
	});
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
	const result = await UserService.updateMyProfile(
		req.user!.userId,
		req.body,
		req.ip,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User profile updated successfully!",
		data: result,
	});
});

export const UserController = {
	getMyProfile,
	updateMyProfile,
};
