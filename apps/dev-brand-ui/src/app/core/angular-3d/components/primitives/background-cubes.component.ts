/**
 * BackgroundCubesComponent - Collection Manager for Background Cubes
 *
 * Encapsulates the logic for generating and managing multiple background cubes
 * in a 3D scene. This component handles:
 * - Cube generation with zone-based distribution
 * - Exclusion zones to avoid overlapping with foreground content
 * - Color palette management
 * - Size and animation configuration
 *
 * Usage:
 * ```html
 * <app-background-cubes
 *   [count]="180"
 *   [colorPalette]="[0x7b3ab3, 0x6a2ba7, 0x8a2be2]"
 *   [exclusionZone]="{ x: 12, y: 8 }"
 *   [sizeRange]="{ min: 0.8, max: 2.6 }"
 * />
 * ```
 */

import {
  Component,
  computed,
  input,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { BackgroundCubeComponent } from './background-cube.component';

export interface ExclusionZone {
  x: number; // Half-width of exclusion zone
  y: number; // Half-height of exclusion zone
}

export interface SizeRange {
  min: number;
  max: number;
}

export interface FloatAnimationConfig {
  heightMin: number;
  heightMax: number;
  speedMin: number;
  speedMax: number;
  ease: string;
}

export interface CubeConfig {
  position: readonly [number, number, number];
  size: number;
  color: number;
  rotation: readonly [number, number, number];
  floatConfig: {
    height: number;
    speed: number;
    delay: number;
    ease: string;
    autoStart: boolean;
  };
}

@Component({
  selector: 'app-background-cubes',
  standalone: true,
  imports: [BackgroundCubeComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @for (cube of cubes(); track $index) {
    <app-background-cube
      [position]="cube.position"
      [size]="cube.size"
      [color]="cube.color"
      [rotation]="cube.rotation"
      [transparent]="transparent()"
      [opacity]="opacity()"
      [floatConfig]="cube.floatConfig"
    />
    }
  `,
})
export class BackgroundCubesComponent {
  // Configuration inputs
  readonly count = input<number>(180);
  readonly colorPalette = input<number[]>([
    0x7b3ab3, // Bright visible purple
    0x6a2ba7, // Medium bright purple
    0x5e3179, // Visible purple
    0x8a2be2, // Bright purple (blueviolet)
    0x9b59d6, // Light purple
    0x4a2d6e, // Deep but visible purple
  ]);
  readonly exclusionZone = input<ExclusionZone>({ x: 12, y: 8 });
  readonly sizeRange = input<SizeRange>({ min: 0.8, max: 2.6 });
  readonly transparent = input<boolean>(true);
  readonly opacity = input<number>(0.6);

  // Float animation configuration
  readonly floatAnimation = input<FloatAnimationConfig>({
    heightMin: 1.0,
    heightMax: 2.0,
    speedMin: 2500,
    speedMax: 4500,
    ease: 'sine.inOut',
  });

  // Zone distribution weights (top, bottom, left, right)
  readonly zoneWeights = input<[number, number, number, number]>([1, 1, 1, 1]);

  // Depth range for z-positioning
  readonly depthRange = input<{ min: number; max: number }>({
    min: -28,
    max: -8,
  });

  // Computed cube configurations
  readonly cubes = computed(() => this.generateCubes());

  /**
   * Generate cube configurations based on inputs
   */
  private generateCubes(): CubeConfig[] {
    const cubes: CubeConfig[] = [];
    const count = this.count();
    const colors = this.colorPalette();
    const sizeRange = this.sizeRange();
    const exclusion = this.exclusionZone();
    const floatConfig = this.floatAnimation();
    const depthRange = this.depthRange();

    for (let i = 0; i < count; i++) {
      // Random cube size within range
      const size =
        sizeRange.min + Math.random() * (sizeRange.max - sizeRange.min);

      // Determine zone (0: top, 1: bottom, 2: left, 3: right)
      const zone = Math.floor(Math.random() * 4);

      let x = 0;
      let y = 0;
      const z =
        depthRange.min + Math.random() * (depthRange.max - depthRange.min);

      // Position based on zone
      switch (zone) {
        case 0: // Top area
          x = (Math.random() - 0.5) * 50;
          y = 8 + Math.random() * 15; // High up
          break;
        case 1: // Bottom area
          x = (Math.random() - 0.5) * 50;
          y = -8 - Math.random() * 15; // Down low
          break;
        case 2: // Left side
          x = -15 - Math.random() * 25; // Far left
          y = (Math.random() - 0.5) * 30;
          break;
        case 3: // Right side
          x = 15 + Math.random() * 25; // Far right
          y = (Math.random() - 0.5) * 30;
          break;
      }

      // Ensure we stay away from the exclusion zone (center content area)
      if (Math.abs(x) < exclusion.x && Math.abs(y) < exclusion.y) {
        // Push further out if too close to center
        if (Math.abs(x) > Math.abs(y)) {
          x = x > 0 ? 15 + Math.random() * 10 : -15 - Math.random() * 10;
        } else {
          y = y > 0 ? 10 + Math.random() * 8 : -10 - Math.random() * 8;
        }
      }

      cubes.push({
        position: [x, y, z] as [number, number, number],
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: [
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        ] as [number, number, number],
        floatConfig: {
          height:
            floatConfig.heightMin +
            Math.random() * (floatConfig.heightMax - floatConfig.heightMin),
          speed:
            floatConfig.speedMin +
            Math.random() * (floatConfig.speedMax - floatConfig.speedMin),
          delay: Math.random() * 2000,
          ease: floatConfig.ease,
          autoStart: true,
        },
      });
    }

    return cubes;
  }
}
