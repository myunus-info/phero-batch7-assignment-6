import ApiError from "../../errors/ApiError";
import {
	calculatePagination,
	type IGenericResponse,
	type IPaginationOptions,
} from "../../constants/pagination";
import { logAuditEvent } from "../../utils/auditLogger";
import {
	PaymentStatus,
	UserRole,
	type UserStatus,
} from "../../../generated/prisma/enums";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

export interface IUserFilterRequest {
	searchTerm?: string;
	role?: UserRole;
	status?: UserStatus;
}

const getAllUsers = async (
	filters: IUserFilterRequest,
	paginationOptions: IPaginationOptions,
): Promise<IGenericResponse<any>> => {
	const { page, limit, skip, sortBy, sortOrder } =
		calculatePagination(paginationOptions);
	const { searchTerm, ...filterData } = filters;

	const andConditions: Prisma.UserWhereInput[] = [];

	if (searchTerm) {
		andConditions.push({
			OR: [
				{ name: { contains: searchTerm, mode: "insensitive" } },
				{ email: { contains: searchTerm, mode: "insensitive" } },
			],
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

	const whereConditions: Prisma.UserWhereInput =
		andConditions.length > 0 ? { AND: andConditions } : {};

	const [data, total] = await Promise.all([
		prisma.user.findMany({
			where: whereConditions,
			skip,
			take: limit,
			orderBy: { [sortBy]: sortOrder },
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				status: true,
				isDeleted: true,
				avatar: true,
				createdAt: true,
				recruiterProfile: true,
				candidateProfile: true,
			},
		}),
		prisma.user.count({ where: whereConditions }),
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

const updateUserStatusOrRole = async (
	targetUserId: string,
	adminUserId: string,
	payload: { status?: UserStatus; role?: UserRole },
	ipAddress?: string,
) => {
	const user = await prisma.user.findUnique({
		where: { id: targetUserId },
	});

	if (!user) {
		throw new ApiError(404, "User not found.");
	}

	if (
		user.id === adminUserId &&
		payload.role &&
		payload.role !== UserRole.ADMIN
	) {
		throw new ApiError(400, "Admin cannot demote their own admin role.");
	}

	const updatedUser = await prisma.user.update({
		where: { id: targetUserId },
		data: {
			status: payload.status !== undefined ? payload.status : undefined,
			role: payload.role !== undefined ? payload.role : undefined,
		},
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			status: true,
			updatedAt: true,
		},
	});

	await logAuditEvent({
		userId: adminUserId,
		action: "UPDATE_USER_STATUS_OR_ROLE",
		entityType: "User",
		entityId: targetUserId,
		details: payload,
		ipAddress,
	});

	return updatedUser;
};

const getDashboardStats = async () => {
	const [
		totalUsers,
		totalCandidates,
		totalRecruiters,
		totalProblems,
		totalAssessments,
		totalAttempts,
		totalPassedAttempts,
		paymentsData,
	] = await Promise.all([
		prisma.user.count({ where: { isDeleted: false } }),
		prisma.user.count({
			where: { role: UserRole.CANDIDATE, isDeleted: false },
		}),
		prisma.user.count({
			where: { role: UserRole.RECRUITER, isDeleted: false },
		}),
		prisma.problem.count({ where: { isDeleted: false } }),
		prisma.assessment.count({ where: { isDeleted: false } }),
		prisma.assessmentCandidate.count(),
		prisma.assessmentCandidate.count({ where: { isPassed: true } }),
		prisma.payment.aggregate({
			where: { status: PaymentStatus.COMPLETED },
			_sum: { amount: true },
			_count: { id: true },
		}),
	]);

	const passRatePercentage =
		totalAttempts > 0
			? ((totalPassedAttempts / totalAttempts) * 100).toFixed(2)
			: "0.00";

	return {
		overview: {
			totalUsers,
			totalCandidates,
			totalRecruiters,
			totalProblems,
			totalAssessments,
			totalAttempts,
			totalPassedAttempts,
			passRate: `${passRatePercentage}%`,
		},
		revenue: {
			totalRevenueUSD: paymentsData._sum.amount || 0,
			successfulTransactions: paymentsData._count.id || 0,
		},
	};
};

const getAuditLogs = async (
	filters: { action?: string; entityType?: string },
	paginationOptions: IPaginationOptions,
): Promise<IGenericResponse<any>> => {
	const { page, limit, skip, sortBy, sortOrder } =
		calculatePagination(paginationOptions);

	const andConditions: Prisma.AuditLogWhereInput[] = [];

	if (filters.action) {
		andConditions.push({ action: filters.action });
	}

	if (filters.entityType) {
		andConditions.push({ entityType: filters.entityType });
	}

	const whereConditions: Prisma.AuditLogWhereInput =
		andConditions.length > 0 ? { AND: andConditions } : {};

	const [data, total] = await Promise.all([
		prisma.auditLog.findMany({
			where: whereConditions,
			skip,
			take: limit,
			orderBy: { [sortBy]: sortOrder },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						role: true,
					},
				},
			},
		}),
		prisma.auditLog.count({ where: whereConditions }),
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

export const AdminService = {
	getAllUsers,
	updateUserStatusOrRole,
	getDashboardStats,
	getAuditLogs,
};
