# Development Tasks - TASK_2025_049

**Task Type**: Backend
**Total Tasks**: 5
**Total Batches**: 5 (atomic tasks, no batching due to sequential dependencies)
**Batching Strategy**: Sequential dependency chain (low-level → high-level → integration)
**Status**: 2/5 tasks complete (40%)

---

## Task 1: Create LangGraphCommandService ✅ COMPLETE

**Assigned To**: backend-developer
**Status**: ✅ COMPLETE
**Dependencies**: None (foundation service)
**Estimated Commits**: 1
**Git Commit**: 4e85536

### Task Description

Create low-level LangGraph Command pattern API wrapper service. This is a pure utility service with no business logic, providing type-safe wrappers for LangGraph's Command-related operations.

**File to CREATE**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\services\langgraph-command.service.ts`

### Implementation Details

**Service Responsibility**: Pure LangGraph API wrapper - no state, no business logic

**Core Methods to Implement** (from implementation-plan.md:315-459):

1. **invokeWithCommand<TState>(compiledGraph, command, config): Promise<TState>**

   - Purpose: Invoke compiled graph with Command for workflow resumption
   - Parameters:
     - `compiledGraph: CompiledStateGraph<TState>` - Already compiled StateGraph
     - `command: Command` - LangGraph Command instance
     - `config: RunnableConfig` - Config with thread_id and checkpoint_id
   - Returns: Final workflow state after resumption
   - Implementation: `await compiledGraph.invoke(command, config)`

2. **getState<TState>(compiledGraph, config): Promise<StateSnapshot<TState>>**

   - Purpose: Get current state snapshot from compiled graph
   - Parameters:
     - `compiledGraph: CompiledStateGraph<TState>` - Already compiled StateGraph
     - `config: RunnableConfig` - Config with thread_id
   - Returns: StateSnapshot with valid next[] and tasks[] arrays
   - Implementation: `await compiledGraph.getState(config)`

3. **updateState<TState>(compiledGraph, updates, asNode, config): Promise<void>**

   - Purpose: Update workflow state without resumption (advanced use case)
   - Parameters:
     - `compiledGraph: CompiledStateGraph<TState>` - Already compiled StateGraph
     - `updates: Partial<TState>` - State updates to apply
     - `asNode: string | null` - Optional node name to attribute update to
     - `config: RunnableConfig` - Config with thread_id
   - Implementation: `await compiledGraph.updateState(config, updates, asNode)`

4. **streamWithCommand<TState>(compiledGraph, command, config): AsyncIterable<unknown>**
   - Purpose: Stream workflow execution with Command
   - Parameters:
     - `compiledGraph: CompiledStateGraph<TState>` - Already compiled StateGraph
     - `command: Command` - LangGraph Command instance
     - `config: RunnableConfig & { streamMode?: ... }` - Config with stream mode
   - Returns: AsyncIterable of state updates
   - Implementation: `async *streamWithCommand() { yield* compiledGraph.stream(command, config) }`

**Required Imports**:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import type { RunnableConfig } from '@langchain/core/runnables';
import { Command } from '@langchain/langgraph';
import type { CompiledStateGraph, StateSnapshot } from '@langchain/langgraph';
import type { WorkflowState } from '@hive-academy/langgraph-core';
```

**Logging Requirements**:

- Debug log before each operation with thread_id
- Success log after each operation with thread_id
- Error log on failures with error message
- Example: `this.logger.debug(`Invoking graph with Command for thread: ${config.configurable?.thread_id}`)`

**Error Handling**:

- All methods MUST throw errors on failure (no graceful degradation)
- Log error before throwing
- Do not catch/suppress errors

**Pattern Compliance**:

- MUST NOT contain graph compilation logic
- MUST NOT contain state sanitization logic
- MUST NOT contain workflow resolution logic
- MUST accept pre-compiled graphs only

### Quality Requirements

**Functional**:

- ✅ All methods MUST be pure LangGraph API wrappers (no business logic)
- ✅ All methods MUST accept pre-compiled graphs (no compilation logic)
- ✅ All methods MUST throw errors on failure (no graceful degradation)

**Non-Functional**:

- ✅ 95th percentile response time < 50ms (excluding LangGraph execution)

**Security**:

- ✅ No sensitive data logging (mask thread_id in production if needed)

### Verification Requirements

**File Exists**:

```bash
# Verify file created
ls "D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\services\langgraph-command.service.ts"
```

**Exports Verification**:

```typescript
// File must export LangGraphCommandService class
export class LangGraphCommandService { ... }
```

**Method Signatures**:

- ✅ invokeWithCommand exists with correct signature
- ✅ getState exists with correct signature
- ✅ updateState exists with correct signature
- ✅ streamWithCommand exists with correct signature

**No Compilation Errors**:

```bash
# Build workflow-engine library
npx nx build @hive-academy/langgraph-workflow-engine
```

**Git Commit Pattern**:

```bash
# Commit message MUST follow commitlint rules
git commit -m "feat(langgraph): create command service wrapper"

# Valid commit message format:
# - type: feat (new feature)
# - scope: langgraph (langgraph module)
# - subject: create command service wrapper (lowercase, no period, imperative)
```

### Commit Message Template

```
feat(langgraph): create command service wrapper

Low-level service for LangGraph Command pattern operations.
Provides type-safe wrappers for invoking, streaming, and state
management using LangGraph's native Command class.

- invokeWithCommand: Execute workflow with Command
- getState: Retrieve StateSnapshot from compiled graph
- updateState: Update state without resumption
- streamWithCommand: Stream workflow execution

Pattern: Pure utility service (no business logic)
TASK_2025_049
```

---

## Task 2: Create WorkflowResumptionService ✅ COMPLETE

**Assigned To**: backend-developer
**Status**: ✅ COMPLETE
**Dependencies**: Task 1 (uses LangGraphCommandService) ✅ COMPLETE
**Estimated Commits**: 1
**Git Commit**: e37dc95

### Task Description

Create high-level workflow resumption orchestration service. This service compiles graphs, sanitizes StateSnapshots, and delegates Command operations to LangGraphCommandService.

**File to CREATE**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\services\workflow-resumption.service.ts`

### Implementation Details

**Service Responsibility**: Orchestrate workflow resumption workflows (compilation + Command execution + sanitization)

**Core Methods to Implement** (from implementation-plan.md:589-845):

1. **resumeWorkflow<TState>(workflowClass, threadId, resumeValue, checkpointId?): Promise<TState>**

   - Purpose: Resume workflow execution from interruption using Command pattern
   - Parameters:
     - `workflowClass: any` - Decorated workflow class (e.g., ResearcherAgent)
     - `threadId: string` - Thread identifier for interrupted workflow
     - `resumeValue: any` - User's approval decision or input data
     - `checkpointId?: string` - Optional checkpoint ID for precise resumption
   - Returns: Final workflow state after resumption
   - Implementation Steps:
     1. Compile graph via `compileWorkflowGraph<TState>(workflowClass)`
     2. Create Command: `new Command({ resume: resumeValue })`
     3. Build RunnableConfig with thread_id and optional checkpoint_id
     4. Delegate to `this.commandService.invokeWithCommand(compiled, command, config)`

2. **getWorkflowState<TState>(workflowClass, threadId): Promise<SanitizedStateSnapshot<TState>>**

   - Purpose: Get sanitized workflow state snapshot
   - Parameters:
     - `workflowClass: any` - Decorated workflow class
     - `threadId: string` - Thread identifier
   - Returns: SanitizedStateSnapshot with PII/sensitive data removed
   - Implementation Steps:
     1. Compile graph via `compileWorkflowGraph<TState>(workflowClass)`
     2. Build RunnableConfig with thread_id
     3. Delegate to `this.commandService.getState(compiled, config)`
     4. Sanitize via `sanitizeStateSnapshot<TState>(snapshot)`

3. **updateWorkflowState<TState>(workflowClass, threadId, updates, asNode?): Promise<void>**
   - Purpose: Update workflow state without resumption (advanced use case)
   - Parameters:
     - `workflowClass: any` - Decorated workflow class
     - `threadId: string` - Thread identifier
     - `updates: Partial<TState>` - State updates to apply
     - `asNode?: string` - Optional node name to attribute update to
   - Implementation Steps:
     1. Compile graph via `compileWorkflowGraph<TState>(workflowClass)`
     2. Build RunnableConfig with thread_id
     3. Delegate to `this.commandService.updateState(compiled, updates, asNode || null, config)`

**Private Helper Methods** (from implementation-plan.md:757-845):

4. **compileWorkflowGraph<TState>(workflowClass): Promise<CompiledStateGraph<TState>>**

   - Purpose: Compile workflow graph from workflow class
   - Pattern: Reuses executeWorkflow() compilation pattern from workflow-execution.service.ts:111-152
   - Implementation Steps:
     1. Get workflow instance: `this.moduleRef.get(workflowClass, { strict: false })`
     2. Extract metadata: `this.metadataProcessor.extractWorkflowDefinition<TState>(workflowClass)`
     3. Bind handlers to instance: `definition.nodes.forEach(node => node.handler = node.handler.bind(workflowInstance))`
     4. Validate metadata: `this.metadataProcessor.validateWorkflowDefinition(definition)`
     5. Build StateGraph: `this.buildStateGraph(definition)`
     6. Compile: `graph.compile({ checkpointer: this.checkpointer, store: this.store })`

5. **buildStateGraph(definition): StateGraph**

   - Purpose: Build StateGraph from WorkflowDefinition
   - Implementation: Delegate to `this.metadataProcessor.buildGraph(definition)`

6. **sanitizeStateSnapshot<TState>(snapshot): SanitizedStateSnapshot<TState>**
   - Purpose: Remove PII/sensitive data from StateSnapshot
   - Implementation:
     1. Clone state values: `const sanitizedValues = { ...snapshot.values }`
     2. Define sensitive fields: `['password', 'apiKey', 'token', 'ssn', 'creditCard']`
     3. Remove sensitive fields from values
     4. Remove sensitive fields from metadata
     5. Return sanitized snapshot with same structure

**Required Imports**:

```typescript
import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { RunnableConfig } from '@langchain/core/runnables';
import { Command } from '@langchain/langgraph';
import type { BaseCheckpointSaver, BaseStore } from '@langchain/langgraph-checkpoint';
import { BASE_STORE_TOKEN } from '@hive-academy/langgraph-memory';
import { MetadataProcessorService } from '../core/metadata-processor.service';
import { LangGraphCommandService } from './langgraph-command.service';
import type { WorkflowDefinition, WorkflowState } from '../interfaces/workflow-engine.interface';
import type { WorkflowEngineModuleOptions } from '../workflow-engine.module';
import type { StateSnapshot } from '@langchain/langgraph';
```

**Constructor Injection**:

```typescript
constructor(
  private readonly metadataProcessor: MetadataProcessorService,
  private readonly moduleRef: ModuleRef,
  private readonly commandService: LangGraphCommandService,
  @Inject('WORKFLOW_ENGINE_MODULE_OPTIONS')
  options: WorkflowEngineModuleOptions,
  @Optional()
  @Inject(BASE_STORE_TOKEN)
  store?: BaseStore
) {
  this.checkpointer = options.checkpointer;
  this.store = store;

  if (!this.checkpointer) {
    this.logger.warn('⚠️  No checkpointer configured - workflow resumption disabled');
  }
}
```

**SanitizedStateSnapshot Interface** (include in same file):

```typescript
export interface SanitizedStateSnapshot<TState extends WorkflowState = WorkflowState> {
  values: TState;
  next: readonly string[];
  config: RunnableConfig;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  parentConfig?: RunnableConfig;
  tasks?: readonly any[];
}
```

**Error Handling**:

- Throw error if checkpointer not configured
- Log errors before throwing
- Don't suppress errors

### Quality Requirements

**Functional**:

- ✅ MUST compile graph before every operation (no graph caching)
- ✅ MUST sanitize StateSnapshot before returning (PII filtering)
- ✅ MUST delegate all Command operations to LangGraphCommandService
- ✅ MUST use MetadataProcessorService for graph building

**Non-Functional**:

- ✅ 95th percentile response time < 1000ms (including compilation)

**Security**:

- ✅ MUST filter sensitive fields from StateSnapshot (password, apiKey, token, ssn, creditCard)

### Verification Requirements

**File Exists**:

```bash
ls "D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\services\workflow-resumption.service.ts"
```

**Exports Verification**:

```typescript
// File must export WorkflowResumptionService class and SanitizedStateSnapshot interface
export class WorkflowResumptionService { ... }
export interface SanitizedStateSnapshot<TState> { ... }
```

**Method Signatures**:

- ✅ resumeWorkflow exists with correct signature
- ✅ getWorkflowState exists with correct signature
- ✅ updateWorkflowState exists with correct signature
- ✅ compileWorkflowGraph exists (private)
- ✅ buildStateGraph exists (private)
- ✅ sanitizeStateSnapshot exists (private)

**Dependency Injection**:

- ✅ Injects LangGraphCommandService (Task 1 dependency)
- ✅ Injects MetadataProcessorService
- ✅ Injects ModuleRef
- ✅ Injects WorkflowEngineModuleOptions
- ✅ Injects BaseStore (optional)

**No Compilation Errors**:

```bash
npx nx build @hive-academy/langgraph-workflow-engine
```

**Git Commit Pattern**:

```bash
git commit -m "feat(langgraph): create workflow resumption service"
```

### Commit Message Template

```
feat(langgraph): create workflow resumption service

High-level orchestration service for resuming interrupted workflows.
Handles graph compilation, StateSnapshot sanitization, workflow class
resolution, and delegates to LangGraphCommandService for low-level
Command operations.

- resumeWorkflow: Resume workflow using Command pattern
- getWorkflowState: Get sanitized StateSnapshot
- updateWorkflowState: Update state without resumption
- compileWorkflowGraph: Reuse executeWorkflow compilation pattern
- sanitizeStateSnapshot: PII filtering for security

Pattern: Orchestration service (delegates to LangGraphCommandService)
Dependencies: Task 1 (LangGraphCommandService)
TASK_2025_049
```

---

## Task 3: Refactor WorkflowExecutionService (Delegation Pattern) 🔄 IN PROGRESS

**Assigned To**: backend-developer
**Status**: 🔄 IN PROGRESS - Assigned to backend-developer
**Dependencies**: Task 2 (delegates to WorkflowResumptionService) ✅ COMPLETE
**Estimated Commits**: 1

### Task Description

Refactor WorkflowExecutionService to delegate resumption operations to WorkflowResumptionService. Add WorkflowResumptionService dependency and implement delegation pattern for backward compatibility.

**File to MODIFY**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\execution\workflow-execution.service.ts`

### Implementation Details

**Changes Required** (from implementation-plan.md:884-992):

1. **Add Import**:

```typescript
import { WorkflowResumptionService } from './workflow-resumption.service';
```

2. **Modify Constructor** (lines 48-83):
   - Add WorkflowResumptionService injection at the end of constructor parameters
   - Make it OPTIONAL using `@Optional()` decorator
   - Log warning if not available

```typescript
constructor(
  private readonly metadataProcessor: MetadataProcessorService,
  private readonly moduleRef: ModuleRef,
  private readonly multiAgentGraphBuilder: MultiAgentGraphBuilderService,
  private readonly functionalTaskStrategy: FunctionalTaskGraphStrategy,
  private readonly functionalNodeStrategy: FunctionalNodeGraphStrategy,
  @Inject('WORKFLOW_ENGINE_MODULE_OPTIONS')
  options: WorkflowEngineModuleOptions,
  @Optional()
  @Inject(BASE_STORE_TOKEN)
  private readonly store?: BaseStore,

  // NEW: Inject WorkflowResumptionService for resumption operations
  @Optional()
  private readonly resumptionService?: WorkflowResumptionService
) {
  this.checkpointer = options.checkpointer;

  if (!this.resumptionService) {
    this.logger.warn('⚠️  WorkflowResumptionService not available - resumption features disabled');
  }
}
```

3. **Deprecate getStateSnapshot() Method** (lines 351-396):
   - Add `@deprecated` JSDoc tag
   - Log deprecation warning
   - Delegate to `resumptionService.getWorkflowState()`
   - Throw error if resumptionService unavailable

```typescript
/**
 * Get workflow state snapshot using compiled graph's getState() method
 *
 * @deprecated Use WorkflowResumptionService.getWorkflowState() instead
 * This method is kept for backward compatibility and delegates to WorkflowResumptionService
 */
async getStateSnapshot<TState extends WorkflowState = WorkflowState>(
  workflowClass: any,
  threadId: string
): Promise<StateSnapshot<TState>> {
  if (!this.resumptionService) {
    throw new Error('WorkflowResumptionService not available - cannot retrieve state snapshot');
  }

  this.logger.warn('DEPRECATED: getStateSnapshot() - Use WorkflowResumptionService.getWorkflowState() instead');

  return await this.resumptionService.getWorkflowState<TState>(workflowClass, threadId);
}
```

4. **Deprecate resumeFromInterruption() Method** (lines 488-552):
   - Add `@deprecated` JSDoc tag
   - Log deprecation warning
   - Delegate to `resumptionService.resumeWorkflow()`
   - Throw error if resumptionService unavailable

```typescript
/**
 * Resume workflow execution from interruption using LangGraph Command pattern
 *
 * @deprecated Use WorkflowResumptionService.resumeWorkflow() instead
 * This method is kept for backward compatibility and delegates to WorkflowResumptionService
 */
async resumeFromInterruption<TState extends WorkflowState = WorkflowState>(
  workflowClass: any,
  threadId: string,
  checkpointId: string,
  resumeValue: any
): Promise<TState> {
  if (!this.resumptionService) {
    throw new Error('WorkflowResumptionService not available - cannot resume workflow');
  }

  this.logger.warn('DEPRECATED: resumeFromInterruption() - Use WorkflowResumptionService.resumeWorkflow() instead');

  return await this.resumptionService.resumeWorkflow<TState>(
    workflowClass,
    threadId,
    resumeValue,
    checkpointId
  );
}
```

**DO NOT MODIFY**:

- executeWorkflow() method - keep as-is
- streamWorkflow() method - keep as-is
- Any other existing methods

### Quality Requirements

**Backward Compatibility**:

- ✅ Existing methods MUST continue to work
- ✅ MUST log deprecation warnings when called
- ✅ MUST throw clear errors if WorkflowResumptionService unavailable

**Pattern Compliance**:

- ✅ MUST use @Optional() injection for WorkflowResumptionService
- ✅ MUST NOT break existing executeWorkflow() or streamWorkflow() methods

### Verification Requirements

**File Modified**:

```bash
# Verify file exists
ls "D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\execution\workflow-execution.service.ts"
```

**Import Added**:

```typescript
// Verify import exists
import { WorkflowResumptionService } from './workflow-resumption.service';
```

**Constructor Modified**:

- ✅ WorkflowResumptionService injected as last parameter
- ✅ @Optional() decorator present
- ✅ Warning logged if unavailable

**Methods Deprecated**:

- ✅ getStateSnapshot() has @deprecated tag
- ✅ getStateSnapshot() delegates to resumptionService.getWorkflowState()
- ✅ resumeFromInterruption() has @deprecated tag
- ✅ resumeFromInterruption() delegates to resumptionService.resumeWorkflow()

**No Compilation Errors**:

```bash
npx nx build @hive-academy/langgraph-workflow-engine
```

**Git Commit Pattern**:

```bash
git commit -m "refactor(langgraph): delegate workflow execution to resumption service"
```

### Commit Message Template

```
refactor(langgraph): delegate workflow execution to resumption service

Refactor WorkflowExecutionService to delegate resumption operations
to WorkflowResumptionService following Single Responsibility Principle.

Changes:
- Add WorkflowResumptionService injection (optional)
- Deprecate getStateSnapshot() - delegates to getWorkflowState()
- Deprecate resumeFromInterruption() - delegates to resumeWorkflow()
- Log deprecation warnings for backward compatibility
- Preserve executeWorkflow() and streamWorkflow() unchanged

Pattern: Delegation with backward compatibility
Dependencies: Task 2 (WorkflowResumptionService)
TASK_2025_049
```

---

## Task 4: Enhance HumanApprovalService (HITL Integration) ⏸️ PENDING

**Assigned To**: backend-developer
**Dependencies**: Task 2 (uses WorkflowResumptionService)
**Estimated Commits**: 1

### Task Description

Integrate WorkflowResumptionService into HumanApprovalService for workflow resumption after approval. Modify requestApproval() to store workflowClass metadata, enhance processApprovalResponse() to resume workflow, and add resolveWorkflowClass() helper.

**File to MODIFY**: `D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\human-approval.service.ts`

### Implementation Details

**Changes Required** (from implementation-plan.md:1018-1218):

1. **Add Import**:

```typescript
import { WorkflowResumptionService } from '@hive-academy/langgraph-workflow-engine';
```

2. **Modify Constructor** (lines 49-64):
   - Add WorkflowResumptionService injection at the end
   - Make it OPTIONAL using `@Optional()` decorator
   - Log warning if not available

```typescript
constructor(
  private readonly eventEmitter: EventEmitter2,
  private readonly approvalProcessingService: ApprovalProcessingService,
  private readonly approvalTimeoutService: ApprovalTimeoutService,
  private readonly approvalStreamingService: ApprovalStreamingService,
  private readonly userInterruptionService: UserInterruptionService,
  private readonly hitlValidationService: HitlValidationService,
  private readonly hitlApprovalRequestService: HitlApprovalRequestService,
  @Inject(IHitlStorageService)
  private readonly hitlStorage: IHitlStorageService,

  // NEW: WorkflowResumptionService for workflow resumption (TASK_2025_049)
  @Optional()
  private readonly resumptionService?: WorkflowResumptionService
) {
  this.logger.log('🎯 Human Approval Service initialized with specialized services');

  if (!this.resumptionService) {
    this.logger.warn('WorkflowResumptionService not available - HITL workflow resumption disabled');
  }
}
```

3. **Enhance requestApproval() Method** (lines 92-109):
   - Add `workflowClass?: string` parameter (optional for backward compatibility)
   - Store workflowClass in options.metadata for later retrieval

```typescript
async requestApproval(
  executionId: string,
  nodeId: string,
  message: string,
  state: WorkflowState,
  options: RequiresApprovalOptions = {},
  workflowClass?: string // NEW parameter (optional for backward compatibility)
): Promise<HumanApprovalRequest> {
  // Enhance options with workflowClass metadata
  const enhancedOptions = {
    ...options,
    metadata: {
      ...(options.metadata || {}),
      workflowClass, // Store for resumption in processApprovalResponse
    },
  };

  return this.hitlApprovalRequestService.createApprovalRequest(
    executionId,
    nodeId,
    message,
    state,
    enhancedOptions,
    this.hitlStorage,
    this.approvalCache,
    (id) => this.handleTimeout(id)
  );
}
```

4. **Enhance processApprovalResponse() Method** (lines 114-162):
   - Add workflow resumption logic after Step 3 (approval processing)
   - Extract workflowClass from approval metadata
   - Get StateSnapshot to extract checkpoint_id
   - Resume workflow using WorkflowResumptionService.resumeWorkflow()
   - Return workflowResumed flag in result

```typescript
async processApprovalResponse(
  requestId: string,
  response: HumanApprovalResponse
): Promise<{
  success: boolean;
  nextState?: Partial<WorkflowState>;
  error?: string;
  workflowResumed?: boolean; // NEW
}> {
  // Step 1: Retrieve approval request (same as before)
  let request = this.approvalCache.get(requestId);
  if (!request) {
    const storageRequest = await this.hitlStorage.get(requestId);
    if (storageRequest) {
      this.approvalCache.set(requestId, storageRequest);
      request = storageRequest;
    }
  }

  if (!request) {
    return { success: false, error: `Approval request ${requestId} not found` };
  }

  // Step 2: Clear timeout (same as before)
  this.approvalTimeoutService.clearTimeout(requestId);

  // Step 3: Process through the processing service (same as before)
  const result = await this.approvalProcessingService.processApprovalResponse(
    requestId,
    response,
    this.approvalCache
  );

  // Step 4: Stream real-time update (same as before)
  if (this.approvalStreamingService.hasStreamConnection(request.executionId)) {
    await this.approvalStreamingService.streamApprovalUpdate(request, response);
  }

  // Step 5: Resume workflow using Command pattern (NEW)
  let workflowResumed = false;
  if (this.resumptionService) {
    try {
      // Extract workflowClass from approval metadata
      const workflowClassName = request.metadata?.workflowClass;
      if (!workflowClassName) {
        this.logger.warn(`Approval ${requestId} missing workflowClass metadata - cannot resume workflow`);
      } else {
        // Resolve workflow class from name
        const workflowClass = this.resolveWorkflowClass(workflowClassName);

        // Get current StateSnapshot to extract checkpoint_id
        const snapshot = await this.resumptionService.getWorkflowState(
          workflowClass,
          request.executionId
        );

        const checkpointId = snapshot.config.configurable?.checkpoint_id;
        if (!checkpointId) {
          this.logger.warn(`No checkpoint_id found for thread ${request.executionId} - cannot resume`);
        } else {
          // Resume workflow with user's approval decision
          await this.resumptionService.resumeWorkflow(
            workflowClass,
            request.executionId,
            {
              approved: response.decision === 'approved',
              feedback: response.feedback,
              approvedBy: response.approvedBy,
              approvedAt: response.approvedAt,
            },
            checkpointId
          );

          workflowResumed = true;
          this.logger.log(`✅ Workflow resumed for thread ${request.executionId} after approval ${requestId}`);
        }
      }
    } catch (error: any) {
      this.logger.error(`❌ Failed to resume workflow for thread ${request.executionId}:`, error.message);
      // Don't fail approval processing if resumption fails - graceful degradation
    }
  }

  return { ...result, workflowResumed };
}
```

5. **Add resolveWorkflowClass() Helper Method** (new):
   - Purpose: Convert string name to actual class reference
   - Implementation: Placeholder for now (throw error with message)
   - Note: Team-leader will implement in future task with chosen strategy

```typescript
/**
 * Resolve workflow class from class name string
 *
 * INTERNAL HELPER: Convert string name to actual class reference
 *
 * Implementation options:
 * 1. Static registry: Map<string, Type> maintained by WorkflowEngineModule
 * 2. ModuleRef.get() if class name matches NestJS provider token
 * 3. Metadata-based lookup via MetadataProcessorService
 *
 * @param workflowClassName - Class name (e.g., 'ResearcherAgent')
 * @returns Workflow class reference
 * @throws Error if class not found
 */
private resolveWorkflowClass(workflowClassName: string): any {
  // IMPLEMENTATION NOTE: This is a placeholder
  // Team-leader will implement in atomic task with chosen strategy
  // Recommended: Static registry in WorkflowEngineModule for performance

  throw new Error(`Workflow class resolution not implemented: ${workflowClassName}`);
}
```

**DO NOT MODIFY**:

- All other existing methods (requestApproval signature unchanged except optional parameter)
- Event emitter logic
- Timeout handling
- Streaming logic
- Validation logic

### Quality Requirements

**Functional**:

- ✅ MUST resume workflow if WorkflowResumptionService available
- ✅ MUST gracefully degrade if WorkflowResumptionService unavailable
- ✅ MUST extract workflowClass from approval metadata
- ✅ MUST get checkpoint_id from StateSnapshot
- ✅ Approval processing MUST succeed even if resumption fails

**Pattern Compliance**:

- ✅ MUST use resumeWorkflow(), not direct Command operations

### Verification Requirements

**File Modified**:

```bash
ls "D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\human-approval.service.ts"
```

**Import Added**:

```typescript
import { WorkflowResumptionService } from '@hive-academy/langgraph-workflow-engine';
```

**Constructor Modified**:

- ✅ WorkflowResumptionService injected as last parameter
- ✅ @Optional() decorator present
- ✅ Warning logged if unavailable

**Methods Enhanced**:

- ✅ requestApproval() has workflowClass parameter
- ✅ requestApproval() stores workflowClass in metadata
- ✅ processApprovalResponse() extracts workflowClass from metadata
- ✅ processApprovalResponse() calls resumptionService.getWorkflowState()
- ✅ processApprovalResponse() calls resumptionService.resumeWorkflow()
- ✅ processApprovalResponse() returns workflowResumed flag
- ✅ resolveWorkflowClass() method added (placeholder)

**No Compilation Errors**:

```bash
npx nx build @hive-academy/langgraph-hitl
```

**Git Commit Pattern**:

```bash
git commit -m "feat(langgraph): integrate resumption into hitl approval"
```

### Commit Message Template

```
feat(langgraph): integrate resumption into hitl approval

Integrate WorkflowResumptionService into HumanApprovalService for
workflow resumption after human approval.

Changes:
- Add WorkflowResumptionService injection (optional)
- Enhance requestApproval() to store workflowClass metadata
- Enhance processApprovalResponse() to resume workflow after approval
- Add resolveWorkflowClass() helper (placeholder)
- Graceful degradation if resumption unavailable

Flow:
1. User approves request
2. Extract workflowClass from metadata
3. Get StateSnapshot to extract checkpoint_id
4. Resume workflow using Command pattern
5. Return workflowResumed flag

Pattern: Service composition with graceful degradation
Dependencies: Task 2 (WorkflowResumptionService)
TASK_2025_049
```

---

## Task 5: Update Service Exports & Module Integration ⏸️ PENDING

**Assigned To**: backend-developer
**Dependencies**: Tasks 1-4 (all services created/modified)
**Estimated Commits**: 1

### Task Description

Wire new services into module providers and update exports. This task ensures LangGraphCommandService and WorkflowResumptionService are properly exported and available for dependency injection.

**Files to MODIFY**:

1. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\services\index.ts`
2. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\workflow-engine.module.ts`
3. `D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\hitl.module.ts`

### Implementation Details

**1. Update workflow-engine/services/index.ts**:

Add exports for new services:

```typescript
// Existing exports
export * from './tool-registry.service';
// ... other existing exports

// NEW exports (add at end)
export * from './langgraph-command.service';
export * from './workflow-resumption.service';
```

**2. Update workflow-engine.module.ts**:

Add services to providers array:

```typescript
@Module({
  imports: [
    // ... existing imports
  ],
  providers: [
    // ... existing providers
    WorkflowExecutionService,
    MetadataProcessorService,
    ToolRegistryService,
    // ... other existing providers

    // NEW providers (add at end)
    LangGraphCommandService,
    WorkflowResumptionService,
  ],
  exports: [
    // ... existing exports
    WorkflowExecutionService,
    MetadataProcessorService,
    ToolRegistryService,
    // ... other existing exports

    // NEW exports (add at end)
    LangGraphCommandService,
    WorkflowResumptionService,
  ],
})
export class WorkflowEngineModule {
  // ... existing implementation
}
```

**3. Update hitl.module.ts**:

Verify WorkflowEngineModule is imported (should already exist):

```typescript
import { WorkflowEngineModule } from '@hive-academy/langgraph-workflow-engine';

@Module({
  imports: [
    // ... existing imports
    WorkflowEngineModule, // Should already be imported
  ],
  // ... rest of module
})
export class HitlModule {
  // ... existing implementation
}
```

**CRITICAL**: Do NOT add WorkflowResumptionService to hitl.module.ts providers - it's already available via WorkflowEngineModule import.

### Quality Requirements

**Module Configuration**:

- ✅ LangGraphCommandService exported from workflow-engine
- ✅ WorkflowResumptionService exported from workflow-engine
- ✅ WorkflowEngineModule imported in hitl module
- ✅ No circular dependencies

**Build Verification**:

- ✅ workflow-engine library builds successfully
- ✅ hitl library builds successfully
- ✅ No TypeScript errors

### Verification Requirements

**Files Modified**:

```bash
ls "D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\services\index.ts"
ls "D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\workflow-engine.module.ts"
ls "D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\hitl.module.ts"
```

**Exports Added** (workflow-engine/services/index.ts):

```typescript
export * from './langgraph-command.service';
export * from './workflow-resumption.service';
```

**Providers Added** (workflow-engine.module.ts):

```typescript
providers: [
  // ... existing
  LangGraphCommandService,
  WorkflowResumptionService,
],
exports: [
  // ... existing
  LangGraphCommandService,
  WorkflowResumptionService,
]
```

**Imports Verified** (hitl.module.ts):

```typescript
imports: [
  // ... existing
  WorkflowEngineModule, // Already imported
];
```

**No Circular Dependencies**:

```bash
# Check for circular dependency warnings
npx nx build @hive-academy/langgraph-workflow-engine
npx nx build @hive-academy/langgraph-hitl
```

**Integration Test** (verify DI works):

```typescript
// Should be able to inject services
constructor(
  private readonly commandService: LangGraphCommandService,
  private readonly resumptionService: WorkflowResumptionService
) {}
```

**Git Commit Pattern**:

```bash
git commit -m "chore(langgraph): wire resumption services into modules"
```

### Commit Message Template

```
chore(langgraph): wire resumption services into modules

Update service exports and module providers to enable dependency
injection for new workflow resumption services.

Changes:
- Export LangGraphCommandService from workflow-engine
- Export WorkflowResumptionService from workflow-engine
- Add both services to workflow-engine module providers
- Verify WorkflowEngineModule imported in hitl module

Pattern: Standard NestJS module configuration
Dependencies: Tasks 1-4 (all services created/modified)
TASK_2025_049
```

---

## Task Execution Protocol

**For Each Task**:

1. Read this tasks.md file completely
2. Read implementation-plan.md for detailed specifications
3. Read task-description.md for requirements context
4. Implement the task following all requirements
5. Self-verify implementation against verification requirements
6. Update this tasks.md file:
   - Change task status to "✅ COMPLETE"
   - Add git commit SHA
   - Document any deviations or issues
7. Return task completion report with commit SHA

**Task Order**:

- Task 1 → Task 2 → Task 3 → Task 4 → Task 5 (strict sequential order)
- Each task MUST be completed before starting next task

**Commit Strategy**:

- ONE commit per task (not multiple commits)
- Commit message MUST follow commitlint rules
- Stage files progressively as you implement
- Create commit only after task fully complete

**Completion Criteria**:

- All task statuses are "✅ COMPLETE"
- All git commits verified (1 commit per task = 5 total commits)
- All files exist/modified as specified
- Both libraries build successfully

---

## Verification Protocol

**After Each Task Completion**:

1. **File Verification**:

   ```bash
   # Verify file exists/modified
   ls [file-path-from-task]
   ```

2. **Build Verification**:

   ```bash
   # Verify no compilation errors
   npx nx build @hive-academy/langgraph-workflow-engine
   npx nx build @hive-academy/langgraph-hitl
   ```

3. **Git Verification**:

   ```bash
   # Verify commit exists
   git log --oneline -1

   # Commit message must match pattern from task
   ```

4. **Export Verification** (for service tasks):
   ```typescript
   // Verify class exported
   export class [ServiceName] { ... }
   ```

**If Verification Fails**:

- Mark task as "❌ FAILED"
- Document failure reason in tasks.md
- Create fix task if needed
- Do NOT proceed to next task

---

## Quality Gates

**Before Marking Task Complete**:

- ✅ All verification requirements passed
- ✅ Git commit created with correct pattern
- ✅ No TypeScript compilation errors
- ✅ File exists/modified as specified
- ✅ Exports/imports added as specified
- ✅ Dependencies injected correctly
- ✅ Logging added as specified
- ✅ Error handling implemented
- ✅ JSDoc comments added

**Before Marking ALL Tasks Complete**:

- ✅ 5 git commits created (one per task)
- ✅ All 5 tasks have "✅ COMPLETE" status
- ✅ Both libraries build successfully
- ✅ No circular dependency warnings
- ✅ Service DI works (can inject services)

---

## Notes

**Architecture Decisions**:

- Two services created (LangGraphCommandService + WorkflowResumptionService) for SRP compliance
- Delegation pattern used in WorkflowExecutionService for backward compatibility
- Optional injection pattern used for graceful degradation
- Placeholder resolveWorkflowClass() to be implemented in future task

**Security Considerations**:

- PII filtering in sanitizeStateSnapshot()
- Thread ownership verification required in controllers (not in this task)
- Input validation required in controllers (not in this task)

**Future Enhancements** (NOT in this task):

- Workflow class resolution implementation
- Controller integration (ResearchChatController, ConversationHistoryController)
- Integration tests for ResearcherAgent and DevBrandSupervisor
- Graph compilation caching for performance
