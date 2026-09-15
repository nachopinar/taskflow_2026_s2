import type { NextFunction, Request, RequestHandler, Response } from 'express';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INVALID_TRANSITION'
  | 'INTERNAL';

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_TRANSITION: 422,
  INTERNAL: 500,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: string[];

  constructor(code: ErrorCode, message: string, details: string[] = []) {
    super(message);
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }
}

export const badRequest = (m: string, d: string[] = []) => new ApiError('VALIDATION_ERROR', m, d);
export const unauthorized = (m = 'Authentication required') => new ApiError('UNAUTHORIZED', m);
export const forbidden = (m = 'You do not have access to this resource') => new ApiError('FORBIDDEN', m);
export const notFound = (m = 'Resource not found') => new ApiError('NOT_FOUND', m);
export const conflict = (m: string) => new ApiError('CONFLICT', m);
export const invalidTransition = (m: string) => new ApiError('INVALID_TRANSITION', m);

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
