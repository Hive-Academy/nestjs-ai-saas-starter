import {
  Injectable,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import * as THREE from 'three';

/**
 * Angular Three Foundation Service
 *
 * This service provides the foundation for Angular Three integration.
 * For now, it provides a compatibility layer until full Angular Three is integrated.
 * In the final implementation, this would inject NgtStore from angular-three.
 */
@Injectable({
  providedIn: 'root',
})
export class AngularThreeFoundationService {
  // TODO: Replace with actual NgtStore injection when angular-three is properly installed
  // private readonly ngtStore = inject(NgtStore, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  // Foundation state
  private readonly isInitialized = signal(false);
  private readonly sceneReady = signal(false);

  // Scene management (will be properly typed when angular-three is available)
  private readonly sceneRef = signal<THREE.Scene | null>(null);
  private readonly cameraRef = signal<THREE.Camera | null>(null);
  private readonly rendererRef = signal<THREE.WebGLRenderer | null>(null);

  // Computed properties for Angular Three integration
  readonly scene = computed(() => this.sceneRef());
  readonly camera = computed(() => this.cameraRef());
  readonly renderer = computed(() => this.rendererRef());

  // Performance monitoring
  private readonly frameTime = signal(16);
  readonly performance = computed(() => ({
    fps: 1000 / this.frameTime(),
    isOptimal: this.frameTime() < 20,
  }));

  /**
   * Initialize Angular Three foundation
   */
  async initialize(): Promise<boolean> {
    try {
      // For development: create basic Three.js setup
      // In production: this would wait for Angular Three NgtCanvas
      await this.initializeCompatibilityMode();

      this.setupPerformanceMonitoring();
      this.isInitialized.set(true);

      return true;
    } catch (error) {
      console.error('Failed to initialize Angular Three foundation:', error);
      return false;
    }
  }

  /**
   * Development compatibility mode
   * This will be replaced with proper Angular Three integration
   */
  private async initializeCompatibilityMode(): Promise<void> {
    // Basic Three.js scene setup for compatibility
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.sceneRef.set(scene);
    this.cameraRef.set(camera);
    this.sceneReady.set(true);

    console.warn(
      'Angular Three Foundation running in compatibility mode. Install angular-three for full functionality.'
    );
  }

  // Note: waitForSceneReady method removed as it's not currently used

  /**
   * Create a Three.js group integrated with Angular Three
   */
  createHybridGroup(id: string): THREE.Group {
    const scene = this.scene();
    if (!scene) throw new Error('Scene not ready');

    const group = new THREE.Group();
    group.name = `hybrid-${id}`;
    group.userData = {
      type: 'hybrid-element',
      id,
      createdAt: Date.now(),
    };

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

      this.frameTime.set(delta);
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
   * Set up performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor performance and adjust quality automatically
    let frameCount = 0;
    let totalFrameTime = 0;

    const cleanup = this.addToRenderLoop((delta) => {
      frameCount++;
      totalFrameTime += delta;

      // Calculate average FPS every 60 frames
      if (frameCount >= 60) {
        const avgFrameTime = totalFrameTime / frameCount;
        this.frameTime.set(avgFrameTime);

        frameCount = 0;
        totalFrameTime = 0;
      }
    });

    this.destroyRef.onDestroy(cleanup);
  }

  /**
   * Get current initialization status
   */
  get initialized(): boolean {
    return this.isInitialized();
  }

  /**
   * Get current scene ready status
   */
  get ready(): boolean {
    return this.sceneReady();
  }

  /**
   * Setup renderer with Angular Three integration
   * This will be enhanced when angular-three is properly integrated
   */
  setupRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });

    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.rendererRef.set(renderer);
    return renderer;
  }

  /**
   * Update camera aspect ratio
   */
  updateCameraAspect(width: number, height: number): void {
    const camera = this.camera();
    if (camera && 'aspect' in camera) {
      const perspectiveCamera = camera as THREE.PerspectiveCamera;
      perspectiveCamera.aspect = width / height;
      perspectiveCamera.updateProjectionMatrix();
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    const renderer = this.renderer();
    if (renderer) {
      renderer.dispose();
    }

    const scene = this.scene();
    if (scene) {
      scene.clear();
    }
  }
}
