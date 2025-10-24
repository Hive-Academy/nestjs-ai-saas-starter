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
          class="max-w-5xl mx-auto px-6 md:px-8 text-center space-y-4 md:space-y-6 pointer-events-auto transform-gpu"
        >
          <!-- Hero Title - Properly scaled with visual hierarchy -->
          <h1
            class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight animate-fade-in-up text-gray-900"
          >
            Build Production-Grade AI Applications<br />
            with TypeScript Patterns You Already Know
          </h1>

          <!-- Hero Description - Smaller, more readable -->
          <p
            class="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto animate-fade-in-up animation-delay-200"
          >
            NestJS AI SaaS Starter:
            <strong class="text-gray-900">90% less code</strong>, enterprise
            capabilities out-of-the-box, familiar patterns for vector databases,
            knowledge graphs, and multi-agent workflows
          </p>

          <!-- Value Proposition Bullets - Compact and readable -->
          <ul
            class="space-y-2 md:space-y-3 text-xs sm:text-sm md:text-base text-gray-900 max-w-2xl mx-auto animate-fade-in-up animation-delay-400"
          >
            @for (bullet of bullets; track bullet) {
            <li class="flex items-start gap-2 md:gap-3">
              <svg
                class="w-4 h-4 md:w-5 md:h-5 text-indigo-600 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span class="text-left">{{ bullet }}</span>
            </li>
            }
          </ul>

          <!-- CTA Buttons - Properly scaled and spaced -->
          <div
            class="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 pt-4 md:pt-6 animate-fade-in-up animation-delay-600"
          >
            <button
              class="px-6 py-3 md:px-8 md:py-4 bg-indigo-600 text-white text-sm md:text-base font-semibold
                           rounded-lg shadow-lg hover:bg-indigo-700
                           hover:shadow-xl hover:scale-105 transition-all duration-300
                           focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                           focus-visible:outline-indigo-600"
            >
              See Complete Workflow Examples
            </button>
            <button
              class="px-6 py-3 md:px-8 md:py-4 bg-white text-indigo-600 text-sm md:text-base font-semibold
                           rounded-lg border-2 border-indigo-600
                           hover:bg-indigo-600 hover:text-white transition-all duration-300
                           focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                           focus-visible:outline-indigo-600"
            >
              Read Documentation
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

  // Value proposition bullets from design spec
  readonly bullets = [
    'Reduce vector database operations from 50+ lines to 5 with TypeORM-style repositories',
    'Build multi-agent workflows with decorators, not imperative graph construction',
    'Get enterprise features (multi-tenancy, monitoring, approvals) without months of infrastructure work',
  ];
}
