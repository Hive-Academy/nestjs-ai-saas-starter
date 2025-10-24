import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowExampleCardComponent } from '../components/workflow-example-card.component';
import type { WorkflowExample } from '../interfaces';

/**
 * Workflow Examples Section Component
 *
 * TASK_2025_026 - Task 11 (BATCH 3)
 *
 * Demonstrates real integrations where multiple libraries work together.
 * Shows 3 complete workflow examples: RAG Pipeline, Multi-Agent, DevBrand API.
 *
 * Design Specifications:
 * - Background: bg-secondary (#F9FAFB)
 * - Section padding: py-20 md:py-32
 * - Container: max-w-7xl mx-auto px-8 md:px-12
 * - Section headline: text-4xl md:text-6xl font-bold text-headline
 * - Section intro: text-lg md:text-xl text-secondary
 *
 * Reference:
 * - implementation-plan.md:676-684
 * - visual-design-specification.md:904-1078
 * - design-handoff.md:948-1031
 */
@Component({
  selector: 'app-workflow-examples-section',
  standalone: true,
  imports: [CommonModule, WorkflowExampleCardComponent],
  template: `
    <section
      class="bg-secondary py-20 md:py-32"
      aria-labelledby="workflow-examples-headline"
    >
      <div class="max-w-7xl mx-auto px-8 md:px-12">
        <!-- Section Headline -->
        <h2
          id="workflow-examples-headline"
          class="text-4xl md:text-6xl font-bold text-headline leading-tight mb-8 text-center"
        >
          See Libraries Working Together
        </h2>

        <!-- Section Intro -->
        <p
          class="text-lg md:text-xl text-secondary leading-relaxed max-w-3xl mx-auto text-center mb-16"
        >
          These aren't isolated tools—they're a cohesive ecosystem. See how
          ChromaDB, Neo4j, and LangGraph modules orchestrate together through
          real production workflows.
        </p>

        <!-- Workflow Examples -->
        @for (workflow of workflows; track workflow.title) {
        <app-workflow-example-card
          [workflowExample]="workflow"
          [index]="$index + 1"
        />
        }
      </div>
    </section>
  `,
})
export class WorkflowExamplesSectionComponent {
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
