import { SetMetadata, type Type } from '@nestjs/common';
import { getMultiAgentConfigWithDefaults } from '../utils/multi-agent-config.accessor';

/**
 * Multi-agent topology types based on LangGraph patterns
 */
export enum MultiAgentTopology {
  /**
   * Supervisor pattern: Central LLM coordinator routes to worker agents
   * @see https://langchain-ai.github.io/langgraph/concepts/multi_agent/#supervisor
   */
  SUPERVISOR = 'supervisor',

  /**
   * Swarm pattern: Agents collaborate peer-to-peer without central coordinator
   * @see https://langchain-ai.github.io/langgraph/concepts/multi_agent/#swarm
   */
  SWARM = 'swarm',

  /**
   * Hierarchical pattern: Multi-level supervision with sub-supervisors
   * @see https://langchain-ai.github.io/langgraph/concepts/multi_agent/#hierarchical
   */
  HIERARCHICAL = 'hierarchical',

  /**
   * Sequential pattern: Linear execution of agents in defined order
   */
  SEQUENTIAL = 'sequential',
}

/**
 * Supervisor-specific configuration
 */
export interface SupervisorConfig {
  /**
   * System prompt for the supervisor LLM
   * Defines routing logic and coordination rules
   */
  systemPrompt: string;

  /**
   * Worker agent IDs (must match agent decorator IDs)
   */
  workers: string[];

  /**
   * Forward messages between agents
   */
  enableForwardMessage?: boolean;

  /**
   * Remove handoff messages from history
   */
  removeHandoffMessages?: boolean;

  /**
   * LLM configuration for supervisor
   */
  llm?: {
    provider?: 'openai' | 'anthropic' | 'google';
    model?: string;
    temperature?: number;
  };
}

/**
 * Swarm-specific configuration
 */
export interface SwarmConfig {
  /**
   * Initial agent to start with
   */
  initialAgent?: string;

  /**
   * Maximum collaboration rounds
   */
  maxRounds?: number;

  /**
   * Enable agent-to-agent communication
   */
  enablePeerCommunication?: boolean;
}

/**
 * Hierarchical-specific configuration
 */
export interface HierarchicalConfig {
  /**
   * Hierarchy definition: supervisor -> [workers, sub-supervisors]
   */
  hierarchy: {
    supervisor: string;
    workers: string[];
    subSupervisors?: Array<{
      id: string;
      workers: string[];
    }>;
  };

  /**
   * Enable escalation to higher level
   */
  enableEscalation?: boolean;
}

/**
 * Sequential-specific configuration
 */
export interface SequentialConfig {
  /**
   * Execution sequence (ordered agent IDs)
   */
  sequence: string[];

  /**
   * Stop on first failure
   */
  stopOnFailure?: boolean;
}

/**
 * Multi-agent network configuration
 */
export interface MultiAgentConfig {
  /**
   * Unique network identifier
   */
  networkId: string;

  /**
   * Network coordination topology
   */
  topology: MultiAgentTopology;

  /**
   * Worker agent classes to coordinate
   * These will be automatically registered and converted to nodes
   */
  agents: Type<any>[];

  /**
   * Topology-specific configuration
   */
  config:
    | SupervisorConfig
    | SwarmConfig
    | HierarchicalConfig
    | SequentialConfig;

  /**
   * Enable automatic streaming for coordination
   */
  streaming?: boolean;

  /**
   * Enable automatic checkpointing
   */
  checkpointing?: boolean;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Metadata key for multi-agent configuration
 */
export const MULTI_AGENT_METADATA_KEY = 'multi-agent:config';

/**
 * @MultiAgent Decorator
 *
 * Transforms a workflow into a LangGraph-compliant multi-agent coordination pattern.
 *
 * This decorator:
 * 1. Automatically registers worker agents from the agents array
 * 2. Creates appropriate graph topology based on configuration
 * 3. Sets up routing logic based on topology type
 * 4. Manages network lifecycle (setup, execution, teardown)
 * 5. Provides clean API without exposing internal coordination services
 *
 * @example Supervisor Pattern
 * ```typescript
 * @MultiAgent({
 *   networkId: 'devbrand-supervisor',
 *   topology: MultiAgentTopology.SUPERVISOR,
 *   agents: [GitHubAnalyzerAgent, BrandStrategistAgent, ContentCreatorAgent],
 *   config: {
 *     systemPrompt: 'You are a supervisor managing developer branding agents...',
 *     workers: ['github-code-analyzer', 'personal-brand-strategist', 'content-creator'],
 *     enableForwardMessage: true
 *   }
 * })
 * export class DevBrandSupervisorWorkflow extends MultiAgentWorkflowBase {
 *   // Clean! No manual setup, automatic coordination
 * }
 * ```
 *
 * @example Swarm Pattern
 * ```typescript
 * @MultiAgent({
 *   networkId: 'research-swarm',
 *   topology: MultiAgentTopology.SWARM,
 *   agents: [WebSearchAgent, DataAnalysisAgent, SynthesisAgent],
 *   config: {
 *     initialAgent: 'web-search',
 *     maxRounds: 5,
 *     enablePeerCommunication: true
 *   }
 * })
 * export class ResearchSwarmWorkflow extends MultiAgentWorkflowBase {
 *   // Agents collaborate peer-to-peer
 * }
 * ```
 */
export function MultiAgent(config: MultiAgentConfig): ClassDecorator {
  return (target: any) => {
    // 🆕 MODULE CONFIG: Load defaults from module configuration
    const moduleConfig = getMultiAgentConfigWithDefaults();

    // Apply defaults from module config for optional properties
    const configWithDefaults: MultiAgentConfig = {
      ...config,
      streaming: config.streaming ?? moduleConfig.streaming.enabled,
      checkpointing: config.checkpointing ?? moduleConfig.checkpointing.enabled,
      debug: config.debug ?? moduleConfig.debug.enabled,
    };

    // Apply defaults to SupervisorConfig if applicable
    if (config.topology === MultiAgentTopology.SUPERVISOR) {
      const supervisorConfig = config.config as SupervisorConfig;
      configWithDefaults.config = {
        ...supervisorConfig,
        enableForwardMessage: supervisorConfig.enableForwardMessage ?? true,
        removeHandoffMessages: supervisorConfig.removeHandoffMessages ?? false,
      };
    }

    // Validate configuration
    validateMultiAgentConfig(configWithDefaults, target.name);

    // Store multi-agent metadata for workflow-engine to process
    Reflect.defineMetadata(
      MULTI_AGENT_METADATA_KEY,
      configWithDefaults,
      target
    );
    SetMetadata(MULTI_AGENT_METADATA_KEY, configWithDefaults)(target);

    // Mark class as multi-agent workflow
    SetMetadata('multi-agent:marker', true)(target);

    return target;
  };
}

/**
 * Validate multi-agent configuration
 */
function validateMultiAgentConfig(
  config: MultiAgentConfig,
  className: string
): void {
  if (!config.networkId) {
    throw new Error(`@MultiAgent requires a networkId. Class: ${className}`);
  }

  if (!config.agents || config.agents.length === 0) {
    throw new Error(
      `@MultiAgent requires at least one agent. Class: ${className}`
    );
  }

  if (!config.topology) {
    throw new Error(
      `@MultiAgent requires a topology (${Object.values(
        MultiAgentTopology
      ).join('|')}). Class: ${className}`
    );
  }

  if (!config.config) {
    throw new Error(
      `@MultiAgent requires topology-specific config. Class: ${className}`
    );
  }

  // Topology-specific validation
  switch (config.topology) {
    case MultiAgentTopology.SUPERVISOR:
      validateSupervisorConfig(config.config as SupervisorConfig, className);
      break;
    case MultiAgentTopology.SWARM:
      validateSwarmConfig(config.config as SwarmConfig, className);
      break;
    case MultiAgentTopology.HIERARCHICAL:
      validateHierarchicalConfig(
        config.config as HierarchicalConfig,
        className
      );
      break;
    case MultiAgentTopology.SEQUENTIAL:
      validateSequentialConfig(config.config as SequentialConfig, className);
      break;
    default:
      throw new Error(
        `Unknown topology: ${config.topology}. Class: ${className}`
      );
  }
}

function validateSupervisorConfig(
  config: SupervisorConfig,
  className: string
): void {
  if (!config.systemPrompt) {
    throw new Error(
      `@MultiAgent(SUPERVISOR) requires systemPrompt. Class: ${className}`
    );
  }
  if (!config.workers || config.workers.length === 0) {
    throw new Error(
      `@MultiAgent(SUPERVISOR) requires workers array. Class: ${className}`
    );
  }
}

function validateSwarmConfig(config: SwarmConfig, className: string): void {
  if (config.maxRounds !== undefined && config.maxRounds < 1) {
    throw new Error(
      `@MultiAgent(SWARM) maxRounds must be >= 1. Class: ${className}`
    );
  }
}

function validateHierarchicalConfig(
  config: HierarchicalConfig,
  className: string
): void {
  if (!config.hierarchy) {
    throw new Error(
      `@MultiAgent(HIERARCHICAL) requires hierarchy definition. Class: ${className}`
    );
  }
  if (!config.hierarchy.supervisor) {
    throw new Error(
      `@MultiAgent(HIERARCHICAL) requires hierarchy.supervisor. Class: ${className}`
    );
  }
  if (!config.hierarchy.workers || config.hierarchy.workers.length === 0) {
    throw new Error(
      `@MultiAgent(HIERARCHICAL) requires hierarchy.workers. Class: ${className}`
    );
  }
}

function validateSequentialConfig(
  config: SequentialConfig,
  className: string
): void {
  if (!config.sequence || config.sequence.length === 0) {
    throw new Error(
      `@MultiAgent(SEQUENTIAL) requires sequence array. Class: ${className}`
    );
  }
}

/**
 * Get multi-agent configuration from a class
 */
export function getMultiAgentConfig(target: any): MultiAgentConfig | undefined {
  return Reflect.getMetadata(MULTI_AGENT_METADATA_KEY, target);
}

/**
 * Check if a class is decorated with @MultiAgent
 */
export function isMultiAgentWorkflow(target: any): boolean {
  return Reflect.getMetadata('multi-agent:marker', target) === true;
}

/**
 * Type guard for supervisor config
 */
export function isSupervisorConfig(config: any): config is SupervisorConfig {
  return 'systemPrompt' in config && 'workers' in config;
}

/**
 * Type guard for swarm config
 */
export function isSwarmConfig(config: any): config is SwarmConfig {
  return 'maxRounds' in config || 'enablePeerCommunication' in config;
}

/**
 * Type guard for hierarchical config
 */
export function isHierarchicalConfig(
  config: any
): config is HierarchicalConfig {
  return 'hierarchy' in config;
}

/**
 * Type guard for sequential config
 */
export function isSequentialConfig(config: any): config is SequentialConfig {
  return 'sequence' in config;
}
