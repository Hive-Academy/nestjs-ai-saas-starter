/**
 * PolyhedronComponent - Declarative Angular Three Polyhedron Primitive
 *
 * A reusable polyhedron component supporting multiple geometric shapes:
 * - Icosahedron (20 triangular faces - AI/brain symbol)
 * - Octahedron (8 triangular faces - network node symbol)
 * - Tetrahedron (4 triangular faces - simple pyramid)
 * - Dodecahedron (12 pentagonal faces - complex structure)
 *
 * Features:
 * - Signal-based reactive inputs
 * - Automatic lifecycle management
 * - Support for directive composition
 * - Shadow casting/receiving
 * - Metallic materials for tech aesthetic
 *
 * Usage:
 * ```html
 * <app-polyhedron
 *   type="icosahedron"
 *   [position]="[0, 2, -5]"
 *   [radius]="1"
 *   [color]="0x8a2be2"
 *   [metalness]="0.8"
 *   float3d
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
import { Float3dDirective } from '../../directives/float-3d.directive';
import { Performance3dDirective } from '../../directives/performance-3d.directive';
import { Colors3D } from '../../config/colors.config';
import { NgtArgs } from 'angular-three';

export type PolyhedronType =
  | 'icosahedron'
  | 'octahedron'
  | 'tetrahedron'
  | 'dodecahedron';

@Component({
  selector: 'app-polyhedron',
  standalone: true,
  imports: [Float3dDirective, Performance3dDirective, NgtArgs],
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
      performance3d
    >
      @switch (type()) { @case ('icosahedron') {
      <ngt-icosahedron-geometry *args="[radius(), detail()]" />
      } @case ('octahedron') {
      <ngt-octahedron-geometry *args="[radius(), detail()]" />
      } @case ('tetrahedron') {
      <ngt-tetrahedron-geometry *args="[radius(), detail()]" />
      } @case ('dodecahedron') {
      <ngt-dodecahedron-geometry *args="[radius(), detail()]" />
      } }

      <ngt-mesh-standard-material
        [color]="color()"
        [metalness]="metalness()"
        [roughness]="roughness()"
        [emissive]="emissive()"
        [emissiveIntensity]="emissiveIntensity()"
        [transparent]="transparent()"
        [opacity]="opacity()"
      />
    </ngt-mesh>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolyhedronComponent implements OnInit {
  readonly meshRef = viewChild<ElementRef<Mesh>>('mesh');
  private readonly destroyRef = inject(DestroyRef);

  // Polyhedron type
  readonly type = input<PolyhedronType>('icosahedron');

  // Position and transformation
  readonly position = input<readonly [number, number, number]>([0, 0, 0]);
  readonly scale = input<readonly [number, number, number] | number>([1, 1, 1]);
  readonly rotation = input<readonly [number, number, number]>([0, 0, 0]);

  // Geometry parameters
  readonly radius = input<number>(1);
  readonly detail = input<number>(0); // 0 = flat faces, higher = more subdivisions

  // Material properties
  readonly color = input<number>(Colors3D.accent.blueViolet.hex);
  readonly metalness = input<number>(0.7);
  readonly roughness = input<number>(0.2);
  readonly emissive = input<number>(Colors3D.material.black.hex);
  readonly emissiveIntensity = input<number>(0);
  readonly transparent = input<boolean>(false);
  readonly opacity = input<number>(1.0);

  // Shadow configuration
  readonly castShadow = input<boolean>(true);
  readonly receiveShadow = input<boolean>(true);

  // Float animation configuration
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

  // Lifecycle events
  readonly objectCreated = output<{
    mesh: Mesh;
    position: readonly [number, number, number];
  }>();
  readonly objectDestroyed = output<{ mesh: Mesh }>();

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
        // Position updates handled by Angular Three
      }
    });
  }

  private cleanup(): void {
    console.log('[Polyhedron] Cleanup completed');
  }

  getMesh(): Mesh | null {
    const element = this.meshRef()?.nativeElement;
    if (!element) {
      console.warn('[PolyhedronComponent] Unable to access THREE.Mesh');
      return null;
    }
    return element;
  }

  isReady(): boolean {
    return this.isInitialized && !!this.meshRef();
  }
}
