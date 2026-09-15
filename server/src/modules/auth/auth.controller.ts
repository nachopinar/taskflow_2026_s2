import { NextFunction, Request, Response } from 'express';
import * as service from './auth.service';

function handle(
  fn: (body: Record<string, unknown>) => Promise<unknown>,
  status: number,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(status).json(await fn(req.body ?? {}));
    } catch (err) {
      next(err);
    }
  };
}

export const register = handle(service.register, 201);
export const login = handle(service.login, 200);
export const forgotPassword = handle(service.forgotPassword, 200);
export const resetPassword = handle(service.resetPassword, 200);
