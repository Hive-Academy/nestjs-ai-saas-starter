import { Injectable } from '@nestjs/common';
import { WorkflowManagerService } from '@hive-academy/langgraph-multi-agent';
import { HumanApprovalService, InterruptionType } from '@hive-academy/langgraph-hitl';

/**
 * User Interruption Management Service
 * Handles all user interruption-related operations and business logic
 */
@Injectable()
export class UserInterruptionManagementService {

  constructor(
    private readonly workflowManager: WorkflowManagerService,
    private readonly hitlService: HumanApprovalService
  ) {}

  /**
   * Interrupt agent execution with a user question
   */
  async interruptWithQuestion(request: {
    executionId: string;
    nodeId?: string;
    question: string;
    userId?: string;
    urgency?: 'low' | 'medium' | 'high';
  }) {
    try {
      const interruptionId = await this.hitlService.interruptAgentWithQuestion(
        request.executionId,
        request.nodeId || 'current',
        request.question
      );

      // Optionally pause workflow for user input
      if (request.urgency === 'high') {
        await this.workflowManager.pauseWorkflow(request.executionId);
      }

      return {
        success: true,
        data: {
          interruptionId,
          executionId: request.executionId,
          message: 'Agent interrupted successfully',
          status: 'awaiting_response',
          createdAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Request clarification from user during agent execution
   */
  async requestClarification(request: {
    executionId: string;
    nodeId?: string;
    clarificationRequest: string;
    context?: Record<string, unknown>;
  }) {
    try {
      const interruptionId = await this.hitlService.requestClarification(
        request.executionId,
        request.nodeId || 'current',
        request.clarificationRequest
      );

      // Always pause workflow when clarification is needed
      await this.workflowManager.pauseWorkflow(request.executionId);

      return {
        success: true,
        data: {
          interruptionId,
          executionId: request.executionId,
          message: 'Clarification request created',
          clarificationRequest: request.clarificationRequest,
          status: 'awaiting_clarification',
          context: request.context,
          createdAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Respond to a user interruption
   */
  async respondToInterruption(
    interruptionId: string,
    response: {
      response: string;
      continueExecution?: boolean;
      userId?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    try {
      const result = await this.hitlService.handleUserInterruptionResponse({
        interruptionId,
        response: response.response,
        continueExecution: response.continueExecution ?? true,
        timestamp: new Date(),
        metadata: {
          userId: response.userId,
          responseLength: response.response.length,
          ...response.metadata,
        },
      });

      // Resume workflow if requested and interruption was successfully processed
      if (
        result.success &&
        result.shouldContinue &&
        response.continueExecution
      ) {
        // Note: Workflow resume functionality would be implemented here
        // when interruption-to-execution mapping is available
        console.log('Workflow would resume, but need executionId from interruption');
      }

      return {
        success: result.success,
        data: {
          interruptionId,
          processed: result.success,
          shouldContinue: result.shouldContinue,
          workflowResumed: response.continueExecution && result.shouldContinue,
          updatedState: result.updatedState,
          error: result.error,
          processedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get active user interruptions for an execution
   */
  async getActiveInterruptions(executionId: string) {
    try {
      const interruptions = await this.hitlService.getActiveUserInterruptions(
        executionId
      );

      return {
        success: true,
        data: {
          executionId,
          interruptions: interruptions,
          count: interruptions.length,
          hasActiveInterruptions: interruptions.length > 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: {
          executionId,
          interruptions: [],
          count: 0,
          hasActiveInterruptions: false,
        },
      };
    }
  }

  /**
   * Cancel a user interruption
   */
  async cancelInterruption(
    interruptionId: string,
    request: { reason?: string; userId?: string }
  ) {
    try {
      const cancelled = await this.hitlService.cancelUserInterruption(
        interruptionId
      );

      return {
        success: cancelled,
        data: {
          interruptionId,
          cancelled,
          reason: request.reason || 'User cancelled',
          cancelledBy: request.userId,
          cancelledAt: new Date().toISOString(),
        },
        message: cancelled
          ? 'Interruption cancelled successfully'
          : 'Failed to cancel interruption',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Request dynamic user interruption during workflow execution
   */
  async requestUserInterruption(request: {
    executionId: string;
    nodeId?: string;
    type:
      | 'question'
      | 'clarification'
      | 'input_request'
      | 'approval_request'
      | 'correction';
    message: string;
    pauseWorkflow?: boolean;
    timeoutMs?: number;
    urgency?: 'low' | 'medium' | 'high';
    metadata?: Record<string, unknown>;
  }) {
    try {
      const interruptionId = await this.hitlService.requestUserInterruption({
        executionId: request.executionId,
        nodeId: request.nodeId || 'current',
        type: request.type as InterruptionType,
        message: request.message,
        metadata: {
          urgency: request.urgency || 'medium',
          timeoutMs: request.timeoutMs || 300000, // 5 minutes default
          source: 'rest_api',
          ...request.metadata,
        },
      });

      // Pause workflow if requested
      if (request.pauseWorkflow !== false) {
        await this.workflowManager.pauseWorkflow(request.executionId);
      }

      return {
        success: true,
        data: {
          interruptionId,
          executionId: request.executionId,
          type: request.type,
          message: request.message,
          workflowPaused: request.pauseWorkflow !== false,
          estimatedResumeTime: new Date(
            Date.now() + (request.timeoutMs || 300000)
          ),
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Inject user input during workflow execution
   */
  async injectUserInput(
    executionId: string,
    request: {
      input: string;
      nodeId?: string;
      resumeExecution?: boolean;
      inputType?: 'text' | 'selection' | 'correction' | 'approval';
      metadata?: Record<string, unknown>;
    }
  ) {
    try {
      // Create an interruption request for input injection
      const interruptionId = await this.hitlService.requestUserInterruption({
        executionId,
        nodeId: request.nodeId || 'current',
        type: InterruptionType.INPUT_REQUEST,
        message: `User input: ${request.input}`,
        metadata: {
          inputType: request.inputType || 'text',
          source: 'input_injection',
          ...request.metadata,
        },
      });

      // Immediately respond with the provided input
      const result = await this.hitlService.handleUserInterruptionResponse({
        interruptionId,
        response: request.input,
        continueExecution: request.resumeExecution !== false,
        timestamp: new Date(),
        metadata: {
          injected: true,
          inputType: request.inputType || 'text',
        },
      });

      // Resume workflow with injected input if successful
      if (
        result.success &&
        result.shouldContinue &&
        request.resumeExecution !== false
      ) {
        await this.workflowManager.resumeWorkflow(executionId, request.input);
      }

      return {
        success: result.success,
        data: {
          executionId,
          interruptionId,
          inputInjected: result.success,
          workflowResumed:
            result.success &&
            result.shouldContinue &&
            request.resumeExecution !== false,
          input: request.input,
          inputType: request.inputType || 'text',
          processedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}