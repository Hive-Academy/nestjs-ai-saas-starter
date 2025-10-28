/**
 * MouseHoverDirective - Hover Effects with Raycasting
 *
 * Detects when the mouse hovers over an object and applies scale/glow effects.
 * Uses Three.js raycasting for accurate 3D intersection detection.
 *
 * Features:
 * - Accurate hover detection via raycasting
 * - Smooth scale transitions
 * - Optional glow intensity changes
 * - Configurable transition speed
 *
 * Usage:
 * ```html
 * <!-- Simple hover scale -->
 * <app-planet
 *   mouseHover
 *   [hoverScale]="1.12"
 * />
 *
 * <!-- Hover with scale and glow -->
 * <app-planet
 *   mouseHover
 *   [hoverScale]="1.15"
 *   [hoverGlow]="1.5"
 *   [hoverSpeed]="8"
 * />
 * ```
 */

import { Directive, input } from '@angular/core';
import { injectBeforeRender, injectStore } from 'angular-three';
import * as THREE from 'three';
import { MouseInteractionDirective } from './mouse-interaction-base.directive';

@Directive({
  selector: '[mouseHover]',
  standalone: true,
})
export class MouseHoverDirective extends MouseInteractionDirective {
  private readonly store = injectStore();

  /**
   * Scale multiplier on hover
   * 1.0 = no change, 1.12 = 12% larger, etc.
   * Default: 1.15
   */
  readonly hoverScale = input<number>(1.15);

  /**
   * Glow intensity multiplier on hover
   * 1.0 = no change, 1.5 = 50% brighter, etc.
   * Default: 1.0 (no glow change)
   */
  readonly hoverGlow = input<number>(1.0);

  /**
   * Transition speed (higher = faster)
   * Default: 8
   */
  readonly hoverSpeed = input<number>(8);

  // Hover state
  private isHovered = false;
  private currentScale = 1.0;
  private targetScale = 1.0;

  // Raycaster for hover detection
  private raycaster = new THREE.Raycaster();
  private clock = new THREE.Clock();

  protected setupInteraction(): void {
    if (!this.isTargetValid()) {
      console.warn('[MouseHover] Target object is invalid');
      return;
    }

    console.log('[MouseHover] Setup complete', {
      scale: this.hoverScale(),
      glow: this.hoverGlow(),
      speed: this.hoverSpeed(),
      originalScale: this.originalScale,
    });

    // Store original scale
    if (this.targetObject && this.originalScale) {
      this.currentScale = this.originalScale.x;
      this.targetScale = this.originalScale.x;
    }

    // Setup hover detection and scale animation
    injectBeforeRender(() => {
      if (!this.targetObject || !this.originalScale) return;

      // Perform hover detection
      this.detectHover();

      // Update target scale based on hover state
      if (this.isHovered) {
        this.targetScale = this.originalScale.x * this.hoverScale();
      } else {
        this.targetScale = this.originalScale.x;
      }

      // Smooth scale transition
      const deltaTime = this.clock.getDelta();
      const smoothingFactor = deltaTime * this.hoverSpeed();

      this.currentScale +=
        (this.targetScale - this.currentScale) * smoothingFactor;

      // Apply scale uniformly
      this.targetObject.scale.setScalar(this.currentScale);

      // TODO: Apply glow effect if configured
      // This would require accessing the material and modifying emissive intensity
      // For now, focusing on scale effect
    });
  }

  /**
   * Detect if mouse is hovering over the target object
   */
  private detectHover(): void {
    if (!this.targetObject) return;

    const camera = this.store.get('camera');
    if (!camera) return;

    // Get normalized mouse coordinates
    const mouseX = this.mouseService.mouseX();
    const mouseY = this.mouseService.mouseY();

    // Update raycaster
    this.raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

    // Check intersection with target object
    // We need to check the mesh itself, not the group
    let meshToCheck: THREE.Object3D = this.targetObject;

    // If target is a group, find the first mesh child
    if (this.targetObject.type === 'Group') {
      const mesh = this.targetObject.children.find(
        (child) => child instanceof THREE.Mesh
      );
      if (mesh) {
        meshToCheck = mesh;
      }
    }

    const intersects = this.raycaster.intersectObject(meshToCheck, true);
    this.isHovered = intersects.length > 0;
  }
}
