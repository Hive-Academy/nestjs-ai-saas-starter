/**
 * Angular Three Service - Minimal Utility Service
 *
 * Provides utility functions for Angular Three integration following official patterns.
 * Components should use injectStore() directly, NOT pass store through this service.
 *
 * Official Angular Three Pattern:
 * ```typescript
 * import { injectStore } from 'angular-three';
 *
 * @Component({...})
 * export class MyComponent {
 *   private readonly store = injectStore();
 *
 *   ngOnInit() {
 *     const scene = this.store.get('scene');
 *     const camera = this.store.get('camera');
 *     const gl = this.store.get('gl');
 *   }
 * }
 * ```
 *
 * This service only provides:
 * 1. Renderer configuration helpers
 * 2. Common mesh creation utilities
 * 3. Performance monitoring setup
 *
 * It does NOT:
 * - Store the Angular Three store
 * - Wrap store access
 * - Manage scene state
 */

import { Injectable, signal } from '@angular/core';
import {
  ACESFilmicToneMapping,
  BufferGeometry,
  Material,
  Mesh,
  PCFSoftShadowMap,
  WebGLRenderer,
} from 'three';

@Injectable({
  providedIn: 'root',
})
export class AngularThreeService {
  // Performance monitoring
  private readonly _frameTime = signal(16);
  readonly frameTime = this._frameTime.asReadonly();

  /**
   * Configure WebGL renderer with optimal settings for the application
   * Call this from (created) event handler in your canvas component
   */
  configureRenderer(renderer: WebGLRenderer): void {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
  }

  /**
   * Create an optimized mesh with shadow support
   */
  createOptimizedMesh(
    geometry: BufferGeometry,
    material: Material,
    options: {
      castShadow?: boolean;
      receiveShadow?: boolean;
      renderOrder?: number;
      layers?: number;
    } = {}
  ): Mesh {
    const mesh = new Mesh(geometry, material);

    // Apply options
    mesh.castShadow = options.castShadow ?? true;
    mesh.receiveShadow = options.receiveShadow ?? true;

    if (options.renderOrder !== undefined) {
      mesh.renderOrder = options.renderOrder;
    }

    if (options.layers !== undefined) {
      mesh.layers.set(options.layers);
    }

    return mesh;
  }

  /**
   * Add callback to render loop with performance tracking
   * Returns cleanup function
   */
  addToRenderLoop(callback: (delta: number, time: number) => void): () => void {
    let animationId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      this._frameTime.set(delta);
      callback(delta, time);

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    // Return cleanup function
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }

  /**
   * Get current FPS based on frame time
   */
  getFPS(): number {
    return Math.round(1000 / this._frameTime());
  }
}
