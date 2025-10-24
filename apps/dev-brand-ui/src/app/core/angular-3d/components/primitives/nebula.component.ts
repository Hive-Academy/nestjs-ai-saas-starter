/**
 * NebulaComponent - Volumetric Cloud/Dust Effect
 *
 * Creates soft, cloud-like particle effects using official angular-three-soba components:
 * - NgtsPointsBuffer: Efficient particle position handling
 * - NgtsPointMaterial: Specialized material for point rendering
 * - Maath library: Clustered position distribution
 * - Optional rotation animation using injectBeforeRender
 *
 * Pattern source: https://github.com/angular-threejs/angular-three/blob/main/apps/kitchen-sink/src/app/soba/stars/experience.ts
 *
 * Usage:
 * ```html
 * <app-nebula
 *   [particleCount]="500"
 *   [colorPalette]="['#4a1d6b', '#2d1b47', '#1a0d2e']"
 *   [size]="0.05"
 *   [opacity]="0.4"
 *   [flow]="true"
 * />
 * ```
 */

import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  computed,
  input,
  viewChild,
  ElementRef,
} from '@angular/core';
import { injectBeforeRender } from 'angular-three';
import { NgtsPointMaterial } from 'angular-three-soba/materials';
import { NgtsPointsBuffer } from 'angular-three-soba/performances';
import { random } from 'maath';
import * as THREE from 'three';

@Component({
  selector: 'app-nebula',
  standalone: true,
  imports: [NgtsPointsBuffer, NgtsPointMaterial],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngt-group #nebulaGroup>
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
    </ngt-group>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NebulaComponent {
  private readonly groupRef = viewChild<ElementRef<THREE.Group>>('nebulaGroup');

  // Configuration inputs
  readonly particleCount = input<number>(500);
  readonly radius = input<number>(25); // Distribution radius for clustered particles
  readonly colorPalette = input<string[]>(['#4a1d6b', '#2d1b47', '#1a0d2e']);
  readonly size = input<number>(0.05); // Larger particles for cloud effect
  readonly opacity = input<number>(0.4);
  readonly flow = input<boolean>(true);

  // Three.js constants
  readonly additiveBlending = THREE.AdditiveBlending;

  /**
   * Generate nebula particle positions using maath library
   * Using spherical distribution with smaller radius for clustered appearance
   */
  readonly positions = computed(() => {
    const count = this.particleCount();
    const radius = this.radius();
    return random.inSphere(new Float32Array(count * 3), {
      radius,
    }) as Float32Array;
  });

  /**
   * Calculate average color from palette
   * NgtsPointMaterial doesn't support per-vertex colors
   */
  readonly averageColor = computed(() => {
    const palette = this.colorPalette();
    if (palette.length === 1) return palette[0];

    // For purple nebula, use middle color
    return palette[Math.floor(palette.length / 2)];
  });

  constructor() {
    // Setup flow animation if enabled
    if (this.flow()) {
      injectBeforeRender(({ delta }) => {
        const group = this.groupRef()?.nativeElement;
        if (group) {
          group.rotation.y += delta * 0.05; // Slow rotation
        }
      });
    }
  }
}
