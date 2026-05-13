# Task Context: TASK_2025_030

## Task ID

TASK_2025_030

## Title

Angular 3D Color System - Extract Hardcoded Colors to Shared Configuration

## User Intent

The user wants to extract all hardcoded hexadecimal color values from the angular-3d components into a centralized color configuration file with meaningful names. This will:

1. Eliminate repeated color values throughout the codebase
2. Provide semantic naming for colors (e.g., `neon-cyan`, `glow-indigo`)
3. Make it easier to maintain and update color schemes
4. Reduce errors from using hex colors directly in templates

## Problem Statement

Currently, the angular-3d components have hardcoded hex color values scattered throughout:

- Component templates (e.g., `[glowColor]="0x00ffff"`)
- Component classes (e.g., `glowColor = input<number>(0x00ffff)`)
- Scene graph components with theme-specific colors
- Material properties with numeric hex values

This leads to:

- Code duplication
- Difficult maintenance when changing color schemes
- Lack of semantic meaning (what is `0x6366f1`?)
- Potential errors from typos in hex values

## Scope

- **In Scope:**

  - Search all files in `apps/dev-brand-ui/src/app/core/angular-3d/`
  - Extract all hardcoded hex color values (0xRRGGBB format)
  - Create a shared color configuration file
  - Assign meaningful semantic names to colors
  - Update all components to use the shared colors
  - Include CSS/hex string colors as well

- **Out of Scope:**
  - Colors outside the angular-3d module
  - Theme-specific colors in space-theme.types.ts (already centralized)
  - Dynamic/computed colors

## Background Context

### Current State

- New 3D text components (GlowingText3D, SmokeText3D) use hardcoded colors
- Scene graph components have inline hex values
- No centralized color system for 3D elements

### Recent Changes

- Just created GlowingText3DComponent and SmokeText3DComponent
- Both use hardcoded hex colors like `0x00ffff`, `0x6366f1`, `0x8b5cf6`
- These colors are duplicated in the hero space scene

## Conversation Summary

User requested this as a separate task after noticing:

1. Hex colors in templates cause errors
2. Color values are repeated across components
3. Need for semantic naming and centralized management
