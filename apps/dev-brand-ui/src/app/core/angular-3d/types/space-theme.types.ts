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
      colors: [0x0a0a1a, 0x050510, 0x000000], // Dark blue → darker → black
    },
    stars: {
      colors: ['#ffffff', '#f0f0f0', '#e0e0e0'],
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
      colors: ['#ffffff', '#e0e0e0', '#c0c0c0'], // Soft white/gray clouds
      opacity: 0.7,
      flow: true,
    },
    lights: {
      ambient: { color: 0x404080, intensity: 0.5 },
      directional: { color: 0xffffff, intensity: 3.5 },
      point: [{ color: 0xffffff, intensity: 2.5, position: [10, 5, 5] }],
    },
    fog: {
      enabled: true,
      color: 0x000508, // Very dark blue-black for realistic space atmosphere
      density: 0.04, // Increased density for visible atmospheric depth
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
      colors: [0x1a0a2e, 0x0f051a, 0x000000], // Deep purple → darker → black
    },
    stars: {
      colors: ['#ffffff', '#f0f0f0', '#e0e0e0'],
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
      colors: ['#e0c0f0', '#d0b0e0', '#c0a0d0'], // Soft purple clouds
      opacity: 0.3,
      flow: true,
    },
    lights: {
      ambient: { color: 0x6a2ba7, intensity: 0.5 },
      directional: { color: 0xda70d6, intensity: 3.5 },
      point: [
        { color: 0x8a2be2, intensity: 2.5, position: [-10, 5, 5] },
        { color: 0xff69b4, intensity: 2.5, position: [10, 5, 5] },
      ],
    },
    fog: {
      enabled: true,
      color: 0xda70d6,
      density: 0.01,
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
      colors: [0x0a1a2e, 0x050f1a, 0x000000], // Cyan blue → darker → black
    },
    stars: {
      colors: ['#ffffff', '#f0f0f0', '#e0e0e0'],
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
      colors: ['#d0e0f0', '#c0d0e0', '#b0c0d0'], // Soft cyan clouds
      opacity: 0.3,
      flow: true,
    },
    lights: {
      ambient: { color: 0x406080, intensity: 0.5 },
      directional: { color: 0x87ceeb, intensity: 3.5 },
      point: [{ color: 0x00bfff, intensity: 2.5, position: [0, -5, 8] }],
    },
    fog: {
      enabled: true,
      color: 0x87ceeb,
      density: 0.009,
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
      colors: [0x2e1a0a, 0x1a0f05, 0x000000], // Warm orange → darker → black
    },
    stars: {
      colors: ['#ffffff', '#f0f0f0', '#e0e0e0'],
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
      colors: ['#f0e0d0', '#e0d0c0', '#d0c0b0'], // Soft warm clouds
      opacity: 0.3,
      flow: true,
    },
    lights: {
      ambient: { color: 0x806040, intensity: 0.5 },
      directional: { color: 0xff8c69, intensity: 3.5 },
      point: [{ color: 0xff6347, intensity: 2.5, position: [10, 10, 5] }],
    },
    fog: {
      enabled: true,
      color: 0xff8c69,
      density: 0.007,
    },
  },

  /**
   * Light sky - matches current hero section theme
   */
  lightSky: {
    name: 'Light Sky',
    description: 'Bright sky blue gradient matching current design',
    background: {
      type: 'radial',
      colors: [0x1a2e4a, 0x0f1a2e, 0x050a14], // Light blue → medium → dark blue
    },
    stars: {
      colors: ['#ffffff', '#f0f0f0', '#e0e0e0'],
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
      colors: ['#f0f0f0', '#e0e0e0', '#d0d0d0'], // Very light soft clouds
      opacity: 0.2,
      flow: false,
    },
    lights: {
      ambient: { color: 0xa0c0e0, intensity: 0.5 },
      directional: { color: 0xffffff, intensity: 3.5 },
      point: [{ color: 0x87ceeb, intensity: 2.5, position: [10, 10, 10] }],
    },
    fog: {
      enabled: false,
      color: 0xffffff,
      density: 0.008,
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
      colors: [0x0a2e1a, 0x051a0f, 0x000000], // Green aurora → darker → black
    },
    stars: {
      colors: ['#ffffff', '#f0f0f0', '#e0e0e0'],
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
      colors: ['#d0f0e0', '#c0e0d0', '#b0d0c0'], // Soft green clouds
      opacity: 0.3,
      flow: true,
    },
    lights: {
      ambient: { color: 0x406050, intensity: 0.5 },
      directional: { color: 0x90ee90, intensity: 3.5 },
      point: [{ color: 0x32cd32, intensity: 2.5, position: [12, -6, 5] }],
    },
    fog: {
      enabled: true,
      color: 0x90ee90,
      density: 0.009,
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
