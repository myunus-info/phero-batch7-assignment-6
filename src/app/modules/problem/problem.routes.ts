import express from 'express';
import { ProblemValidation } from './problem.validation';
import { ProblemController } from './problem.controller';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { UserRole } from '../../../generated/prisma/enums';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.ADMIN, UserRole.RECRUITER),
  validateRequest(ProblemValidation.createProblemValidationSchema as any),
  ProblemController.createProblem,
);

router.get(
  '/',
  auth(UserRole.ADMIN, UserRole.RECRUITER, UserRole.CANDIDATE),
  ProblemController.getAllProblems,
);

router.get(
  '/:id',
  auth(UserRole.ADMIN, UserRole.RECRUITER, UserRole.CANDIDATE),
  ProblemController.getProblemById,
);

router.patch(
  '/:id',
  auth(UserRole.ADMIN, UserRole.RECRUITER),
  validateRequest(ProblemValidation.updateProblemValidationSchema as any),
  ProblemController.updateProblem,
);

router.delete('/:id', auth(UserRole.ADMIN, UserRole.RECRUITER), ProblemController.softDeleteProblem);

export const ProblemRoutes = router;
