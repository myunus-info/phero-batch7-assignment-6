import express from "express";
import { AttemptValidation } from "./attempt.validation";
import { AttemptController } from "./attempt.controller";
import { UserRole } from "../../../generated/prisma/enums";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";

const router = express.Router();

router.get("/my-assessments", auth(UserRole.CANDIDATE), AttemptController.getMyCandidateAssessments);

router.post("/:assessmentId/start", auth(UserRole.CANDIDATE), AttemptController.startAssessmentAttempt);

router.post(
  "/:assessmentId/submit-problem",
  auth(UserRole.CANDIDATE),
  validateRequest(AttemptValidation.submitProblemSolutionValidationSchema as any),
  AttemptController.submitProblemSolution,
);

router.post("/:assessmentId/finish", auth(UserRole.CANDIDATE), AttemptController.finishAssessment);

router.get(
  "/:assessmentId/result",
  auth(UserRole.CANDIDATE, UserRole.RECRUITER, UserRole.ADMIN),
  AttemptController.getAssessmentResult,
);

export const AttemptRoutes = router;
