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
        'off',
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
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
      '@angular-eslint/prefer-standalone': 'error',
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/use-injectable-provided-in': 'error',

      // Component Lifecycle & Architecture
      '@angular-eslint/contextual-lifecycle': 'error',
      '@angular-eslint/no-empty-lifecycle-method': 'error',
      '@angular-eslint/no-conflicting-lifecycle': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@angular-eslint/no-attribute-decorator': 'error',
      // TypeScript Enhancement
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'explicit' },
      ],
    },
  },
  // Allow Three.js imports in angular-3d module and test files (overrides above rule)
  {
    files: ['src/app/core/angular-3d/**/*.ts', '**/*.spec.ts', '**/*.test.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['**/*.html'],
    rules: {
      // Modern Control Flow (Angular 17+)
      '@angular-eslint/template/prefer-control-flow': 'error',

      // Template Best Practices
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
      '@angular-eslint/template/prefer-ngsrc': 'error',
      '@angular-eslint/template/no-inline-styles': 'warn',
      '@angular-eslint/template/use-track-by-function': 'error',

      // Accessibility & UX
      '@angular-eslint/template/alt-text': 'warn',
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/mouse-events-have-key-events': 'warn',
      '@angular-eslint/template/valid-aria': 'error',
      '@angular-eslint/template/elements-content': 'warn',
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off',
      // Performance & Structure
      '@angular-eslint/template/no-call-expression': 'off',
      '@angular-eslint/template/no-duplicate-attributes': 'off',
      '@angular-eslint/template/conditional-complexity': [
        'warn',
        { maxComplexity: 7 },
      ],
      '@angular-eslint/template/cyclomatic-complexity': [
        'warn',
        { maxComplexity: 20 },
      ],

      // Modern Angular Patterns
      '@angular-eslint/template/prefer-control-flow': 'error', // @if/@for/@switch over *ngIf/*ngFor/*ngSwitch
      '@angular-eslint/template/no-negated-async': 'error',
      '@angular-eslint/template/no-any': 'warn',
    },
  },
];
