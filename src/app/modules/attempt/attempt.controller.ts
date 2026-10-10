import type { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AttemptService } from "./attempt.service";

const getMyCandidateAssessments = catchAsync(async (req: Request, res: Response) => {
  const result = await AttemptService.getMyCandidateAssessments(req.user!.userId, req.user!.email);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Candidate assessments fetched successfully!",
    data: result,
  });
});

const startAssessmentAttempt = catchAsync(async (req: Request, res: Response) => {
  const result = await AttemptService.startAssessmentAttempt(
    req.params.assessmentId as string,
    req.user!.userId,
    req.user!.email,
    req.ip,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Assessment attempt started successfully! Timer is running.",
    data: result,
  });
});

const submitProblemSolution = catchAsync(async (req: Request, res: Response) => {
  const result = await AttemptService.submitProblemSolution(
    req.params.assessmentId as string,
    req.user!.userId,
    req.user!.email,
    req.body,
    req.ip,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Solution evaluated and recorded successfully!",
    data: result,
  });
});

const finishAssessment = catchAsync(async (req: Request, res: Response) => {
  const result = await AttemptService.finishAssessment(
    req.params.assessmentId as string,
    req.user!.userId,
    req.user!.email,
    req.ip,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Assessment completed and submitted successfully!",
    data: result,
  });
});

const getAssessmentResult = catchAsync(async (req: Request, res: Response) => {
  const result = await AttemptService.getAssessmentResult(
    req.params.assessmentId as string,
    req.user!.userId,
    req.user!.email,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Assessment result retrieved successfully!",
    data: result,
  });
});

export const AttemptController = {
  getMyCandidateAssessments,
  startAssessmentAttempt,
  submitProblemSolution,
  finishAssessment,
  getAssessmentResult,
};
