/**
 * MouseParallaxDirective - Depth-based Position Offset
 *
 * Applies parallax effect to individual elements based on mouse position.
 * Objects move in relation to mouse movement, with optional depth scaling.
 *
 * Features:
 * - Configurable parallax intensity
 * - X, Y, or XY axis control
 * - Optional depth-based scaling (farther = less movement)
 * - Smooth interpolation via MouseInteractionService
 *
 * Usage:
 * ```html
 * <!-- Simple parallax on both axes -->
 * <app-star-field mouseParallax [parallaxFactor]="0.5" />
 *
 * <!-- Parallax with depth scaling -->
 * <app-star-field
 *   mouseParallax
 *   [parallaxFactor]="0.3"
 *   [parallaxAxis]="'xy'"
 *   [parallaxDepthScale]="true"
 * />
 *
 * <!-- Horizontal parallax only -->
 * <app-nebula
 *   mouseParallax
 *   [parallaxFactor]="0.2"
 *   [parallaxAxis]="'x'"
 * />
 * ```
 */

import { Directive, input } from '@angular/core';
import { injectBeforeRender } from 'angular-three';
import { MouseInteractionDirective } from './mouse-interaction-base.directive';

@Directive({
  selector: '[mouseParallax]',
  standalone: true,
})
export class MouseParallaxDirective extends MouseInteractionDirective {
  /**
   * Parallax intensity (0 = no movement, 1 = full movement with mouse)
   * Typical values: 0.2-0.5 for subtle effect, 0.5-1.0 for strong effect
   */
  readonly parallaxFactor = input<number>(0.3);

  /**
   * Which axes to apply parallax on
   * - 'x': Horizontal movement only
   * - 'y': Vertical movement only
   * - 'xy': Both axes (default)
   */
  readonly parallaxAxis = input<'x' | 'y' | 'xy'>('xy');

  /**
   * Scale parallax by object's Z-depth
   * When true, farther objects (higher Z) move less, creating realistic depth
   * Default: true
   */
  readonly parallaxDepthScale = input<boolean>(true);

  /**
   * Base distance for depth scaling calculation
   * Objects at this distance have factor of 1.0
   * Default: 50 (Three.js units)
   */
  readonly parallaxDepthBase = input<number>(50);

  protected setupInteraction(): void {
    if (!this.isTargetValid()) {
      console.warn('[MouseParallax] Target object is invalid');
      return;
    }

    console.log('[MouseParallax] Setup complete', {
      factor: this.parallaxFactor(),
      axis: this.parallaxAxis(),
      depthScale: this.parallaxDepthScale(),
      originalPosition: this.originalPosition,
    });

    // Apply parallax on every frame
    injectBeforeRender(() => {
      if (!this.targetObject || !this.originalPosition) return;

      const mouseX = this.mouseService.smoothMouseX();
      const mouseY = this.mouseService.smoothMouseY();
      const factor = this.parallaxFactor();
      const axis = this.parallaxAxis();

      // Calculate depth factor if enabled
      let depthFactor = 1.0;
      if (this.parallaxDepthScale()) {
        depthFactor = this.calculateDepthFactor(this.parallaxDepthBase());
      }

      // Apply parallax offset based on axis configuration
      if (axis === 'x' || axis === 'xy') {
        this.targetObject.position.x =
          this.originalPosition.x + mouseX * factor * depthFactor;
      }

      if (axis === 'y' || axis === 'xy') {
        this.targetObject.position.y =
          this.originalPosition.y + mouseY * factor * depthFactor;
      }

      // Always preserve original Z position
      this.targetObject.position.z = this.originalPosition.z;
    });
  }
}
