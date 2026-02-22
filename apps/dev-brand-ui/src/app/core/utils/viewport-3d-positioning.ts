/**
 * Viewport 3D Positioning Utilities
 *
 * Maps familiar CSS-like positioning to 3D world space coordinates.
 * Designed for web developers who think in viewport dimensions, not arbitrary 3D coordinates.
 *
 * Key Concepts:
 * - "Viewport Plane": A 2D plane in 3D space at a fixed Z distance from camera
 * - Coordinates map to visible screen area (like CSS positioning)
 * - Units can be viewport percentages, pixels, or named positions
 *
 * Usage:
 * ```typescript
 * const positioner = new ViewportPositioner({ fov: 75, cameraZ: 20 });
 *
 * // Position at top-center of screen
 * const pos1 = positioner.getPosition('top-center', { offsetY: -10 });
 *
 * // Position at 25% from left, 75% from top
 * const pos2 = positioner.getPosition({ x: '25%', y: '75%' });
 *
 * // Position in pixels from top-left
 * const pos3 = positioner.getPosition({ x: 100, y: 50 }, { unit: 'px' });
 * ```
 */

export interface ViewportConfig {
  fov: number; // Camera field of view in degrees
  cameraZ: number; // Camera Z position (distance from viewport plane)
  viewportZ?: number; // Z position of the viewport plane (default: 0)
  aspect?: number; // Aspect ratio (width/height), default: window aspect
}

export interface PositionOffset {
  offsetX?: number; // Additional X offset in world units
  offsetY?: number; // Additional Y offset in world units
  offsetZ?: number; // Additional Z offset in world units
}

export interface PixelPositionOptions extends PositionOffset {
  unit?: 'px' | 'viewport' | 'world'; // Default: 'viewport'
  viewportWidth?: number; // Default: window.innerWidth
  viewportHeight?: number; // Default: window.innerHeight
}

export type NamedPosition =
  | 'center'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface PercentagePosition {
  x: string | number; // '50%' or 0.5 for center
  y: string | number; // '25%' or 0.25 for quarter from top
}

/**
 * ViewportPositioner - Convert viewport-relative positions to 3D world coordinates
 */
export class ViewportPositioner {
  private config: Required<ViewportConfig>;
  private viewportHeight: number;
  private viewportWidth: number;

  constructor(config: ViewportConfig) {
    const aspect =
      config.aspect ||
      (typeof window !== 'undefined'
        ? window.innerWidth / window.innerHeight
        : 16 / 9);

    this.config = {
      fov: config.fov,
      cameraZ: config.cameraZ,
      viewportZ: config.viewportZ ?? 0,
      aspect,
    };

    // Calculate visible viewport dimensions at the viewport plane
    this.viewportHeight = this.calculateViewportHeight();
    this.viewportWidth = this.viewportHeight * this.config.aspect;
  }

  /**
   * Calculate visible height at viewport plane using FOV and distance
   */
  private calculateViewportHeight(): number {
    const distance = this.config.cameraZ - this.config.viewportZ;
    const fovRad = (this.config.fov * Math.PI) / 180;
    return 2 * Math.tan(fovRad / 2) * distance;
  }

  /**
   * Get 3D position from named position (e.g., 'top-center', 'bottom-right')
   */
  private getNamedPosition(
    name: NamedPosition,
    options: PositionOffset = {}
  ): [number, number, number] {
    const halfW = this.viewportWidth / 2;
    const halfH = this.viewportHeight / 2;

    const positions: Record<NamedPosition, [number, number]> = {
      center: [0, 0],
      'top-left': [-halfW, halfH],
      'top-center': [0, halfH],
      'top-right': [halfW, halfH],
      'middle-left': [-halfW, 0],
      'middle-right': [halfW, 0],
      'bottom-left': [-halfW, -halfH],
      'bottom-center': [0, -halfH],
      'bottom-right': [halfW, -halfH],
    };

    const [x, y] = positions[name];
    return [
      x + (options.offsetX || 0),
      y + (options.offsetY || 0),
      this.config.viewportZ + (options.offsetZ || 0),
    ];
  }

  /**
   * Get 3D position from percentage position (0-100% or 0-1)
   */
  private getPercentagePosition(
    pos: PercentagePosition,
    options: PositionOffset = {}
  ): [number, number, number] {
    // Parse percentage strings or decimal values
    const parsePercent = (val: string | number): number => {
      if (typeof val === 'string') {
        return parseFloat(val) / 100;
      }
      return val;
    };

    const xPercent = parsePercent(pos.x);
    const yPercent = parsePercent(pos.y);

    // Convert to world coordinates (-0.5 to 0.5 viewport space)
    const x = (xPercent - 0.5) * this.viewportWidth;
    const y = (0.5 - yPercent) * this.viewportHeight; // Invert Y (CSS is top-down)

    return [
      x + (options.offsetX || 0),
      y + (options.offsetY || 0),
      this.config.viewportZ + (options.offsetZ || 0),
    ];
  }

  /**
   * Get 3D position from pixel coordinates
   */
  private getPixelPosition(
    pos: { x: number; y: number },
    options: PixelPositionOptions = {}
  ): [number, number, number] {
    const viewportWidth =
      options.viewportWidth ||
      (typeof window !== 'undefined' ? window.innerWidth : 1920);
    const viewportHeight =
      options.viewportHeight ||
      (typeof window !== 'undefined' ? window.innerHeight : 1080);

    // Convert pixels to viewport percentage
    const xPercent = pos.x / viewportWidth;
    const yPercent = pos.y / viewportHeight;

    return this.getPercentagePosition({ x: xPercent, y: yPercent }, options);
  }

  /**
   * Main method: Get 3D position from any position format
   */
  getPosition(
    position: NamedPosition | PercentagePosition | { x: number; y: number },
    options: PixelPositionOptions = {}
  ): [number, number, number] {
    // Named position
    if (typeof position === 'string') {
      return this.getNamedPosition(position, options);
    }

    // Check if it's pixel coordinates (numbers, not percentage strings)
    if (
      typeof position.x === 'number' &&
      typeof position.y === 'number' &&
      (options.unit === 'px' || (!('unit' in options) && position.x > 1))
    ) {
      return this.getPixelPosition(
        position as { x: number; y: number },
        options
      );
    }

    // Percentage position
    return this.getPercentagePosition(position as PercentagePosition, options);
  }

  /**
   * Get viewport dimensions in world units
   */
  getViewportDimensions(): { width: number; height: number } {
    return {
      width: this.viewportWidth,
      height: this.viewportHeight,
    };
  }

  /**
   * Get responsive font size based on viewport height
   * Similar to CSS vh units
   */
  getResponsiveFontSize(vhPercent: number): number {
    return (this.viewportHeight * vhPercent) / 100;
  }

  /**
   * Convert world units to approximate pixels
   */
  worldToPixels(worldUnits: number): number {
    const viewportHeight =
      typeof window !== 'undefined' ? window.innerHeight : 1080;
    return (worldUnits / this.viewportHeight) * viewportHeight;
  }

  /**
   * Convert pixels to world units
   */
  pixelsToWorld(pixels: number): number {
    const viewportHeight =
      typeof window !== 'undefined' ? window.innerHeight : 1080;
    return (pixels / viewportHeight) * this.viewportHeight;
  }
}

/**
 * Helper function to create a standard viewport positioner for typical camera setup
 */
export function createStandardViewportPositioner(
  cameraZ = 20,
  fov = 75
): ViewportPositioner {
  return new ViewportPositioner({ fov, cameraZ });
}
