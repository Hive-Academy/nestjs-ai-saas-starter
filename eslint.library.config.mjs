/**
 * Shared ESLint configuration for all libraries
 * This configuration is specifically for library projects that use rollup
 */

export const libraryEslintConfig = {
  files: ['**/*.json'],
  rules: {
    '@nx/dependency-checks': [
      'error',
      {
        ignoredFiles: [
          '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
          '{projectRoot}/rollup.config.js',
          '{projectRoot}/rollup.config.{cjs,mjs,ts}',
          '{projectRoot}/vite.config.{js,cjs,mjs,ts}',
          '{projectRoot}/jest.config.{js,cjs,mjs,ts}',
          '{projectRoot}/webpack.config.{js,cjs,mjs,ts}',
          // Ignore all test and spec files
          '{projectRoot}/**/*.test.{js,ts,jsx,tsx,mjs,cjs}',
          '{projectRoot}/**/*.spec.{js,ts,jsx,tsx,mjs,cjs}',
          '{projectRoot}/__tests__/**',
          '{projectRoot}/__mocks__/**'
        ],
      },
    ],
  },
  languageOptions: {
    parser: await import('jsonc-eslint-parser'),
  },
};

export default libraryEslintConfig;
