import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { AIMessage } from '@langchain/core/messages';
import { Command } from '@langchain/langgraph';
// BaseLanguageModelInterface import removed as it's not used
import type { RunnableConfig } from '@langchain/core/runnables';
import type { IMemoryAdapter } from '@hive-academy/langgraph-core';
import {
  AgentDefinition,
  AgentState,
  SupervisorConfig,
  SwarmConfig,
  RoutingDecision,
  HandoffTool,
  MULTI_AGENT_CONSTANTS,
} from '../interfaces/multi-agent.interface';
import { LlmProviderService } from '../llm/llm-provider.service';
import { ToolNodeService } from '../tools/tool-node.service';
import { CommandProcessorService } from '../routing/command-processor.service';
import type { Command as InternalCommand } from '../routing/command-processor.service';
import {
  LLMWithTools,
  AIMessageWithToolCalls,
  isAIMessageWithToolCalls,
  ToolNodeServiceWithWeightedMerge,
} from '../types/internal-types';

/**
 * Service for creating LangGraph node functions
 * Focuses on node creation and agent execution logic
 */
@Injectable()
export class NodeFactoryService {
  private readonly logger = new Logger(NodeFactoryService.name);

  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly toolNodeService: ToolNodeService,
    private readonly commandProcessor: CommandProcessorService,
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {}

  /**
   * Process agent result - detect and handle Command objects
   * If result is a Command, process it through CommandProcessorService
   * Otherwise, return the result as-is
   */
  private async processAgentResult(
    result: any,
    state: AgentState,
    sourceNodeId: string
  ): Promise<Partial<AgentState>> {
    // Check if result is a Command object (either from @langchain/langgraph or our internal Command)
    if (this.isCommand(result)) {
      this.logger.debug(`Processing Command from agent ${sourceNodeId}`, {
        goto: result.goto,
        hasUpdate: !!result.update,
      });

      // LangGraph Command only has goto and update properties
      // If there's additional metadata in the update, extract it
      const updateObj =
        result.update && typeof result.update === 'object'
          ? (result.update as Record<string, unknown>)
          : {};

      const internalCommand: InternalCommand = {
        type:
          (updateObj.type as
            | 'goto'
            | 'retry'
            | 'skip'
            | 'stop'
            | 'update'
            | 'end'
            | 'error') || 'goto',
        goto: result.goto as string,
        update: updateObj as Partial<AgentState>,
        reason: updateObj.reason as string | undefined,
        maxAttempts: updateObj.maxAttempts as number | undefined,
        error: updateObj.error ? (updateObj.error as Error).message : undefined,
        params: updateObj.params as Record<string, unknown> | undefined,
        metadata: updateObj.metadata as Record<string, unknown> | undefined,
        timestamp: new Date(),
      };

      // Process command through CommandProcessorService
      return await this.commandProcessor.processCommand(
        internalCommand,
        state,
        {
          sourceNodeId,
          validateCommand: true,
          applyMetadata: true,
        }
      );
    }

    // Not a command - return as-is
    return result;
  }

  /**
   * Check if a value is a Command object
   */
  private isCommand(value: any): value is Command {
    return (
      value &&
      typeof value === 'object' &&
      'goto' in value &&
      typeof value.goto === 'string'
    );
  }

  /**
   * Automagical memory enhancement for agent execution
   * Adds memory context before execution and stores results after
   */
  private async enhanceAgentWithMemory(
    agent: AgentDefinition,
    state: AgentState,
    agentExecution: () => Promise<Partial<AgentState>>
  ): Promise<Partial<AgentState>> {
    try {
      // 1. Enhance state with memory context BEFORE agent execution
      let enhancedState = state;
      if (this.memoryAdapter) {
        try {
          const memoryContext = await this.memoryAdapter.getAgentContext(state);
          enhancedState = {
            ...state,
            metadata: {
              ...state.metadata,
              memoryContext: {
                threadMemories: memoryContext.threadMemories.slice(0, 5), // Last 5 thread memories
                userMemories: memoryContext.userMemories.slice(0, 3), // Last 3 user memories
                relevanceScore: memoryContext.relevanceScore,
                patterns: memoryContext.userPatterns,
              },
            },
          };
          this.logger.debug(`Enhanced agent ${agent.id} with memory context`, {
            threadMemories: memoryContext.threadMemories.length,
            userMemories: memoryContext.userMemories.length,
            relevanceScore: memoryContext.relevanceScore,
          });
        } catch (memoryError) {
          this.logger.warn(
            `Failed to enhance ${agent.id} with memory context:`,
            memoryError
          );
          // Continue without memory enhancement
        }
      }

      // 2. Execute agent with enhanced state
      const result = await agentExecution();

      // 3. Store agent execution result in memory AFTER execution
      if (this.memoryAdapter && result) {
        try {
          await this.memoryAdapter.storeAgentExecution(
            enhancedState,
            result,
            agent.id
          );
          this.logger.debug(
            `Stored execution result for agent ${agent.id} in memory`
          );
        } catch (memoryError) {
          this.logger.warn(
            `Failed to store ${agent.id} execution in memory:`,
            memoryError
          );
          // Continue without memory storage
        }
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Memory-enhanced execution failed for agent ${agent.id}:`,
        error
      );
      // Fallback to original execution without memory
      return await agentExecution();
    }
  }

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
        const llmWithTools = (llm as LLMWithTools).bindTools([routingTool]);

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
   * Now with Command processing support
   */
  async createWorkerNode(
    agent: AgentDefinition,
    config: SupervisorConfig
  ): Promise<
    (
      state: AgentState,
      runConfig?: RunnableConfig
    ) => Promise<Partial<AgentState> | Command>
  > {
    return async (
      state: AgentState
    ): Promise<Partial<AgentState> | Command> => {
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

        // Execute agent with automagical memory enhancement
        const agentResult = await this.enhanceAgentWithMemory(
          agent,
          filteredState,
          () => agent.nodeFunction(filteredState)
        );

        // Check if agent returned a Command object
        if (this.isCommand(agentResult)) {
          this.logger.debug(
            `Worker ${agent.id} returned Command - processing`,
            {
              goto: agentResult.goto,
            }
          );

          // Process command through CommandProcessorService
          return await this.processAgentResult(
            agentResult,
            filteredState,
            agent.id
          );
        }

        // Agent returned plain state - wrap in Command for supervisor routing
        return new Command({
          goto: 'supervisor', // Return to supervisor after task completion
          update: {
            ...agentResult,
            current: agent.id,
            metadata: {
              ...state.metadata,
              lastAgent: agent.id,
              agentExecutionTime: new Date().toISOString(),
              taskCompleted: state.task,
            },
          },
        });
      } catch (error) {
        this.logger.error(`Worker agent ${agent.id} execution failed:`, error);

        // Return Command with error information
        return new Command({
          goto: 'supervisor', // Return to supervisor even on error
          update: {
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
          },
        });
      }
    };
  }

  /**
   * Create swarm node with handoff capabilities
   * Now with Command processing support for sophisticated routing
   */
  async createSwarmNode(
    agent: AgentDefinition,
    allAgents: readonly AgentDefinition[],
    config: SwarmConfig
  ): Promise<
    (
      state: AgentState,
      runConfig?: RunnableConfig
    ) => Promise<Partial<AgentState> | Command>
  > {
    return async (
      state: AgentState
    ): Promise<Partial<AgentState> | Command> => {
      try {
        this.logger.debug(`Executing swarm agent: ${agent.id}`, {
          enableDynamicHandoffs: config.enableDynamicHandoffs,
          handoffToolsCount: agent.handoffTools?.length || 0,
        });

        // Execute agent logic with automagical memory enhancement
        const agentResult = await this.enhanceAgentWithMemory(
          agent,
          state,
          () => agent.nodeFunction(state)
        );

        // Check if agent returned a Command object with sophisticated routing
        if (this.isCommand(agentResult)) {
          this.logger.debug(
            `Swarm agent ${agent.id} returned Command - processing`,
            {
              goto: agentResult.goto,
            }
          );

          // Process command through CommandProcessorService for retry/skip/error handling
          return await this.processAgentResult(agentResult, state, agent.id);
        }

        // Agent returned plain state - check for handoffs
        if (config.enableDynamicHandoffs && agent.handoffTools) {
          const handoffDecision = this.checkForHandoff(
            agentResult,
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

            let filteredResult = agentResult;
            if (contextFilter) {
              const filteredState = contextFilter({
                ...state,
                ...agentResult,
              });
              filteredResult = { ...agentResult, ...filteredState };
            }

            // Return Command with activeAgent for swarm routing
            return new Command({
              goto: '__router__', // Official swarm router
              update: {
                ...filteredResult,
                current: agent.id,
                task: handoffDecision.task,
                metadata: {
                  ...state.metadata,
                  active_agent: handoffDecision.targetAgent, // Track active agent
                  handoff_from: agent.id,
                  handoff_task: handoffDecision.task,
                  handoff_round:
                    ((state.metadata?.handoff_round as number) || 0) + 1,
                  handoffReason: handoffDecision.reason,
                  handoffTimestamp: new Date().toISOString(),
                },
              },
            });
          }
        }

        // No handoff - end execution or continue based on result
        return new Command({
          goto: '__router__',
          update: {
            ...agentResult,
            current: agent.id,
            metadata: {
              ...state.metadata,
              active_agent: undefined, // Clear active agent to signal END
              lastAgent: agent.id,
              agentExecutionTime: new Date().toISOString(),
            },
          },
        });
      } catch (error) {
        this.logger.error(`Swarm agent ${agent.id} execution failed:`, error);

        // Return Command with error - end execution
        return new Command({
          goto: '__router__',
          update: {
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
              active_agent: undefined, // Clear to signal END
              agentError:
                error instanceof Error ? error.message : 'Unknown error',
            },
          },
        });
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
        if (isAIMessageWithToolCalls(message)) {
          const toolCalls = message.tool_calls || [];
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

        // Execute agent's core logic first with automagical memory enhancement
        const agentResult = await this.enhanceAgentWithMemory(
          agent,
          state,
          () => agent.nodeFunction(state, config)
        );

        // Execute parallel tools with weighted coordination
        // Tool executors expect AgentState - create compatible state
        const stateForTools: AgentState = {
          ...state,
          ...agentResult,
        };
        const toolResults = await parallelToolExecutor(stateForTools);

        // Execute high-priority tools with retry logic if needed
        let enhancedResults = { ...agentResult, ...toolResults };
        for (const retryTool of retryableTools) {
          try {
            const stateForRetry: AgentState = {
              ...state,
              ...enhancedResults,
            };
            const retryResult = await retryTool(stateForRetry);
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
    const results = await parallelExecutor(state);

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
        (
          this.toolNodeService as unknown as ToolNodeServiceWithWeightedMerge
        ).applyWeightedMerge(mergedResult, result.value, weight);
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
          (
            this.toolNodeService as unknown as ToolNodeServiceWithWeightedMerge
          ).applyWeightedMerge(averaged, result, 1 / successfulResults.length);
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
