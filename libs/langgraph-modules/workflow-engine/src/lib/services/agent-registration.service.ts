import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  isAgentDecorated,
  getAgentConfig,
} from '@hive-academy/langgraph-multi-agent';
import type {
  AgentConfig,
  AgentProvider,
  WorkflowAgentConfig,
} from '@hive-academy/langgraph-multi-agent';
import {
  getTaskMetadata,
  getEntrypointMetadata,
  getNodeMetadata,
} from '@hive-academy/langgraph-functional-api';
import type {
  TaskMetadata,
  EntrypointMetadata,
  NodeMetadata,
  EdgeMetadata,
} from '@hive-academy/langgraph-functional-api';
import { isAgentConfigWithType, isEntrypointMetadataWithId, isTaskMetadataWithId, isNodeMetadataWithId } from '../utils/type-guards';

/**
 * Internal workflow step metadata for workflow agents
 */
export interface InternalWorkflowStep {
  /** Step unique identifier */
  id: string;
  /** Step name */
  name: string;
  /** Step type */
  type: 'entrypoint' | 'task' | 'node' | 'condition';
  /** Method name */
  methodName: string;
  /** Method metadata */
  metadata: TaskMetadata | EntrypointMetadata | NodeMetadata | EdgeMetadata;
  /** Step configuration */
  config?: {
    timeout?: number;
    retryCount?: number;
    priority?: number;
  };
}

/**
 * Internal workflow definition for workflow agents
 */
export interface InternalWorkflowDefinition {
  /** Workflow identifier */
  id: string;
  /** Workflow name */
  name: string;
  /** Workflow description */
  description?: string;
  /** Workflow steps */
  steps: InternalWorkflowStep[];
  /** Entry point step */
  entryPoint: string;
}

/**
 * Agent registration details
 */
export interface AgentRegistration {
  /** Agent identifier */
  id: string;
  /** Agent configuration */
  config: AgentConfig | WorkflowAgentConfig;
  /** Agent class constructor */
  agentClass: AgentProvider;
  /** Agent capabilities */
  capabilities: {
    /** Agent-specific capabilities */
    capabilities: string[];
    /** Available tools */
    tools: string[];
    /** Supported workflows */
    workflows: string[];
  };
  /** Agent metadata */
  metadata: {
    /** Registration timestamp */
    registeredAt: Date;
    /** Last access timestamp */
    lastAccessed?: Date;
    /** Access count */
    accessCount: number;
    /** Average execution time in milliseconds */
    averageExecutionTime?: number;
    /** Error count */
    errorCount: number;
  };
  /** Internal workflow definition (for workflow agents) */
  internalWorkflow?: InternalWorkflowDefinition;
}

/**
 * Service responsible for managing agent registration and discovery.
 * Handles agent providers, registration, and metadata management.
 */
@Injectable()
export class AgentRegistrationService {
  private readonly logger = new Logger(AgentRegistrationService.name);
  
  /** Registry of all registered agents */
  private readonly agentRegistry = new Map<string, AgentRegistration>();
  
  /** List of agent providers to register */
  private agentProviders: AgentProvider[] = [];

  constructor(
    @Optional() private readonly injectedAgentProviders?: AgentProvider[]
  ) {}

  /**
   * Set agent providers for registration
   */
  setAgentProviders(providers: AgentProvider[]): void {
    this.agentProviders = providers;
    this.logger.debug(`Set ${providers.length} agent providers for registration`);
  }

  /**
   * Register all provided agents
   */
  async registerProvidedAgents(): Promise<void> {
    if (this.injectedAgentProviders) {
      this.agentProviders = [...this.agentProviders, ...this.injectedAgentProviders];
    }

    for (const AgentClass of this.agentProviders) {
      try {
        if (isAgentDecorated(AgentClass)) {
          await this.registerAgent(AgentClass);
        }
      } catch (error) {
        this.logger.error(`Failed to register agent ${AgentClass.name}:`, error);
      }
    }

    this.logger.log(`Registered ${this.agentRegistry.size} agents successfully`);
  }

  /**
   * Register a single agent
   */
  async registerAgent(AgentClass: AgentProvider): Promise<void> {
    const agentConfig = getAgentConfig(AgentClass);
    if (!agentConfig) {
      this.logger.warn(`Agent ${AgentClass.name} has no configuration, skipping registration`);
      return;
    }

    // Check for existing registration
    if (this.agentRegistry.has(agentConfig.id)) {
      this.logger.warn(`Agent ${agentConfig.id} is already registered, skipping`);
      return;
    }

    // For workflow agents, analyze internal workflow
    let internalWorkflow: InternalWorkflowDefinition | undefined;
    if (isAgentConfigWithType(agentConfig, 'workflow-agent')) {
      try {
        internalWorkflow = this.analyzeAgentWorkflow(AgentClass);
      } catch (error) {
        this.logger.error(`Failed to analyze workflow for agent ${agentConfig.id}:`, error);
      }
    }

    const registration: AgentRegistration = {
      id: agentConfig.id,
      config: agentConfig,
      agentClass: AgentClass,
      capabilities: {
        capabilities: agentConfig.capabilities || [],
        tools: agentConfig.tools || [],
        workflows: internalWorkflow ? [internalWorkflow.name] : [],
      },
      metadata: {
        registeredAt: new Date(),
        accessCount: 0,
        errorCount: 0,
      },
      internalWorkflow,
    };

    this.agentRegistry.set(agentConfig.id, registration);
    this.logger.debug(`Registered agent: ${agentConfig.id} (${agentConfig.type})`);
  }

  /**
   * Get all registered agents
   */
  getRegisteredAgents(): AgentRegistration[] {
    return Array.from(this.agentRegistry.values());
  }

  /**
   * Get agent registration by ID
   */
  getAgentRegistration(agentId: string): AgentRegistration | undefined {
    return this.agentRegistry.get(agentId);
  }

  /**
   * Check if agent is registered
   */
  hasAgent(agentId: string): boolean {
    return this.agentRegistry.has(agentId);
  }

  /**
   * Get agents by capability
   */
  getAgentsByCapability(capability: string): string[] {
    const agentIds: string[] = [];
    for (const [agentId, registration] of this.agentRegistry.entries()) {
      if (registration.capabilities.capabilities.includes(capability)) {
        agentIds.push(agentId);
      }
    }
    return agentIds;
  }

  /**
   * Get agents by tool
   */
  getAgentsByTool(tool: string): string[] {
    const agentIds: string[] = [];
    for (const [agentId, registration] of this.agentRegistry.entries()) {
      if (registration.capabilities.tools.includes(tool)) {
        agentIds.push(agentId);
      }
    }
    return agentIds;
  }

  /**
   * Update agent metadata
   */
  updateAgentMetadata(agentId: string, updates: Partial<AgentRegistration['metadata']>): void {
    const registration = this.agentRegistry.get(agentId);
    if (registration) {
      Object.assign(registration.metadata, updates);
    }
  }

  /**
   * Get registry statistics
   */
  getRegistryStats(): {
    totalAgents: number;
    agentsByType: Record<string, number>;
    totalCapabilities: number;
    totalTools: number;
    totalWorkflows: number;
  } {
    const stats = {
      totalAgents: this.agentRegistry.size,
      agentsByType: {} as Record<string, number>,
      totalCapabilities: 0,
      totalTools: 0,
      totalWorkflows: 0,
    };

    const capabilitySet = new Set<string>();
    const toolSet = new Set<string>();
    const workflowSet = new Set<string>();

    for (const registration of this.agentRegistry.values()) {
      const agentType = (isAgentConfigWithType(registration.config, 'workflow-agent') || isAgentConfigWithType(registration.config, 'simple-agent')) 
        ? registration.config.type 
        : 'unknown';
      stats.agentsByType[agentType] = (stats.agentsByType[agentType] || 0) + 1;

      registration.capabilities.capabilities.forEach(cap => capabilitySet.add(cap));
      registration.capabilities.tools.forEach(tool => toolSet.add(tool));
      registration.capabilities.workflows.forEach(workflow => workflowSet.add(workflow));
    }

    stats.totalCapabilities = capabilitySet.size;
    stats.totalTools = toolSet.size;
    stats.totalWorkflows = workflowSet.size;

    return stats;
  }

  /**
   * Clear all registrations
   */
  clearRegistry(): void {
    this.agentRegistry.clear();
    this.logger.debug('Cleared agent registry');
  }

  /**
   * Analyze agent workflow structure
   */
  private analyzeAgentWorkflow(AgentClass: AgentProvider): InternalWorkflowDefinition {
    const methodNames = Object.getOwnPropertyNames(AgentClass.prototype);
    const steps: InternalWorkflowStep[] = [];
    let entryPoint: string | undefined;

    for (const methodName of methodNames) {
      if (methodName === 'constructor') continue;

      try {
        const entrypointMetadata = getEntrypointMetadata(AgentClass.prototype, methodName);
        if (entrypointMetadata) {
          const entrypointId = isEntrypointMetadataWithId(entrypointMetadata) ? entrypointMetadata.id : methodName;
          steps.push({
            id: entrypointId,
            name: entrypointMetadata.name || methodName,
            type: 'entrypoint',
            methodName,
            metadata: entrypointMetadata,
          });
          entryPoint = entrypointId;
        }

        const taskMetadata = getTaskMetadata(AgentClass.prototype, methodName);
        if (taskMetadata) {
          const taskId = isTaskMetadataWithId(taskMetadata) ? taskMetadata.id : methodName;
          steps.push({
            id: taskId,
            name: taskMetadata.name || methodName,
            type: 'task',
            methodName,
            metadata: taskMetadata,
          });
        }

        const nodeMetadata = getNodeMetadata(AgentClass.prototype, methodName);
        if (nodeMetadata) {
          const nodeId = isNodeMetadataWithId(nodeMetadata) ? nodeMetadata.id : methodName;
          steps.push({
            id: nodeId,
            name: nodeMetadata.name || methodName,
            type: 'node',
            methodName,
            metadata: nodeMetadata,
          });

          if (!entryPoint && isNodeMetadataWithId(nodeMetadata) && nodeMetadata.id === 'start') {
            entryPoint = nodeMetadata.id;
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to analyze method ${methodName} in ${AgentClass.name}:`, error);
      }
    }

    if (!entryPoint && steps.length > 0) {
      entryPoint = steps[0].id;
    }

    if (steps.length === 0) {
      throw new Error(`No workflow steps found in agent ${AgentClass.name}`);
    }

    return {
      id: `${AgentClass.name.toLowerCase()}-workflow`,
      name: `${AgentClass.name} Workflow`,
      description: `Internal workflow for ${AgentClass.name}`,
      steps,
      entryPoint: entryPoint!,
    };
  }
}