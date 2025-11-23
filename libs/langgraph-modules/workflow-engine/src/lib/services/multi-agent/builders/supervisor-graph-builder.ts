import { Injectable, Logger, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { StateGraph, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import {
  DynamicStructuredTool,
  tool,
  ToolRuntime,
} from '@langchain/core/tools';
import { z } from 'zod';
import { WorkflowAuthContext } from '../../../interfaces/auth-context.interface';
import type {
  MultiAgentConfig,
  SupervisorConfig,
} from '../../../decorators/multi-agent/multi-agent.decorator';
import { isSupervisorConfig } from '../../../decorators/multi-agent/multi-agent.decorator';
import { getAgentConfig } from '../../../decorators/multi-agent/agent.decorator';
import type { WorkflowState } from '../../../interfaces/workflow-engine.interface';
import { LlmProviderService } from '../../llm/llm-provider.service';
import { MetadataProcessorService } from '../../../core/metadata-processor.service';
import type { IMultiAgentGraphBuilder } from './i-multi-agent-graph-builder.interface';
import { SupervisorGraphBuilderError } from '../errors';
import type { LLMWithTools } from '../../../types/internal-types';

/**
 * SupervisorGraphBuilder - LangGraph 1.0 Supervisor Pattern Implementation
 *
 * CRITICAL IMPLEMENTATION: This builder fixes the core architectural flaw in the previous
 * multi-agent system by implementing the correct LangGraph 1.0 supervisor pattern.
 *
 * ❌ OLD (BROKEN): Workers as subgraph nodes added to supervisor graph
 * ✅ NEW (CORRECT): Workers as LangChain tools bound to supervisor LLM
 *
 * LANGGRAPH 1.0 PATTERN (Exact Implementation):
 *
 * Graph Structure:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                      User Input                             │
 * └────────────────────┬────────────────────────────────────────┘
 *                      │
 *                      ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Supervisor Node (LLM with bound tools)                     │
 * │  - Invokes tool-bound LLM to decide next action            │
 * │  - Returns AIMessage with tool_calls OR final response      │
 * └────────────────────┬────────────────────────────────────────┘
 *                      │
 *                      ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Conditional Router: shouldExecuteTools()                   │
 * │  - Checks lastMessage.tool_calls                            │
 * │  - tool_calls present? → 'tools'                            │
 * │  - no tool_calls? → 'continue' (END)                        │
 * └────────┬──────────────────────────┬─────────────────────────┘
 *          │                          │
 *     'tools'                    'continue'
 *          │                          │
 *          ▼                          ▼
 * ┌─────────────────┐        ┌──────────────┐
 * │   ToolNode      │        │     END      │
 * │   Executes      │        └──────────────┘
 * │   worker tools  │
 * └────────┬────────┘
 *          │
 *          │ (loop back)
 *          ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Supervisor Node (with tool results)                        │
 * │  - Analyzes tool results                                    │
 * │  - Decides: call another tool OR finalize                   │
 * └─────────────────────────────────────────────────────────────┘
 *
 * KEY PATTERN ELEMENTS:
 * 1. Workers wrapped as DynamicStructuredTool instances
 * 2. Tools bound to supervisor LLM via llm.bindTools(workerTools)
 * 3. Supervisor node invokes tool-bound LLM
 * 4. ToolNode executes selected worker tools
 * 5. Conditional routing based on tool_calls presence
 * 6. Graph loop: tools → supervisor → (if tool_calls) → tools → ...
 *
 * PATTERN REFERENCE:
 * - LangGraph Multi-Agent Supervisor Tutorial
 * - "The supervisor can be thought of as an agent whose tools are other agents"
 *
 * @implements {IMultiAgentGraphBuilder}
 */
@Injectable()
export class SupervisorGraphBuilder implements IMultiAgentGraphBuilder {
  readonly topology = 'supervisor';
  private readonly logger = new Logger(SupervisorGraphBuilder.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly llmProvider: LlmProviderService,
    private readonly metadataProcessor: MetadataProcessorService
  ) {}

  /**
   * Build LangGraph supervisor pattern graph
   *
   * IMPLEMENTATION STEPS (LangGraph 1.0 Pattern):
   * 1. Validate supervisor configuration (SupervisorConfig schema)
   * 2. Convert worker agents to LangChain DynamicStructuredTool instances
   * 3. Get supervisor LLM and bind worker tools
   * 4. Create StateGraph with supervisor/tools nodes
   * 5. Add conditional routing (shouldExecuteTools)
   * 6. Create tools → supervisor loop
   * 7. Return StateGraph ready for compilation
   *
   * @param config - Multi-agent configuration with supervisor topology
   * @param supervisorClass - Supervisor workflow class (not used in LangGraph 1.0 pattern)
   * @returns StateGraph with supervisor pattern structure
   * @throws SupervisorGraphBuilderError if validation fails or graph construction fails
   */
  // @ts-expect-error - LangGraph StateGraph generic type mismatch with WorkflowState
  async buildGraph<TState extends WorkflowState = WorkflowState>(
    config: MultiAgentConfig,
    supervisorClass: any
  ): Promise<StateGraph<TState>> {
    this.logger.debug(
      `Building supervisor graph for ${
        supervisorClass?.name || 'multi-agent workflow'
      }`
    );

    try {
      // 1. Validate supervisor configuration
      this.validateConfig(config);
      const supervisorConfig = config.config as SupervisorConfig;

      this.logger.debug(
        `Supervisor config validated: ${supervisorConfig.workers.length} workers`
      );

      // 2. Convert worker agent classes to LangChain tools
      const workerTools = await this.createWorkerTools(config.agents);
      this.logger.debug(
        `Created ${workerTools.length} worker tools: ${workerTools
          .map((t) => t.name)
          .join(', ')}`
      );

      // 3. Get supervisor LLM and bind worker tools
      const supervisorLLM = (await this.llmProvider.getLLM({
        temperature: supervisorConfig.llm?.temperature ?? 0.3,
        model: supervisorConfig.llm?.model,
        maxTokens: supervisorConfig.llm?.maxTokens,
      })) as unknown as LLMWithTools;
      const supervisorWithTools = supervisorLLM.bindTools(workerTools);
      this.logger.debug('Bound worker tools to supervisor LLM');

      // 4. Create StateGraph with supervisor pattern channels
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

      // 5. Add supervisor node (invokes tool-bound LLM)
      // @ts-expect-error - LangGraph's complex conditional types cause issues with strict mode
      // Handler signature is correct: (state: TState) => Promise<Partial<TState>>
      graph.addNode('supervisor', async (state: TState) => {
        this.logger.debug('Supervisor node invoked');

        // Prepend system message with supervisor prompt
        const systemMessage = {
          role: 'system',
          content: supervisorConfig.systemPrompt,
        };
        const messages = [systemMessage, ...(state.messages || [])];

        // Invoke tool-bound LLM with current messages
        const response = (await supervisorWithTools.invoke(messages)) as any;

        // Log tool calls if present
        if (response.tool_calls && response.tool_calls.length > 0) {
          this.logger.debug(
            `Supervisor selected tools: ${response.tool_calls
              .map((tc: any) => tc.name)
              .join(', ')}`
          );
        } else {
          this.logger.debug('Supervisor finalized (no tool calls)');
        }

        // Append supervisor response to messages
        return {
          messages: [response],
        } as Partial<TState>;
      });

      // 6. Add ToolNode for worker execution
      const toolNode = new ToolNode(workerTools);
      // @ts-expect-error - LangGraph's complex conditional types cause issues with strict mode
      graph.addNode('tools' as any, toolNode as any);
      this.logger.debug('Added ToolNode for worker execution');

      // 7. Add conditional routing from supervisor
      graph.addConditionalEdges(
        'supervisor' as any,
        this.shouldExecuteTools.bind(this) as any,
        {
          tools: 'tools',
          continue: END,
        } as any
      );

      // 8. Tools return to supervisor (creates execution loop)
      graph.addEdge('tools' as any, 'supervisor' as any);

      // 9. Set supervisor as entry point
      graph.setEntryPoint('supervisor' as any);

      this.logger.log(
        `Supervisor graph built successfully with ${workerTools.length} workers`
      );
      return graph as any;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to build supervisor graph: ${errorMessage}`,
        errorStack
      );
      throw new SupervisorGraphBuilderError(
        `Failed to build supervisor graph: ${errorMessage}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate supervisor-specific configuration
   *
   * VALIDATION RULES:
   * - Config must be SupervisorConfig type (not sequential, swarm, etc.)
   * - systemPrompt is required (supervisor needs instructions)
   * - workers array is required and non-empty
   * - agents array must match workers array length
   *
   * @param config - Multi-agent configuration to validate
   * @throws SupervisorGraphBuilderError if validation fails
   */
  validateConfig(config: MultiAgentConfig): void {
    // 1. Validate config type is supervisor
    if (!isSupervisorConfig(config.config)) {
      throw new SupervisorGraphBuilderError(
        'Invalid supervisor configuration: config.config must be SupervisorConfig type with systemPrompt and workers'
      );
    }

    const supervisorConfig = config.config as SupervisorConfig;

    // 2. Validate systemPrompt exists
    if (!supervisorConfig.systemPrompt) {
      throw new SupervisorGraphBuilderError(
        'Supervisor systemPrompt is required. Supervisor needs instructions to coordinate workers.'
      );
    }

    // 3. Validate workers array exists and non-empty
    if (!supervisorConfig.workers || supervisorConfig.workers.length === 0) {
      throw new SupervisorGraphBuilderError(
        'Supervisor must have at least one worker agent'
      );
    }

    // 4. Validate agents array exists and non-empty
    if (!config.agents || config.agents.length === 0) {
      throw new SupervisorGraphBuilderError(
        'Supervisor must have at least one agent class in config.agents'
      );
    }

    // 5. Validate workers array length matches agents array length
    if (supervisorConfig.workers.length !== config.agents.length) {
      this.logger.warn(
        `Workers count (${supervisorConfig.workers.length}) does not match agents count (${config.agents.length}). ` +
          `Some workers may not have corresponding agent classes.`
      );
    }

    this.logger.debug('Supervisor configuration validated successfully');
  }

  /**
   * Convert worker agent classes to LangChain DynamicStructuredTool instances
   *
   * CRITICAL PATTERN: Workers as Tools (NOT Subgraph Nodes)
   *
   * Each worker agent becomes a tool with:
   * - name: Agent ID (from @Agent decorator)
   * - description: Agent description + capabilities
   * - schema: Input schema for tool (task description)
   * - func: Executes agent's internal workflow with bound handlers
   *
   * WORKER EXECUTION FLOW:
   * 1. Supervisor LLM decides to call worker tool
   * 2. ToolNode executes worker tool's func()
   * 3. func() gets agent instance from NestJS DI container
   * 4. func() extracts agent's workflow definition
   * 5. func() binds node handlers to agent instance (fixes 'this' context)
   * 6. func() builds agent's internal workflow graph with bound handlers
   * 7. func() executes agent graph with task input
   * 8. func() returns result as string (tool output)
   *
   * @param agentClasses - Worker agent classes decorated with @Agent
   * @returns Array of LangChain DynamicStructuredTool instances
   * @throws SupervisorGraphBuilderError if agent missing @Agent decorator or graph build fails
   */
  private async createWorkerTools(
    agentClasses: Type<any>[]
  ): Promise<DynamicStructuredTool[]> {
    const tools: DynamicStructuredTool[] = [];

    for (const AgentClass of agentClasses) {
      try {
        // 1. Extract agent metadata from @Agent decorator
        const agentConfig = getAgentConfig(AgentClass);
        if (!agentConfig) {
          throw new SupervisorGraphBuilderError(
            `Agent ${AgentClass.name} is not decorated with @Agent. ` +
              `All worker agents must have @Agent decorator.`
          );
        }

        this.logger.debug(`Processing worker agent: ${agentConfig.id}`);

        // 2. Create tool schema (supervisor provides task description)
        const toolSchema = z.object({
          task: z
            .string()
            .describe('Task description for the agent to execute'),
          context: z
            .record(z.any())
            .optional()
            .describe('Optional context metadata'),
        });

        // 3. Create DynamicStructuredTool wrapping agent execution
        // 3. Create DynamicStructuredTool wrapping agent execution
        const agentTool = tool(
          async (
            input: {
              task: string;
              context?: Record<string, any>;
            },
            runtime: ToolRuntime<any, WorkflowAuthContext>
          ) => {
            // AUTH ENFORCEMENT
            if (agentConfig.auth?.required) {
              const user = runtime.context?.user;

              if (!user) {
                return JSON.stringify({
                  error: true,
                  message: 'Authentication required',
                  agent: agentConfig.id,
                  timestamp: new Date().toISOString(),
                });
              }

              // Role validation
              if (agentConfig.auth.roles?.length) {
                const hasRole = agentConfig.auth.roles.some((r) =>
                  user.roles.includes(r)
                );
                if (!hasRole) {
                  return JSON.stringify({
                    error: true,
                    message: `Requires role: ${agentConfig.auth.roles.join(
                      ' or '
                    )}`,
                    agent: agentConfig.id,
                    timestamp: new Date().toISOString(),
                  });
                }
              }

              // Tier validation
              if (agentConfig.auth.tiers?.length) {
                if (!agentConfig.auth.tiers.includes(user.tier)) {
                  return JSON.stringify({
                    error: true,
                    message: `Requires ${agentConfig.auth.tiers.join(
                      ' or '
                    )} tier`,
                    agent: agentConfig.id,
                    timestamp: new Date().toISOString(),
                  });
                }
              }
            }

            this.logger.debug(
              `Executing worker tool: ${agentConfig.id} with task: "${input.task}"`
            );

            try {
              // 4a. Get agent instance from NestJS DI (required for bound handlers)
              const agentInstance = this.moduleRef.get(AgentClass, {
                strict: false,
              });

              // 4b. Extract workflow definition from @Node/@Edge decorators
              const agentDefinition =
                this.metadataProcessor.extractWorkflowDefinition(AgentClass);

              // 4c. ✅ FIX: Bind all node handlers to agent instance (fixes 'this' context)
              agentDefinition.nodes.forEach((node: any) => {
                if (node.handler && agentInstance) {
                  // Bind handler to instance so 'this' works inside agent methods
                  node.handler = node.handler.bind(agentInstance);
                }
              });

              // 4d. Build agent subgraph with bound handlers
              const agentGraph = this.buildAgentSubgraph(agentDefinition);
              const compiledAgent = agentGraph.compile();

              // 5. Execute agent with task input
              const initialState = {
                messages: [{ role: 'user', content: input.task }],
                metadata: { ...(input.context || {}) },
              };

              const result = await compiledAgent.invoke(initialState);

              // 6. Extract result from agent state
              const lastMessage = result.messages?.[result.messages.length - 1];
              const toolOutput =
                lastMessage?.content || JSON.stringify(result.metadata);

              this.logger.debug(
                `Worker tool ${agentConfig.id} completed successfully`
              );
              return toolOutput;
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              const errorStack =
                error instanceof Error ? error.stack : undefined;
              this.logger.error(
                `Worker tool ${agentConfig.id} failed: ${errorMessage}`,
                errorStack
              );

              // Return error as tool output (let LLM see error and retry)
              return JSON.stringify({
                error: true,
                message: `Worker ${agentConfig.id} failed: ${errorMessage}`,
                agent: agentConfig.id,
                timestamp: new Date().toISOString(),
              });
            }
          },
          {
            name: agentConfig.id,
            description: this.generateToolDescription(agentConfig),
            schema: toolSchema,
          }
        ) as any as DynamicStructuredTool;

        tools.push(agentTool);
        this.logger.debug(`Created worker tool: ${agentTool.name}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Failed to create worker tool for ${AgentClass.name}: ${errorMessage}`,
          errorStack
        );
        throw new SupervisorGraphBuilderError(
          `Failed to create worker tool for ${AgentClass.name}: ${errorMessage}`,
          error instanceof Error ? error : undefined
        );
      }
    }

    return tools;
  }

  /**
   * Generate tool description from agent config
   *
   * DESCRIPTION FORMAT:
   * - Primary description (from @Agent decorator)
   * - Capabilities list (if present)
   * - Priority level (if present)
   * - Execution time estimate (if present)
   *
   * Example:
   * "Analyzes GitHub repositories for technical achievements. Capabilities: repository_analysis, skill_extraction. Priority: high. Execution time: medium"
   *
   * @param agentConfig - Agent configuration from @Agent decorator
   * @returns Formatted tool description for LLM
   */
  private generateToolDescription(agentConfig: any): string {
    const parts = [agentConfig.description];

    if (agentConfig.capabilities && agentConfig.capabilities.length > 0) {
      parts.push(`Capabilities: ${agentConfig.capabilities.join(', ')}`);
    }

    if (agentConfig.priority) {
      parts.push(`Priority: ${agentConfig.priority}`);
    }

    if (agentConfig.executionTime) {
      parts.push(`Execution time: ${agentConfig.executionTime}`);
    }

    return parts.join('. ');
  }

  /**
   * Build agent subgraph from workflow definition
   *
   * PATTERN: Reuses existing graph building logic from MetadataProcessorService
   * This handles @Node/@Edge decorators for agent internal workflows
   *
   * NOTE: This is a temporary implementation. The MetadataProcessorService
   * should expose a buildStateGraph() method for reuse.
   *
   * @param definition - Workflow definition from MetadataProcessorService
   * @returns StateGraph ready for compilation
   */
  private buildAgentSubgraph(definition: any): StateGraph<any> {
    // Create StateGraph with channels from definition
    const graph = new StateGraph(definition.channels);

    // Add nodes from definition
    definition.nodes.forEach((node: any) => {
      graph.addNode(node.id, node.handler);
    });

    // Add edges from definition
    definition.edges.forEach((edge: any) => {
      if (typeof edge.to === 'string') {
        // Simple edge
        graph.addEdge(edge.from, edge.to);
      } else {
        // Conditional edge
        graph.addConditionalEdges(edge.from, edge.to.condition, edge.to.routes);
      }
    });

    // Set entry point
    graph.setEntryPoint(definition.entryPoint);

    return graph;
  }

  /**
   * Conditional router: Check if supervisor response has tool_calls
   *
   * ROUTING LOGIC:
   * - tool_calls present → 'tools' (execute worker tools via ToolNode)
   * - no tool_calls → 'continue' (END workflow, supervisor finalized)
   *
   * CRITICAL: This is the core routing logic for LangGraph 1.0 supervisor pattern.
   * The supervisor LLM decides whether to call tools or finalize by including/omitting
   * tool_calls in its response.
   *
   * @param state - Current workflow state
   * @returns 'tools' if tool_calls present, 'continue' if no tool_calls
   */
  private shouldExecuteTools(state: WorkflowState): 'tools' | 'continue' {
    // Check if state has messages
    if (!state.messages || state.messages.length === 0) {
      this.logger.debug('No messages in state, workflow complete');
      return 'continue';
    }

    // Get last message (supervisor response)
    const lastMessage = state.messages[state.messages.length - 1];

    // Check for tool_calls in LangChain message structure
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      this.logger.debug(
        `Tool calls detected: ${lastMessage.tool_calls
          .map((tc: any) => tc.name)
          .join(', ')}`
      );
      return 'tools';
    }

    // No tool_calls → workflow complete
    this.logger.debug('No tool calls detected, workflow complete');
    return 'continue';
  }
}
