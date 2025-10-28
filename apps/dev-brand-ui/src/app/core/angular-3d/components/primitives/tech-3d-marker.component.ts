/**
 * Tech3DMarkerComponent - Billboard Text Marker for Technology Labels
 *
 * Displays technology labels on planet surface with glowing spot indicators.
 * Uses sprite-based text that always faces camera for optimal readability.
 *
 * Features:
 * - Canvas-based sprite text (always faces camera)
 * - Glowing surface spot indicator on planet
 * - Proper sphere surface positioning
 * - Tech-specific colors
 * - Compact, readable labels
 *
 * Usage:
 * ```html
 * <app-tech-3d-marker
 *   label="LangChain"
 *   [surfacePosition]="[x, y, z]"
 *   [textOffset]="0.3"
 * />
 * ```
 */

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  computed,
} from '@angular/core';
import { TextSpriteComponent } from './text-sprite.component';
import { GlowSpotComponent } from './glow-spot.component';

interface TechColor {
  hex: string;
  three: number;
}

@Component({
  selector: 'app-tech-3d-marker',
  standalone: true,
  imports: [TextSpriteComponent, GlowSpotComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Glowing spot exactly on planet surface -->
    <app-glow-spot
      [position]="surfacePosition()"
      [color]="techColors().three"
      [size]="spotSize()"
      [intensity]="glowIntensity()"
      [enablePulse]="enablePulse()"
    />

    <!-- Billboard text label above surface -->
    <app-text-sprite
      [text]="label()"
      [position]="textPosition()"
      [fontSize]="textFontSize()"
      [color]="techColors().hex"
      [scale]="textScale()"
    />
  `,
})
export class Tech3DMarkerComponent {
  // Label text
  readonly label = input.required<string>();

  // Positioning - surface position on sphere (at radius)
  readonly surfacePosition = input.required<[number, number, number]>();

  // Distance to position text above surface
  readonly textOffset = input<number>(0.3);

  // Visual properties
  readonly color = input<string | undefined>(undefined); // Optional hex color override
  readonly textFontSize = input<number>(32); // Canvas font size in pixels
  readonly textScale = input<number>(0.015); // World-space scale
  readonly spotSize = input<number>(0.15); // Spot size (visible on planet)
  readonly glowIntensity = input<number>(4.0);

  // Animation
  readonly enablePulse = input<boolean>(true);

  /**
   * Text position: surface position + outward offset
   * Computed by extending the position vector from origin
   */
  readonly textPosition = computed<[number, number, number]>(() => {
    const surface = this.surfacePosition();
    const offset = this.textOffset();

    // Calculate unit vector (direction from origin to surface)
    const length = Math.sqrt(
      surface[0] ** 2 + surface[1] ** 2 + surface[2] ** 2
    );
    const unitX = surface[0] / length;
    const unitY = surface[1] / length;
    const unitZ = surface[2] / length;

    // Position text at surface + offset along normal
    return [
      surface[0] + unitX * offset,
      surface[1] + unitY * offset,
      surface[2] + unitZ * offset,
    ];
  });

  /**
   * Get tech-specific colors based on label
   */
  readonly techColors = computed<TechColor>(() => {
    // If color override provided, use it
    if (this.color() !== undefined) {
      const hex = this.color()!;
      const three = parseInt(hex.replace('#', ''), 16);
      return { hex, three };
    }

    // Otherwise, determine by label
    const label = this.label().toLowerCase();

    if (label.includes('langchain')) {
      return {
        hex: '#3b82f6', // blue-500
        three: 0x3b82f6,
      };
    }

    if (label.includes('langgraph')) {
      return {
        hex: '#a855f7', // purple-500
        three: 0xa855f7,
      };
    }

    if (label.includes('neo4j')) {
      return {
        hex: '#22c55e', // green-500
        three: 0x22c55e,
      };
    }

    if (label.includes('chromadb') || label.includes('chroma')) {
      return {
        hex: '#ec4899', // pink-500
        three: 0xec4899,
      };
    }

    // Default: indigo
    return {
      hex: '#6366f1',
      three: 0x6366f1,
    };
  });
}
