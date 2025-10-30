# Task Description: TASK_2025_030

## Overview

Extract all hardcoded color values from the angular-3d module into a centralized color configuration system with semantic naming.

## Goals

1. **Eliminate Code Duplication**: Remove repeated color values across components
2. **Semantic Naming**: Provide meaningful names (e.g., `neonCyan`, `glowIndigo`, `spaceDeep`)
3. **Maintainability**: Single source of truth for all 3D colors
4. **Type Safety**: Ensure proper TypeScript typing for all color values
5. **Consistency**: Standardize color usage across all 3D components

## Discovered Color Usage Patterns

### Hex Number Format (0xRRGGBB - Three.js style)

Found in: 150+ locations

- Components: `glowing-text-3d`, `smoke-text-3d`, `planet`, `floating-sphere`, `box`, `cylinder`, etc.
- Types: `space-theme.types.ts`, `scene-lighting.types.ts`
- Services: `angular-3d-state.store.ts`

### CSS Hex String Format (#RRGGBB)

Found in: 80+ locations

- Components: `star-field`, `nebula`, `nebula-volumetric`, `particle-system`
- Utils: `config-builders.ts`
- Types: `space-theme.types.ts`

## Common Color Categories Identified

### 1. **Neon/Glow Colors** (UI/Text Effects)

- `0x00ffff` - Cyan glow (default for glowing text)
- `0x6366f1` - Indigo glow (pill text top/bottom)
- `0x8b5cf6` - Purple glow (pill text middle)
- `0xff0000` - Red
- `0xff6666` - Light red glow

### 2. **Base/Material Colors**

- `0xffffff` - White (base color for most materials)
- `0xcccccc` - Light gray
- `0x888888` - Medium gray
- `0x444444` - Dark gray
- `0x000000` - Black (emissive default)

### 3. **Space Theme Colors** (Backgrounds/Atmospheres)

- `0x0a0a1a`, `0x050510`, `0x000000` - Deep space gradients
- `0x000508` - Space fog
- `0x404080` - Blue ambient light
- `0x87ceeb` - Sky blue
- `0x4488ff` - Atmospheric blue

### 4. **Vibrant Accent Colors**

- `0x4a90e2` - Blue accent
- `0x8a2be2` - Blue-violet
- `0xff69b4` - Hot pink
- `0x00bfff` - Deep sky blue
- `0x32cd32` - Lime green
- `0xffd700` - Gold

### 5. **Planet/Celestial Colors**

- `0xda70d6` - Orchid (planet glow)
- `0x6495ed` - Cornflower blue
- `0xff6347` - Tomato red
- `0xff8c69` - Salmon

### 6. **Star Colors** (Realistic stellar types)

- `#9bb0ff` - O-type (blue, hottest)
- `#aabfff` - B-type (blue-white)
- `#cad7ff` - A-type (white)
- `#f8f7ff` - F-type (yellow-white)
- `#fff4ea` - G-type (yellow, Sun-like)
- `#ffd2a1` - K-type (orange)
- `#ffcc6f` - M-type (red-orange, coolest)

### 7. **Nebula/Cloud Colors**

- `#0088ff`, `#00d4ff`, `#ff6bd4` - Nebula primary/secondary/tertiary
- `#ffffff`, `#f0f0f0`, `#e0e0e0` - Cloud whites
- `#d0e0f0`, `#c0d0e0`, `#b0c0d0` - Soft cyan clouds
- `#e0c0f0`, `#d0b0e0`, `#c0a0d0` - Soft purple clouds

### 8. **Particle System Colors**

- `#4a1d6b` - Dark purple
- `#2d1b47` - Very dark purple
- `#1a0d2e` - Deep purple
- `#261242` - Dark violet
- `#1e1139` - Dark navy

## Requirements

### 1. Create Color Configuration File

**Location**: `apps/dev-brand-ui/src/app/core/angular-3d/config/colors.config.ts`

**Structure**:

```typescript
/**
 * Centralized color configuration for Angular 3D components
 *
 * Color Formats:
 * - hex: Three.js numeric format (0xRRGGBB)
 * - css: CSS string format (#RRGGBB)
 *
 * Usage:
 * - Import: import { ThreeDColors } from '@core/angular-3d/config/colors.config';
 * - Use: [glowColor]="ThreeDColors.neon.cyan.hex"
 */

export const ThreeDColors = {
  // Neon/Glow effects for UI elements
  neon: {
    cyan: { hex: 0x00ffff, css: '#00ffff' },
    indigo: { hex: 0x6366f1, css: '#6366f1' },
    purple: { hex: 0x8b5cf6, css: '#8b5cf6' },
    red: { hex: 0xff0000, css: '#ff0000' },
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

  // Vibrant accents
  accent: {
    blue: { hex: 0x4a90e2, css: '#4a90e2' },
    blueViolet: { hex: 0x8a2be2, css: '#8a2be2' },
    hotPink: { hex: 0xff69b4, css: '#ff69b4' },
    deepSkyBlue: { hex: 0x00bfff, css: '#00bfff' },
    limeGreen: { hex: 0x32cd32, css: '#32cd32' },
    gold: { hex: 0xffd700, css: '#ffd700' },
  },

  // Celestial bodies
  planet: {
    orchid: { hex: 0xda70d6, css: '#da70d6' },
    cornflowerBlue: { hex: 0x6495ed, css: '#6495ed' },
    tomato: { hex: 0xff6347, css: '#ff6347' },
    salmon: { hex: 0xff8c69, css: '#ff8c69' },
  },

  // Star types (realistic stellar classification)
  star: {
    oType: { css: '#9bb0ff' }, // Blue (hottest)
    bType: { css: '#aabfff' }, // Blue-white
    aType: { css: '#cad7ff' }, // White
    fType: { css: '#f8f7ff' }, // Yellow-white
    gType: { css: '#fff4ea' }, // Yellow (Sun)
    kType: { css: '#ffd2a1' }, // Orange
    mType: { css: '#ffcc6f' }, // Red-orange (coolest)
  },

  // Nebula colors
  nebula: {
    primary: { css: '#0088ff' },
    secondary: { css: '#00d4ff' },
    tertiary: { css: '#ff6bd4' },
  },

  // Cloud colors
  cloud: {
    white: ['#ffffff', '#f0f0f0', '#e0e0e0'],
    cyan: ['#d0e0f0', '#c0d0e0', '#b0c0d0'],
    purple: ['#e0c0f0', '#d0b0e0', '#c0a0d0'],
    warm: ['#f0e0d0', '#e0d0c0', '#d0c0b0'],
    green: ['#d0f0e0', '#c0e0d0', '#b0d0c0'],
  },

  // Particle colors
  particle: {
    darkPurple: ['#4a1d6b', '#2d1b47', '#1a0d2e', '#261242', '#1e1139'],
  },
} as const;

// Type-safe color access
export type ThreeDColorHex = number;
export type ThreeDColorCSS = string;

// Helper function to convert CSS to Three.js hex
export function cssToHex(css: string): number {
  return parseInt(css.replace('#', '0x'));
}

// Helper function to convert Three.js hex to CSS
export function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}
```

### 2. Update All Component Files

Replace hardcoded colors with configuration imports in these files:

**Priority 1 - New Components**:

- `glowing-text-3d.component.ts` (3 colors)
- `smoke-text-3d.component.ts` (3 colors)
- `hero-space-scene.component.ts` (6 colors)

**Priority 2 - Core Components**:

- `floating-sphere.component.ts`
- `planet.component.ts`
- `box.component.ts`
- `cylinder.component.ts`
- `polyhedron.component.ts`
- `background-cube.component.ts`
- `background-cubes.component.ts`

**Priority 3 - Effects Components**:

- `star-field.component.ts`
- `star-field-enhanced.component.ts`
- `nebula.component.ts`
- `nebula-volumetric.component.ts`
- `particle-system.component.ts`

**Priority 4 - Directives & Utils**:

- `glow-3d.directive.ts`
- `config-builders.ts`

### 3. Update Type Files (Optional - Already Centralized)

Note: `space-theme.types.ts` and `scene-lighting.types.ts` already serve as centralized configs for themes. We should reference these where appropriate rather than duplicating.

## Implementation Steps

1. **Create** `colors.config.ts` with all identified colors
2. **Update** Priority 1 components (newest code)
3. **Run** type check: `npx nx typecheck dev-brand-ui`
4. **Update** Priority 2 components
5. **Run** type check again
6. **Update** Priority 3 components
7. **Update** Priority 4 files
8. **Run** full test suite
9. **Update** documentation

## Success Criteria

- ✅ All hardcoded hex colors extracted to `colors.config.ts`
- ✅ All components use imported color constants
- ✅ Type checking passes
- ✅ All tests pass
- ✅ No breaking changes to existing functionality
- ✅ Improved code maintainability
- ✅ Clear semantic naming for all colors

## Out of Scope

- Changing color values (only extracting existing ones)
- Theme system refactoring (already exists in space-theme.types.ts)
- Adding new colors (only existing ones)
- UI/UX color scheme changes

## Estimated Effort

**Medium (M)** - 2-3 hours

- Color catalog: 30 minutes
- Config file creation: 30 minutes
- Component updates: 1.5 hours
- Testing & validation: 30 minutes
