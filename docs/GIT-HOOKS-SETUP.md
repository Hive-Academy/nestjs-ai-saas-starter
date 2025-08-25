# Git Hooks Setup Guide

This document explains the Git hooks configuration using Husky and lint-staged to ensure code quality and consistent commit practices.

## Overview

The project uses the following tools for Git hooks:

- **Husky**: Manages Git hooks
- **lint-staged**: Runs linters on staged files
- **Commitlint**: Validates commit message format
- **Prettier**: Code formatting
- **ESLint**: Code linting

## Automatic Setup

The Git hooks are automatically set up when you install dependencies:

```bash
npm install
```

This runs the `postinstall` script which executes `setup:git-hooks`.

## Manual Setup

If you need to set up the hooks manually:

```bash
npm run setup:git-hooks
```

## Git Hooks Configuration

### Pre-commit Hook

**File**: `.husky/pre-commit`

**Actions**:

1. Runs `lint-staged` on staged files
2. Builds affected libraries to ensure they compile
3. Validates package.json files

**What gets checked**:

- TypeScript/JavaScript files: ESLint + Prettier
- JSON/Markdown files: Prettier
- Package.json files: Custom validation
- Affected libraries: Build verification

### Commit Message Hook

**File**: `.husky/commit-msg`

**Actions**:

1. Validates commit message format using commitlint
2. Ensures conventional commit format

**Valid commit formats**:

```bash
feat(chromadb): add new embedding service
fix(neo4j): resolve connection timeout issue
docs: update installation guide
chore(deps): update dependencies
```

### Pre-push Hook

**File**: `.husky/pre-push`

**Actions** (only for `main` and `develop` branches):

1. Runs tests for affected projects
2. Runs linting for affected projects
3. Builds affected projects
4. Tests publish process with dry-run

## Lint-staged Configuration

**File**: `.lintstagedrc.json`

```json
{
  "*.{ts,js,json,md}": ["prettier --write"],
  "*.{ts,js}": ["eslint --fix"],
  "libs/*/package.json": ["npm run validate:package-json"],
  "libs/**/*.ts": ["nx affected:lint --fix --files"],
  "libs/**/*.{spec,test}.ts": ["nx affected:test --files"]
}
```

## Commitlint Configuration

**File**: `.commitlintrc.json`

### Allowed Types

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Maintenance tasks
- `revert`: Reverting previous commits

### Allowed Scopes

- `chromadb`: ChromaDB library changes
- `neo4j`: Neo4j library changes
- `langgraph`: LangGraph library changes
- `shared`: Shared utilities changes
- `deps`: Dependency updates
- `release`: Release-related changes
- `ci`: CI/CD configuration
- `docs`: Documentation
- `hooks`: Git hooks configuration
- `scripts`: Build/utility scripts

### Commit Message Rules

- Type is required and must be lowercase
- Scope is optional but must be lowercase if provided
- Subject must be 3-72 characters
- Subject must not end with a period
- Subject must be in imperative mood (lowercase)
- Header must not exceed 100 characters
- Body lines must not exceed 100 characters

## Package.json Validation

**File**: `scripts/validate-package-json.js`

**Validates**:

- Required fields: name, version, description, author, license
- Package name starts with `@hive-academy/`
- Semantic versioning format
- Proper exports configuration
- Entry points (main, module, types)
- PublishConfig settings
- Repository information
- Keywords for discoverability
- Files array for published content
- Not marked as private

## Usage Examples

### Valid Commits

```bash
# Feature addition
git commit -m "feat(chromadb): add vector similarity search"

# Bug fix
git commit -m "fix(neo4j): resolve connection timeout issue"

# Documentation
git commit -m "docs: update installation guide"

# Breaking change
git commit -m "feat(chromadb)!: change embedding interface

BREAKING CHANGE: The embedding interface now requires a model parameter"

# With scope and body
git commit -m "feat(langgraph): add streaming support

Add real-time streaming capabilities for workflow execution.
This enables live monitoring of agent progress and intermediate results."
```

### Invalid Commits

```bash
# Missing type
git commit -m "add new feature"

# Invalid type
git commit -m "feature: add new functionality"

# Invalid scope
git commit -m "feat(ChromaDB): add feature"

# Subject too long
git commit -m "feat(chromadb): add a very long feature description that exceeds the maximum allowed length"

# Subject ends with period
git commit -m "feat(chromadb): add new feature."
```

## Bypassing Hooks (Emergency)

**⚠️ Use with caution!**

```bash
# Skip pre-commit hook
git commit --no-verify -m "emergency fix"

# Skip pre-push hook
git push --no-verify
```

## Troubleshooting

### Hook Not Running

1. Check if Husky is installed:

   ```bash
   ls -la .husky/
   ```

2. Reinstall hooks:

   ```bash
   npm run setup:git-hooks
   ```

3. Check Git hooks directory:

   ```bash
   git config core.hooksPath
   ```

### Lint-staged Issues

1. Check configuration:

   ```bash
   npx lint-staged --debug
   ```

2. Run manually:

   ```bash
   npx lint-staged
   ```

### Commitlint Issues

1. Test commit message:

   ```bash
   echo "feat: test message" | npx commitlint
   ```

2. Check configuration:

   ```bash
   npx commitlint --print-config
   ```

### Permission Issues (Unix/Linux/Mac)

```bash
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
chmod +x .husky/pre-push
```

## Best Practices

1. **Write Clear Commit Messages**: Follow conventional commit format
2. **Small, Focused Commits**: Each commit should represent a single logical change
3. **Test Before Committing**: Ensure your changes work locally
4. **Fix Linting Issues**: Address ESLint and Prettier issues before committing
5. **Update Tests**: Include tests for new features and bug fixes
6. **Document Changes**: Update documentation for API changes

## Integration with IDE

### VS Code

Install recommended extensions:

- ESLint
- Prettier
- Conventional Commits

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "conventionalCommits.scopes": ["chromadb", "neo4j", "langgraph", "shared", "deps", "release", "ci", "docs"]
}
```

### WebStorm/IntelliJ

1. Enable ESLint: Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
2. Enable Prettier: Settings → Languages & Frameworks → JavaScript → Prettier
3. Install Conventional Commit plugin

## Continuous Integration

The Git hooks work in conjunction with GitHub Actions:

- **Local hooks**: Fast feedback during development
- **CI checks**: Comprehensive validation on push/PR
- **Redundancy**: Ensures quality even if hooks are bypassed

## Customization

### Adding New File Types

Edit `.lintstagedrc.json`:

```json
{
  "*.{vue,svelte}": ["prettier --write", "eslint --fix"]
}
```

### Adding New Commit Scopes

Edit `.commitlintrc.json`:

```json
{
  "rules": {
    "scope-enum": [2, "always", ["new-scope", "existing-scopes"]]
  }
}
```

### Modifying Hook Behavior

Edit hook files in `.husky/` directory:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Add your custom commands here
echo "Running custom pre-commit checks..."
```

This setup ensures consistent code quality and commit practices across the entire development team.
