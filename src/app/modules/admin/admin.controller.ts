import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import pick from '../../utils/pick';
import { paginationFields } from '../../constants/pagination';
import { AdminService } from './admin.service';

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ['searchTerm', 'role', 'status']);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await AdminService.getAllUsers(filters, paginationOptions);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Users fetched successfully!',
    meta: result.meta,
    data: result.data,
  });
});

const updateUserStatusOrRole = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.updateUserStatusOrRole(
    req.params.id as string,
    req.user!.userId,
    req.body,
    req.ip
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User status/role updated successfully!',
    data: result,
  });
});

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getDashboardStats();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Dashboard statistics retrieved successfully!',
    data: result,
  });
});

const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ['action', 'entityType']);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await AdminService.getAuditLogs(filters, paginationOptions);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Audit logs retrieved successfully!',
    meta: result.meta,
    data: result.data,
  });
});

export const AdminController = {
  getAllUsers,
  updateUserStatusOrRole,
  getDashboardStats,
  getAuditLogs,
};
