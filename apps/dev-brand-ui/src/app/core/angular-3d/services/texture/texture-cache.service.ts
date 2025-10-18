/**
 * TextureCacheService - Manages texture caching and memory
 *
 * Responsibilities:
 * - Cache texture entries with metadata
 * - Enforce memory limits (LRU eviction)
 * - Track hit/miss rates
 * - Automatic TTL cleanup
 */

import {
  Injectable,
  signal,
  computed,
  DestroyRef,
  inject,
} from '@angular/core';
import * as THREE from 'three';

export interface TextureCacheEntry {
  readonly id: string;
  readonly texture: THREE.Texture;
  readonly source: string;
  readonly timestamp: number;
  readonly size: number; // bytes
  hitCount: number;
  lastAccessed: number;
}

export interface CacheConfig {
  maxSizeMB: number;
  ttlMs: number;
  strategy: 'lru' | 'lfu' | 'ttl';
}

export interface CacheStatistics {
  readonly entries: number;
  readonly sizeMB: number;
  readonly hitRate: number;
  readonly hits: number;
  readonly misses: number;
}

@Injectable({
  providedIn: 'root',
})
export class TextureCacheService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cache = new Map<string, TextureCacheEntry>();

  private cacheHits = 0;
  private cacheMisses = 0;

  private readonly config = signal<CacheConfig>({
    maxSizeMB: 100,
    ttlMs: 300000, // 5 minutes
    strategy: 'lru',
  });

  // Computed statistics
  readonly statistics = computed<CacheStatistics>(() => {
    const entries = this.cache.size;
    const sizeMB =
      Array.from(this.cache.values()).reduce(
        (sum, entry) => sum + entry.size,
        0
      ) /
      (1024 * 1024);

    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;

    return {
      entries,
      sizeMB,
      hitRate,
      hits: this.cacheHits,
      misses: this.cacheMisses,
    };
  });

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Get texture from cache
   */
  get(key: string): THREE.Texture | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.cacheMisses++;
      return null;
    }

    // Check TTL
    const now = Date.now();
    const ttl = this.config().ttlMs;

    if (now - entry.timestamp > ttl) {
      this.delete(key);
      this.cacheMisses++;
      return null;
    }

    // Update access info
    entry.hitCount++;
    entry.lastAccessed = now;
    this.cacheHits++;

    return entry.texture;
  }

  /**
   * Add texture to cache
   */
  set(key: string, texture: THREE.Texture, source: string): void {
    const size = this.estimateTextureSize(texture);

    const entry: TextureCacheEntry = {
      id: key,
      texture,
      source,
      timestamp: Date.now(),
      size,
      hitCount: 0,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
    this.enforceMemoryLimits();
  }

  /**
   * Delete texture from cache
   */
  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.texture.dispose();
      this.cache.delete(key);
    }
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.forEach((entry) => entry.texture.dispose());
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Update cache configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config.update((current) => ({ ...current, ...config }));
    this.enforceMemoryLimits();
  }

  /**
   * Estimate texture size in bytes
   */
  private estimateTextureSize(texture: THREE.Texture): number {
    const image = texture.image;
    const width = image?.width || 512;
    const height = image?.height || 512;
    const bytesPerPixel = 4; // RGBA

    return width * height * bytesPerPixel;
  }

  /**
   * Enforce memory limits using configured strategy
   */
  private enforceMemoryLimits(): void {
    const config = this.config();
    const maxBytes = config.maxSizeMB * 1024 * 1024;
    let currentBytes = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.size,
      0
    );

    if (currentBytes <= maxBytes) return;

    // Sort entries by eviction strategy
    const entries = Array.from(this.cache.entries());

    switch (config.strategy) {
      case 'lru':
        entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        break;
      case 'lfu':
        entries.sort(([, a], [, b]) => a.hitCount - b.hitCount);
        break;
      case 'ttl':
        entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        break;
    }

    // Evict entries until under limit
    while (currentBytes > maxBytes && entries.length > 0) {
      const [key, entry] = entries.shift()!;
      this.cache.delete(key);
      entry.texture.dispose();
      currentBytes -= entry.size;
    }
  }

  /**
   * Cleanup expired entries periodically
   */
  private startCleanupTimer(): void {
    const interval = setInterval(() => {
      const now = Date.now();
      const ttl = this.config().ttlMs;
      const expiredKeys: string[] = [];

      this.cache.forEach((entry, key) => {
        if (now - entry.timestamp > ttl) {
          expiredKeys.push(key);
        }
      });

      expiredKeys.forEach((key) => this.delete(key));
    }, 60000); // Check every minute

    this.destroyRef.onDestroy(() => {
      clearInterval(interval);
      this.clear();
    });
  }
}
