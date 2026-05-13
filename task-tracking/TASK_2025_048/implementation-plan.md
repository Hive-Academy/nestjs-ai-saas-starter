# Implementation Plan - TASK_2025_048

## 📊 Codebase Investigation Summary

### Evidence Discovery Process

**Investigation Scope**:

- **Core Files Analyzed**: 6 key files
- **LangGraph APIs Verified**: CompiledGraph, Pregel, StateSnapshot, BaseCheckpointSaver
- **Existing Patterns**: 2 workflow patterns (functional-task, multi-agent supervisor)
- **Integration Points**: WorkflowExecutionService, ResearchChatController, HITL module

**Evidence Sources**:

1. **Checkpoint Infrastructure** - `apps/dev-brand-api/src/app/config/checkpoint.config.ts`

   - Verified: RedisSaver (production), SqliteSaver (dev), MemorySaver (test)
   - Pattern: Environment-based selection with TTL configuration
   - Integration: Passed to WorkflowExecutionService via module options

2. **Workflow Execution Service** - `libs/langgraph-modules/workflow-engine/src/lib/execution/workflow-execution.service.ts`

   - Verified: Already integrates checkpointer and BaseStore
   - Methods: `executeWorkflow()`, `streamWorkflow()`, `executeMultiAgentWorkflow()`
   - Pattern: Compiles graph with `graph.compile({ checkpointer, store })`
   - Evidence: Lines 142-145, 214-217, 278-281

3. **ResearcherAgent Pattern** - `apps/dev-brand-api/src/app/business-workflows/agents/researcher.agent.ts`

   - Verified: Functional-task pattern with @LLMTask decorator
   - Streaming: Uses StreamEventParser + StreamEventTransformer (lines 512-539)
   - Thread ID: Passed via `configurable: { thread_id: executionId }` (line 507)
   - HITL: @RequiresApproval decorator on `saveApprovedReport` task (lines 338-352)

4. **DevBrandSupervisorWorkflow Pattern** - `apps/dev-brand-api/src/app/business-workflows/workflows/devbrand-supervisor.workflow.ts`

   - Verified: Multi-agent supervisor topology with @MultiAgent decorator
   - Streaming: executeWithStreaming() method (lines 262-335)
   - Thread ID: Passed via `configurable: { thread_id: executionId }` (line 300)
   - Subgraph support: `subgraphs: true` for worker agent streaming (line 302)

5. **ResearchChatController** - `apps/dev-brand-api/src/app/business-workflows/controllers/research-chat.controller.ts`

   - Verified: SSE streaming pattern with active stream storage (lines 59-62)
   - HITL TODO: Lines 259-264 marked for LangGraph Command(resume=...) implementation
   - Pattern: POST /chat → returns executionId, GET /stream/:id → SSE streaming
   - Evidence: Approval endpoint exists but needs Command API integration

6. **LangGraph Native APIs** - `node_modules/@langchain/langgraph/dist`
   - Verified: CompiledGraph extends Pregel class
   - **getState() API**: Lines 378 in pregel/index.d.ts
     - Returns: `Promise<StateSnapshot>`
     - Requires: checkpointer configured
     - Usage: `await compiled.getState(config, options)`
   - **getStateHistory() API**: Line 392 in pregel/index.d.ts
     - Returns: `AsyncIterableIterator<StateSnapshot>`
     - Requires: checkpointer configured
     - Usage: `for await (const snapshot of compiled.getStateHistory(config, options))`
   - **StateSnapshot Type**: Lines 350-381 in pregel/types.d.ts
     ```typescript
     interface StateSnapshot {
       readonly values: Record<string, any> | any; // Current state
       readonly next: Array<string>; // Next nodes to execute
       readonly config: RunnableConfig; // Checkpoint config
       readonly metadata?: CheckpointMetadata; // Metadata
       readonly createdAt?: string; // Timestamp
       readonly parentConfig?: RunnableConfig; // Parent checkpoint
       readonly tasks: PregelTaskDescription[]; // Pending tasks
     }
     ```
   - **Resume Pattern**: Pass `checkpoint_id` via config.configurable
     ```typescript
     await compiled.invoke(input, {
       configurable: {
         thread_id: 'thread-123',
         checkpoint_id: 'specific-checkpoint-id', // Resume from this checkpoint
       },
     });
     ```

### Pattern Discovery

**Pattern 1: Thread-Based Execution**

- **Evidence**: ResearcherAgent.executeWithStreaming() line 507, DevBrandSupervisorWorkflow.execute() line 192
- **Pattern**: `configurable: { thread_id: executionId }`
- **Usage**: All workflow executions use thread_id for checkpoint isolation

**Pattern 2: SSE Streaming with State Storage**

- **Evidence**: ResearchChatController lines 145-237
- **Pattern**: Map<executionId, AsyncGenerator> for active streams
- **Lifecycle**: Store on POST, consume on GET, auto-cleanup after 30min

**Pattern 3: HITL Interruption Detection**

- **Evidence**: ResearchChatController lines 176-205
- **Pattern**: Check `waitingForApproval === true` or `userApproval === 'pending'`
- **Integration**: @RequiresApproval decorator sets these flags

**Pattern 4: Checkpoint Configuration Validation**

- **Evidence**: checkpoint.config.ts lines 115-153
- **Pattern**: validateCheckpointConfig() on app init
- **Checks**: Environment variables, TTL settings, path validation

---

## 🏗️ Architecture Design (LangGraph Native)

### Design Philosophy

**Chosen Approach**: LangGraph Native Checkpoint APIs with Zero Custom Abstractions

**Rationale**:

- **Evidence-Based**: All APIs verified in LangGraph source (`@langchain/langgraph@1.0.1`)
- **Zero Abstraction**: Use compiled graph's getState() directly (no custom wrappers)
- **Framework Delegation**: LangGraph handles checkpoint storage/retrieval
- **Pattern Consistency**: Matches existing ResearcherAgent and DevBrandSupervisor streaming patterns

**Evidence**: WorkflowExecutionService already delegates to LangGraph (lines 142-148):

```typescript
// Existing pattern - compile with checkpointer
const compiled = graph.compile({
  checkpointer: this.checkpointer, // LangGraph native
  store: this.store, // LangGraph native
});

// Execute with thread_id
const result = await compiled.invoke(input, config); // ✅ Already uses LangGraph APIs
```

### Component Specifications

#### Component 1: WorkflowExecutionService Extensions

**Purpose**: Add thread state retrieval methods using LangGraph native APIs

**Pattern**: Extension methods that delegate to compiled graph's native APIs

**Evidence**: Existing service structure (lines 44-83 in workflow-execution.service.ts)

**Responsibilities**:

- Retrieve current thread state via compiled graph's getState()
- Retrieve thread history via compiled graph's getStateHistory()
- Compile graph on-demand for state retrieval (thread_id → compiled graph)
- Support both functional-task and multi-agent patterns

**Implementation Pattern**:

```typescript
// Pattern source: libs/langgraph-modules/workflow-engine/src/lib/execution/workflow-execution.service.ts
// Evidence: Lines 111-152 (executeWorkflow pattern)

/**
 * NEW METHOD: Get current thread state
 * Uses LangGraph native getState() API
 */
async getThreadState<TState extends WorkflowState = WorkflowState>(
  workflowClass: any,
  threadId: string
): Promise<StateSnapshot> {
  // 1. Build graph (same pattern as executeWorkflow)
  const workflowInstance = this.moduleRef.get(workflowClass, { strict: false });
  const definition = this.metadataProcessor.extractWorkflowDefinition<TState>(workflowClass);

  // Bind handlers to instance
  definition.nodes.forEach((node) => {
    if (node.handler && workflowInstance) {
      node.handler = node.handler.bind(workflowInstance);
    }
  });

  const graph = this.buildStateGraph(definition);

  // 2. Compile with checkpointer
  const compiled = graph.compile({
    checkpointer: this.checkpointer,
    store: this.store,
  });

  // 3. Use LangGraph native getState()
  const snapshot = await compiled.getState({
    configurable: { thread_id: threadId }
  });

  return snapshot;
}

/**
 * NEW METHOD: Get thread history
 * Uses LangGraph native getStateHistory() API
 */
async *getThreadHistory<TState extends WorkflowState = WorkflowState>(
  workflowClass: any,
  threadId: string,
  options?: { limit?: number }
): AsyncIterableIterator<StateSnapshot> {
  // Build and compile graph (same pattern)
  const workflowInstance = this.moduleRef.get(workflowClass, { strict: false });
  const definition = this.metadataProcessor.extractWorkflowDefinition<TState>(workflowClass);

  definition.nodes.forEach((node) => {
    if (node.handler && workflowInstance) {
      node.handler = node.handler.bind(workflowInstance);
    }
  });

  const graph = this.buildStateGraph(definition);
  const compiled = graph.compile({
    checkpointer: this.checkpointer,
    store: this.store,
  });

  // Use LangGraph native getStateHistory()
  const history = compiled.getStateHistory(
    { configurable: { thread_id: threadId } },
    { limit: options?.limit }
  );

  for await (const snapshot of history) {
    yield snapshot;
  }
}

/**
 * NEW METHOD: Resume from specific checkpoint
 * Uses LangGraph native invoke() with checkpoint_id
 */
async resumeFromCheckpoint<TState extends WorkflowState = WorkflowState>(
  workflowClass: any,
  threadId: string,
  checkpointId: string,
  input?: TState
): Promise<TState> {
  // Build and compile graph (same pattern)
  const workflowInstance = this.moduleRef.get(workflowClass, { strict: false });
  const definition = this.metadataProcessor.extractWorkflowDefinition<TState>(workflowClass);

  definition.nodes.forEach((node) => {
    if (node.handler && workflowInstance) {
      node.handler = node.handler.bind(workflowInstance);
    }
  });

  const graph = this.buildStateGraph(definition);
  const compiled = graph.compile({
    checkpointer: this.checkpointer,
    store: this.store,
  });

  // Use LangGraph native invoke() with checkpoint_id
  const result = await compiled.invoke(input || null, {
    configurable: {
      thread_id: threadId,
      checkpoint_id: checkpointId  // Resume from specific checkpoint
    }
  });

  return result as TState;
}
```

**Quality Requirements**:

**Functional Requirements**:

- Must retrieve thread state using LangGraph getState() (verified at pregel/index.d.ts:378)
- Must retrieve thread history using LangGraph getStateHistory() (verified at pregel/index.d.ts:392)
- Must resume from specific checkpoint using checkpoint_id in config.configurable
- Must work with both functional-task (ResearcherAgent) and multi-agent (DevBrandSupervisor) patterns
- Must return native StateSnapshot types (no custom wrappers)

**Non-Functional Requirements**:

- **Performance**: Graph compilation is expensive - consider caching compiled graphs per workflowClass
- **Security**: Thread isolation via thread_id (existing pattern)
- **Error Handling**: Must throw if checkpointer not configured (LangGraph native behavior)
- **Type Safety**: Generic TState for workflow-specific state types

**Pattern Compliance**:

- ✅ Uses existing buildStateGraph() method (line 310)
- ✅ Uses existing moduleRef.get() pattern for DI (line 119)
- ✅ Uses existing graph.compile() pattern (lines 142-145)
- ✅ Zero custom checkpoint abstractions (LangGraph native only)

**Files Affected**:

- `libs/langgraph-modules/workflow-engine/src/lib/execution/workflow-execution.service.ts` (MODIFY - add 3 new methods)
- `libs/langgraph-modules/workflow-engine/src/index.ts` (MODIFY - export StateSnapshot type)

---

#### Component 2: ConversationHistoryController

**Purpose**: REST API endpoints for thread management and conversation history

**Pattern**: NestJS controller with LangGraph native state retrieval

**Evidence**: ResearchChatController pattern (lines 54-354)

**Responsibilities**:

- GET /api/conversation/threads/:threadId/state - Get current thread state
- GET /api/conversation/threads/:threadId/history - Get thread checkpoint history
- POST /api/conversation/threads/:threadId/resume - Resume from specific checkpoint
- GET /api/conversation/threads - List threads by userId (future Neo4j enhancement)

**Implementation Pattern**:

```typescript
// Pattern source: apps/dev-brand-api/src/app/business-workflows/controllers/research-chat.controller.ts
// Evidence: Lines 54-354 (REST controller with SSE streaming)

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { WorkflowExecutionService } from '@hive-academy/langgraph-workflow-engine';
import type { StateSnapshot } from '@hive-academy/langgraph-workflow-engine';
import { ResearcherAgent } from '../agents/researcher.agent';
import { DevBrandSupervisorWorkflow } from '../workflows/devbrand-supervisor.workflow';

/**
 * 💬 CONVERSATION HISTORY CONTROLLER - Thread State Management
 *
 * REST API endpoints for LangGraph checkpoint-based conversation history.
 *
 * Architecture Pattern:
 * ┌────────────────────────────────────────────────────────────────┐
 * │ 1. GET /api/conversation/threads/:threadId/state               │
 * │    → WorkflowExecutionService.getThreadState()                 │
 * │    → LangGraph compiled.getState()                             │
 * │    → Returns StateSnapshot (current state + next nodes)        │
 * │                                                                 │
 * │ 2. GET /api/conversation/threads/:threadId/history             │
 * │    → WorkflowExecutionService.getThreadHistory()               │
 * │    → LangGraph compiled.getStateHistory()                      │
 * │    → Returns StateSnapshot[] (checkpoint history)              │
 * │                                                                 │
 * │ 3. POST /api/conversation/threads/:threadId/resume             │
 * │    → WorkflowExecutionService.resumeFromCheckpoint()           │
 * │    → LangGraph compiled.invoke({ checkpoint_id })              │
 * │    → Resumes workflow from specific checkpoint                 │
 * └────────────────────────────────────────────────────────────────┘
 *
 * Supported Workflows:
 * - ResearcherAgent (functional-task pattern)
 * - DevBrandSupervisorWorkflow (multi-agent supervisor pattern)
 * - Any workflow using @Agent, @FunctionalWorkflow, or @MultiAgent decorators
 *
 * Thread Isolation:
 * - Each thread_id is isolated in checkpoint storage
 * - Users can have multiple concurrent threads
 * - Thread state persists based on checkpointer TTL (default: 7 days)
 */
@Controller('conversation')
export class ConversationHistoryController {
  private readonly logger = new Logger(ConversationHistoryController.name);

  constructor(private readonly workflowExecutionService: WorkflowExecutionService) {}

  /**
   * Get current thread state
   * Returns the latest checkpoint with state values and next nodes to execute
   */
  @Get('threads/:threadId/state')
  async getThreadState(
    @Param('threadId') threadId: string,
    @Query('workflow') workflowType: 'researcher' | 'devbrand' = 'researcher'
  ): Promise<{
    threadId: string;
    state: StateSnapshot;
  }> {
    this.logger.log(`📊 Getting thread state: ${threadId} (workflow: ${workflowType})`);

    try {
      // Select workflow class based on query param
      const workflowClass =
        workflowType === 'researcher' ? ResearcherAgent : DevBrandSupervisorWorkflow;

      // Retrieve state using LangGraph native API
      const snapshot = await this.workflowExecutionService.getThreadState(workflowClass, threadId);

      this.logger.log(`✅ Thread state retrieved: ${threadId}`);

      return {
        threadId,
        state: snapshot,
      };
    } catch (error: any) {
      this.logger.error(`❌ Failed to get thread state:`, error.message);

      if (error.message?.includes('checkpointer')) {
        throw new HttpException(
          'Checkpointer not configured - cannot retrieve thread state',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      throw new HttpException(
        error.message || 'Failed to retrieve thread state',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get thread checkpoint history
   * Returns list of all checkpoints for the thread (newest first)
   */
  @Get('threads/:threadId/history')
  async getThreadHistory(
    @Param('threadId') threadId: string,
    @Query('workflow') workflowType: 'researcher' | 'devbrand' = 'researcher',
    @Query('limit') limit?: number
  ): Promise<{
    threadId: string;
    history: StateSnapshot[];
    totalCheckpoints: number;
  }> {
    this.logger.log(
      `📜 Getting thread history: ${threadId} (workflow: ${workflowType}, limit: ${limit || 'all'})`
    );

    try {
      const workflowClass =
        workflowType === 'researcher' ? ResearcherAgent : DevBrandSupervisorWorkflow;

      // Retrieve history using LangGraph native API
      const historyIterator = this.workflowExecutionService.getThreadHistory(
        workflowClass,
        threadId,
        { limit }
      );

      // Collect all checkpoints
      const history: StateSnapshot[] = [];
      for await (const snapshot of historyIterator) {
        history.push(snapshot);
      }

      this.logger.log(`✅ Thread history retrieved: ${threadId} (${history.length} checkpoints)`);

      return {
        threadId,
        history,
        totalCheckpoints: history.length,
      };
    } catch (error: any) {
      this.logger.error(`❌ Failed to get thread history:`, error.message);

      if (error.message?.includes('checkpointer')) {
        throw new HttpException(
          'Checkpointer not configured - cannot retrieve thread history',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      throw new HttpException(
        error.message || 'Failed to retrieve thread history',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Resume thread from specific checkpoint
   * Continues workflow execution from a previous checkpoint
   */
  @Post('threads/:threadId/resume')
  async resumeThread(
    @Param('threadId') threadId: string,
    @Body()
    body: {
      checkpointId: string;
      workflow: 'researcher' | 'devbrand';
      input?: any; // Optional state update
    }
  ): Promise<{
    status: string;
    message: string;
    threadId: string;
    checkpointId: string;
    result: any;
  }> {
    this.logger.log(`🔄 Resuming thread: ${threadId} from checkpoint: ${body.checkpointId}`);

    try {
      const workflowClass =
        body.workflow === 'researcher' ? ResearcherAgent : DevBrandSupervisorWorkflow;

      // Resume using LangGraph native API
      const result = await this.workflowExecutionService.resumeFromCheckpoint(
        workflowClass,
        threadId,
        body.checkpointId,
        body.input
      );

      this.logger.log(`✅ Thread resumed: ${threadId}`);

      return {
        status: 'success',
        message: 'Workflow resumed from checkpoint',
        threadId,
        checkpointId: body.checkpointId,
        result,
      };
    } catch (error: any) {
      this.logger.error(`❌ Failed to resume thread:`, error.message);

      if (error.message?.includes('checkpointer')) {
        throw new HttpException(
          'Checkpointer not configured - cannot resume thread',
          HttpStatus.SERVICE_UNAVAILABLE
        );
      }

      throw new HttpException(
        error.message || 'Failed to resume thread',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * List threads by user ID (Future Enhancement - Phase 2)
   * Requires Neo4j indexing for userId → threadId mapping
   *
   * Implementation Strategy:
   * 1. Create ThreadMetadata Neo4j entity with userId, threadId, workflowType, createdAt
   * 2. Store thread metadata on workflow start (in ResearcherAgent, DevBrandSupervisor)
   * 3. Query Neo4j for user's threads
   * 4. For each thread, call getThreadState() to check if still active
   */
  @Get('users/:userId/threads')
  async listUserThreads(@Param('userId') userId: string): Promise<{
    userId: string;
    threads: Array<{
      threadId: string;
      workflowType: string;
      createdAt: string;
      lastCheckpointAt?: string;
      isActive: boolean;
    }>;
  }> {
    this.logger.log(`📋 Listing threads for user: ${userId}`);

    // TODO: Implement Neo4j query for thread metadata
    // For now, return empty list
    return {
      userId,
      threads: [],
    };
  }
}
```

**Quality Requirements**:

**Functional Requirements**:

- Must return StateSnapshot with values, next nodes, config, metadata
- Must support pagination for history retrieval (via limit parameter)
- Must handle multi-agent subgraph states in StateSnapshot.values
- Must validate workflow type parameter ('researcher' | 'devbrand')
- Must provide clear error messages for missing checkpointer

**Non-Functional Requirements**:

- **Security**: Thread isolation (no cross-thread access)
- **Performance**: Limit default history to 50 checkpoints
- **Error Handling**: HTTP 503 if checkpointer unavailable, HTTP 500 for other errors
- **Type Safety**: StateSnapshot type from LangGraph (no custom types)

**Pattern Compliance**:

- ✅ Uses WorkflowExecutionService delegation (matches ResearchChatController pattern)
- ✅ Uses NestJS HTTP decorators (@Get, @Post, @Param, @Query, @Body)
- ✅ Uses Logger for observability (matches existing controllers)
- ✅ Uses HttpException for error handling (NestJS standard)

**Files Affected**:

- `apps/dev-brand-api/src/app/business-workflows/controllers/conversation-history.controller.ts` (CREATE)
- `apps/dev-brand-api/src/app/business-workflows/business-workflows.module.ts` (MODIFY - add controller)

---

#### Component 3: HITL Resume Logic Completion

**Purpose**: Complete TODO at ResearchChatController lines 259-264 for HITL approval resume

**Pattern**: LangGraph Command API for workflow resume with user approval state

**Evidence**: TODO comment at lines 259-264, @RequiresApproval at lines 338-352

**Responsibilities**:

- Receive user approval/rejection decision via POST /api/research/approve/:executionId
- Update thread state with approval decision using updateState()
- Resume workflow execution using Command API or invoke()
- Stream resumed workflow events back to frontend

**Implementation Pattern**:

```typescript
// Pattern source: apps/dev-brand-api/src/app/business-workflows/controllers/research-chat.controller.ts
// Evidence: Lines 243-279 (existing approveReport endpoint with TODO)

/**
 * HITL approval endpoint - Resume workflow with user decision
 *
 * Uses LangGraph Command API pattern for resuming interrupted workflows:
 * 1. Workflow interrupts after @RequiresApproval task (saveApprovedReport)
 * 2. User reviews report draft in UI modal
 * 3. User approves/rejects via this endpoint
 * 4. Update thread state with approval decision
 * 5. Resume workflow execution (saves report if approved)
 *
 * LangGraph Pattern:
 * - Use updateState() to inject approval decision into thread
 * - Use invoke() to resume workflow from interrupted checkpoint
 * - Workflow continues from saveApprovedReport task with updated state
 */
@Post('approve/:executionId')
async approveReport(
  @Param('executionId') executionId: string,
  @Body() body: {
    approved: boolean;
    feedback?: string;
  }
): Promise<{ status: string; message: string; result?: any }> {
  this.logger.log(
    `📝 Approval received for ${executionId}: ${
      body.approved ? 'APPROVED' : 'REJECTED'
    }`
  );

  try {
    // ✅ IMPLEMENTATION: LangGraph state update + resume pattern

    // Step 1: Build graph for state update
    const graph = await this.buildResearcherGraph(); // Helper method

    // Step 2: Update thread state with approval decision
    // Uses LangGraph native updateState() API
    const updatedConfig = await graph.updateState(
      { configurable: { thread_id: executionId } },
      {
        metadata: {
          userApproval: body.approved ? 'approved' : 'rejected',
          approvalFeedback: body.feedback,
          approvalTimestamp: new Date().toISOString(),
        }
      },
      'saveApprovedReport' // Attribute update to this node
    );

    this.logger.log(`✅ Thread state updated: ${executionId}`);

    // Step 3: Resume workflow execution
    // If approved, workflow continues and saves report
    // If rejected, workflow ends without saving
    if (body.approved) {
      this.logger.log(`▶️  Resuming workflow: ${executionId}`);

      // Resume using LangGraph invoke() with updated checkpoint
      const result = await graph.invoke(
        null, // No new input needed - resume from current state
        { configurable: { thread_id: executionId } }
      );

      this.logger.log(`✅ Workflow resumed and completed: ${executionId}`);

      return {
        status: 'success',
        message: 'Report approved and saved successfully',
        result: {
          savedReportPath: result.metadata?.savedReportPath,
          savedReportFilename: result.metadata?.savedReportFilename,
        },
      };
    } else {
      this.logger.log(`⛔ Workflow rejected: ${executionId}`);

      return {
        status: 'success',
        message: 'Report rejected. Workflow ended without saving.',
      };
    }
  } catch (error: any) {
    this.logger.error(`❌ Approval failed:`, error.message);
    throw new HttpException(
      error.message || 'Failed to process approval',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * Helper: Build compiled ResearcherAgent graph
 * Reuses existing pattern from executeWithStreaming
 */
private async buildResearcherGraph() {
  // Use WorkflowExecutionService to build graph
  // Same pattern as executeWithStreaming but returns compiled graph
  // Implementation delegated to WorkflowExecutionService.buildGraph() helper
  const workflowInstance = this.moduleRef.get(ResearcherAgent, { strict: false });
  const definition = this.metadataProcessor.extractWorkflowDefinition(ResearcherAgent);

  definition.nodes.forEach((node) => {
    if (node.handler && workflowInstance) {
      node.handler = node.handler.bind(workflowInstance);
    }
  });

  const graph = this.buildStateGraph(definition);
  const compiled = graph.compile({
    checkpointer: this.checkpointer,
    store: this.store,
  });

  return compiled;
}
```

**Quality Requirements**:

**Functional Requirements**:

- Must update thread state with approval decision (approved/rejected/feedback)
- Must resume workflow execution if approved
- Must end workflow gracefully if rejected
- Must work with @RequiresApproval decorator pattern
- Must attribute state update to 'saveApprovedReport' node

**Non-Functional Requirements**:

- **Reliability**: Handle approval timeout (auto-approve per decorator config)
- **Security**: Validate executionId exists before resume
- **Performance**: Resume should be instant (checkpoint already exists)
- **Observability**: Log approval decision and resume result

**Pattern Compliance**:

- ✅ Uses LangGraph updateState() API (verified at pregel/index.d.ts:431)
- ✅ Uses LangGraph invoke() for resume (same as execute pattern)
- ✅ Uses existing checkpointer from module options
- ✅ Follows HITL @RequiresApproval decorator pattern

**Files Affected**:

- `apps/dev-brand-api/src/app/business-workflows/controllers/research-chat.controller.ts` (MODIFY - complete approveReport method, add buildResearcherGraph helper)

---

## 🔗 Integration Architecture

### Integration Points

**Integration 1: WorkflowExecutionService → LangGraph Compiled Graph**

- **Pattern**: Compile graph on-demand for state retrieval
- **Evidence**: Lines 142-148 in workflow-execution.service.ts
- **Connection**: `graph.compile({ checkpointer, store })` → `compiled.getState(config)`

**Integration 2: ConversationHistoryController → WorkflowExecutionService**

- **Pattern**: Controller delegates to service for business logic
- **Evidence**: ResearchChatController pattern (lines 65-67)
- **Connection**: REST endpoint → service method → LangGraph API

**Integration 3: ResearchChatController → LangGraph updateState() + invoke()**

- **Pattern**: HITL approval updates state then resumes execution
- **Evidence**: TODO at lines 259-264, @RequiresApproval at lines 338-352
- **Connection**: Approval endpoint → updateState() → invoke() → workflow resume

### Data Flow

**Flow 1: Thread State Retrieval**

```
User Request
  → GET /api/conversation/threads/:threadId/state
  → ConversationHistoryController.getThreadState()
  → WorkflowExecutionService.getThreadState()
  → Build graph → compile() → getState()
  → Return StateSnapshot
  → Frontend displays current state + next nodes
```

**Flow 2: Thread History Retrieval**

```
User Request
  → GET /api/conversation/threads/:threadId/history
  → ConversationHistoryController.getThreadHistory()
  → WorkflowExecutionService.getThreadHistory()
  → Build graph → compile() → getStateHistory()
  → AsyncIterableIterator<StateSnapshot>
  → Collect all checkpoints
  → Return StateSnapshot[] (newest first)
```

**Flow 3: HITL Approval Resume**

```
User Approval
  → POST /api/research/approve/:executionId
  → ResearchChatController.approveReport()
  → Build compiled graph
  → updateState({ userApproval: 'approved', feedback })
  → invoke(null, { thread_id }) // Resume from updated checkpoint
  → Workflow continues → saveApprovedReport executes
  → Report saved to filesystem
  → Return success + savedReportPath
```

### Dependencies

**External Dependencies** (verified from package.json):

- `@langchain/langgraph@1.0.1` - Core LangGraph APIs
- `@langchain/langgraph-checkpoint@1.0.1` - Checkpoint types
- `@langchain/langgraph-checkpoint-redis@1.0.1` - RedisSaver
- `@langchain/langgraph-checkpoint-sqlite@1.0.1` - SqliteSaver

**Internal Dependencies**:

- `@hive-academy/langgraph-workflow-engine` - WorkflowExecutionService, MetadataProcessor
- `@hive-academy/langgraph-hitl` - @RequiresApproval decorator
- `@nestjs/common` - NestJS HTTP decorators
- `@nestjs/core` - ModuleRef for DI

---

## 🎯 Quality Requirements (Architecture-Level)

### Functional Requirements

**Thread State Management**:

- Must retrieve current thread state with values, next nodes, metadata
- Must retrieve thread checkpoint history (all checkpoints for a thread)
- Must support resuming from specific checkpoint via checkpoint_id
- Must work with both functional-task and multi-agent workflow patterns
- Must return native LangGraph StateSnapshot types (no custom wrappers)

**HITL Resume Logic**:

- Must update thread state with approval decision (approved/rejected/feedback)
- Must resume workflow execution after approval
- Must gracefully end workflow if rejected
- Must work with @RequiresApproval decorator pattern
- Must attribute state updates to correct node

**Thread Lifecycle**:

- Must isolate threads via thread_id (no cross-thread access)
- Must respect checkpointer TTL (default: 7 days)
- Must handle expired checkpoints gracefully (return 404)

### Non-Functional Requirements

**Performance**:

- **Graph Compilation**: Expensive operation - consider caching compiled graphs per workflowClass
- **History Retrieval**: Default limit 50 checkpoints, support pagination
- **State Retrieval**: <100ms for single checkpoint lookup (Redis)
- **Resume**: <50ms overhead (checkpoint already exists)

**Security**:

- **Thread Isolation**: thread_id enforces user boundary
- **No Cross-Thread Access**: Validate thread ownership (future: userId → threadId mapping)
- **Input Validation**: Validate workflow type, checkpoint_id, thread_id format
- **Error Messages**: No internal details leaked to client

**Maintainability**:

- **Zero Abstraction**: Use LangGraph native APIs directly
- **Evidence-Based**: All APIs verified in LangGraph source
- **Pattern Consistency**: Match existing ResearcherAgent and DevBrandSupervisor patterns
- **Type Safety**: Generic TState for workflow-specific state types

**Testability**:

- **Unit Tests**: Mock WorkflowExecutionService for controller tests
- **Integration Tests**: Use MemorySaver for fast checkpoint tests
- **E2E Tests**: Use SqliteSaver for full workflow tests with real checkpoints

### Pattern Compliance

**LangGraph Native APIs** (verified from source):

- ✅ `compiled.getState(config)` - StateSnapshot retrieval
- ✅ `compiled.getStateHistory(config, options)` - Checkpoint history
- ✅ `compiled.invoke(input, { configurable: { checkpoint_id } })` - Resume from checkpoint
- ✅ `compiled.updateState(config, values, asNode)` - State update for HITL
- ✅ StateSnapshot type - { values, next, config, metadata, createdAt, parentConfig, tasks }

**Existing Codebase Patterns** (verified from evidence):

- ✅ WorkflowExecutionService.buildStateGraph() - Graph building
- ✅ moduleRef.get() - NestJS DI pattern
- ✅ graph.compile({ checkpointer, store }) - Compilation pattern
- ✅ configurable: { thread_id } - Thread isolation
- ✅ StreamEventParser + StreamEventTransformer - Streaming pattern
- ✅ @RequiresApproval decorator - HITL pattern

---

## 🤝 Team-Leader Handoff

### Developer Type Recommendation

**Recommended Developer**: backend-developer

**Rationale**:

- **NestJS Backend Work**: 90% of implementation is backend services (WorkflowExecutionService, controllers)
- **No Frontend Required**: REST API endpoints only (frontend integration is separate task)
- **LangGraph Integration**: Requires understanding of LangGraph checkpoint APIs
- **TypeScript Generics**: Complex generic type handling for TState
- **Database Integration**: Checkpoint storage (Redis/SQLite) configuration

### Complexity Assessment

**Complexity**: MEDIUM

**Estimated Effort**: 6-8 hours

**Breakdown**:

- **WorkflowExecutionService Extensions**: 3-4 hours
  - getThreadState() method: 1 hour
  - getThreadHistory() method: 1 hour
  - resumeFromCheckpoint() method: 1 hour
  - Type definitions and exports: 1 hour
- **ConversationHistoryController**: 2-3 hours
  - Controller scaffolding: 0.5 hour
  - GET /state endpoint: 0.5 hour
  - GET /history endpoint: 0.5 hour
  - POST /resume endpoint: 0.5 hour
  - Error handling: 0.5 hour
  - Documentation: 0.5 hour
- **HITL Resume Logic**: 1-1.5 hours
  - approveReport() implementation: 0.5 hour
  - buildResearcherGraph() helper: 0.5 hour
  - Testing with ResearcherAgent: 0.5 hour

### Files Affected Summary

**MODIFY** (3 files):

- `libs/langgraph-modules/workflow-engine/src/lib/execution/workflow-execution.service.ts`
  - Add getThreadState() method
  - Add getThreadHistory() method
  - Add resumeFromCheckpoint() method
- `libs/langgraph-modules/workflow-engine/src/index.ts`
  - Export StateSnapshot type from LangGraph
  - Export new WorkflowExecutionService methods
- `apps/dev-brand-api/src/app/business-workflows/controllers/research-chat.controller.ts`
  - Complete approveReport() method (remove TODO)
  - Add buildResearcherGraph() helper method
  - Update imports

**CREATE** (1 file):

- `apps/dev-brand-api/src/app/business-workflows/controllers/conversation-history.controller.ts`
  - New REST controller for thread management
  - 4 endpoints: getThreadState, getThreadHistory, resumeThread, listUserThreads

**REGISTER** (1 file):

- `apps/dev-brand-api/src/app/business-workflows/business-workflows.module.ts`
  - Add ConversationHistoryController to controllers array

### Critical Verification Points

**Before Implementation, Developer Must Verify**:

1. **All LangGraph APIs exist**:

   - `compiled.getState(config)` (verified: pregel/index.d.ts:378)
   - `compiled.getStateHistory(config, options)` (verified: pregel/index.d.ts:392)
   - `compiled.updateState(config, values, asNode)` (verified: pregel/index.d.ts:431)
   - `compiled.invoke(input, { configurable: { checkpoint_id } })` (verified: pattern from existing usage)
   - StateSnapshot type (verified: pregel/types.d.ts:350-381)

2. **All patterns verified from examples**:

   - Graph compilation: workflow-execution.service.ts:142-145
   - Thread ID pattern: researcher.agent.ts:507, devbrand-supervisor.workflow.ts:192
   - State retrieval: Use compiled graph's native methods
   - HITL pattern: @RequiresApproval decorator at researcher.agent.ts:339

3. **Checkpointer configuration**:

   - Module initialization: apps/dev-brand-api/src/app/config/checkpoint.config.ts
   - Environment variables: REDIS_URL, NODE_ENV, CHECKPOINT_TTL_MINUTES
   - Validation: validateCheckpointConfig() called on app init

4. **No hallucinated APIs**:
   - All APIs verified in LangGraph source code
   - All patterns extracted from existing codebase
   - Zero custom checkpoint abstractions

### Architecture Delivery Checklist

- [x] All components specified with evidence citations
- [x] All patterns verified from LangGraph source (pregel/index.d.ts, pregel/types.d.ts, graph/graph.d.ts)
- [x] All imports/types verified as existing (StateSnapshot, PregelOptions, CompiledGraph)
- [x] Quality requirements defined (functional + non-functional + pattern compliance)
- [x] Integration points documented (3 integration flows with evidence)
- [x] Files affected list complete (3 MODIFY, 1 CREATE, 1 REGISTER)
- [x] Developer type recommended (backend-developer)
- [x] Complexity assessed (MEDIUM, 6-8 hours)
- [x] Zero abstraction approach (LangGraph native APIs only)
- [x] Evidence-based architecture (all decisions cited with file:line)
