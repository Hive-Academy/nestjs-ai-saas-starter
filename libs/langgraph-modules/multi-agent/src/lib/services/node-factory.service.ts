import { Injectable, Logger } from '@nestjs/common';
import { AIMessage } from '@langchain/core/messages';
// BaseLanguageModelInterface import removed as it's not used
import type { RunnableConfig } from '@langchain/core/runnables';
import {
  AgentDefinition,
  AgentState,
  SupervisorConfig,
  SwarmConfig,
  RoutingDecision,
  HandoffTool,
  MULTI_AGENT_CONSTANTS,
} from '../interfaces/multi-agent.interface';
import { LlmProviderService } from './llm-provider.service';
import { ToolNodeService } from '../tools/tool-node.service';

/**
 * Service for creating LangGraph node functions
 * Focuses on node creation and agent execution logic
 */
@Injectable()
export class NodeFactoryService {
  private readonly logger = new Logger(NodeFactoryService.name);

  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly toolNodeService: ToolNodeService
  ) {}

  /**
   * Create supervisor node following 2025 LangGraph patterns
   */
  async createSupervisorNode(
    agents: readonly AgentDefinition[],
    config: SupervisorConfig
  ): Promise<
    (
      state: AgentState,
      runConfig?: RunnableConfig
    ) => Promise<Partial<AgentState>>
  > {
    const llm = await this.llmProvider.getLLM(config.llm);

    return async (state: AgentState): Promise<Partial<AgentState>> => {
      try {
        const workerDescriptions = agents
          .filter((agent) => config.workers.includes(agent.id))
          .map((agent) => `${agent.name}: ${agent.description}`)
          .join('\n');

        const systemPrompt = config.systemPrompt
          .replace('{workers}', config.workers.join(', '))
          .replace('{worker_descriptions}', workerDescriptions);

        // Create routing tool
        const routingTool = this.createRoutingTool(config);
        const llmWithTools = (llm as any).bindTools([routingTool]);

        const messages = [
          { role: 'system', content: systemPrompt },
          ...state.messages.map((msg) => ({
            role: msg._getType() === 'human' ? 'user' : 'assistant',
            content: msg.content as string,
          })),
        ];

        const response = await llmWithTools.invoke(messages);

        if (response.tool_calls && response.tool_calls.length > 0) {
          const toolCall = response.tool_calls[0];
          const routingDecision = toolCall.args as RoutingDecision;

          this.logger.debug(`Supervisor routing to: ${routingDecision.next}`, {
            reasoning: routingDecision.reasoning,
            task: routingDecision.task,
          });

          return {
            messages: config.enableForwardMessage ? [] : [response],
            next: routingDecision.next,
            task: routingDecision.task,
            metadata: {
              ...state.metadata,
              supervisorReasoning: routingDecision.reasoning,
              routingTimestamp: new Date().toISOString(),
            },
          };
        }

        // Fallback routing
        this.logger.warn(
          'Supervisor failed to make routing decision, ending workflow'
        );
        return {
          messages: [response],
          next: MULTI_AGENT_CONSTANTS.END,
        };
      } catch (error) {
        this.logger.error('Supervisor node execution failed:', error);
        return {
          messages: [
            new AIMessage('Supervisor encountered an error. Ending workflow.'),
          ],
          next: MULTI_AGENT_CONSTANTS.END,
          metadata: {
            ...state.metadata,
            supervisorError:
              error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    };
  }

  /**
   * Create worker node for supervisor pattern
   */
  async createWorkerNode(
    agent: AgentDefinition,
    config: SupervisorConfig
  ): Promise<
    (
      state: AgentState,
      runConfig?: RunnableConfig
    ) => Promise<Partial<AgentState>>
  > {
    return async (state: AgentState): Promise<Partial<AgentState>> => {
      try {
        // Filter messages if configured
        let filteredState = state;
        if (config.removeHandoffMessages) {
          filteredState = this.filterHandoffMessages(state);
        }

        this.logger.debug(`Executing worker agent: ${agent.id}`, {
          task: state.task,
          messageCount: filteredState.messages.length,
        });

        const result = await agent.nodeFunction(filteredState);

        return {
          ...result,
          current: agent.id,
          metadata: {
            ...state.metadata,
            lastAgent: agent.id,
            agentExecutionTime: new Date().toISOString(),
            taskCompleted: state.task,
          },
        };
      } catch (error) {
        this.logger.error(`Worker agent ${agent.id} execution failed:`, error);

        return {
          messages: [
            new AIMessage(
              `Agent ${agent.name} encountered an error: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`
            ),
          ],
          current: agent.id,
          metadata: {
            ...state.metadata,
            lastAgent: agent.id,
            agentError:
              error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    };
  }

  /**
   * Create swarm node with handoff capabilities
   */
  async createSwarmNode(
    agent: AgentDefinition,
    allAgents: readonly AgentDefinition[],
    config: SwarmConfig
  ): Promise<
    (
      state: AgentState,
      runConfig?: RunnableConfig
    ) => Promise<Partial<AgentState>>
  > {
    return async (state: AgentState): Promise<Partial<AgentState>> => {
      try {
        this.logger.debug(`Executing swarm agent: ${agent.id}`, {
          enableDynamicHandoffs: config.enableDynamicHandoffs,
          handoffToolsCount: agent.handoffTools?.length || 0,
        });

        // Execute agent logic
        const result = await agent.nodeFunction(state);

        // Handle handoff tools if configured
        if (config.enableDynamicHandoffs && agent.handoffTools) {
          const handoffDecision = this.checkForHandoff(
            result,
            agent.handoffTools
          );

          if (handoffDecision) {
            this.logger.debug(
              `Agent ${agent.id} initiating handoff to ${handoffDecision.targetAgent}`,
              {
                reason: handoffDecision.reason,
                task: handoffDecision.task,
              }
            );

            // Apply context filter if specified
            const contextFilter = agent.handoffTools.find(
              (tool) => tool.targetAgent === handoffDecision.targetAgent
            )?.contextFilter;

            let filteredResult = result;
            if (contextFilter) {
              const filteredState = contextFilter({ ...state, ...result });
              filteredResult = { ...result, ...filteredState };
            }

            return {
              ...filteredResult,
              next: handoffDecision.targetAgent,
              current: agent.id,
              task: handoffDecision.task,
              metadata: {
                ...state.metadata,
                handoffReason: handoffDecision.reason,
                handoffTimestamp: new Date().toISOString(),
                sourceAgent: agent.id,
              },
            };
          }
        }

        return {
          ...result,
          current: agent.id,
          next: result.next || MULTI_AGENT_CONSTANTS.END,
          metadata: {
            ...state.metadata,
            lastAgent: agent.id,
            agentExecutionTime: new Date().toISOString(),
          },
        };
      } catch (error) {
        this.logger.error(`Swarm agent ${agent.id} execution failed:`, error);

        return {
          messages: [
            new AIMessage(
              `Agent ${agent.name} encountered an error: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`
            ),
          ],
          current: agent.id,
          next: MULTI_AGENT_CONSTANTS.END,
          metadata: {
            ...state.metadata,
            agentError:
              error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    };
  }

  /**
   * Create routing tool for supervisor
   */
  private createRoutingTool(config: SupervisorConfig) {
    return {
      name:
        config.routingTool?.name || MULTI_AGENT_CONSTANTS.DEFAULT_ROUTING_TOOL,
      description:
        config.routingTool?.description || 'Select the next worker to act.',
      schema: {
        type: 'object',
        properties: {
          next: {
            type: 'string',
            enum: [...config.workers, MULTI_AGENT_CONSTANTS.END],
            description: 'The next agent to execute or END to finish',
          },
          reasoning: {
            type: 'string',
            description: 'Reasoning for the routing decision',
          },
          task: {
            type: 'string',
            description: 'Task description for the next agent',
          },
        },
        required: ['next'],
      },
    };
  }

  /**
   * Filter handoff messages from state
   */
  private filterHandoffMessages(state: AgentState): AgentState {
    return {
      ...state,
      messages: state.messages.filter((msg) => {
        const content = msg.content.toString().toLowerCase();
        return (
          !content.includes('route') &&
          !content.includes('transfer_to') &&
          !content.includes('handoff') &&
          !content.includes('routing')
        );
      }),
    };
  }

  /**
   * Check for handoff in agent result
   */
  private checkForHandoff(
    result: Partial<AgentState>,
    handoffTools: HandoffTool[]
  ): { targetAgent: string; task?: string; reason?: string } | null {
    // Check if agent explicitly set next agent
    if (result.next && result.next !== MULTI_AGENT_CONSTANTS.END) {
      const targetTool = handoffTools.find(
        (tool) => tool.targetAgent === result.next
      );
      if (targetTool) {
        return {
          targetAgent: result.next,
          task: result.task,
          reason: `Agent requested handoff via next field`,
        };
      }
    }

    // Check for tool calls in messages (simplified implementation)
    if (result.messages) {
      for (const message of result.messages) {
        if (message._getType() === 'ai' && 'tool_calls' in message) {
          const toolCalls = (message as any).tool_calls || [];
          for (const toolCall of toolCalls) {
            const matchingTool = handoffTools.find(
              (tool) =>
                toolCall.name?.includes(tool.name) ||
                toolCall.name?.includes(tool.targetAgent)
            );
            if (matchingTool) {
              return {
                targetAgent: matchingTool.targetAgent,
                task: toolCall.args?.task || result.task,
                reason: `Agent called handoff tool: ${toolCall.name}`,
              };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Create node execution wrapper with error handling and metrics
   */
  createNodeWrapper<
    T extends (
      state: AgentState,
      config?: RunnableConfig
    ) => Promise<Partial<AgentState>>
  >(
    nodeFunction: T,
    agentId: string,
    nodeType: 'supervisor' | 'worker' | 'swarm'
  ): T {
    const wrappedFunction = async (
      state: AgentState,
      config?: RunnableConfig
    ) => {
      const startTime = Date.now();

      try {
        const result = await nodeFunction(state, config);
        const executionTime = Date.now() - startTime;

        this.logger.debug(
          `Node ${agentId} (${nodeType}) executed successfully`,
          {
            executionTime,
            messageCount: result.messages?.length || 0,
          }
        );

        return {
          ...result,
          metadata: {
            ...result.metadata,
            nodeExecutionTime: executionTime,
            nodeType,
          },
        };
      } catch (error) {
        const executionTime = Date.now() - startTime;

        this.logger.error(`Node ${agentId} (${nodeType}) execution failed`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime,
        });

        throw error;
      }
    };

    return wrappedFunction as unknown as T;
  }

  /**
   * Create intelligent tool-enhanced agent node with weighted coordination
   * Leverages ToolNodeService internally for sophisticated tool management
   */
  async createToolEnhancedAgentNode(
    agent: AgentDefinition,
    toolConfigs: Array<{
      nodeId: string;
      tools: string[];
      weight: number;
      priority: 'low' | 'medium' | 'high';
    }>
  ): Promise<
    (state: AgentState, config?: RunnableConfig) => Promise<Partial<AgentState>>
  > {
    // Create parallel tool executors with weights
    const parallelToolExecutor =
      this.toolNodeService.createParallelToolExecutor(
        toolConfigs.map((config) => ({
          nodeId: config.nodeId,
          tools: config.tools,
          weight: config.weight,
        }))
      );

    // Create prioritized retry tool executors
    const retryableTools = toolConfigs
      .filter((config) => config.priority === 'high')
      .map((config) =>
        this.toolNodeService.createRetryableToolExecutor(
          config.nodeId,
          config.tools,
          { maxRetries: 3, retryDelay: 1000 }
        )
      );

    return async (
      state: AgentState,
      config?: RunnableConfig
    ): Promise<Partial<AgentState>> => {
      try {
        this.logger.debug(`Executing tool-enhanced agent: ${agent.id}`);

        // Execute agent's core logic first
        const agentResult = await agent.nodeFunction(state, config);

        // Execute parallel tools with weighted coordination
        const toolResults = await parallelToolExecutor(agentResult as any);

        // Execute high-priority tools with retry logic if needed
        let enhancedResults = { ...agentResult, ...toolResults };
        for (const retryTool of retryableTools) {
          try {
            const retryResult = await retryTool(enhancedResults as any);
            enhancedResults = { ...enhancedResults, ...retryResult };
          } catch (error) {
            this.logger.warn(
              `High-priority tool failed for agent ${agent.id}:`,
              error
            );
            // Continue with available results
          }
        }

        return {
          ...enhancedResults,
          metadata: {
            ...enhancedResults.metadata,
            toolEnhanced: true,
            toolConfigs: toolConfigs.length,
            executedBy: agent.id,
          },
        };
      } catch (error) {
        this.logger.error(
          `Tool-enhanced agent ${agent.id} execution failed:`,
          error
        );
        throw error;
      }
    };
  }

  /**
   * Create adaptive coordination node that uses weighted tool merging
   * for intelligent decision making across multiple agent outputs
   */
  createAdaptiveCoordinatorNode(coordinatorConfig: {
    agents: AgentDefinition[];
    adaptationRules: Array<{
      condition: (state: AgentState) => boolean;
      toolWeights: Record<string, number>;
      strategy: 'parallel' | 'sequential' | 'weighted';
    }>;
    fallbackStrategy: 'first' | 'majority' | 'weighted_average';
  }): (state: AgentState) => Promise<Partial<AgentState>> {
    return async (state: AgentState): Promise<Partial<AgentState>> => {
      // Determine which adaptation rule applies
      const applicableRule = coordinatorConfig.adaptationRules.find((rule) =>
        rule.condition(state)
      );

      if (!applicableRule) {
        // Use fallback strategy
        return this.executeFallbackStrategy(
          coordinatorConfig.agents,
          coordinatorConfig.fallbackStrategy,
          state
        );
      }

      // Execute strategy with weighted tool coordination
      switch (applicableRule.strategy) {
        case 'parallel':
          return this.executeParallelWithWeights(
            coordinatorConfig.agents,
            applicableRule.toolWeights,
            state
          );

        case 'sequential':
          return this.executeSequentialWithWeights(
            coordinatorConfig.agents,
            applicableRule.toolWeights,
            state
          );

        case 'weighted':
          return this.executeWeightedCoordination(
            coordinatorConfig.agents,
            applicableRule.toolWeights,
            state
          );

        default:
          throw new Error(
            `Unknown coordination strategy: ${applicableRule.strategy}`
          );
      }
    };
  }

  private async executeParallelWithWeights(
    agents: AgentDefinition[],
    toolWeights: Record<string, number>,
    state: AgentState
  ): Promise<Partial<AgentState>> {
    // Create tool configurations with weights
    const toolConfigs = agents.map((agent) => ({
      nodeId: agent.id,
      tools: agent.capabilities || [],
      weight: toolWeights[agent.id] || 1,
    }));

    // Use ToolNodeService for weighted parallel execution
    const parallelExecutor =
      this.toolNodeService.createParallelToolExecutor(toolConfigs);
    const results = await parallelExecutor(state as any);

    return {
      ...results,
      metadata: {
        ...state.metadata,
        coordinationStrategy: 'parallel_weighted',
        agentsInvolved: agents.map((a) => a.id),
      },
    };
  }

  private async executeSequentialWithWeights(
    agents: AgentDefinition[],
    toolWeights: Record<string, number>,
    state: AgentState
  ): Promise<Partial<AgentState>> {
    let currentState = state;
    const executionOrder = agents.sort(
      (a, b) => (toolWeights[b.id] || 1) - (toolWeights[a.id] || 1)
    );

    for (const agent of executionOrder) {
      try {
        const result = await agent.nodeFunction(currentState);
        currentState = { ...currentState, ...result };
      } catch (error) {
        this.logger.error(
          `Sequential execution failed for agent ${agent.id}:`,
          error
        );
        // Continue with next agent
      }
    }

    return {
      ...currentState,
      metadata: {
        ...currentState.metadata,
        coordinationStrategy: 'sequential_weighted',
        executionOrder: executionOrder.map((a) => a.id),
      },
    };
  }

  private async executeWeightedCoordination(
    agents: AgentDefinition[],
    toolWeights: Record<string, number>,
    state: AgentState
  ): Promise<Partial<AgentState>> {
    // Execute all agents and apply sophisticated weighted merging
    const results = await Promise.allSettled(
      agents.map((agent) => agent.nodeFunction(state))
    );

    const mergedResult: Partial<AgentState> = {};

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const agent = agents[index];
        const weight = toolWeights[agent.id] || 1;

        // Use ToolNodeService's weighted merging logic internally
        (this.toolNodeService as any).applyWeightedMerge(
          mergedResult,
          result.value,
          weight
        );
      }
    });

    return {
      ...mergedResult,
      metadata: {
        ...state.metadata,
        coordinationStrategy: 'weighted_merge',
        successfulAgents: results.filter((r) => r.status === 'fulfilled')
          .length,
        totalAgents: agents.length,
      },
    };
  }

  private async executeFallbackStrategy(
    agents: AgentDefinition[],
    strategy: 'first' | 'majority' | 'weighted_average',
    state: AgentState
  ): Promise<Partial<AgentState>> {
    // Implement fallback strategies using internal tool coordination
    const results = await Promise.allSettled(
      agents.map((agent) => agent.nodeFunction(state))
    );

    const successfulResults = results
      .filter(
        (r): r is PromiseFulfilledResult<Partial<AgentState>> =>
          r.status === 'fulfilled'
      )
      .map((r) => r.value);

    if (successfulResults.length === 0) {
      throw new Error('All agents failed in fallback strategy');
    }

    switch (strategy) {
      case 'first': {
        return successfulResults[0];
      }
      case 'majority': {
        // Simple majority vote on next action
        const nextActions = successfulResults
          .map((r) => r.next)
          .filter(Boolean);
        const majority = this.findMajority(nextActions);
        return { ...successfulResults[0], next: majority };
      }
      case 'weighted_average': {
        // Use equal weights for fallback
        const averaged: Partial<AgentState> = {};
        successfulResults.forEach((result) => {
          (this.toolNodeService as any).applyWeightedMerge(
            averaged,
            result,
            1 / successfulResults.length
          );
        });
        return averaged;
      }

      default:
        return successfulResults[0];
    }
  }

  private findMajority<T>(items: T[]): T {
    const counts = items.reduce((acc, item) => {
      acc.set(item, (acc.get(item) || 0) + 1);
      return acc;
    }, new Map<T, number>());

    let maxCount = 0;
    let majorityItem = items[0];

    counts.forEach((count, item) => {
      if (count > maxCount) {
        maxCount = count;
        majorityItem = item;
      }
    });

    return majorityItem;
  }
}
