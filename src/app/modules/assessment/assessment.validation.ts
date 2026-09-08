import { z } from 'zod';
import { AssessmentStatus } from '../../../generated/prisma/enums';

const createAssessmentValidationSchema = z.object({
  title: z.string({ error: 'Assessment title is required' }).min(3),
  description: z.string().optional(),
  durationMinutes: z.number().int().positive({ message: 'Duration must be positive in minutes' }),
  totalMarks: z.number().int().positive().optional(),
  passingMarks: z.number().int().positive({ message: 'Passing marks must be a positive integer' }),
  scheduleStart: z.string().datetime().optional(),
  scheduleEnd: z.string().datetime().optional(),
  status: z.enum([AssessmentStatus.DRAFT, AssessmentStatus.PUBLISHED, AssessmentStatus.ARCHIVED]).optional(),
  problemIds: z
    .array(
      z.object({
        problemId: z.string({ error: 'Problem ID is required' }),
        orderIndex: z.number().int().optional(),
        customPoints: z.number().int().positive().optional(),
      }),
    )
    .min(1, 'Assessment must contain at least 1 problem'),
});

const updateAssessmentValidationSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
  totalMarks: z.number().int().positive().optional(),
  passingMarks: z.number().int().positive().optional(),
  scheduleStart: z.string().datetime().optional(),
  scheduleEnd: z.string().datetime().optional(),
  status: z.enum([AssessmentStatus.DRAFT, AssessmentStatus.PUBLISHED, AssessmentStatus.ARCHIVED]).optional(),
});

const inviteCandidateValidationSchema = z.object({
  email: z.string({ error: 'Candidate email is required' }).email('Invalid email format'),
  candidateId: z.string().optional(),
});

export const AssessmentValidation = {
  createAssessmentValidationSchema,
  updateAssessmentValidationSchema,
  inviteCandidateValidationSchema,
};
