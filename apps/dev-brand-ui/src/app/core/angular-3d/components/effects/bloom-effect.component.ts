/**
 * BloomEffectComponent - Post-Processing Bloom for Glowing Effects
 *
 * Adds realistic glow/bloom to bright elements in the scene:
 * - Stars appear to glow and bleed into surrounding space
 * - Nebula edges get soft luminous halos
 * - Planet atmospheric glow enhancement
 *
 * Uses Angular Three postprocessing with:
 * - ngtp-effect-composer: Effect composition pipeline
 * - ngtp-bloom: Bloom/glow effect
 *
 * Features:
 * - Adjustable luminance threshold (brightness cutoff)
 * - Adjustable intensity (glow strength)
 * - Optimized for space scenes
 *
 * Usage:
 * ```html
 * <app-bloom-effect
 *   [luminanceThreshold]="0.3"
 *   [intensity]="1.8"
 * />
 * ```
 */

import { Component, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';
import {
  NgtpEffectComposer,
  NgtpBloom,
  NgtpSMAA,
} from 'angular-three-postprocessing';

@Component({
  selector: 'app-bloom-effect',
  standalone: true,
  imports: [NgtpEffectComposer, NgtpBloom, NgtpSMAA],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngtp-effect-composer>
      <ngtp-bloom
        [options]="{
          kernelSize: kernelSize(),
          luminanceThreshold: luminanceThreshold(),
          luminanceSmoothing: luminanceSmoothing(),
          intensity: intensity(),
          mipmapBlur: true
        }"
      />
      <ngtp-smaa />
    </ngtp-effect-composer>
  `,
})
export class BloomEffectComponent {
  // Configuration inputs
  readonly kernelSize = input<number>(3); // Bloom kernel size (quality)
  readonly luminanceThreshold = input<number>(0.3); // Brightness threshold (0-1)
  readonly luminanceSmoothing = input<number>(0.5); // Smoothing factor (0-1)
  readonly intensity = input<number>(1.8); // Bloom intensity (0-3+)

  constructor() {
    console.log('[BloomEffect] Post-processing bloom initialized', {
      luminanceThreshold: this.luminanceThreshold(),
      luminanceSmoothing: this.luminanceSmoothing(),
      intensity: this.intensity(),
    });
  }
}
