import express from "express";
import { AssessmentValidation } from "./assessment.validation";
import { AssessmentController } from "./assessment.controller";
import auth from "../../middleware/auth";
import { UserRole } from "../../../generated/prisma/enums";
import validateRequest from "../../middleware/validateRequest";

const router = express.Router();

router.post(
	"/",
	auth(UserRole.ADMIN, UserRole.RECRUITER),
	validateRequest(AssessmentValidation.createAssessmentValidationSchema as any),
	AssessmentController.createAssessment,
);

router.get(
	"/",
	auth(UserRole.ADMIN, UserRole.RECRUITER),
	AssessmentController.getAllAssessments,
);

router.get(
	"/:id",
	auth(UserRole.ADMIN, UserRole.RECRUITER, UserRole.CANDIDATE),
	AssessmentController.getAssessmentById,
);

router.patch(
	"/:id",
	auth(UserRole.ADMIN, UserRole.RECRUITER),
	validateRequest(AssessmentValidation.updateAssessmentValidationSchema as any),
	AssessmentController.updateAssessment,
);

router.delete(
	"/:id",
	auth(UserRole.ADMIN, UserRole.RECRUITER),
	AssessmentController.softDeleteAssessment,
);

router.post(
	"/:id/invite",
	auth(UserRole.RECRUITER),
	validateRequest(AssessmentValidation.inviteCandidateValidationSchema as any),
	AssessmentController.inviteCandidate,
);

export const AssessmentRoutes = router;
