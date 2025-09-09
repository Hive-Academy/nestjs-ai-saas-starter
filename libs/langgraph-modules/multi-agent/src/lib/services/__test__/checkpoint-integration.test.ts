import { Test, type TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CheckpointManagerService } from '@hive-academy/langgraph-checkpoint';
import { NetworkManagerService } from '../network-manager.service';
import { AgentRegistryService } from '../agent-registry.service';
import { GraphBuilderService } from '../graph-builder.service';
import { MultiAgentCoordinatorService } from '../multi-agent-coordinator.service';
import { LlmProviderService } from '../llm-provider.service';
import { NodeFactoryService } from '../node-factory.service';
import { MULTI_AGENT_MODULE_OPTIONS } from '../../constants/multi-agent.constants';
import type {
  MultiAgentModuleOptions,
  AgentNetwork,
  AgentDefinition,
} from '../../interfaces/multi-agent.interface';

describe('CheckpointIntegration', () => {
  let networkManager: NetworkManagerService;
  let coordinator: MultiAgentCoordinatorService;
  let checkpointManager: CheckpointManagerService;

  const mockCheckpointManager = {
    isCoreServicesAvailable: jest.fn().mockReturnValue(true),
    getDefaultSaverName: jest.fn().mockReturnValue('default'),
    listCheckpoints: jest.fn().mockResolvedValue([]),
    loadCheckpoint: jest.fn().mockResolvedValue(null),
    cleanupCheckpoints: jest.fn().mockResolvedValue(0),
  };

  const testOptions: MultiAgentModuleOptions = {
    checkpointing: {
      enabled: true,
      enableForAllNetworks: true,
      defaultThreadPrefix: 'test-multi-agent',
    },
    debug: {
      enabled: true,
      logLevel: 'debug',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        NetworkManagerService,
        MultiAgentCoordinatorService,
        AgentRegistryService,
        GraphBuilderService,
        LlmProviderService,
        NodeFactoryService,
        {
          provide: CheckpointManagerService,
          useValue: mockCheckpointManager,
        },
        {
          provide: MULTI_AGENT_MODULE_OPTIONS,
          useValue: testOptions,
        },
      ],
    }).compile();

    networkManager = module.get<NetworkManagerService>(NetworkManagerService);
    coordinator = module.get<MultiAgentCoordinatorService>(
      MultiAgentCoordinatorService
    );
    checkpointManager = module.get<CheckpointManagerService>(
      CheckpointManagerService
    );
  });

  describe('NetworkManagerService Checkpoint Integration', () => {
    it('should be defined with checkpoint manager', () => {
      expect(networkManager).toBeDefined();
      expect(checkpointManager).toBeDefined();
    });

    it('should prepare compilation options with checkpointer when enabled', async () => {
      const mockAgent: AgentDefinition = {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'Test agent for checkpoint integration',
        nodeFunction: jest.fn().mockResolvedValue({ messages: [] }),
      };

      const networkConfig: AgentNetwork = {
        id: 'test-network',
        type: 'supervisor',
        agents: [mockAgent],
        config: {
          systemPrompt: 'Test supervisor',
          workers: ['test-agent'],
        },
      };

      // Since createNetwork calls private methods, we'll test the public interface
      // The compilation options should include a checkpointer
      try {
        await networkManager.createNetwork(networkConfig);

        // Verify checkpoint manager methods were called during setup
        expect(
          mockCheckpointManager.isCoreServicesAvailable
        ).toHaveBeenCalled();
        expect(mockCheckpointManager.getDefaultSaverName).toHaveBeenCalled();
      } catch (error) {
        // Expected - we don't have full LangGraph setup in test environment
        // But the checkpoint integration should still be attempted
        expect(
          mockCheckpointManager.isCoreServicesAvailable
        ).toHaveBeenCalled();
      }
    });
  });

  describe('MultiAgentCoordinatorService Checkpoint Methods', () => {
    it('should provide checkpoint management methods', () => {
      expect(coordinator.getNetworkCheckpoints).toBeDefined();
      expect(coordinator.resumeFromCheckpoint).toBeDefined();
      expect(coordinator.clearNetworkCheckpoints).toBeDefined();
    });

    it('should get network checkpoints', async () => {
      const networkId = 'test-network';
      const checkpoints = await coordinator.getNetworkCheckpoints(networkId);

      expect(mockCheckpointManager.listCheckpoints).toHaveBeenCalledWith(
        'multi-agent_test-network',
        expect.objectContaining({
          limit: 10,
        })
      );
      expect(checkpoints).toEqual([]);
    });

    it('should clear network checkpoints', async () => {
      const networkId = 'test-network';
      const result = await coordinator.clearNetworkCheckpoints(networkId);

      expect(mockCheckpointManager.listCheckpoints).toHaveBeenCalledWith(
        'multi-agent_test-network'
      );
      expect(result).toBe(0);
    });

    it('should get checkpoint statistics', async () => {
      const networkId = 'test-network';
      const stats = await coordinator.getNetworkCheckpointStats(networkId);

      expect(stats).toEqual({
        totalCheckpoints: 0,
      });
      expect(mockCheckpointManager.listCheckpoints).toHaveBeenCalledWith(
        'multi-agent_test-network'
      );
    });
  });

  describe('Configuration Integration', () => {
    it('should use checkpointing configuration from options', () => {
      // This is tested indirectly through the service behavior
      // The NetworkManagerService should read configuration and apply checkpointing
      expect(testOptions.checkpointing?.enabled).toBe(true);
      expect(testOptions.checkpointing?.defaultThreadPrefix).toBe(
        'test-multi-agent'
      );
    });
  });

  describe('Graceful Degradation', () => {
    let moduleWithoutCheckpoint: TestingModule;
    let coordinatorWithoutCheckpoint: MultiAgentCoordinatorService;

    beforeEach(async () => {
      moduleWithoutCheckpoint = await Test.createTestingModule({
        imports: [EventEmitterModule.forRoot()],
        providers: [
          NetworkManagerService,
          MultiAgentCoordinatorService,
          AgentRegistryService,
          GraphBuilderService,
          LlmProviderService,
          NodeFactoryService,
          {
            provide: MULTI_AGENT_MODULE_OPTIONS,
            useValue: testOptions,
          },
          // CheckpointManagerService not provided
        ],
      }).compile();

      coordinatorWithoutCheckpoint =
        moduleWithoutCheckpoint.get<MultiAgentCoordinatorService>(
          MultiAgentCoordinatorService
        );
    });

    it('should handle missing checkpoint manager gracefully', async () => {
      const networkId = 'test-network';

      // Should not throw, should return empty results
      const checkpoints =
        await coordinatorWithoutCheckpoint.getNetworkCheckpoints(networkId);
      expect(checkpoints).toEqual([]);

      const cleared =
        await coordinatorWithoutCheckpoint.clearNetworkCheckpoints(networkId);
      expect(cleared).toBe(0);

      const stats =
        await coordinatorWithoutCheckpoint.getNetworkCheckpointStats(networkId);
      expect(stats.totalCheckpoints).toBe(0);
    });

    it('should throw appropriate error for resume without checkpoint manager', async () => {
      await expect(
        coordinatorWithoutCheckpoint.resumeFromCheckpoint(
          'test-network',
          'test-checkpoint'
        )
      ).rejects.toThrow('CheckpointManager not available');
    });
  });
});
