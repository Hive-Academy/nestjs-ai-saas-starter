/**
 * Centralized color configuration for Angular 3D components
 *
 * Provides semantic color names for all 3D elements to avoid hardcoded hex values
 * and improve maintainability.
 *
 * Color Formats:
 * - hex: Three.js numeric format (0xRRGGBB) - used for Three.js materials
 * - css: CSS string format (#RRGGBB) - used for HTML/shader parameters
 *
 * Usage:
 * ```typescript
 * import { Colors3D } from '@core/angular-3d/config/colors.config';
 *
 * // In component:
 * [glowColor]="Colors3D.neon.cyan.hex"
 * [primaryColor]="Colors3D.nebula.primary.css"
 * ```
 */

export const Colors3D = {
  // Neon/Glow effects for UI elements and text
  neon: {
    cyan: { hex: 0x00ffff, css: '#00ffff' },
    indigo: { hex: 0x6366f1, css: '#6366f1' },
    purple: { hex: 0x8b5cf6, css: '#8b5cf6' },
    red: { hex: 0xff0000, css: '#ff0000' },
    lightRed: { hex: 0xff6666, css: '#ff6666' },
    pink: { hex: 0xff69b4, css: '#ff69b4' },
  },

  // Base material colors
  material: {
    white: { hex: 0xffffff, css: '#ffffff' },
    lightGray: { hex: 0xcccccc, css: '#cccccc' },
    mediumGray: { hex: 0x888888, css: '#888888' },
    darkGray: { hex: 0x444444, css: '#444444' },
    black: { hex: 0x000000, css: '#000000' },
  },

  // Space/atmosphere colors
  space: {
    deepVoid: { hex: 0x000000, css: '#000000' },
    darkBlue: { hex: 0x0a0a1a, css: '#0a0a1a' },
    darkerBlue: { hex: 0x050510, css: '#050510' },
    fog: { hex: 0x000508, css: '#000508' },
    ambientBlue: { hex: 0x404080, css: '#404080' },
    skyBlue: { hex: 0x87ceeb, css: '#87ceeb' },
    atmosphericBlue: { hex: 0x4488ff, css: '#4488ff' },
  },

  // Vibrant accent colors
  accent: {
    blue: { hex: 0x4a90e2, css: '#4a90e2' },
    blueViolet: { hex: 0x8a2be2, css: '#8a2be2' },
    hotPink: { hex: 0xff69b4, css: '#ff69b4' },
    deepSkyBlue: { hex: 0x00bfff, css: '#00bfff' },
    limeGreen: { hex: 0x32cd32, css: '#32cd32' },
    gold: { hex: 0xffd700, css: '#ffd700' },
    deepPurple: { hex: 0x6a2ba7, css: '#6a2ba7' },
    mediumOrchid: { hex: 0xba55d3, css: '#ba55d3' },
    mediumSlateBlue: { hex: 0x7b68ee, css: '#7b68ee' },
    slateBlue: { hex: 0x6a5acd, css: '#6a5acd' },
    royalBlue: { hex: 0x4169e1, css: '#4169e1' },
    emerald: { hex: 0x10b981, css: '#10b981' },
    amber: { hex: 0xf59e0b, css: '#f59e0b' },
    pink: { hex: 0xec4899, css: '#ec4899' },
    violet: { hex: 0xa855f7, css: '#a855f7' },
    teal: { hex: 0x14b8a6, css: '#14b8a6' },
    brightCyan: { hex: 0x00d9ff, css: '#00d9ff' },
  },

  // Celestial body colors
  planet: {
    orchid: { hex: 0xda70d6, css: '#da70d6' },
    cornflowerBlue: { hex: 0x6495ed, css: '#6495ed' },
    tomato: { hex: 0xff6347, css: '#ff6347' },
    salmon: { hex: 0xff8c69, css: '#ff8c69' },
    atmosphereBlue: { hex: 0x4488ff, css: '#4488ff' },
    atmosphereCyan: { hex: 0x6699ff, css: '#6699ff' },
  },

  // Star colors (realistic stellar classification)
  star: {
    oType: { css: '#9bb0ff' }, // Blue (hottest)
    bType: { css: '#aabfff' }, // Blue-white
    aType: { css: '#cad7ff' }, // White
    fType: { css: '#f8f7ff' }, // Yellow-white
    gType: { css: '#fff4ea' }, // Yellow (Sun-like)
    kType: { css: '#ffd2a1' }, // Orange
    mType: { css: '#ffcc6f' }, // Red-orange (coolest)
  },

  // Nebula colors
  nebula: {
    primary: { css: '#0088ff' },
    secondary: { css: '#00d4ff' },
    tertiary: { css: '#ff6bd4' },
  },

  // Cloud/atmosphere variations
  cloud: {
    white: ['#ffffff', '#f0f0f0', '#e0e0e0'],
    cyan: ['#d0e0f0', '#c0d0e0', '#b0c0d0'],
    purple: ['#e0c0f0', '#d0b0e0', '#c0a0d0'],
    warm: ['#f0e0d0', '#e0d0c0', '#d0c0b0'],
    green: ['#d0f0e0', '#c0e0d0', '#b0d0c0'],
  },

  // Particle system colors
  particle: {
    darkPurple: ['#4a1d6b', '#2d1b47', '#1a0d2e', '#261242', '#1e1139'],
  },

  // Brand colors for tech stack logos
  brand: {
    nestjs: { hex: 0xe0234e, css: '#e0234e' }, // Official NestJS red
    langchain: { hex: 0x1c3c3c, css: '#1c3c3c' }, // LangChain dark green
    chromadb: { hex: 0xffffff, css: '#ffffff' }, // ChromaDB white (multi-color logo)
    chromadbEmissive: { hex: 0x1a1a2e, css: '#1a1a2e' }, // ChromaDB subtle dark emissive
    neo4j: { hex: 0x008cc1, css: '#008cc1' }, // Official Neo4j blue
  },
} as const;

/**
 * Type-safe color value types
 */
export type Color3DHex = number;
export type Color3DCSS = string;

/**
 * Convert CSS hex string to Three.js numeric hex
 * @param css CSS hex string (e.g., '#00ffff')
 * @returns Three.js numeric hex (e.g., 0x00ffff)
 */
export function cssToHex(css: string): number {
  return parseInt(css.replace('#', '0x'));
}

/**
 * Convert Three.js numeric hex to CSS hex string
 * @param hex Three.js numeric hex (e.g., 0x00ffff)
 * @returns CSS hex string (e.g., '#00ffff')
 */
export function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}
