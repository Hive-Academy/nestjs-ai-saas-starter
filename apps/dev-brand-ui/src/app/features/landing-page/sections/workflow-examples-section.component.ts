import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';
import type { WorkflowExample } from '../interfaces';

/**
 * Workflow Examples Section Component
 *
 * REDESIGNED: Interactive navigation tiles with card view
 *
 * Shows 3 complete workflow examples demonstrating multi-library integrations:
 * 1. RAG Pipeline - ChromaDB + Neo4j + Memory
 * 2. Multi-Agent - Multi-Agent + HITL + Checkpoint
 * 3. Production API - Workflow-Engine + Platform + Monitoring
 *
 * Design Philosophy:
 * - Left: Vertical navigation tiles (numbered 01-03)
 * - Right: Large interactive card showing selected workflow
 * - Click-to-navigate interaction
 * - Smooth transitions between workflows
 * - Modern, clean, professional aesthetic
 */
@Component({
  selector: 'app-workflow-examples-section',
  standalone: true,
  imports: [CommonModule, ScrollAnimationDirective],
  template: `
    <section
      class="relative bg-white py-20 md:py-32"
      aria-labelledby="workflow-examples-headline"
    >
      <div class="max-w-7xl mx-auto px-8 md:px-16">
        <!-- Section Headline -->
        <div class="text-center mb-20">
          <h2
            id="workflow-examples-headline"
            class="text-4xl md:text-5xl font-bold bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-tertiary bg-clip-text text-transparent mb-6 leading-tight"
            scrollAnimation
            [scrollConfig]="{
              animation: 'fadeIn',
              start: 'top 80%',
              duration: 0.8,
              once: false
            }"
          >
            Real Integrations in Action
          </h2>
          <p
            class="text-xl md:text-2xl text-text-secondary max-w-4xl mx-auto leading-relaxed"
            scrollAnimation
            [scrollConfig]="{
              animation: 'slideUp',
              start: 'top 75%',
              duration: 0.8,
              delay: 0.2,
              once: false
            }"
          >
            These aren't isolated tools—they're a cohesive ecosystem. See how
            ChromaDB, Neo4j, and LangGraph modules orchestrate together.
          </p>
        </div>

        <!-- Interactive Layout: Navigation Tiles + Card -->
        <div class="flex flex-col lg:flex-row gap-8">
          <!-- Left: Navigation Tiles -->
          <nav class="lg:w-2/5 space-y-6" aria-label="Workflow examples">
            @for (workflow of workflows; track workflow.title) {
            <button
              type="button"
              [ngClass]="{
                'w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg group': true,
                'border-accent-primary bg-gradient-to-br from-accent-primary/5 to-accent-secondary/5 shadow-card-elevated':
                  activeWorkflowIndex === $index,
                'border-gray-200 bg-white hover:border-accent-primary/50':
                  activeWorkflowIndex !== $index
              }"
              (click)="selectWorkflow($index)"
              scrollAnimation
              [scrollConfig]="{
                animation: 'slideRight',
                start: 'top 75%',
                duration: 0.6,
                delay: $index * 0.15,
                once: false
              }"
              [attr.aria-pressed]="activeWorkflowIndex === $index"
              [attr.aria-label]="'View ' + workflow.title + ' workflow example'"
            >
              <!-- Tile Header -->
              <div class="flex items-start gap-4 mb-4">
                <span
                  [ngClass]="{
                    'text-5xl font-bold transition-colors duration-300': true,
                    'text-accent-primary': activeWorkflowIndex === $index,
                    'text-accent-primary/20 group-hover:text-accent-primary/40':
                      activeWorkflowIndex !== $index
                  }"
                >
                  {{ formatIndex($index + 1) }}
                </span>
                <div class="flex-1">
                  <h3
                    class="text-xl md:text-2xl font-bold text-text-headline mb-2 leading-tight"
                  >
                    {{ workflow.title }}
                  </h3>
                  <p class="text-sm text-text-secondary leading-relaxed">
                    {{ workflow.description }}
                  </p>
                </div>
              </div>

              <!-- Module Badges -->
              <div class="flex flex-wrap gap-2">
                @for (module of workflow.modules; track module) {
                <span
                  [ngClass]="{
                    'px-3 py-1 text-xs font-semibold rounded-full transition-colors duration-300': true,
                    'bg-accent-primary/20 text-accent-primary border border-accent-primary/30':
                      activeWorkflowIndex === $index,
                    'bg-gray-100 text-gray-600': activeWorkflowIndex !== $index
                  }"
                >
                  {{ module }}
                </span>
                }
              </div>
            </button>
            }
          </nav>

          <!-- Right: Active Workflow Card -->
          <div class="lg:w-3/5">
            <div
              class="bg-white rounded-2xl border border-gray-200 shadow-card-elevated overflow-hidden transition-all duration-500"
              scrollAnimation
              [scrollConfig]="{
                animation: 'slideLeft',
                start: 'top 75%',
                duration: 0.8,
                once: false
              }"
            >
              <!-- Metric Banner -->
              <div
                class="bg-gradient-to-r from-accent-primary/10 via-accent-secondary/10 to-accent-tertiary/10 px-6 py-5 border-b border-gray-200"
              >
                <div class="flex items-center justify-center gap-4">
                  <div class="text-center">
                    <div
                      class="text-4xl md:text-5xl font-bold text-accent-danger"
                    >
                      {{ activeWorkflow.codeBeforeLines }}
                    </div>
                    <div class="text-xs md:text-sm text-text-secondary">
                      lines before
                    </div>
                  </div>
                  <div class="text-2xl md:text-3xl text-text-secondary">→</div>
                  <div class="text-center">
                    <div
                      class="text-4xl md:text-5xl font-bold bg-gradient-to-r from-accent-success to-accent-tertiary bg-clip-text text-transparent"
                    >
                      {{ activeWorkflow.codeAfterLines }}
                    </div>
                    <div class="text-xs md:text-sm text-text-secondary">
                      lines after
                    </div>
                  </div>
                  <div
                    class="ml-4 px-4 md:px-6 py-2 md:py-3 bg-accent-success/20 rounded-full border border-accent-success/30"
                  >
                    <div
                      class="text-xl md:text-2xl font-bold text-accent-success"
                    >
                      {{
                        calculateReduction(
                          activeWorkflow.codeBeforeLines,
                          activeWorkflow.codeAfterLines
                        )
                      }}% less code
                    </div>
                  </div>
                </div>
              </div>

              <!-- Code Blocks -->
              <div
                class="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-gray-200"
              >
                <!-- Before Code -->
                <div class="p-6">
                  <div class="flex items-center gap-2 mb-3">
                    <span class="w-3 h-3 rounded-full bg-accent-danger"></span>
                    <span
                      class="text-xs font-semibold text-accent-danger uppercase tracking-wide"
                    >
                      Before: Manual Setup
                    </span>
                  </div>
                  <pre
                    class="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto"
                  ><code class="font-mono">{{ activeWorkflow.codeBefore }}</code></pre>
                </div>

                <!-- After Code -->
                <div class="p-6 bg-gray-50">
                  <div class="flex items-center gap-2 mb-3">
                    <span class="w-3 h-3 rounded-full bg-accent-success"></span>
                    <span
                      class="text-xs font-semibold text-accent-success uppercase tracking-wide"
                    >
                      After: NestJS Patterns
                    </span>
                  </div>
                  <pre
                    class="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto"
                  ><code class="font-mono">{{ activeWorkflow.codeAfter }}</code></pre>
                </div>
              </div>

              <!-- Value Delivered -->
              <div
                class="px-6 py-5 bg-gradient-to-br from-gray-50 to-white border-t border-gray-200"
              >
                <div
                  class="text-xs font-semibold text-text-headline uppercase tracking-wide mb-3"
                >
                  Value Delivered
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  @for (value of activeWorkflow.valueDelivered; track value) {
                  <div class="flex items-start gap-2">
                    <span class="text-accent-success text-lg mt-0.5">✓</span>
                    <span class="text-sm text-text-primary">{{ value }}</span>
                  </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class WorkflowExamplesSectionComponent {
  /**
   * Index of the currently active workflow
   */
  activeWorkflowIndex = 0;

  /**
   * Get the currently active workflow
   */
  get activeWorkflow(): WorkflowExample {
    return this.workflows[this.activeWorkflowIndex];
  }

  /**
   * Select a workflow to display
   */
  selectWorkflow(index: number): void {
    this.activeWorkflowIndex = index;
  }

  /**
   * Format index with leading zero (01, 02, 03)
   */
  formatIndex(index: number): string {
    return index.toString().padStart(2, '0');
  }

  /**
   * Calculate percentage reduction from before to after
   */
  calculateReduction(before: number, after: number): number {
    return Math.round(((before - after) / before) * 100);
  }

  /**
   * Complete workflow examples showing multi-library integrations
   */
  workflows: WorkflowExample[] = [
    // Workflow 1: RAG Pipeline with Multi-Source Context
    {
      title: 'RAG Pipeline with Multi-Source Context',
      description:
        'Combine vector search, graph relationships, and conversation memory for comprehensive context retrieval',
      modules: ['ChromaDB', 'Neo4j', 'Memory', 'Streaming', 'Monitoring'],
      diagramUrl: '/assets/diagrams/workflow-rag-pipeline.svg',
      codeBeforeLines: 75,
      codeAfterLines: 12,
      codeBefore: `// Manual ChromaDB client setup
const client = new ChromaClient({ url });
const collection = await client
  .getOrCreateCollection('docs');
const embeddings = await generate(texts);
// ... 70+ more lines for:
// - Neo4j connection management
// - Memory context retrieval
// - WebSocket streaming setup
// - Prometheus metrics instrumentation`,
      codeAfter: `@Injectable()
export class RAGService {
  async generateAnswer(query: string, userId: string) {
    return this.streamingOrchestrator
      .startWorkflowWithStreaming({
        workflow: this.ragWorkflow,
        input: { query, userId },
        executionId: this.generateId()
      });
  }
}`,
      valueDelivered: [
        'Semantic search across 10M+ documents',
        'Graph traversal for related entities',
        'Context memory for personalization',
        'Real-time streaming responses',
      ],
    },

    // Workflow 2: Multi-Agent Collaboration System
    {
      title: 'Multi-Agent Collaboration System',
      description:
        'Coordinate multiple specialized agents with human oversight and approval workflows',
      modules: [
        'Multi-Agent',
        'HITL',
        'Checkpoint',
        'Time-Travel',
        'Monitoring',
      ],
      diagramUrl: '/assets/diagrams/workflow-multi-agent.svg',
      codeBeforeLines: 120,
      codeAfterLines: 18,
      codeBefore: `// Manual agent orchestration
const researchAgent = new Agent({ role: 'research' });
const writerAgent = new Agent({ role: 'writer' });
const reviewAgent = new Agent({ role: 'review' });

// Coordinate agent execution
const research = await researchAgent.execute(topic);
const draft = await writerAgent.execute(research);

// Human-in-the-loop approval
const approved = await getHumanApproval(draft);
if (!approved) { /* retry logic */ }

// State checkpointing
await saveCheckpoint(draft);
// ... 100+ more lines for error handling, monitoring, debugging`,
      codeAfter: `@Workflow({ name: 'content-creation' })
export class ContentCreationWorkflow {
  @Node({ name: 'research' })
  async research(@State() state: ContentState) {
    return { research: await this.researchAgent.execute(state.topic) };
  }

  @Node({ name: 'write' })
  @RequiresApproval({ confidenceThreshold: 0.8 })
  async write(@State() state: ContentState) {
    return { draft: await this.writerAgent.execute(state.research) };
  }

  @Edge({ from: 'research', to: 'write' })
  defineFlow() {}
}`,
      valueDelivered: [
        'Agent coordination with dependency injection',
        'Human approval workflows with ML confidence scoring',
        'Automatic state checkpointing and recovery',
        'Time-travel debugging for production workflows',
      ],
    },

    // Workflow 3: Production AI API with Full Observability
    {
      title: 'Production AI API with Full Observability',
      description:
        'Deploy scalable AI endpoints with built-in monitoring, caching, and error recovery',
      modules: [
        'Workflow-Engine',
        'Platform',
        'Monitoring',
        'Checkpoint',
        'Streaming',
      ],
      diagramUrl: '/assets/diagrams/workflow-devbrand-api.svg',
      codeBeforeLines: 95,
      codeAfterLines: 15,
      codeBefore: `// Manual platform deployment
const app = express();
app.post('/api/workflow', async (req, res) => {
  // Manual request validation
  // Manual authentication/authorization
  // Manual rate limiting
  // Manual caching layer
  // Manual Prometheus metrics
  // Manual error recovery
  // Manual response streaming
  // Manual timeout handling
  // Manual tenant isolation
  // ... 85+ more lines
});

// Deploy to LangGraph Cloud
// Manual API key management
// Manual webhook configuration
// Manual scaling rules`,
      codeAfter: `@Controller('workflow')
export class WorkflowController {
  constructor(
    private readonly workflowEngine: WorkflowEngineService,
    private readonly platformService: PlatformService
  ) {}

  @Post('execute')
  async execute(@Body() dto: ExecuteWorkflowDto) {
    return this.platformService.deployAndExecute({
      workflow: this.workflowEngine.getWorkflow(dto.name),
      input: dto.input
    });
  }
}`,
      valueDelivered: [
        'Production monitoring (Prometheus + Grafana)',
        'Automatic error recovery with exponential backoff',
        'Response streaming with SSE/WebSocket',
        'One-command LangGraph Platform deployment',
      ],
    },
  ];
}
