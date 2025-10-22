import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Scene3DComponent } from '../../../core/angular-3d/components/scene-3d.component';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';
import { ScrollingCodeTimelineComponent, TimelineStep } from '../../../shared/components/scrolling-code-timeline.component';
import { ChromadbSceneGraphComponent } from './chromadb-scene-graph.component';

/**
 * ChromaDB Section - Vector Database for Semantic Search
 *
 * Showcases:
 * - TypeORM-style repository pattern
 * - Real codebase examples from libs/nestjs-chromadb/*
 * - Progressive code revelation timeline
 * - Floating 3D particle decorations
 * - Asymmetric scroll animations
 *
 * Design Pattern:
 * - Hero intro with floating metrics
 * - Scrolling code timeline (Install → Configure → Use → Integrate)
 * - 3D particle effects for visual depth
 * - Real code extracted from actual library implementation
 *
 * Data Sources:
 * - task-tracking/TASK_2025_017/library-analysis.md (business value)
 * - libs/nestjs-chromadb/CLAUDE.md (real code examples)
 * - libs/nestjs-chromadb/src/lib/* (actual implementation)
 */
@Component({
  selector: 'app-chromadb-section',
  standalone: true,
  imports: [
    CommonModule,
    ScrollingCodeTimelineComponent,
    Scene3DComponent,
    ScrollAnimationDirective,
  ],
  template: `
    <div class="relative w-full bg-white" style="min-height: 100vh;">
      <!-- 3D Background Scene (subtle particles + spheres) -->
      <app-scene-3d
        class="absolute inset-0 opacity-40 z-0"
        [sceneGraph]="chromadbSceneGraph"
        style="pointer-events: none;"
      />

      <!-- Content Container -->
      <div class="container mx-auto px-8 py-20">
        <!-- Section Hero -->
        <div class="relative z-10 text-center mb-24">
        <!-- Layer Badge -->
        <div
          class="inline-block"
          scrollAnimation
          [scrollConfig]="{
            animation: 'custom',
            start: 'top 80%',
            end: 'top 40%',
            scrub: 0.8,
            from: { opacity: 0, scale: 0.8 },
            to: { opacity: 1, scale: 1 }
          }"
        >
          <span class="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-full text-sm font-semibold text-indigo-700 mb-6">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
              <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
              <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
            </svg>
            DATA FOUNDATION LAYER
          </span>
        </div>

        <!-- Main Headline -->
        <h2
          class="text-7xl font-bold text-gray-900 mb-6 leading-tight"
          scrollAnimation
          [scrollConfig]="{
            animation: 'custom',
            start: 'top 75%',
            end: 'top 35%',
            scrub: 1,
            from: { opacity: 0, y: 50 },
            to: { opacity: 1, y: 0 }
          }"
        >
          ChromaDB
        </h2>

        <!-- Subtitle -->
        <p
          class="text-2xl text-gray-500 leading-relaxed max-w-3xl mx-auto"
          scrollAnimation
          [scrollConfig]="{
            animation: 'custom',
            start: 'top 70%',
            end: 'top 30%',
            scrub: 1,
            from: { opacity: 0, y: 30 },
            to: { opacity: 1, y: 0 }
          }"
        >
          Vector database for semantic search and RAG applications.
          <span class="block mt-2 text-indigo-600 font-semibold">
            Build production-ready AI features in minutes, not weeks.
          </span>
        </p>

        <!-- Floating Metrics -->
        <div
          class="flex justify-center gap-12 mt-12"
          scrollAnimation
          [scrollConfig]="{
            animation: 'custom',
            start: 'top 65%',
            end: 'top 25%',
            scrub: 0.8,
            from: { opacity: 0, y: 40 },
            to: { opacity: 1, y: 0 }
          }"
        >
          <div class="text-center">
            <div class="text-4xl font-bold text-indigo-600 mb-2">Sub-100ms</div>
            <div class="text-sm text-gray-500 uppercase tracking-wide">Vector Search</div>
          </div>
          <div class="text-center">
            <div class="text-4xl font-bold text-purple-600 mb-2">70%</div>
            <div class="text-sm text-gray-500 uppercase tracking-wide">Less Boilerplate</div>
          </div>
          <div class="text-center">
            <div class="text-4xl font-bold text-pink-600 mb-2">10K+</div>
            <div class="text-sm text-gray-500 uppercase tracking-wide">Documents/sec</div>
          </div>
        </div>
      </div>

      <!-- Progressive Code Timeline -->
      <div class="relative z-10 mt-32">
        <app-scrolling-code-timeline [timelineData]="codeTimeline()" />
      </div>

      <!-- Integration Ecosystem -->
      <div
        class="relative z-10 mt-32 max-w-5xl mx-auto"
        scrollAnimation
        [scrollConfig]="{
          animation: 'custom',
          start: 'top 75%',
          end: 'top 25%',
          scrub: 1,
          from: { opacity: 0, y: 60 },
          to: { opacity: 1, y: 0 }
        }"
      >
        <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-12 border border-indigo-100">
          <h3 class="text-3xl font-bold text-gray-900 mb-6 text-center">
            LangGraph Ecosystem Integration
          </h3>
          <div class="grid grid-cols-3 gap-6">
            @for (integration of integrations(); track integration.name) {
              <div class="bg-white rounded-2xl p-6 border border-indigo-100 hover:shadow-lg transition-shadow duration-300">
                <div class="text-4xl mb-4">{{ integration.icon }}</div>
                <h4 class="text-lg font-bold text-gray-900 mb-2">{{ integration.name }}</h4>
                <p class="text-sm text-gray-500">{{ integration.description }}</p>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Call to Action -->
      <div
        class="relative z-10 text-center mt-24"
        scrollAnimation
        [scrollConfig]="{
          animation: 'custom',
          start: 'top 80%',
          end: 'top 40%',
          scrub: 0.8,
          from: { opacity: 0, scale: 0.95 },
          to: { opacity: 1, scale: 1 }
        }"
      >
        <a
          href="#neo4j"
          class="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
        >
          Explore Graph Database
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
      </div>
    </div>
  `,
  styles: [],
})
export class ChromadbSectionComponent {
  /**
   * Progressive code revelation timeline
   * Real code extracted from libs/nestjs-chromadb/*
   */
  readonly codeTimeline = signal<TimelineStep[]>([
    {
      id: 'install',
      step: 1,
      title: 'Installation & Setup',
      description: 'Get started with ChromaDB in your NestJS application. Zero configuration required for local development.',
      code: `// Install the package
npm install @hive-academy/nestjs-chromadb

// Import and configure
import { Module } from '@nestjs/common';
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';

@Module({
  imports: [
    ChromaDBModule.forRoot({
      connection: {
        host: 'localhost',
        port: 8000,
        ssl: false,
      },
      embedding: {
        provider: 'openai',
        config: {
          apiKey: process.env.OPENAI_API_KEY,
          model: 'text-embedding-3-small',
        },
      },
    }),
  ],
})
export class AppModule {}`,
      language: 'typescript',
      layout: 'left',
      notes: [
        'Supports OpenAI, HuggingFace, Cohere embedding providers',
        'SSL and multi-tenant configurations available',
        'Automatic health checks and connection pooling',
      ],
    },
    {
      id: 'entity',
      step: 2,
      title: 'Define Your Entity',
      description: 'Create type-safe entities with decorators. Automatic embedding generation and metadata handling.',
      code: `import {
  BaseChromaEntity,
  ChromaEntity,
  ChromaId,
  ChromaProp,
} from '@hive-academy/nestjs-chromadb';

interface KnowledgeMetadata {
  title: string;
  category: string;
  tags: string[];
  author: string;
  publishedDate: string;
}

@ChromaEntity({
  collection: 'knowledge',
  autoEmbed: true,           // Auto-generate embeddings
  autoTimestamp: true,        // Auto-manage createdAt/updatedAt
  autoGenerateIds: true,      // Auto-generate UUIDs
})
export class KnowledgeDocument extends BaseChromaEntity<KnowledgeMetadata> {
  @ChromaId()
  id!: string;

  @ChromaProp()
  content!: string;           // Document content for embedding

  metadata!: KnowledgeMetadata;
  embedding?: readonly number[];
}`,
      language: 'typescript',
      layout: 'right',
      notes: [
        'TypeORM-style decorators for familiar DX',
        'Automatic JSON serialization for complex types',
        'Smart defaults for timestamps and IDs',
      ],
    },
    {
      id: 'repository',
      step: 3,
      title: 'TypeORM-Style Repository',
      description: 'Inherit 15+ CRUD methods automatically. Add custom business logic as needed. Zero boilerplate.',
      code: `import { Injectable } from '@nestjs/common';
import {
  ChromaDBRepository,
  ChromaDBService,
} from '@hive-academy/nestjs-chromadb';

@Injectable()
export class KnowledgeRepository extends ChromaDBRepository<KnowledgeDocument> {
  constructor(chromaDB: ChromaDBService) {
    super(KnowledgeDocument, 'knowledge', chromaDB);
  }

  // ✅ All CRUD methods inherited:
  // - findById, findByIds, findAll, count, exists
  // - create, createMany, update, updateMany
  // - upsert, upsertMany, delete, deleteMany
  // - search, searchWithScores, searchSimilar

  // Add custom business methods
  async findByCategory(category: string): Promise<KnowledgeDocument[]> {
    const all = await this.findAll({ limit: 1000 });
    return all.filter(doc => doc.metadata.category === category);
  }

  async searchByTags(tags: string[]): Promise<KnowledgeDocument[]> {
    const query = tags.join(' ');
    return this.search(query, { limit: 20 });
  }
}`,
      language: 'typescript',
      layout: 'left',
      notes: [
        '90% less code vs manual implementation',
        'Full type safety with generic constraints',
        'Composition pattern with ChromaDBService',
      ],
    },
    {
      id: 'usage',
      step: 4,
      title: 'RAG in 3 Lines',
      description: 'Build production-ready RAG applications with minimal code. Semantic search, caching, and monitoring included.',
      code: `@Injectable()
export class RAGService {
  constructor(
    private readonly knowledgeRepo: KnowledgeRepository
  ) {}

  async generateAnswer(userQuery: string): Promise<string> {
    // 1. Semantic search for relevant context
    const context = await this.knowledgeRepo.search(userQuery, {
      limit: 5,                                    // Top 5 results
      where: { category: 'technical' },            // Filter by category
    });

    // 2. Build RAG context from results
    const ragContext = context
      .map(doc => \`\${doc.metadata.title}\\n\${doc.content}\`)
      .join('\\n\\n');

    // 3. Send to LLM with context
    const answer = await this.llm.invoke({
      context: ragContext,
      query: userQuery,
    });

    return answer;
  }

  // Hybrid search: Vector + metadata filtering
  async advancedSearch(
    query: string,
    filters: { category?: string; tags?: string[] }
  ) {
    const results = await this.knowledgeRepo.searchWithScores(query, {
      limit: 10,
      where: {
        category: filters.category,
        // ChromaDB filters work on metadata fields
      },
    });

    // Post-filter by tags (application layer)
    return results.filter(r =>
      filters.tags?.some(tag => r.document.metadata.tags.includes(tag))
    );
  }
}`,
      language: 'typescript',
      layout: 'center',
      notes: [
        'Sub-100ms vector search for 10K+ documents',
        'Built-in caching and retry mechanisms',
        'Comprehensive error handling',
        'Production-ready performance monitoring',
      ],
    },
  ]);

  /**
   * LangGraph ecosystem integrations
   */
  readonly integrations = signal([
    {
      icon: '🧠',
      name: 'Memory Module',
      description: 'Long-term contextual memory for AI agents powered by vector search',
    },
    {
      icon: '🔄',
      name: 'Workflow Engine',
      description: 'State persistence and retrieval for complex agent workflows',
    },
    {
      icon: '📊',
      name: 'Monitoring',
      description: 'Vector operation metrics and performance tracking',
    },
  ]);

  /**
   * Scene graph reference for 3D background
   */
  readonly chromadbSceneGraph = ChromadbSceneGraphComponent;
}
