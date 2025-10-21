/**
 * Intelligence Layer Section - Triangle layout
 */
import { CommonModule } from '@angular/common';
import { Component, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SectionParticleBackgroundComponent } from '../../../shared/components/section-particle-background.component';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';

interface IntelligenceModule {
  icon: string;
  title: string;
  description: string;
  color: 'orange' | 'purple' | 'pink';
  features: string[];
  metric?: { value: string; label: string };
  slug: string;
}

@Component({
  selector: 'app-intelligence-layer-section',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SectionParticleBackgroundComponent,
    ScrollAnimationDirective,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section
      class="w-full min-h-screen relative bg-gradient-to-br from-gray-900/95 to-purple-900/90 py-20"
    >
      <div class="container mx-auto px-8 relative z-10">
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
            🧠 Intelligence Layer
          </h2>
          <p class="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto">
            AI coordination combining memory fusion, multi-agent systems, and
            human oversight
          </p>
        </div>
        <div class="max-w-7xl mx-auto">
          <a
            [routerLink]="['/library', 'langgraph-memory']"
            class="block max-w-3xl mx-auto mb-12 cursor-pointer"
            scrollAnimation
            [scrollConfig]="{
              animation: 'scaleIn',
              start: 'top 80%',
              duration: 0.8,
              ease: 'power2.out'
            }"
          >
            <div
              class="relative bg-orange-600/30 backdrop-blur-sm border border-orange-400/30 rounded-2xl p-10 hover:scale-105 transition-transform"
            >
              <div class="text-6xl mb-4 text-center">🧠</div>
              <h3
                class="text-3xl md:text-4xl font-bold text-orange-400 mb-4 text-center"
              >
                Memory Fusion
              </h3>
              <p class="text-lg text-white/80 mb-8 text-center">
                Dual storage combining ChromaDB + Neo4j
              </p>
              <div class="grid md:grid-cols-2 gap-6 mb-8">
                <div class="bg-black/30 rounded p-6">
                  <div class="font-bold text-white mb-2">🔍 Vector Search</div>
                  <div class="text-sm text-white/60">Semantic similarity</div>
                </div>
                <div class="bg-black/30 rounded p-6">
                  <div class="font-bold text-white mb-2">
                    🌐 Graph Expansion
                  </div>
                  <div class="text-sm text-white/60">
                    Relationship traversal
                  </div>
                </div>
              </div>
              <div class="bg-black/40 rounded p-4 text-center">
                <span class="text-orange-300 font-bold text-xl"
                  >IMemoryAdapter</span
                >
              </div>
            </div>
          </a>
          <div class="grid md:grid-cols-2 gap-10">
            @for (module of bottomModules(); track module.title; let i = $index)
            {
            <a
              [routerLink]="['/library', module.slug]"
              class="relative block cursor-pointer"
              scrollAnimation
              [scrollConfig]="{
                animation: 'slideUp',
                start: 'top 80%',
                duration: 0.6,
                delay: i * 0.2,
                ease: 'power2.out'
              }"
              ><div
                class="relative h-full bg-{{
                  module.color
                }}-600/30 backdrop-blur-sm border border-{{
                  module.color
                }}-400/30 rounded-2xl p-8 hover:bg-white/20 hover:-translate-y-2 transition-all"
              >
                <div class="text-5xl mb-4">{{ module.icon }}</div>
                <h3 class="text-2xl font-bold text-{{ module.color }}-400 mb-3">
                  {{ module.title }}
                </h3>
                <p class="text-base text-white/70 mb-6">
                  {{ module.description }}
                </p>
                <ul class="space-y-2 mb-6">
                  @for (feature of module.features; track feature) {
                  <li class="flex gap-2 text-white/60 text-sm">
                    <span class="text-{{ module.color }}-400">▸</span
                    ><span>{{ feature }}</span>
                  </li>
                  }
                </ul>
                @if (module.metric) {
                <div class="bg-black/30 rounded p-4 text-center">
                  <span class="text-{{ module.color }}-300 font-bold">{{
                    module.metric.value
                  }}</span>
                </div>
                }
              </div></a
            >
            }
          </div>
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
export class IntelligenceLayerSectionComponent {
  readonly bottomModules = signal<IntelligenceModule[]>([
    {
      icon: '👥',
      title: 'Multi-Agent Systems',
      description: 'Role-based agent coordination with memory',
      color: 'purple',
      features: ['@Agent decorator', 'Shared context', 'Memory integration'],
      metric: { value: 'Agent Coordination', label: 'Memory-aware' },
      slug: 'langgraph-multi-agent',
    },
    {
      icon: '👤',
      title: 'Human-in-the-Loop',
      description: '@RequiresApproval gates with learning',
      color: 'pink',
      features: [
        'Declarative approval',
        'Timeout handling',
        'Pattern learning',
      ],
      metric: { value: 'Human Oversight', label: 'Removable gates' },
      slug: 'langgraph-hitl',
    },
  ]);
}
