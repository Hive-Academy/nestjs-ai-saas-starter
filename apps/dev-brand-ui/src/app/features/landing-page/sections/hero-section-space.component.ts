import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Scene3DComponent } from '../../../core/angular-3d/components/scene-3d.component';
import { SpaceThemeStore } from '../../../core/angular-3d/services/space-theme.store';
import { HeroInteractivePlanetSceneComponent } from './scene-graphs/hero-interactive-planet-scene.component';
import { HeroSceneStateStore } from '../../../core/angular-3d/services/hero-scene-state.store';

@Component({
  selector: 'brand-hero-section-space',
  standalone: true,
  imports: [CommonModule, Scene3DComponent],
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
        [enableMouseParallax]="true"
        [mouseParallax]="{
          sensitivity: 0.4,
          smoothing: 5,
          cameraDistance: 12,
          updateHeroState: true
        }"
      />

      <!-- Theme Switcher - Top Right Corner -->
      <div
        class="absolute top-6 right-6 z-20 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-3 shadow-2xl"
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

      <!-- Spacer for layout (3D text is rendered in the scene) -->
      <div class="flex-1"></div>
    </div>
  `,
  styles: [],
})
export class HeroSectionSpaceComponent {
  // Inject theme store for centralized theme management
  private readonly themeStore = inject(SpaceThemeStore);
  public readonly heroSceneState = inject(HeroSceneStateStore);

  readonly sceneGraph = HeroInteractivePlanetSceneComponent;

  // Camera configuration for 3D scene
  // Camera at z=12 looking toward origin (where planet is at z=0)
  readonly cameraConfig = {
    position: [0, 0, 12] as [number, number, number],
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
