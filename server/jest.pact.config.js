const base = require('./jest.config');

// Pact 16 depende de https-proxy-agent 9, que solo se publica como ESM: Jest tiene que transpilarlo.
const ESM_ONLY_DEPS = ['https-proxy-agent', 'agent-base', 'proxy-agent-negotiate'];

// Verificación de contratos del proveedor (Pact) contra los archivos de ../pacts.
/** @type {import('jest').Config} */
module.exports = {
  preset: base.preset,
  testEnvironment: base.testEnvironment,
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': '<rootDir>/tests/pact/esmTransform.js',
  },
  transformIgnorePatterns: [`/node_modules/(?!(${ESM_ONLY_DEPS.join('|')})/)`],
  globalSetup: base.globalSetup,
  setupFilesAfterEnv: base.setupFilesAfterEnv,
  testMatch: ['**/tests/pact/**/*.pact.test.ts'],
  testTimeout: 60000,
};
