import { UserRole } from '../../../generated/prisma/enums';
import ApiError from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { logAuditEvent } from '../../utils/auditLogger';
import httpStatus from 'http-status';

const getMyProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatar: true,
      status: true,
      createdAt: true,
      recruiterProfile: true,
      candidateProfile: true,
      _count: {
        select: {
          createdAssessments: true,
          candidateAssessments: true,
          submissions: true,
          payments: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User profile not found.');
  }

  return user;
};

const updateMyProfile = async (
  userId: string,
  payload: {
    name?: string;
    avatar?: string;
    headline?: string;
    githubUrl?: string;
    linkedinUrl?: string;
    skills?: string[];
    companyName?: string;
    companyWebsite?: string;
  },
  ipAddress?: string,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      recruiterProfile: true,
      candidateProfile: true,
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found.');
  }

  const result = await prisma.$transaction(async tx => {
    // 1. Update basic user details
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        name: payload.name !== undefined ? payload.name : undefined,
        avatar: payload.avatar !== undefined ? payload.avatar : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
      },
    });

    // 2. Update role-specific profile
    if (user.role === UserRole.RECRUITER) {
      if (payload.companyName !== undefined || payload.companyWebsite !== undefined) {
        await tx.recruiterProfile.upsert({
          where: { userId },
          create: {
            userId,
            companyName: payload.companyName || `${updatedUser.name}'s Organization`,
            companyWebsite: payload.companyWebsite || null,
          },
          update: {
            companyName: payload.companyName !== undefined ? payload.companyName : undefined,
            companyWebsite: payload.companyWebsite !== undefined ? payload.companyWebsite : undefined,
          },
        });
      }
    } else if (user.role === UserRole.CANDIDATE) {
      if (
        payload.headline !== undefined ||
        payload.githubUrl !== undefined ||
        payload.linkedinUrl !== undefined ||
        payload.skills !== undefined
      ) {
        await tx.candidateProfile.upsert({
          where: { userId },
          create: {
            userId,
            headline: payload.headline || null,
            githubUrl: payload.githubUrl || null,
            linkedinUrl: payload.linkedinUrl || null,
            skills: payload.skills || [],
          },
          update: {
            headline: payload.headline !== undefined ? payload.headline : undefined,
            githubUrl: payload.githubUrl !== undefined ? payload.githubUrl : undefined,
            linkedinUrl: payload.linkedinUrl !== undefined ? payload.linkedinUrl : undefined,
            skills: payload.skills !== undefined ? payload.skills : undefined,
          },
        });
      }
    }

    return updatedUser;
  });

  await logAuditEvent({
    userId,
    action: 'UPDATE_PROFILE',
    entityType: 'User',
    entityId: userId,
    details: payload,
    ipAddress,
  });

  return getMyProfile(userId);
};

export const UserService = {
  getMyProfile,
  updateMyProfile,
};
