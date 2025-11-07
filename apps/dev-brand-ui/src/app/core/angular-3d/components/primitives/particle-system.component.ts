/**
 * ParticleSystemComponent - Background Particle System with Exclusion Zones
 *
 * Creates a particle system using official angular-three-soba components:
 * - NgtsPointsBuffer: Efficient particle position handling
 * - NgtsPointMaterial: Specialized material for point rendering
 * - Custom position generation with exclusion zones to avoid text areas
 *
 * Pattern source: https://github.com/angular-threejs/angular-three/blob/main/apps/kitchen-sink/src/app/soba/stars/experience.ts
 *
 * Usage:
 * ```html
 * <app-particle-system
 *   [particleCount]="200"
 *   [colorPalette]="['#4a1d6b', '#2d1b47', '#1a0d2e']"
 *   [exclusionZone]="{ x: 8, y: 4 }"
 *   [size]="0.8"
 *   [opacity]="0.5"
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
import * as THREE from 'three';

@Component({
  selector: 'app-particle-system',
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
          opacity: opacity(),
          blending: additiveBlending
        }"
      />
    </ngts-points-buffer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticleSystemComponent {
  // Configuration inputs
  readonly particleCount = input<number>(200);
  readonly colorPalette = input<string[]>([
    '#4a1d6b', // Darker purple
    '#2d1b47', // Dark purple
    '#1a0d2e', // Very dark purple
    '#261242', // Dark violet
    '#1e1139', // Dark navy
  ]);
  readonly exclusionZone = input<{ x: number; y: number }>({ x: 8, y: 4 });
  readonly size = input<number>(0.8);
  readonly opacity = input<number>(0.5);

  // Three.js constants
  readonly additiveBlending = THREE.AdditiveBlending;

  /**
   * Generate particle positions with exclusion zone
   * Particles are placed in a bounded box but avoid the central text area
   */
  readonly positions = computed(() => {
    const count = this.particleCount();
    const positions = new Float32Array(count * 3);
    const exclusion = this.exclusionZone();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Create particles that avoid the exclusion zone
      let x: number, y: number, z: number;
      do {
        const radius = 12 + Math.random() * 25; // Start further from center
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.PI / 2 + (Math.random() - 0.5) * 1.4;

        x = radius * Math.sin(phi) * Math.cos(theta);
        y = (Math.random() - 0.5) * 15; // Wider vertical spread
        z = radius * Math.cos(phi) * 0.3; // Shallow depth
      } while (Math.abs(x) < exclusion.x && Math.abs(y) < exclusion.y);

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
    }

    return positions;
  });

  /**
   * Calculate average color from palette
   * NgtsPointMaterial doesn't support per-vertex colors
   */
  readonly averageColor = computed(() => {
    const palette = this.colorPalette();
    if (palette.length === 1) return palette[0];

    // Use middle color from palette
    return palette[Math.floor(palette.length / 2)];
  });
}
