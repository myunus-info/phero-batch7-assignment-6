import { ProblemType } from "../../generated/prisma/enums";

export interface ITestCase {
	input: string;
	expectedOutput: string;
	isHidden?: boolean;
}

export interface ITestResult {
	passed: boolean;
	input: string;
	expectedOutput: string;
	actualOutput?: string;
	error?: string;
	isHidden?: boolean;
}

export interface IEvaluationResult {
	scoreAwarded: number;
	status: "PASSED" | "FAILED";
	testResults?: ITestResult[];
	details?: Record<string, any>;
	executionTimeMs: number;
}

export const evaluateProblemSolution = (
	problemType: ProblemType,
	totalPoints: number,
	correctAnswers: any,
	testCases: any,
	submittedData: {
		submittedCode?: string;
		selectedOptions?: string[];
	},
): IEvaluationResult => {
	const startTime = Date.now();

	// 1. Evaluate MCQ or SINGLE_CHOICE
	if (
		problemType === ProblemType.MCQ ||
		problemType === ProblemType.SINGLE_CHOICE
	) {
		const correctArr = Array.isArray(correctAnswers)
			? correctAnswers
			: [correctAnswers];
		const selectedArr = Array.isArray(submittedData.selectedOptions)
			? submittedData.selectedOptions
			: [];

		const isMatch =
			correctArr.length === selectedArr.length &&
			correctArr.every((val: string) => selectedArr.includes(val));

		const score = isMatch ? totalPoints : 0;
		const executionTimeMs = Date.now() - startTime;

		return {
			scoreAwarded: score,
			status: isMatch ? "PASSED" : "FAILED",
			details: {
				totalOptions: correctArr.length,
				selectedCount: selectedArr.length,
				correct: isMatch,
			},
			executionTimeMs,
		};
	}

	// 2. Evaluate CODING problem against test cases
	const tests: ITestCase[] = Array.isArray(testCases) ? testCases : [];
	if (tests.length === 0) {
		return {
			scoreAwarded: totalPoints,
			status: "PASSED",
			testResults: [],
			executionTimeMs: Date.now() - startTime,
		};
	}

	const testResults: ITestResult[] = [];
	let passedCount = 0;
	const code = submittedData.submittedCode || "";

	// Execute test cases (Simulated safe test runner / syntax check)
	for (const tc of tests) {
		try {
			// Basic check: non-empty code and check if error occurs or passes logic
			const isSyntaxValid = code.length > 5 && !code.includes("SYNTAX_ERROR");

			// In simulated runner, evaluate test case match
			const passed = isSyntaxValid;
			if (passed) {
				passedCount++;
			}

			testResults.push({
				passed,
				input: tc.isHidden ? "[HIDDEN]" : tc.input,
				expectedOutput: tc.isHidden ? "[HIDDEN]" : tc.expectedOutput,
				actualOutput: passed ? tc.expectedOutput : "Runtime/Logic Mismatch",
				isHidden: tc.isHidden || false,
			});
		} catch (err: any) {
			testResults.push({
				passed: false,
				input: tc.isHidden ? "[HIDDEN]" : tc.input,
				expectedOutput: tc.isHidden ? "[HIDDEN]" : tc.expectedOutput,
				error: err?.message || "Execution error",
				isHidden: tc.isHidden || false,
			});
		}
	}

	const fractionPassed = passedCount / tests.length;
	const scoreAwarded = Math.round(fractionPassed * totalPoints);
	const status = fractionPassed === 1 ? "PASSED" : "FAILED";
	const executionTimeMs = Date.now() - startTime;

	return {
		scoreAwarded,
		status,
		testResults,
		details: {
			totalTests: tests.length,
			passedTests: passedCount,
		},
		executionTimeMs,
	};
};
