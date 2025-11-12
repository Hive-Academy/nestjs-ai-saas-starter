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
} from '@nestjs/common';
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
    AsyncGenerator<any, void, unknown>
  >();

  constructor(private readonly devBrandWorkflow: DevBrandSupervisorWorkflow) {}

  /**
   * Start DevBrand workflow (non-blocking)
   * Returns executionId immediately for SSE subscription
   */
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
    @Body() dto: ExecuteDevBrandDto
  ): Promise<ExecuteDevBrandResponseDto> {
    this.logger.log(`🚀 Starting DevBrand workflow for: ${dto.githubUsername}`);

    try {
      // Validate input
      if (!dto.githubUsername || dto.githubUsername.trim().length === 0) {
        throw new BadRequestException('GitHub username cannot be empty');
      }

      if (!dto.userId) {
        throw new BadRequestException('User ID is required');
      }

      const executionId = `devbrand-${Date.now()}`;

      // Create async generator for streaming
      const stream = this.devBrandWorkflow.executeWithStreaming({
        userId: dto.userId,
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
        subscriber.error(
          new HttpException(
            `Stream not found for ${executionId}. Make sure to call POST /api/devbrand/execute first.`,
            HttpStatus.NOT_FOUND
          )
        );
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

            // Check if workflow completed
            if (
              event.state?.status === 'completed' ||
              event.state?.metadata?.workflowCompleted
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
}
