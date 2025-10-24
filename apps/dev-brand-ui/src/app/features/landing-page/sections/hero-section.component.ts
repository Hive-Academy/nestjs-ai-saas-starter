import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Scene3DComponent } from '../../../core/angular-3d/components/scene-3d.component';
import { HeroSceneGraphComponent } from './scene-graphs/hero-scene-graph.component';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';

@Component({
  selector: 'brand-hero-section',
  standalone: true,
  imports: [CommonModule, Scene3DComponent, ScrollAnimationDirective],
  template: `
    <div
      class="relative w-full h-screen overflow-hidden bg-gradient-to-br from-sky-300 via-white to-sky-600"
      style="perspective: 1000px;"
    >
      <!-- 3D Background Scene (spheres + cubes) -->
      <app-scene-3d class="absolute inset-0" [sceneGraph]="heroSceneGraph" />

      <!-- DOM Content Overlay - Compact with breathing room for 3D depth -->
      <div
        class="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
        scrollAnimation
        [scrollConfig]="{
          animation: 'custom',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5,
          from: { y: 0, opacity: 1 },
          to: { y: -150, opacity: 0, ease: 'none' }
        }"
      >
        <div
          class="max-w-4xl mx-auto px-6 md:px-8 text-center space-y-6 pointer-events-auto transform-gpu"
        >
          <!-- Hero Title - Compact and punchy -->
          <h1
            class="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight animate-fade-in-up text-white"
          >
            NestJS AI SaaS Starter
          </h1>

          <!-- Hero Description - Concise with key metric -->
          <p
            class="text-base sm:text-lg md:text-xl text-white/90 leading-relaxed max-w-2xl mx-auto animate-fade-in-up animation-delay-200"
          >
            Production-ready foundation combining vector search, graph
            relationships, and intelligent workflows
            <strong class="block mt-2 text-white">90% less code</strong>
          </p>

          <!-- Feature Badges - Compact chips like original design -->
          <div
            class="flex flex-wrap justify-center gap-3 pt-2 animate-fade-in-up animation-delay-300"
          >
            @for (feature of features; track feature.icon) {
            <div
              class="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm font-medium hover:bg-white/20 transition-all"
            >
              <span>{{ feature.icon }}</span>
              <span>{{ feature.label }}</span>
            </div>
            }
          </div>

          <!-- CTA Buttons - Styled like original -->
          <div
            class="flex flex-col sm:flex-row justify-center gap-4 pt-4 animate-fade-in-up animation-delay-500"
          >
            <button
              class="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold
                           rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <span>🚀</span>
              <span>Explore Live Demo</span>
            </button>
            <button
              class="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold
                           rounded-lg hover:bg-white/20 transition-all duration-300"
            >
              <span>📐</span>
              <span>View Architecture</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @keyframes fade-in-up {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .animate-fade-in-up {
        animation: fade-in-up 0.8s ease-out forwards;
        opacity: 0;
      }

      .animation-delay-200 {
        animation-delay: 0.2s;
      }

      .animation-delay-400 {
        animation-delay: 0.4s;
      }

      .animation-delay-600 {
        animation-delay: 0.6s;
      }
    `,
  ],
})
export class HeroSectionComponent {
  // Scene graph reference - 3D background only (spheres + cubes)
  readonly heroSceneGraph = HeroSceneGraphComponent;

  // Feature badges - compact chips matching original design
  readonly features = [
    { icon: '🔍', label: 'Vector Search' },
    { icon: '🕸️', label: 'Graph Relationships' },
    { icon: '🤖', label: 'Multi-Agent Workflows' },
  ];
}
