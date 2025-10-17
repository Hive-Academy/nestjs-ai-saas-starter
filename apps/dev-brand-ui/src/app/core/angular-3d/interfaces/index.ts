import type * as THREE from 'three';
import type { WritableSignal } from '@angular/core';

// Re-export base types
export type {
  ContentPriority,
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
} from '../types/base-types';

/**
 * Enhanced configuration extending Angular Three integration
 */
export interface HybridElementConfigExtended {
  priority: 'HERO' | 'PRIMARY' | 'SECONDARY' | 'TERTIARY';

  // Angular Three specific properties
  angularThree?: {
    parentGroup?: string;
    renderOrder?: number;
    layers?: number;
    castShadow?: boolean;
    receiveShadow?: boolean;
  };

  // Enhanced content conversion with reactive updates
  content?: {
    watchForChanges?: boolean;
    updateTriggers?: ('resize' | 'mutation' | 'animation' | 'style')[];
    quality?: 'low' | 'medium' | 'high' | 'ultra';
    format?: 'webp' | 'png' | 'jpeg';
    compression?: number; // 0-1
    mipmaps?: boolean;
  };

  // Material properties
  material?: {
    opacity?: number;
    roughness?: number;
    metalness?: number;
    clearcoat?: number;
    transmission?: number;
  };

  // Decoration configuration
  decoration?: {
    geometry?: 'sphere' | 'cube' | 'cylinder' | 'icosahedron';
    color?: number;
    opacity?: number;
    scale?: number;
    animation?: 'rotate' | 'float' | 'pulse';
  };

  // Position override
  position?: [number, number, number];

  // Advanced animations using Angular Three + GSAP
  animations?: {
    enter?: AnimationConfig;
    exit?: AnimationConfig;
    hover?: AnimationConfig;
    focus?: AnimationConfig;
    idle?: AnimationConfig;
    custom?: Record<string, AnimationConfig>;
  };

  // Responsive behavior with breakpoints
  responsive?: {
    mobile?: Partial<HybridElementConfigExtended>;
    tablet?: Partial<HybridElementConfigExtended>;
    desktop?: Partial<HybridElementConfigExtended>;
    breakpoints?: {
      mobile: number;
      tablet: number;
      desktop: number;
    };
  };

  // Performance optimizations
  performance?: {
    enableLOD?: boolean;
    lodDistances?: number[];
    enableInstancedRendering?: boolean;
    memoryBudget?: number; // MB
    texturePooling?: boolean;
  };

  // Scene objects - large decorative 3D objects (spheres, cubes, lights)
  sceneObjects?: {
    spheres?: Array<{
      position: [number, number, number];
      radius: number;
      color: string | number;
      emissive?: string | number;
      emissiveIntensity?: number;
      opacity?: number;
      metalness?: number;
      roughness?: number;
      animation?: 'float' | 'rotate' | 'pulse' | 'none';
      animationSpeed?: number;
    }>;
    cubes?: Array<{
      position: [number, number, number];
      size: number | [number, number, number];
      color: string | number;
      opacity?: number;
      rotation?: [number, number, number];
      animation?: 'float' | 'rotate' | 'pulse' | 'none';
      animationSpeed?: number;
    }>;
    lights?: Array<{
      type: 'point' | 'directional' | 'ambient' | 'spot';
      position?: [number, number, number];
      target?: [number, number, number];
      color: string | number;
      intensity: number;
      distance?: number;
      decay?: number;
      castShadow?: boolean;
    }>;
  };
}

export interface AnimationConfig {
  type: 'transform' | 'material' | 'geometry' | 'custom';
  duration: number;
  easing?: string;
  delay?: number;
  repeat?: number;
  yoyo?: boolean;
  properties: Record<string, any>;
  onComplete?: () => void;
  onUpdate?: (progress: number) => void;
}

/**
 * Enhanced Hybrid Element with Angular Three integration
 */
export interface HybridElementExtended {
  id: string;
  domElement: HTMLElement;
  config: HybridElementConfigExtended;
  scaling: any;
  isVisible: boolean;
  isInteracting: boolean;

  // Angular Three objects
  ngtGroup: any; // Will be typed properly when we have angular-three imported
  ngtMesh?: any;
  ngtMaterial?: any;

  // Enhanced state management
  state: WritableSignal<{
    isVisible: boolean;
    isInteracting: boolean;
    isAnimating: boolean;
    lodLevel: number;
    textureQuality: 'low' | 'medium' | 'high' | 'ultra';
    memoryUsage: number;
  }>;

  // Performance metrics
  performance: WritableSignal<{
    renderTime: number;
    textureSize: number;
    triangleCount: number;
    lastUpdate: number;
  }>;

  // Reactive texture updates
  texture: WritableSignal<THREE.Texture>;
  needsTextureUpdate: WritableSignal<boolean>;

  // Animation controller
  animations: Map<string, any>; // GSAP timeline instances
}

/**
 * Angular Three Foundation types
 */
export interface AngularThreeFoundation {
  scene: any; // Will be properly typed when angular-three is available
  camera: any;
  renderer: any;
  performance: {
    fps: number;
    isOptimal: boolean;
  };
}

/**
 * Content Texture Service Configuration
 */
export interface ContentTextureServiceConfig {
  maxMemory: number; // bytes
  defaultQuality: 'low' | 'medium' | 'high' | 'ultra';
  enableCaching: boolean;
  enableReactiveUpdates: boolean;
}

/**
 * Hybrid UI Service Enhanced Configuration
 */
export interface HybridUIServiceConfig {
  angularThree?: {
    enableShadows?: boolean;
    antialias?: boolean;
    powerPreference?: 'default' | 'high-performance' | 'low-power';
  };
  textureService?: ContentTextureServiceConfig;
}
