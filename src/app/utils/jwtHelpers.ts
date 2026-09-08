import jwt, { type JwtPayload, type Secret, type SignOptions } from "jsonwebtoken";

const generateToken = (
	payload: Record<string, any>,
	secret: Secret,
	expiresIn: string,
): string => {
	const options: SignOptions = {
		expiresIn: expiresIn as any,
	};
	return jwt.sign(payload, secret, options);
};

const verifyToken = (token: string, secret: Secret): JwtPayload => {
	return jwt.verify(token, secret) as JwtPayload;
};

export const jwtHelpers = {
	generateToken,
	verifyToken,
};
