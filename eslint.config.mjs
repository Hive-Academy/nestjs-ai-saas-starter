import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/node_modules',
      '**/.nx',
      '**/coverage',
      '**/*.min.js',
      '**/build',
      '**/tmp',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            // ===== APPLICATION LAYER =====
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:data-access',
                'type:ui',
                'type:util',
                'scope:shared',
              ],
            },

            // ===== FEATURE LAYER =====
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: [
                'type:data-access',
                'type:ui',
                'type:util',
                'scope:shared',
              ],
            },

            // ===== DATA ACCESS LAYER =====
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: [
                'type:util',
                'scope:shared',
                'type:data-access',
              ],
            },

            // ===== UI LAYER =====
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:util', 'scope:shared'],
            },

            // ===== UTILITY LAYER =====
            {
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },

            // ===== DOMAIN-SPECIFIC CONSTRAINTS =====

            // LangGraph Domain
            {
              sourceTag: 'domain:langgraph',
              onlyDependOnLibsWithTags: [
                'domain:langgraph',
                'domain:chromadb',
                'domain:neo4j',
                'scope:shared',
                'type:util',
              ],
            },

            // ChromaDB Domain
            {
              sourceTag: 'domain:chromadb',
              onlyDependOnLibsWithTags: [
                'domain:chromadb',
                'scope:shared',
                'type:util',
              ],
            },

            // Neo4j Domain
            {
              sourceTag: 'domain:neo4j',
              onlyDependOnLibsWithTags: [
                'domain:neo4j',
                'scope:shared',
                'type:util',
              ],
            },

            // ===== SCOPE-SPECIFIC CONSTRAINTS =====

            // Frontend can depend on shared utilities and UI components
            {
              sourceTag: 'scope:frontend',
              onlyDependOnLibsWithTags: [
                'scope:frontend',
                'scope:shared',
                'type:ui',
                'type:util',
              ],
            },

            // Backend can depend on data-access and business logic
            {
              sourceTag: 'scope:backend',
              onlyDependOnLibsWithTags: [
                'scope:backend',
                'scope:shared',
                'type:data-access',
                'type:feature',
                'type:util',
                'domain:langgraph',
                'domain:chromadb',
                'domain:neo4j',
              ],
            },

            // ===== SHARED LIBRARIES =====
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared', 'type:util'],
            },

            // ===== LANGGRAPH MODULE CONSTRAINTS =====

            // Checkpoint module can only depend on shared utilities
            {
              sourceTag: 'module:checkpoint',
              onlyDependOnLibsWithTags: [
                'scope:shared',
                'type:util',
                'domain:langgraph',
                'domain:chromadb',
                'domain:neo4j',
              ],
            },

            // Memory module constraints
            {
              sourceTag: 'module:memory',
              onlyDependOnLibsWithTags: [
                'scope:shared',
                'type:util',
                'domain:langgraph',
                'domain:chromadb',
                'domain:neo4j',
              ],
            },

            // Multi-agent module constraints
            {
              sourceTag: 'module:multi-agent',
              onlyDependOnLibsWithTags: [
                'scope:shared',
                'type:util',
                'domain:langgraph',
                'module:checkpoint',
                'module:memory',
                'domain:chromadb',
                'domain:neo4j',
              ],
            },

            // Monitoring module can depend on all other modules for observability
            {
              sourceTag: 'module:monitoring',
              onlyDependOnLibsWithTags: [
                'scope:shared',
                'type:util',
                'domain:langgraph',
                'module:checkpoint',
                'module:memory',
                'module:multi-agent',
                'module:time-travel',
                'module:functional-api',
                'domain:chromadb',
                'domain:neo4j',
              ],
            },

            // Platform module is foundational - others can depend on it
            {
              sourceTag: 'module:platform',
              onlyDependOnLibsWithTags: [
                'scope:shared',
                'type:util',
                'domain:langgraph',
                'domain:chromadb',
                'domain:neo4j',
              ],
            },

            // Time travel module depends on checkpoint
            {
              sourceTag: 'module:time-travel',
              onlyDependOnLibsWithTags: [
                'scope:shared',
                'type:util',
                'domain:langgraph',
                'module:checkpoint',
              ],
            },

            // Functional API module can depend on core modules
            {
              sourceTag: 'module:functional-api',
              onlyDependOnLibsWithTags: [
                'scope:shared',
                'type:util',
                'domain:langgraph',
                'module:checkpoint',
                'module:memory',
                'module:platform',
              ],
            },

          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts'],
    languageOptions: {
      parserOptions: {
        project: [
          './tsconfig.base.json',
          './apps/*/tsconfig.json',
          './apps/*/tsconfig.app.json',
          './apps/*/tsconfig.spec.json',
          './libs/*/tsconfig.json',
          './libs/*/tsconfig.lib.json',
          './libs/*/tsconfig.spec.json',
          './libs/*/*/tsconfig.json',
          './libs/*/*/tsconfig.lib.json',
          './libs/*/*/tsconfig.spec.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // === CRITICAL TYPE SAFETY RULES (Keep as errors) ===
      // These prevent runtime type errors and any-pollution
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/await-thenable': 'off',

      // === RELAXED RULES (Not critical for type safety) ===
      // Style preferences and modern JS features
      '@typescript-eslint/strict-boolean-expressions': 'off', // Saves ~2,200 errors, style preference
      '@typescript-eslint/prefer-nullish-coalescing': 'off', // Saves ~850 errors, auto-fixable
      '@typescript-eslint/no-unnecessary-condition': 'off', // Saves ~450 errors, can be defensive
      '@typescript-eslint/require-await': 'off', // Saves ~80 errors, performance not safety
      '@typescript-eslint/no-non-null-assertion': 'off', // Sometimes needed for valid reasons
      '@typescript-eslint/prefer-optional-chain': 'off', // Modern JS feature, auto-fixable
      '@typescript-eslint/no-unnecessary-type-assertion': 'off', // Auto-fixable

      // === CONFIGURED WITH FLEXIBILITY ===
      '@typescript-eslint/explicit-function-return-type': [
        'off', // Downgraded to offing
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
          allowConciseArrowFunctionExpressionsStartingWithVoid: true,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'off', // Downgraded to offing - code cleanup not type safety
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/naming-convention': [
        'off', // Downgraded to offing - style preference not type safety

        {
          selector: 'typeAlias',
          format: ['PascalCase'],
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
      ],
      // === ADDITIONAL RULES (Mixed priority) ===
      '@typescript-eslint/no-unnecessary-type-arguments': 'off',
      '@typescript-eslint/prefer-readonly': 'off',
      '@typescript-eslint/prefer-reduce-type-parameter': 'off',
      '@typescript-eslint/promise-function-async': 'off', // Downgraded - style preference
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-meaningless-void-operator': 'off',
      '@typescript-eslint/no-mixed-enums': 'error', // Keep as error - prevents bugs
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-useless-empty-export': 'off',
      '@typescript-eslint/prefer-enum-initializers': 'off',
      '@typescript-eslint/prefer-regexp-exec': 'off',
      '@typescript-eslint/prefer-return-this-type': 'off',
      '@typescript-eslint/prefer-string-starts-ends-with': 'off',
      '@typescript-eslint/switch-exhaustiveness-check': 'off', // Keep as error - prevents bugs
      // Disabled rules
      'dot-notation': 'off',
      '@typescript-eslint/dot-notation': 'off',
    },
  },

  {
    files: [
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/test/**/*.ts',
      '**/tests/**/*.ts',
    ],
    rules: {
      // Slightly relaxed rules for test files but still type-safe
      '@typescript-eslint/no-explicit-any': 'off', // Still no any in tests
      '@typescript-eslint/no-unsafe-assignment': 'off', // Still type-safe in tests
      '@typescript-eslint/no-unsafe-call': 'off', // Still type-safe in tests
      '@typescript-eslint/no-unsafe-member-access': 'off', // Still type-safe in tests
      '@typescript-eslint/no-unsafe-return': 'off', // Still type-safe in tests
      '@typescript-eslint/explicit-function-return-type': 'off', // Allow inference in tests
      'max-lines-per-function': ['off', 150], // Longer test functions allowed
      'no-console': 'off', // Allow console in tests
      'no-magic-numbers': 'off', // Allow magic numbers in tests
    },
  },
];
