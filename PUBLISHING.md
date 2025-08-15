# Publishing Guide

This document outlines the process for publishing the Anubis AI SaaS starter libraries to NPM.

## Prerequisites

1. **NPM Account**: Ensure you have an NPM account with publishing permissions
2. **Authentication**: Set up NPM authentication token
3. **Scope Access**: Ensure you have access to publish under the `@anubis` scope

## Authentication Setup

### Local Development

```bash
# Login to NPM
npm login

# Verify authentication
npm whoami
```

### CI/CD Environment

Set the `NPM_TOKEN` environment variable in your CI/CD system:

```bash
# In GitHub Actions, GitLab CI, etc.
NPM_TOKEN=your_npm_token_here
```

## Publishing Process

### 1. Dry Run (Testing)

Before publishing, always test with a dry run:

```bash
# Test the entire publishing process
npm run publish:dry-run

# Test individual library
nx run nestjs-chromadb:publish --dry-run
```

### 2. Version Management

The project uses Nx Release for automated versioning:

```bash
# Bump versions based on conventional commits
npm run version:libs

# Or manually specify version
nx release version --specifier=patch
nx release version --specifier=minor  
nx release version --specifier=major
```

### 3. Build Libraries

```bash
# Build all publishable libraries
npm run build:libs

# Build individual library
nx build nestjs-chromadb
```

### 4. Publish Libraries

```bash
# Publish all libraries
npm run publish:libs

# Publish individual library
nx run nestjs-chromadb:publish

# Full release process (version + publish)
npm run publish:release
```

## Library-Specific Publishing

### @hive-academy/nestjs-chromadb

```bash
nx build nestjs-chromadb
nx run nestjs-chromadb:publish
```

### @hive-academy/nestjs-neo4j

```bash
nx build nestjs-neo4j
nx run nestjs-neo4j:publish
```

### @anubis/nestjs-langgraph

```bash
nx build nestjs-langgraph
nx run nestjs-langgraph:publish
```


## Troubleshooting

### Authentication Issues

```bash
# Check current user
npm whoami

# Re-authenticate
npm logout
npm login
```

### Permission Issues

Ensure you have access to the `@anubis` scope:

```bash
# Check scope access
npm access list packages @anubis
```

### Build Issues

```bash
# Clean build cache
nx reset

# Rebuild libraries
npm run build:libs
```

### Publishing Failures

1. Check if version already exists on NPM
2. Verify authentication token
3. Ensure all peer dependencies are correctly specified
4. Check package.json configuration

## Automated Publishing (CI/CD)

The project includes GitHub Actions workflow for automated publishing:

1. **Trigger**: Push to `main` branch or manual trigger
2. **Process**: 
   - Install dependencies
   - Build libraries
   - Run tests
   - Version libraries (if needed)
   - Publish to NPM
3. **Notifications**: Slack/email notifications on success/failure

## Best Practices

1. **Always test with dry-run first**
2. **Use semantic versioning**
3. **Update changelogs before publishing**
4. **Test libraries in a separate project after publishing**
5. **Monitor NPM download statistics**
6. **Keep dependencies up to date**

## Rollback Process

If a published version has issues:

```bash
# Deprecate a version
npm deprecate @hive-academy/nestjs-chromadb@1.0.0 "This version has critical bugs"

# Unpublish (only within 72 hours)
npm unpublish @hive-academy/nestjs-chromadb@1.0.0
```

## Support

For publishing issues:
- Check GitHub Issues
- Contact the maintainers
- Review NPM documentation
