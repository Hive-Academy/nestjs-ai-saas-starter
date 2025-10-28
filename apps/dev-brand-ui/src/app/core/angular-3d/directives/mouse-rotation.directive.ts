/**
 * MouseRotationDirective - Mouse-based Rotation
 *
 * Rotates an object based on mouse position, creating a "following" effect.
 * Useful for planets, logos, or focal point objects that should track the mouse.
 *
 * Features:
 * - Configurable rotation intensity
 * - X, Y, Z, or XY axis control
 * - Smooth interpolation
 * - Additive rotation (doesn't replace existing rotation)
 *
 * Usage:
 * ```html
 * <!-- Planet that rotates to "look at" mouse -->
 * <app-planet
 *   mouseRotation
 *   [rotationFactor]="0.5"
 *   [rotationAxis]="'xy'"
 * />
 *
 * <!-- Spinning logo that follows mouse on Y axis -->
 * <app-logo
 *   mouseRotation
 *   [rotationFactor]="0.3"
 *   [rotationAxis]="'y'"
 *   [rotationSmoothing]="8"
 * />
 * ```
 */

import { Directive, input } from '@angular/core';
import { injectBeforeRender } from 'angular-three';
import * as THREE from 'three';
import { MouseInteractionDirective } from './mouse-interaction-base.directive';

@Directive({
  selector: '[mouseRotation]',
  standalone: true,
})
export class MouseRotationDirective extends MouseInteractionDirective {
  /**
   * Rotation intensity (0 = no rotation, 1 = full rotation with mouse)
   * Typical values: 0.3-0.5 for subtle, 0.5-1.0 for strong tracking
   */
  readonly rotationFactor = input<number>(0.5);

  /**
   * Which axes to rotate on
   * - 'x': Pitch (up/down)
   * - 'y': Yaw (left/right)
   * - 'z': Roll
   * - 'xy': Both pitch and yaw (default)
   */
  readonly rotationAxis = input<'x' | 'y' | 'z' | 'xy'>('xy');

  /**
   * Smoothing factor for rotation transitions
   * Higher = faster transitions, lower = smoother/slower
   * Default: 8 (matches MouseInteractionService smoothing)
   */
  readonly rotationSmoothing = input<number>(8);

  // Current rotation state (for smoothing)
  private currentRotationX = 0;
  private currentRotationY = 0;
  private targetRotationX = 0;
  private targetRotationY = 0;

  private clock = new THREE.Clock();

  protected setupInteraction(): void {
    if (!this.isTargetValid()) {
      console.warn('[MouseRotation] Target object is invalid');
      return;
    }

    // Initialize current rotation from original state
    if (this.originalRotation) {
      this.currentRotationX = this.originalRotation.x;
      this.currentRotationY = this.originalRotation.y;
    }

    console.log('[MouseRotation] Setup complete', {
      factor: this.rotationFactor(),
      axis: this.rotationAxis(),
      smoothing: this.rotationSmoothing(),
      originalRotation: this.originalRotation,
    });

    // Apply rotation on every frame
    injectBeforeRender(() => {
      if (!this.targetObject || !this.originalRotation) return;

      const mouseX = this.mouseService.smoothMouseX();
      const mouseY = this.mouseService.smoothMouseY();
      const factor = this.rotationFactor();
      const axis = this.rotationAxis();

      // Calculate target rotation based on mouse position
      this.targetRotationX = mouseY * factor;
      this.targetRotationY = mouseX * factor;

      // Smooth interpolation
      const deltaTime = this.clock.getDelta();
      const smoothingFactor = deltaTime * this.rotationSmoothing();

      this.currentRotationX +=
        (this.targetRotationX - this.currentRotationX) * smoothingFactor;
      this.currentRotationY +=
        (this.targetRotationY - this.currentRotationY) * smoothingFactor;

      // Apply rotation based on axis configuration
      // Start from original rotation, then add mouse-based rotation
      if (axis === 'x') {
        this.targetObject.rotation.x =
          this.originalRotation.x + this.currentRotationX;
      } else if (axis === 'y') {
        this.targetObject.rotation.y =
          this.originalRotation.y + this.currentRotationY;
      } else if (axis === 'z') {
        // For Z axis, use X mouse movement for rotation
        this.targetObject.rotation.z =
          this.originalRotation.z + this.currentRotationY;
      } else if (axis === 'xy') {
        this.targetObject.rotation.x =
          this.originalRotation.x + this.currentRotationX;
        this.targetObject.rotation.y =
          this.originalRotation.y + this.currentRotationY;
      }
    });
  }
}
