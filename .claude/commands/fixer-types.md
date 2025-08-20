# TypeScript Error Fixer

Analyzes TypeScript files for heavy 'any' type usage, typing issues, build errors, and linting errors, then automatically fixes these problems to improve code quality.

Analyze the modified TypeScript files for the following issues and fix them:

## Fix Categories

### 1. Any Type Replacement
Replace excessive 'any' type usage with proper TypeScript types

### 2. Compilation Errors
Fix TypeScript compilation errors and type mismatches

### 3. Linting Issues
Resolve ESLint violations and linting issues

### 4. Type Annotations
Ensure proper type annotations for functions, variables, and interfaces

### 5. Import Statements
Add missing imports and fix import statements

### 6. Implicit Types
Convert implicit any types to explicit proper types

## Required Output

For each file, provide:
- A summary of issues found
- The corrected code with proper typing
- Explanation of the fixes applied

Focus on maintaining functionality while improving type safety and code quality. Use the project's existing TypeScript configuration and ESLint rules as guidance.

## Target File Types

This fixer applies to:
- `**/*.ts` - TypeScript files
- `**/*.tsx` - React TypeScript files