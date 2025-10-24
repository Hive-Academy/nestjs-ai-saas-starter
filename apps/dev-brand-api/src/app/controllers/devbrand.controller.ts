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
import { WorkflowStreamingOrchestrator } from '@hive-academy/langgraph-streaming';

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
 * │ 2. WorkflowStreamingOrchestrator.startWorkflowWithStreaming()    │
 * │ 3. Workflow.executeWithStreaming() → LangGraph.stream()          │
 * │ 4. Events auto-emit via EventEmitter2:                           │
 * │    - workflow.stream.${executionId}                              │
 * │    - workflow.token.${executionId}                               │
 * │    - workflow.progress.${executionId}                            │
 * │ 5. WebSocketBridgeService listens via @OnEvent decorators        │
 * │ 6. StreamingWebSocketService broadcasts to subscribed clients    │
 * │ 7. Clients receive events on ws://localhost:8080/streaming       │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * NO manual SSE transformation! NO custom event mapping!
 * NO duplicate infrastructure! Everything is already built.
 *
 * Key Services (Already Running):
 * - WorkflowStreamingOrchestrator: Consumer facade for workflow lifecycle (streaming module)
 * - StreamingWebSocketService: Port 8080, Socket.io server
 * - WebSocketBridgeService: Event routing with @OnEvent('workflow.stream.*')
 * - WorkflowStreamService: Low-level streaming implementation (workflow-engine)
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

  constructor(
    private readonly devBrandWorkflow: DevBrandSupervisorWorkflow,
    private readonly streamingOrchestrator: WorkflowStreamingOrchestrator
  ) {}

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

    // Use WorkflowStreamingOrchestrator for one-liner workflow execution + streaming
    // This replaces the manual startWorkflowInBackground() method
    const workflowInfo =
      await this.streamingOrchestrator.startWorkflowWithStreaming({
        workflow: this.devBrandWorkflow,
        input: {
          userId,
          githubUsername: dto.githubUsername,
          executionId,
        },
        executionId,
      });

    // Return enriched response with additional instructions
    return {
      executionId: workflowInfo.executionId,
      status: workflowInfo.status,
      message: workflowInfo.message,
      websocketUrl: workflowInfo.websocketUrl,
      websocketInstructions: {
        connect:
          'io("ws://localhost:8080/streaming", { transports: ["websocket", "polling"] })',
        subscribe: `socket.emit("${
          workflowInfo.subscriptionInfo.event
        }", ${JSON.stringify(workflowInfo.subscriptionInfo.payload)})`,
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

  // ✨ REMOVED: startWorkflowInBackground() method
  // Now handled automatically by WorkflowStreamingOrchestrator
  // Benefits:
  // - No manual async generator iteration
  // - No manual error handling
  // - No boilerplate code in controllers
  // - Reusable across all workflow endpoints
}
