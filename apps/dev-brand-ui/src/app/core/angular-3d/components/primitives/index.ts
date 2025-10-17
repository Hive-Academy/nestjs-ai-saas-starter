/**
 * Angular 3D Primitive Components
 *
 * Declarative Angular components that wrap Angular Three primitives (ngt-mesh,
 * ngt-*-geometry, ngt-mesh-*-material) for template-based 3D scene creation.
 *
 * Usage:
 * ```typescript
 * import { FloatingSphereComponent, BackgroundCubeComponent } from '@/core/angular-3d/components/primitives';
 *
 * @Component({
 *   imports: [FloatingSphereComponent, BackgroundCubeComponent],
 *   template: `
 *     <app-hybrid-scene>
 *       <app-floating-sphere [position]="[0, 1, 0]" [radius]="1" float3d />
 *       <app-background-cube [position]="[-5, 0, -10]" performance3d />
 *     </app-hybrid-scene>
 *   `
 * })
 * ```
 */

export { FloatingSphereComponent } from './floating-sphere.component';
export { BackgroundCubeComponent } from './background-cube.component';
export { CylinderComponent } from './cylinder.component';
export { TorusComponent } from './torus.component';
