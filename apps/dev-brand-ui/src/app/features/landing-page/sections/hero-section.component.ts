import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Scene3DComponent } from '../../../core/angular-3d/components/scene-3d.component';
import { HeroSceneGraphComponent } from './hero-scene-graph.component';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';

@Component({
  selector: 'brand-hero-section',
  standalone: true,
  imports: [CommonModule, Scene3DComponent, ScrollAnimationDirective],
  template: `
    <div
      class="relative w-full h-screen overflow-hidden bg-gradient-to-br from-black via-sky-900 to-black"
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
          class="max-w-3xl mx-auto px-8 text-center space-y-6 pointer-events-auto transform-gpu"
        >
          <!-- Hero Title - Scroll up and fade out as user scrolls -->
          <h1
            class="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight animate-fade-in-up"
            style="text-shadow: 0 10px 30px rgba(168, 85, 247, 0.5), 0 2px 5px rgba(0,0,0,0.8);"
          >
            <span class="text-white drop-shadow-2xl">Enterprise AI</span><br />
            <span
              class="text-white drop-shadow-2xl text-3xl md:text-5xl lg:text-6xl"
            >
              SaaS Starter
            </span>
          </h1>

          <!-- Hero Description - Parallax scroll effect -->
          <p
            class="text-base md:text-xl text-gray-200 leading-relaxed max-w-xl mx-auto animate-fade-in-up animation-delay-200"
            style="text-shadow: 0 2px 20px rgba(0,0,0,0.6);"
          >
            Production-ready foundation combining
            <span
              class="text-purple-300 font-semibold"
              style="text-shadow: 0 0 20px rgba(216, 180, 254, 0.6);"
              >vector search</span
            >,
            <span
              class="text-purple-300 font-semibold"
              style="text-shadow: 0 0 20px rgba(216, 180, 254, 0.6);"
              >graph relationships</span
            >, and
            <span
              class="text-purple-300 font-semibold"
              style="text-shadow: 0 0 20px rgba(216, 180, 254, 0.6);"
              >intelligent workflows</span
            >
          </p>

          <!-- Feature Badges - Faster parallax -->
          <div
            class="flex flex-wrap justify-center gap-3 animate-fade-in-up animation-delay-400"
          >
            @for (badge of badges; track badge.text) {
            <div
              class="group px-4 py-2 rounded-full bg-purple-600/30 backdrop-blur-sm border border-purple-400/30
                          flex items-center gap-2 transform transition-all duration-300 hover:scale-110 hover:-translate-y-1
                          shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:shadow-2xl
                          cursor-pointer text-sm"
              style="transform-style: preserve-3d;"
            >
              <span
                class="text-lg transition-transform duration-300 group-hover:scale-125"
                >{{ badge.icon }}</span
              >
              <span class="text-white font-medium">{{ badge.text }}</span>
            </div>
            }
          </div>

          <!-- CTA Buttons - Slowest parallax for depth -->
          <div
            class="flex flex-wrap justify-center gap-3 pt-2 animate-fade-in-up animation-delay-600"
          >
            <button
              class="group relative px-8 py-4 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600
                           hover:from-purple-600 hover:via-pink-600 hover:to-purple-700
                           text-white font-semibold shadow-2xl shadow-purple-500/50
                           transition-all duration-300 hover:scale-105 hover:-translate-y-2
                           hover:shadow-purple-500/70 hover:shadow-3xl
                           flex items-center gap-2 overflow-hidden
                           before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent
                           before:opacity-0 before:transition-opacity hover:before:opacity-100"
              style="transform-style: preserve-3d;"
            >
              <span
                class="text-xl transition-transform duration-300 group-hover:rotate-12"
                >🚀</span
              >
              <span class="relative z-10">Explore Live Demo</span>
            </button>
            <button
              class="group relative px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20
                           backdrop-blur-sm border border-white/20 hover:border-white/40
                           text-white font-semibold shadow-xl shadow-black/30
                           transition-all duration-300 hover:scale-105 hover:-translate-y-2
                           flex items-center gap-2"
              style="transform-style: preserve-3d;"
            >
              <span
                class="text-xl transition-transform duration-300 group-hover:scale-110"
                >🏗️</span
              >
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

  // Feature badges data
  readonly badges = [
    { icon: '🧠', text: 'Semantic Intelligence' },
    { icon: '🕸️', text: 'Relationship Mapping' },
    { icon: '⚡', text: 'Intelligent Workflows' },
  ];
}
