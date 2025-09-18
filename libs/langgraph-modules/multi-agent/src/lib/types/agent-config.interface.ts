import type {
  AgentDefinition,
  AgentNodeFunction,
} from '../interfaces/multi-agent.interface';

/**
 * Extended agent configuration for declarative patterns
 * This interface bridges the gap between decorator configuration and runtime AgentDefinition
 */
export interface AgentConfiguration
  extends Omit<AgentDefinition, 'nodeFunction' | 'tools'> {
  /**
   * Tool names that will be resolved from the DI container
   * These are resolved to actual tool instances at runtime
   */
  toolNames?: string[];

  /**
   * Actual tools (resolved from toolNames)
   */
  tools?: unknown[];

  /**
   * Agent capabilities for routing and discovery
   */
  capabilities?: string[];

  /**
   * Priority level for agent selection
   */
  priority?: 'low' | 'medium' | 'high' | 'critical';

  /**
   * Expected execution time category
   */
  executionTime?: 'fast' | 'medium' | 'slow';

  /**
   * Output format specification
   */
  outputFormat?: string;

  /**
   * Auto-registration with AgentRegistryService
   */
  autoRegister?: boolean;
}

/**
 * Runtime agent definition with resolved dependencies
 * This is what gets registered with the AgentRegistryService
 */
export interface ResolvedAgentDefinition extends AgentDefinition {
  /**
   * Original configuration from decorator
   */
  originalConfig: AgentConfiguration;

  /**
   * Whether this agent was auto-registered
   */
  autoRegistered: boolean;

  /**
   * Registration timestamp
   */
  registeredAt: Date;
}

/**
 * Agent discovery metadata for automatic registration
 */
export interface AgentDiscoveryMetadata {
  /**
   * Class constructor
   */
  target: new (...args: any[]) => any;

  /**
   * Agent configuration
   */
  config: AgentConfiguration;

  /**
   * Dependencies required for instantiation
   */
  dependencies?: string[];

  /**
   * Registration status
   */
  registered: boolean;
}

/**
 * Agent factory function signature
 * Used to create agent node functions from decorated classes
 */
export type AgentFactory = (
  agentInstance: any,
  config: AgentConfiguration
) => AgentNodeFunction;

/**
 * Agent registry configuration options
 */
export interface AgentRegistryOptions {
  /**
   * Enable automatic agent discovery
   */
  enableAutoDiscovery: boolean;

  /**
   * Enable health monitoring
   */
  enableHealthMonitoring: boolean;

  /**
   * Agent registration timeout
   */
  registrationTimeout: number;

  /**
   * Default agent factory function
   */
  defaultAgentFactory?: AgentFactory;
}

/**
 * Constants for agent configuration
 */
export const AGENT_CONFIG_CONSTANTS = {
  /**
   * Default priority for agents
   */
  DEFAULT_PRIORITY: 'medium' as const,

  /**
   * Default execution time
   */
  DEFAULT_EXECUTION_TIME: 'medium' as const,

  /**
   * Default auto-registration setting
   */
  DEFAULT_AUTO_REGISTER: true,

  /**
   * Default registration timeout (in ms)
   */
  DEFAULT_REGISTRATION_TIMEOUT: 5000,

  /**
   * Default health monitoring
   */
  DEFAULT_HEALTH_MONITORING: true,
} as const;
