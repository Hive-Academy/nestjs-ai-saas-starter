import { SetMetadata } from '@nestjs/common';

/**
 * Agent configuration interface for the @Agent decorator
 * Extends the base AgentDefinition to support declarative patterns
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
export function Agent(config: AgentConfig): ClassDecorator {
  return (target: any) => {
    // Validate required configuration
    if (!config.id) {
      throw new Error(
        `@Agent decorator requires 'id' property on ${target.name}`
      );
    }
    if (!config.name) {
      throw new Error(
        `@Agent decorator requires 'name' property on ${target.name}`
      );
    }
    if (!config.description) {
      throw new Error(
        `@Agent decorator requires 'description' property on ${target.name}`
      );
    }

    // Set metadata for agent configuration
    SetMetadata(AGENT_METADATA_KEY, config)(target);

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
