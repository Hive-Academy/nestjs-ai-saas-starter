import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  // Restrict Three.js imports everywhere (HybridUIService architecture enforcement)
  // This must come before the exemption rules
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'off',
        {
          type: 'attribute',
          prefix: 'brand',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'off',
        {
          type: 'element',
          prefix: 'brand',
          style: 'kebab-case',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'three',
              message:
                'Direct Three.js imports are prohibited outside the angular-3d module. Use HybridUIService and config builders from the angular-3d module instead. See implementation-plan.md in task-tracking/TASK_2025_012/ for migration guide.',
            },
          ],
          patterns: [
            {
              group: ['three/*'],
              message:
                'Direct Three.js imports are prohibited outside the angular-3d module. Use HybridUIService and config builders from the angular-3d module instead. See implementation-plan.md in task-tracking/TASK_2025_012/ for migration guide.',
            },
          ],
        },
      ],
    },
  },
  // Allow Three.js imports in angular-3d module and test files (overrides above rule)
  {
    files: [
      'src/app/core/angular-3d/**/*.ts',
      '**/*.spec.ts',
      '**/*.test.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {
      '@angular-eslint/template/click-events-have-key-events': 'warn',
    },
  },
];
