import { Component, signal } from '@angular/core';
import {
  Scene3dComponent,
  MetaballSceneComponent,
  MetaballSphereComponent,
  MetaballCursorComponent,
  getPresetBackgroundHex,
} from '@hive-academy/angular-3d';
import type { MetaballPreset } from '@hive-academy/angular-3d';

/**
 * MetaballHeroSectionComponent
 *
 * Full-screen hero section with interactive metaball 3D background.
 * Uses the compositional metaball API from @hive-academy/angular-3d
 * with a cosmic preset for a dark, space-themed SaaS aesthetic.
 *
 * Features:
 * - Ray-marched metaball scene with multiple animated spheres
 * - Cursor-following metaball with glow effect
 * - Glassmorphism CTA buttons overlaid on the 3D scene
 * - Responsive layout (mobile-friendly)
 * - Accessible with semantic HTML and ARIA attributes
 */
@Component({
  selector: 'brand-metaball-hero-section',
  standalone: true,
  imports: [
    Scene3dComponent,
    MetaballSceneComponent,
    MetaballSphereComponent,
    MetaballCursorComponent,
  ],
  template: `
    <section
      class="relative w-full h-screen overflow-hidden"
      aria-label="Hero section"
    >
      <!-- 3D Metaball Background -->
      <a3d-scene-3d
        class="absolute inset-0"
        [cameraPosition]="cameraPosition"
        [cameraFov]="75"
        [cameraNear]="0.1"
        [cameraFar]="100"
        [backgroundColor]="backgroundColor"
        [enableAntialiasing]="true"
      >
        <a3d-metaball-scene
          [preset]="preset()"
          [fullscreen]="true"
          [smoothness]="0.65"
          [animationSpeed]="0.6"
          [mouseProximityEffect]="true"
          [minMovementScale]="0.3"
          [maxMovementScale]="1.2"
          [enableAdaptiveQuality]="true"
        >
          <!-- Static positioned spheres for visual anchoring -->
          <a3d-metaball-sphere
            positionPreset="top-left"
            [radius]="0.35"
            [blendSmoothness]="0.4"
          />
          <a3d-metaball-sphere
            positionPreset="bottom-right"
            [radius]="0.3"
            [blendSmoothness]="0.4"
          />
          <a3d-metaball-sphere
            positionPreset="center"
            [radius]="0.45"
            [blendSmoothness]="0.5"
          />

          <!-- Orbiting animated spheres for dynamic motion -->
          <a3d-metaball-sphere
            [orbit]="{ radius: 0.6, speed: 0.3, phase: 0 }"
            [radius]="0.2"
            [blendSmoothness]="0.45"
          />
          <a3d-metaball-sphere
            [orbit]="{ radius: 0.45, speed: 0.4, phase: 2.09 }"
            [radius]="0.18"
            [blendSmoothness]="0.45"
          />
          <a3d-metaball-sphere
            [orbit]="{ radius: 0.55, speed: 0.25, phase: 4.19 }"
            [radius]="0.22"
            [blendSmoothness]="0.45"
          />

          <!-- Cursor-following sphere with glow -->
          <a3d-metaball-cursor
            [radiusMin]="0.08"
            [radiusMax]="0.18"
            [glowIntensity]="0.5"
            [glowRadius]="1.4"
            [smoothness]="0.08"
            [blendSmoothness]="0.4"
          />
        </a3d-metaball-scene>
      </a3d-scene-3d>

      <!-- HTML Content Overlay -->
      <div
        class="relative z-10 flex flex-col items-center justify-center h-full px-4 sm:px-6 lg:px-8 pointer-events-none"
      >
        <div
          class="max-w-4xl mx-auto text-center space-y-6 md:space-y-8 pointer-events-auto"
        >
          <!-- Main Headline -->
          <h1
            class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight animate-fade-in-up"
          >
            <span
              class="block text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]"
            >
              Build Production Grade
            </span>
            <span
              class="block bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.3)]"
            >
              AI Apps
            </span>
          </h1>

          <!-- Subtitle -->
          <p
            class="text-lg sm:text-xl md:text-2xl text-white/70 font-light max-w-2xl mx-auto animate-fade-in-up animation-delay-200"
          >
            With TypeScript Patterns You Already Know
          </p>

          <!-- CTA Buttons -->
          <div
            class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-fade-in-up animation-delay-400"
          >
            <a
              href="#value-propositions"
              class="group relative px-8 py-3.5 rounded-xl text-white font-semibold text-base
                     bg-white/10 backdrop-blur-xl border border-white/20
                     shadow-[0_0_30px_rgba(139,92,246,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]
                     hover:bg-white/15 hover:border-white/30 hover:shadow-[0_0_40px_rgba(139,92,246,0.25)]
                     transition-all duration-300 ease-out"
              role="button"
              aria-label="Get started with the platform"
            >
              <span class="relative z-10">Get Started</span>
              <span
                class="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                aria-hidden="true"
              ></span>
            </a>

            <a
              href="#problem-solution"
              class="px-8 py-3.5 rounded-xl text-white/80 font-medium text-base
                     border border-white/10 hover:border-white/20
                     hover:text-white hover:bg-white/5
                     transition-all duration-300 ease-out"
              role="button"
              aria-label="Learn more about the platform"
            >
              Learn More
            </a>
          </div>
        </div>

        <!-- Scroll indicator -->
        <div
          class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto animate-fade-in-up animation-delay-600"
          aria-hidden="true"
        >
          <span
            class="text-white/40 text-xs font-light tracking-widest uppercase"
          >
            Scroll
          </span>
          <div
            class="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1.5"
          >
            <div
              class="w-1 h-2 rounded-full bg-white/50 animate-scroll-dot"
            ></div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      @keyframes fade-in-up {
        from {
          opacity: 0;
          transform: translateY(24px);
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

      @keyframes scroll-dot {
        0%,
        100% {
          transform: translateY(0);
          opacity: 0.5;
        }
        50% {
          transform: translateY(6px);
          opacity: 1;
        }
      }

      .animate-scroll-dot {
        animation: scroll-dot 1.8s ease-in-out infinite;
      }
    `,
  ],
})
export class MetaballHeroSectionComponent {
  /** Active metaball preset - cosmic for dark space-themed SaaS aesthetic */
  readonly preset = signal<MetaballPreset>('cosmic');

  /** Camera position for the 3D scene */
  readonly cameraPosition: [number, number, number] = [0, 0, 5];

  /** Background color derived from the active preset (decimal, not hex literal) */
  readonly backgroundColor: number = getPresetBackgroundHex('cosmic');
}
