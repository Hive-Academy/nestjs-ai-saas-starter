import { Injectable } from '@nestjs/common';
import { IVectorService } from './vector-service.interface';

/**
 * LangGraph Store interface implementation for cross-thread memory
 * Compliant with official LangGraph 2025 Store specification
 */
export interface Item {
  value: unknown;
  key: string;
  namespace: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Official LangGraph Store interface
 * Provides namespace-based hierarchical storage for cross-thread memory sharing
 */
export interface Store {
  /**
   * Search for items in a namespace
   * @param namespace Hierarchical namespace path (e.g., ['user', 'conversations', 'thread_123'])
   * @param query Optional semantic search query
   * @returns Promise of matching items
   */
  search(namespace: string[], query?: string): Promise<Item[]>;

  /**
   * Get a specific item by key
   * @param namespace Hierarchical namespace path
   * @param key Item key within the namespace
   * @returns Promise of item or null if not found
   */
  get(namespace: string[], key: string): Promise<Item | null>;

  /**
   * Store an item
   * @param namespace Hierarchical namespace path
   * @param key Item key within the namespace
   * @param value Item value (any serializable data)
   */
  put(namespace: string[], key: string, value: unknown): Promise<void>;

  /**
   * Delete an item
   * @param namespace Hierarchical namespace path
   * @param key Item key to delete
   */
  delete(namespace: string[], key: string): Promise<void>;

  /**
   * List all items in namespace
   * @param namespace Hierarchical namespace path
   * @returns Promise of all items in the namespace
   */
  list(namespace: string[]): Promise<Item[]>;
}

/**
 * ChromaDB implementation of LangGraph Store
 * Maps namespace hierarchies to ChromaDB metadata filters
 * Supports semantic search through query parameter
 */
@Injectable()
export class ChromaLangGraphStore implements Store {
  constructor(
    private readonly vectorService: IVectorService,
    private readonly collection = 'langgraph_store'
  ) {}

  async search(namespace: string[], query?: string): Promise<Item[]> {
    this.validateNamespace(namespace);
    const namespaceKey = namespace.join('/');

    if (query) {
      // Semantic search using vector service
      const results = await this.vectorService.search(this.collection, {
        queryText: query,
        filter: {
          namespace: namespaceKey,
          type: 'store_item',
        },
        limit: 50,
      });

      return results.map((result) => this.toItem(result));
    } else {
      // List all in namespace
      return this.list(namespace);
    }
  }

  async get(namespace: string[], key: string): Promise<Item | null> {
    this.validateNamespace(namespace);
    this.validateKey(key);
    const namespaceKey = namespace.join('/');
    const fullKey = `${namespaceKey}/${key}`;

    const results = await this.vectorService.search(this.collection, {
      filter: {
        full_key: fullKey,
        type: 'store_item',
      },
      limit: 1,
    });

    return results.length > 0 ? this.toItem(results[0]) : null;
  }

  async put(namespace: string[], key: string, value: unknown): Promise<void> {
    this.validateNamespace(namespace);
    this.validateKey(key);
    const namespaceKey = namespace.join('/');
    const fullKey = `${namespaceKey}/${key}`;
    const now = new Date().toISOString();

    // Check if item already exists to maintain created_at timestamp
    const existing = await this.get(namespace, key);
    const createdAt = existing?.created_at || now;

    await this.vectorService.store(this.collection, {
      id: fullKey,
      document: JSON.stringify(value),
      metadata: {
        namespace: namespaceKey,
        key,
        full_key: fullKey,
        created_at: createdAt,
        updated_at: now,
        type: 'store_item',
        // Additional metadata for ChromaDB optimization
        namespace_depth: namespace.length,
        namespace_root: namespace[0] || 'default',
        value_type: typeof value,
        serialized_length: JSON.stringify(value).length,
      },
    });
  }

  async delete(namespace: string[], key: string): Promise<void> {
    this.validateNamespace(namespace);
    this.validateKey(key);
    const namespaceKey = namespace.join('/');
    const fullKey = `${namespaceKey}/${key}`;

    await this.vectorService.delete(this.collection, [fullKey]);
  }

  async list(namespace: string[]): Promise<Item[]> {
    this.validateNamespace(namespace);
    const namespaceKey = namespace.join('/');

    const results = await this.vectorService.search(this.collection, {
      filter: {
        namespace: namespaceKey,
        type: 'store_item',
      },
      limit: 1000, // Reasonable limit for namespace listing
    });

    return results.map((result) => this.toItem(result));
  }

  /**
   * Convert ChromaDB search result to LangGraph Item
   */
  private toItem(result: any): Item {
    try {
      const value = JSON.parse(result.document);
      return {
        value,
        key: result.metadata.key,
        namespace: result.metadata.namespace.split('/'),
        created_at: result.metadata.created_at,
        updated_at: result.metadata.updated_at,
      };
    } catch (error) {
      // Graceful handling of malformed data
      return {
        value: result.document, // Return raw document if JSON parsing fails
        key: result.metadata.key || result.id,
        namespace: result.metadata.namespace?.split('/') || ['default'],
        created_at: result.metadata.created_at || new Date().toISOString(),
        updated_at: result.metadata.updated_at || new Date().toISOString(),
      };
    }
  }

  /**
   * Validate namespace array for consistency and security
   */
  private validateNamespace(namespace: string[]): void {
    if (!Array.isArray(namespace)) {
      throw new Error('Namespace must be an array of strings');
    }

    if (namespace.length === 0) {
      throw new Error('Namespace cannot be empty');
    }

    if (namespace.length > 10) {
      throw new Error('Namespace depth cannot exceed 10 levels');
    }

    for (const segment of namespace) {
      if (typeof segment !== 'string' || !segment.trim()) {
        throw new Error('All namespace segments must be non-empty strings');
      }

      if (segment.includes('/')) {
        throw new Error('Namespace segments cannot contain forward slashes');
      }

      if (segment.length > 100) {
        throw new Error('Namespace segments cannot exceed 100 characters');
      }
    }
  }

  /**
   * Validate key for consistency and security
   */
  private validateKey(key: string): void {
    if (typeof key !== 'string' || !key.trim()) {
      throw new Error('Key must be a non-empty string');
    }

    if (key.length > 200) {
      throw new Error('Key cannot exceed 200 characters');
    }

    if (key.includes('/')) {
      throw new Error('Key cannot contain forward slashes');
    }
  }

  /**
   * Health check for store functionality
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Test basic operations with a health check namespace
      const testNamespace = ['__health__'];
      const testKey = 'health_check';
      const testValue = { timestamp: new Date().toISOString() };

      await this.put(testNamespace, testKey, testValue);
      const retrieved = await this.get(testNamespace, testKey);
      await this.delete(testNamespace, testKey);

      return (
        !!retrieved &&
        JSON.stringify(retrieved.value) === JSON.stringify(testValue)
      );
    } catch (error) {
      return false;
    }
  }
}

/**
 * Factory for creating LangGraph Store instances
 * Supports different vector service implementations
 */
export class LangGraphStoreFactory {
  static create(vectorService: IVectorService, collection?: string): Store {
    return new ChromaLangGraphStore(vectorService, collection);
  }

  /**
   * Create store with enhanced configuration
   */
  static createWithConfig(
    vectorService: IVectorService,
    config: {
      collection?: string;
      namespaceStrategy?: 'user' | 'thread' | 'agent' | 'hybrid';
      crossThreadSharing?: boolean;
    }
  ): Store {
    const collection = config.collection || 'langgraph_store';
    return new ChromaLangGraphStore(vectorService, collection);
  }
}

/**
 * Type guard for LangGraph Store items
 */
export function isValidItem(obj: any): obj is Item {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.key === 'string' &&
    Array.isArray(obj.namespace) &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string' &&
    obj.value !== undefined
  );
}

/**
 * Utility functions for namespace management
 */
export class NamespaceUtils {
  /**
   * Create user-scoped namespace
   */
  static userNamespace(userId: string, ...segments: string[]): string[] {
    return ['user', userId, ...segments];
  }

  /**
   * Create thread-scoped namespace
   */
  static threadNamespace(threadId: string, ...segments: string[]): string[] {
    return ['thread', threadId, ...segments];
  }

  /**
   * Create agent-scoped namespace
   */
  static agentNamespace(agentId: string, ...segments: string[]): string[] {
    return ['agent', agentId, ...segments];
  }

  /**
   * Create hybrid namespace combining user and thread
   */
  static hybridNamespace(
    userId: string,
    threadId: string,
    ...segments: string[]
  ): string[] {
    return ['user', userId, 'thread', threadId, ...segments];
  }

  /**
   * Extract namespace components
   */
  static parseNamespace(namespace: string[]): {
    scope: 'user' | 'thread' | 'agent' | 'other';
    id?: string;
    segments: string[];
  } {
    if (namespace.length === 0) {
      return { scope: 'other', segments: [] };
    }

    const [scope, id, ...segments] = namespace;

    if (['user', 'thread', 'agent'].includes(scope) && id) {
      return { scope: scope as 'user' | 'thread' | 'agent', id, segments };
    }

    return { scope: 'other', segments: namespace };
  }
}
