import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import type { AgentProvider, ToolProvider, WorkflowProvider } from '@hive-academy/langgraph-multi-agent';
import type { WorkflowClass } from '@hive-academy/langgraph-functional-api';

/**
 * Centralized registry for all agents, tools, and workflows in the workflow engine.
 * This is the SINGLE source of truth for registration across all modules.
 */
@Injectable()
export class CentralRegistryService {
  private readonly logger = new Logger(CentralRegistryService.name);
  
  // Internal registries
  private readonly agents = new Map<string, AgentProvider>();
  private readonly tools = new Map<string, ToolProvider>();
  private readonly workflows = new Map<string, WorkflowProvider | WorkflowClass>();
  
  // Execution service references (injected from other modules)
  private multiAgentExecutor?: any;
  private functionalApiExecutor?: any;

  constructor(
    @Optional() @Inject('WORKFLOW_ENGINE_AGENTS') private readonly configuredAgents: AgentProvider[] = [],
    @Optional() @Inject('WORKFLOW_ENGINE_TOOLS') private readonly configuredTools: ToolProvider[] = [],
    @Optional() @Inject('WORKFLOW_ENGINE_WORKFLOWS') private readonly configuredWorkflows: (WorkflowProvider | WorkflowClass)[] = []
  ) {
    this.initializeRegistry();
  }

  /**
   * Initialize the registry with configured providers
   */
  private initializeRegistry(): void {
    this.logger.log('Initializing centralized registry...');
    
    // Register configured agents
    this.configuredAgents.forEach(agent => {
      this.registerAgent(agent);
    });
    
    // Register configured tools
    this.configuredTools.forEach(tool => {
      this.registerTool(tool);
    });
    
    // Register configured workflows
    this.configuredWorkflows.forEach(workflow => {
      this.registerWorkflow(workflow);
    });

    this.logger.log(`Registry initialized with ${this.agents.size} agents, ${this.tools.size} tools, ${this.workflows.size} workflows`);
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
   * Register an agent provider
   */
  registerAgent(agent: AgentProvider): void {
    const agentId = this.getAgentId(agent);
    if (this.agents.has(agentId)) {
      this.logger.warn(`Agent ${agentId} already registered, overriding`);
    }
    this.agents.set(agentId, agent);
    this.logger.log(`Agent registered: ${agentId}`);
  }

  /**
   * Register a tool provider
   */
  registerTool(tool: ToolProvider): void {
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
  registerWorkflow(workflow: WorkflowProvider | WorkflowClass): void {
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
  getAgents(): Map<string, AgentProvider> {
    return new Map(this.agents);
  }

  /**
   * Get all registered tools
   */
  getTools(): Map<string, ToolProvider> {
    return new Map(this.tools);
  }

  /**
   * Get all registered workflows
   */
  getWorkflows(): Map<string, WorkflowProvider | WorkflowClass> {
    return new Map(this.workflows);
  }

  /**
   * Get a specific agent by ID
   */
  getAgent(id: string): AgentProvider | undefined {
    return this.agents.get(id);
  }

  /**
   * Get a specific tool by ID
   */
  getTool(id: string): ToolProvider | undefined {
    return this.tools.get(id);
  }

  /**
   * Get a specific workflow by ID
   */
  getWorkflow(id: string): WorkflowProvider | WorkflowClass | undefined {
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
  private getAgentId(agent: AgentProvider): string {
    if (typeof agent === 'string') {
      return agent;
    }
    if (typeof agent === 'function') {
      return agent.name || 'unknown-agent';
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
    }
    return 'unknown-agent';
  }

  /**
   * Extract tool ID from tool provider
   */
  private getToolId(tool: ToolProvider): string {
    if (typeof tool === 'string') {
      return tool;
    }
    if (typeof tool === 'function') {
      return tool.name || 'unknown-tool';
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
    }
    return 'unknown-tool';
  }

  /**
   * Extract workflow ID from workflow provider or class
   */
  private getWorkflowId(workflow: WorkflowProvider | WorkflowClass): string {
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
    }
    return 'unknown-workflow';
  }
}