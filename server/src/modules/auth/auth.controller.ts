import { asyncHandler } from '../../lib/http';
import * as service from './auth.service';

function handle(
  fn: (body: Record<string, unknown>) => Promise<unknown>,
  status: number,
) {
  return asyncHandler(async (req, res) => {
    res.status(status).json(await fn(req.body ?? {}));
  });
}

export const register = handle(service.register, 201);
export const login = handle(service.login, 200);
export const forgotPassword = handle(service.forgotPassword, 200);
export const resetPassword = handle(service.resetPassword, 200);
