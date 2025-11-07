/**
 * FogComponent - Declarative Scene Fog Primitive
 *
 * Uses Angular-Three's declarative fog primitives (ngt-fog, ngt-fogExp2)
 * for reactive fog management.
 *
 * Features:
 * - Supports both linear fog (ngt-fog) and exponential fog (ngt-fogExp2)
 * - Fully declarative approach (no imperative scene.fog manipulation)
 * - Reactive updates via signal inputs
 * - Automatic cleanup
 *
 * Usage:
 * ```html
 * <!-- Exponential Fog -->
 * <app-fog
 *   [fogType]="'exponential'"
 *   [color]="0xcccccc"
 *   [density]="0.008"
 * />
 *
 * <!-- Linear Fog -->
 * <app-fog
 *   [fogType]="'linear'"
 *   [color]="0x87ceeb"
 *   [near]="10"
 *   [far]="100"
 * />
 * ```
 */

import { Component, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';
import { Colors3D } from '../../config/colors.config';

@Component({
  selector: 'app-fog',
  standalone: true,
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @if (fogType() === 'linear') {
    <!-- Linear Fog (THREE.Fog) -->
    <ngt-fog [color]="color()" [near]="near()" [far]="far()" />
    } @else {
    <!-- Exponential Fog (THREE.FogExp2) -->
    <ngt-fog-exp2 [color]="color()" [density]="density()" />

    }
  `,
})
export class FogComponent {
  // Fog configuration inputs (signal-based)
  readonly fogType = input<'linear' | 'exponential'>('exponential');
  readonly color = input<number>(Colors3D.material.lightGray.hex);

  // Linear fog parameters (THREE.Fog)
  readonly near = input<number>(10);
  readonly far = input<number>(100);

  // Exponential fog parameters (THREE.FogExp2)
  readonly density = input<number>(0.008);
}
