import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  input,
  output,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { fromEvent, debounceTime } from 'rxjs';
import * as THREE from 'three';

import { AngularThreeFoundationService } from '../services/angular-three-foundation.service';
import { HybridUIService } from '../services/hybrid-ui.service';
import type { HybridUIServiceConfig } from '../interfaces';

@Component({
  selector: 'app-hybrid-scene',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="hybrid-scene-container" #container>
      <canvas
        #canvas
        class="hybrid-scene-canvas"
        [class.initialized]="initialized()"
        [class.performance-optimal]="performanceOptimal()"
      ></canvas>

      <!-- Performance overlay -->
      @if (showPerformanceOverlay()) {
      <div class="performance-overlay">
        <div class="performance-stats">
          <div class="stat">
            <span class="label">FPS:</span>
            <span class="value" [class.warning]="fps() < 30">{{ fps() }}</span>
          </div>
          <div class="stat">
            <span class="label">Elements:</span>
            <span class="value">{{ hybridService.elementCount() }}</span>
          </div>
          <div class="stat">
            <span class="label">Visible:</span>
            <span class="value">{{ hybridService.visibleElementCount() }}</span>
          </div>
          <div class="stat">
            <span class="label">Memory:</span>
            <span class="value">{{ memoryUsageMB() }}MB</span>
          </div>
        </div>
      </div>
      }

      <!-- Loading overlay -->
      @if (!initialized()) {
      <div class="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">Initializing 3D Scene...</div>
      </div>
      }

      <!-- Content projection for DOM elements to be converted to 3D -->
      <div class="hybrid-content" [style.opacity]="contentVisible() ? 1 : 0">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      .hybrid-scene-container {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: var(--scene-background, transparent);
      }

      .hybrid-scene-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: block;
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 1;
      }

      .hybrid-scene-canvas.initialized {
        opacity: 1;
      }

      .hybrid-scene-canvas.performance-optimal {
        filter: none;
      }

      .performance-overlay {
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
        z-index: 100;
        backdrop-filter: blur(4px);
      }

      .performance-stats {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .stat {
        display: flex;
        justify-content: space-between;
        gap: 8px;
      }

      .stat .label {
        opacity: 0.8;
      }

      .stat .value {
        font-weight: bold;
      }

      .stat .value.warning {
        color: #ff6b6b;
      }

      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 50;
      }

      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #007bff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .loading-text {
        margin-top: 16px;
        font-size: 14px;
        color: #666;
      }

      .hybrid-content {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: auto;
        z-index: 10;
        transition: opacity 0.3s ease;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      /* Dark theme support */
      @media (prefers-color-scheme: dark) {
        .loading-overlay {
          background: rgba(30, 30, 30, 0.9);
        }

        .loading-text {
          color: #ccc;
        }
      }

      /* Mobile optimizations */
      @media (max-width: 768px) {
        .performance-overlay {
          font-size: 10px;
          padding: 6px 8px;
          top: 5px;
          right: 5px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HybridSceneComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container', { static: true })
  container!: ElementRef<HTMLDivElement>;

  // Inputs
  readonly config = input<Partial<HybridUIServiceConfig>>({});
  readonly enablePerformanceOverlay = input(false);
  readonly autoResize = input(true);
  readonly contentVisible = input(true);
  readonly backgroundColor = input<string>('transparent');
  readonly cameraPosition = input<[number, number, number]>([0, 0, 5]);
  readonly cameraTarget = input<[number, number, number]>([0, 0, 0]);

  // Outputs
  readonly sceneInitialized = output<void>();
  readonly performanceUpdate = output<any>();
  readonly elementAdded = output<string>();
  readonly elementRemoved = output<string>();

  // Services
  private readonly angularThreeFoundation = inject(
    AngularThreeFoundationService
  );
  readonly hybridService = inject(HybridUIService);

  // Component state
  private readonly isInitialized = signal(false);
  private readonly currentPerformance = signal({
    fps: 60,
    memoryUsage: 0,
    isOptimal: true,
  });

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Computed properties
  readonly initialized = computed(() => this.isInitialized());
  readonly showPerformanceOverlay = computed(() =>
    this.enablePerformanceOverlay()
  );
  readonly performanceOptimal = computed(
    () => this.currentPerformance().isOptimal
  );
  readonly fps = computed(() => Math.round(this.currentPerformance().fps));
  readonly memoryUsageMB = computed(() =>
    Math.round(this.currentPerformance().memoryUsage / (1024 * 1024))
  );

  async ngAfterViewInit(): Promise<void> {
    await this.initializeScene();
    this.setupEventListeners();
    this.startRenderLoop();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private async initializeScene(): Promise<void> {
    try {
      // Initialize Angular Three foundation
      await this.angularThreeFoundation.initialize();

      // Setup renderer
      this.renderer = this.angularThreeFoundation.setupRenderer(
        this.canvas.nativeElement
      );

      // Get scene and camera from foundation
      this.scene = this.angularThreeFoundation.scene();
      this.camera =
        this.angularThreeFoundation.camera() as THREE.PerspectiveCamera;

      if (!this.scene || !this.camera) {
        throw new Error('Failed to initialize scene or camera');
      }

      // Configure camera
      const cameraPos = this.cameraPosition();
      const cameraTarget = this.cameraTarget();

      this.camera.position.set(...cameraPos);
      this.camera.lookAt(new THREE.Vector3(...cameraTarget));

      // Configure scene
      if (this.backgroundColor() !== 'transparent') {
        this.scene.background = new THREE.Color(this.backgroundColor());
      }

      // Add default lighting
      this.setupDefaultLighting();

      // Update hybrid service configuration
      const serviceConfig = this.config();
      if (serviceConfig && Object.keys(serviceConfig).length > 0) {
        this.hybridService.updateConfig(serviceConfig);
      }

      this.isInitialized.set(true);
      this.sceneInitialized.emit();
    } catch (error) {
      console.error('Failed to initialize hybrid scene:', error);
      throw error;
    }
  }

  private setupDefaultLighting(): void {
    if (!this.scene) return;

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;

    // Configure shadow camera
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;

    this.scene.add(directionalLight);

    // Point light for additional illumination
    const pointLight = new THREE.PointLight(0xffffff, 0.3, 30);
    pointLight.position.set(-5, 5, 5);
    this.scene.add(pointLight);
  }

  private setupEventListeners(): void {
    if (!this.autoResize()) return;

    // Handle container resize
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });

    this.resizeObserver.observe(this.container.nativeElement);

    // Window resize fallback
    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntilDestroyed())
      .subscribe(() => {
        this.handleResize();
      });
  }

  private handleResize(): void {
    if (!this.renderer || !this.camera) return;

    const container = this.container.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Update renderer size
    this.renderer.setSize(width, height);

    // Update camera aspect ratio
    this.angularThreeFoundation.updateCameraAspect(width, height);
  }

  private startRenderLoop(): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    let lastTime = performance.now();
    let frameCount = 0;
    let totalFrameTime = 0;

    const render = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Update performance metrics
      frameCount++;
      totalFrameTime += deltaTime;

      if (frameCount >= 60) {
        const avgFrameTime = totalFrameTime / frameCount;
        const fps = 1000 / avgFrameTime;

        this.currentPerformance.set({
          fps,
          memoryUsage: this.hybridService.performance().memoryUsage,
          isOptimal: fps >= 30 && avgFrameTime < 33,
        });

        this.performanceUpdate.emit(this.currentPerformance());

        frameCount = 0;
        totalFrameTime = 0;
      }

      // Render the scene
      this.renderer!.render(this.scene!, this.camera!);

      // Continue the loop
      this.animationId = requestAnimationFrame(render);
    };

    this.animationId = requestAnimationFrame(render);
  }

  /**
   * Get the current scene instance
   */
  getScene(): THREE.Scene | null {
    return this.scene;
  }

  /**
   * Get the current camera instance
   */
  getCamera(): THREE.Camera | null {
    return this.camera;
  }

  /**
   * Get the current renderer instance
   */
  getRenderer(): THREE.WebGLRenderer | null {
    return this.renderer;
  }

  /**
   * Update camera position
   */
  updateCameraPosition(position: [number, number, number]): void {
    if (this.camera) {
      this.camera.position.set(...position);
    }
  }

  /**
   * Update camera target
   */
  updateCameraTarget(target: [number, number, number]): void {
    if (this.camera) {
      this.camera.lookAt(new THREE.Vector3(...target));
    }
  }

  /**
   * Add object to scene
   */
  addToScene(object: THREE.Object3D): void {
    if (this.scene) {
      this.scene.add(object);
    }
  }

  /**
   * Remove object from scene
   */
  removeFromScene(object: THREE.Object3D): void {
    if (this.scene) {
      this.scene.remove(object);
    }
  }

  /**
   * Take screenshot of the scene
   */
  takeScreenshot(
    format: 'png' | 'jpeg' = 'png',
    quality = 0.92
  ): string | null {
    if (!this.renderer) return null;

    return this.renderer.domElement.toDataURL(
      format === 'png' ? 'image/png' : 'image/jpeg',
      quality
    );
  }

  /**
   * Toggle performance overlay
   */
  togglePerformanceOverlay(): void {
    // Note: This would need to be implemented with a signal if we want reactivity
    // For now, this is a placeholder for the API
  }

  /**
   * Reset camera to default position
   */
  resetCamera(): void {
    const defaultPos = this.cameraPosition();
    const defaultTarget = this.cameraTarget();

    this.updateCameraPosition(defaultPos);
    this.updateCameraTarget(defaultTarget);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.currentPerformance(),
      hybridService: this.hybridService.performance(),
    };
  }

  private cleanup(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    this.scene = null;
    this.camera = null;
  }
}
