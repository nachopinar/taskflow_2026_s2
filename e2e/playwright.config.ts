import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Sin reintentos: un test que pasa al segundo intento oculta un problema real.
  retries: 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: env.webURL,
    timezoneId: env.timezone,
    locale: 'es-UY',
    testIdAttribute: 'data-testid',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Base SQLite propia de la suite (server/prisma/e2e.db). No hace falta vaciarla:
      // cada test crea sus propios datos con nombres únicos.
      command: 'npx prisma generate && npx prisma migrate deploy && npx ts-node --transpile-only src/index.ts',
      cwd: '../server',
      url: `${env.apiURL}/api/health`,
      env: {
        DATABASE_URL: 'file:./e2e.db',
        PORT: String(env.apiPort),
        TZ: env.timezone,
      },
      // Nunca se reutiliza un servidor ajeno: podría tener otra base u otra zona horaria.
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // Se prueba el build de producción, no el servidor de desarrollo: en dev,
      // React.StrictMode ejecuta dos veces cada efecto y la segunda carga de una
      // tarea pisa lo que el test ya eligió en el formulario (carrera que el
      // usuario final nunca ve). `vite preview` usa el mismo proxy de /api.
      command: `npm run build && npx vite preview --port ${env.webPort} --strictPort`,
      cwd: '../client',
      url: env.webURL,
      env: { TASKFLOW_API_URL: env.apiURL },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
