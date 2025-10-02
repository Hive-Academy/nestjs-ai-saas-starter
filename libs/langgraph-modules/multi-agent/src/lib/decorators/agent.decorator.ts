import { SetMetadata } from '@nestjs/common';
import { WORKFLOW_METADATA_KEY } from '@hive-academy/langgraph-core';

/**
 * Agent type enumeration for enhanced agent architecture
 */
export type AgentType = 'simple-agent' | 'workflow-agent';

/**
 * Workflow configuration for workflow-agent types
 */
export interface WorkflowAgentConfig {
  /**
   * Enable internal streaming for workflow steps
   */
  enableInternalStreaming?: boolean;

  /**
   * Enable internal checkpointing for workflow persistence
   */
  enableInternalCheckpointing?: boolean;

  /**
   * Internal workflow timeout in milliseconds
   */
  internalTimeout?: number;

  /**
   * Enable internal workflow error recovery
   */
  enableErrorRecovery?: boolean;

  /**
   * Maximum number of internal workflow retries
   */
  maxInternalRetries?: number;

  /**
   * Enable workflow step progress tracking
   */
  enableStepProgress?: boolean;

  /**
   * Internal workflow state persistence key
   */
  stateKey?: string;
}

/**
 * 🆕 ENHANCED: Agent-specific workflow configuration interface
 * Combines workflow metadata with agent-specific workflow settings
 */
export interface AgentWorkflowConfig {
  /**
   * Workflow name
   */
  name: string;

  /**
   * Workflow description
   */
  description?: string;

  /**
   * Enable workflow streaming
   */
  streaming?: boolean;

  /**
   * Confidence threshold for workflow execution
   */
  confidenceThreshold?: number;

  /**
   * Enable workflow metrics collection
   */
  metrics?: boolean;

  /**
   * Enable internal streaming for workflow steps
   */
  enableInternalStreaming?: boolean;

  /**
   * Enable internal checkpointing for workflow persistence
   */
  enableInternalCheckpointing?: boolean;

  /**
   * Internal workflow timeout in milliseconds
   */
  internalTimeout?: number;

  /**
   * Enable internal workflow error recovery
   */
  enableErrorRecovery?: boolean;

  /**
   * Maximum number of internal workflow retries
   */
  maxInternalRetries?: number;

  /**
   * Enable workflow step progress tracking
   */
  enableStepProgress?: boolean;

  /**
   * Internal workflow state persistence key
   */
  stateKey?: string;
}

/**
 * Enhanced agent configuration interface for the @Agent decorator
 * Supports both simple agents and workflow agents with internal workflows
 */
export interface AgentConfig {
  /**
   * Unique agent identifier
   */
  id: string;

  /**
   * Agent name for routing decisions
   */
  name: string;

  /**
   * Agent description for supervisor routing
   */
  description: string;

  /**
   * Agent type - determines internal architecture
   * - 'simple-agent': Traditional single nodeFunction agent
   * - 'workflow-agent': Multi-step internal workflow agent
   */
  type?: AgentType;

  /**
   * System prompt for this agent
   */
  systemPrompt?: string;

  /**
   * Tool names available to this agent (will be resolved from DI container)
   */
  tools?: string[];

  /**
   * Agent capabilities for routing and discovery
   */
  capabilities?: string[];

  /**
   * Agent metadata for extended configuration
   */
  metadata?: Record<string, unknown>;

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
   * 🆕 ENHANCED: Unified workflow configuration for workflow-agent types
   * When provided with type: 'workflow-agent', eliminates need for separate @Workflow decorator
   * Only applicable when type is 'workflow-agent'
   */
  workflow?: AgentWorkflowConfig;

  /**
   * @deprecated Use 'workflow' property instead for new implementations
   * Workflow configuration for workflow-agent types
   * Maintained for backward compatibility
   */
  workflowConfig?: WorkflowAgentConfig;
}

/**
 * Metadata key for agent configuration storage
 */
export const AGENT_METADATA_KEY = 'agent:config';

/**
 * 🆕 ENHANCED: Agent decorator for declarative agent configuration
 *
 * This decorator automatically registers agents with the AgentRegistryService
 * and provides a clean, declarative way to configure multi-agent systems.
 *
 * NEW: When type is 'workflow-agent' and workflow config is provided,
 * automatically applies @Workflow decorator capabilities, eliminating duplication.
 *
 * @param config - Agent configuration options
 *
 * @example Basic Agent
 * ```typescript
 * @Agent({
 *   id: 'github-analyzer',
 *   name: 'GitHub Analyzer',
 *   description: 'Analyzes GitHub repositories for technical achievements',
 *   tools: ['github_analyzer', 'achievement_extractor'],
 *   capabilities: ['repository_analysis', 'skill_extraction'],
 *   priority: 'high'
 * })
 * @Injectable()
 * export class GitHubAnalyzerAgent {
 *   async nodeFunction(state: AgentState): Promise<Partial<AgentState>> {
 *     // Agent logic here
 *   }
 * }
 * ```
 *
 * @example 🆕 ENHANCED: Unified Workflow Agent (eliminates @Workflow duplication)
 * ```typescript
 * @Agent({
 *   id: 'brand-strategist',
 *   name: 'Personal Brand Strategist',
 *   type: 'workflow-agent',
 *   workflow: {
 *     name: 'brand-strategy-workflow',
 *     description: 'Multi-step brand analysis and strategy generation',
 *     streaming: true,
 *     confidenceThreshold: 0.7,
 *     enableInternalStreaming: true,
 *     enableInternalCheckpointing: true
 *   }
 * })
 * @Injectable()
 * export class PersonalBrandStrategistAgent extends DeclarativeWorkflowBase {
 *   // No separate @Workflow decorator needed!
 * }
 * ```
 */
export function Agent(config: Partial<AgentConfig> = {}): ClassDecorator {
  return (target: any) => {
    // Create config with defaults for zero-config usage
    const agentConfig: AgentConfig = {
      id: config.id || target.name.toLowerCase().replace(/agent$/, ''),
      name: config.name || target.name.replace(/Agent$/, ''),
      description: config.description || `Agent: ${target.name}`,
      type: config.type || 'simple-agent', // Default to simple agent for backward compatibility
      ...config,
    };

    // 🆕 ENHANCEMENT: Auto-apply workflow capabilities for workflow-agent type
    if (agentConfig.type === 'workflow-agent' && agentConfig.workflow) {
      // Create workflow configuration from unified config
      const workflowConfig = {
        name: agentConfig.workflow.name || `${agentConfig.id}-workflow`,
        description:
          agentConfig.workflow.description || agentConfig.description,
        streaming: agentConfig.workflow.streaming ?? true,
        confidenceThreshold: agentConfig.workflow.confidenceThreshold ?? 0.7,
        metrics: agentConfig.workflow.metrics ?? true,
      };

      // Apply workflow metadata (equivalent to @Workflow decorator)
      SetMetadata(WORKFLOW_METADATA_KEY, workflowConfig)(target);
      SetMetadata('workflow:marker', true)(target);

      // Store internal workflow configuration for agent runtime
      const internalWorkflowConfig = {
        enableInternalStreaming:
          agentConfig.workflow.enableInternalStreaming ?? true,
        enableInternalCheckpointing:
          agentConfig.workflow.enableInternalCheckpointing ?? true,
        internalTimeout: agentConfig.workflow.internalTimeout ?? 60000,
        enableErrorRecovery: agentConfig.workflow.enableErrorRecovery ?? true,
        maxInternalRetries: agentConfig.workflow.maxInternalRetries ?? 2,
        enableStepProgress: agentConfig.workflow.enableStepProgress ?? true,
        stateKey: agentConfig.workflow.stateKey || `${agentConfig.id}-state`,
      };

      // Merge internal workflow config into agent config for backward compatibility
      agentConfig.workflowConfig = internalWorkflowConfig;
    }

    // Set metadata for agent configuration
    SetMetadata(AGENT_METADATA_KEY, agentConfig)(target);

    // Add agent marker for discovery service
    SetMetadata('agent:marker', true)(target);

    return target;
  };
}

/**
 * Type guard to check if a class is decorated with @Agent
 */
export function isAgentDecorated(target: any): boolean {
  return Reflect.hasMetadata(AGENT_METADATA_KEY, target);
}

/**
 * Get agent configuration from a decorated class
 */
export function getAgentConfig(target: any): AgentConfig | undefined {
  return Reflect.getMetadata(AGENT_METADATA_KEY, target);
}

/**
 * Check if a class is marked as an agent
 */
export function isAgent(target: any): boolean {
  return Reflect.getMetadata('agent:marker', target) === true;
}
