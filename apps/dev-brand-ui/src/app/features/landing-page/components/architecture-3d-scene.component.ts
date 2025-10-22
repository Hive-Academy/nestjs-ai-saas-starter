/**
 * Architecture 3D Scene Component
 *
 * Interactive 3D visualization of 12-library 5-layer architecture.
 * Displays 13 floating boxes arranged in 5 horizontal layers with
 * mouse parallax, scroll animations, and performance optimization.
 *
 * Specifications: design-assets-inventory.md:56-318
 */

import { Component, input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Scene3DComponent } from '../../../core/angular-3d/components/scene-3d.component';
import { BoxComponent } from '../../../core/angular-3d/components/primitives/box.component';
import { Text3DComponent } from '../../../core/angular-3d/components/primitives/text-3d.component';
import { Float3DDirective } from '../../../core/angular-3d/directives/float-3d.directive';
import { MouseParallax3DDirective } from '../../../core/angular-3d/directives/mouse-parallax-3d.directive';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';
import { Performance3DDirective } from '../../../core/angular-3d/directives/performance-3d.directive';

interface LayerBox {
  position: [number, number, number];
  size: [number, number, number];
  color: number;
  borderColor: number;
  label: string;
  floatConfig: { height: number; speed: number; delay: number };
}

@Component({
  selector: 'app-architecture-3d-scene',
  standalone: true,
  imports: [
    CommonModule,
    Scene3DComponent,
    BoxComponent,
    Text3DComponent,
    Float3DDirective,
    MouseParallax3DDirective,
    ScrollAnimationDirective,
    Performance3DDirective,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="w-full h-[600px] relative bg-gradient-to-b from-gray-50 to-white rounded-2xl overflow-hidden">
      <!-- WebGL 3D Scene -->
      @if (webGLSupported()) {
        <app-scene-3d
          [cameraPosition]="[0, 0, 800]"
          [cameraLookAt]="[0, 0, 0]"
          [ambientLightIntensity]="0.6"
          [directionalLightPosition]="[500, 500, 500]"
          [directionalLightIntensity]="0.4"
          [enableMouseParallax]="true"
          [parallaxSensitivity]="0.3"
          [parallaxSmoothing]="6"
          [scrollAnimation]="true"
          [scrollAnimationType]="'fadeIn'"
          [scrollStart]="'top 80%'"
          [scrollDuration]="1.5"
          [enablePerformanceOptimization]="true"
          [targetFPS]="60"
          class="w-full h-full"
        >
          <!-- Layer 1: CORE FOUNDATION -->
          <app-box
            [position]="[0, -300, 0]"
            [size]="[600, 120, 20]"
            [color]="0xEEF2FF"
            [borderColor]="0xC7D2FE"
            [borderWidth]="2"
            [floatHeight]="0.2"
            [floatSpeed]="4000"
            [floatDelay]="0"
          >
            <div class="absolute inset-0 flex items-center justify-center text-gray-900 font-bold text-xl pointer-events-none">
              LangGraph Core
            </div>
          </app-box>

          <!-- Layer 2: DATA LAYER (3 boxes) -->
          <app-box
            [position]="[-450, -150, 0]"
            [size]="[400, 120, 20]"
            [color]="0xDBEAFE"
            [borderColor]="0xBFDBFE"
            [borderWidth]="2"
            [floatHeight]="0.2"
            [floatSpeed]="4200"
            [floatDelay]="0"
          >
            <div class="absolute inset-0 flex items-center justify-center text-gray-900 font-bold text-lg pointer-events-none">
              ChromaDB
            </div>
          </app-box>

          <app-box
            [position]="[0, -150, 0]"
            [size]="[400, 120, 20]"
            [color]="0xDBEAFE"
            [borderColor]="0xBFDBFE"
            [borderWidth]="2"
            [floatHeight]="0.2"
            [floatSpeed]="4200"
            [floatDelay]="200"
          >
            <div class="absolute inset-0 flex items-center justify-center text-gray-900 font-bold text-lg pointer-events-none">
              Neo4j
            </div>
          </app-box>

          <app-box
            [position]="[450, -150, 0]"
            [size]="[400, 120, 20]"
            [color]="0xDBEAFE"
            [borderColor]="0xBFDBFE"
            [borderWidth]="2"
            [floatHeight]="0.2"
            [floatSpeed]="4200"
            [floatDelay]="400"
          >
            <div class="absolute inset-0 flex items-center justify-center text-gray-900 font-bold text-lg pointer-events-none">
              Time-Travel
            </div>
          </app-box>

          <!-- Layer 3: ORCHESTRATION LAYER (3 boxes) -->
          <app-box
            [position]="[-450, 0, 0]"
            [size]="[400, 120, 20]"
            [color]="0xD1FAE5"
            [borderColor]="0xA7F3D0"
            [borderWidth]="2"
            [floatHeight]="0.25"
            [floatSpeed]="4000"
            [floatDelay]="100"
          >
            <div class="absolute inset-0 flex items-center justify-center text-gray-900 font-bold text-lg pointer-events-none">
              Workflow-Engine
            </div>
          </app-box>

          <app-box
            [position]="[0, 0, 0]"
            [size]="[400, 120, 20]"
            [color]="0xD1FAE5"
            [borderColor]="0xA7F3D0"
            [borderWidth]="2"
            [floatHeight]="0.25"
            [floatSpeed]="4000"
            [floatDelay]="300"
          >
            <div class="absolute inset-0 flex items-center justify-center text-gray-900 font-bold text-lg pointer-events-none">
              Streaming
            </div>
          </app-box>

          <app-box
            [position]="[450, 0, 0]"
            [size]="[400, 120, 20]"
            [color]="0xD1FAE5"
            [borderColor]="0xA7F3D0"
            [borderWidth]="2"
            [floatHeight]="0.25"
            [floatSpeed]="4000"
            [floatDelay]="500"
          >
            <div class="absolute inset-0 flex items-center justify-center text-gray-900 font-bold text-lg pointer-events-none">
              Memory
            </div>
          </app-box>

          <!-- Layer 4: AGENT SYSTEMS (3 boxes) -->
          <app-box
            [position]="[-450, 150, 0]"
            [size]="[400, 120, 20]"
            [color]="0xF3E8FF"
            [borderColor]="0xE9D5FF"
            [borderWidth]="2"
            [floatHeight]="0.3"
            [floatSpeed]="3800"
            [floatDelay]="200"
          >
            <div class="absolute inset-0 flex items-center justify-center text-gray-900 font-bold text-lg pointer-events-none">
              Multi-Agent
            </div>
          </app-box>

          <app-box
            [position]="[0, 150, 0]"
            [size]="[400, 120, 20]"
            [color]="0xF3E8FF"
            [borderColor]="0xE9D5FF"
            [borderWidth]="2"
            [floatHeight]="0.3"
            [floatSpeed]="3800"
            [floatDelay]="400"
          >
            <div class="absolute inset-0 flex items-center justify-center text-gray-900 font-bold text-lg pointer-events-none">
              HITL
            </div>
          </app-box>

          <app-box
            [position]="[450, 150, 0]"
            [size]="[400, 120, 20]"
            [color]="0xF3E8FF"
            [borderColor]="0xE9D5FF"
            [borderWidth]="2"
            [floatHeight]="0.3"
            [floatSpeed]="3800"
            [floatDelay]="600"
          >
            <div class="absolute inset-0 flex items-center justify-center text-gray-900 font-bold text-lg pointer-events-none">
              Functional-API
            </div>
          </app-box>

          <!-- Layer 5: PRODUCTION LAYER (3 boxes) -->
          <app-box
            [position]="[-450, 300, 0]"
            [size]="[400, 120, 20]"
            [color]="0xFED7AA"
            [borderColor]="0xFDBB8E"
            [borderWidth]="2"
            [floatHeight]="0.35"
            [floatSpeed]="3600"
            [floatDelay]="300"
          >
            <div class="absolute inset-0 flex items-center justify-center text-gray-900 font-bold text-lg pointer-events-none">
              Checkpoint
            </div>
          </app-box>

          <app-box
            [position]="[0, 300, 0]"
            [size]="[400, 120, 20]"
            [color]="0xFED7AA"
            [borderColor]="0xFDBB8E"
            [borderWidth]="2"
            [floatHeight]="0.35"
            [floatSpeed]="3600"
            [floatDelay]="500"
          >
            <div class="absolute inset-0 flex items-center justify-center text-gray-900 font-bold text-lg pointer-events-none">
              Monitoring
            </div>
          </app-box>

          <app-box
            [position]="[450, 300, 0]"
            [size]="[400, 120, 20]"
            [color]="0xFED7AA"
            [borderColor]="0xFDBB8E"
            [borderWidth]="2"
            [floatHeight]="0.35"
            [floatSpeed]="3600"
            [floatDelay]="700"
          >
            <div class="absolute inset-0 flex items-center justify-center text-gray-900 font-bold text-lg pointer-events-none">
              Platform
            </div>
          </app-box>
        </app-scene-3d>
      } @else {
        <!-- Fallback SVG for non-WebGL browsers -->
        <div class="w-full h-full flex items-center justify-center p-8">
          <div class="text-center">
            <p class="text-gray-500 mb-4">Your browser doesn't support 3D graphics.</p>
            <p class="text-sm text-gray-400">View the static architecture diagram instead.</p>
          </div>
        </div>
      }

      <!-- Layer labels (CSS overlay) -->
      <div class="absolute left-4 top-1/2 transform -translate-y-1/2 space-y-32 pointer-events-none">
        <div class="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Core</div>
        <div class="text-xs font-semibold text-blue-600 uppercase tracking-wider">Data</div>
        <div class="text-xs font-semibold text-green-600 uppercase tracking-wider">Orchestration</div>
        <div class="text-xs font-semibold text-purple-600 uppercase tracking-wider">Agents</div>
        <div class="text-xs font-semibold text-orange-600 uppercase tracking-wider">Production</div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class Architecture3DSceneComponent {
  // WebGL support detection
  webGLSupported = input(this.checkWebGLSupport());

  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch (e) {
      return false;
    }
  }
}
