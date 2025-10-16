/**
 * HybridSceneComponent - Phase 2 Unified Modern Implementation
 *
 * Consolidates the best of v1 and v2 implementations into a single, modern Angular Three component.
 * Follows Angular 20.1.6 best practices with signals, inject() function, and reactive patterns.
 *
 * Key Features:
 * - Pure Angular Three integration with NgtCanvas
 * - Signal-based reactive configuration
 * - Complete API compatibility with v1 methods
 * - Automatic resource management
 * - Performance monitoring integration
 * - GSAP animation support
 * - Modern TypeScript strict mode compliance
 */

import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  effect,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  DestroyRef,
  ElementRef,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { fromEvent, debounceTime } from 'rxjs';
import * as THREE from 'three';
import { NgtCanvas, injectStore } from 'angular-three';

import { AngularThreeFoundationService } from '../services/angular-three-foundation.service';
import { HybridUIService } from '../services/hybrid-ui.service';
import { AnimationService } from '../services/animation.service';
import { Angular3DStateStore } from '../services/angular-3d-state.store';
import { HybridThreeSceneComponent } from './hybrid-three-scene.component';
import type { HybridUIServiceConfig } from '../interfaces';

// Modern interface definitions with strict typing
interface HybridSceneConfig extends HybridUIServiceConfig {
  readonly shadows: boolean;
  readonly antialias: boolean;
  readonly alpha: boolean;
  readonly powerPreference: 'default' | 'high-performance' | 'low-power';
  readonly enableAnimation: boolean;
  readonly performanceTarget: 'mobile' | 'desktop' | 'high-end';
}

interface PerformanceMetrics {
  readonly fps: number;
  readonly memoryUsage: number;
  readonly renderTime: number;
  readonly isOptimal: boolean;
  readonly activeAnimations: number;
}

/**
 * Unified Modern HybridSceneComponent - Phase 2 Enhanced
 *
 * The single, authoritative scene component that replaces both v1 and v2.
 * Uses Angular Three best practices with complete backward compatibility.
 */
@Component({
  selector: 'app-hybrid-scene',
  standalone: true,
  imports: [CommonModule, NgtCanvas],
  template: `
    <div class="hybrid-scene-container" #container>
      <!-- Phase 2: Pure Angular Three Canvas Integration -->
      <ngt-canvas
        [sceneGraph]="sceneComponent"
        [gl]="glConfig()"
        [shadows]="shadowConfig()"
        [performance]="performanceConfig()"
        [dpr]="dprConfig()"
        [frameloop]="frameloopConfig()"
        (created)="onCanvasCreated($event)"
        class="hybrid-scene-canvas"
        [class.initialized]="initialized()"
        [class.performance-optimal]="performanceOptimal()"
        [class.animation-enabled]="animationEnabled()"
      >
        <!-- Angular Three handles all 3D rendering -->
      </ngt-canvas>

      <!-- Enhanced Performance Overlay - Phase 2 -->
      @if (showPerformanceOverlay()) {
      <div class="performance-overlay" [class.detailed]="detailedMetrics()">
        <div class="performance-header">
          <h4>Performance Monitor</h4>
          <button
            class="toggle-detail"
            (click)="toggleDetailedMetrics()"
            [attr.aria-label]="
              detailedMetrics() ? 'Show less details' : 'Show more details'
            "
          >
            {{ detailedMetrics() ? '−' : '+' }}
          </button>
        </div>

        <div class="performance-stats">
          <!-- Core metrics -->
          <div class="stat primary">
            <span class="label">FPS:</span>
            <span class="value" [class.warning]="performanceMetrics().fps < 30">
              {{ performanceMetrics().fps }}
            </span>
          </div>

          <div class="stat primary">
            <span class="label">Memory:</span>
            <span class="value">{{ memoryUsageMB() }}MB</span>
          </div>

          <!-- Detailed metrics when expanded -->
          @if (detailedMetrics()) {
          <div class="detailed-stats">
            <div class="stat">
              <span class="label">Render Time:</span>
              <span class="value"
                >{{ performanceMetrics().renderTime.toFixed(2) }}ms</span
              >
            </div>

            <div class="stat">
              <span class="label">Elements:</span>
              <span class="value">{{ hybridService.elementCount() }}</span>
            </div>

            <div class="stat">
              <span class="label">Visible:</span>
              <span class="value">{{
                hybridService.visibleElementCount()
              }}</span>
            </div>

            <div class="stat">
              <span class="label">Animations:</span>
              <span class="value">{{
                performanceMetrics().activeAnimations
              }}</span>
            </div>

            <div class="stat status">
              <span class="label">Status:</span>
              <span class="value" [class]="'status-' + performanceStatus()">
                {{ performanceStatus() }}
              </span>
            </div>
          </div>
          }
        </div>
      </div>
      }

      <!-- Loading Overlay with Progress -->
      @if (!initialized()) {
      <div class="loading-overlay">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <div class="loading-text">{{ loadingMessage() }}</div>
          <div class="loading-progress">
            <div class="progress-bar" [style.width.%]="loadingProgress()"></div>
          </div>
        </div>
      </div>
      }

      <!-- Content projection for DOM elements -->
      <div
        class="hybrid-content"
        [style.opacity]="contentVisible() ? 1 : 0"
        [style.pointer-events]="contentInteractive() ? 'auto' : 'none'"
        #contentContainer
      >
        <ng-content></ng-content>
      </div>

      <!-- Animation Debug Panel (Development only) -->
      @if (showAnimationDebug() && !isProduction()) {
      <div class="animation-debug-panel">
        <h5>Animation Debug</h5>
        <div class="debug-stats">
          <div>
            Active Timelines: {{ animationService.activeAnimationCount() }}
          </div>
          <div>
            Performance:
            {{ animationService.animationPerformanceStatus().status }}
          </div>
        </div>
      </div>
      }
    </div>
  `,
  styleUrls: ['./hybrid-scene.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HybridSceneComponent implements OnInit, OnDestroy {
  // ViewChild references for advanced DOM integration
  private readonly container =
    viewChild<ElementRef<HTMLDivElement>>('container');

  // Input signals with comprehensive configuration options
  readonly sceneId = input<string>();
  readonly config = input<Partial<HybridSceneConfig>>({});
  readonly enablePerformanceOverlay = input(false);
  readonly autoResize = input(true);
  readonly contentVisible = input(true);
  readonly contentInteractive = input(true);
  readonly backgroundColor = input<string>('transparent');
  readonly cameraPosition = input<readonly [number, number, number]>([
    0, 0, 5,
  ] as const);
  readonly cameraTarget = input<readonly [number, number, number]>([
    0, 0, 0,
  ] as const);
  readonly enableShadows = input(true);
  readonly antialias = input(true);
  readonly alpha = input(true);
  readonly powerPreference = input<
    'default' | 'high-performance' | 'low-power'
  >('high-performance');
  readonly enableAnimation = input(true);
  readonly performanceTarget = input<'mobile' | 'desktop' | 'high-end'>(
    'desktop'
  );
  readonly showAnimationDebug = input(false);

  // Output events for component integration
  readonly sceneInitialized = output<THREE.Scene>();
  readonly performanceUpdate = output<PerformanceMetrics>();
  readonly elementAdded = output<{
    elementId: string;
    object: THREE.Object3D;
  }>();
  readonly elementRemoved = output<{
    elementId: string;
    object: THREE.Object3D;
  }>();
  readonly animationEvent = output<{ type: string; data: any }>();

  // Dependency injection with modern Angular patterns
  private readonly angularThreeFoundation = inject(
    AngularThreeFoundationService
  );
  readonly hybridService = inject(HybridUIService);
  readonly animationService = inject(AnimationService);
  readonly stateStore = inject(Angular3DStateStore);
  private readonly ngtStore = injectStore({ optional: true });
  private readonly destroyRef = inject(DestroyRef);

  // Internal state management with signals
  private readonly _initialized = signal(false);
  private readonly _loadingProgress = signal(0);
  private readonly _loadingMessage = signal('Initializing 3D Scene...');
  private readonly _detailedMetrics = signal(false);
  private readonly _performanceMetrics = signal<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    renderTime: 0,
    isOptimal: true,
    activeAnimations: 0,
  });

  // Angular Three scene component integration
  readonly sceneComponent = HybridThreeSceneComponent;

  // Computed properties for reactive configuration
  readonly initialized = computed(() => this._initialized());
  readonly loadingProgress = computed(() => this._loadingProgress());
  readonly loadingMessage = computed(() => this._loadingMessage());
  readonly detailedMetrics = computed(() => this._detailedMetrics());
  readonly performanceMetrics = computed(() => this._performanceMetrics());

  readonly showPerformanceOverlay = computed(() =>
    this.enablePerformanceOverlay()
  );
  readonly performanceOptimal = computed(
    () => this.performanceMetrics().isOptimal
  );
  readonly animationEnabled = computed(() => this.enableAnimation());
  readonly memoryUsageMB = computed(() =>
    Math.round(this.performanceMetrics().memoryUsage / (1024 * 1024))
  );

  readonly performanceStatus = computed(() => {
    const metrics = this.performanceMetrics();
    if (metrics.fps >= 55 && metrics.renderTime < 16) return 'optimal';
    if (metrics.fps >= 30 && metrics.renderTime < 25) return 'good';
    return 'poor';
  });

  // Angular Three configuration computed properties
  readonly glConfig = computed(() => {
    const target = this.performanceTarget();
    const baseConfig = {
      antialias: this.antialias(),
      alpha: this.alpha(),
      powerPreference: this.powerPreference(),
      precision: 'highp' as const,
    };

    // Adjust based on performance target
    switch (target) {
      case 'mobile':
        return {
          ...baseConfig,
          antialias: false,
          precision: 'mediump' as const,
        };
      case 'high-end':
        return { ...baseConfig, logarithmicDepthBuffer: true };
      default:
        return baseConfig;
    }
  });

  readonly shadowConfig = computed(() => {
    if (!this.enableShadows()) return false;
    const target = this.performanceTarget();
    return target === 'high-end' ? 'soft' : 'basic';
  });

  readonly performanceConfig = computed(() => {
    const target = this.performanceTarget();
    const configs = {
      mobile: { min: 0.2, max: 1, debounce: 300 },
      desktop: { min: 0.5, max: 1, debounce: 200 },
      'high-end': { min: 0.8, max: 1, debounce: 100 },
    };
    return configs[target];
  });

  readonly dprConfig = computed(() => {
    const target = this.performanceTarget();
    switch (target) {
      case 'mobile':
        return [1, 1.5] as [number, number];
      case 'high-end':
        return [1, 3] as [number, number];
      default:
        return [1, 2] as [number, number];
    }
  });

  readonly frameloopConfig = computed(() => 'always' as const);

  // Private state
  private performanceMonitorId?: number;
  private resizeObserver?: ResizeObserver;

  // Setup reactive effects in constructor context
  constructor() {
    this.setupReactiveEffects();
    this.initializeStateStore();
  }

  async ngOnInit(): Promise<void> {
    this._loadingMessage.set('Loading Angular Three...');
    this._loadingProgress.set(25);

    // Apply hybrid service configuration
    const serviceConfig = this.config();
    if (serviceConfig && Object.keys(serviceConfig).length > 0) {
      await this.hybridService.updateConfig(serviceConfig);
      this._loadingProgress.set(50);
    }

    this._loadingProgress.set(75);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  // Public API methods for backward compatibility with v1

  /**
   * Get the current Three.js scene instance
   */
  getScene(): THREE.Scene | null {
    return this.angularThreeFoundation.scene();
  }

  /**
   * Get the current Three.js camera instance
   */
  getCamera(): THREE.Camera | null {
    return this.angularThreeFoundation.camera();
  }

  /**
   * Get the current Three.js renderer instance
   */
  getRenderer(): THREE.WebGLRenderer | null {
    return this.angularThreeFoundation.getRenderer();
  }

  /**
   * Add object to the scene with automatic tracking
   */
  addToScene(object: THREE.Object3D, elementId?: string): void {
    const scene = this.getScene();
    if (scene) {
      scene.add(object);
      const id = elementId || `object-${Date.now()}`;
      this.elementAdded.emit({ elementId: id, object });
    }
  }

  /**
   * Remove object from the scene with automatic cleanup
   */
  removeFromScene(object: THREE.Object3D, elementId?: string): void {
    const scene = this.getScene();
    if (scene) {
      scene.remove(object);
      const id = elementId || `object-${Date.now()}`;
      this.elementRemoved.emit({ elementId: id, object });
    }
  }

  /**
   * Update camera position with smooth animation option
   */
  updateCameraPosition(
    position: readonly [number, number, number],
    animate = false,
    duration = 1000
  ): void {
    const camera = this.getCamera();
    if (!camera) return;

    if (animate && this.enableAnimation()) {
      // Use GSAP for smooth camera movement
      const timelineId = this.animationService.createTimeline({
        name: 'Camera Position Animation',
        animations: [
          {
            type: 'slide',
            duration,
            ease: 'power2.inOut',
          },
        ],
        targets: [
          {
            elementId: 'camera',
            object3D: camera,
            position,
          },
        ],
      });
      this.animationService.playTimeline(timelineId);
    } else {
      camera.position.set(position[0], position[1], position[2]);
    }
  }

  /**
   * Update camera target with smooth animation option
   */
  updateCameraTarget(
    target: readonly [number, number, number],
    animate = false,
    duration = 1000
  ): void {
    const camera = this.getCamera();
    if (!camera) return;

    const targetVector = new THREE.Vector3(...target);

    if (animate && this.enableAnimation()) {
      // Create smooth look-at animation
      const currentTarget = new THREE.Vector3();
      camera.getWorldDirection(currentTarget);
      currentTarget.multiplyScalar(-1).add(camera.position);

      const timelineId = this.animationService.createTimeline({
        name: 'Camera Target Animation',
        animations: [
          {
            type: 'slide',
            duration,
            ease: 'power2.inOut',
          },
        ],
        targets: [
          {
            elementId: 'camera-target',
            position: target,
          },
        ],
      });
      this.animationService.playTimeline(timelineId);
    } else {
      camera.lookAt(targetVector);
    }
  }

  /**
   * Take a high-quality screenshot of the scene
   */
  takeScreenshot(
    format: 'png' | 'jpeg' = 'png',
    quality = 0.92
  ): string | null {
    const renderer = this.getRenderer();
    if (!renderer?.domElement) return null;

    // Force a render before screenshot
    const scene = this.getScene();
    const camera = this.getCamera();
    if (scene && camera) {
      renderer.render(scene, camera);
    }

    return renderer.domElement.toDataURL(
      format === 'png' ? 'image/png' : 'image/jpeg',
      quality
    );
  }

  /**
   * Reset camera to default position and target
   */
  resetCamera(animate = true): void {
    const defaultPos = this.cameraPosition();
    const defaultTarget = this.cameraTarget();

    if (animate) {
      this.updateCameraPosition(defaultPos, true, 1500);
      setTimeout(() => {
        this.updateCameraTarget(defaultTarget, true, 1000);
      }, 200);
    } else {
      this.updateCameraPosition(defaultPos);
      this.updateCameraTarget(defaultTarget);
    }
  }

  /**
   * Toggle performance overlay visibility
   */
  togglePerformanceOverlay(): void {
    // This would require a signal update in parent component
    console.log('Performance overlay toggle requested');
  }

  /**
   * Toggle detailed metrics view
   */
  toggleDetailedMetrics(): void {
    this._detailedMetrics.update((current) => !current);
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics & {
    hybridService: any;
    angularThree: any;
    animation: any;
  } {
    return {
      ...this.performanceMetrics(),
      hybridService: this.hybridService.performance(),
      angularThree: {
        scene: !!this.getScene(),
        camera: !!this.getCamera(),
        renderer: !!this.getRenderer(),
        store: !!this.ngtStore,
      },
      animation: {
        active: this.animationService.activeAnimationCount(),
        performance: this.animationService.animationPerformanceStatus(),
      },
    };
  }

  /**
   * Check if running in production mode
   */
  protected isProduction(): boolean {
    return !this.showAnimationDebug(); // Simplified for demo
  }

  // Event handlers

  /**
   * Handle Angular Three canvas creation
   */
  async onCanvasCreated(event: any): Promise<void> {
    try {
      this._loadingMessage.set('Initializing foundation services...');
      this._loadingProgress.set(90);

      // The Angular Three created event IS the store
      // It contains scene, camera, gl, and other properties directly
      if (event) {
        this.angularThreeFoundation.setStore(event);
      } else {
        console.error('No event received from Angular Three canvas creation');
      }

      // Initialize foundation service
      const initialized = await this.angularThreeFoundation.initialize();

      if (initialized) {
        this.setupPerformanceMonitoring();
        this.setupEventListeners();

        this._loadingProgress.set(100);
        this._initialized.set(true);

        const scene = this.getScene();
        if (scene) {
          this.sceneInitialized.emit(scene);
        }

        console.log('Unified Hybrid Scene initialized successfully');
      } else {
        throw new Error('Failed to initialize Angular Three foundation');
      }
    } catch (error) {
      console.error('Failed to initialize unified hybrid scene:', error);
      this._loadingMessage.set('Initialization failed');
    }
  }

  // Private methods

  private setupReactiveEffects(): void {
    // React to configuration changes
    effect(() => {
      const config = this.config();
      if (config && this.initialized()) {
        this.hybridService.updateConfig(config);
      }
    });

    // React to animation state changes
    effect(() => {
      if (this.animationService.isAnimating()) {
        this.animationEvent.emit({
          type: 'animation-state-changed',
          data: { isAnimating: true },
        });
      }
    });

    // Monitor performance metrics
    effect(() => {
      const metrics = this.performanceMetrics();
      this.performanceUpdate.emit(metrics);
    });
  }

  private initializeStateStore(): void {
    // Create scene in state store
    const sceneId = this.sceneId() || 'default-scene';
    this.stateStore.createScene(sceneId, `Scene ${sceneId}`, {
      backgroundColor:
        parseInt(
          this.backgroundColor()?.replace('#', '0x') || '0x000000',
          16
        ) || 0x000000,
      isActive: true,
    });

    // Set as active scene
    this.stateStore.setActiveScene(sceneId);

    // Sync performance metrics with state store
    effect(() => {
      const metrics = this.performanceMetrics();
      this.stateStore.updatePerformance({
        fps: metrics.fps,
        frameTime: metrics.renderTime,
        memoryUsage: metrics.memoryUsage,
      });
    });

    // Sync camera state with state store
    effect(() => {
      if (this.ngtStore) {
        const camera = this.ngtStore.get('camera');
        if (camera instanceof THREE.PerspectiveCamera) {
          this.stateStore.updateCamera({
            type: 'perspective',
            position: [camera.position.x, camera.position.y, camera.position.z],
            fov: camera.fov,
            near: camera.near,
            far: camera.far,
            zoom: camera.zoom,
          });
        }
      }
    });

    // React to state store changes
    effect(() => {
      const activeScene = this.stateStore.activeScene();
      if (activeScene && this.initialized()) {
        // Update background color from state
        const currentBgColor = this.backgroundColor();
        if (currentBgColor !== String(activeScene.backgroundColor)) {
          // This would trigger a scene background update
          this.animationEvent.emit({
            type: 'background-changed',
            data: { backgroundColor: activeScene.backgroundColor },
          });
        }
      }
    });
  }

  private setupEventListeners(): void {
    if (!this.autoResize()) return;

    const containerElement = this.container()?.nativeElement;
    if (!containerElement) return;

    // Setup resize observer
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.handleResize(entry.contentRect.width, entry.contentRect.height);
      }
    });

    this.resizeObserver.observe(containerElement);

    // Window resize fallback
    fromEvent(window, 'resize')
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const rect = containerElement.getBoundingClientRect();
        this.handleResize(rect.width, rect.height);
      });
  }

  private handleResize(width: number, height: number): void {
    const renderer = this.getRenderer();
    const camera = this.getCamera();

    if (renderer) {
      renderer.setSize(width, height);
    }

    if (camera && 'aspect' in camera) {
      const perspCamera = camera as THREE.PerspectiveCamera;
      perspCamera.aspect = width / height;
      perspCamera.updateProjectionMatrix();
    }

    this.angularThreeFoundation.updateCameraAspect(width, height);
  }

  private setupPerformanceMonitoring(): void {
    let frameCount = 0;
    let totalFrameTime = 0;
    let lastTime = performance.now();

    const monitor = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      frameCount++;
      totalFrameTime += deltaTime;

      // Update metrics every 60 frames
      if (frameCount >= 60) {
        const avgFrameTime = totalFrameTime / frameCount;
        const fps = Math.round(1000 / avgFrameTime);
        const memoryUsage = this.getMemoryUsage();
        const activeAnimations = this.animationService.activeAnimationCount();

        this._performanceMetrics.set({
          fps,
          memoryUsage,
          renderTime: avgFrameTime,
          isOptimal: fps >= 30 && avgFrameTime < 33,
          activeAnimations,
        });

        frameCount = 0;
        totalFrameTime = 0;
      }

      this.performanceMonitorId = requestAnimationFrame(monitor);
    };

    this.performanceMonitorId = requestAnimationFrame(monitor);
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private cleanup(): void {
    if (this.performanceMonitorId) {
      cancelAnimationFrame(this.performanceMonitorId);
      this.performanceMonitorId = undefined;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }

    // Angular Three handles its own cleanup
    this.angularThreeFoundation.cleanup();
  }
}
