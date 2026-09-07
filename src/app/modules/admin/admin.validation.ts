import { z } from 'zod';
import { UserRole, UserStatus } from '../../../generated/prisma/enums';

const updateUserStatusValidationSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.BLOCKED]).optional(),
  role: z.enum([UserRole.ADMIN, UserRole.RECRUITER, UserRole.CANDIDATE]).optional(),
});

export const AdminValidation = {
  updateUserStatusValidationSchema,
};
