/**
 * TorusComponent - Declarative Angular Three Torus Primitive
 *
 * A reusable torus (donut shape) component using Angular Three's reactive primitives
 * for declarative 3D scene creation.
 *
 * Features:
 * - Signal-based reactive inputs for torus dimensions
 * - Automatic lifecycle management
 * - Support for directive composition
 * - Configurable tube radius, segments, and arc parameters
 *
 * Usage:
 * ```html
 * <app-torus
 *   [position]="[0, 2, -5]"
 *   [radius]="2"
 *   [tube]="0.5"
 *   [color]="0xff00ff"
 *   float3d
 *   glow3d
 * />
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
import { Mesh } from 'three';

@Component({
  selector: 'app-torus',
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
      <ngt-torus-geometry
        [args]="[radius(), tube(), radialSegments(), tubularSegments(), arc()]"
      />

      <ngt-mesh-standard-material
        [color]="color()"
        [metalness]="metalness()"
        [roughness]="roughness()"
        [transparent]="transparent()"
        [opacity]="opacity()"
        [emissive]="emissive()"
        [emissiveIntensity]="emissiveIntensity()"
      />
    </ngt-mesh>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TorusComponent implements OnInit {
  readonly meshRef = viewChild<ElementRef<Mesh>>('mesh');
  private readonly destroyRef = inject(DestroyRef);

  // Position and transformation
  readonly position = input<readonly [number, number, number]>([0, 0, 0]);
  readonly scale = input<readonly [number, number, number] | number>([1, 1, 1]);
  readonly rotation = input<readonly [number, number, number]>([0, 0, 0]);

  // Torus geometry parameters
  readonly radius = input<number>(2); // Main torus radius
  readonly tube = input<number>(0.5); // Tube radius
  readonly radialSegments = input<number>(16); // Segments around tube
  readonly tubularSegments = input<number>(100); // Segments around torus
  readonly arc = input<number>(Math.PI * 2); // Full circle by default

  // Material properties
  readonly color = input<number>(0xff00ff);
  readonly metalness = input<number>(0.5);
  readonly roughness = input<number>(0.5);
  readonly transparent = input<boolean>(false);
  readonly opacity = input<number>(1.0);
  readonly emissive = input<number>(0x000000);
  readonly emissiveIntensity = input<number>(0);

  // Shadow configuration
  readonly castShadow = input<boolean>(true);
  readonly receiveShadow = input<boolean>(true);

  // Lifecycle events
  readonly objectCreated = output<{
    mesh: any;
    position: readonly [number, number, number];
  }>();
  readonly objectDestroyed = output<{ mesh: any }>();

  private isInitialized = false;

  constructor() {
    this.setupReactiveEffects();
  }

  ngOnInit(): void {
    const mesh = this.meshRef();
    if (mesh?.nativeElement) {
      this.objectCreated.emit({
        mesh: mesh.nativeElement,
        position: this.position(),
      });
      this.isInitialized = true;
    }

    this.destroyRef.onDestroy(() => {
      const mesh = this.meshRef();
      if (mesh?.nativeElement) {
        this.objectDestroyed.emit({ mesh: mesh.nativeElement });
      }
      this.cleanup();
    });
  }

  private setupReactiveEffects(): void {
    effect(() => {
      const pos = this.position();
      const mesh = this.meshRef();
      if (mesh?.nativeElement && this.isInitialized && pos) {
        // console.log(`[Torus] Position updated:`, pos);
      }
    });
  }

  private cleanup(): void {
    console.log('[Torus] Cleanup completed');
  }

  /**
   * Public API: Get the THREE.Mesh instance
   * Angular Three custom elements expose THREE.Mesh via the object3D property
   */
  getMesh(): Mesh | null {
    const element = this.meshRef()?.nativeElement;
    if (!element) {
      console.warn(
        '[TorusComponent] Unable to access THREE.Mesh from ngt-mesh element'
      );
      return null;
    }

    return element;
  }

  isReady(): boolean {
    return this.isInitialized && !!this.meshRef();
  }
}
