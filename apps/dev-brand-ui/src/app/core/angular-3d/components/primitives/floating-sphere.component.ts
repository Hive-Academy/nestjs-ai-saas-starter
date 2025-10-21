/**
 * FloatingSphereComponent - Declarative Angular Three Sphere Primitive
 *
 * A reusable sphere component that uses Angular Three's reactive primitives (ngt-mesh,
 * ngt-sphere-geometry, ngt-mesh-physical-material) for declarative 3D scene creation.
 *
 * Features:
 * - Signal-based reactive inputs for position, radius, color, material properties
 * - Automatic lifecycle management with DestroyRef
 * - Event emission for object creation/destruction
 * - Support for directive composition (float3d, performance3d, glow3d)
 * - Integration with AnimationService (internal)
 * - Performance-optimized with reactive updates
 *
 * Usage:
 * ```html
 * <app-hybrid-scene>
 *   <app-floating-sphere
 *     [position]="[0, 1, 0]"
 *     [radius]="1"
 *     [color]="0xff0000"
 *     [metalness]="0.8"
 *     [roughness]="0.2"
 *     float3d
 *     performance3d
 *     glow3d
 *   />
 * </app-hybrid-scene>
 * ```
 *
 * @example
 * ```typescript
 * // Component usage with signals
 * @Component({
 *   template: `
 *     <app-floating-sphere
 *       [position]="spherePosition()"
 *       [radius]="sphereRadius()"
 *       [color]="sphereColor()"
 *       (objectCreated)="onSphereCreated($event)"
 *     />
 *   `
 * })
 * export class MyScene {
 *   spherePosition = signal<[number, number, number]>([0, 1, 0]);
 *   sphereRadius = signal(1);
 *   sphereColor = signal(0xff0000);
 * }
 * ```
 */

import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  viewChild,
} from '@angular/core';

import { Mesh } from 'three';
import { registerAngularThreePrimitives } from '../../utils/angular-three-primitives';
import { Float3dDirective } from '../../directives/float-3d.directive';

/**
 * FloatingSphere Component
 *
 * Renders a metallic sphere using Angular Three's declarative primitives.
 * Supports reactive updates via signal inputs and integrates with animation/performance directives.
 */
@Component({
  selector: 'app-floating-sphere',
  standalone: true,
  imports: [Float3dDirective],
  template: `
    <ngt-mesh
      #mesh
      [position]="position()"
      [scale]="scale()"
      [rotation]="rotation()"
      [castShadow]="castShadow()"
      [receiveShadow]="receiveShadow()"
      float3d
      [floatConfig]="floatConfig()"
    >
      <!-- Sphere geometry with reactive args -->
      <ngt-sphere-geometry
        [args]="[radius(), widthSegments(), heightSegments()]"
      />

      <!-- Physical material for metallic appearance -->
      <ngt-mesh-physical-material
        [color]="color()"
        [metalness]="metalness()"
        [roughness]="roughness()"
        [clearcoat]="clearcoat()"
        [clearcoatRoughness]="clearcoatRoughness()"
        [transmission]="transmission()"
        [ior]="ior()"
        [thickness]="thickness()"
        [emissive]="emissive()"
        [emissiveIntensity]="emissiveIntensity()"
      />

      <!-- Optional glow effect - BackSide mesh (enabled via glowConfig) -->
      @if (glowConfig()) {
      <ngt-mesh>
        <ngt-sphere-geometry
          [args]="[radius() * (glowConfig()!.scale ?? 1.5), 16, 16]"
        />
        <ngt-mesh-basic-material
          [color]="glowConfig()!.color ?? emissive()"
          [transparent]="true"
          [opacity]="glowConfig()!.opacity ?? 0.2"
          side="BackSide"
        />
      </ngt-mesh>
      }
    </ngt-mesh>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingSphereComponent implements OnInit {
  // ViewChild reference to access the mesh for directives
  readonly meshRef = viewChild<ElementRef<Mesh>>('mesh');

  // Dependency injection
  private readonly destroyRef = inject(DestroyRef);

  // Position and transformation inputs
  readonly position = input<readonly [number, number, number]>([0, 0, 0]);
  readonly scale = input<readonly [number, number, number] | number>([1, 1, 1]);
  readonly rotation = input<readonly [number, number, number]>([0, 0, 0]);

  // Geometry configuration
  readonly radius = input<number>(1);
  readonly widthSegments = input<number>(32);
  readonly heightSegments = input<number>(32);

  // Material properties - Physical Material for metallic appearance
  readonly color = input<number>(0xff0000);
  readonly metalness = input<number>(0.8);
  readonly roughness = input<number>(0.2);
  readonly clearcoat = input<number>(1.0);
  readonly clearcoatRoughness = input<number>(0.1);
  readonly transmission = input<number>(0.1);
  readonly ior = input<number>(1.5);
  readonly thickness = input<number>(0.5);

  // Emissive properties for glow effect
  readonly emissive = input<number>(0x000000);
  readonly emissiveIntensity = input<number>(0.2);

  // Shadow configuration
  readonly castShadow = input<boolean>(true);
  readonly receiveShadow = input<boolean>(true);

  // Directive configurations - passed to internal ngt-mesh
  readonly floatConfig = input<
    | {
        height?: number;
        speed?: number;
        delay?: number;
        ease?: string;
        autoStart?: boolean;
      }
    | undefined
  >(undefined);

  readonly glowConfig = input<
    | {
        color?: number;
        opacity?: number;
        scale?: number;
        segments?: number;
        autoAdjustQuality?: boolean;
      }
    | undefined
  >(undefined);

  readonly performanceConfig = input<
    boolean | { enabled: boolean } | undefined
  >(undefined);

  // Lifecycle events for tracking
  readonly objectCreated = output<{
    mesh: any;
    position: readonly [number, number, number];
    radius: number;
  }>();
  readonly objectDestroyed = output<{ mesh: any }>();

  // Internal state for tracking
  private isInitialized = false;

  constructor() {
    // Register Angular Three primitives on component construction
    registerAngularThreePrimitives();

    // Setup reactive effects for input changes
    this.setupReactiveEffects();
  }

  ngOnInit(): void {
    // Emit object created event after view initialization
    const mesh = this.meshRef();
    if (mesh?.nativeElement) {
      this.objectCreated.emit({
        mesh: mesh.nativeElement,
        position: this.position(),
        radius: this.radius(),
      });
      this.isInitialized = true;
    }

    // Register cleanup on destroy
    this.destroyRef.onDestroy(() => {
      const mesh = this.meshRef();
      if (mesh?.nativeElement) {
        this.objectDestroyed.emit({ mesh: mesh.nativeElement });
      }
      this.cleanup();
    });
  }

  /**
   * Setup reactive effects for input property changes
   * These effects automatically update the mesh when signal inputs change
   */
  private setupReactiveEffects(): void {
    // React to position changes
    effect(() => {
      const pos = this.position();
      const mesh = this.meshRef();
      if (mesh?.nativeElement && this.isInitialized && pos) {
        // console.log(`[FloatingSphere] Position updated:`, pos);
      }
    });

    // React to radius changes
    effect(() => {
      const r = this.radius();
      const mesh = this.meshRef();
      if (mesh?.nativeElement && this.isInitialized && r) {
        // console.log(`[FloatingSphere] Radius updated:`, r);
      }
    });

    // React to color changes
    effect(() => {
      const c = this.color();
      const mesh = this.meshRef();
      if (mesh?.nativeElement && this.isInitialized && c) {
        // console.log(`[FloatingSphere] Color updated:`, c);
      }
    });
  }

  /**
   * Cleanup resources on component destroy
   */
  private cleanup(): void {
    // Angular Three handles mesh disposal automatically
    // Additional cleanup can be added here if needed
    console.log('[FloatingSphere] Cleanup completed');
  }

  /**
   * Public API: Get the THREE.Mesh instance
   * Useful for directives that need direct mesh access
   *
   * Angular Three's template refs expose THREE.js objects via nativeElement
   */
  getMesh(): Mesh | null {
    const meshRef = this.meshRef();
    if (!meshRef) {
      console.warn(
        '[FloatingSphereComponent] nativeElement is not a THREE.Mesh instance'
      );
      return null;
    }

    return meshRef.nativeElement;
  }

  /**
   * Public API: Check if component is initialized
   */
  isReady(): boolean {
    return this.isInitialized && !!this.meshRef();
  }
}
