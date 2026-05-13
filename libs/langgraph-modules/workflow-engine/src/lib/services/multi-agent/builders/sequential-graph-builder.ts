import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { StateGraph, END } from '@langchain/langgraph';
import type {
  MultiAgentConfig,
  SequentialConfig,
} from '../../../decorators/multi-agent/multi-agent.decorator';
import { isSequentialConfig } from '../../../decorators/multi-agent/multi-agent.decorator';
import { getAgentConfig } from '../../../decorators/multi-agent/agent.decorator';

import { MetadataProcessorService } from '../../../core/metadata-processor.service';
import type { IMultiAgentGraphBuilder } from './i-multi-agent-graph-builder.interface';
import { SequentialGraphBuilderError } from '../errors';

/**
 * SequentialGraphBuilder - Linear Agent Execution Pattern Implementation
 *
 * PATTERN: Sequential execution where each agent's output flows to the next agent.
 *
 * CRITICAL DIFFERENCE FROM SUPERVISOR PATTERN:
 * - Supervisor: Workers as DynamicStructuredTool, LLM-based routing, conditional loops
 * - Sequential: Agents as subgraph nodes, linear edge chain, NO loops
 *
 * Graph Structure:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                      User Input                             │
 * └────────────────────┬────────────────────────────────────────┘
 *                      │
 *                      ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Agent 1 (Subgraph Node)                                    │
 * │  - Has internal @Node/@Edge workflow                        │
 * │  - Compiled and executed as subgraph                        │
 * │  - Output appended to state                                 │
 * └────────────────────┬────────────────────────────────────────┘
 *                      │ (linear edge)
 *                      ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Agent 2 (Subgraph Node)                                    │
 * │  - Receives Agent 1 output in state                         │
 * │  - Processes and appends to state                           │
 * └────────────────────┬────────────────────────────────────────┘
 *                      │ (linear edge)
 *                      ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Agent N (Subgraph Node)                                    │
 * │  - Final agent in sequence                                  │
 * │  - Produces final output                                    │
 * └────────────────────┬────────────────────────────────────────┘
 *                      │ (edge to END)
 *                      ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │                         END                                 │
 * └─────────────────────────────────────────────────────────────┘
 *
 * KEY PATTERN ELEMENTS:
 * 1. Each agent compiled as subgraph node (NOT tool)
 * 2. Linear edge chain: agent[0] → agent[1] → ... → agent[n] → END
 * 3. No conditional routing (simple linear flow)
 * 4. State propagates sequentially through chain
 * 5. No graph loops (unlike supervisor pattern)
 *
 * USE CASE EXAMPLE:
 * - Document processing pipeline: extract → analyze → summarize → format
 * - Multi-stage analysis: research → synthesize → validate → report
 * - Linear workflows where each step requires previous step's output
 *
 * CONFIGURATION:
 * ```typescript
 * @MultiAgent({
 *   topology: 'sequential',
 *   agents: [ExtractorAgent, AnalyzerAgent, SummarizerAgent],
 *   config: {
 *     sequence: ['extractor', 'analyzer', 'summarizer'],
 *     stopOnFailure: true, // Optional: fail-fast on error
 *   },
 * })
 * ```
 *
 * @implements {IMultiAgentGraphBuilder}
 */
@Injectable()
export class SequentialGraphBuilder implements IMultiAgentGraphBuilder {
  readonly topology = 'sequential';
  private readonly logger = new Logger(SequentialGraphBuilder.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly metadataProcessor: MetadataProcessorService
  ) {}

  /**
   * Build LangGraph sequential pattern graph
   *
   * IMPLEMENTATION STEPS:
   * 1. Validate sequential configuration (SequentialConfig schema)
   * 2. Build each agent as subgraph node
   * 3. Create StateGraph with standard message channels
   * 4. Add agent subgraphs as nodes
   * 5. Create linear edge chain
   * 6. Connect last agent to END
   * 7. Set first agent as entry point
   * 8. Return StateGraph ready for compilation
   *
   * ARCHITECTURE ASSESSMENT:
   * - Complexity Level: 2 (Business Logic Present)
   * - Patterns Applied: Strategy Pattern (implements IMultiAgentGraphBuilder), Builder Pattern
   * - Patterns Rejected: DDD (no complex domain rules), CQRS (no read/write separation)
   * - SOLID Principles: Single Responsibility (builds sequential graphs only), Dependency Inversion (depends on abstractions)
   *
   * @param config - Multi-agent configuration with sequential topology
   * @param workflowClass - Workflow class (supervisor class parameter, not used in sequential pattern)
   * @returns StateGraph with linear agent chain structure
   * @throws SequentialGraphBuilderError if validation fails or graph construction fails
   */
  async buildGraph<
    TState extends Record<string, unknown> = Record<string, unknown>
  >(config: MultiAgentConfig, workflowClass: any): Promise<StateGraph<TState>> {
    this.logger.debug(
      `Building sequential graph for ${
        workflowClass?.name || 'multi-agent workflow'
      }`
    );

    try {
      // 1. Validate sequential configuration
      this.validateConfig(config);
      const sequentialConfig = config.config as SequentialConfig;

      this.logger.debug(
        `Sequential config validated: ${sequentialConfig.sequence.length} agents in sequence`
      );

      // 2. Build agent subgraphs for each agent in sequence
      const agentSubgraphs = await this.buildAgentSubgraphs(config.agents);
      this.logger.debug(
        `Built ${agentSubgraphs.length} agent subgraphs: ${agentSubgraphs
          .map((a) => a.id)
          .join(', ')}`
      );

      // 3. Create StateGraph with standard message channels
      const graph = new StateGraph<TState>({
        channels: {
          messages: {
            value: (existing: any[], updates: any[]) => [
              ...(existing || []),
              ...(updates || []),
            ],
          },
          metadata: {
            value: (existing: any, updates: any) => ({
              ...(existing || {}),
              ...(updates || {}),
            }),
          },
        },
      } as any);

      // 4. Add each agent as a node
      for (const { id, compiledGraph } of agentSubgraphs) {
        // @ts-expect-error - LangGraph's complex conditional types cause issues with strict mode
        // Handler signature is correct: compiled graph is a valid node handler
        graph.addNode(id, async (state: TState) => {
          this.logger.debug(`Executing agent node: ${id}`);
          const result = await compiledGraph.invoke(state);
          return result as Partial<TState>;
        });
        this.logger.debug(`Added agent node: ${id}`);
      }

      // 5. Create linear edge chain based on sequence order
      for (let i = 0; i < sequentialConfig.sequence.length - 1; i++) {
        const currentAgent = sequentialConfig.sequence[i];
        const nextAgent = sequentialConfig.sequence[i + 1];
        graph.addEdge(currentAgent as any, nextAgent as any);
        this.logger.debug(`Added edge: ${currentAgent} → ${nextAgent}`);
      }

      // 6. Connect last agent to END
      const lastAgent =
        sequentialConfig.sequence[sequentialConfig.sequence.length - 1];
      graph.addEdge(lastAgent as any, END);
      this.logger.debug(`Added edge: ${lastAgent} → END`);

      // 7. Set first agent as entry point
      const entryAgent = sequentialConfig.sequence[0];
      graph.setEntryPoint(entryAgent as any);
      this.logger.debug(`Set entry point: ${entryAgent}`);

      this.logger.log(
        `Sequential graph built successfully with ${agentSubgraphs.length} agents in linear chain`
      );
      return graph as any;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to build sequential graph: ${errorMessage}`,
        errorStack
      );
      throw new SequentialGraphBuilderError(
        `Failed to build sequential graph: ${errorMessage}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate sequential-specific configuration
   *
   * VALIDATION RULES:
   * - Config must be SequentialConfig type (not supervisor, swarm, etc.)
   * - sequence array is required and non-empty
   * - sequence length must match agents length (each sequence entry needs agent class)
   * - Each agent ID in sequence must have corresponding @Agent decorated class
   * - Agents array must not be empty
   *
   * ARCHITECTURE PRINCIPLE:
   * - Level 2 complexity: Business rules present (sequence validation)
   * - SOLID: Single Responsibility (validates sequential config only)
   * - DRY: Reuses isSequentialConfig type guard
   *
   * @param config - Multi-agent configuration to validate
   * @throws SequentialGraphBuilderError if validation fails
   */
  validateConfig(config: MultiAgentConfig): void {
    // 1. Validate config type is sequential
    if (!isSequentialConfig(config.config)) {
      throw new SequentialGraphBuilderError(
        'Invalid sequential configuration: config.config must be SequentialConfig type with sequence array'
      );
    }

    const sequentialConfig = config.config as SequentialConfig;

    // 2. Validate sequence array exists and non-empty
    if (!sequentialConfig.sequence || sequentialConfig.sequence.length === 0) {
      throw new SequentialGraphBuilderError(
        'Sequential sequence array is required and must not be empty'
      );
    }

    // 3. Validate agents array exists and non-empty
    if (!config.agents || config.agents.length === 0) {
      throw new SequentialGraphBuilderError(
        'Sequential workflow must have at least one agent class in config.agents'
      );
    }

    // 4. Validate sequence length matches agents length
    if (sequentialConfig.sequence.length !== config.agents.length) {
      this.logger.warn(
        `Sequence length (${sequentialConfig.sequence.length}) does not match agents length (${config.agents.length}). ` +
          `Some agents may not be included in the sequence.`
      );
    }

    // 5. Validate each agent in sequence has corresponding @Agent decorated class
    const agentIds = config.agents
      .map((AgentClass) => {
        const agentConfig = getAgentConfig(AgentClass);
        return agentConfig?.id;
      })
      .filter(Boolean);

    const invalidRefs = sequentialConfig.sequence.filter(
      (agentId) => !agentIds.includes(agentId)
    );

    if (invalidRefs.length > 0) {
      throw new SequentialGraphBuilderError(
        `Sequential sequence contains unknown agent IDs: ${invalidRefs.join(
          ', '
        )}. ` + `Available agents: ${agentIds.join(', ')}`
      );
    }

    this.logger.debug('Sequential configuration validated successfully');
  }

  /**
   * Build agent subgraphs for all agents in sequence
   *
   * PATTERN: Each agent is a workflow with internal @Node/@Edge decorators.
   * We extract the workflow definition and compile it as a subgraph.
   *
   * CRITICAL DIFFERENCE FROM SUPERVISOR PATTERN:
   * - Supervisor: Workers wrapped as DynamicStructuredTool (tools, not subgraphs)
   * - Sequential: Agents compiled as subgraph nodes (direct execution)
   *
   * WORKFLOW:
   * 1. For each agent class in config.agents:
   *    - Extract agent metadata (@Agent decorator)
   *    - Extract workflow definition (@Node/@Edge decorators)
   *    - Validate agent has nodes (not empty workflow)
   *    - Build agent subgraph from definition
   *    - Compile subgraph
   *    - Store with agent ID
   *
   * ARCHITECTURE PRINCIPLE:
   * - Level 2 complexity: Business logic (subgraph compilation)
   * - SOLID: Single Responsibility (builds agent subgraphs only)
   * - DRY: Reuses buildAgentSubgraph() for graph construction
   *
   * @param agentClasses - Agent classes decorated with @Agent
   * @returns Array of agent subgraphs with IDs
   * @throws SequentialGraphBuilderError if agent missing @Agent or has no nodes
   */
  private async buildAgentSubgraphs(
    agentClasses: any[]
  ): Promise<Array<{ id: string; compiledGraph: any }>> {
    const subgraphs: Array<{ id: string; compiledGraph: any }> = [];

    for (const AgentClass of agentClasses) {
      try {
        // 1. Extract agent metadata from @Agent decorator
        const agentConfig = getAgentConfig(AgentClass);
        if (!agentConfig) {
          throw new SequentialGraphBuilderError(
            `Agent ${AgentClass.name} is not decorated with @Agent. ` +
              `All agents in sequential workflow must have @Agent decorator.`
          );
        }

        this.logger.debug(`Processing agent: ${agentConfig.id}`);

        // 2a. Get agent instance from NestJS DI (required for bound handlers)
        const agentInstance = this.moduleRef.get(AgentClass, {
          strict: false,
        });

        // 2b. Extract workflow definition from @Node/@Edge decorators
        const agentDefinition =
          this.metadataProcessor.extractWorkflowDefinition(AgentClass);

        // 2c. ✅ FIX: Bind all node handlers to agent instance (fixes 'this' context)
        agentDefinition.nodes.forEach((node: any) => {
          if (node.handler && agentInstance) {
            // Bind handler to instance so 'this' works inside agent methods
            node.handler = node.handler.bind(agentInstance);
          }
        });

        // 3. Validate agent has nodes (not empty workflow)
        if (!agentDefinition.nodes || agentDefinition.nodes.length === 0) {
          throw new SequentialGraphBuilderError(
            `Agent ${AgentClass.name} has no @Node decorators (empty workflow). ` +
              `Agents in sequential workflow must have internal workflow nodes.`
          );
        }

        // 4. Build and compile agent subgraph with bound handlers
        const agentGraph = this.buildAgentSubgraph(agentDefinition);
        const compiledGraph = agentGraph.compile();

        subgraphs.push({
          id: agentConfig.id,
          compiledGraph,
        });

        this.logger.debug(
          `Built agent subgraph: ${agentConfig.id} (${agentDefinition.nodes.length} nodes)`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Failed to build subgraph for agent ${AgentClass.name}: ${errorMessage}`,
          errorStack
        );
        throw new SequentialGraphBuilderError(
          `Failed to build subgraph for agent ${AgentClass.name}: ${errorMessage}`,
          error instanceof Error ? error : undefined
        );
      }
    }

    return subgraphs;
  }

  /**
   * Build agent subgraph from workflow definition
   *
   * PATTERN: Reuses existing graph building logic from MetadataProcessorService.
   * This handles @Node/@Edge decorators for agent internal workflows.
   *
   * GRAPH CONSTRUCTION:
   * 1. Create StateGraph with channels from definition
   * 2. Add nodes from definition (node.id → node.handler)
   * 3. Add edges from definition:
   *    - Simple edges: graph.addEdge(from, to)
   *    - Conditional edges: graph.addConditionalEdges(from, condition, routes)
   * 4. Set entry point from definition
   *
   * NOTE: This is a temporary implementation duplicating MetadataProcessorService logic.
   * Future: MetadataProcessorService should expose buildStateGraph() as public method.
   *
   * ARCHITECTURE PRINCIPLE:
   * - Level 1 complexity: Simple graph construction (no business rules)
   * - SOLID: Single Responsibility (builds graph from definition)
   * - KISS: Simple, straightforward graph assembly
   *
   * @param definition - Workflow definition from MetadataProcessorService.extractWorkflowDefinition()
   * @returns StateGraph ready for compilation
   */
  private buildAgentSubgraph(definition: any): StateGraph<any> {
    // 1. Create StateGraph with channels from definition
    const graph = new StateGraph(definition.channels);

    // 2. Add nodes from definition
    definition.nodes.forEach((node: any) => {
      graph.addNode(node.id, node.handler);
    });

    // 3. Add edges from definition
    definition.edges.forEach((edge: any) => {
      if (typeof edge.to === 'string') {
        // Simple edge
        graph.addEdge(edge.from, edge.to);
      } else {
        // Conditional edge
        graph.addConditionalEdges(edge.from, edge.to.condition, edge.to.routes);
      }
    });

    // 4. Set entry point
    graph.setEntryPoint(definition.entryPoint);

    return graph;
  }
}
