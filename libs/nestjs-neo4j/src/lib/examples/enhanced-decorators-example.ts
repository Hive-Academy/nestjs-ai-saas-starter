/**
 * Enhanced Decorators Usage Examples
 *
 * This file demonstrates the enhanced decorators with smart defaults
 * and backward compatibility preserved.
 */

import {
  Neo4jEntity,
  Neo4jProperty,
  Neo4jRelationship,
  CypherQuery,
} from '../../../../../libs/nestjs-neo4j/src/lib/decorators';
import { Injectable } from '@nestjs/common';

// Example 1: String shorthand for Neo4jEntity (NEW)
@Neo4jEntity('User')
export class User {
  // Smart default: auto-generates UUID, detects ID field
  @Neo4jProperty()
  id: string;

  // Smart default: normalizes email to lowercase
  @Neo4jProperty()
  email: string;

  @Neo4jProperty()
  name: string;

  // Smart default: auto-detects timestamp field and applies ISO transformation
  @Neo4jProperty()
  createdAt: Date;

  // Smart default: auto-detects timestamp field and applies ISO transformation
  @Neo4jProperty()
  updatedAt: Date;

  // Smart default: auto-detects boolean transformation
  @Neo4jProperty()
  isActive: boolean;

  // Smart default: auto-detects JSON serialization for object types
  @Neo4jProperty()
  metadata: Record<string, any>;
}

// Example 2: Using namespace helpers (NEW)
@Neo4jEntity.Timestamped('Post')
export class Post {
  @Neo4jProperty()
  id: string;

  @Neo4jProperty()
  title: string;

  @Neo4jProperty()
  content: string;

  // Automatically gets createdAt/updatedAt from Timestamped helper

  @Neo4jRelationship({
    type: 'AUTHORED_BY',
    direction: 'IN',
    targetType: () => User,
  })
  author: User;
}

// Example 3: Backward compatibility - existing approach still works
@Neo4jEntity({
  label: 'Product',
  additionalLabels: ['Inventory'],
  idStrategy: 'custom',
  description: 'Product entity with inventory tracking',
})
export class Product {
  @Neo4jProperty({
    name: 'productId',
    defaultValue: () => `PROD_${Date.now()}`,
  })
  id: string;

  @Neo4jProperty({
    transform: {
      toNeo4j: (price: number) => Math.round(price * 100), // Store cents
      fromNeo4j: (cents: number) => cents / 100, // Return dollars
    },
  })
  price: number;

  @Neo4jProperty({
    serialized: true,
    description: 'Product specifications as JSON',
  })
  specifications: any;
}

// Example 4: Enhanced CypherQuery with smart defaults
@Injectable()
export class UserService {
  // Zero-config usage with smart defaults
  @CypherQuery<User[]>({ returnType: () => [] })
  async findActiveUsers(): Promise<User[]> {
    // Smart defaults: mode='read', cache=true, retry=1
    return 'MATCH (u:User {isActive: true}) RETURN u ORDER BY u.createdAt DESC';
  }

  // Simple explicit configuration
  @CypherQuery<User[]>({
    returnType: () => [],
    runtime: { cache: { ttl: 600000 }, retry: { attempts: 3, delay: 1000 } },
  })
  async findUsersByEmail(): Promise<User[]> {
    return {
      query: 'MATCH (u:User) WHERE u.email = $email RETURN u',
      params: { email: 'user@example.com' },
    };
  }

  // Write operation with smart defaults
  @CypherQuery<User>({
    returnType: () => ({} as User),
    runtime: { transactionMode: 'WRITE' },
  })
  async createUser(): Promise<User> {
    // Smart defaults: retry=3 for writes
    return {
      query: 'CREATE (u:User $userData) RETURN u',
      params: { userData: { id: '123', email: 'new@example.com' } },
    };
  }
}

// Example 5: All decorator patterns working together
@Neo4jEntity.Auditable('Order') // Namespace helper for auditable entities
export class Order {
  @Neo4jProperty() // Smart ID generation
  id: string;

  @Neo4jProperty() // Smart URL normalization
  trackingUrl: string;

  @Neo4jProperty() // Smart number transformation for currency
  totalAmount: number;

  @Neo4jProperty() // Smart status field detection
  orderStatus: string;

  @Neo4jProperty() // Smart JSON detection for complex objects
  shippingAddress: {
    street: string;
    city: string;
    zipCode: string;
  };

  @Neo4jProperty() // Auto-timestamp transformation
  createdAt: Date;

  @Neo4jProperty() // Auto-timestamp transformation
  updatedAt: Date;

  @Neo4jRelationship({
    type: 'PLACED_BY',
    direction: 'IN',
    targetType: () => User,
  })
  customer: User;
}
