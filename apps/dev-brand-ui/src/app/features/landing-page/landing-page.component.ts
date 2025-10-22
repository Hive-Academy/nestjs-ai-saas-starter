import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  signal,
  ViewChild,
} from '@angular/core';

import { HeroSectionComponent } from './sections/hero-section.component';
import { ChromadbSectionComponent } from './sections/chromadb-section.component';

@Component({
  selector: 'brand-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    HeroSectionComponent,
    ChromadbSectionComponent,
  ],
  template: ` <div
    class="w-full min-h-screen bg-white opacity-0 transition-opacity duration-700 ease-in-out relative"
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
        <h2 class="text-white text-2xl font-bold mb-2">Loading Experience</h2>
        <p class="text-gray-400 text-sm mb-4">
          Preparing your immersive journey...
        </p>

        <!-- Progress Bar -->
        <div class="w-64 h-2 bg-gray-800 rounded-full mx-auto overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
            [style.width.%]="loadingProgress()"
          ></div>
        </div>

        <p class="text-gray-500 text-xs mt-2">
          {{ loadingProgress() }}% Complete
        </p>
      </div>
    </div>
    }

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
        <brand-hero-section />
      </div>

      <!-- Library Showcase Sections (Light Design System) -->
      <section class="library-showcase">
        <!-- ChromaDB Section -->
        <div id="chromadb" class="section-container">
          <app-chromadb-section />
        </div>
      </section>
    </main>
  </div>`,
  styles: [
    `
      .section-container {
        width: 100%;
        min-height: 100vh;
        scroll-margin-top: 0;
      }

      .library-showcase {
        display: flex;
        flex-direction: column;
        gap: 0;
        background: white;
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
export class LandingPageComponent implements AfterViewInit {
  @ViewChild('landingContainer', { static: true })
  landingContainer!: ElementRef<HTMLElement>;

  // Simple page controls
  readonly showCinematicControls = signal(true);
  readonly showDropdownControls = signal(false);
  readonly showNavigationDots = signal(true);
  readonly smoothScrollEnabled = signal(true);

  // Component state
  readonly isLoaded = signal(false);
  readonly loadingProgress = signal(0);
  readonly sections = signal([
    'hero',
    'chromadb',
  ]);

  ngAfterViewInit(): void {
    // Simple, immediate loading - no complex observables
    // Angular Three (NgtCanvas) handles its own initialization
    // We just need a brief moment for the initial render, then fade in

    // Use requestAnimationFrame to wait for next paint cycle
    requestAnimationFrame(() => {
      // Update progress for visual feedback
      this.loadingProgress.set(50);

      // Wait one more frame for Angular Three to mount
      requestAnimationFrame(() => {
        this.loadingProgress.set(100);

        // Short delay for smooth transition, then show content
        setTimeout(() => {
          console.log('[LandingPage] ✅ Content ready, fading in...');
          this.isLoaded.set(true);
        }, 300);
      });
    });

    this.setupSmoothScrolling();
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
      chromadb: 'ChromaDB',
      neo4j: 'Neo4j',
      'langgraph-core': 'LangGraph Core',
      memory: 'Memory',
      checkpoint: 'Checkpoint',
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
    // Navigate to the ChromaDB section
    this.scrollToSection('chromadb');
  }

  onWatchDemo(): void {
    // Scroll to the LangGraph Core section
    this.scrollToSection('langgraph-core');
  }

  onFeatureSelected(featureId: string): void {
    // Handle feature selection - could trigger animations or navigation
    console.log('Feature selected:', featureId);
    // Navigate to relevant library sections
    switch (featureId) {
      case 'ai-automation':
        this.scrollToSection('memory');
        break;
      case 'data-analytics':
        this.scrollToSection('chromadb');
        break;
      case 'cloud-integration':
        this.scrollToSection('checkpoint');
        break;
      default:
        this.scrollToSection('langgraph-core');
    }
  }
}
