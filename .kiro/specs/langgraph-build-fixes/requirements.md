# Requirements Document

## Introduction

This spec addresses systematic build and import issues across the entire langgraph-modules ecosystem that prevent successful compilation and API server startup. The issues stem from inconsistent export patterns, missing interface exports, and improper inter-module dependency configurations in the Rollup-based build system.

**Business Context**: The `npm run api` command fails due to cascading build errors across 12+ langgraph modules, blocking development workflow and preventing the NestJS AI SaaS Starter from functioning. These issues compound as modules depend on each other, creating a web of broken imports.

**Value Proposition**: Systematic resolution will enable successful builds, restore the development workflow, and establish consistent patterns that prevent future import/export issues.

## Requirements

### Requirement 1: Fix Missing Interface and Type Exports

**User Story:** As a developer importing from langgraph modules, I want all interfaces, types, and enums to be properly exported, so that TypeScript compilation succeeds without "has no exported member" errors.

#### Acceptance Criteria

1. WHEN importing from @hive-academy/langgraph-core THEN all interfaces (WorkflowState, HumanFeedback, Command, etc.) SHALL be available
2. WHEN importing from @hive-academy/langgraph-streaming THEN all streaming interfaces and StreamEventType enum SHALL be available  
3. WHEN importing from @hive-academy/langgraph-functional-api THEN all metadata functions (getWorkflowMetadata, getWorkflowNodes, etc.) SHALL be available
4. WHEN importing constants THEN all required constants (LANGGRAPH_MODULE_OPTIONS, WORKFLOW_TOOLS_KEY, etc.) SHALL be available

### Requirement 2: Standardize Export Patterns Across Modules

**User Story:** As a maintainer of the monorepo, I want consistent export patterns across all langgraph modules, so that imports work predictably and maintenance is simplified.

#### Acceptance Criteria

1. WHEN exporting interfaces THEN modules SHALL use `export type` for type-only exports and regular exports for runtime values
2. WHEN exporting enums THEN modules SHALL use regular exports since enums have runtime values
3. WHEN exporting functions THEN modules SHALL use regular exports for runtime access
4. WHEN exporting constants THEN modules SHALL use regular exports for runtime access

### Requirement 3: Configure Rollup Inter-Module Dependencies

**User Story:** As a developer building langgraph modules, I want Rollup to properly handle dependencies between modules, so that builds succeed without "Could not load" errors.

#### Acceptance Criteria

1. WHEN building modules with dependencies THEN buildLibsFromSource SHALL be set to true for dependent modules
2. WHEN building modules THEN external dependencies SHALL be properly configured to prevent bundling issues
3. WHEN modules import from other @hive-academy packages THEN those packages SHALL be marked as external
4. WHEN building the entire ecosystem THEN build order SHALL respect dependency hierarchy

### Requirement 4: Fix Type Import/Export Mismatches

**User Story:** As a TypeScript developer, I want imports to match the export types (type vs runtime), so that compilation succeeds in both development and build modes.

#### Acceptance Criteria

1. WHEN importing interfaces for type annotations THEN imports SHALL use `import type` syntax
2. WHEN importing enums or functions for runtime use THEN imports SHALL use regular `import` syntax  
3. WHEN using buildLibsFromSource THEN type exports SHALL be compatible with source file reading
4. WHEN building for production THEN all imports SHALL resolve correctly from dist files

### Requirement 5: Validate Complete Build Pipeline

**User Story:** As a developer running the API server, I want all langgraph modules to build successfully, so that `npm run api` starts without errors.

#### Acceptance Criteria

1. WHEN running `npx nx build langgraph-modules/core` THEN build SHALL complete without errors
2. WHEN running `npx nx build langgraph-modules/streaming` THEN build SHALL complete without errors
3. WHEN running `npx nx build langgraph-modules/functional-api` THEN build SHALL complete without errors
4. WHEN running `npx nx build langgraph-modules/workflow-engine` THEN build SHALL complete without errors
5. WHEN running `npm run api` THEN dev-brand-api SHALL start successfully without build errors

## Non-Functional Requirements

### Performance Requirements
- Individual module builds SHALL complete within 10 seconds
- Full ecosystem build SHALL complete within 2 minutes
- API startup SHALL complete within 30 seconds after fixes

### Quality Requirements
- Zero TypeScript compilation errors across all modules
- Zero "has no exported member" errors
- Zero "Could not load" Rollup errors
- 100% of required exports available for import

### Maintainability Requirements
- Consistent export patterns documented for future reference
- Clear dependency hierarchy established
- Rollup configurations standardized across modules
- Import/export guidelines documented for new modules
