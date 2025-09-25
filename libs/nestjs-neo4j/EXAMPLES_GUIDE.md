# Neo4j Library Comprehensive Examples Guide

> This guide consolidates practical, copy-pastable examples for the major features of `@hive-academy/nestjs-neo4j`. It complements the existing README (conceptual/manual) and the demo application (end-to-end). Use this as a focused recipe collection.

## Contents

1. Bootstrapping & Connectivity

2. Basic CRUD with `BaseRepository`
3. Relationships (create/query/analytics)
4. Graph Traversal & Path Finding (with fallback)
5. Connected Components (GDS + in-memory fallback)
6. Typed Cypher Queries (`@CypherQuery` / `@CypherQuery`)
7. Constraints & Index Decorators
8. Transactions & Retry Strategies
9. Metrics & Health Monitoring
10. Multi-Tenancy Patterns
11. Bulk Operations
12. Security & Safe Decorators
13. Testing & Mocking Patterns
14. Performance / Profiling

---

### 1. Bootstrapping & Connectivity

```typescript
@Module({
  imports: [
    Neo4jModule.forRoot({
      url: process.env.NEO4J_URI || 'neo4j://localhost:7687',
      username: process.env.NEO4J_USER || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'neo4j',
      database: process.env.NEO4J_DATABASE || 'neo4j',
      config: { maxConnectionPoolSize: 20 },
    }),
  ],
})
export class AppModule {}

@Injectable()
export class ConnectivityService {
  constructor(private readonly neo4j: Neo4jService) {}
  async status() {
    return this.neo4j.verifyConnectivity();
  }
}
```

### 2. Basic CRUD (`BaseRepository`)

```typescript
interface Person {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
@Injectable()
export class PersonRepository extends BaseRepository<Person> {
  protected readonly entityLabel = 'Person';
  protected readonly neo4jService: Neo4jService;
  constructor(neo4j: Neo4jService) {
    super('Person', neo4j);
    this.neo4jService = neo4j;
  }
}

// Usage
const created = await repo.create({ name: 'Alice' });
const found = await repo.findById(created.id);
await repo.update(created.id, { name: 'Alice Updated' });
await repo.delete(created.id); // soft delete
```

### 3. Relationships

```typescript
interface FOLLOWS {
  since: string;
}
@Injectable()
export class FollowsRelationshipService extends RelationshipModelService<FOLLOWS> {
  protected relationshipType = 'FOLLOWS';
  constructor(protected neo4j: Neo4jService) {
    super(neo4j);
  }
  async follow(aId: string, bId: string) {
    return this.create({ sourceId: aId, targetId: bId, properties: { since: new Date().toISOString() } });
  }
  async mutual(aId: string, bId: string) {
    return this.findBidirectional({ nodeId1: aId, nodeId2: bId, relationshipType: 'FOLLOWS' });
  }
}
```

### 4. Graph Traversal & Paths

```typescript
@Injectable()
export class SocialGraphRepository extends GraphRepository<any> {
  protected readonly entityLabel = 'Person';
  protected readonly neo4jService: Neo4jService;
  constructor(neo4j: Neo4jService) {
    super('Person', neo4j);
    this.neo4jService = neo4j;
  }

  async shortest(a: string, b: string) {
    return this.findShortestPath(a, b, { relationshipTypes: ['FOLLOWS'], maxLength: 6 });
  }

  async neighbors(id: string) {
    return this.findNeighbors(id, { relationshipTypes: ['FOLLOWS'], maxDepth: 1 });
  }
}
```

### 5. Connected Components

```typescript
const components = await graphRepo.findConnectedComponents({ relationshipTypes: ['FOLLOWS'] });
// If GDS unavailable, library falls back to in-memory BFS implementation.
```

### 6. Typed Cypher Queries

```typescript
@Injectable()
export class AnalyticsService {
  @CypherQuery<`MATCH (u:User {id: $userId})-[:POSTED]->(p:Post) RETURN p LIMIT $limit`, { userId: string; limit: number }, { p: { id: string; title: string } }>()
  async userPosts(): Promise<Array<{ id: string; title: string }>> {
    return [] as any;
  }
}
```

### 7. Constraints & Indexes

```typescript
@Index({ label: 'User', properties: ['email'], type: 'BTREE' })
@Unique({ label: 'User', properties: ['id'] })
export class UserConstraintPlaceholder {}

// Later a ConstraintService (if exposed) can materialize them on startup.
```

### 8. Transactions & Retry

```typescript
await neo4j.runInTransaction(
  async (tx) => {
    await tx.run('CREATE (n:Temp {id: $id})', { id: 'x' });
  },
  { retry: { enabled: true, attempts: 3, delay: 250 } }
);
```

### 9. Metrics & Health

```typescript
const metrics = neo4j.getMetrics();
const queryMetrics = neo4j.getQueryMetrics();
const health = await neo4j.getHealth();
```

### 10. Multi-Tenancy (Conceptual Snippet)

```typescript
// Assume MultiTenantNeo4jService exists & routes by tenant context
await multiTenantService.runForTenant('tenantA', async (svc) => {
  await svc.run('CREATE (n:Scoped {id: $id})', { id: 'A1' });
});
```

### 11. Bulk Operations

```typescript
await neo4j.bulkOperation([
  { cypher: 'CREATE (n:Item {id: $id})', params: { id: '1' } },
  { cypher: 'CREATE (n:Item {id: $id})', params: { id: '2' } },
]);
```

### 12. Security / Safe Decorators (Skeleton)

```typescript
@Neo4jSafe()
@Transactional()
async dangerousQuery(userInput: string) {
  return this.neo4j.run('MATCH (n) WHERE n.name = $name RETURN n', { name: userInput });
}
```

### 13. Testing & Mocking

```typescript
// Pseudo-code: create a mock driver with deterministic responses
const moduleRef = await Test.createTestingModule({
  providers: [SomeService, mockNeo4jProvider()],
}).compile();
```

### 14. Profiling / EXPLAIN / Performance

```typescript
await neo4j.run('MATCH (n) RETURN n LIMIT 5', {}, { profile: true });
await neo4j.run('MATCH (n) RETURN n LIMIT 5', {}, { explain: true });
```

---

### Patterns & Best Practices

- Prefer repository abstraction for reuse & consistency.
- Use typed decorators for shared, repeatable query signatures.
- Keep relationship creation narrow (one function per semantic action).
- Wrap multi-step writes in explicit transactions with retry.
- Enable metrics in staging to baseline latency before production.
- Fall back gracefully when GDS / APOC not present.
- Use bulk operations for ingestion; avoid large single Cypher with massive UNWIND unless measured.

### Roadmap Hooks (Integration Targets)

- External metrics exporter (Prometheus bridge)
- Driver-level circuit breaker integration
- Schema synchronization utility (auto create constraints)

### Migration Notes

If upgrading from earlier simpler versions:

- New metrics do not require code changes; they auto-collect when enabled.
- Path & connected components now provide fallback automatically.
- Session acquisition metrics appear in connection utilization; no API change.

### Example Ordering Suggestion for Learners

1. Bootstrapping → 2. CRUD → 3. Relationships → 4. Traversal/Paths → 5. Components → 6. Typed Queries → 7. Constraints → 8. Transactions → 9. Metrics & Health → 10. Multi-Tenancy → 11+. Advanced.

### Open Gaps (Potential Future Examples)

- Centrality algorithms expansion (betweenness, eigenvector) wrapper
- Domain-driven aggregates with versioning
- Temporal relationship patterns (validFrom/validTo)

---

_Last updated:_ (auto-maintain manually) 2025-09-24

If something is unclear or you want a new recipe added, open a repo issue with label `examples`.
