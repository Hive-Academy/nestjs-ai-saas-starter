import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  DestroyRef,
  effect,
  input,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  HybridUIService
} from '../core/services/hybrid-ui.service';
import {
  HybridUIConfig,
  LayoutType,
  HybridElement3D,
  HybridElementEvents
} from '../core/types/hybrid-ui.types';

/**
 * Hybrid Scene Component
 * Main container component that manages a 3D scene with hybrid UI elements
 * Provides declarative API for creating content-first 3D interfaces
 */
@Component({
  selector: 'hybrid-scene',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #sceneContainer
      class="hybrid-scene-container"
      [class.loading]="isLoading()"
      [style.width]="width()"
      [style.height]="height()">

      <!-- Loading indicator -->
      @if (isLoading()) {
        <div class="loading-overlay">
          <div class="loading-spinner"></div>
          <p>Initializing 3D Scene...</p>
        </div>
      }

      <!-- Performance overlay (debug mode) -->
  @if (showPerformance() && !isLoading()) {
        <div class="performance-overlay">
          <div class="performance-item">
            <span>FPS:</span>
            <span>{{ performance().fps.toFixed(1) }}</span>
          </div>
          <div class="performance-item">
            <span>Elements:</span>
            <span>{{ performance().elementCount }}</span>
          </div>
          <div class="performance-item">
            <span>Texture Memory:</span>
            <span>{{ (performance().textureMemory / 1024 / 1024).toFixed(1) }}MB</span>
          </div>
        </div>
      }

      <!-- Interactive controls -->
  @if (showControls() && !isLoading()) {
        <div class="scene-controls">
          <button
            type="button"
            class="control-button"
            (click)="resetCamera()"
            title="Reset Camera">
            🎯
          </button>

          <button
            type="button"
            class="control-button"
            (click)="toggleLayout()"
            title="Change Layout">
            📐
          </button>

          <button
            type="button"
            class="control-button"
            (click)="optimizePerformance()"
            title="Optimize Performance">
            ⚡
          </button>
        </div>
      }

      <!-- Element count indicator -->
  @if (elementCount() > 0 && showElementCount()) {
        <div class="element-counter">
          {{ elementCount() }} element{{ elementCount() === 1 ? '' : 's' }}
        </div>
      }

      <!-- Content projection for child elements -->
      <div class="content-projection" style="display: none;">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .hybrid-scene-container {
      position: relative;
      width: 100%;
      height: 100vh;
      overflow: hidden;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
      border-radius: 8px;
    }

    .hybrid-scene-container.loading {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(10, 10, 10, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      color: white;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top: 3px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .performance-overlay {
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 100;
      min-width: 150px;
    }

    .performance-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .performance-item:last-child {
      margin-bottom: 0;
    }

    .scene-controls {
      position: absolute;
      bottom: 16px;
      right: 16px;
      display: flex;
      gap: 8px;
      z-index: 100;
    }

    .control-button {
      width: 40px;
      height: 40px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all 0.2s ease;
      backdrop-filter: blur(10px);
    }

    .control-button:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.1);
    }

    .control-button:active {
      transform: scale(0.95);
    }

    .element-counter {
      position: absolute;
      bottom: 16px;
      left: 16px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      padding: 8px 12px;
      border-radius: 16px;
      font-size: 12px;
      z-index: 100;
      backdrop-filter: blur(10px);
    }

    .content-projection {
      position: absolute;
      pointer-events: none;
      opacity: 0;
    }
  `],
})
export class HybridSceneComponent implements OnInit, OnDestroy {
  private readonly hybridService = inject(HybridUIService);
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('sceneContainer', { static: true })
  sceneContainer!: ElementRef<HTMLDivElement>;

  // Signal Inputs
  sceneId = input<string>(`scene-${Date.now()}`);
  width = input('100%');
  height = input('100vh');
  layout = input<LayoutType>('grid-2d');
  config = input<Partial<HybridUIConfig> | undefined>(undefined);
  showPerformance = input(false);
  showControls = input(true);
  showElementCount = input(true);
  autoOptimize = input(true);

  // Signal Outputs
  sceneReady = output<string>();
  elementAdded = output<HybridElement3D>();
  elementRemoved = output<string>();
  elementActivated = output<HybridElement3D>();
  performanceUpdate = output<any>();

  // Reactive state
  private readonly initialized = signal(false);
  readonly isLoading = computed(() => !this.initialized());
  readonly elementCount = this.hybridService.elementCount;
  readonly performance = this.hybridService.performanceMetrics;
  readonly activeElement = this.hybridService.activeElementId;

  // Layout cycle for controls
  private readonly layoutTypes: LayoutType[] = ['grid-2d', 'orbital', 'depth-layers', 'flow'];
  private currentLayoutIndex = 0;

  ngOnInit(): void {
    this.initializeScene();
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
  this.hybridService.cleanupScene(this.sceneId());
  }

  /**
   * Add HTML element to the 3D scene
   */
  async addElement(
    element: HTMLElement,
    config?: any,
    events?: Partial<HybridElementEvents>
  ): Promise<string | null> {
    if (!this.initialized()) {
      console.warn('Scene not ready. Element will be queued.');
      // TODO: implement queueing mechanism if early adds are expected
    }

    const elementId = await this.hybridService.addElement(
      this.sceneId(),
      element,
      config ?? {},
      events
    );

    if (elementId) {
      const hybridElement = this.hybridService.getElement(elementId);
      if (hybridElement) {
        this.elementAdded.emit(hybridElement);
      }
    }

    return elementId;
  }

  /**
   * Set active element
   */
  setActiveElement(elementId: string | null): void {
    this.hybridService.setActiveElement(elementId);

    if (elementId) {
      const element = this.hybridService.getElement(elementId);
      if (element) {
        this.elementActivated.emit(element);
      }
    }
  }

  /**
   * Reset camera to default position
   */
  resetCamera(): void {
    // Implementation would reset camera through service
    console.log('Resetting camera...');
  }

  /**
   * Toggle through different layout types
   */
  toggleLayout(): void {
    this.currentLayoutIndex = (this.currentLayoutIndex + 1) % this.layoutTypes.length;
    const newLayout = this.layoutTypes[this.currentLayoutIndex];
    // Delegate layout update to service
  this.hybridService.updateLayout(this.sceneId(), { type: newLayout });
    console.log(`Switched to ${newLayout} layout`);
  }

  /**
   * Optimize performance settings
   */
  optimizePerformance(): void {
    // Implementation would adjust quality settings
    console.log('Optimizing performance...');
  }

  /**
   * Get scene statistics
   */
  getSceneStats() {
  return this.hybridService.getSceneStats(this.sceneId());
  }

  /**
   * Initialize the 3D scene
   */
  private async initializeScene(): Promise<void> {
    try {
      const success = await this.hybridService.createHybridScene(
        this.sceneId(),
        this.sceneContainer.nativeElement,
        this.config()
      );

      if (success) {
        // Set initial layout
        if (this.layout()) {
          this.hybridService.updateLayout(this.sceneId(), { type: this.layout() });
        }

        this.initialized.set(true);
  this.sceneReady.emit(this.sceneId());
      } else {
        throw new Error('Failed to initialize scene');
      }
    } catch (error) {
      console.error('Scene initialization failed:', error);
      // Could emit error event here
    }
  }

  /**
   * Setup event listeners for reactive updates
   */
  private setupEventListeners(): void {
    // Convert signals to observables for subscription-based side-effects
    toObservable(this.performance)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(metrics => {
        this.performanceUpdate.emit(metrics);
  if (this.autoOptimize() && metrics.fps < 30) {
          this.optimizePerformance();
        }
      });

    toObservable(this.activeElement)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(elementId => {
        if (!elementId) return;
        const element = this.hybridService.getElement(elementId);
        if (element) this.elementActivated.emit(element);
      });

    // Effect for element count auto layout optimization (future hook)
    effect(() => {
      const count = this.elementCount();
  if (this.autoOptimize() && count > 25) {
        // Placeholder: could downgrade quality or switch layout
        // console.debug('High element count detected, consider quality adjustments.');
      }
    });
  }
}
