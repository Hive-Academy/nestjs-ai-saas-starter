---
trigger: always_on
---

# @hive-academy/nestjs-neo4j

## Overview

Enterprise-grade Neo4j integration using Neogma OGM. Features TypeORM-style repositories, type-safe Query Builder, and specialized graph services.

**Key Features:**

- Repository pattern (`Neo4jRepositoryBase<T>`)
- Type-safe Query Builder
- Transaction management
- Security decorators (`@Safe`, `@Authorize`)
- Specialized graph services (metrics, patterns, traversal)

---

## Module Setup

```typescript
@Module({
  imports: [
    Neo4jModule.forRoot({
      uri: process.env.NEO4J_URI,
      username: process.env.NEO4J_USERNAME,
      password: process.env.NEO4J_PASSWORD,
    }),
  ],
})
export class AppModule {}
```

---

## Repository Pattern

### Basic Repository

```typescript
@Injectable()
export class DeveloperRepository extends Neo4jRepositoryBase<Developer> {
  constructor(
    neogma: NeogmaService,
    crud: Neo4jCrudService,
    private graphMetrics: GraphMetricsService
  ) {
    super(Developer, 'Developer', neogma, crud);
  }

  @Safe()
  async findByEmail(email: string): Promise<Developer | null> {
    const cypher = `MATCH (d:Developer) WHERE d.email = $email RETURN d`;
    const { query, params } = ParameterBindingUtility.autoBind(cypher, { email });
    const result = await this.neogma.run(query, params);
    return result.records[0]?.get('d').properties;
  }
}
```

### Available Methods

**CRUD Operations:**

- `findById(id: string)`: Get node by ID
- `findAll(options?: FindOptions<T>)`: Query nodes with filtering
- `create(data: T)`: Create new node
- `update(id: string, data: Partial<T>)`: Update existing node
- `delete(id: string, detach?: boolean)`: Remove node (detach removes relationships)
- `count(where?: Partial<T>)`: Count matching nodes
- `exists(id: string)`: Check node existence
- `save(data: Partial<T>)`: Create or update

**Query Helpers:**

- `createQueryBuilder()`: Type-safe Cypher builder
- `executeQuery<R>(cypher, params)`: Execute raw Cypher

---

## Specialized Services

### GraphMetricsService

Calculate graph metrics and algorithm results.

```typescript
// Centrality
const centrality = await this.graphMetrics.calculateDegreeCentrality(nodeId);

// Community detection
const communities = await this.graphMetrics.detectCommunities({
  algorithm: 'louvain',
});
```

### GraphPatternService

Execute complex pattern matching.

```typescript
const pattern = {
  nodes: [{ label: 'Developer', alias: 'd' }],
  relationships: [{ type: 'WORKS_WITH', direction: '->' }],
};
await this.graphPattern.executeCustomPattern(pattern, params);
```

### GraphTraversalService

Pathfinding and graph traversal.

```typescript
const path = await this.graphTraversal.findPath(startNodeId, endNodeId, {
  maxDepth: 5,
  relationshipTypes: ['KNOWS', 'WORKS_WITH'],
});
```

---

## Security Decorators

### @Safe

Error handling wrapper.

```typescript
@Safe()
async riskyOperation() {
  // Automatic error logging and graceful degradation
}
```

### @Authorize

Role-based access control.

```typescript
@Authorize({ roles: ['admin', 'manager'] })
async sensitiveOperation() {
  // Only accessible to admin/manager roles
}
```

### @Transactional

Wraps method in Neo4j transaction.

```typescript
@Transactional()
async complexUpdate() {
  // All operations rolled back on error
}
```

---

## Query Safety

**ALWAYS use parameter binding:**

```typescript
// ✅ CORRECT
const { query, params } = ParameterBindingUtility.autoBind(
  `MATCH (d:Developer) WHERE d.email = $email RETURN d`,
  { email: userInput }
);
await this.neogma.run(query, params);

// ❌ WRONG - Cypher injection vulnerability
const cypher = `MATCH (d:Developer) WHERE d.email = '${userInput}' RETURN d`;
await this.neogma.run(cypher);
```

---

## Real-World Example

From `apps/dev-brand-api/src/app/repositories/neo4j/developer.repository.ts`:

```typescript
@Injectable()
export class DeveloperRepository extends Neo4jRepositoryBase<Developer> {
  constructor(
    neogma: NeogmaService,
    crud: Neo4jCrudService,
    private graphMetrics: GraphMetricsService,
    private graphPattern: GraphPatternService
  ) {
    super(Developer, 'Developer', neogma, crud);
  }

  @Safe()
  @RateLimit({ strategy: 'fixed-window', requests: 100, window: '1h' })
  async getDeveloperInsights(userId: string): Promise<DeveloperInsights> {
    // Use graph metrics for centrality
    const metrics = await this.graphMetrics.calculateDegreeCentrality(userId);

    // Use pattern matching for skill graph
    const skillPattern = {
      nodes: [
        { label: 'Developer', alias: 'd', where: { id: userId } },
        { label: 'Technology', alias: 't' },
      ],
      relationships: [{ type: 'SKILLED_IN', direction: '->' }],
    };
    const skills = await this.graphPattern.executeCustomPattern(skillPattern);

    return {
      centralityScore: metrics.degree,
      topSkills: skills.map((s) => s.t.name),
    };
  }

  @Transactional()
  async createBrandStrategy(userId: string, strategy: Strategy) {
    const developer = await this.findById(userId);

    // Create strategy node
    const strategyNode = await this.crud.create('BrandStrategy', strategy);

    // Create relationship
    await this.crud.createRelationship(developer.id, strategyNode.id, 'HAS_STRATEGY');
  }
}
```

---

## Best Practices

1. **Repository Pattern**: Always extend `Neo4jRepositoryBase<T>`
2. **Parameter Binding**: Use `ParameterBindingUtility.autoBind()` or Query Builder
3. **Security**: Apply `@Safe`, `@Authorize`, `@ValidateInput` to public methods
4. **Transactions**: Use `@Transactional()` for multi-step operations
5. **Graph Services**: Leverage specialized services for complex operations

---

## Common Tasks

**Complex Query:**

```typescript
const qb = this.createQueryBuilder();
const result = await qb
  .match('(d:Developer)-[:SKILLED_IN]->(t:Technology)')
  .where({ 'd.experience': { $gte: 5 } })
  .return('d, collect(t) as technologies')
  .execute();
```

**Batch Relationships:**

```typescript
await this.bulkOps.createRelationshipsBatch(
  relationships.map((r) => ({
    from: r.developerId,
    to: r.techId,
    type: 'SKILLED_IN',
  }))
);
```
