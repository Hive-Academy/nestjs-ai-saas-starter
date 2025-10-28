/**
 * MouseInteractionService - Centralized Mouse Tracking
 *
 * Singleton service that tracks mouse position once for all interaction directives.
 * Provides normalized coordinates (-1 to 1) with optional smoothing.
 *
 * Benefits:
 * - Single event listener for performance
 * - Shared state across all directives
 * - Reactive signals for automatic updates
 * - Optional smoothing for professional animations
 *
 * Usage:
 * ```typescript
 * @Directive({ ... })
 * export class MyMouseDirective {
 *   private readonly mouseService = inject(MouseInteractionService);
 *
 *   constructor() {
 *     effect(() => {
 *       const x = this.mouseService.mouseX();
 *       const y = this.mouseService.mouseY();
 *       // Use mouse position...
 *     });
 *   }
 * }
 * ```
 */

import { Injectable, signal, DestroyRef, inject } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root',
})
export class MouseInteractionService {
  private readonly destroyRef = inject(DestroyRef);

  // Raw mouse position (normalized -1 to 1)
  readonly mouseX = signal(0);
  readonly mouseY = signal(0);

  // Smoothed mouse position (interpolated)
  readonly smoothMouseX = signal(0);
  readonly smoothMouseY = signal(0);

  // Smoothing configuration
  private smoothingFactor = 5; // Interpolation speed
  private clock = new THREE.Clock();

  // Animation frame ID for cleanup
  private animationFrameId: number | null = null;

  // Mouse tracking state
  private targetX = 0;
  private targetY = 0;
  private currentX = 0;
  private currentY = 0;

  // Reference counting for initialization
  private refCount = 0;
  private mouseMoveHandler?: (event: MouseEvent) => void;

  /**
   * Initialize mouse tracking (called by first directive)
   */
  initialize(): void {
    this.refCount++;

    // Only initialize once
    if (this.refCount > 1) return;

    console.log('[MouseInteractionService] Initializing mouse tracking');

    // Setup mouse tracking
    if (typeof window !== 'undefined') {
      this.mouseMoveHandler = this.handleMouseMove.bind(this);
      window.addEventListener('mousemove', this.mouseMoveHandler, {
        passive: true,
      });
    }

    // Start smoothing animation loop
    this.startSmoothingLoop();

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      this.cleanup();
    });
  }

  /**
   * Decrement reference count (called by directive ngOnDestroy)
   */
  destroy(): void {
    this.refCount = Math.max(0, this.refCount - 1);

    // Only cleanup when no more references
    if (this.refCount === 0) {
      this.cleanup();
    }
  }

  /**
   * Set smoothing factor for interpolation
   * @param factor - Higher = faster transitions (default: 5)
   */
  setSmoothingFactor(factor: number): void {
    this.smoothingFactor = factor;
  }

  /**
   * Get current smoothing factor
   */
  getSmoothingFactor(): number {
    return this.smoothingFactor;
  }

  /**
   * Handle mouse move events
   */
  private handleMouseMove(event: MouseEvent): void {
    // Normalize mouse position to -1 to 1 range
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update raw position immediately
    this.mouseX.set(x);
    this.mouseY.set(y);

    // Update target for smoothing
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * Start smoothing animation loop
   */
  private startSmoothingLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      const deltaTime = this.clock.getDelta();
      const smoothingFactor = deltaTime * this.smoothingFactor;

      // Smooth interpolation
      this.currentX += (this.targetX - this.currentX) * smoothingFactor;
      this.currentY += (this.targetY - this.currentY) * smoothingFactor;

      // Update smoothed signals
      this.smoothMouseX.set(this.currentX);
      this.smoothMouseY.set(this.currentY);
    };

    animate();
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    console.log('[MouseInteractionService] Cleaning up mouse tracking');

    // Remove event listener
    if (this.mouseMoveHandler && typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this.mouseMoveHandler);
      this.mouseMoveHandler = undefined;
    }

    // Cancel animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Reset state
    this.mouseX.set(0);
    this.mouseY.set(0);
    this.smoothMouseX.set(0);
    this.smoothMouseY.set(0);
    this.targetX = 0;
    this.targetY = 0;
    this.currentX = 0;
    this.currentY = 0;
  }
}
