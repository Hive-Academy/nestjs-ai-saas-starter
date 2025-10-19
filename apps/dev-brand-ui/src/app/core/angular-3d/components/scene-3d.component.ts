/**
 * Scene3DComponent - Thin NgtCanvas Wrapper
 *
 * Simple wrapper around Angular Three's NgtCanvas following declarative best practices.
 * Replaces the over-engineered HybridSceneComponent (898 lines) with a minimal (~60 lines)
 * implementation that delegates complexity to Angular Three framework.
 *
 * Pattern Source: hybrid-scene-graph.component.ts (verified working pattern)
 * Evidence: Angular Three best practice - minimal abstraction, declarative scene graphs
 *
 * Usage:
 * ```html
 * <app-scene-3d [sceneGraph]="heroSceneGraph" />
 * ```
 *
 * @example
 * ```typescript
 * @Component({
 *   template: `<app-scene-3d [sceneGraph]="heroSceneGraph" />`
 * })
 * export class HeroSection {
 *   heroSceneGraph = HeroSceneGraphComponent;
 * }
 * ```
 */

import { Component, input } from '@angular/core';
import { NgtCanvas } from 'angular-three';
import { MouseParallax3dDirective } from '../directives/mouse-parallax-3d.directive';

@Component({
  selector: 'app-scene-3d',
  standalone: true,
  imports: [NgtCanvas, MouseParallax3dDirective],
  template: `
    <ngt-canvas
      [sceneGraph]="sceneGraph()"
      [camera]="{ position: [0, 0, 12], fov: 75 }"
      [gl]="{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      }"
      [shadows]="true"
      mouseParallax3d
      [sensitivity]="0.4"
      [smoothing]="5"
      [cameraDistance]="12"
    />
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
}
