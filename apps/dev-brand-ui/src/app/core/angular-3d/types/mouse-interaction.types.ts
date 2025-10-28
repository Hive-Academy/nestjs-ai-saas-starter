/**
 * Mouse Interaction Types
 *
 * Type definitions for the composable mouse interaction system.
 * Used by MouseInteractionService and interaction directives.
 */

/**
 * Parallax configuration for depth-based position offset
 */
export interface ParallaxConfig {
  /** Parallax intensity (0 = no movement, 1 = full movement) */
  factor: number;

  /** Which axes to apply parallax on */
  axis: 'x' | 'y' | 'xy';

  /** Scale parallax by object's Z-depth (farther = less movement) */
  depthScale: boolean;
}

/**
 * Rotation configuration for mouse-based rotation
 */
export interface RotationConfig {
  /** Rotation intensity (0 = no rotation, 1 = full rotation) */
  factor: number;

  /** Which axes to rotate on */
  axis: 'x' | 'y' | 'z' | 'xy';

  /** Interpolation smoothing factor (higher = faster transitions) */
  smoothing: number;
}

/**
 * Hover configuration for scale/glow effects
 */
export interface HoverConfig {
  /** Scale multiplier on hover (e.g., 1.12 = 12% larger) */
  scale: number;

  /** Glow intensity change on hover */
  glow: number;

  /** Transition speed (higher = faster) */
  speed: number;
}

/**
 * Normalized mouse position (-1 to 1)
 */
export interface NormalizedMousePosition {
  x: number;
  y: number;
}

/**
 * Smoothed mouse position with interpolation
 */
export interface SmoothedMousePosition extends NormalizedMousePosition {
  targetX: number;
  targetY: number;
}
