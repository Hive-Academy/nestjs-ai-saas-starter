import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { ArchitectureDiagramComponent } from './sections/architecture-diagram.component';
import { DemoTheaterComponent } from './sections/demo-theater.component';
// import { EcosystemExplorerComponent } from './sections/ecosystem-explorer.component';

import { PlatformPillarsComponent } from './sections/platform-pillars.component';
import { LoadingStateService } from './services/loading-state.service';
import { HeroSectionComponent } from './sections/hero-section.component';
// import { HeroSection3dComponent } from "./components/hero-section-3d/hero-section-3d.component";

@Component({
  selector: 'brand-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    PlatformPillarsComponent,
    DemoTheaterComponent,
    // EcosystemExplorerComponent,
    ArchitectureDiagramComponent,
    HeroSectionComponent,
    // HeroSection3dComponent,
  ],
  template: ` <div
    class="w-full min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a3e] to-[#2d2d5f] text-white opacity-0 transition-opacity duration-700 ease-in-out relative"
    [class.opacity-100]="isLoaded()"
    #landingContainer
  >
    <!-- Global Loading Overlay -->
    @if (!isLoaded()) {
    <div
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-black via-purple-900 to-black"
    >
      <div class="text-center">
        <div
          class="w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"
        ></div>
        <h2 class="text-white text-2xl font-bold mb-2">
          {{ loadingStateService.currentStage() }}
        </h2>
        <p class="text-gray-400 text-sm mb-4">
          {{ loadingStateService.globalLoadingState().stage }}
        </p>

        <!-- Progress Bar -->
        <div class="w-64 h-2 bg-gray-800 rounded-full mx-auto overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
            [style.width.%]="loadingStateService.loadingProgress()"
          ></div>
        </div>

        <p class="text-gray-500 text-xs mt-2">
          {{ loadingStateService.loadingProgress() | number : '1.0-0' }}%
          Complete
        </p>

        <!-- Section Status -->
        <div class="mt-6 text-xs text-gray-600">
          @if (loadingStateService.sectionLoadingStates(); as sections) {
          <div class="flex gap-2 justify-center flex-wrap">
            @for (section of sections; track section.sectionId) {
            <span
              class="px-2 py-1 rounded"
              [class.bg-green-900]="section.isLoaded"
              [class.bg-gray-800]="!section.isLoaded"
              [class.text-green-400]="section.isLoaded"
              [class.text-gray-500]="!section.isLoaded"
            >
              {{ section.sectionId }} @if (section.isLoaded) { ✓ } @else { ... }
            </span>
            }
          </div>
          }
        </div>
      </div>
    </div>
    }

    <!-- Floating Page Controls -->
    <div
      class="fixed top-5 right-5 transition-all duration-300 ease-out"
      style="z-index: 1000"
      [class.opacity-0]="!showCinematicControls()"
      [class.translate-x-full]="!showCinematicControls()"
      [class.opacity-100]="showCinematicControls()"
      [class.translate-x-0]="showCinematicControls()"
    >
      <!-- Floating Button -->
      <div class="relative">
        <button
          class="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-full shadow-lg backdrop-blur-lg border border-white/20 flex items-center justify-center text-white transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95"
          (click)="toggleDropdownControls()"
        >
          ⚙️
        </button>

        <!-- Simple Dropdown Panel -->
        <div
          class="absolute top-16 right-0 bg-black/90 border border-white/20 rounded-xl backdrop-blur-lg shadow-2xl overflow-hidden transition-all duration-300 w-72"
          [class.hidden]="!showDropdownControls()"
        >
          <div class="p-4 space-y-3">
            <div
              class="text-center text-xs text-white/70 border-b border-white/10 pb-2 mb-3"
            >
              Page Controls
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm text-white/80">Smooth Scroll</span>
                <button
                  class="px-3 py-1 bg-purple-600/30 hover:bg-purple-600/50 rounded text-xs"
                  (click)="toggleSmoothScroll()"
                >
                  Toggle
                </button>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-sm text-white/80">Navigation Dots</span>
                <button
                  class="px-3 py-1 bg-blue-600/30 hover:bg-blue-600/50 rounded text-xs"
                  (click)="toggleNavigationDots()"
                >
                  Toggle
                </button>
              </div>
            </div>

            <div class="border-t border-white/10 pt-3">
              <div class="flex items-center justify-between text-xs mb-2">
                <span class="text-white/60">Sections</span>
                <span class="text-white/60">{{ sections().length }}</span>
              </div>

              <div class="flex items-center justify-between mt-2 text-xs">
                <button
                  class="px-2 py-1 bg-sky-600/30 hover:bg-sky-600/50 rounded text-xs"
                  (click)="scrollToTop()"
                >
                  Scroll to Top
                </button>
                <button
                  class="px-2 py-1 bg-green-600/30 hover:bg-green-600/50 rounded text-xs"
                  (click)="exportSectionInfo()"
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Dots (Optional) -->
    <nav
      class="fixed right-5 top-1/2 -translate-y-1/2 z-[1000] opacity-90 transition-all duration-300 select-none"
      [class.hidden]="!showNavigationDots()"
    >
      <ul class="flex flex-col gap-4">
        @for (section of sections(); track section) {
        <li
          class="relative group cursor-pointer"
          [title]="section"
          (click)="scrollToSection(section)"
          (keypress)="scrollToSection(section)"
          tabindex="0"
        >
          <button
            class="relative w-4 h-4 border-2 border-white/50 rounded-full bg-transparent cursor-pointer transition-all duration-300 hover:border-white hover:scale-125 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <span
              class="absolute inset-0.5 bg-white/30 rounded-full transition-all duration-300"
            ></span>
            <span
              class="absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none transition-all duration-300 group-hover:opacity-100"
            >
              {{ getSectionLabel(section) }}
            </span>
          </button>
        </li>
        }
      </ul>
    </nav>

    <!-- All Sections Directly Embedded -->
    <main class="w-full">
      <!-- Hero Section -->
      <div id="hero" class="section-container">
        <!-- <app-hero-angular-three
          (getStarted)="onGetStarted()"
          (watchDemo)="onWatchDemo()"
          (featureSelected)="onFeatureSelected($event)">
        </app-hero-angular-three> -->
        <brand-hero-section />
        <!-- <hero-section-3d /> -->
      </div>

      <!-- Platform Pillars Section -->
      <div id="platform-pillars" class="section-container">
        <brand-platform-pillars></brand-platform-pillars>
      </div>

      <!-- Demo Theater Section -->
      <div id="demo-theater" class="section-container">
        <brand-demo-theater></brand-demo-theater>
      </div>

      <!-- Ecosystem Explorer Section -->
      <!-- <div id="ecosystem-explorer" class="section-container">
        <brand-ecosystem-explorer></brand-ecosystem-explorer>
      </div> -->

      <!-- Architecture Diagram Section -->
      <div id="architecture-diagram" class="section-container">
        <brand-architecture-diagram></brand-architecture-diagram>
      </div>

      <!-- Navigation to other features -->
      <div id="feature-navigation" class="section-container">
        <section
          class="h-screen w-full flex flex-col items-center justify-center box-border text-center bg-black/30 relative"
        >
          <h3 class="text-3xl mb-8 text-white text-center">
            Explore Platform Features
          </h3>
          <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-auto-fit gap-6 max-w-6xl mx-auto"
            style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))"
          >
            <a
              href="/spatial-interface"
              class="block p-6 bg-white/5 border border-white/10 rounded-xl no-underline text-white transition-all duration-300 backdrop-blur-lg hover:bg-white/10 hover:border-purple-500/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/30"
            >
              <h4 class="m-0 mb-2 text-xl text-purple-500">
                3D Agent Visualization
              </h4>
              <p class="m-0 text-white/70 text-sm">
                Interactive spatial interface
              </p>
            </a>
            <a
              href="/workflow-canvas"
              class="block p-6 bg-white/5 border border-white/10 rounded-xl no-underline text-white transition-all duration-300 backdrop-blur-lg hover:bg-white/10 hover:border-purple-500/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/30"
            >
              <h4 class="m-0 mb-2 text-xl text-purple-500">Workflow Canvas</h4>
              <p class="m-0 text-white/70 text-sm">Visual workflow designer</p>
            </a>
            <a
              href="/memory-constellation"
              class="block p-6 bg-white/5 border border-white/10 rounded-xl no-underline text-white transition-all duration-300 backdrop-blur-lg hover:bg-white/10 hover:border-purple-500/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/30"
            >
              <h4 class="m-0 mb-2 text-xl text-purple-500">
                Memory Constellation
              </h4>
              <p class="m-0 text-white/70 text-sm">Distributed memory system</p>
            </a>
            <a
              href="/chat-interface"
              class="block p-6 bg-white/5 border border-white/10 rounded-xl no-underline text-white transition-all duration-300 backdrop-blur-lg hover:bg-white/10 hover:border-purple-500/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/30"
            >
              <h4 class="m-0 mb-2 text-xl text-purple-500">
                AI Chat Interface
              </h4>
              <p class="m-0 text-white/70 text-sm">
                Conversational AI experience
              </p>
            </a>
            <a
              href="/content-forge"
              class="block p-6 bg-white/5 border border-white/10 rounded-xl no-underline text-white transition-all duration-300 backdrop-blur-lg hover:bg-white/10 hover:border-purple-500/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/30"
            >
              <h4 class="m-0 mb-2 text-xl text-purple-500">Content Forge</h4>
              <p class="m-0 text-white/70 text-sm">
                AI-powered content creation
              </p>
            </a>
          </div>
        </section>
      </div>
    </main>
  </div>`,
  styles: [
    `
      .section-container {
        width: 100%;
        min-height: 100vh;
        scroll-margin-top: 0;
      }

      html {
        scroll-behavior: smooth;
      }

      /* Hide scrollbar but allow scrolling */
      ::-webkit-scrollbar {
        width: 8px;
      }

      ::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1);
      }

      ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }
    `,
  ],
})
export class LandingPageComponent implements OnInit, OnDestroy {
  @ViewChild('landingContainer', { static: true })
  landingContainer!: ElementRef<HTMLElement>;

  // Simple page controls
  readonly showCinematicControls = signal(true);
  readonly showDropdownControls = signal(false);
  readonly showNavigationDots = signal(true);
  readonly smoothScrollEnabled = signal(true);

  public loadingStateService = inject(LoadingStateService);

  // Component state
  readonly isLoaded = signal(false);
  readonly sections = signal([
    'hero',
    'platform-pillars',
    'demo-theater',
    'ecosystem-explorer',
    'architecture-diagram',
    'feature-navigation',
  ]);

  readonly loadingProgress = computed(() => {
    // Calculate loading progress based on loaded sections
    return 100; // For now, return 100% once component initializes
  });

  ngOnInit(): void {
    this.initializeLandingPage();
    this.setupSmoothScrolling();
  }

  ngOnDestroy(): void {
    this.loadingStateService.reset();
  }

  private async initializeLandingPage(): Promise<void> {
    try {
      // Start loading state service
      this.loadingStateService.startLoading();

      // Wait for all sections to load (hero, platform-pillars, demo-theater, etc.)
      // LoadingStateService will automatically track via markSectionLoaded() calls from each section

      // Poll until all sections loaded or timeout (10 seconds)
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds (100ms intervals)

      while (
        attempts < maxAttempts &&
        !this.loadingStateService.allSectionsLoaded()
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      // Check if loading completed successfully
      if (this.loadingStateService.allSectionsLoaded()) {
        console.log('All sections loaded successfully');
      } else {
        console.warn('Loading timeout - some sections may not have loaded');
      }

      // Mark as loaded for transition effect
      setTimeout(() => {
        this.loadingStateService.completeLoading();
        this.isLoaded.set(true);
      }, 500);
    } catch (error) {
      console.error('Failed to initialize landing page:', error);
      // Complete loading even if there are errors
      this.loadingStateService.completeLoading();
      this.isLoaded.set(true);
    }
  }

  private setupSmoothScrolling(): void {
    if (typeof window !== 'undefined') {
      // Enable smooth scrolling behavior
      document.documentElement.style.scrollBehavior = this.smoothScrollEnabled()
        ? 'smooth'
        : 'auto';
    }
  }

  // New simplified methods
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: this.smoothScrollEnabled() ? 'smooth' : 'auto',
      });
    }
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: this.smoothScrollEnabled() ? 'smooth' : 'auto',
    });
  }

  getSectionLabel(sectionId: string): string {
    const labelMap: Record<string, string> = {
      hero: 'Hero',
      'platform-pillars': 'Platform',
      'demo-theater': 'Demos',
      'ecosystem-explorer': 'Ecosystem',
      'architecture-diagram': 'Architecture',
      'feature-navigation': 'Features',
    };
    return labelMap[sectionId] || sectionId.replace('-', ' ');
  }

  toggleSmoothScroll(): void {
    this.smoothScrollEnabled.update((enabled) => !enabled);
    this.setupSmoothScrolling();
  }

  toggleNavigationDots(): void {
    this.showNavigationDots.update((show) => !show);
  }

  toggleDropdownControls(): void {
    this.showDropdownControls.update((show) => !show);
  }

  exportSectionInfo(): void {
    const sectionInfo = {
      timestamp: new Date().toISOString(),
      sections: this.sections(),
      smoothScrollEnabled: this.smoothScrollEnabled(),
      showNavigationDots: this.showNavigationDots(),
      totalSections: this.sections().length,
    };

    // Create and download the report
    const blob = new Blob([JSON.stringify(sectionInfo, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `section-info-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Hero component event handlers
  onGetStarted(): void {
    // Navigate to the next section or show a getting started modal
    this.scrollToSection('platform-pillars');
  }

  onWatchDemo(): void {
    // Scroll to the demo section
    this.scrollToSection('demo-theater');
  }

  onFeatureSelected(featureId: string): void {
    // Handle feature selection - could trigger animations or navigation
    console.log('Feature selected:', featureId);
    // You could implement feature-specific navigation here
    switch (featureId) {
      case 'ai-automation':
        this.scrollToSection('platform-pillars');
        break;
      case 'data-analytics':
        this.scrollToSection('ecosystem-explorer');
        break;
      case 'cloud-integration':
        this.scrollToSection('architecture-diagram');
        break;
      default:
        this.scrollToSection('demo-theater');
    }
  }
}
