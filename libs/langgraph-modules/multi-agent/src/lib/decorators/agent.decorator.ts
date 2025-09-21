import { SetMetadata } from '@nestjs/common';

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
   * Workflow configuration for workflow-agent types
   * Only applicable when type is 'workflow-agent'
   */
  workflowConfig?: WorkflowAgentConfig;
}

/**
 * Metadata key for agent configuration storage
 */
export const AGENT_METADATA_KEY = 'agent:config';

/**
 * Agent decorator for declarative agent configuration
 *
 * This decorator automatically registers agents with the AgentRegistryService
 * and provides a clean, declarative way to configure multi-agent systems.
 *
 * @param config - Agent configuration options
 *
 * @example
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
 *   // Agent implementation with nodeFunction method
 *   async nodeFunction(state: AgentState): Promise<Partial<AgentState>> {
 *     // Agent logic here
 *   }
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
