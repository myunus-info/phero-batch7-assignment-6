import { z } from 'zod';
import { UserRole } from '../../../generated/prisma/enums';

const registerValidationSchema = z.object({
  name: z.string({ error: 'Name is required' }).min(2, 'Name must be at least 2 characters'),
  email: z.string({ error: 'Email is required' }).email('Invalid email address format'),
  password: z.string({ error: 'Password is required' }).min(6, 'Password must be at least 6 characters long'),
  role: z.enum([UserRole.CANDIDATE, UserRole.RECRUITER, UserRole.ADMIN]).optional(),
  companyName: z.string().optional(),
  companyWebsite: z.string().url('Invalid URL format').optional().or(z.literal('')),
  headline: z.string().optional(),
  skills: z.array(z.string()).optional(),
});

const loginValidationSchema = z.object({
  email: z.string({ error: 'Email is required' }).email('Invalid email format'),
  password: z.string({ error: 'Password is required' }).min(1, 'Password cannot be empty'),
});

const googleLoginValidationSchema = z.object({
  idToken: z.string({ error: 'Google ID Token is required' }),
  role: z.enum([UserRole.CANDIDATE, UserRole.RECRUITER]).optional(),
});

export const AuthValidation = {
  registerValidationSchema,
  loginValidationSchema,
  googleLoginValidationSchema,
};
