import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgtCanvas } from 'angular-three';
import { AngularThreeFoundationService } from '../services/angular-three-foundation.service';
import { HybridUIService } from '../services/hybrid-ui.service';
import { HybridThreeSceneComponent } from './hybrid-three-scene.component';
import type { HybridUIServiceConfig } from '../interfaces';

@Component({
  selector: 'app-hybrid-scene',
  standalone: true,
  imports: [CommonModule, NgtCanvas],
  template: `
    <div class="hybrid-scene-container" #container>
      <!-- Angular Three Canvas Integration -->
      <ngt-canvas
        [sceneGraph]="sceneComponent"
        [gl]="glConfig()"
        [shadows]="shadowConfig"
        [performance]="performanceConfig()"
        [dpr]="dprConfig"
        [frameloop]="frameloopConfig"
        (created)="onCanvasCreated($event)"
        class="hybrid-scene-canvas"
        [class.initialized]="initialized()"
        [class.performance-optimal]="performanceOptimal()"
      >
      </ngt-canvas>

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
        <div class="loading-text">Initializing Angular Three Scene...</div>
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
export class HybridSceneComponentV2 implements OnInit, OnDestroy {
  // Inputs
  readonly config = input<Partial<HybridUIServiceConfig>>({});
  readonly enablePerformanceOverlay = input(false);
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
  private readonly angularThreeFoundation = inject(AngularThreeFoundationService);
  readonly hybridService = inject(HybridUIService);

  // Component state
  private readonly isInitialized = signal(false);
  private readonly currentPerformance = signal({
    fps: 60,
    memoryUsage: 0,
    isOptimal: true,
  });

  // Angular Three configuration
  readonly sceneComponent = HybridThreeSceneComponent;

  // Canvas configuration properties
  readonly glConfig = computed(() => ({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance' as const,
  }));

  readonly shadowConfig = 'soft' as const;

  readonly performanceConfig = computed(() => ({
    min: 0.1,
    max: 1,
    debounce: 200,
  }));

  readonly dprConfig = [1, 2] as [number, number];
  readonly frameloopConfig = 'always' as const;

  // Computed properties
  readonly initialized = computed(() => this.isInitialized());
  readonly showPerformanceOverlay = computed(() => this.enablePerformanceOverlay());
  readonly performanceOptimal = computed(() => this.currentPerformance().isOptimal);
  readonly fps = computed(() => Math.round(this.currentPerformance().fps));
  readonly memoryUsageMB = computed(() =>
    Math.round(this.currentPerformance().memoryUsage / (1024 * 1024))
  );

  async ngOnInit(): Promise<void> {
    // Configuration will be applied when Angular Three canvas is created
    const serviceConfig = this.config();
    if (serviceConfig && Object.keys(serviceConfig).length > 0) {
      this.hybridService.updateConfig(serviceConfig);
    }
  }

  ngOnDestroy(): void {
    // Angular Three handles cleanup automatically
    this.angularThreeFoundation.cleanup();
  }

  /**
   * Called when Angular Three canvas is created and ready
   */
  async onCanvasCreated(event: any): Promise<void> {
    try {
      console.log('Angular Three canvas created:', event);

      // Initialize the foundation service
      const initialized = await this.angularThreeFoundation.initialize();

      if (initialized) {
        this.setupPerformanceMonitoring();
        this.isInitialized.set(true);
        this.sceneInitialized.emit();
        console.log('Hybrid Scene initialized with Angular Three');
      } else {
        throw new Error('Failed to initialize Angular Three foundation');
      }
    } catch (error) {
      console.error('Failed to initialize Angular Three hybrid scene:', error);
    }
  }

  private setupPerformanceMonitoring(): void {
    // Use Angular Three's built-in performance monitoring
    let frameCount = 0;
    let totalFrameTime = 0;
    let lastTime = performance.now();

    const monitorPerformance = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      frameCount++;
      totalFrameTime += deltaTime;

      // Calculate average FPS every 60 frames
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

      requestAnimationFrame(monitorPerformance);
    };

    requestAnimationFrame(monitorPerformance);
  }

  /**
   * Get the current scene instance from Angular Three
   */
  getScene() {
    return this.angularThreeFoundation.scene();
  }

  /**
   * Get the current camera instance from Angular Three
   */
  getCamera() {
    return this.angularThreeFoundation.camera();
  }

  /**
   * Get the current renderer instance from Angular Three
   */
  getRenderer() {
    return this.angularThreeFoundation.getRenderer();
  }

  /**
   * Add object to Angular Three scene
   */
  addToScene(object: any): void {
    const scene = this.getScene();
    if (scene) {
      scene.add(object);
    }
  }

  /**
   * Remove object from Angular Three scene
   */
  removeFromScene(object: any): void {
    const scene = this.getScene();
    if (scene) {
      scene.remove(object);
    }
  }

  /**
   * Take screenshot using Angular Three renderer
   */
  takeScreenshot(format: 'png' | 'jpeg' = 'png', quality = 0.92): string | null {
    const renderer = this.getRenderer();
    if (!renderer?.domElement) return null;

    return renderer.domElement.toDataURL(
      format === 'png' ? 'image/png' : 'image/jpeg',
      quality
    );
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.currentPerformance(),
      hybridService: this.hybridService.performance(),
      angularThree: {
        scene: !!this.getScene(),
        camera: !!this.getCamera(),
        renderer: !!this.getRenderer(),
      },
    };
  }
}
