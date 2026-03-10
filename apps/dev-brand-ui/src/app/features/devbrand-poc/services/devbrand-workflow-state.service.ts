import { Injectable, signal, computed, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  StreamUpdate,
  StreamEventType,
  DomainEvent,
} from '../models/stream-events.model';
import {
  ExecutionState,
  ExecutionStatus,
} from '../models/execution-state.model';
import { AgentProgress, AgentStatus } from '../models/agent-progress.model';
import {
  TimelineEntry,
  TimelineEntryType,
  AgentError,
} from '../models/timeline.model';
import { DevBrandSseService } from './devbrand-sse.service';

/**
 * AgentProgressMap Type
 *
 * Map of agent IDs to their current progress state.
 *
 * @remarks
 * - 3 agents in DevBrand workflow + supervisor:
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
 * Agent registry entry for known LangGraph agent nodes
 */
interface AgentRegistryEntry {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
}

/** Maximum number of events to retain in history */
const MAX_EVENT_HISTORY = 10_000;

/**
 * DevBrand Workflow State Service
 *
 * Centralized state management for LangGraph workflow execution with domain event routing.
 *
 * @remarks
 * **Purpose**:
 * - Subscribe to SSE event streams from DevBrandSseService
 * - Route ALL domain event types (workflow-update, message-stream, tool-execution, custom-stream, workflow_complete)
 * - Maintain ExecutionState, AgentProgressMap, streaming text, timeline, errors via signals
 * - Provide computed signals for derived state (progress, current agent, flags)
 *
 * **State Architecture** (Signal-Based):
 * - _executionState: Workflow lifecycle (idle -> running -> completed/error)
 * - _agentProgress: Agent tracking with granular status including 'delegated'
 * - _hitlQueue: Human-in-the-loop approval queue
 * - _eventHistory: Complete event log (BehaviorSubject for virtual scrolling)
 * - _streamingText: Per-agent LLM token accumulation buffers
 * - _timelineEntries: Orchestration narrative timeline
 * - _errors: Error collection with agent attribution
 *
 * **Domain Event Router**:
 * - workflow-update -> handleWorkflowUpdateEvent(): agent status, timeline
 * - message-stream -> handleMessageStreamEvent(): token accumulation, delegation detection
 * - tool-execution -> handleToolExecutionEvent(): tool results/errors, agent status
 * - custom-stream -> handleCustomStreamEvent(): progress percentage updates
 * - workflow_complete -> handleWorkflowComplete(): completion status
 *
 * @public
 */
@Injectable({
  providedIn: 'root',
})
export class DevBrandWorkflowStateService {
  /** SSE service for real-time event streaming */
  private readonly sseService = inject(DevBrandSseService);

  /**
   * Agent registry: maps LangGraph node names to display metadata.
   * Replaces the broken extractAgentId() that expected {domain}/{phase} format.
   */
  private readonly AGENT_REGISTRY: Record<string, AgentRegistryEntry> = {
    supervisor: { id: 'supervisor', name: 'Supervisor', icon: '\u{1F9E0}' },
    'github-code-analyzer': {
      id: 'github-code-analyzer',
      name: 'GitHub Code Analyzer',
      icon: '\u{1F50D}',
    },
    'personal-brand-strategist': {
      id: 'personal-brand-strategist',
      name: 'Personal Brand Strategist',
      icon: '\u{1F3AF}',
    },
    'content-creator': {
      id: 'content-creator',
      name: 'Content Creator',
      icon: '\u{270D}\u{FE0F}',
    },
  };

  /** Default streaming text buffer state */
  private readonly EMPTY_STREAMING_TEXT: Record<string, string> = {
    supervisor: '',
    'github-code-analyzer': '',
    'personal-brand-strategist': '',
    'content-creator': '',
  };

  // ---------------------------------------------------------------------------
  // EXISTING SIGNALS (preserved)
  // ---------------------------------------------------------------------------

  private readonly _executionState = signal<ExecutionState>({
    status: 'idle' as ExecutionStatus,
    currentStep: 0,
    totalSteps: 3,
    startTime: null,
    endTime: null,
    error: null,
  });

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

  private readonly _hitlQueue = signal<HITLApproval[]>([]);

  private readonly _eventHistory = new BehaviorSubject<StreamUpdate[]>([]);

  // ---------------------------------------------------------------------------
  // NEW SIGNALS
  // ---------------------------------------------------------------------------

  /** Per-agent streaming text buffers for LLM token accumulation */
  private readonly _streamingText = signal<Record<string, string>>({
    ...this.EMPTY_STREAMING_TEXT,
  });

  /** Orchestration timeline entries (chronological narrative) */
  private readonly _timelineEntries = signal<TimelineEntry[]>([]);

  /** Error collection with agent attribution */
  private readonly _errors = signal<AgentError[]>([]);

  /** Sequence counter for generating unique timeline entry IDs */
  private timelineSequence = 0;

  // ---------------------------------------------------------------------------
  // PUBLIC READONLY ACCESSORS (existing)
  // ---------------------------------------------------------------------------

  readonly executionState = this._executionState.asReadonly();
  readonly agentProgress = this._agentProgress.asReadonly();
  readonly hitlQueue = this._hitlQueue.asReadonly();
  readonly eventHistory$: Observable<StreamUpdate[]> =
    this._eventHistory.asObservable();

  // ---------------------------------------------------------------------------
  // PUBLIC READONLY ACCESSORS (new)
  // ---------------------------------------------------------------------------

  readonly streamingText = this._streamingText.asReadonly();
  readonly timelineEntries = this._timelineEntries.asReadonly();
  readonly errors = this._errors.asReadonly();

  // ---------------------------------------------------------------------------
  // COMPUTED SIGNALS
  // ---------------------------------------------------------------------------

  readonly isExecuting = computed(
    () => this.executionState().status === 'running'
  );

  /**
   * Current active agent ID.
   * Finds the first agent with an active status (delegated, thinking, executing, waiting).
   */
  readonly currentAgent = computed(() => {
    const agents = this.agentProgress();
    const activeStatuses: AgentStatus[] = [
      'delegated',
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

  readonly workflowProgress = computed(() => {
    const agents = this.agentProgress();
    const total = Object.keys(agents).length;
    const completed = Object.values(agents).filter(
      (a) => a.status === 'completed'
    ).length;
    return Math.round((completed / total) * 100);
  });

  readonly hasPendingApprovals = computed(() => this.hitlQueue().length > 0);

  // ---------------------------------------------------------------------------
  // CONSTRUCTOR
  // ---------------------------------------------------------------------------

  constructor() {
    this.subscribeToSseEvents();
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Start workflow execution tracking.
   * Resets all state, connects to SSE stream, and begins event processing.
   */
  startExecution(streamUrl: string): void {
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
      const resetMap: AgentProgressMap = {};
      for (const [agentId, agent] of Object.entries(agents)) {
        resetMap[agentId] = {
          ...agent,
          status: 'idle',
          progress: 0,
          currentAction: null,
          lastUpdate: new Date(),
        };
      }
      return resetMap;
    });

    // Clear all state
    this._eventHistory.next([]);
    this._hitlQueue.set([]);
    this._streamingText.set({ ...this.EMPTY_STREAMING_TEXT });
    this._timelineEntries.set([]);
    this._errors.set([]);
    this.timelineSequence = 0;

    // Add workflow-start timeline entry
    this.addTimelineEntry(
      'workflow-start',
      'Workflow execution started',
      'active'
    );

    // Connect to SSE stream and subscribe to events
    this.sseService.connect(streamUrl);
    this.subscribeToSseEvents();
  }

  /**
   * Get filtered events by type
   */
  getEventsByType(type: StreamEventType): StreamUpdate[] {
    return this._eventHistory.value.filter((e) => e.type === type);
  }

  /**
   * Get events by agent ID
   */
  getEventsByAgent(agentId: string): StreamUpdate[] {
    return this._eventHistory.value.filter((e) => {
      const resolvedId = this.resolveAgentIdFromStreamUpdate(e);
      return resolvedId === agentId;
    });
  }

  /**
   * Clear state for new execution.
   * Resets all signals including new streaming text, timeline, and error signals.
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
      const resetMap: AgentProgressMap = {};
      for (const [agentId, agent] of Object.entries(agents)) {
        resetMap[agentId] = {
          ...agent,
          status: 'idle',
          progress: 0,
          currentAction: null,
          lastUpdate: new Date(),
        };
      }
      return resetMap;
    });

    this._eventHistory.next([]);
    this._hitlQueue.set([]);
    this._streamingText.set({ ...this.EMPTY_STREAMING_TEXT });
    this._timelineEntries.set([]);
    this._errors.set([]);
    this.timelineSequence = 0;
  }

  // ---------------------------------------------------------------------------
  // SSE SUBSCRIPTION & DOMAIN EVENT ROUTER
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to SSE event streams.
   * Routes ALL domain events through processDomainEvent() instead of only handling workflow-update.
   */
  private subscribeToSseEvents(): void {
    // Workflow updates: ALL domain events from SSE
    this.sseService.workflowUpdates$.subscribe((update: DomainEvent) => {
      // Add raw event to history for debug panel
      this.addDomainEventToHistory(update);

      // Route through domain event processor
      this.processDomainEvent(update);
    });

    // SSE connection errors
    this.sseService.errors$.subscribe((error) => {
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
   * Domain event router - dispatches each event type to its dedicated handler.
   * Zero events silently dropped; unhandled types logged as warnings.
   */
  private processDomainEvent(event: DomainEvent): void {
    switch (event.type) {
      case 'workflow-update':
        this.handleWorkflowUpdateEvent(event);
        break;
      case 'message-stream':
        this.handleMessageStreamEvent(event);
        break;
      case 'tool-execution':
        this.handleToolExecutionEvent(event);
        break;
      case 'custom-stream':
        this.handleCustomStreamEvent(event);
        break;
      case 'workflow_complete':
        this.handleWorkflowComplete(event);
        break;
      default:
        console.warn(
          '[WorkflowStateService] Unknown domain event type:',
          (event as Record<string, unknown>)['type']
        );
    }
  }

  // ---------------------------------------------------------------------------
  // DOMAIN EVENT HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle workflow-update events.
   * Updates agent status to 'executing' and adds timeline entries for node activity.
   */
  private handleWorkflowUpdateEvent(event: DomainEvent): void {
    const agentId = this.resolveAgentId(event);

    if (agentId && this.AGENT_REGISTRY[agentId]) {
      const registryEntry = this.AGENT_REGISTRY[agentId];

      // Skip supervisor for agent progress updates (supervisor is not an "agent" in the progress sense)
      if (agentId !== 'supervisor') {
        this.updateAgentStatus(
          agentId,
          'executing',
          'Processing workflow update...'
        );

        // Increment step when a new agent starts executing
        this._executionState.update((state) => ({
          ...state,
          currentStep: Math.min(state.currentStep + 1, state.totalSteps),
        }));
      }

      this.addTimelineEntry(
        'agent-start',
        `${registryEntry.name}: Processing`,
        'active',
        agentId,
        registryEntry.name
      );
    }
  }

  /**
   * Handle message-stream events.
   *
   * Key behaviors:
   * 1. Detect supervisor delegation from tool_call_chunks
   * 2. Accumulate streaming text tokens per-agent
   * 3. Update agent status to 'thinking' when receiving content
   */
  private handleMessageStreamEvent(event: DomainEvent): void {
    const nodeName = event.nodeName || event.metadata?.langgraph_node;

    // Detect supervisor delegation: supervisor making tool calls to delegate to agents
    if (
      nodeName === 'supervisor' &&
      event.messageChunk?.tool_call_chunks?.length
    ) {
      const firstChunk = event.messageChunk.tool_call_chunks[0];
      if (firstChunk.name) {
        const delegatedAgentId = firstChunk.name;
        const registryEntry = this.AGENT_REGISTRY[delegatedAgentId];

        if (registryEntry) {
          // Set delegated agent status
          this.updateAgentStatus(
            delegatedAgentId,
            'delegated',
            'Delegated by supervisor'
          );

          // Add delegation timeline entry
          this.addTimelineEntry(
            'delegation',
            `Supervisor: Delegating to ${registryEntry.name}`,
            'active',
            delegatedAgentId,
            registryEntry.name
          );
        }
      }
    }

    // Detect completed tool calls (supervisor finalized delegation)
    if (nodeName === 'supervisor' && event.messageChunk?.tool_calls?.length) {
      const toolCall = event.messageChunk.tool_calls[0];
      const delegatedAgentId = toolCall.name;
      const registryEntry = this.AGENT_REGISTRY[delegatedAgentId];

      if (registryEntry) {
        this.updateAgentStatus(
          delegatedAgentId,
          'delegated',
          'Delegated by supervisor'
        );
      }
    }

    // Accumulate streaming text content
    const content = event.content;
    if (content) {
      const agentId = this.resolveAgentId(event) || nodeName || 'unknown';
      const bufferKey = this.AGENT_REGISTRY[agentId] ? agentId : 'supervisor';

      this._streamingText.update((buffers) => ({
        ...buffers,
        [bufferKey]: (buffers[bufferKey] || '') + content,
      }));

      // Update non-supervisor agents to 'thinking' when they produce content
      if (agentId !== 'supervisor' && this.AGENT_REGISTRY[agentId]) {
        const currentProgress = this._agentProgress();
        const agentState = currentProgress[agentId];
        if (
          agentState &&
          agentState.status !== 'thinking' &&
          agentState.status !== 'completed'
        ) {
          this.updateAgentStatus(agentId, 'thinking', 'Generating response...');

          const registryEntry = this.AGENT_REGISTRY[agentId];
          this.addTimelineEntry(
            'agent-thinking',
            `${registryEntry.name}: Generating response`,
            'active',
            agentId,
            registryEntry.name
          );
        }
      }
    }
  }

  /**
   * Handle tool-execution events.
   * Extracts tool results/errors from toolData.messages array.
   * Updates agent status and adds timeline entries.
   */
  private handleToolExecutionEvent(event: DomainEvent): void {
    const agentId =
      this.resolveAgentId(event) || this.currentAgent() || 'unknown';
    const registryEntry = this.AGENT_REGISTRY[agentId];
    const agentName = registryEntry?.name || agentId;

    const toolData = event.toolData;
    if (!toolData) {
      this.addTimelineEntry(
        'tool-execution',
        `${agentName}: Tool execution`,
        'active',
        agentId,
        agentName
      );
      return;
    }

    // Extract messages array from toolData
    const messages = toolData['messages'] as
      | ReadonlyArray<Record<string, unknown>>
      | undefined;
    if (messages && Array.isArray(messages)) {
      for (const message of messages) {
        const messageContent =
          typeof message['content'] === 'string' ? message['content'] : '';
        const isError = this.isToolErrorMessage(messageContent);

        if (isError) {
          // Error in tool execution
          this.updateAgentStatus(agentId, 'error', `Error: ${messageContent}`);

          const agentError: AgentError = {
            agentId,
            agentName,
            message: messageContent,
            timestamp: new Date(),
            rawError: message,
          };
          this._errors.update((errors) => [...errors, agentError]);

          this.addTimelineEntry(
            'agent-error',
            `${agentName}: ${messageContent}`,
            'error',
            agentId,
            agentName,
            messageContent
          );
        } else if (messageContent) {
          // Successful tool result
          this.addTimelineEntry(
            'tool-execution',
            `${agentName}: Tool completed`,
            'completed',
            agentId,
            agentName,
            messageContent.substring(0, 200)
          );
        }
      }
    } else {
      this.addTimelineEntry(
        'tool-execution',
        `${agentName}: Tool execution`,
        'active',
        agentId,
        agentName
      );
    }
  }

  /**
   * Handle custom-stream events.
   * Extracts progress percentage and message from event.data.
   */
  private handleCustomStreamEvent(event: DomainEvent): void {
    const data = event.data;
    if (!data) return;

    const percentage = data['percentage'] as number | undefined;
    const message = data['message'] as string | undefined;
    const agentIdFromData = data['agent'] as string | undefined;

    const agentId =
      agentIdFromData || this.resolveAgentId(event) || this.currentAgent();
    if (!agentId) return;

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

  /**
   * Handle workflow_complete events.
   * Sets execution to completed, marks remaining active agents as completed,
   * and adds workflow-complete timeline entry.
   */
  private handleWorkflowComplete(_event: DomainEvent): void {
    this._executionState.update((state) => ({
      ...state,
      status: 'completed',
      endTime: new Date(),
      currentStep: state.totalSteps,
    }));

    // Mark any still-active agents as completed
    this._agentProgress.update((agents) => {
      const updated: AgentProgressMap = {};
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

          // Add completion timeline entry for each agent that was active
          const registryEntry = this.AGENT_REGISTRY[id];
          if (registryEntry) {
            this.addTimelineEntry(
              'agent-complete',
              `${registryEntry.name}: Completed`,
              'completed',
              id,
              registryEntry.name
            );
          }
        } else {
          updated[id] = agent;
        }
      }
      return updated;
    });

    this.addTimelineEntry(
      'workflow-complete',
      'Workflow execution completed',
      'completed'
    );
  }

  // ---------------------------------------------------------------------------
  // AGENT ID RESOLUTION
  // ---------------------------------------------------------------------------

  /**
   * Resolve agent ID from a DomainEvent using multiple strategies:
   * 1. Direct nodeName match against AGENT_REGISTRY
   * 2. Subgraph ID match from metadata
   * 3. Checkpoint namespace extraction (e.g., 'github-code-analyzer:uuid')
   */
  private resolveAgentId(event: DomainEvent): string | null {
    // Strategy 1: Direct nodeName match
    const nodeName = event.nodeName || event.metadata?.langgraph_node;
    if (nodeName && this.AGENT_REGISTRY[nodeName]) {
      return nodeName;
    }

    // Strategy 2: Subgraph ID match
    const subgraphId = event.metadata?.subgraphId;
    if (typeof subgraphId === 'string' && this.AGENT_REGISTRY[subgraphId]) {
      return subgraphId;
    }

    // Strategy 3: Checkpoint namespace extraction
    const checkpointNs =
      event.metadata?.langgraph_checkpoint_ns || event.metadata?.checkpoint_ns;
    if (typeof checkpointNs === 'string' && checkpointNs) {
      const agentName = checkpointNs.split(':')[0];
      if (this.AGENT_REGISTRY[agentName]) {
        return agentName;
      }
    }

    return null;
  }

  /**
   * Resolve agent ID from a legacy StreamUpdate (for getEventsByAgent compatibility).
   */
  private resolveAgentIdFromStreamUpdate(update: StreamUpdate): string | null {
    const nodeId = update.metadata?.nodeId;
    if (!nodeId) return null;

    // Check direct match against registry
    if (this.AGENT_REGISTRY[nodeId]) return nodeId;

    // Legacy format: try phase extraction
    const parts = nodeId.split('/');
    if (parts.length >= 2) {
      const phaseToAgent: Record<string, string> = {
        'github-analysis': 'github-code-analyzer',
        'brand-strategy': 'personal-brand-strategist',
        'content-creation': 'content-creator',
      };
      const agentId = phaseToAgent[parts[1]];
      if (agentId) return agentId;
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // HELPER METHODS
  // ---------------------------------------------------------------------------

  /**
   * Update an agent's status and current action.
   */
  private updateAgentStatus(
    agentId: string,
    status: AgentStatus,
    currentAction: string | null
  ): void {
    this._agentProgress.update((agents) => {
      const agent = agents[agentId];
      if (!agent) {
        console.warn('[WorkflowStateService] Unknown agent ID:', agentId);
        return agents;
      }

      return {
        ...agents,
        [agentId]: {
          ...agent,
          status,
          currentAction,
          lastUpdate: new Date(),
        },
      };
    });
  }

  /**
   * Add a timeline entry to the narrative log.
   */
  private addTimelineEntry(
    type: TimelineEntryType,
    message: string,
    status: 'active' | 'completed' | 'error',
    agentId?: string,
    agentName?: string,
    detail?: string
  ): void {
    this.timelineSequence++;
    const entry: TimelineEntry = {
      id: `tl-${this.timelineSequence}-${Date.now()}`,
      type,
      timestamp: new Date(),
      agentId,
      agentName,
      message,
      detail,
      status,
    };

    this._timelineEntries.update((entries) => [...entries, entry]);
  }

  /**
   * Add a domain event to the event history (for debug panel).
   * Converts DomainEvent to StreamUpdate format for backward compatibility with EventStreamComponent.
   * Caps history at MAX_EVENT_HISTORY entries.
   */
  private addDomainEventToHistory(event: DomainEvent): void {
    const streamUpdate: StreamUpdate = {
      type: this.domainTypeToStreamEventType(event.type),
      data: event,
      metadata: {
        timestamp: new Date(event.timestamp),
        sequenceNumber: Date.now(),
        executionId: event.executionId,
        nodeId: event.nodeName,
      },
    };

    const current = this._eventHistory.value;
    const updated =
      current.length >= MAX_EVENT_HISTORY
        ? [
            ...current.slice(current.length - MAX_EVENT_HISTORY + 1),
            streamUpdate,
          ]
        : [...current, streamUpdate];

    this._eventHistory.next(updated);
  }

  /**
   * Map domain event type string to StreamEventType enum for backward compatibility.
   */
  private domainTypeToStreamEventType(type: string): StreamEventType {
    switch (type) {
      case 'workflow-update':
        return StreamEventType.UPDATES;
      case 'message-stream':
        return StreamEventType.MESSAGE_STREAM;
      case 'tool-execution':
        return StreamEventType.EVENTS;
      case 'custom-stream':
        return StreamEventType.CUSTOM_STREAM;
      case 'workflow_complete':
        return StreamEventType.WORKFLOW_END;
      default:
        return StreamEventType.CUSTOM;
    }
  }

  /**
   * Check if a tool message content indicates an error.
   * Looks for common error patterns in the message string.
   */
  private isToolErrorMessage(content: string): boolean {
    if (!content) return false;

    // Check for JSON-parsed error objects
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      if (parsed['error'] === true || parsed['error'] === 'true') return true;
    } catch {
      // Not JSON, check string patterns
    }

    // Check for common error string patterns
    const lowerContent = content.toLowerCase();
    return (
      lowerContent.startsWith('error:') ||
      lowerContent.includes('error:') ||
      lowerContent.includes('failed:') ||
      lowerContent.includes('exception:')
    );
  }
}
