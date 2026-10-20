import { defineConfig } from 'vitest/config';

// Tests de contrato del consumidor (Pact). Generan los contratos en ../pacts.
export default defineConfig({
  test: {
    include: ['tests/pact/**/*.pact.test.ts'],
    environment: 'node',
    // El mock server de Pact usa puertos; correr en serie evita choques.
    fileParallelism: false,
    passWithNoTests: true,
  },
});
