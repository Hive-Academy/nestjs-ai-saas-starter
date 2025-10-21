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
import { Component, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GlassmorphismCardComponent } from '../../../shared/components/glassmorphism-card.component';
import { SectionContainerComponent } from '../../../shared/components/section-container.component';
import { SectionParticleBackgroundComponent } from '../../../shared/components/section-particle-background.component';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';

interface CoreModule {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  color: 'purple';
  features: Array<{ icon: string; title: string; description: string }>;
  powersModules: string[];
}

@Component({
  selector: 'app-core-foundation-section',
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
      class="w-full min-h-screen relative bg-gradient-to-br from-gray-900/95 to-indigo-900/90 py-20 overflow-hidden"
    >
      <!-- 3D Foundation Cubes Background -->
      <div class="absolute inset-0 pointer-events-none opacity-10">
        <app-section-particle-background
          [particleCount]="5"
          tintColor="purple"
          [particleSize]="2"
          [particleOpacity]="0.1"
        />
      </div>

      <div class="container mx-auto px-8 relative z-10">
        <!-- Section Header -->
        <div
          class="text-center mb-16"
          scrollAnimation
          [scrollConfig]="{
            animation: 'scaleIn',
            start: 'top 80%',
            duration: 0.8,
            ease: 'power2.out'
          }"
        >
          <h2
            class="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text text-transparent"
          >
            ⚡ Core Foundation
          </h2>
          <p
            class="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed"
          >
            Type-safe workflow interfaces powering the entire AI ecosystem -
            Foundation for 12 specialized modules
          </p>
        </div>

        <!-- Single Spotlight Card (Centered, Large) -->
        <div
          class="max-w-5xl mx-auto mb-12"
          scrollAnimation
          [scrollConfig]="{
            animation: 'scaleIn',
            start: 'top 80%',
            duration: 0.8,
            ease: 'power2.out'
          }"
        >
          <div
            class="relative bg-purple-600/30 backdrop-blur-sm border border-purple-400/30 rounded-2xl p-12 text-center hover:bg-white/20 transition-all duration-300"
          >
            <div class="text-7xl mb-6">⚡</div>
            <h3 class="text-4xl md:text-5xl font-bold text-purple-400 mb-4">
              LangGraph Core
            </h3>
            <p class="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto">
              {{ coreModule().description }}
            </p>

            <!-- Core Features Grid (3 columns) -->
            <div class="grid md:grid-cols-3 gap-6 mb-8">
              @for (feature of coreModule().features; track feature.title) {
              <div
                class="bg-black/30 rounded-lg p-6 hover:bg-black/40 transition-all"
              >
                <div class="text-4xl mb-3">{{ feature.icon }}</div>
                <div class="font-bold text-white text-lg mb-2">
                  {{ feature.title }}
                </div>
                <div class="text-sm text-white/60">
                  {{ feature.description }}
                </div>
              </div>
              }
            </div>

            <!-- Ecosystem Integration Diagram -->
            <div class="bg-black/40 rounded-lg p-8">
              <div class="text-sm text-white/60 mb-4 font-semibold">
                Powers 12 Modules
              </div>
              <div class="flex flex-wrap justify-center gap-3">
                @for (module of coreModule().powersModules; track module) {
                <span
                  class="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full text-sm border border-purple-400/30"
                >
                  {{ module }}
                </span>
                }
              </div>
            </div>

            <a
              [routerLink]="['/library', 'langgraph-core']"
              class="inline-block mt-8 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold text-lg text-white hover:scale-105 transition-transform cursor-pointer"
            >
              View Core Documentation →
            </a>
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
export class CoreFoundationSectionComponent {
  // Core module data with comprehensive business value
  readonly coreModule = signal<CoreModule>({
    icon: '⚡',
    title: 'LangGraph Core',
    subtitle: 'Type-Safe Workflow Foundation',
    description:
      'Foundation types and interfaces for building production-grade AI workflows with full type safety and zero runtime overhead',
    color: 'purple',
    features: [
      {
        icon: '🎯',
        title: 'WorkflowState',
        description: 'Comprehensive state interface with intelligent reducers',
      },
      {
        icon: '🔗',
        title: 'Command Patterns',
        description: 'Control flow routing (goto, update, end, retry)',
      },
      {
        icon: '🔌',
        title: 'Adapter Interfaces',
        description: 'Pluggable integrations (Memory, Checkpoint, Streaming)',
      },
    ],
    powersModules: [
      'workflow-engine',
      'memory',
      'multi-agent',
      'streaming',
      'functional-api',
      'hitl',
      'checkpoint',
      'monitoring',
      'time-travel',
      'platform',
      '+ 2 more',
    ],
  });
}
