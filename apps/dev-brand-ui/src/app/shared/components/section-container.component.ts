/**
 * SectionContainer Component
 *
 * Consistent layout wrapper for all landing page sections.
 * Provides standardized structure with optional 3D background, title/subtitle header,
 * and content projection for flexible section composition.
 *
 * Pattern Source: hero-section.component.ts:12-130 (background + DOM overlay pattern)
 * Design System: Matches hero section gradient backgrounds and text hierarchy
 *
 * Usage:
 * ```html
 * <app-section-container
 *   title="Data Foundation"
 *   subtitle="Vector search + graph relationships"
 *   [sceneGraph]="dataFoundationSceneGraph"
 *   [minHeight]="'80vh'"
 *   background="gradient"
 *   [enableMouseParallax]="true"
 * >
 *   <!-- Section content goes here -->
 *   <div class="grid md:grid-cols-2 gap-8">
 *     <app-glassmorphism-card ... />
 *     <app-glassmorphism-card ... />
 *   </div>
 * </app-section-container>
 * ```
 */

import { CommonModule } from '@angular/common';
import { Component, input, computed, Type } from '@angular/core';
import {
  Scene3DComponent,
  CameraConfig,
} from '../../core/angular-3d/components/scene-3d.component';

@Component({
  selector: 'app-section-container',
  standalone: true,
  imports: [CommonModule, Scene3DComponent],
  template: `
    <div
      [class]="containerClasses()"
      class="relative w-full overflow-hidden"
      [style.minHeight]="minHeight()"
    >
      <!-- 3D Background Scene (optional) -->
      @if (sceneGraph()) {
      <app-scene-3d
        class="absolute inset-0"
        [sceneGraph]="sceneGraph()!"
        [camera]="cameraConfig()"
        [enableMouseParallax]="enableMouseParallax()"
      />
      }

      <!-- DOM Content Overlay -->
      <div class="relative z-10 container mx-auto px-8 py-16">
        <!-- Section Header -->
        @if (title()) {
        <div class="text-center mb-12">
          <h2
            class="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent"
          >
            {{ title() }}
          </h2>
          @if (subtitle()) {
          <p
            class="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed"
          >
            {{ subtitle() }}
          </p>
          }
        </div>
        }

        <!-- Content Slot -->
        <ng-content />
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class SectionContainerComponent {
  // Configuration inputs
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly background = input<'gradient' | 'solid' | 'dark'>('gradient');
  readonly minHeight = input<string>('100vh');
  readonly sceneGraph = input<Type<any> | null>(null);
  readonly cameraConfig = input<CameraConfig>({
    position: [0, 0, 15],
    fov: 60,
  });
  readonly enableMouseParallax = input<boolean>(false);

  // Computed background classes based on hero-section.component.ts:13
  readonly containerClasses = computed(() => {
    const backgroundMap: Record<string, string> = {
      gradient: 'bg-gradient-to-br from-black via-sky-900 to-black', // hero-section:13
      solid: 'bg-gray-900',
      dark: 'bg-gray-900/95',
    };
    return backgroundMap[this.background()] || backgroundMap['gradient'];
  });
}
