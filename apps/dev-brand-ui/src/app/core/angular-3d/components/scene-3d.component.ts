/**
 * Scene3DComponent - Configurable NgtCanvas Wrapper
 *
 * Reusable wrapper around Angular Three's NgtCanvas with configurable inputs.
 * Provides a clean API for different 3D scenes with customizable camera, renderer,
 * and interaction settings.
 *
 * Usage:
 * ```html
 * <app-scene-3d
 *   [sceneGraph]="heroSceneGraph"
 *   [camera]="{ position: [0, 0, 15], fov: 60 }"
 *   [enableMouseParallax]="true"
 * />
 * ```
 *
 * @example
 * ```typescript
 * @Component({
 *   template: `
 *     <app-scene-3d
 *       [sceneGraph]="customSceneGraph"
 *       [camera]="cameraConfig"
 *       [gl]="rendererConfig"
 *       [shadows]="false"
 *     />
 *   `
 * })
 * export class CustomScene {
 *   customSceneGraph = CustomSceneGraphComponent;
 *   cameraConfig = { position: [0, 5, 20], fov: 50 };
 *   rendererConfig = { antialias: true, alpha: false };
 * }
 * ```
 */

import { Component, input } from '@angular/core';
import { NgtCanvas } from 'angular-three';

export interface CameraConfig {
  position: [number, number, number];
  fov?: number;
  near?: number;
  far?: number;
}

export interface WebGLRendererConfig {
  antialias?: boolean;
  alpha?: boolean;
  powerPreference?: 'high-performance' | 'low-power' | 'default';
  preserveDrawingBuffer?: boolean;
  precision?: 'highp' | 'mediump' | 'lowp';
}

@Component({
  selector: 'app-scene-3d',
  standalone: true,
  imports: [NgtCanvas],
  template: `
    <ngt-canvas
      [sceneGraph]="sceneGraph()"
      [camera]="camera()"
      [gl]="gl()"
      [shadows]="shadows()"
    />
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
})
export class Scene3DComponent {
  /**
   * Scene graph component to render (e.g., HeroSceneGraphComponent)
   * Pattern: Pass component class, Angular Three handles instantiation
   */
  readonly sceneGraph = input.required<any>();

  /**
   * Camera configuration
   * Default: Perspective camera at [0, 0, 12] with 75° FOV (Three.js human scale)
   */
  readonly camera = input<CameraConfig>({
    position: [0, 0, 12],
    fov: 75,
  });

  /**
   * WebGL renderer configuration
   * Default: High-performance with antialiasing and alpha
   */
  readonly gl = input<WebGLRendererConfig>({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });

  /**
   * Enable shadow rendering
   * Default: true
   */
  readonly shadows = input<boolean>(true);
}
