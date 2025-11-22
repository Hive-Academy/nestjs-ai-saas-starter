# Requirements Document - TASK_2025_049

## Introduction

This task addresses a **fundamental architectural redesign** of conversation history and HITL resumption features following the failure of TASK_2025_048. The previous implementation bypassed LangGraph's compiled graph API and created broken workflow resumption patterns.

**Business Context**: Enable users to retrieve conversation state and resume Human-in-the-Loop (HITL) workflows using LangGraph's official Command pattern, integrated with existing HITL infrastructure.

**Critical Discovery**: This is NOT a greenfield implementation. We have comprehensive HITL infrastructure that MUST be preserved and enhanced, not replaced.

---

## Section 1: Existing HITL Infrastructure Analysis (What We Have)

### 1.1 HITL Package Components (@libs/langgraph-modules/hitl/)

**Core Service**: `HumanApprovalService` (human-approval.service.ts:1-396)

**Purpose**: Enterprise-grade human approval orchestrator with 18 specialized services

**Key Components**:

1. **Approval Request Management**

   - `requestApproval()` - Create approval requests with timeout handling
   - `processApprovalResponse()` - Process user decisions
   - `getPendingApprovals()` - List pending approvals
   - `getApprovalsForExecution()` - Filter approvals by execution ID
   - `cancelApproval()` - Cancel pending approvals

2. **Specialized Service Delegation**

   - ApprovalProcessingService - Approval workflow processing
   - ApprovalTimeoutService - Timeout management and escalation
   - ApprovalStreamingService - Real-time WebSocket updates
   - ApprovalChainService - Multi-level approval chains
   - ConfidenceEvaluatorService - ML-based confidence scoring
   - UserInterruptionService - Dynamic user interruption handling
   - ApproverIntelligenceService - ML approver selection
   - 11+ additional specialized services

3. **Current Capabilities**
   - **NOT** implemented: LangGraph Command pattern integration
   - **NOT** implemented: graph.getState() method for StateSnapshot retrieval
   - **DOES** implement: interrupt() calls in HumanApprovalNode (line 330-338)
   - **DOES** implement: Neo4j persistence for approval metadata
   - **DOES** implement: Timeout, escalation, and notification systems

**Architecture Pattern**: Service facade with delegation to specialized services

**Evidence**:

```typescript
// human-approval.service.ts:92-109
async requestApproval(
  executionId: string,
  nodeId: string,
  message: string,
  state: WorkflowState,
  options: RequiresApprovalOptions = {}
): Promise<HumanApprovalRequest> {
  return this.hitlApprovalRequestService.createApprovalRequest(
    executionId,
    nodeId,
    message,
    state,
    options,
    this.hitlStorage,
    this.approvalCache,
    (id) => this.handleTimeout(id)
  );
}
```

### 1.2 HITL Node Implementation

**File**: `human-approval.node.ts` (1-518 lines)

**Key Discovery**: USES LangGraph native interrupt()

**Implementation Pattern**:

```typescript
// Lines 327-338
const humanDecision = interrupt({
  type: 'approval_required',
  executionId,
  nodeId: state.currentNode,
  approvalRequest,
  confidence,
  proposedActions,
  risks: approvalRequest.context.risks,
});
```

**Key Methods**:

- `execute<TState>(state, config, options)` - Execute approval checkpoint with RunnableConfig
- `processHumanFeedback(state, response)` - Process approval responses
- `extractDefaultActions(state)` - Extract proposed actions from state
- `cancelApproval(executionId)` - Cancel pending approvals
- `getPendingApprovals()` - Get all pending approvals
- `isApprovalPending(executionId)` - Check approval status

**Critical Insight**: Receives `RunnableConfig` with checkpointer access, uses LangGraph native `interrupt()`, but NO Command pattern for resumption

**Metadata Tracked**:

- Execution ID, node ID
- Proposed actions with risk levels
- Confidence scores
- Historical approval patterns (if BaseStore available)
- Timeout configuration
- Risk assessment data

### 1.3 @RequiresApproval Decorator

**File**: `approval.decorator.ts` (1-358 lines)

**Purpose**: Method-level decorator for marking nodes requiring human approval

**Key Features**:

- Conditional approval via `when` predicate
- Confidence threshold evaluation (lines 149-153)
- Risk assessment configuration (lines 75-87)
- Skip conditions for high confidence scenarios (lines 63-74)
- Timeout handling with escalation strategies (lines 54-56)
- Pre/post approval hooks (lines 100-105)
- Service locator pattern for ApprovalEvaluatorService (lines 177-187)

**Usage Pattern**:

```typescript
@RequiresApproval({
  confidenceThreshold: 0.7,
  riskThreshold: ApprovalRiskLevel.MEDIUM,
  chainId: 'development-chain',
  timeoutMs: 3600000,
  onTimeout: 'escalate'
})
async performRiskyOperation(state: WorkflowState) {
  // Implementation
}
```

**Integration**:

- Wraps original method (lines 170-282)
- Evaluates skip conditions via ApprovalEvaluatorService (lines 203-207)
- Routes to approval if needed (lines 243-250)
- Handles pre/post approval hooks (lines 198-200, 256-258)

### 1.4 HITL Metadata Stored

**Approval Request Fields** (hitl.interface.ts:6-21):

- `id` - Unique request identifier
- `workflowId` - Workflow execution ID
- `nodeId` - Node requesting approval
- `data` - Approval context data
- `metadata` - Additional metadata
- `createdAt` - Timestamp

**Approval Response Fields** (hitl.interface.ts:15-21):

- `requestId` - Request being responded to
- `approved` - Boolean decision
- `feedback` - Optional user feedback
- `approvedBy` - Approver identifier
- `approvedAt` - Response timestamp

---

## Section 2: LangGraph Command Pattern Requirements (What We Need)

### 2.1 Official LangGraph HITL Pattern (from langgraph-research.md)

**Source**: task-tracking/TASK_2025_048/langgraph-research.md:249-419

**Key Requirements**:

1. **interrupt() Function** (Lines 327-338)

   - Already implemented in HumanApprovalNode
   - Pauses workflow execution
   - Returns payload to caller in `__interrupt__` field
   - Resume value passed back when workflow resumes

2. **Command Class for Resumption** (Lines 625-642)

   ```typescript
   import { Command } from '@langchain/langgraph';

   // Resume with user input
   await graph.invoke(new Command({ resume: userInput }), config);
   ```

3. **graph.getState() Method** (Lines 56-166)

   - Returns real StateSnapshot with dynamically calculated fields
   - `next: string[]` - Nodes that will execute next (graph-calculated)
   - `tasks: PregelTask[]` - Pending tasks with metadata (graph-calculated)
   - `config` - RunnableConfig with thread_id, checkpoint_id
   - `metadata` - CheckpointMetadata
   - `createdAt` - ISO timestamp
   - `parentConfig` - Parent checkpoint reference

4. **Compiled Graph Requirement** (Lines 117-128)

   ```typescript
   const graph = new StateGraph(MyState).addNode('step1', step1Fn).compile({ checkpointer });

   // Use compiled graph methods
   const snapshot = await graph.getState(config);
   ```

### 2.2 StateSnapshot API Contract (Required Fields)

**Source**: node_modules/@langchain/langgraph/dist/pregel/types.d.ts:350-381

**Type Definition**:

```typescript
interface StateSnapshot {
  readonly values: Record<string, any> | any;
  readonly next: Array<string>; // MUST be calculated by graph
  readonly config: RunnableConfig;
  readonly metadata?: CheckpointMetadata;
  readonly createdAt?: string;
  readonly parentConfig?: RunnableConfig | undefined;
  readonly tasks: PregelTaskDescription[]; // MUST be calculated by graph
}
```

**Critical Understanding**:

- `next` and `tasks` are **dynamically calculated** by compiled graph
- Cannot be manually constructed from raw checkpoint data
- Require graph topology understanding
- Only accessible via `compiled.getState(config)` method

### 2.3 HITL Resumption Flow (Official Pattern)

**Source**: langgraph-research.md:250-288

**Correct Flow**:

1. Workflow executes until `interrupt()` call
2. Workflow pauses, checkpoint saved automatically
3. User receives approval request via event emission
4. User makes decision (approve/reject)
5. **Backend calls `graph.invoke(Command({ resume }), config)`**
6. Workflow continues from interrupt point
7. interrupt() returns user's decision
8. Node processes decision and returns state update

**Critical Requirement**: MUST use `graph.invoke()` to resume workflow, not just checkpoint updates

### 2.4 Command Class Usage Pattern

**Source**: langgraph-research.md:361-372, 622-642

**Official Pattern**:

```typescript
import { Command } from '@langchain/langgraph';

// Basic resumption
const result = await graph.invoke(new Command({ resume: userDecision }), {
  configurable: { thread_id, checkpoint_id },
});

// Resumption with state update
const result = await graph.invoke(
  new Command({
    resume: userDecision,
    update: { someKey: 'value' },
  }),
  { configurable: { thread_id, checkpoint_id } }
);

// Navigation to specific node
const result = await graph.invoke(
  new Command({
    resume: userDecision,
    goto: 'nodeName',
  }),
  { configurable: { thread_id, checkpoint_id } }
);
```

**Parameters**:

- `resume` - Value passed to interrupt() call
- `update` (optional) - State updates to apply
- `goto` (optional) - Jump to specific node

---

## Section 3: Gap Analysis (What's Missing)

### 3.1 Features That Exist

✅ **HumanApprovalNode with interrupt()** (human-approval.node.ts:330-338)

- Uses LangGraph native interrupt()
- Receives RunnableConfig with checkpointer
- Emits approval events
- Stores approval context in BaseStore (optional)

✅ **Neo4j HITL Metadata Persistence** (6 adapters)

- Neo4jHitlStorageAdapter - Main approval storage
- Neo4jApprovalChainStorageAdapter - Approval chains
- Neo4jConfidenceStorageAdapter - ML confidence data
- Neo4jFeedbackStorageAdapter - Human feedback
- Neo4jInterruptionStorageAdapter - User interruptions
- Neo4jApprovalStateStorageAdapter - Approval state

✅ **@RequiresApproval Decorator** (approval.decorator.ts)

- Method-level approval marking
- Conditional approval evaluation
- Risk assessment integration
- Skip conditions
- Timeout handling

✅ **Specialized HITL Services** (18 services)

- HumanApprovalService orchestration
- ApprovalProcessingService
- ApprovalChainService
- ConfidenceEvaluatorService
- UserInterruptionService
- 13+ additional services

### 3.2 Features Missing for LangGraph Command Integration

❌ **Command Class Import/Usage**

- No `import { Command } from "@langchain/langgraph"` in codebase
- No workflow resumption using Command pattern
- ResearchChatController calls resumeFromInterruption() which doesn't use Command

❌ **graph.getState() Method**

- WorkflowExecutionService has no getState() method
- No method to retrieve real StateSnapshot from compiled graph
- No way to get `next[]` and `tasks[]` fields

❌ **Workflow Resumption via graph.invoke(Command)**

- No implementation of resumption using `graph.invoke(Command({ resume }))`
- ResearchChatController's approveReport() method doesn't invoke workflow
- Missing integration between HumanApprovalService and workflow-engine

❌ **Checkpoint ID Retrieval**

- No method to get current checkpoint_id from StateSnapshot
- Required for resumption: `{ configurable: { thread_id, checkpoint_id } }`

❌ **Multi-Workflow Support**

- No workflowClass parameter in any HITL methods
- Cannot distinguish ResearcherAgent vs DevBrandSupervisor threads
- No workflow type metadata stored with approvals

---

## Section 4: Integration Requirements (How to Bridge the Gap)

### 4.1 WorkflowExecutionService Enhancement Plan

**File to Modify**: `libs/langgraph-modules/workflow-engine/src/lib/execution/workflow-execution.service.ts`

**New Methods Required**:

1. **getStateSnapshot(workflowClass, threadId): Promise<StateSnapshot>**

   - Purpose: Retrieve real StateSnapshot from compiled graph
   - Implementation: Compile graph, call `compiled.getState(config)`
   - Returns: StateSnapshot with valid `next[]` and `tasks[]` arrays
   - Pattern: Reuse existing `executeWorkflow()` compilation logic

2. **resumeFromInterruption(workflowClass, threadId, checkpointId, input): Promise<TState>**

   - Purpose: Resume HITL workflow using Command pattern
   - Implementation: Compile graph, call `compiled.invoke(Command({ resume: input }), config)`
   - Returns: Final workflow state (not void)
   - Integration: Called by HumanApprovalService after user decision

3. **getCheckpointHistory(workflowClass, threadId, options): Promise<StateSnapshot[]>**
   - Purpose: Retrieve conversation history
   - Implementation: Compile graph, call `compiled.getStateHistory(config, options)`
   - Returns: Array of StateSnapshot objects (newest first)
   - Use Case: UI conversation history display

**Key Design Decision**: Add methods to existing WorkflowExecutionService, don't create parallel service

**Rationale**:

- WorkflowExecutionService already compiles graphs
- Has access to moduleRef, metadataProcessor, buildStateGraph
- Reuse existing compilation pattern from executeWorkflow()
- Maintain single source of truth for workflow operations

### 4.2 Command Class Integration with HITL Infrastructure

**Integration Point**: HumanApprovalService.processApprovalResponse()

**Current Flow** (BROKEN):

```typescript
// human-approval.service.ts:114-161
async processApprovalResponse(requestId, response) {
  // 1. Clear timeout
  // 2. Process through ApprovalProcessingService
  // 3. Stream real-time update
  // 4. NOTE: State persistence handled by LangGraph checkpointer
  // ❌ NO WORKFLOW RESUMPTION
}
```

**Corrected Flow** (REQUIRED):

```typescript
async processApprovalResponse(requestId, response) {
  // 1. Clear timeout
  // 2. Get approval request to extract executionId, nodeId
  const request = await this.getApprovalRequest(requestId);

  // 3. Get current StateSnapshot to extract checkpoint_id
  const snapshot = await this.workflowExecutionService.getStateSnapshot(
    request.workflowClass,  // NEW: Required parameter
    request.executionId
  );

  const checkpointId = snapshot.config.configurable.checkpoint_id;

  // 4. Resume workflow with user decision using Command pattern
  const result = await this.workflowExecutionService.resumeFromInterruption(
    request.workflowClass,  // NEW: Required parameter
    request.executionId,
    checkpointId,
    { approved: response.decision === 'approved', feedback: response.feedback }
  );

  // 5. Process through ApprovalProcessingService
  // 6. Stream real-time update
  // 7. Return workflow result
  return { success: true, nextState: result };
}
```

**New Dependency**: HumanApprovalService needs WorkflowExecutionService

**Integration Pattern**:

```typescript
// human-approval.service.ts (constructor)
constructor(
  // ... existing dependencies
  private readonly workflowExecutionService: WorkflowExecutionService  // NEW
) {}
```

### 4.3 Workflow Class Resolution Strategy

**Problem**: Need to determine which workflow class (ResearcherAgent vs DevBrandSupervisor) for a given thread

**Solution Options**:

**Option A: Store in Approval Request Metadata** (RECOMMENDED)

```typescript
// When creating approval request
const request: HumanApprovalRequest = {
  id: requestId,
  executionId,
  nodeId,
  metadata: {
    workflowClass: workflowClass.name, // NEW: Store workflow type
    workflowType: 'researcher', // Human-readable type
  },
  // ... other fields
};

// When processing response
const workflowClassName = request.metadata.workflowClass;
const workflowClass = this.resolveWorkflowClass(workflowClassName);
```

**Option B: Controller Query Parameter**

```typescript
// ResearchChatController
@Post('approve/:executionId')
async approveReport(
  @Param('executionId') executionId: string,
  @Query('workflowType') workflowType: 'researcher' | 'devbrand',  // NEW
  @Body() body: ApprovalInputDto
) {
  const workflowClass = workflowType === 'researcher'
    ? ResearcherAgent
    : DevBrandSupervisorWorkflow;

  // Pass workflowClass to service
}
```

**Option C: Neo4j Thread Metadata** (FUTURE ENHANCEMENT)

```typescript
// Store in Neo4j when workflow starts
await this.neo4j.query(
  `
  CREATE (t:Thread {
    id: $threadId,
    userId: $userId,
    workflowType: $workflowType,
    createdAt: datetime()
  })
`,
  { threadId, userId, workflowType: 'researcher' }
);

// Retrieve when resuming
const threadMeta = await this.neo4j.query(
  `
  MATCH (t:Thread { id: $threadId })
  RETURN t.workflowType as workflowType
`,
  { threadId }
);
```

**Decision**: Use **Option A** (metadata storage) for TASK_2025_049

- Immediate implementation
- No schema changes required
- Approval request already has metadata field
- Future migration to Option C for thread management features

### 4.4 Neo4j HITL Metadata Preservation Strategy

**Requirement**: Ensure Neo4j HITL metadata is NOT lost during workflow resumption

**Current Behavior**: Neo4j adapters persist approval metadata independently

**Integration Pattern**:

```typescript
// 1. BEFORE resuming workflow: Approval metadata already in Neo4j
await this.neo4jHitlStorage.storeApprovalRequest(approvalData);

// 2. Resume workflow with Command
const result = await this.workflowExecutionService.resumeFromInterruption(
  workflowClass,
  threadId,
  checkpointId,
  userDecision
);

// 3. AFTER workflow resumes: Update approval status in Neo4j
await this.neo4jHitlStorage.updateApprovalStatus(requestId, 'approved', {
  decision: 'approved',
  timestamp: new Date(),
});
```

**Key Insight**: LangGraph checkpointer and Neo4j HITL adapters are independent

- LangGraph checkpointer: Workflow state persistence
- Neo4j HITL adapters: Approval metadata, chains, confidence, feedback
- Both operate independently - no conflict

**Action Required**: NONE - existing pattern already preserves metadata

---

## Section 5: Architectural Constraints (What NOT to Break)

### 5.1 Existing HITL Package Must Continue Working

**Constraints**:

- @RequiresApproval decorator pattern MUST be preserved
- HumanApprovalNode.execute() method signature MUST remain compatible
- HumanApprovalService public API MUST remain backward compatible
- All 18 specialized services MUST continue functioning
- Neo4j HITL adapters MUST continue persisting metadata

**Verification**:

- Existing workflows using @RequiresApproval MUST work without changes
- Approval chains, timeout handling, escalation MUST continue functioning
- ML confidence scoring MUST continue working
- User interruption features MUST continue working

### 5.2 Neo4j Adapters Must Preserve Functionality

**Constraints**:

- 6 existing Neo4j adapters MUST continue persisting HITL data
- Storage interface contracts MUST NOT change
- Query patterns MUST remain compatible
- Metadata schemas MUST NOT break

**Adapters Protected**:

1. Neo4jHitlStorageAdapter
2. Neo4jApprovalChainStorageAdapter
3. Neo4jConfidenceStorageAdapter
4. Neo4jFeedbackStorageAdapter
5. Neo4jInterruptionStorageAdapter
6. Neo4jApprovalStateStorageAdapter

### 5.3 No Direct Checkpointer Manipulation Allowed

**Anti-Pattern** (from TASK_2025_048 failure):

```typescript
// ❌ FORBIDDEN: Direct checkpointer access
async getStateSnapshot(threadId: string) {
  const checkpoint = await this.checkpointer.getTuple({ configurable: { thread_id: threadId } });
  return {
    values: checkpoint.channel_values,
    next: [],  // ❌ ALWAYS EMPTY - WE DON'T KNOW NEXT NODES
    tasks: [],  // ❌ ALWAYS EMPTY
  };
}

// ❌ FORBIDDEN: Manual checkpoint update without invoke()
async resumeFromInterruption(threadId, userInput) {
  await this.checkpointer.put(config, newCheckpoint, metadata, {});
  // ❌ NO WORKFLOW EXECUTION
}
```

**Required Pattern**:

```typescript
// ✅ CORRECT: Use compiled graph API
async getStateSnapshot(workflowClass, threadId) {
  const compiled = await this.compileWorkflowGraph(workflowClass);
  return await compiled.getState({ configurable: { thread_id: threadId } });
}

// ✅ CORRECT: Use graph.invoke(Command)
async resumeFromInterruption(workflowClass, threadId, checkpointId, input) {
  const compiled = await this.compileWorkflowGraph(workflowClass);
  return await compiled.invoke(
    new Command({ resume: input }),
    { configurable: { thread_id: threadId, checkpoint_id: checkpointId } }
  );
}
```

### 5.4 No Parallel Service Implementations

**Anti-Pattern** (from TASK_2025_048 failure):

- Created CheckpointHistoryService as standalone service
- Duplicated WorkflowExecutionService functionality
- Created competing APIs for state management

**Required Pattern**:

- Enhance existing WorkflowExecutionService with new methods
- Single source of truth for workflow operations
- No duplicate services for checkpoint/state management

---

## Section 6: Security Requirements

### 6.1 Access Control on Checkpoint Retrieval

**Requirement**: Verify thread ownership before retrieving state

**Implementation**:

```typescript
// ConversationHistoryController
async getThreadState(userId: string, threadId: string, workflowType: string) {
  // 1. Verify thread ownership
  const threadMeta = await this.neo4j.query(`
    MATCH (t:Thread { id: $threadId, userId: $userId })
    RETURN t
  `, { threadId, userId });

  if (!threadMeta) {
    throw new HttpException(
      'Thread not found or access denied',
      HttpStatus.FORBIDDEN
    );
  }

  // 2. Retrieve state only if authorized
  const snapshot = await this.workflowExecutionService.getStateSnapshot(
    workflowClass,
    threadId
  );

  return { userId, threadId, state: snapshot };
}
```

**Error Handling**:

- Return HTTP 403 Forbidden for unauthorized access
- Do NOT expose thread existence information
- Generic error message: "Thread not found or access denied"

### 6.2 PII Filtering on Exposed State

**Requirement**: Filter sensitive data from StateSnapshot before exposing to client

**Implementation**:

```typescript
// Create DTO for safe state exposure
class ThreadStateDto {
  @Exclude()
  private snapshot: StateSnapshot;

  @Expose()
  get values() {
    // Filter PII from state values
    return this.filterPII(this.snapshot.values);
  }

  @Expose()
  get next() {
    return this.snapshot.next;
  }

  @Expose()
  get tasks() {
    // Filter sensitive task metadata
    return this.snapshot.tasks.map((task) => ({
      name: task.name,
      path: task.path,
      // Omit sensitive fields
    }));
  }

  private filterPII(values: any): any {
    // Remove PII fields
    const filtered = { ...values };
    delete filtered.userEmail;
    delete filtered.phoneNumber;
    delete filtered.apiKeys;
    return filtered;
  }
}
```

**Fields to Filter**:

- User PII: email, phone, address
- API keys, credentials
- Internal system identifiers
- Full error stack traces

### 6.3 Input Validation on Resume Operations

**Requirement**: Validate user input before resuming workflows

**Implementation**:

```typescript
// Create validation DTO
import { IsBoolean, IsString, IsOptional, Length, Matches } from 'class-validator';

export class ApprovalInputDto {
  @IsBoolean()
  approved!: boolean;

  @IsString()
  @IsOptional()
  @Length(0, 1000)
  feedback?: string;
}

// Controller usage
@Post('approve/:executionId')
async approveReport(
  @Param('executionId') executionId: string,
  @Body() body: ApprovalInputDto  // ✅ Validated automatically
) {
  // Input validated before method execution
  const result = await this.workflowExecutionService.resumeFromInterruption(
    ResearcherAgent,
    executionId,
    checkpointId,
    { approved: body.approved, feedback: body.feedback }
  );

  return { status: 'success', result };
}
```

**Validation Rules**:

- approved: Must be boolean
- feedback: Max 1000 characters, optional
- No arbitrary object fields allowed
- No HTML/script injection

### 6.4 Rate Limiting Considerations

**Requirement**: Prevent abuse of checkpoint retrieval and resume endpoints

**Implementation** (Future Enhancement):

```typescript
// Add NestJS throttler module
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,  // 10 requests per minute
    }),
  ],
})

// Apply to sensitive endpoints
@UseGuards(ThrottlerGuard)
@Get(':userId/thread/:threadId')
async getThreadState() {
  // Protected by rate limiting
}
```

**Recommended Limits**:

- getThreadState: 10 requests/minute per user
- resumeFromInterruption: 5 requests/minute per thread
- getCheckpointHistory: 5 requests/minute per user

---

## Requirement Summary

### Functional Requirements

1. **Conversation History Retrieval**

   - User Story: As a user, I want to retrieve conversation state to view workflow progress, so that I understand what the AI agent is doing
   - Acceptance Criteria:
     - WHEN user requests thread state THEN StateSnapshot is returned with valid `next[]` and `tasks[]` arrays
     - WHEN workflow is paused at HITL THEN `next` array contains approval node name
     - WHEN workflow is complete THEN `next` array is empty
     - WHEN workflow has pending tasks THEN `tasks` array contains PregelTask objects with metadata

2. **HITL Workflow Resumption**

   - User Story: As a user, when I approve a research report, I want the workflow to continue and save the report, so that I receive my requested deliverable
   - Acceptance Criteria:
     - WHEN user approves request THEN workflow resumes from interrupt point using Command pattern
     - WHEN workflow resumes THEN interrupt() returns user's decision
     - WHEN workflow completes THEN final state is returned (e.g., saved report path)
     - WHEN resumption fails THEN error is returned to user with meaningful message

3. **Multi-Workflow Support**
   - User Story: As a developer, I want to retrieve state for different workflow types, so that I can support ResearcherAgent and DevBrandSupervisor threads
   - Acceptance Criteria:
     - WHEN requesting state THEN workflowClass parameter is provided
     - WHEN workflowClass is ResearcherAgent THEN ResearcherAgent graph is compiled
     - WHEN workflowClass is DevBrandSupervisor THEN DevBrandSupervisor graph is compiled
     - WHEN workflow type is unknown THEN error is returned with supported types

### Non-Functional Requirements

#### Performance Requirements

- **Response Time**: 95% of getStateSnapshot requests under 200ms, 99% under 500ms
- **Throughput**: Handle 100 concurrent state retrieval requests
- **Resource Usage**: Graph compilation cached, memory usage < 500MB per 1000 threads

#### Security Requirements

- **Authentication**: User must be authenticated to access threads
- **Authorization**: Verify thread ownership before state retrieval (userId matches thread.userId)
- **Data Protection**: PII filtering on StateSnapshot values before exposure
- **Input Validation**: All resume inputs validated with class-validator DTOs
- **Compliance**: Follow OWASP Top 10 guidance for API security

#### Scalability Requirements

- **Load Capacity**: Support 10x current approval volume
- **Growth Planning**: Support 100% yearly growth in workflow executions
- **Resource Scaling**: Graph compilation should be stateless for horizontal scaling

#### Reliability Requirements

- **Uptime**: 99.9% availability for state retrieval
- **Error Handling**: Graceful degradation if graph compilation fails (return cached state)
- **Recovery Time**: Workflow resumption retry logic with exponential backoff
- **Data Integrity**: Neo4j HITL metadata MUST NOT be lost during resumption

### Integration Requirements

1. **WorkflowExecutionService Enhancement**

   - Add getStateSnapshot(workflowClass, threadId): Promise<StateSnapshot>
   - Add resumeFromInterruption(workflowClass, threadId, checkpointId, input): Promise<TState>
   - Add getCheckpointHistory(workflowClass, threadId, options): Promise<StateSnapshot[]>

2. **HumanApprovalService Integration**

   - Inject WorkflowExecutionService dependency
   - Update processApprovalResponse() to use graph.invoke(Command)
   - Store workflowClass in approval request metadata

3. **Controller Integration**
   - ResearchChatController: Update approveReport() to pass workflowClass
   - ConversationHistoryController: Add thread ownership verification
   - Both: Add input validation DTOs

### Anti-Requirements (What NOT to Implement)

❌ Direct checkpointer manipulation APIs
❌ Manual StateSnapshot construction
❌ Parallel service implementations (CheckpointHistoryService)
❌ Backward compatibility layers for v1/v2 patterns
❌ Version-specific APIs (/api/v1/checkpoint, /api/v2/checkpoint)

---

## Stakeholder Analysis

### Primary Stakeholders

**End Users**:

- **Needs**: View workflow progress, resume interrupted workflows, receive deliverables
- **Pain Points**: Cannot see what AI agent is doing, approvals don't continue workflows
- **Success Criteria**: User can see "Next steps: Analyzing data" and reports save after approval

**Backend Developers**:

- **Needs**: Implement LangGraph Command pattern, integrate with HITL infrastructure
- **Constraints**: Must not break existing HITL features, preserve Neo4j metadata
- **Success Criteria**: Tests pass, no regressions in approval flows

### Secondary Stakeholders

**Operations Team**:

- **Needs**: Monitor workflow resumption success rate, debug failed resumptions
- **Requirements**: Logging for graph compilation, Command invocation, state retrieval
- **Deployment**: Zero-downtime deployment for WorkflowExecutionService changes

**Support Team**:

- **Needs**: Troubleshoot user-reported issues with approvals
- **Documentation**: Error codes, common failure scenarios, resolution steps
- **Metrics**: Approval success rate, average response time, timeout rate

### Stakeholder Impact Matrix

| Stakeholder   | Impact Level | Involvement      | Success Criteria                   |
| ------------- | ------------ | ---------------- | ---------------------------------- |
| End Users     | High         | Testing/Feedback | Workflows resume, reports save     |
| Backend Devs  | High         | Implementation   | Tests pass, code review approved   |
| Frontend Devs | Medium       | API consumption  | StateSnapshot.next displayed in UI |
| Operations    | Medium       | Deployment       | Zero-downtime deployment           |
| Support       | Low          | Documentation    | Error troubleshooting guide        |

---

## Risk Analysis

### Technical Risks

**Risk**: Graph compilation performance impact

- **Probability**: Medium
- **Impact**: High
- **Score**: 6
- **Mitigation**: Cache compiled graphs per workflowClass, reuse across requests
- **Contingency**: Implement graph compilation timeout, return cached state if slow

**Risk**: Neo4j HITL metadata loss during resumption

- **Probability**: Low
- **Impact**: Critical
- **Score**: 6
- **Mitigation**: Verify Neo4j adapter calls happen before AND after resumption
- **Contingency**: Transaction rollback, alert on metadata inconsistency

**Risk**: Command pattern integration breaks existing approvals

- **Probability**: Low
- **Impact**: High
- **Score**: 4
- **Mitigation**: Comprehensive integration tests, gradual rollout
- **Contingency**: Feature flag for Command pattern, rollback to checkpoint updates

### Business Risks

**Risk**: User confusion during transition

- **Probability**: Medium
- **Impact**: Medium
- **Score**: 4
- **Mitigation**: No UI changes required, backend enhancement only
- **Contingency**: Support documentation, user communication

### Integration Risks

**Risk**: WorkflowExecutionService changes break other features

- **Probability**: Low
- **Impact**: High
- **Score**: 4
- **Mitigation**: Only add new methods, don't modify existing ones
- **Contingency**: Feature flag for new methods, gradual rollout

### Risk Matrix

| Risk                          | Probability | Impact   | Score | Mitigation Strategy                        |
| ----------------------------- | ----------- | -------- | ----- | ------------------------------------------ |
| Graph compilation performance | Medium      | High     | 6     | Cache compiled graphs, reuse across calls  |
| Neo4j metadata loss           | Low         | Critical | 6     | Verify adapter calls, transaction rollback |
| Breaking existing approvals   | Low         | High     | 4     | Integration tests, feature flags           |
| User confusion                | Medium      | Medium   | 4     | Support docs, no UI changes                |
| WorkflowExecutionService bugs | Low         | High     | 4     | Only add methods, feature flags            |

---

## Success Metrics

### Functional Metrics

- **StateSnapshot Accuracy**: 100% of getStateSnapshot calls return valid `next[]` and `tasks[]` arrays
- **Workflow Resumption Success Rate**: 95% of resumeFromInterruption calls complete successfully
- **Neo4j Metadata Preservation**: 100% of approval metadata preserved during resumption
- **Multi-Workflow Support**: Both ResearcherAgent and DevBrandSupervisor workflows supported

### Performance Metrics

- **getStateSnapshot Response Time**: 95th percentile < 200ms
- **resumeFromInterruption Response Time**: 95th percentile < 1000ms
- **Graph Compilation Cache Hit Rate**: > 80%
- **Concurrent Request Handling**: Support 100 concurrent getStateSnapshot requests

### Security Metrics

- **Authorization Success Rate**: 100% of unauthorized access attempts return HTTP 403
- **PII Leakage**: 0 incidents of PII exposure in StateSnapshot responses
- **Input Validation Success Rate**: 100% of malformed inputs rejected with HTTP 400

### Integration Metrics

- **Backward Compatibility**: 100% of existing @RequiresApproval workflows continue working
- **Neo4j Adapter Integrity**: 100% of Neo4j adapter operations succeed during resumption
- **Test Coverage**: 90% code coverage for new WorkflowExecutionService methods

---

## Dependencies

### Internal Dependencies

- @hive-academy/langgraph-workflow-engine (WorkflowExecutionService)
- @hive-academy/langgraph-hitl (HumanApprovalService, decorators, adapters)
- @hive-academy/langgraph-core (WorkflowState types)
- @hive-academy/nestjs-neo4j (Neo4j service for thread metadata)

### External Dependencies

- @langchain/langgraph (Command class, StateSnapshot type, interrupt function)
- @langchain/langgraph-checkpoint (BaseCheckpointSaver)
- @langchain/core/runnables (RunnableConfig)

### Documentation Dependencies

- task-tracking/TASK_2025_048/langgraph-research.md (Official LangGraph patterns)
- task-tracking/TASK_2025_048/code-review.md (Anti-patterns to avoid)
- task-tracking/TASK_2025_048/failure-report.md (Architectural lessons)

---

## Acceptance Criteria Validation

Before marking this task as complete, verify:

- [ ] WorkflowExecutionService has getStateSnapshot() method that compiles graph
- [ ] WorkflowExecutionService has resumeFromInterruption() method using Command pattern
- [ ] HumanApprovalService processApprovalResponse() calls graph.invoke(Command)
- [ ] StateSnapshot contains valid next[] array (not always empty)
- [ ] StateSnapshot contains valid tasks[] array (not always empty)
- [ ] Workflow actually resumes after approval (not just checkpoint update)
- [ ] Neo4j HITL metadata preserved during resumption
- [ ] Thread ownership verified before state retrieval
- [ ] PII filtered from StateSnapshot before exposure
- [ ] Input validated with DTOs on resume operations
- [ ] Integration tests pass for ResearcherAgent and DevBrandSupervisor
- [ ] Existing @RequiresApproval workflows continue working
- [ ] No direct checkpointer manipulation in implementation
- [ ] No parallel service implementations created

---

## Conclusion

This task requires **integration**, not **replacement**. We have comprehensive HITL infrastructure that works. The gap is LangGraph Command pattern integration for proper workflow resumption.

**Key Deliverables**:

1. Enhance WorkflowExecutionService with 3 new methods
2. Integrate Command pattern in HumanApprovalService
3. Preserve all existing HITL functionality
4. Add security controls (authorization, PII filtering, validation)

**Success**: Workflows resume using Command pattern, StateSnapshot has valid data, existing features continue working.
