import { db } from '../../lib/db';

export function findUserByEmail(email: string) {
  return db.user.findUnique({ where: { email } });
}

export function insertUser(data: { email: string; passwordHash: string; name: string | null }) {
  return db.user.create({ data });
}

export function updateUser(
  id: number,
  data: {
    passwordHash?: string;
    failedAttempts?: number;
    lockedUntil?: Date | null;
  },
) {
  return db.user.update({ where: { id }, data });
}

export function invalidateResetTokens(userId: number) {
  return db.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
}

export function insertResetToken(data: { userId: number; token: string; expiresAt: Date }) {
  return db.passwordResetToken.create({ data });
}

export function findResetToken(token: string) {
  return db.passwordResetToken.findUnique({ where: { token } });
}
