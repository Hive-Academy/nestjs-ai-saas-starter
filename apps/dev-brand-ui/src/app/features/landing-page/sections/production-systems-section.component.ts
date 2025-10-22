/**
 * Production Systems Section Component (Light Design)
 *
 * Showcases the production layer with 3 libraries:
 * - Checkpoint (state persistence and recovery)
 * - Monitoring (production observability)
 * - Platform (LangGraph Cloud integration)
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
  selector: 'app-production-systems-section',
  standalone: true,
  imports: [
    CommonModule,
    SectionContainerComponent,
    LibraryShowcaseGridComponent,
  ],
  template: `
    <app-section-container
      title="Production-Ready Features"
      subtitle="Deploy, monitor, and scale enterprise AI systems"
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
export class ProductionSystemsSectionComponent {
  readonly libraries = signal<LibraryCard[]>([
    {
      icon: '💾',
      packageName: '@hive-academy/langgraph-checkpoint',
      businessValue: 'State Persistence & Recovery',
      description:
        'Workflow state persistence for long-running processes. Resume workflows after failures or restarts with time-travel debugging.',
      capabilities: [
        'ICheckpointAdapter for standardized checkpointing',
        'Redis/PostgreSQL storage backends',
        'Automatic checkpointing after each node',
        'State recovery and version management',
      ],
      metric: {
        value: 'Auto-Save',
        label: 'After each node',
      },
      ctaText: 'Explore Checkpoint',
      slug: 'checkpoint',
    },
    {
      icon: '📊',
      packageName: '@hive-academy/langgraph-monitoring',
      businessValue: 'Production Observability',
      description:
        'Comprehensive monitoring and metrics for production AI workflows. Prometheus integration with performance profiling.',
      capabilities: [
        'Prometheus integration for standard metrics',
        'Workflow metrics (execution time, error rates)',
        'Performance profiling and bottleneck detection',
        'Health checks for workflows and modules',
      ],
      metric: {
        value: 'Real-Time',
        label: 'Metrics collection',
      },
      ctaText: 'Explore Monitoring',
      slug: 'monitoring',
    },
    {
      icon: '☁️',
      packageName: '@hive-academy/langgraph-platform',
      businessValue: 'LangGraph Cloud Integration',
      description:
        'Deploy workflows to LangGraph Cloud with managed infrastructure. Scalable production deployments with auto-scaling.',
      capabilities: [
        'Cloud deployment to LangGraph Cloud',
        'Cloud API integration for remote workflows',
        'Remote monitoring and debugging',
        'Auto-scaling and managed checkpointing',
      ],
      metric: {
        value: 'Cloud-Native',
        label: 'Scalable deployment',
      },
      ctaText: 'Explore Platform',
      slug: 'platform',
    },
  ]);
}
