import { defineConfig } from 'vitest/config';

// Tests de contrato del consumidor (Pact). Generan los contratos en ../pacts.
export default defineConfig({
  test: {
    include: ['tests/pact/**/*.pact.test.ts'],
    environment: 'node',
    // Sesión con token de contrato y localStorage en memoria para cada test
    setupFiles: ['tests/pact/setup.ts'],
    // El mock server de Pact usa puertos; correr en serie evita choques.
    fileParallelism: false,
    passWithNoTests: true,
  },
});
