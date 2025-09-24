# Dev Brand API Neo4j Migration (Decorator DX + Adapters Unification)

> Status: DRAFT (Implementation Beginning)
> Scope: `apps/dev-brand-api` migration to improved developer experience for `@hive-academy/nestjs-neo4j` (inline query decorators, repository transition, adapter refactors, HITL storage alignment).
> Policy: No backward compatibility retained for old `@CypherQuery({ query: ... })` signature (inline-only going forward) per project modernization rules.

## 1. Goals

1. Replace legacy direct `neo4jService.run()` usage with:
   - Inline query decorator pattern (`@CypherQuery({...})` on methods returning query text or `{ query, params }`).
   - Repository abstractions (Base/Graph/Relationship) for core domain entities.
2. Introduce graph entity modeling for developer branding + HITL workflows.
3. Wrap multi-step writes inside `@Transactional` boundaries.
4. Standardize HITL adapters (approval, interruption, feedback, confidence, approval chain) on unified patterns (decorated queries + repositories when appropriate).
5. Enable selective caching + metrics for read-heavy analytics.
6. Integrate health + metrics endpoints with real Neo4j service inspections.
7. Optimize batch patterns (semantic relationship building, conversation flows) using bulk operations / UNWIND.

## 2. Affected Components

| Area              | Files                                                                                                                                                                                           | Action                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Decorator API     | `libs/nestjs-neo4j/src/lib/decorators/cypher-query.decorator.ts`                                                                                                                                | BREAKING: remove `config.query` requirement; use inline return query.       |
| Branding Service  | `personal-brand-memory.service.ts`                                                                                                                                                              | Refactor to repositories + inline queries.                                  |
| Graph Adapter     | `neo4j-graph.adapter.ts`                                                                                                                                                                        | Replace manual CRUD/traversal with repository + decorated helpers (phased). |
| HITL Adapters     | `neo4j-hitl-storage.adapter.ts`, `neo4j-approval-chain-storage.adapter.ts`, `neo4j-confidence-storage.adapter.ts`, `neo4j-feedback-storage.adapter.ts`, `neo4j-interruption-storage.adapter.ts` | Model entities; introduce transactional + decorated query operations.       |
| Health Controller | `health.controller.ts`                                                                                                                                                                          | Add real Neo4j metrics + connectivity check.                                |
| New Entities      | `app/graph/entities/*.ts`                                                                                                                                                                       | Add domain graph modeling.                                                  |
| New Repositories  | `app/graph/repositories/*.ts`                                                                                                                                                                   | Encapsulate CRUD/graph logic.                                               |
| Tests             | `app/graph/__tests__/*`                                                                                                                                                                         | Ensure CRUD, transactional rollback, decorated query, adapter behavior.     |
| Docs              | This file + update relevant root CLAUDE.md/Examples after implementation.                                                                                                                       |

## 3. Domain Modeling (Initial Set)

### Entities

- Developer (id, createdAt)
- Achievement (id, impact, date, repository, description)
- Technology (name)
- BrandStrategy (id, positioning, targetAudience, confidenceScore, createdAt)
- Memory (lightweight wrapper if needed for relationships; avoid duplicating memory module types)
- ApprovalRequest (id, executionId, status, requestedAt, expiresAt, metadata fields)
- ApprovalResponse (decision, timestamp, approvedBy, message)
- Feedback (id, executionId, category, sentiment, createdAt)
- InterruptionEvent (id, executionId, type, createdAt, status)
- ConfidenceSnapshot (id, executionId, score, model, createdAt)
- ApprovalChainNode (id, chainId, order, approverRole)

### Relationships

- (Developer)-[:ACHIEVED]->(Achievement)
- (Achievement)-[:USES_TECHNOLOGY]->(Technology)
- (Developer)-[:EXPERIENCED_WITH]->(Technology)
- (Developer)-[:HAS_STRATEGY]->(BrandStrategy)
- (Memory)-[:SEMANTICALLY_SIMILAR]->(Memory)
- (Memory)-[:FOLLOWS_IN_CONVERSATION]->(Memory)
- (ApprovalRequest)-[:HAS_RESPONSE]->(ApprovalResponse)
- (ApprovalChainNode)-[:NEXT]->(ApprovalChainNode)
- (ApprovalChainNode)-[:ASSOCIATED_WITH]->(ApprovalRequest)

## 4. New Decorator API (Inline Mode – Breaking)

Old (removed):

```ts
@CypherQuery({
  query: 'MATCH (n) RETURN n',
  cache: { ttl: 60 }
})
async list() {}
```

New (inline-only):

```ts
@CypherQuery({ cache: { ttl: 60 } })
async listAllDevs() {
  return `MATCH (d:Developer) RETURN d`;
}

@CypherQuery({ cache: { ttl: 30 } })
async getTopTechnologies(developerId: string, limit = 5) {
  return {
    query: `
      MATCH (d:Developer {id: $developerId})-[:ACHIEVED]->(a:Achievement)-[:USES_TECHNOLOGY]->(t:Technology)
      RETURN t.name as technology, count(a) as frequency
      ORDER BY frequency DESC
      LIMIT $limit
    `,
    params: { developerId, limit }
  };
}
```

Accepted return shapes:

1. `string` (Cypher)
2. `{ query: string; params?: Record<string, any>; description?: string; tags?: string[] }`
3. Builder shape: `{ cypher: string; parameters?: Record<string, any> }`

If parameters are omitted and only string returned, the legacy positional fallback (`param0`, `param1`) is used (discouraged—prefer explicit params object).

## 5. Migration Phases (Execution Order)

| Phase | Summary                             | Key Outputs                                                        |
| ----- | ----------------------------------- | ------------------------------------------------------------------ |
| 0     | Decorator change (inline-only)      | Updated decorator + doc (this file)                                |
| 1     | Entities + repositories scaffolding | Compilable provider registrations + unit CRUD test                 |
| 2     | Branding service refactor           | Uses repositories & inline decorated queries                       |
| 3     | Graph adapter partial replacement   | Node/relationship create via repos; traversal via decorated method |
| 4     | HITL adapters refactor              | Each adapter uses entities + decorated queries + transactions      |
| 5     | Health metrics integration          | Real Neo4j health & metrics endpoint additions                     |
| 6     | Batch & performance                 | Bulk operations / UNWIND rewrites; caching tuning                  |
| 7     | Cleanup & tests                     | Remove obsolete helper logic; finalize coverage                    |

## 6. Detailed Task Checklist

### Phase 0: Decorator Inline Refactor

- [ ] Modify `cypher-query.decorator.ts` to remove mandatory `query` from config.
- [ ] Implement runtime normalization + validation after method body return.
- [ ] Update metadata placeholder (`<INLINE>`).
- [ ] Add error paths for missing/empty query content.

### Phase 1: Scaffolding

- [ ] Create `graph/entities/*` with decorators.
- [ ] Create `graph/repositories/*` extending Base/Graph/Relationship repos.
- [ ] Provide index export + register in `AppModule` providers.
- [ ] Add minimal Jest tests for one repository (create + find + delete soft or detach pattern decision).

### Phase 2: PersonalBrandMemory Refactor

- [ ] Convert `storeCodeAchievement`, `storeBrandStrategy` to `@Transactional` + repository calls.
- [ ] Extract analytics queries as inline decorated methods.
- [ ] Add caching to stable analytics (skills, evolution, content patterns).

### Phase 3: Graph Adapter

- [ ] Map createNode/createRelationship to repository operations.
- [ ] Replace manual stats queries with decorated queries (cached).
- [ ] Add transaction wrapper for batch conversation flow & semantic relationship building.

### Phase 4: HITL Adapters

For each adapter:

- [ ] Model its entity/relationships.
- [ ] Replace raw Cypher with decorated inline queries.
- [ ] Add `@Transactional` for multi-step workflows (e.g., storing approval + chain linking).
- [ ] Add targeted caches (pending approvals, confidence snapshots summary, latest feedback set).

### Phase 5: Health Integration

- [ ] Inject Neo4j health/metrics service (if exported) in controller.
- [ ] Add aggregated query counts, last latency, node/rel totals.
- [ ] Provide graceful fallback if driver unavailable.

### Phase 6: Performance Optimization

- [ ] Rewrite semantic similarity creation using UNWIND with precomputed similarity list (future: integrate vector similarity service).
- [ ] Conversation flow creation: single UNWIND for edges.
- [ ] Add index recommendations to README snippet.

### Phase 7: Cleanup

- [ ] Remove dead code: node/relationship parsing helpers if superseded.
- [ ] Ensure no remaining direct `neo4jService.run` except in repository internals.
- [ ] Update `CHANGELOG.md` (Breaking: decorator API).
- [ ] Update `CLAUDE.md` & `EXAMPLES_GUIDE.md` to show inline usage only.

## 7. Testing Strategy

| Test Type              | Purpose                                                                      |
| ---------------------- | ---------------------------------------------------------------------------- |
| Repository CRUD        | Validate entity label mapping and property persistence                       |
| Transaction Rollback   | Force error mid-transaction; assert no partial nodes                         |
| Decorator Inline Modes | Return string vs object forms                                                |
| Caching Behavior       | Stub/run same query twice; ensure second is cache hit (if framework exposes) |
| Adapter Lifecycle      | HITL approval create → status update → response link                         |
| Batch Ops              | Semantic relationship bulk creation count correctness                        |
| Health Endpoint        | Returns dynamic counts & status shape                                        |

## 8. Performance / Observability Hooks

- Enable metrics collection in config (already present) and verify post-refactor query metadata includes execution time.
- Add optional slow query logging threshold (1000ms) in config.

## 9. Rollback Policy

Per project rules we will NOT ship alternate APIs. If emergency rollback needed:

1. Revert commit containing decorator change.
2. Revert dependent refactors (entities unaffected).
   No feature flags introduced.

## 10. Developer Notes

- Always prefer returning `{ query, params }` for clarity.
- Keep queries formatted with leading newline + indentation for readability.
- Complex dynamic queries: build string segments clearly; avoid inline string concatenation inside decorator config (now obsolete).
- Use `@Transactional()` only at orchestration layer – repositories stay side-effect minimal.

## 11. Open Questions (To Resolve During Implementation)

- Do we need a lightweight abstraction for frequently reused projections (e.g., technology frequency)? Potential later addition.
- Should Memory-related relationships be partially delegated to memory module adapter? (Leave in adapter for now; only wrap Neo4j access.)
- Constraint materialization on startup—library helper TBD; temporary manual Cypher migration may be documented separately.

## 12. Next Immediate Actions (Implementation)

1. Commit this document.
2. Refactor decorator for inline queries (breaking change).
3. Scaffold entities + repositories.

---

_Prepared:_ 2025-09-24
_Author:_ Automated migration assistant
_Breaking Change:_ Yes – Cypher decorator signature.
