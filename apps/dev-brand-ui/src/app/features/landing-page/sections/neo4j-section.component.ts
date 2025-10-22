/**
 * Neo4j Section Component (FULL-WIDTH SECTION - LAYOUT-CORRECTION.md)
 *
 * Individual full-width showcase for Neo4j library.
 * Following enhanced pattern from ChromaDB section.
 *
 * Design System: Light theme with light gray background
 * - Background: #F9FAFB (light gray)
 * - Padding: py-32 (128px vertical)
 * - Text: Deep gray (#23272F headlines, #71717A body)
 * - Decorative Pattern: network-nodes (graph database theme)
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
  selector: 'app-neo4j-section',
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
    <!-- CRITICAL: SectionContainer enforces light gray background (alternates with white) -->
    <app-section-container background="gray">
      <!-- Floating Decorative Patterns (network/graph theme) -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <!-- Top-left: Network nodes pattern (large, Neo4j themed) -->
        <div
          class="absolute -top-20 -left-20 w-96 h-96 text-blue-600 opacity-12"
          scrollAnimation
          [scrollConfig]="{ animation: 'fadeInUp', start: 'top 80%', duration: 1.5, delay: 0.2 }">
          <app-decorative-pattern pattern="network-nodes" />
        </div>

        <!-- Top-right: Gradient blob (medium, organic) -->
        <div
          class="absolute -top-10 -right-10 w-80 h-80 text-blue-600 opacity-8"
          scrollAnimation
          [scrollConfig]="{ animation: 'fadeInDown', start: 'top 80%', duration: 1.6, delay: 0.4 }">
          <app-decorative-pattern pattern="gradient-blob" />
        </div>

        <!-- Bottom-left: Network nodes (large, interconnected) -->
        <div
          class="absolute -bottom-20 -left-20 w-96 h-96 text-blue-600 opacity-6"
          scrollAnimation
          [scrollConfig]="{ animation: 'fadeInLeft', start: 'top 60%', duration: 1.8, delay: 0.6 }">
          <app-decorative-pattern pattern="network-nodes" />
        </div>

        <!-- Bottom-right: Hexagon grid (medium, geometric) -->
        <div
          class="absolute -bottom-10 -right-10 w-80 h-80 text-blue-600 opacity-10"
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
            class="w-32 h-32 bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8 shadow-lg"
            scrollAnimation
            [scrollConfig]="{ animation: 'scaleIn', start: 'top 75%', duration: 0.8, delay: 0.2 }">
            <img src="/assets/icons/libraries/icon-neo4j.svg" alt="Neo4j" class="w-full h-full" />
          </div>
        </div>

        <div class="text-sm font-mono text-gray-500 mb-2 uppercase tracking-wider">
          Graph Database Layer
        </div>
        <h2 class="text-6xl font-bold text-gray-900 mb-4 leading-tight">
          Neo4j
        </h2>
        <p class="text-2xl text-gray-500 leading-relaxed max-w-3xl mx-auto">
          Relationship-First Data Modeling
        </p>
      </div>

      <!-- Library Showcase Card -->
      <div
        class="max-w-5xl mx-auto mb-12 relative z-10"
        scrollAnimation
        [scrollConfig]="{ animation: 'fadeInUp', start: 'top 70%', duration: 1.0, delay: 0.3 }">
        <app-library-showcase-card
          icon="/assets/icons/libraries/icon-neo4j.svg"
          packageName="@hive-academy/nestjs-neo4j"
          title="Model Complex Relationships Naturally"
          description="Cypher query builder with TypeScript decorators for relationship-first data modeling. Traverse connections in milliseconds with enterprise-grade graph database capabilities."
          [capabilities]="neo4jCapabilities()"
          [metric]="{ value: '10x', label: 'Faster Relationship Queries' }"
          ctaText="Explore Neo4j"
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
          <span class="font-semibold text-gray-900">Powers LangGraph Memory & Time-Travel</span>
          — Stores conversation history as graph relationships for context-aware multi-turn interactions
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
export class Neo4jSectionComponent {
  readonly neo4jCapabilities = signal<string[]>([
    'Cypher Query Builder — Type-safe graph queries with decorator syntax',
    'Relationship Decorators — @Relationship, @Node, @Property for graph modeling',
    'Transaction Management — ACID transactions with automatic rollback',
    'Graph Traversal — Multi-hop relationship queries in sub-second time',
    'Schema Validation — Runtime validation of graph structure',
    'Connection Pooling — Enterprise connection management with health checks',
  ]);

  readonly quickStartCode = signal<string>(`// Define graph entities with decorators
@Node('User')
class User {
  @Property() name: string;
  @Relationship('FOLLOWS', 'User') follows: User[];
}

// Query relationships
const user = await neo4jRepo.findOne({
  where: { name: 'Alice' },
  relations: ['follows.follows'] // 2-hop traversal
});`);
}
