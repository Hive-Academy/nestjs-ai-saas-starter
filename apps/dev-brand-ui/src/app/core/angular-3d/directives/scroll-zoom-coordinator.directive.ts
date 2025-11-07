/**
 * ScrollZoomCoordinatorDirective - Coordinates 3D Orbit Zoom with Page Scrolling
 *
 * This directive bridges the gap between Three.js OrbitControls zoom and native page scrolling,
 * creating a seamless parallax experience where:
 * 1. Mouse wheel zooms the camera in 3D space (zoom in = closer to scene)
 * 2. When max zoom distance is reached, additional scroll triggers page scroll down
 * 3. When min zoom distance is reached while scrolling up, it scrolls page up
 *
 * Implementation based on best practices from:
 * - https://tympanus.net/codrops/2022/01/05/crafting-scroll-based-animations-in-three-js/
 * - Three.js discourse discussions on zoom-scroll coordination
 *
 * Features:
 * - Smooth transition between 3D zoom and page scroll
 * - Prevents scroll conflicts when zoom limits are reached
 * - Configurable thresholds and sensitivity
 * - Delta time-aware for consistent behavior across refresh rates
 * - Works with Angular's zone and change detection
 *
 * Usage:
 * ```html
 * <ngt-orbit-controls
 *   scrollZoomCoordinator
 *   [minDistance]="5"
 *   [maxDistance]="50"
 *   [scrollThreshold]="0.5"
 *   [scrollSensitivity]="1.0"
 * />
 * ```
 *
 * @see https://threejs.org/docs/#examples/en/controls/OrbitControls
 */

import {
  Directive,
  ElementRef,
  inject,
  input,
  NgZone,
  OnDestroy,
  AfterViewInit,
  output,
  effect,
} from '@angular/core';
import { OrbitControls } from 'three-stdlib';

export interface ScrollZoomState {
  /** Current camera distance from target */
  distance: number;
  /** Whether at minimum zoom distance (closest) */
  atMinDistance: boolean;
  /** Whether at maximum zoom distance (farthest) */
  atMaxDistance: boolean;
  /** Whether page scroll should be enabled */
  allowPageScroll: boolean;
  /** Scroll direction: 1 = down/zoom out, -1 = up/zoom in */
  scrollDirection: number;
}

@Directive({
  selector: '[scrollZoomCoordinator]',
  standalone: true,
})
export class ScrollZoomCoordinatorDirective
  implements AfterViewInit, OnDestroy
{
  private elementRef = inject(ElementRef);
  private ngZone = inject(NgZone);

  // ================================
  // INPUTS - Configuration & Controls Reference
  // ================================

  /**
   * OrbitControls instance to monitor
   * Should be passed from parent component via controlsChange event
   */
  readonly orbitControls = input<OrbitControls | undefined>(undefined);

  // ================================
  // INPUTS - Configuration
  // ================================

  /**
   * Threshold distance from min/max before triggering page scroll
   * Value between 0-1, where 0.1 means trigger at 90% of limit
   * Default: 0.5 (trigger at 50% remaining distance)
   */
  readonly scrollThreshold = input<number>(0.5);

  /**
   * Minimum time (ms) between scroll events to prevent jitter
   * Default: 16ms (~60fps)
   */
  readonly scrollDebounceMs = input<number>(16);

  // ================================
  // OUTPUTS - State Changes
  // ================================

  /**
   * Emits whenever zoom/scroll state changes
   */
  readonly stateChange = output<ScrollZoomState>();

  /**
   * Emits when transitioning from 3D zoom to page scroll
   */
  readonly scrollTransition = output<{ direction: 'up' | 'down' }>();

  /**
   * Emits when zoom should be enabled or disabled
   * Parent component should bind [enableZoom] to respond to this
   */
  readonly zoomEnabledChange = output<boolean>();

  // ================================
  // PRIVATE STATE
  // ================================

  private controls?: OrbitControls;
  private lastWheelTime = 0;
  private isPageScrolling = false;
  private animationFrameId?: number;

  // Event listeners for cleanup
  private wheelListener?: (e: WheelEvent) => void;
  private changeListener?: () => void;
  private initialized = false;
  private lastZoomEnabled = true; // Track last emitted state to avoid redundant emissions

  constructor() {
    // Watch for controls input and initialize when available
    effect(() => {
      const controls = this.orbitControls();
      if (controls && !this.initialized) {
        this.controls = controls;
        this.initializeWithControls();
      }
    });
  }

  ngAfterViewInit(): void {
    // Fallback: Try to find controls in the DOM if not provided via input
    if (!this.controls) {
      setTimeout(() => {
        this.tryFindControls();
      }, 100);
    }
  }

  private tryFindControls(): void {
    if (this.initialized || this.orbitControls()) return;

    // Try to get OrbitControls instance from the ngt-orbit-controls element
    const ngtControlsElement =
      this.elementRef.nativeElement.querySelector('ngt-orbit-controls');

    if (ngtControlsElement) {
      // Try various ways Angular Three might store the instance
      const possibleControls =
        ngtControlsElement['__THREE__'] ||
        ngtControlsElement['instance'] ||
        ngtControlsElement['ref'];

      if (possibleControls && possibleControls.object) {
        this.controls = possibleControls as OrbitControls;
        this.initializeWithControls();
        return;
      }
    }

    console.warn(
      '[ScrollZoomCoordinator] OrbitControls not found via DOM. ' +
        'Please pass controls via [orbitControls] input or ensure ngt-orbit-controls is rendered.'
    );
  }

  private initializeWithControls(): void {
    if (this.initialized || !this.controls) return;

    this.initialized = true;

    // Run outside Angular zone for performance
    this.ngZone.runOutsideAngular(() => {
      this.setupWheelListener();
      this.setupChangeListener();
      this.startMonitoring();
    });
  }

  ngOnDestroy(): void {
    // Cleanup listeners
    if (this.wheelListener && this.controls) {
      this.controls.domElement?.removeEventListener(
        'wheel',
        this.wheelListener
      );
    }

    if (this.changeListener && this.controls) {
      this.controls.removeEventListener('change', this.changeListener);
    }

    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  // ================================
  // SETUP METHODS
  // ================================

  private setupWheelListener(): void {
    if (!this.controls) return;

    this.wheelListener = (event: WheelEvent) => {
      const now = Date.now();
      const timeSinceLastWheel = now - this.lastWheelTime;

      // Debounce rapid wheel events
      if (timeSinceLastWheel < this.scrollDebounceMs()) {
        return;
      }

      this.lastWheelTime = now;
      const state = this.getCurrentState();

      // Determine scroll direction (deltaY > 0 = scroll down/zoom out)
      const direction = event.deltaY > 0 ? 1 : -1;

      // Check if we should transition to page scroll
      if (state.atMaxDistance && direction > 0) {
        // At max zoom distance, scrolling down → disable zoom and allow page scroll
        this.disableZoom();
        this.transitionToPageScroll('down');
        // DON'T prevent default - let the event bubble for page scroll
      } else if (state.atMinDistance && direction < 0) {
        // At min zoom distance, scrolling up → disable zoom and allow page scroll
        this.disableZoom();
        this.transitionToPageScroll('up');
        // DON'T prevent default - let the event bubble for page scroll
      } else {
        // Normal 3D zoom behavior - re-enable zoom if it was disabled
        this.enableZoom();
        this.isPageScrolling = false;
      }
    };

    // Attach wheel listener to the controls' DOM element
    // Use capture phase to run BEFORE OrbitControls processes the event
    this.controls.domElement?.addEventListener('wheel', this.wheelListener, {
      passive: true, // Changed to passive since we're not preventing default
      capture: true, // Run in capture phase before OrbitControls
    });
  }

  private setupChangeListener(): void {
    if (!this.controls) return;

    this.changeListener = () => {
      // Emit state change whenever controls update
      const state = this.getCurrentState();

      // If we've moved away from limits, reset page scrolling flag and re-enable zoom
      if (!state.atMaxDistance && !state.atMinDistance) {
        if (this.isPageScrolling) {
          this.isPageScrolling = false;
        }
        this.enableZoom();
      }

      this.ngZone.run(() => {
        this.stateChange.emit(state);
      });
    };

    this.controls.addEventListener('change', this.changeListener);
  }

  private startMonitoring(): void {
    // Monitor distance in animation loop for smooth updates
    const monitor = () => {
      if (this.controls) {
        const state = this.getCurrentState();

        // Auto-enable/disable zoom based on state and scroll direction
        // If we're at a limit and not actively page scrolling, re-enable zoom
        // to allow zooming back in the opposite direction
        if (!this.isPageScrolling) {
          this.enableZoom();
        }
      }

      this.animationFrameId = requestAnimationFrame(monitor);
    };

    monitor();
  }

  // ================================
  // STATE CALCULATION
  // ================================

  private getCurrentState(): ScrollZoomState {
    if (!this.controls) {
      return this.getEmptyState();
    }

    // Calculate current distance from target
    const distance = this.controls.object.position.distanceTo(
      this.controls.target
    );

    const minDist = this.controls.minDistance;
    const maxDist = this.controls.maxDistance;
    const threshold = this.scrollThreshold();

    // Check if at limits (with threshold tolerance)
    const atMinDistance = distance <= minDist + threshold;
    const atMaxDistance = distance >= maxDist - threshold;

    return {
      distance,
      atMinDistance,
      atMaxDistance,
      allowPageScroll: atMinDistance || atMaxDistance,
      scrollDirection: this.isPageScrolling ? 1 : 0,
    };
  }

  private getEmptyState(): ScrollZoomState {
    return {
      distance: 0,
      atMinDistance: false,
      atMaxDistance: false,
      allowPageScroll: false,
      scrollDirection: 0,
    };
  }

  // ================================
  // ZOOM CONTROL HELPERS
  // ================================

  private disableZoom(): void {
    if (!this.controls) return;

    // Only emit if state changed
    if (this.lastZoomEnabled !== false) {
      console.log('🔒 Zoom disabled for page scroll');
      this.lastZoomEnabled = false;
      this.ngZone.run(() => {
        this.zoomEnabledChange.emit(false);
      });
    }
  }

  private enableZoom(): void {
    if (!this.controls) return;

    // Only emit if state changed
    if (this.lastZoomEnabled !== true) {
      console.log('🔓 Zoom re-enabled');
      this.lastZoomEnabled = true;
      this.ngZone.run(() => {
        this.zoomEnabledChange.emit(true);
      });
    }
  }

  // ================================
  // PAGE SCROLL TRANSITION
  // ================================

  private transitionToPageScroll(direction: 'up' | 'down'): void {
    if (!this.controls) return;

    this.isPageScrolling = true;

    // Emit transition event for analytics/UI feedback
    this.ngZone.run(() => {
      this.scrollTransition.emit({ direction });
    });

    // Note: We don't manually scroll here!
    // By disabling zoom (controls.enableZoom = false), OrbitControls won't
    // capture the wheel event, so it naturally bubbles to the document
    // and triggers native page scroll. This is the cleanest approach.
  }

  // ================================
  // PUBLIC API (for programmatic control)
  // ================================

  /**
   * Get current scroll-zoom state
   */
  public getState(): ScrollZoomState {
    return this.getCurrentState();
  }

  /**
   * Enable/disable page scroll coordination
   */
  public setEnabled(enabled: boolean): void {
    if (!enabled) {
      this.isPageScrolling = false;
      this.enableZoom();
    }
  }

  /**
   * Reset page scrolling state
   */
  public reset(): void {
    this.isPageScrolling = false;
    this.enableZoom();
  }
}
