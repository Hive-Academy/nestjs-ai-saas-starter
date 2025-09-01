# Library Publishing Strategy - Implementation Plan

## Executive Summary

This document outlines the comprehensive strategy for publishing the NestJS AI SaaS Starter ecosystem as a collection of npm packages. We've chosen **Strategy 1: Publish Child Modules as Separate Packages** as the recommended approach for maximum flexibility and modern micropackage architecture.

## Current Workspace Analysis

### ✅ Ready for Publishing (3 packages)

- `@hive-academy/nestjs-chromadb` - Vector database integration
- `@hive-academy/nestjs-neo4j` - Graph database integration
- `@hive-academy/nestjs-langgraph` - AI workflow orchestration (main package)

### 🔄 Child Modules to Publish (7 packages)

- `@hive-academy/langgraph-checkpoint` - State persistence & recovery
- `@hive-academy/langgraph-multi-agent` - Multi-agent coordination
- `@hive-academy/langgraph-monitoring` - Production observability
- `@hive-academy/langgraph-functional-api` - Functional programming patterns
- `@hive-academy/langgraph-platform` - LangGraph Platform integration
- `@hive-academy/langgraph-time-travel` - Workflow debugging
- `@hive-academy/langgraph-streaming` - Real-time capabilities

### 📁 Demo/Testing (Non-publishable)

- `@libs/demo/agentic-memory` - Demo implementation
- `@libs/demo/supervisor-agent` - Demo workflows
- Demo applications in `apps/`

## Strategy 1: Separate Child Packages (Chosen Approach)

### Benefits

- ✅ Users install only needed modules
- ✅ Independent versioning per module
- ✅ Clear dependency tree
- ✅ Follows modern micropackage philosophy
- ✅ Maximum flexibility for end users

### Package Ecosystem Structure

```
@hive-academy/nestjs-chromadb     (Core - Vector DB)
@hive-academy/nestjs-neo4j        (Core - Graph DB)
@hive-academy/nestjs-langgraph    (Core - Main orchestrator)
├── @hive-academy/langgraph-checkpoint        (Child - State management)
├── @hive-academy/langgraph-multi-agent       (Child - Agent coordination)
├── @hive-academy/langgraph-monitoring        (Child - Observability)
├── @hive-academy/langgraph-functional-api    (Child - Functional patterns)
├── @hive-academy/langgraph-platform          (Child - Platform integration)
├── @hive-academy/langgraph-time-travel       (Child - Debugging)
└── @hive-academy/langgraph-streaming         (Child - Real-time features)
```

## Implementation Tasks

### Phase 1: Child Module Configuration ⏳

#### Task 1.1: Update Child Module Package Names

**Objective**: Change internal package names to publishable scoped names

**Files to Update**:

- `libs/langgraph-modules/*/package.json` (7 files)

**Changes**:

```json
// Before
{
  "name": "@langgraph-modules/checkpoint",
  "private": true
}

// After
{
  "name": "@hive-academy/langgraph-checkpoint",
  "private": false,
  "publishConfig": {
    "access": "public"
  }
}
```

#### Task 1.2: Update TypeScript Path Mappings

**Objective**: Update all import paths to use new package names

**Files to Update**:

- `tsconfig.base.json` - Update paths configuration
- `libs/langgraph-modules/nestjs-langgraph/src/**/*.ts` - Update import statements
- `libs/langgraph-modules/*/src/**/*.ts` - Update cross-references

**Changes**:

```typescript
// Before
import { CheckpointModule } from '@langgraph-modules/checkpoint';

// After
import { CheckpointModule } from '@hive-academy/langgraph-checkpoint';
```

#### Task 1.3: Update NX Project Configuration

**Objective**: Add child modules to NX release pipeline

**Files to Update**:

- `nx.json` - Add to release.projects array
- `package.json` - Update build and publish scripts

### Phase 2: Dependency Resolution ⏳

#### Task 2.1: Configure Peer Dependencies

**Objective**: Set proper peer dependency relationships

**Child Module Pattern**:

```json
{
  "peerDependencies": {
    "@hive-academy/nestjs-langgraph": "^0.0.1",
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0"
  },
  "dependencies": {
    "tslib": "^2.3.0"
  }
}
```

#### Task 2.2: Update Child Module Loading Logic

**Objective**: Update dynamic module loading to use published packages

**Files to Update**:

- `libs/langgraph-modules/nestjs-langgraph/src/lib/providers/child-module-imports.providers.ts`

**Changes**:

```typescript
// Update module paths in ModuleRegistryService.MODULE_DEFINITIONS
{
  moduleId: 'checkpoint',
  className: 'CheckpointModule',
  importPath: '@hive-academy/langgraph-checkpoint',  // Updated path
}
```

### Phase 3: Demo Application Updates ⏳

#### Task 3.1: Update Demo Library Dependencies

**Objective**: Fix demo library configurations to use proper import paths

**Files to Update**:

- `libs/demo/*/package.json` - Add dependency declarations
- `libs/demo/*/src/**/*.ts` - Update import statements
- `apps/*/src/**/*.ts` - Update import statements

#### Task 3.2: Configure Demo Applications

**Objective**: Ensure demo apps use workspace dependencies correctly

**Apps to Update**:

- `apps/nestjs-ai-saas-starter-demo/`
- Any other demo applications

**Configuration Pattern**:

```json
{
  "dependencies": {
    "@hive-academy/nestjs-chromadb": "workspace:*",
    "@hive-academy/nestjs-neo4j": "workspace:*",
    "@hive-academy/nestjs-langgraph": "workspace:*",
    "@libs/demo/agentic-memory": "workspace:*"
  }
}
```

### Phase 4: Build System Updates ⏳

#### Task 4.1: Add Build Targets for Child Modules

**Objective**: Ensure all child modules have proper build configurations

**Files to Update**:

- `libs/langgraph-modules/*/project.json` (7 files)

**Standard Build Config**:

```json
{
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/libs/langgraph-modules/{module-name}",
        "tsConfig": "libs/langgraph-modules/{module-name}/tsconfig.lib.json",
        "packageJson": "libs/langgraph-modules/{module-name}/package.json",
        "main": "libs/langgraph-modules/{module-name}/src/index.ts"
      }
    },
    "publish": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npm publish dist/libs/langgraph-modules/{module-name}"
      }
    }
  }
}
```

#### Task 4.2: Update Root Package Scripts

**Objective**: Update build and publish scripts to handle all packages

**Files to Update**:

- `package.json` - Update scripts section

**New Scripts**:

```json
{
  "scripts": {
    "build:core": "nx run-many -t build -p nestjs-chromadb,nestjs-neo4j,nestjs-langgraph",
    "build:modules": "nx run-many -t build -p langgraph-modules-checkpoint,langgraph-modules-multi-agent,langgraph-modules-monitoring,langgraph-modules-functional-api,langgraph-modules-platform,langgraph-modules-time-travel,langgraph-modules-streaming",
    "build:all": "npm run build:core && npm run build:modules",
    "publish:all": "nx release",
    "publish:dry-run": "nx release --dry-run"
  }
}
```

### Phase 5: Testing & Validation ⏳

#### Task 5.1: Build Validation

**Objective**: Ensure all packages build successfully

**Commands to Run**:

```bash
npm run build:all
```

**Validation Points**:

- All 10 packages build without errors
- Proper TypeScript declarations generated
- Package.json files copied to dist/

#### Task 5.2: Dependency Validation

**Objective**: Verify import paths and dependencies work correctly

**Test Commands**:

```bash
# Test import resolution
npx tsc --noEmit --project tsconfig.base.json

# Test demo applications
npx nx build nestjs-ai-saas-starter-demo
```

#### Task 5.3: Publishing Pipeline Test

**Objective**: Test the publishing pipeline without actually publishing

**Commands**:

```bash
# Dry run version bump
npx nx release version --dry-run

# Dry run publishing
npx nx release publish --dry-run

# Pack test packages
npm run build:all
cd dist/libs/nestjs-chromadb && npm pack
cd dist/libs/nestjs-neo4j && npm pack
cd dist/libs/langgraph-modules/nestjs-langgraph && npm pack
# ... etc for child modules
```

### Phase 6: Documentation Updates ⏳

#### Task 6.1: Update README Files

**Objective**: Update installation and usage documentation

**Files to Update**:

- Root `README.md`
- `libs/*/README.md` for each publishable package

#### Task 6.2: Create Migration Guide

**Objective**: Help users migrate from workspace setup to published packages

**New File**: `docs/MIGRATION_GUIDE.md`

#### Task 6.3: Update CLAUDE.md Files

**Objective**: Update guidance documentation with new package names

**Files to Update**:

- `libs/*/CLAUDE.md` for each package

## Risk Mitigation

### Backward Compatibility

- Keep old import paths working during transition period
- Provide clear migration timeline
- Support both workspace and published usage patterns

### Testing Strategy

- Test with packed versions before publishing
- Validate all demo applications work with published packages
- Run comprehensive integration tests

### Rollback Plan

- Keep current workspace setup functional during transition
- Ability to revert package names if needed
- Staged rollout approach (core packages first, then child modules)

## Success Criteria

### Technical Metrics

- ✅ All 10 packages build successfully
- ✅ All demo applications work with published packages
- ✅ Import paths resolve correctly
- ✅ No circular dependencies
- ✅ TypeScript compilation passes
- ✅ Test suites pass

### Publishing Metrics

- ✅ Packages can be published to npm registry
- ✅ Dependencies resolve correctly for end users
- ✅ Package sizes are reasonable
- ✅ Documentation is complete and accurate

## Post-Implementation

### Monitoring

- Track npm download statistics
- Monitor GitHub issues for integration problems
- Watch for community feedback

### Maintenance

- Regular dependency updates
- Coordinated releases across packages
- Version compatibility management

---

**Document Status**: Ready for Implementation
**Implementation Start**: TBD
**Estimated Duration**: 2-3 days
**Priority**: High
**Dependencies**: None
