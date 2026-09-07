import { AnyZodObject } from 'zod/v3';
import httpStatus from 'http-status';
import { NextFunction, Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';

const validateRequest = (schema: AnyZodObject) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const payload = req.body ?? {};

    const result = schema.safeParse(payload);

    if (!result.success) {
      console.log(result.error);
      console.log(result.error.issues);

      throw new ApiError(httpStatus.BAD_REQUEST, result.error.issues[0].message);
    }

    req.body = result.data;

    next();
  });
};

export default validateRequest;
