/**
 * StarFieldComponent - Multi-Layer Star Particle System
 *
 * Creates a realistic star field using official angular-three-soba components:
 * - NgtsPointsBuffer: Efficient particle position handling
 * - NgtsPointMaterial: Specialized material for point rendering
 * - Maath library: Spherical position distribution
 *
 * Pattern source: https://github.com/angular-threejs/angular-three/blob/main/apps/kitchen-sink/src/app/soba/stars/experience.ts
 *
 * Usage:
 * ```html
 * <app-star-field
 *   [starCount]="3000"
 *   [radius]="40"
 *   [colorPalette]="['#ffffff', '#f0f0ff']"
 *   [size]="0.02"
 *   [opacity]="0.8"
 * />
 * ```
 */

import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  computed,
  input,
} from '@angular/core';
import { NgtsPointMaterial } from 'angular-three-soba/materials';
import { NgtsPointsBuffer } from 'angular-three-soba/performances';
import { random } from 'maath';

@Component({
  selector: 'app-star-field',
  standalone: true,
  imports: [NgtsPointsBuffer, NgtsPointMaterial],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngts-points-buffer
      [positions]="positions()"
      [stride]="3"
      [options]="{ frustumCulled: false }"
    >
      <ngts-point-material
        [options]="{
          transparent: true,
          color: averageColor(),
          size: size(),
          sizeAttenuation: true,
          depthWrite: false,
          opacity: opacity()
        }"
      />
    </ngts-points-buffer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarFieldComponent {
  // Configuration inputs
  readonly starCount = input<number>(3000);
  readonly radius = input<number>(40);
  readonly colorPalette = input<string[]>(['#ffffff', '#f0f0ff', '#e0e0ff']);
  readonly size = input<number>(0.02);
  readonly opacity = input<number>(0.8);

  /**
   * Generate star positions using maath library (spherical distribution)
   */
  readonly positions = computed(() => {
    const count = this.starCount();
    const radius = this.radius();
    return random.inSphere(new Float32Array(count * 3), {
      radius,
    }) as Float32Array;
  });

  /**
   * Calculate average color from palette for unified star appearance
   * NgtsPointMaterial doesn't support per-vertex colors, so we use average
   */
  readonly averageColor = computed(() => {
    const palette = this.colorPalette();
    if (palette.length === 1) return palette[0];

    // For white-ish star colors, just use white
    return '#ffffff';
  });
}
