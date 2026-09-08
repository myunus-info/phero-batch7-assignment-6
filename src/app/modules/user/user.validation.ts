import { z } from 'zod';

const updateProfileValidationSchema = z.object({
  name: z.string().min(2).optional(),
  avatar: z.string().url().optional().or(z.literal('')),
  headline: z.string().optional(),
  githubUrl: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  skills: z.array(z.string()).optional(),
  companyName: z.string().optional(),
  companyWebsite: z.string().url().optional().or(z.literal('')),
});

export const UserValidation = {
  updateProfileValidationSchema,
};
