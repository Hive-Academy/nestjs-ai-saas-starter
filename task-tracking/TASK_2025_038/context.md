# Task Context for TASK_2025_038

## User Intent

Fix systematic Neo4j type conversion error where Neo4j is receiving Map{low -> Long(0), high -> Long(0)} objects instead of primitive numbers, causing all GraphAgentService.trackMemory operations to fail.

## Problem Description

**Error**: `Property values can only be of primitive types or arrays thereof. Encountered: Map{low -> Long(0), high -> Long(0)}.`

**Root Cause**: Neo4j Integer/Long types are not being converted to JavaScript primitives before query execution. The neo4j-driver returns numeric values as Neo4j Integer objects with `{low, high}` structure, and these are being passed directly to Cypher query parameters.

**Impact**:

- All GraphAgentService.trackMemory operations fail
- Graph-based agent memory storage is completely broken
- Error occurs when setting properties like `m.accessCount` in Cypher queries

**Scope**:

- Implement parameter sanitization to convert Neo4j Integer/Long types to JavaScript primitives
- Apply fix at the boundary where data enters Neo4j queries
- Likely in GraphAgentService.trackMemory or shared parameter preparation utility

## Technical Context

- Branch: feature/038
- Created: 2025-11-07
- Task Type: BUGFIX
- Priority: P0-Critical (blocking GraphAgentService operations)
- Effort Estimate: M (Medium - requires parameter sanitization implementation)
- Related Tasks:
  - TASK_2025_034 (Fix Neo4j/Neogma BindParam Issues - Phase 1A Complete)
  - TASK_2025_036 (Migrate Neo4j Adapters to autoBind/smartBuilder - Complete)
  - TASK_2025_037 (State Architecture - discovered issue during testing)

## Error Stack Trace

From log.md:

```
[Nest] 7788 - 11/06/2025, 11:39:04 PM ERROR [NeogmaService] Error in run(
MERGE (t:Thread {id: $threadId})
        SET t.lastActivity = datetime()
        MERGE (m:Memory {id: $memoryId})
        SET m.content = $content,
            m.type = $type,
            m.importance = $importance,
            m.createdAt = datetime($createdAt),
            m.accessCount = $accessCount
MERGE (t)-[:CONTAINS]->(m)
        RETURN m.id as memoryId
      ):

Property values can only be of primitive types or arrays thereof. Encountered: Map{low -> Long(0), high -> Long(0)}.
```

Location: `GraphAgentService.trackMemory` in @hive-academy/langgraph-adapters

## Execution Strategy

**BUGFIX Strategy** (Streamlined):

- Skip project-manager (requirements clear from error analysis)
- Skip researcher-expert (problem is well-defined)
- Proceed directly to team-leader for task decomposition
- Focus on parameter sanitization implementation
- Verify fix with real GraphAgentService.trackMemory operations
- User chooses QA phase (senior-tester and/or code-reviewer)

## Status

**Current State**: Task initialized, ready for team-leader decomposition
**Next Phase**: Team-leader MODE 1 (DECOMPOSITION) → Implementation → Testing
