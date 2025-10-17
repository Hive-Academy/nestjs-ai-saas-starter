import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import * as THREE from 'three';

// Strict interface definitions following Angular best practices
// Interface removed as it was not being used

interface CanvasCreatedEvent {
  readonly scene: THREE.Scene;
  readonly camera: THREE.Camera;
  readonly gl: THREE.WebGLRenderer;
}

interface HybridGroupConfig {
  readonly name: string;
  readonly userData: Record<string, string | number | boolean>;
}

/**
 * Angular Three Foundation Service
 *
 * This service provides the foundation for Angular Three integration.
 * Now properly integrated with Angular Three's NgtStore for state management.
 */
@Injectable({
  providedIn: 'root',
})
export class AngularThreeFoundationService {
  // Angular Three store integration - get dynamically when needed
  private ngtStore: any = null;
  private readonly destroyRef = inject(DestroyRef);

  // Foundation state - now managed by Angular Three with strict typing
  private readonly _isInitialized = signal(false);
  private readonly _canvasReady = signal(false);

  // Readonly accessors for state
  readonly isInitialized = this._isInitialized.asReadonly();
  readonly canvasReady = this._canvasReady.asReadonly();

  // Angular Three computed properties for reactive access with strict typing
  readonly scene = computed((): THREE.Scene | null => {
    const store = this.getStore();
    if (!store) return null;

    // Angular Three stores are signal-based, access via get() or direct property call
    try {
      // Try as function first (signal pattern)
      if (typeof store.scene === 'function') {
        const sceneValue = store.scene();
        console.log(
          '[AngularThreeFoundation] Scene accessed via function call:',
          !!sceneValue
        );
        return sceneValue;
      }
      // Try get() method
      if (typeof store.get === 'function') {
        const state = store.get();
        console.log(
          '[AngularThreeFoundation] Scene accessed via get():',
          !!state?.scene
        );
        return state?.scene || null;
      }
      // Try direct property access as fallback
      if (store.scene) {
        console.log(
          '[AngularThreeFoundation] Scene accessed via direct property'
        );
        return store.scene;
      }
    } catch (error) {
      console.error('[AngularThreeFoundation] Error accessing scene:', error);
    }
    return null;
  });
  readonly camera = computed((): THREE.Camera | null => {
    const store = this.getStore();
    if (!store) return null;

    try {
      if (typeof store.camera === 'function') {
        const cameraValue = store.camera();
        console.log(
          '[AngularThreeFoundation] Camera accessed via function call:',
          !!cameraValue
        );
        return cameraValue;
      }
      if (typeof store.get === 'function') {
        const state = store.get();
        console.log(
          '[AngularThreeFoundation] Camera accessed via get():',
          !!state?.camera
        );
        return state?.camera || null;
      }
      if (store.camera) {
        console.log(
          '[AngularThreeFoundation] Camera accessed via direct property'
        );
        return store.camera;
      }
    } catch (error) {
      console.error('[AngularThreeFoundation] Error accessing camera:', error);
    }
    return null;
  });
  readonly renderer = computed((): THREE.WebGLRenderer | null => {
    const store = this.getStore();
    if (!store) return null;

    try {
      // Angular Three uses 'gl' for renderer
      if (typeof store.gl === 'function') {
        const glValue = store.gl();
        console.log(
          '[AngularThreeFoundation] Renderer accessed via function call:',
          !!glValue
        );
        return glValue;
      }
      if (typeof store.get === 'function') {
        const state = store.get();
        console.log(
          '[AngularThreeFoundation] Renderer accessed via get():',
          !!state?.gl
        );
        return state?.gl || null;
      }
      if (store.gl) {
        console.log(
          '[AngularThreeFoundation] Renderer accessed via direct property'
        );
        return store.gl;
      }
    } catch (error) {
      console.error(
        '[AngularThreeFoundation] Error accessing renderer:',
        error
      );
    }
    return null;
  });

  // Performance monitoring with strict typing
  private readonly _frameTime = signal(16);

  readonly performance = computed(() => ({
    fps: 1000 / this._frameTime(),
    isOptimal: this._frameTime() < 20,
    memoryUsage: 0, // Will be updated by performance monitoring
  }));

  // Computed derived state
  readonly ready = computed(() =>
    Boolean(
      this.scene() && this.camera() && this.renderer() && this._isInitialized()
    )
  );

  readonly aspectRatio = computed(() => {
    const store = this.getStore();
    if (!store) return 1;

    try {
      let size = null;
      if (typeof store.size === 'function') {
        size = store.size();
        console.log(
          '[AngularThreeFoundation] Size accessed via function call:',
          !!size
        );
      } else if (typeof store.get === 'function') {
        const state = store.get();
        size = state?.size;
        console.log(
          '[AngularThreeFoundation] Size accessed via get():',
          !!size
        );
      } else if (store.size) {
        size = store.size;
        console.log(
          '[AngularThreeFoundation] Size accessed via direct property'
        );
      }
      return size ? size.width / size.height : 1;
    } catch (error) {
      console.error('[AngularThreeFoundation] Error accessing size:', error);
      return 1;
    }
  });

  /**
   * Get Angular Three store
   * Returns the stored reference set via setStore()
   */
  private getStore(): any {
    return this.ngtStore;
  }

  /**
   * Set the store reference from a component that has access to it
   * This should be called from the HybridSceneComponent when the canvas is created
   */
  setStore(store: any): void {
    this.ngtStore = store;
  }

  /**
   * Initialize Angular Three foundation
   * Now properly integrates with Angular Three NgtCanvas
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if store is already set via setStore() from HybridSceneComponent
      if (!this.ngtStore) {
        console.warn(
          'Angular Three store not set. Call setStore() from HybridSceneComponent first.'
        );
        return false;
      }

      const scene = this.scene();
      const renderer = this.renderer();

      if (scene && renderer) {
        this.setupPerformanceMonitoring();
        this._isInitialized.set(true);
        console.log('Angular Three Foundation initialized successfully');
        return true;
      }

      console.warn('Scene or renderer not available yet');
      return false;
    } catch (error) {
      console.error('Failed to initialize Angular Three foundation:', error);
      return false;
    }
  }

  /**
   * Handle canvas creation event from Angular Three
   */
  handleCanvasCreated(event: CanvasCreatedEvent): void {
    // Validate event structure with strict typing
    if (!event.scene || !event.camera || !event.gl) {
      throw new Error(
        'Invalid canvas creation event: missing required properties'
      );
    }

    this._canvasReady.set(true);

    // Setup renderer with Angular Three integration
    const renderer = event.gl;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;

    // Initialize foundation
    this.initialize();
  }

  // Note: waitForSceneReady method removed as it's not currently used

  /**
   * Create a Three.js group integrated with Angular Three
   */
  createHybridGroup(config: HybridGroupConfig): THREE.Group {
    if (!this.ready()) {
      throw new Error('Angular Three not initialized');
    }

    const scene = this.scene();
    if (!scene) {
      throw new Error('Scene not available');
    }

    const group = new THREE.Group();
    group.name = config.name;
    group.userData = { ...config.userData };

    scene.add(group);
    return group;
  }

  /**
   * Add performance-optimized mesh to Angular Three scene
   */
  createOptimizedMesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    options: {
      enableLOD?: boolean;
      renderOrder?: number;
      layers?: number;
    } = {}
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);

    // Apply Angular Three optimizations
    if (options.renderOrder !== undefined) {
      mesh.renderOrder = options.renderOrder;
    }

    if (options.layers !== undefined) {
      mesh.layers.set(options.layers);
    }

    // Enable shadows if renderer supports it
    const renderer = this.renderer();
    if (renderer?.shadowMap?.enabled) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }

    return mesh;
  }

  /**
   * Integrate with render loop
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
   * Set up performance monitoring with Angular Three integration
   */
  private setupPerformanceMonitoring(): void {
    // Monitor performance and adjust quality automatically
    let frameCount = 0;
    let totalFrameTime = 0;

    const cleanup = this.addToRenderLoop((delta: number) => {
      frameCount++;
      totalFrameTime += delta;

      // Calculate average FPS every 60 frames
      if (frameCount >= 60) {
        const avgFrameTime = totalFrameTime / frameCount;
        this._frameTime.set(avgFrameTime);

        frameCount = 0;
        totalFrameTime = 0;
      }
    });

    this.destroyRef.onDestroy(cleanup);
  }

  /**
   * Legacy getter methods for backward compatibility
   * These will be deprecated in favor of signal-based access
   */
  get initialized(): boolean {
    return this._isInitialized();
  }

  /**
   * Get renderer from Angular Three store
   * Uses Angular Three's reactive state management
   */
  getRenderer(): THREE.WebGLRenderer | null {
    return this.renderer();
  }

  /**
   * Update camera aspect ratio
   * Angular Three handles this automatically, but method kept for compatibility
   */
  updateCameraAspect(width: number, height: number): void {
    // Angular Three automatically handles camera aspect ratio updates
    // This method is maintained for backward compatibility
    const camera = this.camera();
    if (camera && 'aspect' in camera) {
      (camera as THREE.PerspectiveCamera).aspect = width / height;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
  }

  /**
   * Cleanup resources
   * Angular Three handles most cleanup automatically
   */
  cleanup(): void {
    // Reset internal signals
    this._isInitialized.set(false);
    this._canvasReady.set(false);
    this._frameTime.set(16);

    console.log('Angular Three Foundation cleanup completed');
  }
}
