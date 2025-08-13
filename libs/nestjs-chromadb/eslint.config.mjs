import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      // Disable style-related rules that aren't critical for type safety
      '@typescript-eslint/member-ordering': 'off',
      '@typescript-eslint/explicit-member-accessibility': 'warn',
      '@typescript-eslint/no-extraneous-class': 'warn',
      'no-magic-numbers': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'warn',
      'max-params': 'warn',
      'complexity': 'warn',
      
      // Relax some TypeScript rules
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      
      // Keep critical type safety rules as errors
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'error',
    }
  }
];
