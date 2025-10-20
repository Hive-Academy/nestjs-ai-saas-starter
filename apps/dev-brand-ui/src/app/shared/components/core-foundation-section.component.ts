/**
 * Core Foundation Section Component
 *
 * Showcases langgraph-core as the central foundation powering 11 specialized modules.
 * Features a spotlight card emphasizing the core module with detailed features.
 *
 * Features:
 * - Single centered spotlight card (langgraph-core)
 * - Detailed feature list for core capabilities
 * - 3D Budget: 15 particles with purple tint
 * - Animation: Fade-in with scale from 0.95 to 1.0
 *
 * Pattern Source: Phase 2 data-foundation-section.component.ts
 * Animation Pattern: GSAP ScrollTrigger with fade + scale
 */

import { CommonModule } from '@angular/common';
import {
  Component,
  signal,
  afterNextRender,
  CUSTOM_ELEMENTS_SCHEMA,
  Injector,
} from '@angular/core';
import { GlassmorphismCardComponent } from './glassmorphism-card.component';
import { SectionContainerComponent } from './section-container.component';
import { SectionParticleBackgroundComponent } from './section-particle-background.component';

// Lazy import GSAP for performance
let gsap: any;
let ScrollTrigger: any;

interface CoreModule {
  icon: string;
  title: string;
  subtitle: string;
  color: 'purple';
  features: string[];
}

@Component({
  selector: 'app-core-foundation-section',
  standalone: true,
  imports: [
    CommonModule,
    GlassmorphismCardComponent,
    SectionContainerComponent,
    SectionParticleBackgroundComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <app-section-container
      title="Core Foundation"
      subtitle="Enterprise-grade workflow orchestration powered by LangGraph Core"
      [minHeight]="'80vh'"
      background="gradient"
      [enableMouseParallax]="false"
    >
      <!-- Centered Spotlight Card -->
      <div class="max-w-4xl mx-auto" #cardContainer>
        <div class="spotlight-card relative">
          <!-- Particle Background (15 particles) -->
          <div class="absolute inset-0 pointer-events-none">
            <app-section-particle-background
              [particleCount]="15"
              [tintColor]="'purple'"
              [particleSize]="0.7"
              [particleOpacity]="0.5"
            />
          </div>

          <!-- Glassmorphism Card -->
          <app-glassmorphism-card
            [icon]="coreModule().icon"
            [title]="coreModule().title"
            [description]="coreModule().subtitle"
            [color]="coreModule().color"
            [features]="coreModule().features"
          />
        </div>
      </div>
    </app-section-container>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .spotlight-card {
        opacity: 0;
        transform: scale(0.95) translateY(20px);
      }
    `,
  ],
})
export class CoreFoundationSectionComponent {
  // Core module data
  readonly coreModule = signal<CoreModule>({
    icon: '⚡',
    title: 'langgraph-core',
    subtitle: 'The foundational layer for building sophisticated AI workflows',
    color: 'purple',
    features: [
      'Type-safe workflow interfaces',
      'Advanced state management',
      'Graph-based orchestration',
      'Conditional routing',
      'Parallel execution',
      'Error recovery patterns',
    ],
  });

  constructor(private injector: Injector) {
    // Initialize GSAP scroll animation after render
    afterNextRender(
      {
        write: () => {
          this.initScrollAnimation();
        },
      },
      { injector: this.injector }
    );
  }

  private async initScrollAnimation(): Promise<void> {
    try {
      // Lazy load GSAP modules
      if (!gsap) {
        const gsapModule = await import('gsap');
        const scrollTriggerModule = await import('gsap/ScrollTrigger');
        gsap = gsapModule.gsap || gsapModule.default;
        ScrollTrigger =
          scrollTriggerModule.ScrollTrigger || scrollTriggerModule.default;
        gsap.registerPlugin(ScrollTrigger);
      }

      // Fade-in with scale animation for spotlight card
      gsap.fromTo(
        '.spotlight-card',
        {
          opacity: 0,
          scale: 0.95,
          y: 20,
        },
        {
          opacity: 1,
          scale: 1.0,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.spotlight-card',
            start: 'top 80%', // Start when card enters viewport
            toggleActions: 'play none none none',
          },
        }
      );
    } catch (error) {
      console.error('Failed to initialize GSAP scroll animation:', error);
    }
  }
}
