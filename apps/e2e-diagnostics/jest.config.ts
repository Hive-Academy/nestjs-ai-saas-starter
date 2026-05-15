const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8')
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'e2e-diagnostics',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: 'test-output/jest/coverage',
  testTimeout: 600_000,
  // Several upstream deps (`uuid`, `chromadb`, `@langchain/*`, `nanoid`,
  // etc.) ship ESM-only `dist-node` builds. Jest's default
  // `transformIgnorePatterns` skips `node_modules`, which breaks
  // `require()` of those packages from probe code. Whitelist the known
  // ESM-shipping deps so SWC transforms them on the fly.
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid|nanoid|chromadb|chromadb-default-embed|@langchain|langchain|@langgraph|p-queue|p-timeout|p-limit|p-retry)/)',
  ],
  reporters: ['default', '<rootDir>/src/reporting/diagnostic-reporter.cjs'],
};
