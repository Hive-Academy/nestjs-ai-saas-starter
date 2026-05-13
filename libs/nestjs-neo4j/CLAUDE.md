# @hive-academy/nestjs-neo4j

## Overview

Enterprise-grade Neo4j integration using Neogma OGM (Object-Graph Mapper). Provides graph database capabilities with a TypeORM-style repository pattern, type-safe query building, and specialized graph services.

**Key Features:**

- **Repository Pattern**: `Neo4jRepositoryBase<T>` with CRUD operations
- **Type-Safe Query Builder**: Fluent API for Cypher queries
- **Security Decorators**: `@Safe`, `@Authorize`, `@Transactional`
- **Specialized Services**: Graph metrics, pattern matching, traversal
- **Parameter Binding**: Automatic Cypher injection prevention
- **Multi-Tenancy**: Tenant isolation support

**Use Cases:**

- Social networks and relationship modeling
- Knowledge graphs and ontologies
- Recommendation engines
- Fraud detection and pattern analysis
- Dependency tracking and impact analysis

---

## Module Setup

### Basic Configuration

```typescript
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';

@Module({
  imports: [
    Neo4jModule.forRoot({
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD,
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
Neo4jModule.forRootAsync({
  useFactory: async (configService: ConfigService) => ({
    uri: configService.get('NEO4J_URI'),
    username: configService.get('NEO4J_USERNAME'),
    password: configService.get('NEO4J_PASSWORD'),
    database: configService.get('NEO4J_DATABASE') || 'neo4j',
    encrypted: configService.get('NEO4J_ENCRYPTED') === 'true',
  }),
  inject: [ConfigService],
});
```

---

## Repository Pattern

### Creating a Repository

```typescript
import { Injectable } from '@nestjs/common';
import { Neo4jRepositoryBase, NeogmaService, Neo4jCrudService } from '@hive-academy/nestjs-neo4j';

@Injectable()
export class DeveloperRepository extends Neo4jRepositoryBase<Developer> {
  constructor(neogma: NeogmaService, crud: Neo4jCrudService) {
    super(
      Developer, // Entity class
      'Developer', // Node label
      neogma, // Neogma service
      crud // CRUD service
    );
  }

  // Custom methods below
}
```

**CRITICAL**: The second argument is the **node label** in Neo4j (e.g., `Developer`, `User`, `Project`), not a collection name.

---

## Available CRUD Methods

### findById(id: string)

```typescript
const developer = await repository.findById('dev-123');
if (developer) {
  console.log(developer.email, developer.name);
}
```

### findAll(options?: FindOptions<T>)

```typescript
// Get all nodes
const all = await repository.findAll();

// With filtering
const experienced = await repository.findAll({
  where: {
    experience: { $gte: 5 },
    active: true,
  },
  limit: 10,
});

// With sorting
const sorted = await repository.findAll({
  orderBy: { field: 'createdAt', direction: 'DESC' },
  limit: 20,
});
```

**Filter Operators:** Same as ChromaDB (`$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`)

### findOne(options: FindOptions<T>)

```typescript
const developer = await repository.findOne({
  where: { email: 'john@example.com' },
});
```

### create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>)

```typescript
const newDev = await repository.create({
  email: 'jane@example.com',
  name: 'Jane Smith',
  experience: 7,
  skills: ['TypeScript', 'Neo4j', 'React'],
});
// Auto-generates id, createdAt, updatedAt
```

### update(id: string, data: Partial<T>)

```typescript
const updated = await repository.update('dev-123', {
  experience: 8,
  skills: ['TypeScript', 'Neo4j', 'React', 'GraphQL'],
});
```

### delete(id: string, detach?: boolean)

```typescript
// Delete node (fails if relationships exist)
await repository.delete('dev-123');

// Delete node and all relationships (DETACH DELETE)
await repository.delete('dev-123', true);
```

**IMPORTANT**: Use `detach: true` to force delete nodes with relationships.

### count(where?: Partial<T>)

```typescript
const totalDevs = await repository.count();
const experiencedDevs = await repository.count({ experience: { $gte: 5 } });
```

### exists(id: string)

```typescript
const exists = await repository.exists('dev-123');
console.log(exists); // true or false
```

### save(data: Partial<T>)

```typescript
// Creates if no id, updates if id exists
const saved = await repository.save({
  id: 'dev-456', // If exists, updates; if not, creates
  email: 'bob@example.com',
  name: 'Bob Johnson',
});
```

---

## Custom Queries with Parameter Binding

### CRITICAL: Query Safety

**ALWAYS use parameter binding** to prevent Cypher injection:

```typescript
import { ParameterBindingUtility } from '@hive-academy/nestjs-neo4j';

// ✅ CORRECT: Auto parameter binding
async findByEmail(email: string): Promise<Developer | null> {
  const cypher = `MATCH (d:Developer) WHERE d.email = $email RETURN d`;
  const { query, params } = ParameterBindingUtility.autoBind(cypher, { email });

  const result = await this.neogma.run(query, params);
  return result.records[0]?.get('d').properties;
}

// ❌ WRONG: Cypher injection vulnerability
async findByEmailUnsafe(email: string) {
  const cypher = `MATCH (d:Developer) WHERE d.email = '${email}' RETURN d`;
  return this.neogma.run(cypher); // NEVER DO THIS
}
```

### Query Builder (Type-Safe)

```typescript
async findDevelopersBySkill(skill: string): Promise<Developer[]> {
  const qb = this.createQueryBuilder();

  const result = await qb
    .match('(d:Developer)-[:SKILLED_IN]->(t:Technology)')
    .where({ 't.name': skill })
    .return('d')
    .execute();

  return result.records.map(r => r.get('d').properties);
}
```

### Complex Queries

```typescript
async getDeveloperWithTechnologies(userId: string): Promise<DeveloperWithTech> {
  const cypher = `
    MATCH (d:Developer {id: $userId})
    OPTIONAL MATCH (d)-[:SKILLED_IN]->(t:Technology)
    RETURN d, collect(t) as technologies
  `;

  const { query, params } = ParameterBindingUtility.autoBind(cypher, { userId });
  const result = await this.neogma.run(query, params);

  const record = result.records[0];
  return {
    developer: record.get('d').properties,
    technologies: record.get('technologies').map((t: any) => t.properties),
  };
}
```

---

## Specialized Graph Services

### GraphMetricsService

Calculate graph algorithms and metrics.

```typescript
import { GraphMetricsService } from '@hive-academy/nestjs-neo4j';

@Injectable()
export class DeveloperRepository extends Neo4jRepositoryBase<Developer> {
  constructor(
    neogma: NeogmaService,
    crud: Neo4jCrudService,
    private graphMetrics: GraphMetricsService
  ) {
    super(Developer, 'Developer', neogma, crud);
  }

  /**
   * Calculate developer's centrality in the network
   */
  async getDeveloperInfluence(userId: string): Promise<number> {
    const centrality = await this.graphMetrics.calculateDegreeCentrality(userId, {
      relationshipType: 'WORKS_WITH',
      direction: 'BOTH',
    });

    return centrality.degree;
  }

  /**
   * Find developer communities using Louvain algorithm
   */
  async findCommunities(): Promise<Community[]> {
    return this.graphMetrics.detectCommunities({
      algorithm: 'louvain',
      relationshipType: 'WORKS_WITH',
      nodeLabel: 'Developer',
    });
  }

  /**
   * Calculate PageRank for developers
   */
  async getDeveloperRankings(): Promise<Array<{ id: string; rank: number }>> {
    return this.graphMetrics.calculatePageRank({
      nodeLabel: 'Developer',
      relationshipType: 'WORKS_WITH',
      iterations: 20,
    });
  }
}
```

**Available Metrics:**

- **Centrality**: Degree, Betweenness, Closeness, Eigenvector
- **Community Detection**: Louvain, Label Propagation
- **Ranking**: PageRank, HITS
- **Path Analysis**: Shortest path, All paths, Path finding

### GraphPatternService

Execute complex pattern matching.

```typescript
import { GraphPatternService } from '@hive-academy/nestjs-neo4j';

@Injectable()
export class DeveloperRepository extends Neo4jRepositoryBase<Developer> {
  constructor(
    neogma: NeogmaService,
    crud: Neo4jCrudService,
    private graphPattern: GraphPatternService
  ) {
    super(Developer, 'Developer', neogma, crud);
  }

  /**
   * Find developers who collaborate on similar technologies
   */
  async findCollaborators(userId: string): Promise<Developer[]> {
    const pattern = {
      nodes: [
        { label: 'Developer', alias: 'd1', where: { id: userId } },
        { label: 'Developer', alias: 'd2' },
        { label: 'Technology', alias: 't' },
      ],
      relationships: [
        { type: 'SKILLED_IN', from: 'd1', to: 't', direction: '->' },
        { type: 'SKILLED_IN', from: 'd2', to: 't', direction: '->' },
      ],
      where: 'd1.id <> d2.id',
    };

    const result = await this.graphPattern.executeCustomPattern(pattern);
    return result.map((r) => r.d2.properties);
  }

  /**
   * Find technology adoption paths
   */
  async getTechnologyPath(fromTech: string, toTech: string): Promise<Path[]> {
    const pattern = {
      nodes: [
        { label: 'Technology', alias: 't1', where: { name: fromTech } },
        { label: 'Technology', alias: 't2', where: { name: toTech } },
      ],
      path: {
        from: 't1',
        to: 't2',
        relationshipType: 'RELATED_TO',
        minDepth: 1,
        maxDepths: 3,
      },
    };

    return this.graphPattern.findPaths(pattern);
  }
}
```

### GraphTraversalService

Pathfinding and graph traversal.

```typescript
import { GraphTraversalService } from '@hive-academy/nestjs-neo4j';

@Injectable()
export class DeveloperRepository extends Neo4jRepositoryBase<Developer> {
  constructor(
    neogma: NeogmaService,
    crud: Neo4jCrudService,
    private graphTraversal: GraphTraversalService
  ) {
    super(Developer, 'Developer', neogma, crud);
  }

  /**
   * Find connection between two developers
   */
  async findConnection(dev1Id: string, dev2Id: string): Promise<Path | null> {
    return this.graphTraversal.findPath(dev1Id, dev2Id, {
      relationshipTypes: ['WORKS_WITH', 'KNOWS', 'MENTORS'],
      maxDepth: 5,
      algorithm: 'shortestPath',
    });
  }

  /**
   * Get all developers within N-degrees of separation
   */
  async findNetwork(userId: string, degrees: number): Promise<Developer[]> {
    const neighbors = await this.graphTraversal.getNeighbors(userId, {
      depth: degrees,
      relationshipTypes: ['WORKS_WITH', 'KNOWS'],
    });

    return neighbors.map((n) => n.properties);
  }

  /**
   * Find alternative paths between developers
   */
  async findAlternativePaths(dev1Id: string, dev2Id: string): Promise<Path[]> {
    return this.graphTraversal.findAllPaths(dev1Id, dev2Id, {
      maxDepth: 4,
      limit: 5, // Top 5 paths
    });
  }
}
```

---

## Security Decorators

### @Safe

Error handling wrapper with logging.

```typescript
import { Safe } from '@hive-academy/nestjs-neo4j';

@Safe()
async findByEmail(email: string): Promise<Developer | null> {
  // Automatically logs errors and returns null on failure
  // instead of throwing
  const cypher = `MATCH (d:Developer) WHERE d.email = $email RETURN d`;
  const { query, params } = ParameterBindingUtility.autoBind(cypher, { email });
  const result = await this.neogma.run(query, params);
  return result.records[0]?.get('d').properties;
}
```

**Benefits:**

- Automatic error logging
- Graceful degradation
- Prevents application crashes

### @Authorize

Role-based access control.

```typescript
import { Authorize } from '@hive-academy/nestjs-neo4j';

@Authorize({ roles: ['admin', 'manager'] })
async deleteDeveloper(userId: string): Promise<boolean> {
  // Only accessible to admin/manager roles
  return this.delete(userId, true);
}

@Authorize({ permissions: ['developer:write'] })
async updateSkills(userId: string, skills: string[]): Promise<Developer> {
  // Permission-based authorization
  return this.update(userId, { skills });
}
```

### @Transactional

Wraps method in Neo4j transaction.

```typescript
import { Transactional } from '@hive-academy/nestjs-neo4j';

@Transactional()
async createDeveloperWithRelationships(data: DevData): Promise<Developer> {
  // All operations in same transaction - all succeed or all rollback

  // 1. Create developer node
  const developer = await this.create({
    email: data.email,
    name: data.name,
    experience: data.experience,
  });

  // 2. Create technology relationships
  for (const tech of data.technologies) {
    await this.crud.createRelationship(
      developer.id,
      tech.id,
      'SKILLED_IN',
      { level: tech.level }
    );
  }

  // 3. Create team relationships
  for (const teammate of data.teammates) {
    await this.crud.createRelationship(
      developer.id,
      teammate.id,
      'WORKS_WITH',
      { since: new Date().toISOString() }
    );
  }

  return developer;
}
```

**CRITICAL**: Use `@Transactional()` for multi-step operations to ensure data consistency.

### @ RateLimit

API rate limiting.

```typescript
import { RateLimit } from '@hive-academy/nestjs-neo4j';

@RateLimit({ strategy: 'fixed-window', requests: 100, window: '1h' })
async getDeveloperInsights(userId: string): Promise<Insights> {
  // Limited to 100 requests per hour per user
  return this.calculateInsights(userId);
}

@RateLimit({ strategy: 'sliding-window', requests: 10, window: '1m' })
async searchDevelopers(query: string): Promise<Developer[]> {
  // Limited to 10 requests per minute (sliding window)
  return this.search(query);
}
```

---

## Real-World Example

From `apps/dev-brand-api/src/app/repositories/neo4j/developer.repository.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import {
  Neo4jRepositoryBase,
  NeogmaService,
  Neo4jCrudService,
  GraphMetricsService,
  GraphPatternService,
  GraphTraversalService,
  ParameterBindingUtility,
  Safe,
  Authorize,
  Transactional,
  RateLimit,
  ValidateInput,
  AuditLog,
} from '@hive-academy/nestjs-neo4j';

@Injectable()
export class DeveloperRepository extends Neo4jRepositoryBase<Developer> {
  constructor(
    neogma: NeogmaService,
    crud: Neo4jCrudService,
    private graphMetrics: GraphMetricsService,
    private graphPattern: GraphPatternService,
    private graphTraversal: GraphTraversalService
  ) {
    super(Developer, 'Developer', neogma, crud);
  }

  /**
   * Find developer by email (cached for performance)
   */
  @Safe()
  async findByEmail(email: string): Promise<Developer | null> {
    const cypher = `MATCH (d:Developer) WHERE d.email = $email RETURN d`;
    const { query, params } = ParameterBindingUtility.autoBind(cypher, { email });

    const result = await this.neogma.run(query, params);
    return result.records[0]?.get('d').properties || null;
  }

  /**
   * Get developer with all related technologies and achievements
   */
  @Safe()
  async getDeveloperWithTechnologies(userId: string): Promise<DeveloperProfile> {
    // Use pattern matching for complex graph query
    const pattern = {
      nodes: [
        { label: 'Developer', alias: 'd', where: { id: userId } },
        { label: 'Technology', alias: 't' },
        { label: 'Achievement', alias: 'a' },
      ],
      relationships: [
        { type: 'SKILLED_IN', from: 'd', to: 't', alias: 'skill', direction: '->' },
        { type: 'EARNED', from: 'd', to: 'a', direction: '->' },
      ],
    };

    const result = await this.graphPattern.executeCustomPattern(pattern, { userId });

    if (!result.length) return null;

    const developer = result[0].d.properties;
    const technologies = result.map((r) => ({
      ...r.t.properties,
      level: r.skill.properties.level,
      yearsOfExperience: r.skill.properties.yearsOfExperience,
    }));
    const achievements = result.map((r) => r.a.properties);

    return {
      ...developer,
      technologies: this.deduplicateById(technologies),
      achievements: this.deduplicateById(achievements),
    };
  }

  /**
   * Calculate comprehensive developer insights
   * Rate-limited to prevent abuse
   */
  @RateLimit({ strategy: 'fixed-window', requests: 100, window: '1h' })
  @Safe()
  async getDeveloperInsights(userId: string): Promise<DeveloperInsights> {
    // 1. Get network centrality (influence)
    const centrality = await this.graphMetrics.calculateDegreeCentrality(userId, {
      relationshipType: 'WORKS_WITH',
      direction: 'BOTH',
    });

    // 2. Find similar developers (recommendations)
    const similarDevs = await this.findSimilarDevelopers(userId, 5);

    // 3. Calculate skill growth trend
    const skillGrowth = await this.calculateSkillGrowth(userId);

    // 4. Analyze collaboration patterns
    const collaborationScore = await this.analyzeCollaboration(userId);

    // 5. Get community membership
    const communities = await this.graphMetrics.detectCommunities({
      algorithm: 'louvain',
      nodeLabel: 'Developer',
    });
    const userCommunity = communities.find((c) => c.members.includes(userId));

    return {
      influence: {
        centralityScore: centrality.degree,
        networkSize: centrality.connections,
        communityId: userCommunity?.id,
      },
      growth: {
        skillGrowthRate: skillGrowth.rate,
        recentAchievements: skillGrowth.recentAchievements,
      },
      collaboration: {
        score: collaborationScore,
        topCollaborators: await this.getTopCollaborators(userId, 5),
      },
      recommendations: {
        similarDevelopers: similarDevs,
        suggestedSkills: await this.suggestSkills(userId),
      },
    };
  }

  /**
   * Create brand strategy with relationships
   * Uses transaction to ensure atomicity
   */
  @Transactional()
  @Authorize({ permissions: ['developer:write'] })
  @AuditLog({ action: 'create_brand_strategy' })
  async createBrandStrategyRelationships(
    userId: string,
    strategyData: BrandStrategy
  ): Promise<void> {
    // 1. Create strategy node
    const cypher = `
      CREATE (s:BrandStrategy {
        id: $strategyId,
        name: $name,
        description: $description,
        targetAudience: $targetAudience,
        platforms: $platforms,
        createdAt: datetime()
      })
      RETURN s
    `;

    const { query, params } = ParameterBindingUtility.autoBind(cypher, {
      strategyId: this.generateId(),
      ...strategyData,
    });

    const result = await this.neogma.run(query, params);
    const strategy = result.records[0].get('s').properties;

    // 2. Link to developer
    await this.crud.createRelationship(userId, strategy.id, 'HAS_STRATEGY', {
      primary: true,
      activatedAt: new Date().toISOString(),
    });

    // 3. Link to relevant technologies
    for (const techId of strategyData.focusTechnologies) {
      await this.crud.createRelationship(strategy.id, techId, 'FOCUSES_ON', {
        priority: strategyData.techPriorities[techId] || 'medium',
      });
    }

    // 4. Link to target platforms
    for (const platform of strategyData.platforms) {
      await this.crud.createRelationship(strategy.id, platform.id, 'TARGETS_PLATFORM', {
        frequency: platform.frequency,
        priority: platform.priority,
      });
    }
  }

  /**
   * Find developers by skill level
   */
  async findDevelopersBySkill(skill: string, minLevel = 'intermediate'): Promise<Developer[]> {
    const cypher = `
      MATCH (d:Developer)-[r:SKILLED_IN]->(t:Technology {name: $skill})
      WHERE r.level IN $levels
      RETURN d, r.level as skillLevel
      ORDER BY r.yearsOfExperience DESC
      LIMIT 20
    `;

    const levels = this.getSkillLevelsAbove(minLevel);
    const { query, params } = ParameterBindingUtility.autoBind(cypher, {
      skill,
      levels,
    });

    const result = await this.neogma.run(query, params);
    return result.records.map((r) => ({
      ...r.get('d').properties,
      skillLevel: r.get('skillLevel'),
    }));
  }

  /**
   * Update developer analytics (skill growth, impact trend)
   */
  @Transactional()
  async updateDeveloperAnalytics(userId: string): Promise<void> {
    const analytics = await this.calculateAnalytics(userId);

    const cypher = `
      MATCH (d:Developer {id: $userId})
      SET d.skillGrowthRate = $skillGrowthRate,
          d.impactTrend = $impactTrend,
          d.collaborationScore = $collaborationScore,
          d.lastAnalyticsUpdate = datetime()
      RETURN d
    `;

    const { query, params } = ParameterBindingUtility.autoBind(cypher, {
      userId,
      ...analytics,
    });

    await this.neogma.run(query, params);
  }

  // Private helper methods

  private async findSimilarDevelopers(userId: string, limit: number): Promise<Developer[]> {
    const cypher = `
      MATCH (d1:Developer {id: $userId})-[:SKILLED_IN]->(t:Technology)<-[:SKILLED_IN]-(d2:Developer)
      WHERE d1.id <> d2.id
      WITH d2, count(t) as commonSkills
      ORDER BY commonSkills DESC
      LIMIT $limit
      RETURN d2, commonSkills
    `;

    const { query, params } = ParameterBindingUtility.autoBind(cypher, { userId, limit });
    const result = await this.neogma.run(query, params);

    return result.records.map((r) => r.get('d2').properties);
  }

  private async calculateSkillGrowth(userId: string): Promise<SkillGrowth> {
    const cypher = `
      MATCH (d:Developer {id: $userId})-[r:EARNED]->(a:Achievement)
      WHERE a.createdAt > datetime() - duration({months: 6})
      RETURN count(a) as recentAchievements,
             collect(a) as achievements
    `;

    const { query, params } = ParameterBindingUtility.autoBind(cypher, { userId });
    const result = await this.neogma.run(query, params);
    const record = result.records[0];

    return {
      rate: this.calculateGrowthRate(record.get('recentAchievements')),
      recentAchievements: record.get('achievements').map((a: any) => a.properties),
    };
  }

  private async analyzeCollaboration(userId: string): Promise<number> {
    const cypher = `
      MATCH (d:Developer {id: $userId})-[r:WORKS_WITH]-(colleague:Developer)
      RETURN count(DISTINCT colleague) as collaboratorCount,
             avg(r.interactionFrequency) as avgFrequency
    `;

    const { query, params } = ParameterBindingUtility.autoBind(cypher, { userId });
    const result = await this.neogma.run(query, params);
    const record = result.records[0];

    const count = record.get('collaboratorCount');
    const freq = record.get('avgFrequency') || 0;

    return Math.min((count * 0.5 + freq * 0.5) * 10, 100);
  }

  private async getTopCollaborators(userId: string, limit: number): Promise<Developer[]> {
    const cypher = `
      MATCH (d:Developer {id: $userId})-[r:WORKS_WITH]-(colleague:Developer)
      RETURN colleague
      ORDER BY r.interactionFrequency DESC, r.since ASC
      LIMIT $limit
    `;

    const { query, params } = ParameterBindingUtility.autoBind(cypher, { userId, limit });
    const result = await this.neogma.run(query, params);

    return result.records.map((r) => r.get('colleague').properties);
  }

  private async suggestSkills(userId: string): Promise<string[]> {
    // Find skills common among similar developers but missing for this user
    const cypher = `
      MATCH (d:Developer {id: $userId})-[:SKILLED_IN]->(t1:Technology)
      WITH d, collect(t1.name) as userSkills
      MATCH (similar:Developer)-[:SKILLED_IN]->(t2:Technology)
      WHERE similar.id <> d.id
        AND NOT t2.name IN userSkills
        AND (similar)-[:SKILLED_IN]->(:Technology)<-[:SKILLED_IN]-(d)
      RETURN t2.name as skill, count(*) as frequency
      ORDER BY frequency DESC
      LIMIT 5
    `;

    const { query, params } = ParameterBindingUtility.autoBind(cypher, { userId });
    const result = await this.neogma.run(query, params);

    return result.records.map((r) => r.get('skill'));
  }

  private deduplicateById<T extends { id: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  private getSkillLevelsAbove(minLevel: string): string[] {
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const minIndex = levels.indexOf(minLevel);
    return levels.slice(minIndex);
  }

  private calculateGrowthRate(recentAchievements: number): number {
    // Simple growth rate calculation
    // In production, this would compare to historical data
    return Math.min((recentAchievements / 6) * 100, 100);
  }

  private async calculateAnalytics(userId: string) {
    const skillGrowth = await this.calculateSkillGrowth(userId);
    const collaboration = await this.analyzeCollaboration(userId);

    // Calculate impact trend (simplified)
    const impactTrend = (skillGrowth.rate * 0.6 + collaboration * 0.4) / 100;

    return {
      skillGrowthRate: skillGrowth.rate,
      impactTrend,
      collaborationScore: collaboration,
    };
  }

  private generateId(): string {
    return `strategy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Supporting interfaces
interface DeveloperProfile {
  id: string;
  email: string;
  name: string;
  experience: number;
  technologies: Array<{ id: string; name: string; level: string; yearsOfExperience: number }>;
  achievements: Array<{ id: string; title: string; description: string }>;
}

interface DeveloperInsights {
  influence: {
    centralityScore: number;
    networkSize: number;
    communityId?: string;
  };
  growth: {
    skillGrowthRate: number;
    recentAchievements: any[];
  };
  collaboration: {
    score: number;
    topCollaborators: Developer[];
  };
  recommendations: {
    similarDevelopers: Developer[];
    suggestedSkills: string[];
  };
}

interface SkillGrowth {
  rate: number;
  recentAchievements: any[];
}

interface BrandStrategy {
  name: string;
  description: string;
  targetAudience: string[];
  platforms: Array<{ id: string; frequency: string; priority: string }>;
  focusTechnologies: string[];
  techPriorities: Record<string, string>;
}
```

---

## Best Practices

### 1. Always Use Parameter Binding

```typescript
// ✅ CORRECT
const { query, params } = ParameterBindingUtility.autoBind(
  `MATCH (n) WHERE n.email = $email RETURN n`,
  { email: userInput }
);

// ❌ WRONG - Cypher injection risk
const cypher = `MATCH (n) WHERE n.email = '${userInput}' RETURN n`;
```

### 2. Use Transactions for Multi-Step Operations

```typescript
@Transactional()
async complexOperation() {
  await this.create(...);
  await this.crud.createRelationship(...);
  await this.update(...);
  // All or nothing
}
```

### 3. Apply Security Decorators

```typescript
@Safe()              // Error handling
@Authorize({...})    // Access control
@RateLimit({...})    // Abuse prevention
async sensitiveOperation() { ... }
```

### 4. Use Specialized Services for Complex Queries

```typescript
// ✅ CORRECT: Use GraphMetricsService
const centrality = await this.graphMetrics.calculateDegreeCentrality(id);

// ❌ WRONG: Manual Cypher for standard graph algorithms
const cypher = `MATCH (n)-[r]-(m) WHERE n.id = $id ...`; // Reinventing the wheel
```

### 5. Detach Delete for Nodes with Relationships

```typescript
// ✅ CORRECT: Detach delete
await repository.delete(id, true);

// ❌ WRONG: Will fail if relationships exist
await repository.delete(id);
```

---

## Common Patterns

### Relationship Management

```typescript
// Create relationship
await this.crud.createRelationship(fromNodeId, toNodeId, 'RELATIONSHIP_TYPE', {
  property: 'value',
});

// Query with relationships
const cypher = `
  MATCH (a)-[r:RELATIONSHIP_TYPE]->(b)
  WHERE a.id = $id
  RETURN a, r, b
`;
```

### Batch Operations

```typescript
async batchCreateRelationships(relationships: Relationship[]): Promise<void> {
  // Use Cypher UNWIND for batch operations
  const cypher = `
    UNWIND $relationships as rel
    MATCH (a {id: rel.from})
    MATCH (b {id: rel.to})
    CREATE (a)-[r:${relationshipType}]->(b)
    SET r = rel.properties
  `;

  const { query, params } = ParameterBindingUtility.autoBind(cypher, {
    relationships
  });

  await this.neogma.run(query, params);
}
```

---

## Performance Tips

1. **Use Indexes**: Create indexes on frequently queried properties
2. **Limit Results**: Always use `LIMIT` in Cypher queries
3. **Use Specialized Services**: Leverage built-in graph algorithms
4. **Batch Operations**: Use `UNWIND` for bulk operations
5. **Profile Queries**: Use `EXPLAIN` and `PROFILE` in Cypher

---

## Troubleshooting

### Connection Issues

```bash
# Check Neo4j is running
docker ps | grep neo4j

# Test connection
cypher-shell -u neo4j -p password
```

### Transaction Deadlocks

Use shorter transactions and explicit ordering:

```typescript
@Transactional()
async operation() {
  // Order operations consistently to avoid deadlocks
  await this.operationA(); // Always A before B
  await this.operationB();
}
```

### Slow Queries

```typescript
// Profile query
const cypher = `PROFILE MATCH ... RETURN ...`;
const result = await this.neogma.run(cypher);
console.log(result.summary.profile);
```

---

## Reference

### Key Exports

```typescript
import {
  // Core
  Neo4jModule,
  NeogmaService,
  Neo4jRepositoryBase,
  Neo4jCrudService,

  // Services
  GraphMetricsService,
  GraphPatternService,
  GraphTraversalService,

  // Utilities
  ParameterBindingUtility,

  // Decorators
  Safe,
  Authorize,
  Transactional,
  RateLimit,
  ValidateInput,
  AuditLog,
} from '@hive-academy/nestjs-neo4j';
```
