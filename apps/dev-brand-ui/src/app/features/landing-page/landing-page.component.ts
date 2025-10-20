import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  signal,
  ViewChild,
} from '@angular/core';

import { HeroSectionComponent } from './sections/hero-section.component';
import { DataFoundationSectionComponent } from './sections/data-foundation-section.component';
import { CoreFoundationSectionComponent } from './sections/core-foundation-section.component';
import { WorkflowOrchestrationSectionComponent } from './sections/workflow-orchestration-section.component';
import { IntelligenceLayerSectionComponent } from './sections/intelligence-layer-section.component';
import { ProductionSystemsSectionComponent } from './sections/production-systems-section.component';

@Component({
  selector: 'brand-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    HeroSectionComponent,
    DataFoundationSectionComponent,
    CoreFoundationSectionComponent,
    WorkflowOrchestrationSectionComponent,
    IntelligenceLayerSectionComponent,
    ProductionSystemsSectionComponent,
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

      <!-- LangGraph Module Showcase (11 modules across 5 sections) -->
      <section class="langgraph-modules-showcase">
        <!-- Data Foundation: ChromaDB + Neo4j -->
        <div id="data-foundation" class="section-container">
          <app-data-foundation-section />
        </div>

        <!-- Core Foundation: Core + Functional API -->
        <div id="core-foundation" class="section-container">
          <app-core-foundation-section />
        </div>

        <!-- Workflow Orchestration: Multi-agent + Checkpoint + Memory -->
        <div id="workflow-orchestration" class="section-container">
          <app-workflow-orchestration-section />
        </div>

        <!-- Intelligence Layer: HITL + Time-Travel -->
        <div id="intelligence-layer" class="section-container">
          <app-intelligence-layer-section />
        </div>

        <!-- Production Systems: Monitoring + Streaming + Platform -->
        <div id="production-systems" class="section-container">
          <app-production-systems-section />
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

      .langgraph-modules-showcase {
        display: flex;
        flex-direction: column;
        gap: 0;
        background: linear-gradient(180deg, #0a0e27 0%, #1a1f3a 100%);
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
    'data-foundation',
    'core-foundation',
    'workflow-orchestration',
    'intelligence-layer',
    'production-systems',
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
      'data-foundation': 'Data Foundation',
      'core-foundation': 'Core Foundation',
      'workflow-orchestration': 'Workflow',
      'intelligence-layer': 'Intelligence',
      'production-systems': 'Production',
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
    // Navigate to the data foundation section
    this.scrollToSection('data-foundation');
  }

  onWatchDemo(): void {
    // Scroll to the workflow orchestration section
    this.scrollToSection('workflow-orchestration');
  }

  onFeatureSelected(featureId: string): void {
    // Handle feature selection - could trigger animations or navigation
    console.log('Feature selected:', featureId);
    // Navigate to relevant LangGraph module sections
    switch (featureId) {
      case 'ai-automation':
        this.scrollToSection('intelligence-layer');
        break;
      case 'data-analytics':
        this.scrollToSection('data-foundation');
        break;
      case 'cloud-integration':
        this.scrollToSection('production-systems');
        break;
      default:
        this.scrollToSection('core-foundation');
    }
  }
}
