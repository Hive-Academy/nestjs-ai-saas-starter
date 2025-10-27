import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';
import type { WorkflowExample } from '../interfaces';

/**
 * Workflow Examples Section Component
 *
 * REDESIGNED: Inspired by Design-3 (Stripe) - Clean, professional, code-focused
 *
 * Shows 3 complete workflow examples demonstrating multi-library integrations:
 * 1. RAG Pipeline - ChromaDB + Neo4j + Memory
 * 2. Multi-Agent - Multi-Agent + HITL + Checkpoint
 * 3. Production API - Workflow-Engine + Platform + Monitoring
 *
 * Design Philosophy:
 * - Vertical stacked full-width cards
 * - Side-by-side code comparison (before/after)
 * - Module badges as glass pills
 * - Prominent metric callouts (line reduction)
 * - Scroll-reveal animations
 * - Clean, professional, Stripe-inspired aesthetic
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
            class="text-5xl md:text-7xl font-bold bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-tertiary bg-clip-text text-transparent mb-6 leading-tight"
            scrollAnimation
            [scrollConfig]="{
              animation: 'fadeIn',
              start: 'top 80%',
              duration: 0.8,
              once: true
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
              once: true
            }"
          >
            These aren't isolated tools—they're a cohesive ecosystem. See how
            ChromaDB, Neo4j, and LangGraph modules orchestrate together.
          </p>
        </div>

        <!-- Workflow Cards -->
        @for (workflow of workflows; track workflow.title) {
        <article
          class="mb-24 last:mb-0"
          scrollAnimation
          [scrollConfig]="{
            animation: 'fadeIn',
            start: 'top 75%',
            duration: 1,
            delay: $index * 0.2,
            once: true
          }"
        >
          <!-- Workflow Header -->
          <div class="mb-8">
            <div class="flex items-center gap-4 mb-4">
              <span class="text-6xl font-bold text-accent-primary/20">
                {{ ($index + 1).toString().padStart(2, '0') }}
              </span>
              <div class="flex-1">
                <h3
                  class="text-3xl md:text-4xl font-bold text-text-headline mb-2"
                >
                  {{ workflow.title }}
                </h3>
                <p class="text-lg text-text-secondary">
                  {{ workflow.description }}
                </p>
              </div>
            </div>

            <!-- Module Badges -->
            <div class="flex flex-wrap gap-2 mb-6">
              @for (module of workflow.modules; track module) {
              <span
                class="px-4 py-2 bg-accent-primary/10 text-accent-primary text-sm font-semibold rounded-full border border-accent-primary/20"
              >
                {{ module }}
              </span>
              }
            </div>
          </div>

          <!-- Code Comparison Card -->
          <div
            class="bg-white rounded-2xl border border-gray-200 shadow-card-elevated overflow-hidden"
          >
            <!-- Metric Banner -->
            <div
              class="bg-gradient-to-r from-accent-primary/10 via-accent-secondary/10 to-accent-tertiary/10 px-8 py-6 border-b border-gray-200"
            >
              <div class="flex items-center justify-center gap-4">
                <div class="text-center">
                  <div class="text-4xl font-bold text-accent-danger">
                    {{ workflow.codeBeforeLines }}
                  </div>
                  <div class="text-sm text-text-secondary">lines before</div>
                </div>
                <div class="text-3xl text-text-secondary">→</div>
                <div class="text-center">
                  <div
                    class="text-4xl font-bold bg-gradient-to-r from-accent-success to-accent-tertiary bg-clip-text text-transparent"
                  >
                    {{ workflow.codeAfterLines }}
                  </div>
                  <div class="text-sm text-text-secondary">lines after</div>
                </div>
                <div
                  class="ml-8 px-6 py-3 bg-accent-success/20 rounded-full border border-accent-success/30"
                >
                  <div class="text-2xl font-bold text-accent-success">
                    {{
                      calculateReduction(
                        workflow.codeBeforeLines,
                        workflow.codeAfterLines
                      )
                    }}% less code
                  </div>
                </div>
              </div>
            </div>

            <!-- Code Blocks -->
            <div
              class="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200"
            >
              <!-- Before Code -->
              <div class="p-8">
                <div class="flex items-center gap-2 mb-4">
                  <span class="w-3 h-3 rounded-full bg-accent-danger"></span>
                  <span
                    class="text-sm font-semibold text-accent-danger uppercase tracking-wide"
                  >
                    Before: Manual Setup
                  </span>
                </div>
                <pre
                  class="bg-gray-900 text-gray-100 p-6 rounded-lg text-sm overflow-x-auto"
                ><code class="font-mono">{{ workflow.codeBefore }}</code></pre>
              </div>

              <!-- After Code -->
              <div class="p-8 bg-gray-50">
                <div class="flex items-center gap-2 mb-4">
                  <span class="w-3 h-3 rounded-full bg-accent-success"></span>
                  <span
                    class="text-sm font-semibold text-accent-success uppercase tracking-wide"
                  >
                    After: NestJS Patterns
                  </span>
                </div>
                <pre
                  class="bg-gray-900 text-gray-100 p-6 rounded-lg text-sm overflow-x-auto"
                ><code class="font-mono">{{ workflow.codeAfter }}</code></pre>
              </div>
            </div>

            <!-- Value Delivered -->
            <div
              class="px-8 py-6 bg-gradient-to-br from-gray-50 to-white border-t border-gray-200"
            >
              <div
                class="text-sm font-semibold text-text-headline uppercase tracking-wide mb-4"
              >
                Value Delivered
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                @for (value of workflow.valueDelivered; track value) {
                <div class="flex items-start gap-3">
                  <span class="text-accent-success text-xl mt-0.5">✓</span>
                  <span class="text-base text-text-primary">{{ value }}</span>
                </div>
                }
              </div>
            </div>
          </div>
        </article>
        }
      </div>
    </section>
  `,
})
export class WorkflowExamplesSectionComponent {
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
