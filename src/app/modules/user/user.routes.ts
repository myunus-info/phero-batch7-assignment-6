import express from 'express';
import { UserValidation } from './user.validation';
import { UserController } from './user.controller';
import auth from '../../middleware/auth';
import { UserRole } from '../../../generated/prisma/enums';
import validateRequest from '../../middleware/validateRequest';

const router = express.Router();

router.get('/me', auth(UserRole.ADMIN, UserRole.RECRUITER, UserRole.CANDIDATE), UserController.getMyProfile);

router.patch(
  '/me',
  auth(UserRole.ADMIN, UserRole.RECRUITER, UserRole.CANDIDATE),
  validateRequest(UserValidation.updateProfileValidationSchema as any),
  UserController.updateMyProfile,
);

export const UserRoutes = router;
