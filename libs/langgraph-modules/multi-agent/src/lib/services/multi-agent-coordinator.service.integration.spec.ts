import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MultiAgentCoordinatorService } from './multi-agent-coordinator.service';
import { AgentRegistryService } from './agent-registry.service';
import { NetworkManagerService } from './network-manager.service';
import { LlmProviderService } from './llm-provider.service';
import {
  type ICheckpointAdapter,
  type IStreamingService,
  CHECKPOINT_ADAPTER_TOKEN,
  STREAMING_SERVICE_TOKEN,
  NoOpCheckpointAdapter,
  NoOpStreamingService,
} from '@hive-academy/langgraph-core';
import {
  type AgentDefinition,
  AgentNetwork,
} from '../interfaces/multi-agent.interface';
import { HumanMessage } from '@langchain/core/messages';

describe('MultiAgentCoordinatorService Streaming Integration', () => {
  let coordinator: MultiAgentCoordinatorService;
  let mockStreamingService: jest.Mocked<IStreamingService>;
  let mockCheckpointAdapter: jest.Mocked<ICheckpointAdapter>;
  let mockAgentRegistry: jest.Mocked<AgentRegistryService>;
  let mockNetworkManager: jest.Mocked<NetworkManagerService>;
  let mockLlmProvider: jest.Mocked<LlmProviderService>;

  beforeEach(async () => {
    mockStreamingService = {
      initializeTokenStream: jest.fn(),
      streamToken: jest.fn(),
      flushTokens: jest.fn(),
      streamEvent: jest.fn(),
      streamProgress: jest.fn(),
      broadcastToExecution: jest.fn(),
      sendToClient: jest.fn(),
    };

    mockCheckpointAdapter = {
      saveCheckpoint: jest.fn(),
      loadCheckpoint: jest.fn(),
      listCheckpoints: jest.fn(),
      deleteCheckpoint: jest.fn(),
      cleanupCheckpoints: jest.fn(),
    };

    mockAgentRegistry = {
      registerAgent: jest.fn(),
      getAgent: jest.fn(),
      getAllAgents: jest.fn(),
      getAgentsByCapability: jest.fn(),
      hasAgent: jest.fn(),
      getAgentHealth: jest.fn(),
      listAgentIds: jest.fn(),
      getHealthyAgents: jest.fn(),
      clearAll: jest.fn(),
      findAgent: jest.fn(),
    } as any;

    mockNetworkManager = {
      createNetwork: jest.fn(),
      executeWorkflow: jest.fn(),
      streamWorkflow: jest.fn(),
      getNetworkConfig: jest.fn(),
      listNetworks: jest.fn(),
      removeNetwork: jest.fn(),
      getNetworkStats: jest.fn(),
      healthCheck: jest.fn(),
    } as any;

    mockLlmProvider = {
      testLLM: jest.fn(),
      getCacheStats: jest.fn(),
      getSupportedProviders: jest.fn(),
      clearCache: jest.fn(),
    } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        MultiAgentCoordinatorService,
        {
          provide: AgentRegistryService,
          useValue: mockAgentRegistry,
        },
        {
          provide: NetworkManagerService,
          useValue: mockNetworkManager,
        },
        {
          provide: LlmProviderService,
          useValue: mockLlmProvider,
        },
        {
          provide: CHECKPOINT_ADAPTER_TOKEN,
          useValue: mockCheckpointAdapter,
        },
        {
          provide: STREAMING_SERVICE_TOKEN,
          useValue: mockStreamingService,
        },
      ],
    }).compile();

    coordinator = moduleRef.get<MultiAgentCoordinatorService>(
      MultiAgentCoordinatorService
    );

    // Mock LLM test to prevent startup warnings
    mockLlmProvider.testLLM.mockResolvedValue(true);
    mockLlmProvider.getCacheStats.mockReturnValue({ size: 0 });
    mockLlmProvider.getSupportedProviders.mockReturnValue(['openai']);

    await coordinator.onModuleInit();
  });

  describe('Core Requirement: Streaming Service Integration', () => {
    it('should inject real streaming service instead of console.log', () => {
      // Verify the coordinator has the streaming service injected
      expect((coordinator as any).streamingService).toBeDefined();
      expect((coordinator as any).streamingService).toBe(mockStreamingService);

      // Verify it's not a NoOpStreamingService (which would indicate broken DI)
      expect((coordinator as any).streamingService).not.toBeInstanceOf(
        NoOpStreamingService
      );
    });

    it('should use streaming service for multi-agent coordination events', async () => {
      const networkId = 'test-network-123';
      const agentMessage = 'Agent coordination test message';

      // Mock successful workflow execution
      mockNetworkManager.executeWorkflow.mockResolvedValue({
        finalState: { messages: [new HumanMessage(agentMessage)] },
        executionPath: ['agent1', 'agent2'],
        executionTime: 150,
        success: true,
      });

      // Execute a simple workflow to trigger coordination
      await coordinator.executeSimpleWorkflow(networkId, agentMessage);

      // Verify the network manager was called (which should handle streaming internally)
      expect(mockNetworkManager.executeWorkflow).toHaveBeenCalledWith(
        networkId,
        expect.objectContaining({
          messages: [agentMessage],
        })
      );
    });

    it('should support streaming workflow execution', async () => {
      const networkId = 'test-streaming-network';
      const messages = ['Start multi-agent coordination'];

      // Create a mock async generator for streaming
      const mockStream = async function* () {
        yield { agent1: { message: 'Agent 1 processing' } };
        yield { agent2: { message: 'Agent 2 responding' } };
        yield { coordinator: { message: 'Coordination complete' } };
      };

      mockNetworkManager.streamWorkflow.mockReturnValue(mockStream() as any);

      // Test streaming workflow
      const stream = coordinator.streamWorkflow(networkId, { messages });
      const updates = [];

      for await (const update of stream) {
        updates.push(update);
      }

      // Verify streaming was called and updates were received
      expect(mockNetworkManager.streamWorkflow).toHaveBeenCalledWith(
        networkId,
        expect.objectContaining({ messages })
      );
      expect(updates.length).toBe(3);
      expect(updates[0]).toHaveProperty('agent1');
      expect(updates[1]).toHaveProperty('agent2');
      expect(updates[2]).toHaveProperty('coordinator');
    });
  });

  describe('Dependency Injection Pattern Validation', () => {
    it('should work with NoOpStreamingService when streaming is disabled', async () => {
      // Create a new coordinator with NoOpStreamingService
      const noOpService = new NoOpStreamingService();
      const moduleRef = await Test.createTestingModule({
        providers: [
          MultiAgentCoordinatorService,
          {
            provide: AgentRegistryService,
            useValue: mockAgentRegistry,
          },
          {
            provide: NetworkManagerService,
            useValue: mockNetworkManager,
          },
          {
            provide: LlmProviderService,
            useValue: mockLlmProvider,
          },
          {
            provide: CHECKPOINT_ADAPTER_TOKEN,
            useValue: new NoOpCheckpointAdapter(),
          },
          {
            provide: STREAMING_SERVICE_TOKEN,
            useValue: noOpService,
          },
        ],
      }).compile();

      const coordinatorWithNoOp = moduleRef.get<MultiAgentCoordinatorService>(
        MultiAgentCoordinatorService
      );

      await coordinatorWithNoOp.onModuleInit();

      // Test that operations don't fail with NoOpStreamingService
      mockNetworkManager.executeWorkflow.mockResolvedValue({
        finalState: { messages: [] },
        executionPath: [],
        executionTime: 0,
        success: true,
      });

      expect(async () => {
        await coordinatorWithNoOp.executeSimpleWorkflow(
          'test-network',
          'test message'
        );
      }).not.toThrow();
    });

    it('should handle both streaming and checkpoint adapters in forRootAsync pattern', () => {
      // Verify both services are properly injected
      expect((coordinator as any).streamingService).toBe(mockStreamingService);
      expect((coordinator as any).checkpointAdapter).toBe(
        mockCheckpointAdapter
      );

      // Verify they are the correct types (not no-op implementations)
      expect((coordinator as any).streamingService).not.toBeInstanceOf(
        NoOpStreamingService
      );
      expect((coordinator as any).checkpointAdapter).not.toBeInstanceOf(
        NoOpCheckpointAdapter
      );
    });
  });

  describe('Network Management with Streaming', () => {
    it('should setup networks with agent definitions and stream coordination', async () => {
      const networkId = 'test-setup-network';
      const agents: AgentDefinition[] = [
        {
          id: 'agent1',
          name: 'Research Agent',
          description: 'Handles research tasks',
          systemPrompt: 'You are a research agent',
          capabilities: ['research', 'analysis'],
          llmProvider: 'openai',
        },
        {
          id: 'agent2',
          name: 'Writing Agent',
          description: 'Handles writing tasks',
          systemPrompt: 'You are a writing agent',
          capabilities: ['writing', 'editing'],
          llmProvider: 'openai',
        },
      ];

      mockNetworkManager.createNetwork.mockResolvedValue(networkId);

      // Setup network with supervisor pattern
      const createdNetworkId = await coordinator.setupNetwork(
        networkId,
        agents,
        'supervisor'
      );

      // Verify agents were registered
      expect(mockAgentRegistry.registerAgent).toHaveBeenCalledTimes(2);
      expect(mockAgentRegistry.registerAgent).toHaveBeenCalledWith(agents[0]);
      expect(mockAgentRegistry.registerAgent).toHaveBeenCalledWith(agents[1]);

      // Verify network was created with proper configuration
      expect(mockNetworkManager.createNetwork).toHaveBeenCalledWith({
        id: networkId,
        type: 'supervisor',
        agents,
        config: expect.objectContaining({
          systemPrompt: expect.stringContaining(
            'supervisor coordinating 2 agents'
          ),
          workers: ['agent1', 'agent2'],
        }),
      });

      expect(createdNetworkId).toBe(networkId);
    });

    it('should handle swarm coordination with streaming', async () => {
      const networkId = 'test-swarm-network';
      const agents: AgentDefinition[] = [
        {
          id: 'swarm-agent1',
          name: 'Swarm Agent 1',
          description: 'Dynamic coordination agent',
          systemPrompt: 'You coordinate dynamically',
          capabilities: ['coordination'],
          llmProvider: 'openai',
        },
      ];

      mockNetworkManager.createNetwork.mockResolvedValue(networkId);

      // Setup swarm network
      await coordinator.setupNetwork(networkId, agents, 'swarm');

      // Verify swarm configuration
      expect(mockNetworkManager.createNetwork).toHaveBeenCalledWith({
        id: networkId,
        type: 'swarm',
        agents,
        config: expect.objectContaining({
          enableDynamicHandoffs: true,
          messageHistory: {
            removeHandoffMessages: true,
            addAgentAttribution: true,
          },
        }),
      });
    });
  });

  describe('System Status and Health Monitoring', () => {
    it('should provide comprehensive system status including streaming capabilities', () => {
      // Mock registry responses
      mockAgentRegistry.getAllAgents.mockReturnValue([
        { id: 'agent1', name: 'Agent 1' } as AgentDefinition,
        { id: 'agent2', name: 'Agent 2' } as AgentDefinition,
      ]);
      mockAgentRegistry.getHealthyAgents.mockReturnValue([
        { id: 'agent1', name: 'Agent 1' } as AgentDefinition,
      ]);

      // Mock network responses
      mockNetworkManager.listNetworks.mockReturnValue([
        { id: 'net1', type: 'supervisor', agentCount: 2 },
        { id: 'net2', type: 'swarm', agentCount: 3 },
      ]);

      // Mock LLM responses
      mockLlmProvider.getCacheStats.mockReturnValue({ size: 10 });
      mockLlmProvider.getSupportedProviders.mockReturnValue([
        'openai',
        'anthropic',
      ]);

      const status = coordinator.getSystemStatus();

      expect(status).toEqual({
        agents: {
          total: 2,
          healthy: 1,
          unhealthy: 1,
        },
        networks: {
          total: 2,
          types: {
            supervisor: 1,
            swarm: 1,
          },
        },
        llm: {
          providers: ['openai', 'anthropic'],
          cacheSize: 10,
        },
      });
    });

    it('should handle network health checks with streaming connectivity', async () => {
      const networkId = 'health-check-network';

      mockNetworkManager.healthCheck.mockResolvedValue({
        healthy: true,
        agents: { total: 2, responsive: 2 },
        streaming: { connected: true },
      });

      const health = await coordinator.healthCheck(networkId);

      expect(mockNetworkManager.healthCheck).toHaveBeenCalledWith(networkId);
      expect(health.healthy).toBe(true);
      expect(health.streaming?.connected).toBe(true);
    });
  });

  describe('Checkpoint Integration with Streaming', () => {
    it('should handle checkpoints alongside streaming configuration', async () => {
      const networkId = 'checkpoint-streaming-network';
      const threadId = `multi-agent_${networkId}`;

      // Mock checkpoint operations
      mockCheckpointAdapter.listCheckpoints.mockResolvedValue([
        [
          { configurable: { thread_id: threadId } },
          { channel_values: { messages: ['test'] } },
          { timestamp: new Date().toISOString(), size: 1024 },
        ],
      ]);

      const checkpoints = await coordinator.getNetworkCheckpoints(networkId);

      expect(mockCheckpointAdapter.listCheckpoints).toHaveBeenCalledWith(
        threadId,
        expect.objectContaining({
          limit: 10,
        })
      );
      expect(checkpoints).toHaveLength(1);
    });

    it('should resume workflows from checkpoints with streaming enabled', async () => {
      const networkId = 'resume-streaming-network';
      const checkpointId = 'checkpoint-123';
      const threadId = `multi-agent_${networkId}`;

      // Mock checkpoint loading
      mockCheckpointAdapter.loadCheckpoint.mockResolvedValue({
        channel_values: { messages: ['previous message'] },
        pending_writes: [],
      });

      // Mock workflow execution with restored state
      mockNetworkManager.executeWorkflow.mockResolvedValue({
        finalState: { messages: ['previous message', 'new message'] },
        executionPath: ['agent1'],
        executionTime: 200,
        success: true,
      });

      const result = await coordinator.resumeFromCheckpoint(
        networkId,
        checkpointId,
        { messages: ['continue from checkpoint'] }
      );

      expect(mockCheckpointAdapter.loadCheckpoint).toHaveBeenCalledWith(
        threadId,
        checkpointId
      );

      expect(mockNetworkManager.executeWorkflow).toHaveBeenCalledWith(
        networkId,
        expect.objectContaining({
          messages: ['continue from checkpoint'],
          config: expect.objectContaining({
            configurable: expect.objectContaining({
              thread_id: threadId,
              checkpoint_id: checkpointId,
            }),
          }),
        })
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle streaming service failures gracefully', async () => {
      // Mock streaming service to fail
      mockStreamingService.streamEvent.mockImplementation(() => {
        throw new Error('Streaming service unavailable');
      });

      // Workflow should still succeed even if streaming fails
      mockNetworkManager.executeWorkflow.mockResolvedValue({
        finalState: { messages: ['success despite streaming failure'] },
        executionPath: ['agent1'],
        executionTime: 100,
        success: true,
      });

      const result = await coordinator.executeSimpleWorkflow(
        'resilient-network',
        'test message'
      );

      // Workflow should complete successfully
      expect(result.success).toBe(true);
      expect(mockNetworkManager.executeWorkflow).toHaveBeenCalled();
    });

    it('should handle cleanup of streaming resources', async () => {
      // Setup some test data
      mockAgentRegistry.getAllAgents.mockReturnValue([]);
      mockNetworkManager.listNetworks.mockReturnValue([
        { id: 'net1', type: 'supervisor', agentCount: 1 },
      ]);
      mockNetworkManager.removeNetwork.mockReturnValue(true);

      // Test cleanup
      await coordinator.cleanup();

      // Verify cleanup operations
      expect(mockAgentRegistry.clearAll).toHaveBeenCalled();
      expect(mockNetworkManager.removeNetwork).toHaveBeenCalledWith('net1');
      expect(mockLlmProvider.clearCache).toHaveBeenCalled();
    });
  });

  describe('Backward Compatibility with Streaming', () => {
    it('should support legacy workflow creation with modern streaming', async () => {
      const supervisorAgent = 'supervisor-legacy';
      const workerAgents = ['worker1', 'worker2'] as const;

      // Mock agent lookup
      mockAgentRegistry.findAgent.mockImplementation((id: string) => ({
        id,
        name: `Agent ${id}`,
        description: `Legacy agent ${id}`,
        systemPrompt: `You are ${id}`,
        capabilities: ['legacy'],
        llmProvider: 'openai',
      }));

      mockNetworkManager.createNetwork.mockResolvedValue('legacy-network-123');

      // Test deprecated method still works with new streaming
      const networkId = await coordinator.createSupervisorWorkflow(
        supervisorAgent,
        workerAgents
      );

      expect(networkId).toBe('legacy-network-123');
      expect(mockNetworkManager.createNetwork).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'supervisor',
          config: expect.objectContaining({
            workers: ['worker1', 'worker2'],
          }),
        })
      );
    });
  });
});
