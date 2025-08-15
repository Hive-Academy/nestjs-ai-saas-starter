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

            // ===== FALLBACK RULE =====
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
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
      // ===== CRITICAL TYPE SAFETY RULES (ZERO TOLERANCE) =====
      '@typescript-eslint/no-explicit-any': 'error', // Absolutely no any types
      '@typescript-eslint/no-unsafe-assignment': 'error', // Critical for type safety
      '@typescript-eslint/no-unsafe-call': 'error', // Critical for type safety
      '@typescript-eslint/no-unsafe-member-access': 'error', // Critical for type safety
      '@typescript-eslint/no-unsafe-return': 'error', // Critical for type safety
      '@typescript-eslint/no-unsafe-argument': 'error', // Prevent unsafe arguments
      '@typescript-eslint/await-thenable': 'error', // Only await promises
      '@typescript-eslint/require-await': 'error', // No unnecessary async
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          ignoreVoid: true,
          ignoreIIFE: true,
        },
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: false,
        },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
          allowBoolean: true,
          allowAny: false,
          allowNullish: false,
        },
      ],
      '@typescript-eslint/unbound-method': [
        'error',
        {
          ignoreStatic: true,
        },
      ],

      // ===== SECONDARY TYPE SAFETY RULES =====
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error', // Force proper null checks
      '@typescript-eslint/prefer-nullish-coalescing': 'error', // Better null handling
      '@typescript-eslint/prefer-optional-chain': 'error', // Safer property access
      '@typescript-eslint/no-unnecessary-type-assertion': 'error', // Clean assertions

      // ===== STRICT TYPE DEFINITIONS =====
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/no-unnecessary-type-arguments': 'error', // Clean generics
      '@typescript-eslint/no-redundant-type-constituents': 'error', // Clean union types
      '@typescript-eslint/prefer-ts-expect-error': 'error', // Better than @ts-ignore
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: true,
        },
      ], // Enforce type imports
      '@typescript-eslint/explicit-function-return-type': 'error', // Always explicit return types
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          accessibility: 'explicit',
          overrides: {
            constructors: 'no-public',
            parameterProperties: 'explicit',
            accessors: 'explicit',
            methods: 'explicit',
            properties: 'explicit',
          },
        },
      ],
      '@typescript-eslint/member-ordering': 'off', // Too rigid for complex classes
      '@typescript-eslint/method-signature-style': ['error', 'property'],
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'variableLike',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE', 'snake_case'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: false,
          },
        },
        {
          selector: 'property',
          format: null, // Allow any format for object properties
        },
      ],
      '@typescript-eslint/no-confusing-void-expression': 'off', // Too restrictive
      '@typescript-eslint/no-duplicate-enum-values': 'error',
      '@typescript-eslint/no-dynamic-delete': 'error',
      '@typescript-eslint/no-empty-interface': [
        'error',
        { allowSingleExtends: true },
      ],
      '@typescript-eslint/no-extra-non-null-assertion': 'error',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-invalid-void-type': 'error',
      '@typescript-eslint/no-meaningless-void-operator': 'error',
      '@typescript-eslint/no-namespace': 'error',
      '@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'error',
      '@typescript-eslint/no-redundant-type-constituents': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-this-alias': 'error',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'off', // Can have false positives
      '@typescript-eslint/no-unnecessary-qualifier': 'error',
      '@typescript-eslint/no-useless-empty-export': 'error',
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/prefer-for-of': 'error',
      '@typescript-eslint/prefer-function-type': 'error',
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-literal-enum-member': 'error',
      '@typescript-eslint/prefer-readonly': 'error', // Immutability by default
      '@typescript-eslint/prefer-reduce-type-parameter': 'error',
      '@typescript-eslint/prefer-return-this-type': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/promise-function-async': 'off', // Not always needed
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/unified-signatures': 'error',

      // ===== CRITICAL CODE QUALITY =====
      complexity: ['error', 20], // Enforce lower complexity
      'max-depth': ['error', 4], // Enforce shallow nesting
      'max-lines': ['error', 400], // Enforce shorter files
      'max-lines-per-function': ['error', 80], // Enforce shorter functions
      'max-nested-callbacks': ['error', 3], // Limit callback nesting
      'max-params': ['error', 5], // Limit parameter count
      'no-console': ['error', { allow: ['warn', 'error'] }], // Only allow error logging
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-void': ['error', { allowAsStatement: true }], // Allow void for floating promises
      'no-with': 'error',

      // ===== Security Best Practices =====
      'no-caller': 'error',
      'no-delete-var': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-implicit-globals': 'error',
      'no-iterator': 'error',
      'no-label-var': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-multi-str': 'error',
      'no-new-object': 'error',
      'no-new-wrappers': 'error',
      'no-octal-escape': 'error',
      'no-proto': 'error',
      'no-return-assign': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-throw-literal': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unused-expressions': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-escape': 'error',
      'no-useless-return': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',

      // ===== Performance =====
      'no-loop-func': 'error',
      'no-new': 'error',
      'no-new-require': 'error',
      'no-path-concat': 'error',
      'no-process-exit': 'error',
      'no-sync': 'warn',

      // ===== Code Style & Consistency =====
      'array-callback-return': 'error',
      'block-scoped-var': 'error',
      'consistent-return': 'off', // TypeScript handles this
      curly: ['error', 'all'],
      'default-case': 'error',
      'default-case-last': 'error',
      'dot-notation': 'error',
      eqeqeq: ['error', 'always'],
      'guard-for-in': 'error',
      'no-case-declarations': 'error',
      'no-else-return': 'error',
      'no-empty-function': 'error',
      'no-empty-pattern': 'error',
      'no-fallthrough': 'error',
      'no-global-assign': 'error',
      'no-implicit-coercion': 'error',
      'no-invalid-this': 'error',
      'no-magic-numbers': 'off', // Too noisy
      'no-multi-assign': 'error',
      'no-nested-ternary': 'error',
      'no-param-reassign': ['error', { props: false }], // Allow property modification
      'no-plusplus': 'off', // ++ and -- are fine
      'no-redeclare': 'error',
      'no-shadow': 'off', // Handled by @typescript-eslint/no-shadow
      '@typescript-eslint/no-shadow': 'error',
      'no-ternary': 'off',
      'no-undef-init': 'error',
      'no-undefined': 'off',
      'no-underscore-dangle': 'off',
      'no-unneeded-ternary': 'error',
      'no-unused-labels': 'error',
      'no-use-before-define': 'off', // Handled by @typescript-eslint/no-use-before-define
      '@typescript-eslint/no-use-before-define': [
        'error',
        {
          functions: false,
          classes: true,
          variables: true,
          typedefs: false,
        },
      ],
      'one-var': ['error', 'never'],
      'prefer-arrow-callback': 'error',
      'prefer-destructuring': [
        'warn',
        {
          array: false, // Array destructuring can be less readable
          object: true,
        },
        {
          enforceForRenamedProperties: false,
        },
      ],
      'prefer-object-spread': 'error',
      radix: 'error',
      'require-await': 'off', // Handled by @typescript-eslint/require-await
      'sort-vars': 'off', // Not useful
      'spaced-comment': ['error', 'always'],
      strict: 'error',
      'vars-on-top': 'error',
      yoda: 'error',
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
      '@typescript-eslint/no-explicit-any': 'error', // Still no any in tests
      '@typescript-eslint/no-unsafe-assignment': 'error', // Still type-safe in tests
      '@typescript-eslint/no-unsafe-call': 'error', // Still type-safe in tests
      '@typescript-eslint/no-unsafe-member-access': 'error', // Still type-safe in tests
      '@typescript-eslint/no-unsafe-return': 'error', // Still type-safe in tests
      '@typescript-eslint/explicit-function-return-type': 'off', // Allow inference in tests
      'max-lines-per-function': ['error', 150], // Longer test functions allowed
      'no-console': 'off', // Allow console in tests
      'no-magic-numbers': 'off', // Allow magic numbers in tests
    },
  },
];
