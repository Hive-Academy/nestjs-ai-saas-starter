import {
  Component,
  ViewChild,
  ElementRef,
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
import { NgtCanvas } from 'angular-three';

import { AngularThreeFoundationService } from '../services/angular-three-foundation.service';
import { HybridUIService } from '../services/hybrid-ui.service';
// HybridElement3DComponent import removed as it's not used in template
import type { HybridUIServiceConfig } from '../interfaces';

// Strict interface definitions following Angular best practices
interface HybridSceneConfig extends HybridUIServiceConfig {
  readonly shadows: boolean;
  readonly antialias: boolean;
  readonly alpha: boolean;
  readonly powerPreference: 'default' | 'high-performance' | 'low-power';
}

@Component({
  selector: 'app-hybrid-scene',
  standalone: true,
  imports: [CommonModule, NgtCanvas],
  template: `
    <div class="hybrid-scene-container" #container>
      <ngt-canvas
        [sceneGraph]="sceneGraphComponent()"
        class="hybrid-scene-canvas"
        [class.initialized]="initialized()"
        [class.performance-optimal]="performanceOptimal()"
        [gl]="rendererConfig()"
        [performance]="performanceConfig()"
        [shadows]="shadowsEnabled()"
        [dpr]="devicePixelRatio()"
        [frameloop]="frameloopMode()"
        (created)="onCanvasCreated($event)"
      >
        <!-- Default scene content will be handled by Angular Three -->
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
export class HybridSceneComponent implements OnDestroy {
  @ViewChild('container', { static: true })
  container!: ElementRef<HTMLDivElement>;

  // Inputs with strict typing following Angular best practices
  readonly config = input<Partial<HybridSceneConfig>>({});
  readonly enablePerformanceOverlay = input(false);
  readonly autoResize = input(true);
  readonly contentVisible = input(true);
  readonly backgroundColor = input<string>('transparent');
  readonly cameraPosition = input<readonly [number, number, number]>([0, 0, 5] as const);
  readonly cameraTarget = input<readonly [number, number, number]>([0, 0, 0] as const);
  readonly enableShadows = input(true);
  readonly antialias = input(true);
  readonly alpha = input(true);
  readonly powerPreference = input<'default' | 'high-performance' | 'low-power'>('high-performance');

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

  // Computed properties for Angular Three configuration
  readonly initialized = computed(() => this.isInitialized());
  readonly showPerformanceOverlay = computed(() => this.enablePerformanceOverlay());
  readonly performanceOptimal = computed(() => this.currentPerformance().isOptimal);
  readonly fps = computed(() => Math.round(this.currentPerformance().fps));
  readonly memoryUsageMB = computed(() =>
    Math.round(this.currentPerformance().memoryUsage / (1024 * 1024))
  );

  // Angular Three specific computed properties
  readonly rendererConfig = computed(() => ({
    antialias: this.antialias(),
    alpha: this.alpha(),
    powerPreference: this.powerPreference(),
    precision: 'highp' as const,
    logarithmicDepthBuffer: false,
    localClippingEnabled: false
  }));

  readonly performanceConfig = computed(() => ({
    min: 0.5,
    max: 1,
    debounce: 200,
    regress: true
  }));

  readonly shadowsEnabled = computed(() => this.enableShadows());
  readonly devicePixelRatio = computed(() => Math.min(window.devicePixelRatio, 2));
  readonly frameloopMode = computed(() => 'always' as const);

  // Scene graph component (placeholder - will be implemented in Phase 2)
  readonly sceneGraphComponent = computed(() => 'routed' as const);

  // Canvas creation handler
  protected onCanvasCreated(event: any): void {
    console.log('Angular Three Canvas created:', event);
    this.angularThreeFoundation.initialize().then((success) => {
      if (success) {
        this.isInitialized.set(true);
        this.sceneInitialized.emit();
        this.setupEventListeners();
      }
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
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
  updateCameraPosition(position: readonly [number, number, number]): void {
    if (this.camera) {
      this.camera.position.set(...position);
    }
  }

  /**
   * Update camera target
   */
  updateCameraTarget(target: readonly [number, number, number]): void {
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
