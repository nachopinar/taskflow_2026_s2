import { randomUUID } from 'crypto';

/** Contraseña que cumple las reglas de US-01 (8+ caracteres, un número y una mayúscula). */
export const VALID_PASSWORD = 'Password1';

function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}

/** Cada test crea sus propios datos: los nombres únicos permiten correr en paralelo sin choques. */
export function uniqueEmail(alias = 'user'): string {
  return `e2e-${alias}-${uniqueSuffix()}@test.com`;
}

export function uniqueName(prefix: string): string {
  return `${prefix} ${uniqueSuffix()}`;
}
