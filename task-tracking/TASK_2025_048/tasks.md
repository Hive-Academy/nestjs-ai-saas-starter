# Development Tasks - TASK_2025_048

**Task Type**: Backend
**Developer Needed**: backend-developer
**Total Tasks**: 2 (batch tasks)
**Original Tasks**: 6 (reorganized into batches)
**Estimated Effort**: 6-8 hours
**Batching Strategy**: File-based grouping for efficiency
**Decomposed From**: implementation-plan.md

**Efficiency Note**: Tasks reorganized from 6 sequential tasks into 2 batch tasks. This reduces developer invocations from 6 to 2, minimizing context switching while maintaining verifiability through single commit per batch.

---

## BATCH 1: Workflow Engine Foundation (Tasks 1-4) ✅ COMPLETE

**Assigned To**: backend-developer
**Tasks in Batch**: 4 tasks
**Dependencies**: None (foundation layer)
**Estimated Time**: 2.5-3 hours total
**Target Files**: workflow-execution.service.ts + index.ts (same library)
**Commit Strategy**: ONE commit after all 4 tasks complete
**Git Commit**: d9e4e4e
**Completion Note**: Type errors encountered and resolved. Method names in original tasks.md were incorrect - developer correctly followed implementation-plan.md specifications. tasks.md updated to reflect actual implementation.

### Batch Overview

This batch implements all LangGraph checkpoint retrieval methods in WorkflowExecutionService. All tasks modify the same service file and follow identical graph-building patterns, making them ideal for single-session implementation.

**Why Batch These Together**:

- Same file (workflow-execution.service.ts) modified 3 times
- Same pattern (graph building → compile → LangGraph API call)
- Related export (StateSnapshot type)
- No external dependencies between tasks
- Developer maintains context across all methods

---

### Task 1.1: Add LangGraph StateSnapshot type export ✅ COMPLETE

**Priority**: FOUNDATION (required by all other tasks in batch)
**Estimated Time**: 15-20 minutes
**Dependencies**: None

**Description**:
Export LangGraph's native StateSnapshot type from workflow-engine library index to make it available for consumer code (controllers, services). This is a foundational type required by all state retrieval methods.

**Files to Modify**:

- `D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\index.ts` - Add StateSnapshot re-export

**Implementation Steps**:

1. Import StateSnapshot from `@langchain/langgraph`
2. Add to public exports in index.ts
3. Verify export available via `import { StateSnapshot } from '@hive-academy/langgraph-workflow-engine'`

**Acceptance Criteria**:

- [ ] StateSnapshot type imported from @langchain/langgraph
- [ ] StateSnapshot exported from workflow-engine index
- [ ] Type available for import via @hive-academy/langgraph-workflow-engine alias

**Implementation Notes**:

- Import from: `@langchain/langgraph` (verified at pregel/types.d.ts:350-381)
- StateSnapshot interface includes: values, next, config, metadata, createdAt, parentConfig, tasks
- This is a re-export only - no custom wrappers or abstractions
- Type is generic: `StateSnapshot` (no type parameters needed for export)

**Pattern Reference**:

- implementation-plan.md:54-65 (StateSnapshot type definition)
- implementation-plan.md:302 (controller import example)

---

### Task 1.2: Implement WorkflowExecutionService.getStateSnapshot() method ✅ COMPLETE

**Priority**: HIGH (enables current state retrieval)
**Estimated Time**: 45-60 minutes
**Dependencies**: Task 1.1 (requires StateSnapshot export)

**Description**:
Add getStateSnapshot() method to WorkflowExecutionService that retrieves the current state of a workflow thread using LangGraph's native getState() API. This method compiles the graph on-demand and retrieves the latest checkpoint for a given thread_id.

**CORRECTED**: Original tasks.md incorrectly named this method "getThreadState()". Developer correctly implemented "getStateSnapshot()" as specified in implementation-plan.md:141-178.

**Files to Modify**:

- `D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\execution\workflow-execution.service.ts` - Add getStateSnapshot() method

**Implementation Steps**:

1. Add method signature: `async getStateSnapshot<TState extends WorkflowState = WorkflowState>(workflowClass: any, threadId: string): Promise<StateSnapshot>`
2. Get workflow instance via moduleRef.get() (same pattern as executeWorkflow)
3. Extract metadata via metadataProcessor.extractWorkflowDefinition()
4. Bind node handlers to workflow instance
5. Build graph via buildStateGraph()
6. Compile with checkpointer and store
7. Call LangGraph native `compiled.getState({ configurable: { thread_id: threadId } })`
8. Return raw StateSnapshot (no wrappers)
9. Add JSDoc with usage examples

**Acceptance Criteria**:

- [x] Method signature matches specification (getStateSnapshot)
- [x] Uses existing buildStateGraph() pattern from executeWorkflow() (lines 111-152)
- [x] Binds node handlers to workflow instance
- [x] Compiles graph with checkpointer and store
- [x] Calls LangGraph native `compiled.getState({ configurable: { thread_id: threadId } })`
- [x] Returns raw StateSnapshot (no custom wrappers)
- [x] Includes JSDoc with usage examples

**Implementation Notes**:

- **Pattern to follow**: executeWorkflow() method (lines 111-152)
- **Graph building steps**:
  1. Get workflow instance via moduleRef.get()
  2. Extract metadata via metadataProcessor.extractWorkflowDefinition()
  3. Bind handlers to instance
  4. Build StateGraph via buildStateGraph()
  5. Compile with checkpointer and store
  6. Call compiled.getState()
- **LangGraph API**: `compiled.getState(config)` (verified at pregel/index.d.ts:378)
- **Thread isolation**: thread_id passed via config.configurable
- **Error handling**: LangGraph throws if checkpointer not configured (preserve this behavior)

**Example Code Structure** (from implementation-plan.md:141-178):

```typescript
async getStateSnapshot<TState extends WorkflowState = WorkflowState>(
  workflowClass: any,
  threadId: string
): Promise<StateSnapshot> {
  // 1. Get workflow instance from DI
  const workflowInstance = this.moduleRef.get(workflowClass, { strict: false });

  // 2. Extract metadata
  const definition = this.metadataProcessor.extractWorkflowDefinition<TState>(workflowClass);

  // 3. Bind handlers
  definition.nodes.forEach((node) => {
    if (node.handler && workflowInstance) {
      node.handler = node.handler.bind(workflowInstance);
    }
  });

  // 4. Build graph
  const graph = this.buildStateGraph(definition);

  // 5. Compile with checkpointer
  const compiled = graph.compile({
    checkpointer: this.checkpointer,
    store: this.store,
  });

  // 6. Use LangGraph native getState()
  const snapshot = await compiled.getState({
    configurable: { thread_id: threadId }
  });

  return snapshot;
}
```

**Pattern Reference**:

- implementation-plan.md:126-178 (complete implementation specification)
- workflow-execution.service.ts:111-152 (executeWorkflow pattern)

---

### Task 1.3: Implement WorkflowExecutionService.listThreadStates() method ✅ COMPLETE

**Priority**: HIGH (enables checkpoint history retrieval)
**Estimated Time**: 45-60 minutes
**Dependencies**: Task 1.2 (same pattern)

**Description**:
Add listThreadStates() method to WorkflowExecutionService that retrieves all checkpoints for a workflow thread using LangGraph's native getStateHistory() API. Returns an async iterator for efficient pagination of checkpoint history.

**CORRECTED**: Original tasks.md incorrectly named this method "getThreadHistory()". Developer correctly implemented "listThreadStates()" as specified in implementation-plan.md:180-214.

**Files to Modify**:

- `D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\execution\workflow-execution.service.ts` - Add listThreadStates() method

**Implementation Steps**:

1. Add method signature: `async *listThreadStates<TState extends WorkflowState = WorkflowState>(workflowClass: any, threadId: string, options?: { limit?: number }): AsyncIterableIterator<StateSnapshot>`
2. Use same graph building pattern as getStateSnapshot()
3. Call LangGraph native `compiled.getStateHistory(config, options)`
4. Yield StateSnapshot objects via async generator
5. Add JSDoc with usage examples

**Acceptance Criteria**:

- [x] Method signature matches specification (listThreadStates)
- [x] Uses same graph building pattern as getStateSnapshot()
- [x] Calls LangGraph native `compiled.getStateHistory(config, options)`
- [x] Yields StateSnapshot objects via async generator
- [x] Supports optional limit parameter for pagination
- [x] Returns newest checkpoints first (LangGraph default behavior)
- [x] Includes JSDoc with usage examples

**Implementation Notes**:

- **Pattern to follow**: getStateSnapshot() from Task 1.2 (same graph building)
- **LangGraph API**: `compiled.getStateHistory(config, options)` (verified at pregel/index.d.ts:392)
- **Return type**: AsyncIterableIterator (yield checkpoints as they're retrieved)
- **Pagination**: limit option passed to LangGraph (default: unlimited)
- **Ordering**: LangGraph returns newest first (no custom sorting needed)
- **Error handling**: Same as getStateSnapshot() (preserve LangGraph errors)

**Example Code Structure** (from implementation-plan.md:180-214):

```typescript
async *listThreadStates<TState extends WorkflowState = WorkflowState>(
  workflowClass: any,
  threadId: string,
  options?: { limit?: number }
): AsyncIterableIterator<StateSnapshot> {
  // Build and compile graph (same pattern as getThreadState)
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
```

**Pattern Reference**:

- implementation-plan.md:180-214 (complete implementation specification)
- Task 1.2 implementation (same graph building pattern)

---

### Task 1.4: Implement WorkflowExecutionService.resumeFromInterruption() method ✅ COMPLETE

**Priority**: HIGH (enables workflow resume)
**Estimated Time**: 45-60 minutes
**Dependencies**: Task 1.2 (same pattern)

**Description**:
Add resumeFromInterruption() method to WorkflowExecutionService that resumes workflow execution from a specific checkpoint using LangGraph's native invoke() with checkpoint_id configuration.

**CORRECTED**: Original tasks.md incorrectly named this method "resumeFromCheckpoint()". Developer correctly implemented "resumeFromInterruption()" as specified in implementation-plan.md:216-251.

**Files to Modify**:

- `D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\execution\workflow-execution.service.ts` - Add resumeFromInterruption() method

**Implementation Steps**:

1. Add method signature: `async resumeFromInterruption<TState extends WorkflowState = WorkflowState>(workflowClass: any, threadId: string, checkpointId: string, input?: TState): Promise<TState>`
2. Use same graph building pattern as getStateSnapshot()
3. Call LangGraph native `compiled.invoke(input, { configurable: { thread_id, checkpoint_id } })`
4. Return final workflow state
5. Add JSDoc with usage examples

**Acceptance Criteria**:

- [x] Method signature matches specification (resumeFromInterruption)
- [x] Uses same graph building pattern as getStateSnapshot()
- [x] Calls LangGraph native `compiled.invoke(input, { configurable: { thread_id, checkpoint_id } })`
- [x] Supports optional input state update
- [x] Returns final workflow state
- [x] Includes JSDoc with usage examples

**Implementation Notes**:

- **Pattern to follow**: getStateSnapshot() from Task 1.2 (same graph building)
- **LangGraph API**: `compiled.invoke(input, config)` (existing pattern)
- **Resume pattern**: Pass checkpoint_id via config.configurable
- **Input parameter**: Optional - use null if not provided (resume from existing state)
- **Thread + Checkpoint**: Both thread_id and checkpoint_id required in config.configurable
- **Error handling**: LangGraph throws if checkpoint_id not found (preserve this behavior)

**Example Code Structure** (from implementation-plan.md:216-251):

```typescript
async resumeFromInterruption<TState extends WorkflowState = WorkflowState>(
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

**Pattern Reference**:

- implementation-plan.md:216-251 (complete implementation specification)
- workflow-execution.service.ts:111-152 (executeWorkflow pattern)
- implementation-plan.md:67-74 (resume pattern with checkpoint_id)

---

### Batch 1 - Combined Acceptance Criteria

**All Tasks Complete When**:

- [x] StateSnapshot type exported from workflow-engine/index.ts
- [x] getStateSnapshot() method implemented in WorkflowExecutionService
- [x] listThreadStates() method implemented in WorkflowExecutionService
- [x] resumeFromInterruption() method implemented in WorkflowExecutionService
- [x] All methods follow same graph building pattern
- [x] All methods use LangGraph native APIs (no custom wrappers)
- [x] Build passes: `npx nx build @hive-academy/langgraph-workflow-engine`
- [x] All code staged: `git add libs/langgraph-modules/workflow-engine/src/lib/execution/workflow-execution.service.ts libs/langgraph-modules/workflow-engine/src/index.ts`
- [x] ONE commit created with all changes (d9e4e4e)

**Expected Commit Pattern**:

```
feat(langgraph): add checkpoint state retrieval methods to workflow engine

- Export StateSnapshot type from workflow-engine
- Add getStateSnapshot() for current thread state retrieval
- Add listThreadStates() for checkpoint history retrieval
- Add resumeFromInterruption() for workflow resume from checkpoint

All methods use LangGraph native APIs with zero custom abstractions.
```

**Actual Commit** (d9e4e4e):

```
feat(langgraph): add thread state management methods to workflow engine

- Export StateSnapshot type for thread state access
- Add getStateSnapshot() to retrieve current workflow thread state
- Add listThreadStates() to retrieve checkpoint history
- Add resumeFromInterruption() to resume from specific checkpoint
```

**Batch 1 Verification Protocol**:

1. Developer implements all 4 tasks in order (1.1 → 1.2 → 1.3 → 1.4)
2. Developer stages files progressively: `git add [file]` after each task
3. Developer tests build: `npx nx build @hive-academy/langgraph-workflow-engine`
4. Developer creates ONE commit for entire batch with message above
5. Developer updates all task statuses to "✅ COMPLETE"
6. Developer adds git commit SHA to batch header
7. Developer returns with batch completion report
8. Team-leader verifies:
   - Batch commit exists: `git log --oneline -1`
   - All 4 files modified/created
   - Build passes
   - Commit message follows pattern

---

## BATCH 2: API Controllers (Tasks 5-6) 🔄 IN PROGRESS - Assigned to backend-developer

**Assigned To**: backend-developer
**Tasks in Batch**: 2 tasks
**Dependencies**: Batch 1 complete (requires WorkflowExecutionService methods) ✅
**Estimated Time**: 3.5-5 hours total
**Target Files**: conversation-history.controller.ts (CREATE) + research-chat.controller.ts (MODIFY) + app.module.ts (MODIFY)
**Commit Strategy**: ONE commit after both tasks complete

**IMPORTANT - Method Names Corrected**:

- Use `getStateSnapshot()` (NOT getThreadState)
- Use `listThreadStates()` (NOT getThreadHistory)
- Use `resumeFromInterruption()` (NOT resumeFromCheckpoint)

All controller implementations must use the correct method names from WorkflowExecutionService.

### Batch Overview

This batch creates REST API endpoints for thread management and completes HITL resume logic. Both tasks work with controllers, both use WorkflowExecutionService methods from Batch 1, and both are related to conversation/thread management.

**Why Batch These Together**:

- Both are controller work (same domain knowledge)
- Both use WorkflowExecutionService methods from Batch 1
- Related domain (conversation history + HITL approval)
- Both require understanding of LangGraph updateState/invoke APIs
- Developer maintains context between conversation management tasks

---

### Task 2.1: Create ConversationHistoryController with thread management endpoints 🔄 IN PROGRESS

**Priority**: HIGH (new REST API endpoints)
**Estimated Time**: 2-3 hours
**Dependencies**: Batch 1 complete (requires WorkflowExecutionService methods)

**Description**:
Create new REST controller with endpoints for thread state retrieval, history retrieval, and checkpoint resume. Follows ResearchChatController pattern for consistency.

**CRITICAL - Corrected Method Names**:

- Use `workflowExecutionService.getStateSnapshot()` (NOT getThreadState)
- Use `workflowExecutionService.listThreadStates()` (NOT getThreadHistory)
- Use `workflowExecutionService.resumeFromInterruption()` (NOT resumeFromCheckpoint)

**Files to Modify/Create**:

- `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\controllers\conversation-history.controller.ts` - CREATE new controller
- `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\app.module.ts` - Add controller to controllers array (line 190-195)

**Implementation Steps**:

1. Create conversation-history.controller.ts
2. Add @Controller('conversation') decorator
3. Inject WorkflowExecutionService via constructor
4. Implement GET /threads/:threadId/state endpoint
5. Implement GET /threads/:threadId/history endpoint
6. Implement POST /threads/:threadId/resume endpoint
7. Implement GET /users/:userId/threads endpoint (stub with TODO)
8. Add proper error handling with HTTP status codes
9. Add NestJS Logger for observability
10. Add JSDoc documentation
11. Register controller in app.module.ts controllers array

**Acceptance Criteria**:

- [ ] Controller decorator: `@Controller('conversation')`
- [ ] Endpoint 1: `GET /api/conversation/threads/:threadId/state` - Current thread state
- [ ] Endpoint 2: `GET /api/conversation/threads/:threadId/history` - Thread checkpoint history
- [ ] Endpoint 3: `POST /api/conversation/threads/:threadId/resume` - Resume from checkpoint
- [ ] Endpoint 4: `GET /api/conversation/users/:userId/threads` - List user threads (stub with TODO)
- [ ] Supports workflow type query param ('researcher' | 'devbrand')
- [ ] Uses WorkflowExecutionService for all operations
- [ ] Proper error handling with HTTP status codes
- [ ] NestJS Logger for observability
- [ ] JSDoc documentation on class and methods
- [ ] Controller registered in app.module.ts controllers array

**Implementation Notes**:

- **Pattern to follow**: ResearchChatController (lines 59-354)
- **Imports required**:
  - `@nestjs/common` - Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus, Logger
  - `@hive-academy/langgraph-workflow-engine` - WorkflowExecutionService, StateSnapshot type
  - ResearcherAgent, DevBrandSupervisorWorkflow - For workflow class resolution
- **Workflow selection**: Query param determines which workflow class to use
- **Error handling patterns**:
  - HTTP 503 if checkpointer not configured
  - HTTP 500 for other errors
  - Include error.message in exception message
- **Response formats**: Return structured objects with threadId, state/history, metadata
- **listUserThreads stub**: Return empty array with TODO comment for Phase 2 (Neo4j indexing)

**Endpoint Specifications**:

**1. GET /threads/:threadId/state**

- Query params: `workflow?: 'researcher' | 'devbrand'` (default: 'researcher')
- Response: `{ threadId: string, state: StateSnapshot }`
- Maps workflow param to ResearcherAgent or DevBrandSupervisorWorkflow class
- Calls `workflowExecutionService.getStateSnapshot(workflowClass, threadId)` ← CORRECTED

**2. GET /threads/:threadId/history**

- Query params: `workflow?: 'researcher' | 'devbrand'`, `limit?: number`
- Response: `{ threadId: string, history: StateSnapshot[], totalCheckpoints: number }`
- Collects async iterator results into array
- Calls `workflowExecutionService.listThreadStates(workflowClass, threadId, { limit })` ← CORRECTED

**3. POST /threads/:threadId/resume**

- Body: `{ checkpointId: string, workflow: 'researcher' | 'devbrand', input?: any }`
- Response: `{ status: string, message: string, threadId: string, checkpointId: string, result: any }`
- Calls `workflowExecutionService.resumeFromInterruption(workflowClass, threadId, checkpointId, input)` ← CORRECTED

**4. GET /users/:userId/threads** (stub)

- Response: `{ userId: string, threads: [] }` with TODO comment
- Phase 2 implementation requires Neo4j indexing

**Controller Code Structure** (from implementation-plan.md:296-546):
Use full implementation from lines 296-546 in implementation-plan.md as reference.

**Pattern Reference**:

- implementation-plan.md:281-546 (complete controller specification)
- research-chat.controller.ts:59-354 (pattern reference)

---

### Task 2.2: Complete HITL resume logic in ResearchChatController.approveReport() 🔄 IN PROGRESS

**Priority**: MEDIUM (completes existing TODO)
**Estimated Time**: 1.5-2 hours
**Dependencies**: Task 1.2 (requires graph building pattern)

**Description**:
Complete the TODO at lines 316-321 in ResearchChatController by implementing LangGraph updateState() and invoke() pattern for HITL approval resume. This allows users to approve/reject research reports and resume workflow execution.

**Files to Modify**:

- `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\controllers\research-chat.controller.ts` - MODIFY approveReport() method, ADD buildResearcherGraph() helper

**Implementation Steps**:

1. Remove TODO comment at lines 316-321
2. Add ModuleRef and MetadataProcessorService to constructor dependencies
3. Add imports for ModuleRef and MetadataProcessorService
4. Implement buildResearcherGraph() private helper method
5. Update approveReport() to build graph using helper
6. Update approveReport() to use updateState() for approval decision
7. Update approveReport() to use invoke() for workflow resume
8. Handle both approved and rejected cases
9. Return structured response with result (if approved) or rejection message
10. Add Logger statements for approval decision and resume

**Acceptance Criteria**:

- [ ] Remove TODO comment at lines 316-321
- [ ] Implement buildResearcherGraph() private helper method
- [ ] Update approveReport() to use updateState() for approval decision
- [ ] Update approveReport() to use invoke() for workflow resume
- [ ] Handle both approved and rejected cases
- [ ] Return structured response with result (if approved) or rejection message
- [ ] Add imports: ModuleRef, MetadataProcessorService (for graph building)
- [ ] Logger statements for approval decision and resume

**Implementation Notes**:

- **Pattern to follow**: WorkflowExecutionService.executeWorkflow() (lines 111-152)
- **LangGraph APIs**:
  - `compiled.updateState(config, values, asNode)` (verified at pregel/index.d.ts:431)
  - `compiled.invoke(input, config)` (existing pattern)
- **State update pattern**:
  - Update metadata with approval decision (approved/rejected/feedback/timestamp)
  - Attribute update to 'saveApprovedReport' node (asNode parameter)
- **Resume pattern**:
  - If approved: invoke(null, { configurable: { thread_id } }) to continue workflow
  - If rejected: return rejection message, do not invoke
- **Dependency injection**: Inject ModuleRef and MetadataProcessorService in constructor

**buildResearcherGraph() Helper Method**:

```typescript
private async buildResearcherGraph() {
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

**approveReport() Update Pattern** (from implementation-plan.md:610-683):

```typescript
@Post('approve/:executionId')
async approveReport(
  @Param('executionId') executionId: string,
  @Body() body: { approved: boolean; feedback?: string }
): Promise<{ status: string; message: string; result?: any }> {
  this.logger.log(`📝 Approval received for ${executionId}: ${body.approved ? 'APPROVED' : 'REJECTED'}`);

  try {
    // Step 1: Build graph
    const graph = await this.buildResearcherGraph();

    // Step 2: Update thread state with approval decision
    const updatedConfig = await graph.updateState(
      { configurable: { thread_id: executionId } },
      {
        metadata: {
          userApproval: body.approved ? 'approved' : 'rejected',
          approvalFeedback: body.feedback,
          approvalTimestamp: new Date().toISOString(),
        }
      },
      'saveApprovedReport' // Attribute to this node
    );

    this.logger.log(`✅ Thread state updated: ${executionId}`);

    // Step 3: Resume workflow if approved
    if (body.approved) {
      this.logger.log(`▶️  Resuming workflow: ${executionId}`);

      const result = await graph.invoke(
        null, // No new input - resume from current state
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
```

**Required Imports**:

- Add to constructor: `private readonly moduleRef: ModuleRef, private readonly metadataProcessor: MetadataProcessorService`
- Import: `ModuleRef` from '@nestjs/core'
- Import: `MetadataProcessorService` from '@hive-academy/langgraph-workflow-engine'

**Pattern Reference**:

- implementation-plan.md:576-710 (complete HITL resume specification)
- workflow-execution.service.ts:111-152 (graph building pattern)
- implementation-plan.md:67-74 (updateState and invoke APIs)

---

### Batch 2 - Combined Acceptance Criteria

**All Tasks Complete When**:

- [ ] ConversationHistoryController created with 4 endpoints
- [ ] Controller registered in app.module.ts
- [ ] ResearchChatController TODO removed
- [ ] buildResearcherGraph() helper implemented
- [ ] approveReport() uses updateState() and invoke()
- [ ] All endpoints use WorkflowExecutionService methods from Batch 1
- [ ] Build passes: `npx nx build dev-brand-api`
- [ ] All code staged: `git add apps/dev-brand-api/src/app/business-workflows/controllers/conversation-history.controller.ts apps/dev-brand-api/src/app/business-workflows/controllers/research-chat.controller.ts apps/dev-brand-api/src/app/app.module.ts`
- [ ] ONE commit created with all changes

**Expected Commit Pattern**:

```
feat(api): add conversation history endpoints and complete HITL resume logic

- Create ConversationHistoryController with thread management endpoints
- Add GET /api/conversation/threads/:threadId/state endpoint
- Add GET /api/conversation/threads/:threadId/history endpoint
- Add POST /api/conversation/threads/:threadId/resume endpoint
- Add GET /api/conversation/users/:userId/threads stub (Phase 2)
- Complete HITL resume logic in ResearchChatController
- Add buildResearcherGraph() helper for graph compilation
- Update approveReport() to use updateState() + invoke() pattern
- Register ConversationHistoryController in app.module.ts

All endpoints use WorkflowExecutionService methods from Batch 1.
```

**Batch 2 Verification Protocol**:

1. Developer implements both tasks in order (2.1 → 2.2)
2. Developer stages files progressively: `git add [file]` after each task
3. Developer tests build: `npx nx build dev-brand-api`
4. Developer creates ONE commit for entire batch with message above
5. Developer updates all task statuses to "✅ COMPLETE"
6. Developer adds git commit SHA to batch header
7. Developer returns with batch completion report
8. Team-leader verifies:
   - Batch commit exists: `git log --oneline -1`
   - All 3 files modified/created
   - Build passes
   - Commit message follows pattern

---

## Batch Execution Protocol

**For Each Batch**:

1. **Team-leader assigns entire batch** to developer
2. **Developer executes ALL tasks in batch** (in order: 1.1 → 1.2 → 1.3 → 1.4 for Batch 1)
3. **Developer stages files progressively**: `git add [file]` after each task within batch
4. **Developer creates ONE commit for entire batch** (after all tasks complete)
5. **Developer updates tasks.md**: Mark all tasks in batch as "✅ COMPLETE"
6. **Developer returns with batch git commit SHA**
7. **Team-leader verifies entire batch**:
   - Batch commit exists: `git log --oneline -1`
   - All files in batch exist: `Read([file-path])` for each task
   - Build passes: `npx nx build [project]`
   - Dependencies respected: Task order maintained
8. **If verification passes**: Assign next batch
9. **If verification fails**: Create fix batch

**Commit Strategy Benefits**:

- ONE commit per batch (not per task) reduces git noise
- Still maintains verifiability (commit message lists all tasks)
- Avoids running pre-commit hooks multiple times
- Batch commit SHAs provide clear checkpoints

**Completion Criteria**:

- All 2 batch statuses are "✅ COMPLETE"
- All 2 batch commits verified (1 commit per batch)
- All 6 original tasks marked complete
- All files exist
- Both builds pass (workflow-engine + dev-brand-api)

---

## Verification Protocol

**After Batch Completion**:

1. Developer updates all task statuses in batch to "✅ COMPLETE"
2. Developer adds git commit SHA to batch header
3. Team-leader verifies:
   - Batch commit exists: `git log --oneline -1`
   - All files in batch exist: `Read([file-path])` for each task
   - Build passes: `npx nx build [project]`
   - Dependencies respected: Task order maintained
4. If all pass: Update batch status to "✅ COMPLETE", assign next batch
5. If any fail: Mark batch as "❌ PARTIAL", create fix batch

**Final Verification** (All Batches Complete):

1. All 2 batches marked "✅ COMPLETE"
2. All 2 batch commits exist in git history
3. All 6 original tasks completed
4. Both builds pass:
   - `npx nx build @hive-academy/langgraph-workflow-engine`
   - `npx nx build dev-brand-api`
5. ConversationHistoryController registered in app.module.ts
6. HITL resume logic functional in ResearchChatController

---

## Technical Notes

### LangGraph Native APIs Used

All APIs verified from LangGraph source code (@langchain/langgraph@1.0.1):

- `compiled.getState(config)` - pregel/index.d.ts:378
- `compiled.getStateHistory(config, options)` - pregel/index.d.ts:392
- `compiled.updateState(config, values, asNode)` - pregel/index.d.ts:431
- `compiled.invoke(input, config)` - Existing pattern
- `StateSnapshot` type - pregel/types.d.ts:350-381

### Pattern Consistency

All implementations follow existing codebase patterns:

- Graph building: WorkflowExecutionService.executeWorkflow() pattern
- Controller structure: ResearchChatController pattern
- Error handling: NestJS HttpException with HTTP status codes
- Logging: NestJS Logger service
- Thread isolation: thread_id via config.configurable

### Zero Abstraction Approach

- No custom checkpoint wrappers
- No custom state snapshot types
- Direct LangGraph API usage
- Preserve LangGraph error behavior
- Return native LangGraph types

### Architecture Principles

- **Evidence-Based**: All APIs verified in LangGraph source
- **Pattern Compliance**: Matches existing workflow-engine patterns
- **Type Safety**: Generic TState for workflow-specific state types
- **NestJS Integration**: Proper DI, decorators, HTTP handling
- **Observability**: Logger statements for debugging

---

## Efficiency Gains Summary

**Before (Sequential Tasks)**:

- 6 individual tasks
- 6 developer invocations (one per task)
- 6 separate commits
- 6 context switches
- Estimated: 6-8 hours across 6 sessions

**After (Batch Tasks)**:

- 2 batch tasks
- 2 developer invocations (one per batch)
- 2 commits (one per batch)
- 2 context switches
- Estimated: 6-8 hours across 2 focused sessions

**Benefits**:

- 67% reduction in developer invocations (6 → 2)
- 67% reduction in context switches
- 67% reduction in git commits (cleaner history)
- Same total effort, better focus and flow
- Logical grouping by file/domain
- Maintains verifiability through batch commits
