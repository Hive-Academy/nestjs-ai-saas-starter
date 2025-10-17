/**
 * CylinderComponent - Declarative Angular Three Cylinder Primitive
 *
 * A reusable cylinder component using Angular Three's reactive primitives for
 * declarative 3D scene creation.
 *
 * Features:
 * - Signal-based reactive inputs for geometry and material properties
 * - Automatic lifecycle management
 * - Support for directive composition
 * - Configurable cylinder dimensions (radius, height, segments)
 *
 * Usage:
 * ```html
 * <app-cylinder
 *   [position]="[0, 0, 0]"
 *   [radiusTop]="1"
 *   [radiusBottom]="1"
 *   [height]="2"
 *   [color]="0x00ff00"
 *   performance3d
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
import * as THREE from 'three';
import { registerAngularThreePrimitives } from '../../utils/angular-three-primitives';

@Component({
  selector: 'app-cylinder',
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
      <ngt-cylinder-geometry
        [args]="[
          radiusTop(),
          radiusBottom(),
          height(),
          radialSegments(),
          heightSegments(),
          openEnded(),
          thetaStart(),
          thetaLength()
        ]"
      />

      <ngt-mesh-standard-material
        [color]="color()"
        [metalness]="metalness()"
        [roughness]="roughness()"
        [transparent]="transparent()"
        [opacity]="opacity()"
      />
    </ngt-mesh>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CylinderComponent implements OnInit {
  readonly meshRef = viewChild<ElementRef<any>>('mesh');
  private readonly destroyRef = inject(DestroyRef);

  // Position and transformation
  readonly position = input<readonly [number, number, number]>([0, 0, 0]);
  readonly scale = input<readonly [number, number, number] | number>([1, 1, 1]);
  readonly rotation = input<readonly [number, number, number]>([0, 0, 0]);

  // Cylinder geometry parameters
  readonly radiusTop = input<number>(1);
  readonly radiusBottom = input<number>(1);
  readonly height = input<number>(2);
  readonly radialSegments = input<number>(32);
  readonly heightSegments = input<number>(1);
  readonly openEnded = input<boolean>(false);
  readonly thetaStart = input<number>(0);
  readonly thetaLength = input<number>(Math.PI * 2);

  // Material properties
  readonly color = input<number>(0x00ff00);
  readonly metalness = input<number>(0.5);
  readonly roughness = input<number>(0.5);
  readonly transparent = input<boolean>(false);
  readonly opacity = input<number>(1.0);

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
    registerAngularThreePrimitives();
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
      if (mesh?.nativeElement && this.isInitialized) {
        console.log(`[Cylinder] Position updated:`, pos);
      }
    });
  }

  private cleanup(): void {
    console.log('[Cylinder] Cleanup completed');
  }

  /**
   * Public API: Get the THREE.Mesh instance
   * Angular Three custom elements expose THREE.Mesh via the object3D property
   */
  getMesh(): THREE.Mesh | null {
    const element = this.meshRef()?.nativeElement;
    if (!element) {
      return null;
    }

    if ('object3D' in element) {
      const obj = (element as any).object3D;
      if (obj instanceof THREE.Mesh) {
        return obj;
      }
    }

    console.warn(
      '[CylinderComponent] Unable to access THREE.Mesh from ngt-mesh element'
    );
    return null;
  }

  isReady(): boolean {
    return this.isInitialized && !!this.meshRef();
  }
}
