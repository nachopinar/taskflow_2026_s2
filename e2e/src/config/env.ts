import { existsSync } from 'fs';
import path from 'path';

const envFile = path.resolve(__dirname, '../../.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const apiPort = Number(process.env.E2E_API_PORT ?? 3100);
const webPort = Number(process.env.E2E_WEB_PORT ?? 5174);

export const env = {
  apiPort,
  webPort,
  apiURL: `http://localhost:${apiPort}`,
  webURL: `http://localhost:${webPort}`,
  /**
   * Zona horaria del servidor y del navegador durante la suite. US-16 exige que
   * la fecha de vencimiento no dependa de la zona horaria; se fija una distinta
   * de UTC (UTC-3, la del escenario BDD) para que la corrida sea determinista.
   */
  timezone: 'America/Montevideo',
};
