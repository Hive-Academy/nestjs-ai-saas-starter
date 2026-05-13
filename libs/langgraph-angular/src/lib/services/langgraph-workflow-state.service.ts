import { Injectable, computed, inject, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import type { Observable, Subscription } from 'rxjs';

import type {
  StreamUpdate,
  StreamMetadata,
} from '../models/stream-events.model';
import { StreamEventType } from '../models/stream-events.model';
import type {
  ExecutionState,
  AgentProgress,
  HITLApproval,
} from '../models/workflow-state.model';
import { createInitialExecutionState } from '../models/workflow-state.model';
import { LANGGRAPH_CONFIG } from '../models/config.model';
import { LangGraphSseService } from './langgraph-sse.service';

/** Maximum number of events to retain in history */
const MAX_EVENT_HISTORY = 10_000;

/**
 * Generic signal-based state management service for LangGraph workflow execution.
 *
 * @remarks
 * Maintains execution state, agent progress, HITL queue, and event history.
 * Delegates node-to-agent mapping to consumer-provided `nodeIdMapper` in config.
 *
 * **Key design decisions**:
 * - Agents are dynamically discovered from stream events (no hardcoded agent lists)
 * - Node ID mapping is delegated to `config.nodeIdMapper`
 * - Event history is capped at `MAX_EVENT_HISTORY` entries
 * - Sequence gap detection for diagnosing dropped events
 *
 * @public
 */
@Injectable()
export class LangGraphWorkflowStateService {
  private readonly sseService = inject(LangGraphSseService);
  private readonly config = inject(LANGGRAPH_CONFIG);

  // ---------------------------------------------------------------------------
  // Core state signals
  // ---------------------------------------------------------------------------

  private readonly _executionState = signal<ExecutionState>(
    createInitialExecutionState()
  );
  private readonly _agentProgress = signal<Record<string, AgentProgress>>({});
  private readonly _hitlQueue = signal<HITLApproval[]>([]);
  private readonly _eventHistory = new BehaviorSubject<StreamUpdate[]>([]);

  /** Tracks the last observed sequence number for gap detection */
  private lastSequenceNumber = -1;

  /** Active SSE subscription reference for cleanup */
  private sseSubscription: Subscription | null = null;
  private errorSubscription: Subscription | null = null;

  // ---------------------------------------------------------------------------
  // Public readonly accessors
  // ---------------------------------------------------------------------------

  /** Current execution state (lifecycle, step tracking, errors). */
  readonly executionState = this._executionState.asReadonly();

  /** Map of agent IDs to their current progress state. */
  readonly agentProgress = this._agentProgress.asReadonly();

  /** Queue of pending HITL approval requests. */
  readonly hitlQueue = this._hitlQueue.asReadonly();

  /** Observable event history for debug panels and virtual scrolling. */
  readonly eventHistory$: Observable<StreamUpdate[]> =
    this._eventHistory.asObservable();

  // ---------------------------------------------------------------------------
  // Computed signals
  // ---------------------------------------------------------------------------

  /** Whether the workflow is currently executing. */
  readonly isExecuting = computed(
    () => this.executionState().status === 'running'
  );

  /**
   * The ID of the first agent with an active status, or `null` if none.
   *
   * @remarks
   * Active statuses are: `thinking`, `executing`, `waiting`.
   */
  readonly currentAgent = computed(() => {
    const agents = this.agentProgress();
    const activeStatuses: ReadonlyArray<string> = [
      'thinking',
      'executing',
      'waiting',
    ];

    for (const [agentId, progress] of Object.entries(agents)) {
      if (activeStatuses.includes(progress.status)) {
        return agentId;
      }
    }

    return null;
  });

  /**
   * Overall workflow progress as a percentage (0-100).
   *
   * @remarks
   * Computed dynamically from the number of completed agents
   * divided by the total number of discovered agents.
   * Returns 0 if no agents have been discovered yet.
   */
  readonly workflowProgress = computed(() => {
    const agents = this.agentProgress();
    const entries = Object.values(agents);
    const total = entries.length;
    if (total === 0) return 0;

    const completed = entries.filter((a) => a.status === 'completed').length;
    return Math.round((completed / total) * 100);
  });

  /** Whether there are any pending HITL approval requests. */
  readonly hasPendingApprovals = computed(() =>
    this.hitlQueue().some((a) => a.status === 'pending')
  );

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Start tracking a workflow execution.
   *
   * @remarks
   * Resets all state to initial values, sets status to `running`,
   * connects the SSE service, and subscribes to workflow updates.
   *
   * @param streamUrl - Full URL for the SSE stream endpoint
   */
  startExecution(streamUrl: string): void {
    // Clean up any existing subscription
    this.cleanupSubscriptions();

    // Reset all state
    this._executionState.set({
      ...createInitialExecutionState(),
      status: 'running',
      startTime: new Date(),
    });
    this._agentProgress.set({});
    this._hitlQueue.set([]);
    this._eventHistory.next([]);
    this.lastSequenceNumber = -1;

    // Connect SSE and subscribe to events
    this.sseService.connect(streamUrl);
    this.subscribeToSseEvents();
  }

  /**
   * Reset all state to initial idle values and disconnect SSE.
   *
   * @remarks
   * Clears execution state, agent progress, HITL queue, and event history.
   * Disconnects the SSE connection and cleans up subscriptions.
   */
  reset(): void {
    this.cleanupSubscriptions();
    this.sseService.disconnect();

    this._executionState.set(createInitialExecutionState());
    this._agentProgress.set({});
    this._hitlQueue.set([]);
    this._eventHistory.next([]);
    this.lastSequenceNumber = -1;
  }

  /**
   * Resolve an HITL approval request with an approve or reject decision.
   *
   * @param approvalId - ID of the approval request to resolve
   * @param status - Decision: 'approved' or 'rejected'
   * @param reason - Optional reason for the decision
   */
  resolveApproval(
    approvalId: string,
    status: 'approved' | 'rejected',
    reason?: string
  ): void {
    this._hitlQueue.update((queue) =>
      queue.map((approval) =>
        approval.id === approvalId ? { ...approval, status } : approval
      )
    );

    // If no more pending approvals and workflow was paused, resume running
    const stillPending = this._hitlQueue().some((a) => a.status === 'pending');
    if (!stillPending && this._executionState().status === 'paused') {
      this._executionState.update((state) => ({
        ...state,
        status: 'running',
      }));
    }

    if (reason) {
      console.log(
        `[WorkflowStateService] Approval ${approvalId} ${status}: ${reason}`
      );
    }
  }

  /**
   * Look up the execution ID associated with an HITL approval request.
   *
   * @param approvalId - ID of the approval request
   * @returns The execution ID, or `undefined` if not found
   */
  getApprovalExecutionId(approvalId: string): string | undefined {
    return this._hitlQueue().find((a) => a.id === approvalId)?.executionId;
  }

  /**
   * Query event history by event type.
   *
   * @param type - The `StreamEventType` to filter by
   * @returns Matching events from the event history
   */
  getEventsByType(type: StreamEventType): StreamUpdate[] {
    return this._eventHistory.value.filter((e) => e.type === type);
  }

  /**
   * Query event history by agent ID.
   *
   * @param agentId - The agent ID to filter by (resolved via `nodeIdMapper`)
   * @returns Matching events from the event history
   */
  getEventsByAgent(agentId: string): StreamUpdate[] {
    return this._eventHistory.value.filter((e) => {
      const nodeId = e.metadata?.nodeId;
      if (!nodeId) return false;
      const resolved = this.resolveAgentId(nodeId);
      return resolved === agentId;
    });
  }

  // ---------------------------------------------------------------------------
  // SSE Subscription
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to SSE service streams and route events to handlers.
   */
  private subscribeToSseEvents(): void {
    this.sseSubscription = this.sseService.workflowUpdates$.subscribe(
      (rawUpdate: Record<string, unknown>) => {
        const update = this.rawToStreamUpdate(rawUpdate);
        this.addToEventHistory(update);
        this.processStreamUpdate(update);
      }
    );

    this.errorSubscription = this.sseService.errors$.subscribe((error) => {
      console.error('[WorkflowStateService] SSE connection error:', error);
      this._executionState.update((state) => ({
        ...state,
        status: 'error',
        error: error.message,
        endTime: new Date(),
      }));
    });
  }

  /**
   * Clean up active SSE subscriptions to prevent memory leaks.
   */
  private cleanupSubscriptions(): void {
    if (this.sseSubscription) {
      this.sseSubscription.unsubscribe();
      this.sseSubscription = null;
    }
    if (this.errorSubscription) {
      this.errorSubscription.unsubscribe();
      this.errorSubscription = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Event Processing Router
  // ---------------------------------------------------------------------------

  /**
   * Route a stream update to the appropriate handler based on event type.
   */
  private processStreamUpdate(update: StreamUpdate): void {
    switch (update.type) {
      case StreamEventType.WORKFLOW_START:
        this.handleWorkflowStart(update);
        break;
      case StreamEventType.WORKFLOW_END:
        this.handleWorkflowEnd(update);
        break;
      case StreamEventType.WORKFLOW_ERROR:
        this.handleWorkflowError(update);
        break;
      case StreamEventType.NODE_START:
        this.handleNodeStart(update);
        break;
      case StreamEventType.NODE_END:
      case StreamEventType.NODE_COMPLETE:
        this.handleNodeEnd(update);
        break;
      case StreamEventType.NODE_ERROR:
        this.handleNodeError(update);
        break;
      case StreamEventType.PROGRESS:
        this.handleProgressUpdate(update);
        break;
      case StreamEventType.MILESTONE:
        this.handleMilestone(update);
        break;
      case StreamEventType.TOKEN:
        this.handleStreamData(update);
        break;
      case StreamEventType.CUSTOM:
      case StreamEventType.CUSTOM_STREAM:
        this.handleCustomEvent(update);
        break;
      case StreamEventType.MESSAGE_STREAM:
        this.handleStreamData(update);
        break;
      case StreamEventType.VALUES:
      case StreamEventType.UPDATES:
      case StreamEventType.MESSAGES:
      case StreamEventType.EVENTS:
      case StreamEventType.DEBUG:
      case StreamEventType.DEBUG_STREAM:
      case StreamEventType.FINAL:
        this.handleStreamData(update);
        break;
      case StreamEventType.ERROR:
        this.handleWorkflowError(update);
        break;
      default:
        console.warn(
          '[WorkflowStateService] Unhandled event type:',
          (update as StreamUpdate).type
        );
    }
  }

  // ---------------------------------------------------------------------------
  // Event Handlers
  // ---------------------------------------------------------------------------

  private handleWorkflowStart(update: StreamUpdate): void {
    const executionId = update.metadata?.executionId ?? undefined;
    this._executionState.update((state) => ({
      ...state,
      status: 'running',
      executionId,
      startTime: state.startTime ?? new Date(),
    }));
  }

  private handleWorkflowEnd(update: StreamUpdate): void {
    this._executionState.update((state) => ({
      ...state,
      status: 'completed',
      endTime: new Date(),
      currentStep: state.totalSteps > 0 ? state.totalSteps : state.currentStep,
    }));

    // Mark any still-active agents as completed
    this._agentProgress.update((agents) => {
      const updated: Record<string, AgentProgress> = {};
      for (const [id, agent] of Object.entries(agents)) {
        if (
          agent.status !== 'idle' &&
          agent.status !== 'completed' &&
          agent.status !== 'error'
        ) {
          updated[id] = {
            ...agent,
            status: 'completed',
            progress: 100,
            currentAction: null,
            lastUpdate: new Date(),
          };
        } else {
          updated[id] = agent;
        }
      }
      return updated;
    });
  }

  private handleWorkflowError(update: StreamUpdate): void {
    const data = update.data as Record<string, unknown> | undefined;
    const errorMessage =
      (typeof data?.['message'] === 'string' ? data['message'] : null) ??
      (typeof data?.['error'] === 'string' ? data['error'] : null) ??
      'Unknown workflow error';

    this._executionState.update((state) => ({
      ...state,
      status: 'error',
      error: errorMessage,
      endTime: new Date(),
    }));
  }

  private handleNodeStart(update: StreamUpdate): void {
    const nodeId = update.metadata?.nodeId;
    const agentId = this.resolveAgentId(nodeId);
    if (!agentId) return;

    // Dynamic agent discovery: add new agents as they appear
    this._agentProgress.update((agents) => {
      const existing = agents[agentId];
      if (existing) {
        return {
          ...agents,
          [agentId]: {
            ...existing,
            status: 'executing',
            currentAction: 'Processing...',
            lastUpdate: new Date(),
          },
        };
      }

      // First time seeing this agent - register dynamically
      return {
        ...agents,
        [agentId]: {
          agentId,
          agentName: agentId,
          status: 'executing',
          progress: 0,
          currentAction: 'Processing...',
          lastUpdate: new Date(),
        },
      };
    });

    // Increment step count
    this._executionState.update((state) => ({
      ...state,
      currentStep: state.currentStep + 1,
      totalSteps: Math.max(state.totalSteps, state.currentStep + 1),
    }));
  }

  private handleNodeEnd(update: StreamUpdate): void {
    const nodeId = update.metadata?.nodeId;
    const agentId = this.resolveAgentId(nodeId);
    if (!agentId) return;

    this._agentProgress.update((agents) => {
      const agent = agents[agentId];
      if (!agent) return agents;

      return {
        ...agents,
        [agentId]: {
          ...agent,
          status: 'completed',
          progress: 100,
          currentAction: null,
          lastUpdate: new Date(),
        },
      };
    });
  }

  private handleNodeError(update: StreamUpdate): void {
    const nodeId = update.metadata?.nodeId;
    const agentId = this.resolveAgentId(nodeId);
    if (!agentId) return;

    const data = update.data as Record<string, unknown> | undefined;
    const errorMessage =
      typeof data?.['message'] === 'string'
        ? data['message']
        : 'Node execution error';

    this._agentProgress.update((agents) => {
      const agent = agents[agentId];
      if (!agent) return agents;

      return {
        ...agents,
        [agentId]: {
          ...agent,
          status: 'error',
          currentAction: errorMessage,
          lastUpdate: new Date(),
        },
      };
    });
  }

  private handleProgressUpdate(update: StreamUpdate): void {
    const data = update.data as Record<string, unknown> | undefined;
    if (!data) return;

    const nodeId = update.metadata?.nodeId;
    const agentId =
      this.resolveAgentId(nodeId) ?? this.currentAgent() ?? undefined;
    if (!agentId) return;

    const percentage =
      typeof data['percentage'] === 'number' ? data['percentage'] : undefined;
    const message =
      typeof data['message'] === 'string' ? data['message'] : undefined;

    this._agentProgress.update((agents) => {
      const agent = agents[agentId];
      if (!agent) return agents;

      return {
        ...agents,
        [agentId]: {
          ...agent,
          progress: percentage ?? agent.progress,
          currentAction: message ?? agent.currentAction,
          lastUpdate: new Date(),
        },
      };
    });
  }

  private handleMilestone(update: StreamUpdate): void {
    const data = update.data as Record<string, unknown> | undefined;
    if (!data) return;

    const nodeId = update.metadata?.nodeId;
    const agentId = this.resolveAgentId(nodeId);

    // Milestones can update total steps dynamically
    const totalSteps =
      typeof data['totalSteps'] === 'number' ? data['totalSteps'] : undefined;
    if (totalSteps !== undefined) {
      this._executionState.update((state) => ({
        ...state,
        totalSteps,
      }));
    }

    if (agentId) {
      const milestoneMessage =
        typeof data['message'] === 'string'
          ? data['message']
          : 'Milestone reached';

      this._agentProgress.update((agents) => {
        const agent = agents[agentId];
        if (!agent) return agents;

        return {
          ...agents,
          [agentId]: {
            ...agent,
            currentAction: milestoneMessage,
            lastUpdate: new Date(),
          },
        };
      });
    }
  }

  private handleCustomEvent(update: StreamUpdate): void {
    const data = update.data as Record<string, unknown> | undefined;
    if (!data) return;

    // Check for HITL interruption request
    const eventKind = data['kind'] ?? data['event'];
    if (eventKind === 'interruption_request') {
      const approval: HITLApproval = {
        id:
          (typeof data['approvalId'] === 'string'
            ? data['approvalId']
            : null) ?? `hitl-${Date.now()}`,
        executionId:
          update.metadata?.executionId ??
          this._executionState().executionId ??
          '',
        agentId:
          (typeof data['agentId'] === 'string' ? data['agentId'] : null) ??
          this.currentAgent() ??
          'unknown',
        message:
          typeof data['message'] === 'string'
            ? data['message']
            : 'Approval required',
        context: data['context'] ?? data,
        requestedAt: new Date(),
        status: 'pending',
      };

      this._hitlQueue.update((queue) => [...queue, approval]);

      // Pause execution while waiting for human decision
      this._executionState.update((state) => ({
        ...state,
        status: 'paused',
      }));

      return;
    }

    // Generic custom event: update agent progress if applicable
    const nodeId = update.metadata?.nodeId;
    const agentIdFromData =
      typeof data['agent'] === 'string' ? data['agent'] : null;
    const agentId =
      agentIdFromData ?? this.resolveAgentId(nodeId) ?? this.currentAgent();
    if (!agentId) return;

    const percentage =
      typeof data['percentage'] === 'number' ? data['percentage'] : undefined;
    const message =
      typeof data['message'] === 'string' ? data['message'] : undefined;

    this._agentProgress.update((agents) => {
      const agent = agents[agentId];
      if (!agent) return agents;

      return {
        ...agents,
        [agentId]: {
          ...agent,
          progress: percentage ?? agent.progress,
          currentAction: message ?? agent.currentAction,
          lastUpdate: new Date(),
        },
      };
    });
  }

  private handleStreamData(update: StreamUpdate): void {
    // Stream data events (token, message-stream, values, updates, etc.)
    // are primarily consumed by the LangGraphStreamingService.
    // This handler ensures they are recorded in event history (already done
    // in addToEventHistory) and can optionally update agent status.
    const nodeId = update.metadata?.nodeId;
    const agentId = this.resolveAgentId(nodeId);
    if (!agentId) return;

    // If the agent is in idle state, transition to thinking
    this._agentProgress.update((agents) => {
      const agent = agents[agentId];
      if (!agent || agent.status !== 'idle') return agents;

      return {
        ...agents,
        [agentId]: {
          ...agent,
          status: 'thinking',
          currentAction: 'Processing stream data...',
          lastUpdate: new Date(),
        },
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Agent ID Resolution
  // ---------------------------------------------------------------------------

  /**
   * Resolve a LangGraph node ID to an application-specific agent ID.
   *
   * @remarks
   * Delegates to `config.nodeIdMapper` if provided. Falls back to using
   * the raw node ID as the agent ID.
   *
   * @param nodeId - The LangGraph node ID to resolve
   * @returns Resolved agent ID, or `null` if nodeId is undefined
   */
  private resolveAgentId(nodeId?: string): string | null {
    if (!nodeId) return null;
    return this.config.nodeIdMapper?.(nodeId) ?? nodeId;
  }

  // ---------------------------------------------------------------------------
  // Event History Management
  // ---------------------------------------------------------------------------

  /**
   * Add a stream update to the event history with sequence gap detection.
   *
   * @remarks
   * Caps history at `MAX_EVENT_HISTORY` entries, discarding oldest events.
   * Logs a warning if a sequence gap is detected (indicating dropped events).
   */
  private addToEventHistory(update: StreamUpdate): void {
    // Sequence gap detection
    const seq = update.metadata?.sequenceNumber;
    if (seq !== undefined && this.lastSequenceNumber >= 0) {
      const expected = this.lastSequenceNumber + 1;
      if (seq > expected) {
        console.warn(
          `[WorkflowStateService] Sequence gap detected: expected ${expected}, got ${seq} (${
            seq - expected
          } events may have been dropped)`
        );
      }
    }
    if (seq !== undefined) {
      this.lastSequenceNumber = seq;
    }

    const current = this._eventHistory.value;
    const updated =
      current.length >= MAX_EVENT_HISTORY
        ? [...current.slice(current.length - MAX_EVENT_HISTORY + 1), update]
        : [...current, update];

    this._eventHistory.next(updated);
  }

  // ---------------------------------------------------------------------------
  // Raw Data Conversion
  // ---------------------------------------------------------------------------

  /**
   * Convert a raw SSE data object to a typed `StreamUpdate`.
   */
  private rawToStreamUpdate(raw: Record<string, unknown>): StreamUpdate {
    const type = this.inferEventType(raw);
    const metadata: StreamMetadata = {
      timestamp: raw['timestamp']
        ? new Date(raw['timestamp'] as string)
        : new Date(),
      sequenceNumber:
        typeof raw['sequenceNumber'] === 'number'
          ? raw['sequenceNumber']
          : Date.now(),
      executionId:
        typeof raw['executionId'] === 'string' ? raw['executionId'] : '',
      nodeId:
        (typeof raw['nodeName'] === 'string' ? raw['nodeName'] : undefined) ??
        (typeof raw['nodeId'] === 'string' ? raw['nodeId'] : undefined),
    };

    return { type, data: raw, metadata };
  }

  /**
   * Infer the `StreamEventType` from a raw SSE payload.
   */
  private inferEventType(raw: Record<string, unknown>): StreamEventType {
    const rawType = raw['type'];

    // Direct string-to-enum mapping for known backend event types
    if (typeof rawType === 'string') {
      const typeMap: Record<string, StreamEventType> = {
        'workflow-update': StreamEventType.UPDATES,
        workflow_complete: StreamEventType.WORKFLOW_END,
        workflow_error: StreamEventType.WORKFLOW_ERROR,
        'message-stream': StreamEventType.MESSAGE_STREAM,
        'tool-execution': StreamEventType.EVENTS,
        'custom-stream': StreamEventType.CUSTOM_STREAM,
        'debug-stream': StreamEventType.DEBUG_STREAM,
        'workflow:start': StreamEventType.WORKFLOW_START,
        'workflow:end': StreamEventType.WORKFLOW_END,
        'workflow:error': StreamEventType.WORKFLOW_ERROR,
        'node:start': StreamEventType.NODE_START,
        'node:end': StreamEventType.NODE_END,
        'node:error': StreamEventType.NODE_ERROR,
        'node:complete': StreamEventType.NODE_COMPLETE,
        progress: StreamEventType.PROGRESS,
        milestone: StreamEventType.MILESTONE,
        token: StreamEventType.TOKEN,
        error: StreamEventType.ERROR,
        custom: StreamEventType.CUSTOM,
      };

      const mapped = typeMap[rawType];
      if (mapped) return mapped;

      // Check if the raw type is already a valid StreamEventType value
      const enumValues = Object.values(StreamEventType) as string[];
      if (enumValues.includes(rawType)) {
        return rawType as StreamEventType;
      }
    }

    return StreamEventType.CUSTOM;
  }
}
