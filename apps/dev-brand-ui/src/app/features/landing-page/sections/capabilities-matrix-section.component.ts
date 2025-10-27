import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnhancedCardComponent } from '../components/enhanced-card.component';
import { GlassPillComponent } from '../components/glass-pill.component';
import { Icon3DContainerComponent } from '../components/icon-3d-container.component';
import { CountUpDirective } from '../directives/count-up.directive';

/**
 * Enterprise Capabilities Matrix Section Component
 *
 * TASK_2025_026 - Task 12 (BATCH 3)
 *
 * Visualizes 11x11 matrix showing production features across all libraries.
 * Demonstrates enterprise capabilities built-in across all 13 libraries.
 *
 * Design Specifications:
 * - Background: bg-white (#FFFFFF)
 * - Section padding: py-20 md:py-32
 * - Container: max-w-7xl mx-auto px-8 md:px-12
 * - Table: responsive with horizontal scroll on mobile
 * - Sticky first column on mobile
 * - ROI callout: bg-accent-primary/10 rounded-card p-12
 *
 * Reference:
 * - visual-design-specification.md:1082-1169
 * - design-handoff.md:1033-1083
 */
@Component({
  selector: 'app-capabilities-matrix-section',
  standalone: true,
  imports: [
    CommonModule,
    EnhancedCardComponent,
    GlassPillComponent,
    Icon3DContainerComponent,
    CountUpDirective,
  ],
  template: `
    <section
      class="bg-white py-20 md:py-32"
      aria-labelledby="capabilities-matrix-headline"
    >
      <div class="max-w-7xl mx-auto px-8 md:px-12">
        <!-- Section Headline -->
        <h2
          id="capabilities-matrix-headline"
          class="text-4xl md:text-6xl font-bold text-headline leading-tight mb-8 text-center"
        >
          Production-Ready from Day One
        </h2>

        <!-- Section Intro -->
        <p
          class="text-lg md:text-xl text-secondary leading-relaxed max-w-3xl mx-auto text-center mb-16"
        >
          Enterprise capabilities built-in across all 13 libraries.
          Multi-tenancy, monitoring, retry logic, caching, audit logging—zero
          infrastructure code required.
        </p>

        <!-- Capability Matrix Table -->
        <app-enhanced-card
          [variant]="'solid'"
          [padding]="'lg'"
          [hoverable]="false"
          class="mb-16"
        >
          <div class="overflow-x-auto">
            <table class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-50">
                <th
                  class="sticky left-0 bg-gray-50 text-left p-4 text-sm font-semibold text-secondary border-b border-gray-200"
                >
                  Capability
                </th>
                @for (library of libraries; track library) {
                <th
                  class="text-center p-4 text-sm font-semibold text-secondary border-b border-gray-200 whitespace-nowrap"
                >
                  <app-glass-pill
                    [label]="library"
                    [color]="getLibraryColor(library)"
                    [size]="'sm'"
                  ></app-glass-pill>
                </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (capability of capabilities; track capability.name) {
              <tr class="hover:bg-accent-primary/5 transition-colors">
                <td
                  class="sticky left-0 bg-white p-4 text-sm font-medium text-primary border-b border-gray-200"
                >
                  {{ capability.name }}
                </td>
                @for (library of libraries; track library) {
                <td class="p-4 text-center border-b border-gray-200">
                  @if (hasCapability(library, capability.name)) {
                  <div class="flex flex-col items-center">
                    <!-- Checkmark SVG -->
                    <svg
                      class="w-6 h-6 text-accent-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    @if (capability.implementations[library]) {
                    <div class="text-xs text-secondary mt-1">
                      {{ capability.implementations[library] }}
                    </div>
                    }
                  </div>
                  }
                </td>
                }
              </tr>
              }
            </tbody>
          </table>
          </div>
        </app-enhanced-card>

        <!-- ROI Calculation Callout -->
        <app-enhanced-card
          [variant]="'glass'"
          [padding]="'lg'"
          [hoverable]="false"
          class="bg-accent-primary/10"
        >
          <div class="text-center">
            <div class="text-6xl font-bold text-accent-primary mb-4">
              $<span appCountUp [targetValue]="262800" [duration]="2500">0</span>
            </div>
            <div class="text-2xl font-bold text-headline mb-4">
              Infrastructure Development Savings
            </div>
            <div class="text-lg text-secondary max-w-2xl mx-auto">
              Traditional approach:
              <span appCountUp [targetValue]="11" [suffix]="' weeks'">0 weeks</span> =
              <span appCountUp [targetValue]="1760" [suffix]="' hours'">0 hours</span> =
              $<span appCountUp [targetValue]="264000">0</span> in developer time.
              Our approach: 1 day = 8 hours = $1,200. Savings: $<span appCountUp [targetValue]="262800">0</span>.
            </div>
          </div>
        </app-enhanced-card>
      </div>
    </section>
  `,
})
export class CapabilitiesMatrixSectionComponent {
  /**
   * All 11 libraries in the DevBrand ecosystem
   */
  libraries = [
    'ChromaDB',
    'Neo4j',
    'Core',
    'Memory',
    'Checkpoint',
    'Functional-API',
    'Multi-Agent',
    'Platform',
    'Time-Travel',
    'Monitoring',
    'HITL',
  ];

  /**
   * Enterprise capabilities with implementation notes
   */
  capabilities: {
    name: string;
    implementations: Record<string, string>;
  }[] = [
    {
      name: 'Multi-Tenancy',
      implementations: {
        ChromaDB: 'Database-per-tenant',
        Neo4j: 'Database-per-tenant',
        Core: 'Tenant isolation',
        Memory: 'Tenant scoping',
        Checkpoint: 'Tenant partitioning',
        'Functional-API': 'Tenant decorators',
        'Multi-Agent': 'Tenant contexts',
        Platform: 'Tenant routing',
        'Time-Travel': 'Tenant history',
        Monitoring: 'Tenant metrics',
        HITL: 'Tenant approvals',
      },
    },
    {
      name: 'Monitoring',
      implementations: {
        ChromaDB: 'Query metrics',
        Neo4j: 'Cypher metrics',
        Core: 'Workflow metrics',
        Memory: 'Memory metrics',
        Checkpoint: 'State metrics',
        'Functional-API': 'Node metrics',
        'Multi-Agent': 'Agent metrics',
        Platform: 'Platform metrics',
        'Time-Travel': 'History metrics',
        Monitoring: 'Full observability',
        HITL: 'Approval metrics',
      },
    },
    {
      name: 'Retry Logic',
      implementations: {
        ChromaDB: 'Auto-retry',
        Neo4j: 'Exponential backoff',
        Core: 'Workflow retry',
        Memory: 'Context retry',
        Checkpoint: 'State recovery',
        'Functional-API': 'Node retry',
        'Multi-Agent': 'Agent retry',
        Platform: 'Platform retry',
        'Time-Travel': 'Replay',
        Monitoring: 'Retry tracking',
        HITL: 'Approval retry',
      },
    },
    {
      name: 'Caching',
      implementations: {
        ChromaDB: 'Query cache',
        Neo4j: 'Result cache',
        Core: 'Workflow cache',
        Memory: 'Context cache',
        Checkpoint: 'State cache',
        'Functional-API': 'Node cache',
        'Multi-Agent': 'Agent cache',
        Platform: 'Platform cache',
        'Time-Travel': 'History cache',
        Monitoring: 'Metrics cache',
        HITL: 'Approval cache',
      },
    },
    {
      name: 'Audit Logging',
      implementations: {
        ChromaDB: 'Query logs',
        Neo4j: 'Cypher logs',
        Core: 'Workflow logs',
        Memory: 'Context logs',
        Checkpoint: 'State logs',
        'Functional-API': 'Node execution logs',
        'Multi-Agent': 'Agent logs',
        Platform: 'Platform logs',
        'Time-Travel': 'Full history',
        Monitoring: 'Audit trails',
        HITL: 'Approval logs',
      },
    },
    {
      name: 'Error Recovery',
      implementations: {
        ChromaDB: 'Auto-recovery',
        Neo4j: 'Transaction rollback',
        Core: 'Workflow recovery',
        Memory: 'Context recovery',
        Checkpoint: 'State restoration',
        'Functional-API': 'Node recovery',
        'Multi-Agent': 'Agent recovery',
        Platform: 'Platform recovery',
        'Time-Travel': 'Point-in-time recovery',
        Monitoring: 'Error tracking',
        HITL: 'Manual recovery',
      },
    },
    {
      name: 'Rate Limiting',
      implementations: {
        ChromaDB: 'Query throttling',
        Neo4j: 'Query throttling',
        Core: 'Workflow throttling',
        Memory: 'Context throttling',
        Checkpoint: 'State throttling',
        'Functional-API': 'Node throttling',
        'Multi-Agent': 'Agent throttling',
        Platform: 'Platform throttling',
        'Time-Travel': 'History throttling',
        Monitoring: 'Metric throttling',
        HITL: 'Approval throttling',
      },
    },
    {
      name: 'Authentication',
      implementations: {
        ChromaDB: 'API keys',
        Neo4j: 'Basic + JWT',
        Core: 'Workflow auth',
        Memory: 'Context auth',
        Checkpoint: 'State auth',
        'Functional-API': 'Node auth',
        'Multi-Agent': 'Agent auth',
        Platform: 'Platform auth',
        'Time-Travel': 'History auth',
        Monitoring: 'Metrics auth',
        HITL: 'Approval auth',
      },
    },
    {
      name: 'Streaming',
      implementations: {
        ChromaDB: 'Result streaming',
        Neo4j: 'Result streaming',
        Core: 'Workflow streaming',
        Memory: 'Context streaming',
        Checkpoint: 'State streaming',
        'Functional-API': 'Node streaming',
        'Multi-Agent': 'Agent streaming',
        Platform: 'Platform streaming',
        'Time-Travel': 'History streaming',
        Monitoring: 'Metrics streaming',
        HITL: 'Approval streaming',
      },
    },
    {
      name: 'Health Checks',
      implementations: {
        ChromaDB: 'Database health',
        Neo4j: 'Database health',
        Core: 'Workflow health',
        Memory: 'Memory health',
        Checkpoint: 'Checkpoint health',
        'Functional-API': 'API health',
        'Multi-Agent': 'Agent health',
        Platform: 'Platform health',
        'Time-Travel': 'History health',
        Monitoring: 'Full health',
        HITL: 'Approval health',
      },
    },
    {
      name: 'Documentation',
      implementations: {
        ChromaDB: 'Full API docs',
        Neo4j: 'Full API docs',
        Core: 'Full API docs',
        Memory: 'Full API docs',
        Checkpoint: 'Full API docs',
        'Functional-API': 'Full API docs',
        'Multi-Agent': 'Full API docs',
        Platform: 'Full API docs',
        'Time-Travel': 'Full API docs',
        Monitoring: 'Full API docs',
        HITL: 'Full API docs',
      },
    },
  ];

  /**
   * Check if a library supports a specific capability
   */
  hasCapability(library: string, capability: string): boolean {
    const cap = this.capabilities.find((c) => c.name === capability);
    return cap?.implementations[library] !== undefined;
  }

  /**
   * Get color scheme for library glass pills
   */
  getLibraryColor(
    library: string
  ): 'electric' | 'neon' | 'lime' | 'neutral' {
    const colorMap: Record<string, 'electric' | 'neon' | 'lime' | 'neutral'> = {
      ChromaDB: 'electric',
      Neo4j: 'neon',
      Core: 'lime',
      Memory: 'electric',
      Checkpoint: 'neon',
      'Functional-API': 'lime',
      'Multi-Agent': 'electric',
      Platform: 'neon',
      'Time-Travel': 'lime',
      Monitoring: 'electric',
      HITL: 'neon',
    };
    return colorMap[library] || 'neutral';
  }
}
