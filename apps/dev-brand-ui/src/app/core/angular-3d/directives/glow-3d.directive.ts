/**
 * Glow3dDirective - Declarative Glow Effect
 *
 * Adds glow/bloom effect to 3D objects using BackSide sphere geometry technique.
 * Creates an outer glow mesh that renders behind the main object for a halo effect.
 *
 * Features:
 * - Signal-based reactive configuration
 * - Automatic glow mesh creation and cleanup
 * - Configurable glow color, intensity, and scale
 * - Performance-aware (adjusts quality based on performance health)
 * - Works with any component that exposes getMesh() method
 *
 * Usage:
 * ```html
 * <!-- Simple glow with defaults -->
 * <app-floating-sphere glow3d />
 *
 * <!-- Customized glow effect -->
 * <app-floating-sphere
 *   glow3d
 *   [glowColor]="0xff3333"
 *   [glowIntensity]="0.4"
 *   [glowScale]="1.3"
 * />
 * ```
 *
 * @example
 * ```html
 * <!-- Combine with other directives -->
 * <app-floating-sphere
 *   [position]="[0, 1, 0]"
 *   [radius]="1"
 *   [color]="0xff0000"
 *   float3d
 *   performance3d
 *   glow3d
 *   [glowColor]="0xff6666"
 *   [glowIntensity]="0.3"
 * />
 * ```
 */

import {
  Directive,
  input,
  inject,
  DestroyRef,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  effect,
} from '@angular/core';
import * as THREE from 'three';
import { ContentTexturePipelineService } from '../services/content-texture-pipeline.service';

/**
 * Glow3dDirective
 *
 * Creates a glow effect by adding a BackSide sphere mesh around the target object.
 * The glow mesh uses MeshBasicMaterial with transparency for a halo effect.
 */
@Directive({
  selector: '[glow3d]',
  standalone: true,
})
export class Glow3dDirective implements AfterViewInit, OnDestroy {
  // Dependency injection
  private readonly contentTexturePipeline = inject(
    ContentTexturePipelineService
  );
  private readonly elementRef = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  // Configuration inputs with smart defaults
  readonly glowColor = input<number>(0xffffff); // Glow color (hex)
  readonly glowIntensity = input<number>(0.2); // Opacity of glow (0-1)
  readonly glowScale = input<number>(1.2); // Scale multiplier for glow mesh
  readonly glowSegments = input<number>(16); // Geometry segments (lower = better performance)
  readonly autoAdjustQuality = input<boolean>(true); // Adjust quality based on performance

  // Internal state
  private targetMesh: any = null;
  private glowMesh: THREE.Mesh | null = null;
  private glowMaterial: THREE.MeshBasicMaterial | null = null;
  private glowGeometry: THREE.SphereGeometry | null = null;

  constructor() {
    // Setup reactive effects for configuration changes
    this.setupReactiveEffects();
  }

  ngAfterViewInit(): void {
    // Get target mesh from host component
    this.targetMesh = this.getMeshFromHostComponent();

    if (!this.targetMesh) {
      console.warn(
        '[Glow3dDirective] No mesh found - host component must implement getMesh() or have mesh property'
      );
      return;
    }

    // Create glow effect
    this.createGlowEffect();

    // Register cleanup
    this.destroyRef.onDestroy(() => {
      this.cleanup();
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Create glow effect mesh and add to target
   */
  private createGlowEffect(): void {
    if (!this.targetMesh) return;

    // Get target geometry to determine glow size
    const targetGeometry = this.targetMesh.geometry;
    if (!targetGeometry) {
      console.warn('[Glow3dDirective] Target mesh has no geometry');
      return;
    }

    // Calculate bounding sphere to determine glow radius
    if (!targetGeometry.boundingSphere) {
      targetGeometry.computeBoundingSphere();
    }

    const baseRadius = targetGeometry.boundingSphere?.radius || 1;
    const glowRadius = baseRadius * this.glowScale();

    // Determine segment count based on performance
    const segments = this.getOptimalSegments();

    // Create glow geometry (sphere)
    this.glowGeometry = new THREE.SphereGeometry(
      glowRadius,
      segments,
      segments
    );

    // Create glow material (basic material with BackSide)
    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.glowColor()),
      transparent: true,
      opacity: this.glowIntensity(),
      side: THREE.BackSide, // Render from inside-out for glow effect
      depthWrite: false, // Don't write to depth buffer for proper transparency
    });

    // Create glow mesh
    this.glowMesh = new THREE.Mesh(this.glowGeometry, this.glowMaterial);
    this.glowMesh.name = `glow-${this.targetMesh.name || 'unnamed'}`;

    // Add glow mesh as child of target mesh
    // This ensures glow follows target transformations
    this.targetMesh.add(this.glowMesh);

    console.log(
      `[Glow3dDirective] Glow effect created for mesh:`,
      this.targetMesh.name || 'unnamed',
      `- Radius: ${glowRadius.toFixed(2)}, Segments: ${segments}`
    );
  }

  /**
   * Determine optimal segment count based on performance
   */
  private getOptimalSegments(): number {
    if (!this.autoAdjustQuality()) {
      return this.glowSegments();
    }

    // Query performance statistics
    const statistics = this.contentTexturePipeline.getStatistics();

    // Calculate a simple performance score based on memory usage
    // Lower memory usage = better performance
    const memoryUsageMB = statistics.memoryUsage / (1024 * 1024);
    const maxMemoryMB = 200; // Maximum expected memory usage
    const performanceHealthScore = Math.max(
      0,
      Math.min(100, 100 - (memoryUsageMB / maxMemoryMB) * 100)
    );

    // Adjust segments based on performance
    if (performanceHealthScore > 60) {
      // High performance - use requested segments
      return this.glowSegments();
    } else if (performanceHealthScore > 30) {
      // Medium performance - reduce segments by half
      return Math.max(8, Math.floor(this.glowSegments() / 2));
    } else {
      // Low performance - minimum segments
      return 8;
    }
  }

  /**
   * Get mesh from host component
   */
  private getMeshFromHostComponent(): any | null {
    const hostElement = this.elementRef.nativeElement;

    console.log('[Glow3dDirective] Attempting to get mesh from host component');

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
            `[Glow3dDirective] Found component instance at index ${index} with getMesh()`
          );
          const mesh = componentInstance.getMesh();
          if (mesh) {
            console.log(
              '[Glow3dDirective] Successfully retrieved mesh via getMesh()'
            );
            return mesh;
          }
        }
      }
    }

    // Strategy 2: Try to find ngt-mesh child element
    const ngtMesh = hostElement.querySelector('ngt-mesh');
    if (ngtMesh && (ngtMesh as any).object3D) {
      console.log('[Glow3dDirective] Found ngt-mesh child with object3D');
      return (ngtMesh as any).object3D;
    }

    // Strategy 3: Try direct object3D access
    if (hostElement.object3D) {
      console.log('[Glow3dDirective] Found object3D on host element');
      return hostElement.object3D;
    }

    // Strategy 4: Try first child
    const firstChild = hostElement.firstElementChild;
    if (firstChild && (firstChild as any).object3D) {
      console.log('[Glow3dDirective] Found object3D on first child');
      return (firstChild as any).object3D;
    }

    // Strategy 5: Delayed retry
    console.warn(
      '[Glow3dDirective] No mesh found on initial attempt, will retry after delay'
    );
    setTimeout(() => {
      const retryMesh = this.retryGetMesh();
      if (retryMesh) {
        this.targetMesh = retryMesh;
        this.createGlowEffect();
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
        '[Glow3dDirective] Retry successful - found ngt-mesh with object3D'
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
              '[Glow3dDirective] Retry successful - got mesh via getMesh()'
            );
            return mesh;
          }
        }
      }
    }

    console.error('[Glow3dDirective] Retry failed - still no mesh found');
    return null;
  }

  /**
   * Setup reactive effects for input changes
   */
  private setupReactiveEffects(): void {
    // React to glow color changes
    effect(() => {
      const color = this.glowColor();
      if (this.glowMaterial) {
        this.glowMaterial.color.setHex(color);
        this.glowMaterial.needsUpdate = true;
      }
    });

    // React to glow intensity changes
    effect(() => {
      const intensity = this.glowIntensity();
      if (this.glowMaterial) {
        this.glowMaterial.opacity = intensity;
        this.glowMaterial.needsUpdate = true;
      }
    });

    // React to glow scale changes
    effect(() => {
      const scale = this.glowScale();
      if (this.glowMesh && this.targetMesh?.geometry?.boundingSphere) {
        const baseRadius = this.targetMesh.geometry.boundingSphere.radius || 1;
        const glowRadius = baseRadius * scale;
        this.glowMesh.scale.setScalar(glowRadius / baseRadius);
      }
    });
  }

  /**
   * Cleanup glow resources
   */
  private cleanup(): void {
    // Remove glow mesh from target
    if (this.glowMesh && this.targetMesh) {
      this.targetMesh.remove(this.glowMesh);
    }

    // Dispose of glow resources
    if (this.glowGeometry) {
      this.glowGeometry.dispose();
      this.glowGeometry = null;
    }

    if (this.glowMaterial) {
      this.glowMaterial.dispose();
      this.glowMaterial = null;
    }

    this.glowMesh = null;

    console.log('[Glow3dDirective] Glow effect cleanup completed');
  }

  /**
   * Public API: Update glow color
   */
  updateGlowColor(color: number): void {
    if (this.glowMaterial) {
      this.glowMaterial.color.setHex(color);
      this.glowMaterial.needsUpdate = true;
    }
  }

  /**
   * Public API: Update glow intensity
   */
  updateGlowIntensity(intensity: number): void {
    if (this.glowMaterial) {
      this.glowMaterial.opacity = Math.max(0, Math.min(1, intensity));
      this.glowMaterial.needsUpdate = true;
    }
  }

  /**
   * Public API: Toggle glow visibility
   */
  toggleGlow(visible: boolean): void {
    if (this.glowMesh) {
      this.glowMesh.visible = visible;
    }
  }
}
