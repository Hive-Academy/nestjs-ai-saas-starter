import type * as THREE from 'three';
import type { Signal } from '@angular/core';

/**
 * Content priority levels for intelligent scaling
 */
export enum ContentPriority {
  HERO = 10, // Largest: Hero content, main CTAs
  PRIMARY = 8, // Large: Key information, forms
  SECONDARY = 6, // Medium: Supporting content, navigation
  TERTIARY = 4, // Small: Metadata, labels
  DECORATIVE = 2, // Tiny: Pure visual elements
}

/**
 * Layout types for 3D scenes
 */
export type LayoutType =
  | 'grid-2d' // Traditional grid projected to 3D
  | 'depth-layers' // Content at different Z levels
  | 'orbital' // Circular arrangement
  | 'flow' // Natural flowing layout
  | 'custom'; // Custom positioning function

/**
 * Decoration geometry types
 */
export type DecorationGeometry =
  | 'sphere'
  | 'cube'
  | 'cylinder'
  | 'icosahedron'
  | 'dodecahedron'
  | 'octahedron'
  | 'torus'
  | 'custom';

/**
 * Animation types for decorative elements
 */
export type AnimationType =
  | 'float'
  | 'rotate'
  | 'pulse'
  | 'orbit'
  | 'breathe'
  | 'custom';

/**
 * Interaction types
 */
export type InteractionType =
  | 'scale'
  | 'glow'
  | 'lift'
  | 'press'
  | 'ripple'
  | 'focus';

/**
 * Configuration for hybrid 3D elements
 */
export interface HybridElementConfig {
  // Content properties
  priority: ContentPriority;
  size?: 'auto' | number;

  // 3D positioning
  position?: [number, number, number];
  rotation?: [number, number, number];

  // Decoration configuration
  decoration?: {
    geometry: DecorationGeometry;
    opacity: number;
    scale: number;
    animation: AnimationType;
    color?: number;
  };

  // Interaction configuration
  interaction?: {
    hover?: InteractionType;
    click?: InteractionType;
    focus?: InteractionType;
  };

  // Material properties
  material?: {
    opacity: number;
    roughness: number;
    metalness: number;
    clearcoat: number;
    transmission: number;
  };

  // Layout properties
  layout?: {
    type: LayoutType;
    spacing?: number;
    alignment?: 'start' | 'center' | 'end';
  };
}

/**
 * Content texture generation options
 */
export interface ContentTextureOptions {
  width: number;
  height: number;
  dpi: number;
  backgroundColor: string;
  padding: number;
  borderRadius: number;
  border?: {
    width: number;
    color: string;
    style: 'solid' | 'dashed' | 'dotted';
  };
  shadow?: {
    blur: number;
    color: string;
    offsetX: number;
    offsetY: number;
  };
}

/**
 * Intelligent scaling result
 */
export interface ScalingResult {
  contentScale: number;
  decorationScale: number;
  contentOpacity: number;
  decorationOpacity: number;
  zPosition: number;
  spacing: number;
}

/**
 * 3D element instance
 */
export interface HybridElement3D {
  id: string;
  domElement: HTMLElement;
  content3D: THREE.Group;
  decoration3D?: THREE.Group;
  config: HybridElementConfig;
  scaling: ScalingResult;
  isVisible: boolean;
  isInteracting: boolean;
}

/**
 * Scene layout configuration
 */
export interface SceneLayoutConfig {
  type: LayoutType;
  bounds: {
    width: number;
    height: number;
    depth: number;
  };
  spacing: {
    horizontal: number;
    vertical: number;
    depth: number;
  };
  alignment: {
    horizontal: 'start' | 'center' | 'end';
    vertical: 'start' | 'center' | 'end';
  };
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
  };
}

/**
 * Performance optimization settings
 */
export interface PerformanceConfig {
  enableLOD: boolean;
  lodLevels: number[];
  enableFrustumCulling: boolean;
  maxTextureSize: number;
  enableInstancedRendering: boolean;
  targetFrameRate: number;
}

/**
 * Content renderer interface
 */
export interface ContentRenderer {
  render(
    element: HTMLElement,
    options: ContentTextureOptions
  ): THREE.CanvasTexture;
  updateTexture(texture: THREE.CanvasTexture, element: HTMLElement): void;
  dispose(texture: THREE.CanvasTexture): void;
}

/**
 * Layout manager interface
 */
export interface LayoutManager {
  calculatePositions(
    elements: HybridElement3D[],
    config: SceneLayoutConfig
  ): Map<string, THREE.Vector3>;

  updateLayout(elements: HybridElement3D[], config: SceneLayoutConfig): void;
}

/**
 * Interaction manager interface
 */
export interface InteractionManager {
  registerElement(element: HybridElement3D): void;
  unregisterElement(elementId: string): void;
  handlePointerMove(event: PointerEvent): void;
  handlePointerClick(event: PointerEvent): void;
  handleKeyboard(event: KeyboardEvent): void;
}

/**
 * Animation controller interface
 */
export interface AnimationController {
  animate(element: HybridElement3D, deltaTime: number): void;
  startAnimation(elementId: string, type: AnimationType): void;
  stopAnimation(elementId: string): void;
  pauseAll(): void;
  resumeAll(): void;
}

/**
 * Hybrid scene state (using Angular signals)
 */
export interface HybridSceneState {
  elements: Signal<Map<string, HybridElement3D>>;
  activeElement: Signal<string | null>;
  isLoading: Signal<boolean>;
  performance: Signal<{
    fps: number;
    elementCount: number;
    textureMemory: number;
  }>;
  layout: Signal<SceneLayoutConfig>;
  camera: Signal<{
    position: THREE.Vector3;
    target: THREE.Vector3;
  }>;
}

/**
 * Event types for hybrid elements
 */
export interface HybridElementEvents {
  onHover: (element: HybridElement3D) => void;
  onLeave: (element: HybridElement3D) => void;
  onClick: (element: HybridElement3D, originalEvent: Event) => void;
  onFocus: (element: HybridElement3D) => void;
  onBlur: (element: HybridElement3D) => void;
  onShow: (element: HybridElement3D) => void;
  onHide: (element: HybridElement3D) => void;
}

/**
 * Hybrid UI service configuration
 */
export interface HybridUIConfig {
  scene: {
    enableShadows: boolean;
    backgroundColor: number;
    fog?: {
      color: number;
      near: number;
      far: number;
    };
  };
  performance: PerformanceConfig;
  defaults: {
    contentTexture: ContentTextureOptions;
    elementConfig: Partial<HybridElementConfig>;
    layout: SceneLayoutConfig;
  };
}
