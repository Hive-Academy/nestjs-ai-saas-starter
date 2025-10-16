/**
 * ContentTexturePipelineService - Enhanced Texture Generation System
 *
 * Upgrades texture generation system with Angular Three integration,
 * reactive caching, and optimized DOM-to-texture workflows.
 * Follows Angular best practices with signals, reactive patterns, and performance optimization.
 *
 * Features:
 * - DOM element to texture conversion with caching
 * - Reactive texture streaming and updates
 * - Performance-aware texture resolution scaling
 * - Canvas-based texture generation pipeline
 * - Memory-efficient texture atlas management
 * - WebGL texture format optimization
 */

import {
  Injectable,
  signal,
  computed,
  inject,
  effect,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { BehaviorSubject, fromEvent } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AdvancedPerformanceOptimizerService } from './advanced-performance-optimizer.service';

// Texture configuration interfaces
export interface TextureConfig {
  readonly width: number;
  readonly height: number;
  readonly format: THREE.PixelFormat;
  readonly type: THREE.TextureDataType;
  readonly generateMipmaps: boolean;
  readonly wrapS: THREE.Wrapping;
  readonly wrapT: THREE.Wrapping;
  readonly magFilter: THREE.TextureFilter;
  readonly minFilter: THREE.TextureFilter;
  readonly anisotropy: number;
  readonly flipY: boolean;
  readonly premultiplyAlpha: boolean;
  readonly unpackAlignment: number;
}

export interface DOMToTextureOptions {
  readonly element: HTMLElement;
  readonly width?: number;
  readonly height?: number;
  readonly pixelRatio: number;
  readonly backgroundColor: string;
  readonly quality: 'low' | 'medium' | 'high' | 'ultra';
  readonly updateOnResize: boolean;
  readonly updateOnMutation: boolean;
  readonly caching: CachingOptions;
}

export interface CachingOptions {
  readonly enabled: boolean;
  readonly maxSize: number; // MB
  readonly ttl: number; // milliseconds
  readonly compression: boolean;
  readonly strategy: 'lru' | 'lfu' | 'ttl';
}

export interface TexturePipelineState {
  readonly activeTextures: number;
  readonly cacheSize: number; // MB
  readonly cacheHitRate: number;
  readonly averageGenerationTime: number; // ms
  readonly memoryUsage: number; // MB
  readonly qualityLevel: 'low' | 'medium' | 'high' | 'ultra';
}

export interface TextureEntry {
  readonly id: string;
  readonly texture: THREE.Texture;
  readonly source: string; // DOM element selector or description
  readonly timestamp: number;
  readonly size: number; // bytes
  readonly hitCount: number;
  readonly lastAccessed: number;
}

export interface TextureAtlasEntry {
  readonly texture: TextureEntry;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly atlasId: string;
}

@Injectable({
  providedIn: 'root',
})
export class ContentTexturePipelineService {
  private readonly performanceOptimizer = inject(
    AdvancedPerformanceOptimizerService
  );
  private readonly platformId = inject(PLATFORM_ID);

  // Canvas and rendering contexts
  private canvas?: HTMLCanvasElement;
  private context?: CanvasRenderingContext2D;
  private renderer?: THREE.WebGLRenderer;

  // Texture caching system
  private readonly textureCache = new Map<string, TextureEntry>();
  private readonly atlasCache = new Map<string, TextureAtlasEntry[]>();

  // Performance tracking
  private readonly generationTimes: number[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;

  // Reactive state signals
  private readonly pipelineState = signal<TexturePipelineState>({
    activeTextures: 0,
    cacheSize: 0,
    cacheHitRate: 0,
    averageGenerationTime: 0,
    memoryUsage: 0,
    qualityLevel: 'medium',
  });

  private readonly isInitialized = signal(false);
  private readonly currentQualityLevel = signal<
    'low' | 'medium' | 'high' | 'ultra'
  >('medium');

  // Default configurations
  private readonly defaultTextureConfig: TextureConfig = {
    width: 512,
    height: 512,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    generateMipmaps: true,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearMipmapLinearFilter,
    anisotropy: 4,
    flipY: false,
    premultiplyAlpha: false,
    unpackAlignment: 4,
  };

  private readonly defaultCachingOptions: CachingOptions = {
    enabled: true,
    maxSize: 50, // 50MB
    ttl: 300000, // 5 minutes
    compression: true,
    strategy: 'lru',
  };

  // Observable streams
  private readonly textureUpdate$ = new BehaviorSubject<TextureEntry | null>(
    null
  );
  private readonly cacheUpdate$ = new BehaviorSubject<
    Map<string, TextureEntry>
  >(new Map());

  // Computed properties
  readonly state = this.pipelineState.asReadonly();

  readonly qualitySettings = computed(() => {
    const quality = this.currentQualityLevel();
    const performanceHealth =
      this.performanceOptimizer.performanceHealthScore();

    // Adjust quality based on performance
    if (performanceHealth < 50) {
      return this.getQualityConfig('low');
    } else if (performanceHealth < 70) {
      return this.getQualityConfig('medium');
    } else {
      return this.getQualityConfig(quality);
    }
  });

  readonly shouldUseAtlas = computed(() => {
    const state = this.pipelineState();
    return state.activeTextures > 10 && state.memoryUsage > 20; // MB
  });

  // Public observables
  readonly textureUpdates$ = this.textureUpdate$.asObservable();
  readonly cacheUpdates$ = this.cacheUpdate$.asObservable();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initialize();
      this.setupPerformanceEffects();
    }
  }

  /**
   * Initialize the texture pipeline
   */
  async initialize(): Promise<void> {
    try {
      // Create off-screen canvas for texture generation
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d') || undefined;

      if (!this.context) {
        throw new Error('Failed to get 2D context for texture generation');
      }

      // Setup canvas properties for high-quality rendering
      if (this.context) {
        this.context.imageSmoothingEnabled = true;
      }
      this.context.imageSmoothingQuality = 'high';
      this.context.textAlign = 'left';
      this.context.textBaseline = 'top';

      // Initialize WebGL renderer for texture processing
      this.renderer = new THREE.WebGLRenderer({
        canvas: document.createElement('canvas'),
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });

      this.isInitialized.set(true);

      // Setup cleanup
      this.setupCleanupTimer();

      console.log('ContentTexturePipeline initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ContentTexturePipeline:', error);
      throw error;
    }
  }

  /**
   * Convert DOM element to texture with caching
   */
  async domToTexture(
    element: HTMLElement,
    options?: Partial<DOMToTextureOptions>
  ): Promise<THREE.Texture> {
    if (!this.isInitialized() || !this.canvas || !this.context) {
      throw new Error('ContentTexturePipeline not initialized');
    }

    const config = this.mergeOptions(options);
    const cacheKey = this.generateCacheKey(element, config);

    // Check cache first
    if (config.caching.enabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.updateCacheHitRate(true);
        return cached.texture;
      }
    }

    this.updateCacheHitRate(false);

    const startTime = performance.now();

    try {
      // Create texture from DOM element
      const texture = await this.createTextureFromElement(element, config);

      // Cache the result
      if (config.caching.enabled) {
        this.addToCache(cacheKey, texture, element);
      }

      // Update performance metrics
      const generationTime = performance.now() - startTime;
      this.updateGenerationTime(generationTime);

      // Setup reactive updates if requested
      if (config.updateOnMutation || config.updateOnResize) {
        this.setupElementWatching(element, cacheKey, config);
      }

      return texture;
    } catch (error) {
      console.error('Failed to convert DOM to texture:', error);
      throw error;
    }
  }

  /**
   * Create texture atlas from multiple textures
   */
  async createTextureAtlas(
    textures: Array<{ id: string; texture: THREE.Texture }>,
    atlasSize = 2048
  ): Promise<{ atlas: THREE.Texture; entries: TextureAtlasEntry[] }> {
    if (!this.canvas || !this.context) {
      throw new Error('Canvas not initialized');
    }

    // Set up atlas canvas
    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = atlasSize;
    atlasCanvas.height = atlasSize;

    const atlasContext = atlasCanvas.getContext('2d');
    if (!atlasContext) {
      throw new Error('Failed to get atlas context');
    }

    const atlasId = `atlas_${Date.now()}`;
    const entries: TextureAtlasEntry[] = [];

    // Simple grid packing algorithm
    let x = 0;
    let y = 0;
    let rowHeight = 0;

    for (const { id, texture } of textures) {
      const image = texture.image;
      const width = image.width || image.naturalWidth || 256;
      const height = image.height || image.naturalHeight || 256;

      // Check if we need to move to next row
      if (x + width > atlasSize) {
        x = 0;
        y += rowHeight;
        rowHeight = 0;
      }

      // Check if we have vertical space
      if (y + height > atlasSize) {
        console.warn('Texture atlas is full, skipping remaining textures');
        break;
      }

      // Draw texture to atlas
      atlasContext.drawImage(image, x, y, width, height);

      // Create atlas entry
      const textureEntry = this.textureCache.get(id);
      if (textureEntry) {
        entries.push({
          texture: textureEntry,
          x: x / atlasSize,
          y: y / atlasSize,
          width: width / atlasSize,
          height: height / atlasSize,
          atlasId,
        });
      }

      x += width;
      rowHeight = Math.max(rowHeight, height);
    }

    // Create THREE texture from atlas
    const atlasTexture = new THREE.CanvasTexture(atlasCanvas);
    this.applyTextureConfig(atlasTexture, this.qualitySettings());

    // Cache atlas entries
    this.atlasCache.set(atlasId, entries);

    return { atlas: atlasTexture, entries };
  }

  /**
   * Update texture from DOM element (reactive update)
   */
  async updateTexture(cacheKey: string, element: HTMLElement): Promise<void> {
    const cached = this.textureCache.get(cacheKey);
    if (!cached || !this.canvas || !this.context) {
      return;
    }

    try {
      // Re-render element to canvas
      const config = this.parseOptionsFromCacheKey(cacheKey);
      const newTexture = await this.createTextureFromElement(element, config);

      // Update the existing texture
      cached.texture.image = newTexture.image;
      cached.texture.needsUpdate = true;

      // Update cache entry
      this.textureCache.set(cacheKey, {
        ...cached,
        timestamp: Date.now(),
        lastAccessed: Date.now(),
      });

      // Emit update event
      this.textureUpdate$.next(cached);
    } catch (error) {
      console.error('Failed to update texture:', error);
    }
  }

  /**
   * Clear texture cache
   */
  clearCache(): void {
    // Dispose all textures
    this.textureCache.forEach((entry) => {
      entry.texture.dispose();
    });

    this.textureCache.clear();
    this.atlasCache.clear();

    // Reset cache metrics
    this.cacheHits = 0;
    this.cacheMisses = 0;

    this.updatePipelineState();
    this.cacheUpdate$.next(new Map());
  }

  /**
   * Get texture pipeline statistics
   */
  getStatistics(): TexturePipelineState {
    return this.pipelineState();
  }

  /**
   * Set quality level
   */
  setQualityLevel(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    this.currentQualityLevel.set(quality);
  }

  /**
   * Convert DOM element to texture (compatibility method)
   */
  convertDOMToTexture(
    selector: string,
    config: { width: number; height: number; scale: number }
  ): THREE.Texture | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      console.warn(`Element not found for selector: ${selector}`);
      return null;
    }

    // Use the existing texture creation pipeline
    const domOptions: DOMToTextureOptions = {
      element,
      width: config.width,
      height: config.height,
      backgroundColor: '#000000',
      pixelRatio: config.scale,
      quality: 'high',
      updateOnResize: false,
      updateOnMutation: false,
      caching: {
        enabled: true,
        maxSize: 100,
        ttl: 300000,
        compression: false,
        strategy: 'lru' as const,
      },
    };

    // This would normally be async, but for compatibility we return a placeholder
    // The actual texture will be updated when ready
    const placeholderTexture = new THREE.Texture();

    // Async update the texture
    this.createTextureFromElement(element, domOptions)
      .then((texture) => {
        placeholderTexture.image = texture.image;
        placeholderTexture.needsUpdate = true;
      })
      .catch((error) => {
        console.warn('Failed to create texture from DOM element:', error);
      });

    return placeholderTexture;
  }

  /**
   * Private implementation methods
   */
  private async createTextureFromElement(
    element: HTMLElement,
    config: DOMToTextureOptions
  ): Promise<THREE.Texture> {
    if (!this.canvas || !this.context) {
      throw new Error('Canvas not initialized');
    }

    const qualityConfig = this.qualitySettings();
    const width = config.width || qualityConfig.width;
    const height = config.height || qualityConfig.height;

    // Set canvas size
    this.canvas.width = width * config.pixelRatio;
    this.canvas.height = height * config.pixelRatio;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // Scale context for pixel ratio
    this.context.scale(config.pixelRatio, config.pixelRatio);

    // Clear canvas with background color
    this.context.fillStyle = config.backgroundColor;
    this.context.fillRect(0, 0, width, height);

    // Render element to canvas using foreign object
    await this.renderElementToCanvas(element, width, height);

    // Create THREE.js texture
    const texture = new THREE.CanvasTexture(this.canvas);
    this.applyTextureConfig(texture, qualityConfig);

    return texture;
  }

  private async renderElementToCanvas(
    element: HTMLElement,
    width: number,
    height: number
  ): Promise<void> {
    if (!this.context) return;

    // Use html2canvas-like approach for DOM rendering
    const svgData = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="
            width: ${width}px;
            height: ${height}px;
            transform-origin: 0 0;
          ">
            ${element.outerHTML}
          </div>
        </foreignObject>
      </svg>
    `;

    const img = new Image();
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      img.onload = () => {
        this.context!.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve();
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to render element to canvas'));
      };

      img.src = url;
    });
  }

  private mergeOptions(
    options?: Partial<DOMToTextureOptions>
  ): DOMToTextureOptions {
    return {
      element: options?.element || document.body,
      width: options?.width,
      height: options?.height,
      pixelRatio: options?.pixelRatio || window.devicePixelRatio || 1,
      backgroundColor: options?.backgroundColor || '#ffffff',
      quality: options?.quality || 'medium',
      updateOnResize: options?.updateOnResize ?? false,
      updateOnMutation: options?.updateOnMutation ?? false,
      caching: { ...this.defaultCachingOptions, ...options?.caching },
    };
  }

  private getQualityConfig(
    quality: 'low' | 'medium' | 'high' | 'ultra'
  ): TextureConfig {
    const baseConfig = { ...this.defaultTextureConfig };

    switch (quality) {
      case 'low':
        return { ...baseConfig, width: 256, height: 256, anisotropy: 1 };
      case 'medium':
        return { ...baseConfig, width: 512, height: 512, anisotropy: 2 };
      case 'high':
        return { ...baseConfig, width: 1024, height: 1024, anisotropy: 4 };
      case 'ultra':
        return { ...baseConfig, width: 2048, height: 2048, anisotropy: 8 };
    }
  }

  private applyTextureConfig(
    texture: THREE.Texture,
    config: TextureConfig
  ): void {
    texture.format = config.format;
    texture.type = config.type;
    texture.generateMipmaps = config.generateMipmaps;
    texture.wrapS = config.wrapS;
    texture.wrapT = config.wrapT;
    texture.magFilter = config.magFilter as THREE.MagnificationTextureFilter;
    texture.minFilter = config.minFilter;
    texture.anisotropy = Math.min(
      config.anisotropy,
      this.renderer?.capabilities.getMaxAnisotropy() || 1
    );
    texture.flipY = config.flipY;
    texture.premultiplyAlpha = config.premultiplyAlpha;
    texture.unpackAlignment = config.unpackAlignment;
  }

  private generateCacheKey(
    element: HTMLElement,
    config: DOMToTextureOptions
  ): string {
    const elementId = element.id || element.tagName + '_' + Date.now();
    const configHash = JSON.stringify({
      width: config.width,
      height: config.height,
      pixelRatio: config.pixelRatio,
      backgroundColor: config.backgroundColor,
      quality: config.quality,
    });

    return `${elementId}_${btoa(configHash)}`;
  }

  private parseOptionsFromCacheKey(cacheKey: string): DOMToTextureOptions {
    // This would parse back the config from cache key in a real implementation
    // For now, return default options
    return this.mergeOptions();
  }

  private getFromCache(cacheKey: string): TextureEntry | null {
    const entry = this.textureCache.get(cacheKey);
    if (!entry) return null;

    // Check TTL
    const ttl = this.defaultCachingOptions.ttl;
    if (Date.now() - entry.timestamp > ttl) {
      this.textureCache.delete(cacheKey);
      entry.texture.dispose();
      return null;
    }

    // Update access time and hit count
    const updatedEntry = {
      ...entry,
      hitCount: entry.hitCount + 1,
      lastAccessed: Date.now(),
    };

    this.textureCache.set(cacheKey, updatedEntry);
    return updatedEntry;
  }

  private addToCache(
    cacheKey: string,
    texture: THREE.Texture,
    source: HTMLElement
  ): void {
    const entry: TextureEntry = {
      id: cacheKey,
      texture,
      source: source.tagName + (source.id ? `#${source.id}` : ''),
      timestamp: Date.now(),
      size: this.estimateTextureSize(texture),
      hitCount: 0,
      lastAccessed: Date.now(),
    };

    this.textureCache.set(cacheKey, entry);
    this.enforceMemoryLimits();
    this.updatePipelineState();
    this.cacheUpdate$.next(new Map(this.textureCache));
  }

  private estimateTextureSize(texture: THREE.Texture): number {
    const image = texture.image;
    const width = image?.width || 512;
    const height = image?.height || 512;
    const bytesPerPixel = 4; // RGBA

    return width * height * bytesPerPixel;
  }

  private enforceMemoryLimits(): void {
    const maxBytes = this.defaultCachingOptions.maxSize * 1024 * 1024; // Convert MB to bytes
    let currentBytes = 0;

    // Calculate current memory usage
    this.textureCache.forEach((entry) => {
      currentBytes += entry.size;
    });

    // Remove entries if over limit (LRU strategy)
    if (currentBytes > maxBytes) {
      const entries = Array.from(this.textureCache.entries()).sort(
        ([, a], [, b]) => a.lastAccessed - b.lastAccessed
      );

      while (currentBytes > maxBytes && entries.length > 0) {
        const [key, entry] = entries.shift()!;
        this.textureCache.delete(key);
        entry.texture.dispose();
        currentBytes -= entry.size;
      }
    }
  }

  private setupElementWatching(
    element: HTMLElement,
    cacheKey: string,
    config: DOMToTextureOptions
  ): void {
    if (config.updateOnResize) {
      // Watch for resize events
      fromEvent(window, 'resize')
        .pipe(debounceTime(250), distinctUntilChanged())
        .subscribe(() => {
          this.updateTexture(cacheKey, element);
        });
    }

    if (config.updateOnMutation) {
      // Watch for DOM mutations
      const observer = new MutationObserver(() => {
        this.updateTexture(cacheKey, element);
      });

      observer.observe(element, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true,
        characterData: true,
      });
    }
  }

  private setupPerformanceEffects(): void {
    // React to performance changes
    effect(() => {
      const health = this.performanceOptimizer.performanceHealthScore();

      if (health < 50) {
        this.setQualityLevel('low');
      } else if (health < 70) {
        this.setQualityLevel('medium');
      }
    });
  }

  private setupCleanupTimer(): void {
    // Clean up expired cache entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const ttl = this.defaultCachingOptions.ttl;

      const expiredKeys: string[] = [];
      this.textureCache.forEach((entry, key) => {
        if (now - entry.timestamp > ttl) {
          expiredKeys.push(key);
        }
      });

      expiredKeys.forEach((key) => {
        const entry = this.textureCache.get(key);
        if (entry) {
          entry.texture.dispose();
          this.textureCache.delete(key);
        }
      });

      if (expiredKeys.length > 0) {
        this.updatePipelineState();
      }
    }, 300000); // 5 minutes
  }

  private updateCacheHitRate(isHit: boolean): void {
    if (isHit) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
  }

  private updateGenerationTime(time: number): void {
    this.generationTimes.push(time);

    // Keep only last 100 measurements
    if (this.generationTimes.length > 100) {
      this.generationTimes.shift();
    }
  }

  private updatePipelineState(): void {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;

    const averageGenerationTime =
      this.generationTimes.length > 0
        ? this.generationTimes.reduce((a, b) => a + b, 0) /
          this.generationTimes.length
        : 0;

    const memoryUsage =
      Array.from(this.textureCache.values()).reduce(
        (total, entry) => total + entry.size,
        0
      ) /
      (1024 * 1024); // Convert to MB

    this.pipelineState.set({
      activeTextures: this.textureCache.size,
      cacheSize: memoryUsage,
      cacheHitRate,
      averageGenerationTime,
      memoryUsage,
      qualityLevel: this.currentQualityLevel(),
    });
  }
}
