# TASK_2025_036 - Migrate Neo4j Adapters to autoBind/smartBuilder

## Objective

Systematically migrate all Neo4j repositories in the `@hive-academy/langgraph-adapters` package from the deprecated `ParameterBindingUtility.addParam()` method to modern `autoBind` or `smartBuilder` patterns.

## Problem Statement

The following repositories were recently created (Phase 6 HITL refactoring) using deprecated parameter binding methods:

1. **approval-state.repository.ts** - 47 deprecated usages across multiple methods
2. **approval-chain.repository.ts** - Estimated 15-20 deprecated usages
3. **confidence-pattern.repository.ts** - Estimated 10-15 deprecated usages

**Total Estimated Deprecated Usages**: ~47 occurrences

### Why This Matters

- **Future-Proof**: The deprecated method will be removed in future versions
- **Code Consistency**: Other packages already migrated (TASK_2025_034)
- **Best Practices**: Modern patterns are more intuitive and type-safe
- **Technical Debt**: Addressing this now prevents accumulation

## Technical Requirements

### 1. Pattern Migration

Replace deprecated pattern with modern alternatives:

#### Option A: autoBind (Recommended for Simple Queries)

```typescript
// Before (Deprecated)
const bindParam = qb.getBindParam();
const idParam = ParameterBindingUtility.addParam(bindParam, 'id', id);
const query = `MATCH (a:ApprovalState { id: ${idParam} }) RETURN a`;
await qb.run(query);

// After (autoBind)
const query = `MATCH (a:ApprovalState { id: $id }) RETURN a`;
await qb.run(query, { id }, { autoBind: true });
```

#### Option B: smartBuilder (Recommended for Complex Queries)

```typescript
// Before (Deprecated)
const bindParam = qb.getBindParam();
const params = {
  id: ParameterBindingUtility.addParam(bindParam, 'id', data.id),
  threadId: ParameterBindingUtility.addParam(bindParam, 'threadId', data.threadId),
  status: ParameterBindingUtility.addParam(bindParam, 'status', data.status),
};

const query = `
  CREATE (a:ApprovalState {
    id: ${params.id},
    threadId: ${params.threadId},
    status: ${params.status}
  })
  RETURN a
`;

// After (smartBuilder)
const qb = this.neogma.createQueryBuilder();

qb.create(
  `(a:ApprovalState {
  id: $id,
  threadId: $threadId,
  status: $status
})`
).return('a');

await qb.run(qb.getStatement(), {
  id: data.id,
  threadId: data.threadId,
  status: data.status,
});
```

### 2. Files to Modify

| File                             | Methods to Update | Estimated LOC Impact |
| -------------------------------- | ----------------- | -------------------- |
| approval-state.repository.ts     | 8 methods         | ~120 lines           |
| approval-chain.repository.ts     | 5 methods         | ~80 lines            |
| confidence-pattern.repository.ts | 4 methods         | ~60 lines            |

**Total**: 17 methods, ~260 lines of code

### 3. Methods to Update per Repository

#### approval-state.repository.ts

- `saveApprovalState()`
- `loadApprovalState()`
- `listApprovalsByThread()`
- `updateApprovalStatus()`
- `saveApprovalChain()`
- `loadApprovalChain()`
- `cleanupOldApprovals()`
- `ensureIndexes()` (4 index creation queries)

#### approval-chain.repository.ts

- `saveApprovalChain()`
- `getApprovalChain()`
- `updateChainStatus()`
- `listChainsByExecution()`
- `cleanupOldChains()`

#### confidence-pattern.repository.ts

- `storePattern()`
- `getPattern()`
- `searchPatterns()`
- `cleanupOldPatterns()`

## Implementation Steps

### Phase 1: Analyze and Prepare (Backend Developer)

1. Read all three repository files
2. Identify all deprecated usage patterns
3. Document current query structures
4. Choose appropriate pattern (autoBind vs smartBuilder) per method

### Phase 2: Migration (Backend Developer)

For each repository file:

1. **Update imports** (if needed)

   ```typescript
   // May need to adjust imports based on chosen pattern
   ```

2. **Method-by-method migration**

   - Replace `ParameterBindingUtility.addParam()` calls
   - Update query string parameter placeholders
   - Adjust `qb.run()` calls with new parameters
   - Preserve all business logic, decorators, and error handling

3. **Verify query equivalence**
   - Ensure parameters are bound correctly
   - Maintain query behavior
   - Preserve all conditional logic (e.g., null checks)

### Phase 3: Validation (Backend Developer)

1. **Type check** - `npx nx typecheck langgraph-adapters`
2. **Build verification** - `npx nx build langgraph-adapters`
3. **Deprecated usage check** - `grep -r "ParameterBindingUtility.addParam" libs/langgraph-modules/adapters/src/lib/repositories`
4. **Code review** - Ensure pattern consistency across all methods

## Success Criteria

- [ ] **Zero deprecated usages**: grep returns 0 results
- [ ] **Type safety**: All type checks pass
- [ ] **Build success**: Package builds without errors
- [ ] **Pattern consistency**: All methods use same modern pattern (autoBind or smartBuilder)
- [ ] **Functionality preserved**: All queries produce identical results
- [ ] **Code clarity**: Modern patterns are more readable than deprecated ones
- [ ] **Documentation updated**: Method comments reflect new pattern if needed

## Testing Strategy

### Manual Verification

1. **Visual Inspection**:

   - Compare before/after query structures
   - Verify parameter names match between query and params object
   - Check conditional parameter handling (e.g., optional fields)

2. **Type Checking**:

   ```bash
   npx nx typecheck langgraph-adapters
   ```

3. **Build Verification**:

   ```bash
   npx nx build langgraph-adapters
   ```

4. **Pattern Verification**:
   ```bash
   # Should return 0 results
   grep -r "ParameterBindingUtility.addParam" libs/langgraph-modules/adapters/src/lib/repositories
   ```

### Integration Testing (Optional)

If time permits, test representative methods:

- Create approval state → verify Neo4j node created correctly
- Load approval state → verify query returns correct data
- Update approval status → verify properties updated correctly

## Rollback Plan

If issues arise:

1. Repository files are in git - can revert individual commits
2. No external API changes - purely internal implementation
3. Original pattern is well-documented in git history

## Estimated Effort

**Backend Developer**: 2-3 hours

- Analysis: 30 minutes
- Migration: 1.5-2 hours (17 methods)
- Validation: 30 minutes

**Total**: Medium effort task

## Dependencies

**Blocked By**: None (can start immediately)

**Blocks**: None (no dependent tasks)

**Related**:

- TASK_2025_034: Similar migration completed for HITL package (reference implementation)
- TASK_2025_035: Library-wide BindParam standardization (broader scope)

## Reference Documentation

- **Neo4j Library CLAUDE.md**: `libs/nestjs-neo4j/CLAUDE.md` - Documents modern patterns
- **TASK_2025_034**: Similar migration in HITL package (pattern reference)
- **TASK_2025_033**: Phase 6 refactoring that created these repositories

## Notes

- **Consistency Priority**: All three repositories should use the same pattern (either all autoBind or all smartBuilder)
- **Decorator Preservation**: All `@Authorize`, `@ValidateInput`, `@AuditLog`, `@Safe` decorators must remain unchanged
- **Error Handling**: Preserve all try-catch blocks and error logging
- **Performance**: Modern patterns should have identical or better performance
