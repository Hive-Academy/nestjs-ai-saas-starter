/**
 * @fileoverview Basic User Entity - Showcase Core Decorators
 *
 * This entity demonstrates:
 * - String shorthand @Neo4jEntity usage
 * - Smart property auto-detection
 * - Proper Date types (not string timestamps)
 * - Auto UUID generation
 * - Type-safe property mapping
 *
 * Complexity Level: BASIC
 * Decorators Used: 5 core decorators
 */

import {
  Neo4jEntity,
  Neo4jProp,
  Id,
  CreatedAt,
  UpdatedAt,
  JsonProperty
} from '../../../../../index';

/**
 * Basic User entity with core decorator showcase
 *
 * Features:
 * - ✅ Proper Date types (matches BaseEntity interface)
 * - ✅ Smart auto-detection for email field normalization
 * - ✅ JSON serialization for preferences object
 * - ✅ Auto UUID generation for ID field
 * - ✅ Timestamp management with ISO string transforms
 */
@Neo4jEntity('User', {
  description: 'Basic user entity demonstrating core decorators',
  tags: ['basic', 'user', 'example']
})
export class User {
  @Id()
  id: string;

  @Neo4jProp() // Smart auto-detection: email normalization
  email: string;

  @Neo4jProp()
  firstName: string;

  @Neo4jProp()
  lastName: string;

  @Neo4jProp()
  role: 'admin' | 'user' | 'moderator';

  @Neo4jProp()
  isActive: boolean;

  @Neo4jProp()
  department: string;

  @Neo4jProp()
  salary?: number;

  @Neo4jProp()
  profileImage?: string;

  @Neo4jProp()
  lastLoginAt?: Date; // Smart auto-detection: timestamp transform

  @JsonProperty() // Smart JSON serialization
  preferences?: {
    theme: 'light' | 'dark';
    notifications: boolean;
    language: string;
  };

  @CreatedAt() // ✅ PROPER Date TYPE (not string!)
  createdAt: Date;

  @UpdatedAt() // ✅ PROPER Date TYPE (not string!)
  updatedAt: Date;

  @Neo4jProp()
  deletedAt?: Date;

  @Neo4jProp()
  joinedAt?: Date;

  constructor(data?: Partial<User>) {
    if (data) {
      Object.assign(this, data);
    }
  }

  // Auto-generated utility methods from @Neo4jEntity:
  // - toNeo4j(): Converts to Neo4j storage format
  // - static fromNeo4j(data): Creates instance from Neo4j data
  // - getLabel(): Returns 'User'
  // - getLabels(): Returns ['User']

  /**
   * Business logic methods can be added as needed
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  isAdministrator(): boolean {
    return this.role === 'admin';
  }

  getDisplayEmail(): string {
    return this.email.toLowerCase(); // Smart auto-normalization already applied
  }
}

/**
 * Expected Neo4j Storage Format:
 *
 * {
 *   id: "uuid-generated-string",
 *   email: "user@example.com", // Auto-normalized (lowercase, trimmed)
 *   firstName: "John",
 *   lastName: "Doe",
 *   role: "user",
 *   isActive: true,
 *   department: "engineering",
 *   salary: 75000,
 *   profileImage: "https://...",
 *   lastLoginAt: "2024-01-15T10:30:00.000Z", // ISO string (Date→string transform)
 *   preferences: "{\"theme\":\"light\",\"notifications\":true,\"language\":\"en\"}", // JSON string
 *   createdAt: "2024-01-01T00:00:00.000Z", // ISO string (Date→string transform)
 *   updatedAt: "2024-01-15T10:30:00.000Z", // ISO string (Date→string transform)
 *   joinedAt: "2024-01-01T09:00:00.000Z"
 * }
 *
 * TypeScript Usage (Proper Types):
 *
 * const user = new User({
 *   email: "john.doe@example.com",
 *   firstName: "John",
 *   lastName: "Doe",
 *   role: "user",
 *   department: "engineering",
 *   createdAt: new Date(), // ✅ Date object, not string!
 *   preferences: {         // ✅ Object, not JSON string!
 *     theme: "light",
 *     notifications: true,
 *     language: "en"
 *   }
 * });
 *
 * // Type-safe property access
 * const created: Date = user.createdAt; // ✅ Date type
 * const theme = user.preferences?.theme; // ✅ Typed access
 */
