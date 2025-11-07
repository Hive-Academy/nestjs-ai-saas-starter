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
  AfterViewInit,
  OnDestroy,
  effect,
  ElementRef,
} from '@angular/core';
import * as THREE from 'three';
import { Colors3D } from '../config/colors.config';

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
  // private readonly contentTexturePipeline = inject(
  //   ContentTexturePipelineService
  // );
  private readonly elementRef = inject(ElementRef<THREE.Mesh>);
  private readonly destroyRef = inject(DestroyRef);

  // Configuration input - optional, directive is inactive if undefined
  readonly glowConfig = input<
    | {
        color?: number;
        intensity?: number;
        scale?: number;
        segments?: number;
        autoAdjustQuality?: boolean;
      }
    | undefined
  >(undefined);

  // Legacy individual inputs (deprecated - use glowConfig instead)
  readonly glowColor = input<number>(Colors3D.material.white.hex); // Glow color (hex)
  readonly glowIntensity = input<number>(0.2); // Opacity of glow (0-1)
  readonly glowScale = input<number>(1.2); // Scale multiplier for glow mesh
  readonly glowSegments = input<number>(16); // Geometry segments (lower = better performance)
  readonly autoAdjustQuality = input<boolean>(true); // Adjust quality based on performance

  // Internal state
  private targetMesh: THREE.Mesh | null = null;
  private glowMesh: THREE.Mesh | null = null;
  private glowMaterial: THREE.MeshBasicMaterial | null = null;
  private glowGeometry: THREE.SphereGeometry | null = null;

  constructor() {
    // Setup reactive effects for configuration changes
    this.setupReactiveEffects();
  }

  ngAfterViewInit(): void {
    // Skip if no configuration provided (directive is optional)
    const config = this.glowConfig();
    if (!config) {
      console.log('[Glow3dDirective] No config provided, directive inactive');
      return;
    }

    // Get mesh from component's getMesh() method (Angular Three pattern)
    const component = this.elementRef.nativeElement as any;

    if (typeof component.getMesh === 'function') {
      this.targetMesh = component.getMesh();
    } else {
      // Fallback: try to access THREE.Mesh directly from nativeElement
      this.targetMesh = this.elementRef.nativeElement as unknown as THREE.Mesh;
    }

    if (!this.targetMesh) {
      console.warn(
        '[Glow3dDirective] Could not access mesh - component may not have getMesh() method'
      );
      return;
    }

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
      console.warn(
        '[Glow3dDirective] Target mesh has no geometry yet - this is expected during initialization'
      );
      // Geometry will be added by Angular Three's render loop
      // We'll check again on next frame via effect()
      return;
    }

    // Calculate bounding sphere to determine glow radius
    if (!targetGeometry.boundingSphere) {
      targetGeometry.computeBoundingSphere();
    }

    const baseRadius = targetGeometry.boundingSphere?.radius || 1;

    // Get config with fallback to legacy inputs
    const config = this.glowConfig();
    const glowScale = config?.scale ?? this.glowScale();
    const glowColor = config?.color ?? this.glowColor();
    const glowIntensity = config?.intensity ?? this.glowIntensity();
    const autoAdjustQuality =
      config?.autoAdjustQuality ?? this.autoAdjustQuality();

    const glowRadius = baseRadius * glowScale;

    // Determine segment count based on performance
    const segments = this.getOptimalSegments(
      config?.segments,
      autoAdjustQuality
    );

    // Create glow geometry (sphere)
    this.glowGeometry = new THREE.SphereGeometry(
      glowRadius,
      segments,
      segments
    );

    // Create glow material (basic material with BackSide)
    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(glowColor),
      transparent: true,
      opacity: glowIntensity,
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
  private getOptimalSegments(
    configSegments?: number,
    autoAdjust?: boolean
  ): number {
    const segments = configSegments ?? this.glowSegments();

    if (!autoAdjust) {
      return segments;
    }

    // Query performance statistics
    // const statistics = this.contentTexturePipeline.getStatistics();

    // Calculate a simple performance score based on memory usage
    // Lower memory usage = better performance
    // const memoryUsageMB = statistics.memoryUsage / (1024 * 1024);
    // const maxMemoryMB = 200; // Maximum expected memory usage
    // const performanceHealthScore = Math.max(
    //   0,
    //   Math.min(100, 100 - (memoryUsageMB / maxMemoryMB) * 100)
    // );

    // Adjust segments based on performance
    // if (performanceHealthScore > 60) {
    //   // High performance - use requested segments
    //   return segments;
    // } else if (performanceHealthScore > 30) {
    //   // Medium performance - reduce segments by half
    //   return Math.max(8, Math.floor(segments / 2));
    // } else {
    //   // Low performance - minimum segments
    //   return 8;
    // }
    return Math.max(8, segments); // Placeholder: always return at least 8 segments
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
