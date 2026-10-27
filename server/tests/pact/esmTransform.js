const ts = require('typescript');

// Transpila a CommonJS las dependencias que solo se publican como ESM (ver jest.pact.config.js).
module.exports = {
  process(source, fileName) {
    const { outputText } = ts.transpileModule(source, {
      fileName,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    });
    return { code: outputText };
  },
};
