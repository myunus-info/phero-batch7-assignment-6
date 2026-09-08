import type { DifficultyLevel, ProblemType } from "../../../generated/prisma/enums";

export interface IProblemFilterRequest {
	searchTerm?: string;
	difficulty?: DifficultyLevel;
	problemType?: ProblemType;
	creatorId?: string;
	isPublic?: boolean;
}

export interface ICreateProblemRequest {
	title: string;
	slug?: string;
	description: string;
	difficulty?: DifficultyLevel;
	problemType?: ProblemType;
	points?: number;
	timeLimitSeconds?: number;
	isPublic?: boolean;
	starterCode?: Record<string, string>;
	mcqOptions?: Array<{ id: string; text: string }>;
	correctAnswers?: string[] | any;
	testCases?: Array<{
		input: string;
		expectedOutput: string;
		isHidden?: boolean;
	}>;
}
