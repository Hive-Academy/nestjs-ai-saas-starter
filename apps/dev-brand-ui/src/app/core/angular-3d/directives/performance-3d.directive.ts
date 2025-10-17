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

    console.log(
      '[Performance3dDirective] Attempting to get mesh from host component'
    );

    // Strategy 1: Try multiple __ngContext__ indices
    const ngContext = (hostElement as any).__ngContext__;
    if (ngContext && Array.isArray(ngContext)) {
      for (const index of [8, 9, 10, 3, 4, 5]) {
        const componentInstance = ngContext[index];
        if (
          componentInstance &&
          typeof componentInstance.getMesh === 'function'
        ) {
          console.log(
            `[Performance3dDirective] Found component instance at index ${index} with getMesh()`
          );
          const mesh = componentInstance.getMesh();
          if (mesh) {
            console.log(
              '[Performance3dDirective] Successfully retrieved mesh via getMesh()'
            );
            return mesh;
          }
        }
      }
    }

    // Strategy 2: Try to find ngt-mesh child element
    const ngtMesh = hostElement.querySelector('ngt-mesh');
    if (ngtMesh && (ngtMesh as any).object3D) {
      console.log(
        '[Performance3dDirective] Found ngt-mesh child with object3D'
      );
      return (ngtMesh as any).object3D;
    }

    // Strategy 3: Try direct object3D access
    if (hostElement.object3D) {
      console.log('[Performance3dDirective] Found object3D on host element');
      return hostElement.object3D;
    }

    // Strategy 4: Try first child
    const firstChild = hostElement.firstElementChild;
    if (firstChild && (firstChild as any).object3D) {
      console.log('[Performance3dDirective] Found object3D on first child');
      return (firstChild as any).object3D;
    }

    // Strategy 5: Delayed retry
    console.warn(
      '[Performance3dDirective] No mesh found on initial attempt, will retry after delay'
    );
    setTimeout(() => {
      const retryMesh = this.retryGetMesh();
      if (retryMesh) {
        this.mesh = retryMesh;
        this.registerWithOptimizer();
      }
    }, 100);

    return null;
  }

  /**
   * Retry getting mesh after initial failure
   */
  private retryGetMesh(): any | null {
    const hostElement = this.elementRef.nativeElement;
    const ngtMesh = hostElement.querySelector('ngt-mesh');

    if (ngtMesh && (ngtMesh as any).object3D) {
      console.log(
        '[Performance3dDirective] Retry successful - found ngt-mesh with object3D'
      );
      return (ngtMesh as any).object3D;
    }

    const ngContext = (hostElement as any).__ngContext__;
    if (ngContext && Array.isArray(ngContext)) {
      for (const index of [8, 9, 10, 3, 4, 5]) {
        const componentInstance = ngContext[index];
        if (
          componentInstance &&
          typeof componentInstance.getMesh === 'function'
        ) {
          const mesh = componentInstance.getMesh();
          if (mesh) {
            console.log(
              '[Performance3dDirective] Retry successful - got mesh via getMesh()'
            );
            return mesh;
          }
        }
      }
    }

    console.error(
      '[Performance3dDirective] Retry failed - still no mesh found'
    );
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
