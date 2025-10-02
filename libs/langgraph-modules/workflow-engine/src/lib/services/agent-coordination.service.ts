import { Injectable, Logger } from '@nestjs/common';
import { AgentResolutionService } from './agent-resolution.service';
import { isAgentConfigWithType } from '../utils/type-guards';

/**
 * Coordination strategy for multi-agent execution
 */
export type CoordinationStrategy = 'sequential' | 'parallel' | 'consensus';

/**
 * Result of agent coordination
 */
export interface AgentCoordinationResult {
  /** Coordination strategy used */
  strategy: CoordinationStrategy;
  /** Agent IDs that participated */
  participatingAgents: string[];
  /** Individual agent results */
  agentResults: Array<{
    agentId: string;
    success: boolean;
    result?: any;
    error?: Error;
    executionTime: number;
  }>;
  /** Final consolidated result */
  finalResult: any;
  /** Total coordination time */
  totalTime: number;
  /** Success status */
  success: boolean;
  /** Error information if coordination failed */
  error?: string;
}

/**
 * Service responsible for coordinating multiple agents.
 * Handles different coordination strategies and result consolidation.
 */
@Injectable()
export class AgentCoordinationService {
  private readonly logger = new Logger(AgentCoordinationService.name);

  constructor(private readonly agentResolution: AgentResolutionService) {}

  /**
   * Coordinate multiple agents with specified strategy
   */
  async coordinateAgents(
    agentIds: string[],
    state: any,
    strategy: CoordinationStrategy = 'sequential'
  ): Promise<AgentCoordinationResult> {
    const startTime = Date.now();
    
    this.logger.debug(`Coordinating ${agentIds.length} agents with ${strategy} strategy`);

    try {
      let result: AgentCoordinationResult;

      switch (strategy) {
        case 'sequential':
          result = await this.executeSequential(agentIds, state);
          break;
        case 'parallel':
          result = await this.executeParallel(agentIds, state);
          break;
        case 'consensus':
          result = await this.executeConsensus(agentIds, state);
          break;
        default:
          throw new Error(`Unknown coordination strategy: ${strategy}`);
      }

      result.totalTime = Date.now() - startTime;
      this.logger.debug(`Agent coordination completed in ${result.totalTime}ms`);
      
      return result;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error(`Agent coordination failed after ${totalTime}ms:`, error);
      
      return {
        strategy,
        participatingAgents: agentIds,
        agentResults: [],
        finalResult: state,
        totalTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown coordination error',
      };
    }
  }

  /**
   * Execute agents sequentially
   */
  private async executeSequential(agentIds: string[], state: any): Promise<AgentCoordinationResult> {
    const agentResults: AgentCoordinationResult['agentResults'] = [];
    let currentState = { ...state };

    for (const agentId of agentIds) {
      const agentStartTime = Date.now();
      
      try {
        const agent = await this.agentResolution.resolveAgent(agentId);
        
        if (agent.metadata.averageExecutionTime) {
          this.logger.debug(
            `Executing agent ${agentId} (avg: ${agent.metadata.averageExecutionTime}ms)`
          );
        }

        let result: any;
        if (isAgentConfigWithType(agent.config, 'workflow-agent') && agent.internalWorkflowExecutor) {
          result = await agent.internalWorkflowExecutor(currentState);
        } else {
          // For non-workflow agents, attempt to call a standard method
          if (agent.instance.execute && typeof agent.instance.execute === 'function') {
            result = await agent.instance.execute(currentState);
          } else {
            throw new Error(`Agent ${agentId} does not have an execute method`);
          }
        }

        const executionTime = Date.now() - agentStartTime;
        
        agentResults.push({
          agentId,
          success: true,
          result,
          executionTime,
        });

        // Update state for next agent
        if (result && typeof result === 'object') {
          currentState = { ...currentState, ...result };
        }

        // Update agent performance metadata
        this.updateAgentPerformance(agentId, executionTime);
        
      } catch (error) {
        const executionTime = Date.now() - agentStartTime;
        
        agentResults.push({
          agentId,
          success: false,
          error: error instanceof Error ? error : new Error('Unknown agent error'),
          executionTime,
        });

        this.logger.error(`Agent ${agentId} failed in sequential execution:`, error);
        // Continue with next agent in sequential mode
      }
    }

    const successfulResults = agentResults.filter(r => r.success);
    
    return {
      strategy: 'sequential',
      participatingAgents: agentIds,
      agentResults,
      finalResult: currentState,
      totalTime: 0, // Will be set by caller
      success: successfulResults.length > 0,
    };
  }

  /**
   * Execute agents in parallel
   */
  private async executeParallel(agentIds: string[], state: any): Promise<AgentCoordinationResult> {
    const agentPromises = agentIds.map(async (agentId) => {
      const agentStartTime = Date.now();
      
      try {
        const agent = await this.agentResolution.resolveAgent(agentId);
        
        if (agent.metadata.averageExecutionTime) {
          this.logger.debug(
            `Executing agent ${agentId} in parallel (avg: ${agent.metadata.averageExecutionTime}ms)`
          );
        }

        let result: any;
        if (isAgentConfigWithType(agent.config, 'workflow-agent') && agent.internalWorkflowExecutor) {
          result = await agent.internalWorkflowExecutor(state);
        } else {
          if (agent.instance.execute && typeof agent.instance.execute === 'function') {
            result = await agent.instance.execute(state);
          } else {
            throw new Error(`Agent ${agentId} does not have an execute method`);
          }
        }

        const executionTime = Date.now() - agentStartTime;
        this.updateAgentPerformance(agentId, executionTime);

        return {
          agentId,
          success: true,
          result,
          executionTime,
        };
      } catch (error) {
        const executionTime = Date.now() - agentStartTime;
        
        return {
          agentId,
          success: false,
          error: error instanceof Error ? error : new Error('Unknown agent error'),
          executionTime,
        };
      }
    });

    const agentResults = await Promise.all(agentPromises);
    const successfulResults = agentResults.filter(r => r.success);

    // Merge results from all successful agents
    const finalResult = successfulResults.reduce((acc, result) => {
      if (result.result && typeof result.result === 'object') {
        return { ...acc, ...result.result };
      }
      return acc;
    }, { ...state });

    return {
      strategy: 'parallel',
      participatingAgents: agentIds,
      agentResults,
      finalResult,
      totalTime: 0, // Will be set by caller
      success: successfulResults.length > 0,
    };
  }

  /**
   * Execute agents with consensus strategy
   */
  private async executeConsensus(agentIds: string[], state: any): Promise<AgentCoordinationResult> {
    // First execute all agents in parallel
    const parallelResult = await this.executeParallel(agentIds, state);
    
    if (!parallelResult.success) {
      return {
        ...parallelResult,
        strategy: 'consensus',
        error: 'No agents succeeded for consensus',
      };
    }

    const successfulResults = parallelResult.agentResults.filter(r => r.success);
    
    if (successfulResults.length < 2) {
      return {
        ...parallelResult,
        strategy: 'consensus',
        finalResult: successfulResults[0]?.result || state,
      };
    }

    // Simple consensus: majority wins or average for numeric values
    const consensusResult = this.computeConsensus(successfulResults.map(r => r.result));

    return {
      strategy: 'consensus',
      participatingAgents: agentIds,
      agentResults: parallelResult.agentResults,
      finalResult: { ...state, ...consensusResult },
      totalTime: 0, // Will be set by caller
      success: true,
    };
  }

  /**
   * Compute consensus from multiple results
   */
  private computeConsensus(results: any[]): any {
    if (results.length === 0) return {};
    if (results.length === 1) return results[0] || {};

    const consensus: any = {};
    const keys = new Set<string>();

    // Collect all keys from all results
    results.forEach(result => {
      if (result && typeof result === 'object') {
        Object.keys(result).forEach(key => keys.add(key));
      }
    });

    // For each key, determine consensus value
    for (const key of keys) {
      const values = results
        .map(result => result?.[key])
        .filter(value => value !== undefined && value !== null);

      if (values.length === 0) continue;

      // For numeric values, use average
      if (values.every(v => typeof v === 'number')) {
        consensus[key] = values.reduce((sum, v) => sum + v, 0) / values.length;
        continue;
      }

      // For boolean values, use majority
      if (values.every(v => typeof v === 'boolean')) {
        const trueCount = values.filter(v => v === true).length;
        consensus[key] = trueCount > values.length / 2;
        continue;
      }

      // For strings, use most common value
      if (values.every(v => typeof v === 'string')) {
        const counts = new Map<string, number>();
        values.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
        
        let maxCount = 0;
        let mostCommon = values[0];
        for (const [value, count] of counts.entries()) {
          if (count > maxCount) {
            maxCount = count;
            mostCommon = value;
          }
        }
        consensus[key] = mostCommon;
        continue;
      }

      // For other types, use first non-null value
      consensus[key] = values[0];
    }

    return consensus;
  }

  /**
   * Update agent performance metadata
   */
  private updateAgentPerformance(agentId: string, executionTime: number): void {
    const agent = this.agentResolution.getCachedAgent(agentId);
    if (agent) {
      const currentAverage = agent.metadata.averageExecutionTime || 0;
      const usageCount = agent.metadata.usageCount || 1;
      
      // Calculate new average execution time
      const newAverage = currentAverage === 0 
        ? executionTime 
        : ((currentAverage * (usageCount - 1)) + executionTime) / usageCount;
      
      agent.metadata.averageExecutionTime = Math.round(newAverage);
    }
  }

  /**
   * Get coordination statistics
   */
  getCoordinationStats(): {
    totalCoordinations: number;
    successfulCoordinations: number;
    averageExecutionTime: number;
    strategyCounts: Record<CoordinationStrategy, number>;
  } {
    // This would be implemented with proper metrics tracking
    // For now, return basic structure
    return {
      totalCoordinations: 0,
      successfulCoordinations: 0,
      averageExecutionTime: 0,
      strategyCounts: {
        sequential: 0,
        parallel: 0,
        consensus: 0,
      },
    };
  }
}