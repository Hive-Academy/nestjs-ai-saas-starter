import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Scene3DComponent } from '../../../core/angular-3d/components/scene-3d.component';
import { HeroSpaceSceneComponent } from './scene-graphs/hero-space-scene.component';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';
import { SpaceThemeStore } from '../../../core/angular-3d/services/space-theme.store';

@Component({
  selector: 'brand-hero-section-space',
  standalone: true,
  imports: [CommonModule, Scene3DComponent, ScrollAnimationDirective],
  template: `
    <div
      class="relative w-full h-screen flex flex-col overflow-hidden"
      [style.background]="backgroundGradient"
      style="perspective: 1000px;"
    >
      <!-- 3D Space Background Scene -->
      <app-scene-3d
        class="absolute inset-0"
        [sceneGraph]="sceneGraph"
        [camera]="cameraConfig"
        [gl]="rendererConfig"
      />

      <!-- Theme Switcher - Top Right Corner -->
      <div
        class="absolute top-16 right-6 max-w-18  z-20 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-3 shadow-2xl"
      >
        <div class="text-white text-xs font-medium mb-2 px-2 opacity-70">
          Space Theme
        </div>
        <div class="flex flex-col gap-2">
          @for (theme of themes; track theme.id) {
          <button
            (click)="selectTheme(theme.id)"
            [class.ring-2]="selectedTheme() === theme.id"
            [class.ring-white]="selectedTheme() === theme.id"
            [class.bg-white]="selectedTheme() === theme.id"
            class="group relative w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10
                     border border-white/10 hover:border-white/30
                     transition-all duration-300 cursor-pointer
                     flex items-center justify-center overflow-hidden"
            [title]="theme.name"
          >
            <!-- Theme Icon/Emoji -->
            <span class="text-2xl transition-transform group-hover:scale-110">
              {{ theme.icon }}
            </span>

            <!-- Tooltip on hover -->
            <div
              class="absolute right-full mr-3 px-3 py-2 bg-black/90 text-white text-xs
                       rounded-lg whitespace-nowrap opacity-0 pointer-events-none
                       group-hover:opacity-100 transition-opacity duration-200 border border-white/20"
            >
              <div class="font-semibold">{{ theme.name }}</div>
              <div class="text-gray-400 text-[10px] mt-0.5">
                {{ theme.description }}
              </div>
            </div>
          </button>
          }
        </div>
      </div>

      <!-- DOM Content Overlay - Hero Text (COMMENTED OUT - Replaced with 3D Text in Scene) -->
      <!--
      <div
        class="flex-1 flex flex-col items-center justify-center mb-5 z-10 pointer-events-none"
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
              class="text-2xl sm:text-4xl md:text-6xl lg:text-7xl text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]"
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
      -->
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

      @keyframes pulse-glow {
        0%,
        100% {
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
        }
        50% {
          box-shadow: 0 0 30px rgba(99, 102, 241, 0.6);
        }
      }

      .animate-pulse-glow {
        animation: pulse-glow 2s ease-in-out infinite;
      }
    `,
  ],
})
export class HeroSectionSpaceComponent {
  // Inject theme store for centralized theme management
  private readonly themeStore = inject(SpaceThemeStore);

  readonly sceneGraph = HeroSpaceSceneComponent;

  // Camera configuration for 3D scene
  // Camera at z=60 looking toward origin (where planet is at z=0)
  readonly cameraConfig = {
    position: [0, 0, 45] as [number, number, number],
    fov: 75,
    near: 0.1,
    far: 1000,
  };

  // Renderer configuration with explicit pixel ratio
  readonly rendererConfig = {
    antialias: true,
    alpha: false,
    pixelRatio: Math.min(
      (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1,
      2
    ),
  };

  // Expose store's current theme ID for UI binding
  readonly selectedTheme = this.themeStore.currentThemeId;

  // Get themes from store
  readonly themes = this.themeStore.availableThemes;

  /**
   * Get current theme object
   */
  get currentTheme() {
    return this.themeStore.currentTheme();
  }

  /**
   * Generate CSS background gradient from theme colors
   */
  get backgroundGradient(): string {
    const theme = this.currentTheme;
    const colors = theme.background.colors;

    // Convert hex numbers to CSS color strings
    const cssColors = colors.map((c) => `#${c.toString(16).padStart(6, '0')}`);

    if (theme.background.type === 'radial') {
      // Radial gradient from center
      return `radial-gradient(circle at center, ${cssColors.join(', ')})`;
    } else {
      // Linear gradient from top to bottom
      return `linear-gradient(to bottom, ${cssColors.join(', ')})`;
    }
  }

  /**
   * Select a theme via the store
   */
  selectTheme(themeId: string): void {
    this.themeStore.setTheme(themeId);
  }
}
