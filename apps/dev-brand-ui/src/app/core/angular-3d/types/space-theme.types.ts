/**
 * Space Theme Types - Flexible color themes for space scenes
 *
 * Defines color palettes and theme presets that can be applied to
 * space scene primitives (planets, stars, nebulas, backgrounds).
 *
 * Usage:
 * ```typescript
 * import { SPACE_THEMES } from './space-theme.types';
 * const theme = SPACE_THEMES.classicSpace;
 * ```
 */

/**
 * Color configuration for a space theme
 */
export interface SpaceTheme {
  name: string;
  description: string;

  // Background gradient (top to bottom or center to edges)
  background: {
    type: 'linear' | 'radial';
    colors: number[]; // Array of hex colors for gradient stops
  };

  // Star/particle colors
  stars: {
    colors: string[]; // Hex color strings for variety
    sizes: { min: number; max: number };
    twinkle: boolean;
    density: 'low' | 'medium' | 'high';
  };

  // Planet/sphere colors
  planet: {
    baseColor: number;
    emissiveColor: number;
    emissiveIntensity: number;
    glowColor: number;
    glowIntensity: number;
  };

  // Nebula/cloud colors
  nebula: {
    colors: string[];
    opacity: number;
    flow: boolean;
  };

  // Accent lighting colors
  lights: {
    ambient: { color: number; intensity: number };
    directional: { color: number; intensity: number };
    point: Array<{
      color: number;
      intensity: number;
      position: [number, number, number];
    }>;
  };

  /**
   * Atmospheric fog effect (optional)
   *
   * Adds depth and atmosphere to the 3D scene through exponential fog.
   *
   * @example
   * ```typescript
   * // Enable fog with white glow
   * fog: {
   *   enabled: true,
   *   color: 0xcccccc,  // White glow
   *   density: 0.008     // Subtle fog (recommended: 0.005-0.015)
   * }
   *
   * // Disable fog for clear space
   * fog: {
   *   enabled: false
   * }
   * ```
   */
  fog?: {
    enabled: boolean;
    color: number; // Hex color (0xcccccc for white glow)
    density: number; // 0.005-0.015 range (0.008 recommended)
  };
}

/**
 * Predefined space themes
 */
export const SPACE_THEMES: Record<
  | 'classicSpace'
  | 'purpleNebula'
  | 'cyanCosmos'
  | 'warmSunset'
  | 'lightSky'
  | 'greenAurora',
  SpaceTheme
> = {
  /**
   * Classic dark space - realistic night sky
   */
  classicSpace: {
    name: 'Classic Space',
    description: 'Traditional dark space with white stars',
    background: {
      type: 'radial',
      colors: [0x000000, 0x0a0a1a, 0x000000],
    },
    stars: {
      colors: ['#ffffff', '#f0f0ff', '#e0e0ff', '#d0d0ff'],
      sizes: { min: 0.5, max: 2.0 },
      twinkle: true,
      density: 'high',
    },
    planet: {
      baseColor: 0xcccccc,
      emissiveColor: 0x888888,
      emissiveIntensity: 0.2,
      glowColor: 0xffffff,
      glowIntensity: 0.8,
    },
    nebula: {
      colors: ['#1a1a3a', '#2a2a4a', '#1a1a2a'],
      opacity: 0.4,
      flow: true,
    },
    lights: {
      ambient: { color: 0x404080, intensity: 1.5 },
      directional: { color: 0xffffff, intensity: 2.5 },
      point: [{ color: 0xffffff, intensity: 2.0, position: [10, 5, 5] }],
    },
  },

  /**
   * Purple nebula - deep purple space aesthetic
   */
  purpleNebula: {
    name: 'Purple Nebula',
    description: 'Deep purple space with violet stars',
    background: {
      type: 'radial',
      colors: [0x1a0033, 0x0a001a, 0x000000],
    },
    stars: {
      colors: ['#e0c0ff', '#d0b0ff', '#c0a0ff', '#b090ff'],
      sizes: { min: 0.6, max: 2.2 },
      twinkle: true,
      density: 'medium',
    },
    planet: {
      baseColor: 0x8a2be2,
      emissiveColor: 0x6a1bb2,
      emissiveIntensity: 0.4,
      glowColor: 0xda70d6,
      glowIntensity: 1.2,
    },
    nebula: {
      colors: ['#4a1d6b', '#6a2ba7', '#8a3bc7'],
      opacity: 0.5,
      flow: true,
    },
    lights: {
      ambient: { color: 0x6a2ba7, intensity: 1.8 },
      directional: { color: 0xda70d6, intensity: 2.5 },
      point: [
        { color: 0x8a2be2, intensity: 2.0, position: [-10, 5, 5] },
        { color: 0xff69b4, intensity: 2.0, position: [10, 5, 5] },
      ],
    },
  },

  /**
   * Cyan cosmos - cool blue space
   */
  cyanCosmos: {
    name: 'Cyan Cosmos',
    description: 'Cool cyan and blue space aesthetic',
    background: {
      type: 'radial',
      colors: [0x001a33, 0x000a1a, 0x000000],
    },
    stars: {
      colors: ['#c0f0ff', '#b0e0ff', '#a0d0ff', '#90c0ff'],
      sizes: { min: 0.5, max: 2.0 },
      twinkle: true,
      density: 'medium',
    },
    planet: {
      baseColor: 0x00bfff,
      emissiveColor: 0x008fcc,
      emissiveIntensity: 0.3,
      glowColor: 0x87ceeb,
      glowIntensity: 1.0,
    },
    nebula: {
      colors: ['#1a3a5a', '#2a4a6a', '#3a5a7a'],
      opacity: 0.45,
      flow: true,
    },
    lights: {
      ambient: { color: 0x406080, intensity: 1.8 },
      directional: { color: 0x87ceeb, intensity: 2.5 },
      point: [{ color: 0x00bfff, intensity: 2.0, position: [0, -5, 8] }],
    },
  },

  /**
   * Warm sunset - Mars-like warm tones
   */
  warmSunset: {
    name: 'Warm Sunset',
    description: 'Warm orange and pink space aesthetic',
    background: {
      type: 'radial',
      colors: [0x331a00, 0x1a0a00, 0x000000],
    },
    stars: {
      colors: ['#ffe0c0', '#ffd0b0', '#ffc0a0', '#ffb090'],
      sizes: { min: 0.6, max: 2.1 },
      twinkle: true,
      density: 'low',
    },
    planet: {
      baseColor: 0xff6347,
      emissiveColor: 0xcc4327,
      emissiveIntensity: 0.35,
      glowColor: 0xff8c69,
      glowIntensity: 1.1,
    },
    nebula: {
      colors: ['#5a3a1a', '#6a4a2a', '#7a5a3a'],
      opacity: 0.4,
      flow: true,
    },
    lights: {
      ambient: { color: 0x806040, intensity: 1.8 },
      directional: { color: 0xff8c69, intensity: 2.5 },
      point: [{ color: 0xff6347, intensity: 2.0, position: [10, 10, 5] }],
    },
  },

  /**
   * Light sky - matches current hero section theme
   */
  lightSky: {
    name: 'Light Sky',
    description: 'Bright sky blue gradient matching current design',
    background: {
      type: 'linear',
      colors: [0x87ceeb, 0xffffff, 0x00bfff],
    },
    stars: {
      colors: ['#6a9bd8', '#5a8bc8', '#4a7bb8', '#3a6ba8'],
      sizes: { min: 0.8, max: 2.5 },
      twinkle: false,
      density: 'low',
    },
    planet: {
      baseColor: 0x4169e1,
      emissiveColor: 0x3159d1,
      emissiveIntensity: 0.25,
      glowColor: 0x6495ed,
      glowIntensity: 0.7,
    },
    nebula: {
      colors: ['#d0e8ff', '#e0f0ff', '#f0f8ff'],
      opacity: 0.3,
      flow: false,
    },
    lights: {
      ambient: { color: 0xa0c0e0, intensity: 2.5 },
      directional: { color: 0xffffff, intensity: 3.0 },
      point: [{ color: 0x87ceeb, intensity: 2.0, position: [10, 10, 10] }],
    },
  },

  /**
   * Green aurora - ethereal green space
   */
  greenAurora: {
    name: 'Green Aurora',
    description: 'Ethereal green aurora-inspired space',
    background: {
      type: 'radial',
      colors: [0x001a0a, 0x000a05, 0x000000],
    },
    stars: {
      colors: ['#c0ffe0', '#b0ffd0', '#a0ffc0', '#90ffb0'],
      sizes: { min: 0.5, max: 1.9 },
      twinkle: true,
      density: 'medium',
    },
    planet: {
      baseColor: 0x32cd32,
      emissiveColor: 0x22ad22,
      emissiveIntensity: 0.35,
      glowColor: 0x90ee90,
      glowIntensity: 1.1,
    },
    nebula: {
      colors: ['#1a4a2a', '#2a5a3a', '#3a6a4a'],
      opacity: 0.45,
      flow: true,
    },
    lights: {
      ambient: { color: 0x406050, intensity: 1.8 },
      directional: { color: 0x90ee90, intensity: 2.5 },
      point: [{ color: 0x32cd32, intensity: 2.0, position: [12, -6, 5] }],
    },
  },
};

/**
 * Helper function to get theme by name
 */
export function getSpaceTheme(themeName: string): SpaceTheme {
  return SPACE_THEMES[themeName] || SPACE_THEMES['classicSpace'];
}

/**
 * Helper function to list all available themes
 */
export function getAvailableThemes(): string[] {
  return Object.keys(SPACE_THEMES);
}
