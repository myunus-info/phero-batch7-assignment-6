import express from 'express';
import { UserRole } from '@prisma/client';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AdminValidation } from './admin.validation';
import { AdminController } from './admin.controller';

const router = express.Router();

router.get(
  '/users',
  auth(UserRole.ADMIN),
  AdminController.getAllUsers
);

router.patch(
  '/users/:id/status',
  auth(UserRole.ADMIN),
  validateRequest(AdminValidation.updateUserStatusValidationSchema),
  AdminController.updateUserStatusOrRole
);

router.get(
  '/dashboard-stats',
  auth(UserRole.ADMIN),
  AdminController.getDashboardStats
);

router.get(
  '/audit-logs',
  auth(UserRole.ADMIN),
  AdminController.getAuditLogs
);

export const AdminRoutes = router;
