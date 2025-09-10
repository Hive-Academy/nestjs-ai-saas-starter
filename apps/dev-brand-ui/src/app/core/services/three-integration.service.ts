import {
  Injectable,
  NgZone,
  signal,
  computed,
  inject,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import * as THREE from 'three';
import {
  ThreeLifecycleUtil,
  ThreeSceneConfig,
  ThreePerformanceMetrics,
} from '../utils/three-lifecycle.util';
import { InterfaceModeStore } from '../state/interface-mode.store';

export interface SceneInstance {
  id: string;
  container: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  lifecycleUtil: ThreeLifecycleUtil;
  isActive: boolean;
}

/**
 * Three.js Integration Service
 * Manages multiple 3D scenes across different interface modes
 * Optimized for Angular change detection and performance
 */
@Injectable({
  providedIn: 'root',
})
export class ThreeIntegrationService {
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly interfaceModeStore = inject(InterfaceModeStore);

  // Scene management
  private readonly scenes = new Map<string, SceneInstance>();
  private readonly isInitialized = signal(false);
  private readonly activeSceneId = signal<string | null>(null);

  // Performance monitoring
  private readonly performanceMetrics = signal<ThreePerformanceMetrics>({
    frameRate: 60,
    renderTime: 16,
    triangleCount: 0,
    drawCalls: 0,
    memoryUsage: 0,
  });

  // Resize observer
  private resizeObserver: ResizeObserver | null = null;

  // Public reactive state
  readonly initialized = this.isInitialized.asReadonly();
  readonly activeScene = computed(() => {
    const sceneId = this.activeSceneId();
    return sceneId ? this.scenes.get(sceneId) || null : null;
  });
  readonly performance = this.performanceMetrics.asReadonly();
  readonly canRender3D = computed(
    () => this.isInitialized() && this.interfaceModeStore.requires3D()
  );

  constructor() {
    this.initializeService();
    this.setupPerformanceMonitoring();
  }

  /**
   * Create a new 3D scene instance
   */
  createScene(
    sceneId: string,
    container: HTMLElement,
    config?: Partial<ThreeSceneConfig>
  ): SceneInstance | null {
    if (this.scenes.has(sceneId)) {
      console.warn(`Scene ${sceneId} already exists`);
      return this.scenes.get(sceneId)!;
    }

    try {
      const lifecycleUtil = new ThreeLifecycleUtil(this.ngZone);
      const { scene, camera, renderer } = lifecycleUtil.initializeScene(
        container,
        config
      );

      const sceneInstance: SceneInstance = {
        id: sceneId,
        container,
        scene,
        camera,
        renderer,
        lifecycleUtil,
        isActive: false,
      };

      this.scenes.set(sceneId, sceneInstance);
      this.setupResizeObserver(sceneInstance);

      if (!this.isInitialized()) {
        this.isInitialized.set(true);
        this.interfaceModeStore.initializeScene();
      }

      console.log(`3D scene '${sceneId}' created successfully`);
      return sceneInstance;
    } catch (error) {
      console.error(`Failed to create scene ${sceneId}:`, error);
      return null;
    }
  }

  /**
   * Activate a scene (start rendering)
   */
  activateScene(sceneId: string, customRenderFn?: () => void): boolean {
    const sceneInstance = this.scenes.get(sceneId);
    if (!sceneInstance) {
      console.warn(`Scene ${sceneId} not found`);
      return false;
    }

    // Deactivate current active scene
    const currentActiveId = this.activeSceneId();
    if (currentActiveId && currentActiveId !== sceneId) {
      this.deactivateScene(currentActiveId);
    }

    sceneInstance.isActive = true;
    sceneInstance.lifecycleUtil.startRenderLoop(customRenderFn);
    this.activeSceneId.set(sceneId);

    console.log(`3D scene '${sceneId}' activated`);
    return true;
  }

  /**
   * Deactivate a scene (stop rendering)
   */
  deactivateScene(sceneId: string): boolean {
    const sceneInstance = this.scenes.get(sceneId);
    if (!sceneInstance) {
      console.warn(`Scene ${sceneId} not found`);
      return false;
    }

    sceneInstance.isActive = false;
    sceneInstance.lifecycleUtil.stopRenderLoop();

    if (this.activeSceneId() === sceneId) {
      this.activeSceneId.set(null);
    }

    console.log(`3D scene '${sceneId}' deactivated`);
    return true;
  }

  /**
   * Get scene instance
   */
  getScene(sceneId: string): SceneInstance | null {
    return this.scenes.get(sceneId) || null;
  }

  /**
   * Remove and dispose scene
   */
  removeScene(sceneId: string): boolean {
    const sceneInstance = this.scenes.get(sceneId);
    if (!sceneInstance) {
      console.warn(`Scene ${sceneId} not found`);
      return false;
    }

    this.deactivateScene(sceneId);
    sceneInstance.lifecycleUtil.dispose();
    this.scenes.delete(sceneId);

    if (this.scenes.size === 0) {
      this.isInitialized.set(false);
      this.interfaceModeStore.cleanupScene();
    }

    console.log(`3D scene '${sceneId}' removed`);
    return true;
  }

  /**
   * Get all scene instances
   */
  getAllScenes(): SceneInstance[] {
    return Array.from(this.scenes.values());
  }

  /**
   * Check if scene exists
   */
  hasScene(sceneId: string): boolean {
    return this.scenes.has(sceneId);
  }

  /**
   * Add object to scene
   */
  addToScene(sceneId: string, object: THREE.Object3D): boolean {
    const sceneInstance = this.scenes.get(sceneId);
    if (!sceneInstance) {
      console.warn(`Scene ${sceneId} not found`);
      return false;
    }

    sceneInstance.scene.add(object);
    return true;
  }

  /**
   * Remove object from scene
   */
  removeFromScene(sceneId: string, object: THREE.Object3D): boolean {
    const sceneInstance = this.scenes.get(sceneId);
    if (!sceneInstance) {
      console.warn(`Scene ${sceneId} not found`);
      return false;
    }

    sceneInstance.scene.remove(object);
    return true;
  }

  /**
   * Cleanup all scenes
   */
  cleanup(): void {
    Array.from(this.scenes.keys()).forEach((sceneId) => {
      this.removeScene(sceneId);
    });

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  /**
   * Initialize service
   */
  private initializeService(): void {
    // Auto-cleanup on destroy
    this.destroyRef.onDestroy(() => {
      this.cleanup();
    });

    // Monitor interface mode changes
    toObservable(this.interfaceModeStore.currentMode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((mode) => {
        this.handleModeChange(mode);
      });
  }

  /**
   * Handle interface mode changes
   */
  private handleModeChange(mode: string): void {
    // Deactivate scenes that don't match current mode
    this.scenes.forEach((sceneInstance, sceneId) => {
      if (sceneInstance.isActive && !sceneId.includes(mode)) {
        this.deactivateScene(sceneId);
      }
    });
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Update performance metrics periodically
    setInterval(() => {
      const activeScene = this.activeScene();
      if (activeScene) {
        const metrics = activeScene.lifecycleUtil.getPerformanceMetrics();
        this.performanceMetrics.set(metrics);

        // Update interface mode store with performance data
        this.interfaceModeStore.updatePerformance(
          metrics.frameRate,
          metrics.memoryUsage / 1024 // Convert to MB
        );
      }
    }, 1000); // Update every second
  }

  /**
   * Setup resize observer for a scene
   */
  private setupResizeObserver(sceneInstance: SceneInstance): void {
    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const container = entry.target as HTMLElement;
          const scene = this.findSceneByContainer(container);
          if (scene) {
            scene.lifecycleUtil.handleResize(container);
          }
        });
      });
    }

    this.resizeObserver.observe(sceneInstance.container);
  }

  /**
   * Find scene by container element
   */
  private findSceneByContainer(container: HTMLElement): SceneInstance | null {
    for (const scene of this.scenes.values()) {
      if (scene.container === container) {
        return scene;
      }
    }
    return null;
  }
}
