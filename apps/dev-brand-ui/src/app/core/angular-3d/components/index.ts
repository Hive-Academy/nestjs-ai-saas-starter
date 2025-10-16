/**
 * Angular 3D Components - Production Implementation
 *
 * This module exports all production Angular Three components with modern patterns:
 * - Signal-based reactive state management
 * - Standalone component architecture
 * - TypeScript strict mode compliance
 * - GSAP animation integration
 * - Performance optimizations
 */

// Core Production Components
export { HybridSceneComponent } from './hybrid-scene.component';
export { HybridThreeSceneComponent } from './hybrid-three-scene.component';

// Scene Graph Components - Declarative Architecture
export {
  SceneNodeComponent,
  type Transform3D,
  type SceneNodeConfig,
  type NodeBounds,
} from './scene-graph';

// Convenience exports for direct imports
export * from './hybrid-scene.component';
export * from './hybrid-three-scene.component';
export * from './scene-graph';
