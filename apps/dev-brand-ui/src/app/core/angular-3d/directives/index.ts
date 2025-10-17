/**
 * Angular 3D Composition Directives
 *
 * Declarative directives that add 3D behaviors to components through composition.
 * Can be combined on a single component for powerful declarative effects.
 *
 * Usage:
 * ```typescript
 * import { Float3dDirective, Performance3dDirective, Glow3dDirective } from '@/core/angular-3d/directives';
 *
 * @Component({
 *   imports: [FloatingSphereComponent, Float3dDirective, Performance3dDirective, Glow3dDirective],
 *   template: `
 *     <app-floating-sphere
 *       [position]="[0, 1, 0]"
 *       float3d
 *       performance3d
 *       glow3d
 *       [glowColor]="0xff3333"
 *     />
 *   `
 * })
 * ```
 */

export { Float3dDirective } from './float-3d.directive';
export { Performance3dDirective } from './performance-3d.directive';
export { Glow3dDirective } from './glow-3d.directive';
