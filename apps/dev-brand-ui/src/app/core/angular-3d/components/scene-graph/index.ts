/**
 * Scene Graph Components - Angular Three Declarative Scene Organization
 *
 * This module provides a set of declarative components for building
 * hierarchical 3D scenes with Angular Three best practices.
 *
 * Components:
 * - SceneNodeComponent: Base hierarchical node with transforms and state management
 * - GeometryNodeComponent: Specialized node for 3D geometry with materials
 *
 * Features:
 * - Signal-based reactive configuration
 * - Hierarchical parent-child relationships
 * - Built-in animation support with GSAP integration
 * - Performance optimizations (LOD, frustum culling)
 * - Debug visualization capabilities
 * - TypeScript strict mode compliance
 */

export { SceneNodeComponent } from './scene-node.component';

// Export type definitions
export type {
  Transform3D,
  SceneNodeConfig,
  NodeBounds,
} from './scene-node.component';

// Re-export for convenience
export * from './scene-node.component';
