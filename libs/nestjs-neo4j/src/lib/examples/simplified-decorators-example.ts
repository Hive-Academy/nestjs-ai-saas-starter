/**
 * Simplified Decorators Usage Examples
 *
 * This file demonstrates the new simplified decorator API with smart defaults
 * and convention-over-configuration patterns.
 */

import { Injectable } from '@nestjs/common';
import {
  Neo4jEntity,
  Neo4jProperty,
  Neo4jRelationship,
  CypherQuery,
  Safe,
  Id,
  Email,
  JsonProperty,
  CreatedAt,
  UpdatedAt,
} from '../../index';

// Example 1: Simple entity with smart defaults
@Neo4jEntity('User')
export class User {
  @Id() // Combines NotNull + unique behavior
  id: string;

  @Email({ required: true }) // Single decorator with options
  email: string;

  @Neo4jProperty()
  name: string;

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  @JsonProperty()
  metadata: Record<string, any>;
}

// Example 2: Entity with combined constraints
@Neo4jEntity('Order', {
  constraints: {
    unique: [['trackingNumber'], ['customerId', 'orderDate']],
    index: ['orderStatus', 'totalAmount'],
    key: ['id'],
  },
})
export class Order {
  @Id()
  id: string;

  @Neo4jProperty()
  trackingNumber: string;

  @Neo4jProperty()
  customerId: string;

  @Neo4jProperty()
  orderStatus: string;

  @Neo4jProperty()
  totalAmount: number;

  @CreatedAt()
  orderDate: Date;

  @Neo4jRelationship({
    type: 'PLACED_BY',
    direction: 'IN',
    target: () => User,
  })
  customer: User;
}

// Example 3: Service with simplified query decorators
@Injectable()
export class UserService {
  // Zero-config usage (auto-detects READ from 'find' prefix)
  @CypherQuery()
  @Safe()
  async findActiveUsers(): Promise<User[]> {
    return 'MATCH (u:User {active: true}) RETURN u';
  }

  // Simple explicit configuration
  @CypherQuery({ cache: '5m', retry: 3, mode: 'READ' })
  @Safe()
  async findUserByEmail(params: { email: string }): Promise<User | null> {
    return 'MATCH (u:User {email: $email}) RETURN u LIMIT 1';
  }

  // Write operation with smart defaults
  @CypherQuery({ cache: false, retry: 3, mode: 'WRITE' })
  @Safe({ strict: true })
  async createUser(userData: Partial<User>): Promise<User> {
    return {
      query: 'CREATE (u:User $userData) RETURN u',
      params: { userData },
    };
  }

  // Custom configuration for specific needs
  @CypherQuery({
    cache: '10m',
    advanced: {
      validation: { maxParams: 5 },
      description: 'Complex user search with filters',
    },
  })
  @Safe({
    strict: true,
    log: true,
    rules: {
      maxDepth: 5,
      sanitizeHtml: false,
    },
  })
  async searchUsers(filters: {
    name?: string;
    email?: string;
    isActive?: boolean;
    metadata?: Record<string, any>;
  }): Promise<User[]> {
    return {
      query: `
        MATCH (u:User)
        WHERE ($name IS NULL OR u.name CONTAINS $name)
          AND ($email IS NULL OR u.email = $email)
          AND ($isActive IS NULL OR u.isActive = $isActive)
        RETURN u
        ORDER BY u.createdAt DESC
        LIMIT 50
      `,
      params: filters,
    };
  }
}

// Example 4: Advanced entity with relationship patterns
@Neo4jEntity('BlogPost', {
  constraints: {
    unique: ['slug'],
    index: ['publishedAt', 'status', 'tags'],
  },
})
export class BlogPost {
  @Id()
  id: string;

  @Neo4jProperty()
  title: string;

  @Neo4jProperty()
  slug: string;

  @Neo4jProperty()
  content: string;

  @Neo4jProperty()
  status: 'draft' | 'published' | 'archived';

  @JsonProperty()
  tags: string[];

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;

  @Neo4jProperty()
  publishedAt?: Date;

  @Neo4jRelationship({
    type: 'AUTHORED_BY',
    direction: 'IN',
    target: () => User,
  })
  author: User;

  @Neo4jRelationship({
    type: 'HAS_COMMENT',
    direction: 'OUT',
    target: () => Comment,
  })
  comments: Comment[];
}

@Neo4jEntity('Comment')
export class Comment {
  @Id()
  id: string;

  @Neo4jProperty()
  content: string;

  @CreatedAt()
  createdAt: Date;

  @Neo4jRelationship({
    type: 'COMMENTED_BY',
    direction: 'IN',
    target: () => User,
  })
  author: User;

  @Neo4jRelationship({
    type: 'ON_POST',
    direction: 'OUT',
    targetType: () => BlogPost,
  })
  post: BlogPost;
}

// Example 5: Service demonstrating different query patterns
@Injectable()
export class BlogService {
  // Auto-detected READ operation with caching
  @CypherQuery<BlogPost[]>({
    returnType: () => [],
    runtime: { cache: { ttl: 900000 } }, // 15 minutes
  })
  @Safe()
  async findPublishedPosts(): Promise<BlogPost[]> {
    return 'MATCH (p:BlogPost {status: "published"}) RETURN p ORDER BY p.publishedAt DESC';
  }

  // Complex query with relationships
  @CypherQuery<{
    post: BlogPost;
    comments: Comment[];
    commentCount: number;
  }>({
    returnType: () => ({
      post: {} as BlogPost,
      comments: [],
      commentCount: 0,
    }),
    runtime: { cache: { ttl: 300000 } }, // 5 minutes
  })
  @Safe()
  async getPostWithComments(params: { postId: string }): Promise<{
    post: BlogPost;
    comments: Comment[];
    commentCount: number;
  }> {
    return {
      query: `
        MATCH (p:BlogPost {id: $postId})-[:AUTHORED_BY]->(author:User)
        OPTIONAL MATCH (p)-[:HAS_COMMENT]->(c:Comment)-[:COMMENTED_BY]->(commentAuthor:User)
        RETURN p, author,
               collect(c { .*, author: commentAuthor }) as comments,
               count(c) as commentCount
      `,
      params,
    };
  }

  // Write operation for creating blog post
  @CypherQuery<BlogPost>({
    returnType: () => ({} as BlogPost),
    runtime: {
      transactionMode: 'WRITE',
      retry: { attempts: 3, delay: 1000 },
    },
  })
  @Safe({ autoSerialize: true, autoInt: true })
  async createBlogPost(postData: {
    title: string;
    content: string;
    authorId: string;
    tags: string[];
  }): Promise<BlogPost> {
    return {
      query: `
        MATCH (author:User {id: $authorId})
        CREATE (p:BlogPost {
          id: randomUUID(),
          title: $title,
          slug: toLower(replace($title, ' ', '-')),
          content: $content,
          status: 'draft',
          tags: $tags,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        CREATE (p)-[:AUTHORED_BY]->(author)
        RETURN p
      `,
      params: postData,
    };
  }

  // Bulk operation example
  @CypherQuery<{ updated: number }>({
    returnType: () => ({ updated: 0 }),
    runtime: {
      transactionMode: 'WRITE',
      retry: { attempts: 5, delay: 1000 },
    },
  })
  @Safe({
    autoSerialize: true,
    rules: {
      maxArrayLength: 1000,
      maxParams: 50,
    },
  })
  async publishPosts(postIds: string[]): Promise<{ updated: number }> {
    return {
      query: `
        UNWIND $postIds AS postId
        MATCH (p:BlogPost {id: postId, status: 'draft'})
        SET p.status = 'published',
            p.publishedAt = datetime(),
            p.updatedAt = datetime()
        RETURN count(p) as updated
      `,
      params: { postIds },
    };
  }
}

/**
 * Migration Example: Before vs After
 */

// BEFORE (30+ lines with complex configuration)
/*
@Neo4jEntity({
  label: 'User',
  additionalLabels: ['Person'],
  idStrategy: 'uuid',
  indexes: ['email', 'createdAt'],
  constraints: ['id', 'email']
})
@Unique(['email'])
@Index(['createdAt'])
export class UserOld {
  @NotNull()
  @Neo4jProperty({ name: 'userId' })
  id: string;

  @NotNull()
  @Email()
  @Neo4jProperty({ name: 'email_address' })
  email: string;

  @CypherQuery({
    returnType: () => [User],
    options: {
      cache: { enabled: true, ttl: 300000 },
      retry: { enabled: true, attempts: 3 }
    },
    validation: { enabled: true, maxParams: 10 }
  })
  @ValidateNeo4jParams()
  @Neo4jSafe()
  async findActive(): Promise<User[]> {
    return 'MATCH (u:User {active: true}) RETURN u';
  }
}
*/

// AFTER (10 lines with smart defaults)
@Neo4jEntity('User', {
  constraints: { unique: ['email'], index: ['createdAt'] },
})
export class UserNew {
  @Id() id: string;
  @Email() email: string;
  @CreatedAt() createdAt: Date;

  @CypherQuery<User[]>({
    returnType: () => [],
    runtime: { cache: { ttl: 300000 } }, // 5 minutes
  })
  @Safe()
  async findActive(): Promise<User[]> {
    return 'MATCH (u:User {active: true}) RETURN u';
  }
}
