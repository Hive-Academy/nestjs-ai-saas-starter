import { Injectable, Logger } from '@nestjs/common';
import { WorkflowState, Command } from '../interfaces/workflow.interface';

/**
 * Types for agent handoff operations
 */
export type HandoffType = 
  | 'delegation'    // Delegate a subtask to another agent
  | 'consultation'  // Ask another agent for advice/input
  | 'review'        // Request review/approval from another agent
  | 'escalation'    // Escalate to a higher-level agent
  | 'collaboration' // Work together on a shared task
  | 'handover';     // Complete transfer of responsibility

export interface HandoffContext {
  task?: {
    id: string;
    name: string;
    description: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  };
  workCompleted?: {
    summary: string;
    deliverables?: string[];
    decisions?: Array<{
      decision: string;
      reasoning: string;
      confidence?: number;
    }>;
  };
  currentState?: {
    phase: string;
    progress: number;
    blockers?: string[];
    nextSteps?: string[];
  };
  dependencies?: {
    requiredInputs?: string[];
    constraints?: string[];
    deadlines?: Date[];
  };
  additionalData?: Record<string, unknown>;
}

export interface HandoffPayload {
  targetAgent: string;
  sourceAgent: string;
  handoffType: HandoffType;
  context: HandoffContext;
  stateUpdates?: Partial<WorkflowState>;
  instructions?: string;
  isBlocking?: boolean;
  timeoutMs?: number;
  callback?: {
    expectsCallback: boolean;
    callbackType?: 'result' | 'progress' | 'approval' | 'error';
    returnToNode?: string;
  };
}

export interface HandoffResult {
  success: boolean;
  handoffId: string;
  targetAgent: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  result?: {
    output?: unknown;
    stateUpdates?: Partial<WorkflowState>;
    nextActions?: string[];
    warnings?: string[];
  };
  error?: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
  metrics?: {
    durationMs?: number;
    confidence?: number;
  };
}

/**
 * Service for managing agent-to-agent handoffs and coordination
 */
@Injectable()
export class AgentHandoffService {
  private readonly logger = new Logger(AgentHandoffService.name);
  private activeHandoffs = new Map<string, HandoffResult>();

  /**
   * Create a handoff to another agent
   */
  async createHandoff<TState extends WorkflowState = WorkflowState>(
    payload: HandoffPayload,
    currentState: TState,
  ): Promise<HandoffResult> {
    const handoffId = this.generateHandoffId();
    
    this.logger.log(`Creating handoff ${handoffId}:`, {
      from: payload.sourceAgent,
      to: payload.targetAgent,
      type: payload.handoffType,
    });

    // Create initial handoff result
    const handoffResult: HandoffResult = {
      success: false,
      handoffId,
      targetAgent: payload.targetAgent,
      status: 'pending',
      metrics: {
        confidence: currentState.confidence || 0,
      },
    };

    // Store active handoff
    this.activeHandoffs.set(handoffId, handoffResult);

    try {
      // Create command for the handoff
      const command = this.createHandoffCommand(payload, handoffId, currentState);
      
      // Update handoff status
      handoffResult.status = 'in_progress';
      
      // Simulate async handoff execution (in real implementation, this would trigger the target agent)
      const result = await this.executeHandoff(command, payload, currentState);
      
      // Update handoff result
      handoffResult.success = true;
      handoffResult.status = 'completed';
      handoffResult.result = result;
      
      this.logger.log(`Handoff ${handoffId} completed successfully`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      handoffResult.status = 'failed';
      handoffResult.error = {
        message: errorMessage,
        code: 'HANDOFF_FAILED',
        details: { originalError: error },
      };
      
      this.logger.error(`Handoff ${handoffId} failed:`, error);
    }

    return handoffResult;
  }

  /**
   * Create a command for handoff
   */
  private createHandoffCommand<TState extends WorkflowState>(
    payload: HandoffPayload,
    handoffId: string,
    currentState: TState,
  ): Command<TState> {
    return {
      type: 'goto',
      goto: payload.targetAgent,
      update: payload.stateUpdates as Partial<TState>,
      metadata: {
        handoffId,
        handoffType: payload.handoffType,
        sourceAgent: payload.sourceAgent,
        targetAgent: payload.targetAgent,
        instructions: payload.instructions,
        context: payload.context,
        isBlocking: payload.isBlocking,
        timeoutMs: payload.timeoutMs,
        callback: payload.callback,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Execute the handoff (simulated - in real implementation would trigger target agent)
   */
  private async executeHandoff<TState extends WorkflowState>(
    command: Command<TState>,
    payload: HandoffPayload,
    currentState: TState,
  ): Promise<HandoffResult['result']> {
    // Simulate async execution
    await new Promise(resolve => setTimeout(resolve, 100));

    // Build result based on handoff type
    const result: HandoffResult['result'] = {
      output: {
        handoffType: payload.handoffType,
        processedBy: payload.targetAgent,
        context: payload.context,
      },
      stateUpdates: {
        ...payload.stateUpdates,
        lastHandoff: {
          from: payload.sourceAgent,
          to: payload.targetAgent,
          type: payload.handoffType,
          timestamp: new Date(),
        } as any,
      },
      nextActions: this.determineNextActions(payload.handoffType),
    };

    return result;
  }

  /**
   * Determine next actions based on handoff type
   */
  private determineNextActions(handoffType: HandoffType): string[] {
    switch (handoffType) {
      case 'delegation':
        return ['await_completion', 'monitor_progress'];
      case 'consultation':
        return ['process_feedback', 'incorporate_suggestions'];
      case 'review':
        return ['await_approval', 'address_feedback'];
      case 'escalation':
        return ['await_resolution', 'implement_guidance'];
      case 'collaboration':
        return ['coordinate_work', 'merge_results'];
      case 'handover':
        return ['transfer_complete', 'end_involvement'];
      default:
        return ['continue'];
    }
  }

  /**
   * Get status of a handoff
   */
  getHandoffStatus(handoffId: string): HandoffResult | undefined {
    return this.activeHandoffs.get(handoffId);
  }

  /**
   * Cancel a handoff
   */
  cancelHandoff(handoffId: string): boolean {
    const handoff = this.activeHandoffs.get(handoffId);
    
    if (!handoff) {
      this.logger.warn(`Handoff ${handoffId} not found`);
      return false;
    }

    if (handoff.status === 'completed' || handoff.status === 'failed') {
      this.logger.warn(`Cannot cancel handoff ${handoffId} - already ${handoff.status}`);
      return false;
    }

    handoff.status = 'cancelled';
    this.logger.log(`Handoff ${handoffId} cancelled`);
    return true;
  }

  /**
   * Create a delegation handoff
   */
  createDelegation<TState extends WorkflowState = WorkflowState>(
    targetAgent: string,
    task: HandoffContext['task'],
    instructions?: string,
  ): HandoffPayload {
    return {
      targetAgent,
      sourceAgent: 'current',
      handoffType: 'delegation',
      context: {
        task,
        currentState: {
          phase: 'delegation',
          progress: 0,
        },
      },
      instructions,
      isBlocking: true,
    };
  }

  /**
   * Create a consultation handoff
   */
  createConsultation<TState extends WorkflowState = WorkflowState>(
    targetAgent: string,
    question: string,
    context?: Partial<HandoffContext>,
  ): HandoffPayload {
    return {
      targetAgent,
      sourceAgent: 'current',
      handoffType: 'consultation',
      context: {
        ...context,
        task: {
          id: `consult-${Date.now()}`,
          name: 'Consultation Request',
          description: question,
        },
      },
      instructions: question,
      isBlocking: false,
    };
  }

  /**
   * Create a review handoff
   */
  createReview<TState extends WorkflowState = WorkflowState>(
    targetAgent: string,
    workToReview: HandoffContext['workCompleted'],
    criteria?: string[],
  ): HandoffPayload {
    return {
      targetAgent,
      sourceAgent: 'current',
      handoffType: 'review',
      context: {
        workCompleted: workToReview,
        dependencies: {
          constraints: criteria,
        },
      },
      isBlocking: true,
      callback: {
        expectsCallback: true,
        callbackType: 'approval',
      },
    };
  }

  /**
   * Create an escalation handoff
   */
  createEscalation<TState extends WorkflowState = WorkflowState>(
    targetAgent: string,
    issue: string,
    context: HandoffContext,
  ): HandoffPayload {
    return {
      targetAgent,
      sourceAgent: 'current',
      handoffType: 'escalation',
      context: {
        ...context,
        task: {
          id: `escalation-${Date.now()}`,
          name: 'Escalation',
          description: issue,
          priority: 'high',
        },
      },
      instructions: `Escalation: ${issue}`,
      isBlocking: true,
    };
  }

  /**
   * Process handoff callback
   */
  async processHandoffCallback<TState extends WorkflowState = WorkflowState>(
    handoffId: string,
    callbackData: unknown,
    currentState: TState,
  ): Promise<Partial<TState>> {
    const handoff = this.activeHandoffs.get(handoffId);
    
    if (!handoff) {
      throw new Error(`Handoff ${handoffId} not found`);
    }

    this.logger.log(`Processing callback for handoff ${handoffId}`);

    // Process callback based on type
    const stateUpdates: Partial<TState> = {
      confidence: this.calculateConfidenceFromCallback(callbackData, currentState.confidence || 0),
    } as Partial<TState>;

    // Mark handoff as completed
    handoff.status = 'completed';

    return stateUpdates;
  }

  /**
   * Calculate confidence from callback
   */
  private calculateConfidenceFromCallback(callbackData: unknown, currentConfidence: number): number {
    // Simple logic - can be extended based on actual callback data
    if (typeof callbackData === 'object' && callbackData && 'approved' in callbackData) {
      return (callbackData as any).approved ? Math.min(currentConfidence + 0.1, 1.0) : currentConfidence - 0.1;
    }
    return currentConfidence;
  }

  /**
   * Generate unique handoff ID
   */
  private generateHandoffId(): string {
    return `handoff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up completed handoffs
   */
  cleanupCompletedHandoffs(olderThanMs = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    this.activeHandoffs.forEach((handoff, id) => {
      if (
        (handoff.status === 'completed' || handoff.status === 'failed' || handoff.status === 'cancelled') &&
        handoff.metrics?.durationMs && 
        handoff.metrics.durationMs > olderThanMs
      ) {
        this.activeHandoffs.delete(id);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} completed handoffs`);
    }

    return cleaned;
  }

  /**
   * Get all active handoffs
   */
  getActiveHandoffs(): HandoffResult[] {
    return Array.from(this.activeHandoffs.values()).filter(
      h => h.status === 'pending' || h.status === 'in_progress'
    );
  }

  /**
   * Get handoff metrics
   */
  getHandoffMetrics(): {
    total: number;
    active: number;
    completed: number;
    failed: number;
    averageDurationMs?: number;
  } {
    const handoffs = Array.from(this.activeHandoffs.values());
    const completed = handoffs.filter(h => h.status === 'completed');
    const durations = completed
      .map(h => h.metrics?.durationMs)
      .filter((d): d is number => d !== undefined);

    return {
      total: handoffs.length,
      active: handoffs.filter(h => h.status === 'pending' || h.status === 'in_progress').length,
      completed: completed.length,
      failed: handoffs.filter(h => h.status === 'failed').length,
      averageDurationMs: durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : undefined,
    };
  }
}