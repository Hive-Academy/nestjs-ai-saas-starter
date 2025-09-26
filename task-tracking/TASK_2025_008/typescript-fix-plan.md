# TypeScript Error Fix Plan - nestjs-neo4j Library

## Overview

After removing models folder and BaseRepository, we have ~150+ TypeScript errors that need systematic fixing.

## Error Categories

### 1. **Type Export Conflicts** (Priority: HIGH)

**Files:** `src/index.ts`, `src/lib/repositories/index.ts`
**Issues:**

- Duplicate identifier 'GraphRepository'
- Duplicate identifier 'RelationshipRepository'
- Duplicate identifier 'Neo4jQueryResult'
- QueryResult name collision

**Fix Strategy:**

- correctly resolve export conflicts by wether merging interfaces or renaming.
- Rename conflicting types with proper prefixes
- Remove duplicate exports

### 2. **Repository Architecture Issues** (Priority: HIGH)

**Files:** `graph-repository.ts`, `relationship-repository.ts`
**Issues:**

- Missing methods: `executeQuery`, `mapFromNeo4j`, `logger`
- TypeScript generic constraints issues
- Override modifiers on standalone classes
- Missing `includeSoftDeleted` property

**Fix Strategy:**

- Add missing helper methods properly
- Fix generic type constraints
- Remove override modifiers
- Complete type definitions

### 3. **Query Builder Type Safety** (Priority: MEDIUM)

**File:** `query-builder/neo4j-query-builder.ts`
**Issues:**

- Symbol to string conversion errors
- Private property conflicts in inheritance
- Generic type constraints

**Fix Strategy:**

- Use String() wrapper for symbols
- Fix inheritance issues in TypedQueryBuilder
- Add proper generic constraints

### 4. **Examples Type Errors** (Priority: LOW)

**Files:** All files in `examples/` folder
**Issues:**

- CypherQuery decorator returning wrong types
- Missing 'advanced' property
- BaseRepository import errors
- Property decorator signature issues

**Fix Strategy:**

- Update examples to use new decorator API
- Fix import statements
- Update return types to match QueryResult interface

### 5. **Configuration Type Issues** (Priority: MEDIUM)

**Files:** Module setup examples
**Issues:**

- Optional properties (password, uri) not matching required types
- ConfigService return types

**Fix Strategy:**

- Add proper null checks and defaults
- Update interface definitions to allow undefined

## Implementation Steps

### Step 1: Fix Type Export Conflicts

```typescript
// src/index.ts
// Change from:
export * from './lib/repositories/graph-repository';
// To:
export { 
  GraphRepository,
  type GraphTraversalOptions,
  // ... specific exports
} from './lib/repositories/graph-repository';
```

### Step 2: Fix Repository Base Classes

```typescript
// Add missing methods and properties
class GraphRepository<T = any> {
  protected readonly logger = new Logger(GraphRepository.name);
  
  protected async executeQuery(...) { /* impl */ }
  protected mapFromNeo4j(record: any): T { /* impl */ }
}
```

### Step 3: Fix Query Builder

```typescript
// Fix symbol conversions
where<K extends keyof T>(
  property: `${string}.${String(K & string)}` | K,
  // ...
)
```

### Step 4: Update Examples

- Remove references to BaseRepository
- Update @CypherQuery usage to return QueryResult
- Fix decorator signatures

### Step 5: Add Missing Type Definitions

```typescript
interface RepositoryQueryOptions {
  includeSoftDeleted?: boolean;
  // ... other options
}
```

## Success Criteria

1. ✅ All TypeScript errors resolved
2. ✅ Proper type safety with generics
3. ✅ No duplicate exports
4. ✅ Examples working with new decorator API
5. ✅ Clean architecture without models/BaseRepository

## Testing Plan

1. Run `npx nx typecheck nestjs-neo4j`
2. Run `npx nx test nestjs-neo4j`
3. Build library: `npx nx build nestjs-neo4j`
4. Verify examples compile

## Estimated Time

- Type Export Conflicts: 30 minutes
- Repository Architecture: 1 hour
- Query Builder: 30 minutes
- Examples: 1 hour
- Testing & Verification: 30 minutes

**Total: ~3.5 hours**
