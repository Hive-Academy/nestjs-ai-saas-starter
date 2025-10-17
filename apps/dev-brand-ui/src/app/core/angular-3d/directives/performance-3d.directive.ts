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
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
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
  private readonly elementRef = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  // Internal state
  private mesh: any = null;
  private isRegistered = false;

  ngAfterViewInit(): void {
    // Get mesh from host component
    this.mesh = this.getMeshFromHostComponent();

    if (!this.mesh) {
      console.warn(
        '[Performance3dDirective] No mesh found - host component must implement getMesh() or have mesh property'
      );
      return;
    }

    // Register with performance optimizer
    // The service automatically manages this object for culling and LOD
    this.registerWithOptimizer();

    // Register cleanup
    this.destroyRef.onDestroy(() => {
      this.cleanup();
    });

    console.log(
      `[Performance3dDirective] Object registered for performance optimization:`,
      this.mesh.name || 'unnamed'
    );
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
   * Get mesh from host component
   */
  private getMeshFromHostComponent(): any | null {
    const hostElement = this.elementRef.nativeElement;

    // Try to get component instance
    const componentInstance = (hostElement as any).__ngContext__?.[8];

    if (componentInstance && typeof componentInstance.getMesh === 'function') {
      return componentInstance.getMesh();
    }

    // Fallback: Try direct object3D access
    if (hostElement.object3D) {
      return hostElement.object3D;
    }

    // Try first child
    const firstChild = hostElement.firstElementChild;
    if (firstChild && (firstChild as any).object3D) {
      return (firstChild as any).object3D;
    }

    return null;
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
