# TASK_2025_036 - Context

## User Intent

Update all Neo4j repositories in the adapters package to use modern `autoBind` or `smartBuilder` instead of the deprecated `ParameterBindingUtility.addParam()` method.

## Background

During the HITL module refactoring (TASK_2025_033 - Phase 6), we created new repositories following existing patterns. However, these repositories use the deprecated `ParameterBindingUtility.addParam()` method which has the following deprecation notice:

```typescript
@deprecated
Use autoBind or smartBuilder instead
Legacy method for single parameter binding
```

## Scope

**Affected Package**: `@hive-academy/langgraph-adapters`

**Files to Update**: 3 repositories

- `libs/langgraph-modules/adapters/src/lib/repositories/neo4j/approval-state.repository.ts`
- `libs/langgraph-modules/adapters/src/lib/repositories/neo4j/approval-chain.repository.ts`
- `libs/langgraph-modules/adapters/src/lib/repositories/neo4j/confidence-pattern.repository.ts`

**Deprecated Usage Count**: 47 occurrences across 3 files

## Migration Strategy

Replace deprecated pattern:

```typescript
// ❌ OLD (Deprecated)
const params = {
  id: ParameterBindingUtility.addParam(bindParam, 'id', data.id),
  status: ParameterBindingUtility.addParam(bindParam, 'status', data.status),
};

const query = `
  MATCH (a:ApprovalState { id: ${params.id} })
  SET a.status = ${params.status}
  RETURN a
`;
```

With modern pattern using `autoBind`:

```typescript
// ✅ NEW (Recommended)
const query = `
  MATCH (a:ApprovalState { id: $id })
  SET a.status = $status
  RETURN a
`;

const result = await qb.run(
  query,
  {
    id: data.id,
    status: data.status,
  },
  { autoBind: true }
);
```

Or with `smartBuilder`:

```typescript
// ✅ NEW (Alternative - Smart Builder)
const qb = this.neogma.createQueryBuilder();

qb.match('(a:ApprovalState { id: $id })').set('a.status = $status').return('a');

const result = await qb.run(qb.getStatement(), {
  id: data.id,
  status: data.status,
});
```

## Reference Implementation

The `developer.repository.ts` in `@hive-academy/nestjs-neo4j` package uses `autoBind` pattern (confirmed via CLAUDE.md documentation).

## Verification Criteria

1. **Type Safety**: All type checks must pass
2. **Build Success**: Package must build without errors
3. **Pattern Consistency**: All repositories follow same modern pattern
4. **Zero Deprecated Usage**: `grep -r "ParameterBindingUtility.addParam"` returns 0 results
5. **Functionality Preserved**: All queries must work identically to before

## Related Tasks

- **TASK_2025_033**: Phase 6 HITL refactoring (where these repositories were created)
- **TASK_2025_034**: Fix Neo4j/Neogma BindParam Issues (Phase 1A - HITL) - Similar migration completed
- **TASK_2025_035**: Complete BindParam Standardization (Phase 1B - Library) - Pending

## Priority Rationale

**Priority**: P1-High

**Reasoning**:

1. **Technical Debt**: Using deprecated APIs that will be removed in future versions
2. **Code Consistency**: Other repositories already migrated (TASK_2025_034)
3. **Recent Changes**: These files were just created in Phase 6 refactoring
4. **Quick Fix**: Only 3 files, well-defined pattern replacement

## Conversation Summary

**User Request**: "while we are these these repositories shouldn't be using the ParameterBindingUtility.addParam as its deprecated `(method) ParameterBindingUtility.addParam(bindParam: BindParam, key: string, value: any): string @deprecated Use autoBind or smartBuilder instead Legacy method for single parameter binding` can we start a task with the backend developer to update all of our neo4j repositories under the adapter to use the autoBind or smartBuilder intuitively"

**Context**: This request came immediately after completing the HITL module refactoring where we created new repositories following existing patterns, but those patterns used the deprecated method.
