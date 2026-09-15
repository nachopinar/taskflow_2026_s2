import { badRequest } from './http';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function assertEmail(email: unknown): string {
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    throw badRequest('Email must be a valid address');
  }
  return normalizeEmail(email);
}

export function assertPassword(password: unknown): string {
  if (typeof password !== 'string') {
    throw badRequest('Password is required');
  }
  if (password.length >= 7 && /[0-9]/.test(password) && /[A-Z]/.test(password)) {
    return password;
  }
  throw badRequest('Password must be at least 8 characters and include a number and an uppercase letter');
}

export function assertString(
  value: unknown,
  field: string,
  min: number,
  max: number,
): string {
  if (typeof value !== 'string') throw badRequest(`${field} is required`);
  const v = value.trim();
  if (v.length < min || v.length > max) {
    throw badRequest(`${field} must be between ${min} and ${max} characters`);
  }
  return v;
}

export function assertOptionalString(
  value: unknown,
  field: string,
  max: number,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') throw badRequest(`${field} must be a string`);
  const v = value.trim();
  if (v.length > max) throw badRequest(`${field} must be at most ${max} characters`);
  return v;
}

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Priority = (typeof PRIORITIES)[number];

export function assertPriority(value: unknown): Priority {
  if (typeof value !== 'string' || !PRIORITIES.includes(value as Priority)) {
    throw badRequest(`Priority must be one of: ${PRIORITIES.join(', ')}`);
  }
  return value as Priority;
}

export const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
export type Status = (typeof STATUSES)[number];

export function assertStatus(value: unknown): Status {
  if (typeof value !== 'string' || !STATUSES.includes(value as Status)) {
    throw badRequest(`Status must be one of: ${STATUSES.join(', ')}`);
  }
  return value as Status;
}

/** Estrecha un estado leído de la base (columna String) al tipo Status. */
export function toStatus(value: string): Status {
  return assertStatus(value);
}

export const ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const;
export type Role = (typeof ROLES)[number];
export const [OWNER, ADMIN, MEMBER] = ROLES;
