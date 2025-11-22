# Development Tasks - TASK_2025_045

**Task Type**: Backend Refactoring (Multiple Critical Fixes)
**Developer Needed**: backend-developer
**Total Tasks**: 12 tasks (5 P0 + 7 P1)
**Decomposed From**:

- implementation-plan.md (lines 1-1281)
- context.md (lines 1-71)

**Priority Structure**:

- **P0 Critical**: Tasks 1-5 (Memory health check + HITL native integration)
- **P1 High**: Tasks 6-12 (Decorator bloat cleanup + documentation)

---

## PHASE 1: P0 Critical Fixes (Tasks 1-5)

### Task 1: Fix memory health check state-change logging ✅ COMPLETE [388566d]

**Assigned To**: backend-developer
**Priority**: P0-Critical
**Estimated Effort**: 30 minutes
**Actual Effort**: 30 minutes

**File(s)**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\monitoring\src\lib\services\health-check.service.ts

**Specification Reference**:

- implementation-plan.md:74-185 (Issue 1 specification)
- Pattern source: docs/MEMORY_HEALTH_CHECK_INVESTIGATION_2025_01_11.md:240-294

**Expected Commit Pattern**: `refactor(monitoring): reduce health check logging to state changes only`

**Implementation Details**:

- Add state tracking fields: `previousOverallState`, `previousServiceStates`
- Modify `performScheduledHealthCheck()` to log only on state transitions
- Include `service.metadata` (actual memory values) in all logs
- Log format: "previous state → current state" transitions
- Include restoration messages when health returns to healthy

**Quality Requirements**:

- ✅ Log only on state transitions (97% reduction: 41 logs → 2-3 per incident)
- ✅ Include `metadata` with actual memory values (usagePercent, heapUsedMB, etc.)
- ✅ Show previous state → current state in logs
- ✅ No performance impact (O(1) state tracking)
- ✅ TypeScript compiles without errors
- ✅ Existing tests pass

**Verification Requirements**:

- ✅ Git commit exists with proper format: `refactor(monitoring): [description]`
- ✅ File modified and compiles successfully
- ✅ State tracking properties added to service class
- ✅ Logging only occurs on state changes
- ✅ Metadata included in log output

**Completion Details**:

- **Git Commit**: 388566d
- **Commit Message**: "refactor(monitoring): reduce health check logging to state changes only"
- **Hook Bypass**: Used `--no-verify` per user decision (unrelated Angular errors in dev-brand-ui)
- **State Tracking**: Added `previousOverallState` and `previousServiceStates` Map
- **Log Reduction**: Expected 85-97% reduction (41 logs → 2-6 per incident)
- **Metadata**: All logs include `service.metadata` with actual memory values
- **Format**: Shows "previous → current" state transitions

---

### Task 2: Add environment-specific memory thresholds 🔄 IN PROGRESS - Assigned to backend-developer

**Assigned To**: backend-developer
**Priority**: P0-Critical
**Estimated Effort**: 1 hour

**File(s)**:

- D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\monitoring\src\lib\interfaces\monitoring.interface.ts
- D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\monitoring\src\lib\services\health-check.service.ts
- D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\config\monitoring.config.ts
- D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\.env.example

**Specification Reference**:

- implementation-plan.md:187-350 (Issue 2 specification)
- Interface pattern: implementation-plan.md:221-237
- Service pattern: implementation-plan.md:248-280
- Config pattern: implementation-plan.md:289-316
- Env vars pattern: implementation-plan.md:326-332

**Expected Commit Pattern**: `feat(monitoring): add configurable memory health thresholds`

**Implementation Details**:

1. **monitoring.interface.ts**: Extend `MonitoringConfig.healthChecks` with optional `memory` property containing `unhealthyThreshold` and `degradedThreshold`
2. **health-check.service.ts**: Read thresholds from config (defaults: 90/80), include threshold values in metadata
3. **monitoring.config.ts**: Add environment-specific defaults (dev: 95/90, prod: 90/80) with env var overrides
4. **env.example**: Document `MEMORY_HEALTH_THRESHOLD_UNHEALTHY` and `MEMORY_HEALTH_THRESHOLD_DEGRADED`

**Quality Requirements**:

- ✅ Interface properly extends existing `MonitoringConfig`
- ✅ Service reads configurable thresholds with fallback to 90/80
- ✅ Config supports environment-specific defaults
- ✅ Environment variables documented in .env.example
- ✅ Threshold values included in health check metadata
- ✅ Backward compatible (defaults to existing values)
- ✅ TypeScript compiles without errors
- ✅ All modified files compile successfully

**Verification Requirements**:

- ✅ Git commit exists with proper format: `feat(monitoring): [description]`
- ✅ All 4 files modified successfully
- ✅ Interface extends `MonitoringConfig.healthChecks`
- ✅ Service uses configurable thresholds
- ✅ Config provides environment-specific defaults
- ✅ .env.example documents new variables

---

### Task 3: Investigate HITL integration pattern (decorator vs function) ⏸️ PENDING

**Assigned To**: backend-developer
**Priority**: P0-Critical
**Estimated Effort**: 30 minutes (INVESTIGATION ONLY)

**File(s)**:

- D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\CLAUDE.md (read)
- D:\projects\nestjs-ai-saas-starter\docs\STREAMING_HITL_ARCHITECTURE_PLAN.md (read)

**Specification Reference**:

- implementation-plan.md:403-428 (Architectural decision point)
- LangGraph native pattern: implementation-plan.md:379-401
- Decorator pattern: implementation-plan.md:407-419

**Expected Commit Pattern**: NO COMMIT (investigation task)

**Implementation Details**:
This is an INVESTIGATION ONLY task to clarify architectural approach:

**Option 1: @RequiresApproval Decorator Pattern** (ecosystem-aligned):

```typescript
@Node({ type: 'standard' })
@RequiresApproval({
  confidenceThreshold: 0.7,
  timeoutMs: 180000,
  message: (state) => `Please review and approve.`,
  onTimeout: 'escalate',
})
async generateFinalStrategy(state: TypedAgentState) { }
```

**Option 2: interrupt() Function Pattern** (LangGraph native):

```typescript
const approval = await interrupt({
  type: 'report_approval',
  reportDraft: draft,
  question: 'Approve this report draft?',
});
```

**Research Steps**:

1. Read workflow-engine CLAUDE.md for @RequiresApproval decorator documentation
2. Check if @RequiresApproval integrates with native interrupt() under the hood
3. Determine if decorator is just a wrapper or a completely separate implementation
4. Document recommendation: decorator (if it uses native interrupt) OR function (if decorator is custom)

**Quality Requirements**:

- ✅ Read workflow-engine CLAUDE.md thoroughly
- ✅ Understand @RequiresApproval implementation
- ✅ Document recommendation with rationale
- ✅ Return findings to team-leader for Task 4 direction

**Verification Requirements**:

- ✅ Investigation report provided to team-leader
- ✅ Clear recommendation documented (decorator vs function)
- ✅ Rationale explains technical reasoning
- ✅ NO code changes made (investigation only)

**IMPORTANT**: Task 4 implementation depends on this investigation result. Team-leader will use recommendation to finalize Task 4 implementation approach.

---

### Task 4: Implement HITL native integration in researcher agent ⏸️ PENDING

**Assigned To**: backend-developer
**Priority**: P0-Critical
**Estimated Effort**: 2.5-3 hours
**Depends On**: Task 3 (investigation must complete first)

**File(s)**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\researcher.agent.ts

**Specification Reference**:

- implementation-plan.md:353-509 (Issue 3 specification - researcher agent)
- Pattern source: implementation-plan.md:439-509
- Current implementation: researcher.agent.ts:43-82

**Expected Commit Pattern**: `refactor(langgraph): migrate researcher to native interrupt pattern`

**Implementation Details** (SUBJECT TO TASK 3 RESULTS):

**Current Behavior (to remove)**:

```typescript
workflow: {
  multiAgentInterruption: {
    enabled: true,
    interruptAfter: ['generateReportDraft'],  // Custom config
  },
}
```

**New Behavior (LangGraph native)**:

```typescript
import { interrupt } from '@langchain/langgraph';

// In generateReportDraft task:
const approval = await interrupt({
  type: 'report_approval',
  reportDraft: reportDraft,
  question: 'Do you approve this research report?',
  metadata: {
    researchTopic: state.metadata.researchTopic,
    reportTitle: state.metadata.reportTitle,
    totalSources: state.metadata.totalSources,
  },
});

// Handle approval decision
return {
  state: {
    ...state,
    reportDraft: approval.type === 'edit' ? approval.edited : reportDraft,
    userApproval: approval.type === 'accept' ? 'approved' : 'rejected',
    userFeedback: approval.feedback,
  },
};
```

**NOTE**: If Task 3 recommends @RequiresApproval decorator, use decorator pattern instead of interrupt() function.

**Quality Requirements**:

- ✅ Import native `interrupt` from `@langchain/langgraph` (OR use @RequiresApproval)
- ✅ Remove custom `multiAgentInterruption` config
- ✅ Implement interrupt in `generateReportDraft` task
- ✅ Handle Command resume data properly
- ✅ Maintain workflow state through HITL pause/resume
- ✅ Keep `enableInternalCheckpointing: true` (required for interrupt)
- ✅ TypeScript compiles without errors
- ✅ No regressions in researcher workflow

**Verification Requirements**:

- ✅ Git commit exists with proper format: `refactor(langgraph): [description]`
- ✅ File modified successfully
- ✅ Native interrupt() imported and used (OR @RequiresApproval decorator applied)
- ✅ Custom multiAgentInterruption config removed
- ✅ Workflow compiles and starts without errors

---

### Task 5: Update SSE controller for interrupt handling ⏸️ PENDING

**Assigned To**: backend-developer
**Priority**: P0-Critical
**Estimated Effort**: 1 hour
**Depends On**: Task 4 (researcher agent must use native interrupt first)

**File(s)**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\controllers\research-chat.controller.ts

**Specification Reference**:

- implementation-plan.md:512-624 (Issue 3 specification - controller)
- Pattern source: implementation-plan.md:520-623
- Current implementation: research-chat.controller.ts:166-220

**Expected Commit Pattern**: `feat(langgraph): add native interrupt handling to sse controller`

**Implementation Details**:

**1. Detect **interrupt** Events in Stream**:

```typescript
// In streamWorkflow() method:
if ('__interrupt__' in event) {
  const interruptData = event.__interrupt__[0];
  this.logger.log(`🛑 Interrupt detected: ${executionId}`);

  subscriber.next({
    data: {
      type: 'interrupt',
      executionId,
      interruptType: interruptData.type,
      payload: interruptData,
      timestamp: new Date().toISOString(),
    },
    type: 'interrupt',
  } as MessageEvent);

  break; // Pause streaming
}
```

**2. Resume with Command**:

```typescript
import { Command } from '@langchain/langgraph';

// In approveReport() method:
const resumeCommand = Command({
  resume: {
    type: body.approved ? 'accept' : 'reject',
    feedback: body.feedback,
    edited: body.edited,
  },
});

const resumeStream = this.researcherAgent.executeWithStreaming({
  command: resumeCommand,
  executionId,
  config: {
    configurable: {
      thread_id: executionId, // CRITICAL: Same thread_id
    },
  },
});
```

**3. Add Event Validation**:

```typescript
// Validate event before accessing properties
if (!event || typeof event !== 'object') {
  this.logger.warn(`Invalid event: ${JSON.stringify(event)}`);
  continue;
}
```

**Quality Requirements**:

- ✅ Import `Command` from `@langchain/langgraph`
- ✅ Detect `__interrupt__` events in SSE stream
- ✅ Send interrupt events to frontend
- ✅ Resume workflows with Command object
- ✅ Validate stream state before accessing properties
- ✅ Maintain thread_id consistency for resume
- ✅ TypeScript compiles without errors
- ✅ No regressions in SSE streaming

**Verification Requirements**:

- ✅ Git commit exists with proper format: `feat(langgraph): [description]`
- ✅ File modified successfully
- ✅ Command imported from @langchain/langgraph
- ✅ **interrupt** event detection added
- ✅ Resume logic uses Command object
- ✅ Event validation added
- ✅ Controller compiles successfully

---

## PHASE 2: P1 High Priority Cleanup (Tasks 6-12)

### Task 6: Remove non-functional options from decorator interface ⏸️ PENDING

**Assigned To**: backend-developer
**Priority**: P1-High
**Estimated Effort**: 30 minutes

**File(s)**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\decorators\multi-agent\agent.decorator.ts

**Specification Reference**:

- implementation-plan.md:646-738 (Issue 4 - decorator interface)
- Pattern source: implementation-plan.md:702-726
- Deprecation pattern: implementation-plan.md:729-737

**Expected Commit Pattern**: `refactor(langgraph): remove non-functional decorator options`

**Implementation Details**:

**1. Update AgentWorkflowConfig Interface**:
Remove 8 non-functional options:

```typescript
// ❌ REMOVE:
// enableInternalStreaming?: boolean;
// enableInternalCheckpointing?: boolean;
// internalTimeout?: number;
// enableErrorRecovery?: boolean;
// maxInternalRetries?: number;
// enableStepProgress?: boolean;
// stateKey?: string;
// confidenceThreshold?: number;  // Move to node level if needed

// ✅ KEEP:
interface AgentWorkflowConfig {
  name: string;
  description?: string;
  type?: 'functional-task' | 'functional-node';
  streaming?: boolean;
  multiAgentInterruption?: {
    enabled: boolean;
    interruptBefore?: string[];
    interruptAfter?: string[];
  };
}
```

**2. Add Deprecation Warnings**:

```typescript
// In createDefaultWorkflowConfig() or decorator function:
if (config.enableInternalCheckpointing !== undefined) {
  console.warn(
    `@Agent decorator: 'enableInternalCheckpointing' is deprecated and non-functional. ` +
      `Checkpointing is configured at graph.compile({ checkpointer }) level only. ` +
      `Remove this option from your agent configuration.`
  );
}
// Repeat for all 8 deprecated options
```

**Quality Requirements**:

- ✅ Remove 8 non-functional options from interface
- ✅ Add deprecation warnings for removed options
- ✅ Retain only functional options (type, streaming, multiAgentInterruption)
- ✅ Update createDefaultWorkflowConfig() to exclude non-functional defaults
- ✅ TypeScript compiles without errors
- ✅ No breaking changes (warnings only)

**Verification Requirements**:

- ✅ Git commit exists with proper format: `refactor(langgraph): [description]`
- ✅ File modified successfully
- ✅ Interface updated with reduced options
- ✅ Deprecation warnings added
- ✅ File compiles successfully

---

### Task 7: Cleanup researcher agent decorator bloat ⏸️ PENDING

**Assigned To**: backend-developer
**Priority**: P1-High
**Estimated Effort**: 15 minutes

**File(s)**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\researcher.agent.ts

**Specification Reference**:

- implementation-plan.md:740-763 (Issue 4 - researcher agent cleanup)
- Current config: researcher.agent.ts:71-80
- Minimal pattern: implementation-plan.md:748-762

**Expected Commit Pattern**: `refactor(langgraph): remove non-functional options from researcher agent`

**Implementation Details**:

**Current Configuration (26 lines with bloat)**:

```typescript
workflow: {
  name: 'researcher-workflow',
  description: 'Autonomous research and report generation workflow',
  type: 'functional-task',
  streaming: true,
  confidenceThreshold: 0.7,
  metrics: true,
  enableInternalStreaming: true,        // ❌ REMOVE
  enableInternalCheckpointing: true,    // ❌ REMOVE
  internalTimeout: 180000,              // ❌ REMOVE
  enableErrorRecovery: true,            // ❌ REMOVE
  maxInternalRetries: 2,                // ❌ REMOVE
  enableStepProgress: true,             // ❌ REMOVE
  multiAgentInterruption: {
    enabled: true,
    interruptAfter: ['generateReportDraft'], // ✅ KEEP (functional)
  },
}
```

**After Cleanup (11 lines minimal)**:

```typescript
workflow: {
  type: 'functional-task',     // ✅ Enforces @Entrypoint + @Task pattern
  streaming: true,             // ✅ Enable streaming to UI
  multiAgentInterruption: {
    enabled: true,
    interruptAfter: ['generateReportDraft'], // ✅ Pause for HITL approval
  },
}
```

**Quality Requirements**:

- ✅ Remove 6 non-functional options
- ✅ Retain only functional options
- ✅ Reduce config from 26 lines to 11 lines (57.7% reduction)
- ✅ TypeScript compiles without errors
- ✅ No regressions in researcher workflow

**Verification Requirements**:

- ✅ Git commit exists with proper format: `refactor(langgraph): [description]`
- ✅ File modified successfully
- ✅ Non-functional options removed
- ✅ Workflow still functional
- ✅ File compiles successfully

---

### Task 8: Cleanup github-code-analyzer decorator bloat ⏸️ PENDING

**Assigned To**: backend-developer
**Priority**: P1-High
**Estimated Effort**: 15 minutes

**File(s)**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\github-code-analyzer\github-code-analyzer.agent.ts

**Specification Reference**:

- implementation-plan.md:813-837 (Issue 4 - github-code-analyzer cleanup)
- Current config: github-code-analyzer.agent.ts:78-90

**Expected Commit Pattern**: `refactor(langgraph): remove non-functional options from github analyzer`

**Implementation Details**:

**Current Configuration**:

```typescript
workflow: {
  confidenceThreshold: 0.8,       // ❌ REMOVE (non-functional at decorator level)
  internalTimeout: 90000,         // ❌ REMOVE
  multiAgentInterruption: {
    enabled: true,                // ✅ KEEP
  },
}
```

**After Cleanup**:

```typescript
workflow: {
  multiAgentInterruption: {
    enabled: true,
  },
}
```

**Quality Requirements**:

- ✅ Remove non-functional options (confidenceThreshold, internalTimeout)
- ✅ Retain functional options (multiAgentInterruption)
- ✅ TypeScript compiles without errors
- ✅ No regressions in github-code-analyzer workflow

**Verification Requirements**:

- ✅ Git commit exists with proper format: `refactor(langgraph): [description]`
- ✅ File modified successfully
- ✅ Non-functional options removed
- ✅ File compiles successfully

---

### Task 9: Cleanup content-creator decorator bloat ⏸️ PENDING

**Assigned To**: backend-developer
**Priority**: P1-High
**Estimated Effort**: 15 minutes

**File(s)**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\content-creator\content-creator.agent.ts

**Specification Reference**:

- implementation-plan.md:784-811 (Issue 4 - content-creator cleanup)
- Current config: content-creator.agent.ts:78-93

**Expected Commit Pattern**: `refactor(langgraph): remove non-functional options from content creator`

**Implementation Details**:

**Current Configuration**:

```typescript
workflow: {
  type: 'functional-node',              // ✅ KEEP
  enableInternalCheckpointing: false,   // ❌ REMOVE (trying to override, non-functional)
  internalTimeout: 45000,               // ❌ REMOVE
  multiAgentInterruption: {
    enabled: true,
    interruptBefore: ['content-creator'], // ✅ KEEP
  },
}
```

**After Cleanup**:

```typescript
workflow: {
  type: 'functional-node',
  multiAgentInterruption: {
    enabled: true,
    interruptBefore: ['content-creator'],
  },
}
```

**Quality Requirements**:

- ✅ Remove non-functional options (enableInternalCheckpointing, internalTimeout)
- ✅ Retain functional options (type, multiAgentInterruption)
- ✅ TypeScript compiles without errors
- ✅ No regressions in content-creator workflow

**Verification Requirements**:

- ✅ Git commit exists with proper format: `refactor(langgraph): [description]`
- ✅ File modified successfully
- ✅ Non-functional options removed
- ✅ File compiles successfully

---

### Task 10: Verify personal-brand-strategist minimal config ⏸️ PENDING

**Assigned To**: backend-developer
**Priority**: P1-High
**Estimated Effort**: 10 minutes (VERIFICATION ONLY)

**File(s)**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\agents\personal-brand-strategist\personal-brand-strategist.agent.ts

**Specification Reference**:

- implementation-plan.md:765-780 (Issue 4 - personal-brand-strategist verification)
- Current config: personal-brand-strategist.agent.ts:54-64

**Expected Commit Pattern**: `chore(langgraph): verify personal brand strategist config` (IF changes needed)

**Implementation Details**:

**Current Configuration** (already minimal):

```typescript
workflow: {
  type: 'functional-node',              // ✅ REQUIRED
  multiAgentInterruption: {
    enabled: true,                      // ✅ FUNCTIONAL
  },
}
```

**Action**: Verify no additional bloat exists. If config is already minimal (as shown above), NO CHANGES NEEDED.

**Quality Requirements**:

- ✅ Read current configuration
- ✅ Verify only functional options present
- ✅ If bloat found, remove it
- ✅ If already minimal, document verification in commit message
- ✅ TypeScript compiles without errors

**Verification Requirements**:

- ✅ Configuration verified as minimal
- ✅ Git commit exists ONLY if changes made
- ✅ Documentation updated if no changes needed
- ✅ File compiles successfully

---

### Task 11: Investigate devbrand-supervisor @MultiAgent config ⏸️ PENDING

**Assigned To**: backend-developer
**Priority**: P1-High
**Estimated Effort**: 30 minutes (INVESTIGATION + potential cleanup)

**File(s)**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-api\src\app\business-workflows\workflows\devbrand-supervisor.workflow.ts

**Specification Reference**:

- implementation-plan.md:839-865 (Issue 4 - supervisor workflow investigation)
- Current config: devbrand-supervisor.workflow.ts:50-124

**Expected Commit Pattern**: `refactor(langgraph): cleanup supervisor decorator config` (IF changes needed)

**Implementation Details**:

**Current Configuration**:

```typescript
@MultiAgent({
  networkId: 'devbrand-supervisor-network',
  topology: MultiAgentTopology.SUPERVISOR,
  agents: [GitHubCodeAnalyzerAgent, PersonalBrandStrategistAgent, ContentCreatorAgent],
  config: { ... } as SupervisorConfig,
  streaming: true,     // ❓ Verify: Functional at decorator level?
  checkpointing: true, // ❓ Verify: Functional at decorator level?
  debug: false,        // ❓ Verify: Functional at decorator level?
})
```

**Investigation Questions**:

1. Are `streaming`, `checkpointing`, `debug` functional at @MultiAgent decorator level?
2. Or should they be configured at module/graph level?
3. Check workflow-engine CLAUDE.md for @MultiAgent decorator documentation
4. Check multi-agent-graph-builder.service.ts to see if these options are read/used

**Action**:

- If options are non-functional at decorator level → Remove them, document proper configuration location
- If options ARE functional → Keep them, document verification
- If uncertain → Escalate to team-leader for clarification

**Quality Requirements**:

- ✅ Investigate @MultiAgent decorator options usage
- ✅ Document findings (functional or non-functional)
- ✅ Remove non-functional options if confirmed
- ✅ TypeScript compiles without errors
- ✅ No regressions in supervisor workflow

**Verification Requirements**:

- ✅ Investigation documented in commit message or task notes
- ✅ Git commit exists ONLY if changes made
- ✅ Options confirmed functional OR removed
- ✅ File compiles successfully

---

### Task 12: Update workflow-engine documentation ⏸️ PENDING

**Assigned To**: backend-developer
**Priority**: P1-High
**Estimated Effort**: 30 minutes

**File(s)**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\CLAUDE.md

**Specification Reference**:

- implementation-plan.md:867-878 (Issue 4 - documentation update)
- Evidence: DECORATOR_CHECKPOINT_INVESTIGATION_REPORT.md:880-901

**Expected Commit Pattern**: `docs(langgraph): update decorator options documentation`

**Implementation Details**:

**Documentation Updates Required**:

1. **Remove Non-Functional Options from Examples**:

   - Remove `enableInternalCheckpointing`, `enableInternalStreaming`, etc. from all examples
   - Update decorator interface documentation

2. **Add Explanation Section**:

```markdown
## Decorator Options Cleanup (LangGraph v1.0 Alignment)

The following options have been removed from `@Agent` decorator as they were non-functional:

- `enableInternalCheckpointing` - Checkpointing is configured at `graph.compile({ checkpointer })` level
- `enableInternalStreaming` - Streaming is configured at module level
- `internalTimeout` - Timeouts should be configured per-task or at module level
- `enableErrorRecovery` - Error recovery is graph-level configuration
- `maxInternalRetries` - Retry logic should be implemented per-task
- `enableStepProgress` - Progress tracking is handled by LangGraph runtime
- `stateKey` - State management is graph-level
- `confidenceThreshold` - Should be configured at node/task level

**Why Removed**: These options were stored in decorator metadata but never read by the workflow engine execution code. This created confusion and technical debt.

**Current Functional Options**:

- `type` - Workflow type ('functional-task' | 'functional-node')
- `streaming` - Enable streaming to frontend
- `multiAgentInterruption` - Configure HITL pause points
```

3. **Add Migration Guide**:

````markdown
## Migration Guide: Removing Non-Functional Options

**Before**:

```typescript
@Agent({
  workflow: {
    type: 'functional-task',
    streaming: true,
    enableInternalCheckpointing: true,
    internalTimeout: 180000,
    enableErrorRecovery: true,
    maxInternalRetries: 2,
    multiAgentInterruption: {
      enabled: true,
      interruptAfter: ['generateReportDraft'],
    },
  },
})
```
````

**After**:

```typescript
@Agent({
  workflow: {
    type: 'functional-task',
    streaming: true,
    multiAgentInterruption: {
      enabled: true,
      interruptAfter: ['generateReportDraft'],
    },
  },
})
```

**Result**: 57.7% reduction in decorator config lines with NO functional changes.

```

**Quality Requirements**:
- ✅ Remove non-functional options from all examples
- ✅ Add explanation of why options were removed
- ✅ Provide clear migration guide with before/after
- ✅ Document LangGraph v1.0 alignment reasoning
- ✅ Update all decorator interface documentation
- ✅ Markdown properly formatted

**Verification Requirements**:
- ✅ Git commit exists with proper format: `docs(langgraph): [description]`
- ✅ File modified successfully
- ✅ All examples updated
- ✅ Migration guide included
- ✅ Explanation section clear and accurate

---

## Verification Protocol

**After Each Task Completion**:
1. Developer updates task status to "✅ COMPLETE"
2. Developer adds git commit SHA
3. Team-leader verifies:
   - `git log --oneline -1` matches expected commit pattern
   - `Read([file-path])` confirms file exists and changes applied
   - TypeScript compiles (if applicable)
4. If verification passes: Assign next task
5. If verification fails: Mark task as "❌ FAILED", escalate to user

**Task Dependencies**:
- Task 4 depends on Task 3 (investigation result)
- Task 5 depends on Task 4 (researcher agent must use native interrupt first)
- Tasks 6-12 should start AFTER Tasks 1-5 complete (P0 before P1)
- Task 11 may inform Task 12 documentation updates

---

## Completion Criteria

**Phase 1 (P0) Complete When**:
- Tasks 1-5 all have "✅ COMPLETE" status
- All git commits verified
- All files exist and compile
- No TypeScript errors
- Health check logging reduced by 85-97%
- Researcher agent uses native interrupt()
- SSE controller handles __interrupt__ events

**Phase 2 (P1) Complete When**:
- Tasks 6-12 all have "✅ COMPLETE" status
- All git commits verified
- Decorator interface cleaned up (8 options removed)
- All 4 agents updated to minimal config
- Supervisor workflow verified/cleaned
- Documentation updated with migration guide

**All Tasks Complete When**:
- All 12 task statuses are "✅ COMPLETE"
- All git commits verified
- All files exist and compile
- Build passes: `npx nx build dev-brand-api`
- No regressions in existing workflows
- Test coverage maintained at 80%+

**Return to Orchestrator**: "All 12 tasks completed and verified ✅"
```
