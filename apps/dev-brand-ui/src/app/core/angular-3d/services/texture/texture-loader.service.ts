/**
 * TextureLoaderService - Handles async texture loading with RxJS
 *
 * Responsibilities:
 * - Coordinate texture loading operations
 * - Provide observables for loading state
 * - Integrate cache, factory, and renderer
 * - Emit loading progress
 */

import { Injectable, inject } from '@angular/core';
import { Observable, from, of, lastValueFrom } from 'rxjs';
import { map, catchError, tap, shareReplay } from 'rxjs/operators';
import * as THREE from 'three';

import { TextureFactoryService, QualityLevel } from './texture-factory.service';
import { TextureCacheService } from './texture-cache.service';
import {
  DOMTextureRendererService,
  DOMRenderOptions,
} from './dom-texture-renderer.service';

export interface TextureLoadRequest {
  element: HTMLElement;
  cacheKey: string;
  quality: QualityLevel;
  options?: DOMRenderOptions;
}

export interface TextureLoadResult {
  texture: THREE.Texture;
  cacheKey: string;
  fromCache: boolean;
  loadTimeMs: number;
}

@Injectable({
  providedIn: 'root',
})
export class TextureLoaderService {
  private readonly factory = inject(TextureFactoryService);
  private readonly cache = inject(TextureCacheService);
  private readonly renderer = inject(DOMTextureRendererService);

  // Track ongoing load requests
  private readonly loadingRequests = new Map<
    string,
    Observable<TextureLoadResult>
  >();

  /**
   * Load texture with caching and observable pattern
   */
  loadTexture(request: TextureLoadRequest): Observable<TextureLoadResult> {
    const { element, cacheKey, quality, options } = request;

    // Check if already loading
    const existingRequest = this.loadingRequests.get(cacheKey);
    if (existingRequest) {
      return existingRequest;
    }

    // Check cache first
    const cachedTexture = this.cache.get(cacheKey);
    if (cachedTexture) {
      return of({
        texture: cachedTexture,
        cacheKey,
        fromCache: true,
        loadTimeMs: 0,
      });
    }

    // Create new loading observable
    const startTime = performance.now();

    const loading$ = from(
      this.renderer.renderToTexture(element, {
        ...options,
        quality,
      })
    ).pipe(
      map((texture) => {
        const loadTimeMs = performance.now() - startTime;

        // Apply quality config
        const qualityConfig = this.factory.getQualityConfig(quality);
        this.factory.applyTextureConfig(texture, qualityConfig);

        // Cache the result
        this.cache.set(cacheKey, texture, element.tagName);

        return {
          texture,
          cacheKey,
          fromCache: false,
          loadTimeMs,
        };
      }),
      tap(() => {
        // Remove from loading requests when complete
        this.loadingRequests.delete(cacheKey);
      }),
      catchError((error) => {
        console.error(`Failed to load texture for ${cacheKey}:`, error);
        this.loadingRequests.delete(cacheKey);

        // Return placeholder on error
        const placeholder = this.factory.createPlaceholderTexture(
          256,
          256,
          '#ff0000'
        );
        return of({
          texture: placeholder,
          cacheKey,
          fromCache: false,
          loadTimeMs: 0,
        });
      }),
      shareReplay(1) // Share result with multiple subscribers
    );

    // Store the request
    this.loadingRequests.set(cacheKey, loading$);

    return loading$;
  }

  /**
   * Create an immediate placeholder that will be replaced
   */
  createPlaceholderWithAsyncLoad(
    element: HTMLElement,
    cacheKey: string,
    quality: QualityLevel
  ): {
    placeholder: THREE.Texture;
    loading$: Observable<THREE.Texture>;
  } {
    // Create immediate placeholder
    const placeholder = this.factory.createPlaceholderTexture();

    // Start async loading
    const loading$ = this.loadTexture({
      element,
      cacheKey,
      quality,
    }).pipe(map((result) => result.texture));

    return { placeholder, loading$ };
  }

  /**
   * Generate cache key for element
   */
  generateCacheKey(
    element: HTMLElement,
    options: DOMRenderOptions = {}
  ): string {
    const elementId = element.id || element.tagName;
    const timestamp = Date.now();
    const optionsHash = JSON.stringify(options);

    return `${elementId}_${timestamp}_${btoa(optionsHash).substring(0, 16)}`;
  }

  /**
   * Preload textures for multiple elements
   */
  preloadTextures(
    requests: TextureLoadRequest[]
  ): Observable<TextureLoadResult[]> {
    const loads = requests.map((request) => this.loadTexture(request));

    return from(Promise.all(loads.map((obs) => lastValueFrom(obs))));
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics() {
    return this.cache.statistics;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.loadingRequests.clear();
  }
}
