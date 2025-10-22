/**
 * ChromaDB Section Component (FULL-WIDTH SECTION - LAYOUT-CORRECTION.md)
 *
 * Individual full-width showcase for ChromaDB library.
 * Following LAYOUT-CORRECTION.md: Each library gets its own py-32 section.
 *
 * Design System: Light theme with white background
 * - Background: #FFFFFF (white)
 * - Padding: py-32 (128px vertical)
 * - Text: Deep gray (#23272F headlines, #71717A body)
 * - Shadow: Soft (0 4px 32px rgba(0,0,0,0.04))
 *
 * Visual Specification: visual-design-specification.md:450-480
 * Component Spec: design-handoff.md:100-153
 * Library Data: library-analysis.md:13-55
 */

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  SectionContainerComponent,
  LibraryShowcaseCardComponent,
  CodeSnippetComponent,
  DecorativePatternComponent,
} from '../../../shared/components';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';

@Component({
  selector: 'app-chromadb-section',
  standalone: true,
  imports: [
    CommonModule,
    SectionContainerComponent,
    LibraryShowcaseCardComponent,
    CodeSnippetComponent,
    DecorativePatternComponent,
    ScrollAnimationDirective,
  ],
  template: `
    <!-- CRITICAL: SectionContainer enforces white background -->
    <app-section-container background="white">
      <!-- Floating Decorative Patterns (code-based SVG) -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <!-- Top-left: Vector arrows pattern (large, ChromaDB themed) -->
        <div
          class="absolute -top-20 -left-20 w-96 h-96 text-indigo-600 opacity-12"
          scrollAnimation
          [scrollConfig]="{ animation: 'fadeInUp', start: 'top 80%', duration: 1.5, delay: 0.2 }">
          <app-decorative-pattern pattern="vector-arrows" />
        </div>

        <!-- Top-right: Gradient blob (medium, organic) -->
        <div
          class="absolute -top-10 -right-10 w-80 h-80 text-indigo-600 opacity-8"
          scrollAnimation
          [scrollConfig]="{ animation: 'fadeInDown', start: 'top 80%', duration: 1.6, delay: 0.4 }">
          <app-decorative-pattern pattern="gradient-blob" />
        </div>

        <!-- Bottom-left: Circuit board pattern (large, technical) -->
        <div
          class="absolute -bottom-20 -left-20 w-96 h-96 text-indigo-600 opacity-5"
          scrollAnimation
          [scrollConfig]="{ animation: 'fadeInLeft', start: 'top 60%', duration: 1.8, delay: 0.6 }">
          <app-decorative-pattern pattern="circuit-board" />
        </div>

        <!-- Bottom-right: Hexagon grid (medium, geometric) -->
        <div
          class="absolute -bottom-10 -right-10 w-80 h-80 text-indigo-600 opacity-10"
          scrollAnimation
          [scrollConfig]="{ animation: 'fadeInRight', start: 'top 60%', duration: 1.5, delay: 0.5 }">
          <app-decorative-pattern pattern="hexagon-grid" />
        </div>
      </div>

      <!-- Section Header (py-32 applied by SectionContainer) -->
      <div
        class="text-center mb-16 relative z-10"
        scrollAnimation
        [scrollConfig]="{ animation: 'fadeIn', start: 'top 75%', duration: 1.0 }">
        <!-- Large Icon Hero -->
        <div class="flex justify-center mb-8">
          <div
            class="w-32 h-32 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-3xl p-8 shadow-lg"
            scrollAnimation
            [scrollConfig]="{ animation: 'scaleIn', start: 'top 75%', duration: 0.8, delay: 0.2 }">
            <img src="/assets/icons/libraries/icon-chromadb.svg" alt="ChromaDB" class="w-full h-full" />
          </div>
        </div>

        <div class="text-sm font-mono text-gray-500 mb-2 uppercase tracking-wider">
          Vector Database Layer
        </div>
        <h2 class="text-6xl font-bold text-gray-900 mb-4 leading-tight">
          ChromaDB
        </h2>
        <p class="text-2xl text-gray-500 leading-relaxed max-w-3xl mx-auto">
          Vector Storage for AI Applications
        </p>
      </div>

      <!-- Library Showcase Card -->
      <div
        class="max-w-5xl mx-auto mb-12 relative z-10"
        scrollAnimation
        [scrollConfig]="{ animation: 'fadeInUp', start: 'top 70%', duration: 1.0, delay: 0.3 }">
        <app-library-showcase-card
          icon="/assets/icons/libraries/icon-chromadb.svg"
          packageName="@hive-academy/nestjs-chromadb"
          title="Build RAG Applications in Minutes"
          description="TypeORM-style repository pattern for semantic search with 70% less boilerplate code. Enterprise-grade vector storage with multi-provider embeddings and intelligent caching."
          [capabilities]="chromadbCapabilities()"
          [metric]="{ value: '70%', label: 'Less Code vs Manual Operations' }"
          ctaText="Explore ChromaDB"
        />
      </div>

      <!-- Code Example -->
      <div
        class="max-w-4xl mx-auto relative z-10"
        scrollAnimation
        [scrollConfig]="{ animation: 'fadeInUp', start: 'top 65%', duration: 1.0, delay: 0.4 }">
        <h3 class="text-2xl font-bold text-gray-900 mb-4">Quick Start Example</h3>
        <app-code-snippet
          [code]="quickStartCode()"
          language="typescript"
          [showLineNumbers]="true"
          maxHeight="400px"
        />
      </div>

      <!-- Integration Note -->
      <div
        class="mt-12 max-w-3xl mx-auto text-center relative z-10"
        scrollAnimation
        [scrollConfig]="{ animation: 'fadeIn', start: 'top 60%', duration: 1.0, delay: 0.5 }">
        <p class="text-lg text-gray-600">
          <span class="font-semibold text-gray-900">Powers LangGraph Memory Module</span>
          — Provides vector storage backend for semantic memory and automatic context retrieval
        </p>
      </div>
    </app-section-container>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
    }
  `]
})
export class ChromadbSectionComponent {
  readonly chromadbCapabilities = signal<string[]>([
    'TypeORM-Style Repositories — 15+ auto-generated CRUD methods',
    'Multi-Provider Embeddings — OpenAI, HuggingFace, Cohere, Custom',
    'Enterprise Multi-Tenancy — GDPR/HIPAA/SOC2 compliance',
    'Smart Document Chunking — Recursive, token, semantic strategies',
    'Intelligent Caching — Vector-aware cache with collection invalidation',
    'Sub-100ms Vector Search — Fast semantic search for 10K+ documents',
  ]);

  readonly quickStartCode = signal<string>(`// RAG Pipeline in 3 Lines
const context = await chromaRepo.search(userQuery, { limit: 5 });
const aiResponse = await llm.invoke({ context, query: userQuery });
await chromaRepo.create({ content: aiResponse, metadata: { query } });`);
}
