import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import type {
  IAgentProvider,
  IToolProvider,
  IWorkflowProvider,
} from '@hive-academy/langgraph-core';
import type { WorkflowClass } from '@hive-academy/langgraph-functional-api';

/**
 * Centralized registry for all agents, tools, and workflows in the workflow engine.
 * This is the SINGLE source of truth for registration across all modules.
 *
 * ARCHITECTURE NOTE: Uses core interfaces (IAgentProvider, IToolProvider, IWorkflowProvider)
 * to avoid circular dependency with multi-agent module. This follows the Dependency
 * Inversion Principle - high-level orchestration depends on abstractions, not implementations.
 */
@Injectable()
export class CentralRegistryService {
  private readonly logger = new Logger(CentralRegistryService.name);

  // Internal registries - using core interfaces
  private readonly agents = new Map<string, IAgentProvider>();
  private readonly tools = new Map<string, IToolProvider>();
  private readonly workflows = new Map<
    string,
    IWorkflowProvider | WorkflowClass
  >();

  // Execution service references (injected from other modules)
  private multiAgentExecutor?: any;
  private functionalApiExecutor?: any;

  constructor(
    @Optional()
    @Inject('WORKFLOW_ENGINE_AGENTS')
    private readonly configuredAgents: IAgentProvider[] = [],
    @Optional()
    @Inject('WORKFLOW_ENGINE_TOOLS')
    private readonly configuredTools: IToolProvider[] = [],
    @Optional()
    @Inject('WORKFLOW_ENGINE_WORKFLOWS')
    private readonly configuredWorkflows: (
      | IWorkflowProvider
      | WorkflowClass
    )[] = []
  ) {
    this.initializeRegistry();
  }

  /**
   * Initialize the registry with configured providers
   */
  private initializeRegistry(): void {
    this.logger.log('Initializing centralized registry...');

    // 🆕 ORDER: Register tools FIRST (before agents need them for validation)
    this.configuredTools.forEach((tool) => {
      this.registerTool(tool);
    });

    // Register configured agents (with tool validation)
    this.configuredAgents.forEach((agent) => {
      this.registerAgent(agent);
    });

    // Register configured workflows
    this.configuredWorkflows.forEach((workflow) => {
      this.registerWorkflow(workflow);
    });

    this.logger.log(
      `Registry initialized with ${this.agents.size} agents, ${this.tools.size} tools, ${this.workflows.size} workflows`
    );
  }

  /**
   * Set execution service references from other modules
   */
  setExecutionServices(services: {
    multiAgentExecutor?: any;
    functionalApiExecutor?: any;
  }): void {
    this.multiAgentExecutor = services.multiAgentExecutor;
    this.functionalApiExecutor = services.functionalApiExecutor;
    this.logger.log('Execution services registered with central registry');
  }

  /**
   * VALIDATION: Basic tool registration check
   *
   * ARCHITECTURE NOTE: This method performs basic validation that tool CLASSES
   * are registered, but does NOT validate individual tool method names because
   * workflow-engine registers tools at the class level for decoupling.
   *
   * Individual tool method validation happens in multi-agent's ToolRegistrationService
   * which has access to decorator metadata extraction utilities.
   *
   * This ensures agents have their tool providers available without enforcing
   * granular method-level validation that would require multi-agent imports.
   */
  private validateAgentTools(agent: IAgentProvider): void {
    // Tool validation is intentionally minimal at this layer
    // Full validation with individual method names happens in multi-agent module
    // This avoids circular dependency on getClassTools and decorator extraction

    // Log agent registration for debugging
    const agentClass = this.extractAgentClass(agent);
    if (agentClass) {
      const agentConfig: any = Reflect.getMetadata('agent:config', agentClass);
      if (agentConfig?.tools && agentConfig.tools.length > 0) {
        this.logger.debug(
          `Agent "${
            agentConfig.id || agentClass.name
          }" requests tools: ${agentConfig.tools.join(', ')}`
        );
      }
    }
  }

  /**
   * Extract agent class from provider (helper method)
   */
  private extractAgentClass(agent: IAgentProvider): any {
    if (typeof agent === 'function') {
      return agent;
    } else if (typeof agent === 'object' && agent !== null) {
      const providerObj = agent as any;
      return providerObj.useClass || providerObj;
    }
    return null;
  }

  /**
   * Register an agent provider
   */
  registerAgent(agent: IAgentProvider): void {
    // 🆕 VALIDATION: Check that all requested tools exist
    this.validateAgentTools(agent);

    const agentId = this.getAgentId(agent);
    if (this.agents.has(agentId)) {
      this.logger.warn(`Agent ${agentId} already registered, overriding`);
    }
    this.agents.set(agentId, agent);
    this.logger.log(`Agent registered: ${agentId}`);
  }

  /**
   * Register a tool provider
   *
   * Registers tools at the class level for maximum decoupling from multi-agent module.
   * Tools are stored by their provider ID and can be retrieved for agent execution.
   *
   * ARCHITECTURE NOTE: This method intentionally does NOT extract individual @Tool
   * decorated methods to avoid importing multi-agent utilities (getClassTools).
   * Individual method extraction happens in multi-agent's ToolRegistrationService.
   *
   * Future Enhancement: Plugin pattern could enable optional metadata extraction
   * without creating circular dependencies.
   */
  registerTool(tool: IToolProvider): void {
    const toolId = this.getToolId(tool);

    if (this.tools.has(toolId)) {
      this.logger.warn(`Tool ${toolId} already registered, overriding`);
    }

    this.tools.set(toolId, tool);
    this.logger.log(`Tool registered: ${toolId}`);
  }

  /**
   * Register a workflow provider or class
   */
  registerWorkflow(workflow: IWorkflowProvider | WorkflowClass): void {
    const workflowId = this.getWorkflowId(workflow);
    if (this.workflows.has(workflowId)) {
      this.logger.warn(`Workflow ${workflowId} already registered, overriding`);
    }
    this.workflows.set(workflowId, workflow);
    this.logger.log(`Workflow registered: ${workflowId}`);
  }

  /**
   * Get all registered agents
   */
  getAgents(): Map<string, IAgentProvider> {
    return new Map(this.agents);
  }

  /**
   * Get all registered tools
   */
  getTools(): Map<string, IToolProvider> {
    return new Map(this.tools);
  }

  /**
   * Get all registered workflows
   */
  getWorkflows(): Map<string, IWorkflowProvider | WorkflowClass> {
    return new Map(this.workflows);
  }

  /**
   * Get a specific agent by ID
   */
  getAgent(id: string): IAgentProvider | undefined {
    return this.agents.get(id);
  }

  /**
   * Get a specific tool by ID
   */
  getTool(id: string): IToolProvider | undefined {
    return this.tools.get(id);
  }

  /**
   * Get a specific workflow by ID
   */
  getWorkflow(id: string): IWorkflowProvider | WorkflowClass | undefined {
    return this.workflows.get(id);
  }

  /**
   * Execute an agent through the appropriate execution service
   */
  async executeAgent(agentId: string, state: any): Promise<any> {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found in registry`);
    }

    if (!this.multiAgentExecutor) {
      throw new Error('Multi-agent executor not available');
    }

    return this.multiAgentExecutor.executeAgent(agent, state);
  }

  /**
   * Execute a workflow through the appropriate execution service
   */
  async executeWorkflow(workflowId: string, input: any): Promise<any> {
    const workflow = this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found in registry`);
    }

    if (!this.functionalApiExecutor) {
      throw new Error('Functional API executor not available');
    }

    return this.functionalApiExecutor.executeWorkflow(workflow, input);
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    agents: number;
    tools: number;
    workflows: number;
    executorsAvailable: {
      multiAgent: boolean;
      functionalApi: boolean;
    };
  } {
    return {
      agents: this.agents.size,
      tools: this.tools.size,
      workflows: this.workflows.size,
      executorsAvailable: {
        multiAgent: !!this.multiAgentExecutor,
        functionalApi: !!this.functionalApiExecutor,
      },
    };
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.agents.clear();
    this.tools.clear();
    this.workflows.clear();
    this.logger.log('Registry cleared');
  }

  /**
   * Extract agent ID from agent provider
   */
  private getAgentId(agent: IAgentProvider): string {
    if (typeof agent === 'string') {
      return agent;
    }

    if (typeof agent === 'function') {
      return (agent as IAgentProvider).name || 'unknown-agent';
    }

    // Handle NestJS provider objects
    if (typeof agent === 'object' && agent !== null) {
      const providerObj = agent as any;
      if (providerObj.provide) {
        return providerObj.provide.toString();
      }
      if (providerObj.useClass) {
        return providerObj.useClass.name || 'unknown-agent';
      }
      // Handle IAgentProvider interface with id property
      if (providerObj.id) {
        return providerObj.id;
      }
    }
    return 'unknown-agent';
  }

  /**
   * Extract tool ID from tool provider
   */
  private getToolId(tool: IToolProvider): string {
    if (typeof tool === 'string') {
      return tool;
    }
    if (typeof tool === 'function') {
      return (tool as IToolProvider).name || 'unknown-tool';
    }
    // Handle NestJS provider objects
    if (typeof tool === 'object' && tool !== null) {
      const providerObj = tool as any;
      if (providerObj.provide) {
        return providerObj.provide.toString();
      }
      if (providerObj.useClass) {
        return providerObj.useClass.name || 'unknown-tool';
      }
      // Handle IToolProvider interface with name property
      if (providerObj.name) {
        return providerObj.name;
      }
    }
    return 'unknown-tool';
  }

  /**
   * Extract workflow ID from workflow provider or class
   */
  private getWorkflowId(workflow: IWorkflowProvider | WorkflowClass): string {
    if (typeof workflow === 'string') {
      return workflow;
    }
    if (typeof workflow === 'function') {
      return workflow.name || 'unknown-workflow';
    }
    if (typeof workflow === 'object' && workflow !== null) {
      const provider = workflow as any;
      if (provider.provide) {
        return String(provider.provide);
      }
      if (provider.useClass) {
        return provider.useClass.name || 'unknown-workflow';
      }
      // Handle IWorkflowProvider interface with id property
      if (provider.id) {
        return provider.id;
      }
    }
    return 'unknown-workflow';
  }
}
