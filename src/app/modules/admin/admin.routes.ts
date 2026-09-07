import express from 'express';
import { AdminValidation } from './admin.validation';
import { AdminController } from './admin.controller';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { UserRole } from '../../../generated/prisma/enums';

const router = express.Router();

router.get('/users', auth(UserRole.ADMIN), AdminController.getAllUsers);

router.patch(
  '/users/:id/status',
  auth(UserRole.ADMIN),
  validateRequest(AdminValidation.updateUserStatusValidationSchema as any),
  AdminController.updateUserStatusOrRole,
);

router.get('/dashboard-stats', auth(UserRole.ADMIN), AdminController.getDashboardStats);

router.get('/audit-logs', auth(UserRole.ADMIN), AdminController.getAuditLogs);

export const AdminRoutes = router;
