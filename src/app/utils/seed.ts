import {
	UserRole,
	DifficultyLevel,
	ProblemType,
	AssessmentStatus,
	CandidateAssessmentStatus,
	SubmissionStatus,
} from "../../generated/prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

export async function main() {
	const hashedPassword = await bcrypt.hash("Admin@123456", 12);
	const recruiterPassword = await bcrypt.hash("Recruiter@123456", 12);
	const candidatePassword = await bcrypt.hash("Candidate@123456", 12);

	// 1. Seed Admin
	const existingAdmin = await prisma.user.findFirst({
		where: {
			email: "admin@devjudge.com",
			role: UserRole.ADMIN,
		},
	});

	if (existingAdmin) return;

	const admin = await prisma.user.upsert({
		where: { email: "admin@devjudge.com" },
		update: {},
		create: {
			name: "System Admin",
			email: "admin@devjudge.com",
			password: hashedPassword,
			role: UserRole.ADMIN,
		},
	});

	// 2. Seed Recruiter
	const existingRecruiter = await prisma.user.findFirst({
		where: {
			email: "recruiter@techcorp.com",
			role: UserRole.RECRUITER,
		},
	});

	if (existingRecruiter) return;

	const recruiter = await prisma.user.upsert({
		where: { email: "recruiter@techcorp.com" },
		update: {},
		create: {
			name: "Sarah Jenkins",
			email: "recruiter@techcorp.com",
			password: recruiterPassword,
			role: UserRole.RECRUITER,
			recruiterProfile: {
				create: {
					companyName: "TechCorp Solutions Inc.",
					companyWebsite: "https://techcorp-solutions.example.com",
					credits: 50,
				},
			},
		},
	});

	// 3. Seed Candidate
	const existingCandidate = await prisma.user.findFirst({
		where: {
			email: "candidate@devjudge.com",
			role: UserRole.CANDIDATE,
		},
	});

	if (existingCandidate) return;

	const candidate = await prisma.user.upsert({
		where: { email: "candidate@devjudge.com" },
		update: {},
		create: {
			name: "Alex Rivera",
			email: "candidate@devjudge.com",
			password: candidatePassword,
			role: UserRole.CANDIDATE,
			candidateProfile: {
				create: {
					headline: "Senior Full Stack TypeScript & Node.js Developer",
					githubUrl: "https://github.com/alexrivera-dev",
					linkedinUrl: "https://linkedin.com/in/alexrivera-dev",
					skills: [
						"TypeScript",
						"Node.js",
						"Express",
						"PostgreSQL",
						"Prisma",
						"Docker",
					],
				},
			},
		},
	});

	// 4. Seed Problems
	const existingProblem1 = await prisma.problem.findFirst({
		where: {
			slug: "two-sum-problem-easy",
			title: "Two Sum Problem",
		},
	});

	if (existingProblem1) return;

	const problem1 = await prisma.problem.upsert({
		where: { slug: "two-sum-problem-easy" },
		update: {},
		create: {
			title: "Two Sum Problem",
			slug: "two-sum-problem-easy",
			description:
				"Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution.",
			difficulty: DifficultyLevel.EASY,
			problemType: ProblemType.CODING,
			creatorId: recruiter.id,
			points: 25,
			timeLimitSeconds: 300,
			starterCode: {
				javascript:
					"function twoSum(nums, target) {\n  // Write your code here\n}",
				typescript:
					"function twoSum(nums: number[], target: number): number[] {\n  // Write your code here\n}",
			},
			testCases: [
				{ input: "[2,7,11,15], 9", expectedOutput: "[0,1]", isHidden: false },
				{ input: "[3,2,4], 6", expectedOutput: "[1,2]", isHidden: false },
				{ input: "[3,3], 6", expectedOutput: "[0,1]", isHidden: true },
			],
		},
	});

	const existingProblem2 = await prisma.problem.findFirst({
		where: {
			title: "Valid Parentheses Checker",
			slug: "valid-parentheses-medium",
		},
	});

	if (existingProblem2) return;

	const problem2 = await prisma.problem.upsert({
		where: { slug: "valid-parentheses-medium" },
		update: {},
		create: {
			title: "Valid Parentheses Checker",
			slug: "valid-parentheses-medium",
			description:
				'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid. Open brackets must be closed by the same type of brackets in correct order.',
			difficulty: DifficultyLevel.MEDIUM,
			problemType: ProblemType.CODING,
			creatorId: recruiter.id,
			points: 35,
			timeLimitSeconds: 400,
			starterCode: {
				javascript: "function isValid(s) {\n  // Write your solution\n}",
			},
			testCases: [
				{ input: '"()"', expectedOutput: "true", isHidden: false },
				{ input: '"()[]{}"', expectedOutput: "true", isHidden: false },
				{ input: '"(]"', expectedOutput: "false", isHidden: false },
				{ input: '"{[]}"', expectedOutput: "true", isHidden: true },
			],
		},
	});

	const existingProblem3 = await prisma.problem.findFirst({
		where: {
			title: "JavaScript Event Loop & Microtasks",
			slug: "js-event-loop-microtasks",
		},
	});

	if (existingProblem3) return;

	const problem3 = await prisma.problem.upsert({
		where: { slug: "js-event-loop-microtasks" },
		update: {},
		create: {
			title: "JavaScript Event Loop & Microtasks",
			slug: "js-event-loop-microtasks",
			description:
				"Which queue in Node.js / V8 engine has higher priority for execution during the event loop cycle before next macrotask?",
			difficulty: DifficultyLevel.MEDIUM,
			problemType: ProblemType.SINGLE_CHOICE,
			creatorId: recruiter.id,
			points: 20,
			timeLimitSeconds: 120,
			mcqOptions: [
				{ id: "A", text: "setTimeout / setInterval timers queue" },
				{
					id: "B",
					text: "Microtask Queue (process.nextTick / Promise callbacks)",
				},
				{ id: "C", text: "I/O Polling callback queue" },
				{ id: "D", text: "setImmediate check queue" },
			],
			correctAnswers: ["B"],
		},
	});

	const existingProblem4 = await prisma.problem.findFirst({
		where: {
			title: "PostgreSQL B-Tree Index Optimization",
			slug: "sql-b-tree-indexing",
		},
	});

	if (existingProblem4) return;

	const problem4 = await prisma.problem.upsert({
		where: { slug: "sql-b-tree-indexing" },
		update: {},
		create: {
			title: "PostgreSQL B-Tree Index Optimization",
			slug: "sql-b-tree-indexing",
			description:
				"When creating a composite B-Tree index on columns (A, B, C), which WHERE clause can utilize the index effectively?",
			difficulty: DifficultyLevel.HARD,
			problemType: ProblemType.SINGLE_CHOICE,
			creatorId: recruiter.id,
			points: 20,
			timeLimitSeconds: 120,
			mcqOptions: [
				{ id: "A", text: "WHERE B = 10 AND C = 20" },
				{ id: "B", text: "WHERE C = 30" },
				{ id: "C", text: "WHERE A = 5 AND B = 10" },
				{ id: "D", text: "WHERE B = 10" },
			],
			correctAnswers: ["C"],
		},
	});

	// 5. Seed Assessment
	const existingAssessment = await prisma.assessment.findFirst({
		where: {
			title: "Full Stack Backend Engineer Screening Assessment",
		},
	});

	if (existingAssessment) return;

	const assessment = await prisma.assessment.create({
		data: {
			title: "Full Stack Backend Engineer Screening Assessment",
			description:
				"Comprehensive screening covering algorithmic problem solving, asynchronous runtime semantics, and database indexing.",
			recruiterId: recruiter.id,
			durationMinutes: 60,
			totalMarks: 100,
			passingMarks: 60,
			status: AssessmentStatus.PUBLISHED,
			problems: {
				create: [
					{ problemId: problem1.id, orderIndex: 1, customPoints: 25 },
					{ problemId: problem2.id, orderIndex: 2, customPoints: 35 },
					{ problemId: problem3.id, orderIndex: 3, customPoints: 20 },
					{ problemId: problem4.id, orderIndex: 4, customPoints: 20 },
				],
			},
		},
	});

	// 6. Seed Assessment Candidate Invitation & Completed Attempt
	const existingCandidateAssessment =
		await prisma.assessmentCandidate.findFirst({
			where: {
				invitationToken: "test-invitation-token-demo-alex-rivera-12345",
			},
		});

	if (existingCandidateAssessment) return;

	const candidateAssessment = await prisma.assessmentCandidate.create({
		data: {
			assessmentId: assessment.id,
			candidateId: candidate.id,
			candidateEmail: candidate.email,
			invitationToken: "test-invitation-token-demo-alex-rivera-12345",
			status: CandidateAssessmentStatus.COMPLETED,
			totalScore: 80,
			isPassed: true,
			startedAt: new Date(Date.now() - 3600000),
			submittedAt: new Date(Date.now() - 900000),
			submissions: {
				create: [
					{
						problemId: problem1.id,
						candidateId: candidate.id,
						submittedCode:
							"function twoSum(nums, target) { const map = new Map(); for (let i = 0; i < nums.length; i++) { const diff = target - nums[i]; if (map.has(diff)) return [map.get(diff), i]; map.set(nums[i], i); } return []; }",
						scoreAwarded: 25,
						status: SubmissionStatus.PASSED,
					},
					{
						problemId: problem2.id,
						candidateId: candidate.id,
						submittedCode:
							'function isValid(s) { const stack = []; const map = { ")": "(", "}": "{", "]": "[" }; for (const char of s) { if (char in map) { if (stack.pop() !== map[char]) return false; } else stack.push(char); } return stack.length === 0; }',
						scoreAwarded: 35,
						status: SubmissionStatus.PASSED,
					},
					{
						problemId: problem3.id,
						candidateId: candidate.id,
						selectedOptions: ["B"],
						scoreAwarded: 20,
						status: SubmissionStatus.PASSED,
					},
				],
			},
		},
	});

	console.log("Seeding successfully finished!");
}
