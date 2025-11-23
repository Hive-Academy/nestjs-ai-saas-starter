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
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
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
import { generateThreadId } from '@hive-academy/langgraph-core';
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { QueryTokenAuthGuard } from '../../auth/guards/query-token.guard';
import { WorkflowAuthContextService } from '@hive-academy/langgraph-workflow-engine';

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
    private readonly workflowAuthContext: WorkflowAuthContextService,
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
  @UseGuards(JwtAuthGuard)
  @Post('chat')
  async startResearch(
    @Body()
    body: {
      query: string;
      researchDepth?: 'summary' | 'detailed' | 'comprehensive';
    },
    @Req() request: Request
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

      const user = request.user!;
      const workflowType = 'researcher';

      // Generate secure, user-scoped thread ID
      const executionId = this.workflowAuthContext.createThreadId(
        user.tenantId,
        user.id,
        workflowType
      );

      // Create user context configuration
      const config = this.workflowAuthContext.createUserConfig(user);

      // Create async generator for streaming
      const stream = this.researcherAgent.executeWithStreaming({
        userId: user.id,
        query: body.query.trim(),
        researchDepth: body.researchDepth || 'detailed',
        executionId,
        config, // Pass user context
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
  @UseGuards(QueryTokenAuthGuard)
  streamWorkflow(
    @Param('executionId') executionId: string,
    @Req() req: Request
  ): Observable<MessageEvent> {
    this.logger.log(`📡 SSE stream connected for ${executionId}`);

    // Verify ownership
    const user = req.user as any;
    const metadata = this.workflowAuthContext.parseThreadId(executionId);

    // If we can parse the thread ID, verify ownership
    if (metadata && metadata.userId !== user.userId) {
      throw new UnauthorizedException('Unauthorized access to execution');
    }

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
  @UseGuards(JwtAuthGuard)
  @Post('approve/:executionId')
  async approveReport(
    @Param('executionId') executionId: string,
    @Body()
    body: {
      approved: boolean;
      feedback?: string;
    },
    @Req() request: Request
  ): Promise<{ status: string; message: string; result?: any }> {
    this.logger.log(
      `📝 Approval received for ${executionId}: ${
        body.approved ? 'APPROVED' : 'REJECTED'
      }`
    );

    try {
      const user = request.user!;

      // Verify thread ownership
      const metadata = this.workflowAuthContext.parseThreadId(executionId);
      if (metadata && metadata.userId !== user.id) {
        throw new UnauthorizedException(
          'You do not have permission to approve this report'
        );
      }

      // Prepare approval state to inject into workflow
      const approvalState = {
        metadata: {
          userApproval: body.approved ? 'approved' : 'rejected',
          approvalFeedback: body.feedback,
          approvalTimestamp: new Date().toISOString(),
          approvedBy: user.id, // Track who approved
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
  @UseGuards(JwtAuthGuard)
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
      // TODO: Filter reports by user.tenantId
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
  @UseGuards(JwtAuthGuard)
  @Get('reports/:filename')
  async readReport(
    @Param('filename') filename: string,
    @Req() request: Request
  ): Promise<{
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

      // Security: Check if user owns the report
      const user = request.user!;
      if (result.metadata?.userId && result.metadata.userId !== user.id) {
        // Allow if admin or same tenant? For now strict user check
        throw new UnauthorizedException(
          'You do not have permission to view this report'
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
   * Get conversation list for current user
   * @route GET /research/conversation/list
   * @returns Array of conversation summaries with metadata
   *
   * Implementation: TASK_2025_050 - TASK 1
   * Reference: implementation-plan.md:280-406, controller-implementation-guide.md:13-86
   *
   * Data Flow:
   * 1. Extract userId from JWT (JwtAuthGuard)
   * 2. Query ThreadRegistryStore.listThreads(userId)
   * 3. Map ThreadMetadata[] → ConversationSummaryDto[]
   *    - threadId → threadId
   *    - title || createdAt → preview
   *    - lastMessageAt → timestamp
   *    - metadata → metadata (researchStatus, reportTitle, etc.)
   */
  @UseGuards(JwtAuthGuard)
  @Get('conversation/list')
  async getConversationList(
    @Req() request: Request
  ): Promise<ConversationListResponseDto> {
    const userId = request.user!.id;

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
   * Security: User-thread ownership validated via ThreadRegistryStore
   */
  @UseGuards(JwtAuthGuard)
  @Get('conversation/history/:threadId')
  async getConversationHistory(
    @Param('threadId') threadId: string,
    @Req() request: Request
  ): Promise<ConversationHistoryResponseDto> {
    const userId = request.user!.id;

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
      const threadUserId = stateSnapshot.values.metadata?.userId as
        | string
        | undefined;
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
   * @route POST /research/conversation
   * @returns New conversation metadata with threadId
   *
   * Implementation: TASK_2025_050 - TASK 3
   * Reference: implementation-plan.md:280-406, controller-implementation-guide.md:159-212
   */
  @UseGuards(JwtAuthGuard)
  @Post('conversation')
  async createNewConversation(
    @Body() dto: NewConversationDto,
    @Req() request: Request
  ): Promise<NewConversationResponseDto> {
    const userId = request.user!.id;

    this.logger.log(
      `🆕 Creating new conversation for user: ${userId}${
        dto.initialQuery ? ` with query: "${dto.initialQuery}"` : ''
      }`
    );

    try {
      const workflowType = 'researcher';

      // Generate unique thread ID using standardized utility from core
      // Format: thread_{workflowType}_{uuid-12-chars}
      // ✅ UPDATED: Use WorkflowAuthContextService for scoped ID
      const threadId = this.workflowAuthContext.createThreadId(
        request.user!.tenantId,
        userId,
        workflowType
      );

      // Create thread in ThreadRegistryStore
      if (this.threadRegistry) {
        try {
          await this.threadRegistry.createThread(userId, {
            threadId, // Pass generated threadId to prevent mismatch
            title: dto.initialQuery || 'New Research',
            metadata: {
              source: 'web_ui',
              workflowType,
              initialQuery: dto.initialQuery,
            },
          });
          this.logger.log(`✅ Thread created in registry: ${threadId}`);
        } catch (error: any) {
          this.logger.warn(
            `Failed to create thread in registry: ${error.message}`
          );
          // Continue - graceful degradation
        }
      }

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
