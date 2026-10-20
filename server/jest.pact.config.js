const base = require('./jest.config');

// Verificación de contratos del proveedor (Pact) contra los archivos de ../pacts.
/** @type {import('jest').Config} */
module.exports = {
  preset: base.preset,
  testEnvironment: base.testEnvironment,
  globalSetup: base.globalSetup,
  setupFilesAfterEnv: base.setupFilesAfterEnv,
  testMatch: ['**/tests/pact/**/*.pact.test.ts'],
  testTimeout: 60000,
};
