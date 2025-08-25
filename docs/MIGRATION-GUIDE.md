# NestJS AI SaaS Starter - Comprehensive Migration Guide (2025)

## Overview

This guide provides a complete strategy for migrating your Nx monorepo with publishable libraries, addressing common issues where Nx migrations don't update all dependencies, and ensuring child libraries correctly inherit dependencies from the root workspace.

## Table of Contents

1. [Pre-Migration Assessment](#pre-migration-assessment)
2. [Dependency Management Strategy](#dependency-management-strategy)
3. [Migration Process](#migration-process)
4. [Publishable Library Configuration](#publishable-library-configuration)
5. [Post-Migration Verification](#post-migration-verification)
6. [Troubleshooting](#troubleshooting)
7. [Common Issues & Solutions](#common-issues--solutions)

## Pre-Migration Assessment

### 1. Current State Analysis

```bash
# Check current Nx version
npx nx --version

# Analyze dependency graph
npx nx graph

# Check for circular dependencies
npx madge --circular --extensions ts libs/

# Validate current build state
npm run build:libs

# Check for outdated packages
npm outdated
```

### 2. Backup Strategy

```bash
# Create backup branch
git checkout -b backup/pre-migration-$(date +%Y%m%d)
git add . && git commit -m "chore: pre-migration backup"
git push -u origin backup/pre-migration-$(date +%Y%m%d)

# Return to main branch
git checkout main
```

### 3. Environment Preparation

```bash
# Clean workspace
npm run dev:stop
rm -rf node_modules dist tmp
npm cache clean --force
npm install

# Verify all services work
npm run dev:services
npm run build:libs
```

## Dependency Management Strategy

### Current Setup Analysis

Your workspace uses a **hybrid approach**:

- **Root `package.json`**: Contains all shared dependencies
- **Library `package.json`**: Contains only `peerDependencies` and `devDependencies`
- **Single Version Policy**: All libraries use consistent versions from root

### Key Configuration Files

#### Root `package.json` (Single Source of Truth)

- All production dependencies
- DevDependencies for tooling
- Workspace configuration

#### Library `package.json` (Metadata + Peer Dependencies)

```json
{
  "peerDependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0"
  },
  "dependencies": {
    "tslib": "^2.3.0"
  }
}
```

## Migration Process

### Phase 1: Nx Core Migration

#### Step 1: Check Available Migrations

```bash
# Check what migrations are available
npx nx migrate latest --dry-run

# Interactive migration (recommended for complex workspaces)
npx nx migrate latest --interactive
```

#### Step 2: Review Migration Plan

```bash
# This creates migrations.json - REVIEW CAREFULLY
cat migrations.json

# Check specific package migrations
npx nx migrate @nx/workspace@latest --dry-run
npx nx migrate @nx/angular@latest --dry-run
npx nx migrate @nx/nest@latest --dry-run
```

#### Step 3: Apply Core Migrations

```bash
# Apply migrations step by step
npx nx migrate --run-migrations --verbose

# Verify after each major migration
npm run build:libs
npx nx run-many -t test --parallel=3
```

### Phase 2: Framework-Specific Migrations

#### Angular Updates

```bash
# Update Angular dependencies
npx nx migrate @nx/angular@latest --interactive
npx nx migrate --run-migrations

# Verify Angular builds
npx nx build devbrand-ui
```

#### NestJS Updates

```bash
# Update NestJS-related packages
npx nx migrate @nx/nest@latest --interactive
npx nx migrate --run-migrations

# Verify NestJS builds
npx nx build dev-brand-api
```

### Phase 3: Manual Dependency Updates

Since Nx migrations sometimes miss dependencies, manually update:

#### Root Package.json Updates

```bash
# Update specific dependency categories
npm update @langchain/core @langchain/langgraph @langchain/openai
npm update @nestjs/common @nestjs/core @nestjs/platform-express
npm update chromadb neo4j-driver openai

# Check for major version updates
npm outdated --depth=0
```

#### Library-Specific Updates

```bash
# Update library peer dependencies to match root versions
node scripts/sync-peer-dependencies.js
```

### Phase 4: Configuration Updates

#### Update Nx Configuration

```bash
# Update nx.json if needed (usually handled by migrations)
# Verify target defaults and plugin configurations

# Update TypeScript configurations
npx nx g @nx/js:init --skipFormat
```

#### Update ESLint Configuration

```bash
# Add dependency checks rule for publishable libraries
npm install --save-dev @nx/dependency-checks
```

Add to your ESLint config:

```json
{
  "overrides": [
    {
      "files": ["libs/*/package.json"],
      "parser": "jsonc-eslint-parser",
      "rules": {
        "@nx/dependency-checks": "error"
      }
    }
  ]
}
```

## Publishable Library Configuration

### Enhanced Library Configuration

#### Update project.json for Each Library

```json
{
  "name": "nestjs-chromadb",
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "options": {
        "outputPath": "dist/libs/nestjs-chromadb",
        "main": "libs/nestjs-chromadb/src/index.ts",
        "tsConfig": "libs/nestjs-chromadb/tsconfig.lib.json",
        "assets": ["libs/nestjs-chromadb/*.md"],
        "updateBuildableProjectDepsInPackageJson": false,
        "buildableProjectDepsInPackageJsonType": "peerDependencies"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": [
          "libs/nestjs-chromadb/**/*.ts",
          "libs/nestjs-chromadb/package.json"
        ]
      }
    }
  }
}
```

### Dependency Synchronization Script

Create `scripts/sync-peer-dependencies.js`:

```javascript
const fs = require('fs');
const path = require('path');

const rootPackage = require('../package.json');
const libraries = [
  'libs/nestjs-chromadb',
  'libs/nestjs-neo4j', 
  'libs/nestjs-langgraph'
];

libraries.forEach(libPath => {
  const packagePath = path.join(libPath, 'package.json');
  const libPackage = require(`../${packagePath}`);
  
  // Update peer dependencies to match root versions
  Object.keys(libPackage.peerDependencies).forEach(dep => {
    if (rootPackage.dependencies[dep]) {
      libPackage.peerDependencies[dep] = rootPackage.dependencies[dep];
    }
  });
  
  fs.writeFileSync(packagePath, JSON.stringify(libPackage, null, 2));
  console.log(`Updated ${packagePath}`);
});
```

## Post-Migration Verification

### Comprehensive Testing Protocol

#### 1. Build Verification

```bash
# Clean and rebuild everything
rm -rf dist node_modules/.cache
npm run build:libs

# Verify each library builds individually
npx nx build nestjs-chromadb
npx nx build nestjs-neo4j
npx nx build nestjs-langgraph
```

#### 2. Dependency Verification

```bash
# Check for missing dependencies
npx nx run-many -t lint

# Verify peer dependency compatibility
npm ls --depth=0

# Check for duplicate dependencies
npm ls --depth=1 | grep -E "├─|└─" | sort | uniq -d
```

#### 3. Integration Testing

```bash
# Test all applications
npx nx serve dev-brand-api --port=3333 &
npx nx serve devbrand-ui --port=4200 &

# Wait and test endpoints
curl http://localhost:3333/health
curl http://localhost:4200

# Kill test servers
pkill -f "nx serve"
```

#### 4. Publish Testing

```bash
# Test publish process (dry run)
npm run publish:dry-run

# Verify package contents
tar -tzf $(npm pack dist/libs/nestjs-chromadb)
```

## Troubleshooting

### Common Migration Issues

#### Issue 1: Missing Dependencies in Built Packages

**Symptom**: Library builds but missing runtime dependencies
**Solution**:

```bash
# Add @nx/dependency-checks rule
npm install --save-dev @nx/dependency-checks

# Run linter to detect missing dependencies
npx nx lint nestjs-chromadb --fix
```

#### Issue 2: Peer Dependency Version Mismatches

**Symptom**: `npm install` warnings about peer dependencies
**Solution**:

```bash
# Sync peer dependencies with root
node scripts/sync-peer-dependencies.js

# Update library versions
npm run version:libs
```

#### Issue 3: Build Failures After Migration

**Symptom**: TypeScript compilation errors
**Solution**:

```bash
# Update TypeScript configurations
npx nx g @nx/js:init --skipFormat

# Fix import paths
npx nx run-many -t lint --fix
```

#### Issue 4: Circular Dependencies

**Symptom**: Build hangs or fails
**Solution**:

```bash
# Detect circular dependencies
npx madge --circular --extensions ts libs/

# Fix by restructuring imports
# Move shared types to a separate package
```

### Recovery Procedures

#### If Migration Fails

```bash
# Reset to backup
git reset --hard backup/pre-migration-$(date +%Y%m%d)
git clean -fd

# Clean install
rm -rf node_modules
npm install

# Retry with more conservative approach
npx nx migrate latest --interactive --createCommits
```

#### If Libraries Don't Build

```bash
# Reset library configurations
git checkout HEAD -- libs/*/project.json
git checkout HEAD -- libs/*/package.json

# Reapply configurations manually
node scripts/sync-peer-dependencies.js
npm run build:libs
```

## Common Issues & Solutions

### 1. Nx Doesn't Update All Dependencies

**Problem**: Some dependencies remain outdated after migration
**Root Cause**: Nx migrations are conservative and don't update dependencies that might cause breaking changes

**Solution**:

```bash
# Manual update strategy
npm update --save-dev @nx/workspace @nx/js @nx/nest @nx/angular
npm update @nestjs/common @nestjs/core @nestjs/platform-express
npm update chromadb neo4j-driver openai

# Check for major version updates
npm outdated | grep -v "Package\|WANTED" | awk '{print $1}' | xargs npm update
```

### 2. Library Package.json Not Reflecting Root Dependencies

**Problem**: Published libraries missing dependencies that exist in root
**Root Cause**: Legacy `updateBuildableProjectDepsInPackageJson` option disabled

**Solution**:

```bash
# Enable new dependency management
npm install --save-dev @nx/dependency-checks

# Add ESLint rule to project configurations
# Run lint with --fix to auto-update package.json
npx nx run-many -t lint --fix
```

### 3. Version Inconsistencies Between Libraries

**Problem**: Different libraries have different versions of the same dependency
**Solution**:

```bash
# Use nx release for coordinated versioning
npm run version:libs

# Sync all peer dependencies
node scripts/sync-peer-dependencies.js
```

### 4. Development vs Production Build Differences

**Problem**: Works in development but fails in production
**Solution**:

```bash
# Ensure proper export configuration in library package.json
{
  "exports": {
    ".": {
      "development": "./src/index.ts",
      "types": "./src/index.d.ts", 
      "import": "./src/index.js",
      "default": "./src/index.js"
    }
  }
}
```

## Migration Checklist

### Pre-Migration

- [ ] Backup current state
- [ ] Document current versions
- [ ] Verify all builds work
- [ ] Stop all services
- [ ] Clean node_modules and dist

### During Migration

- [ ] Review migrations.json before applying
- [ ] Run migrations in phases (core → framework → manual)
- [ ] Test builds after each phase
- [ ] Sync peer dependencies
- [ ] Update ESLint configurations

### Post-Migration

- [ ] All libraries build successfully
- [ ] All tests pass
- [ ] No circular dependencies
- [ ] Peer dependencies match root versions
- [ ] Publish dry-run succeeds
- [ ] Applications start and work
- [ ] Documentation updated

## Migration Scripts

### Automated Migration Script

Create `scripts/migrate.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting NestJS AI SaaS Starter Migration..."

# Phase 1: Backup
echo "📦 Creating backup..."
git checkout -b "backup/migration-$(date +%Y%m%d-%H%M)"
git add . && git commit -m "chore: pre-migration backup" || true
git push -u origin "backup/migration-$(date +%Y%m%d-%H%M)" || true
git checkout main

# Phase 2: Clean environment
echo "🧹 Cleaning environment..."
npm run dev:stop || true
rm -rf node_modules dist tmp .nx/cache
npm cache clean --force

# Phase 3: Nx migration
echo "⚙️ Running Nx migrations..."
npx nx migrate latest --interactive
npx nx migrate --run-migrations --verbose

# Phase 4: Manual updates
echo "🔧 Syncing dependencies..."
npm install
node scripts/sync-peer-dependencies.js

# Phase 5: Verification
echo "✅ Verifying migration..."
npm run build:libs
npx nx run-many -t test --parallel=3
npm run publish:dry-run

echo "🎉 Migration completed successfully!"
```

Make executable:

```bash
chmod +x scripts/migrate.sh
```

## Conclusion

This migration guide ensures:

1. **Complete dependency updates** - Addresses Nx's conservative migration approach
2. **Publishable library compatibility** - Ensures libraries work independently
3. **Root dependency inheritance** - Libraries correctly reference root versions
4. **Production readiness** - Thorough testing and verification process

Follow this guide step-by-step for a successful migration while maintaining the integrity of your publishable libraries and monorepo structure.

## Support

If you encounter issues during migration:

1. Check the troubleshooting section
2. Review Nx documentation for your specific version
3. Use the recovery procedures to rollback if needed
4. Test each phase thoroughly before proceeding

Remember: **Migration is iterative** - you can always rollback and retry with different approaches.
