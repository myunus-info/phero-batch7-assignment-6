import ApiError from "../../errors/ApiError";
import {
	calculatePagination,
	type IGenericResponse,
	type IPaginationOptions,
} from "../../constants/pagination";
import { logAuditEvent } from "../../utils/auditLogger";
import type {
	ICreateProblemRequest,
	IProblemFilterRequest,
} from "./problem.interface";
import { prisma } from "../../lib/prisma";
import { type Prisma, UserRole } from "../../../generated/prisma/client";
import httpStatus from "http-status";

export const problemSearchableFields = ["title", "description", "slug"];

const createProblem = async (
	userId: string,
	payload: ICreateProblemRequest,
	ipAddress?: string,
) => {
	const baseSlug =
		payload.slug ||
		payload.title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)+/g, "");
	const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

	const problem = await prisma.problem.create({
		data: {
			title: payload.title,
			slug: uniqueSlug,
			description: payload.description,
			difficulty: payload.difficulty,
			problemType: payload.problemType,
			creatorId: userId,
			points: payload.points || 10,
			timeLimitSeconds: payload.timeLimitSeconds || 300,
			isPublic: payload.isPublic !== undefined ? payload.isPublic : true,
			starterCode: payload.starterCode || undefined,
			mcqOptions: payload.mcqOptions || undefined,
			correctAnswers: payload.correctAnswers || undefined,
			testCases: payload.testCases || undefined,
		},
		include: {
			creator: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
		},
	});

	await logAuditEvent({
		userId,
		action: "CREATE_PROBLEM",
		entityType: "Problem",
		entityId: problem.id,
		details: { title: problem.title, type: problem.problemType },
		ipAddress,
	});

	return problem;
};

const getAllProblems = async (
	filters: IProblemFilterRequest,
	paginationOptions: IPaginationOptions,
): Promise<IGenericResponse<any>> => {
	const { page, limit, skip, sortBy, sortOrder } =
		calculatePagination(paginationOptions);
	const { searchTerm, ...filterData } = filters;

	const andConditions: Prisma.ProblemWhereInput[] = [{ isDeleted: false }];

	if (searchTerm) {
		andConditions.push({
			OR: problemSearchableFields.map((field) => ({
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

	const whereConditions: Prisma.ProblemWhereInput =
		andConditions.length > 0 ? { AND: andConditions } : {};

	const [data, total] = await Promise.all([
		prisma.problem.findMany({
			where: whereConditions,
			skip,
			take: limit,
			orderBy: { [sortBy]: sortOrder },
			include: {
				creator: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		}),
		prisma.problem.count({ where: whereConditions }),
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

const getProblemById = async (id: string, userRole?: UserRole) => {
	const problem = await prisma.problem.findUnique({
		where: { id },
		include: {
			creator: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
		},
	});

	if (!problem || problem.isDeleted) {
		throw new ApiError(404, "Problem not found or has been removed.");
	}

	// If candidate is viewing, hide correct answers and hidden test cases for security
	if (userRole === UserRole.CANDIDATE) {
		const { correctAnswers, ...safeProblem } = problem;
		let safeTestCases: any = [];
		if (Array.isArray(problem.testCases)) {
			safeTestCases = (problem.testCases as any[]).filter((tc) => !tc.isHidden);
		}
		return {
			...safeProblem,
			testCases: safeTestCases,
		};
	}

	return problem;
};

const updateProblem = async (
	id: string,
	userId: string,
	userRole: UserRole,
	payload: Partial<ICreateProblemRequest>,
	ipAddress?: string,
) => {
	const problem = await prisma.problem.findUnique({
		where: { id },
	});

	if (!problem || problem.isDeleted) {
		throw new ApiError(httpStatus.NOT_FOUND, "Problem not found.");
	}

	if (userRole !== UserRole.ADMIN && problem.creatorId !== userId) {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			"Forbidden! You can only update problems you created.",
		);
	}

	const updatedProblem = await prisma.problem.update({
		where: { id },
		data: {
			title: payload.title,
			description: payload.description,
			difficulty: payload.difficulty,
			problemType: payload.problemType,
			points: payload.points,
			timeLimitSeconds: payload.timeLimitSeconds,
			isPublic: payload.isPublic,
			starterCode: payload.starterCode || undefined,
			mcqOptions: payload.mcqOptions || undefined,
			correctAnswers: payload.correctAnswers || undefined,
			testCases: payload.testCases || undefined,
		},
	});

	await logAuditEvent({
		userId,
		action: "UPDATE_PROBLEM",
		entityType: "Problem",
		entityId: id,
		details: payload,
		ipAddress,
	});

	return updatedProblem;
};

const softDeleteProblem = async (
	id: string,
	userId: string,
	userRole: UserRole,
	ipAddress?: string,
) => {
	const problem = await prisma.problem.findUnique({
		where: { id },
	});

	if (!problem || problem.isDeleted) {
		throw new ApiError(httpStatus.NOT_FOUND, "Problem not found.");
	}

	if (userRole !== UserRole.ADMIN && problem.creatorId !== userId) {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			"Forbidden! You can only delete problems you created.",
		);
	}

	const deletedProblem = await prisma.problem.update({
		where: { id },
		data: {
			isDeleted: true,
			deletedAt: new Date(),
		},
	});

	await logAuditEvent({
		userId,
		action: "SOFT_DELETE_PROBLEM",
		entityType: "Problem",
		entityId: id,
		details: { title: problem.title },
		ipAddress,
	});

	return deletedProblem;
};

export const ProblemService = {
	createProblem,
	getAllProblems,
	getProblemById,
	updateProblem,
	softDeleteProblem,
};
