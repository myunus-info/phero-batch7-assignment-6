import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import pick from "../../utils/pick";
import { paginationFields } from "../../constants/pagination";
import { AssessmentService } from "./assessment.service";

const createAssessment = catchAsync(async (req: Request, res: Response) => {
  const result = await AssessmentService.createAssessment(req.user!.userId, req.body, req.ip);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Assessment created successfully!",
    data: result,
  });
});

const getAllAssessments = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["searchTerm", "status", "recruiterId"]);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await AssessmentService.getAllAssessments(
    req.user!.userId,
    req.user!.role,
    filters,
    paginationOptions,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Assessments fetched successfully!",
    meta: result.meta,
    data: result.data,
  });
});

const getAssessmentById = catchAsync(async (req: Request, res: Response) => {
  const result = await AssessmentService.getAssessmentById(req.params.id as string, req.user!.userId, req.user!.role);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Assessment details retrieved successfully!",
    data: result,
  });
});

const updateAssessment = catchAsync(async (req: Request, res: Response) => {
  const result = await AssessmentService.updateAssessment(
    req.params.id as string,
    req.user!.userId,
    req.user!.role,
    req.body,
    req.ip,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Assessment updated successfully!",
    data: result,
  });
});

const softDeleteAssessment = catchAsync(async (req: Request, res: Response) => {
  const result = await AssessmentService.softDeleteAssessment(
    req.params.id as string,
    req.user!.userId,
    req.user!.role,
    req.ip,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Assessment deleted successfully!",
    data: result,
  });
});

const inviteCandidate = catchAsync(async (req: Request, res: Response) => {
  const result = await AssessmentService.inviteCandidate(req.params.id as string, req.user!.userId, req.body, req.ip);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Candidate invited successfully! 1 assessment credit deducted.",
    data: result,
  });
});

export const AssessmentController = {
  createAssessment,
  getAllAssessments,
  getAssessmentById,
  updateAssessment,
  softDeleteAssessment,
  inviteCandidate,
};
