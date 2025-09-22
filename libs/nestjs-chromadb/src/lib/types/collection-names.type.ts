/**
 * @fileoverview Generic Collection Type Safety System
 * 
 * This module provides compile-time type safety for ChromaDB collection names
 * and operations WITHOUT coupling to specific business logic. Consumer applications
 * define their own collection types using these generic utilities.
 */

/**
 * Generic collection name type that can be extended by consumer applications
 * Consumer applications should define their own collection types like:
 * 
 * type MyCollectionName = 'users' | 'products' | 'orders';
 * 
 * This library provides the generic infrastructure without business coupling.
 */
export type CollectionName = string;

/**
 * Tenant-aware collection naming with prefix support
 * Format: tenantId_collectionName or namespace:collectionName
 */
export type CollectionNamespace<T extends string> = `${T}:${string}`;
export type TenantCollectionName<T extends string> = `${string}_${T}`;
export type TypedCollectionName<T extends string> = T | CollectionNamespace<T> | TenantCollectionName<T>;

/**
 * Generic collection metadata configuration interface
 * Consumer applications can extend this with their specific configurations
 */
export interface CollectionConfig {
  readonly name: string;
  readonly description?: string;
  readonly embeddingModel?: string;
  readonly dimensions?: number;
  readonly metadata?: Record<string, unknown>;
  readonly indexingStrategy?: 'hnsw' | 'flat' | 'ivf';
  readonly distanceFunction?: 'cosine' | 'euclidean' | 'dot_product';
  readonly maxDocuments?: number;
  readonly retention?: string; // e.g., '30d', '1y'
}

/**
 * Generic collection registry type
 * Consumer applications can create their own registries using this type
 */
export type CollectionRegistry<T extends string = string> = Record<T, CollectionConfig>;

/**
 * Abstract utility class for collection name operations
 * Consumer applications can extend this with their specific logic
 */
export abstract class BaseCollectionNameUtils<T extends string = string> {
  protected abstract getRegistry(): CollectionRegistry<T>;

  /**
   * Validate if a string is a known collection name
   */
  isValidCollectionName(name: string): name is T {
    return name in this.getRegistry();
  }

  /**
   * Get collection configuration
   */
  getCollectionConfig(name: T): CollectionConfig | undefined {
    return this.getRegistry()[name];
  }

  /**
   * Extract base collection name from tenant-prefixed name
   */
  extractBaseCollectionName(name: string): T | null {
    // Handle tenant prefix format: tenantId_collectionName
    const tenantMatch = name.match(/^[^_]+_(.+)$/);
    if (tenantMatch && this.isValidCollectionName(tenantMatch[1])) {
      return tenantMatch[1] as T;
    }

    // Handle namespace format: namespace:collectionName
    const namespaceMatch = name.match(/^[^:]+:(.+)$/);
    if (namespaceMatch && this.isValidCollectionName(namespaceMatch[1])) {
      return namespaceMatch[1] as T;
    }

    // Check if it's a direct collection name
    if (this.isValidCollectionName(name)) {
      return name as T;
    }

    return null;
  }

  /**
   * Create tenant-aware collection name
   */
  createTenantCollectionName(tenantId: string, collectionName: T): TenantCollectionName<T> {
    return `${tenantId}_${collectionName}` as TenantCollectionName<T>;
  }

  /**
   * Create namespace collection name
   */
  createNamespaceCollectionName(namespace: string, collectionName: T): CollectionNamespace<T> {
    return `${namespace}:${collectionName}` as CollectionNamespace<T>;
  }

  /**
   * Get all available collection names
   */
  getAllCollectionNames(): readonly T[] {
    return Object.keys(this.getRegistry()) as T[];
  }

  /**
   * Get collections by embedding model
   */
  getCollectionsByEmbeddingModel(model: string): T[] {
    return Object.entries(this.getRegistry())
      .filter(([, config]: [string, CollectionConfig]) => config.embeddingModel === model)
      .map(([name]) => name as T);
  }

  /**
   * Get collections by distance function
   */
  getCollectionsByDistanceFunction(distanceFunction: string): T[] {
    return Object.entries(this.getRegistry())
      .filter(([, config]: [string, CollectionConfig]) => config.distanceFunction === distanceFunction)
      .map(([name]) => name as T);
  }

  /**
   * Validate collection configuration
   */
  validateCollectionConfig(config: CollectionConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.name) {
      errors.push('Collection name is required');
    }

    if (config.dimensions && (config.dimensions < 1 || config.dimensions > 10000)) {
      errors.push('Embedding dimensions must be between 1 and 10000');
    }

    if (config.maxDocuments && config.maxDocuments < 1) {
      errors.push('Max documents must be greater than 0');
    }

    const validDistanceFunctions = ['cosine', 'euclidean', 'dot_product'];
    if (config.distanceFunction && !validDistanceFunctions.includes(config.distanceFunction)) {
      errors.push(`Distance function must be one of: ${validDistanceFunctions.join(', ')}`);
    }

    const validIndexingStrategies = ['hnsw', 'flat', 'ivf'];
    if (config.indexingStrategy && !validIndexingStrategies.includes(config.indexingStrategy)) {
      errors.push(`Indexing strategy must be one of: ${validIndexingStrategies.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Template literal types for compile-time validation
 * These are generic and don't couple to specific business logic
 */
export type VectorQueryString<T extends string> = 
  T extends `SELECT ${string} FROM ${string} WHERE ${string}` ? T : never;

export type CollectionQueryString<T extends string> =
  T extends `SEARCH ${string} WHERE ${string} LIMIT ${string}` ? T : never;

/**
 * Generic type guard function factory
 * Consumer applications can use this to create their own type guards
 */
export function createCollectionNameValidator<T extends string>(
  registry: CollectionRegistry<T>
) {
  return function isCollectionName(value: string): value is T {
    return value in registry;
  };
}

/**
 * Generic tenant collection name type guard factory
 */
export function createTenantCollectionNameValidator<T extends string>(
  registry: CollectionRegistry<T>
) {
  const isValidCollection = createCollectionNameValidator(registry);
  
  return function isTenantCollectionName(value: string): value is TenantCollectionName<T> {
    const tenantMatch = value.match(/^[^_]+_(.+)$/);
    return tenantMatch ? isValidCollection(tenantMatch[1]) : false;
  };
}

/**
 * Generic namespace collection name type guard factory
 */
export function createNamespaceCollectionNameValidator<T extends string>(
  registry: CollectionRegistry<T>
) {
  const isValidCollection = createCollectionNameValidator(registry);
  
  return function isNamespaceCollectionName(value: string): value is CollectionNamespace<T> {
    const namespaceMatch = value.match(/^[^:]+:(.+)$/);
    return namespaceMatch ? isValidCollection(namespaceMatch[1]) : false;
  };
}

/**
 * Generic collection utilities factory
 * Consumer applications can use this to create type-safe collection utilities
 */
export function createCollectionUtils<T extends string>(registry: CollectionRegistry<T>) {
  return class CollectionUtils extends BaseCollectionNameUtils<T> {
    public getRegistry(): CollectionRegistry<T> {
      return registry;
    }
  };
}

/**
 * Example usage for consumer applications:
 * 
 * // 1. Define your collection types
 * type MyCollectionName = 'users' | 'products' | 'orders';
 * 
 * // 2. Create your registry
 * const MY_COLLECTION_REGISTRY: CollectionRegistry<MyCollectionName> = {
 *   'users': {
 *     name: 'users',
 *     description: 'User profiles and preferences',
 *     embeddingModel: 'text-embedding-3-small',
 *     dimensions: 1536,
 *     distanceFunction: 'cosine',
 *   },
 *   // ... other collections
 * };
 * 
 * // 3. Create your utilities
 * const MyCollectionUtils = createCollectionUtils(MY_COLLECTION_REGISTRY);
 * const utils = new MyCollectionUtils();
 * 
 * // 4. Create your type guards
 * const isMyCollectionName = createCollectionNameValidator(MY_COLLECTION_REGISTRY);
 * 
 * // 5. Use with full type safety
 * if (isMyCollectionName(someString)) {
 *   // someString is now typed as MyCollectionName
 *   const config = utils.getCollectionConfig(someString);
 * }
 */