import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Logger,
  HttpException,
  HttpStatus,
  Sse,
  Req,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import { ResearcherAgent } from '../agents/researcher.agent';
import { FileOperationTools } from '../core/tools/file-operation.tools';
import {
  MessageStreamEvent,
  CustomStreamEvent,
  DebugStreamEvent,
  WorkflowExecutionService,
  WorkflowResumptionService,
} from '@hive-academy/langgraph-workflow-engine';
import {
  ConversationListResponseDto,
  ConversationHistoryResponseDto,
  NewConversationResponseDto,
  NewConversationDto,
  ConversationSummaryDto,
} from './dto/conversation.dto';
import {
  THREAD_REGISTRY_TOKEN,
  type IThreadRegistryStore,
  type ThreadMetadata,
} from '@hive-academy/langgraph-memory';

/**
 * 🔬 RESEARCH CHAT CONTROLLER - WITH NATIVE SSE STREAMING
 *
 * REST API endpoints for ResearcherAgent with Server-Sent Events (SSE) streaming
 *
 * Architecture Pattern (Following DevBrand POC):
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ 1. POST /api/research/chat → Returns executionId immediately     │
 * │ 2. GET /api/research/stream/:id → SSE stream (EventSource)       │
 * │ 3. ResearcherAgent.executeWithStreaming() → LangGraph.stream()   │
 * │    ✅ Uses StreamEventParser for robust chunk parsing            │
 * │    ✅ Uses StreamEventTransformer for domain event mapping       │
 * │ 4. Stream yields workflow state updates in real-time             │
 * │ 5. HITL interruption pauses workflow after report draft          │
 * │ 6. POST /api/research/approve/:id → Resume with user decision    │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Endpoints:
 * - POST /api/research/chat - Start research workflow (returns executionId)
 * - GET /api/research/stream/:executionId - SSE streaming endpoint
 * - POST /api/research/approve/:executionId - HITL approval (resume workflow)
 * - GET /api/research/reports - List all saved reports
 * - GET /api/research/reports/:filename - Read specific report
 *
 * SSE Streaming Format:
 * - event: workflow-update
 * - data: { type, executionId, nodeName, state, timestamp }
 *
 * Frontend Integration (Angular):
 * ```typescript
 * const eventSource = new EventSource(`/api/research/stream/${executionId}`);
 * eventSource.addEventListener('workflow-update', (event) => {
 *   const data = JSON.parse(event.data);
 *   // Handle state updates
 * });
 * ```
 */
@Controller('research')
export class ResearchChatController {
  private readonly logger = new Logger(ResearchChatController.name);

  // Store active workflow streams (executionId → async generator)
  private readonly activeStreams = new Map<
    string,
    AsyncGenerator<any, void, unknown>
  >();

  constructor(
    private readonly researcherAgent: ResearcherAgent,
    private readonly fileTools: FileOperationTools,
    private readonly workflowExecutionService: WorkflowExecutionService,
    private readonly workflowResumptionService: WorkflowResumptionService,
    @Optional()
    @Inject(THREAD_REGISTRY_TOKEN)
    private readonly threadRegistry?: IThreadRegistryStore
  ) {
    if (!this.threadRegistry) {
      this.logger.log(
        '⚠️  ThreadRegistryStore not configured - conversation list will be empty'
      );
    }
  }

  /**
   * Start research workflow (non-blocking)
   * Returns executionId immediately for SSE subscription
   */
  @Post('chat')
  async startResearch(
    @Body()
    body: {
      userId: string;
      query: string;
      researchDepth?: 'summary' | 'detailed' | 'comprehensive';
    }
  ): Promise<{
    executionId: string;
    status: string;
    message: string;
    streamUrl: string;
  }> {
    this.logger.log(`🚀 Starting research for query: "${body.query}"`);

    try {
      // Validate input
      if (!body.query || body.query.trim().length === 0) {
        throw new HttpException(
          'Query cannot be empty',
          HttpStatus.BAD_REQUEST
        );
      }

      if (!body.userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const executionId = `research-${Date.now()}`;

      // Create async generator for streaming
      const stream = this.researcherAgent.executeWithStreaming({
        userId: body.userId,
        query: body.query.trim(),
        researchDepth: body.researchDepth || 'detailed',
        executionId,
      });

      // Store stream for SSE endpoint
      this.activeStreams.set(executionId, stream);

      // Auto-cleanup after 30 minutes
      setTimeout(() => {
        this.activeStreams.delete(executionId);
        this.logger.log(`🧹 Cleaned up stream for ${executionId}`);
      }, 30 * 60 * 1000);

      this.logger.log(
        `✅ Research workflow started: ${executionId} - Connect to /api/research/stream/${executionId}`
      );

      return {
        executionId,
        status: 'started',
        message:
          'Research workflow started. Connect to stream URL for real-time updates.',
        streamUrl: `/api/research/stream/${executionId}`,
      };
    } catch (error: any) {
      this.logger.error(`❌ Failed to start research:`, error.message);
      throw new HttpException(
        error.message || 'Failed to start research workflow',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Server-Sent Events (SSE) streaming endpoint
   * Streams workflow state updates in real-time
   */
  @Get('stream/:executionId')
  @Sse()
  streamWorkflow(
    @Param('executionId') executionId: string
  ): Observable<MessageEvent> {
    this.logger.log(`📡 SSE stream connected for ${executionId}`);

    return new Observable((subscriber) => {
      const stream = this.activeStreams.get(executionId);

      if (!stream) {
        subscriber.error(
          new HttpException(
            `Stream not found for ${executionId}. Make sure to call POST /api/research/chat first.`,
            HttpStatus.NOT_FOUND
          )
        );
        return;
      }

      // Consume async generator and emit SSE events
      (async () => {
        try {
          for await (const event of stream) {
            // ✅ NEW: Handle different event types with type discrimination
            if (event.type === 'workflow-update') {
              // Existing workflow update handling
              subscriber.next({
                data: event,
                type: 'workflow-update',
              } as MessageEvent);

              // Check if workflow interrupted (HITL)
              // @RequiresApproval decorator sets waitingForApproval: true
              if (
                event.state?.waitingForApproval === true ||
                event.state?.userApproval === 'pending'
              ) {
                this.logger.log(
                  `🛑 Workflow interrupted for approval: ${executionId}`
                );

                // Extract approval message from approvalRequest if available
                const approvalMessage =
                  event.state?.approvalRequest?.message ||
                  'Report draft ready for review';
                const reportDraft =
                  event.state?.reportDraft ||
                  event.state?.metadata?.reportDraft;

                subscriber.next({
                  data: {
                    type: 'interruption_request',
                    executionId,
                    message: approvalMessage,
                    reportDraft,
                    approvalRequest: event.state?.approvalRequest,
                    timestamp: new Date().toISOString(),
                  },
                  type: 'interruption_request',
                } as MessageEvent);
                // Don't complete - wait for approval
                break;
              }

              // Check if workflow completed
              if (
                event.state?.status === 'completed' ||
                event.state?.savedReportFilename
              ) {
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
            } else if (event.type === 'tool-execution') {
              // Existing tool execution handling
              subscriber.next({
                data: event,
                type: 'tool-execution',
              } as MessageEvent);
            } else if (event.type === 'message-stream') {
              // ✅ NEW: LLM token streaming
              const messageEvent = event as MessageStreamEvent;
              subscriber.next({
                data: {
                  type: 'llm-token',
                  executionId,
                  nodeName: messageEvent.nodeName,
                  token: messageEvent.content,
                  step: messageEvent.step,
                  messageChunk: messageEvent.messageChunk,
                  timestamp: messageEvent.timestamp,
                },
                type: 'llm-token',
              } as MessageEvent);
            } else if (event.type === 'custom-stream') {
              // ✅ NEW: Custom progress events
              const customEvent = event as CustomStreamEvent;
              subscriber.next({
                data: {
                  type: 'custom-progress',
                  executionId,
                  progress: customEvent.data,
                  timestamp: customEvent.timestamp,
                },
                type: 'custom-progress',
              } as MessageEvent);
            } else if (event.type === 'debug-stream') {
              // ✅ NEW: Debug traces (only in dev mode)
              if (process.env.NODE_ENV === 'development') {
                const debugEvent = event as DebugStreamEvent;
                subscriber.next({
                  data: {
                    type: 'debug-trace',
                    executionId,
                    eventType: debugEvent.eventType,
                    taskName: debugEvent.taskName,
                    payload: debugEvent.payload,
                    timestamp: debugEvent.timestamp,
                  },
                  type: 'debug-trace',
                } as MessageEvent);
              }
            }
          }
        } catch (error: any) {
          this.logger.error(
            `❌ Stream error for ${executionId}:`,
            error.message
          );
          subscriber.error(error);
          this.activeStreams.delete(executionId);
        }
      })();
    });
  }

  /**
   * HITL approval endpoint - Resume workflow with user decision
   *
   * Uses LangGraph resumeFromInterruption() to resume interrupted workflows:
   * 1. Workflow interrupts after @RequiresApproval task (approveReport)
   * 2. User reviews report draft in UI modal
   * 3. User approves/rejects via this endpoint
   * 4. Call resumeFromInterruption() with approval state
   * 5. Workflow continues from interrupted checkpoint
   *
   * Implementation: TASK_2025_048 - BATCH 2, Task 2.2
   */
  @Post('approve/:executionId')
  async approveReport(
    @Param('executionId') executionId: string,
    @Body()
    body: {
      approved: boolean;
      feedback?: string;
    }
  ): Promise<{ status: string; message: string; result?: any }> {
    this.logger.log(
      `📝 Approval received for ${executionId}: ${
        body.approved ? 'APPROVED' : 'REJECTED'
      }`
    );

    try {
      // Prepare approval state to inject into workflow
      const approvalState = {
        metadata: {
          userApproval: body.approved ? 'approved' : 'rejected',
          approvalFeedback: body.feedback,
          approvalTimestamp: new Date().toISOString(),
        },
      };

      // Get current state snapshot to extract checkpoint_id
      const snapshot = await this.workflowExecutionService.getStateSnapshot(
        ResearcherAgent,
        executionId
      );

      const checkpointId = snapshot.config?.configurable?.checkpoint_id as
        | string
        | undefined;

      if (!checkpointId) {
        throw new Error(`No checkpoint found for execution ${executionId}`);
      }

      // Resume workflow from interruption with approval state
      if (body.approved) {
        this.logger.log(`▶️  Resuming workflow: ${executionId}`);

        // Resume using LangGraph native resumeFromInterruption()
        await this.workflowExecutionService.resumeFromInterruption(
          ResearcherAgent,
          executionId,
          checkpointId,
          approvalState
        );

        this.logger.log(`✅ Workflow resumed and completed: ${executionId}`);

        return {
          status: 'success',
          message: 'Report approved and workflow resumed successfully',
        };
      } else {
        this.logger.log(`⛔ Workflow rejected: ${executionId}`);

        // For rejection, we still resume but the workflow can check approval state
        await this.workflowExecutionService.resumeFromInterruption(
          ResearcherAgent,
          executionId,
          checkpointId,
          approvalState
        );

        return {
          status: 'success',
          message: 'Report rejected. Workflow resumed with rejection state.',
        };
      }
    } catch (error: any) {
      this.logger.error(`❌ Approval failed:`, error.message);
      throw new HttpException(
        error.message || 'Failed to process approval',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * List all saved research reports
   */
  @Get('reports')
  async listReports(): Promise<{
    reports: Array<{
      filename: string;
      filepath: string;
      title: string;
      createdAt: string;
      metadata: Record<string, any>;
    }>;
    totalReports: number;
  }> {
    this.logger.log('📋 Listing all research reports');

    try {
      const result = await this.fileTools.listReports();
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Failed to list reports:`, error.message);
      throw new HttpException(
        error.message || 'Failed to list reports',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Read specific report by filename
   */
  @Get('reports/:filename')
  async readReport(@Param('filename') filename: string): Promise<{
    content: string;
    metadata: Record<string, any>;
    filename: string;
  }> {
    this.logger.log(`📖 Reading report: ${filename}`);

    try {
      // Basic security check - prevent directory traversal
      if (filename.includes('..') || filename.includes('/')) {
        throw new HttpException('Invalid filename', HttpStatus.BAD_REQUEST);
      }

      const filepath = `reports/${filename}`;
      const result = await this.fileTools.readReport({ filepath });

      if (!result.success) {
        throw new HttpException(
          result.error || 'Report not found',
          HttpStatus.NOT_FOUND
        );
      }

      return {
        content: result.content,
        metadata: result.metadata,
        filename,
      };
    } catch (error: any) {
      this.logger.error(`❌ Failed to read report:`, error.message);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to read report',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * CONVERSATION HISTORY ENDPOINTS (TASK_2025_050)
   * Following patterns from controller-implementation-guide.md
   */

  /**
   * Get conversation list for authenticated user
   * @route GET /research/conversation/list
   * @returns Last 10 conversations with preview, status, metadata
   *
   * Implementation: TASK_2025_050 - TASK 2
   * Reference: implementation-plan.md:156-278
   */
  @Get('conversation/list')
  async getConversationList(
    @Req() request: any
  ): Promise<ConversationListResponseDto> {
    // CRITICAL: For POC, extract userId from header (mock JWT)
    // In production, this would come from JwtAuthGuard: request.user.id
    const userId = request.headers['x-user-id'] || 'test-researcher-001';

    this.logger.log(`📋 Retrieving conversation list for user: ${userId}`);

    try {
      // Check if ThreadRegistryStore available
      if (!this.threadRegistry) {
        this.logger.log('Thread registry unavailable - returning empty list');
        return {
          conversations: [],
          totalCount: 0,
          hasMore: false,
        };
      }

      // Retrieve threads from registry
      const threads = await this.threadRegistry.listThreads(userId, {
        limit: 50,
        orderBy: 'lastMessageAt',
        orderDirection: 'DESC',
      });

      // Map ThreadMetadata to ConversationSummaryDto
      const conversations: ConversationSummaryDto[] = threads.map(
        (thread: ThreadMetadata) => ({
          threadId: thread.threadId,
          preview:
            thread.title || `Research ${thread.createdAt.toLocaleDateString()}`,
          timestamp: thread.lastMessageAt.toISOString(),
          status: 'active' as const,
          metadata:
            (thread.metadata as
              | {
                  query?: string;
                  reportTitle?: string;
                  researchStatus?: string;
                }
              | undefined) || {},
          unread: false,
        })
      );

      return {
        conversations,
        totalCount: threads.length,
        hasMore: threads.length >= 50,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to retrieve conversation list for user ${userId}:`,
        error.message
      );
      throw new InternalServerErrorException(
        'Failed to retrieve conversation list'
      );
    }
  }

  /**
   * Get conversation history for specific thread
   * @route GET /research/conversation/history/:threadId
   * @returns Complete conversation history with messages, metadata, next steps
   *
   * Implementation: TASK_2025_050 - TASK 2
   * Reference: implementation-plan.md:280-406, controller-implementation-guide.md:88-157
   */
  @Get('conversation/history/:threadId')
  async getConversationHistory(
    @Param('threadId') threadId: string,
    @Req() request: any
  ): Promise<ConversationHistoryResponseDto> {
    // CRITICAL: For POC, extract userId from header (mock JWT)
    const userId = request.headers['x-user-id'] || 'test-researcher-001';

    this.logger.log(
      `📖 Retrieving conversation history for thread: ${threadId}, user: ${userId}`
    );

    try {
      // Get workflow state from resumption service
      // Reference: controller-implementation-guide.md:106-110
      const stateSnapshot =
        await this.workflowResumptionService.getWorkflowState(
          'ResearcherAgent',
          threadId
        );

      // Security: Verify thread ownership
      // Reference: controller-implementation-guide.md:113-118
      const threadUserId = stateSnapshot.values.metadata?.userId;
      if (threadUserId && threadUserId !== userId) {
        throw new UnauthorizedException(
          `User ${userId} cannot access thread ${threadId}`
        );
      }

      // Extract conversation messages
      // Reference: controller-implementation-guide.md:121-131
      const messages = stateSnapshot.values.messages || [];

      // Format response with researcher-specific structure
      return {
        threadId,
        userId: threadUserId || userId,
        conversationHistory: messages.map((msg: any) => ({
          role: msg._getType(), // 'human' | 'ai' | 'system'
          content: msg.content,
          timestamp:
            msg.additional_kwargs?.timestamp || new Date().toISOString(),
          toolCalls: msg.tool_calls || [],
        })),
        metadata: {
          query: stateSnapshot.values.metadata?.query as string | undefined,
          reportTitle: stateSnapshot.values.metadata?.reportTitle as
            | string
            | undefined,
          researchStatus: stateSnapshot.values.metadata?.researchStatus as
            | string
            | undefined,
          confidenceScore: stateSnapshot.values.metadata?.confidenceScore as
            | number
            | undefined,
        },
        nextSteps: stateSnapshot.next || [],
        waitingForApproval:
          (stateSnapshot.values.metadata?.waitingForApproval as boolean) ||
          false,
        checkpointId: stateSnapshot.config.configurable?.checkpoint_id as
          | string
          | undefined,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to retrieve conversation history for thread ${threadId}:`,
        error.message
      );

      // Re-throw authorization errors
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new NotFoundException(
        `Conversation history not found for thread ${threadId}`
      );
    }
  }

  /**
   * Create new conversation thread
   * @route POST /research/conversation/new
   * @returns New thread ID and conversation URL
   *
   * Implementation: TASK_2025_050 - TASK 2
   * Reference: implementation-plan.md:408-481
   */
  @Post('conversation/new')
  async createNewConversation(
    @Body() dto: NewConversationDto,
    @Req() request: any
  ): Promise<NewConversationResponseDto> {
    // CRITICAL: For POC, extract userId from header (mock JWT)
    const userId = request.headers['x-user-id'] || 'test-researcher-001';

    this.logger.log(
      `🆕 Creating new conversation for user: ${userId}${
        dto.initialQuery ? ` with query: "${dto.initialQuery}"` : ''
      }`
    );

    try {
      // Generate unique thread ID
      // Reference: implementation-plan.md:463
      const threadId = `research-${Date.now()}-${userId}`;

      // NOTE: State is created when user sends first message
      // This endpoint just returns thread ID for frontend to use
      this.logger.log(`Created new conversation thread: ${threadId}`);

      return {
        threadId,
        status: 'created',
        conversationUrl: `/research-chat`,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create new conversation:`, error.message);
      throw new InternalServerErrorException(
        'Failed to create new conversation'
      );
    }
  }
}
