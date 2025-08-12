# Design Document

## Overview

This design document outlines the architecture for creating a comprehensive NestJS LangGraph ecosystem through modular libraries under the `langgraph-modules` domain. Rather than enhancing a single library, we will create a suite of specialized, standalone NestJS libraries that provide enterprise-grade AI agent capabilities.

Each module will be independently developed, versioned, and published, allowing developers to adopt only the features they need while maintaining clean separation of concerns. The modular approach ensures better maintainability, testing, and scalability.

The design follows NestJS architectural patterns with proper dependency injection, modular service organization, and comprehensive type safety across all modules.

## Module Specifications

### @langgraph-modules/checkpoint

**Purpose**: State management and persistence capabilities
**Dependencies**: None (foundational module)
**Key Services**: StateTransformerService, CheckpointManagerService, various CheckpointSavers
**Features**: Multi-backend persistence, state validation, reducer patterns

### @langgraph-modules/time-travel

**Purpose**: Workflow replay and debugging capabilities
**Dependencies**: @langgraph-modules/checkpoint
**Key Services**: TimeTravelService, ExecutionHistoryService, BranchManagerService
**Features**: Checkpoint replay, execution branching, history visualization

### @langgraph-modules/multi-agent

**Purpose**: Agent coordination and handoff management
**Dependencies**: @langgraph-modules/checkpoint
**Key Services**: MultiAgentCoordinatorService, AgentNetworkService, SupervisorService
**Features**: Agent handoffs, supervisor patterns, network topologies

### @langgraph-modules/functional-api

**Purpose**: Decorator-based workflow definition
**Dependencies**: @langgraph-modules/checkpoint
**Key Services**: FunctionalWorkflowService, DecoratorMetadataService
**Features**: @Entrypoint/@Task decorators, automatic workflow generation

### @langgraph-modules/memory

**Purpose**: Advanced memory management and semantic search
**Dependencies**: @langgraph-modules/checkpoint
**Key Services**: AdvancedMemoryService, SemanticSearchService
**Features**: Conversation summarization, semantic search, memory persistence

### @langgraph-modules/platform

**Purpose**: Assistant and thread management for production
**Dependencies**: @langgraph-modules/checkpoint
**Key Services**: AssistantService, ThreadService, WebhookService
**Features**: Assistant versioning, thread operations, webhook notifications

### @langgraph-modules/monitoring

**Purpose**: Comprehensive observability and monitoring
**Dependencies**: All other langgraph-modules
**Key Services**: MonitoringService, MetricsCollectorService, HealthCheckService
**Features**: Cross-module monitoring, performance tracking, alerting

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Core NestJS LangGraph"
        CORE[nestjs-langgraph]
    end

    subgraph "LangGraph Modules Ecosystem"
        subgraph "State & Persistence"
            CHECKPOINT[@langgraph-modules/checkpoint]
            TIMETRAVEL[@langgraph-modules/time-travel]
        end

        subgraph "Agent Coordination"
            MULTIAGENT[@langgraph-modules/multi-agent]
            FUNCAPI[@langgraph-modules/functional-api]
        end

        subgraph "Memory & Intelligence"
            MEMORY[@langgraph-modules/memory]
        end

        subgraph "Platform & Operations"
            PLATFORM[@langgraph-modules/platform]
            MONITORING[@langgraph-modules/monitoring]
        end
    end

    subgraph "Application Layer"
        APP[User Application]
    end

    APP --> CORE
    APP --> CHECKPOINT
    APP --> TIMETRAVEL
    APP --> MULTIAGENT
    APP --> FUNCAPI
    APP --> MEMORY
    APP --> PLATFORM
    APP --> MONITORING

    TIMETRAVEL --> CHECKPOINT
    MULTIAGENT --> CHECKPOINT
    FUNCAPI --> CHECKPOINT
    MEMORY --> CHECKPOINT
    PLATFORM --> CHECKPOINT
    MONITORING --> CHECKPOINT
    MONITORING --> TIMETRAVEL
    MONITORING --> MULTIAGENT
    MONITORING --> MEMORY
    MONITORING --> PLATFORM
        MO[Monitoring Service]
    end

    subgraph "Infrastructure Layer"
        PS[Persistence Stores]
        VS[Vector Store]
        ES[Event System]
        HS[Health Checks]
    end

    FA --> SM
    WC --> WE
    AG --> MA

    SM --> CP
    WE --> TT
    MA --> MM

    AS --> TS
    TS --> WH
    WH --> MO

    CP --> PS
    MM --> VS
    MO --> ES
    ES --> HS
```

### Module Structure

The enhanced library follows a modular architecture with clear separation of concerns:

```typescript
// Core Module Structure
@Module({
  imports: [NestjsLanggraphCoreModule, NestjsLanggraphPersistenceModule, NestjsLanggraphMultiAgentModule, NestjsLanggraphPlatformModule, NestjsLanggraphMonitoringModule],
})
export class NestjsLanggraphModule {
  static forRoot(options: LanggraphModuleOptions): DynamicModule {
    return {
      module: NestjsLanggraphModule,
      providers: [...this.createCoreProviders(options), ...this.createPersistenceProviders(options), ...this.createMultiAgentProviders(options), ...this.createPlatformProviders(options), ...this.createMonitoringProviders(options)],
      exports: [StateTransformerService, CheckpointManagerService, TimeTravelService, MultiAgentCoordinatorService, FunctionalWorkflowService, AdvancedMemoryService, AssistantService, ThreadService, WebhookService, MonitoringService],
    };
  }
}
```

## Components and Interfaces

### Core State Management

#### StateTransformerService

Handles enhanced state management with reducers, validation, and transformations:

```typescript
@Injectable()
export class StateTransformerService {
  private readonly stateValidators = new Map<string, z.ZodSchema>();
  private readonly stateReducers = new Map<string, ReducerFunction>();

  /**
   * Create state annotation with comprehensive configuration
   */
  createStateAnnotation<T>(config: StateAnnotationConfig<T>): StateAnnotation<T> {
    // Register validators and reducers
    if (config.validation) {
      this.stateValidators.set(config.name, config.validation);
    }

    if (config.reducers) {
      Object.entries(config.reducers).forEach(([key, reducer]) => {
        this.stateReducers.set(`${config.name}.${key}`, reducer);
      });
    }

    return Annotation.Root({
      ...config.channels,
      // Built-in channels
      messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
      }),
      confidence: Annotation<number>({
        reducer: (x, y) => Math.max(x || 0, y || 0),
        default: () => 1.0,
      }),
      metadata: Annotation<Record<string, unknown>>({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({}),
      }),
    });
  }

  /**
   * Validate state with comprehensive error reporting
   */
  validateState<T>(state: T, schemaName: string): ValidationResult<T> {
    const schema = this.stateValidators.get(schemaName);
    if (!schema) {
      return { success: true, data: state };
    }

    const result = schema.safeParse(state);
    if (!result.success) {
      return {
        success: false,
        error: {
          message: 'State validation failed',
          issues: result.error.issues,
          path: result.error.issues.map((issue) => issue.path.join('.')),
        },
      };
    }

    return { success: true, data: result.data };
  }
}

interface StateAnnotationConfig<T> {
  name: string;
  channels: Record<keyof T, ChannelDefinition>;
  validation?: z.ZodSchema<T>;
  reducers?: Record<keyof T, ReducerFunction>;
}

interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    issues: z.ZodIssue[];
    path: string[];
  };
}
```

### Persistence and Checkpointing

#### CheckpointManagerService

Manages checkpoint persistence across multiple storage backends:

```typescript
@Injectable()
export class CheckpointManagerService {
  private readonly checkpointSavers = new Map<string, BaseCheckpointSaver>();
  private readonly defaultSaver: BaseCheckpointSaver;

  constructor(private readonly configService: ConfigService, private readonly logger: Logger) {
    this.initializeCheckpointSavers();
  }

  private initializeCheckpointSavers(): void {
    const configs = this.configService.get<CheckpointConfig[]>('checkpoint.savers', []);

    configs.forEach((config) => {
      const saver = this.createCheckpointSaver(config);
      this.checkpointSavers.set(config.name, saver);

      if (config.default) {
        this.defaultSaver = saver;
      }
    });

    // Fallback to memory saver if no default configured
    if (!this.defaultSaver) {
      this.defaultSaver = new MemoryCheckpointSaver();
    }
  }

  /**
   * Create checkpoint saver based on configuration
   */
  createCheckpointSaver(config: CheckpointConfig): BaseCheckpointSaver {
    switch (config.type) {
      case 'memory':
        return new MemoryCheckpointSaver();
      case 'redis':
        return new RedisCheckpointSaver({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db || 0,
          keyPrefix: config.redis.keyPrefix || 'langgraph:checkpoint:',
          ttl: config.redis.ttl || 3600,
        });
      case 'postgres':
        return new PostgresCheckpointSaver({
          connectionString: config.postgres.connectionString,
          tableName: config.postgres.tableName || 'checkpoints',
          schemaName: config.postgres.schemaName || 'public',
        });
      case 'sqlite':
        return new SqliteCheckpointSaver({
          databasePath: config.sqlite.databasePath,
          tableName: config.sqlite.tableName || 'checkpoints',
        });
      default:
        throw new Error(`Unsupported checkpoint type: ${config.type}`);
    }
  }

  /**
   * Save checkpoint with metadata and thread management
   */
  async saveCheckpoint<T>(threadId: string, checkpoint: Checkpoint<T>, metadata?: CheckpointMetadata, saverName?: string): Promise<void> {
    const saver = this.getCheckpointSaver(saverName);

    const enrichedMetadata: CheckpointMetadata = {
      ...metadata,
      threadId,
      timestamp: new Date().toISOString(),
      version: checkpoint.version || '1.0.0',
    };

    try {
      await saver.put({ configurable: { thread_id: threadId } }, checkpoint, enrichedMetadata);

      this.logger.log(`Checkpoint saved for thread ${threadId}: ${checkpoint.id}`);
    } catch (error) {
      this.logger.error(`Failed to save checkpoint for thread ${threadId}`, error);
      throw new CheckpointSaveError(`Failed to save checkpoint: ${error.message}`);
    }
  }

  private getCheckpointSaver(saverName?: string): BaseCheckpointSaver {
    if (saverName) {
      const saver = this.checkpointSavers.get(saverName);
      if (!saver) {
        throw new Error(`Checkpoint saver not found: ${saverName}`);
      }
      return saver;
    }
    return this.defaultSaver;
  }
}
```

#### RedisCheckpointSaver

Redis-based checkpoint persistence with optimized storage patterns:

```typescript
@Injectable()
export class RedisCheckpointSaver extends BaseCheckpointSaver {
  constructor(private readonly config: RedisCheckpointConfig) {
    super();
    this.redis = new Redis(config);
  }

  async put(config: RunnableConfig, checkpoint: Checkpoint, metadata?: CheckpointMetadata): Promise<void> {
    const threadId = config.configurable?.thread_id;
    const checkpointId = checkpoint.id;

    if (!threadId || !checkpointId) {
      throw new Error('Thread ID and Checkpoint ID are required');
    }

    const checkpointKey = `${this.config.keyPrefix}${threadId}:${checkpointId}`;
    const threadKey = `${this.config.keyPrefix}thread:${threadId}:checkpoints`;

    const checkpointData = {
      checkpoint,
      metadata: {
        ...metadata,
        threadId,
        checkpointId,
        timestamp: new Date().toISOString(),
      },
    };

    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();

    // Store checkpoint data
    pipeline.setex(checkpointKey, this.config.ttl, JSON.stringify(checkpointData));

    // Add to sorted set for chronological ordering
    pipeline.zadd(threadKey, Date.now(), checkpointId);

    // Set TTL on thread index
    pipeline.expire(threadKey, this.config.ttl);

    await pipeline.exec();
  }

  async get(config: RunnableConfig): Promise<Checkpoint | null> {
    const threadId = config.configurable?.thread_id;
    const checkpointId = config.configurable?.checkpoint_id;

    if (!threadId) {
      throw new Error('Thread ID is required');
    }

    let targetCheckpointId = checkpointId;

    // If no specific checkpoint ID, get the latest
    if (!targetCheckpointId) {
      const threadKey = `${this.config.keyPrefix}thread:${threadId}:checkpoints`;
      const latest = await this.redis.zrevrange(threadKey, 0, 0);

      if (latest.length === 0) {
        return null;
      }

      targetCheckpointId = latest[0];
    }

    const checkpointKey = `${this.config.keyPrefix}${threadId}:${targetCheckpointId}`;
    const data = await this.redis.get(checkpointKey);

    if (!data) {
      return null;
    }

    const parsed = JSON.parse(data);
    return parsed.checkpoint;
  }

  async list(config: RunnableConfig, options?: ListCheckpointsOptions): Promise<CheckpointTuple[]> {
    const threadId = config.configurable?.thread_id;

    if (!threadId) {
      throw new Error('Thread ID is required');
    }

    const threadKey = `${this.config.keyPrefix}thread:${threadId}:checkpoints`;
    const limit = options?.limit || 10;
    const offset = options?.offset || 0;

    // Get checkpoint IDs in reverse chronological order
    const checkpointIds = await this.redis.zrevrange(threadKey, offset, offset + limit - 1);

    const results: CheckpointTuple[] = [];

    for (const checkpointId of checkpointIds) {
      const checkpointKey = `${this.config.keyPrefix}${threadId}:${checkpointId}`;
      const data = await this.redis.get(checkpointKey);

      if (data) {
        const parsed = JSON.parse(data);
        results.push([{ configurable: { thread_id: threadId, checkpoint_id: checkpointId } }, parsed.checkpoint, parsed.metadata]);
      }
    }

    return results;
  }
}
```

### Time Travel Implementation

#### TimeTravelService

Provides workflow replay and branching capabilities:

```typescript
@Injectable()
export class TimeTravelService {
  constructor(private readonly checkpointManager: CheckpointManagerService, private readonly workflowRegistry: WorkflowRegistryService, private readonly logger: Logger) {}

  /**
   * Replay workflow from specific checkpoint with optional modifications
   */
  async replayFromCheckpoint<T>(threadId: string, checkpointId: string, options: ReplayOptions<T> = {}): Promise<WorkflowExecution<T>> {
    this.logger.log(`Starting replay from checkpoint ${checkpointId} for thread ${threadId}`);

    // Load the target checkpoint
    const checkpoint = await this.checkpointManager.loadCheckpoint<T>(threadId, checkpointId);

    if (!checkpoint) {
      throw new CheckpointNotFoundError(`Checkpoint ${checkpointId} not found for thread ${threadId}`);
    }

    // Create new execution context
    const replayThreadId = options.newThreadId || `${threadId}_replay_${Date.now()}`;

    // Apply input modifications if provided
    let modifiedState = checkpoint.channel_values;
    if (options.stateModifications) {
      modifiedState = {
        ...modifiedState,
        ...options.stateModifications,
      };
    }

    // Get workflow definition
    const workflowName = checkpoint.metadata?.workflowName;
    if (!workflowName) {
      throw new Error('Checkpoint metadata missing workflow name');
    }

    const workflow = await this.workflowRegistry.getWorkflow(workflowName);

    // Create execution with restored state
    const execution = await workflow.executeFromCheckpoint({
      checkpoint: {
        ...checkpoint,
        channel_values: modifiedState,
      },
      threadId: replayThreadId,
      config: options.config,
    });

    this.logger.log(`Replay started with new thread ID: ${replayThreadId}`);
    return execution;
  }

  /**
   * Create execution branch from checkpoint
   */
  async createBranch<T>(threadId: string, fromCheckpointId: string, branchOptions: BranchOptions<T>): Promise<string> {
    const checkpoint = await this.checkpointManager.loadCheckpoint<T>(threadId, fromCheckpointId);

    if (!checkpoint) {
      throw new CheckpointNotFoundError(`Checkpoint ${fromCheckpointId} not found`);
    }

    const branchThreadId = `${threadId}_branch_${branchOptions.name}_${Date.now()}`;

    // Apply branch modifications
    let branchedState = checkpoint.channel_values;
    if (branchOptions.stateModifications) {
      branchedState = {
        ...branchedState,
        ...branchOptions.stateModifications,
      };
    }

    // Create branch checkpoint
    const branchCheckpoint: Checkpoint<T> = {
      ...checkpoint,
      id: `${checkpoint.id}_branch_${branchOptions.name}`,
      channel_values: branchedState,
    };

    // Save branch checkpoint with branch metadata
    await this.checkpointManager.saveCheckpoint(branchThreadId, branchCheckpoint, {
      ...checkpoint.metadata,
      branchName: branchOptions.name,
      parentThreadId: threadId,
      parentCheckpointId: fromCheckpointId,
      branchCreatedAt: new Date().toISOString(),
      branchDescription: branchOptions.description,
    });

    this.logger.log(`Created branch '${branchOptions.name}' with thread ID: ${branchThreadId}`);
    return branchThreadId;
  }

  /**
   * Get comprehensive execution history for visualization
   */
  async getExecutionHistory(threadId: string, options: HistoryOptions = {}): Promise<ExecutionHistoryNode[]> {
    const checkpoints = await this.checkpointManager.listCheckpoints(threadId, {
      limit: options.limit || 100,
      offset: options.offset || 0,
    });

    const historyNodes: ExecutionHistoryNode[] = checkpoints.map(([config, checkpoint, metadata]) => ({
      checkpointId: checkpoint.id,
      threadId: config.configurable?.thread_id || threadId,
      nodeId: metadata?.step || 'unknown',
      timestamp: new Date(metadata?.timestamp || Date.now()),
      state: checkpoint.channel_values,
      parentCheckpointId: metadata?.parent_checkpoint_id,
      branchId: metadata?.branch_id,
      branchName: metadata?.branch_name,
      workflowName: metadata?.workflowName,
      executionDuration: metadata?.execution_duration,
      nodeType: metadata?.node_type,
      error: metadata?.error,
    }));

    // Sort by timestamp for chronological order
    historyNodes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return historyNodes;
  }

  /**
   * Compare states between two checkpoints
   */
  async compareCheckpoints<T>(threadId: string, checkpointId1: string, checkpointId2: string): Promise<StateComparison<T>> {
    const [checkpoint1, checkpoint2] = await Promise.all([this.checkpointManager.loadCheckpoint<T>(threadId, checkpointId1), this.checkpointManager.loadCheckpoint<T>(threadId, checkpointId2)]);

    if (!checkpoint1 || !checkpoint2) {
      throw new Error('One or both checkpoints not found');
    }

    return this.compareStates(checkpoint1.channel_values, checkpoint2.channel_values);
  }

  private compareStates<T>(state1: T, state2: T): StateComparison<T> {
    // Deep comparison logic implementation
    const differences: StateDifference[] = [];
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    // Implementation of deep state comparison
    // This would include recursive object comparison logic

    return {
      identical: differences.length === 0,
      differences,
      added,
      removed,
      modified,
      state1,
      state2,
    };
  }
}
```

### Multi-Agent Coordination

#### MultiAgentCoordinatorService

Manages complex multi-agent workflows with handoffs and coordination:

```typescript
@Injectable()
export class MultiAgentCoordinatorService {
  private readonly agentRegistry = new Map<string, AgentDefinition>();
  private readonly handoffStrategies = new Map<string, HandoffStrategy>();
  private readonly supervisorConfigs = new Map<string, SupervisorConfig>();

  constructor(private readonly logger: Logger, private readonly eventEmitter: EventEmitter2) {}

  /**
   * Register agent with comprehensive configuration
   */
  registerAgent(definition: AgentDefinition): void {
    this.validateAgentDefinition(definition);

    this.agentRegistry.set(definition.id, definition);
    this.logger.log(`Registered agent: ${definition.id} with capabilities: ${definition.capabilities.join(', ')}`);

    this.eventEmitter.emit('agent.registered', {
      agentId: definition.id,
      capabilities: definition.capabilities,
      constraints: definition.constraints,
    });
  }

  /**
   * Execute handoff between agents with validation and transformation
   */
  async executeHandoff<T>(fromAgent: string, toAgent: string, payload: HandoffPayload<T>, context: ExecutionContext): Promise<HandoffResult<T>> {
    const sourceAgent = this.agentRegistry.get(fromAgent);
    const targetAgent = this.agentRegistry.get(toAgent);

    if (!sourceAgent || !targetAgent) {
      throw new AgentNotFoundError(`Agent not found: ${fromAgent} -> ${toAgent}`);
    }

    // Validate handoff permissions
    await this.validateHandoff(sourceAgent, targetAgent, payload);

    // Get handoff strategy
    const strategyKey = `${fromAgent}->${toAgent}`;
    const strategy = this.handoffStrategies.get(strategyKey) || this.getDefaultHandoffStrategy();

    // Transform payload if needed
    const transformedPayload = await this.transformPayload(payload, sourceAgent, targetAgent);

    // Execute handoff
    const result = await strategy.execute(transformedPayload, context);

    // Emit handoff event
    this.eventEmitter.emit('agent.handoff.completed', {
      fromAgent,
      toAgent,
      payload: transformedPayload,
      result,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Handoff completed: ${fromAgent} -> ${toAgent}`);
    return result;
  }

  /**
   * Create supervisor workflow with worker coordination
   */
  createSupervisorWorkflow<T>(supervisorAgent: string, workerAgents: string[], options: SupervisorOptions = {}): WorkflowDefinition<T> {
    const supervisor = this.agentRegistry.get(supervisorAgent);
    if (!supervisor) {
      throw new AgentNotFoundError(`Supervisor agent not found: ${supervisorAgent}`);
    }

    // Validate all worker agents exist
    workerAgents.forEach((agentId) => {
      if (!this.agentRegistry.get(agentId)) {
        throw new AgentNotFoundError(`Worker agent not found: ${agentId}`);
      }
    });

    const workflowName = `supervisor_${supervisorAgent}_${Date.now()}`;

    const supervisorConfig: SupervisorConfig = {
      supervisorAgent,
      workerAgents,
      routingStrategy: options.routingStrategy || 'capability-based',
      maxConcurrentWorkers: options.maxConcurrentWorkers || 3,
      timeoutMs: options.timeoutMs || 30000,
      retryPolicy: options.retryPolicy || { maxRetries: 3, backoffMs: 1000 },
    };

    this.supervisorConfigs.set(workflowName, supervisorConfig);

    return {
      name: workflowName,
      nodes: [
        {
          id: 'supervisor',
          handler: this.createSupervisorHandler(supervisorConfig),
          config: {
            type: 'supervisor',
            agent: supervisorAgent,
            workers: workerAgents,
          },
        },
        ...workerAgents.map((agentId) => ({
          id: agentId,
          handler: this.createWorkerHandler(agentId, supervisorConfig),
          config: {
            type: 'worker',
            agent: agentId,
            supervisor: supervisorAgent,
          },
        })),
      ],
      edges: this.createSupervisorEdges(supervisorConfig),
      entryPoint: 'supervisor',
      metadata: {
        type: 'supervisor-workflow',
        supervisor: supervisorAgent,
        workers: workerAgents,
      },
    };
  }

  private createSupervisorHandler<T>(config: SupervisorConfig): NodeHandler<T> {
    return async (state: T) => {
      const supervisor = this.agentRegistry.get(config.supervisorAgent);

      // Execute supervisor logic to determine next action
      const decision = await supervisor.execute(state);

      // Route based on decision
      const targetWorker = this.routeToWorker(decision, config);

      if (targetWorker) {
        return {
          type: CommandType.GOTO,
          goto: targetWorker,
          update: decision.payload || {},
        };
      }

      // If no worker selected, end workflow
      return decision;
    };
  }

  private createWorkerHandler<T>(agentId: string, supervisorConfig: SupervisorConfig): NodeHandler<T> {
    return async (state: T) => {
      const worker = this.agentRegistry.get(agentId);

      try {
        // Execute worker logic
        const result = await worker.execute(state);

        // Always return to supervisor
        return {
          type: CommandType.GOTO,
          goto: 'supervisor',
          update: {
            ...result,
            lastWorker: agentId,
            workerResult: result,
          },
        };
      } catch (error) {
        this.logger.error(`Worker ${agentId} failed:`, error);

        // Return error to supervisor for handling
        return {
          type: CommandType.GOTO,
          goto: 'supervisor',
          update: {
            error: error.message,
            failedWorker: agentId,
            requiresRetry: true,
          },
        };
      }
    };
  }

  private routeToWorker(decision: AgentDecision, config: SupervisorConfig): string | null {
    switch (config.routingStrategy) {
      case 'capability-based':
        return this.routeByCapability(decision, config.workerAgents);
      case 'round-robin':
        return this.routeRoundRobin(config.workerAgents);
      case 'load-based':
        return this.routeByLoad(config.workerAgents);
      default:
        return decision.targetAgent || null;
    }
  }
}
```

### Functional API Implementation

#### FunctionalWorkflowService

Enables decorator-based workflow definition:

```typescript
@Injectable()
export class FunctionalWorkflowService {
  constructor(private readonly workflowBuilder: WorkflowGraphBuilderService, private readonly moduleRef: ModuleRef, private readonly logger: Logger) {}

  /**
   * Execute entrypoint method as workflow
   */
  async executeEntrypoint<T>(instance: any, methodName: string, input: T, config?: RunnableConfig): Promise<any> {
    // Get metadata from decorators
    const entrypointMeta = Reflect.getMetadata(LANGGRAPH_ENTRYPOINT_METADATA, instance.constructor);

    const tasks = Reflect.getMetadata(LANGGRAPH_TASKS_METADATA, instance.constructor) || [];

    if (!entrypointMeta) {
      throw new Error(`No @Entrypoint decorator found on ${instance.constructor.name}`);
    }

    // Build workflow from functional API
    const workflow = await this.buildFunctionalWorkflow(instance, entrypointMeta, tasks);

    // Execute workflow
    return workflow.execute(input, config);
  }

  /**
   * Build workflow from functional API decorators
   */
  private async buildFunctionalWorkflow(instance: any, entrypoint: EntrypointMetadata, tasks: TaskMetadata[]): Promise<CompiledWorkflow> {
    const workflowName = `functional_${instance.constructor.name}_${Date.now()}`;

    // Create nodes from decorated methods
    const nodes: WorkflowNode[] = [
      {
        id: 'entrypoint',
        handler: this.wrapMethodHandler(instance, entrypoint.methodName, 'entrypoint'),
        config: {
          type: 'entrypoint',
          method: entrypoint.methodName,
          options: entrypoint.options,
        },
      },
      ...tasks.map((task) => ({
        id: task.methodName,
        handler: this.wrapMethodHandler(instance, task.methodName, 'task'),
        config: {
          type: 'task',
          method: task.methodName,
          options: task.options,
        },
      })),
    ];

    // Infer edges from task dependencies
    const edges = await this.inferEdgesFromTasks(entrypoint, tasks);

    const definition: WorkflowDefinition = {
      name: workflowName,
      nodes,
      edges,
      entryPoint: 'entrypoint',
      metadata: {
        type: 'functional-workflow',
        className: instance.constructor.name,
        entrypoint: entrypoint.methodName,
        tasks: tasks.map((t) => t.methodName),
      },
    };

    return this.workflowBuilder.buildFromDefinition(definition);
  }

  /**
   * Wrap method with execution tracking and error handling
   */
  private wrapMethodHandler(instance: any, methodName: string, nodeType: 'entrypoint' | 'task'): NodeHandler<any> {
    return async (state: any) => {
      const startTime = Date.now();
      const executionId = `${instance.constructor.name}.${methodName}_${Date.now()}`;

      try {
        this.logger.log(`Executing ${nodeType}: ${methodName}`);

        // Execute original method
        const result = await instance[methodName](state);

        const duration = Date.now() - startTime;

        // Emit completion event
        if (instance.eventEmitter) {
          instance.eventEmitter.emit(`${nodeType}.completed`, {
            executionId,
            methodName,
            duration,
            result,
            timestamp: new Date().toISOString(),
          });
        }

        this.logger.log(`${nodeType} completed: ${methodName} (${duration}ms)`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Emit error event
        if (instance.eventEmitter) {
          instance.eventEmitter.emit(`${nodeType}.failed`, {
            executionId,
            methodName,
            duration,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          });
        }

        this.logger.error(`${nodeType} failed: ${methodName} (${duration}ms)`, error);
        throw error;
      }
    };
  }

  /**
   * Infer workflow edges from task dependencies
   */
  private async inferEdgesFromTasks(entrypoint: EntrypointMetadata, tasks: TaskMetadata[]): Promise<WorkflowEdge[]> {
    const edges: WorkflowEdge[] = [];

    // Start with entrypoint
    if (entrypoint.options?.next) {
      edges.push({
        from: 'entrypoint',
        to: entrypoint.options.next,
      });
    } else if (tasks.length > 0) {
      // Default to first task
      edges.push({
        from: 'entrypoint',
        to: tasks[0].methodName,
      });
    }

    // Connect tasks based on dependencies
    tasks.forEach((task) => {
      if (task.options?.dependsOn) {
        task.options.dependsOn.forEach((dependency) => {
          edges.push({
            from: dependency,
            to: task.methodName,
          });
        });
      }

      if (task.options?.next) {
        edges.push({
          from: task.methodName,
          to: task.options.next,
        });
      }
    });

    return edges;
  }
}

// Decorator implementations
export function Entrypoint(options: EntrypointOptions = {}): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const metadata: EntrypointMetadata = {
      methodName: propertyKey as string,
      options,
    };

    Reflect.defineMetadata(LANGGRAPH_ENTRYPOINT_METADATA, metadata, target.constructor);

    // Wrap method for workflow execution
    const originalMethod = descriptor.value;
    descriptor.value = async function (this: any, input: any, config?: any) {
      const workflowService = this.workflowService || (await this.moduleRef?.get(FunctionalWorkflowService));

      if (workflowService) {
        return workflowService.executeEntrypoint(this, propertyKey as string, input, config);
      }

      // Fallback to direct execution
      return originalMethod.apply(this, [input]);
    };

    return descriptor;
  };
}

export function Task(options: TaskOptions = {}): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const existingTasks = Reflect.getMetadata(LANGGRAPH_TASKS_METADATA, target.constructor) || [];

    const metadata: TaskMetadata = {
      methodName: propertyKey as string,
      options,
    };

    existingTasks.push(metadata);
    Reflect.defineMetadata(LANGGRAPH_TASKS_METADATA, existingTasks, target.constructor);

    return descriptor;
  };
}
```

## Data Models

### Core Interfaces

```typescript
// State Management
interface StateAnnotation<T> {
  channels: Record<keyof T, ChannelDefinition>;
  validation?: z.ZodSchema<T>;
  reducers?: Record<keyof T, ReducerFunction>;
}

interface ChannelDefinition {
  reducer?: ReducerFunction;
  default?: () => any;
  validator?: (value: any) => boolean;
}

// Checkpointing
interface Checkpoint<T = any> {
  id: string;
  version: string;
  channel_values: T;
  metadata?: CheckpointMetadata;
  created_at: string;
}

interface CheckpointMetadata {
  threadId?: string;
  timestamp?: string;
  version?: string;
  workflowName?: string;
  step?: string;
  nodeType?: string;
  executionDuration?: number;
  error?: string;
  branchName?: string;
  parentThreadId?: string;
  parentCheckpointId?: string;
  [key: string]: any;
}

// Multi-Agent
interface AgentDefinition {
  id: string;
  name: string;
  description?: string;
  capabilities: string[];
  constraints: AgentConstraints;
  execute: (state: any) => Promise<any>;
  metadata?: Record<string, any>;
}

interface AgentConstraints {
  maxExecutionTime?: number;
  requiredCapabilities?: string[];
  forbiddenCapabilities?: string[];
  resourceLimits?: ResourceLimits;
}

// Platform Integration
interface Assistant {
  id: string;
  name: string;
  description?: string;
  workflow: WorkflowTemplate;
  configuration: AssistantConfiguration;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Thread {
  id: string;
  assistantId: string;
  metadata: Record<string, any>;
  createdAt: Date;
  lastActiveAt: Date;
  status: ThreadStatus;
}
```

## Error Handling

### Custom Error Classes

```typescript
export class CheckpointNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckpointNotFoundError';
  }
}

export class CheckpointSaveError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'CheckpointSaveError';
  }
}

export class AgentNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentNotFoundError';
  }
}

export class HandoffValidationError extends Error {
  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = 'HandoffValidationError';
  }
}

export class WorkflowExecutionError extends Error {
  constructor(message: string, public readonly workflowName: string, public readonly nodeId?: string, public readonly cause?: Error) {
    super(message);
    this.name = 'WorkflowExecutionError';
  }
}
```

### Error Recovery Strategies

```typescript
@Injectable()
export class ErrorRecoveryService {
  /**
   * Handle checkpoint save failures with fallback strategies
   */
  async handleCheckpointSaveFailure(error: CheckpointSaveError, checkpoint: Checkpoint, threadId: string): Promise<void> {
    // Try alternative checkpoint saver
    const fallbackSaver = this.getFallbackCheckpointSaver();

    try {
      await fallbackSaver.put({ configurable: { thread_id: threadId } }, checkpoint, { ...checkpoint.metadata, fallback: true });
    } catch (fallbackError) {
      // Log both errors and use in-memory as last resort
      this.logger.error('All checkpoint savers failed', {
        originalError: error,
        fallbackError,
      });

      await this.saveToMemoryFallback(checkpoint, threadId);
    }
  }

  /**
   * Recover from workflow execution failures
   */
  async recoverWorkflowExecution(error: WorkflowExecutionError, threadId: string): Promise<void> {
    // Load last successful checkpoint
    const lastCheckpoint = await this.checkpointManager.loadCheckpoint(threadId);

    if (lastCheckpoint) {
      // Attempt recovery from last checkpoint
      await this.timeTravelService.replayFromCheckpoint(threadId, lastCheckpoint.id, { errorRecovery: true });
    }
  }
}
```

## Testing Strategy

### Unit Testing Approach

```typescript
describe('CheckpointManagerService', () => {
  let service: CheckpointManagerService;
  let mockRedisCheckpointSaver: jest.Mocked<RedisCheckpointSaver>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CheckpointManagerService,
        {
          provide: ConfigService,
          useValue: createMockConfigService(),
        },
        {
          provide: Logger,
          useValue: createMockLogger(),
        },
      ],
    }).compile();

    service = module.get<CheckpointManagerService>(CheckpointManagerService);
    mockConfigService = module.get(ConfigService);
  });

  describe('saveCheckpoint', () => {
    it('should save checkpoint with metadata', async () => {
      // Arrange
      const threadId = 'test-thread-123';
      const checkpoint: Checkpoint = {
        id: 'checkpoint-1',
        version: '1.0.0',
        channel_values: { messages: [], confidence: 0.9 },
        created_at: new Date().toISOString(),
      };

      // Act
      await service.saveCheckpoint(threadId, checkpoint);

      // Assert
      expect(mockRedisCheckpointSaver.put).toHaveBeenCalledWith(
        { configurable: { thread_id: threadId } },
        checkpoint,
        expect.objectContaining({
          threadId,
          timestamp: expect.any(String),
          version: '1.0.0',
        })
      );
    });

    it('should handle checkpoint save failures', async () => {
      // Arrange
      const threadId = 'test-thread-123';
      const checkpoint: Checkpoint = {
        id: 'checkpoint-1',
        version: '1.0.0',
        channel_values: {},
        created_at: new Date().toISOString(),
      };

      mockRedisCheckpointSaver.put.mockRejectedValue(new Error('Redis connection failed'));

      // Act & Assert
      await expect(service.saveCheckpoint(threadId, checkpoint)).rejects.toThrow(CheckpointSaveError);
    });
  });
});
```

### Integration Testing

```typescript
describe('Multi-Agent Workflow Integration', () => {
  let app: INestApplication;
  let multiAgentService: MultiAgentCoordinatorService;
  let workflowService: WorkflowExecutionService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [
        NestjsLanggraphModule.forRoot({
          checkpoint: {
            savers: [
              {
                name: 'test',
                type: 'memory',
                default: true,
              },
            ],
          },
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    multiAgentService = app.get<MultiAgentCoordinatorService>(MultiAgentCoordinatorService);
    workflowService = app.get<WorkflowExecutionService>(WorkflowExecutionService);
  });

  it('should execute supervisor workflow with worker handoffs', async () => {
    // Register test agents
    const supervisorAgent: AgentDefinition = {
      id: 'supervisor',
      name: 'Test Supervisor',
      capabilities: ['coordination', 'routing'],
      constraints: { maxExecutionTime: 30000 },
      execute: async (state) => ({
        targetAgent: 'worker1',
        task: 'process_data',
        payload: state,
      }),
    };

    const workerAgent: AgentDefinition = {
      id: 'worker1',
      name: 'Test Worker',
      capabilities: ['data_processing'],
      constraints: { maxExecutionTime: 10000 },
      execute: async (state) => ({
        result: 'processed',
        data: state.payload,
      }),
    };

    multiAgentService.registerAgent(supervisorAgent);
    multiAgentService.registerAgent(workerAgent);

    // Create supervisor workflow
    const workflow = multiAgentService.createSupervisorWorkflow('supervisor', ['worker1']);

    // Execute workflow
    const result = await workflowService.execute(workflow, {
      input: 'test data',
    });

    // Assert
    expect(result).toEqual({
      result: 'processed',
      data: 'test data',
    });
  });
});
```

This comprehensive design provides the foundation for implementing a production-ready NestJS LangGraph library with all the advanced features outlined in the requirements. The architecture follows NestJS best practices while providing the sophisticated AI workflow capabilities needed for enterprise applications.
