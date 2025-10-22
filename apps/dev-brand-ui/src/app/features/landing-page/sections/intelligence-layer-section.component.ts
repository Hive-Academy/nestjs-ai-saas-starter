/**
 * Intelligence Layer Section Component (Light Design)
 *
 * Showcases the agent systems layer with 3 libraries:
 * - Multi-Agent (collaborative AI teams)
 * - HITL (human-in-the-loop approval)
 * - Functional-API (decorator-driven workflows)
 *
 * Design System: Light theme with 3-column responsive grid
 * - Light gray background for visual separation
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
  selector: 'app-intelligence-layer-section',
  standalone: true,
  imports: [
    CommonModule,
    SectionContainerComponent,
    LibraryShowcaseGridComponent,
  ],
  template: `
    <app-section-container
      title="Agent Systems"
      subtitle="Collaborative AI with human oversight and declarative workflows"
      background="light-gray"
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
export class IntelligenceLayerSectionComponent {
  readonly libraries = signal<LibraryCard[]>([
    {
      icon: '🤖',
      packageName: '@hive-academy/langgraph-multi-agent',
      businessValue: 'Build Collaborative AI Teams',
      description:
        'Enterprise multi-agent systems with automatic memory enhancement. Supervisor-worker patterns for complex tasks with tool execution.',
      capabilities: [
        '@Agent decorator for automatic registration',
        'NodeFactoryService for auto memory enhancement',
        'Multi-LLM support (OpenAI, Anthropic, Google, Cohere)',
        'Supervisor patterns for hierarchical coordination',
      ],
      metric: {
        value: 'Auto-Memory',
        label: 'Enhanced agents',
      },
      ctaText: 'Explore Multi-Agent',
      slug: 'multi-agent',
    },
    {
      icon: '👤',
      packageName: '@hive-academy/langgraph-hitl',
      businessValue: 'Human Approval with ML Learning',
      description:
        'Human-in-the-loop workflows with pattern learning. Confidence-based routing for auto-approval above threshold.',
      capabilities: [
        'Human approval service with request/process workflow',
        'Memory learning for approval pattern storage',
        'Confidence-based routing (auto-approve above threshold)',
        'Approval pattern analysis for ML improvements',
      ],
      metric: {
        value: 'ML-Based',
        label: 'Pattern learning',
      },
      ctaText: 'Explore HITL',
      slug: 'hitl',
    },
    {
      icon: '📋',
      packageName: '@hive-academy/langgraph-functional-api',
      businessValue: 'Decorator-Driven Workflows',
      description:
        'Build workflows with decorators (NestJS-style). Zero boilerplate graph construction with automatic metadata extraction.',
      capabilities: [
        '@Workflow decorator for declarative workflows',
        '@Node, @Edge, @Task decorators for structure',
        '@Entrypoint for workflow entry point',
        'Metadata extraction by MetadataProcessorService',
      ],
      metric: {
        value: 'Zero Config',
        label: 'Graph construction',
      },
      ctaText: 'Explore Functional-API',
      slug: 'functional-api',
    },
  ]);
}
