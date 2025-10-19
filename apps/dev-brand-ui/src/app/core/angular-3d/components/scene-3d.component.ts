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
import { MouseParallax3dDirective } from '../directives/mouse-parallax-3d.directive';

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

export interface MouseParallaxConfig {
  sensitivity: number;
  smoothing: number;
  cameraDistance: number;
}

@Component({
  selector: 'app-scene-3d',
  standalone: true,
  imports: [NgtCanvas, MouseParallax3dDirective],
  template: `
    @if (enableMouseParallax()) {
    <ngt-canvas
      [sceneGraph]="sceneGraph()"
      [camera]="camera()"
      [gl]="gl()"
      [shadows]="shadows()"
      mouseParallax3d
      [sensitivity]="mouseParallax().sensitivity"
      [smoothing]="mouseParallax().smoothing"
      [cameraDistance]="mouseParallax().cameraDistance"
    />
    } @else {
    <ngt-canvas
      [sceneGraph]="sceneGraph()"
      [camera]="camera()"
      [gl]="gl()"
      [shadows]="shadows()"
    />
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class Scene3DComponent {
  /**
   * Scene graph component to render (e.g., HeroSceneGraphComponent)
   * Pattern: Pass component class, Angular Three handles instantiation
   */
  sceneGraph = input.required<any>();

  /**
   * Camera configuration
   * Default: Perspective camera at [0, 0, 12] with 75° FOV
   */
  camera = input<CameraConfig>({
    position: [0, 0, 12],
    fov: 75,
  });

  /**
   * WebGL renderer configuration
   * Default: High-performance with antialiasing and alpha
   */
  gl = input<WebGLRendererConfig>({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });

  /**
   * Enable shadow rendering
   * Default: true
   */
  shadows = input<boolean>(true);

  /**
   * Enable mouse parallax effect
   * Default: true
   */
  enableMouseParallax = input<boolean>(true);

  /**
   * Mouse parallax configuration
   * Default: Moderate sensitivity and smoothing
   */
  mouseParallax = input<MouseParallaxConfig>({
    sensitivity: 0.4,
    smoothing: 5,
    cameraDistance: 12,
  });
}
