import { NextFunction, Request, Response } from 'express';
import { UserRole, UserStatus } from '../../generated/prisma/enums';
import ApiError from '../errors/ApiError';
import { jwtHelpers } from '../utils/jwtHelpers';
import { config } from '../config';
import { prisma } from '../lib/prisma';

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
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new ApiError(401, 'You are not authorized. Token is missing or invalid.');
      }

      const token = authHeader.split(' ')[1];
      let verifiedUser: any;
      try {
        verifiedUser = jwtHelpers.verifyToken(token, config.jwt.secret as string);
      } catch (err) {
        throw new ApiError(401, 'Unauthorized! Invalid or expired token.');
      }

      // Check if user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: verifiedUser.userId },
      });

      if (!user) {
        throw new ApiError(404, 'User account does not exist.');
      }

      if (user.isDeleted) {
        throw new ApiError(403, 'User account has been deleted.');
      }

      if (user.status === UserStatus.BLOCKED) {
        throw new ApiError(403, 'User account is blocked. Please contact support.');
      }

      // Role check
      if (requiredRoles.length && !requiredRoles.includes(user.role)) {
        throw new ApiError(
          403,
          `Forbidden! You do not have permission to perform this action. Required role: [${requiredRoles.join(
            ', ',
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
