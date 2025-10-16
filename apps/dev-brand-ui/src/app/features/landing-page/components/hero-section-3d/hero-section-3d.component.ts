import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  HybridSceneComponent,
  Element3DDirective,
  HybridUIService,
  createHeroSceneConfig,
  type HybridElementConfigExtended,
} from '../../../../core/angular-3d';

/**
 * Hero Section - Reimagined with Angular 3D System
 *
 * Uses the Element3DDirective to transform native HTML elements into 3D objects
 * that feel truly embedded in 3D space rather than floating overlays.
 *
 * Architecture:
 * - HybridSceneComponent: Provides Angular Three foundation
 * - Element3DDirective: Transforms native elements (h1, p, button) into 3D
 * - createHeroSceneConfig(): Generates large floating spheres and background cubes
 * - HybridUIService: Manages scene objects and animations
 */
@Component({
  selector: 'hero-section-3d',
  standalone: true,
  imports: [CommonModule, HybridSceneComponent, Element3DDirective],
  template: `
    <app-hybrid-scene
      [enablePerformanceOverlay]="showPerformanceDebug()"
      [backgroundColor]="'#000000'"
      class="relative w-full h-screen overflow-hidden"
    >
      <!-- Hero Content - Native elements transformed to 3D -->
      <div class="relative z-20 flex items-center justify-center h-full">
        <div class="text-center max-w-4xl px-8">
          <!-- Title - Becomes 3D mesh at depth -2 -->
          <h1
            element3d
            priority="HERO"
            quality="high"
            [depth]="-2"
            class="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
          >
            <span
              class="block bg-gradient-to-br from-white to-gray-300 bg-clip-text text-transparent"
            >
              Enterprise AI
            </span>
            <span
              class="block bg-gradient-to-r from-purple-500 via-pink-500 to-sky-500 bg-clip-text text-transparent"
            >
              SaaS Starter
            </span>
          </h1>

          <!-- Subtitle - Becomes 3D mesh at depth -2.5 -->
          <p
            element3d
            priority="PRIMARY"
            quality="medium"
            [depth]="-2.5"
            class="text-lg md:text-xl lg:text-2xl leading-relaxed text-white text-opacity-85 mb-8 max-w-2xl mx-auto"
          >
            Production-ready foundation for AI-powered applications combining
            <span class="text-purple-400 font-semibold">vector search</span>,
            <span class="text-purple-400 font-semibold"
              >graph relationships</span
            >, and
            <span class="text-purple-400 font-semibold"
              >intelligent workflows</span
            >
          </p>

          <!-- Badges - Become 3D meshes at depth -2 -->
          <div
            element3d
            priority="PRIMARY"
            quality="medium"
            [depth]="-2"
            class="flex justify-center gap-4 my-8 flex-wrap"
          >
            <div
              class="flex items-center gap-2 px-5 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-full backdrop-blur-lg text-sm text-white"
            >
              <span class="text-xl">🧠</span>
              <span>Semantic Intelligence</span>
            </div>
            <div
              class="flex items-center gap-2 px-5 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-full backdrop-blur-lg text-sm text-white"
            >
              <span class="text-xl">🕸️</span>
              <span>Relationship Mapping</span>
            </div>
            <div
              class="flex items-center gap-2 px-5 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-full backdrop-blur-lg text-sm text-white"
            >
              <span class="text-xl">⚡</span>
              <span>Intelligent Workflows</span>
            </div>
          </div>

          <!-- Action Buttons - Become 3D meshes at depth -1.8 -->
          <div
            element3d
            priority="PRIMARY"
            quality="medium"
            [depth]="-1.8"
            class="flex justify-center gap-4 mt-10 flex-wrap"
          >
            <button
              class="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none rounded-xl text-lg font-semibold cursor-pointer transition-all duration-300"
              (click)="exploreDemo()"
            >
              <span>Explore Live Demo</span>
              <span class="text-xl">🚀</span>
            </button>
            <button
              class="flex items-center gap-2 px-8 py-4 bg-white bg-opacity-10 text-white border border-white border-opacity-30 rounded-xl text-lg font-semibold cursor-pointer transition-all duration-300"
              (click)="viewArchitecture()"
            >
              <span>View Architecture</span>
              <span class="text-xl">🏗️</span>
            </button>
          </div>
        </div>
      </div>
    </app-hybrid-scene>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .text-center {
          padding: 1rem;
        }
      }
    `,
  ],
})
export class HeroSection3dComponent implements OnInit {
  private readonly hybridUI = inject(HybridUIService);

  // State
  readonly showPerformanceDebug = signal(false);
  readonly isInitialized = signal(false);

  // Scene configuration with large floating spheres
  readonly heroSceneConfig: HybridElementConfigExtended['sceneObjects'] =
    createHeroSceneConfig({
      enableFloatingSpheres: true,
      enableBackgroundCubes: true,
      sphereCount: 5,
      cubeCount: 20,
      enableDramaticLighting: true,
      sphereColors: ['#8a2be2', '#ff69b4', '#00bfff', '#32cd32', '#ffd700'],
    });

  ngOnInit(): void {
    this.initializeScene();
  }

  private async initializeScene(): Promise<void> {
    try {
      // Wait a tick for HybridSceneComponent to initialize
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create large floating spheres and background cubes
      if (this.heroSceneConfig) {
        const sceneObjects = this.hybridUI.createSceneObjects(
          this.heroSceneConfig
        );
        console.log(
          `Hero scene initialized with ${sceneObjects.length} scene objects:`,
          {
            spheres: this.heroSceneConfig.spheres?.length || 0,
            cubes: this.heroSceneConfig.cubes?.length || 0,
            lights: this.heroSceneConfig.lights?.length || 0,
          }
        );
      }

      this.isInitialized.set(true);
    } catch (error) {
      console.error('Failed to initialize hero scene:', error);
      this.isInitialized.set(true); // Continue anyway
    }
  }

  exploreDemo(): void {
    document.getElementById('demo-theater')?.scrollIntoView({
      behavior: 'smooth',
    });
  }

  viewArchitecture(): void {
    document.getElementById('architecture-diagram')?.scrollIntoView({
      behavior: 'smooth',
    });
  }
}
