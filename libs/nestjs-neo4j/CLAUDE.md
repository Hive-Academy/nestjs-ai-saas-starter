# CLAUDE.md - @hive-academy/nestjs-neo4j Library

This file provides comprehensive guidance for working with the `@hive-academy/nestjs-neo4j` library in the NestJS AI SaaS Starter monorepo.

## Business Domain and Purpose

### Core Purpose
The `@hive-academy/nestjs-neo4j` library provides seamless integration between NestJS applications and Neo4j graph databases, enabling sophisticated relationship modeling and graph-based data operations for AI-powered applications.

### Key Value Propositions
- **Graph Relationships**: Model complex relationships between entities with native graph traversal
- **Real-time Analytics**: Perform complex graph analytics for recommendations and insights
- **Knowledge Graphs**: Build AI knowledge graphs with semantic relationships
- **Social Networks**: Model user connections, interactions, and influence networks
- **Recommendation Engines**: Leverage graph algorithms for personalized recommendations
- **Fraud Detection**: Identify suspicious patterns through relationship analysis

### Business Use Cases
- **AI Agent Knowledge**: Store agent knowledge as interconnected concepts and relationships
- **User Behavior Analysis**: Track user journeys and interaction patterns
- **Content Recommendation**: Suggest content based on user preferences and similarity networks
- **Enterprise Knowledge Management**: Model organizational structures and expertise networks
- **Supply Chain Optimization**: Analyze dependencies and bottlenecks in complex supply chains
- **Financial Risk Assessment**: Detect risk patterns through transaction and relationship analysis

## Technical Architecture

### Module Architecture Pattern
The library follows NestJS module patterns with three configuration approaches:

```typescript
// Synchronous configuration
Neo4jModule.forRoot({
  uri: 'bolt://localhost:7687',
  username: 'neo4j',
  password: 'password',
  database: 'neo4j'
});

// Asynchronous configuration
Neo4jModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    uri: configService.get('NEO4J_URI'),
    username: configService.get('NEO4J_USERNAME'),
    password: configService.get('NEO4J_PASSWORD'),
    database: configService.get('NEO4J_DATABASE')
  }),
  inject: [ConfigService]
});

// Feature-specific databases
Neo4jModule.forFeature(['users', 'analytics'])
```

### Connection Pooling Strategy
The library implements sophisticated connection pooling with:
- **Automatic Pool Management**: Configurable pool size and connection lifecycle
- **Connection Health Monitoring**: Automatic health checks and retry mechanisms
- **Resource Cleanup**: Proper session and transaction cleanup
- **Connection Reuse**: Efficient connection reuse across operations

```typescript
const DEFAULT_NEO4J_CONFIG = {
  connectionAcquisitionTimeout: 60000,
  maxConnectionPoolSize: 100,
  maxConnectionLifetime: 3600000, // 1 hour
  connectionTimeout: 30000,
  maxTransactionRetryTime: 30000,
};
```

### Transaction Management Architecture
Multi-layer transaction support with:
- **Declarative Transactions**: `@Transactional()` decorator for automatic transaction management
- **Manual Transactions**: Direct session and transaction control
- **Nested Transactions**: Context-aware transaction nesting
- **Rollback Strategies**: Automatic error handling and rollback

## Core Patterns

### Repository Pattern Implementation
Implement repositories for domain-specific graph operations:

```typescript
@Injectable()
export class UserRepository {
  constructor(
    @InjectNeo4j() private readonly neo4j: Neo4jService
  ) {}

  @Transactional()
  async createUser(userData: CreateUserDto): Promise<User> {
    return this.neo4j.write(async (session) => {
      const result = await session.run(
        'CREATE (u:User $props) RETURN u',
        { props: userData }
      );
      return result.records[0].get('u').properties;
    });
  }

  async findConnectedUsers(userId: string, hops = 2): Promise<User[]> {
    const query = cypher()
      .match('(u:User {id: $userId})')
      .match(`(u)-[*1..${hops}]-(connected:User)`)
      .return('DISTINCT connected')
      .build();

    return this.neo4j.readQuery(query.cypher, query.parameters);
  }
}
```

### @Transactional Decorator Pattern
The `@Transactional` decorator provides declarative transaction management:

```typescript
export class PostService {
  constructor(
    @InjectNeo4j() private readonly neo4j: Neo4jService
  ) {}

  @Transactional({ database: 'social' })
  async createPostWithTags(postData: CreatePostDto, tags: string[]): Promise<Post> {
    // All operations within this method run in a single transaction
    const post = await this.createPost(postData);
    await this.linkPostToTags(post.id, tags);
    await this.updateUserStats(postData.authorId);
    return post;
  }

  // Nested transactional methods reuse the existing transaction
  @Transactional()
  private async linkPostToTags(postId: string, tags: string[]): Promise<void> {
    // Implementation here runs in the same transaction as parent method
  }
}
```

### Query Builder Pattern
Fluent Cypher query construction with type safety:

```typescript
const complexQuery = cypher()
  .match('(u:User {active: true})')
  .optionalMatch('(u)-[:FOLLOWS]->(following:User)')
  .where('u.lastLogin > $minDate', { minDate: thirtyDaysAgo })
  .andWhere('following.verified = true')
  .with('u, count(following) as followingCount')
  .orderBy('followingCount', 'DESC')
  .skip(offset)
  .limit(pageSize)
  .return('u, followingCount')
  .build();

const results = await neo4jService.run(complexQuery.cypher, complexQuery.parameters);
```

## Best Practices for Graph Modeling

### Node Design Principles
1. **Single Responsibility**: Each node type should represent one clear entity
2. **Property Indexing**: Index frequently queried properties for performance
3. **Label Strategy**: Use hierarchical labels for classification

```typescript
// Good: Clear entity types with appropriate properties
CREATE (u:User:Person {
  id: $userId,
  email: $email,
  createdAt: timestamp(),
  active: true
})

// Good: Use composite labels for classification
CREATE (a:User:Admin:Person { ... })
```

### Relationship Modeling Best Practices
1. **Relationship Direction**: Model natural direction of relationships
2. **Relationship Properties**: Store relationship metadata as properties
3. **Relationship Types**: Use descriptive, action-oriented relationship types

```typescript
// Good: Descriptive relationship with metadata
CREATE (u1:User)-[:FOLLOWS {
  since: timestamp(),
  notificationsEnabled: true,
  strength: 'strong'
}]->(u2:User)

// Good: Bidirectional relationships when appropriate
CREATE (u1:User)-[:FRIENDS_WITH { since: $date }]-(u2:User)
```

### Graph Schema Design
1. **Avoid Deep Nesting**: Limit relationship chains to 3-4 hops for performance
2. **Denormalization**: Duplicate frequently accessed properties
3. **Aggregate Nodes**: Create summary nodes for heavy aggregations

```typescript
// Pattern: Aggregate nodes for performance
CREATE (u:User)-[:HAS_STATS]->(stats:UserStats {
  totalPosts: 150,
  followerCount: 1250,
  lastUpdated: timestamp()
})
```

## Key Services

### Neo4jService - Core Operations
Primary service for all graph operations:

```typescript
@Injectable()
export class GraphDataService {
  constructor(
    @InjectNeo4j() private readonly neo4j: Neo4jService
  ) {}

  // High-performance read operations
  async getRecommendations(userId: string): Promise<Recommendation[]> {
    return this.neo4j.read(async (session) => {
      const result = await session.run(`
        MATCH (u:User {id: $userId})-[:LIKES]->(p:Product)
        MATCH (p)<-[:LIKES]-(other:User)-[:LIKES]->(rec:Product)
        WHERE NOT (u)-[:LIKES]->(rec)
        RETURN rec, count(*) as score
        ORDER BY score DESC
        LIMIT 10
      `, { userId });
      
      return result.records.map(r => ({
        product: r.get('rec').properties,
        score: r.get('score').toNumber()
      }));
    });
  }

  // Transactional write operations
  async createRelationshipNetwork(operations: NetworkOperation[]): Promise<void> {
    await this.neo4j.write(async (session) => {
      const tx = session.beginTransaction();
      
      try {
        for (const op of operations) {
          await tx.run(op.query, op.params);
        }
        await tx.commit();
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    });
  }
}
```

### Neo4jConnectionService - Connection Management
Handles database connections, health checks, and automatic retries:

```typescript
// Connection monitoring and management
const connectionInfo = connectionService.getConnectionInfo();
console.log(connectionInfo);
// Output: { uri: 'bolt://localhost:7687', database: 'neo4j', isConnected: true, retryCount: 0 }

// Manual connection checks
const isHealthy = await connectionService.isConnected();
if (!isHealthy) {
  // Handle connection issues
  await this.handleConnectionFailure();
}
```

### Neo4jHealthService - Health Monitoring
Comprehensive health monitoring for production environments:

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private readonly neo4jHealth: Neo4jHealthService
  ) {}

  @Get('neo4j')
  async checkNeo4jHealth() {
    const health = await this.neo4jHealth.checkHealth();
    // Returns: { name: 'neo4j', status: 'up', message: 'Neo4j is healthy', details: {...} }
    
    return {
      status: health.status,
      database: health.details?.database,
      version: health.details?.version,
      responseTime: health.details?.responseTime
    };
  }

  @Get('metrics')
  async getNeo4jMetrics() {
    return this.neo4jHealth.getMetrics();
    // Returns: { nodes: 10000, relationships: 25000, labels: 5, ... }
  }
}
```

## Testing Strategies

### Unit Testing with Mocks
Mock Neo4j services for isolated unit testing:

```typescript
describe('UserService', () => {
  let service: UserService;
  let neo4jService: jest.Mocked<Neo4jService>;

  beforeEach(async () => {
    const mockNeo4jService = {
      read: jest.fn(),
      write: jest.fn(),
      run: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: Neo4jService, useValue: mockNeo4jService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    neo4jService = module.get(Neo4jService);
  });

  it('should find user by ID', async () => {
    const mockUser = { id: '1', name: 'Test User' };
    neo4jService.read.mockResolvedValue(mockUser);

    const result = await service.findById('1');
    expect(result).toEqual(mockUser);
    expect(neo4jService.read).toHaveBeenCalledWith(expect.any(Function));
  });
});
```

### Integration Testing with TestContainers
Test with real Neo4j instances using Docker containers:

```typescript
describe('Neo4j Integration', () => {
  let neo4jContainer: StartedTestContainer;
  let neo4jService: Neo4jService;

  beforeAll(async () => {
    neo4jContainer = await new GenericContainer('neo4j:5')
      .withExposedPorts(7687)
      .withEnvironment({
        NEO4J_AUTH: 'neo4j/testpassword',
        NEO4J_PLUGINS: '["apoc"]'
      })
      .start();

    const module = await Test.createTestingModule({
      imports: [
        Neo4jModule.forRoot({
          uri: `bolt://localhost:${neo4jContainer.getMappedPort(7687)}`,
          username: 'neo4j',
          password: 'testpassword'
        })
      ],
      providers: [GraphService]
    }).compile();

    neo4jService = module.get<Neo4jService>(Neo4jService);
  });

  afterAll(async () => {
    await neo4jContainer.stop();
  });

  it('should create and retrieve nodes', async () => {
    await neo4jService.write(async (session) => {
      await session.run('CREATE (n:TestNode {name: $name})', { name: 'test' });
    });

    const result = await neo4jService.read(async (session) => {
      const res = await session.run('MATCH (n:TestNode {name: $name}) RETURN n', { name: 'test' });
      return res.records[0]?.get('n').properties;
    });

    expect(result.name).toBe('test');
  });
});
```

### Performance Testing
Test graph operations under load:

```typescript
describe('Performance Tests', () => {
  it('should handle concurrent reads efficiently', async () => {
    const startTime = Date.now();
    const promises = Array.from({ length: 100 }, () => 
      neo4jService.read(async (session) => {
        const result = await session.run('MATCH (n:User) RETURN count(n) as count');
        return result.records[0].get('count').toNumber();
      })
    );

    const results = await Promise.all(promises);
    const endTime = Date.now();

    expect(results).toHaveLength(100);
    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
  });
});
```

## Performance Considerations

### Query Optimization Strategies
1. **Index Critical Properties**: Create indexes on frequently queried node properties
2. **Profile Queries**: Use PROFILE to identify bottlenecks
3. **Limit Result Sets**: Always use LIMIT clauses for large datasets
4. **Avoid Cartesian Products**: Use proper relationship patterns

```cypher
-- Create indexes for performance
CREATE INDEX user_email FOR (u:User) ON (u.email);
CREATE INDEX user_active FOR (u:User) ON (u.active);
CREATE CONSTRAINT user_id FOR (u:User) REQUIRE u.id IS UNIQUE;

-- Optimize query patterns
// Good: Specific relationship pattern
MATCH (u:User {active: true})-[:FOLLOWS]->(f:User)
WHERE u.lastLogin > $date
RETURN f LIMIT 100

// Bad: Cartesian product
MATCH (u:User), (f:User)
WHERE u.active = true AND f.verified = true
```

### Connection Pooling Optimization
Configure connection pools based on application load:

```typescript
Neo4jModule.forRoot({
  uri: 'bolt://localhost:7687',
  username: 'neo4j',
  password: 'password',
  config: {
    maxConnectionPoolSize: 50,          // Adjust based on concurrent users
    connectionAcquisitionTimeout: 60000, // Wait time for connection
    maxConnectionLifetime: 3600000,      // 1 hour connection lifetime
    connectionTimeout: 30000,            // Connection establishment timeout
    maxTransactionRetryTime: 30000,      // Transaction retry timeout
  }
});
```

### Bulk Operations Performance
Use batch operations for large datasets:

```typescript
async bulkCreateUsers(users: CreateUserDto[]): Promise<void> {
  const batchSize = 1000;
  
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    
    await this.neo4j.write(async (session) => {
      await session.run(`
        UNWIND $users AS userData
        CREATE (u:User)
        SET u = userData, u.createdAt = timestamp()
      `, { users: batch });
    });
  }
}
```

### Indexing Best Practices
Strategic indexing for optimal performance:

```cypher
-- Single property indexes
CREATE INDEX user_email FOR (u:User) ON (u.email);
CREATE INDEX post_created FOR (p:Post) ON (p.createdAt);

-- Composite indexes for complex queries
CREATE INDEX user_active_last_login FOR (u:User) ON (u.active, u.lastLogin);

-- Full-text search indexes
CREATE FULLTEXT INDEX post_content FOR (p:Post) ON EACH [p.title, p.content];

-- Relationship property indexes
CREATE INDEX follow_since FOR ()-[r:FOLLOWS]-() ON (r.since);
```

## Common Use Cases

### Social Network Implementation
Model user connections and interactions:

```typescript
@Injectable()
export class SocialNetworkService {
  constructor(@InjectNeo4j() private neo4j: Neo4jService) {}

  @Transactional()
  async followUser(followerId: string, followeeId: string): Promise<void> {
    await this.neo4j.write(async (session) => {
      await session.run(`
        MATCH (follower:User {id: $followerId})
        MATCH (followee:User {id: $followeeId})
        CREATE (follower)-[:FOLLOWS {
          since: timestamp(),
          notificationsEnabled: true
        }]->(followee)
      `, { followerId, followeeId });
    });
  }

  async getMutualConnections(userId1: string, userId2: string): Promise<User[]> {
    return this.neo4j.readQuery(`
      MATCH (u1:User {id: $userId1})-[:FOLLOWS]->(mutual:User)<-[:FOLLOWS]-(u2:User {id: $userId2})
      RETURN mutual
      ORDER BY mutual.name
    `, { userId1, userId2 });
  }

  async getInfluenceScore(userId: string): Promise<number> {
    const result = await this.neo4j.readQuery(`
      MATCH (u:User {id: $userId})<-[:FOLLOWS]-(follower)
      MATCH (follower)<-[:FOLLOWS]-(secondDegree)
      RETURN count(DISTINCT follower) + count(DISTINCT secondDegree) * 0.1 as score
    `, { userId });

    return result[0]?.score || 0;
  }
}
```

### Recommendation Engine
Build collaborative filtering recommendations:

```typescript
@Injectable()
export class RecommendationService {
  constructor(@InjectNeo4j() private neo4j: Neo4jService) {}

  async getContentRecommendations(userId: string, limit = 10): Promise<Recommendation[]> {
    return this.neo4j.readQuery(`
      MATCH (u:User {id: $userId})-[:LIKES]->(content)
      MATCH (content)<-[:LIKES]-(other:User)-[:LIKES]->(rec)
      WHERE NOT (u)-[:LIKES]->(rec)
      WITH rec, count(*) as commonLikes,
           collect(DISTINCT other.id)[0..5] as similarUsers
      
      OPTIONAL MATCH (rec)<-[:LIKES]-(allUsers:User)
      WITH rec, commonLikes, similarUsers, count(allUsers) as totalLikes
      
      RETURN rec {
        .*,
        recommendationScore: commonLikes * 1.0 / totalLikes,
        sharedWithUsers: similarUsers
      } as recommendation
      ORDER BY recommendation.recommendationScore DESC
      LIMIT $limit
    `, { userId, limit });
  }

  async getSimilarUsers(userId: string): Promise<User[]> {
    return this.neo4j.readQuery(`
      MATCH (u:User {id: $userId})-[:LIKES]->(content)<-[:LIKES]-(similar:User)
      WHERE u <> similar
      WITH similar, count(content) as sharedInterests
      ORDER BY sharedInterests DESC
      LIMIT 10
      RETURN similar
    `, { userId });
  }
}
```

### Knowledge Graph Implementation
Build AI knowledge graphs with semantic relationships:

```typescript
@Injectable()
export class KnowledgeGraphService {
  constructor(@InjectNeo4j() private neo4j: Neo4jService) {}

  async addConcept(concept: ConceptDto): Promise<void> {
    await this.neo4j.write(async (session) => {
      await session.run(`
        CREATE (c:Concept {
          id: $id,
          name: $name,
          definition: $definition,
          domain: $domain,
          confidence: $confidence,
          createdAt: timestamp()
        })
      `, concept);
    });
  }

  @Transactional()
  async createSemanticRelationship(
    fromConceptId: string,
    toConceptId: string,
    relationshipType: string,
    strength: number
  ): Promise<void> {
    await this.neo4j.write(async (session) => {
      const relationshipQuery = `
        MATCH (from:Concept {id: $fromId})
        MATCH (to:Concept {id: $toId})
        CREATE (from)-[r:${relationshipType.toUpperCase()} {
          strength: $strength,
          createdAt: timestamp(),
          verified: false
        }]->(to)
        RETURN r
      `;
      
      await session.run(relationshipQuery, {
        fromId: fromConceptId,
        toId: toConceptId,
        strength
      });
    });
  }

  async findRelatedConcepts(conceptId: string, maxDepth = 3): Promise<ConceptPath[]> {
    return this.neo4j.readQuery(`
      MATCH path = (start:Concept {id: $conceptId})-[*1..${maxDepth}]-(related:Concept)
      WHERE start <> related
      WITH related, 
           [rel in relationships(path) | {
             type: type(rel),
             strength: rel.strength
           }] as relationships,
           length(path) as distance
      RETURN {
        concept: related,
        relationships: relationships,
        distance: distance,
        pathStrength: reduce(s = 1.0, rel in relationships | s * rel.strength)
      } as conceptPath
      ORDER BY conceptPath.pathStrength DESC, conceptPath.distance ASC
      LIMIT 50
    `, { conceptId });
  }
}
```

## Integration Patterns with Other Libraries

### Integration with @anubis/nestjs-langgraph
Use Neo4j as memory backend for AI agents:

```typescript
@Injectable()
export class GraphMemoryService implements MemoryProvider {
  constructor(
    @InjectNeo4j() private neo4j: Neo4jService,
    @InjectLangGraph() private langGraph: LangGraphService
  ) {}

  async storeAgentMemory(agentId: string, memory: AgentMemory): Promise<void> {
    await this.neo4j.write(async (session) => {
      await session.run(`
        MERGE (agent:Agent {id: $agentId})
        CREATE (agent)-[:HAS_MEMORY]->(memory:Memory {
          id: $memoryId,
          content: $content,
          type: $type,
          timestamp: timestamp(),
          importance: $importance
        })
      `, {
        agentId,
        memoryId: memory.id,
        content: memory.content,
        type: memory.type,
        importance: memory.importance
      });
    });
  }

  async getRelevantMemories(agentId: string, query: string): Promise<AgentMemory[]> {
    // Use full-text search to find relevant memories
    return this.neo4j.readQuery(`
      MATCH (agent:Agent {id: $agentId})-[:HAS_MEMORY]->(memory:Memory)
      CALL db.index.fulltext.queryNodes('memory_content', $query) 
      YIELD node as matchedMemory, score
      WHERE memory = matchedMemory
      RETURN memory {
        .*,
        relevanceScore: score
      } as relevantMemory
      ORDER BY relevantMemory.importance DESC, relevantMemory.relevanceScore DESC
      LIMIT 10
    `, { agentId, query });
  }
}
```

### Integration with @hive-academy/nestjs-chromadb
Combine graph relationships with vector similarity:

```typescript
@Injectable()
export class HybridSearchService {
  constructor(
    @InjectNeo4j() private neo4j: Neo4jService,
    @InjectChromaDB() private chromaDb: ChromaDBService
  ) {}

  async hybridRecommendation(userId: string, query: string): Promise<HybridResult[]> {
    // Get graph-based recommendations
    const graphRecs = await this.neo4j.readQuery(`
      MATCH (u:User {id: $userId})-[:LIKES]->(item)
      MATCH (item)<-[:LIKES]-(similar:User)-[:LIKES]->(rec)
      WHERE NOT (u)-[:LIKES]->(rec)
      RETURN rec.id as itemId, count(*) as graphScore
      ORDER BY graphScore DESC
      LIMIT 50
    `, { userId });

    // Get semantic similarity from vector database
    const semanticResults = await this.chromaDb.query({
      queryTexts: [query],
      nResults: 50
    });

    // Combine and rank results
    const combinedResults = this.combineResults(graphRecs, semanticResults);
    return this.rankResults(combinedResults);
  }

  private combineResults(graphResults: any[], vectorResults: any[]): HybridResult[] {
    // Implementation to merge graph and vector scores
    const resultMap = new Map<string, HybridResult>();

    graphResults.forEach(result => {
      resultMap.set(result.itemId, {
        itemId: result.itemId,
        graphScore: result.graphScore,
        vectorScore: 0,
        combinedScore: result.graphScore * 0.6
      });
    });

    vectorResults.forEach((result, index) => {
      const itemId = result.id;
      const existing = resultMap.get(itemId) || {
        itemId,
        graphScore: 0,
        vectorScore: 0,
        combinedScore: 0
      };

      existing.vectorScore = 1 - (result.distance || 0);
      existing.combinedScore = existing.graphScore * 0.6 + existing.vectorScore * 0.4;
      resultMap.set(itemId, existing);
    });

    return Array.from(resultMap.values());
  }
}
```

## Security Considerations

### Authentication and Authorization
Secure database access with proper credentials management:

```typescript
// Production configuration with encrypted connections
Neo4jModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    uri: configService.get('NEO4J_URI'),
    username: configService.get('NEO4J_USERNAME'),
    password: configService.get('NEO4J_PASSWORD'),
    config: {
      encrypted: true,
      trust: 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES',
      maxConnectionPoolSize: 50,
    }
  }),
  inject: [ConfigService]
});
```

### Query Injection Prevention
Use parameterized queries to prevent Cypher injection:

```typescript
// SECURE: Use parameters for all user input
async findUserByEmail(email: string): Promise<User | null> {
  const result = await this.neo4j.readQuery(
    'MATCH (u:User {email: $email}) RETURN u',
    { email } // Always use parameters
  );
  return result[0] || null;
}

// INSECURE: Never concatenate user input
async badExample(email: string): Promise<User | null> {
  // DON'T DO THIS - vulnerable to injection
  const result = await this.neo4j.readQuery(
    `MATCH (u:User {email: '${email}'}) RETURN u`
  );
  return result[0] || null;
}
```

### Data Privacy and Encryption
Implement data privacy controls:

```typescript
@Injectable()
export class SecureUserService {
  constructor(@InjectNeo4j() private neo4j: Neo4jService) {}

  async getUserDataForExport(userId: string, requesterId: string): Promise<UserData> {
    // Check permissions first
    const hasPermission = await this.checkDataAccess(requesterId, userId);
    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.neo4j.readQuery(`
      MATCH (u:User {id: $userId})
      RETURN {
        id: u.id,
        email: u.email,
        // Exclude sensitive fields in production
        createdAt: u.createdAt
      } as userData
    `, { userId });
  }

  private async checkDataAccess(requesterId: string, targetUserId: string): Promise<boolean> {
    // Implement your permission logic
    return requesterId === targetUserId || await this.isAdmin(requesterId);
  }
}
```

### Network Security
Configure secure network connections:

```typescript
// Use TLS encryption in production
const secureConfig = {
  encrypted: true,
  trust: 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES',
  // For self-signed certificates in development
  // trust: 'TRUST_ALL_CERTIFICATES'
};
```

## Troubleshooting Guide

### Common Connection Issues

#### Connection Timeout Errors
```typescript
// Symptom: ServiceUnavailableError or connection timeouts
// Solution: Increase timeout values
Neo4jModule.forRoot({
  uri: 'bolt://localhost:7687',
  username: 'neo4j',
  password: 'password',
  config: {
    connectionAcquisitionTimeout: 120000, // Increase from default 60s
    connectionTimeout: 60000,             // Increase connection timeout
    maxTransactionRetryTime: 60000,       // Increase retry time
  }
});
```

#### Database Not Found
```typescript
// Symptom: Database does not exist error
// Solution: Verify database configuration
await this.neo4j.write(async (session) => {
  // Check if database exists
  const result = await session.run('SHOW DATABASES');
  console.log('Available databases:', result.records.map(r => r.get('name')));
});
```

### Performance Issues

#### Slow Query Performance
```cypher
-- Use PROFILE to identify bottlenecks
PROFILE
MATCH (u:User)-[:FOLLOWS]->(f:User)
WHERE u.active = true
RETURN f.name
ORDER BY f.name
LIMIT 100;

-- Check for missing indexes
SHOW INDEXES;

-- Create necessary indexes
CREATE INDEX user_active IF NOT EXISTS FOR (u:User) ON (u.active);
```

#### Memory Issues with Large Results
```typescript
// Problem: Loading large result sets into memory
// Solution: Use streaming or pagination
async getLotsOfUsers(offset: number, limit: number): Promise<User[]> {
  return this.neo4j.readQuery(`
    MATCH (u:User)
    RETURN u
    ORDER BY u.createdAt
    SKIP $offset
    LIMIT $limit
  `, { offset, limit });
}

// For very large datasets, process in batches
async processAllUsers(batchProcessor: (users: User[]) => Promise<void>): Promise<void> {
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const batch = await this.getLotsOfUsers(offset, batchSize);
    
    if (batch.length === 0) {
      hasMore = false;
    } else {
      await batchProcessor(batch);
      offset += batchSize;
    }
  }
}
```

### Transaction Issues

#### Transaction Deadlocks
```typescript
// Problem: Concurrent transactions causing deadlocks
// Solution: Implement retry logic with exponential backoff
async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof Error && error.message.includes('DeadlockDetected')) {
        const delay = Math.pow(2, attempt) * 100; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error; // Re-throw if not a deadlock
    }
  }
  
  throw lastError;
}

@Transactional()
async safeUpdateUser(userId: string, updates: Partial<User>): Promise<User> {
  return this.withRetry(async () => {
    return this.neo4j.write(async (session) => {
      const result = await session.run(`
        MATCH (u:User {id: $userId})
        SET u += $updates
        RETURN u
      `, { userId, updates });
      
      return result.records[0]?.get('u').properties;
    });
  });
}
```

### Debugging Tips

#### Enable Query Logging
```typescript
// Add logging to see executed queries
Neo4jModule.forRoot({
  uri: 'bolt://localhost:7687',
  username: 'neo4j',
  password: 'password',
  config: {
    logging: {
      level: 'debug',
      logger: (level: string, message: string) => {
        console.log(`[Neo4j ${level.toUpperCase()}] ${message}`);
      }
    }
  }
});
```

#### Health Check Debugging
```typescript
@Injectable()
export class Neo4jDebugService {
  constructor(
    private readonly neo4jHealth: Neo4jHealthService,
    private readonly neo4jConnection: Neo4jConnectionService
  ) {}

  async diagnose(): Promise<DiagnosticReport> {
    const health = await this.neo4jHealth.checkHealth();
    const connectionInfo = this.neo4jConnection.getConnectionInfo();
    const metrics = await this.neo4jHealth.getMetrics();

    return {
      health,
      connectionInfo,
      metrics,
      timestamp: new Date(),
      recommendations: this.generateRecommendations(health, metrics)
    };
  }

  private generateRecommendations(health: any, metrics: any): string[] {
    const recommendations: string[] = [];

    if (health.status === 'down') {
      recommendations.push('Check Neo4j server status and network connectivity');
    }

    if (metrics.nodes > 100000 && !metrics.indexes) {
      recommendations.push('Consider adding indexes for better performance');
    }

    return recommendations;
  }
}
```

This comprehensive guide provides everything needed to effectively work with the `@hive-academy/nestjs-neo4j` library in production applications, from basic usage to advanced optimization and troubleshooting scenarios.