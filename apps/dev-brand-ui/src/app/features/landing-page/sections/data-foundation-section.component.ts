/**
 * Data Foundation Section Component
 *
 * First content section showcasing the dual-database architecture:
 * - ChromaDB (vector database) for semantic search
 * - Neo4j (graph database) for relationship modeling
 *
 * Features:
 * - Two-column responsive grid layout
 * - GSAP scroll-triggered stagger animation
 * - Lightweight particle backgrounds (15 per card = 30 total)
 * - Glassmorphism card integration
 *
 * Pattern Source: Phase 1 foundation components
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

interface DatabaseCard {
  icon: string;
  title: string;
  subtitle: string;
  color: 'green' | 'blue';
  features: string[];
  particleTint: 'green' | 'cyan';
}

@Component({
  selector: 'app-data-foundation-section',
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
      title="Enterprise Data Foundation"
      subtitle="Dual-database architecture for maximum flexibility"
      [minHeight]="'80vh'"
      background="gradient"
      [enableMouseParallax]="false"
    >
      <!-- Two-Column Grid Layout -->
      <div class="grid md:grid-cols-2 gap-8" #cardsContainer>
        @for (card of databaseCards(); track card.title) {
        <div class="card-item relative">
          <!-- Particle Background (15 particles per card) -->
          <div class="absolute inset-0 pointer-events-none">
            <app-section-particle-background
              [particleCount]="15"
              [tintColor]="card.particleTint"
              [particleSize]="0.6"
              [particleOpacity]="0.4"
            />
          </div>

          <!-- Glassmorphism Card -->
          <app-glassmorphism-card
            [icon]="card.icon"
            [title]="card.title"
            [description]="card.subtitle"
            [color]="card.color"
            [features]="card.features"
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

      .card-item {
        opacity: 0;
        transform: translateY(30px);
      }
    `,
  ],
})
export class DataFoundationSectionComponent {
  // Database cards data
  readonly databaseCards = signal<DatabaseCard[]>([
    {
      icon: '🔍',
      title: 'ChromaDB Vector Store',
      subtitle: 'Semantic search & embeddings',
      color: 'green',
      features: [
        'Multi-collection semantic search',
        'OpenAI embedding integration',
        'Metadata filtering & hybrid queries',
        'Production-ready persistence',
      ],
      particleTint: 'green',
    },
    {
      icon: '🕸️',
      title: 'Neo4j Graph Database',
      subtitle: 'Complex relationships at scale',
      color: 'blue',
      features: [
        'Cypher query language',
        'Real-time relationship traversal',
        'Knowledge graph modeling',
        'ACID transactions',
      ],
      particleTint: 'cyan',
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

      // Stagger animation for card entrance
      gsap.fromTo(
        '.card-item',
        {
          opacity: 0,
          y: 30,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.2, // 200ms delay between cards
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '.card-item',
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
