/**
 * SceneLightingComponent - Declarative Scene Lighting Setup
 *
 * Encapsulates all lighting types (ambient, directional, point, spot, hemisphere)
 * using the centralized SceneLighting configuration types.
 *
 * Features:
 * - Type-safe lighting configuration via SceneLighting interface
 * - Support for all Three.js light types
 * - Predefined lighting presets (default, bright, dark, dramatic, studio, outdoor, minimal)
 * - Shadow configuration for directional/point/spot lights
 *
 * Usage:
 * ```html
 * <!-- Custom configuration -->
 * <app-scene-lighting [config]="{
 *   ambient: { color: 0xffffff, intensity: 1.2 },
 *   directional: [{ color: 0xffffff, intensity: 2.0, position: [10, 10, 10], castShadow: true }],
 *   point: [{ color: 0xff00ff, intensity: 1.5, position: [5, 5, 5], distance: 10 }]
 * }" />
 *
 * <!-- Using preset -->
 * <app-scene-lighting preset="dramatic" />
 * ```
 */

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  computed,
} from '@angular/core';
import {
  SceneLighting,
  LIGHTING_PRESETS,
} from '../../types/scene-lighting.types';

@Component({
  selector: 'app-scene-lighting',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Ambient Light -->
    @if (lighting().ambient) {
    <ngt-ambient-light
      [color]="lighting().ambient!.color"
      [intensity]="lighting().ambient!.intensity"
    />
    }

    <!-- Directional Lights -->
    @for (light of lighting().directional; track $index) {
    <ngt-directional-light
      [color]="light.color"
      [intensity]="light.intensity"
      [position]="light.position"
      [castShadow]="light.castShadow ?? false"
      [shadow-mapSize-width]="light.shadowMapSize ?? 1024"
      [shadow-mapSize-height]="light.shadowMapSize ?? 1024"
    />
    }

    <!-- Point Lights -->
    @for (light of lighting().point; track $index) {
    <ngt-point-light
      [color]="light.color"
      [intensity]="light.intensity"
      [position]="light.position"
      [distance]="light.distance ?? 0"
      [decay]="light.decay ?? 2"
      [castShadow]="light.castShadow ?? false"
    />
    }

    <!-- Spot Lights -->
    @for (light of lighting().spot; track $index) {
    <ngt-spot-light
      [color]="light.color"
      [intensity]="light.intensity"
      [position]="light.position"
      [angle]="light.angle ?? Math.PI / 3"
      [penumbra]="light.penumbra ?? 0"
      [distance]="light.distance ?? 0"
      [decay]="light.decay ?? 2"
      [castShadow]="light.castShadow ?? false"
      [target-position]="light.target ?? [0, 0, 0]"
    />
    }

    <!-- Hemisphere Light -->
    @if (lighting().hemisphere) {
    <ngt-hemisphere-light
      [skyColor]="lighting().hemisphere!.skyColor"
      [groundColor]="lighting().hemisphere!.groundColor"
      [intensity]="lighting().hemisphere!.intensity"
    />
    }
  `,
})
export class SceneLightingComponent {
  // Math constant for template
  readonly Math = Math;

  // Inputs
  readonly config = input<SceneLighting | undefined>(undefined);
  readonly preset = input<keyof typeof LIGHTING_PRESETS | undefined>(undefined);

  // Computed lighting configuration
  readonly lighting = computed<SceneLighting>(() => {
    // Priority: config > preset > default preset
    if (this.config()) {
      return this.config()!;
    }

    const presetName = this.preset();
    if (presetName && LIGHTING_PRESETS[presetName]) {
      return LIGHTING_PRESETS[presetName];
    }

    // Fallback to 'default' preset
    return LIGHTING_PRESETS['default'];
  });
}
