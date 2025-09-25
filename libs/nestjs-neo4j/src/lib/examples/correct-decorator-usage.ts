/**
 * Correct Decorator Usage Examples - Post TypeScript Fix
 *
 * This file demonstrates the correct usage of Neo4j decorators with proper
 * TypeScript signatures that resolve the TS1241 error.
 */

import { Injectable } from '@nestjs/common';
import {
  Neo4jEntity,
  Neo4jProperty,
  Neo4jRelationship,
  Neo4jRepository,
  CypherQuery,
  Transactional,
  Safe,
} from '../decorators';

// ✅ Correct: Class decorators with proper signatures
@Neo4jEntity('User')
export class User {
  @Neo4jProperty()
  id: string;

  @Neo4jProperty()
  email: string;

  @Neo4jProperty()
  name: string;

  @Neo4jProperty()
  createdAt: Date;

  @Neo4jRelationship({
    type: 'AUTHORED',
    direction: 'OUT',
    targetType: () => Post,
  })
  posts: Post[];
}

@Neo4jEntity('Post')
export class Post {
  @Neo4jProperty()
  id: string;

  @Neo4jProperty()
  title: string;

  @Neo4jProperty()
  content: string;

  @Neo4jRelationship({
    type: 'AUTHORED',
    direction: 'IN',
    targetType: () => User,
  })
  author: User;
}

// ✅ Correct: Repository decorator with proper signature
@Neo4jRepository({
  entityType: () => User,
  autoGenerate: true,
})
@Injectable()
export class UserRepository {
  constructor(private readonly neo4jService: any) {}

  // ✅ Correct: Method decorators with parentheses (even if no config)
  @CypherQuery<User[]>({
    returnType: () => [new User()],
  })
  async findActiveUsers(): Promise<User[]> {
    return 'MATCH (u:User {active: true}) RETURN u ORDER BY u.createdAt DESC';
  }

  // ✅ Correct: Method decorators with proper configuration
  @CypherQuery<User | null>({
    cache: '5m',
    retry: 3,
    returnType: () => new User(),
  })
  async findByEmail(params: { email: string }): Promise<User | null> {
    return {
      query: 'MATCH (u:User {email: $email}) RETURN u LIMIT 1',
      params,
    };
  }

  // ✅ Correct: Transactional decorator with proper signature
  @Transactional()
  @Safe()
  async createUserWithProfile(userData: Partial<User>): Promise<User> {
    const query = `
      CREATE (u:User $userData)
      CREATE (p:Profile {userId: u.id})
      CREATE (u)-[:HAS_PROFILE]->(p)
      RETURN u
    `;
    return { query, params: { userData } };
  }

  // ✅ Correct: Multiple decorators with proper signatures
  @Safe({ strict: true })
  @CypherQuery<boolean>({
    mode: 'WRITE',
    returnType: () => true,
  })
  async deleteUser(params: { id: string }): Promise<boolean> {
    return {
      query: 'MATCH (u:User {id: $id}) DELETE u RETURN count(u) > 0 as deleted',
      params,
    };
  }
}

// ✅ Correct: Service with method decorators
@Injectable()
export class PostService {
  constructor(private readonly neo4jService: any) {}

  // ✅ Correct: CypherQuery with proper signature
  @CypherQuery<Post[]>({
    returnType: () => [new Post()],
    runtime: {
      cache: { ttl: 300000 },
      transactionMode: 'READ',
    },
  })
  async getRecentPosts(params: { limit: number }): Promise<Post[]> {
    return {
      query: `
        MATCH (p:Post)
        RETURN p
        ORDER BY p.createdAt DESC
        LIMIT $limit
      `,
      params,
    };
  }

  // ✅ Correct: Decorator with complex configuration
  @Safe({
    strict: true,
    rules: {
      maxDepth: 5,
      preventInjection: true,
    },
  })
  @CypherQuery<Post>({
    cache: '10m',
    retry: 2,
    returnType: () => new Post(),
  })
  async createPost(data: {
    title: string;
    content: string;
    authorId: string;
  }): Promise<Post> {
    return {
      query: `
        MATCH (author:User {id: $authorId})
        CREATE (p:Post $postData)
        CREATE (author)-[:AUTHORED]->(p)
        RETURN p
      `,
      params: {
        authorId: data.authorId,
        postData: {
          id: crypto.randomUUID(),
          title: data.title,
          content: data.content,
          createdAt: new Date().toISOString(),
        },
      },
      description: 'Create a new post with author relationship',
    };
  }
}

// ✅ Correct: Advanced decorator usage
@Injectable()
export class AdvancedUserService {
  constructor(private readonly neo4jService: any) {}

  // ✅ Correct: All decorators with proper signatures
  @Transactional({ timeout: 30000 })
  @Safe({
    strict: true,
    transforms: {
      autoSerialize: true,
      autoInt: true,
    },
  })
  @CypherQuery<{ user: User; stats: any }>({
    mode: 'WRITE',
    cache: false,
    retry: 5,
    returnType: () => ({ user: new User(), stats: {} }),
  })
  async createUserWithComplexData(userData: {
    profile: any;
    preferences: Record<string, any>;
    metadata: any[];
  }): Promise<{ user: User; stats: any }> {
    // Complex query with proper parameter binding
    return {
      query: `
        CREATE (u:User $baseData)
        CREATE (p:Profile $profileData)
        CREATE (u)-[:HAS_PROFILE]->(p)
        WITH u, p
        UNWIND $preferences as pref
        CREATE (u)-[:HAS_PREFERENCE {type: pref.type, value: pref.value}]->(:Preference)
        WITH u, count(*) as prefCount
        RETURN {
          user: u,
          stats: { profileCreated: true, preferencesCount: prefCount }
        } as result
      `,
      params: {
        baseData: {
          id: crypto.randomUUID(),
          email: userData.profile.email,
          name: userData.profile.name,
          createdAt: new Date().toISOString(),
        },
        profileData: userData.profile,
        preferences: Object.entries(userData.preferences).map(
          ([type, value]) => ({ type, value })
        ),
      },
      description: 'Create user with complex profile and preferences',
      tags: ['user', 'create', 'complex', 'transaction'],
    };
  }
}

/**
 * ❌ INCORRECT EXAMPLES (These would cause TS1241 errors):
 *
 * // Missing parentheses - will cause TS1241
 * @CypherQuery
 * async badMethod1() { ... }
 *
 * // Incorrect signature expectation
 * @Safe
 * async badMethod2() { ... }
 *
 * // Wrong decorator usage
 * @Transactional
 * async badMethod3() { ... }
 */

/**
 * ✅ CORRECT PATTERNS SUMMARY:
 *
 * 1. Always use parentheses with method decorators: @Decorator()
 * 2. Method decorators now have proper TypeScript signatures:
 *    - target: object (not Object)
 *    - propertyKey: string | symbol
 *    - descriptor: PropertyDescriptor
 *    - Return type: PropertyDescriptor
 *
 * 3. Class decorators work correctly with both patterns:
 *    - @Neo4jEntity('Label') - string shorthand
 *    - @Neo4jEntity({ label: 'Label' }) - config object
 *
 * 4. Property decorators work as expected:
 *    - @Neo4jProperty() - with parentheses
 *    - @Neo4jProperty({ config }) - with configuration
 *
 * 5. All decorators are now properly typed and will not produce TS1241 errors
 */
