import type { z } from 'zod';
import type { AgentDefinition, AgentState } from './agent.types';
import type { SupervisorConfig } from './topology/supervisor-config.types';
import type { SwarmConfig } from './topology/swarm-config.types';
import type { HierarchicalConfig } from './topology/hierarchical-config.types';
import type { NetworkConfig } from './topology/network-config.types';

/**
 * Multi-agent network configuration (2025 pattern)
 * Defines a complete multi-agent system with agents, topology, and configuration
 */
export interface AgentNetwork {
  /**
   * Network identifier
   * Unique ID for this agent network
   */
  id: string;

  /**
   * Network type (topology pattern)
   * Determines coordination strategy
   */
  type: 'supervisor' | 'swarm' | 'hierarchical' | 'network';

  /**
   * Agent definitions in the network
   * All agents participating in this network
   */
  agents: readonly AgentDefinition[];

  /**
   * Network-specific configuration
   * Configuration matching the topology type
   */
  config: SupervisorConfig | SwarmConfig | HierarchicalConfig | NetworkConfig;

  /**
   * State schema definition
   * Zod schema for validating agent state
   */
  stateSchema?: z.ZodSchema<AgentState>;

  /**
   * Graph compilation options
   * Options passed to LangGraph .compile()
   */
  compilationOptions?: {
    /**
     * Enable state interrupts for human-in-the-loop
     */
    enableInterrupts?: boolean;

    /**
     * Checkpointer for persistence
     */
    checkpointer?: unknown;

    /**
     * Debug mode
     */
    debug?: boolean;
  };
}

/**
 * Checkpointing configuration for multi-agent networks
 * Uses the optional DI pattern with CheckpointIntegrationConfig
 */
export interface CheckpointingConfig {
  /**
   * Enable checkpointing globally
   */
  enabled: boolean;

  /**
   * Enable checkpointing for all networks by default
   */
  enableForAllNetworks: boolean;

  /**
   * Default thread prefix for checkpoint storage
   */
  defaultThreadPrefix: string;

  /**
   * Default saver name to use
   */
  defaultSaver?: string;

  /**
   * Automatic checkpoint configuration
   */
  autoCheckpoint?: {
    enabled: boolean;
    interval?: number;
    after?: Array<'task' | 'node' | 'error' | 'decision' | 'custom'>;
  };

  /**
   * Error handling configuration
   */
  errorHandling?: {
    continueOnCheckpointFailure: boolean;
    logErrors: boolean;
    maxRetries: number;
  };
}

/**
 * Execution result from multi-agent workflow
 * Returned after workflow completes
 */
export interface MultiAgentResult {
  /**
   * Final state of the workflow
   */
  finalState: Partial<AgentState>;

  /**
   * Execution path taken
   * Array of agent IDs in order of execution
   */
  executionPath: string[];

  /**
   * Total execution time in milliseconds
   */
  executionTime: number;

  /**
   * Success status
   */
  success: boolean;

  /**
   * Error if execution failed
   */
  error?: Error;

  /**
   * Token usage statistics
   * Tracks LLM token consumption
   */
  tokenUsage?: {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
  };
}
