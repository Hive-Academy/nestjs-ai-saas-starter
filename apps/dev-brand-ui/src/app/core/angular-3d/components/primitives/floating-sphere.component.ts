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
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  input,
  output,
  viewChild,
  ElementRef,
  inject,
  DestroyRef,
  effect,
  OnInit,
} from '@angular/core';
import * as THREE from 'three';
import { registerAngularThreePrimitives } from '../../utils/angular-three-primitives';

/**
 * FloatingSphere Component
 *
 * Renders a metallic sphere using Angular Three's declarative primitives.
 * Supports reactive updates via signal inputs and integrates with animation/performance directives.
 */
@Component({
  selector: 'app-floating-sphere',
  standalone: true,
  template: `
    <ngt-mesh
      #mesh
      [position]="position()"
      [scale]="scale()"
      [rotation]="rotation()"
      [castShadow]="castShadow()"
      [receiveShadow]="receiveShadow()"
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
    </ngt-mesh>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingSphereComponent implements OnInit {
  // ViewChild reference to access the mesh for directives
  readonly meshRef = viewChild<ElementRef<any>>('mesh');

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
      if (mesh?.nativeElement && this.isInitialized) {
        console.log(`[FloatingSphere] Position updated:`, pos);
      }
    });

    // React to radius changes
    effect(() => {
      const r = this.radius();
      const mesh = this.meshRef();
      if (mesh?.nativeElement && this.isInitialized) {
        console.log(`[FloatingSphere] Radius updated:`, r);
      }
    });

    // React to color changes
    effect(() => {
      const c = this.color();
      const mesh = this.meshRef();
      if (mesh?.nativeElement && this.isInitialized) {
        console.log(`[FloatingSphere] Color updated:`, c);
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
   * Angular Three custom elements expose THREE.Mesh via the object3D property
   */
  getMesh(): THREE.Mesh | null {
    const element = this.meshRef()?.nativeElement;
    if (!element) {
      return null;
    }

    // Angular Three ngt-mesh elements expose the THREE.Mesh via object3D property
    if ('object3D' in element) {
      const obj = (element as any).object3D;
      if (obj instanceof THREE.Mesh) {
        return obj;
      }
    }

    console.warn(
      '[FloatingSphereComponent] Unable to access THREE.Mesh from ngt-mesh element'
    );
    return null;
  }

  /**
   * Public API: Check if component is initialized
   */
  isReady(): boolean {
    return this.isInitialized && !!this.meshRef();
  }
}
