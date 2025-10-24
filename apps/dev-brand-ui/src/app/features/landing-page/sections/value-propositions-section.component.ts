import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ValuePropositionCardComponent } from '../components/value-proposition-card.component';
import type { ValueProposition } from '../interfaces';

/**
 * Value Propositions Section Component
 *
 * TASK_2025_026 - Tasks 7-9
 *
 * Container section for displaying all 11 value propositions.
 * Shows the complete ecosystem: ChromaDB, Neo4j, and 9 LangGraph modules.
 *
 * Design Specifications:
 * - Full-width individual spotlights (NOT card grids)
 * - 128px vertical spacing between value propositions (space-y-32)
 * - White background (bg-white)
 * - Reference: implementation-plan.md:344-387, design-handoff.md:804-862
 */
@Component({
  selector: 'app-value-propositions-section',
  standalone: true,
  imports: [CommonModule, ValuePropositionCardComponent],
  template: `
    <section class="py-20 md:py-32 px-8 md:px-16 bg-white">
      <div class="max-w-7xl mx-auto space-y-32">
        @for (valueProposition of valuePropositions; track
        valueProposition.packageName) {
        <app-value-proposition-card [valueProposition]="valueProposition" />
        }
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class ValuePropositionsSectionComponent {
  /**
   * All 11 Value Propositions
   * Reference: research-report.md (TASK_2025_026), design-handoff.md:844-923
   */
  readonly valuePropositions: ValueProposition[] = [
    // 1. ChromaDB
    {
      packageName: '@hive-academy/nestjs-chromadb',
      businessHeadline: 'Build RAG Applications in Minutes',
      painPoint:
        '50+ lines of manual ChromaDB client setup, embedding generation, error handling, retry logic, tenant isolation...',
      solution:
        'TypeORM-style repository pattern with automatic embeddings, tenant isolation, and caching via decorators',
      capabilities: [
        'Multi-provider embeddings (OpenAI, Cohere, local)',
        'Multi-tenant database-per-tenant isolation',
        'Intelligent caching with @Cached decorator',
        'Auto-chunking for large documents',
      ],
      metricValue: '90%',
      metricLabel: 'Less Code',
    },

    // 2. Neo4j
    {
      packageName: '@hive-academy/nestjs-neo4j',
      businessHeadline: 'Graph Queries Without Cypher Boilerplate',
      painPoint:
        'Raw Cypher queries with manual parameter binding, connection pooling, and transaction management for every graph operation',
      solution:
        'Specialized repository pattern for graphs with type-safe query builder and automatic relationship mapping',
      capabilities: [
        'GraphRepository pattern for nodes and relationships',
        'Type-safe Cypher query builder',
        'Multi-tenant graph isolation',
        'Built-in dependency injection',
      ],
      metricValue: '85%',
      metricLabel: 'Less Boilerplate',
    },

    // 3. Memory (Core)
    {
      packageName: '@hive-academy/langgraph-memory',
      businessHeadline: 'Contextual AI Without Memory Management Hell',
      painPoint:
        'Manual context retrieval from multiple sources, token limit calculations, relevance scoring, and memory persistence',
      solution:
        'Unified memory facade coordinating vector search, graph relationships, and conversation history with automatic context assembly',
      capabilities: [
        'Auto-context assembly from ChromaDB + Neo4j + history',
        'Token-aware context windowing',
        'Relevance scoring and pruning',
        'Multi-session memory isolation',
      ],
      metricValue: '75%',
      metricLabel: 'Faster Context Retrieval',
    },

    // 4. Checkpoint
    {
      packageName: '@hive-academy/langgraph-checkpoint',
      businessHeadline: 'State Persistence Without Manual Snapshot Management',
      painPoint:
        'Manual state persistence, recovery, branching, and compaction for every workflow error or debugging session',
      solution:
        'Auto-fallback checkpoint system with 8 specialized services for seamless state management from memory to production databases',
      capabilities: [
        'Auto-fallback from MemorySaver to Redis/PostgreSQL',
        'Checkpoint compaction and migration',
        'Recovery strategies for automatic error recovery',
        'Point-in-time state snapshots',
      ],
      metricValue: '80%',
      metricLabel: 'Less State Management Code',
    },

    // 5. Functional API
    {
      packageName: '@hive-academy/langgraph-functional-api',
      businessHeadline: 'Declarative Workflows with NestJS Decorators',
      painPoint:
        'Manual StateGraph construction with verbose addNode, addEdge, and compile calls for every workflow definition',
      solution:
        'NestJS-style decorators (@Workflow, @Node, @Edge) that compile to executable StateGraphs via metadata processing',
      capabilities: [
        'Task-based workflows with @Entrypoint/@Task',
        'Node-based graphs with @Node/@Edge',
        'Automatic metadata compilation',
        'Full TypeScript type safety',
      ],
      metricValue: '70%',
      metricLabel: 'Less Workflow Code',
    },

    // 6. Multi-Agent
    {
      packageName: '@hive-academy/langgraph-multi-agent',
      businessHeadline: 'Agent Coordination Without Manual Orchestration',
      painPoint:
        'Manual agent message routing, state aggregation, retry logic, and error recovery for every multi-agent workflow',
      solution:
        '5 declarative topology patterns (Supervisor, Swarm, Hierarchical, Sequential, Network) with 16+ specialized coordination services',
      capabilities: [
        'LLM-powered supervisor routing',
        'Autonomous swarm collaboration',
        'Command pattern for retry/skip/error recovery',
        'HITL integration for human approval',
      ],
      metricValue: '65%',
      metricLabel: 'Less Coordination Code',
    },

    // 7. Platform
    {
      packageName: '@hive-academy/langgraph-platform',
      businessHeadline: 'LangGraph Cloud Integration Without HTTP Boilerplate',
      painPoint:
        'Manual HTTP client setup for LangGraph Platform API with retry logic, webhook handling, and thread management',
      solution:
        'Production-ready Platform client with automatic retry policies, hybrid local/cloud deployment, and managed state persistence',
      capabilities: [
        'Full Platform API support (assistants, threads, runs)',
        'Exponential backoff retry policy',
        'Webhook integration for async workflows',
        'Cron-scheduled workflow execution',
      ],
      metricValue: '75%',
      metricLabel: 'Less Platform Integration Code',
    },

    // 8. Time-Travel
    {
      packageName: '@hive-academy/langgraph-time-travel',
      businessHeadline:
        'Production Debugging with Temporal Workflow Navigation',
      painPoint:
        'No way to replay production workflows, branch timelines, or modify state for debugging without affecting live users',
      solution:
        'Time-travel debugging system with workflow replay, branch management, and state restoration for production issue investigation',
      capabilities: [
        'Replay workflows from any checkpoint',
        'Create alternate timelines for A/B testing',
        'Modify state for debugging sessions',
        'Production-safe debugging mode',
      ],
      metricValue: '90%',
      metricLabel: 'Faster Production Debugging',
    },

    // 9. Monitoring
    {
      packageName: '@hive-academy/langgraph-monitoring',
      businessHeadline:
        'Ecosystem-Wide Observability Without Manual Instrumentation',
      painPoint:
        'Manual metric collection, alerting setup, dashboard creation, and performance tracking for each workflow and service',
      solution:
        'Facade pattern coordinating 5 monitoring services with automatic Prometheus instrumentation across all 13 libraries',
      capabilities: [
        'Automatic instrumentation of all ecosystem libraries',
        'Prometheus backend for production metrics',
        'Rule-based alerting with webhook/email/Slack',
        'Performance tracking for latency and throughput',
      ],
      metricValue: '85%',
      metricLabel: 'Less Monitoring Code',
    },

    // 10. HITL (Human-in-the-Loop)
    {
      packageName: '@hive-academy/langgraph-hitl',
      businessHeadline:
        'Enterprise Approval Workflows with ML Confidence Scoring',
      painPoint:
        'Manual approval request creation, timeout management, notification sending, and confidence scoring for every human decision point',
      solution:
        '16 specialized services with ML-powered confidence scoring reducing approval overhead by 60% through intelligent auto-approval',
      capabilities: [
        'ML confidence scoring for auto-approval',
        'Multi-level approval chains',
        'Timeout management with fallback strategies',
        'Audit logging of all approval decisions',
      ],
      metricValue: '60%',
      metricLabel: 'Less Approval Overhead',
    },

    // 11. Streaming
    {
      packageName: '@hive-academy/langgraph-streaming',
      businessHeadline:
        'Real-Time Workflow Streaming Without WebSocket Complexity',
      painPoint:
        'Manual WebSocket gateway setup, stream coordination, backpressure handling, and event broadcasting for every real-time workflow',
      solution:
        'WorkflowStreamingOrchestrator replacing 75+ lines of manual orchestration with production-ready WebSocket gateway and RxJS observables',
      capabilities: [
        'One-liner workflow execution + streaming setup',
        'Token/event/progress streaming decorators',
        'Production WebSocket with auth and rate limiting',
        'Automatic backpressure and reconnection',
      ],
      metricValue: '75%',
      metricLabel: 'Less Streaming Code',
    },
  ];
}
