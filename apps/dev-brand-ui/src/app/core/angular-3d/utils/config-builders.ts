/**
 * Config Builder Utilities for HybridUIService
 *
 * Provides fluent builder API and factory functions for creating
 * HybridElementConfigExtended objects with sensible defaults.
 *
 * TASK_2025_012 - Phase 1, Task 1.1
 */

import type {
  HybridElementConfigExtended,
  AnimationConfig,
} from '../interfaces';

/**
 * Fluent builder for HybridElementConfigExtended
 * Pattern: Builder pattern for complex object construction
 *
 * @example
 * ```typescript
 * const config = HybridElementConfigBuilder.create('PRIMARY')
 *   .withMaterial({ opacity: 0.5, metalness: 0.8 })
 *   .withPosition(0, 0, -2)
 *   .withHoverAnimation({
 *     type: 'transform',
 *     duration: 500,
 *     properties: { scale: 1.1 }
 *   })
 *   .build();
 * ```
 */
export class HybridElementConfigBuilder {
  private config: Partial<HybridElementConfigExtended> = {};

  /**
   * Create a new builder instance with required priority
   *
   * @param priority Element rendering priority (HERO, PRIMARY, SECONDARY, TERTIARY)
   * @returns Builder instance for method chaining
   */
  static create(
    priority: 'HERO' | 'PRIMARY' | 'SECONDARY' | 'TERTIARY'
  ): HybridElementConfigBuilder {
    const builder = new HybridElementConfigBuilder();
    builder.config.priority = priority;
    return builder;
  }

  /**
   * Configure material properties (opacity, roughness, metalness, etc.)
   */
  withMaterial(material: HybridElementConfigExtended['material']): this {
    this.config.material = material;
    return this;
  }

  /**
   * Configure content texture generation
   */
  withContent(content: HybridElementConfigExtended['content']): this {
    this.config.content = content;
    return this;
  }

  /**
   * Configure decoration (glow effects, particles, etc.)
   */
  withDecoration(decoration: HybridElementConfigExtended['decoration']): this {
    this.config.decoration = decoration;
    return this;
  }

  /**
   * Set explicit 3D position (overrides automatic positioning)
   *
   * @param x X coordinate in 3D space
   * @param y Y coordinate in 3D space
   * @param z Z coordinate in 3D space (depth)
   */
  withPosition(x: number, y: number, z: number): this {
    this.config.position = [x, y, z];
    return this;
  }

  /**
   * Add hover animation configuration
   */
  withHoverAnimation(animationConfig: AnimationConfig): this {
    if (!this.config.animations) {
      this.config.animations = {};
    }
    this.config.animations.hover = animationConfig;
    return this;
  }

  /**
   * Add enter (mount) animation configuration
   */
  withEnterAnimation(animationConfig: AnimationConfig): this {
    if (!this.config.animations) {
      this.config.animations = {};
    }
    this.config.animations.enter = animationConfig;
    return this;
  }

  /**
   * Add exit (unmount) animation configuration
   */
  withExitAnimation(animationConfig: AnimationConfig): this {
    if (!this.config.animations) {
      this.config.animations = {};
    }
    this.config.animations.exit = animationConfig;
    return this;
  }

  /**
   * Add focus animation configuration
   */
  withFocusAnimation(animationConfig: AnimationConfig): this {
    if (!this.config.animations) {
      this.config.animations = {};
    }
    this.config.animations.focus = animationConfig;
    return this;
  }

  /**
   * Add idle animation configuration
   */
  withIdleAnimation(animationConfig: AnimationConfig): this {
    if (!this.config.animations) {
      this.config.animations = {};
    }
    this.config.animations.idle = animationConfig;
    return this;
  }

  /**
   * Configure performance optimizations (LOD, texture pooling, etc.)
   */
  withPerformance(
    performance: HybridElementConfigExtended['performance']
  ): this {
    this.config.performance = performance;
    return this;
  }

  /**
   * Configure Angular Three specific properties
   */
  withAngularThree(
    angularThree: HybridElementConfigExtended['angularThree']
  ): this {
    this.config.angularThree = angularThree;
    return this;
  }

  /**
   * Configure responsive behavior for different breakpoints
   */
  withResponsive(responsive: HybridElementConfigExtended['responsive']): this {
    this.config.responsive = responsive;
    return this;
  }

  /**
   * Build and validate the configuration
   *
   * @throws Error if required fields (priority) are missing
   * @returns Complete HybridElementConfigExtended configuration
   */
  build(): HybridElementConfigExtended {
    // Validation: priority is required
    if (!this.config.priority) {
      throw new Error(
        'Config builder requires priority to be set. Use HybridElementConfigBuilder.create(priority) to initialize.'
      );
    }

    return this.config as HybridElementConfigExtended;
  }
}

/**
 * Options for createCardConfig factory
 */
export interface CardConfigOptions {
  /** Card color (hex string) - optional, defaults to no color override */
  color?: string;
  /** Material opacity (0-1) - optional, defaults to 0.1 */
  opacity?: number;
  /** Rendering priority - optional, defaults to SECONDARY */
  priority?: 'PRIMARY' | 'SECONDARY' | 'TERTIARY';
  /** Enable hover animation - optional, defaults to true */
  enableHoverEffect?: boolean;
  /** Enable LOD optimization - optional, defaults to true */
  enableLOD?: boolean;
}

/**
 * Factory function for card-style hybrid elements
 *
 * Creates a glassmorphic card with sensible defaults:
 * - Low opacity (0.1) for glass effect
 * - High metalness (0.8) for reflective surface
 * - Clearcoat (1) for glossy finish
 * - Hover animation with rotation and lift
 * - LOD and texture pooling for performance
 *
 * @param options Card configuration options
 * @returns Complete card configuration ready for HybridUIService
 *
 * @example
 * ```typescript
 * const cardConfig = createCardConfig({
 *   color: '#8a2be2',
 *   opacity: 0.2,
 *   priority: 'PRIMARY'
 * });
 *
 * await hybridUI.createHybridElement(element, cardConfig);
 * ```
 */
export function createCardConfig(
  options: CardConfigOptions = {}
): HybridElementConfigExtended {
  const builder = HybridElementConfigBuilder.create(
    options.priority || 'SECONDARY'
  )
    .withMaterial({
      opacity: options.opacity ?? 0.1,
      roughness: 0.1,
      metalness: 0.8,
      clearcoat: 1,
    })
    .withContent({
      watchForChanges: true,
      updateTriggers: ['resize', 'mutation'],
      quality: 'medium',
    })
    .withPerformance({
      enableLOD: options.enableLOD ?? true,
      texturePooling: true,
    });

  // Add hover animation if enabled (default: true)
  if (options.enableHoverEffect !== false) {
    builder.withHoverAnimation({
      type: 'transform',
      duration: 500,
      easing: 'power2.out',
      properties: {
        rotation: { x: 0.1, y: 0.05, z: 0 },
        position: { x: 0, y: 0, z: 0.5 },
      },
    });
  }

  return builder.build();
}

/**
 * Options for createButtonConfig factory
 */
export interface ButtonConfigOptions {
  /** Rendering priority - optional, defaults to PRIMARY */
  priority?: 'PRIMARY' | 'SECONDARY';
  /** Enable emissive glow effect - optional, defaults to false */
  emissive?: boolean;
  /** Enable hover scale animation - optional, defaults to true */
  enableHoverEffect?: boolean;
}

/**
 * Factory function for button-style hybrid elements
 *
 * Creates an interactive button with sensible defaults:
 * - Higher opacity (0.95) for visibility
 * - Moderate metalness (0.6) for subtle reflections
 * - Quick hover animation (300ms) with scale effect
 * - No LOD (buttons always visible)
 *
 * @param options Button configuration options
 * @returns Complete button configuration ready for HybridUIService
 *
 * @example
 * ```typescript
 * const buttonConfig = createButtonConfig({
 *   priority: 'PRIMARY',
 *   emissive: true
 * });
 *
 * await hybridUI.createHybridElement(element, buttonConfig);
 * ```
 */
export function createButtonConfig(
  options: ButtonConfigOptions = {}
): HybridElementConfigExtended {
  const builder = HybridElementConfigBuilder.create(
    options.priority || 'PRIMARY'
  )
    .withMaterial({
      opacity: 0.95,
      roughness: 0.2,
      metalness: 0.6,
    })
    .withContent({
      watchForChanges: true,
      updateTriggers: ['resize', 'mutation', 'style'],
      quality: 'high',
    })
    .withPerformance({
      enableLOD: false, // Buttons are always visible
      texturePooling: true,
    });

  // Add hover animation if enabled (default: true)
  if (options.enableHoverEffect !== false) {
    builder.withHoverAnimation({
      type: 'transform',
      duration: 300,
      easing: 'power1.out',
      properties: {
        scale: 1.05,
      },
    });
  }

  return builder.build();
}

/**
 * Options for createBackgroundConfig factory
 */
export interface BackgroundConfigOptions {
  /** Texture quality - optional, defaults to 'low' */
  quality?: 'low' | 'medium' | 'high';
  /** Enable particle decoration - optional, defaults to false */
  enableParticles?: boolean;
  /** Enable idle animation - optional, defaults to false */
  enableIdleAnimation?: boolean;
}

/**
 * Factory function for background-style hybrid elements
 *
 * Creates a subtle background element with sensible defaults:
 * - Very low opacity (0.05) for subtle effect
 * - Low quality texture (background rarely changes)
 * - Aggressive LOD optimization
 * - Optional particle decoration
 *
 * @param options Background configuration options
 * @returns Complete background configuration ready for HybridUIService
 *
 * @example
 * ```typescript
 * const bgConfig = createBackgroundConfig({
 *   quality: 'medium',
 *   enableParticles: true
 * });
 *
 * await hybridUI.createHybridElement(element, bgConfig);
 * ```
 */
export function createBackgroundConfig(
  options: BackgroundConfigOptions = {}
): HybridElementConfigExtended {
  const builder = HybridElementConfigBuilder.create('TERTIARY')
    .withMaterial({
      opacity: 0.05,
      roughness: 0.5,
      metalness: 0.1,
    })
    .withContent({
      quality: options.quality || 'low',
      watchForChanges: false, // Background rarely changes
    })
    .withPerformance({
      enableLOD: true,
      lodDistances: [10, 20, 50],
      texturePooling: true,
    });

  // Add particle decoration if enabled
  if (options.enableParticles) {
    builder.withDecoration({
      geometry: 'sphere',
      opacity: 0.6,
      scale: 0.05,
      animation: 'float',
    });
  }

  // Add subtle idle animation if enabled
  if (options.enableIdleAnimation) {
    builder.withIdleAnimation({
      type: 'transform',
      duration: 3000,
      easing: 'power1.inOut',
      repeat: -1, // Infinite
      yoyo: true,
      properties: {
        rotation: { x: 0, y: 0, z: 0.1 },
      },
    });
  }

  return builder.build();
}

/**
 * Options for createHeroSceneConfig factory
 */
export interface HeroSceneConfigOptions {
  /** Enable large floating spheres - optional, defaults to true */
  enableFloatingSpheres?: boolean;
  /** Enable background cubes - optional, defaults to true */
  enableBackgroundCubes?: boolean;
  /** Number of spheres - optional, defaults to 5 */
  sphereCount?: number;
  /** Number of cubes - optional, defaults to 20 */
  cubeCount?: number;
  /** Sphere colors - optional, defaults to colorful palette */
  sphereColors?: string[];
  /** Enable dramatic lighting - optional, defaults to true */
  enableDramaticLighting?: boolean;
}

/**
 * Factory function for hero scene with large floating spheres
 *
 * Creates an immersive hero scene with:
 * - Large colorful floating spheres (1.0+ scale) positioned around content
 * - Background cubes for depth
 * - Dramatic colored lighting
 * - Automatic animations (floating, rotating)
 *
 * @param options Hero scene configuration options
 * @returns Scene objects configuration for HybridUIService
 *
 * @example
 * ```typescript
 * const sceneObjects = createHeroSceneConfig({
 *   sphereCount: 5,
 *   sphereColors: ['#8a2be2', '#ff69b4', '#00bfff', '#32cd32', '#ffd700']
 * });
 *
 * // Use with HybridUIService
 * hybridUI.createSceneObjects(sceneObjects);
 * ```
 */
export function createHeroSceneConfig(
  options: HeroSceneConfigOptions = {}
): NonNullable<HybridElementConfigExtended['sceneObjects']> {
  const sphereColors = options.sphereColors || [
    '#8a2be2', // Purple
    '#ff69b4', // Pink
    '#00bfff', // Cyan
    '#32cd32', // Green
    '#ffd700', // Gold
  ];

  const sphereConfigs =
    options.enableFloatingSpheres !== false
      ? sphereColors.slice(0, options.sphereCount || 5).map((color, index) => {
          const angle = (index / sphereColors.length) * Math.PI * 2;
          const radius = 6 + Math.random() * 2;
          const x = Math.cos(angle) * radius * (index % 2 === 0 ? 1 : -1);
          const y = (Math.random() - 0.5) * 6;
          const z = -2 - Math.random() * 3;

          return {
            position: [x, y, z] as [number, number, number],
            radius: 0.8 + Math.random() * 0.4,
            color,
            emissive: color,
            emissiveIntensity: 0.2,
            metalness: 0.3,
            roughness: 0.1,
            animation: 'float' as const,
            animationSpeed: 0.8 + Math.random() * 0.4,
          };
        })
      : undefined;

  const cubeCount = options.cubeCount || 20;
  const cubeColors = [
    '#2d1b47',
    '#1a0d2e',
    '#0f0a1c',
    '#1e1139',
    '#261242',
    '#0a0a15',
  ];

  const cubeConfigs =
    options.enableBackgroundCubes !== false
      ? Array.from({ length: cubeCount }, (_, index) => {
          const zone = index % 4;
          let x = 0,
            y = 0,
            z = 0;

          switch (zone) {
            case 0:
              x = (Math.random() - 0.5) * 50;
              y = 8 + Math.random() * 15;
              z = -8 + Math.random() * -20;
              break;
            case 1:
              x = (Math.random() - 0.5) * 50;
              y = -8 - Math.random() * 15;
              z = -8 + Math.random() * -20;
              break;
            case 2:
              x = -15 - Math.random() * 25;
              y = (Math.random() - 0.5) * 30;
              z = -8 + Math.random() * -20;
              break;
            case 3:
              x = 15 + Math.random() * 25;
              y = (Math.random() - 0.5) * 30;
              z = -8 + Math.random() * -20;
              break;
          }

          if (Math.abs(x) < 12 && Math.abs(y) < 8) {
            if (Math.abs(x) > Math.abs(y)) {
              x = x > 0 ? 15 + Math.random() * 10 : -15 - Math.random() * 10;
            } else {
              y = y > 0 ? 10 + Math.random() * 8 : -10 - Math.random() * 8;
            }
          }

          return {
            position: [x, y, z] as [number, number, number],
            size: 0.8 + Math.random() * 1.8,
            color: cubeColors[Math.floor(Math.random() * cubeColors.length)],
            opacity: 0.6,
            rotation: [
              Math.random() * Math.PI,
              Math.random() * Math.PI,
              Math.random() * Math.PI,
            ] as [number, number, number],
            animation: 'rotate' as const,
            animationSpeed: 0.5 + Math.random() * 0.5,
          };
        })
      : undefined;

  const lightConfigs =
    options.enableDramaticLighting !== false
      ? [
          { type: 'ambient' as const, color: '#404040', intensity: 0.4 },
          {
            type: 'directional' as const,
            position: [10, 10, 10] as [number, number, number],
            color: '#ffffff',
            intensity: 1.0,
            castShadow: true,
          },
          {
            type: 'point' as const,
            position: [-10, 5, 5] as [number, number, number],
            color: '#8a2be2',
            intensity: 0.8,
            distance: 50,
          },
          {
            type: 'point' as const,
            position: [10, -5, 5] as [number, number, number],
            color: '#00bfff',
            intensity: 0.8,
            distance: 50,
          },
          {
            type: 'point' as const,
            position: [0, 10, -5] as [number, number, number],
            color: '#ff69b4',
            intensity: 0.6,
            distance: 40,
          },
        ]
      : undefined;

  return {
    spheres: sphereConfigs,
    cubes: cubeConfigs,
    lights: lightConfigs,
  };
}
