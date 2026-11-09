import type { TestDetails } from '@playwright/test';

/**
 * Marca un test que hoy falla porque la aplicación no cumple la especificación.
 * El test NO se ajusta al comportamiento actual ni se marca con `test.fail()`:
 * describe lo que pide la spec y queda en rojo hasta que se corrija el defecto.
 * Ver docs/reporte-tests-e2e.md.
 */
export function knownBug(description: string): TestDetails {
  return { tag: '@known-bug', annotation: { type: 'known-bug', description } };
}
