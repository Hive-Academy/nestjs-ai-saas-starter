import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Server, Socket } from 'socket.io';
import { DevBrandWebSocketGateway } from './devbrand-websocket.gateway';
import { DevBrandSupervisorWorkflow } from '../workflows/devbrand-supervisor.workflow';
import { PersonalBrandMemoryService } from '../services/personal-brand-memory.service';
import type {
  DevBrandStreamRequestDto,
  AgentStatusUpdateDto,
  MemoryUpdateDto,
  WorkflowProgressDto,
} from '../dto/devbrand-websocket.dto';

/**
 * DevBrand WebSocket Gateway Test Suite
 *
 * Tests real-time communication capabilities that power all 5 Revolutionary Frontend Interface Modes:
 * 1. Agent Constellation 3D - Agent switching and coordination events
 * 2. Workflow Canvas D3 - Live workflow execution visualization
 * 3. Memory Constellation - Memory retrieval and context updates
 * 4. Content Forge - Real-time content creation progress
 * 5. Enhanced Chat - Live conversation streaming
 *
 * User Requirement Validation:
 * - Verify WebSocket integration supports real-time agent coordination
 * - Test streaming capabilities for sophisticated frontend visualization
 * - Validate data streams required for 5 interface modes
 * - Ensure real-time system health monitoring and error handling
 */
describe('DevBrandWebSocketGateway - Real-time Interface Mode Support', () => {
  let gateway: DevBrandWebSocketGateway;
  let mockWorkflow: jest.Mocked<DevBrandSupervisorWorkflow>;
  let mockMemoryService: jest.Mocked<PersonalBrandMemoryService>;
  let mockServer: jest.Mocked<Server>;
  let mockClient: jest.Mocked<Socket>;

  // Mock data for sophisticated real-time streaming
  const mockAgentStatus = {
    networkId: 'devbrand-network-789',
    agents: [
      {
        id: 'github-analyzer',
        name: 'GitHub Analyzer',
        healthy: true,
        capabilities: [
          'repository_analysis',
          'skill_extraction',
          'contribution_analysis',
        ],
      },
      {
        id: 'content-creator',
        name: 'Content Creator',
        healthy: true,
        capabilities: [
          'content_generation',
          'platform_optimization',
          'narrative_creation',
        ],
      },
      {
        id: 'brand-strategist',
        name: 'Brand Strategist',
        healthy: true,
        capabilities: [
          'strategic_planning',
          'brand_positioning',
          'workflow_coordination',
        ],
      },
    ],
    networkStats: {
      totalExecutions: 287,
      averageExecutionTime: 1180,
      successRate: 0.98,
    },
    systemStatus: {
      healthy: true,
      uptime: '12d 8h 45m',
      memoryUsage: '312MB',
    },
  };

  const mockMemoryResults = [
    {
      id: 'memory-123',
      type: 'github_analysis',
      content: 'Advanced TypeScript patterns analysis from 20+ repositories',
      score: 0.94,
      metadata: {
        repositories: 20,
        languages: ['TypeScript', 'React', 'Node.js'],
        expertise_level: 'expert',
      },
    },
    {
      id: 'memory-456',
      type: 'content_performance',
      content: 'LinkedIn article about microservices achieved 300+ engagements',
      score: 0.89,
      metadata: {
        platform: 'linkedin',
        engagement: 300,
        content_type: 'technical_article',
      },
    },
  ];

  const mockBrandAnalytics = {
    totalMemories: 78,
    contentMetrics: {
      linkedin_posts: 25,
      twitter_threads: 18,
      blog_articles: 12,
      avg_engagement: 180,
    },
    skillProgress: {
      typescript: 0.95,
      react: 0.92,
      microservices: 0.88,
      ai_tooling: 0.82,
    },
    brandEvolution: {
      positioning: 'Senior Developer & Technical Architect',
      growth_trend: 'accelerating',
      market_penetration: 0.45,
    },
  };

  // Mock streaming workflow steps for real-time testing
  const mockStreamSteps = [
    {
      current: 'brand-strategist',
      previous: undefined,
      messages: [
        {
          content: 'Analyzing request for optimal agent routing...',
          _getType: () => 'ai',
        },
      ],
      metadata: {
        thinking:
          'Determining whether GitHub analysis or content creation is primary need',
      },
    },
    {
      current: 'github-analyzer',
      previous: 'brand-strategist',
      messages: [
        {
          content:
            'Analyzing GitHub repositories for technical achievements...',
          _getType: () => 'ai',
        },
      ],
      metadata: {
        repositories_found: 15,
        analysis_stage: 'code_pattern_analysis',
      },
    },
    {
      current: 'content-creator',
      previous: 'github-analyzer',
      messages: [
        {
          content:
            'Generating compelling LinkedIn content from technical insights...',
          _getType: () => 'ai',
        },
      ],
      metadata: {
        contentStage: 'draft_generation',
        platform: 'linkedin',
        contentPreview:
          'Diving deep into TypeScript patterns that transformed...',
      },
    },
  ];

  beforeEach(async () => {
    const mockWorkflowProvider = {
      provide: DevBrandSupervisorWorkflow,
      useValue: {
        getWorkflowStatus: jest.fn(),
        streamDevBrandWorkflow: jest.fn(),
      },
    };

    const mockMemoryProvider = {
      provide: PersonalBrandMemoryService,
      useValue: {
        searchBrandMemories: jest.fn(),
        getBrandAnalytics: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevBrandWebSocketGateway,
        mockWorkflowProvider,
        mockMemoryProvider,
      ],
    }).compile();

    gateway = module.get<DevBrandWebSocketGateway>(DevBrandWebSocketGateway);
    mockWorkflow = module.get(DevBrandSupervisorWorkflow);
    mockMemoryService = module.get(PersonalBrandMemoryService);

    // Mock Socket.IO server and client
    mockServer = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    } as any;

    mockClient = {
      id: 'client-test-123',
      handshake: {
        query: {
          userId: 'user456',
          sessionId: 'session789',
        },
      },
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    } as any;

    // Assign mock server to gateway
    gateway.server = mockServer;

    // Setup default mock implementations
    mockWorkflow.getWorkflowStatus.mockResolvedValue(mockAgentStatus);
    mockMemoryService.searchBrandMemories.mockResolvedValue(mockMemoryResults);
    mockMemoryService.getBrandAnalytics.mockResolvedValue(mockBrandAnalytics);
  });

  describe('Gateway Initialization & Connection Management', () => {
    it('should initialize with periodic agent status broadcasting', async () => {
      // Test afterInit method
      gateway.afterInit(mockServer);

      expect(mockWorkflow.getWorkflowStatus).toHaveBeenCalled();

      // Wait for periodic broadcast (mocked timing)
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should handle client connection with comprehensive initialization', async () => {
      await gateway.handleConnection(mockClient);

      // Should send connection confirmation
      expect(mockClient.emit).toHaveBeenCalledWith('connection-established', {
        clientId: 'client-test-123',
        timestamp: expect.any(String),
        availableRooms: [
          'agent-constellation',
          'workflow-canvas',
          'memory-constellation',
          'content-forge',
          'enhanced-chat',
        ],
      });

      // Should send initial agent status
      expect(mockClient.emit).toHaveBeenCalledWith('agent-status-update', {
        type: 'initial_status',
        data: mockAgentStatus,
        timestamp: expect.any(String),
      });

      // Should send initial memory context for user
      expect(mockClient.emit).toHaveBeenCalledWith('memory-context-update', {
        type: 'initial_context',
        data: mockMemoryResults,
        timestamp: expect.any(String),
      });

      expect(mockMemoryService.searchBrandMemories).toHaveBeenCalledWith(
        'user456',
        'recent context',
        { limit: 5, includeAnalytics: true }
      );
    });

    it('should handle client disconnection with proper cleanup', () => {
      // Simulate client info being stored
      (gateway as any).connectedClients.set('client-test-123', {
        socket: mockClient,
        userId: 'user456',
        sessionId: 'session789',
        subscribedRooms: new Set(['agent-constellation', 'enhanced-chat']),
      });

      gateway.handleDisconnect(mockClient);

      // Should leave subscribed rooms
      expect(mockClient.leave).toHaveBeenCalledWith('agent-constellation');
      expect(mockClient.leave).toHaveBeenCalledWith('enhanced-chat');

      // Client should be removed from connected clients map
      expect((gateway as any).connectedClients.has('client-test-123')).toBe(
        false
      );
    });
  });

  describe('Room Subscription - 5 Interface Mode Support', () => {
    beforeEach(() => {
      // Setup client as connected
      (gateway as any).connectedClients.set('client-test-123', {
        socket: mockClient,
        userId: 'user456',
        sessionId: 'session789',
        subscribedRooms: new Set(),
      });
    });

    it('should handle agent-constellation room subscription', async () => {
      await gateway.handleRoomSubscription(mockClient, {
        room: 'agent-constellation',
        userId: 'user456',
      });

      expect(mockClient.join).toHaveBeenCalledWith('agent-constellation');
      expect(mockClient.emit).toHaveBeenCalledWith(
        'room-subscription-confirmed',
        {
          room: 'agent-constellation',
          timestamp: expect.any(String),
        }
      );

      // Should send agent constellation data
      expect(mockClient.emit).toHaveBeenCalledWith('agent-constellation-data', {
        agents: mockAgentStatus.agents,
        networkStats: mockAgentStatus.networkStats,
        timestamp: expect.any(String),
      });
    });

    it('should handle memory-constellation room subscription', async () => {
      await gateway.handleRoomSubscription(mockClient, {
        room: 'memory-constellation',
        userId: 'user456',
      });

      expect(mockClient.join).toHaveBeenCalledWith('memory-constellation');
      expect(mockClient.emit).toHaveBeenCalledWith(
        'memory-constellation-data',
        {
          analytics: mockBrandAnalytics,
          timestamp: expect.any(String),
        }
      );

      expect(mockMemoryService.getBrandAnalytics).toHaveBeenCalledWith(
        'user456'
      );
    });

    it('should handle workflow-canvas room subscription', async () => {
      await gateway.handleRoomSubscription(mockClient, {
        room: 'workflow-canvas',
        userId: 'user456',
      });

      expect(mockClient.join).toHaveBeenCalledWith('workflow-canvas');
      expect(mockClient.emit).toHaveBeenCalledWith('workflow-canvas-data', {
        availableWorkflows: ['devbrand-supervisor'],
        currentNetwork: mockAgentStatus,
        timestamp: expect.any(String),
      });
    });

    it('should reject invalid room subscriptions', async () => {
      await gateway.handleRoomSubscription(mockClient, {
        room: 'invalid-room',
      });

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid room: invalid-room',
      });
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('should handle subscription for all 5 revolutionary interface modes', async () => {
      const validRooms = [
        'agent-constellation',
        'workflow-canvas',
        'memory-constellation',
        'content-forge',
        'enhanced-chat',
      ];

      for (const room of validRooms) {
        await gateway.handleRoomSubscription(mockClient, {
          room,
          userId: 'user456',
        });
        expect(mockClient.join).toHaveBeenCalledWith(room);
      }
    });
  });

  describe('Real-time Workflow Streaming - Core Showcase Feature', () => {
    beforeEach(() => {
      // Setup client as connected with subscriptions
      (gateway as any).connectedClients.set('client-test-123', {
        socket: mockClient,
        userId: 'user456',
        sessionId: 'session789',
        subscribedRooms: new Set([
          'agent-constellation',
          'workflow-canvas',
          'memory-constellation',
          'content-forge',
          'enhanced-chat',
        ]),
      });

      // Mock async generator for streaming
      mockWorkflow.streamDevBrandWorkflow.mockImplementation(
        async function* () {
          for (const step of mockStreamSteps) {
            yield step;
          }
        }
      );
    });

    it('should stream sophisticated workflow execution with real-time updates', async () => {
      const streamRequest: DevBrandStreamRequestDto = {
        message: 'Create compelling content about my TypeScript expertise',
        options: {
          githubUsername: 'testuser',
          analysisDepth: 'comprehensive',
          contentPlatforms: ['linkedin', 'twitter'],
        },
      };

      await gateway.handleWorkflowStream(mockClient, streamRequest);

      // Should notify workflow start
      expect(mockClient.emit).toHaveBeenCalledWith('workflow-started', {
        message: streamRequest.message,
        options: streamRequest.options,
        timestamp: expect.any(String),
      });

      // Should emit progress updates for each step
      expect(mockClient.emit).toHaveBeenCalledWith(
        'workflow-progress',
        expect.objectContaining({
          stepNumber: expect.any(Number),
          currentAgent: expect.any(String),
          agentCapabilities: expect.any(Array),
          timestamp: expect.any(String),
        })
      );

      // Should notify workflow completion
      expect(mockClient.emit).toHaveBeenCalledWith('workflow-completed', {
        stepCount: mockStreamSteps.length,
        timestamp: expect.any(String),
      });

      expect(mockWorkflow.streamDevBrandWorkflow).toHaveBeenCalledWith(
        streamRequest.message,
        {
          ...streamRequest.options,
          streamMode: 'values',
        }
      );
    });

    it('should broadcast room-specific events for 5 interface modes', async () => {
      const streamRequest: DevBrandStreamRequestDto = {
        message: 'Test streaming for interface modes',
        options: {},
      };

      await gateway.handleWorkflowStream(mockClient, streamRequest);

      // Agent Constellation 3D - Agent switching events
      expect(mockServer.to).toHaveBeenCalledWith('agent-constellation');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'agent-switch',
        expect.objectContaining({
          fromAgent: expect.any(String),
          toAgent: expect.any(String),
          capabilities: expect.any(Array),
          timestamp: expect.any(String),
        })
      );

      // Workflow Canvas D3 - Workflow node updates
      expect(mockServer.to).toHaveBeenCalledWith('workflow-canvas');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'workflow-node-update',
        expect.objectContaining({
          nodeId: expect.any(String),
          status: 'active',
          timestamp: expect.any(String),
        })
      );

      // Content Forge - Content creation progress
      expect(mockServer.to).toHaveBeenCalledWith('content-forge');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'content-generation-progress',
        expect.objectContaining({
          stage: 'draft_generation',
          platform: 'linkedin',
          preview: expect.any(String),
          timestamp: expect.any(String),
        })
      );

      // Enhanced Chat - Live conversation updates
      expect(mockServer.to).toHaveBeenCalledWith('enhanced-chat');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'chat-update',
        expect.objectContaining({
          agent: expect.any(String),
          message: expect.any(String),
          timestamp: expect.any(String),
        })
      );
    });

    it('should handle workflow streaming errors gracefully', async () => {
      mockWorkflow.streamDevBrandWorkflow.mockImplementation(
        async function* () {
          // Need to yield at least once to satisfy generator requirements
          yield;
          throw new Error('Workflow execution failed');
        }
      );

      const streamRequest: DevBrandStreamRequestDto = {
        message: 'Test error handling',
        options: {},
      };

      await gateway.handleWorkflowStream(mockClient, streamRequest);

      expect(mockClient.emit).toHaveBeenCalledWith('workflow-error', {
        error: 'Workflow execution failed',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Agent Status & Memory Context Requests', () => {
    it('should handle agent status requests with comprehensive data', async () => {
      await gateway.handleAgentStatusRequest(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('agent-status-update', {
        type: 'requested_update',
        data: mockAgentStatus,
        timestamp: expect.any(String),
      });

      expect(mockWorkflow.getWorkflowStatus).toHaveBeenCalled();
    });

    it('should handle memory context requests with hybrid intelligence', async () => {
      await gateway.handleMemoryContextRequest(mockClient, {
        userId: 'user456',
        query: 'TypeScript patterns',
        limit: 15,
      });

      expect(mockClient.emit).toHaveBeenCalledWith('memory-context-update', {
        type: 'requested_update',
        data: mockMemoryResults,
        query: 'TypeScript patterns',
        timestamp: expect.any(String),
      });

      expect(mockMemoryService.searchBrandMemories).toHaveBeenCalledWith(
        'user456',
        'TypeScript patterns',
        { limit: 15, includeAnalytics: true }
      );
    });

    it('should use default memory query when none provided', async () => {
      await gateway.handleMemoryContextRequest(mockClient, {
        userId: 'user456',
      });

      expect(mockMemoryService.searchBrandMemories).toHaveBeenCalledWith(
        'user456',
        'recent context',
        { limit: 10, includeAnalytics: true }
      );
    });

    it('should handle service errors with appropriate error messages', async () => {
      mockWorkflow.getWorkflowStatus.mockRejectedValue(
        new Error('Service unavailable')
      );

      await gateway.handleAgentStatusRequest(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to retrieve agent status',
      });
    });
  });

  describe('System Broadcasting - External Integration', () => {
    it('should broadcast agent status updates to all connected clients', () => {
      const update: AgentStatusUpdateDto = {
        networkId: 'test-network',
        agentUpdates: [
          {
            id: 'github-analyzer',
            status: 'processing',
            currentTask: 'Repository analysis in progress',
          },
        ],
      };

      gateway.broadcastAgentUpdate(update);

      expect(mockServer.emit).toHaveBeenCalledWith('agent-status-update', {
        type: 'system_update',
        data: update,
        timestamp: expect.any(String),
      });
    });

    it('should broadcast memory updates to all connected clients', () => {
      const update: MemoryUpdateDto = {
        memoryId: 'memory-789',
        type: 'content_performance',
        update: 'LinkedIn post engagement exceeded expectations',
      };

      gateway.broadcastMemoryUpdate('user456', update);

      expect(mockServer.emit).toHaveBeenCalledWith('memory-context-update', {
        type: 'system_update',
        userId: 'user456',
        data: update,
        timestamp: expect.any(String),
      });
    });

    it('should broadcast workflow progress updates', () => {
      const progress: WorkflowProgressDto = {
        workflowId: 'workflow-123',
        currentStep: 3,
        totalSteps: 5,
        currentAgent: 'content-creator',
        status: 'generating_content',
      };

      gateway.broadcastWorkflowProgress(progress);

      expect(mockServer.emit).toHaveBeenCalledWith('workflow-progress', {
        type: 'system_update',
        data: progress,
        timestamp: expect.any(String),
      });
    });
  });

  describe('Agent Capabilities & Frontend Data Structures', () => {
    it('should provide agent capabilities for 3D visualization', () => {
      const capabilities = (gateway as any).getAgentCapabilities(
        'github-analyzer'
      );

      expect(capabilities).toEqual([
        'repository_analysis',
        'skill_extraction',
        'contribution_analysis',
      ]);
    });

    it('should provide capabilities for all specialized agents', () => {
      const githubCapabilities = (gateway as any).getAgentCapabilities(
        'github-analyzer'
      );
      const contentCapabilities = (gateway as any).getAgentCapabilities(
        'content-creator'
      );
      const strategistCapabilities = (gateway as any).getAgentCapabilities(
        'brand-strategist'
      );

      expect(githubCapabilities).toBeDefined();
      expect(contentCapabilities).toBeDefined();
      expect(strategistCapabilities).toBeDefined();

      expect(githubCapabilities.length).toBeGreaterThan(0);
      expect(contentCapabilities.length).toBeGreaterThan(0);
      expect(strategistCapabilities.length).toBeGreaterThan(0);
    });

    it('should provide default coordination capabilities for unknown agents', () => {
      const capabilities = (gateway as any).getAgentCapabilities(
        'unknown-agent'
      );
      expect(capabilities).toEqual(['multi_agent_coordination']);
    });
  });

  describe('Real-time Performance & Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      mockWorkflow.getWorkflowStatus.mockRejectedValue(
        new Error('Connection timeout')
      );

      await gateway.handleConnection(mockClient);

      // Should still send connection confirmation even if status fails
      expect(mockClient.emit).toHaveBeenCalledWith(
        'connection-established',
        expect.any(Object)
      );
    });

    it('should handle memory service failures during connection', async () => {
      mockMemoryService.searchBrandMemories.mockRejectedValue(
        new Error('Memory service down')
      );

      await gateway.handleConnection(mockClient);

      // Should still complete connection process
      expect(mockClient.emit).toHaveBeenCalledWith(
        'connection-established',
        expect.any(Object)
      );
    });

    it('should maintain proper client state management', () => {
      const clientInfo = (gateway as any).connectedClients.get(
        'client-test-123'
      );
      expect(clientInfo).toBeUndefined(); // Not connected yet

      // Simulate connection
      (gateway as any).connectedClients.set('client-test-123', {
        socket: mockClient,
        userId: 'user456',
        sessionId: 'session789',
        subscribedRooms: new Set(['enhanced-chat']),
      });

      const updatedClientInfo = (gateway as any).connectedClients.get(
        'client-test-123'
      );
      expect(updatedClientInfo).toBeDefined();
      expect(updatedClientInfo.userId).toBe('user456');
      expect(updatedClientInfo.subscribedRooms.has('enhanced-chat')).toBe(true);
    });
  });

  describe('Integration with Frontend Interface Modes', () => {
    it('should provide all required data streams for Agent Constellation 3D', async () => {
      // Setup client subscription
      (gateway as any).connectedClients.set('client-test-123', {
        socket: mockClient,
        subscribedRooms: new Set(['agent-constellation']),
      });

      const streamRequest: DevBrandStreamRequestDto = {
        message: 'Test agent constellation data',
        options: {},
      };

      await gateway.handleWorkflowStream(mockClient, streamRequest);

      // Should broadcast agent switching events with spatial data
      expect(mockServer.emit).toHaveBeenCalledWith(
        'agent-switch',
        expect.objectContaining({
          fromAgent: expect.any(String),
          toAgent: expect.any(String),
          capabilities: expect.any(Array),
          timestamp: expect.any(String),
        })
      );
    });

    it('should provide workflow state for D3 canvas visualization', async () => {
      (gateway as any).connectedClients.set('client-test-123', {
        socket: mockClient,
        subscribedRooms: new Set(['workflow-canvas']),
      });

      const streamRequest: DevBrandStreamRequestDto = {
        message: 'Test workflow canvas data',
        options: {},
      };

      await gateway.handleWorkflowStream(mockClient, streamRequest);

      // Should broadcast workflow node updates for D3 visualization
      expect(mockServer.emit).toHaveBeenCalledWith(
        'workflow-node-update',
        expect.objectContaining({
          nodeId: expect.any(String),
          status: 'active',
          data: expect.any(Object),
          timestamp: expect.any(String),
        })
      );
    });

    it('should support memory constellation exploration', async () => {
      await gateway.handleRoomSubscription(mockClient, {
        room: 'memory-constellation',
        userId: 'user456',
      });

      // Should provide brand analytics for constellation visualization
      expect(mockClient.emit).toHaveBeenCalledWith(
        'memory-constellation-data',
        expect.objectContaining({
          analytics: expect.objectContaining({
            totalMemories: expect.any(Number),
            contentMetrics: expect.any(Object),
            skillProgress: expect.any(Object),
            brandEvolution: expect.any(Object),
          }),
          timestamp: expect.any(String),
        })
      );
    });
  });
});
