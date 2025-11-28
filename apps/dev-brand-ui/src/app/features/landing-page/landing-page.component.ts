import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  signal,
  ViewChild,
} from '@angular/core';

import { HeroSectionComponent } from './sections/hero-section.component';
import { HeroSectionSpaceComponent } from './sections/hero-section-space.component';
import { ProblemSolutionSectionComponent } from './sections/problem-solution-section.component';
import { ValuePropositionsSectionComponent } from './sections/value-propositions-section.component';
import { WorkflowExamplesSectionComponent } from './sections/workflow-examples-section.component';
import { CapabilitiesMatrixSectionComponent } from './sections/capabilities-matrix-section.component';
import { DeveloperExperienceSectionComponent } from './sections/developer-experience-section.component';
import { CTASectionComponent } from './sections/cta-section.component';
import { LoginButtonComponent } from '../../shared/components/auth/login-button.component';
import { UserProfileComponent } from '../../shared/components/auth/user-profile.component';

/**
 * Landing Page Component
 *
 * Integrates all 7 landing page sections in narrative order:
 * 1. Hero Section - Value proposition & 90% code reduction
 * 2. Problem/Solution - Pain points & NestJS patterns for AI/ML
 * 3. Value Propositions - 11 libraries showcase
 * 4. Workflow Examples - Real cohesive integrations
 * 5. Capabilities Matrix - Enterprise features grid
 * 6. Developer Experience - Code comparison & pattern mapping
 * 7. CTA Section - Drive conversions
 */
@Component({
  selector: 'brand-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    HeroSectionComponent,
    HeroSectionSpaceComponent,
    ProblemSolutionSectionComponent,
    ValuePropositionsSectionComponent,
    WorkflowExamplesSectionComponent,
    CapabilitiesMatrixSectionComponent,
    DeveloperExperienceSectionComponent,
    CTASectionComponent,
    LoginButtonComponent,
    UserProfileComponent,
  ],
  template: ` <div
    class="w-full min-h-screen bg-white opacity-0 transition-opacity duration-700 ease-in-out relative"
    [class.opacity-100]="isLoaded()"
    #landingContainer
  >
    <!-- Hero Section Toggle Button (Top Left) -->
    <button
      (click)="toggleHeroVersion()"
      class="fixed top-4 right-6 z-[1000] px-4 py-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/20 text-white text-sm font-medium hover:bg-black/60 transition-all duration-300 shadow-lg"
    >
      {{ useSpaceHero() ? '🌌 Space' : '☀️ Sky' }} Hero
      <span class="text-xs opacity-70 ml-2">Click to switch</span>
    </button>

    <!-- Auth UI (Top Left - Below navigation area) -->
    <div class="fixed top-20 left-6 z-[1000] flex items-center gap-3">
      <app-login-button />
      <app-user-profile />
    </div>

    <main class="w-full " role="main">
      <div id="hero" class="section-container">
        @if (useSpaceHero()) { <brand-hero-section-space /> } @else {
        <brand-hero-section /> }
      </div>
      <div id="problem-solution" class="section-container">
        <app-problem-solution-section />
      </div>
      <div id="value-propositions" class="section-container">
        <app-value-propositions-section />
      </div>
      <div id="workflow-examples" class="section-container">
        <app-workflow-examples-section />
      </div>
      <div id="capabilities-matrix" class="section-container">
        <app-capabilities-matrix-section />
      </div>
      <div id="developer-experience" class="section-container">
        <app-developer-experience-section />
      </div>
      <div id="cta" class="section-container">
        <app-cta-section />
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
export class LandingPageComponent implements AfterViewInit {
  @ViewChild('landingContainer', { static: true })
  landingContainer!: ElementRef<HTMLElement>;
  readonly showNavigationDots = signal(true);
  readonly smoothScrollEnabled = signal(true);
  readonly useSpaceHero = signal(true);
  readonly isLoaded = signal(false);
  readonly loadingProgress = signal(0);
  readonly sections = signal([
    'hero',
    'problem-solution',
    'value-propositions',
    'workflow-examples',
    'capabilities-matrix',
    'developer-experience',
    'cta',
  ]);

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.loadingProgress.set(50);
      requestAnimationFrame(() => {
        this.loadingProgress.set(100);
        setTimeout(() => {
          console.log('[LandingPage] All sections loaded, fading in...');
          this.isLoaded.set(true);
        }, 300);
      });
    });
    this.setupSmoothScrolling();
  }

  private setupSmoothScrolling(): void {
    if (typeof window !== 'undefined') {
      document.documentElement.style.scrollBehavior = this.smoothScrollEnabled()
        ? 'smooth'
        : 'auto';
    }
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: this.smoothScrollEnabled() ? 'smooth' : 'auto',
        block: 'start',
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
      'problem-solution': 'Problem/Solution',
      'value-propositions': 'Value Propositions',
      'workflow-examples': 'Workflow Examples',
      'capabilities-matrix': 'Capabilities Matrix',
      'developer-experience': 'Developer Experience',
      cta: 'Get Started',
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

  toggleHeroVersion(): void {
    this.useSpaceHero.update((useSpace) => !useSpace);
  }
}
