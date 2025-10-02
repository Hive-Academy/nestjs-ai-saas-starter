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
export { HybridElement3DComponent } from './hybrid-element-3d.component';

// Specialized Components
export { Card3DComponent } from './card3d.component';

// Scene Graph Components - Declarative Architecture
export {
  SceneNodeComponent,
  GeometryNodeComponent,
  type Transform3D,
  type SceneNodeConfig,
  type NodeBounds,
  type GeometryType,
  type GeometryConfig,
  type MaterialConfig,
} from './scene-graph';

// Convenience exports for direct imports
export * from './hybrid-scene.component';
export * from './hybrid-three-scene.component';
export * from './hybrid-element-3d.component';
export * from './card3d.component';
export * from './scene-graph';
