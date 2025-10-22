/**
 * Core Foundation Section Component (Light Design)
 *
 * Showcases LangGraph Core as the foundation for all LangGraph modules.
 * Features a spotlight design with light gray background for differentiation.
 *
 * Design System: Light theme with centered spotlight layout
 * - Light gray background (#F9FAFB) for visual separation
 * - Centered single-column layout for prominence
 * - Powered modules displayed as tag cloud
 */

import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { SectionContainerComponent } from '../../../shared/components/section-container.component';
import {
  LibraryShowcaseGridComponent,
  type LibraryCard,
} from '../../../shared/components/library-showcase-grid.component';

@Component({
  selector: 'app-core-foundation-section',
  standalone: true,
  imports: [
    CommonModule,
    SectionContainerComponent,
    LibraryShowcaseGridComponent,
  ],
  template: `
    <app-section-container
      title="Foundation of the Ecosystem"
      subtitle="Type-safe interfaces and state management powering 10 LangGraph modules"
      background="light-gray"
    >
      <div class="max-w-5xl mx-auto mb-12">
        <app-library-showcase-grid [libraries]="libraries()" [columns]="1" />
      </div>

      <!-- Powered Modules Tag Cloud -->
      <div class="max-w-4xl mx-auto mt-12">
        <h3 class="text-lg font-semibold text-gray-700 text-center mb-4">
          Powers 10 LangGraph Modules
        </h3>
        <div class="flex flex-wrap justify-center gap-3">
          @for (module of poweredModules(); track module) {
          <span
            class="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 shadow-sm"
          >
            {{ module }}
          </span>
          }
        </div>
      </div>
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
export class CoreFoundationSectionComponent {
  readonly libraries = signal<LibraryCard[]>([
    {
      icon: '⚙️',
      packageName: '@hive-academy/langgraph-core',
      businessValue: 'Zero-overhead type-safe workflow development',
      description:
        'Foundation types and state annotations for all LangGraph workflows. Comprehensive state management with intelligent reducers and command patterns for sophisticated control flow.',
      capabilities: [
        'WorkflowState interface with 17 core fields and reducers',
        'Command patterns (goto, update, end, error, retry, skip, stop)',
        'Custom state creation with createCustomStateAnnotation()',
        'Integration adapters (NoOp implementations for optional features)',
      ],
      metric: {
        value: '10+ Modules',
        label: 'Built on core foundation',
      },
      ctaText: 'Explore Core',
      slug: 'core',
    },
  ]);

  readonly poweredModules = signal<string[]>([
    'Workflow-Engine',
    'Streaming',
    'Memory',
    'Multi-Agent',
    'HITL',
    'Functional-API',
    'Checkpoint',
    'Monitoring',
    'Platform',
    'Time-Travel',
  ]);
}
