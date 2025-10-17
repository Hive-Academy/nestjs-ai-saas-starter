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
import { registerAngularThreePrimitives } from '../../utils/angular-three-primitives';

/**
 * BackgroundCube Component
 *
 * Renders a simple cube using Angular Three's declarative primitives.
 * Uses Lambert material for performance optimization.
 */
@Component({
  selector: 'app-background-cube',
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
  readonly meshRef = viewChild<ElementRef<any>>('mesh');

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
  readonly color = input<number>(0x4a90e2);
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
    registerAngularThreePrimitives();

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
      if (mesh?.nativeElement && this.isInitialized) {
        console.log(`[BackgroundCube] Position updated:`, pos);
      }
    });

    // React to size changes
    effect(() => {
      const size = this.size();
      const mesh = this.meshRef();
      if (mesh?.nativeElement && this.isInitialized) {
        console.log(`[BackgroundCube] Size updated:`, size);
      }
    });

    // React to rotation changes
    effect(() => {
      const rot = this.rotation();
      const mesh = this.meshRef();
      if (mesh?.nativeElement && this.isInitialized) {
        console.log(`[BackgroundCube] Rotation updated:`, rot);
      }
    });

    // React to color changes
    effect(() => {
      const c = this.color();
      const mesh = this.meshRef();
      if (mesh?.nativeElement && this.isInitialized) {
        console.log(`[BackgroundCube] Color updated:`, c);
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
   */
  getMesh(): any | null {
    return this.meshRef()?.nativeElement || null;
  }

  /**
   * Public API: Check if component is initialized
   */
  isReady(): boolean {
    return this.isInitialized && !!this.meshRef();
  }
}
