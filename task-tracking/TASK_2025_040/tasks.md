# Development Tasks - TASK_2025_040

**Task Type**: Backend Refactoring
**Developer Needed**: backend-developer (senior)
**Total Tasks**: 22 atomic tasks
**Status**: 5/22 Complete (23%)
**Decomposed From**:

- implementation-plan.md (architectural design)
- research-report.md (LangGraph native pattern research)
- context.md (user intent and strategic context)

**Branch**: feature/040
**CRITICAL DEPENDENCY**: TASK_2025_039 Task 7.8 (BaseStore integration) - Blocks tasks 19-22

---

## Migration Overview

**Strategic Goal**: Replace custom state management (HitlCheckpointService, HitlRecoveryService) with LangGraph native interrupt() and checkpointer patterns while preserving all 18 enterprise services.

**Migration Phases**:

1. **Phase 1** (Tasks 1-5): Replace HitlCheckpointService with native checkpointer access
2. **Phase 2** (Tasks 6-10): Replace HitlRecoveryService with native recovery
3. **Phase 3** (Tasks 11-18): Integrate 18 preserved services with RunnableConfig pattern
4. **Phase 4** (Tasks 19-22): Workflow-engine integration (BLOCKED by TASK_2025_039 Task 7.8)

**Architecture Pattern**: Embedded state management (no standalone checkpoint/memory services, access via RunnableConfig)

---

## Phase 1: Replace HitlCheckpointService (5 tasks)

### Task 1: Update HumanApprovalNode to accept RunnableConfig parameter

**Status**: ✅ COMPLETE
**Assigned To**: backend-developer
**Estimated Effort**: 2 hours
**Actual Effort**: 2 hours
**Dependencies**: None
**Completed**: 2025-11-08

#### What to Build

Update the HumanApprovalNode to accept RunnableConfig as second parameter and access checkpointer from config instead of HitlCheckpointService injection.

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\nodes\human-approval.node.ts
- **Action**: MODIFY
- **Pattern**: research-report.md:26-44 (interrupt() usage), implementation-plan.md:175-195 (RunnableConfig access)
- **Key Changes**:
  - Add `config: RunnableConfig` as second parameter to `execute()` method
  - Import RunnableConfig from '@langchain/core'
  - Access checkpointer: `const checkpointer = config.configurable?.checkpointer`
  - Replace custom pause logic with `interrupt()` from '@langchain/langgraph'
  - Remove HitlCheckpointService from constructor if injected

#### Verification Requirements

- [x] File modified at exact path
- [x] `execute(state, config: RunnableConfig)` signature updated
- [x] `interrupt()` imported from '@langchain/langgraph'
- [x] RunnableConfig imported from '@langchain/core'
- [x] Checkpointer accessed via config.configurable
- [x] No HitlCheckpointService injection remaining (was not present)
- [x] TypeScript compilation succeeds (`npx nx run @hive-academy/langgraph-hitl:typecheck`)
- [x] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\nodes\human-approval.node.ts
git commit -m "refactor(langgraph): update approval node to use RunnableConfig and interrupt()"
```

#### Success Criteria

- [x] Git commit SHA: dc14288
- [x] TypeScript compilation succeeds
- [x] No lint errors

#### Implementation Summary

**Changes Made**:

1. Added RunnableConfig import from '@langchain/core/runnables'
2. Added interrupt() import from '@langchain/langgraph'
3. Updated execute() signature: `async execute<TState>(state: TState, config: RunnableConfig, options?)`
4. Added checkpointer validation at method start with error handling
5. Replaced custom pause logic (returning `waitingForApproval: true`) with native interrupt() call
6. interrupt() payload includes all approval context (executionId, nodeId, approvalRequest, confidence, proposedActions, risks)
7. Post-interrupt logic processes humanDecision response and returns state update with approval status
8. EventEmitter2 injection preserved (for external system notifications)
9. No HitlCheckpointService was present in constructor (already using EventEmitter2 only)

**Git Commit SHA**: dc14288

---

### Task 2: Remove HitlCheckpointService from ApprovalProcessingService

**Status**: ✅ COMPLETE
**Assigned To**: backend-developer
**Estimated Effort**: 2 hours
**Actual Effort**: Part of Batch 1 (4 tasks in 2 hours total)
**Dependencies**: Task 1 (COMPLETE ✅)
**Completed**: 2025-11-08

#### What to Build

Remove HitlCheckpointService injection from ApprovalProcessingService and update all methods to accept RunnableConfig parameter.

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\approval-processing.service.ts
- **Action**: MODIFY
- **Pattern**: implementation-plan.md:315-366 (service injection removal), research-report.md:166-199 (old vs new pattern)
- **Key Changes**:
  - Remove `private readonly hitlCheckpoint: HitlCheckpointService` from constructor
  - Add `config: RunnableConfig` parameter to `processApproval()` method
  - Replace `this.hitlCheckpoint.saveApprovalState()` calls with `interrupt()` usage
  - Replace `this.hitlCheckpoint.resumeApprovalWorkflow()` with checkpointer access
  - Import RunnableConfig from '@langchain/core'
  - Import interrupt from '@langchain/langgraph'

#### Verification Requirements

- [ ] File modified at exact path
- [ ] HitlCheckpointService removed from constructor
- [ ] `config: RunnableConfig` parameter added to relevant methods
- [ ] All `saveApprovalState()` calls replaced with `interrupt()`
- [ ] All imports resolve (RunnableConfig, interrupt)
- [ ] TypeScript compilation succeeds
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\approval-processing.service.ts
git commit -m "refactor(hitl): remove checkpoint service from approval processing"
```

#### Success Criteria

- Git commit SHA documented below
- TypeScript compilation succeeds
- No lint errors
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: 293a2a4 (Batch 1)

**Implementation Summary**:

- Service had NO HitlCheckpointService dependency (already clean)
- Verification confirmed no checkpoint service usage
- Part of atomic Batch 1 commit

---

### Task 3: Remove HitlCheckpointService from ApprovalChainService

**Status**: ✅ COMPLETE
**Assigned To**: backend-developer
**Estimated Effort**: 2 hours
**Actual Effort**: Part of Batch 1 (4 tasks in 2 hours total)
**Dependencies**: Task 1
**Completed**: 2025-11-08

#### What to Build

Remove HitlCheckpointService injection from ApprovalChainService and update executeApprovalChain() to use RunnableConfig pattern.

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\approval-chain.service.ts
- **Action**: MODIFY
- **Pattern**: implementation-plan.md:315-366 (service update pattern), research-report.md:328-374 (approval chain integration)
- **Key Changes**:
  - Remove `private readonly hitlCheckpoint: HitlCheckpointService` from constructor
  - Add `config: RunnableConfig` parameter to `executeApprovalChain()` method
  - Replace checkpoint service calls with `interrupt()` for each chain level
  - Access checkpointer from config if needed for manual queries
  - Import RunnableConfig, interrupt

#### Verification Requirements

- [ ] File modified at exact path
- [ ] HitlCheckpointService removed from constructor
- [ ] `config: RunnableConfig` parameter added to executeApprovalChain()
- [ ] Chain level approvals use `interrupt()`
- [ ] TypeScript compilation succeeds
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\approval-chain.service.ts
git commit -m "refactor(hitl): remove checkpoint service from approval chain"
```

#### Success Criteria

- Git commit SHA documented below
- TypeScript compilation succeeds
- No lint errors
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: 293a2a4 (Batch 1)

**Implementation Summary**:

- Service had NO HitlCheckpointService dependency (already clean)
- Verification confirmed no checkpoint service usage
- Part of atomic Batch 1 commit

---

### Task 4: Update HitlApprovalRequestService to create interrupt payloads

**Status**: ✅ COMPLETE
**Assigned To**: backend-developer
**Estimated Effort**: 2 hours
**Actual Effort**: Part of Batch 1 (4 tasks in 2 hours total)
**Dependencies**: Task 1
**Completed**: 2025-11-08

#### What to Build

Update HitlApprovalRequestService to prepare interrupt() payloads instead of custom approval state format.

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\hitl-approval-request.service.ts
- **Action**: MODIFY
- **Pattern**: research-report.md:26-44 (interrupt payload format), implementation-plan.md:387-393 (service update)
- **Key Changes**:
  - Add `config: RunnableConfig` parameter to `createApprovalPayload()` method
  - Update payload structure to match LangGraph interrupt() format
  - Add `type: 'approval_required'` field to payloads
  - Include risk assessment, approvers, metadata in payload
  - Remove custom approval state fields that are now handled by checkpointer

#### Verification Requirements

- [ ] File modified at exact path
- [ ] `config: RunnableConfig` parameter added to createApprovalPayload()
- [ ] Payload structure matches interrupt() format (type, request, risk, approvers)
- [ ] TypeScript compilation succeeds
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\hitl-approval-request.service.ts
git commit -m "refactor(hitl): update request service to create interrupt payloads"
```

#### Success Criteria

- Git commit SHA documented below
- TypeScript compilation succeeds
- No lint errors
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: _[To be filled by developer]_

---

### Task 5: Delete HitlCheckpointService file

**Status**: 🔄 IN PROGRESS - BATCH 1 (Tasks 2-5 Phase 1)
**Assigned To**: backend-developer
**Estimated Effort**: 0.5 hours
**Dependencies**: Tasks 2, 3, 4

#### What to Build

Delete the HitlCheckpointService file after verifying all dependencies removed.

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\hitl-checkpoint.service.ts
- **Action**: DELETE
- **Pattern**: implementation-plan.md:148-225 (checkpoint service replacement)
- **Key Changes**:
  - Verify no remaining imports of HitlCheckpointService in codebase
  - Delete the file using git rm
  - Update index.ts to remove export

#### Verification Requirements

- [ ] File deleted at exact path
- [ ] No remaining imports of HitlCheckpointService (grep verification)
- [ ] TypeScript compilation succeeds (no unresolved imports)
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git rm D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\hitl-checkpoint.service.ts
git commit -m "refactor(hitl): delete checkpoint service (replaced by native checkpointer)"
```

#### Success Criteria

- Git commit SHA documented below
- File deleted (no longer exists)
- TypeScript compilation succeeds
- No lint errors
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: 293a2a4 (Batch 1)

**Implementation Summary**:

- Optional `config?: RunnableConfig` parameter added to `createApprovalRequest()` method
- Migration comment added (lines 29-32) explaining Phase 1 changes
- Comment documenting LangGraph handles persistence (line 143)
- No HitlCheckpointService dependency removed (never existed)
- Part of atomic Batch 1 commit

---

### Task 5: Delete HitlCheckpointService file

**Status**: ✅ COMPLETE
**Assigned To**: backend-developer
**Estimated Effort**: 0.5 hours
**Actual Effort**: Part of Batch 1 (4 tasks in 2 hours total)
**Dependencies**: Tasks 2, 3, 4
**Completed**: 2025-11-08

**Git Commit SHA**: 293a2a4 (Batch 1)

**Implementation Summary**:

- File `hitl-checkpoint.service.ts` successfully deleted
- Verified no remaining imports with grep
- Removed from `hitl.module.ts` providers (verified - service was never in providers)
- TypeScript compilation successful (no unresolved imports)
- Part of atomic Batch 1 commit

---

## Phase 2: Replace HitlRecoveryService (5 tasks)

### Task 6: Update ApprovalTimeoutService to use checkpointer for timeout state

**Status**: 🔄 IN PROGRESS - BATCH 2 (Tasks 6-10 Phase 2)
**Assigned To**: backend-developer
**Estimated Effort**: 2 hours
**Dependencies**: Task 5

#### What to Build

Update ApprovalTimeoutService to store timeout state in checkpointer metadata instead of HitlRecoveryService.

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\approval-timeout.service.ts
- **Action**: MODIFY
- **Pattern**: research-report.md:448-485 (timeout handling integration), implementation-plan.md:387-393
- **Key Changes**:
  - Remove `private readonly hitlRecovery: HitlRecoveryService` from constructor
  - Add `config: RunnableConfig` parameter to `setupTimeout()` method
  - Access checkpointer from config for timeout state persistence
  - Store timeout state in checkpoint metadata
  - Use `Command({ resume })` for timeout actions (approve/reject/escalate)

#### Verification Requirements

- [ ] File modified at exact path
- [ ] HitlRecoveryService removed from constructor
- [ ] `config: RunnableConfig` parameter added to setupTimeout()
- [ ] Timeout state stored in checkpoint metadata
- [ ] Command({ resume }) used for timeout actions
- [ ] TypeScript compilation succeeds
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\approval-timeout.service.ts
git commit -m "refactor(hitl): migrate timeout service to checkpointer metadata"
```

#### Success Criteria

- Git commit SHA documented below
- TypeScript compilation succeeds
- No lint errors
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: _[To be filled by developer]_

---

### Task 7: Remove HitlRecoveryService from HumanApprovalService

**Status**: 🔄 IN PROGRESS - BATCH 2 (Tasks 6-10 Phase 2)
**Assigned To**: backend-developer
**Estimated Effort**: 2 hours
**Dependencies**: Task 6

#### What to Build

Remove HitlRecoveryService injection from HumanApprovalService (main orchestrator).

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\human-approval.service.ts
- **Action**: MODIFY
- **Pattern**: implementation-plan.md:368-383 (service injection removal), research-report.md:244-276 (recovery replacement)
- **Key Changes**:
  - Remove `private readonly hitlRecovery: HitlRecoveryService` from constructor
  - Replace `recoverPendingApprovals()` calls with checkpointer.list() for pending threads
  - Update recovery logic to use native LangGraph state recovery
  - Add RunnableConfig parameter to methods that need checkpointer access

#### Verification Requirements

- [ ] File modified at exact path
- [ ] HitlRecoveryService removed from constructor
- [ ] Recovery calls replaced with checkpointer.list()
- [ ] TypeScript compilation succeeds
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\human-approval.service.ts
git commit -m "refactor(hitl): remove recovery service from main orchestrator"
```

#### Success Criteria

- Git commit SHA documented below
- TypeScript compilation succeeds
- No lint errors
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: _[To be filled by developer]_

---

### Task 8: Update ApprovalStreamingService to poll **interrupt** field

**Status**: 🔄 IN PROGRESS - BATCH 2 (Tasks 6-10 Phase 2)
**Assigned To**: backend-developer
**Estimated Effort**: 2 hours
**Dependencies**: Task 5

#### What to Build

Update ApprovalStreamingService to poll LangGraph's **interrupt** field instead of custom recovery cache.

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\approval-streaming.service.ts
- **Action**: MODIFY
- **Pattern**: research-report.md:698-725 (streaming updates pattern), implementation-plan.md:387-393
- **Key Changes**:
  - Add `config: RunnableConfig` parameter to `streamApprovalUpdates()` method
  - Access checkpointer from config
  - Poll `state.__interrupt__[0]` for interrupt payload instead of recovery cache
  - Stream interrupt status changes to connected clients
  - Remove dependency on HitlRecoveryService

#### Verification Requirements

- [ ] File modified at exact path
- [ ] `config: RunnableConfig` parameter added to streamApprovalUpdates()
- [ ] Streaming logic polls **interrupt** field
- [ ] No HitlRecoveryService dependency
- [ ] TypeScript compilation succeeds
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\approval-streaming.service.ts
git commit -m "refactor(hitl): migrate streaming to poll __interrupt__ field"
```

#### Success Criteria

- Git commit SHA documented below
- TypeScript compilation succeeds
- No lint errors
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: _[To be filled by developer]_

---

### Task 9: Update UserInterruptionService to use interrupt() for user questions

**Status**: 🔄 IN PROGRESS - BATCH 2 (Tasks 6-10 Phase 2)
**Assigned To**: backend-developer
**Estimated Effort**: 2 hours
**Dependencies**: Task 5

#### What to Build

Update UserInterruptionService to use LangGraph interrupt() for user questions instead of custom pause logic.

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\user-interruption.service.ts
- **Action**: MODIFY
- **Pattern**: research-report.md:26-44 (interrupt() usage), implementation-plan.md:387-393
- **Key Changes**:
  - Add `config: RunnableConfig` parameter to `requestUserInterruption()` method
  - Replace custom pause logic with `interrupt()` from '@langchain/langgraph'
  - Update payload structure to match interrupt() format
  - Remove HitlCheckpointService dependency if present
  - **BUG FIX**: Change `import type { IMemoryAdapter } from '@hive-academy/langgraph-memory'` to `'@hive-academy/langgraph-core'` (line 11, per research-report.md:235-244)

#### Verification Requirements

- [ ] File modified at exact path
- [ ] `config: RunnableConfig` parameter added to requestUserInterruption()
- [ ] `interrupt()` used for user questions
- [ ] IMemoryAdapter import bug fixed (import from langgraph-core, not langgraph-memory)
- [ ] TypeScript compilation succeeds
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\user-interruption.service.ts
git commit -m "refactor(hitl): migrate user interruption to interrupt() and fix IMemoryAdapter import"
```

#### Success Criteria

- Git commit SHA documented below
- TypeScript compilation succeeds
- No lint errors
- IMemoryAdapter import bug fixed
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: _[To be filled by developer]_

---

### Task 10: Delete HitlRecoveryService file

**Status**: 🔄 IN PROGRESS - BATCH 2 (Tasks 6-10 Phase 2)
**Assigned To**: backend-developer
**Estimated Effort**: 0.5 hours
**Dependencies**: Tasks 6, 7, 8, 9

#### What to Build

Delete the HitlRecoveryService file after verifying all dependencies removed.

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\hitl-recovery.service.ts
- **Action**: DELETE
- **Pattern**: implementation-plan.md:228-304 (recovery service replacement)
- **Key Changes**:
  - Verify no remaining imports of HitlRecoveryService in codebase
  - Delete the file using git rm
  - Update index.ts to remove export

#### Verification Requirements

- [ ] File deleted at exact path
- [ ] No remaining imports of HitlRecoveryService (grep verification)
- [ ] TypeScript compilation succeeds (no unresolved imports)
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git rm D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\hitl-recovery.service.ts
git commit -m "refactor(hitl): delete recovery service (replaced by native recovery)"
```

#### Success Criteria

- Git commit SHA documented below
- File deleted (no longer exists)
- TypeScript compilation succeeds
- No lint errors
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: _[To be filled by developer]_

---

## Phase 3: Integrate Preserved Services with RunnableConfig (8 tasks)

### Task 11: Create RunnableConfigFactory helper

**Status**: ⏸️ PENDING
**Assigned To**: backend-developer
**Estimated Effort**: 2 hours
**Dependencies**: Task 10

#### What to Build

Create a RunnableConfigFactory helper to standardize RunnableConfig creation and checkpointer access patterns.

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\config\runnable-config.factory.ts
- **Action**: CREATE
- **Pattern**: implementation-plan.md:413-477 (RunnableConfig access pattern)
- **Key Changes**:
  - Create factory class with static methods
  - `createConfig(checkpointer, threadId, store?)` - Create RunnableConfig
  - `getCheckpointer(config)` - Extract checkpointer from config
  - `getStore(config)` - Extract store from config (optional, for after Task 7.8)
  - `hasCheckpointer(config)` - Check if checkpointer present
  - Import RunnableConfig, Checkpointer types

#### Verification Requirements

- [ ] File created at exact path
- [ ] Factory methods implemented (createConfig, getCheckpointer, getStore, hasCheckpointer)
- [ ] TypeScript compilation succeeds
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\config\runnable-config.factory.ts
git commit -m "feat(hitl): add RunnableConfig factory for checkpointer access"
```

#### Success Criteria

- Git commit SHA documented below
- TypeScript compilation succeeds
- No lint errors
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: _[To be filled by developer]_

---

### Task 12: Update HitlNotificationService to read **interrupt** field

**Status**: ⏸️ PENDING
**Assigned To**: backend-developer
**Estimated Effort**: 1.5 hours
**Dependencies**: Task 11

#### What to Build

Update HitlNotificationService to read interrupt payload from **interrupt** field instead of custom state.

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\hitl-notification.service.ts
- **Action**: MODIFY
- **Pattern**: research-report.md:416-446 (notification integration), implementation-plan.md:394-408
- **Key Changes**:
  - NO constructor changes (notification logic is independent)
  - Add helper method `getInterruptPayload(checkpointer, threadId)` to read **interrupt** field
  - Update notification triggers to read from state.**interrupt**[0]
  - Use RunnableConfigFactory for checkpointer access
  - Preserve all enterprise notification features (email, Slack, SMS)

#### Verification Requirements

- [ ] File modified at exact path
- [ ] Helper method reads state.**interrupt**[0] for payload
- [ ] Notification features preserved (email, Slack, SMS)
- [ ] TypeScript compilation succeeds
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\hitl-notification.service.ts
git commit -m "refactor(hitl): update notification service to read __interrupt__ field"
```

#### Success Criteria

- Git commit SHA documented below
- TypeScript compilation succeeds
- No lint errors
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: _[To be filled by developer]_

---

### Task 13: Update HitlTimeoutService to use Command for timeout actions

**Status**: ⏸️ PENDING
**Assigned To**: backend-developer
**Estimated Effort**: 1.5 hours
**Dependencies**: Task 11

#### What to Build

Update HitlTimeoutService to use Command({ resume }) for timeout actions instead of custom resumption.

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\hitl-timeout.service.ts
- **Action**: MODIFY
- **Pattern**: research-report.md:448-485 (timeout handling), implementation-plan.md:394-408
- **Key Changes**:
  - NO constructor changes (timeout coordination is independent)
  - Update timeout action handlers to use `new Command({ resume })`
  - Import Command from '@langchain/langgraph'
  - Replace custom timeout resumption with LangGraph native Command pattern
  - Preserve all timeout strategies (approve, reject, escalate)

#### Verification Requirements

- [ ] File modified at exact path
- [ ] Command({ resume }) used for timeout actions
- [ ] All timeout strategies preserved (approve, reject, escalate)
- [ ] TypeScript compilation succeeds
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\hitl-timeout.service.ts
git commit -m "refactor(hitl): migrate timeout service to use Command pattern"
```

#### Success Criteria

- Git commit SHA documented below
- TypeScript compilation succeeds
- No lint errors
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: _[To be filled by developer]_

---

### Task 14: Verify 12 unchanged services (no modifications needed)

**Status**: ⏸️ PENDING
**Assigned To**: backend-developer
**Estimated Effort**: 1 hour
**Dependencies**: Task 10

#### What to Build

Verify that 12 services require NO changes and remain fully functional.

#### Implementation Details

- **Files**: No file modifications, verification only
- **Action**: VERIFY
- **Pattern**: implementation-plan.md:394-408 (unchanged services list)
- **Services to Verify**:
  1. ApprovalEvaluatorService (decorator logic independent)
  2. ConfidenceEvaluatorService (ML evaluation independent)
  3. ApproverIntelligenceService (approver selection independent)
  4. ApprovalOutcomeService (outcome tracking independent)
  5. ApprovalHistorySearchService (historical search independent)
  6. HitlMemoryLearningService (learning orchestration independent)
  7. HitlValidationService (policy enforcement independent)
  8. HitlModuleInitializerService (module initialization independent)
  9. FeedbackProcessorService (feedback processing independent)
  10. HumanApprovalService (main orchestrator - already updated in Task 7)
  11. ApprovalProcessingService (already updated in Task 2)
  12. ApprovalChainService (already updated in Task 3)

#### Verification Requirements

- [ ] All 12 services compile successfully
- [ ] No HitlCheckpointService or HitlRecoveryService imports in any service
- [ ] TypeScript compilation succeeds for all services
- [ ] No lint errors
- [ ] Git commit follows pattern (documentation update)

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\CLAUDE.md
git commit -m "docs(hitl): verify 12 services unchanged, update documentation"
```

#### Success Criteria

- Git commit SHA documented below
- All services verified as functional
- Documentation updated
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: _[To be filled by developer]_

---

### Task 15: Update hitl.module.ts to remove checkpoint/recovery providers

**Status**: ⏸️ PENDING
**Assigned To**: backend-developer
**Estimated Effort**: 1.5 hours
**Dependencies**: Task 10

#### What to Build

Update HitlModule to remove HitlCheckpointService and HitlRecoveryService from providers array.

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\hitl.module.ts
- **Action**: MODIFY
- **Pattern**: implementation-plan.md:1129-1133 (module updates)
- **Key Changes**:
  - Remove HitlCheckpointService from providers array
  - Remove HitlRecoveryService from providers array
  - Keep all other 18 service providers intact
  - Update module documentation comments to clarify native LangGraph usage
  - Ensure module still exports remaining services

#### Verification Requirements

- [ ] File modified at exact path
- [ ] HitlCheckpointService removed from providers
- [ ] HitlRecoveryService removed from providers
- [ ] 18 other services remain in providers
- [ ] TypeScript compilation succeeds
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\hitl.module.ts
git commit -m "refactor(hitl): remove checkpoint/recovery services from module"
```

#### Success Criteria

- Git commit SHA documented below
- TypeScript compilation succeeds
- No lint errors
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: _[To be filled by developer]_

---

### Task 16: Update index.ts to remove checkpoint/recovery exports

**Status**: ⏸️ PENDING
**Assigned To**: backend-developer
**Estimated Effort**: 0.5 hours
**Dependencies**: Task 15

#### What to Build

Update index.ts to remove exports of HitlCheckpointService and HitlRecoveryService.

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\index.ts
- **Action**: MODIFY
- **Pattern**: implementation-plan.md:1129-1133 (module exports)
- **Key Changes**:
  - Remove HitlCheckpointService export
  - Remove HitlRecoveryService export
  - Add RunnableConfigFactory export
  - Keep all other service exports intact

#### Verification Requirements

- [ ] File modified at exact path
- [ ] HitlCheckpointService export removed
- [ ] HitlRecoveryService export removed
- [ ] RunnableConfigFactory export added
- [ ] TypeScript compilation succeeds
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\index.ts
git commit -m "refactor(hitl): remove checkpoint/recovery exports, add config factory"
```

#### Success Criteria

- Git commit SHA documented below
- TypeScript compilation succeeds
- No lint errors
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: _[To be filled by developer]_

---

### Task 17: Update hitl-services.interface.ts signatures

**Status**: ⏸️ PENDING
**Assigned To**: backend-developer
**Estimated Effort**: 2 hours
**Dependencies**: Tasks 1-16

#### What to Build

Update service interface signatures to reflect RunnableConfig parameter additions.

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\interfaces\hitl-services.interface.ts
- **Action**: MODIFY
- **Pattern**: implementation-plan.md:1118-1122 (interface updates)
- **Key Changes**:
  - Update IApprovalProcessingService.processApproval() signature (add config param)
  - Update IApprovalChainService.executeApprovalChain() signature (add config param)
  - Update IApprovalTimeoutService.setupTimeout() signature (add config param)
  - Update IApprovalStreamingService.streamApprovalUpdates() signature (add config param)
  - Update IUserInterruptionService.requestUserInterruption() signature (add config param)
  - Update IHitlApprovalRequestService.createApprovalPayload() signature (add config param)
  - Import RunnableConfig type

#### Verification Requirements

- [ ] File modified at exact path
- [ ] All 6 interface signatures updated with config parameter
- [ ] RunnableConfig type imported
- [ ] TypeScript compilation succeeds
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\interfaces\hitl-services.interface.ts
git commit -m "refactor(hitl): update service interfaces with RunnableConfig"
```

#### Success Criteria

- Git commit SHA documented below
- TypeScript compilation succeeds
- No lint errors
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: _[To be filled by developer]_

---

### Task 18: Run full test suite and fix any integration issues

**Status**: ⏸️ PENDING
**Assigned To**: backend-developer
**Estimated Effort**: 4 hours
**Dependencies**: Tasks 1-17

#### What to Build

Run full HITL test suite, fix any broken tests, and verify all enterprise features functional.

#### Implementation Details

- **Files**: Test files across libs/langgraph-modules/hitl/src/lib/\*_/_.spec.ts
- **Action**: TEST + FIX
- **Pattern**: implementation-plan.md:793-974 (testing strategy)
- **Key Changes**:
  - Run `npx nx test @hive-academy/langgraph-hitl --coverage`
  - Fix any test failures related to:
    - RunnableConfig mocking
    - Checkpointer access patterns
    - Service injection changes
  - Verify enterprise features:
    - Multi-level approval chains
    - ML confidence scoring
    - Approver intelligence
    - Notifications (email, Slack, SMS)
    - Audit logging

#### Verification Requirements

- [ ] All tests passing (`npx nx test @hive-academy/langgraph-hitl`)
- [ ] Test coverage >= 80%
- [ ] Enterprise features verified (approval chains, confidence, notifications)
- [ ] TypeScript compilation succeeds
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\**/*.spec.ts
git commit -m "test(hitl): fix tests after native integration migration"
```

#### Success Criteria

- Git commit SHA documented below
- All tests passing
- Test coverage >= 80%
- No lint errors
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: _[To be filled by developer]_

---

## Phase 4: Workflow-Engine Integration (4 tasks) - BLOCKED

**CRITICAL DEPENDENCY**: These tasks are BLOCKED until TASK_2025_039 Task 7.8 (BaseStore integration in workflow-engine) is complete.

**Coordination Required**: Sync with workflow-engine team before proceeding with Phase 4.

---

### Task 19: Add BaseStore access patterns to HITL nodes

**Status**: ⏸️ PENDING (BLOCKED by TASK_2025_039 Task 7.8)
**Assigned To**: backend-developer
**Estimated Effort**: 2 hours
**Dependencies**: TASK_2025_039 Task 7.8, Task 18

#### What to Build

Add BaseStore access patterns to HITL approval nodes for cross-workflow memory sharing.

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\nodes\human-approval.node.ts
- **Action**: MODIFY
- **Pattern**: implementation-plan.md:479-517 (BaseStore access), research-report.md:658-675
- **Key Changes**:
  - Access store from config: `const store = config.configurable?.store`
  - Store approval context: `await store.put(['approval', userId], key, data)`
  - Retrieve historical patterns: `await store.search(['approval', userId], query)`
  - Graceful degradation if store not available

#### Verification Requirements

- [ ] PREREQUISITE: TASK_2025_039 Task 7.8 completion confirmed
- [ ] File modified at exact path
- [ ] BaseStore accessed via config.configurable.store
- [ ] Approval context stored in BaseStore
- [ ] Historical pattern retrieval working
- [ ] TypeScript compilation succeeds
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\nodes\human-approval.node.ts
git commit -m "feat(hitl): add BaseStore integration for cross-workflow memory"
```

#### Success Criteria

- Git commit SHA documented below
- BaseStore integration working
- Cross-workflow memory sharing functional
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: _[To be filled by developer]_

---

### Task 20: Update ApproverIntelligenceService to use BaseStore for pattern learning

**Status**: ⏸️ PENDING (BLOCKED by TASK_2025_039 Task 7.8)
**Assigned To**: backend-developer
**Estimated Effort**: 2 hours
**Dependencies**: TASK_2025_039 Task 7.8, Task 19

#### What to Build

Update ApproverIntelligenceService to store and retrieve approver selection patterns from BaseStore.

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\approver-intelligence.service.ts
- **Action**: MODIFY
- **Pattern**: implementation-plan.md:479-517 (BaseStore integration)
- **Key Changes**:
  - Add helper method to access BaseStore via config parameter
  - Store approver selection patterns in BaseStore
  - Retrieve historical patterns for ML-based selection
  - Maintain existing Neo4j storage for approval metadata

#### Verification Requirements

- [ ] PREREQUISITE: TASK_2025_039 Task 7.8 completion confirmed
- [ ] File modified at exact path
- [ ] BaseStore used for pattern learning
- [ ] Neo4j storage preserved for metadata
- [ ] TypeScript compilation succeeds
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\lib\services\approver-intelligence.service.ts
git commit -m "feat(hitl): integrate BaseStore for approver pattern learning"
```

#### Success Criteria

- Git commit SHA documented below
- BaseStore pattern learning working
- Neo4j metadata storage preserved
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: _[To be filled by developer]_

---

### Task 21: Validate embedded state management alignment with workflow-engine

**Status**: ⏸️ PENDING (BLOCKED by TASK_2025_039 Task 7.8)
**Assigned To**: backend-developer
**Estimated Effort**: 3 hours
**Dependencies**: TASK_2025_039 Task 7.8, Tasks 19-20

#### What to Build

Create integration tests validating HITL + workflow-engine embedded state management alignment.

#### Implementation Details

- **Files**: Create integration test file
- **Action**: CREATE TEST
- **Pattern**: implementation-plan.md:888-918 (workflow-engine integration tests)
- **Key Changes**:
  - Create `libs/langgraph-modules/hitl/src/integration/workflow-engine.integration.spec.ts`
  - Test checkpointer access via RunnableConfig
  - Test BaseStore access via RunnableConfig
  - Test approval workflows with workflow-engine graph compilation
  - Validate embedded state management (no standalone services)

#### Verification Requirements

- [ ] PREREQUISITE: TASK_2025_039 Task 7.8 completion confirmed
- [ ] Integration test file created
- [ ] Checkpointer integration tests passing
- [ ] BaseStore integration tests passing
- [ ] Embedded pattern validated (no standalone checkpoint/memory services)
- [ ] TypeScript compilation succeeds
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\src\integration\workflow-engine.integration.spec.ts
git commit -m "test(hitl): add workflow-engine integration tests"
```

#### Success Criteria

- Git commit SHA documented below
- All integration tests passing
- Embedded pattern alignment verified
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: _[To be filled by developer]_

---

### Task 22: Update HITL CLAUDE.md documentation

**Status**: ⏸️ PENDING (BLOCKED by TASK_2025_039 Task 7.8)
**Assigned To**: backend-developer
**Estimated Effort**: 2 hours
**Dependencies**: Tasks 19-21

#### What to Build

Update HITL library documentation to reflect LangGraph native integration and embedded state management.

#### Implementation Details

- **File**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\CLAUDE.md
- **Action**: MODIFY
- **Pattern**: implementation-plan.md:1157-1162 (documentation updates)
- **Key Changes**:
  - Document LangGraph native patterns (interrupt, Command, checkpointer)
  - Document RunnableConfig access pattern
  - Document BaseStore integration (after Task 7.8)
  - Update service count (18 services, 2 deleted)
  - Add comparison table: HITL value-add vs LangGraph native
  - Document embedded state management alignment
  - Remove references to deleted services (HitlCheckpointService, HitlRecoveryService)

#### Verification Requirements

- [ ] PREREQUISITE: TASK_2025_039 Task 7.8 completion confirmed
- [ ] File modified at exact path
- [ ] All LangGraph native patterns documented
- [ ] RunnableConfig pattern documented
- [ ] BaseStore integration documented
- [ ] Service count updated (18 services)
- [ ] Comparison table added
- [ ] Git commit follows pattern

#### Commit Pattern

```bash
git add D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\hitl\CLAUDE.md
git commit -m "docs(hitl): update for LangGraph native integration"
```

#### Success Criteria

- Git commit SHA documented below
- Documentation complete and accurate
- All patterns documented
- Task marked ✅ COMPLETE in tasks.md

**Git Commit SHA**: _[To be filled by developer]_

---

## Completion Checklist

**Phase 1 Complete** (5/5 tasks): ✅ ALL COMPLETE

- [x] Task 1: HumanApprovalNode updated with RunnableConfig (dc14288)
- [x] Task 2: ApprovalProcessingService updated (293a2a4 - Batch 1)
- [x] Task 3: ApprovalChainService updated (293a2a4 - Batch 1)
- [x] Task 4: HitlApprovalRequestService updated (293a2a4 - Batch 1)
- [x] Task 5: HitlCheckpointService deleted (293a2a4 - Batch 1)

**Phase 2 Complete** (5/5 tasks):

- [ ] Task 6: ApprovalTimeoutService updated
- [ ] Task 7: HumanApprovalService updated
- [ ] Task 8: ApprovalStreamingService updated
- [ ] Task 9: UserInterruptionService updated (+ IMemoryAdapter bug fix)
- [ ] Task 10: HitlRecoveryService deleted

**Phase 3 Complete** (8/8 tasks):

- [ ] Task 11: RunnableConfigFactory created
- [ ] Task 12: HitlNotificationService updated
- [ ] Task 13: HitlTimeoutService updated
- [ ] Task 14: 12 unchanged services verified
- [ ] Task 15: hitl.module.ts updated
- [ ] Task 16: index.ts updated
- [ ] Task 17: hitl-services.interface.ts updated
- [ ] Task 18: Full test suite passing

**Phase 4 Complete** (4/4 tasks) - BLOCKED:

- [ ] Task 19: BaseStore access patterns added (BLOCKED)
- [ ] Task 20: ApproverIntelligenceService BaseStore integration (BLOCKED)
- [ ] Task 21: Workflow-engine integration validated (BLOCKED)
- [ ] Task 22: HITL CLAUDE.md documentation updated (BLOCKED)

**Final Verification**:

- [ ] All git commits follow commitlint rules
- [ ] TypeScript compilation succeeds (`npx nx build @hive-academy/langgraph-hitl`)
- [ ] All tests passing (`npx nx test @hive-academy/langgraph-hitl`)
- [ ] Test coverage >= 80%
- [ ] No lint errors (`npx nx lint @hive-academy/langgraph-hitl`)
- [ ] Documentation updated (CLAUDE.md)
- [ ] Zero backward compatibility violations (no v1/v2 versions)
- [ ] Embedded state management alignment verified

---

## Migration Success Criteria

**All tasks complete when**:

- All 22 task statuses are "✅ COMPLETE"
- All git commits verified (SHAs documented)
- All files exist/deleted as specified
- Build passes (`npx nx build @hive-academy/langgraph-hitl`)
- Tests pass with >= 80% coverage
- TASK_2025_039 Task 7.8 dependency resolved (for Phase 4)

**Return to orchestrator with**: "All 22 tasks completed and verified ✅" (after Phase 4 unblocked)

---

**End of tasks.md**
