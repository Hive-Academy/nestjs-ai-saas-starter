/**
 * GlowSpotComponent - Glowing Surface Indicator
 *
 * Creates a small glowing sphere indicator on surfaces (e.g., planet markers).
 * Combines emissive mesh with point light for realistic glow effect.
 *
 * Features:
 * - Customizable position and size
 * - Emissive material with configurable color
 * - Optional point light for enhanced glow
 * - Pulsing animation option
 *
 * Usage:
 * ```html
 * <app-glow-spot
 *   [position]="[0, 5, 0]"
 *   [color]="0x00ff00"
 *   [size]="0.15"
 *   [intensity]="2.0"
 * />
 * ```
 */

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  signal,
  effect,
} from '@angular/core';
import { injectBeforeRender } from 'angular-three';

@Component({
  selector: 'app-glow-spot',
  standalone: true,
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngt-group [position]="position()">
      <!-- Glowing sphere indicator -->
      <ngt-mesh>
        <ngt-sphere-geometry [args]="[size(), 16, 16]" />
        <ngt-mesh-standard-material
          [color]="color()"
          [emissive]="color()"
          [emissiveIntensity]="currentIntensity()"
          [metalness]="0.1"
          [roughness]="0.2"
        />
      </ngt-mesh>

      <!-- Point light for glow effect -->
      @if (enableLight()) {
      <ngt-point-light
        [color]="color()"
        [intensity]="currentIntensity() * 0.5"
        [distance]="lightDistance()"
        [decay]="2"
      />
      }
    </ngt-group>
  `,
})
export class GlowSpotComponent {
  // Position on surface
  readonly position = input<[number, number, number]>([0, 0, 0]);

  // Visual properties
  readonly color = input<number>(0x6366f1); // Default: indigo-500
  readonly size = input<number>(0.12);
  readonly intensity = input<number>(2.0);

  // Glow effect
  readonly enableLight = input<boolean>(true);
  readonly lightDistance = input<number>(3);

  // Pulsing animation
  readonly enablePulse = input<boolean>(true);
  readonly pulseSpeed = input<number>(2.0);

  // Current intensity (for pulsing)
  protected readonly currentIntensity = signal<number>(this.intensity());

  constructor() {
    // Setup pulsing animation if enabled
    let time = 0;

    injectBeforeRender(({ delta }) => {
      if (!this.enablePulse()) {
        this.currentIntensity.set(this.intensity());
        return;
      }

      time += delta * this.pulseSpeed();

      // Sine wave pulse between 0.7x and 1.3x base intensity
      const pulse = 1.0 + Math.sin(time) * 0.3;
      this.currentIntensity.set(this.intensity() * pulse);
    });

    // Update intensity when base intensity changes
    effect(() => {
      if (!this.enablePulse()) {
        this.currentIntensity.set(this.intensity());
      }
    });
  }
}
