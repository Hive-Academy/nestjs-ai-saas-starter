import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Scene3DComponent } from '../../../core/angular-3d/components/scene-3d.component';
import { CTASceneGraphComponent } from './scene-graphs/cta-scene-graph.component';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';
import { EnhancedCardComponent } from '../components/enhanced-card.component';
import { GlassPillComponent } from '../components/glass-pill.component';
import { Icon3DContainerComponent } from '../components/icon-3d-container.component';

/**
 * CTA Section - Enhanced Visual Design
 * Drives conversions to explore examples, read documentation, see production use case
 * Features 3D background accent at 30% opacity with 3 enhanced action cards
 */
@Component({
  selector: 'app-cta-section',
  standalone: true,
  imports: [
    CommonModule,
    Scene3DComponent,
    ScrollAnimationDirective,
    EnhancedCardComponent,
    GlassPillComponent,
    Icon3DContainerComponent,
  ],
  template: `
    <section
      class="relative min-h-[600px] bg-white py-20 md:py-32 px-6 md:px-16"
    >
      <!-- 3D Background Layer (30% opacity) -->
      <div class="absolute inset-0 z-0 opacity-30">
        <app-scene-3d [sceneGraph]="ctaSceneGraph" />
      </div>

      <!-- Content Layer -->
      <div class="relative z-10 max-w-4xl mx-auto text-center">
        <h2
          class="text-4xl md:text-6xl font-bold text-headline leading-tight mb-8"
          scrollAnimation
          [scrollConfig]="{
            animation: 'fadeIn',
            start: 'top 75%',
            duration: 1.0,
            ease: 'power3.out',
            once: true
          }"
        >
          Ready to Build Production-Grade AI Apps?
        </h2>

        <p
          class="text-lg md:text-xl text-secondary leading-relaxed mb-12"
          scrollAnimation
          [scrollConfig]="{
            animation: 'fadeIn',
            start: 'top 70%',
            duration: 0.8,
            once: true
          }"
        >
          Explore complete workflow examples, read comprehensive documentation,
          or see the DevBrand API production use case.
        </p>

        <!-- CTA Grid with 3 Cards -->
        <div
          class="grid grid-cols-1 md:grid-cols-3 gap-8"
          scrollAnimation
          [scrollConfig]="{
            animation: 'slideUp',
            start: 'top 80%',
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.15,
            once: true
          }"
        >
          <!-- Card 1: Explore Examples (Primary CTA) -->
          <app-enhanced-card
            [variant]="'solid'"
            [padding]="'md'"
            [hoverable]="true"
            class="border border-gray-100"
          >
            <app-icon-3d-container
              [size]="'md'"
              [animation]="'float'"
              class="mb-4 inline-block"
            >
              <div class="w-full h-full rounded-full bg-gradient-to-br from-accent-electric to-accent-primary flex items-center justify-center text-white text-2xl">
                📚
              </div>
            </app-icon-3d-container>
            <div class="flex justify-center gap-2 mb-3">
              <h3 class="text-xl font-bold text-headline">
                Explore Examples
              </h3>
              <app-glass-pill [label]="'Popular'" [color]="'electric'" [size]="'sm'"></app-glass-pill>
            </div>
            <p class="text-sm text-secondary mb-6">
              See 3 complete workflows: RAG, multi-agent, document processing
            </p>
            <button
              class="w-full px-6 py-3 bg-gradient-to-r from-accent-electric to-accent-primary text-white font-semibold rounded-button hover:scale-105 hover:shadow-lg transition-all duration-300"
            >
              View Examples
            </button>
          </app-enhanced-card>

          <!-- Card 2: Read Documentation (Secondary CTA) -->
          <div
            class="bg-white rounded-card shadow-card p-8 hover:shadow-card-hover hover:scale-105 transition-all duration-300 border border-gray-100"
          >
            <div class="text-4xl mb-4">📖</div>
            <h3 class="text-xl font-bold text-headline mb-3">
              Read Documentation
            </h3>
            <p class="text-sm text-secondary mb-6">
              17+ comprehensive CLAUDE.md files with real code examples
            </p>
            <button
              class="w-full px-6 py-3 bg-white text-accent-primary font-semibold rounded-button border-2 border-accent-primary hover:bg-accent-primary hover:text-white transition-all duration-300"
            >
              Read Docs
            </button>
          </div>

          <!-- Card 3: See Production Use Case (Tertiary CTA) -->
          <div
            class="bg-white rounded-card shadow-card p-8 hover:shadow-card-hover hover:scale-105 transition-all duration-300 border border-gray-100"
          >
            <div class="text-4xl mb-4">🚀</div>
            <h3 class="text-xl font-bold text-headline mb-3">
              See Production Use Case
            </h3>
            <p class="text-sm text-secondary mb-6">
              DevBrand API: All 13 libraries working together
            </p>
            <button
              class="w-full px-6 py-3 bg-white text-accent-primary font-semibold rounded-button border-2 border-accent-primary hover:bg-accent-primary hover:text-white transition-all duration-300"
            >
              View Source Code
            </button>
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
