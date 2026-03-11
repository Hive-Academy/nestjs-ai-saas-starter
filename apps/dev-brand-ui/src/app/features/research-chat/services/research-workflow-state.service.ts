import { Injectable, signal, computed, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { ResearchService } from './research.service';
import {
  ResearchPhase,
  ResearchTimelineEntry,
  ResearchTimelineEntryType,
  ResearchHitlApproval,
  ResearchError,
  ResearchRawEvent,
  ResearchDomainEvent,
} from '../models';

/** Maximum number of raw events to retain in history (debug panel) */
const MAX_EVENT_HISTORY = 5_000;

/** Maximum number of timeline entries to retain */
const MAX_TIMELINE_ENTRIES = 500;

/**
 * Research Workflow State Service
 *
 * Centralized signal-based state management for single-agent research workflow execution.
 *
 * Adapted from DevBrandWorkflowStateService for the simpler single-agent research pattern:
 * - Single streaming text buffer (not per-agent)
 * - Phase-based progression (searching -> reading -> synthesizing) instead of agent delegation
 * - HITL approval flow for report review
 * - No supervisor or multi-agent coordination
 *
 * Signal Architecture:
 * - Private writable signals for all state
 * - Public readonly signals for component consumption
 * - Computed signals for derived state (isExecuting, hasPendingApproval, etc.)
 *
 * Domain Event Router:
 * - workflow-update -> phase detection from node name heuristics
 * - llm-token -> streaming text accumulation
 * - tool-execution -> tool name extraction and phase mapping
 * - custom-progress -> progress percentage updates
 * - interruption_request -> HITL approval state
 * - workflow_complete -> completion and cleanup
 * - debug-trace -> stored in event history only
 */
@Injectable({
  providedIn: 'root',
})
export class ResearchWorkflowStateService {
  private readonly researchService = inject(ResearchService);

  /** Active SSE subscription - cleaned up between executions */
  private sseSubscription: Subscription | null = null;

  /** Sequence counter for generating unique timeline entry IDs */
  private timelineSequence = 0;

  /** Tracks whether we've added a synthesizing timeline entry for the current LLM stream */
  private hasSynthesizingEntry = false;

  /** Phase display messages - class-level constant to avoid per-call recreation */
  private readonly PHASE_MESSAGES: Record<ResearchPhase, string> = {
    idle: 'Workflow idle',
    started: 'Research started',
    searching: 'Searching for information',
    reading: 'Reading sources',
    synthesizing: 'Synthesizing findings',
    'report-draft': 'Drafting report',
    approval: 'Awaiting approval',
    saving: 'Saving results',
    completed: 'Research completed',
    error: 'Error occurred',
  };

  // ---------------------------------------------------------------------------
  // PRIVATE WRITABLE SIGNALS
  // ---------------------------------------------------------------------------

  /** Execution lifecycle status */
  private readonly _executionStatus = signal<
    'idle' | 'running' | 'completed' | 'error'
  >('idle');

  /** Current research phase (single-agent progression) */
  private readonly _currentPhase = signal<ResearchPhase>('idle');

  /** Accumulated LLM streaming text (single buffer for single agent) */
  private readonly _streamingText = signal<string>('');

  /** Whether LLM tokens are actively being received */
  private readonly _isStreaming = signal<boolean>(false);

  /** Timeline entries array (capped at MAX_TIMELINE_ENTRIES) */
  private readonly _timelineEntries = signal<ResearchTimelineEntry[]>([]);

  /** HITL approval state (null when no pending approval) */
  private readonly _hitlApproval = signal<ResearchHitlApproval | null>(null);

  /** Error collection */
  private readonly _errors = signal<ResearchError[]>([]);

  /** Custom progress (percentage + message) */
  private readonly _progress = signal<{
    readonly percentage: number;
    readonly message: string;
  } | null>(null);

  /** Raw event history for debug panel (capped at MAX_EVENT_HISTORY) */
  private readonly _eventHistory = signal<ResearchRawEvent[]>([]);

  // ---------------------------------------------------------------------------
  // PUBLIC READONLY SIGNALS
  // ---------------------------------------------------------------------------

  readonly executionStatus = this._executionStatus.asReadonly();
  readonly currentPhase = this._currentPhase.asReadonly();
  readonly streamingText = this._streamingText.asReadonly();
  readonly isStreaming = this._isStreaming.asReadonly();
  readonly timelineEntries = this._timelineEntries.asReadonly();
  readonly hitlApproval = this._hitlApproval.asReadonly();
  readonly errors = this._errors.asReadonly();
  readonly progress = this._progress.asReadonly();
  readonly eventHistory = this._eventHistory.asReadonly();

  // ---------------------------------------------------------------------------
  // COMPUTED SIGNALS
  // ---------------------------------------------------------------------------

  /** Whether the workflow is currently running */
  readonly isExecuting = computed(
    () => this._executionStatus() === 'running'
  );

  /** Whether there is a pending HITL approval request */
  readonly hasPendingApproval = computed(
    () => this._hitlApproval() !== null
  );

  /** Whether any errors have been recorded */
  readonly hasErrors = computed(() => this._errors().length > 0);

  /** Total number of raw events received (for debug panel badge) */
  readonly eventCount = computed(() => this._eventHistory().length);

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Start tracking a workflow execution.
   * Resets all state, then subscribes to SSE stream for the given execution.
   */
  startExecution(executionId: string): void {
    // Reset all state for fresh execution
    this.resetSignals();

    // Set running state
    this._executionStatus.set('running');
    this._currentPhase.set('started');

    // Add initial timeline entry
    this.addTimelineEntry('research-start', 'Research workflow started', undefined, 'active', 'started');

    // Subscribe to SSE stream
    this.subscribeToStream(executionId);
  }

  /**
   * Reset all state and clean up subscriptions.
   */
  reset(): void {
    this.cleanupSubscription();
    this.resetSignals();
  }

  /**
   * Clear HITL approval state after a decision has been made.
   */
  clearApproval(): void {
    this._hitlApproval.set(null);
    this.addTimelineEntry('approval-decision', 'Approval decision submitted', undefined, 'completed', 'approval');
  }

  // ---------------------------------------------------------------------------
  // SSE SUBSCRIPTION
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to the ResearchService SSE stream and route events.
   */
  private subscribeToStream(executionId: string): void {
    this.cleanupSubscription();

    this.sseSubscription = this.researchService
      .streamWorkflow(executionId)
      .subscribe({
        next: (event: ResearchDomainEvent) => {
          this.processDomainEvent(event);
        },
        error: (error: unknown) => {
          console.error('[ResearchState] SSE stream error:', error);
          this._executionStatus.set('error');
          this._isStreaming.set(false);

          const errorMessage =
            error instanceof Error ? error.message : 'SSE connection failed';
          this._errors.update((errors) => [
            ...errors,
            {
              message: errorMessage,
              timestamp: new Date(),
              rawError: error,
            },
          ]);

          this.addTimelineEntry(
            'error',
            `Connection error: ${errorMessage}`,
            undefined,
            'error',
            'error'
          );
        },
        complete: () => {
          // Stream completed normally (EventSource closed after workflow_complete)
          if (this._executionStatus() === 'running') {
            this._executionStatus.set('completed');
            this._currentPhase.set('completed');
            this._isStreaming.set(false);
          }
        },
      });
  }

  // ---------------------------------------------------------------------------
  // DOMAIN EVENT ROUTER
  // ---------------------------------------------------------------------------

  /**
   * Route incoming domain events to their dedicated handlers.
   * All events are added to raw history for the debug panel.
   */
  private processDomainEvent(event: ResearchDomainEvent): void {
    this.addToEventHistory(event);

    switch (event.type) {
      case 'workflow-update':
        this.handleWorkflowUpdate(event);
        break;
      case 'llm-token':
        this.handleLlmToken(event);
        break;
      case 'tool-execution':
        this.handleToolExecution(event);
        break;
      case 'custom-progress':
        this.handleCustomProgress(event);
        break;
      case 'interruption_request':
        this.handleInterruptionRequest(event);
        break;
      case 'workflow_complete':
        this.handleWorkflowComplete(event);
        break;
      case 'debug-trace':
        // Already added to event history above; no additional processing needed
        break;
      default:
        console.warn(
          '[ResearchState] Unknown event type:',
          (event as Record<string, unknown>)['type']
        );
    }
  }

  // ---------------------------------------------------------------------------
  // EVENT HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle workflow-update events.
   * Detects research phase from node name using heuristic string matching.
   */
  private handleWorkflowUpdate(event: ResearchDomainEvent): void {
    const nodeName = event.nodeName ?? '';
    const lowerNodeName = nodeName.toLowerCase();

    const detectedPhase = this.detectPhaseFromNodeName(lowerNodeName);
    const previousPhase = this._currentPhase();

    // Only update phase and add timeline entry if phase actually changed
    if (detectedPhase !== previousPhase) {
      this._currentPhase.set(detectedPhase);

      this.addTimelineEntry(
        this.phaseToTimelineEntryType(detectedPhase),
        this.PHASE_MESSAGES[detectedPhase] || `Processing: ${nodeName}`,
        nodeName || undefined,
        'active',
        detectedPhase
      );
    }
  }

  /**
   * Handle llm-token events.
   * Appends token to streaming text buffer.
   * On first token, adds a synthesizing timeline entry.
   */
  private handleLlmToken(event: ResearchDomainEvent): void {
    const token = event.token;
    if (!token) return;

    this._streamingText.update((current) => current + token);
    this._isStreaming.set(true);

    // Add synthesizing timeline entry on first token
    if (!this.hasSynthesizingEntry) {
      this.hasSynthesizingEntry = true;
      this._currentPhase.set('synthesizing');
      this.addTimelineEntry(
        'synthesizing',
        'Report generation started',
        undefined,
        'active',
        'synthesizing'
      );
    }
  }

  /**
   * Handle tool-execution events.
   * Extracts tool name from toolData.messages array with null-safe checks.
   * Maps tool name to research phase and timeline entry type.
   */
  private handleToolExecution(event: ResearchDomainEvent): void {
    const toolName = this.extractToolName(event);
    const { phase, timelineType } = this.mapToolToPhaseAndType(toolName);
    const toolResult = this.extractToolResult(event);

    // Update current phase based on tool type
    this._currentPhase.set(phase);

    // Add timeline entry with tool details
    const detail = toolResult
      ? `${toolName}: ${toolResult.substring(0, 200)}`
      : toolName;

    this.addTimelineEntry(
      timelineType,
      `Tool execution: ${toolName}`,
      detail,
      'completed',
      phase
    );
  }

  /**
   * Handle custom-progress events.
   * Updates the progress signal with percentage and message.
   */
  private handleCustomProgress(event: ResearchDomainEvent): void {
    const progress = event.progress;
    if (!progress) return;

    const percentage = progress.percentage ?? 0;
    const message = progress.message ?? progress.stage ?? 'Processing...';

    this._progress.set({ percentage, message });
  }

  /**
   * Handle interruption_request events (HITL approval).
   * Sets approval state, pauses streaming, updates phase.
   */
  private handleInterruptionRequest(event: ResearchDomainEvent): void {
    this._hitlApproval.set({
      executionId: event.executionId,
      reportDraft: event.reportDraft ?? '',
      message: event.message ?? 'Report ready for review',
      requestedAt: new Date(),
    });

    this._currentPhase.set('approval');
    this._isStreaming.set(false);

    this.addTimelineEntry(
      'approval-waiting',
      'Report ready for approval',
      event.message || undefined,
      'active',
      'approval'
    );
  }

  /**
   * Handle workflow_complete events.
   * Sets completion state, stops streaming, cleans up subscription.
   */
  private handleWorkflowComplete(_event: ResearchDomainEvent): void {
    this._executionStatus.set('completed');
    this._currentPhase.set('completed');
    this._isStreaming.set(false);

    this.addTimelineEntry(
      'research-complete',
      'Research completed successfully',
      undefined,
      'completed',
      'completed'
    );

    this.cleanupSubscription();
  }

  // ---------------------------------------------------------------------------
  // PHASE DETECTION HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Detect research phase from node name using heuristic string matching.
   * Falls back to 'started' for unknown node names.
   */
  private detectPhaseFromNodeName(lowerNodeName: string): ResearchPhase {
    if (lowerNodeName.includes('search')) return 'searching';
    if (lowerNodeName.includes('read')) return 'reading';
    if (
      lowerNodeName.includes('synth') ||
      lowerNodeName.includes('generate') ||
      lowerNodeName.includes('report')
    ) {
      return 'synthesizing';
    }
    if (lowerNodeName.includes('save')) return 'saving';

    return 'started';
  }

  /**
   * Map a research phase to the corresponding timeline entry type.
   */
  private phaseToTimelineEntryType(
    phase: ResearchPhase
  ): ResearchTimelineEntryType {
    switch (phase) {
      case 'searching':
        return 'searching';
      case 'reading':
        return 'reading-source';
      case 'synthesizing':
        return 'synthesizing';
      case 'report-draft':
        return 'report-draft';
      case 'approval':
        return 'approval-waiting';
      case 'completed':
        return 'research-complete';
      case 'error':
        return 'error';
      default:
        return 'research-start';
    }
  }

  // ---------------------------------------------------------------------------
  // TOOL EXTRACTION HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Extract tool name from event's toolData.messages array.
   * Null-safe: returns 'unknown-tool' if structure is unexpected.
   */
  private extractToolName(event: ResearchDomainEvent): string {
    const messages = event.toolData?.messages;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return 'unknown-tool';
    }

    // Tool name is typically in the first message's 'name' field
    const firstMessage = messages[0] as Record<string, unknown> | undefined;
    if (!firstMessage) return 'unknown-tool';

    const name = firstMessage['name'];
    if (typeof name === 'string' && name.length > 0) return name;

    // Fallback: check 'tool_call_id' or 'type' fields
    const toolCallId = firstMessage['tool_call_id'];
    if (typeof toolCallId === 'string' && toolCallId.length > 0) {
      return toolCallId;
    }

    return 'unknown-tool';
  }

  /**
   * Extract tool result content from event's toolData.messages array.
   * Returns the first message's content string, or null.
   */
  private extractToolResult(event: ResearchDomainEvent): string | null {
    const messages = event.toolData?.messages;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return null;
    }

    const firstMessage = messages[0] as Record<string, unknown> | undefined;
    if (!firstMessage) return null;

    const content = firstMessage['content'];
    return typeof content === 'string' ? content : null;
  }

  /**
   * Map tool name to research phase and timeline entry type.
   * Uses contains() heuristics for flexible matching.
   */
  private mapToolToPhaseAndType(toolName: string): {
    readonly phase: ResearchPhase;
    readonly timelineType: ResearchTimelineEntryType;
  } {
    const lowerName = toolName.toLowerCase();

    if (lowerName.includes('search')) {
      return { phase: 'searching', timelineType: 'searching' };
    }
    if (lowerName.includes('read')) {
      return { phase: 'reading', timelineType: 'reading-source' };
    }
    if (lowerName.includes('report') || lowerName.includes('save')) {
      return { phase: 'saving', timelineType: 'tool-execution' };
    }

    return { phase: this._currentPhase(), timelineType: 'tool-execution' };
  }

  // ---------------------------------------------------------------------------
  // HISTORY & TIMELINE HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Add a raw event to the event history (for debug panel).
   * Caps at MAX_EVENT_HISTORY entries.
   */
  private addToEventHistory(event: ResearchDomainEvent): void {
    const rawEvent: ResearchRawEvent = {
      type: event.type,
      timestamp: new Date(),
      data: event,
    };

    this._eventHistory.update((history) => {
      const updated = [...history, rawEvent];
      if (updated.length > MAX_EVENT_HISTORY) {
        return updated.slice(updated.length - MAX_EVENT_HISTORY);
      }
      return updated;
    });
  }

  /**
   * Add a timeline entry to the narrative log.
   * Generates a unique ID and caps at MAX_TIMELINE_ENTRIES.
   */
  private addTimelineEntry(
    type: ResearchTimelineEntryType,
    message: string,
    detail?: string,
    status: 'active' | 'completed' | 'error' = 'active',
    phase?: ResearchPhase
  ): void {
    this.timelineSequence++;
    const entry: ResearchTimelineEntry = {
      id: `rtl-${this.timelineSequence}-${Date.now()}`,
      type,
      timestamp: new Date(),
      message,
      detail,
      status,
      phase,
    };

    this._timelineEntries.update((entries) => {
      const updated = [...entries, entry];
      if (updated.length > MAX_TIMELINE_ENTRIES) {
        return updated.slice(updated.length - MAX_TIMELINE_ENTRIES);
      }
      return updated;
    });
  }

  // ---------------------------------------------------------------------------
  // CLEANUP HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Reset all signals to their initial state.
   */
  private resetSignals(): void {
    this._executionStatus.set('idle');
    this._currentPhase.set('idle');
    this._streamingText.set('');
    this._isStreaming.set(false);
    this._timelineEntries.set([]);
    this._hitlApproval.set(null);
    this._errors.set([]);
    this._progress.set(null);
    this._eventHistory.set([]);
    this.timelineSequence = 0;
    this.hasSynthesizingEntry = false;
  }

  /**
   * Unsubscribe from the active SSE stream if one exists.
   */
  private cleanupSubscription(): void {
    if (this.sseSubscription) {
      this.sseSubscription.unsubscribe();
      this.sseSubscription = null;
    }
  }
}
