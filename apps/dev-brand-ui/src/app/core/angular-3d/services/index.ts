/**
 * Angular 3D Services - Public API Exports
 *
 * Centralized exports for all Angular Three services including:
 * - Core foundation services
 * - State management services
 * - Animation services
 * - Reactive state management
 */

export { AngularThreeFoundationService } from './angular-three-foundation.service';
export { HybridUIService } from './hybrid-ui.service';
export { AnimationService } from './animation.service';
export { Angular3DStateStore } from './angular-3d-state.store';
export { ReactiveStateManagerService } from './reactive-state-manager.service';
export { AdvancedPerformanceOptimizerService } from './advanced-performance-optimizer.service';
export { ContentTexturePipelineService } from './content-texture-pipeline.service';

// Re-export types from state store
export type {
  SceneState,
  SceneObjectState,
  CameraState,
  LightState,
  MaterialState,
  AnimationState,
  PerformanceState,
  Angular3DAppState,
} from './angular-3d-state.store';

// Re-export types from reactive state manager
export type {
  SceneGraphEvent,
  CrossComponentMessage,
  SceneQuery,
  ComponentRegistration,
} from './reactive-state-manager.service';

// Re-export animation types
export type {
  AnimationConfig,
  AnimationTimeline,
  ElementAnimationTarget,
  AnimationState as AnimationConfigState,
} from './animation.service';

// Re-export content texture pipeline types
export type {
  TextureConfig,
  DOMToTextureOptions,
  CachingOptions,
  TexturePipelineState,
  TextureEntry,
  TextureAtlasEntry,
} from './content-texture-pipeline.service';
