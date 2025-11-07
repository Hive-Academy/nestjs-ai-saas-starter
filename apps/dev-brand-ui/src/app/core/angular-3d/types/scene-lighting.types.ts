/**
 * Scene Lighting Configuration Types
 *
 * Shared abstractions for lighting across all 3D scenes.
 * Provides reusable, type-safe lighting configurations.
 *
 * Usage:
 * ```typescript
 * const lighting: SceneLighting = {
 *   ambient: { color: 0xffffff, intensity: 0.8 },
 *   directional: [
 *     { color: 0xffffff, intensity: 1.5, position: [10, 10, 10], castShadow: true }
 *   ],
 *   point: [
 *     { color: 0xff0000, intensity: 1.0, position: [5, 5, 5], distance: 10 }
 *   ]
 * };
 * ```
 */

/**
 * Ambient light configuration
 * Provides overall scene illumination
 */
export interface AmbientLightConfig {
  color: number; // Hex color (e.g., 0xffffff)
  intensity: number; // Light intensity (0-10, typically 0.5-2)
}

/**
 * Directional light configuration
 * Simulates sunlight - parallel rays from a direction
 */
export interface DirectionalLightConfig {
  color: number;
  intensity: number;
  position: [number, number, number];
  castShadow?: boolean;
  shadowMapSize?: number; // Shadow quality (e.g., 1024, 2048)
}

/**
 * Point light configuration
 * Emits light in all directions from a point
 */
export interface PointLightConfig {
  color: number;
  intensity: number;
  position: [number, number, number];
  distance?: number; // Max distance of light influence
  decay?: number; // Light falloff (1 = physical, 2 = more falloff)
  castShadow?: boolean;
}

/**
 * Spot light configuration
 * Cone of light from a point
 */
export interface SpotLightConfig {
  color: number;
  intensity: number;
  position: [number, number, number];
  target?: [number, number, number];
  angle?: number; // Cone angle in radians
  penumbra?: number; // Edge softness (0-1)
  distance?: number;
  decay?: number;
  castShadow?: boolean;
}

/**
 * Hemisphere light configuration
 * Sky and ground colors for outdoor scenes
 */
export interface HemisphereLightConfig {
  skyColor: number;
  groundColor: number;
  intensity: number;
}

/**
 * Complete scene lighting configuration
 */
export interface SceneLighting {
  ambient?: AmbientLightConfig;
  directional?: DirectionalLightConfig[];
  point?: PointLightConfig[];
  spot?: SpotLightConfig[];
  hemisphere?: HemisphereLightConfig;
}

/**
 * Predefined lighting presets
 */
export const LIGHTING_PRESETS: Record<string, SceneLighting> = {
  /**
   * Default - Balanced indoor lighting
   */
  default: {
    ambient: { color: 0x404080, intensity: 0.8 },
    directional: [
      {
        color: 0xffffff,
        intensity: 1.5,
        position: [10, 10, 10],
        castShadow: true,
        shadowMapSize: 1024,
      },
    ],
  },

  /**
   * Bright - Well-lit scene for light themes
   */
  bright: {
    ambient: { color: 0xffffff, intensity: 1.5 },
    directional: [
      {
        color: 0xffffff,
        intensity: 2.0,
        position: [10, 10, 10],
        castShadow: true,
        shadowMapSize: 2048,
      },
    ],
  },

  /**
   * Dark - Moody lighting for dark themes
   */
  dark: {
    ambient: { color: 0x202040, intensity: 0.4 },
    directional: [
      {
        color: 0x8080ff,
        intensity: 0.8,
        position: [10, 10, 10],
        castShadow: true,
      },
    ],
    point: [
      {
        color: 0x4040ff,
        intensity: 0.6,
        position: [5, 5, 5],
        distance: 20,
        decay: 2,
      },
    ],
  },

  /**
   * Dramatic - High contrast with multiple lights
   */
  dramatic: {
    ambient: { color: 0x202020, intensity: 0.3 },
    directional: [
      {
        color: 0xffffff,
        intensity: 2.5,
        position: [10, 10, 10],
        castShadow: true,
        shadowMapSize: 2048,
      },
    ],
    point: [
      {
        color: 0xff0000,
        intensity: 1.5,
        position: [-5, 5, 5],
        distance: 15,
        decay: 2,
      },
      {
        color: 0x0000ff,
        intensity: 1.5,
        position: [5, 5, 5],
        distance: 15,
        decay: 2,
      },
    ],
  },

  /**
   * Studio - Professional 3-point lighting
   */
  studio: {
    ambient: { color: 0x808080, intensity: 0.5 },
    directional: [
      // Key light
      {
        color: 0xffffff,
        intensity: 1.8,
        position: [5, 10, 5],
        castShadow: true,
        shadowMapSize: 2048,
      },
      // Fill light
      {
        color: 0x8080ff,
        intensity: 0.6,
        position: [-5, 5, 5],
        castShadow: false,
      },
    ],
    point: [
      // Back light
      {
        color: 0xffffff,
        intensity: 1.0,
        position: [0, 5, -5],
        distance: 20,
      },
    ],
  },

  /**
   * Outdoor - Natural daylight simulation
   */
  outdoor: {
    hemisphere: {
      skyColor: 0x87ceeb,
      groundColor: 0x654321,
      intensity: 1.0,
    },
    directional: [
      {
        color: 0xffffff,
        intensity: 1.5,
        position: [10, 20, 5],
        castShadow: true,
        shadowMapSize: 2048,
      },
    ],
  },

  /**
   * Minimal - Very basic lighting
   */
  minimal: {
    ambient: { color: 0x404040, intensity: 0.4 },
    directional: [
      {
        color: 0xffffff,
        intensity: 0.6,
        position: [10, 10, 5],
        castShadow: false,
      },
    ],
  },
};
