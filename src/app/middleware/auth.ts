import type { NextFunction, Request, Response } from "express";
import { type UserRole, UserStatus } from "../../generated/prisma/enums";
import ApiError from "../errors/ApiError";
import { jwtHelpers } from "../utils/jwtHelpers";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import httpStatus from "http-status";

export interface IAuthUser {
	userId: string;
	email: string;
	role: UserRole;
}

declare global {
	namespace Express {
		interface Request {
			user?: IAuthUser;
		}
	}
}

const auth = (...requiredRoles: UserRole[]) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const token = req.cookies.accessToken
				? req.cookies.accessToken
				: req.headers.authorization?.startsWith("Bearer ")
					? req.headers.authorization?.split(" ")[1]
					: req.headers.authorization;

			if (!token) {
				throw new ApiError(
					httpStatus.UNAUTHORIZED,
					"You are not authorized. Token is missing or invalid.",
				);
			}

			let verifiedUser: any;
			try {
				verifiedUser = jwtHelpers.verifyToken(
					token,
					config.jwt.secret as string,
				);
			} catch (err) {
				throw new ApiError(
					httpStatus.UNAUTHORIZED,
					"Unauthorized! Invalid or expired token.",
				);
			}

			// Check if user still exists and is active
			const user = await prisma.user.findUnique({
				where: { id: verifiedUser.userId },
			});

			if (!user) {
				throw new ApiError(
					httpStatus.NOT_FOUND,
					"User account does not exist.",
				);
			}

			if (user.isDeleted) {
				throw new ApiError(
					httpStatus.FORBIDDEN,
					"User account has been deleted.",
				);
			}

			if (user.status === UserStatus.BLOCKED) {
				throw new ApiError(
					httpStatus.FORBIDDEN,
					"User account is blocked. Please contact support.",
				);
			}

			// Role check
			if (requiredRoles.length && !requiredRoles.includes(user.role)) {
				throw new ApiError(
					httpStatus.FORBIDDEN,
					`Forbidden! You do not have permission to perform this action. Required role: [${requiredRoles.join(
						", ",
					)}]`,
				);
			}

			req.user = {
				userId: user.id,
				email: user.email,
				role: user.role,
			};

			next();
		} catch (error) {
			next(error);
		}
	};
};

export default auth;
