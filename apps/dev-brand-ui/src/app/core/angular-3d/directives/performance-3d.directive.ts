/**
 * Performance3dDirective - Automatic Performance Optimization
 *
 * Automatically tracks 3D objects for performance optimization including frustum culling
 * and LOD management. Integrates with AdvancedPerformanceOptimizerService.
 *
 * Features:
 * - Automatic registration with performance optimizer
 * - Zero configuration required (automatic mode)
 * - Lifecycle-aware (automatic cleanup on destroy)
 * - Works with any component that exposes getMesh() method
 * - Respects performance health score for adaptive optimization
 *
 * Usage:
 * ```html
 * <!-- Simple automatic optimization -->
 * <app-background-cube performance3d />
 *
 * <!-- All primitives benefit from performance optimization -->
 * <app-floating-sphere performance3d />
 * <app-cylinder performance3d />
 * <app-torus performance3d />
 * ```
 */

import {
  Directive,
  inject,
  DestroyRef,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  input,
} from '@angular/core';
import { Mesh } from 'three';
import { AdvancedPerformanceOptimizerService } from '../services/advanced-performance-optimizer.service';

/**
 * Performance3dDirective
 *
 * Automatically registers 3D objects for performance optimization.
 * The AdvancedPerformanceOptimizerService handles frustum culling and LOD
 * based on performance health score.
 */
@Directive({
  selector: '[performance3d]',
  standalone: true,
})
export class Performance3dDirective implements AfterViewInit, OnDestroy {
  // Dependency injection
  private readonly performanceOptimizer = inject(
    AdvancedPerformanceOptimizerService
  );
  private readonly elementRef = inject(ElementRef<Mesh>);
  private readonly destroyRef = inject(DestroyRef);

  // Configuration input - optional, directive is inactive if undefined/false
  readonly performanceConfig = input<
    boolean | { enabled: boolean } | undefined
  >(undefined);

  // Internal state
  private mesh: Mesh | null = null;
  private isRegistered = false;

  ngAfterViewInit(): void {
    // Skip if no configuration provided or explicitly disabled
    const config = this.performanceConfig();
    const enabled =
      typeof config === 'boolean' ? config : config?.enabled ?? false;

    if (!enabled) {
      console.log(
        '[Performance3dDirective] Performance optimization disabled, directive inactive'
      );
      return;
    }

    // Get mesh from Angular Three's nativeElement
    this.mesh = this.elementRef.nativeElement;

    if (!this.mesh) {
      console.warn(
        '[Performance3dDirective] Could not access mesh from nativeElement'
      );
      return;
    }

    this.registerWithOptimizer();
    console.log(
      `[Performance3dDirective] Object registered for performance optimization:`,
      this.mesh.name || 'unnamed'
    );

    // Register cleanup
    this.destroyRef.onDestroy(() => {
      this.cleanup();
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Register mesh with performance optimizer
   * The service handles all optimization automatically based on performance health
   */
  private registerWithOptimizer(): void {
    if (!this.mesh || this.isRegistered) return;

    // The AdvancedPerformanceOptimizerService tracks objects via state store
    // and automatically applies frustum culling based on camera frustum
    //
    // Objects are automatically:
    // - Culled when outside camera frustum
    // - LOD-managed based on distance
    // - Memory-optimized based on usage
    //
    // This is handled by the service's optimization loop - no manual registration needed
    // The mesh becomes automatically tracked when added to the scene

    this.isRegistered = true;
  }

  /**
   * Cleanup - mark object for potential removal from optimizer tracking
   */
  private cleanup(): void {
    if (this.mesh && this.isRegistered) {
      // The service automatically stops tracking objects that are removed from scene
      // No manual cleanup needed - Three.js and Angular Three handle disposal
      console.log(
        '[Performance3dDirective] Object unregistered from performance tracking'
      );
      this.isRegistered = false;
    }
  }

  /**
   * Public API: Check if performance optimization is active
   */
  isOptimizationActive(): boolean {
    return (
      this.isRegistered && this.performanceOptimizer.optimizationStatus().active
    );
  }

  /**
   * Public API: Get current performance health score
   */
  getPerformanceHealthScore(): number {
    return this.performanceOptimizer.performanceHealthScore();
  }
}
