# LangGraph Streaming & HITL Architecture Plan

**Date**: 2025-01-11
**Purpose**: Align our streaming and HITL implementation with LangGraph v1.0 best practices
**Scope**: Fix all identified issues + architectural realignment

---

## Executive Summary

Our current implementation has **architectural misalignments** with LangGraph v1.0 best practices:

1. ❌ **WebSocket removed but logs show `ws://localhost:8080`** - phantom reference
2. ❌ **HITL using custom implementation instead of LangGraph `interrupt()` function**
3. ❌ **SSE streaming missing proper state validation**
4. ⚠️ **Memory health checks failing consistently**
5. ⚠️ **Metrics collection disabled**

**Recommended Approach**: **Adopt LangGraph Native Patterns**

---

## 🎯 LangGraph v1.0 Best Practices (Research Findings)

### 1. Streaming Architecture

**Official Pattern**: **Server-Sent Events (SSE) via `.stream()`**

```typescript
// ✅ CORRECT: LangGraph native streaming
for await (const chunk of graph.stream(input, {
  configurable: { thread_id: 'unique-thread-id' },
  streamMode: ['values', 'updates', 'messages', 'custom'], // Multiple modes supported
})) {
  // chunk structure depends on streamMode
  // - 'values': full state after each node
  // - 'updates': state deltas after each node
  // - 'messages': LLM tokens + metadata
  // - 'custom': custom data from nodes
}
```

**Key Insights**:

- **No WebSocket needed** - SSE is the recommended approach
- **Multiple streaming modes** can be combined: `['updates', 'custom', 'messages']`
- **State can be undefined** in early streaming events (especially with 'updates' mode)
- **Checkpointer required** for persistence and HITL

### 2. Human-in-the-Loop (HITL) Architecture

**Official Pattern**: **`interrupt()` function with checkpointing**

```typescript
import { interrupt } from '@langchain/langgraph';

// ❌ WRONG: Our current custom implementation
// Uses: multiAgentInterruption.interruptAfter configuration
// Problem: Not using LangGraph's native interrupt system

// ✅ CORRECT: LangGraph native HITL
const generateReportDraft = async (state: State, config: RunnableConfig) => {
  const draft = await generateReport(state);

  // Pause workflow and wait for human decision
  const decision = await interrupt({
    type: 'report_approval',
    reportDraft: draft,
    question: 'Approve this report draft?',
  });

  // decision becomes the resume value when workflow continues
  if (decision.approved) {
    return { reportDraft: draft, approved: true };
  } else {
    return { reportDraft: draft, approved: false, feedback: decision.feedback };
  }
};
```

**Key Insights**:

- **`interrupt()` function** is the official HITL mechanism
- **Checkpointer required** - saves state during interruption
- **`thread_id`** is the persistent cursor for resuming
- **Resume with `Command`** object containing the decision
- **Interrupt payload** surfaces in `__interrupt__` field of streaming events

### 3. Resume Workflow Pattern

**Official Pattern**: **Use `Command` to resume with data**

```typescript
import { Command } from '@langchain/langgraph';

// When user approves/rejects:
const resumeResult = await graph.stream(
  Command({
    resume: {
      type: 'accept', // or 'edit', 'reject'
      feedback: 'Looks good!',
      // ... any data needed by the node
    },
  }),
  {
    configurable: { thread_id: 'same-thread-id' }, // CRITICAL: Use same thread_id
    streamMode: ['updates'],
  }
);
```

**Key Insights**:

- **Same `thread_id`** required to resume correct checkpoint
- **`Command` object** carries resume data
- **Streaming continues** from where it left off
- **No need for custom approval endpoints** - use standard streaming pattern

---

## 🔍 Current Implementation Analysis

### What We Have

**File**: `apps/dev-brand-api/src/app/business-workflows/agents/researcher.agent.ts`

```typescript
@Agent({
  workflow: {
    // ❌ Custom HITL implementation
    multiAgentInterruption: {
      enabled: true,
      interruptAfter: ['generateReportDraft'], // Custom config
    },
    enableInternalCheckpointing: true, // ✅ Good - checkpointing enabled
  },
})
export class ResearcherAgent {
  // Tasks defined with @Entrypoint and @Task decorators
  // Workflow managed by WorkflowExecutionService
}
```

**File**: `apps/dev-brand-api/src/app/business-workflows/controllers/research-chat.controller.ts`

```typescript
// ✅ SSE streaming (correct approach)
@Get('stream/:executionId')
@Sse()
streamWorkflow(@Param('executionId') executionId: string): Observable<MessageEvent> {
  return new Observable((subscriber) => {
    for await (const event of stream) {
      subscriber.next({
        data: event,
        type: 'workflow-update',
      } as MessageEvent);

      // ❌ PROBLEM: Missing state validation
      if (event.state?.userApproval === 'pending') {  // Can fail if event.state is undefined
        subscriber.next({
          data: {
            reportDraft: event.state.reportDraft,  // ❌ CRASHES HERE
          },
        });
      }
    }
  });
}
```

**File**: `apps/dev-brand-api/src/main.ts`

```typescript
// ❌ NO WebSocket setup in main.ts
// But log.md shows: ws://localhost:8080/streaming
// This is a phantom reference from removed code
```

### What's Missing/Wrong

1. **No `interrupt()` function** - using custom `multiAgentInterruption` config
2. **No `Command` for resume** - approval endpoint doesn't use Command pattern
3. **State validation missing** - crashes on undefined `event.state`
4. **WebSocket phantom** - logs reference non-existent WebSocket server
5. **HITL service configuration** - `streamingAvailable: false` but shouldn't be needed with SSE

---

## 📋 Comprehensive Fix Plan

### Phase 1: Fix Critical Streaming Issues (P0 - 1-2 hours)

**Goal**: Make research workflow functional with proper state validation

#### Task 1.1: Fix SSE Streaming State Validation

**File**: `research-chat.controller.ts:166-220`

```typescript
// ❌ BEFORE (Lines 166-220)
for await (const event of stream) {
  subscriber.next({
    data: event,
    type: 'workflow-update',
  } as MessageEvent);

  // Check if workflow interrupted (HITL)
  if (event.state?.userApproval === 'pending') {
    // ❌ State can be undefined
    subscriber.next({
      data: {
        reportDraft: event.state.reportDraft, // ❌ CRASHES
      },
    });
  }
}

// ✅ AFTER: Proper state validation
for await (const event of stream) {
  // Validate event structure first
  if (!event || typeof event !== 'object') {
    this.logger.warn(`Invalid event received: ${JSON.stringify(event)}`);
    continue;
  }

  // Stream the event (always safe)
  subscriber.next({
    data: {
      type: 'workflow_update',
      executionId,
      event: event, // Full event for debugging
      hasState: !!event.state, // Flag for frontend
      timestamp: new Date().toISOString(),
    },
    type: 'workflow-update',
  } as MessageEvent);

  // Check for interruption (with proper validation)
  if (event.state && typeof event.state === 'object') {
    // HITL interruption check
    if (event.state.userApproval === 'pending') {
      this.logger.log(`🛑 Workflow interrupted for approval: ${executionId}`);
      subscriber.next({
        data: {
          type: 'interruption_request',
          executionId,
          message: 'Report draft ready for review',
          reportDraft: event.state.reportDraft || 'No draft available',
          metadata: event.state.metadata || {},
          timestamp: new Date().toISOString(),
        },
        type: 'interruption_request',
      } as MessageEvent);
      break; // Pause streaming
    }

    // Completion check
    if (event.state.status === 'completed' || event.state.savedReportFilename) {
      this.logger.log(`✅ Workflow completed: ${executionId}`);
      subscriber.next({
        data: {
          type: 'workflow_complete',
          executionId,
          finalState: event.state,
          timestamp: new Date().toISOString(),
        },
        type: 'workflow_complete',
      } as MessageEvent);
      subscriber.complete();
      this.activeStreams.delete(executionId);
      break;
    }
  }
}
```

**Verification**:

- [ ] Research workflow starts without crashes
- [ ] State validation prevents undefined access
- [ ] Events stream correctly to frontend
- [ ] HITL interruption detected properly

---

### Phase 2: Align HITL with LangGraph Patterns (P1 - 3-4 hours)

**Goal**: Replace custom HITL with LangGraph native `interrupt()` function

#### Task 2.1: Update ResearcherAgent to Use `interrupt()`

**File**: `researcher.agent.ts`

```typescript
import { interrupt } from '@langchain/langgraph'; // Import native interrupt

@Agent({
  workflow: {
    // ✅ Remove custom multiAgentInterruption config
    // multiAgentInterruption: {  // ❌ REMOVE THIS
    //   enabled: true,
    //   interruptAfter: ['generateReportDraft'],
    // },

    // ✅ Keep checkpointing (required for interrupt)
    enableInternalCheckpointing: true,
  },
})
export class ResearcherAgent {
  // ...

  /**
   * STEP 3: Generate report draft and wait for approval
   */
  @Task({ dependsOn: ['conductResearch'] })
  async generateReportDraft(
    context: TaskExecutionContext<TypedAgentState<ResearcherMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<ResearcherMetadata>>> {
    const state = context.state;
    this.logger.log('📝 Generating report draft...');

    try {
      // Generate report draft (existing logic)
      const reportDraft = await this.createReportDraft(state);

      this.logger.log('🛑 Report draft complete - requesting approval');

      // ✅ NEW: Use LangGraph native interrupt
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

      // approval is the resume value from Command
      this.logger.log(`📋 Approval decision: ${approval.type}`);

      return {
        state: {
          ...state,
          reportDraft: approval.type === 'edit' ? approval.edited : reportDraft,
          userApproval: approval.type === 'accept' ? 'approved' : 'rejected',
          userFeedback: approval.feedback,
          metadata: {
            ...state.metadata,
            reportDraft,
            userApproval: approval.type === 'accept' ? 'approved' : 'rejected',
          },
        },
      };
    } catch (error: any) {
      this.logger.error('❌ Report generation failed:', error.message);
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            error: `Report generation failed: ${error.message}`,
          },
        },
      };
    }
  }

  /**
   * STEP 4: Save approved report (only runs if approved)
   */
  @Task({ dependsOn: ['generateReportDraft'] })
  async saveReport(
    context: TaskExecutionContext<TypedAgentState<ResearcherMetadata>>
  ): Promise<TaskExecutionResult<TypedAgentState<ResearcherMetadata>>> {
    const state = context.state;

    // Skip if not approved
    if (state.userApproval !== 'approved') {
      this.logger.log('❌ Report not approved - skipping save');
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            status: 'rejected',
          },
        },
      };
    }

    this.logger.log('💾 Saving approved report...');

    try {
      const result = await this.fileTools.saveReport({
        content: state.reportDraft || '',
        title: state.metadata.reportTitle || 'Research Report',
        metadata: {
          researchTopic: state.metadata.researchTopic,
          totalSources: state.metadata.totalSources,
          researchDepth: state.metadata.researchDepth,
        },
      });

      if ('error' in result) {
        throw new Error(result.error);
      }

      this.logger.log(`✅ Report saved: ${result.filename}`);

      return {
        state: {
          ...state,
          savedReportFilename: result.filename,
          savedReportPath: result.filepath,
          metadata: {
            ...state.metadata,
            savedReportFilename: result.filename,
            savedReportPath: result.filepath,
            status: 'completed',
          },
        },
      };
    } catch (error: any) {
      this.logger.error('❌ Report save failed:', error.message);
      return {
        state: {
          ...state,
          metadata: {
            ...state.metadata,
            error: `Report save failed: ${error.message}`,
            status: 'error',
          },
        },
      };
    }
  }

  // Helper method for report generation
  private async createReportDraft(state: TypedAgentState<ResearcherMetadata>): Promise<string> {
    // Existing report generation logic
    const llm = await this.llmProvider.getLLM({
      temperature: 0.3,
      maxTokens: 2000,
    });

    const reportPrompt = `Generate a comprehensive research report...`; // Existing logic
    const response = await llm.invoke([{ role: 'user', content: reportPrompt }]);
    return response.content.toString();
  }
}
```

#### Task 2.2: Update Controller to Handle `__interrupt__` Events

**File**: `research-chat.controller.ts`

```typescript
@Get('stream/:executionId')
@Sse()
streamWorkflow(@Param('executionId') executionId: string): Observable<MessageEvent> {
  this.logger.log(`📡 SSE stream connected for ${executionId}`);

  return new Observable((subscriber) => {
    const stream = this.activeStreams.get(executionId);

    if (!stream) {
      subscriber.error(new HttpException(`Stream not found`, HttpStatus.NOT_FOUND));
      return;
    }

    (async () => {
      try {
        for await (const event of stream) {
          // Validate event
          if (!event || typeof event !== 'object') {
            this.logger.warn(`Invalid event: ${JSON.stringify(event)}`);
            continue;
          }

          // ✅ NEW: Check for LangGraph interrupt events
          if ('__interrupt__' in event) {
            const interruptData = event.__interrupt__[0];  // LangGraph interrupt format
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

            // Pause streaming - wait for resume
            break;
          }

          // Stream regular updates
          subscriber.next({
            data: {
              type: 'update',
              executionId,
              event,
              timestamp: new Date().toISOString(),
            },
            type: 'update',
          } as MessageEvent);

          // Check completion
          if (event.state?.status === 'completed') {
            subscriber.next({
              data: {
                type: 'complete',
                executionId,
                finalState: event.state,
                timestamp: new Date().toISOString(),
              },
              type: 'complete',
            } as MessageEvent);
            subscriber.complete();
            this.activeStreams.delete(executionId);
            break;
          }
        }
      } catch (error: any) {
        this.logger.error(`❌ Stream error: ${error.message}`);
        subscriber.error(error);
        this.activeStreams.delete(executionId);
      }
    })();
  });
}
```

#### Task 2.3: Update Approval Endpoint to Use `Command`

**File**: `research-chat.controller.ts`

```typescript
import { Command } from '@langchain/langgraph';  // ✅ Import Command

@Post('approve/:executionId')
async approveReport(
  @Param('executionId') executionId: string,
  @Body() body: {
    approved: boolean;
    feedback?: string;
    edited?: string;  // For edit option
  }
): Promise<{ status: string; message: string }> {
  this.logger.log(
    `📝 Approval received for ${executionId}: ${body.approved ? 'APPROVED' : 'REJECTED'}`
  );

  try {
    // Get the paused stream
    const stream = this.activeStreams.get(executionId);
    if (!stream) {
      throw new HttpException('Execution not found or already completed', HttpStatus.NOT_FOUND);
    }

    // ✅ NEW: Resume with Command
    const resumeCommand = Command({
      resume: {
        type: body.approved ? 'accept' : 'reject',
        feedback: body.feedback,
        edited: body.edited,  // If user edited the report
      },
    });

    // Create new stream with resume command
    const resumeStream = this.researcherAgent.executeWithStreaming({
      command: resumeCommand,
      executionId,
      // CRITICAL: Use same thread_id to resume from checkpoint
      config: {
        configurable: {
          thread_id: executionId,  // Same as original execution
        },
      },
    });

    // Replace stream in activeStreams
    this.activeStreams.set(executionId, resumeStream);

    return {
      status: 'success',
      message: `Workflow resumed with decision: ${body.approved ? 'approved' : 'rejected'}`,
    };
  } catch (error: any) {
    this.logger.error(`❌ Approval failed: ${error.message}`);
    throw new HttpException(
      error.message || 'Failed to process approval',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
```

**Verification**:

- [ ] `interrupt()` function pauses workflow
- [ ] `__interrupt__` event detected in stream
- [ ] Frontend receives interrupt with payload
- [ ] Approval endpoint resumes with `Command`
- [ ] Workflow continues from saveReport task

---

### Phase 3: Fix Memory Health Checks (P1 - 1 hour)

**Goal**: Adjust memory thresholds for development environment

#### Task 3.1: Add Environment-Specific Thresholds

**File**: `libs/langgraph-modules/monitoring/src/lib/services/health-check.service.ts:363-385`

```typescript
// ❌ BEFORE: Fixed thresholds
const isUnhealthy = usagePercent >= 90;
const isDegraded = usagePercent >= 80 && usagePercent < 90;

// ✅ AFTER: Environment-specific thresholds
private registerDefaultChecks(): void {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Memory usage check with environment-aware thresholds
  this.register('memory', async () => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const usagePercent = (heapUsedMB / heapTotalMB) * 100;

    // Development: More lenient thresholds
    // Production: Stricter thresholds
    const unhealthyThreshold = isDevelopment ? 95 : 90;
    const degradedThreshold = isDevelopment ? 90 : 80;

    const isUnhealthy = usagePercent >= unhealthyThreshold;
    const isDegraded = usagePercent >= degradedThreshold && usagePercent < unhealthyThreshold;
    const isHealthy = usagePercent < degradedThreshold;

    // Add detailed logging in development
    if (isDevelopment && (isUnhealthy || isDegraded)) {
      this.logger.debug('Memory health check:', {
        usagePercent: Math.round(usagePercent * 100) / 100,
        heapUsedMB: Math.round(heapUsedMB),
        heapTotalMB: Math.round(heapTotalMB),
        threshold: { unhealthy: unhealthyThreshold, degraded: degradedThreshold },
        state: isUnhealthy ? 'unhealthy' : 'degraded',
      });
    }

    return {
      healthy: isHealthy && !isDegraded && !isUnhealthy,
      degraded: !isHealthy && isDegraded && !isUnhealthy,
      unhealthy: !isHealthy && !isDegraded && isUnhealthy,
      usagePercent: Math.round(usagePercent * 100) / 100,
      heapUsedMB: Math.round(heapUsedMB),
      heapTotalMB: Math.round(heapTotalMB),
      rssUsedMB: Math.round(memUsage.rss / 1024 / 1024),
    };
  });
}
```

**Verification**:

- [ ] Memory health checks pass in development (95% threshold)
- [ ] Detailed logging shows actual memory usage
- [ ] Production maintains stricter thresholds (90%)

---

### Phase 4: Remove WebSocket Phantom References (P2 - 30 minutes)

**Goal**: Clean up phantom WebSocket references

#### Task 4.1: Remove WebSocket Log References

**Search for**: `ws://` and `WebSocket` references

**Files to check**:

- `main.ts` - Remove any WebSocket logging
- `hitl-notification.service.ts` - Update configuration
- Any startup logging that mentions WebSocket

```typescript
// ❌ REMOVE lines like:
Logger.log('🌊 Frontend should connect to: ws://localhost:8080/streaming');

// ✅ REPLACE with:
Logger.log('📡 SSE streaming available at: /api/research/stream/:executionId');
```

**Verification**:

- [ ] No WebSocket references in logs
- [ ] Startup logs show correct SSE endpoints
- [ ] HITL service configuration accurate

---

### Phase 5: Enable Metrics Collection (P3 - 15 minutes)

**Goal**: Enable metrics for production monitoring

#### Task 5.1: Update Monitoring Configuration

**File**: `apps/dev-brand-api/src/app/config/monitoring.config.ts`

```typescript
export function getMonitoringConfig(): MonitoringConfig {
  return {
    enabled: true,

    metrics: {
      backend: 'prometheus',
      batchSize: 100,
      flushInterval: 10000,
      // ✅ Enable metrics collection
      enabled: true, // ADD THIS
    },

    alerting: {
      // ✅ Enable alerting in production
      enabled:
        process.env.MONITORING_ALERTING_ENABLED === 'true' || process.env.NODE_ENV === 'production',
      evaluationInterval: 30000,
    },
  };
}
```

**Verification**:

- [ ] Metrics collection shows enabled in logs
- [ ] AlertingService shows active alert rules
- [ ] No more "fallback mode" messages

---

## 🧪 Testing Plan

### Integration Tests

```typescript
describe('LangGraph HITL Streaming', () => {
  it('should handle interrupt and resume correctly', async () => {
    // 1. Start research workflow
    const response = await request(app.getHttpServer()).post('/api/research/chat').send({
      userId: 'test-user',
      query: 'research angular signals',
      researchDepth: 'detailed',
    });

    const { executionId } = response.body;

    // 2. Connect to SSE stream
    const stream = await connectToSSE(`/api/research/stream/${executionId}`);

    // 3. Wait for interrupt event
    const interruptEvent = await waitForEvent(stream, 'interrupt');
    expect(interruptEvent.data.type).toBe('interrupt');
    expect(interruptEvent.data.payload.reportDraft).toBeDefined();

    // 4. Approve report
    await request(app.getHttpServer()).post(`/api/research/approve/${executionId}`).send({
      approved: true,
      feedback: 'Looks good!',
    });

    // 5. Wait for completion
    const completeEvent = await waitForEvent(stream, 'complete');
    expect(completeEvent.data.finalState.savedReportFilename).toBeDefined();
  });

  it('should handle state validation correctly', async () => {
    // Test that undefined state doesn't crash
    const response = await request(app.getHttpServer())
      .post('/api/research/chat')
      .send({ userId: 'test', query: 'test' });

    const stream = await connectToSSE(`/api/research/stream/${response.body.executionId}`);

    // Should receive events without crashes
    const firstEvent = await waitForEvent(stream, 'update');
    expect(firstEvent).toBeDefined();
  });
});
```

### Manual Testing Checklist

- [ ] Start research workflow
- [ ] Verify SSE connection establishes
- [ ] Confirm events stream without crashes
- [ ] Wait for interrupt event
- [ ] Approve report in modal
- [ ] Verify workflow resumes
- [ ] Confirm report saves successfully
- [ ] Check memory health shows healthy
- [ ] Verify no WebSocket references in logs

---

## 📊 Success Metrics

### Before (Current State)

- ❌ Research workflow crashes immediately
- ❌ HITL using custom implementation
- ❌ Memory health checks fail 100% of time
- ❌ Phantom WebSocket references in logs
- ❌ Metrics collection disabled

### After (Target State)

- ✅ Research workflow completes successfully
- ✅ HITL using LangGraph native `interrupt()`
- ✅ Memory health checks pass in development
- ✅ Clean logs with SSE endpoints only
- ✅ Metrics collection active
- ✅ 100% aligned with LangGraph v1.0 best practices

---

## 🎯 Implementation Priority

| Phase       | Priority | Effort | Impact   | Dependencies                 |
| ----------- | -------- | ------ | -------- | ---------------------------- |
| **Phase 1** | P0       | 1-2h   | Critical | None - start immediately     |
| **Phase 2** | P1       | 3-4h   | High     | Phase 1 complete             |
| **Phase 3** | P1       | 1h     | High     | None - parallel with Phase 2 |
| **Phase 4** | P2       | 30min  | Medium   | Phase 1 complete             |
| **Phase 5** | P3       | 15min  | Low      | None - can be done anytime   |

**Recommended Order**:

1. Phase 1 (Fix crashes) - IMMEDIATE
2. Phase 3 (Memory) - PARALLEL with Phase 2
3. Phase 2 (HITL realignment) - AFTER Phase 1
4. Phase 4 (Cleanup) - AFTER Phase 1
5. Phase 5 (Metrics) - ANYTIME

---

## 📚 References

- [LangGraph Streaming Guide](https://docs.langchain.com/oss/javascript/langgraph/streaming)
- [LangGraph Interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts)
- [LangGraph Human-in-the-Loop](https://docs.langchain.com/oss/javascript/langchain/human-in-the-loop)
- [LangGraph v1.0 Migration Guide](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [LangSmith Streaming API](https://docs.langchain.com/langsmith/streaming)

---

**Next Step**: Review this plan and decide:

1. Implement all phases sequentially
2. Start with Phase 1 only (quickfix)
3. Modify plan based on requirements

**Estimated Total Time**: 6-8 hours for complete implementation
