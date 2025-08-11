# CI/CD Pipeline Setup Guide

This document explains how to set up and configure the automated CI/CD pipeline for publishing the Anubis AI SaaS starter libraries.

## Overview

The CI/CD pipeline consists of three main workflows:

1. **CI Workflow** (`ci.yml`) - Runs on every push and PR
2. **Release Workflow** (`release.yml`) - Handles versioning and publishing
3. **PR Checks Workflow** (`pr-checks.yml`) - Validates pull requests

## Prerequisites

### 1. NPM Token Setup

1. Create an NPM account and join the `@anubis` organization
2. Generate an automation token:
   ```bash
   npm login
   npm token create --type=automation
   ```
3. Add the token to GitHub Secrets as `NPM_TOKEN`

### 2. GitHub Token Setup

The `GITHUB_TOKEN` is automatically provided by GitHub Actions, but ensure your repository has the following permissions:

- Contents: Write (for creating releases and tags)
- Packages: Write (for publishing packages)
- Pull Requests: Write (for PR comments)
- Issues: Write (for issue management)

### 3. Branch Protection Rules

Set up branch protection for the `main` branch:

1. Go to Settings → Branches
2. Add rule for `main` branch
3. Enable:
   - Require pull request reviews before merging
   - Require status checks to pass before merging
   - Require branches to be up to date before merging
   - Include administrators

Required status checks:
- `validate`
- `security`
- `size-check`

## Workflow Details

### CI Workflow (`ci.yml`)

**Triggers:**
- Push to `main` branch
- Pull requests

**Actions:**
- Install dependencies
- Run linting
- Run tests
- Build projects
- Cache dependencies

### Release Workflow (`release.yml`)

**Triggers:**
- Push to `main` branch (automatic release)
- Manual workflow dispatch (manual release)

**Automatic Release Process:**
1. Detects changes in `libs/` directory
2. Runs tests and builds libraries
3. Uses conventional commits to determine version bump
4. Updates package.json files
5. Creates git tags
6. Publishes to NPM
7. Generates changelog
8. Creates GitHub release

**Manual Release Process:**
1. Allows specifying version bump type (patch/minor/major/prerelease)
2. Optional dry-run mode
3. Same publishing process as automatic

### PR Checks Workflow (`pr-checks.yml`)

**Triggers:**
- Pull request events (opened, synchronized, reopened)

**Checks:**
1. **Validation**: Linting, testing, building, publish dry-run
2. **Security**: NPM audit, vulnerability scanning
3. **Size Check**: Bundle size analysis
4. **Conventional Commits**: Commit message validation
5. **Package Validation**: JSON syntax and required fields

## Configuration Files

### `.commitlintrc.json`

Enforces conventional commit format:
```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": ["feat", "fix", "docs", "style", "refactor", "test", "chore"],
    "scope-enum": ["chromadb", "neo4j", "langgraph", "shared", "deps", "release"]
  }
}
```

### `nx.json` Release Configuration

```json
{
  "release": {
    "projects": ["libs/nestjs-chromadb", "libs/nestjs-neo4j", "libs/nestjs-langgraph", "libs/shared"],
    "version": {
      "conventionalCommits": true
    },
    "changelog": {
      "workspaceChangelog": {
        "createRelease": "github"
      }
    }
  }
}
```

## Usage

### Automatic Publishing

1. Make changes to libraries
2. Commit with conventional commit format:
   ```bash
   git commit -m "feat(chromadb): add new embedding service"
   ```
3. Push to `main` branch
4. Pipeline automatically detects changes and publishes

### Manual Publishing

1. Go to Actions → Release and Publish
2. Click "Run workflow"
3. Select version bump type
4. Optionally enable dry-run
5. Click "Run workflow"

### Version Bump Types

- **patch**: Bug fixes (0.1.0 → 0.1.1)
- **minor**: New features (0.1.0 → 0.2.0)
- **major**: Breaking changes (0.1.0 → 1.0.0)
- **prerelease**: Beta versions (0.1.0 → 0.1.1-beta.0)

## Conventional Commit Examples

```bash
# Feature additions
git commit -m "feat(chromadb): add vector similarity search"
git commit -m "feat(langgraph): implement streaming workflows"

# Bug fixes
git commit -m "fix(neo4j): resolve connection timeout issue"
git commit -m "fix(shared): correct agent type definitions"

# Breaking changes
git commit -m "feat(chromadb)!: change embedding interface"
git commit -m "feat(neo4j): remove deprecated query methods

BREAKING CHANGE: The old query methods have been removed"

# Documentation
git commit -m "docs: update installation guide"
git commit -m "docs(langgraph): add workflow examples"

# Chores
git commit -m "chore(deps): update dependencies"
git commit -m "chore(release): prepare for v1.0.0"
```

## Troubleshooting

### Publishing Failures

1. **NPM Token Issues**:
   - Verify token has correct permissions
   - Check token expiration
   - Ensure organization access

2. **Version Conflicts**:
   - Check if version already exists on NPM
   - Verify git tags are in sync

3. **Build Failures**:
   - Check TypeScript compilation errors
   - Verify all dependencies are installed
   - Review test failures

### Rollback Procedures

1. **Deprecate Published Version**:
   ```bash
   npm deprecate @anubis/nestjs-chromadb@1.0.0 "This version has critical bugs"
   ```

2. **Unpublish (within 72 hours)**:
   ```bash
   npm unpublish @anubis/nestjs-chromadb@1.0.0
   ```

3. **Revert Git Changes**:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

## Monitoring

### Success Indicators

- ✅ All workflow steps complete successfully
- ✅ Packages appear on NPM registry
- ✅ GitHub release is created
- ✅ Changelog is updated

### Failure Notifications

- ❌ Workflow failure notifications in GitHub
- ❌ Failed status checks on PRs
- ❌ NPM publishing errors in logs

## Security Considerations

1. **Token Security**:
   - Use automation tokens, not personal tokens
   - Regularly rotate tokens
   - Limit token scope to necessary permissions

2. **Dependency Security**:
   - Regular security audits
   - Automated vulnerability scanning
   - Dependency update automation

3. **Access Control**:
   - Limit who can trigger manual releases
   - Require PR reviews for all changes
   - Enable branch protection rules

## Best Practices

1. **Commit Messages**: Always use conventional commit format
2. **Testing**: Ensure comprehensive test coverage before publishing
3. **Documentation**: Update documentation with API changes
4. **Versioning**: Follow semantic versioning strictly
5. **Monitoring**: Monitor NPM download statistics and user feedback
