import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { badRequest, conflict, notFound, unauthorized } from '../../lib/http';
import { toPublicId } from '../../lib/ids';
import { assertPassword, normalizeEmail } from '../../lib/validation';
import { signToken } from '../../middleware/auth';
import * as repo from './auth.repository';

const EMAIL_PATTERN = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function checkEmail(email: unknown): string {
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    throw badRequest('Email must be a valid address');
  }
  return normalizeEmail(email);
}

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export function serializeUser(u: {
  id: number;
  email: string;
  name: string | null;
  createdAt: Date;
}): PublicUser {
  return {
    id: toPublicId('user', u.id),
    email: u.email,
    name: u.name,
    createdAt: u.createdAt.toISOString(),
  };
}

export async function register(body: Record<string, unknown>) {
  const email = checkEmail(body.email);
  const password = assertPassword(body.password);
  const name = typeof body.name === 'string' ? body.name.trim() : null;

  const existing = await repo.findUserByEmail(email);
  if (existing) throw conflict('Email already registered');

  const user = await repo.insertUser({ email, passwordHash: await bcrypt.hash(password, 10), name });

  return {
    user: serializeUser(user),
    token: signToken({ userId: user.id, email: user.email }),
  };
}

export async function login(body: Record<string, unknown>) {
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body.password === 'string' ? body.password : '';

  const user = await repo.findUserByEmail(email);
  if (!user) throw unauthorized('Invalid credentials');

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw unauthorized('Account temporarily locked. Try again later.');
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const attempts = user.failedAttempts + 1;
    const data: { failedAttempts: number; lockedUntil?: Date } = { failedAttempts: attempts };
    if (attempts >= 5) {
      data.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await repo.updateUser(user.id, data);
    throw unauthorized('Invalid credentials');
  }

  if (user.lockedUntil) {
    await repo.updateUser(user.id, { lockedUntil: null });
  }

  return {
    user: serializeUser(user),
    token: signToken({ userId: user.id, email: user.email }),
  };
}

export async function forgotPassword(body: Record<string, unknown>) {
  const email = checkEmail(body.email);

  const user = await repo.findUserByEmail(email);
  if (!user) throw notFound('No account found for that email');

  await repo.invalidateResetTokens(user.id);

  const token = crypto.randomBytes(24).toString('hex');
  await repo.insertResetToken({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  // No hay servicio de email en el proyecto: el token se devuelve en la respuesta.
  return { message: 'Password reset requested', token };
}

export async function resetPassword(body: Record<string, unknown>) {
  const token = typeof body.token === 'string' ? body.token : '';
  const newPassword = assertPassword(body.newPassword);

  const record = await repo.findResetToken(token);
  if (!record) throw badRequest('Invalid or expired reset token');

  await repo.updateUser(record.userId, {
    passwordHash: await bcrypt.hash(newPassword, 10),
    failedAttempts: 0,
    lockedUntil: null,
  });

  return { message: 'Password updated' };
}
