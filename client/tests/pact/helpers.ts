import { fileURLToPath } from 'node:url';
import { MatchersV3, PactV4 } from '@pact-foundation/pact';
import { vi } from 'vitest';
import { PRIORITIES, STATUSES } from '../../src/types';

const { regex } = MatchersV3;

export const CONTRACT_TOKEN = 'token-de-prueba';

export function createProvider(): PactV4 {
  return new PactV4({
    consumer: 'taskflow-web',
    provider: 'taskflow-api',
    dir: fileURLToPath(new URL('../../../pacts', import.meta.url)),
    logLevel: 'warn',
  });
}

// api() llama a fetch('/api/...'): en Node lo apuntamos al mock server de Pact
export function apuntarFetchA(baseUrl: string): void {
  const realFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => realFetch(`${baseUrl}${url}`, init));
}

// api.ts guarda el token en localStorage, que Node no trae
export function stubLocalStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  });
}

export const bearer = () => regex(/^Bearer .+$/, `Bearer ${CONTRACT_TOKEN}`);
export const jsonContentType = () => regex(/^application\/json/, 'application/json');

export const publicId = (prefix: string, example: string) =>
  regex(new RegExp(`^${prefix}-\\d+$`), example);

export const isoDateTime = () =>
  regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/, '2026-10-20T12:00:00.000Z');

export const calendarDate = (example: string) => regex(/^\d{4}-\d{2}-\d{2}$/, example);

export const status = (example: (typeof STATUSES)[number]) =>
  regex(new RegExp(`^(${STATUSES.join('|')})$`), example);

export const priority = (example: (typeof PRIORITIES)[number]) =>
  regex(new RegExp(`^(${PRIORITIES.join('|')})$`), example);
