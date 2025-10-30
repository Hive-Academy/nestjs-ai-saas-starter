/**
 * BackgroundCubeComponent - Declarative Angular Three Cube Primitive
 *
 * A reusable cube component that uses Angular Three's reactive primitives (ngt-mesh,
 * ngt-box-geometry, ngt-mesh-lambert-material) for declarative 3D scene creation.
 *
 * Features:
 * - Signal-based reactive inputs for position, size, color, rotation
 * - Automatic lifecycle management with DestroyRef
 * - Event emission for object creation/destruction
 * - Support for directive composition (performance3d, float3d)
 * - Simple Lambert material for performance
 * - Rotation animation support (internal or via directive)
 *
 * Usage:
 * ```html
 * <app-hybrid-scene>
 *   <app-background-cube
 *     [position]="[-5, 2, -10]"
 *     [size]="[1, 1, 1]"
 *     [color]="0x4a90e2"
 *     [rotation]="[0, 0, 0]"
 *     performance3d
 *   />
 * </app-hybrid-scene>
 * ```
 *
 * @example
 * ```typescript
 * // Generate multiple cubes
 * @Component({
 *   template: `
 *     <app-background-cube
 *       *ngFor="let cube of cubes()"
 *       [position]="cube.position"
 *       [size]="cube.size"
 *       [color]="cube.color"
 *       performance3d
 *     />
 *   `
 * })
 * export class MyScene {
 *   cubes = signal([
 *     { position: [-5, 0, -10], size: [1, 1, 1], color: 0x4a90e2 },
 *     { position: [5, 0, -10], size: [0.5, 0.5, 0.5], color: 0xe24a90 }
 *   ]);
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
import { Float3dDirective } from '../../directives/float-3d.directive';
import { Performance3dDirective } from '../../directives/performance-3d.directive';
import { Colors3D } from '../../config/colors.config';

/**
 * BackgroundCube Component
 *
 * Renders a simple cube using Angular Three's declarative primitives.
 * Uses Lambert material for performance optimization.
 */
@Component({
  selector: 'app-background-cube',
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
      [performanceConfig]="performanceConfig()"
    >
      <!-- Box geometry with reactive size -->
      <ngt-box-geometry [args]="boxGeometryArgs()" />

      <!-- Lambert material for simple, performant rendering -->
      <ngt-mesh-lambert-material
        [color]="color()"
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
export class BackgroundCubeComponent implements OnInit {
  // ViewChild reference to access the mesh for directives
  readonly meshRef = viewChild<ElementRef<Mesh>>('mesh');

  // Dependency injection
  private readonly destroyRef = inject(DestroyRef);

  // Position and transformation inputs
  readonly position = input<readonly [number, number, number]>([0, 0, 0]);
  readonly scale = input<readonly [number, number, number] | number>([1, 1, 1]);
  readonly rotation = input<readonly [number, number, number]>([0, 0, 0]);

  // Geometry configuration - size can be uniform or per-axis
  readonly size = input<readonly [number, number, number] | number>([1, 1, 1]);
  readonly widthSegments = input<number>(1);
  readonly heightSegments = input<number>(1);
  readonly depthSegments = input<number>(1);

  // Material properties - Lambert for simple lighting
  readonly color = input<number>(Colors3D.accent.blue.hex);
  readonly transparent = input<boolean>(false);
  readonly opacity = input<number>(1.0);
  readonly emissive = input<number>(Colors3D.material.black.hex);
  readonly emissiveIntensity = input<number>(0);

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

  readonly performanceConfig = input<
    boolean | { enabled: boolean } | undefined
  >(undefined);

  // Lifecycle events
  readonly objectCreated = output<{
    mesh: any;
    position: readonly [number, number, number];
    size: readonly [number, number, number] | number;
  }>();
  readonly objectDestroyed = output<{ mesh: any }>();

  // Internal state
  private isInitialized = false;

  // Computed property for box geometry args
  readonly boxGeometryArgs = (): [
    number,
    number,
    number,
    number,
    number,
    number
  ] => {
    const size = this.size();
    const [w, h, d] = Array.isArray(size) ? size : [size, size, size];
    return [
      w,
      h,
      d,
      this.widthSegments(),
      this.heightSegments(),
      this.depthSegments(),
    ];
  };

  constructor() {
    // Register Angular Three primitives

    // Setup reactive effects
    this.setupReactiveEffects();
  }

  ngOnInit(): void {
    // Emit object created event
    const mesh = this.meshRef();
    if (mesh?.nativeElement) {
      this.objectCreated.emit({
        mesh: mesh.nativeElement,
        position: this.position(),
        size: this.size(),
      });
      this.isInitialized = true;
    }

    // Register cleanup
    this.destroyRef.onDestroy(() => {
      const mesh = this.meshRef();
      if (mesh?.nativeElement) {
        this.objectDestroyed.emit({ mesh: mesh.nativeElement });
      }
      this.cleanup();
    });
  }

  /**
   * Setup reactive effects for input changes
   */
  private setupReactiveEffects(): void {
    // React to position changes
    effect(() => {
      const pos = this.position();
      const mesh = this.meshRef();
      if (mesh?.nativeElement && this.isInitialized && pos) {
        // console.debug(`[BackgroundCube] Position updated:`, pos);
      }
    });

    // React to size changes
    effect(() => {
      const size = this.size();
      const mesh = this.meshRef();
      if (mesh?.nativeElement && this.isInitialized && size) {
        // console.log(`[BackgroundCube] Size updated:`, size);
      }
    });

    // React to rotation changes
    effect(() => {
      const rot = this.rotation();
      const mesh = this.meshRef();
      if (mesh?.nativeElement && this.isInitialized && rot) {
        // console.log(`[BackgroundCube] Rotation updated:`, rot);
      }
    });

    // React to color changes
    effect(() => {
      const c = this.color();
      const mesh = this.meshRef();
      if (mesh?.nativeElement && this.isInitialized && c) {
        // console.log(`[BackgroundCube] Color updated:`, c);
      }
    });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    console.log('[BackgroundCube] Cleanup completed');
  }

  /**
   * Public API: Get the THREE.Mesh instance
   * Angular Three's template refs expose THREE.js objects via nativeElement
   */
  getMesh(): Mesh | null {
    const meshRef = this.meshRef();
    if (!meshRef) {
      console.warn(
        '[BackgroundCubeComponent] nativeElement is not a THREE.Mesh instance'
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
