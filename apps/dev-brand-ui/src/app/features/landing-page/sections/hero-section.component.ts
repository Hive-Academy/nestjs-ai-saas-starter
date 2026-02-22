import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { Scene3DComponent } from '../../../core/angular-3d/components/scene-3d.component';
import { HeroSceneGraphComponent } from './scene-graphs/hero-scene-graph.component';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';

@Component({
  selector: 'brand-hero-section',
  standalone: true,
  imports: [
    CommonModule,
    NgOptimizedImage,
    Scene3DComponent,
    ScrollAnimationDirective,
  ],
  template: `
    <div
      class="relative w-full h-screen bg-gradient-to-br from-sky-300 via-white to-sky-600 flex flex-col"
      style="perspective: 1000px;"
    >
      <!-- 3D Background Scene (spheres + cubes) -->
      <app-scene-3d class="absolute inset-0" [sceneGraph]="heroSceneGraph" />

      <!-- DOM Content Overlay - Compact with breathing room for 3D depth -->
      <div
        class="flex-1 flex flex-col items-center justify-end mb-5 z-10 pointer-events-none"
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
          class="max-w-4xl mx-auto px-6 md:px-8 text-center space-y-3 md:space-y-4 pointer-events-auto transform-gpu"
        >
          <!-- Hero Title - Glowing badge + 3D extruded text -->
          <h1 class="font-bold leading-tight animate-fade-in-up space-y-3">
            <span
              class="inline-block px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500
                     border-2 border-indigo-400/50 rounded-full text-white
                     shadow-[0_0_20px_rgba(99,102,241,0.3)] animate-pulse-glow"
            >
              Build Production Grade AI Applications
            </span>
            <br />
            <span
              class="text-2xl sm:text-4xl md:text-6xl text-3d-extruded lg:text-7xl text-gray-900"
            >
              With TypeScript Patterns
            </span>
            <br />
            <span
              class="inline-block px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500
                     border-2 border-indigo-400/50 rounded-full text-white
                     shadow-[0_0_20px_rgba(99,102,241,0.3)] animate-pulse-glow"
            >
              You Already Know
            </span>
          </h1>
        </div>
      </div>

      <!-- Value Proposition - Glassmorphism card at bottom aligned with hero text -->
      <div class="relative z-20 animate-slide-up-fade animation-delay-400">
        <div
          class="max-w-4xl mx-auto px-6 py-6 md:px-8 md:py-8
                    bg-white/70 backdrop-blur-xl border border-white/30
                    rounded-t-3xl shadow-[0_-10px_60px_rgba(99,102,241,0.15)]
                    hover:bg-white/75 transition-all duration-300"
        >
          <!-- Hero Description - Compact, highlight key metric -->
          <p
            class="text-sm md:text-base text-gray-800 leading-relaxed max-w-3xl mx-auto text-center mb-6 md:mb-8 animate-fade-in-up animation-delay-200"
          >
            NestJS AI SaaS Starter:
            <strong class="text-indigo-600 font-bold">90% less code</strong>,
            enterprise capabilities out-of-the-box, familiar patterns for vector
            databases, knowledge graphs, and multi-agent workflows
          </p>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <!-- Feature 1: ChromaDB (Vector Database) -->
            <div
              class="flex flex-col items-center text-center p-6
                     bg-gradient-to-br from-indigo-500/10 to-purple-500/10
                     backdrop-blur-sm rounded-xl border border-white/40
                     shadow-lg hover:shadow-xl hover:bg-white/20
                     transition-all duration-300
                     animate-scale-in animation-delay-500"
            >
              <div class="relative w-16 h-16 md:w-20 md:h-20 mb-4">
                <img
                  ngSrc="/assets/icons/libraries/icon-chromadb.svg"
                  alt="ChromaDB"
                  class="w-full h-full object-contain animate-float drop-shadow-md"
                  fill
                />
              </div>
              <h3 class="text-base md:text-lg font-bold text-gray-900 mb-2">
                Vector Database Mastery
              </h3>
              <p class="text-sm text-gray-800 leading-relaxed">
                Reduce vector database operations from 50+ lines to 5 with
                TypeORM-style repositories
              </p>
            </div>

            <!-- Feature 2: Multi-Agent -->
            <div
              class="flex flex-col items-center text-center p-6
                     bg-gradient-to-br from-purple-500/10 to-pink-500/10
                     backdrop-blur-sm rounded-xl border border-white/40
                     shadow-lg hover:shadow-xl hover:bg-white/20
                     transition-all duration-300
                     animate-scale-in animation-delay-600"
            >
              <div class="relative w-16 h-16 md:w-20 md:h-20 mb-4">
                <img
                  ngSrc="/assets/icons/libraries/icon-multi-agent.svg"
                  alt="Multi-Agent"
                  class="w-full h-full object-contain animate-float animation-delay-200 drop-shadow-md"
                  fill
                />
              </div>
              <h3 class="text-base md:text-lg font-bold text-gray-900 mb-2">
                Intelligent Workflows
              </h3>
              <p class="text-sm text-gray-800 leading-relaxed">
                Build multi-agent workflows with decorators, not imperative
                graph construction
              </p>
            </div>

            <!-- Feature 3: Monitoring (Enterprise Features) -->
            <div
              class="flex flex-col items-center text-center p-6
                     bg-gradient-to-br from-pink-500/10 to-indigo-500/10
                     backdrop-blur-sm rounded-xl border border-white/40
                     shadow-lg hover:shadow-xl hover:bg-white/20
                     transition-all duration-300
                     animate-scale-in animation-delay-700"
            >
              <div class="relative w-16 h-16 md:w-20 md:h-20 mb-4">
                <img
                  ngSrc="/assets/icons/libraries/icon-monitoring.svg"
                  alt="Monitoring"
                  class="w-full h-full object-contain animate-float animation-delay-400 drop-shadow-md"
                  fill
                />
              </div>
              <h3 class="text-base md:text-lg font-bold text-gray-900 mb-2">
                Enterprise Ready
              </h3>
              <p class="text-sm text-gray-800 leading-relaxed">
                Get enterprise features (multi-tenancy, monitoring, approvals)
                without months of infrastructure work
              </p>
            </div>
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

      .animation-delay-500 {
        animation-delay: 0.5s;
      }

      .animation-delay-600 {
        animation-delay: 0.6s;
      }

      .animation-delay-700 {
        animation-delay: 0.7s;
      }

      /* Slide up and fade animation */
      @keyframes slide-up-fade {
        from {
          opacity: 0;
          transform: translateY(40px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .animate-slide-up-fade {
        animation: slide-up-fade 0.8s ease-out forwards;
        opacity: 0;
      }

      /* Scale in animation for icons */
      @keyframes scale-in {
        from {
          opacity: 0;
          transform: scale(0.5);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .animate-scale-in {
        animation: scale-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        opacity: 0;
      }

      /* Float animation for icons */
      @keyframes float {
        0%,
        100% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-10px);
        }
      }

      .animate-float {
        animation: float 3s ease-in-out infinite;
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
