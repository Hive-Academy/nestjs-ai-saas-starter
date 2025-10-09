import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { createHandoffTool as officialCreateHandoffTool } from '@langchain/langgraph-swarm';
import { DynamicStructuredTool } from '@langchain/core/tools';
import {
  AgentDefinition,
  AgentState,
  HandoffTool,
  MULTI_AGENT_CONSTANTS,
} from '../interfaces/multi-agent.interface';

/**
 * Service for building handoff tools for swarm patterns
 * Following LangGraph's create_handoff_tool pattern
 *
 * @see https://github.com/langchain-ai/langgraph-swarm-py
 */
@Injectable()
export class HandoffToolBuilderService {
  private readonly logger = new Logger(HandoffToolBuilderService.name);

  /**
   * Create a single handoff tool for transferring control to another agent
   *
   * Uses official @langchain/langgraph-swarm createHandoffTool implementation
   * Returns Command({ update: { activeAgent: targetAgent } }) when invoked
   *
   * @param config - Handoff tool configuration
   * @returns HandoffTool definition with official LangChain tool
   *
   * @example
   * ```typescript
   * const tool = handoffBuilder.createHandoffTool({
   *   agentName: 'researcher',
   *   description: 'Transfer to researcher for deep analysis',
   * });
   * ```
   */
  createHandoffTool(config: {
    agentName: string;
    description?: string;
    contextFilter?: (state: AgentState) => Partial<AgentState>;
  }): HandoffTool {
    const toolName = `${MULTI_AGENT_CONSTANTS.DEFAULT_HANDOFF_TOOL_PREFIX}${config.agentName}`;

    this.logger.debug(`Creating handoff tool: ${toolName}`, {
      targetAgent: config.agentName,
      hasContextFilter: !!config.contextFilter,
      official: true,
    });

    // Create official LangGraph handoff tool
    // This returns a DynamicStructuredTool that produces Command objects
    const officialTool = officialCreateHandoffTool({
      agentName: config.agentName,
      description:
        config.description ||
        `Transfer control to ${config.agentName} agent for specialized handling`,
    });

    // Wrap in our HandoffTool interface while preserving official tool
    return {
      name: toolName,
      description: officialTool.description,
      targetAgent: config.agentName,
      schema: officialTool.schema,
      contextFilter: config.contextFilter,
      metadata: {
        official: true,
        source: '@langchain/langgraph-swarm',
        officialTool: officialTool, // Store reference to actual tool
      },
    };
  }

  /**
   * Generate handoff tools for all peer agents in a swarm
   *
   * Creates transfer_to_X tools for each peer agent, enabling
   * decentralized agent-to-agent communication
   *
   * @param agentId - Current agent ID (will not create handoff to itself)
   * @param peerAgents - All agents in the swarm
   * @param options - Optional configuration
   * @returns Array of HandoffTool definitions
   *
   * @example
   * ```typescript
   * const tools = handoffBuilder.generateSwarmHandoffTools(
   *   'web-search',
   *   [webSearchAgent, analysisAgent, synthesisAgent]
   * );
   * // Returns: [transfer_to_analysis, transfer_to_synthesis]
   * ```
   */
  generateSwarmHandoffTools(
    agentId: string,
    peerAgents: AgentDefinition[],
    options?: {
      includeDescriptions?: boolean;
      contextFilters?: Record<
        string,
        (state: AgentState) => Partial<AgentState>
      >;
    }
  ): HandoffTool[] {
    // Filter out self to avoid self-handoff
    const peers = peerAgents.filter((agent) => agent.id !== agentId);

    this.logger.debug(
      `Generating handoff tools for agent ${agentId} to ${peers.length} peers`,
      {
        peers: peers.map((p) => p.id),
      }
    );

    return peers.map((peer) => {
      const description = options?.includeDescriptions
        ? `Transfer control to ${peer.name} - ${peer.description}`
        : `Transfer control to ${peer.name} for specialized handling`;

      const contextFilter = options?.contextFilters?.[peer.id];

      return this.createHandoffTool({
        agentName: peer.id,
        description,
        contextFilter,
      });
    });
  }

  /**
   * Create handoff tools with specialized context filtering
   *
   * Allows each handoff to specify what context should be passed to the target agent
   *
   * @param agentId - Current agent ID
   * @param handoffConfigs - Detailed handoff configurations
   * @returns Array of HandoffTool definitions with context filters
   *
   * @example
   * ```typescript
   * const tools = handoffBuilder.createFilteredHandoffTools('analyzer', [
   *   {
   *     targetAgent: 'researcher',
   *     description: 'Research missing information',
   *     contextFilter: (state) => ({
   *       messages: state.messages.slice(-3), // Only last 3 messages
   *       task: `Research: ${state.scratchpad}`,
   *     }),
   *   },
   * ]);
   * ```
   */
  createFilteredHandoffTools(
    agentId: string,
    handoffConfigs: Array<{
      targetAgent: string;
      description?: string;
      contextFilter?: (state: AgentState) => Partial<AgentState>;
      includeSharedContext?: boolean;
    }>
  ): HandoffTool[] {
    this.logger.debug(`Creating filtered handoff tools for agent ${agentId}`, {
      count: handoffConfigs.length,
      targets: handoffConfigs.map((c) => c.targetAgent),
    });

    return handoffConfigs.map((config) => {
      // Build context filter
      let contextFilter = config.contextFilter;

      if (config.includeSharedContext && !config.contextFilter) {
        // Default filter that preserves shared context
        contextFilter = (state: AgentState) => ({
          messages: state.messages,
          task: state.task,
          metadata: {
            ...state.metadata,
            handoffFrom: agentId,
            handoffReason: 'Shared context handoff',
          },
        });
      }

      return this.createHandoffTool({
        agentName: config.targetAgent,
        description: config.description,
        contextFilter,
      });
    });
  }

  /**
   * Validate handoff tool configuration
   *
   * Ensures all handoff targets exist in the agent network
   *
   * @param handoffTools - Tools to validate
   * @param availableAgents - All agents in the network
   * @throws Error if any target agent doesn't exist
   */
  validateHandoffTools(
    handoffTools: HandoffTool[],
    availableAgents: AgentDefinition[]
  ): void {
    const agentIds = new Set(availableAgents.map((a) => a.id));

    const invalidTargets = handoffTools.filter(
      (tool) => !agentIds.has(tool.targetAgent)
    );

    if (invalidTargets.length > 0) {
      const invalidAgents = invalidTargets.map((t) => t.targetAgent).join(', ');
      throw new Error(
        `Invalid handoff targets (agents do not exist): ${invalidAgents}`
      );
    }

    this.logger.debug('Handoff tools validated successfully', {
      toolCount: handoffTools.length,
      targetAgents: handoffTools.map((t) => t.targetAgent),
    });
  }

  /**
   * Create handoff tools with round-robin prevention
   *
   * Prevents immediate handoff back to the source agent
   *
   * @param agentId - Current agent ID
   * @param peerAgents - All agents in the swarm
   * @param state - Current agent state (to check previous handoffs)
   * @returns Handoff tools excluding recent source agents
   */
  createRoundRobinSafeHandoffTools(
    agentId: string,
    peerAgents: AgentDefinition[],
    state?: AgentState
  ): HandoffTool[] {
    const handoffFrom = state?.metadata?.handoffFrom as string | undefined;

    // Filter out self and immediate previous agent
    const validPeers = peerAgents.filter(
      (agent) => agent.id !== agentId && agent.id !== handoffFrom
    );

    this.logger.debug(
      `Creating round-robin safe handoff tools for ${agentId}`,
      {
        excludedAgents: [agentId, handoffFrom].filter(Boolean),
        availablePeers: validPeers.map((p) => p.id),
      }
    );

    return this.generateSwarmHandoffTools(agentId, validPeers);
  }

  /**
   * Create a REAL LangChain tool for agent handoffs
   * PRODUCTION-READY: Creates actual DynamicStructuredTool
   */
  createLangChainHandoffTool(
    config: {
      targetAgent: string;
      description?: string;
      contextFilter?: (state: AgentState) => Partial<AgentState>;
    },
    currentAgentId: string
  ): any {
    const toolName = `${MULTI_AGENT_CONSTANTS.DEFAULT_HANDOFF_TOOL_PREFIX}${config.targetAgent}`;

    const tool = new DynamicStructuredTool({
      name: toolName,
      description:
        config.description || `Transfer control to ${config.targetAgent}`,
      schema: z.object({
        task_description: z
          .string()
          .optional()
          .describe('Task for the next agent'),
        reason: z.string().optional().describe('Reason for handoff'),
      }),

      func: async (input: { task_description?: string; reason?: string }) => {
        this.logger.log(`Handoff: ${currentAgentId} -> ${config.targetAgent}`, {
          task: input.task_description,
          reason: input.reason,
        });

        return JSON.stringify({
          success: true,
          handoff: {
            targetAgent: config.targetAgent,
            task: input.task_description,
            reason: input.reason,
            timestamp: new Date(),
          },
          message: `Control transferred to ${config.targetAgent}`,
        });
      },
    });

    // Add metadata
    (tool as any).handoffMetadata = {
      official: false,
      source: '@hive-academy/langgraph-multi-agent',
      targetAgent: config.targetAgent,
      hasContextFilter: !!config.contextFilter,
      createdAt: new Date(),
    };

    return tool;
  }

  /**
   * Create Command object for handoff routing
   * PRODUCTION-READY: Returns actual Command that LangGraph understands
   */
  createHandoffCommand(
    targetAgent: string,
    currentState: AgentState,
    options: {
      task?: string;
      reason?: string;
      contextFilter?: (state: AgentState) => Partial<AgentState>;
      currentAgentId?: string;
    }
  ): any {
    const { Command } = require('@langchain/langgraph');

    let stateUpdate: Partial<AgentState> = {
      metadata: {
        ...currentState.metadata,
        active_agent: targetAgent,
        handoff_from: options.currentAgentId || currentState.current,
        handoff_task: options.task,
        handoff_round:
          ((currentState.metadata?.handoff_round as number) || 0) + 1,
      },
    };

    if (options.contextFilter) {
      const filteredState = options.contextFilter(currentState);
      stateUpdate = {
        ...filteredState,
        metadata: {
          ...filteredState.metadata,
          ...stateUpdate.metadata,
        },
      };
    }

    if (options.task) {
      stateUpdate.task = options.task;
    }

    return new Command({
      goto: '__router__',
      update: stateUpdate,
    });
  }

  /**
   * Extract handoff decision from agent result
   */
  extractHandoffDecision(
    result: Partial<AgentState>,
    handoffTools: any[]
  ): { targetAgent: string; task?: string; reason?: string } | null {
    // Check explicit next field
    if (result.next && result.next !== MULTI_AGENT_CONSTANTS.END) {
      const targetTool = handoffTools.find(
        (tool) => tool.targetAgent === result.next
      );
      if (targetTool) {
        return {
          targetAgent: result.next,
          task: result.task,
          reason: 'Explicit handoff via next field',
        };
      }
    }

    // Check tool calls
    if (result.messages) {
      for (const message of result.messages) {
        if (
          (message as any)._getType &&
          (message as any)._getType() === 'ai' &&
          'tool_calls' in message
        ) {
          const toolCalls = (message as any).tool_calls || [];
          for (const toolCall of toolCalls) {
            const matchingTool = handoffTools.find(
              (tool: any) =>
                toolCall.name?.includes(tool.name) ||
                toolCall.name?.includes(tool.targetAgent)
            );
            if (matchingTool) {
              return {
                targetAgent: matchingTool.targetAgent,
                task: toolCall.args?.task_description || result.task,
                reason: `Handoff tool called: ${toolCall.name}`,
              };
            }
          }
        }
      }
    }

    return null;
  }
}
