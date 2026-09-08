import { z } from "zod";

const submitProblemSolutionValidationSchema = z.object({
	problemId: z.string({ error: "Problem ID is required" }),
	submittedCode: z.string().optional(),
	selectedOptions: z.array(z.string()).optional(),
});

export const AttemptValidation = {
	submitProblemSolutionValidationSchema,
};
