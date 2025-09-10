import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as THREE from 'three';
import { SpatialNavigationService, NavigationTarget } from '../services/spatial-navigation.service';

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
  imports: [CommonModule],
  template: `
    <div class="navigation-controls" [class]="positionClass()">
      <!-- Zoom Controls -->
      <div class="control-group zoom-controls" *ngIf="config?.showZoomControls">
        <button 
          class="nav-button zoom-in"
          (click)="zoomIn()"
          [disabled]="!canZoomIn()"
          title="Zoom In (Q)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
            <line x1="11" y1="8" x2="11" y2="14"/>
          </svg>
        </button>
        
        <button 
          class="nav-button zoom-out"
          (click)="zoomOut()"
          [disabled]="!canZoomOut()"
          title="Zoom Out (E)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
      </div>

      <!-- Reset and Focus Controls -->
      <div class="control-group action-controls">
        <button 
          class="nav-button reset-camera"
          (click)="resetCamera()"
          [disabled]="isNavigating()"
          title="Reset Camera"
          *ngIf="config?.showResetButton"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M3 21v-5h5"/>
          </svg>
        </button>

        <button 
          class="nav-button focus-constellation"
          (click)="focusConstellation()"
          [disabled]="isNavigating()"
          title="Focus Constellation"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <circle cx="12" cy="12" r="1"/>
            <circle cx="4.5" cy="4.5" r="1"/>
            <circle cx="19.5" cy="19.5" r="1"/>
            <circle cx="4.5" cy="19.5" r="1"/>
            <circle cx="19.5" cy="4.5" r="1"/>
          </svg>
        </button>
      </div>

      <!-- Navigation Hints -->
      <div class="control-group navigation-hints" *ngIf="showHints()">
        <!-- Keyboard Hints -->
        <div class="hint-section keyboard-hints" *ngIf="config?.showKeyboardHints">
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

        <!-- Touch Hints -->
        <div class="hint-section touch-hints" *ngIf="config?.showTouchHints && isTouchDevice()">
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
      </div>

      <!-- Navigation Status -->
      <div class="navigation-status" *ngIf="isNavigating()">
        <div class="status-indicator">
          <div class="status-spinner"></div>
          <span>Navigating...</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .navigation-controls {
        position: absolute;
        display: flex;
        flex-direction: column;
        gap: 12px;
        z-index: 100;
        pointer-events: none;
      }

      .navigation-controls.top-left {
        top: 20px;
        left: 20px;
      }

      .navigation-controls.top-right {
        top: 20px;
        right: 20px;
      }

      .navigation-controls.bottom-left {
        bottom: 20px;
        left: 20px;
      }

      .navigation-controls.bottom-right {
        bottom: 20px;
        right: 20px;
      }

      .control-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
        pointer-events: auto;
      }

      .zoom-controls {
        flex-direction: row;
        gap: 4px;
      }

      .action-controls {
        flex-direction: row;
        gap: 4px;
      }

      .nav-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 6px;
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
        backdrop-filter: blur(5px);
      }

      .nav-button:hover:not(:disabled) {
        background: rgba(59, 130, 246, 0.2);
        border-color: rgba(59, 130, 246, 0.6);
        transform: translateY(-1px);
      }

      .nav-button:active {
        transform: translateY(0);
      }

      .nav-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .nav-button svg {
        width: 16px;
        height: 16px;
      }

      .navigation-hints {
        background: rgba(0, 0, 0, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 8px;
        backdrop-filter: blur(5px);
        min-width: 120px;
      }

      .hint-section {
        margin-bottom: 8px;
      }

      .hint-section:last-child {
        margin-bottom: 0;
      }

      .hint-title {
        color: #3b82f6;
        font-size: 0.75em;
        font-weight: 600;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .hint-items {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .hint-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.7em;
        color: rgba(255, 255, 255, 0.8);
      }

      .hint-keys {
        color: #10b981;
        font-weight: 500;
        font-family: monospace;
        font-size: 0.9em;
      }

      .hint-desc {
        color: rgba(255, 255, 255, 0.7);
      }

      .navigation-status {
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid rgba(34, 197, 94, 0.3);
        border-radius: 6px;
        padding: 8px 12px;
        backdrop-filter: blur(5px);
      }

      .status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #22c55e;
        font-size: 0.8em;
        font-weight: 500;
      }

      .status-spinner {
        width: 12px;
        height: 12px;
        border: 2px solid rgba(34, 197, 94, 0.3);
        border-top: 2px solid #22c55e;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Mobile Responsive */
      @media (max-width: 768px) {
        .navigation-controls {
          gap: 8px;
        }

        .nav-button {
          width: 32px;
          height: 32px;
        }

        .nav-button svg {
          width: 14px;
          height: 14px;
        }

        .navigation-hints {
          min-width: 100px;
          padding: 6px;
        }

        .hint-item {
          font-size: 0.65em;
        }
      }

      /* Touch-friendly sizing */
      @media (pointer: coarse) {
        .nav-button {
          width: 44px;
          height: 44px;
        }

        .nav-button svg {
          width: 18px;
          height: 18px;
        }
      }
    `,
  ],
})
export class NavigationControlsComponent implements OnInit, OnDestroy {
  private readonly spatialNavigation = inject(SpatialNavigationService);

  @Input() config: NavigationControlsConfig | null = null;
  @Output() focusRequested = new EventEmitter<NavigationTarget>();
  @Output() resetRequested = new EventEmitter<void>();

  // Component state
  readonly isNavigating = this.spatialNavigation.isNavigating;
  readonly currentDistance = signal(0);
  readonly cameraLimits = signal({ min: 5, max: 50 });

  // Computed properties
  readonly positionClass = computed(() => {
    return `controls-${this.config?.position || 'bottom-right'}`;
  });

  readonly showHints = computed(() => {
    return this.config?.showKeyboardHints || this.config?.showTouchHints;
  });

  readonly canZoomIn = computed(() => {
    return this.currentDistance() > this.cameraLimits().min && !this.isNavigating();
  });

  readonly canZoomOut = computed(() => {
    return this.currentDistance() < this.cameraLimits().max && !this.isNavigating();
  });

  constructor() {
    // Update current distance periodically
    setInterval(() => {
      this.currentDistance.set(this.spatialNavigation.getCameraDistance());
    }, 100);
  }

  ngOnInit(): void {
    // Set default configuration if not provided
    if (!this.config) {
      this.config = {
        showZoomControls: true,
        showResetButton: true,
        showKeyboardHints: true,
        showTouchHints: true,
        position: 'bottom-right',
      };
    }
  }

  ngOnDestroy(): void {
    // Component cleanup handled by parent
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
      config: this.config,
      isNavigating: this.isNavigating(),
      currentDistance: this.currentDistance(),
      cameraLimits: this.cameraLimits(),
      isTouchDevice: this.isTouchDevice(),
      ...this.spatialNavigation.getNavigationState(),
    };
  }
}