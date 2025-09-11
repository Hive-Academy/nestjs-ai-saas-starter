import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { DevBrandSupervisorWorkflow } from '../workflows/devbrand-supervisor.workflow';
import { PersonalBrandMemoryService } from '../services/personal-brand-memory.service';
import {
  DevBrandStreamRequestDto,
  AgentStatusUpdateDto,
  MemoryUpdateDto,
  WorkflowProgressDto,
} from '../dto/devbrand-websocket.dto';

/**
 * DevBrand WebSocket Gateway - Real-time Communication Hub
 *
 * Provides real-time streaming for all 5 Revolutionary Frontend Interface Modes:
 * 1. Agent Constellation 3D - Agent switching and coordination events
 * 2. Workflow Canvas D3 - Live workflow execution visualization
 * 3. Memory Constellation - Memory retrieval and context updates
 * 4. Content Forge - Real-time content creation progress
 * 5. Enhanced Chat - Live conversation streaming
 *
 * Integration Features:
 * - Multi-agent workflow streaming via DevBrandSupervisorWorkflow
 * - Agent state broadcasting for 3D visualizations
 * - Memory context streaming for constellation interfaces
 * - Workflow progress updates for canvas visualization
 * - Real-time error handling and connection management
 */
@Injectable()
@WebSocketGateway({
  namespace: '/devbrand',
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class DevBrandWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DevBrandWebSocketGateway.name);
  private readonly connectedClients = new Map<
    string,
    {
      socket: Socket;
      userId?: string;
      sessionId?: string;
      subscribedRooms: Set<string>;
    }
  >();

  constructor(
    private readonly devBrandWorkflow: DevBrandSupervisorWorkflow,
    private readonly brandMemoryService: PersonalBrandMemoryService
  ) {}

  afterInit(server: Server): void {
    this.logger.log('DevBrand WebSocket Gateway initialized');

    // Set up periodic agent status broadcasting for real-time monitoring
    setInterval(async () => {
      try {
        const agentStatus = await this.devBrandWorkflow.getWorkflowStatus();
        this.server.emit('agent-status-update', {
          type: 'periodic_update',
          data: agentStatus,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.logger.warn('Failed to broadcast periodic agent status:', error);
      }
    }, 10000); // Every 10 seconds
  }

  async handleConnection(client: Socket): Promise<void> {
    const clientId = client.id;
    const userId = client.handshake.query.userId as string;
    const sessionId = client.handshake.query.sessionId as string;

    this.logger.log(
      `Client connected: ${clientId} (User: ${userId}, Session: ${sessionId})`
    );

    // Store client information
    this.connectedClients.set(clientId, {
      socket: client,
      userId,
      sessionId,
      subscribedRooms: new Set(),
    });

    // Send initial connection confirmation
    client.emit('connection-established', {
      clientId,
      timestamp: new Date().toISOString(),
      availableRooms: [
        'agent-constellation',
        'workflow-canvas',
        'memory-constellation',
        'content-forge',
        'enhanced-chat',
      ],
    });

    // Send initial agent status
    try {
      const agentStatus = await this.devBrandWorkflow.getWorkflowStatus();
      client.emit('agent-status-update', {
        type: 'initial_status',
        data: agentStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send initial agent status to ${clientId}:`,
        error
      );
    }

    // Send initial memory context if userId provided
    if (userId) {
      try {
        const memoryContext = await this.brandMemoryService.searchBrandMemories(
          userId,
          'recent context',
          { limit: 5, includeAnalytics: true }
        );
        client.emit('memory-context-update', {
          type: 'initial_context',
          data: memoryContext,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.logger.warn(
          `Failed to send initial memory context to ${clientId}:`,
          error
        );
      }
    }
  }

  handleDisconnect(client: Socket): void {
    const clientId = client.id;
    const clientInfo = this.connectedClients.get(clientId);

    if (clientInfo) {
      // Leave all subscribed rooms
      clientInfo.subscribedRooms.forEach((room) => {
        client.leave(room);
      });

      this.connectedClients.delete(clientId);
      this.logger.log(
        `Client disconnected: ${clientId} (User: ${clientInfo.userId})`
      );
    }
  }

  /**
   * Subscribe to specific interface mode room for targeted updates
   * Supports: agent-constellation, workflow-canvas, memory-constellation, content-forge, enhanced-chat
   */
  @SubscribeMessage('subscribe-to-room')
  async handleRoomSubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; userId?: string }
  ): Promise<void> {
    const clientId = client.id;
    const clientInfo = this.connectedClients.get(clientId);

    if (!clientInfo) {
      client.emit('error', { message: 'Client not found' });
      return;
    }

    const { room, userId } = data;
    const validRooms = [
      'agent-constellation',
      'workflow-canvas',
      'memory-constellation',
      'content-forge',
      'enhanced-chat',
    ];

    if (!validRooms.includes(room)) {
      client.emit('error', { message: `Invalid room: ${room}` });
      return;
    }

    // Join the room
    await client.join(room);
    clientInfo.subscribedRooms.add(room);

    this.logger.log(`Client ${clientId} subscribed to room: ${room}`);

    // Send room-specific initial data
    await this.sendRoomSpecificData(client, room, userId);

    client.emit('room-subscription-confirmed', {
      room,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Start streaming DevBrand workflow execution
   * Provides real-time updates for all interface modes
   */
  @SubscribeMessage('start-workflow-stream')
  async handleWorkflowStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: DevBrandStreamRequestDto
  ): Promise<void> {
    const clientId = client.id;
    const clientInfo = this.connectedClients.get(clientId);

    if (!clientInfo) {
      client.emit('error', { message: 'Client not found' });
      return;
    }

    this.logger.log(`Starting workflow stream for client: ${clientId}`);

    try {
      // Notify workflow start
      client.emit('workflow-started', {
        message: request.message,
        options: request.options,
        timestamp: new Date().toISOString(),
      });

      // Start streaming workflow execution
      const streamGenerator = this.devBrandWorkflow.streamDevBrandWorkflow(
        request.message,
        {
          ...request.options,
          streamMode: 'values',
        }
      );

      let stepCount = 0;
      for await (const step of streamGenerator) {
        stepCount++;

        // Enhanced step data for frontend consumption
        const streamData = {
          stepNumber: stepCount,
          currentAgent: step.current,
          agentCapabilities: this.getAgentCapabilities(step.current),
          messages: step.messages?.map((msg) => ({
            content: msg.content,
            type: msg._getType(),
            timestamp: new Date().toISOString(),
          })),
          metadata: step.metadata,
          timestamp: new Date().toISOString(),
        };

        // Send to specific rooms based on content
        await this.broadcastToRooms(client, streamData, step);

        // Always send general workflow progress
        client.emit('workflow-progress', streamData);

        // Brief delay to prevent overwhelming the client
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      client.emit('workflow-completed', {
        stepCount,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Workflow stream completed for client ${clientId} with ${stepCount} steps`
      );
    } catch (error) {
      this.logger.error(
        `Workflow streaming failed for client ${clientId}:`,
        error
      );
      client.emit('workflow-error', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Request agent status update
   */
  @SubscribeMessage('get-agent-status')
  async handleAgentStatusRequest(
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    try {
      const agentStatus = await this.devBrandWorkflow.getWorkflowStatus();
      client.emit('agent-status-update', {
        type: 'requested_update',
        data: agentStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to get agent status:', error);
      client.emit('error', { message: 'Failed to retrieve agent status' });
    }
  }

  /**
   * Request memory context update
   */
  @SubscribeMessage('get-memory-context')
  async handleMemoryContextRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; query?: string; limit?: number }
  ): Promise<void> {
    try {
      const memoryResults = await this.brandMemoryService.searchBrandMemories(
        data.userId,
        data.query || 'recent context',
        {
          limit: data.limit || 10,
          includeAnalytics: true,
        }
      );

      client.emit('memory-context-update', {
        type: 'requested_update',
        data: memoryResults,
        query: data.query,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to get memory context:', error);
      client.emit('error', { message: 'Failed to retrieve memory context' });
    }
  }

  /**
   * Send room-specific initial data
   */
  private async sendRoomSpecificData(
    client: Socket,
    room: string,
    userId?: string
  ): Promise<void> {
    try {
      switch (room) {
        case 'agent-constellation': {
          const agentStatus = await this.devBrandWorkflow.getWorkflowStatus();
          client.emit('agent-constellation-data', {
            agents: agentStatus.agents,
            networkStats: agentStatus.networkStats,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        case 'memory-constellation':
          if (userId) {
            const brandAnalytics =
              await this.brandMemoryService.getBrandAnalytics(userId);
            client.emit('memory-constellation-data', {
              analytics: brandAnalytics,
              timestamp: new Date().toISOString(),
            });
          }
          break;

        case 'workflow-canvas':
          client.emit('workflow-canvas-data', {
            availableWorkflows: ['devbrand-supervisor'],
            currentNetwork: await this.devBrandWorkflow.getWorkflowStatus(),
            timestamp: new Date().toISOString(),
          });
          break;

        default:
          // Other rooms get general status
          break;
      }
    } catch (error) {
      this.logger.warn(`Failed to send room-specific data for ${room}:`, error);
    }
  }

  /**
   * Broadcast workflow updates to appropriate rooms
   */
  private async broadcastToRooms(
    client: Socket,
    streamData: any,
    step: any
  ): Promise<void> {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) return;

    // Agent Constellation 3D - Agent switching events
    if (clientInfo.subscribedRooms.has('agent-constellation')) {
      this.server.to('agent-constellation').emit('agent-switch', {
        fromAgent: step.previous || null,
        toAgent: step.current,
        capabilities: this.getAgentCapabilities(step.current),
        timestamp: new Date().toISOString(),
      });
    }

    // Workflow Canvas D3 - Workflow execution visualization
    if (clientInfo.subscribedRooms.has('workflow-canvas')) {
      this.server.to('workflow-canvas').emit('workflow-node-update', {
        nodeId: step.current,
        status: 'active',
        data: streamData,
        timestamp: new Date().toISOString(),
      });
    }

    // Memory Constellation - Memory retrieval events
    if (
      clientInfo.subscribedRooms.has('memory-constellation') &&
      step.metadata?.memoryAccess
    ) {
      this.server.to('memory-constellation').emit('memory-access', {
        memoryType: step.metadata.memoryAccess.type,
        query: step.metadata.memoryAccess.query,
        results: step.metadata.memoryAccess.results,
        timestamp: new Date().toISOString(),
      });
    }

    // Content Forge - Content creation progress
    if (
      clientInfo.subscribedRooms.has('content-forge') &&
      step.current === 'content-creator'
    ) {
      this.server.to('content-forge').emit('content-generation-progress', {
        stage: step.metadata?.contentStage || 'processing',
        platform: step.metadata?.platform,
        preview: step.metadata?.contentPreview,
        timestamp: new Date().toISOString(),
      });
    }

    // Enhanced Chat - Live conversation updates
    if (clientInfo.subscribedRooms.has('enhanced-chat')) {
      this.server.to('enhanced-chat').emit('chat-update', {
        agent: step.current,
        message: step.messages?.[step.messages.length - 1]?.content,
        thinking: step.metadata?.thinking,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get agent capabilities for frontend display
   */
  private getAgentCapabilities(agentId?: string): string[] {
    switch (agentId) {
      case 'github-analyzer':
        return [
          'repository_analysis',
          'skill_extraction',
          'contribution_analysis',
        ];
      case 'content-creator':
        return [
          'content_generation',
          'platform_optimization',
          'narrative_creation',
        ];
      case 'brand-strategist':
        return [
          'strategic_planning',
          'brand_positioning',
          'workflow_coordination',
        ];
      default:
        return ['multi_agent_coordination'];
    }
  }

  /**
   * Broadcast system-wide updates (used by external services)
   */
  public broadcastAgentUpdate(update: AgentStatusUpdateDto): void {
    this.server.emit('agent-status-update', {
      type: 'system_update',
      data: update,
      timestamp: new Date().toISOString(),
    });
  }

  public broadcastMemoryUpdate(userId: string, update: MemoryUpdateDto): void {
    this.server.emit('memory-context-update', {
      type: 'system_update',
      userId,
      data: update,
      timestamp: new Date().toISOString(),
    });
  }

  public broadcastWorkflowProgress(progress: WorkflowProgressDto): void {
    this.server.emit('workflow-progress', {
      type: 'system_update',
      data: progress,
      timestamp: new Date().toISOString(),
    });
  }
}
