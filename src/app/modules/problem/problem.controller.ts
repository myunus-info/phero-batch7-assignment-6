import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import pick from "../../utils/pick";
import { paginationFields } from "../../constants/pagination";
import { ProblemService } from "./problem.service";

const createProblem = catchAsync(async (req: Request, res: Response) => {
	const result = await ProblemService.createProblem(
		req.user!.userId,
		req.body,
		req.ip,
	);

	sendResponse(res, {
		statusCode: 201,
		success: true,
		message: "Problem created successfully!",
		data: result,
	});
});

const getAllProblems = catchAsync(async (req: Request, res: Response) => {
	const filters = pick(req.query, [
		"searchTerm",
		"difficulty",
		"problemType",
		"creatorId",
	]);
	const paginationOptions = pick(req.query, paginationFields);

	const result = await ProblemService.getAllProblems(
		filters,
		paginationOptions,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Problems fetched successfully!",
		meta: result.meta,
		data: result.data,
	});
});

const getProblemById = catchAsync(async (req: Request, res: Response) => {
	const result = await ProblemService.getProblemById(
		req.params.id as string,
		req.user?.role,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Problem retrieved successfully!",
		data: result,
	});
});

const updateProblem = catchAsync(async (req: Request, res: Response) => {
	const result = await ProblemService.updateProblem(
		req.params.id as string,
		req.user!.userId,
		req.user!.role,
		req.body,
		req.ip,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Problem updated successfully!",
		data: result,
	});
});

const softDeleteProblem = catchAsync(async (req: Request, res: Response) => {
	const result = await ProblemService.softDeleteProblem(
		req.params.id as string,
		req.user!.userId,
		req.user!.role,
		req.ip,
	);

	sendResponse(res, {
		statusCode: 200,
		success: true,
		message: "Problem soft-deleted successfully!",
		data: result,
	});
});

export const ProblemController = {
	createProblem,
	getAllProblems,
	getProblemById,
	updateProblem,
	softDeleteProblem,
};
