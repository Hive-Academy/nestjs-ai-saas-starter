import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ValuePropositionCardComponent } from '../components/value-proposition-card.component';
import type { ValueProposition } from '../interfaces';

/**
 * Value Propositions Section Component
 *
 * TASK_2025_026 - Task 7
 *
 * Container section for displaying value propositions.
 * Currently shows ChromaDB value proposition (first of 11 libraries).
 *
 * Design Specifications:
 * - Full-width individual spotlights (NOT card grids)
 * - 128px vertical spacing between value propositions (space-y-32)
 * - White background (bg-white)
 * - Reference: implementation-plan.md:344-387, design-handoff.md:804-862
 */
@Component({
  selector: 'app-value-propositions-section',
  standalone: true,
  imports: [CommonModule, ValuePropositionCardComponent],
  template: `
    <section class="py-20 md:py-32 px-8 md:px-16 bg-white">
      <div class="max-w-7xl mx-auto space-y-32">
        <!-- ChromaDB Value Proposition -->
        <app-value-proposition-card [valueProposition]="chromaDBProposition" />

        <!-- Additional value propositions will be added in future tasks -->
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
export class ValuePropositionsSectionComponent {
  /**
   * ChromaDB Value Proposition Data
   * Reference: design-handoff.md:844-861, implementation-plan.md:652-668
   */
  readonly chromaDBProposition: ValueProposition = {
    packageName: '@hive-academy/nestjs-chromadb',
    businessHeadline: 'Build RAG Applications in Minutes',
    painPoint:
      '50+ lines of manual ChromaDB client setup, embedding generation, error handling, retry logic, tenant isolation...',
    solution:
      'TypeORM-style repository pattern with automatic embeddings, tenant isolation, and caching via decorators',
    capabilities: [
      'Multi-provider embeddings (OpenAI, Cohere, local)',
      'Multi-tenant database-per-tenant isolation',
      'Intelligent caching with @Cached decorator',
      'Auto-chunking for large documents',
    ],
    metricValue: '90%',
    metricLabel: 'Less Code',
    // iconUrl: '[CANVA_CHROMADB_ICON_URL]', // Pending Canva asset generation
  };
}
