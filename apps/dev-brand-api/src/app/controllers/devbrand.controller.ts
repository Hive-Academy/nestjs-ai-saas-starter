import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Logger,
  BadRequestException,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import { DevBrandSupervisorWorkflow } from '../business-workflows/workflows/devbrand-supervisor.workflow';
import type { DomainStreamEvent } from '@hive-academy/langgraph-workflow-engine';
import { WorkflowResumptionService } from '@hive-academy/langgraph-workflow-engine';
import { generateThreadId } from '@hive-academy/langgraph-core';
import {
  SupervisorConversationHistoryResponseDto,
  NewConversationResponseDto,
  NewConversationDto,
  ConversationListResponseDto,
  ConversationSummaryDto,
} from '../business-workflows/controllers/dto/conversation.dto';
import {
  THREAD_REGISTRY_TOKEN,
  type IThreadRegistryStore,
  type ThreadMetadata,
} from '@hive-academy/langgraph-memory';

/**
 * 🎯 DEVBRAND WORKFLOW CONTROLLER - SSE STREAMING PATTERN
 *
 * REST API endpoints for DevBrandSupervisorWorkflow with Server-Sent Events (SSE) streaming
 *
 * Architecture Pattern (Following ResearchChatController):
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ 1. POST /api/devbrand/execute → Returns executionId immediately  │
 * │ 2. GET /api/devbrand/stream/:id → SSE stream (EventSource)       │
 * │ 3. DevBrandWorkflow.executeWithStreaming() → LangGraph.stream()  │
 * │ 4. Stream yields workflow state updates in real-time             │
 * │ 5. HITL interruption pauses workflow when needed                 │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Endpoints:
 * - POST /api/devbrand/execute - Start workflow (returns executionId)
 * - GET /api/devbrand/stream/:executionId - SSE streaming endpoint
 *
 * SSE Streaming Format:
 * - event: workflow-update
 * - data: { executionId, nodeName, state, timestamp }
 *
 * Frontend Integration (Angular):
 * ```typescript
 * const eventSource = new EventSource(`/api/devbrand/stream/${executionId}`);
 * eventSource.addEventListener('workflow-update', (event) => {
 *   const data = JSON.parse(event.data);
 *   // Handle state updates
 * });
 * ```
 */

export class ExecuteDevBrandDto {
  @ApiProperty({
    description: 'GitHub username to analyze',
    example: 'johnsmith',
  })
  @IsString()
  githubUsername!: string;

  @ApiProperty({
    description: 'User ID for personalization (optional)',
    example: 'user-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;
}

export class ExecuteDevBrandResponseDto {
  @ApiProperty({
    description: 'Unique execution ID for this workflow',
    example: 'devbrand-1697456789',
  })
  executionId!: string;

  @ApiProperty({
    description: 'Workflow status',
    example: 'started',
  })
  status!: 'started';

  @ApiProperty({
    description: 'Human-readable message',
    example:
      'Workflow started successfully. Connect to SSE stream for real-time updates.',
  })
  message!: string;

  @ApiProperty({
    description: 'SSE stream URL for real-time updates',
    example: '/api/devbrand/stream/devbrand-1697456789',
  })
  streamUrl!: string;
}

@ApiTags('DevBrand Workflow')
@Controller('devbrand')
export class DevBrandController {
  private readonly logger = new Logger(DevBrandController.name);

  // Store active workflow streams (executionId → async generator)
  private readonly activeStreams = new Map<
    string,
    AsyncGenerator<DomainStreamEvent, void, unknown>
  >();

  constructor(
    private readonly devBrandWorkflow: DevBrandSupervisorWorkflow,
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
   * Start DevBrand workflow (non-blocking)
   * Returns executionId immediately for SSE subscription
   */
  @UseGuards(JwtAuthGuard)
  @Post('execute')
  @ApiOperation({
    summary: 'Start DevBrand workflow',
    description: `
      Starts the DevBrand personal branding workflow for a GitHub user.
      Returns executionId immediately. Use the executionId to connect to
      SSE stream endpoint for real-time updates.

      Workflow includes:
      - GitHub code analysis (repositories, technologies, achievements)
      - Personal brand strategy development (positioning, target audience)
      - Multi-platform content creation (LinkedIn, Dev.to)

      All streaming and HITL interruptions are delivered via SSE.
    `,
  })
  @ApiResponse({
    status: 201,
    type: ExecuteDevBrandResponseDto,
    description:
      'Workflow started successfully. Connect to SSE stream endpoint.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request (missing githubUsername)',
  })
  async executeDevBrand(
    @Body() dto: ExecuteDevBrandDto,
    @Req() request: Request
  ): Promise<ExecuteDevBrandResponseDto> {
    const userId = request.user!.id;
    this.logger.log(
      `🚀 Starting DevBrand workflow for: ${dto.githubUsername}, user: ${userId}`
    );

    try {
      // Validate input
      if (!dto.githubUsername || dto.githubUsername.trim().length === 0) {
        throw new BadRequestException('GitHub username cannot be empty');
      }

      const executionId = `devbrand-${Date.now()}`;

      // Create async generator for streaming - userId comes from authenticated JWT context
      const stream = this.devBrandWorkflow.executeWithStreaming({
        userId,
        githubUsername: dto.githubUsername.trim(),
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
        `✅ DevBrand workflow started: ${executionId} - Connect to /api/devbrand/stream/${executionId}`
      );

      return {
        executionId,
        status: 'started',
        message:
          'Workflow started successfully. Connect to stream URL for real-time updates.',
        streamUrl: `/api/devbrand/stream/${executionId}`,
      };
    } catch (error: any) {
      this.logger.error(`❌ Failed to start workflow:`, error.message);
      throw new HttpException(
        error.message || 'Failed to start DevBrand workflow',
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
        this.logger.warn(`Stream not found for ${executionId}`);
        // Send as SSE event (not subscriber.error) to prevent EventSource auto-reconnect loop
        subscriber.next({
          data: {
            type: 'workflow_error',
            executionId,
            message: `Stream not found for ${executionId}. It may have already completed or expired.`,
            timestamp: new Date().toISOString(),
          },
          type: 'workflow_error',
        } as MessageEvent);
        subscriber.complete();
        return;
      }

      // Consume async generator and emit SSE events
      (async () => {
        try {
          for await (const event of stream) {
            // Format as SSE MessageEvent
            subscriber.next({
              data: event,
              type: 'workflow-update',
            } as MessageEvent);

            // Check if workflow completed (state only exists on workflow-update events)
            const workflowState =
              event.type === 'workflow-update'
                ? (event.state as Record<string, unknown> | undefined)
                : undefined;
            const stateStatus = workflowState?.['status'];
            const stateMetadata = workflowState?.['metadata'] as
              | Record<string, unknown>
              | undefined;
            if (
              stateStatus === 'completed' ||
              stateMetadata?.['workflowCompleted']
            ) {
              this.logger.log(`✅ Workflow completed: ${executionId}`);
              subscriber.next({
                data: {
                  type: 'workflow_complete',
                  executionId,
                  finalState: workflowState,
                  timestamp: new Date().toISOString(),
                },
                type: 'workflow_complete',
              } as MessageEvent);
              subscriber.complete();
              this.activeStreams.delete(executionId);
              break;
            }
          }
        } catch (error: any) {
          this.logger.error(
            `❌ Stream error for ${executionId}:`,
            error.message
          );
          // Send error as SSE event (not subscriber.error) so the client receives it
          // before the connection closes. subscriber.error() causes an abrupt close
          // which triggers EventSource auto-reconnect → infinite loop.
          subscriber.next({
            data: {
              type: 'workflow_error',
              executionId,
              message: error.message || 'Workflow execution failed',
              timestamp: new Date().toISOString(),
            },
            type: 'workflow_error',
          } as MessageEvent);
          subscriber.complete(); // Clean close prevents auto-reconnect
          this.activeStreams.delete(executionId);
        }
      })();
    });
  }

  /**
   * CONVERSATION HISTORY ENDPOINTS (TASK_2025_050)
   * Following patterns from controller-implementation-guide.md
   * Supervisor-specific: Uses DevBrandSupervisorWorkflow with agent coordination metadata
   */

  /**
   * Get conversation list for authenticated user
   * @route GET /devbrand/conversation/list
   * @returns Last 10 supervisor conversations with preview, status, agent coordination
   *
   * Implementation: TASK_2025_050 - TASK 3
   * Reference: implementation-plan.md:483-507
   */
  @UseGuards(JwtAuthGuard)
  @Get('conversation/list')
  async getConversationList(
    @Req() request: Request
  ): Promise<ConversationListResponseDto> {
    const userId = request.user!.id;

    this.logger.log(
      `📋 Retrieving supervisor conversation list for user: ${userId}`
    );

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
            thread.title ||
            `Conversation ${thread.createdAt.toLocaleDateString()}`,
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
        hasMore: threads.length === 50, // Basic pagination check
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
   * Get conversation history for specific supervisor thread
   * @route GET /devbrand/conversation/history/:threadId
   * @returns Complete conversation with agent coordination (currentAgent, nextAgent, agentHistory)
   *
   * Implementation: TASK_2025_050 - TASK 3
   * Reference: implementation-plan.md:509-594, controller-implementation-guide.md:393-485
   */
  @UseGuards(JwtAuthGuard)
  @Get('conversation/history/:threadId')
  async getSupervisorConversationHistory(
    @Param('threadId') threadId: string,
    @Req() request: Request
  ): Promise<SupervisorConversationHistoryResponseDto> {
    const userId = request.user!.id;

    this.logger.log(
      `📖 Retrieving supervisor conversation history for thread: ${threadId}, user: ${userId}`
    );

    try {
      // Get workflow state from resumption service
      // Reference: controller-implementation-guide.md:409-413
      const stateSnapshot =
        await this.workflowResumptionService.getWorkflowState(
          'DevBrandSupervisorWorkflow',
          threadId
        );

      // Security: Verify thread ownership
      // Reference: controller-implementation-guide.md:416-422
      const threadUserId = stateSnapshot.values.metadata?.userId;
      if (threadUserId && threadUserId !== userId) {
        throw new UnauthorizedException(
          `User ${userId} cannot access thread ${threadId}`
        );
      }

      // Extract conversation messages
      // Reference: controller-implementation-guide.md:425-429
      const messages = stateSnapshot.values.messages || [];

      // Format response with supervisor-specific structure
      // Reference: controller-implementation-guide.md:431-467
      return {
        threadId,
        userId: threadUserId || userId,
        conversationHistory: messages.map((msg: any) => ({
          role: msg._getType(), // 'human' | 'ai' | 'system'
          content: msg.content,
          timestamp:
            msg.additional_kwargs?.timestamp || new Date().toISOString(),
          agentId: msg.additional_kwargs?.agentId, // Supervisor-specific
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
        agentCoordination: {
          currentAgent: stateSnapshot.values.current as string | undefined,
          nextAgent: stateSnapshot.values.next as string | undefined,
          agentHistory: this.extractAgentHistory(messages),
          pendingTasks: stateSnapshot.tasks || [],
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
        `Failed to retrieve supervisor conversation history for thread ${threadId}:`,
        error.message
      );

      // Re-throw authorization errors
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new NotFoundException(
        `Supervisor conversation history not found for thread ${threadId}`
      );
    }
  }

  /**
   * Create new supervisor conversation thread
   * @route POST /devbrand/conversation/new
   * @returns New thread ID with devbrand-{timestamp}-{userId} format
   *
   * Implementation: TASK_2025_050 - TASK 3
   * Reference: implementation-plan.md:596-601
   */
  @UseGuards(JwtAuthGuard)
  @Post('conversation/new')
  async createNewConversation(
    @Body() dto: NewConversationDto,
    @Req() request: Request
  ): Promise<NewConversationResponseDto> {
    const userId = request.user!.id;

    this.logger.log(
      `🆕 Creating new supervisor conversation for user: ${userId}${
        dto.initialQuery ? ` with query: "${dto.initialQuery}"` : ''
      }`
    );

    try {
      const workflowType = 'supervisor';

      // Generate unique thread ID using standardized utility from core
      // Format: thread_{workflowType}_{uuid-12-chars}
      const threadId = generateThreadId(workflowType);

      // Create thread in ThreadRegistryStore
      if (this.threadRegistry) {
        try {
          await this.threadRegistry.createThread(userId, {
            threadId, // Pass generated threadId to prevent mismatch
            title: dto.initialQuery || 'New Conversation',
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
        conversationUrl: `/devbrand`,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create new conversation:`, error.message);
      throw new InternalServerErrorException(
        'Failed to create new conversation'
      );
    }
  }

  /**
   * Helper: Extract agent history from messages
   * Filters messages with agentId metadata to track agent coordination flow
   *
   * Reference: implementation-plan.md:580-593
   */
  private extractAgentHistory(
    messages: any[]
  ): Array<{ agentId: string; timestamp: string; action: string }> {
    return messages
      .filter((msg) => msg.additional_kwargs?.agentId)
      .map((msg) => ({
        agentId: msg.additional_kwargs.agentId,
        timestamp: msg.additional_kwargs.timestamp || new Date().toISOString(),
        action: msg.additional_kwargs.action || 'executed',
      }));
  }
}
