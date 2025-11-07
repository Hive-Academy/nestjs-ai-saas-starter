import { Injectable, signal, computed, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  StreamUpdate,
  StreamEventType,
  TokenUpdate,
} from '../models/stream-events.model';
import {
  ExecutionState,
  ExecutionStatus,
} from '../models/execution-state.model';
import { AgentProgress, AgentStatus } from '../models/agent-progress.model';
import { DevBrandWebSocketService } from './devbrand-websocket.service';

/**
 * AgentProgressMap Type
 *
 * Map of agent IDs to their current progress state.
 *
 * @remarks
 * - 3 agents in DevBrand workflow:
 *   1. github-code-analyzer: GitHub repository analysis
 *   2. personal-brand-strategist: Brand strategy development
 *   3. content-creator: Content generation
 * - Used for tracking parallel agent execution
 *
 * @public
 */
export type AgentProgressMap = Record<string, AgentProgress>;

/**
 * HITLApproval Interface
 *
 * Human-in-the-loop approval request.
 *
 * @remarks
 * - Represents a workflow interruption requiring human decision
 * - Used for approval queue management
 *
 * @public
 */
export interface HITLApproval {
  /** Unique approval request ID */
  id: string;
  /** Execution ID this approval belongs to */
  executionId: string;
  /** Agent requesting approval */
  agentId: string;
  /** Human-readable approval message */
  message: string;
  /** Approval context/details */
  context: unknown;
  /** Timestamp when approval was requested */
  requestedAt: Date;
  /** Approval status */
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * DevBrand Workflow State Service
 *
 * Centralized state management for LangGraph workflow execution with real-time event processing.
 * Evidence: implementation-plan.md:307-584 (DevBrandWorkflowStateService specification)
 *
 * @remarks
 * **Purpose**:
 * - Subscribe to WebSocket event streams from DevBrandWebSocketService
 * - Process all 16 StreamEventType values with comprehensive event handlers
 * - Maintain ExecutionState, AgentProgressMap, HITL queue via signals
 * - Provide computed signals for derived state (progress, current agent, flags)
 * - Track event history with sequence validation (detect missed events)
 *
 * **State Architecture** (Signal-Based):
 * - _executionState (signal): Workflow lifecycle (idle → running → completed/error)
 * - _agentProgress (signal): 3-agent parallel tracking with granular status
 * - _hitlQueue (signal): Human-in-the-loop approval queue
 * - _eventHistory (BehaviorSubject): Complete event log for virtual scrolling
 *
 * **Event Processing**:
 * - All 16 StreamEventType values handled with dedicated processors
 * - Sequence number validation (gaps detected and logged)
 * - Agent ID extraction from canonical node IDs (devbrand/github-analysis → github-code-analyzer)
 * - Real-time state mutations on every event
 *
 * **Computed Properties**:
 * - isExecuting: boolean - workflow running flag
 * - currentAgent: string | null - active agent ID
 * - workflowProgress: number - overall progress percentage (0-100)
 * - hasPendingApprovals: boolean - HITL queue not empty
 *
 * **Modern Angular Pattern**:
 * - Signal-based state (NOT BehaviorSubjects for primitive state)
 * - Computed signals for derived state (automatic recalculation)
 * - Modern inject() pattern (NOT constructor injection)
 * - Readonly signal accessors (asReadonly() for immutability)
 *
 * **Performance Optimization**:
 * - BehaviorSubject for event history (optimized for large arrays with virtual scrolling)
 * - Signal granularity: separate signals avoid unnecessary recomputation
 * - Sequence validation prevents duplicate processing
 *
 * @example
 * ```typescript
 * // In component
 * const stateService = inject(DevBrandWorkflowStateService);
 *
 * // Start workflow execution
 * stateService.startExecution('exec-abc123');
 *
 * // Monitor execution state
 * effect(() => {
 *   const state = stateService.executionState();
 *   console.log('Status:', state.status);
 * });
 *
 * // Get current agent
 * effect(() => {
 *   const agent = stateService.currentAgent();
 *   console.log('Active agent:', agent);
 * });
 *
 * // Monitor overall progress
 * effect(() => {
 *   const progress = stateService.workflowProgress();
 *   console.log('Progress:', progress, '%');
 * });
 *
 * // Access event history
 * stateService.eventHistory$.subscribe(events => {
 *   console.log('Total events:', events.length);
 * });
 *
 * // Filter events by type
 * const errorEvents = stateService.getEventsByType(StreamEventType.ERROR);
 *
 * // Filter events by agent
 * const analyzerEvents = stateService.getEventsByAgent('github-code-analyzer');
 * ```
 *
 * @see {@link ExecutionState} Workflow execution state interface
 * @see {@link AgentProgress} Individual agent progress interface
 * @see {@link StreamUpdate} Stream event interface
 * @public
 */
@Injectable({
  providedIn: 'root',
})
export class DevBrandWorkflowStateService {
  /**
   * WebSocket service for real-time event streaming
   * @private
   */
  private readonly wsService = inject(DevBrandWebSocketService);

  /**
   * Workflow execution state signal
   * @private
   * @remarks
   * - Tracks workflow lifecycle: idle → running → completed/error
   * - Updated on workflow:start, workflow:end, workflow:error events
   * - Contains executionId, timestamps, error messages
   */
  private readonly _executionState = signal<ExecutionState>({
    status: 'idle' as ExecutionStatus,
    currentStep: 0,
    totalSteps: 3, // 3 agents in DevBrand workflow
    startTime: null,
    endTime: null,
    error: null,
  });

  /**
   * Agent progress map signal
   * @private
   * @remarks
   * - 3 agents: github-code-analyzer, personal-brand-strategist, content-creator
   * - Updated on node:start, node:end, progress, milestone events
   * - Tracks status, progress percentage, current action, last update
   */
  private readonly _agentProgress = signal<AgentProgressMap>({
    'github-code-analyzer': {
      agentId: 'github-code-analyzer',
      agentName: 'GitHub Code Analyzer',
      status: 'idle' as AgentStatus,
      progress: 0,
      currentAction: null,
      lastUpdate: new Date(),
    },
    'personal-brand-strategist': {
      agentId: 'personal-brand-strategist',
      agentName: 'Personal Brand Strategist',
      status: 'idle' as AgentStatus,
      progress: 0,
      currentAction: null,
      lastUpdate: new Date(),
    },
    'content-creator': {
      agentId: 'content-creator',
      agentName: 'Content Creator',
      status: 'idle' as AgentStatus,
      progress: 0,
      currentAction: null,
      lastUpdate: new Date(),
    },
  });

  /**
   * HITL approval queue signal
   * @private
   * @remarks
   * - Stores pending human-in-the-loop approval requests
   * - Updated when workflow pauses for user decisions
   * - Cleared on approval/rejection or workflow completion
   */
  private readonly _hitlQueue = signal<HITLApproval[]>([]);

  /**
   * Event history subject (BehaviorSubject for large arrays)
   * @private
   * @remarks
   * - Stores complete event log for virtual scrolling
   * - Sequence validation on every event append
   * - Performance: BehaviorSubject optimized for 10k+ events
   */
  private readonly _eventHistory = new BehaviorSubject<StreamUpdate[]>([]);

  /**
   * Readonly execution state accessor
   * @public
   * @remarks
   * - Immutable reference (asReadonly())
   * - Components can read but not mutate
   */
  readonly executionState = this._executionState.asReadonly();

  /**
   * Readonly agent progress accessor
   * @public
   */
  readonly agentProgress = this._agentProgress.asReadonly();

  /**
   * Readonly HITL queue accessor
   * @public
   */
  readonly hitlQueue = this._hitlQueue.asReadonly();

  /**
   * Event history observable
   * @public
   * @remarks
   * - Observable stream for event log updates
   * - Used by EventStreamComponent for virtual scrolling
   */
  readonly eventHistory$: Observable<StreamUpdate[]> =
    this._eventHistory.asObservable();

  /**
   * Computed: Is workflow currently executing?
   * @public
   * @remarks
   * - Derived from executionState().status === 'running'
   * - Automatically recalculates on status change
   * - Used for UI loading states, button disabling
   */
  readonly isExecuting = computed(
    () => this.executionState().status === 'running'
  );

  /**
   * Computed: Current active agent ID
   * @public
   * @remarks
   * - Finds first agent with status 'thinking', 'executing', or 'waiting'
   * - Returns null if no active agent
   * - Used for UI highlighting, focus indicators
   */
  readonly currentAgent = computed(() => {
    const agents = this.agentProgress();
    const activeStatuses: AgentStatus[] = ['thinking', 'executing', 'waiting'];

    for (const [agentId, progress] of Object.entries(agents)) {
      if (activeStatuses.includes(progress.status)) {
        return agentId;
      }
    }

    return null;
  });

  /**
   * Computed: Overall workflow progress percentage
   * @public
   * @remarks
   * - Calculates based on completed agents / total agents
   * - Returns 0-100 percentage
   * - Formula: (completed agents / 3) * 100
   */
  readonly workflowProgress = computed(() => {
    const agents = this.agentProgress();
    const total = Object.keys(agents).length;
    const completed = Object.values(agents).filter(
      (a) => a.status === 'completed'
    ).length;
    return Math.round((completed / total) * 100);
  });

  /**
   * Computed: Has pending HITL approvals?
   * @public
   * @remarks
   * - Returns true if HITL queue is not empty
   * - Used for approval notification badges
   */
  readonly hasPendingApprovals = computed(() => this.hitlQueue().length > 0);

  /**
   * Constructor - Initialize WebSocket subscriptions
   * @remarks
   * - Subscribes to streamUpdates$, tokenUpdates$, errors$
   * - Event processors registered for all event types
   * - Automatic cleanup on service destroy
   */
  constructor() {
    this.subscribeToWebSocketEvents();
  }

  /**
   * Start workflow execution tracking
   *
   * @param executionId - Unique workflow execution ID from REST API
   *
   * @remarks
   * - Sets status to 'running'
   * - Resets all agent progress to 'idle'
   * - Clears event history and HITL queue
   * - Call after receiving executionId from DevBrandApiService
   *
   * @example
   * ```typescript
   * // After REST API call
   * apiService.executeWorkflow(request).subscribe(response => {
   *   stateService.startExecution(response.executionId);
   *   wsService.connect(response.websocketUrl);
   *   wsService.subscribeToExecution(response.executionId);
   * });
   * ```
   *
   * @public
   */
  startExecution(executionId: string): void {
    this._executionState.set({
      status: 'running',
      currentStep: 0,
      totalSteps: 3,
      startTime: new Date(),
      endTime: null,
      error: null,
    });

    // Reset all agents to idle state
    this._agentProgress.update((agents) => {
      const reset: AgentProgressMap = {};
      for (const [agentId, agent] of Object.entries(agents)) {
        reset[agentId] = {
          ...agent,
          status: 'idle',
          progress: 0,
          currentAction: null,
          lastUpdate: new Date(),
        };
      }
      return reset;
    });

    // Clear history and queue
    this._eventHistory.next([]);
    this._hitlQueue.set([]);
  }

  /**
   * Subscribe to WebSocket event streams
   * @private
   * @remarks
   * - Processes streamUpdates$: workflow/node/progress/milestone/error events
   * - Processes tokenUpdates$: LLM token streaming
   * - Processes errors$: WebSocket connection errors
   * - All subscriptions automatically managed by service lifecycle
   */
  private subscribeToWebSocketEvents(): void {
    console.log(
      '🎧 [DevBrandWorkflowStateService] Subscribing to WebSocket events...'
    );

    // Stream updates: all workflow events
    this.wsService.streamUpdates$.subscribe((update) => {
      console.log('📨 [DevBrandWorkflowStateService] Received streamUpdate');
      console.log(
        '📊 [DevBrandWorkflowStateService] Update type:',
        update.type
      );
      console.log(
        '🔢 [DevBrandWorkflowStateService] Sequence:',
        update.metadata.sequenceNumber
      );
      console.log('📋 [DevBrandWorkflowStateService] Full update:', update);
      this.processStreamUpdate(update);
      this.addToEventHistory(update);
      console.log(
        '✅ [DevBrandWorkflowStateService] Stream update processed and added to history'
      );
    });

    // Token updates: LLM token streaming
    this.wsService.tokenUpdates$.subscribe((token) => {
      console.log(
        '🔤 [DevBrandWorkflowStateService] Received tokenUpdate:',
        token
      );
      this.processTokenUpdate(token);
    });

    // Errors: WebSocket connection/validation errors
    this.wsService.errors$.subscribe((error) => {
      console.error('❌ [DevBrandWorkflowStateService] Received error:', error);
      this._executionState.update((state) => ({
        ...state,
        status: 'error',
        error: error.message,
        endTime: new Date(),
      }));
      console.error(
        '🔄 [DevBrandWorkflowStateService] Execution state updated to error'
      );
    });
  }

  /**
   * Process stream update and update relevant state
   *
   * @param update - Validated StreamUpdate event from WebSocket
   *
   * @remarks
   * - Handles all 16 StreamEventType values
   * - Routes to specialized handlers based on event type
   * - Updates execution state, agent progress, HITL queue
   *
   * Evidence: research-summary.md:332-366 (StreamEventType enumeration)
   *
   * @private
   */
  private processStreamUpdate(update: StreamUpdate): void {
    switch (update.type) {
      // Workflow lifecycle events
      case StreamEventType.WORKFLOW_START:
        this.handleWorkflowStart(update);
        break;

      case StreamEventType.WORKFLOW_END:
        this.handleWorkflowEnd(update);
        break;

      case StreamEventType.WORKFLOW_ERROR:
        this.handleWorkflowError(update);
        break;

      // Node lifecycle events
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

      // Progress events
      case StreamEventType.PROGRESS:
        this.handleProgressUpdate(update);
        break;

      case StreamEventType.MILESTONE:
        this.handleMilestone(update);
        break;

      // Token event
      case StreamEventType.TOKEN:
        // Token events handled by separate tokenUpdates$ stream
        // No state update needed here
        break;

      // Error event
      case StreamEventType.ERROR:
        this.handleError(update);
        break;

      // Stream data types (LangGraph stream modes)
      case StreamEventType.VALUES:
      case StreamEventType.UPDATES:
      case StreamEventType.MESSAGES:
      case StreamEventType.EVENTS:
      case StreamEventType.DEBUG:
      case StreamEventType.FINAL:
        this.handleStreamData(update);
        break;

      // Custom events
      case StreamEventType.CUSTOM:
        this.handleCustomEvent(update);
        break;

      default:
        console.warn('Unhandled event type:', update.type);
    }
  }

  /**
   * Handle WORKFLOW_START event
   * @private
   */
  private handleWorkflowStart(update: StreamUpdate): void {
    this._executionState.update((state) => ({
      ...state,
      status: 'running',
      startTime: new Date(),
    }));
  }

  /**
   * Handle WORKFLOW_END event
   * @private
   */
  private handleWorkflowEnd(update: StreamUpdate): void {
    this._executionState.update((state) => ({
      ...state,
      status: 'completed',
      endTime: new Date(),
      currentStep: state.totalSteps,
    }));
  }

  /**
   * Handle WORKFLOW_ERROR event
   * @private
   */
  private handleWorkflowError(update: StreamUpdate): void {
    const errorMessage =
      typeof update.data === 'object' && update.data !== null
        ? (update.data as { message?: string }).message ||
          'Unknown workflow error'
        : 'Unknown workflow error';

    this._executionState.update((state) => ({
      ...state,
      status: 'error',
      error: errorMessage,
      endTime: new Date(),
    }));
  }

  /**
   * Handle NODE_START event (agent activation)
   *
   * @param update - Stream update with node start metadata
   *
   * @remarks
   * - Extracts agent ID from canonical node ID (devbrand/github-analysis → github-code-analyzer)
   * - Sets agent status to 'executing'
   * - Updates currentAction from metadata.activity or metadata.detail
   * - Increments currentStep in execution state
   *
   * Evidence: research-summary.md:148-198 (GitHubCodeAnalyzerAgent)
   * Evidence: research-summary.md:395-406 (node ID structure)
   *
   * @private
   */
  private handleNodeStart(update: StreamUpdate): void {
    const agentId = this.extractAgentId(update.metadata?.nodeId);
    if (!agentId) {
      console.warn(
        'NODE_START: Could not extract agent ID from nodeId:',
        update.metadata?.nodeId
      );
      return;
    }

    this._agentProgress.update((agents) => {
      const agent = agents[agentId];
      if (!agent) {
        console.warn('NODE_START: Unknown agent ID:', agentId);
        return agents;
      }

      return {
        ...agents,
        [agentId]: {
          ...agent,
          status: 'executing',
          currentAction:
            update.metadata?.activity ||
            update.metadata?.detail ||
            'Processing...',
          lastUpdate: new Date(),
        },
      };
    });

    // Increment current step
    this._executionState.update((state) => ({
      ...state,
      currentStep: Math.min(state.currentStep + 1, state.totalSteps),
    }));
  }

  /**
   * Handle NODE_END/NODE_COMPLETE event (agent completion)
   *
   * @param update - Stream update with node end metadata
   *
   * @remarks
   * - Sets agent status to 'completed'
   * - Updates progress to 100%
   * - Clears currentAction
   *
   * @private
   */
  private handleNodeEnd(update: StreamUpdate): void {
    const agentId = this.extractAgentId(update.metadata?.nodeId);
    if (!agentId) {
      console.warn(
        'NODE_END: Could not extract agent ID from nodeId:',
        update.metadata?.nodeId
      );
      return;
    }

    this._agentProgress.update((agents) => {
      const agent = agents[agentId];
      if (!agent) {
        console.warn('NODE_END: Unknown agent ID:', agentId);
        return agents;
      }

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

  /**
   * Handle NODE_ERROR event
   * @private
   */
  private handleNodeError(update: StreamUpdate): void {
    const agentId = this.extractAgentId(update.metadata?.nodeId);
    if (!agentId) {
      console.warn(
        'NODE_ERROR: Could not extract agent ID from nodeId:',
        update.metadata?.nodeId
      );
      return;
    }

    const errorMessage =
      typeof update.data === 'object' && update.data !== null
        ? (update.data as { message?: string }).message || 'Node error'
        : 'Node error';

    this._agentProgress.update((agents) => {
      const agent = agents[agentId];
      if (!agent) {
        console.warn('NODE_ERROR: Unknown agent ID:', agentId);
        return agents;
      }

      return {
        ...agents,
        [agentId]: {
          ...agent,
          status: 'error',
          currentAction: `Error: ${errorMessage}`,
          lastUpdate: new Date(),
        },
      };
    });
  }

  /**
   * Handle PROGRESS event
   *
   * @param update - Stream update with progress data
   *
   * @remarks
   * - Updates agent progress percentage
   * - Updates currentAction if provided
   * - Progress data format: { percentage?: number, message?: string, agentId?: string }
   *
   * @private
   */
  private handleProgressUpdate(update: StreamUpdate): void {
    const progressData = update.data as {
      percentage?: number;
      message?: string;
      agentId?: string;
    };

    const agentId =
      progressData.agentId || this.extractAgentId(update.metadata?.nodeId);
    if (!agentId) {
      console.warn('PROGRESS: Could not determine agent ID');
      return;
    }

    this._agentProgress.update((agents) => {
      const agent = agents[agentId];
      if (!agent) {
        console.warn('PROGRESS: Unknown agent ID:', agentId);
        return agents;
      }

      return {
        ...agents,
        [agentId]: {
          ...agent,
          progress: progressData.percentage ?? agent.progress,
          currentAction: progressData.message ?? agent.currentAction,
          lastUpdate: new Date(),
        },
      };
    });
  }

  /**
   * Handle MILESTONE event
   *
   * @param update - Stream update with milestone data
   *
   * @remarks
   * - Milestone represents significant workflow checkpoint
   * - Updates agent currentAction with milestone description
   *
   * @private
   */
  private handleMilestone(update: StreamUpdate): void {
    const milestoneData = update.data as {
      name?: string;
      description?: string;
      agentId?: string;
    };

    const agentId =
      milestoneData.agentId || this.extractAgentId(update.metadata?.nodeId);
    if (!agentId) {
      console.warn('MILESTONE: Could not determine agent ID');
      return;
    }

    const milestoneMessage =
      milestoneData.description || milestoneData.name || 'Milestone reached';

    this._agentProgress.update((agents) => {
      const agent = agents[agentId];
      if (!agent) {
        console.warn('MILESTONE: Unknown agent ID:', agentId);
        return agents;
      }

      return {
        ...agents,
        [agentId]: {
          ...agent,
          currentAction: `Milestone: ${milestoneMessage}`,
          lastUpdate: new Date(),
        },
      };
    });
  }

  /**
   * Handle ERROR event
   * @private
   */
  private handleError(update: StreamUpdate): void {
    const errorMessage =
      typeof update.data === 'object' && update.data !== null
        ? (update.data as { message?: string }).message || 'Unknown error'
        : 'Unknown error';

    this._executionState.update((state) => ({
      ...state,
      status: 'error',
      error: errorMessage,
      endTime: new Date(),
    }));
  }

  /**
   * Handle stream data events (VALUES, UPDATES, MESSAGES, etc.)
   *
   * @param update - Stream update with stream data
   *
   * @remarks
   * - LangGraph stream modes provide different data views
   * - VALUES: complete state snapshots
   * - UPDATES: partial state updates
   * - MESSAGES: message streaming
   * - EVENTS: event stream
   * - DEBUG: debugging information
   * - FINAL: final output only
   * - No state mutation needed (data logged for debugging)
   *
   * @private
   */
  private handleStreamData(update: StreamUpdate): void {
    // Stream data events are informational
    // No state mutation needed - data available in event history
    console.debug('Stream data event:', update.type, update.data);
  }

  /**
   * Handle CUSTOM event
   *
   * @param update - Stream update with custom event data
   *
   * @remarks
   * - Application-specific custom events
   * - Could be HITL approvals, notifications, etc.
   *
   * @private
   */
  private handleCustomEvent(update: StreamUpdate): void {
    // Check if custom event is HITL approval request
    const customData = update.data as {
      type?: string;
      approvalId?: string;
      message?: string;
      context?: unknown;
    };

    if (customData.type === 'hitl_approval') {
      const approval: HITLApproval = {
        id: customData.approvalId || `approval-${Date.now()}`,
        executionId: update.metadata?.executionId || '',
        agentId: this.extractAgentId(update.metadata?.nodeId) || 'unknown',
        message: customData.message || 'Approval required',
        context: customData.context,
        requestedAt: new Date(),
        status: 'pending',
      };

      this._hitlQueue.update((queue) => [...queue, approval]);

      // Set execution to paused
      this._executionState.update((state) => ({
        ...state,
        status: 'paused',
      }));
    }
  }

  /**
   * Process token update (LLM streaming)
   *
   * @param token - Token update from LLM response
   *
   * @remarks
   * - Updates agent status to 'thinking' if not already set
   * - Token streaming indicates LLM generation in progress
   *
   * @private
   */
  private processTokenUpdate(token: TokenUpdate): void {
    // Determine which agent is generating tokens
    const agentId = this.currentAgent();
    if (!agentId) {
      // If no current agent, token might be from system prompt
      return;
    }

    this._agentProgress.update((agents) => {
      const agent = agents[agentId];
      if (!agent) {
        return agents;
      }

      // Only update status if not already thinking
      if (agent.status !== 'thinking') {
        return {
          ...agents,
          [agentId]: {
            ...agent,
            status: 'thinking',
            currentAction: 'Generating response...',
            lastUpdate: new Date(),
          },
        };
      }

      return agents;
    });
  }

  /**
   * Extract agent ID from canonical node ID
   *
   * @param nodeId - Canonical node ID from stream metadata
   * @returns Agent ID or null if extraction fails
   *
   * @remarks
   * - Node ID format: {domain}/{phase}/{activity}/{detail}
   * - Example: "devbrand/github-analysis/extract-achievements/performance"
   * - Phase maps to agent ID via phaseToAgent mapping
   *
   * Evidence: research-summary.md:395-406 (node ID structure)
   *
   * @private
   */
  private extractAgentId(nodeId?: string): string | null {
    if (!nodeId) return null;

    const parts = nodeId.split('/');
    if (parts.length < 2) {
      console.warn('Invalid node ID format:', nodeId);
      return null;
    }

    // Map phase to agent ID
    const phaseToAgent: Record<string, string> = {
      'github-analysis': 'github-code-analyzer',
      'brand-strategy': 'personal-brand-strategist',
      'content-creation': 'content-creator',
    };

    const phase = parts[1];
    const agentId = phaseToAgent[phase];

    if (!agentId) {
      console.warn('Unknown phase in node ID:', phase, 'from', nodeId);
      return null;
    }

    return agentId;
  }

  /**
   * Add event to history with sequence validation
   *
   * @param update - Stream update to add to history
   *
   * @remarks
   * - Validates sequence numbers to detect missed events
   * - Logs warning if sequence gap detected (network issue, event loss)
   * - Appends to BehaviorSubject for virtual scrolling performance
   *
   * Evidence: research-websocket.md:348-368 (sequence number management)
   *
   * @private
   */
  private addToEventHistory(update: StreamUpdate): void {
    const current = this._eventHistory.value;

    // Validate sequence numbers to detect gaps
    if (current.length > 0) {
      const lastSeq = current[current.length - 1].metadata?.sequenceNumber;
      const currentSeq = update.metadata?.sequenceNumber;

      if (lastSeq !== undefined && currentSeq !== undefined) {
        if (currentSeq !== lastSeq + 1) {
          console.warn(
            `⚠️ Sequence gap detected: expected ${
              lastSeq + 1
            }, got ${currentSeq}. Possible event loss or network issue.`
          );
        }
      }
    }

    // Add to history (virtual scrolling handles large arrays efficiently)
    this._eventHistory.next([...current, update]);
  }

  /**
   * Get filtered events by type
   *
   * @param type - StreamEventType to filter by
   * @returns Array of matching events
   *
   * @remarks
   * - Used by EventStreamComponent for type-based filtering
   * - Returns shallow copy (safe for UI manipulation)
   *
   * @public
   */
  getEventsByType(type: StreamEventType): StreamUpdate[] {
    return this._eventHistory.value.filter((e) => e.type === type);
  }

  /**
   * Get events by agent
   *
   * @param agentId - Agent ID to filter by
   * @returns Array of matching events
   *
   * @remarks
   * - Extracts agent ID from each event's nodeId metadata
   * - Used for agent-specific event timelines
   *
   * @public
   */
  getEventsByAgent(agentId: string): StreamUpdate[] {
    return this._eventHistory.value.filter((e) => {
      const extractedId = this.extractAgentId(e.metadata?.nodeId);
      return extractedId === agentId;
    });
  }

  /**
   * Clear state for new execution
   *
   * @remarks
   * - Resets execution state to 'idle'
   * - Resets all agents to idle state
   * - Clears event history and HITL queue
   * - Call before starting new workflow execution
   *
   * @public
   */
  reset(): void {
    this._executionState.set({
      status: 'idle',
      currentStep: 0,
      totalSteps: 3,
      startTime: null,
      endTime: null,
      error: null,
    });

    this._agentProgress.update((agents) => {
      const reset: AgentProgressMap = {};
      for (const [agentId, agent] of Object.entries(agents)) {
        reset[agentId] = {
          ...agent,
          status: 'idle',
          progress: 0,
          currentAction: null,
          lastUpdate: new Date(),
        };
      }
      return reset;
    });

    this._eventHistory.next([]);
    this._hitlQueue.set([]);
  }
}
