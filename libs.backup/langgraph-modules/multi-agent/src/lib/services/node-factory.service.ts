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

/**
 * Service for creating LangGraph node functions
 * Focuses on node creation and agent execution logic
 */
@Injectable()
export class NodeFactoryService {
  private readonly logger = new Logger(NodeFactoryService.name);

  constructor(private readonly llmProvider: LlmProviderService) {}

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
}
