/**
 * ElementMouseParallaxDirective - Apply mouse parallax to individual Three.js elements
 *
 * Tracks mouse movement and applies depth-based parallax offset to THIS element only.
 * Farther objects (higher Z) move less, creating realistic depth perception.
 *
 * ✅ ELEMENT-LEVEL: Apply to individual <ngt-group>, <ngt-mesh>, or custom components
 * ⚠️ Different from SceneMouseParallaxDirective which affects the entire scene
 *
 * Features:
 * - Per-element parallax control (not scene-wide)
 * - Depth-based movement (farther = less movement)
 * - Configurable intensity multiplier
 * - Preserves original position
 *
 * Usage:
 * ```html
 * <ngt-group
 *   [position]="[0, 0, 35]"
 *   [elementMouseParallax]="2.0"
 * >
 *   <app-planet [radius]="18" ... />
 * </ngt-group>
 * ```
 */

import {
  Directive,
  input,
  signal,
  ElementRef,
  inject,
  OnDestroy,
} from '@angular/core';
import { injectBeforeRender } from 'angular-three';
import * as THREE from 'three';

@Directive({
  selector: '[elementMouseParallax]',
  standalone: true,
})
export class ElementMouseParallaxDirective implements OnDestroy {
  private readonly elementRef = inject(ElementRef);

  // Mouse position (normalized -1 to 1)
  private readonly mouseX = signal(0);
  private readonly mouseY = signal(0);

  // Parallax intensity (0 = disabled, 1 = normal, 2 = strong)
  readonly elementMouseParallax = input.required<number>();

  // Store original position
  private originalPosition: THREE.Vector3 | null = null;
  private mouseMoveHandler?: (event: MouseEvent) => void;

  constructor() {
    // Track mouse movement
    if (typeof window !== 'undefined') {
      this.mouseMoveHandler = this.handleMouseMove.bind(this);
      window.addEventListener('mousemove', this.mouseMoveHandler);
    }

    // Apply parallax offset on every frame
    injectBeforeRender(() => {
      const object = this.elementRef.nativeElement as THREE.Object3D;

      // Safety checks
      if (!object) {
        console.warn('[ElementMouseParallax] No element reference found');
        return;
      }

      if (!object.position) {
        console.warn(
          '[ElementMouseParallax] Element has no position property',
          object
        );
        return;
      }

      // Store original position on first run
      if (!this.originalPosition) {
        this.originalPosition = object.position.clone();
        console.log('[ElementMouseParallax] Initialized', {
          position: this.originalPosition,
          intensity: this.elementMouseParallax(),
          type: object.type,
        });
      }

      const intensity = this.elementMouseParallax();
      if (intensity === 0) {
        // Reset to original position if disabled
        object.position.copy(this.originalPosition);
        return;
      }

      // Calculate depth factor (farther objects move less)
      const depth = this.originalPosition.z;
      const depthFactor = Math.abs(depth) / 50; // Normalize based on typical camera distance

      // Apply parallax offset
      const parallaxX = this.mouseX() * intensity * depthFactor;
      const parallaxY = this.mouseY() * intensity * depthFactor;

      // Update position
      object.position.x = this.originalPosition.x + parallaxX;
      object.position.y = this.originalPosition.y - parallaxY;
      object.position.z = this.originalPosition.z;
    });
  }

  private handleMouseMove(event: MouseEvent): void {
    // Normalize mouse position to -1 to 1 range
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = (event.clientY / window.innerHeight) * 2 - 1;

    this.mouseX.set(x);
    this.mouseY.set(y);
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined' && this.mouseMoveHandler) {
      window.removeEventListener('mousemove', this.mouseMoveHandler);
    }
  }
}
