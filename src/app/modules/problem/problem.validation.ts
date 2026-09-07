import { z } from 'zod';
import { DifficultyLevel, ProblemType } from '../../../generated/prisma/enums';

const createProblemValidationSchema = z.object({
  title: z.string({ error: 'Problem title is required' }).min(3),
  slug: z.string().optional(),
  description: z.string({ error: 'Problem description is required' }).min(10),
  difficulty: z.enum([DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD]).optional(),
  problemType: z.enum([ProblemType.CODING, ProblemType.MCQ, ProblemType.SINGLE_CHOICE]).optional(),
  points: z.number().int().positive().optional(),
  timeLimitSeconds: z.number().int().positive().optional(),
  isPublic: z.boolean().optional(),
  starterCode: z.record(z.string(), z.string()).optional(),
  mcqOptions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
      }),
    )
    .optional(),
  correctAnswers: z.any().optional(),
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string(),
        isHidden: z.boolean().optional(),
      }),
    )
    .optional(),
});

const updateProblemValidationSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  difficulty: z.enum([DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD]).optional(),
  problemType: z.enum([ProblemType.CODING, ProblemType.MCQ, ProblemType.SINGLE_CHOICE]).optional(),
  points: z.number().int().positive().optional(),
  timeLimitSeconds: z.number().int().positive().optional(),
  isPublic: z.boolean().optional(),
  starterCode: z.record(z.string(), z.string()).optional(),
  mcqOptions: z.array(z.any()).optional(),
  correctAnswers: z.any().optional(),
  testCases: z.array(z.any()).optional(),
});

export const ProblemValidation = {
  createProblemValidationSchema,
  updateProblemValidationSchema,
};
