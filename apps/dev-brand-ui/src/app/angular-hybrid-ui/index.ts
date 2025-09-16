/**
 * Angular Hybrid 3D-Web UI Framework
 * Public API exports
 */

// Core Types
export * from './core/types/hybrid-ui.types';

// Core Services
export { HybridUIService } from './core/services/hybrid-ui.service';
export { ScalingIntelligenceService } from './core/services/scaling-intelligence.service';
export { ContentTextureService } from './core/services/content-texture.service';

// Components
export { HybridSceneComponent } from './components/hybrid-scene.component';
export { Card3DComponent } from './components/card-3d.component';

// Directives
export { Content3DDirective } from './directives/content-3d.directive';

// Utility functions
export { 
  createHybridConfig, 
  createCardConfig, 
  createButtonConfig,
  createFormFieldConfig,
  createNavConfig,
  createSceneLayout,
  createHybridUIConfig
} from './utils/config-builders';

// Constants
export const HYBRID_UI_VERSION = '1.0.0';
export const SUPPORTED_ANGULAR_VERSIONS = ['20+'];

/**
 * Default configurations for common use cases
 */
export const HYBRID_CONFIGS = {
  CARD_GRID: 'card-grid',
  FORM_3D: 'form-3d', 
  NAV_ORBITAL: 'nav-orbital',
  HERO_SHOWCASE: 'hero-showcase'
} as const;