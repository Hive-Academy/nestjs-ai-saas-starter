import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import * as THREE from 'three';
import {
  NavigationTarget,
  SpatialNavigationService,
} from '../services/spatial-navigation.service';

export interface NavigationControlsConfig {
  showZoomControls: boolean;
  showResetButton: boolean;
  showKeyboardHints: boolean;
  showTouchHints: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Navigation Controls Component
 * Provides UI overlay controls for enhanced 3D navigation
 * Includes zoom controls, reset button, and keyboard/touch hints
 */
@Component({
  selector: 'brand-navigation-controls',
  standalone: true,
  imports: [],
  template: `
    <div class="navigation-controls" [class]="positionClass()">
      <!-- Zoom Controls -->
      @if (config()?.showZoomControls) {
      <div class="control-group zoom-controls">
        <button
          class="nav-button zoom-in"
          (click)="zoomIn()"
          [disabled]="!canZoomIn()"
          title="Zoom In (Q)"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
            <line x1="8" y1="11" x2="14" y2="11" />
            <line x1="11" y1="8" x2="11" y2="14" />
          </svg>
        </button>
        <button
          class="nav-button zoom-out"
          (click)="zoomOut()"
          [disabled]="!canZoomOut()"
          title="Zoom Out (E)"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
      </div>
      }

      <!-- Reset and Focus Controls -->
      <div class="control-group action-controls">
        @if (config()?.showResetButton) {
        <button
          class="nav-button reset-camera"
          (click)="resetCamera()"
          [disabled]="isNavigating()"
          title="Reset Camera"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
        </button>
        }

        <button
          class="nav-button focus-constellation"
          (click)="focusConstellation()"
          [disabled]="isNavigating()"
          title="Focus Constellation"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="4.5" cy="4.5" r="1" />
            <circle cx="19.5" cy="19.5" r="1" />
            <circle cx="4.5" cy="19.5" r="1" />
            <circle cx="19.5" cy="4.5" r="1" />
          </svg>
        </button>
      </div>

      <!-- Navigation Hints -->
      @if (showHints()) {
      <div class="control-group navigation-hints">
        <!-- Keyboard Hints -->
        @if (config()?.showKeyboardHints) {
        <div class="hint-section keyboard-hints">
          <div class="hint-title">Keyboard</div>
          <div class="hint-items">
            <div class="hint-item">
              <span class="hint-keys">WASD</span>
              <span class="hint-desc">Move</span>
            </div>
            <div class="hint-item">
              <span class="hint-keys">Q/E</span>
              <span class="hint-desc">Zoom</span>
            </div>
            <div class="hint-item">
              <span class="hint-keys">Mouse</span>
              <span class="hint-desc">Orbit</span>
            </div>
          </div>
        </div>
        }
        <!-- Touch Hints -->
        @if (config()?.showTouchHints && isTouchDevice()) {
        <div class="hint-section touch-hints">
          <div class="hint-title">Touch</div>
          <div class="hint-items">
            <div class="hint-item">
              <span class="hint-keys">Drag</span>
              <span class="hint-desc">Orbit</span>
            </div>
            <div class="hint-item">
              <span class="hint-keys">Pinch</span>
              <span class="hint-desc">Zoom</span>
            </div>
            <div class="hint-item">
              <span class="hint-keys">2-Tap</span>
              <span class="hint-desc">Focus</span>
            </div>
          </div>
        </div>
        }
      </div>
      }

      <!-- Navigation Status -->
      @if (isNavigating()) {
      <div class="navigation-status">
        <div class="status-indicator">
          <div class="status-spinner"></div>
          <span>Navigating...</span>
        </div>
      </div>
      }
    </div>
  `,
  styleUrls: ['./navigation-controls.component.css'],
})
export class NavigationControlsComponent {
  private readonly spatialNavigation = inject(SpatialNavigationService);

  readonly config = input<NavigationControlsConfig | null>({
    showZoomControls: true,
    showResetButton: true,
    showKeyboardHints: true,
    showTouchHints: true,
    position: 'bottom-right',
  });
  readonly focusRequested = output<NavigationTarget>();
  readonly resetRequested = output<void>();

  // Component state
  readonly isNavigating = this.spatialNavigation.isNavigating;
  readonly currentDistance = signal(0);
  readonly cameraLimits = signal({ min: 5, max: 50 });

  // Computed properties
  readonly positionClass = computed(() => {
    return `controls-${this.config()?.position || 'bottom-right'}`;
  });

  readonly showHints = computed(() => {
    const config = this.config();
    return config?.showKeyboardHints || config?.showTouchHints;
  });

  readonly canZoomIn = computed(() => {
    return (
      this.currentDistance() > this.cameraLimits().min && !this.isNavigating()
    );
  });

  readonly canZoomOut = computed(() => {
    return (
      this.currentDistance() < this.cameraLimits().max && !this.isNavigating()
    );
  });

  constructor() {
    // Update current distance periodically
    setInterval(() => {
      this.currentDistance.set(this.spatialNavigation.getCameraDistance());
    }, 100);
  }

  /**
   * Zoom camera in (closer to constellation)
   */
  zoomIn(): void {
    const currentDistance = this.spatialNavigation.getCameraDistance();
    const newDistance = Math.max(
      this.cameraLimits().min,
      currentDistance * 0.8
    );
    this.spatialNavigation.setCameraDistance(newDistance, 0.3);
  }

  /**
   * Zoom camera out (further from constellation)
   */
  zoomOut(): void {
    const currentDistance = this.spatialNavigation.getCameraDistance();
    const newDistance = Math.min(
      this.cameraLimits().max,
      currentDistance * 1.25
    );
    this.spatialNavigation.setCameraDistance(newDistance, 0.3);
  }

  /**
   * Reset camera to default position
   */
  resetCamera(): void {
    this.spatialNavigation.resetCamera();
    this.resetRequested.emit();
  }

  /**
   * Focus on constellation center
   */
  focusConstellation(): void {
    const target: NavigationTarget = {
      position: new THREE.Vector3(0, 5, 15),
      target: new THREE.Vector3(0, 0, 0),
      distance: 15,
    };

    this.spatialNavigation.focusOnTarget(target);
    this.focusRequested.emit(target);
  }

  /**
   * Request focus on specific agent (called from parent)
   */
  focusOnAgent(agentPosition: THREE.Vector3, agentId: string): void {
    const target: NavigationTarget = {
      position: agentPosition.clone(),
      target: agentPosition.clone(),
      distance: 8,
    };

    this.spatialNavigation.focusOnTarget(target);
    this.focusRequested.emit(target);
  }

  /**
   * Check if device supports touch
   */
  isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Get current navigation state for debugging
   */
  getNavigationState() {
    return {
      config: this.config(),
      currentDistance: this.currentDistance(),
      cameraLimits: this.cameraLimits(),
      isTouchDevice: this.isTouchDevice(),
      ...this.spatialNavigation.getNavigationState(),
    };
  }
}
