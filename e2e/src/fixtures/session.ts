import type { BrowserContextOptions } from '@playwright/test';
import type { Account } from '../api/types';
import { env } from '../config/env';

type StorageState = Exclude<BrowserContextOptions['storageState'], string | undefined>;

/** Sin sesión: para las pantallas que se prueban como visitante (login, registro). */
export const GUEST: StorageState = { cookies: [], origins: [] };

/**
 * Sesión ya iniciada para `account`. El cliente guarda el JWT y el usuario en
 * localStorage (ver client/src/lib/api.ts), así que basta con precargarlos para
 * entrar a la app sin pasar por el formulario de login.
 */
export function sessionFor(account: Account): StorageState {
  return {
    cookies: [],
    origins: [
      {
        origin: env.webURL,
        localStorage: [
          { name: 'taskflow_token', value: account.token },
          { name: 'taskflow_user', value: JSON.stringify(account.user) },
        ],
      },
    ],
  };
}
