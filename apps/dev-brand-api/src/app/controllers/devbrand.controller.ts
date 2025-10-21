import {
  Controller,
  Post,
  Body,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { DevBrandSupervisorWorkflow } from '../business-workflows/workflows/devbrand-supervisor.workflow';

/**
 * DevBrand Workflow Controller - Simplified Architecture
 *
 * This controller exposes a single endpoint to start the DevBrand workflow.
 * All streaming, progress updates, HITL interruptions, and token streaming
 * are handled AUTOMATICALLY by the existing infrastructure:
 *
 * Architecture Flow:
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ 1. POST /devbrand/execute → Returns executionId immediately      │
 * │ 2. Workflow starts in background → executeWithStreaming()        │
 * │ 3. WorkflowStreamService emits events via EventEmitter2:         │
 * │    - workflow.stream.${executionId}                              │
 * │    - workflow.token.${executionId}                               │
 * │    - workflow.progress.${executionId}                            │
 * │ 4. WebSocketBridgeService listens via @OnEvent decorators        │
 * │ 5. StreamingWebSocketService broadcasts to subscribed clients    │
 * │ 6. Clients receive events on ws://localhost:8080/streaming       │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * NO manual SSE transformation! NO custom event mapping!
 * NO duplicate infrastructure! Everything is already built.
 *
 * Key Services (Already Running):
 * - StreamingWebSocketService: Port 8080, Socket.io server
 * - WebSocketBridgeService: Event routing with @OnEvent('workflow.stream.*')
 * - WorkflowStreamService: Embedded in workflow-engine, emits EventEmitter2 events
 * - TokenStreamingService: Character-by-character LLM streaming
 * - HumanApprovalService: HITL interruptions with Neo4j storage
 *
 * See: libs/langgraph-modules/streaming/CLAUDE.md for full architecture
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
      'Workflow started successfully. Connect to WebSocket to receive real-time updates.',
  })
  message!: string;

  @ApiProperty({
    description: 'WebSocket URL for real-time updates',
    example: 'ws://localhost:8080/streaming',
  })
  websocketUrl!: string;

  @ApiProperty({
    description: 'WebSocket integration instructions',
    example: {
      connect: 'io("ws://localhost:8080/streaming")',
      subscribe:
        'socket.emit("subscribe_execution", { executionId: "devbrand-123" })',
      events: [
        'stream_update - Workflow events',
        'token_update - LLM token streaming',
        'interruption_request - HITL requests',
      ],
    },
  })
  websocketInstructions!: {
    connect: string;
    subscribe: string;
    events: string[];
  };
}

@ApiTags('DevBrand Workflow')
@Controller('devbrand')
export class DevBrandController {
  private readonly logger = new Logger(DevBrandController.name);

  constructor(private readonly devBrandWorkflow: DevBrandSupervisorWorkflow) {}

  /**
   * Start DevBrand Workflow
   *
   * Starts the DevBrand personal branding workflow for a GitHub user.
   * Returns executionId immediately for WebSocket subscription.
   *
   * The workflow includes:
   * 1. GitHubCodeAnalyzerAgent - Analyzes repositories, extracts achievements
   * 2. PersonalBrandStrategistAgent - Develops brand strategy and positioning
   * 3. ContentCreatorAgent - Generates platform-specific content (LinkedIn, Dev.to)
   *
   * All agents have @StreamToken and @StreamProgress decorators enabled.
   * HITL interruptions are configured via @MultiAgent decorator metadata.
   *
   * Real-time Updates:
   * - Connect to: ws://localhost:8080/streaming
   * - Subscribe with: socket.emit('subscribe_execution', { executionId })
   * - Receive events: stream_update, token_update, interruption_request, etc.
   *
   * @param dto ExecuteDevBrandDto with githubUsername and optional userId
   * @returns ExecuteDevBrandResponseDto with executionId and WebSocket instructions
   */
  @Post('execute')
  @ApiOperation({
    summary: 'Start DevBrand workflow',
    description: `
      Starts the DevBrand personal branding workflow for a GitHub user.
      Returns executionId immediately. Use the executionId to subscribe to
      real-time updates via WebSocket (ws://localhost:8080/streaming).

      Workflow includes:
      - GitHub code analysis (repositories, technologies, achievements)
      - Personal brand strategy development (positioning, target audience)
      - Multi-platform content creation (LinkedIn, Dev.to)

      All streaming, progress updates, and HITL interruptions are automatically
      broadcast via the existing WebSocket infrastructure. No polling required.
    `,
  })
  @ApiResponse({
    status: 201,
    type: ExecuteDevBrandResponseDto,
    description:
      'Workflow started successfully. Use executionId to subscribe via WebSocket.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request (missing githubUsername)',
  })
  async executeDevBrand(
    @Body() dto: ExecuteDevBrandDto
  ): Promise<ExecuteDevBrandResponseDto> {
    if (!dto.githubUsername) {
      throw new BadRequestException('githubUsername is required');
    }

    const executionId = `devbrand-${Date.now()}`;
    const userId = dto.userId || 'anonymous';

    this.logger.log(
      `🚀 Starting DevBrand workflow for GitHub user: ${dto.githubUsername} (executionId: ${executionId})`
    );

    // Start workflow in background (non-blocking)
    // The executeWithStreaming() method returns an async iterator
    // Events are automatically emitted via:
    //   WorkflowStreamService → EventEmitter2 → WebSocketBridgeService → StreamingWebSocketService
    this.startWorkflowInBackground(executionId, userId, dto.githubUsername);

    // Return immediately with WebSocket subscription instructions
    return {
      executionId,
      status: 'started',
      message:
        'Workflow started successfully. Connect to WebSocket to receive real-time updates.',
      websocketUrl: 'ws://localhost:8080/streaming',
      websocketInstructions: {
        connect:
          'io("ws://localhost:8080/streaming", { transports: ["websocket", "polling"] })',
        subscribe: `socket.emit("subscribe_execution", { executionId: "${executionId}" })`,
        events: [
          'stream_update - Workflow state changes (agent started, completed, routing)',
          'token_update - Real-time LLM token streaming (character-by-character)',
          'interruption_request - HITL approval requests from agents',
          'interruption_resolved - HITL responses processed, workflow continuing',
          'error - Workflow errors and failures',
        ],
      },
    };
  }

  /**
   * Start workflow execution in background
   *
   * Consumes the async iterator from executeWithStreaming().
   * All events are automatically broadcast by the streaming infrastructure:
   * - WorkflowStreamService emits via EventEmitter2
   * - WebSocketBridgeService listens with @OnEvent decorators
   * - StreamingWebSocketService broadcasts to subscribed WebSocket clients
   *
   * No manual event transformation needed!
   */
  private async startWorkflowInBackground(
    executionId: string,
    userId: string,
    githubUsername: string
  ): Promise<void> {
    try {
      // Get the streaming iterator from workflow
      // This returns AsyncIterableIterator<any> with workflow events
      const stream = this.devBrandWorkflow.executeWithStreaming({
        userId,
        githubUsername,
        executionId,
      });

      // Consume the stream
      // Events are automatically emitted by WorkflowStreamService via EventEmitter2
      // WebSocketBridgeService listens via @OnEvent('workflow.stream.*', 'workflow.token.*', etc.)
      // StreamingWebSocketService broadcasts to all clients subscribed to this executionId
      for await (const event of stream) {
        // Just consume - events are automatically broadcast
        // WorkflowStreamService emits:
        //   - workflow.stream.${executionId} (line 358)
        //   - workflow.token.${executionId} (line 454, 553, 634)
        //   - workflow.progress.${executionId} (line 676)
        //   - workflow.milestone.${executionId} (line 694)
        this.logger.debug(
          `Event processed for ${executionId}: ${event?.type || 'unknown'}`
        );
      }

      this.logger.log(`✅ DevBrand workflow completed: ${executionId}`);
    } catch (error) {
      this.logger.error(
        `❌ DevBrand workflow failed: ${executionId}`,
        error instanceof Error ? error.stack : error
      );

      // Error events are also automatically broadcast via streaming infrastructure
      // WebSocketBridgeService will emit error updates to subscribed clients
    }
  }
}
