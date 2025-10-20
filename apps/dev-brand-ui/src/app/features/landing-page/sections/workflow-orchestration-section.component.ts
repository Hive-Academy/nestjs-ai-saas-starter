/**
 * Workflow Orchestration Section Component
 *
 * Showcases the three core workflow orchestration modules:
 * - workflow-engine: Central orchestration hub
 * - functional-api: Functional programming patterns
 * - streaming: Real-time data processing
 *
 * Features:
 * - Three-column grid layout (desktop), stacked (mobile)
 * - GlassmorphismCard for each module
 * - Stagger animation (0.15s delay between cards)
 * - 3D Budget: 45 particles total (15 per card)
 *
 * Pattern Source: Phase 2 data-foundation-section.component.ts
 * Animation Pattern: GSAP ScrollTrigger with stagger
 */

import { CommonModule } from '@angular/common';
import {
  Component,
  signal,
  afterNextRender,
  CUSTOM_ELEMENTS_SCHEMA,
  Injector,
} from '@angular/core';
import { GlassmorphismCardComponent } from '../../../shared/components/glassmorphism-card.component';
import { SectionContainerComponent } from '../../../shared/components/section-container.component';
import { SectionParticleBackgroundComponent } from '../../../shared/components/section-particle-background.component';

// Lazy import GSAP for performance
let gsap: any;
let ScrollTrigger: any;

interface WorkflowModule {
  icon: string;
  title: string;
  subtitle: string;
  color: 'orange' | 'cyan' | 'pink';
  features: string[];
  particleTint: 'orange' | 'cyan' | 'purple';
}

@Component({
  selector: 'app-workflow-orchestration-section',
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
      title="Workflow Orchestration"
      subtitle="Build, manage, and scale AI workflows with enterprise patterns"
      [minHeight]="'80vh'"
      background="gradient"
      [enableMouseParallax]="false"
    >
      <!-- Three-Column Grid Layout -->
      <div class="grid md:grid-cols-3 gap-6" #cardsContainer>
        @for (module of workflowModules(); track module.title) {
        <div class="workflow-card relative">
          <!-- Particle Background (15 particles per card) -->
          <div class="absolute inset-0 pointer-events-none">
            <app-section-particle-background
              [particleCount]="15"
              [tintColor]="module.particleTint"
              [particleSize]="0.6"
              [particleOpacity]="0.4"
            />
          </div>

          <!-- Glassmorphism Card -->
          <app-glassmorphism-card
            [icon]="module.icon"
            [title]="module.title"
            [description]="module.subtitle"
            [color]="module.color"
            [features]="module.features"
          />
        </div>
        }
      </div>
    </app-section-container>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .workflow-card {
        opacity: 0;
        transform: translateY(30px);
      }
    `,
  ],
})
export class WorkflowOrchestrationSectionComponent {
  // Workflow modules data
  readonly workflowModules = signal<WorkflowModule[]>([
    {
      icon: '⚙️',
      title: 'workflow-engine',
      subtitle: 'Central orchestration hub',
      color: 'orange',
      features: [
        'Workflow composition',
        'Task scheduling',
        'Dependency resolution',
        'Dynamic routing',
      ],
      particleTint: 'orange',
    },
    {
      icon: 'λ',
      title: 'functional-api',
      subtitle: 'Functional programming patterns',
      color: 'cyan',
      features: [
        'Pure functions',
        'Immutable state',
        'Function composition',
        'Type inference',
      ],
      particleTint: 'cyan',
    },
    {
      icon: '📡',
      title: 'streaming',
      subtitle: 'Real-time data processing',
      color: 'pink',
      features: [
        'Event streaming',
        'Backpressure handling',
        'Stream transformations',
        'Live updates',
      ],
      particleTint: 'purple',
    },
  ]);

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

      // Stagger animation for workflow cards
      gsap.fromTo(
        '.workflow-card',
        {
          opacity: 0,
          y: 30,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.15, // 150ms delay between cards
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.workflow-card',
            start: 'top 80%', // Start when cards enter viewport
            toggleActions: 'play none none none',
          },
        }
      );
    } catch (error) {
      console.error('Failed to initialize GSAP scroll animation:', error);
    }
  }
}
