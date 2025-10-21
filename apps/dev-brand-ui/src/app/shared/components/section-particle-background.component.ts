/**
 * SectionParticleBackground Component
 *
 * Lightweight particle system for section backgrounds.
 * Provides a reusable, configurable particle background with color themes
 * and minimal lighting setup. Designed to stay within 3D performance budget.
 *
 * Pattern Source: hero-scene-graph.component.ts:212-219 + particle-system.component.ts
 * Design System: Color-tinted particle systems for different section themes
 *
 * Usage:
 * ```html
 * <!-- As a scene graph component -->
 * <app-section-particle-background
 *   [particleCount]="30"
 *   [tintColor]="'green'"
 *   [exclusionZone]="{ x: 10, y: 6 }"
 * />
 * ```
 */

import {
  Component,
  input,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { ParticleSystemComponent } from '../../core/angular-3d/components/primitives/particle-system.component';

@Component({
  selector: 'app-section-particle-background',
  standalone: true,
  imports: [ParticleSystemComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Minimal ambient lighting -->
    <ngt-ambient-light [intensity]="1.0" [color]="lightColor" />

    <!-- Particle system with computed color palette -->
    <app-particle-system
      [particleCount]="particleCount()"
      [colorPalette]="computedColorPalette()"
      [exclusionZone]="exclusionZone()"
      [size]="particleSize()"
      [opacity]="particleOpacity()"
    />
  `,
})
export class SectionParticleBackgroundComponent {
  // Light color constant (white ambient light)
  readonly lightColor = 0xffffff;

  // Configuration inputs
  readonly particleCount = input<number>(200);
  readonly colorPalette = input<string[]>([]);
  readonly exclusionZone = input<{ x: number; y: number }>({ x: 10, y: 6 });
  readonly particleSize = input<number>(0.8);
  readonly particleOpacity = input<number>(0.5);
  readonly tintColor = input<
    'purple' | 'green' | 'cyan' | 'orange' | 'pink' | 'blue'
  >('purple');

  // Computed color palettes based on tint
  // Color values extracted from design analysis and hero section
  readonly computedColorPalette = computed(() => {
    // If custom palette provided, use it
    if (this.colorPalette().length > 0) {
      return this.colorPalette();
    }

    // Otherwise, use tint-based palette
    const tintMap: Record<string, string[]> = {
      purple: [
        '#8a2be2', // Blue Violet
        '#9b59d6', // Medium Purple
        '#7b3ab3', // Dark Purple
        '#a960ee', // Light Purple
        '#6a2ba7', // Deep Purple
      ],
      green: [
        '#32cd32', // Lime Green
        '#3cb371', // Medium Sea Green
        '#2e8b57', // Sea Green
        '#00fa9a', // Medium Spring Green
        '#228b22', // Forest Green
      ],
      cyan: [
        '#00bfff', // Deep Sky Blue
        '#1e90ff', // Dodger Blue
        '#4169e1', // Royal Blue
        '#4682b4', // Steel Blue
        '#5f9ea0', // Cadet Blue
      ],
      orange: [
        '#ffd700', // Gold
        '#ffa500', // Orange
        '#ff8c00', // Dark Orange
        '#ff7f50', // Coral
        '#ff6347', // Tomato
      ],
    };

    return tintMap[this.tintColor()];
  });
}
