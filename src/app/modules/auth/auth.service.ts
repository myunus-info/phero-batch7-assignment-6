import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import ApiError from "../../errors/ApiError";
import { jwtHelpers } from "../../utils/jwtHelpers";
import { logAuditEvent } from "../../utils/auditLogger";
import type {
	IGoogleLoginRequest,
	ILoginResponse,
	ILoginUserRequest,
	IRegisterUserRequest,
} from "./auth.interface";
import { config } from "../../config";
import { prisma } from "../../lib/prisma";
import { UserRole, UserStatus } from "../../../generated/prisma/enums";
import httpStatus from "http-status";

const googleClient = new OAuth2Client(config.google.client_id);

const registerUser = async (
	payload: IRegisterUserRequest,
	ipAddress?: string,
) => {
	const existingUser = await prisma.user.findUnique({
		where: { email: payload.email.toLowerCase() },
	});

	if (existingUser) {
		throw new ApiError(
			httpStatus.CONFLICT,
			"A user with this email address already exists.",
		);
	}

	const hashedPassword = await bcrypt.hash(
		payload.password,
		config.bcrypt_salt_rounds,
	);
	const role = payload.role || UserRole.CANDIDATE;

	// Use transaction to create user and profile together
	const result = await prisma.$transaction(async (tx) => {
		const user = await tx.user.create({
			data: {
				name: payload.name,
				email: payload.email.toLowerCase(),
				password: hashedPassword,
				role,
			},
		});

		if (role === UserRole.RECRUITER) {
			await tx.recruiterProfile.create({
				data: {
					userId: user.id,
					companyName: payload.companyName || `${payload.name}'s Organization`,
					companyWebsite: payload.companyWebsite || null,
					credits: 10, // Initial promotional credits
				},
			});
		} else if (role === UserRole.CANDIDATE) {
			await tx.candidateProfile.create({
				data: {
					userId: user.id,
					headline: payload.headline || "Software Developer",
					skills: payload.skills || ["JavaScript", "TypeScript", "Node.js"],
				},
			});
		}

		return user;
	});

	await logAuditEvent({
		userId: result.id,
		action: "REGISTER_USER",
		entityType: "User",
		entityId: result.id,
		details: { email: result.email, role: result.role },
		ipAddress,
	});

	return {
		user: {
			id: result.id,
			name: result.name,
			email: result.email,
			role: result.role,
			avatar: result.avatar,
		},
	};
};

const loginUser = async (
	payload: ILoginUserRequest,
	ipAddress?: string,
): Promise<ILoginResponse> => {
	const user = await prisma.user.findUnique({
		where: { email: payload.email.toLowerCase() },
	});

	if (!user) {
		throw new ApiError(
			httpStatus.NOT_FOUND,
			"User does not exist with this email.",
		);
	}

	if (user.isDeleted) {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			"This account has been deactivated or deleted.",
		);
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			"This account is currently blocked by administration.",
		);
	}

	if (!user.password) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			"Please sign in with Google Social Login for this account.",
		);
	}

	const isPasswordMatched = await bcrypt.compare(
		payload.password,
		user.password,
	);
	if (!isPasswordMatched) {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			"Incorrect password. Please verify your credentials.",
		);
	}

	const accessToken = jwtHelpers.generateToken(
		{ userId: user.id, email: user.email, role: user.role },
		config.jwt.secret as string,
		config.jwt.expires_in as string,
	);

	const refreshToken = jwtHelpers.generateToken(
		{ userId: user.id, email: user.email, role: user.role },
		config.jwt.refresh_secret as string,
		config.jwt.refresh_expires_in as string,
	);

	await logAuditEvent({
		userId: user.id,
		action: "LOGIN_USER",
		entityType: "User",
		entityId: user.id,
		details: { email: user.email, role: user.role },
		ipAddress,
	});

	return {
		accessToken,
		refreshToken,
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			avatar: user.avatar,
		},
	};
};

const googleLogin = async (
	payload: IGoogleLoginRequest,
	ipAddress?: string,
): Promise<ILoginResponse> => {
	let email: string | undefined;
	let name: string | undefined;
	let avatar: string | undefined;
	let googleId: string | undefined;

	try {
		if (config.google.client_id) {
			const ticket = await googleClient.verifyIdToken({
				idToken: payload.idToken,
				audience: config.google.client_id,
			});
			const googlePayload = ticket.getPayload();
			email = googlePayload?.email;
			name = googlePayload?.name;
			avatar = googlePayload?.picture;
			googleId = googlePayload?.sub;
		} else {
			// Fallback decode for local/testing environment if client ID not configured
			const decoded: any = JSON.parse(
				Buffer.from(payload.idToken.split(".")[1] || "{}", "base64").toString(),
			);
			email = decoded.email || "google_user@devjudge.com";
			name = decoded.name || "Google Developer";
			avatar = decoded.picture || null;
			googleId = decoded.sub || "google-sub-mock-id";
		}
	} catch (err) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			"Failed to verify Google ID token.",
		);
	}

	if (!email) {
		throw new ApiError(
			httpStatus.BAD_REQUEST,
			"Unable to extract email from Google identity.",
		);
	}

	let user = await prisma.user.findFirst({
		where: {
			OR: [{ email: email.toLowerCase() }, { googleId }],
		},
	});

	if (!user) {
		const role = payload.role || UserRole.CANDIDATE;
		user = await prisma.$transaction(async (tx) => {
			const newUser = await tx.user.create({
				data: {
					name: name || "Google User",
					email: email!.toLowerCase(),
					googleId,
					avatar,
					role,
				},
			});

			if (role === UserRole.RECRUITER) {
				await tx.recruiterProfile.create({
					data: {
						userId: newUser.id,
						companyName: `${newUser.name}'s Team`,
						credits: 10,
					},
				});
			} else {
				await tx.candidateProfile.create({
					data: {
						userId: newUser.id,
						headline: "Software Engineer",
						skills: ["JavaScript", "Fullstack"],
					},
				});
			}

			return newUser;
		});
	}

	if (user.isDeleted) {
		throw new ApiError(httpStatus.FORBIDDEN, "This account is deactivated.");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new ApiError(
			httpStatus.FORBIDDEN,
			"This account is blocked by administration.",
		);
	}

	const accessToken = jwtHelpers.generateToken(
		{ userId: user.id, email: user.email, role: user.role },
		config.jwt.secret as string,
		config.jwt.expires_in as string,
	);

	const refreshToken = jwtHelpers.generateToken(
		{ userId: user.id, email: user.email, role: user.role },
		config.jwt.refresh_secret as string,
		config.jwt.refresh_expires_in as string,
	);

	await logAuditEvent({
		userId: user.id,
		action: "GOOGLE_LOGIN",
		entityType: "User",
		entityId: user.id,
		details: { email: user.email, role: user.role },
		ipAddress,
	});

	return {
		accessToken,
		refreshToken,
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			avatar: user.avatar,
		},
	};
};

const refreshToken = async (
	token: string,
): Promise<{ accessToken: string }> => {
	let verifiedToken: any;
	try {
		verifiedToken = jwtHelpers.verifyToken(
			token,
			config.jwt.refresh_secret as string,
		);
	} catch (err) {
		throw new ApiError(
			httpStatus.UNAUTHORIZED,
			"Invalid or expired refresh token.",
		);
	}

	const user = await prisma.user.findUnique({
		where: { id: verifiedToken.userId },
	});

	if (!user || user.isDeleted || user.status === UserStatus.BLOCKED) {
		throw new ApiError(httpStatus.FORBIDDEN, "Account is inactive or blocked.");
	}

	const newAccessToken = jwtHelpers.generateToken(
		{ userId: user.id, email: user.email, role: user.role },
		config.jwt.secret as string,
		config.jwt.expires_in as string,
	);

	return { accessToken: newAccessToken };
};

export const AuthService = {
	registerUser,
	loginUser,
	googleLogin,
	refreshToken,
};
