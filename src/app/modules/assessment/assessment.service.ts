import crypto from "crypto";
import ApiError from "../../errors/ApiError";
import {
	calculatePagination,
	type IGenericResponse,
	type IPaginationOptions,
} from "../../constants/pagination";
import { logAuditEvent } from "../../utils/auditLogger";
import type {
	IAssessmentFilterRequest,
	ICreateAssessmentRequest,
	IInviteCandidateRequest,
} from "./assessment.interface";
import { prisma } from "../../lib/prisma";
import {
	AssessmentStatus,
	CandidateAssessmentStatus,
	UserRole,
} from "../../../generated/prisma/enums";
import type { Prisma } from "../../../generated/prisma/client";
import httpStatus from "http-status";

export const assessmentSearchableFields = ["title", "description"];

const createAssessment = async (
	userId: string,
	payload: ICreateAssessmentRequest,
	ipAddress?: string,
) => {
	// Verify problem IDs exist
	const problemIds = payload.problemIds.map((p) => p.problemId);
	const foundProblems = await prisma.problem.findMany({
		where: {
			id: { in: problemIds },
			isDeleted: false,
		},
	});

	if (foundProblems.length !== problemIds.length) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			"One or more problem IDs are invalid or deleted.",
		);
	}

	// Calculate total marks if not explicitly passed
	let computedTotalMarks = payload.totalMarks || 0;
	if (!computedTotalMarks) {
		computedTotalMarks = payload.problemIds.reduce((sum, item) => {
			const problem = foundProblems.find((p) => p.id === item.problemId);
			const points =
				item.customPoints !== undefined
					? item.customPoints
					: problem?.points || 10;
			return sum + points;
		}, 0);
	}

	const result = await prisma.$transaction(async (tx) => {
		const assessment = await tx.assessment.create({
			data: {
				title: payload.title,
				description: payload.description || null,
				recruiterId: userId,
				durationMinutes: payload.durationMinutes,
				totalMarks: computedTotalMarks,
				passingMarks: payload.passingMarks,
				scheduleStart: payload.scheduleStart
					? new Date(payload.scheduleStart)
					: null,
				scheduleEnd: payload.scheduleEnd ? new Date(payload.scheduleEnd) : null,
				status: payload.status || AssessmentStatus.PUBLISHED,
			},
		});

		// Create linked problems
		const assessmentProblemsData = payload.problemIds.map((item, index) => ({
			assessmentId: assessment.id,
			problemId: item.problemId,
			orderIndex: item.orderIndex !== undefined ? item.orderIndex : index + 1,
			customPoints: item.customPoints || null,
		}));

		await tx.assessmentProblem.createMany({
			data: assessmentProblemsData,
		});

		return assessment;
	});

	await logAuditEvent({
		userId,
		action: "CREATE_ASSESSMENT",
		entityType: "Assessment",
		entityId: result.id,
		details: { title: result.title, totalMarks: result.totalMarks },
		ipAddress,
	});

	return getAssessmentById(result.id, userId, UserRole.RECRUITER);
};

const getAllAssessments = async (
	userId: string,
	userRole: UserRole,
	filters: IAssessmentFilterRequest,
	paginationOptions: IPaginationOptions,
): Promise<IGenericResponse<any>> => {
	const { page, limit, skip, sortBy, sortOrder } =
		calculatePagination(paginationOptions);
	const { searchTerm, ...filterData } = filters;

	const andConditions: Prisma.AssessmentWhereInput[] = [{ isDeleted: false }];

	// Recruiter only sees their own assessments by default
	if (userRole === UserRole.RECRUITER) {
		andConditions.push({ recruiterId: userId });
	}

	if (searchTerm) {
		andConditions.push({
			OR: assessmentSearchableFields.map((field) => ({
				[field]: {
					contains: searchTerm,
					mode: "insensitive",
				},
			})),
		});
	}

	if (Object.keys(filterData).length > 0) {
		andConditions.push({
			AND: Object.keys(filterData).map((key) => ({
				[key]: {
					equals: (filterData as any)[key],
				},
			})),
		});
	}

	const whereConditions: Prisma.AssessmentWhereInput =
		andConditions.length > 0 ? { AND: andConditions } : {};

	const [data, total] = await Promise.all([
		prisma.assessment.findMany({
			where: whereConditions,
			skip,
			take: limit,
			orderBy: { [sortBy]: sortOrder },
			include: {
				recruiter: {
					select: {
						id: true,
						name: true,
						email: true,
						recruiterProfile: {
							select: { companyName: true },
						},
					},
				},
				_count: {
					select: {
						problems: true,
						candidates: true,
					},
				},
			},
		}),
		prisma.assessment.count({ where: whereConditions }),
	]);

	const totalPage = Math.ceil(total / limit);

	return {
		meta: {
			page,
			limit,
			total,
			totalPage,
		},
		data,
	};
};

const getAssessmentById = async (
	id: string,
	userId: string,
	userRole: UserRole,
) => {
	const assessment = await prisma.assessment.findUnique({
		where: { id },
		include: {
			recruiter: {
				select: {
					id: true,
					name: true,
					email: true,
					recruiterProfile: true,
				},
			},
			problems: {
				orderBy: { orderIndex: "asc" },
				include: {
					problem: {
						select: {
							id: true,
							title: true,
							slug: true,
							description: true,
							difficulty: true,
							problemType: true,
							points: true,
							timeLimitSeconds: true,
							starterCode: true,
							mcqOptions: true,
							// Exclude correct answers and hidden test cases for candidates
							correctAnswers: userRole !== UserRole.CANDIDATE,
							testCases: true,
						},
					},
				},
			},
			candidates: {
				select: {
					id: true,
					candidateEmail: true,
					status: true,
					totalScore: true,
					isPassed: true,
					startedAt: true,
					submittedAt: true,
					candidate: {
						select: {
							id: true,
							name: true,
							avatar: true,
						},
					},
				},
			},
		},
	});

	if (!assessment || assessment.isDeleted) {
		throw new ApiError(httpStatus.NOT_FOUND, "Assessment not found.");
	}

	// If candidate is viewing, sanitize test cases to only visible ones
	if (userRole === UserRole.CANDIDATE) {
		const sanitizedProblems = assessment.problems.map((ap) => {
			const tc = Array.isArray(ap.problem.testCases)
				? (ap.problem.testCases as any[]).filter((t) => !t.isHidden)
				: [];

			return {
				...ap,
				problem: {
					...ap.problem,
					testCases: tc,
				},
			};
		});

		return {
			...assessment,
			problems: sanitizedProblems,
			candidates: undefined, // Hide other candidates' details
		};
	}

	return assessment;
};

const updateAssessment = async (
	id: string,
	userId: string,
	userRole: UserRole,
	payload: Partial<ICreateAssessmentRequest>,
	ipAddress?: string,
) => {
	const assessment = await prisma.assessment.findUnique({
		where: { id },
	});

	if (!assessment || assessment.isDeleted) {
		throw new ApiError(404, "Assessment not found.");
	}

	if (userRole !== UserRole.ADMIN && assessment.recruiterId !== userId) {
		throw new ApiError(
			403,
			"Forbidden! You can only update your own assessments.",
		);
	}

	const updatedAssessment = await prisma.assessment.update({
		where: { id },
		data: {
			title: payload.title,
			description: payload.description,
			durationMinutes: payload.durationMinutes,
			totalMarks: payload.totalMarks,
			passingMarks: payload.passingMarks,
			scheduleStart: payload.scheduleStart
				? new Date(payload.scheduleStart)
				: undefined,
			scheduleEnd: payload.scheduleEnd
				? new Date(payload.scheduleEnd)
				: undefined,
			status: payload.status,
		},
	});

	await logAuditEvent({
		userId,
		action: "UPDATE_ASSESSMENT",
		entityType: "Assessment",
		entityId: id,
		details: payload,
		ipAddress,
	});

	return updatedAssessment;
};

const softDeleteAssessment = async (
	id: string,
	userId: string,
	userRole: UserRole,
	ipAddress?: string,
) => {
	const assessment = await prisma.assessment.findUnique({
		where: { id },
	});

	if (!assessment || assessment.isDeleted) {
		throw new ApiError(404, "Assessment not found.");
	}

	if (userRole !== UserRole.ADMIN && assessment.recruiterId !== userId) {
		throw new ApiError(
			403,
			"Forbidden! You can only delete your own assessments.",
		);
	}

	const deletedAssessment = await prisma.assessment.update({
		where: { id },
		data: {
			isDeleted: true,
			deletedAt: new Date(),
		},
	});

	await logAuditEvent({
		userId,
		action: "SOFT_DELETE_ASSESSMENT",
		entityType: "Assessment",
		entityId: id,
		details: { title: assessment.title },
		ipAddress,
	});

	return deletedAssessment;
};

const inviteCandidate = async (
	assessmentId: string,
	recruiterId: string,
	payload: IInviteCandidateRequest,
	ipAddress?: string,
) => {
	const assessment = await prisma.assessment.findUnique({
		where: { id: assessmentId },
	});

	if (!assessment || assessment.isDeleted) {
		throw new ApiError(404, "Assessment not found.");
	}

	if (assessment.recruiterId !== recruiterId) {
		throw new ApiError(
			403,
			"Forbidden! You can only invite candidates to your own assessment.",
		);
	}

	// Check recruiter credits
	const recruiterProfile = await prisma.recruiterProfile.findUnique({
		where: { userId: recruiterId },
	});

	if (!recruiterProfile || recruiterProfile.credits < 1) {
		throw new ApiError(
			402,
			"Insufficient assessment credits! Please purchase a credit pack via Stripe to invite candidates.",
		);
	}

	const candidateEmail = payload.email.toLowerCase();

	// Check if candidate already invited
	const existingInvite = await prisma.assessmentCandidate.findFirst({
		where: {
			assessmentId,
			candidateEmail,
		},
	});

	if (existingInvite) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			"Candidate has already been invited to this assessment.",
		);
	}

	// Find candidate user if already registered
	const registeredCandidate = await prisma.user.findUnique({
		where: { email: candidateEmail },
	});

	const invitationToken = crypto.randomBytes(24).toString("hex");

	// Transaction: deduct 1 credit & create invitation
	const result = await prisma.$transaction(async (tx) => {
		// 1. Deduct credit
		await tx.recruiterProfile.update({
			where: { userId: recruiterId },
			data: {
				credits: {
					decrement: 1,
				},
			},
		});

		// 2. Create invitation record
		const invitation = await tx.assessmentCandidate.create({
			data: {
				assessmentId,
				candidateEmail,
				candidateId: registeredCandidate ? registeredCandidate.id : null,
				invitationToken,
				status: CandidateAssessmentStatus.INVITED,
			},
			include: {
				assessment: {
					select: {
						id: true,
						title: true,
						durationMinutes: true,
					},
				},
			},
		});

		return invitation;
	});

	await logAuditEvent({
		userId: recruiterId,
		action: "INVITE_CANDIDATE",
		entityType: "AssessmentCandidate",
		entityId: result.id,
		details: {
			assessmentId,
			candidateEmail,
			creditsRemaining: recruiterProfile.credits - 1,
		},
		ipAddress,
	});

	return result;
};

export const AssessmentService = {
	createAssessment,
	getAllAssessments,
	getAssessmentById,
	updateAssessment,
	softDeleteAssessment,
	inviteCandidate,
};
