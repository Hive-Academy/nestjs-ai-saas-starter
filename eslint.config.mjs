import nx from "@nx/eslint-plugin";

export default [
    ...nx.configs["flat/base"],
    ...nx.configs["flat/typescript"],
    ...nx.configs["flat/javascript"],
    {
        ignores: [
            "**/dist",
            "**/node_modules",
            "**/.nx",
            "**/coverage",
            "**/*.min.js",
            "**/build",
            "**/tmp"
        ]
    },
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
            "**/*.js",
            "**/*.jsx"
        ],
        rules: {
            "@nx/enforce-module-boundaries": [
                "error",
                {
                    enforceBuildableLibDependency: true,
                    allow: [
                        "^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$"
                    ],
                    depConstraints: [
                        // ===== APPLICATION LAYER =====
                        {
                            sourceTag: "type:app",
                            onlyDependOnLibsWithTags: [
                                "type:feature",
                                "type:data-access",
                                "type:ui",
                                "type:util",
                                "scope:shared"
                            ]
                        },

                        // ===== FEATURE LAYER =====
                        {
                            sourceTag: "type:feature",
                            onlyDependOnLibsWithTags: [
                                "type:data-access",
                                "type:ui",
                                "type:util",
                                "scope:shared"
                            ]
                        },

                        // ===== DATA ACCESS LAYER =====
                        {
                            sourceTag: "type:data-access",
                            onlyDependOnLibsWithTags: [
                                "type:util",
                                "scope:shared"
                            ]
                        },

                        // ===== UI LAYER =====
                        {
                            sourceTag: "type:ui",
                            onlyDependOnLibsWithTags: [
                                "type:util",
                                "scope:shared"
                            ]
                        },

                        // ===== UTILITY LAYER =====
                        {
                            sourceTag: "type:util",
                            onlyDependOnLibsWithTags: [
                                "scope:shared"
                            ]
                        },

                        // ===== DOMAIN-SPECIFIC CONSTRAINTS =====

                        // LangGraph Domain
                        {
                            sourceTag: "domain:langgraph",
                            onlyDependOnLibsWithTags: [
                                "domain:langgraph",
                                "scope:shared",
                                "type:util"
                            ]
                        },

                        // ChromaDB Domain
                        {
                            sourceTag: "domain:chroma-db",
                            onlyDependOnLibsWithTags: [
                                "domain:chroma-db",
                                "scope:shared",
                                "type:util"
                            ]
                        },

                        // Neo4j Domain
                        {
                            sourceTag: "domain:neo4j",
                            onlyDependOnLibsWithTags: [
                                "domain:neo4j",
                                "scope:shared",
                                "type:util"
                            ]
                        },

                        // ===== SCOPE-SPECIFIC CONSTRAINTS =====

                        // Frontend can depend on shared utilities and UI components
                        {
                            sourceTag: "scope:frontend",
                            onlyDependOnLibsWithTags: [
                                "scope:frontend",
                                "scope:shared",
                                "type:ui",
                                "type:util"
                            ]
                        },

                        // Backend can depend on data-access and business logic
                        {
                            sourceTag: "scope:backend",
                            onlyDependOnLibsWithTags: [
                                "scope:backend",
                                "scope:shared",
                                "type:data-access",
                                "type:feature",
                                "type:util",
                                "domain:langgraph",
                                "domain:chroma-db",
                                "domain:neo4j"
                            ]
                        },

                        // ===== SHARED LIBRARIES =====
                        {
                            sourceTag: "scope:shared",
                            onlyDependOnLibsWithTags: [
                                "scope:shared",
                                "type:util"
                            ]
                        },

                        // ===== LANGGRAPH MODULE CONSTRAINTS =====

                        // Checkpoint module can only depend on shared utilities
                        {
                            sourceTag: "module:checkpoint",
                            onlyDependOnLibsWithTags: [
                                "scope:shared",
                                "type:util",
                                "domain:langgraph"
                            ]
                        },

                        // Memory module constraints
                        {
                            sourceTag: "module:memory",
                            onlyDependOnLibsWithTags: [
                                "scope:shared",
                                "type:util",
                                "domain:langgraph"
                            ]
                        },

                        // Multi-agent module constraints
                        {
                            sourceTag: "module:multi-agent",
                            onlyDependOnLibsWithTags: [
                                "scope:shared",
                                "type:util",
                                "domain:langgraph",
                                "module:checkpoint",
                                "module:memory"
                            ]
                        },

                        // Monitoring module can depend on all other modules for observability
                        {
                            sourceTag: "module:monitoring",
                            onlyDependOnLibsWithTags: [
                                "scope:shared",
                                "type:util",
                                "domain:langgraph",
                                "module:checkpoint",
                                "module:memory",
                                "module:multi-agent",
                                "module:time-travel",
                                "module:functional-api"
                            ]
                        },

                        // Platform module is foundational - others can depend on it
                        {
                            sourceTag: "module:platform",
                            onlyDependOnLibsWithTags: [
                                "scope:shared",
                                "type:util",
                                "domain:langgraph"
                            ]
                        },

                        // Time travel module depends on checkpoint
                        {
                            sourceTag: "module:time-travel",
                            onlyDependOnLibsWithTags: [
                                "scope:shared",
                                "type:util",
                                "domain:langgraph",
                                "module:checkpoint"
                            ]
                        },

                        // Functional API module can depend on core modules
                        {
                            sourceTag: "module:functional-api",
                            onlyDependOnLibsWithTags: [
                                "scope:shared",
                                "type:util",
                                "domain:langgraph",
                                "module:checkpoint",
                                "module:memory",
                                "module:platform"
                            ]
                        },

                        // ===== FALLBACK RULE =====
                        {
                            sourceTag: "*",
                            onlyDependOnLibsWithTags: [
                                "*"
                            ]
                        }
                    ]
                }
            ]
        }
    },
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
            "**/*.cts",
            "**/*.mts"
        ],
        languageOptions: {
            parserOptions: {
                project: [
                    "./tsconfig.base.json",
                    "./apps/*/tsconfig.json",
                    "./apps/*/tsconfig.app.json",
                    "./apps/*/tsconfig.spec.json",
                    "./libs/*/tsconfig.json",
                    "./libs/*/tsconfig.lib.json",
                    "./libs/*/tsconfig.spec.json",
                    "./libs/*/*/tsconfig.json",
                    "./libs/*/*/tsconfig.lib.json",
                    "./libs/*/*/tsconfig.spec.json"
                ],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // ===== TypeScript Compilation-like Errors =====
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_'
            }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-non-null-assertion': 'warn',
            '@typescript-eslint/prefer-nullish-coalescing': 'error',
            '@typescript-eslint/prefer-optional-chain': 'error',
            '@typescript-eslint/no-unnecessary-type-assertion': 'error',
            '@typescript-eslint/no-unsafe-assignment': 'error',
            '@typescript-eslint/no-unsafe-call': 'error',
            '@typescript-eslint/no-unsafe-member-access': 'error',
            '@typescript-eslint/no-unsafe-return': 'error',
            '@typescript-eslint/restrict-template-expressions': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/require-await': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/unbound-method': 'error',

            // ===== TypeScript Best Practices =====
            '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
            '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
            '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
            '@typescript-eslint/explicit-function-return-type': ['warn', {
                allowExpressions: true,
                allowTypedFunctionExpressions: true
            }],
            '@typescript-eslint/explicit-member-accessibility': ['error', {
                accessibility: 'explicit',
                overrides: { constructors: 'no-public' }
            }],
            '@typescript-eslint/member-ordering': 'error',
            '@typescript-eslint/method-signature-style': ['error', 'property'],
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'variableLike',
                    format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
                    leadingUnderscore: 'allow'
                },
                {
                    selector: 'typeLike',
                    format: ['PascalCase']
                },
                {
                    selector: 'interface',
                    format: ['PascalCase'],
                    custom: {
                        regex: '^I[A-Z]',
                        match: false
                    }
                }
            ],
            '@typescript-eslint/no-confusing-void-expression': 'error',
            '@typescript-eslint/no-duplicate-enum-values': 'error',
            '@typescript-eslint/no-dynamic-delete': 'error',
            '@typescript-eslint/no-empty-interface': ['error', { allowSingleExtends: true }],
            '@typescript-eslint/no-extra-non-null-assertion': 'error',
            '@typescript-eslint/no-extraneous-class': 'error',
            '@typescript-eslint/no-invalid-void-type': 'error',
            '@typescript-eslint/no-meaningless-void-operator': 'error',
            '@typescript-eslint/no-namespace': 'error',
            '@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'error',
            '@typescript-eslint/no-redundant-type-constituents': 'error',
            '@typescript-eslint/no-require-imports': 'error',
            '@typescript-eslint/no-this-alias': 'error',
            '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
            '@typescript-eslint/no-unnecessary-condition': 'error',
            '@typescript-eslint/no-unnecessary-qualifier': 'error',
            '@typescript-eslint/no-useless-empty-export': 'error',
            '@typescript-eslint/prefer-as-const': 'error',
            '@typescript-eslint/prefer-for-of': 'error',
            '@typescript-eslint/prefer-function-type': 'error',
            '@typescript-eslint/prefer-includes': 'error',
            '@typescript-eslint/prefer-literal-enum-member': 'error',
            '@typescript-eslint/prefer-readonly': 'error',
            '@typescript-eslint/prefer-reduce-type-parameter': 'error',
            '@typescript-eslint/prefer-return-this-type': 'error',
            '@typescript-eslint/prefer-string-starts-ends-with': 'error',
            '@typescript-eslint/promise-function-async': 'error',
            '@typescript-eslint/require-array-sort-compare': 'error',
            '@typescript-eslint/switch-exhaustiveness-check': 'error',
            '@typescript-eslint/unified-signatures': 'error',

            // ===== General Code Quality =====
            'complexity': ['warn', 10],
            'max-depth': ['warn', 4],
            'max-lines': ['warn', 300],
            'max-lines-per-function': ['warn', 50],
            'max-nested-callbacks': ['warn', 3],
            'max-params': ['warn', 4],
            'no-console': 'warn',
            'no-debugger': 'error',
            'no-alert': 'error',
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
            'no-script-url': 'error',
            'no-void': 'error',
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
            'consistent-return': 'error',
            'curly': ['error', 'all'],
            'default-case': 'error',
            'default-case-last': 'error',
            'dot-notation': 'error',
            'eqeqeq': ['error', 'always'],
            'guard-for-in': 'error',
            'no-case-declarations': 'error',
            'no-else-return': 'error',
            'no-empty-function': 'error',
            'no-empty-pattern': 'error',
            'no-fallthrough': 'error',
            'no-global-assign': 'error',
            'no-implicit-coercion': 'error',
            'no-invalid-this': 'error',
            'no-magic-numbers': ['warn', {
                ignore: [-1, 0, 1, 2],
                ignoreArrayIndexes: true,
                ignoreDefaultValues: true
            }],
            'no-multi-assign': 'error',
            'no-nested-ternary': 'error',
            'no-param-reassign': 'error',
            'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
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
            '@typescript-eslint/no-use-before-define': 'error',
            'one-var': ['error', 'never'],
            'prefer-arrow-callback': 'error',
            'prefer-destructuring': ['error', {
                array: true,
                object: true
            }, {
                enforceForRenamedProperties: false
            }],
            'prefer-object-spread': 'error',
            'radix': 'error',
            'require-await': 'off', // Handled by @typescript-eslint/require-await
            'sort-vars': 'error',
            'spaced-comment': ['error', 'always'],
            'strict': 'error',
            'vars-on-top': 'error',
            'yoda': 'error'
        }
    },

    {
        files: [
            "**/*.spec.ts",
            "**/*.spec.tsx",
            "**/*.test.ts",
            "**/*.test.tsx",
            "**/test/**/*.ts",
            "**/tests/**/*.ts"
        ],
        rules: {
            // Relaxed rules for test files
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            'no-magic-numbers': 'off',
            'max-lines-per-function': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
            'no-console': 'off'
        }
    }
];
