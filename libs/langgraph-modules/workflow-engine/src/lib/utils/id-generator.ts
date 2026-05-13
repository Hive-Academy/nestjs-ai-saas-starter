import { v4 as uuidv4 } from 'uuid';
import { customAlphabet } from 'nanoid';

/**
 * Standardized ID Generator for Workflow Engine
 *
 * Provides consistent ID generation strategies across the platform.
 */
export class IdGenerator {
  private static readonly nanoid = customAlphabet(
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    21
  );

  /**
   * Generate a standard UUID v4
   */
  static generateUUID(): string {
    return uuidv4();
  }

  /**
   * Generate a short, URL-friendly ID (NanoID)
   * Useful for user-facing IDs that need to be compact
   */
  static generateShortId(size = 21): string {
    return this.nanoid(size);
  }

  /**
   * Generate a scoped ID with a prefix
   * @example generateScopedId('task') -> 'task_a1b2c3d4'
   */
  static generateScopedId(prefix: string): string {
    return `${prefix}_${this.generateShortId(12)}`;
  }

  /**
   * Generate a thread ID scoped to a tenant and user
   * @example generateThreadId('org1', 'user1', 'research') -> 'org1_user1_research_a1b2c3'
   */
  static generateThreadId(
    tenantId: string,
    userId: string,
    type: string
  ): string {
    return `${tenantId}::${userId}::${type}::${this.generateShortId(12)}`;
  }
}
