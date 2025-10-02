import { Injectable, Logger, Optional } from '@nestjs/common';
import type {
  EnhancedExecutionContext,
  EnhancedDecoratorBridgeConfig,
  SubworkflowContext,
  AgentStepContext,
  SubworkflowMetadata,
  AgentStepMetadata,
} from '../interfaces/enhanced-decorator-metadata.interface';
import {
  WorkflowCommandType,
} from '../interfaces/enhanced-decorator-metadata.interface';
import type { WorkflowState } from '../interfaces';
import type { 
  RichAgentStepContext,
  StreamingCapabilities,
  MemoryCapabilities,
  ToolExecutionCapabilities,
  AgentCoordinationCapabilities
} from '../interfaces/rich-agent-context.interface';
import { AgentWorkflowBridgeService } from './agent-workflow-bridge.service';

/**
 * Service responsible for creating and managing enhanced execution contexts
 * 
 * Handles:
 * - Enhanced execution context creation with capabilities
 * - Subworkflow context management
 * - Agent step context management
 * - Rich agent context with streaming, memory, and tool capabilities
 * - Context lifecycle management
 */
@Injectable()
export class EnhancedExecutionContextService {
  private readonly logger = new Logger(EnhancedExecutionContextService.name);

  constructor(
    @Optional() private readonly streamingService?: any,
    @Optional() private readonly memoryAdapter?: any,
    @Optional() private readonly approvalService?: any,
    @Optional() private readonly checkpointService?: any,
    @Optional() private readonly agentRegistry?: any,
    @Optional() private readonly agentWorkflowBridge?: AgentWorkflowBridgeService
  ) {}

  /**
   * Create enhanced execution context with all capabilities
   */
  async createEnhancedExecutionContext<TState extends WorkflowState = WorkflowState>(
    instance: object,
    config: Partial<EnhancedDecoratorBridgeConfig>
  ): Promise<EnhancedExecutionContext> {
    const context: EnhancedExecutionContext = {
      // Command execution
      executeCommand: async (command: any) => {
        return this.executeWorkflowCommand(command, instance);
      },
      
      // Memory operations
      retrieveMemory: async (key: string, options?: any) => {
        if (!this.memoryAdapter) {
          throw new Error('Memory adapter not available');
        }
        return this.memoryAdapter.retrieve(key, options);
      },
      
      storeMemory: async (key: string, value: any, options?: any) => {
        if (!this.memoryAdapter) {
          throw new Error('Memory adapter not available');
        }
        return this.memoryAdapter.store(key, value, options);
      },
      
      // Approval workflow
      requestApproval: async (data: any) => {
        if (!this.approvalService) {
          throw new Error('Approval service not available');
        }
        return this.approvalService.requestApproval(data);
      },
      
      // Checkpoint management
      createCheckpoint: async () => {
        if (!this.checkpointService) {
          this.logger.warn('Checkpoint service not available, skipping checkpoint creation');
          return null;
        }
        return this.checkpointService.createCheckpoint();
      },
      
      // Enhanced context access
      getEnhancedContext: () => context,
    };

    this.logger.debug('Created enhanced execution context with all capabilities');
    return context;
  }

  /**
   * Create subworkflow context
   */
  createSubworkflowContext(metadata: SubworkflowMetadata, instance: object): SubworkflowContext {
    return {
      workflowName: metadata.workflowName,
      inputMapping: metadata.inputMapping || {},
      outputMapping: metadata.outputMapping || {},
      
      mergeWithParent: async (result: any) => {
        if (metadata.mergeStrategy === 'replace') {
          return result;
        } else if (metadata.mergeStrategy === 'merge') {
          // Perform deep merge logic here
          return { ...result };
        }
        return result;
      },
      
      executeWithTools: async (tools: string[]) => {
        this.logger.debug(`Executing subworkflow with tools: ${tools.join(', ')}`);
        return tools;
      },
      
      coordinateWithAgents: async (agents: string[], strategy: string) => {
        if (!this.agentRegistry) {
          throw new Error('Agent registry not available for coordination');
        }
        
        this.logger.debug(`Coordinating with agents: ${agents.join(', ')} using strategy: ${strategy}`);
        // Implementation would coordinate with specified agents
        return { coordinated: agents, strategy };
      },
    };
  }

  /**
   * Create agent step context
   */
  createAgentStepContext(metadata: AgentStepMetadata, instance: object): AgentStepContext {
    return {
      agentType: metadata.agentType,
      stepName: metadata.stepName || 'unnamed_step',
      timeout: metadata.timeout || 30000,
      retries: metadata.retries || 0,
      
      executeAsAgent: async (input: any) => {
        if (!this.agentRegistry) {
          throw new Error('Agent registry not available');
        }
        
        this.logger.debug(`Executing as agent: ${metadata.agentType}`);
        return { result: input, executedBy: metadata.agentType };
      },
    };
  }

  /**
   * Create rich agent step context with advanced capabilities
   */
  async createRichAgentStepContext<TState extends WorkflowState>(
    metadata: AgentStepMetadata,
    instance: object,
    config: Partial<EnhancedDecoratorBridgeConfig>
  ): Promise<RichAgentStepContext> {
    const baseContext = this.createAgentStepContext(metadata, instance);
    const memoryCapabilities = await this.createMemoryCapabilities<TState>(instance, config);
    const toolCapabilities = await this.createToolExecutionCapabilities(instance);
    const coordinationCapabilities = await this.createAgentCoordinationCapabilities(metadata, instance);
    const streamingCapabilities = this.createStreamingCapabilities(instance, config);

    return {
      ...baseContext,
      // Agent instance and metadata (required by RichAgentStepContext)
      agent: instance || {},
      agentConfig: { 
        id: metadata.agentType,
        name: metadata.agentType,
        description: `Agent of type ${metadata.agentType}`
      },
      agentInstance: { 
        id: metadata.agentType,
        config: { 
          id: metadata.agentType,
          name: metadata.agentType,
          description: `Agent of type ${metadata.agentType}`
        },
        instance,
        capabilities: {
          capabilities: [],
          tools: [],
          workflows: []
        },
        metadata: { 
          registeredAt: new Date(),
          accessCount: 0,
          errorCount: 0,
          createdAt: new Date(),
          usageCount: 0
        }
      },
      // Workflow integration
      workflowContext: {} as any,
      state: {} as TState,
      // Enhanced execution context
      executionId: `exec-${Date.now()}`,
      nodeId: metadata.stepName || 'default',
      workflowName: 'enhanced-workflow',
      // Infrastructure services
      memory: memoryCapabilities,
      tools: toolCapabilities,
      streaming: streamingCapabilities,
      coordination: coordinationCapabilities,
      // Context transformation utilities
      transformContext: <T>(transformer: (context: any) => T) => transformer(baseContext),
      transformResult: <T>(transformer: (result: any) => T) => transformer({}),
      
      executeWithRichContext: async (input: any) => {
        this.logger.debug(`Executing with rich context for agent: ${metadata.agentType}`);
        
        try {
          // Execute with full capabilities available
          const result = await baseContext.executeAsAgent(input);
          
          // Log capabilities usage
          this.logger.debug('Rich context execution completed successfully');
          
          return {
            ...result,
            capabilitiesUsed: {
              memory: !!memoryCapabilities,
              tools: !!toolCapabilities,
              coordination: !!coordinationCapabilities,
              streaming: !!streamingCapabilities,
            },
          };
        } catch (error) {
          this.logger.error(`Rich context execution failed for agent ${metadata.agentType}:`, error);
          throw error;
        }
      },
    };
  }

  /**
   * Create memory capabilities for an agent
   */
  async createMemoryCapabilities<TState extends WorkflowState>(
    instance: object,
    config: Partial<EnhancedDecoratorBridgeConfig>
  ): Promise<MemoryCapabilities> {
    return {
      available: !!this.memoryAdapter && !!config.enableMemory,
      
      retrieve: async (key: string, options?: any) => {
        if (!this.memoryAdapter) {
          throw new Error('Memory adapter not available');
        }
        return this.memoryAdapter.retrieve(key, options);
      },
      
      store: async (key: string, value: any, options?: any) => {
        if (!this.memoryAdapter) {
          throw new Error('Memory adapter not available');
        }
        return this.memoryAdapter.store(key, value, options);
      },
      
      getContext: async (contextKey?: string) => {
        if (!this.memoryAdapter) {
          throw new Error('Memory adapter not available');
        }
        return this.memoryAdapter.retrieve(contextKey || 'default');
      },
      
      storeConversation: async (input: any, output: any) => {
        if (!this.memoryAdapter) {
          throw new Error('Memory adapter not available');
        }
        return this.memoryAdapter.store('conversation', { input, output, timestamp: new Date() });
      },
      
      getConversationHistory: async (limit?: number) => {
        if (!this.memoryAdapter) {
          throw new Error('Memory adapter not available');
        }
        return [];
      },
    };
  }

  /**
   * Create tool execution capabilities
   */
  async createToolExecutionCapabilities(instance: object): Promise<ToolExecutionCapabilities> {
    return {
      available: !!this.agentRegistry,
      
      executeTools: async (toolNames: string[], input: any) => {
        if (!this.agentRegistry) {
          throw new Error('Agent registry not available for tool execution');
        }
        
        this.logger.debug(`Executing tools: ${toolNames.join(', ')}`);
        
        const results = [];
        for (const toolName of toolNames) {
          try {
            const result = await this.executeTool(toolName, input);
            results.push({ tool: toolName, result, success: true });
          } catch (error) {
            this.logger.error(`Tool execution failed for ${toolName}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            results.push({ tool: toolName, error: errorMessage, success: false });
          }
        }
        
        return results;
      },
      
      getAvailableTools: () => {
        // Implementation would return available tools from registry
        return [];
      },
      
      hasToolAccess: (toolName: string) => {
        // Implementation would check tool access
        return true;
      },
    };
  }

  /**
   * Create agent coordination capabilities
   */
  async createAgentCoordinationCapabilities(
    metadata: AgentStepMetadata,
    instance: object
  ): Promise<AgentCoordinationCapabilities> {
    return {
      available: !!this.agentRegistry && !!this.agentWorkflowBridge,
      
      coordinateWith: async (agentIds: string[], strategy: string) => {
        if (!this.agentWorkflowBridge) {
          throw new Error('Agent workflow bridge not available for coordination');
        }
        
        this.logger.debug(`Coordinating with agents: ${agentIds.join(', ')} using strategy: ${strategy}`);
        return { coordinated: agentIds, strategy, timestamp: new Date().toISOString() };
      },
      
      communicateWith: async (agentId: string, message: any) => {
        this.logger.debug(`Communicating with agent ${agentId}`);
        return { sent: true, agentId, message, timestamp: new Date().toISOString() };
      },
      
      broadcastMessage: async (message: any) => {
        this.logger.debug('Broadcasting message to all agents');
        return { broadcast: true, message, timestamp: new Date().toISOString() };
      },
    };
  }

  /**
   * Create streaming capabilities
   */
  private createStreamingCapabilities(
    instance: object,
    config: Partial<EnhancedDecoratorBridgeConfig>
  ): StreamingCapabilities {
    return {
      available: !!this.streamingService && !!config.enableStreaming,
      streamTokens: !!this.streamingService,
      streamEvents: !!this.streamingService,
      streamProgress: !!this.streamingService,
      
      createStream: async (streamType: string) => {
        if (!this.streamingService) {
          throw new Error('Streaming service not available');
        }
        // Basic stream creation - delegated to adapter
        return Promise.resolve({ type: streamType, id: Date.now().toString() });
      },
      
      streamToken: async (token: string) => {
        if (this.streamingService) {
          this.streamingService.streamToken('default', 'default', token);
        }
      },
      
      streamEvent: async (event: any) => {
        if (this.streamingService) {
          this.streamingService.streamEvent('default', 'default', event);
        }
      },
      
      streamProgressData: async (progress: any) => {
        if (this.streamingService) {
          this.streamingService.streamProgress('default', 'default', progress);
        }
      },
      
      emitAgentEvent: async (eventType: string, data: any) => {
        if (this.streamingService) {
          await this.streamingService.emitEvent(eventType, data);
        }
      },
    };
  }

  /**
   * Execute a workflow command
   */
  private async executeWorkflowCommand(command: any, instance: object): Promise<any> {
    try {
      if (command && typeof command === 'object' && 'type' in command && 'payload' in command) {
        switch (command.type) {
          case WorkflowCommandType.EXECUTE_NODE:
            return { executed: true, nodeId: command.payload.nodeId };
          case WorkflowCommandType.BRANCH:
            return { branched: true, condition: command.payload.condition };
          case WorkflowCommandType.TERMINATE:
            return { terminated: true, reason: command.payload.reason };
          default:
            this.logger.warn(`Unknown workflow command type: ${command.type}`);
            return { executed: false, error: 'Unknown command type' };
        }
      }
      
      // Handle generic commands
      this.logger.debug('Executing generic command');
      return { executed: true, command };
    } catch (error) {
      this.logger.error('Command execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute a specific tool
   */
  private async executeTool(toolName: string, input: any): Promise<any> {
    // Implementation would execute the specified tool
    this.logger.debug(`Executing tool: ${toolName}`);
    return { toolName, input, executed: true, timestamp: new Date().toISOString() };
  }

  /**
   * Validate execution context configuration
   */
  validateContextConfiguration(config: Partial<EnhancedDecoratorBridgeConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.enableMemory && !this.memoryAdapter) {
      errors.push('Memory is enabled but memory adapter is not available');
    }

    if (config.enableApproval && !this.approvalService) {
      errors.push('Approval is enabled but approval service is not available');
    }

    if (config.enableStreaming && !this.streamingService) {
      errors.push('Streaming is enabled but streaming service is not available');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}