/**
 * Workflow Orchestration Section Component (Light Design)
 *
 * Showcases the orchestration layer with 3 libraries:
 * - Workflow-Engine (central coordination hub)
 * - Streaming (real-time processing)
 * - Memory (hybrid vector + graph storage)
 *
 * Design System: Light theme with 3-column responsive grid
 * - White background with soft shadows
 * - 3-column grid (desktop), 2-column (tablet), 1-column (mobile)
 */

import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { SectionContainerComponent } from '../../../shared/components/section-container.component';
import {
  LibraryShowcaseGridComponent,
  type LibraryCard,
} from '../../../shared/components/library-showcase-grid.component';

@Component({
  selector: 'app-workflow-orchestration-section',
  standalone: true,
  imports: [
    CommonModule,
    SectionContainerComponent,
    LibraryShowcaseGridComponent,
  ],
  template: `
    <app-section-container
      title="Orchestration Layer"
      subtitle="Execute, stream, and remember - complete workflow coordination"
      background="white"
    >
      <app-library-showcase-grid [libraries]="libraries()" [columns]="3" />
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
export class WorkflowOrchestrationSectionComponent {
  readonly libraries = signal<LibraryCard[]>([
    {
      icon: '🎯',
      packageName: '@hive-academy/langgraph-workflow-engine',
      businessValue: 'Central Coordination Hub',
      description:
        'Single registration point for agents, tools, and workflows with embedded streaming services. No circular dependencies.',
      capabilities: [
        'CentralRegistryService for all agents, tools, workflows',
        'Embedded streaming (no circular dependencies)',
        'MetadataProcessorService for automatic decorator extraction',
        'Production caching with 5-minute compilation TTL',
      ],
      metric: {
        value: 'Coordinates',
        label: 'All 12 libraries',
      },
      ctaText: 'Explore Workflow-Engine',
      slug: 'workflow-engine',
    },
    {
      icon: '⚡',
      packageName: '@hive-academy/langgraph-streaming',
      businessValue: 'Build ChatGPT-like Streaming',
      description:
        'Real-time token streaming with WebSocket and Server-Sent Events support. Individual token processing with decorators.',
      capabilities: [
        'Token-level streaming with @StreamToken decorator',
        'WebSocket support for bidirectional communication',
        'Server-Sent Events (SSE) for HTTP streaming',
        'Multi-level streaming (node, workflow, token)',
      ],
      metric: {
        value: 'Real-Time',
        label: 'Streaming feedback',
      },
      ctaText: 'Explore Streaming',
      slug: 'streaming',
    },
    {
      icon: '🧠',
      packageName: '@hive-academy/langgraph-memory',
      businessValue: 'Hybrid Vector + Graph Memory',
      description:
        'Intelligent memory system combining ChromaDB (vector) and Neo4j (graph) storage. Automatic memory context for agents.',
      capabilities: [
        'IMemoryAdapter pattern for standardized operations',
        'Hybrid storage: ChromaDB (vector) + Neo4j (graph)',
        'Semantic memory with automatic embedding generation',
        'Auto-enhances Multi-Agent, HITL, Workflow-Engine',
      ],
      metric: {
        value: 'Auto-Enhanced',
        label: 'Agent memory',
      },
      ctaText: 'Explore Memory',
      slug: 'memory',
    },
  ]);
}
