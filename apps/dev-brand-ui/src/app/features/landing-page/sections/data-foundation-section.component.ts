/**
 * Data Foundation Section Component (Light Design)
 *
 * Showcases the dual-database architecture with clean white design:
 * - ChromaDB (vector database) for semantic search and RAG
 * - Neo4j (graph database) for knowledge graphs and relationships
 *
 * Design System: Light theme with business value first approach
 * - White background with soft shadows
 * - 2-column responsive grid
 * - Deep gray text for WCAG 2.1 AA compliance
 */

import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { SectionContainerComponent } from '../../../shared/components/section-container.component';
import {
  LibraryShowcaseGridComponent,
  type LibraryCard,
} from '../../../shared/components/library-showcase-grid.component';

@Component({
  selector: 'app-data-foundation-section',
  standalone: true,
  imports: [
    CommonModule,
    SectionContainerComponent,
    LibraryShowcaseGridComponent,
  ],
  template: `
    <app-section-container
      title="Data Foundation Layer"
      subtitle="Vector search + graph relationships for AI applications"
      background="white"
    >
      <app-library-showcase-grid [libraries]="libraries()" [columns]="2" />
    </app-section-container>
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
  readonly libraries = signal<LibraryCard[]>([
    {
      icon: '🔍',
      packageName: '@hive-academy/nestjs-chromadb',
      businessValue: 'Build RAG applications in minutes',
      description:
        'TypeORM-style repository pattern for semantic search with automatic embedding generation. Enterprise multi-tenancy with GDPR/HIPAA/SOC2 compliance.',
      capabilities: [
        'Multi-provider embeddings (OpenAI, HuggingFace, Cohere)',
        'Enterprise multi-tenancy with complete data isolation',
        'Intelligent caching with collection invalidation',
        'Smart document chunking (recursive, token, semantic)',
      ],
      metric: {
        value: '70% Less Code',
        label: 'vs. manual vector operations',
      },
      ctaText: 'Explore ChromaDB',
      slug: 'chromadb',
    },
    {
      icon: '🌐',
      packageName: '@hive-academy/nestjs-neo4j',
      businessValue: 'Revolutionary 7-decorator Entity CRUD',
      description:
        'Auto-generated repositories with graph algorithms and multi-tenancy. Model complex relationships for AI decision-making with database-per-tenant isolation.',
      capabilities: [
        'Auto-generated CRUD with 7 decorators (FindOne, CreateEntity, etc.)',
        'Graph algorithms (centrality, community detection, path finding)',
        'Enterprise security with 5-decorator layer',
        'Type-safe query builder with fluent API',
      ],
      metric: {
        value: '90% Less Code',
        label: 'vs. manual Cypher queries',
      },
      ctaText: 'Explore Neo4j',
      slug: 'neo4j',
    },
  ]);
}
