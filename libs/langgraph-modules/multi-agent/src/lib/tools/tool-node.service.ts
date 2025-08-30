import { AgentType } from './agent-types';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { Injectable, Logger } from '@nestjs/common';

import type { WorkflowState } from '@hive-academy/langgraph-core';
import { ToolRegistryService } from './tool-registry.service';

/**
 * Enhanced service for creating and managing LangGraph ToolNodes
 * with autodiscovery integration and advanced execution patterns
 */
@Injectable()
export class ToolNodeService {
  private readonly logger = new Logger(ToolNodeService.name);
  private readonly toolNodes = new Map<string, ToolNode>();
  private readonly executionMetrics = new Map<
    string,
    {
      executionCount: number;
      totalExecutionTime: number;
      lastExecuted: Date;
      errorCount: number;
    }
  >();

  constructor(private readonly toolRegistry: ToolRegistryService) {}

  /**
   * Create a ToolNode for an agent/node with enhanced autodiscovery
   */
  createToolNode(
    nodeId: string,
    tools?: DynamicStructuredTool[] | string[],
    options?: {
      includeTags?: string[];
      excludeTags?: string[];
      agentOverride?: AgentType | string;
    }
  ): ToolNode {
    // Get tools with enhanced resolution
    let resolvedTools: DynamicStructuredTool[];

    if (!tools) {
      // Auto-discover tools for this node/agent
      const agentId = options?.agentOverride || nodeId;
      resolvedTools = this.toolRegistry.getToolsForAgent(agentId);

      // Apply tag filtering if specified
      if (options?.includeTags || options?.excludeTags) {
        resolvedTools = this.filterToolsByTags(
          resolvedTools,
          options.includeTags,
          options.excludeTags
        );
      }
    } else if (tools.length > 0 && typeof tools[0] === 'string') {
      // Resolve tool names to actual tools
      resolvedTools = (tools as string[])
        .map((name) => this.toolRegistry.getTool(name))
        .filter((tool): tool is DynamicStructuredTool => tool !== undefined);
    } else {
      // Use provided tools directly
      resolvedTools = tools as DynamicStructuredTool[];
    }

    if (resolvedTools.length === 0) {
      this.logger.warn(`No tools available for node: ${nodeId}`);
    }

    // Create and cache the ToolNode with enhanced error handling
    const toolNode = this.createEnhancedToolNode(resolvedTools, nodeId);
    this.toolNodes.set(nodeId, toolNode);

    this.logger.debug(
      `Created ToolNode for ${nodeId} with ${resolvedTools.length} tools`
    );
    return toolNode;
  }

  /**
   * Get or create a ToolNode
   */
  getOrCreateToolNode(
    nodeId: string,
    tools?: DynamicStructuredTool[] | string[]
  ): ToolNode {
    const existing = this.toolNodes.get(nodeId);
    if (existing) {
      return existing;
    }
    return this.createToolNode(nodeId, tools);
  }

  /**
   * Create a tool executor function for use in workflows
   */
  createToolExecutor<TState extends WorkflowState = WorkflowState>(
    nodeId: string,
    tools?: DynamicStructuredTool[] | string[]
  ): (state: TState) => Promise<Partial<TState>> {
    const toolNode = this.createToolNode(nodeId, tools);

    return async (state: TState): Promise<Partial<TState>> => {
      try {
        // Execute tools based on messages in state
        const result = await toolNode.invoke(state as any);

        // Return the result as a partial state update
        return result as Partial<TState>;
      } catch (error) {
        this.logger.error(`Tool execution failed for node ${nodeId}:`, error);

        // Return error in state
        return {
          error: {
            id: `tool-error-${Date.now()}`,
            nodeId,
            type: 'tool_execution' as const,
            message:
              error instanceof Error ? error.message : 'Tool execution failed',
            timestamp: new Date(),
            isRecoverable: true,
            suggestedRecovery:
              'Retry tool execution or check tool configuration',
          },
        } as unknown as Partial<TState>;
      }
    };
  }

  /**
   * Create a conditional tool executor that only runs if certain conditions are met
   */
  createConditionalToolExecutor<TState extends WorkflowState = WorkflowState>(
    nodeId: string,
    condition: (state: TState) => boolean,
    tools?: DynamicStructuredTool[] | string[]
  ): (state: TState) => Promise<Partial<TState>> {
    const executor = this.createToolExecutor(nodeId, tools);

    return async (state: TState): Promise<Partial<TState>> => {
      // Check condition
      if (!condition(state)) {
        this.logger.debug(
          `Condition not met for tool node ${nodeId}, skipping`
        );
        return {};
      }

      // Execute tools
      return executor(state) as Promise<Partial<TState>>;
    };
  }

  /**
   * Create a parallel tool executor that runs multiple tool nodes
   */
  createParallelToolExecutor<TState extends WorkflowState = WorkflowState>(
    nodeConfigs: Array<{
      nodeId: string;
      tools?: DynamicStructuredTool[] | string[];
      weight?: number; // For weighted merging of results
    }>
  ): (state: TState) => Promise<Partial<TState>> {
    return async (state: TState): Promise<Partial<TState>> => {
      const executors = nodeConfigs.map((config) =>
        this.createToolExecutor(config.nodeId, config.tools)
      );

      try {
        // Execute all tool nodes in parallel
        const results = await Promise.all(
          executors.map(async (executor) => executor(state))
        );

        // Merge results
        const merged: Partial<TState> = {};
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const config = nodeConfigs[i];

          // Apply weighted merging if specified
          if (config.weight !== undefined) {
            // For weighted merging, we'd need more sophisticated logic
            // For now, just merge with last-write-wins
            Object.assign(merged, result);
          } else {
            Object.assign(merged, result);
          }
        }

        return merged;
      } catch (error) {
        this.logger.error('Parallel tool execution failed:', error);
        throw error;
      }
    };
  }

  /**
   * Create a retry-enabled tool executor
   */
  createRetryableToolExecutor<TState extends WorkflowState = WorkflowState>(
    nodeId: string,
    tools?: DynamicStructuredTool[] | string[],
    options?: {
      maxRetries?: number;
      retryDelay?: number;
      backoffMultiplier?: number;
    }
  ): (state: TState) => Promise<Partial<TState>> {
    const maxRetries = options?.maxRetries || 3;
    const retryDelay = options?.retryDelay || 1000;
    const backoffMultiplier = options?.backoffMultiplier || 2;

    const executor = this.createToolExecutor(nodeId, tools);

    return async (state: TState): Promise<Partial<TState>> => {
      let lastError: Error | undefined;
      let delay = retryDelay;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            this.logger.debug(
              `Retrying tool execution for ${nodeId} (attempt ${attempt}/${maxRetries})`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= backoffMultiplier;
          }

          return (await executor(state)) as Partial<TState>;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          this.logger.warn(
            `Tool execution attempt ${attempt} failed for ${nodeId}:`,
            error
          );
        }
      }

      // All retries failed
      this.logger.error(`All retry attempts failed for tool node ${nodeId}`);
      throw (
        lastError ||
        new Error(`Tool execution failed after ${maxRetries} retries`)
      );
    };
  }

  /**
   * Clear cached tool nodes
   */
  clearToolNodes(): void {
    this.toolNodes.clear();
    this.logger.debug('Cleared all cached tool nodes');
  }

  /**
   * Get cached tool node
   */
  getCachedToolNode(nodeId: string): ToolNode | undefined {
    return this.toolNodes.get(nodeId);
  }

  /**
   * Create tool executor with autodiscovery for specific agent types
   */
  createAgentToolExecutor<TState extends WorkflowState = WorkflowState>(
    agentType: AgentType,
    options?: {
      includeTags?: string[];
      excludeTags?: string[];
      timeout?: number;
    }
  ): (state: TState) => Promise<Partial<TState>> {
    const toolNode = this.createToolNode(agentType, undefined, {
      includeTags: options?.includeTags,
      excludeTags: options?.excludeTags,
      agentOverride: agentType,
    });

    return async (state: TState): Promise<Partial<TState>> => {
      const startTime = Date.now();
      const nodeId = `${agentType}-executor`;

      try {
        // Execute tools with timeout if specified
        const result = options?.timeout
          ? await this.executeWithTimeout(toolNode, state, options.timeout)
          : await toolNode.invoke(state as any);

        // Track metrics
        this.updateExecutionMetrics(nodeId, Date.now() - startTime, true);

        return result as Partial<TState>;
      } catch (error) {
        this.logger.error(
          `Agent tool execution failed for ${agentType}:`,
          error
        );

        // Track error metrics
        this.updateExecutionMetrics(nodeId, Date.now() - startTime, false);

        return {
          error: {
            id: `agent-tool-error-${Date.now()}`,
            nodeId,
            type: 'agent_tool_execution' as const,
            message:
              error instanceof Error
                ? error.message
                : 'Agent tool execution failed',
            timestamp: new Date(),
            isRecoverable: true,
            suggestedRecovery: `Retry ${agentType} tool execution or check tool configuration`,
          },
        } as unknown as Partial<TState>;
      }
    };
  }

  /**
   * Get execution metrics for a node
   */
  getExecutionMetrics(nodeId: string): {
    executionCount: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
    lastExecuted: Date;
    errorCount: number;
    successRate: number;
  } | null {
    const metrics = this.executionMetrics.get(nodeId);
    if (!metrics) {
      return null;
    }

    return {
      ...metrics,
      averageExecutionTime:
        metrics.executionCount > 0
          ? metrics.totalExecutionTime / metrics.executionCount
          : 0,
      successRate:
        metrics.executionCount > 0
          ? (metrics.executionCount - metrics.errorCount) /
            metrics.executionCount
          : 0,
    };
  }

  /**
   * Get tool usage statistics across all nodes
   */
  getAllExecutionMetrics(): Record<
    string,
    ReturnType<typeof this.getExecutionMetrics>
  > {
    const allMetrics: Record<
      string,
      ReturnType<typeof this.getExecutionMetrics>
    > = {};

    for (const [nodeId] of this.executionMetrics) {
      allMetrics[nodeId] = this.getExecutionMetrics(nodeId);
    }

    return allMetrics;
  }

  /**
   * Clear execution metrics
   */
  clearMetrics(): void {
    this.executionMetrics.clear();
    this.logger.debug('Cleared all execution metrics');
  }

  // Private helper methods

  private filterToolsByTags(
    tools: DynamicStructuredTool[],
    includeTags?: string[],
    excludeTags?: string[]
  ): DynamicStructuredTool[] {
    return tools.filter((tool) => {
      const metadata = this.toolRegistry.getToolMetadata(tool.name);
      if (!metadata?.tags) {
        return !includeTags; // Include if no include filter, exclude if include filter exists
      }

      // Check include tags
      if (
        includeTags &&
        !includeTags.some((tag) => metadata.tags!.includes(tag))
      ) {
        return false;
      }

      // Check exclude tags
      if (
        excludeTags?.some((tag) => metadata.tags!.includes(tag))
      ) {
        return false;
      }

      return true;
    });
  }

  private createEnhancedToolNode(
    tools: DynamicStructuredTool[],
    nodeId: string
  ): ToolNode {
    // Wrap tools with enhanced error handling and metrics
    const enhancedTools = tools.map((tool) => {
      const originalFunc = tool.func;

      return new DynamicStructuredTool({
        name: tool.name,
        description: tool.description,
        schema: tool.schema,
        func: async (input: any) => {
          const startTime = Date.now();

          try {
            const result = await originalFunc(input);
            this.updateExecutionMetrics(
              `tool:${tool.name}`,
              Date.now() - startTime,
              true
            );
            return result;
          } catch (error) {
            this.updateExecutionMetrics(
              `tool:${tool.name}`,
              Date.now() - startTime,
              false
            );
            this.logger.error(`Tool ${tool.name} execution failed:`, error);
            throw error;
          }
        },
      });
    });

    return new ToolNode(enhancedTools);
  }

  private async executeWithTimeout<T>(
    toolNode: ToolNode,
    state: T,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      toolNode
        .invoke(state as any)
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private updateExecutionMetrics(
    nodeId: string,
    executionTime: number,
    success: boolean
  ): void {
    const existing = this.executionMetrics.get(nodeId) || {
      executionCount: 0,
      totalExecutionTime: 0,
      lastExecuted: new Date(),
      errorCount: 0,
    };

    this.executionMetrics.set(nodeId, {
      executionCount: existing.executionCount + 1,
      totalExecutionTime: existing.totalExecutionTime + executionTime,
      lastExecuted: new Date(),
      errorCount: existing.errorCount + (success ? 0 : 1),
    });
  }
}
