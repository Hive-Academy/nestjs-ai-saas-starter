import { Injectable } from '@nestjs/common';
import { ICacheKeyGenerator, ITtlCalculator } from './cache-interfaces';

/**
 * Cache key generation service - eliminates key generation duplication
 */
@Injectable()
export class CacheKeyGeneratorService implements ICacheKeyGenerator {
  /**
   * Generate vector search cache key
   */
  generateVectorSearchKey(collectionName: string, queryHash: string): string {
    return `chroma:vectorSearch:${collectionName}:${queryHash}`;
  }

  /**
   * Generate embedding cache key
   */
  generateEmbeddingKey(text: string): string {
    const textHash = this.hashString(text);
    return `chroma:embedding:${textHash}`;
  }

  /**
   * Generate operation-based cache key pattern
   */
  generateOperationKey(operation: string): string {
    return `chroma:${operation}:`;
  }

  /**
   * Generate collection-based cache key pattern
   */
  generateCollectionKey(collectionName: string): string {
    return `^chroma:.*:.*${collectionName}.*`;
  }

  /**
   * Hash a string for consistent cache key generation
   * Extracted from original service to eliminate duplication
   */
  hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }
}

/**
 * TTL calculation service - eliminates TTL calculation duplication
 */
@Injectable()
export class TtlCalculatorService implements ITtlCalculator {
  /**
   * Calculate default TTL
   */
  calculateDefaultTtl(): number {
    return 300000; // 5 minutes default
  }

  /**
   * Calculate TTL for vector search operations (longer TTL)
   */
  calculateVectorSearchTtl(defaultTtl: number): number {
    return defaultTtl * 2; // Vector searches are computationally expensive
  }

  /**
   * Calculate TTL for embedding operations (longest TTL)
   */
  calculateEmbeddingTtl(defaultTtl: number): number {
    return defaultTtl * 5; // Embeddings rarely change
  }

  /**
   * Check if a cache entry is expired
   */
  isExpired(expiresAt: number): boolean {
    return Date.now() > expiresAt;
  }
}

/**
 * Size estimation service - eliminates size calculation duplication
 */
@Injectable()
export class SizeEstimatorService {
  /**
   * Estimate the size of a value in bytes
   * Extracted from original service to eliminate duplication
   */
  estimateSize(value: unknown): number {
    if (value === null || value === undefined) {
      return 8; // Basic overhead
    }

    try {
      // Special handling for embeddings (number arrays)
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === 'number'
      ) {
        return value.length * 8 + 64; // 8 bytes per float + array overhead
      }

      // For simple types
      if (typeof value === 'string') {
        return value.length * 2; // UTF-16 encoding
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return 8;
      }

      // For complex objects, use JSON serialization as estimate
      const json = JSON.stringify(value);
      return json.length * 2 + 64; // Add overhead for object structure
    } catch {
      // Fallback for non-serializable objects
      return 1024; // 1KB estimate
    }
  }
}
