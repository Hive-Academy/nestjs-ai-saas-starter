/**
 * HijackedScrollTimelineComponent - Generic Timeline with Content Projection
 *
 * Thin wrapper around HijackedScrollDirective that provides a clean API
 * for creating scroll-jacked timelines with full content control.
 *
 * Features:
 * - Content projection for maximum flexibility
 * - Support for decorations, custom layouts, any content type
 * - Uses hijackedScrollItem directive for step elements
 * - All scroll configuration options
 *
 * Usage:
 * ```html
 * <app-hijacked-scroll-timeline [scrollHeightPerStep]="100">
 *   <div hijackedScrollItem slideDirection="left">
 *     <!-- Full custom HTML: decorations, layouts, any content -->
 *     <div class="relative min-h-screen flex items-center">
 *       <svg class="absolute">...</svg>
 *       <div class="z-10">
 *         <h2 class="text-3d-extruded">Title</h2>
 *         <app-code-snippet [code]="code" />
 *       </div>
 *     </div>
 *   </div>
 *
 *   <div hijackedScrollItem slideDirection="right">
 *     <!-- Different layout, different content -->
 *     <div class="grid grid-cols-2">
 *       <img src="..." />
 *       <p>...</p>
 *     </div>
 *   </div>
 * </app-hijacked-scroll-timeline>
 * ```
 *
 * Benefits over hardcoded timeline:
 * - Add decorations (SVG patterns, 3D elements) per step
 * - Mix content types (code, images, videos, charts)
 * - Custom layouts per step
 * - Full control over HTML structure
 */

import { Component, input, output } from '@angular/core';
import { HijackedScrollDirective } from '../../core/angular-3d/directives/hijacked-scroll.directive';

@Component({
  selector: 'app-hijacked-scroll-timeline',
  standalone: true,
  imports: [],
  hostDirectives: [
    {
      directive: HijackedScrollDirective,
      inputs: ['scrollHeightPerStep', 'animationDuration', 'ease', 'markers', 'minHeight'],
      outputs: ['currentStepChange', 'progressChange'],
    },
  ],
  template: `
    <!-- Project all child hijackedScrollItem elements directly -->
    <ng-content />
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class HijackedScrollTimelineComponent {
  // Configuration inputs (pass-through via hostDirectives)
  readonly scrollHeightPerStep = input<number>(100); // vh per step
  readonly animationDuration = input<number>(0.3); // seconds
  readonly ease = input<string>('power2.out');
  readonly markers = input<boolean>(false);
  readonly minHeight = input<string>('70vh');

  // Event outputs (pass-through via hostDirectives)
  readonly currentStepChange = output<number>();
  readonly progressChange = output<number>();
}
