/**
 * Unit tests for Config Builder Utilities
 *
 * TASK_2025_012 - Phase 1, Task 1.1
 * Target: 100% test coverage
 */

import {
  HybridElementConfigBuilder,
  createCardConfig,
  createButtonConfig,
  createBackgroundConfig,
  type CardConfigOptions,
  type ButtonConfigOptions,
  type BackgroundConfigOptions,
} from './config-builders';
import type { HybridElementConfigExtended } from '../interfaces';

describe('HybridElementConfigBuilder', () => {
  describe('create() static method', () => {
    it('should create builder instance with priority set', () => {
      const builder = HybridElementConfigBuilder.create('PRIMARY');
      expect(builder).toBeInstanceOf(HybridElementConfigBuilder);

      const config = builder.build();
      expect(config.priority).toBe('PRIMARY');
    });

    it('should support all priority levels', () => {
      const priorities: Array<'HERO' | 'PRIMARY' | 'SECONDARY' | 'TERTIARY'> = [
        'HERO',
        'PRIMARY',
        'SECONDARY',
        'TERTIARY',
      ];

      priorities.forEach((priority) => {
        const config = HybridElementConfigBuilder.create(priority).build();
        expect(config.priority).toBe(priority);
      });
    });
  });

  describe('fluent API methods', () => {
    it('should support method chaining', () => {
      const config = HybridElementConfigBuilder.create('PRIMARY')
        .withMaterial({ opacity: 0.5 })
        .withPosition(1, 2, 3)
        .withPerformance({ enableLOD: true })
        .build();

      expect(config.priority).toBe('PRIMARY');
      expect(config.material?.opacity).toBe(0.5);
      expect(config.position).toEqual([1, 2, 3]);
      expect(config.performance?.enableLOD).toBe(true);
    });

    it('withMaterial() should set material properties', () => {
      const material = {
        opacity: 0.8,
        roughness: 0.2,
        metalness: 0.6,
        clearcoat: 1,
        transmission: 0.5,
      };

      const config = HybridElementConfigBuilder.create('SECONDARY')
        .withMaterial(material)
        .build();

      expect(config.material).toEqual(material);
    });

    it('withContent() should set content texture options', () => {
      const content = {
        watchForChanges: true,
        updateTriggers: ['resize', 'mutation'] as const,
        quality: 'high' as const,
        format: 'webp' as const,
      };

      const config = HybridElementConfigBuilder.create('PRIMARY')
        .withContent(content)
        .build();

      expect(config.content).toEqual(content);
    });

    it('withDecoration() should set decoration properties', () => {
      const decoration = {
        geometry: 'sphere' as const,
        color: 0xff0000,
        opacity: 0.5,
        scale: 0.1,
        animation: 'float' as const,
      };

      const config = HybridElementConfigBuilder.create('TERTIARY')
        .withDecoration(decoration)
        .build();

      expect(config.decoration).toEqual(decoration);
    });

    it('withPosition() should set explicit position', () => {
      const config = HybridElementConfigBuilder.create('SECONDARY')
        .withPosition(5, -3, 2.5)
        .build();

      expect(config.position).toEqual([5, -3, 2.5]);
    });

    it('withPerformance() should set performance options', () => {
      const performance = {
        enableLOD: true,
        lodDistances: [10, 20, 50],
        enableInstancedRendering: true,
        memoryBudget: 100,
        texturePooling: true,
      };

      const config = HybridElementConfigBuilder.create('PRIMARY')
        .withPerformance(performance)
        .build();

      expect(config.performance).toEqual(performance);
    });

    it('withAngularThree() should set Angular Three properties', () => {
      const angularThree = {
        parentGroup: 'main-group',
        renderOrder: 1,
        layers: 2,
        castShadow: true,
        receiveShadow: true,
      };

      const config = HybridElementConfigBuilder.create('HERO')
        .withAngularThree(angularThree)
        .build();

      expect(config.angularThree).toEqual(angularThree);
    });

    it('withResponsive() should set responsive configuration', () => {
      const responsive = {
        mobile: { material: { opacity: 0.3 } },
        tablet: { material: { opacity: 0.5 } },
        desktop: { material: { opacity: 0.8 } },
        breakpoints: {
          mobile: 768,
          tablet: 1024,
          desktop: 1920,
        },
      };

      const config = HybridElementConfigBuilder.create('PRIMARY')
        .withResponsive(responsive)
        .build();

      expect(config.responsive).toEqual(responsive);
    });
  });

  describe('animation methods', () => {
    const mockAnimation = {
      type: 'transform' as const,
      duration: 500,
      easing: 'power2.out',
      properties: { scale: 1.2 },
    };

    it('withHoverAnimation() should add hover animation', () => {
      const config = HybridElementConfigBuilder.create('PRIMARY')
        .withHoverAnimation(mockAnimation)
        .build();

      expect(config.animations?.hover).toEqual(mockAnimation);
    });

    it('withEnterAnimation() should add enter animation', () => {
      const config = HybridElementConfigBuilder.create('PRIMARY')
        .withEnterAnimation(mockAnimation)
        .build();

      expect(config.animations?.enter).toEqual(mockAnimation);
    });

    it('withExitAnimation() should add exit animation', () => {
      const config = HybridElementConfigBuilder.create('PRIMARY')
        .withExitAnimation(mockAnimation)
        .build();

      expect(config.animations?.exit).toEqual(mockAnimation);
    });

    it('withFocusAnimation() should add focus animation', () => {
      const config = HybridElementConfigBuilder.create('PRIMARY')
        .withFocusAnimation(mockAnimation)
        .build();

      expect(config.animations?.focus).toEqual(mockAnimation);
    });

    it('withIdleAnimation() should add idle animation', () => {
      const config = HybridElementConfigBuilder.create('PRIMARY')
        .withIdleAnimation(mockAnimation)
        .build();

      expect(config.animations?.idle).toEqual(mockAnimation);
    });

    it('should support multiple animation types', () => {
      const hoverAnim = { ...mockAnimation, duration: 300 };
      const enterAnim = { ...mockAnimation, duration: 600 };
      const exitAnim = { ...mockAnimation, duration: 400 };

      const config = HybridElementConfigBuilder.create('PRIMARY')
        .withHoverAnimation(hoverAnim)
        .withEnterAnimation(enterAnim)
        .withExitAnimation(exitAnim)
        .build();

      expect(config.animations?.hover).toEqual(hoverAnim);
      expect(config.animations?.enter).toEqual(enterAnim);
      expect(config.animations?.exit).toEqual(exitAnim);
    });

    it('should initialize animations object if not present', () => {
      const builder = HybridElementConfigBuilder.create('PRIMARY');
      const config = builder.withHoverAnimation(mockAnimation).build();

      expect(config.animations).toBeDefined();
      expect(config.animations?.hover).toEqual(mockAnimation);
    });
  });

  describe('build() method', () => {
    it('should throw error if priority not set', () => {
      const builder = new HybridElementConfigBuilder();

      expect(() => builder.build()).toThrow(
        'Config builder requires priority to be set'
      );
    });

    it('should return complete configuration when valid', () => {
      const config = HybridElementConfigBuilder.create('PRIMARY')
        .withMaterial({ opacity: 0.5 })
        .build();

      expect(config).toBeDefined();
      expect(config.priority).toBe('PRIMARY');
      expect(config.material?.opacity).toBe(0.5);
    });

    it('should return configuration with only priority if no other methods called', () => {
      const config = HybridElementConfigBuilder.create('SECONDARY').build();

      expect(config.priority).toBe('SECONDARY');
      expect(config.material).toBeUndefined();
      expect(config.content).toBeUndefined();
      expect(config.animations).toBeUndefined();
    });
  });
});

describe('createCardConfig()', () => {
  it('should create card config with default values', () => {
    const config = createCardConfig();

    expect(config.priority).toBe('SECONDARY');
    expect(config.material?.opacity).toBe(0.1);
    expect(config.material?.roughness).toBe(0.1);
    expect(config.material?.metalness).toBe(0.8);
    expect(config.material?.clearcoat).toBe(1);
    expect(config.performance?.enableLOD).toBe(true);
    expect(config.performance?.texturePooling).toBe(true);
  });

  it('should apply custom opacity', () => {
    const config = createCardConfig({ opacity: 0.5 });

    expect(config.material?.opacity).toBe(0.5);
  });

  it('should apply custom priority', () => {
    const config = createCardConfig({ priority: 'PRIMARY' });

    expect(config.priority).toBe('PRIMARY');
  });

  it('should include hover animation by default', () => {
    const config = createCardConfig();

    expect(config.animations?.hover).toBeDefined();
    expect(config.animations?.hover?.type).toBe('transform');
    expect(config.animations?.hover?.duration).toBe(500);
    expect(config.animations?.hover?.easing).toBe('power2.out');
  });

  it('should exclude hover animation when enableHoverEffect is false', () => {
    const config = createCardConfig({ enableHoverEffect: false });

    expect(config.animations?.hover).toBeUndefined();
  });

  it('should disable LOD when enableLOD is false', () => {
    const config = createCardConfig({ enableLOD: false });

    expect(config.performance?.enableLOD).toBe(false);
  });

  it('should configure content texture with sensible defaults', () => {
    const config = createCardConfig();

    expect(config.content?.watchForChanges).toBe(true);
    expect(config.content?.updateTriggers).toContain('resize');
    expect(config.content?.updateTriggers).toContain('mutation');
    expect(config.content?.quality).toBe('medium');
  });

  it('should accept empty options object', () => {
    const config = createCardConfig({});

    expect(config.priority).toBe('SECONDARY');
    expect(config.material?.opacity).toBe(0.1);
  });

  it('should accept all options simultaneously', () => {
    const options: CardConfigOptions = {
      color: '#8a2be2',
      opacity: 0.3,
      priority: 'TERTIARY',
      enableHoverEffect: false,
      enableLOD: false,
    };

    const config = createCardConfig(options);

    expect(config.priority).toBe('TERTIARY');
    expect(config.material?.opacity).toBe(0.3);
    expect(config.animations?.hover).toBeUndefined();
    expect(config.performance?.enableLOD).toBe(false);
  });
});

describe('createButtonConfig()', () => {
  it('should create button config with default values', () => {
    const config = createButtonConfig();

    expect(config.priority).toBe('PRIMARY');
    expect(config.material?.opacity).toBe(0.95);
    expect(config.material?.roughness).toBe(0.2);
    expect(config.material?.metalness).toBe(0.6);
    expect(config.performance?.enableLOD).toBe(false);
    expect(config.performance?.texturePooling).toBe(true);
  });

  it('should apply custom priority', () => {
    const config = createButtonConfig({ priority: 'SECONDARY' });

    expect(config.priority).toBe('SECONDARY');
  });

  it('should include hover animation by default', () => {
    const config = createButtonConfig();

    expect(config.animations?.hover).toBeDefined();
    expect(config.animations?.hover?.type).toBe('transform');
    expect(config.animations?.hover?.duration).toBe(300);
    expect(config.animations?.hover?.properties.scale).toBe(1.05);
  });

  it('should exclude hover animation when enableHoverEffect is false', () => {
    const config = createButtonConfig({ enableHoverEffect: false });

    expect(config.animations?.hover).toBeUndefined();
  });

  it('should configure content texture with high quality', () => {
    const config = createButtonConfig();

    expect(config.content?.watchForChanges).toBe(true);
    expect(config.content?.updateTriggers).toContain('resize');
    expect(config.content?.updateTriggers).toContain('mutation');
    expect(config.content?.updateTriggers).toContain('style');
    expect(config.content?.quality).toBe('high');
  });

  it('should accept empty options object', () => {
    const config = createButtonConfig({});

    expect(config.priority).toBe('PRIMARY');
    expect(config.material?.opacity).toBe(0.95);
  });

  it('should accept all options simultaneously', () => {
    const options: ButtonConfigOptions = {
      priority: 'SECONDARY',
      emissive: true,
      enableHoverEffect: false,
    };

    const config = createButtonConfig(options);

    expect(config.priority).toBe('SECONDARY');
    expect(config.animations?.hover).toBeUndefined();
  });

  it('should handle emissive option (currently unused but type-safe)', () => {
    const config = createButtonConfig({ emissive: true });

    // Emissive not yet implemented, but should not throw
    expect(config).toBeDefined();
    expect(config.priority).toBe('PRIMARY');
  });
});

describe('createBackgroundConfig()', () => {
  it('should create background config with default values', () => {
    const config = createBackgroundConfig();

    expect(config.priority).toBe('TERTIARY');
    expect(config.material?.opacity).toBe(0.05);
    expect(config.material?.roughness).toBe(0.5);
    expect(config.material?.metalness).toBe(0.1);
    expect(config.performance?.enableLOD).toBe(true);
    expect(config.performance?.lodDistances).toEqual([10, 20, 50]);
    expect(config.performance?.texturePooling).toBe(true);
  });

  it('should apply custom quality', () => {
    const config = createBackgroundConfig({ quality: 'high' });

    expect(config.content?.quality).toBe('high');
  });

  it('should not watch for changes by default', () => {
    const config = createBackgroundConfig();

    expect(config.content?.watchForChanges).toBe(false);
  });

  it('should not include particles by default', () => {
    const config = createBackgroundConfig();

    expect(config.decoration).toBeUndefined();
  });

  it('should add particle decoration when enabled', () => {
    const config = createBackgroundConfig({ enableParticles: true });

    expect(config.decoration).toBeDefined();
    expect(config.decoration?.geometry).toBe('sphere');
    expect(config.decoration?.opacity).toBe(0.6);
    expect(config.decoration?.scale).toBe(0.05);
    expect(config.decoration?.animation).toBe('float');
  });

  it('should not include idle animation by default', () => {
    const config = createBackgroundConfig();

    expect(config.animations?.idle).toBeUndefined();
  });

  it('should add idle animation when enabled', () => {
    const config = createBackgroundConfig({ enableIdleAnimation: true });

    expect(config.animations?.idle).toBeDefined();
    expect(config.animations?.idle?.type).toBe('transform');
    expect(config.animations?.idle?.duration).toBe(3000);
    expect(config.animations?.idle?.repeat).toBe(-1);
    expect(config.animations?.idle?.yoyo).toBe(true);
  });

  it('should accept empty options object', () => {
    const config = createBackgroundConfig({});

    expect(config.priority).toBe('TERTIARY');
    expect(config.material?.opacity).toBe(0.05);
  });

  it('should accept all options simultaneously', () => {
    const options: BackgroundConfigOptions = {
      quality: 'medium',
      enableParticles: true,
      enableIdleAnimation: true,
    };

    const config = createBackgroundConfig(options);

    expect(config.content?.quality).toBe('medium');
    expect(config.decoration).toBeDefined();
    expect(config.animations?.idle).toBeDefined();
  });
});

describe('Integration tests', () => {
  it('should create type-safe configurations for HybridUIService', () => {
    const cardConfig = createCardConfig({ priority: 'PRIMARY' });
    const buttonConfig = createButtonConfig({ priority: 'SECONDARY' });
    const bgConfig = createBackgroundConfig({ quality: 'low' });

    // Type assertion to verify interface compatibility
    const configs: HybridElementConfigExtended[] = [
      cardConfig,
      buttonConfig,
      bgConfig,
    ];

    expect(configs).toHaveLength(3);
    expect(configs.every((c) => c.priority)).toBe(true);
  });

  it('should allow builder to create complex configurations', () => {
    const complexConfig = HybridElementConfigBuilder.create('HERO')
      .withMaterial({
        opacity: 0.7,
        roughness: 0.3,
        metalness: 0.9,
        clearcoat: 0.8,
        transmission: 0.2,
      })
      .withContent({
        watchForChanges: true,
        updateTriggers: ['resize', 'mutation', 'animation'],
        quality: 'ultra',
        format: 'webp',
      })
      .withDecoration({
        geometry: 'icosahedron',
        color: 0x00ff00,
        opacity: 0.8,
        scale: 0.2,
        animation: 'pulse',
      })
      .withPosition(0, 0, -5)
      .withHoverAnimation({
        type: 'material',
        duration: 800,
        easing: 'power3.out',
        properties: { opacity: 1 },
      })
      .withPerformance({
        enableLOD: true,
        lodDistances: [5, 15, 30],
        memoryBudget: 200,
        texturePooling: true,
      })
      .withAngularThree({
        renderOrder: 10,
        castShadow: true,
        receiveShadow: true,
      })
      .withResponsive({
        mobile: { material: { opacity: 0.5 } },
        desktop: { material: { opacity: 0.9 } },
      })
      .build();

    expect(complexConfig.priority).toBe('HERO');
    expect(complexConfig.material?.transmission).toBe(0.2);
    expect(complexConfig.content?.quality).toBe('ultra');
    expect(complexConfig.decoration?.geometry).toBe('icosahedron');
    expect(complexConfig.position).toEqual([0, 0, -5]);
    expect(complexConfig.animations?.hover?.duration).toBe(800);
    expect(complexConfig.performance?.memoryBudget).toBe(200);
    expect(complexConfig.angularThree?.renderOrder).toBe(10);
    expect(complexConfig.responsive?.mobile).toBeDefined();
  });

  it('should handle null and undefined values gracefully', () => {
    const config = HybridElementConfigBuilder.create('PRIMARY')
      .withMaterial({ opacity: undefined, roughness: 0.5 })
      .build();

    expect(config.material?.opacity).toBeUndefined();
    expect(config.material?.roughness).toBe(0.5);
  });
});
