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
   * 🆕 EXPLICIT WORKFLOW TYPE DECLARATION
   * Determines which decorators are allowed:
   * - 'functional-task': @Entrypoint + @Task only (linear/sequential workflows)
   * - 'functional-node': @Node + @Edge only (complex routing/branching workflows)
   *
   * Import from functional-api:
   * import { WorkflowType } from '@hive-academy/langgraph-functional-api';
   */
  type?: 'functional-task' | 'functional-node';

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
 * 🆕 SMART DEFAULTS: Utility Functions for Convention-Based Configuration
 */

/**
 * Derives kebab-case ID from class name
 * @example GitHubAnalyzerAgent → github-analyzer
 */
function deriveIdFromClassName(className: string): string {
  return className
    .replace(/Agent$/, '') // Remove 'Agent' suffix
    .replace(/([a-z])([A-Z])/g, '$1-$2') // Insert hyphens before capitals
    .toLowerCase();
}

/**
 * Converts class name to human-readable format
 * @example GitHubAnalyzerAgent → GitHub Analyzer
 */
function humanizeClassName(className: string): string {
  return (
    className
      .replace(/Agent$/, '') // Remove 'Agent' suffix
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Insert spaces before capitals
      // Preserve acronyms (e.g., "GitHub" instead of "Git Hub")
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .trim()
  );
}

/**
 * Auto-detects agent type based on class hierarchy
 * @param target - The class constructor to inspect
 * @returns 'workflow-agent' if extends DeclarativeWorkflowBase, otherwise 'simple-agent'
 */
function detectAgentType(target: any): AgentType {
  // Check prototype chain for DeclarativeWorkflowBase
  let proto = Object.getPrototypeOf(target);
  while (proto && proto !== Object.prototype) {
    const protoName = proto.name;
    if (
      protoName === 'DeclarativeWorkflowBase' ||
      protoName === 'StreamingWorkflowBase' ||
      protoName === 'UnifiedWorkflowBase'
    ) {
      return 'workflow-agent';
    }
    proto = Object.getPrototypeOf(proto);
  }
  return 'simple-agent';
}

/**
 * Creates default workflow configuration for workflow-agent types
 */
function createDefaultWorkflowConfig(
  agentId: string,
  agentDescription: string
): AgentWorkflowConfig {
  return {
    name: `${agentId}-workflow`,
    description: agentDescription,
    streaming: true,
    confidenceThreshold: 0.7,
    metrics: true,
    enableInternalStreaming: true,
    enableInternalCheckpointing: true,
    internalTimeout: 60000, // 1 minute
    enableErrorRecovery: true,
    maxInternalRetries: 2,
    enableStepProgress: true,
    stateKey: `${agentId}-state`,
  };
}

/**
 * 🆕 ENHANCED: Agent decorator for declarative agent configuration
 *
 * This decorator automatically registers agents with the AgentRegistryService
 * and provides a clean, declarative way to configure multi-agent systems.
 *
 * NEW: Smart defaults reduce boilerplate from 20+ lines to 3-5 lines:
 * - Auto-derives id from class name (GitHubAnalyzerAgent → github-analyzer)
 * - Auto-generates human-readable name (GitHubAnalyzerAgent → GitHub Analyzer)
 * - Auto-detects type by inspecting class hierarchy (extends DeclarativeWorkflowBase → workflow-agent)
 * - Auto-applies sensible workflow defaults for workflow-agent types
 *
 * @param config - Agent configuration options (all optional with smart defaults)
 *
 * @example Minimal Agent (Smart Defaults)
 * ```typescript
 * @Agent({
 *   description: 'Analyzes GitHub repositories for technical achievements'
 * })
 * @Injectable()
 * export class GitHubAnalyzerAgent {
 *   // id: 'github-analyzer' (auto-derived)
 *   // name: 'GitHub Analyzer' (auto-generated)
 *   // type: 'simple-agent' (auto-detected)
 * }
 * ```
 *
 * @example Workflow Agent (Smart Defaults + Type Detection)
 * ```typescript
 * @Agent({
 *   description: 'Multi-step brand analysis and strategy generation'
 * })
 * @Injectable()
 * export class PersonalBrandStrategistAgent extends DeclarativeWorkflowBase {
 *   // id: 'personal-brand-strategist' (auto-derived)
 *   // name: 'Personal Brand Strategist' (auto-generated)
 *   // type: 'workflow-agent' (auto-detected from DeclarativeWorkflowBase)
 *   // workflow: { streaming: true, confidenceThreshold: 0.7, ... } (auto-applied)
 * }
 * ```
 *
 * @example Full Control (Explicit Config Overrides Defaults)
 * ```typescript
 * @Agent({
 *   id: 'github-analyzer',
 *   name: 'GitHub Analyzer',
 *   description: 'Analyzes GitHub repositories for technical achievements',
 *   type: 'workflow-agent', // Explicit override
 *   tools: ['github_analyzer', 'achievement_extractor'],
 *   capabilities: ['repository_analysis', 'skill_extraction'],
 *   priority: 'high',
 *   workflow: {
 *     name: 'custom-workflow-name',
 *     confidenceThreshold: 0.9, // Override default
 *   }
 * })
 * @Injectable()
 * export class GitHubAnalyzerAgent extends DeclarativeWorkflowBase {
 *   // Explicit config always overrides smart defaults
 * }
 * ```
 */
export function Agent(config: Partial<AgentConfig> = {}): ClassDecorator {
  return (target: any) => {
    // 🆕 SMART DEFAULTS: Apply convention-based configuration
    const derivedId = deriveIdFromClassName(target.name);
    const derivedName = humanizeClassName(target.name);
    const detectedType = detectAgentType(target);

    // Build base configuration with smart defaults
    const baseConfig: AgentConfig = {
      id: derivedId,
      name: derivedName,
      description: `${derivedName} Agent`,
      type: detectedType,
    };

    // 🆕 WORKFLOW DEFAULTS: Auto-apply workflow configuration for workflow-agent types
    if (detectedType === 'workflow-agent' && !config.workflow) {
      baseConfig.workflow = createDefaultWorkflowConfig(
        derivedId,
        baseConfig.description
      );
    }

    // Merge user config (explicit config always overrides defaults)
    const agentConfig: AgentConfig = {
      ...baseConfig,
      ...config,
      // Deep merge workflow config if both exist
      workflow:
        config.workflow && baseConfig.workflow
          ? { ...baseConfig.workflow, ...config.workflow }
          : config.workflow || baseConfig.workflow,
    };

    // 🆕 ENHANCEMENT: Auto-apply workflow capabilities for workflow-agent type
    if (agentConfig.type === 'workflow-agent' && agentConfig.workflow) {
      // Create workflow configuration from unified config
      const workflowConfig = {
        name: agentConfig.workflow.name || `${agentConfig.id}-workflow`,
        description:
          agentConfig.workflow.description || agentConfig.description,
        type: agentConfig.workflow.type, // 🔧 FIX: Include workflow type for pattern validation
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
