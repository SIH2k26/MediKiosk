import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '@medikiosk/shared-types';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Error]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    code: err.code,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    const apiError: ApiError = {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: { issues: err.errors },
    };
    res.status(400).json({ success: false, error: apiError });
    return;
  }

  const statusCode = err.statusCode ?? 500;
  const apiError: ApiError = {
    code: err.code ?? 'INTERNAL_SERVER_ERROR',
    message: statusCode === 500 ? 'An unexpected error occurred' : err.message,
  };

  res.status(statusCode).json({ success: false, error: apiError });
}

// Utility to create typed HTTP errors
export class HttpError extends Error implements AppError {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'HttpError';
  }
}

export const createNotFoundError = (resource: string) =>
  new HttpError(404, 'NOT_FOUND', `${resource} not found`);

export const createUnauthorizedError = () =>
  new HttpError(401, 'UNAUTHORIZED', 'Authentication required');

export const createForbiddenError = () =>
  new HttpError(403, 'FORBIDDEN', 'Insufficient permissions');
