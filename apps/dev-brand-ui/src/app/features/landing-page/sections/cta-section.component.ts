import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Scene3dComponent } from '@hive-academy/angular-3d';
import { CTASceneGraphComponent } from './scene-graphs/cta-scene-graph.component';
import { ScrollAnimationDirective } from '../../../core/gsap-animations/scroll-animation.directive';

/**
 * CTA Section - Modern Conversion-Focused Design
 *
 * REDESIGNED: Clean, bold, minimal design
 *
 * Drives conversions to explore examples, read documentation, see production use case
 * Features 3D background accent at 40% opacity with 3 clean action cards
 *
 * Design Philosophy:
 * - No more EnhancedCard/GlassPill/Icon3D components
 * - Large gradient headline with strong value proposition
 * - Visual hierarchy: Primary (filled gradient) → Secondary (outline) → Tertiary (outline)
 * - Scroll-driven animations for all elements
 * - 3D background adds depth without distraction
 * - Clean emoji icons instead of 3D containers
 */
@Component({
  selector: 'app-cta-section',
  standalone: true,
  imports: [
    CommonModule,
    Scene3dComponent,
    CTASceneGraphComponent,
    ScrollAnimationDirective,
  ],
  template: `
    <section
      class="relative min-h-[700px] bg-gradient-to-b from-white via-gray-50 to-white py-20 md:py-32"
      aria-labelledby="cta-headline"
    >
      <!-- 3D Background Layer (40% opacity for more depth) -->
      <div class="absolute inset-0 z-0 opacity-40">
        <a3d-scene-3d>
          <app-cta-scene-graph />
        </a3d-scene-3d>
      </div>

      <!-- Content Layer -->
      <div class="relative z-10 max-w-6xl mx-auto px-8 md:px-16 text-center">
        <!-- Large Gradient Headline -->
        <h2
          id="cta-headline"
          class="text-4xl md:text-5xl font-bold bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-tertiary bg-clip-text text-transparent mb-6 leading-tight"
          scrollAnimation
          [scrollConfig]="{
            animation: 'fadeIn',
            start: 'top 80%',
            duration: 0.8,
            once: false
          }"
        >
          Start Building AI Workflows Today
        </h2>

        <p
          class="text-xl md:text-2xl text-text-secondary max-w-4xl mx-auto leading-relaxed mb-16"
          scrollAnimation
          [scrollConfig]="{
            animation: 'slideUp',
            start: 'top 75%',
            duration: 0.8,
            delay: 0.2,
            once: false
          }"
        >
          Explore complete examples, dive into comprehensive docs, or see a real
          production use case
        </p>

        <!-- CTA Grid with 3 Cards - Visual Hierarchy -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <!-- Card 1: Explore Examples (PRIMARY - Filled Gradient) -->
          <div
            class="bg-gradient-to-br from-accent-primary via-accent-secondary to-accent-tertiary p-8 rounded-2xl shadow-card-elevated hover:shadow-card-glow-indigo hover:scale-105 transition-all duration-300 text-white"
            scrollAnimation
            [scrollConfig]="{
              animation: 'slideUp',
              start: 'top 80%',
              duration: 0.6,
              once: false
            }"
          >
            <div class="text-5xl mb-4">📚</div>
            <div class="flex items-center justify-center gap-2 mb-3">
              <h3 class="text-2xl font-bold">Explore Examples</h3>
              <span
                class="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full border border-white/30"
              >
                Popular
              </span>
            </div>
            <p class="text-base mb-6 text-white/90">
              See 3 complete workflows: RAG pipeline, multi-agent coordination,
              production API
            </p>
            <button
              class="w-full px-6 py-3 bg-white text-accent-primary font-bold rounded-xl hover:bg-gray-100 hover:scale-105 transition-all duration-300 shadow-lg"
            >
              View Examples →
            </button>
          </div>

          <!-- Card 2: Read Documentation (SECONDARY - Outline) -->
          <div
            class="bg-white rounded-2xl border-2 border-gray-200 shadow-card p-8 hover:shadow-card-elevated hover:border-accent-secondary hover:scale-105 transition-all duration-300"
            scrollAnimation
            [scrollConfig]="{
              animation: 'slideUp',
              start: 'top 80%',
              duration: 0.6,
              delay: 0.1,
              once: false
            }"
          >
            <div class="text-5xl mb-4">📖</div>
            <h3 class="text-2xl font-bold text-text-headline mb-3">
              Read Documentation
            </h3>
            <p class="text-base text-text-secondary mb-6">
              17+ comprehensive CLAUDE.md files with real integration examples
            </p>
            <button
              class="w-full px-6 py-3 bg-white text-accent-secondary font-bold rounded-xl border-2 border-accent-secondary hover:bg-accent-secondary hover:text-white transition-all duration-300"
            >
              Read Docs →
            </button>
          </div>

          <!-- Card 3: See Production Use Case (TERTIARY - Outline) -->
          <div
            class="bg-white rounded-2xl border-2 border-gray-200 shadow-card p-8 hover:shadow-card-elevated hover:border-accent-tertiary hover:scale-105 transition-all duration-300"
            scrollAnimation
            [scrollConfig]="{
              animation: 'slideUp',
              start: 'top 80%',
              duration: 0.6,
              delay: 0.2,
              once: false
            }"
          >
            <div class="text-5xl mb-4">🚀</div>
            <h3 class="text-2xl font-bold text-text-headline mb-3">
              Production Use Case
            </h3>
            <p class="text-base text-text-secondary mb-6">
              DevBrand API: All 13 libraries orchestrated in a real application
            </p>
            <button
              class="w-full px-6 py-3 bg-white text-accent-tertiary font-bold rounded-xl border-2 border-accent-tertiary hover:bg-accent-tertiary hover:text-white transition-all duration-300"
            >
              View Source Code →
            </button>
          </div>
        </div>

        <!-- Trust Badge / Social Proof -->
        <div
          class="mt-16 flex flex-wrap items-center justify-center gap-8 text-text-secondary"
          scrollAnimation
          [scrollConfig]="{
            animation: 'fadeIn',
            start: 'top 80%',
            duration: 0.8,
            delay: 0.4,
            once: false
          }"
        >
          <div class="flex items-center gap-2">
            <span class="text-accent-success text-2xl">✓</span>
            <span class="text-sm font-semibold">Zero Config Setup</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-accent-success text-2xl">✓</span>
            <span class="text-sm font-semibold">Production-Ready Patterns</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-accent-success text-2xl">✓</span>
            <span class="text-sm font-semibold">13 Integrated Libraries</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-accent-success text-2xl">✓</span>
            <span class="text-sm font-semibold"
              >Open Source & MIT Licensed</span
            >
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [],
})
export class CTASectionComponent {
  // Scene graph reference for 3D background accent
  readonly ctaSceneGraph = CTASceneGraphComponent;
}
