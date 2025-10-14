import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  signal,
  inject,
} from '@angular/core';
import { HybridUIService } from '../../../core/angular-3d/services/hybrid-ui.service';
import { createBackgroundConfig } from '../../../core/angular-3d/utils/config-builders';

@Component({
  selector: 'brand-hero-section',
  standalone: true,
  imports: [],
  template: `
    <div
      class="relative w-full h-screen overflow-auto bg-gradient-to-br from-black via-purple-900 to-black"
      [class.loaded]="isLoaded()"
    >
      <!-- 3D Scene Container -->
      <div class="absolute inset-0 z-10" #sceneContainer></div>

      <!-- Hero Content Overlay -->
      <div
        class="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
      >
        <div
          class="text-center max-w-4xl px-8 opacity-0 transform translate-y-8 transition-all duration-1000 ease-out pointer-events-auto"
          [class.opacity-100]="contentVisible()"
          [class.translate-y-0]="contentVisible()"
        >
          <h1
            class="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
          >
            <span
              class="block bg-gradient-to-br from-white to-gray-300 bg-clip-text text-transparent"
              >Enterprise AI</span
            >
            <span
              class="block bg-gradient-to-r from-purple-500 via-pink-500 to-sky-500 bg-clip-text text-transparent animate-pulse"
              >SaaS Starter</span
            >
          </h1>
          <p
            class="text-lg md:text-xl lg:text-2xl leading-relaxed text-white text-opacity-85 mb-8 max-w-2xl mx-auto"
          >
            Production-ready foundation for AI-powered applications combining
            <span
              class="text-purple-500 font-semibold"
              style="text-shadow: 0 0 10px rgba(138, 43, 226, 0.5)"
              >vector search</span
            >,
            <span
              class="text-purple-500 font-semibold"
              style="text-shadow: 0 0 10px rgba(138, 43, 226, 0.5)"
              >graph relationships</span
            >, and
            <span
              class="text-purple-500 font-semibold"
              style="text-shadow: 0 0 10px rgba(138, 43, 226, 0.5)"
              >intelligent workflows</span
            >
          </p>
          <div class="flex justify-center gap-4 my-8 flex-wrap">
            <div
              class="flex items-center gap-2 px-5 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-full backdrop-blur-lg text-sm text-white transition-all duration-300 hover:bg-purple-500 hover:bg-opacity-20 hover:border-purple-500 hover:border-opacity-50 hover:-translate-y-0.5"
            >
              <span class="text-xl">🧠</span>
              <span>Semantic Intelligence</span>
            </div>
            <div
              class="flex items-center gap-2 px-5 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-full backdrop-blur-lg text-sm text-white transition-all duration-300 hover:bg-purple-500 hover:bg-opacity-20 hover:border-purple-500 hover:border-opacity-50 hover:-translate-y-0.5"
            >
              <span class="text-xl">🕸️</span>
              <span>Relationship Mapping</span>
            </div>
            <div
              class="flex items-center gap-2 px-5 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-full backdrop-blur-lg text-sm text-white transition-all duration-300 hover:bg-purple-500 hover:bg-opacity-20 hover:border-purple-500 hover:border-opacity-50 hover:-translate-y-0.5"
            >
              <span class="text-xl">⚡</span>
              <span>Intelligent Workflows</span>
            </div>
          </div>
          <div class="flex justify-center gap-4 mt-10 flex-wrap">
            <button
              class="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none rounded-xl text-lg font-semibold cursor-pointer transition-all duration-300 backdrop-blur-lg hover:-translate-y-1"
              style="box-shadow: 0 4px 20px rgba(138, 43, 226, 0.4)"
              (click)="exploreDemo()"
              onmouseover="this.style.boxShadow='0 8px 30px rgba(138, 43, 226, 0.6)'"
              onmouseout="this.style.boxShadow='0 4px 20px rgba(138, 43, 226, 0.4)'"
            >
              <span>Explore Live Demo</span>
              <span class="text-xl">🚀</span>
            </button>
            <button
              class="flex items-center gap-2 px-8 py-4 bg-white bg-opacity-10 text-white border border-white border-opacity-30 rounded-xl text-lg font-semibold cursor-pointer transition-all duration-300 backdrop-blur-lg hover:bg-opacity-20 hover:-translate-y-0.5"
              (click)="viewArchitecture()"
            >
              <span>View Architecture</span>
              <span class="text-xl">🏗️</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Performance Indicator -->
      @if (showPerformanceDebug()) {
      <div
        class="absolute top-5 right-5 bg-black bg-opacity-70 text-green-400 px-2 py-2 rounded text-xs font-mono z-30"
      >
        FPS: {{ currentFPS() }}
      </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .text-center > div {
          padding: 1rem;
        }
      }
    `,
  ],
})
export class HeroSectionComponent implements OnInit {
  @ViewChild('sceneContainer', { static: true }) sceneContainer!: ElementRef;

  // Inject HybridUIService
  private readonly hybridUI = inject(HybridUIService);

  // Component state (signal-based)
  readonly isLoaded = signal(false);
  readonly contentVisible = signal(false);
  readonly showPerformanceDebug = signal(false);
  readonly currentFPS = signal(60);

  async ngOnInit(): Promise<void> {
    await this.initializeHeroSection();
  }

  private async initializeHeroSection(): Promise<void> {
    try {
      // Create config using builder - replaces 800+ lines of manual Three.js setup
      const config = createBackgroundConfig({
        enableParticles: true,
        quality: 'medium',
      });

      // Single service call replaces entire scene/camera/renderer/mesh/particle setup
      await this.hybridUI.createHybridElement(
        this.sceneContainer.nativeElement,
        config
      );

      // Mark as loaded
      this.isLoaded.set(true);

      // Show content with delay
      setTimeout(() => {
        this.contentVisible.set(true);
      }, 1500);
    } catch (error) {
      console.error('Failed to initialize hero section:', error);
      this.isLoaded.set(true);
      this.contentVisible.set(true);
    }
  }

  exploreDemo(): void {
    // Scroll to demo theater section
    document.getElementById('demo-theater')?.scrollIntoView({
      behavior: 'smooth',
    });
  }

  viewArchitecture(): void {
    // Scroll to architecture diagram section
    document.getElementById('architecture-diagram')?.scrollIntoView({
      behavior: 'smooth',
    });
  }

  // NO ngOnDestroy needed - HybridUIService handles cleanup automatically
}
