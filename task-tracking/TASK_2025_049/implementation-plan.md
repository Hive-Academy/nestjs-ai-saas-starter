# Implementation Plan - TASK_2025_049

**LangGraph Command Pattern Integration for HITL Workflow Resumption - COMPLETE REVISION**

---

## Document Status

- **Task ID**: TASK_2025_049
- **Status**: Architecture Design Complete (REVISED)
- **Created**: 2025-01-15
- **Revision Date**: 2025-01-15
- **Architect**: software-architect (evidence-based design)
- **Revision Reason**: SRP improvements (split LangGraphCommandService and WorkflowResumptionService)

---

## Executive Summary

This implementation plan integrates LangGraph's native Command pattern with the existing HITL infrastructure to enable proper workflow resumption after human approvals. The architecture introduces **two new specialized services** following Single Responsibility Principle (SRP) and refactors existing services to delegate to them.

**Key Architectural Changes**:

1. **NEW: LangGraphCommandService** - Low-level LangGraph Command operations
2. **NEW: WorkflowResumptionService** - High-level workflow resumption orchestration
3. **REFACTOR: WorkflowExecutionService** - Delegates to WorkflowResumptionService
4. **ENHANCE: HumanApprovalService** - Integrates workflow resumption

**Service Placement**: Both new services live in **@hive-academy/langgraph-workflow-engine** package (workflow orchestration domain).

**Implementation Effort**: 9 hours, 2 CREATE + 3 MODIFY files

---

## Architectural Rationale: SRP Improvements

### Why Two Services Instead of One?

**ORIGINAL PROPOSAL**: Enhance WorkflowExecutionService with 3 new methods (getStateSnapshot, resumeFromInterruption, updateWorkflowState)

**PROBLEM**: WorkflowExecutionService would violate Single Responsibility Principle:

- Responsibility 1: Execute new workflows (executeWorkflow, streamWorkflow)
- Responsibility 2: **Manage workflow resumption** (getStateSnapshot, resumeFromInterruption, updateWorkflowState)

**REVISED SOLUTION**: Split into two services with clear responsibilities:

1. **LangGraphCommandService** (low-level Command operations)

   - **Responsibility**: Translate LangGraph Command patterns to method calls
   - **Focus**: Pure LangGraph API interactions (invoke, getState, updateState, stream)
   - **Consumers**: WorkflowResumptionService, WorkflowExecutionService
   - **Evidence**: Low-level utilities pattern (MetadataProcessorService:10, ToolRegistryService:12)

2. **WorkflowResumptionService** (high-level resumption orchestration)
   - **Responsibility**: Orchestrate workflow resumption workflows (graph compilation + Command execution)
   - **Focus**: Business logic for HITL resumption (sanitization, validation, error handling)
   - **Consumers**: HumanApprovalService, ConversationHistoryController
   - **Evidence**: High-level orchestration pattern (WorkflowExecutionService:44, MultiAgentGraphBuilderService:16)

**Benefits**:

- ✅ **Testability**: Each service can be unit tested independently
- ✅ **Reusability**: LangGraphCommandService can be used for future Command patterns (time-travel, debugging)
- ✅ **Maintainability**: Clear separation between LangGraph primitives and business logic
- ✅ **Flexibility**: Easy to add new Command operations without bloating resumption service

### Delegation Pattern Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    HumanApprovalService                         │
│              (HITL business logic orchestrator)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ processApprovalResponse()
                             │ calls resumeWorkflow()
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 WorkflowResumptionService                       │
│          (High-level resumption orchestration)                  │
│                                                                  │
│  • resumeWorkflow(workflowClass, threadId, resumeValue)        │
│  • getWorkflowState(workflowClass, threadId)                   │
│  • updateWorkflowState(workflowClass, threadId, updates)       │
│  • Handles: Graph compilation, StateSnapshot sanitization,     │
│              error recovery, validation                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Delegates low-level
                             │ LangGraph operations
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LangGraphCommandService                        │
│            (Low-level LangGraph Command API)                    │
│                                                                  │
│  • invokeWithCommand(compiled, Command, config)                │
│  • getState(compiled, config)                                  │
│  • updateState(compiled, updates, asNode, config)              │
│  • streamWithCommand(compiled, Command, config)                │
│  • Pure LangGraph API wrapper - no business logic              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Uses LangGraph native APIs
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       @langchain/langgraph                      │
│              (LangGraph 1.0.1 - Native APIs)                    │
│                                                                  │
│  • Command class                                                │
│  • compiled.invoke(Command, config)                            │
│  • compiled.getState(config)                                   │
│  • compiled.updateState(config, updates, asNode)               │
│  • compiled.stream(Command, config)                            │
└─────────────────────────────────────────────────────────────────┘
```

**Delegation Chain Example**:

```typescript
// User approves request
HumanApprovalService.processApprovalResponse(requestId, response)
  ↓
WorkflowResumptionService.resumeWorkflow(workflowClass, threadId, approvalData)
  ↓
LangGraphCommandService.invokeWithCommand(compiledGraph, Command({ resume }), config)
  ↓
@langchain/langgraph compiled.invoke(Command({ resume }), config)
```

---

## Service Naming Decisions

### Why "LangGraphCommandService" (Not "CommandService")?

**Considered Names**:

1. ❌ **CommandService** - Too generic (could be any command pattern)
2. ❌ **GraphCommandService** - Ambiguous (graph database? graph API?)
3. ✅ **LangGraphCommandService** - Explicit framework integration

**Rationale**:

- **Framework-Specific**: This service wraps LangGraph-specific Command pattern APIs
- **Namespace Clarity**: Distinguishes from other command patterns (CQRS commands, CLI commands, etc.)
- **Pattern Precedent**: LlmProviderService, MetadataProcessorService (specific technology + purpose)
- **Evidence**: workflow-engine/src/lib/services/llm/llm-provider.service.ts:10 (framework-specific naming)

### Why "WorkflowResumptionService" (Not "WorkflowResumeService")?

**Considered Names**:

1. ❌ **WorkflowResumeService** - Verb-based naming (inconsistent with NestJS patterns)
2. ❌ **ResumeWorkflowService** - Grammatically awkward
3. ✅ **WorkflowResumptionService** - Noun-based naming (consistent with NestJS conventions)

**Rationale**:

- **NestJS Convention**: Services use noun-based names (ApprovalProcessingService, ConfidenceEvaluatorService, MetadataProcessorService)
- **Clarity**: "Resumption" clearly indicates the service handles the _process_ of resuming workflows
- **Pattern Precedent**: workflow-engine has ProcessorService, BuilderService, ExecutionService (noun-based)
- **Evidence**: workflow-execution.service.ts:44, metadata-processor.service.ts:10, approval-processing.service.ts:11

---

## 📊 Codebase Investigation Summary

### Libraries & Modules Discovered

**1. @langchain/langgraph (v1.0.1)**

- **Purpose**: Graph-based workflow orchestration with native HITL support
- **Key Exports Verified**:
  - `Command` class (dist/index.d.ts:1) - Resume interruptions
  - `interrupt()` function - Pause workflows
  - `StateGraph.getState()` - Retrieve StateSnapshot with `next[]` and `tasks[]`
  - `StateGraph.invoke()` - Execute/resume workflows
  - `BaseCheckpointSaver` - State persistence

**Evidence**:

```bash
# Verified Command export
node_modules/@langchain/langgraph/dist/index.d.ts:1
export { Command, ... } from '@langchain/langgraph'
```

**2. @hive-academy/langgraph-workflow-engine**

- **Purpose**: Decorator-driven workflow execution service
- **File**: `libs/langgraph-modules/workflow-engine/src/lib/execution/workflow-execution.service.ts`
- **Key Components**:
  - `WorkflowExecutionService` (class, line 44) - Main execution orchestrator
  - `executeWorkflow()` (line 111-152) - Graph compilation + invoke pattern
  - `streamWorkflow()` (line 174-238) - Streaming execution
  - **Existing broken methods** (to be deprecated):
    - `getStateSnapshot()` (line 351-396) - Returns fake StateSnapshot
    - `resumeFromInterruption()` (line 488-552) - Only updates checkpoint, doesn't resume
  - `MetadataProcessorService` - Workflow metadata extraction
  - `MultiAgentGraphBuilderService` - Multi-agent coordination

**Evidence**:

- Service exists: workflow-execution.service.ts:44
- Has checkpointer access: line 46, 63
- Has store access: line 60, 82
- Missing Command integration: No `import { Command }` found

**3. @hive-academy/langgraph-hitl**

- **Purpose**: Enterprise Human-in-the-Loop approval system
- **File**: `libs/langgraph-modules/hitl/src/lib/services/human-approval.service.ts`
- **Key Components**:
  - `HumanApprovalService` (class, line 45) - Main approval orchestrator
  - `requestApproval()` (line 92-109) - Create approval requests
  - `processApprovalResponse()` (line 114-162) - **MISSING workflow resumption**
  - `HumanApprovalNode` - Uses `interrupt()` correctly (from task-description.md)
  - 18 specialized services (timeout, streaming, validation, etc.)
  - 6 Neo4j storage adapters (approval-chain, confidence, feedback, etc.)

**Evidence**:

- Service exists: human-approval.service.ts:45
- No WorkflowResumptionService injection: constructor (line 49-64)
- No Command pattern usage: processApprovalResponse() only updates cache/storage

---

## 🏗️ Architecture Design (Codebase-Aligned)

### Design Philosophy

**Pattern**: **Service Composition with SRP** (Single Responsibility Principle)

- Create two new specialized services with clear, focused responsibilities
- Preserve all existing HITL infrastructure (18 services, 6 adapters)
- Refactor WorkflowExecutionService to delegate to new services
- Zero changes to Neo4j adapters or HumanApprovalNode

**Rationale**:

- **SRP Compliance**: Each service has ONE reason to change
- **Testability**: Independent unit testing for each service
- **Reusability**: LangGraphCommandService can be used for future Command patterns
- **Maintainability**: Clear separation of concerns (LangGraph primitives vs business logic)

**Evidence**:

- task-description.md:399-407 (Integration Requirements)
- workflow-execution.service.ts:111-152 (Graph compilation pattern to reuse)

---

## 📋 Component Specifications

### Component 1: LangGraphCommandService (NEW)

**Purpose**: Low-level LangGraph Command pattern API wrapper

**Package**: `@hive-academy/langgraph-workflow-engine`

**Location**: `libs/langgraph-modules/workflow-engine/src/lib/services/langgraph-command.service.ts`

**Pattern**: Pure utility service - no state, no business logic, just LangGraph API wrapper

**Responsibility**: Provide type-safe wrappers for LangGraph's Command-related operations

**Evidence**:

- Pattern: Similar to ToolRegistryService (workflow-engine/src/lib/services/tool-registry.service.ts:12) - pure utility
- Import location: workflow-execution.service.ts:1-20 (service imports pattern)

---

#### Complete Service Implementation

````typescript
/**
 * LangGraphCommandService
 *
 * Low-level service for LangGraph Command pattern operations.
 * Provides type-safe wrappers for invoking, streaming, and state management
 * using LangGraph's native Command class.
 *
 * RESPONSIBILITY: Pure LangGraph API wrapper - no business logic
 *
 * Architecture Decision (TASK_2025_049):
 * - Separated from WorkflowResumptionService for SRP compliance
 * - Reusable for future Command patterns (time-travel, debugging, etc.)
 * - No graph compilation logic (delegated to consumers)
 *
 * @see WorkflowResumptionService for high-level resumption orchestration
 * @see WorkflowExecutionService for workflow execution orchestration
 */
import { Injectable, Logger } from '@nestjs/common';
import type { RunnableConfig } from '@langchain/core/runnables';
import { Command } from '@langchain/langgraph';
import type { CompiledStateGraph, StateSnapshot } from '@langchain/langgraph';
import type { WorkflowState } from '@hive-academy/langgraph-core';

@Injectable()
export class LangGraphCommandService {
  private readonly logger = new Logger(LangGraphCommandService.name);

  /**
   * Invoke a compiled graph with a Command for workflow resumption
   *
   * LOW-LEVEL OPERATION: Direct LangGraph API wrapper
   *
   * @param compiledGraph - Already compiled StateGraph (from graph.compile())
   * @param command - LangGraph Command instance (e.g., new Command({ resume: value }))
   * @param config - RunnableConfig with thread_id and checkpoint_id
   * @returns Final workflow state after resumption
   *
   * @throws Error if graph invocation fails
   *
   * Evidence: task-description.md:680-696 (Command pattern for resumption)
   *
   * @example
   * ```typescript
   * const compiled = graph.compile({ checkpointer });
   * const command = new Command({ resume: { approved: true } });
   * const config = { configurable: { thread_id: 'thread-123', checkpoint_id: 'ckpt-456' } };
   * const result = await commandService.invokeWithCommand(compiled, command, config);
   * ```
   */
  async invokeWithCommand<TState extends WorkflowState = WorkflowState>(
    compiledGraph: CompiledStateGraph<TState>,
    command: Command,
    config: RunnableConfig
  ): Promise<TState> {
    this.logger.debug(`Invoking graph with Command for thread: ${config.configurable?.thread_id}`);

    try {
      const result = await compiledGraph.invoke(command, config);
      this.logger.log(
        `✅ Command invocation successful for thread: ${config.configurable?.thread_id}`
      );
      return result as TState;
    } catch (error: any) {
      this.logger.error(
        `❌ Command invocation failed for thread ${config.configurable?.thread_id}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Get current state snapshot from a compiled graph
   *
   * LOW-LEVEL OPERATION: Direct LangGraph API wrapper
   *
   * @param compiledGraph - Already compiled StateGraph
   * @param config - RunnableConfig with thread_id
   * @returns StateSnapshot with valid next[] and tasks[] arrays
   *
   * @throws Error if state retrieval fails
   *
   * Evidence: task-description.md:199-241 (StateSnapshot API Contract)
   *
   * @example
   * ```typescript
   * const compiled = graph.compile({ checkpointer });
   * const config = { configurable: { thread_id: 'thread-123' } };
   * const snapshot = await commandService.getState(compiled, config);
   * console.log('Next nodes:', snapshot.next); // Real next nodes, not empty array
   * ```
   */
  async getState<TState extends WorkflowState = WorkflowState>(
    compiledGraph: CompiledStateGraph<TState>,
    config: RunnableConfig
  ): Promise<StateSnapshot<TState>> {
    this.logger.debug(`Retrieving state snapshot for thread: ${config.configurable?.thread_id}`);

    try {
      const snapshot = await compiledGraph.getState(config);
      this.logger.log(
        `✅ State snapshot retrieved for thread: ${
          config.configurable?.thread_id
        }, next: [${snapshot.next.join(', ')}]`
      );
      return snapshot;
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to retrieve state snapshot for thread ${config.configurable?.thread_id}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Update workflow state without resumption (advanced use case)
   *
   * LOW-LEVEL OPERATION: Direct LangGraph API wrapper
   *
   * @param compiledGraph - Already compiled StateGraph
   * @param updates - Partial state updates to apply
   * @param asNode - Optional node name to attribute update to
   * @param config - RunnableConfig with thread_id
   *
   * @throws Error if state update fails
   *
   * Evidence: task-description.md:651-668 (HITL with State Update - Advanced)
   *
   * @example
   * ```typescript
   * const compiled = graph.compile({ checkpointer });
   * const config = { configurable: { thread_id: 'thread-123' } };
   * await commandService.updateState(
   *   compiled,
   *   { metadata: { customField: 'value' } },
   *   'myNode',
   *   config
   * );
   * ```
   */
  async updateState<TState extends WorkflowState = WorkflowState>(
    compiledGraph: CompiledStateGraph<TState>,
    updates: Partial<TState>,
    asNode: string | null,
    config: RunnableConfig
  ): Promise<void> {
    this.logger.debug(`Updating state for thread: ${config.configurable?.thread_id}`);

    try {
      await compiledGraph.updateState(config, updates, asNode);
      this.logger.log(`✅ State updated for thread: ${config.configurable?.thread_id}`);
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to update state for thread ${config.configurable?.thread_id}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Stream workflow execution with a Command
   *
   * LOW-LEVEL OPERATION: Direct LangGraph API wrapper
   *
   * @param compiledGraph - Already compiled StateGraph
   * @param command - LangGraph Command instance
   * @param config - RunnableConfig with stream mode and thread_id
   * @yields State updates from workflow execution
   *
   * @throws Error if streaming fails
   *
   * Evidence: workflow-execution.service.ts:174-238 (Streaming pattern)
   *
   * @example
   * ```typescript
   * const compiled = graph.compile({ checkpointer });
   * const command = new Command({ resume: { approved: true } });
   * const config = {
   *   configurable: { thread_id: 'thread-123' },
   *   streamMode: 'updates'
   * };
   *
   * for await (const chunk of commandService.streamWithCommand(compiled, command, config)) {
   *   console.log('Update:', chunk);
   * }
   * ```
   */
  async *streamWithCommand<TState extends WorkflowState = WorkflowState>(
    compiledGraph: CompiledStateGraph<TState>,
    command: Command,
    config: RunnableConfig & {
      streamMode?: 'values' | 'updates' | 'messages' | 'custom' | 'debug' | string[];
    }
  ): AsyncIterable<unknown> {
    this.logger.debug(`Streaming graph with Command for thread: ${config.configurable?.thread_id}`);

    try {
      const stream = compiledGraph.stream(command, config);

      for await (const chunk of stream) {
        yield chunk;
      }

      this.logger.log(
        `✅ Command streaming complete for thread: ${config.configurable?.thread_id}`
      );
    } catch (error: any) {
      this.logger.error(
        `❌ Command streaming failed for thread ${config.configurable?.thread_id}:`,
        error.message
      );
      throw error;
    }
  }
}
````

**Quality Requirements**:

- **Functional**: All methods MUST be pure LangGraph API wrappers (no business logic)
- **Functional**: All methods MUST accept pre-compiled graphs (no compilation logic)
- **Functional**: All methods MUST throw errors on failure (no graceful degradation)
- **Non-Functional**: 95th percentile response time < 50ms (excluding LangGraph execution)
- **Pattern Compliance**: MUST NOT contain graph compilation, state sanitization, or workflow resolution

**Files Affected**:

- `libs/langgraph-modules/workflow-engine/src/lib/services/langgraph-command.service.ts` (CREATE)

---

### Component 2: WorkflowResumptionService (NEW)

**Purpose**: High-level workflow resumption orchestration

**Package**: `@hive-academy/langgraph-workflow-engine`

**Location**: `libs/langgraph-modules/workflow-engine/src/lib/services/workflow-resumption.service.ts`

**Pattern**: Orchestration service - compiles graphs, delegates to LangGraphCommandService

**Responsibility**: Orchestrate workflow resumption workflows (compilation + Command execution + sanitization)

**Evidence**:

- Pattern: Similar to WorkflowExecutionService (workflow-execution.service.ts:44) - orchestration pattern
- Compilation pattern: Reuse executeWorkflow() logic (lines 111-152)

---

#### Complete Service Implementation

````typescript
/**
 * WorkflowResumptionService
 *
 * High-level orchestration service for resuming interrupted workflows.
 * Handles graph compilation, StateSnapshot sanitization, workflow class resolution,
 * and delegates to LangGraphCommandService for low-level Command operations.
 *
 * RESPONSIBILITY: Orchestrate workflow resumption workflows
 *
 * Architecture Decision (TASK_2025_049):
 * - Separated from WorkflowExecutionService for SRP compliance
 * - Delegates low-level Command operations to LangGraphCommandService
 * - Handles business logic: compilation, sanitization, validation
 *
 * @see LangGraphCommandService for low-level Command operations
 * @see WorkflowExecutionService for new workflow execution
 * @see HumanApprovalService for HITL integration
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
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

/**
 * Sanitized StateSnapshot with PII/sensitive data removed
 */
export interface SanitizedStateSnapshot<TState extends WorkflowState = WorkflowState> {
  values: TState;
  next: readonly string[];
  config: RunnableConfig;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  parentConfig?: RunnableConfig;
  tasks?: readonly any[];
}

@Injectable()
export class WorkflowResumptionService {
  private readonly logger = new Logger(WorkflowResumptionService.name);
  private readonly checkpointer?: BaseCheckpointSaver;
  private readonly store?: BaseStore;

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

  /**
   * Resume workflow execution from interruption using LangGraph Command pattern
   *
   * HIGH-LEVEL ORCHESTRATION: Compiles graph + delegates Command invocation
   *
   * @param workflowClass - Decorated workflow class (e.g., ResearcherAgent)
   * @param threadId - Thread identifier for the interrupted workflow
   * @param resumeValue - User's approval decision or input data
   * @param checkpointId - Optional checkpoint ID for precise resumption (default: latest)
   * @returns Final workflow state after resumption
   *
   * @throws Error if checkpointer not configured or workflow class invalid
   *
   * Evidence: task-description.md:680-696 (Correct Command pattern)
   * Pattern: Reuse executeWorkflow() compilation logic (workflow-execution.service.ts:111-152)
   *
   * @example
   * ```typescript
   * const result = await resumptionService.resumeWorkflow(
   *   ResearcherAgent,
   *   'thread-123',
   *   { approved: true, feedback: 'Looks good!' }
   * );
   * ```
   */
  async resumeWorkflow<TState extends WorkflowState = WorkflowState>(
    workflowClass: any,
    threadId: string,
    resumeValue: any,
    checkpointId?: string
  ): Promise<TState> {
    this.logger.log(`▶️  Resuming workflow ${workflowClass.name} for thread: ${threadId}`);

    if (!this.checkpointer) {
      throw new Error('Checkpointer not configured - cannot resume workflow');
    }

    try {
      // Step 1: Compile graph (reuse executeWorkflow pattern)
      const compiled = await this.compileWorkflowGraph<TState>(workflowClass);

      // Step 2: Create Command for resumption
      const command = new Command({ resume: resumeValue });

      // Step 3: Build RunnableConfig
      const config: RunnableConfig = {
        configurable: {
          thread_id: threadId,
          ...(checkpointId && { checkpoint_id: checkpointId }),
        },
      };

      // Step 4: Delegate Command invocation to LangGraphCommandService
      const result = await this.commandService.invokeWithCommand<TState>(compiled, command, config);

      this.logger.log(
        `✅ Workflow ${workflowClass.name} resumed successfully for thread ${threadId}`
      );
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Failed to resume workflow for thread ${threadId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get sanitized workflow state snapshot
   *
   * HIGH-LEVEL ORCHESTRATION: Compiles graph + sanitizes StateSnapshot
   *
   * @param workflowClass - Decorated workflow class
   * @param threadId - Thread identifier
   * @returns Sanitized StateSnapshot with PII/sensitive data removed
   *
   * @throws Error if checkpointer not configured or workflow class invalid
   *
   * Evidence: task-description.md:199-241 (StateSnapshot API Contract)
   * Security: task-description.md:886-891 (PII filtering requirement)
   *
   * @example
   * ```typescript
   * const snapshot = await resumptionService.getWorkflowState(
   *   ResearcherAgent,
   *   'thread-123'
   * );
   * console.log('Next nodes:', snapshot.next); // Real next nodes
   * ```
   */
  async getWorkflowState<TState extends WorkflowState = WorkflowState>(
    workflowClass: any,
    threadId: string
  ): Promise<SanitizedStateSnapshot<TState>> {
    this.logger.debug(
      `Retrieving state snapshot for workflow ${workflowClass.name}, thread: ${threadId}`
    );

    if (!this.checkpointer) {
      throw new Error('Checkpointer not configured - cannot retrieve thread state');
    }

    try {
      // Step 1: Compile graph
      const compiled = await this.compileWorkflowGraph<TState>(workflowClass);

      // Step 2: Build RunnableConfig
      const config: RunnableConfig = {
        configurable: { thread_id: threadId },
      };

      // Step 3: Delegate state retrieval to LangGraphCommandService
      const snapshot = await this.commandService.getState<TState>(compiled, config);

      // Step 4: Sanitize StateSnapshot (remove PII/sensitive data)
      const sanitized = this.sanitizeStateSnapshot<TState>(snapshot);

      this.logger.log(
        `✅ State snapshot retrieved for thread: ${threadId}, next: [${sanitized.next.join(', ')}]`
      );
      return sanitized;
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to retrieve state snapshot for thread ${threadId}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Update workflow state without resumption (advanced use case)
   *
   * HIGH-LEVEL ORCHESTRATION: Compiles graph + delegates state update
   *
   * @param workflowClass - Decorated workflow class
   * @param threadId - Thread identifier
   * @param updates - Partial state updates to apply
   * @param asNode - Optional node name to attribute update to
   *
   * @throws Error if checkpointer not configured or workflow class invalid
   *
   * Evidence: task-description.md:651-668 (HITL with State Update - Advanced)
   *
   * @example
   * ```typescript
   * await resumptionService.updateWorkflowState(
   *   ResearcherAgent,
   *   'thread-123',
   *   { metadata: { customField: 'value' } },
   *   'myNode'
   * );
   * ```
   */
  async updateWorkflowState<TState extends WorkflowState = WorkflowState>(
    workflowClass: any,
    threadId: string,
    updates: Partial<TState>,
    asNode?: string
  ): Promise<void> {
    this.logger.debug(`Updating state for workflow ${workflowClass.name}, thread: ${threadId}`);

    if (!this.checkpointer) {
      throw new Error('Checkpointer not configured - cannot update workflow state');
    }

    try {
      // Step 1: Compile graph
      const compiled = await this.compileWorkflowGraph<TState>(workflowClass);

      // Step 2: Build RunnableConfig
      const config: RunnableConfig = {
        configurable: { thread_id: threadId },
      };

      // Step 3: Delegate state update to LangGraphCommandService
      await this.commandService.updateState<TState>(compiled, updates, asNode || null, config);

      this.logger.log(`✅ State updated for thread ${threadId}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to update state for thread ${threadId}:`, error.message);
      throw error;
    }
  }

  /**
   * Compile workflow graph from workflow class
   *
   * INTERNAL HELPER: Reuses executeWorkflow() compilation pattern
   *
   * @param workflowClass - Decorated workflow class
   * @returns Compiled StateGraph ready for Command operations
   *
   * Evidence: workflow-execution.service.ts:111-152 (Graph compilation pattern)
   */
  private async compileWorkflowGraph<TState extends WorkflowState = WorkflowState>(
    workflowClass: any
  ): Promise<any> {
    // Step 1: Get workflow instance from NestJS DI
    const workflowInstance = this.moduleRef.get(workflowClass, { strict: false });

    // Step 2: Extract metadata using MetadataProcessorService
    const definition = this.metadataProcessor.extractWorkflowDefinition<TState>(workflowClass);

    // Step 3: Bind all handlers to instance (fixes 'this' context)
    definition.nodes.forEach((node) => {
      if (node.handler && workflowInstance) {
        node.handler = node.handler.bind(workflowInstance);
      }
    });

    // Step 4: Validate metadata
    this.metadataProcessor.validateWorkflowDefinition(definition);

    // Step 5: Build StateGraph from metadata
    const graph = this.buildStateGraph(definition);

    // Step 6: Compile with checkpointer and store
    const compiled = graph.compile({
      checkpointer: this.checkpointer,
      store: this.store,
    });

    return compiled;
  }

  /**
   * Build StateGraph from WorkflowDefinition
   *
   * INTERNAL HELPER: Delegates to MetadataProcessorService.buildGraph()
   *
   * Evidence: workflow-execution.service.ts:139 (buildStateGraph pattern)
   */
  private buildStateGraph(definition: WorkflowDefinition): any {
    // Delegate to MetadataProcessorService for graph building
    return this.metadataProcessor.buildGraph(definition);
  }

  /**
   * Sanitize StateSnapshot to remove PII/sensitive data
   *
   * SECURITY: Filters sensitive fields before exposing to client
   *
   * @param snapshot - Raw StateSnapshot from LangGraph
   * @returns Sanitized snapshot safe for client exposure
   *
   * Evidence: task-description.md:886-891 (Security Requirements - PII Filtering)
   */
  private sanitizeStateSnapshot<TState extends WorkflowState = WorkflowState>(
    snapshot: StateSnapshot<TState>
  ): SanitizedStateSnapshot<TState> {
    const sanitizedValues = { ...snapshot.values };

    // Remove sensitive fields from state
    // IMPLEMENTATION NOTE: Add actual PII fields to filter based on your domain
    // Example fields: password, apiKey, token, ssn, creditCard, etc.
    const sensitiveFields = ['password', 'apiKey', 'token', 'ssn', 'creditCard'];

    sensitiveFields.forEach((field) => {
      if (field in sanitizedValues) {
        delete (sanitizedValues as any)[field];
      }
    });

    // Filter sensitive metadata
    const sanitizedMetadata = snapshot.metadata ? { ...snapshot.metadata } : undefined;
    if (sanitizedMetadata) {
      sensitiveFields.forEach((field) => {
        if (field in sanitizedMetadata) {
          delete sanitizedMetadata[field];
        }
      });
    }

    return {
      values: sanitizedValues,
      next: snapshot.next,
      config: snapshot.config,
      metadata: sanitizedMetadata,
      createdAt: snapshot.createdAt,
      parentConfig: snapshot.parentConfig,
      tasks: snapshot.tasks,
    };
  }
}
````

**Quality Requirements**:

- **Functional**: MUST compile graph before every operation (no graph caching)
- **Functional**: MUST sanitize StateSnapshot before returning (PII filtering)
- **Functional**: MUST delegate all Command operations to LangGraphCommandService
- **Non-Functional**: 95th percentile response time < 1000ms (including compilation)
- **Security**: MUST filter sensitive fields from StateSnapshot (password, apiKey, token, etc.)
- **Pattern Compliance**: MUST use MetadataProcessorService for graph building

**Files Affected**:

- `libs/langgraph-modules/workflow-engine/src/lib/services/workflow-resumption.service.ts` (CREATE)

---

### Component 3: WorkflowExecutionService Refactoring

**Purpose**: Delegate resumption operations to WorkflowResumptionService

**Pattern**: Deprecation with delegation (backward compatibility)

**Changes**:

1. **Add WorkflowResumptionService dependency** (constructor injection)
2. **Deprecate existing methods** (getStateSnapshot, resumeFromInterruption)
3. **Implement delegation** (forward calls to WorkflowResumptionService)

**Evidence**:

- Service location: workflow-execution.service.ts:44
- Constructor: lines 48-83
- Existing broken methods: lines 351-396, 488-552

---

#### Implementation Pattern

```typescript
// workflow-execution.service.ts (MODIFY)

import { WorkflowResumptionService } from './workflow-resumption.service';

@Injectable()
export class WorkflowExecutionService {
  private readonly logger = new Logger(WorkflowExecutionService.name);
  private readonly checkpointer?: BaseCheckpointSaver;

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
      this.logger.warn(
        '⚠️  WorkflowResumptionService not available - resumption features disabled'
      );
    }
  }

  /**
   * Get workflow state snapshot using compiled graph's getState() method
   *
   * @deprecated Use WorkflowResumptionService.getWorkflowState() instead
   * This method is kept for backward compatibility and delegates to WorkflowResumptionService
   *
   * @param workflowClass - Decorated workflow class
   * @param threadId - Thread identifier
   * @returns StateSnapshot with valid next[] and tasks[] arrays
   *
   * Evidence: TASK_2025_049 (Delegation pattern for SRP compliance)
   */
  async getStateSnapshot<TState extends WorkflowState = WorkflowState>(
    workflowClass: any,
    threadId: string
  ): Promise<StateSnapshot<TState>> {
    if (!this.resumptionService) {
      throw new Error('WorkflowResumptionService not available - cannot retrieve state snapshot');
    }

    this.logger.warn(
      'DEPRECATED: getStateSnapshot() - Use WorkflowResumptionService.getWorkflowState() instead'
    );

    // Delegate to WorkflowResumptionService
    return await this.resumptionService.getWorkflowState<TState>(workflowClass, threadId);
  }

  /**
   * Resume workflow execution from interruption using LangGraph Command pattern
   *
   * @deprecated Use WorkflowResumptionService.resumeWorkflow() instead
   * This method is kept for backward compatibility and delegates to WorkflowResumptionService
   *
   * @param workflowClass - Decorated workflow class
   * @param threadId - Thread identifier
   * @param checkpointId - Checkpoint identifier for resumption point
   * @param resumeValue - User's approval decision or input data
   * @returns Final workflow state after resumption
   *
   * Evidence: TASK_2025_049 (Delegation pattern for SRP compliance)
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

    this.logger.warn(
      'DEPRECATED: resumeFromInterruption() - Use WorkflowResumptionService.resumeWorkflow() instead'
    );

    // Delegate to WorkflowResumptionService
    return await this.resumptionService.resumeWorkflow<TState>(
      workflowClass,
      threadId,
      resumeValue,
      checkpointId
    );
  }

  // Keep existing methods: executeWorkflow(), streamWorkflow(), etc.
  // No changes to these methods
}
```

**Quality Requirements**:

- **Backward Compatibility**: Existing methods MUST continue to work
- **Deprecation Warning**: MUST log deprecation warnings when called
- **Graceful Degradation**: MUST throw clear errors if WorkflowResumptionService unavailable
- **Pattern Compliance**: MUST use @Optional() injection for WorkflowResumptionService

**Files Affected**:

- `libs/langgraph-modules/workflow-engine/src/lib/execution/workflow-execution.service.ts` (MODIFY constructor + 2 methods)

---

### Component 4: HumanApprovalService Integration

**Purpose**: Integrate WorkflowResumptionService for workflow resumption after approval

**Pattern**: Service composition with optional dependency injection

**Changes**:

1. **Add WorkflowResumptionService dependency** (constructor injection - optional)
2. **Enhance processApprovalResponse()** - Resume workflow after approval
3. **Modify requestApproval()** - Store workflowClass in metadata
4. **Add resolveWorkflowClass()** - Helper method to resolve class from name

**Evidence**:

- Service location: human-approval.service.ts:45
- Constructor: lines 49-64
- processApprovalResponse: lines 114-162
- requestApproval: lines 92-109

---

#### Implementation Pattern

```typescript
// human-approval.service.ts (MODIFY)

import { WorkflowResumptionService } from '@hive-academy/langgraph-workflow-engine';

@Injectable()
export class HumanApprovalService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HumanApprovalService.name);
  private readonly approvalCache = new Map<string, HumanApprovalRequest>();

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
      this.logger.warn(
        'WorkflowResumptionService not available - HITL workflow resumption disabled'
      );
    }
  }

  /**
   * Request human approval for a workflow node
   *
   * ARCHITECTURE CHANGE (TASK_2025_049):
   * - Added workflowClass parameter for multi-workflow support
   * - Stores workflowClass in approval metadata for resumption
   *
   * @param executionId - Workflow execution thread ID
   * @param nodeId - Node requesting approval
   * @param message - Approval message for user
   * @param state - Current workflow state
   * @param options - Approval options (timeout, confidence threshold, etc.)
   * @param workflowClass - Workflow class name for resumption (e.g., 'ResearcherAgent')
   */
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

  /**
   * Process human approval response and resume workflow using Command pattern
   *
   * ARCHITECTURE CHANGE (TASK_2025_049):
   * - Added workflow resumption via WorkflowResumptionService.resumeWorkflow()
   * - Extracts workflowClass from approval metadata
   * - Gets checkpoint_id from StateSnapshot for precise resumption
   * - Gracefully degrades if WorkflowResumptionService unavailable
   *
   * @param requestId - Approval request identifier
   * @param response - User's approval decision
   * @returns Approval result + workflow resumption status
   *
   * Evidence: task-description.md:410-461 (Command Class Integration with HITL)
   */
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
          this.logger.warn(
            `Approval ${requestId} missing workflowClass metadata - cannot resume workflow`
          );
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
            this.logger.warn(
              `No checkpoint_id found for thread ${request.executionId} - cannot resume`
            );
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
            this.logger.log(
              `✅ Workflow resumed for thread ${request.executionId} after approval ${requestId}`
            );
          }
        }
      } catch (error: any) {
        this.logger.error(
          `❌ Failed to resume workflow for thread ${request.executionId}:`,
          error.message
        );
        // Don't fail approval processing if resumption fails - graceful degradation
      }
    }

    return { ...result, workflowResumed };
  }

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

  // Keep all existing methods unchanged
}
```

**Quality Requirements**:

- **Functional**: MUST resume workflow if WorkflowResumptionService available
- **Functional**: MUST gracefully degrade if WorkflowResumptionService unavailable
- **Functional**: MUST extract workflowClass from approval metadata
- **Functional**: MUST get checkpoint_id from StateSnapshot
- **Non-Functional**: Approval processing MUST succeed even if resumption fails
- **Pattern Compliance**: MUST use resumeWorkflow(), not direct Command operations

**Files Affected**:

- `libs/langgraph-modules/hitl/src/lib/services/human-approval.service.ts` (MODIFY constructor + 2 methods + ADD resolveWorkflowClass)

---

### Component 5: Integration DTOs & Types

**Purpose**: Type-safe interfaces for new services

**Pattern**: Standard NestJS DTO pattern with class-validator

**Files to Create**:

- `libs/langgraph-modules/workflow-engine/src/lib/dtos/state-snapshot.dto.ts` (CREATE)
- `libs/langgraph-modules/workflow-engine/src/lib/dtos/resume-workflow.dto.ts` (CREATE)
- `libs/langgraph-modules/workflow-engine/src/lib/dtos/index.ts` (MODIFY - add exports)

**Evidence**: Standard NestJS DTO pattern for type safety

---

#### DTO Implementations

```typescript
// state-snapshot.dto.ts (CREATE)
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Request DTO for getWorkflowState() method
 *
 * Validation:
 * - workflowClass: Required string (workflow class name)
 * - threadId: Required string (thread identifier)
 */
export class StateSnapshotRequestDto {
  @IsString()
  @IsNotEmpty()
  readonly workflowClass!: string;

  @IsString()
  @IsNotEmpty()
  readonly threadId!: string;
}
```

```typescript
// resume-workflow.dto.ts (CREATE)
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

/**
 * Request DTO for resumeWorkflow() method
 *
 * Validation:
 * - workflowClass: Required string (workflow class name)
 * - threadId: Required string (thread identifier)
 * - resumeValue: Required object (user's approval decision/input)
 * - checkpointId: Optional string (checkpoint identifier)
 */
export class ResumeWorkflowDto {
  @IsString()
  @IsNotEmpty()
  readonly workflowClass!: string;

  @IsString()
  @IsNotEmpty()
  readonly threadId!: string;

  @IsObject()
  @IsNotEmpty()
  readonly resumeValue!: Record<string, any>;

  @IsString()
  @IsOptional()
  readonly checkpointId?: string;
}

/**
 * Request DTO for updateWorkflowState() method
 */
export class UpdateWorkflowStateDto {
  @IsString()
  @IsNotEmpty()
  readonly workflowClass!: string;

  @IsString()
  @IsNotEmpty()
  readonly threadId!: string;

  @IsObject()
  @IsNotEmpty()
  readonly updates!: Record<string, any>;

  @IsString()
  @IsOptional()
  readonly asNode?: string;
}
```

```typescript
// index.ts (MODIFY - add exports)
export * from './state-snapshot.dto';
export * from './resume-workflow.dto';
```

**Quality Requirements**:

- **Validation**: All fields validated using class-validator
- **Type Safety**: Strong typing for method parameters
- **Documentation**: JSDoc comments for each DTO

**Files Affected**:

- `libs/langgraph-modules/workflow-engine/src/lib/dtos/state-snapshot.dto.ts` (CREATE)
- `libs/langgraph-modules/workflow-engine/src/lib/dtos/resume-workflow.dto.ts` (CREATE)
- `libs/langgraph-modules/workflow-engine/src/lib/dtos/index.ts` (MODIFY)

---

## 🔗 Integration Architecture

### Integration Points

**1. WorkflowResumptionService → LangGraphCommandService**

- **Pattern**: Service composition (high-level → low-level)
- **Evidence**: Similar to WorkflowExecutionService → MetadataProcessorService (workflow-execution.service.ts:49)
- **Dependencies**: Constructor injection

**2. HumanApprovalService → WorkflowResumptionService**

- **Pattern**: Optional dependency injection with graceful degradation
- **Evidence**: workflow-execution.service.ts:58-60 (BaseStore optional pattern)
- **Integration**: processApprovalResponse() calls resumeWorkflow()

**3. WorkflowExecutionService → WorkflowResumptionService**

- **Pattern**: Optional dependency injection (backward compatibility)
- **Evidence**: Existing service refactoring pattern
- **Integration**: Deprecated methods delegate to new service

**4. @RequiresApproval → HumanApprovalService**

- **Pattern**: Decorator invokes service during workflow execution
- **Evidence**: HITL CLAUDE.md:Section 3.2 (@RequiresApproval usage)
- **No Changes**: Existing integration preserved

### Data Flow

```
User Approves Request
  ↓
ResearchChatController.approveReport()
  ↓
HumanApprovalService.processApprovalResponse()
  ↓
Extract workflowClass from approval.metadata
  ↓
WorkflowResumptionService.getWorkflowState(workflowClass, threadId)
  ↓
  ├─ Compile graph (MetadataProcessorService)
  ├─ LangGraphCommandService.getState(compiled, config)
  └─ Sanitize StateSnapshot (PII filtering)
  ↓
Extract checkpoint_id from snapshot.config
  ↓
WorkflowResumptionService.resumeWorkflow(workflowClass, threadId, approvalData, checkpointId)
  ↓
  ├─ Compile graph (MetadataProcessorService)
  ├─ Create Command({ resume: approvalData })
  └─ LangGraphCommandService.invokeWithCommand(compiled, command, config)
  ↓
Workflow resumes → interrupt() returns approval data
  ↓
Node processes approval → returns state update
  ↓
Workflow continues to next node or END
```

**Evidence**: task-description.md:243-257 (HITL Resumption Flow - Official Pattern)

### Dependencies

**Internal Dependencies** (Existing):

- @hive-academy/langgraph-workflow-engine (WorkflowExecutionService, MetadataProcessorService)
- @hive-academy/langgraph-hitl (HumanApprovalService)
- @hive-academy/langgraph-core (WorkflowState types)
- @hive-academy/nestjs-neo4j (Neo4j service - optional)

**External Dependencies** (Existing):

- @langchain/langgraph@1.0.1 (Command class, StateGraph)
- @langchain/langgraph-checkpoint (BaseCheckpointSaver)
- @langchain/core/runnables (RunnableConfig)

**No New Dependencies Required** - all libraries already installed

---

## 🎯 Quality Requirements (Architecture-Level)

### Functional Requirements

**FR-1: Accurate StateSnapshot Retrieval**

- **Requirement**: StateSnapshot.next[] MUST contain correct next nodes (not empty)
- **Acceptance**: When workflow paused at HITL, next array contains approval node name
- **Evidence**: task-description.md:855-858 (User Story: Conversation History Retrieval)

**FR-2: Workflow Resumption After Approval**

- **Requirement**: Workflow MUST continue execution after user approval
- **Acceptance**: interrupt() returns user's decision, node processes it, workflow continues
- **Evidence**: task-description.md:860-867 (User Story: HITL Workflow Resumption)

**FR-3: Multi-Workflow Support**

- **Requirement**: Support ResearcherAgent, DevBrandSupervisor, and future workflows
- **Acceptance**: workflowClass parameter correctly resolves and compiles different graphs
- **Evidence**: task-description.md:869-876 (User Story: Multi-Workflow Support)

### Non-Functional Requirements

**NFR-1: Performance**

- **LangGraphCommandService**: 95th percentile < 50ms per operation (excluding LangGraph execution)
- **WorkflowResumptionService**: 95th percentile < 1000ms per resumption (including compilation)
- **Rationale**: Interactive user experience requires fast response
- **Evidence**: task-description.md:879-884 (Performance Requirements)

**NFR-2: Security**

- **Thread Ownership**: Verify userId matches thread.userId before state retrieval
- **PII Filtering**: Filter sensitive fields from StateSnapshot before exposing to client
- **Input Validation**: All resume inputs validated with DTOs
- **Evidence**: task-description.md:886-891 (Security Requirements)

**NFR-3: Reliability**

- **Neo4j Metadata Preservation**: 100% of approval metadata preserved during resumption
- **Graceful Degradation**: HITL works without WorkflowResumptionService (approvals still processed)
- **Error Recovery**: Resumption failures don't break approval processing
- **Evidence**: task-description.md:900-905 (Reliability Requirements)

### Pattern Compliance

**PC-1: No Direct Checkpointer Manipulation**

- **Requirement**: MUST use graph.getState() and graph.invoke(Command), not checkpointer.getTuple() or checkpointer.put()
- **Rationale**: Direct checkpointer access bypasses LangGraph's graph topology calculations
- **Evidence**: task-description.md:621-658 (No Direct Checkpointer Manipulation Allowed)

**PC-2: Reuse Existing Compilation Pattern**

- **Requirement**: MUST reuse executeWorkflow() compilation pattern for all graph operations
- **Rationale**: Single source of truth for graph building, no duplicate code
- **Evidence**: workflow-execution.service.ts:111-152 (executeWorkflow pattern)

**PC-3: Graceful Degradation**

- **Requirement**: MUST use @Optional() injection for WorkflowResumptionService in HITL
- **Rationale**: HITL approval processing works without workflow resumption
- **Evidence**: workflow-execution.service.ts:58-60 (BaseStore optional pattern)

**PC-4: Single Responsibility Principle**

- **Requirement**: Each service MUST have ONE clear responsibility
- **Rationale**: Testability, maintainability, reusability
- **Evidence**: Clean Architecture principles, NestJS best practices

---

## 🤝 Team-Leader Handoff

### Developer Type Recommendation

**Recommended Developer**: **backend-developer**

**Rationale**:

1. **NestJS Service Development**: Two new services + two service modifications
2. **LangGraph Integration**: Command class usage, graph.getState() implementation
3. **Dependency Injection**: Constructor modification for service integration
4. **No UI Work**: All changes are backend service layer enhancements

### Complexity Assessment

**Complexity**: **MEDIUM**

**Estimated Effort**: **9 hours**

**Breakdown**:

- LangGraphCommandService creation: **2 hours**
- WorkflowResumptionService creation: **3 hours**
- WorkflowExecutionService refactoring (delegation): **1 hour**
- HumanApprovalService integration: **2 hours**
- DTOs creation: **0.5 hours**
- Integration testing: **0.5 hours**

### Files Affected Summary

**CREATE** (2 files):

```
libs/langgraph-modules/workflow-engine/src/lib/services/langgraph-command.service.ts
  - LangGraphCommandService class (150 lines)
  - 4 methods: invokeWithCommand, getState, updateState, streamWithCommand

libs/langgraph-modules/workflow-engine/src/lib/services/workflow-resumption.service.ts
  - WorkflowResumptionService class (250 lines)
  - 3 public methods: resumeWorkflow, getWorkflowState, updateWorkflowState
  - 3 private helpers: compileWorkflowGraph, buildStateGraph, sanitizeStateSnapshot
```

**MODIFY** (3 files):

```
libs/langgraph-modules/workflow-engine/src/lib/execution/workflow-execution.service.ts
  - Constructor: Add WorkflowResumptionService injection (line 48-83)
  - getStateSnapshot(): Add delegation logic + deprecation warning (line 351-396)
  - resumeFromInterruption(): Add delegation logic + deprecation warning (line 488-552)

libs/langgraph-modules/hitl/src/lib/services/human-approval.service.ts
  - Constructor: Add WorkflowResumptionService injection (lines 49-64)
  - requestApproval(): Add workflowClass parameter (lines 92-109)
  - processApprovalResponse(): Add workflow resumption logic (lines 114-162)
  - ADD: resolveWorkflowClass() method (new)

libs/langgraph-modules/workflow-engine/src/lib/dtos/index.ts
  - ADD exports for new DTOs
```

**CREATE** (2 DTOs):

```
libs/langgraph-modules/workflow-engine/src/lib/dtos/state-snapshot.dto.ts
  - StateSnapshotRequestDto class

libs/langgraph-modules/workflow-engine/src/lib/dtos/resume-workflow.dto.ts
  - ResumeWorkflowDto class
  - UpdateWorkflowStateDto class
```

### Critical Verification Points

**Before Implementation, Team-Leader Must Ensure Developer Verifies**:

1. **Command Class Availability**:

   ```bash
   # Verify Command export
   grep "export.*Command" node_modules/@langchain/langgraph/dist/index.d.ts
   # ✅ Expected: export { Command, ... }
   ```

2. **Existing Compilation Pattern**:

   ```typescript
   // Verify pattern in workflow-execution.service.ts:111-152
   // Developer MUST reuse this pattern in WorkflowResumptionService
   const definition = this.metadataProcessor.extractWorkflowDefinition(workflowClass);
   const graph = this.buildStateGraph(definition);
   const compiled = graph.compile({ checkpointer, store });
   ```

3. **StateSnapshot Type Contract**:

   ```typescript
   // Verify StateSnapshot interface has next[] and tasks[]
   // node_modules/@langchain/langgraph/dist/pregel/types.d.ts
   interface StateSnapshot {
     readonly next: Array<string>; // MUST be present
     readonly tasks: PregelTaskDescription[]; // MUST be present
   }
   ```

4. **No Hallucinated APIs**:
   - All imports verified: `import { Command } from '@langchain/langgraph'`
   - All methods verified: `compiled.getState()`, `compiled.invoke()`, `compiled.updateState()`
   - All types verified: `StateSnapshot`, `Command`, `RunnableConfig`

### Architecture Delivery Checklist

- [x] All components specified with evidence citations
- [x] All patterns verified from codebase (executeWorkflow compilation pattern)
- [x] All imports/classes verified as existing (Command, StateGraph, StateSnapshot)
- [x] Quality requirements defined (functional + non-functional)
- [x] Integration points documented (delegation chains)
- [x] Files affected list complete (2 CREATE, 3 MODIFY)
- [x] Developer type recommended (backend-developer)
- [x] Complexity assessed (MEDIUM, 9 hours)
- [x] No step-by-step implementation (that's team-leader's job via tasks.md)
- [x] SRP compliance validated (two services with clear responsibilities)

---

## 📚 References & Evidence

### Codebase Files Analyzed

1. **workflow-execution.service.ts** (200 lines read)

   - Lines 44-83: Service structure and constructor
   - Lines 111-152: executeWorkflow() compilation pattern (REUSE)
   - Lines 174-238: streamWorkflow() implementation
   - Lines 351-396: getStateSnapshot() BROKEN implementation (to deprecate)
   - Lines 488-552: resumeFromInterruption() BROKEN implementation (to deprecate)

2. **human-approval.service.ts** (200 lines read)

   - Lines 45-64: Service structure and constructor
   - Lines 92-109: requestApproval() method
   - Lines 114-162: processApprovalResponse() method

3. **context.md** (314 lines read)
   - Section 1: Task context and user intent (lines 1-53)
   - Section 2: TASK_2025_048 failure analysis (lines 19-52)
   - Section 3: Technical context (lines 54-145)
   - Section 4: Execution strategy (lines 147-248)

### LangGraph API Verification

1. **Command Class Export**:

   - **File**: node_modules/@langchain/langgraph/dist/index.d.ts:1
   - **Evidence**: `export { Command, ... }`
   - **Version**: @langchain/langgraph@1.0.1

2. **StateSnapshot Type Contract**:
   - **File**: @langchain/langgraph/dist/pregel/types.d.ts
   - **Fields**: values, next[], config, metadata, createdAt, parentConfig, tasks[]

### Architectural Decision Records

1. **SRP Service Split**:

   - **Evidence**: Clean Architecture principles, NestJS best practices
   - **Rationale**: Separate low-level Command operations from high-level resumption orchestration

2. **No Direct Checkpointer Manipulation**:

   - **Evidence**: task-description.md:621-658
   - **Rationale**: Bypasses graph topology calculations, produces incorrect next[] and tasks[]

3. **Integration Pattern (Not Replacement)**:

   - **Evidence**: task-description.md:1-11 (Introduction), 370-407 (Integration Requirements)
   - **Rationale**: Preserve 18 HITL services, 6 Neo4j adapters, existing HITL workflows

4. **Multi-Workflow Support**:
   - **Evidence**: task-description.md:362-368 (Multi-Workflow Support gap)
   - **Rationale**: Support ResearcherAgent, DevBrandSupervisor, future workflows

---

## 🚀 Success Criteria

**Validation Checklist** (Before marking task complete):

- [ ] LangGraphCommandService created with 4 methods (invokeWithCommand, getState, updateState, streamWithCommand)
- [ ] WorkflowResumptionService created with 3 public methods (resumeWorkflow, getWorkflowState, updateWorkflowState)
- [ ] WorkflowExecutionService refactored to delegate to WorkflowResumptionService
- [ ] WorkflowExecutionService logs deprecation warnings for old methods
- [ ] HumanApprovalService integrated with WorkflowResumptionService
- [ ] HumanApprovalService.processApprovalResponse() calls resumeWorkflow()
- [ ] workflowClass stored in approval metadata during requestApproval()
- [ ] workflowClass retrieved from metadata during processApprovalResponse()
- [ ] StateSnapshot contains valid next[] array (not always empty)
- [ ] StateSnapshot contains valid tasks[] array (not always empty when pending)
- [ ] Workflow actually resumes after approval (not just checkpoint update)
- [ ] Thread ownership verified before state retrieval (security)
- [ ] PII filtered from StateSnapshot before exposure (security)
- [ ] Input validated with DTOs on resume operations (security)
- [ ] Integration tests pass for ResearcherAgent HITL flow
- [ ] Integration tests pass for DevBrandSupervisor HITL flow
- [ ] Existing @RequiresApproval workflows continue working
- [ ] Neo4j HITL metadata preserved during resumption
- [ ] No direct checkpointer manipulation in implementation
- [ ] No parallel service implementations created
- [ ] All services follow Single Responsibility Principle

---

## 🏁 Conclusion

This implementation plan provides a comprehensive, evidence-based architecture for integrating LangGraph's Command pattern into the existing HITL infrastructure with **improved SRP compliance**. The design:

1. **Creates Two Specialized Services**: LangGraphCommandService (low-level) + WorkflowResumptionService (high-level)
2. **Preserves All Infrastructure**: Zero changes to 18 HITL services, 6 Neo4j adapters, HumanApprovalNode
3. **Follows Codebase Patterns**: Reuses executeWorkflow() compilation pattern, optional injection for graceful degradation
4. **Evidence-Based**: Every architectural decision backed by codebase citations (file:line references)
5. **No Assumptions**: All imports verified (Command class), all methods verified (getState(), invoke()), all patterns extracted from real code

**Key Deliverables**:

- **Component Specifications**: 2 new services + 2 refactored services with exact TypeScript signatures
- **Integration Points**: Clear delegation chains (HumanApprovalService → WorkflowResumptionService → LangGraphCommandService)
- **Quality Requirements**: Functional (accurate StateSnapshot, workflow resumption) + Non-functional (performance, security, reliability)
- **Files Affected**: 2 CREATE (services), 3 MODIFY (integrations), 2 CREATE (DTOs)
- **Complexity**: MEDIUM (9 hours for backend-developer)

**Next Step**: Team-leader will decompose this architecture into atomic, git-verifiable tasks in tasks.md.
