// Services
export { AngularThreeService } from './services/angular-three.service';
export { SceneConfigService } from './services/scene-config.service';
export { ContentTexturePipelineService } from './services/content-texture-pipeline.service';
export { HybridUIService } from './services/hybrid-ui.service';

// Components
export { HybridSceneComponent } from './components/hybrid-scene.component';

// Directives
export { Element3DDirective } from './directives/element-3d.directive';

// Interfaces and Types
export type {
  HybridElementConfigExtended,
  HybridElementExtended,
  AnimationConfig,
  AngularThreeFoundation,
  ContentTextureServiceConfig,
  HybridUIServiceConfig,
  // Re-exported base types
  LayoutType,
  DecorationGeometry,
  AnimationType,
  InteractionType,
  HybridElementConfig,
  ContentTextureOptions,
  ScalingResult,
  HybridElement3D,
  SceneLayoutConfig,
  PerformanceConfig,
  ContentRenderer,
  LayoutManager,
  InteractionManager,
  AnimationController,
  HybridSceneState,
  HybridElementEvents,
  HybridUIConfig,
} from './interfaces';

// Export base types enum for direct access
export { ContentPriority } from './types/base-types';
export type { ContentPriority as ContentPriorityType } from './types/base-types';

// Configuration builders
export {
  HybridElementConfigBuilder,
  createHeroSceneConfig,
  type HeroSceneConfigOptions,
} from './utils/config-builders';

// Utility functions for easier integration
export const Angular3DUtils = {
  /**
   * Create a basic hybrid element configuration
   */
  createBasicConfig(
    priority: 'HERO' | 'PRIMARY' | 'SECONDARY' | 'TERTIARY' = 'SECONDARY'
  ) {
    return {
      priority,
      angularThree: {
        castShadow: true,
        receiveShadow: true,
      },
      content: {
        watchForChanges: true,
        updateTriggers: ['resize', 'mutation'],
        quality: 'medium',
      },
      material: {
        opacity: 0.95,
        roughness: 0.3,
        metalness: 0.1,
      },
      performance: {
        enableLOD: true,
        texturePooling: true,
      },
    };
  },

  /**
   * Create animation configuration with common presets
   */
  createAnimationConfig(preset: 'subtle' | 'normal' | 'dramatic' = 'normal') {
    const configs = {
      subtle: {
        hover: {
          type: 'transform' as const,
          duration: 200,
          easing: 'power1.out',
          properties: { scale: 1.02, position: { z: 0.05 } },
        },
      },
      normal: {
        hover: {
          type: 'transform' as const,
          duration: 300,
          easing: 'power2.out',
          properties: { scale: 1.05, position: { z: 0.1 } },
        },
        focus: {
          type: 'material' as const,
          duration: 200,
          easing: 'power1.out',
          properties: { opacity: 1.0, emissive: 0x004499 },
        },
      },
      dramatic: {
        hover: {
          type: 'transform' as const,
          duration: 400,
          easing: 'power3.out',
          properties: {
            scale: 1.1,
            position: { z: 0.2 },
            rotation: { z: 0.05 },
          },
        },
        focus: {
          type: 'material' as const,
          duration: 300,
          easing: 'power2.out',
          properties: { opacity: 1.0, emissive: 0x0066ff },
        },
        click: {
          type: 'transform' as const,
          duration: 150,
          easing: 'power2.inOut',
          properties: { scale: 0.95 },
        },
      },
    };
    return configs[preset];
  },

  /**
   * Create performance-optimized configuration
   */
  createPerformanceConfig(
    target: 'mobile' | 'desktop' | 'high-end' = 'desktop'
  ) {
    const configs = {
      mobile: {
        content: { quality: 'low' as const, format: 'jpeg' as const },
        performance: { enableLOD: true, memoryBudget: 8, texturePooling: true },
        material: { roughness: 0.5, metalness: 0 },
      },
      desktop: {
        content: { quality: 'medium' as const, format: 'webp' as const },
        performance: {
          enableLOD: true,
          memoryBudget: 16,
          texturePooling: true,
        },
        material: { roughness: 0.3, metalness: 0.1 },
      },
      'high-end': {
        content: { quality: 'high' as const, format: 'webp' as const },
        performance: {
          enableLOD: false,
          memoryBudget: 32,
          texturePooling: false,
        },
        material: { roughness: 0.2, metalness: 0.2, clearcoat: 0.1 },
      },
    };
    return configs[target];
  },
};
