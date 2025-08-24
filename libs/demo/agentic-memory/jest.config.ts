import { readFileSync } from 'fs';

// Reading the SWC compilation config for the spec files
const swcJestConfig: Record<string, unknown> = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8')
) as Record<string, unknown>;

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
(swcJestConfig as { swcrc: boolean }).swcrc = false;

export default {
  displayName: 'agentic-memory',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: 'test-output/jest/coverage',
};
