/**
 * BoxComponent - Declarative Angular Three Box Primitive
 *
 * A reusable box/cube component using Angular Three's reactive primitives.
 * Similar to background-cube but with more material options (StandardMaterial vs Lambert).
 *
 * Features:
 * - Signal-based reactive inputs
 * - Standard material for better lighting
 * - Support for directive composition
 * - Configurable dimensions
 *
 * Usage:
 * ```html
 * <app-box
 *   [position]="[0, 0, 0]"
 *   [width]="1"
 *   [height]="1"
 *   [depth]="0.2"
 *   [color]="0xffd700"
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
  type ElementRef,
  inject,
  DestroyRef,
  effect,
  type OnInit,
} from '@angular/core';
import type { Mesh } from 'three';
import { Float3dDirective } from '../../directives/float-3d.directive';
import { Performance3dDirective } from '../../directives/performance-3d.directive';
import { Colors3D } from '../../config/colors.config';

@Component({
  selector: 'app-box',
  standalone: true,
  imports: [Float3dDirective, Performance3dDirective],
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
      <ngt-box-geometry [args]="[width(), height(), depth()]" />

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
export class BoxComponent implements OnInit {
  readonly meshRef = viewChild<ElementRef<Mesh>>('mesh');
  private readonly destroyRef = inject(DestroyRef);

  // Position and transformation
  readonly position = input<readonly [number, number, number]>([0, 0, 0]);
  readonly scale = input<readonly [number, number, number] | number>([1, 1, 1]);
  readonly rotation = input<readonly [number, number, number]>([0, 0, 0]);

  // Box dimensions
  readonly width = input<number>(1);
  readonly height = input<number>(1);
  readonly depth = input<number>(1);

  // Material properties
  readonly color = input<number>(Colors3D.accent.gold.hex);
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
    console.log('[Box] Cleanup completed');
  }

  getMesh(): Mesh | null {
    const element = this.meshRef()?.nativeElement;
    if (!element) {
      console.warn('[BoxComponent] Unable to access THREE.Mesh');
      return null;
    }
    return element;
  }

  isReady(): boolean {
    return this.isInitialized && !!this.meshRef();
  }
}
