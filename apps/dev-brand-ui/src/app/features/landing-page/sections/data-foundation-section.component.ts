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
import { Component, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GlassmorphismCardComponent } from '../../../shared/components/glassmorphism-card.component';
import { SectionContainerComponent } from '../../../shared/components/section-container.component';
import { SectionParticleBackgroundComponent } from '../../../shared/components/section-particle-background.component';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';

interface DatabaseCard {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  color: 'green' | 'blue' | 'purple' | 'pink';
  features: string[];
  businessMetric: {
    value: string;
    label: string;
  };
  particleTint: 'green' | 'cyan' | 'purple' | 'pink';
  cta: string;
  slug: string;
}

@Component({
  selector: 'app-data-foundation-section',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    GlassmorphismCardComponent,
    SectionContainerComponent,
    SectionParticleBackgroundComponent,
    ScrollAnimationDirective,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section
      class="w-full min-h-screen relative bg-gradient-to-br from-black via-sky-900 to-black py-20 overflow-hidden"
    >
      <!-- Subtle 3D Particle Background -->
      <div class="absolute inset-0 pointer-events-none">
        <app-section-particle-background
          [particleCount]="30"
          tintColor="green"
          [particleSize]="0.8"
          [particleOpacity]="0.2"
        />
      </div>

      <div class="container mx-auto px-8 relative z-10">
        <!-- Section Header -->
        <div
          class="text-center mb-16"
          scrollAnimation
          [scrollConfig]="{
            animation: 'slideUp',
            start: 'top 80%',
            duration: 0.6,
            ease: 'power2.out'
          }"
        >
          <h2
            class="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text text-transparent"
          >
            🗄️ Data Foundation
          </h2>
          <p
            class="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed"
          >
            Enterprise-grade storage combining vector intelligence (ChromaDB)
            and graph relationships (Neo4j) for sophisticated AI-powered
            applications
          </p>
        </div>

        <!-- Two-Column Grid with Comprehensive Cards -->
        <div class="grid md:grid-cols-2 gap-12 max-w-7xl mx-auto">
          @for (card of databaseCards(); track card.title; let i = $index) {
          <div
            class="relative group"
            scrollAnimation
            [scrollConfig]="{
              animation: 'slideUp',
              start: 'top 80%',
              duration: 0.6,
              delay: i * 0.2,
              ease: 'power2.out'
            }"
          >
            <!-- Card Particle Background (per card) -->
            <div
              class="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            >
              <app-section-particle-background
                [particleCount]="15"
                [tintColor]="card.particleTint"
                [particleSize]="0.5"
                [particleOpacity]="0.3"
              />
            </div>

            <!-- Glassmorphism Card with Enhanced Content -->
            <div
              class="relative h-full bg-{{
                card.color === 'green' ? 'purple' : 'pink'
              }}-600/30 backdrop-blur-sm border border-{{
                card.color === 'green' ? 'purple' : 'pink'
              }}-400/30 rounded-2xl p-8
                        hover:bg-white/20 hover:-translate-y-2 transition-all duration-300
                        hover:shadow-2xl hover:shadow-{{
                card.color === 'green' ? 'purple' : 'pink'
              }}-500/40"
            >
              <!-- Icon & Title -->
              <div class="text-6xl mb-6">{{ card.icon }}</div>
              <h3
                class="text-3xl md:text-4xl font-bold text-{{
                  card.color === 'green' ? 'purple' : 'pink'
                }}-400 mb-4"
              >
                {{ card.title }}
              </h3>
              <p class="text-lg md:text-xl text-white/80 mb-6 leading-relaxed">
                {{ card.description }}
              </p>

              <!-- Key Features List -->
              <ul class="space-y-3 mb-8">
                @for (feature of card.features; track feature) {
                <li class="flex items-start gap-3 text-white/70">
                  <span
                    class="text-{{
                      card.color === 'green' ? 'purple' : 'pink'
                    }}-400 text-xl mt-1"
                    >▸</span
                  >
                  <span class="text-base md:text-lg">{{ feature }}</span>
                </li>
                }
              </ul>

              <!-- Business Metric Highlight -->
              <div class="bg-black/30 rounded-lg p-6 mb-6">
                <div
                  class="text-3xl md:text-4xl font-bold text-{{
                    card.color === 'green' ? 'purple' : 'pink'
                  }}-300"
                >
                  {{ card.businessMetric.value }}
                </div>
                <div class="text-sm md:text-base text-white/60 mt-2">
                  {{ card.businessMetric.label }}
                </div>
              </div>

              <!-- Call-to-Action Button -->
              <a
                [routerLink]="['/library', card.slug]"
                class="block w-full px-6 py-4 bg-gradient-to-r from-{{
                  card.color === 'green'
                    ? 'purple-500 to-pink-500'
                    : 'pink-500 to-purple-500'
                }} rounded-lg
                       font-semibold text-white text-lg hover:from-{{
                  card.color === 'green' ? 'purple-600' : 'pink-600'
                }} hover:to-{{
                  card.color === 'green' ? 'pink-600' : 'purple-600'
                }}
                       transition-all duration-300 hover:scale-105 text-center cursor-pointer"
              >
                {{ card.cta }}
              </a>
            </div>
          </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class DataFoundationSectionComponent {
  // Database cards data with comprehensive business value
  readonly databaseCards = signal<DatabaseCard[]>([
    {
      icon: '🔍',
      title: 'ChromaDB Vector Store',
      subtitle: 'Semantic search with 90% less code',
      description:
        'TypeORM-style repository pattern for semantic search with automatic embedding generation, intelligent caching, and enterprise multi-tenancy',
      color: 'green',
      features: [
        'Multi-provider embeddings (OpenAI, HuggingFace, Cohere)',
        'Enterprise multi-tenancy with GDPR/HIPAA compliance',
        'Intelligent caching & auto-chunking with metadata extraction',
        'TypeORM-style repository pattern (15+ CRUD methods)',
        'Vector-aware caching with collection invalidation',
        'Production-ready monitoring & health checks',
      ],
      businessMetric: {
        value: '90% Less Code',
        label: 'vs. manual vector operations',
      },
      particleTint: 'purple',
      cta: 'Explore ChromaDB →',
      slug: 'chromadb',
    },
    {
      icon: '🌐',
      title: 'Neo4j Graph Database',
      subtitle: 'Type-safe graph operations with zero boilerplate',
      description:
        'Revolutionary Entity CRUD decorators with auto-generated repositories, graph algorithms, and multi-tenancy support for complex relationship modeling',
      color: 'blue',
      features: [
        'Auto-generated repositories (15+ CRUD methods)',
        'Graph algorithms (PageRank, community detection)',
        'Multi-tenant database-per-tenant isolation',
        'TypeORM-style injection pattern (@InjectRepository)',
        'Enterprise security (5-decorator system)',
        'Type-safe query builder with fluent API',
      ],
      businessMetric: {
        value: 'Zero Boilerplate',
        label: 'Auto-generated CRUD operations',
      },
      particleTint: 'pink',
      cta: 'Explore Neo4j →',
      slug: 'neo4j',
    },
  ]);
}
