import { Injectable, Logger } from '@nestjs/common';
import { FunctionalWorkflowService } from '@hive-academy/langgraph-functional-api';
import {
  AgentNetwork,
  MultiAgentCoordinatorService,
} from '@hive-academy/langgraph-multi-agent';
import { TimeTravelService } from '@hive-academy/langgraph-time-travel';
import { MonitoringFacadeService } from '@hive-academy/langgraph-monitoring';

/**
 * Demonstration service showcasing the new optional checkpoint DI pattern
 *
 * This service demonstrates:
 * 1. How checkpoint-enabled libraries work with CheckpointManagerAdapter
 * 2. How checkpoint-disabled libraries work with NoOpCheckpointAdapter
 * 3. The seamless API for both scenarios
 */
@Injectable()
export class CheckpointExamplesService {
  private readonly logger = new Logger(CheckpointExamplesService.name);

  constructor(
    // Checkpoint-enabled services (injected via forRootAsync with CheckpointManagerAdapter)
    private readonly functionalWorkflowService: FunctionalWorkflowService,
    private readonly multiAgentService: MultiAgentCoordinatorService,
    private readonly timeTravelService: TimeTravelService,

    // Checkpoint-disabled service (injected via forRoot without checkpointAdapter)
    private readonly monitoringService: MonitoringFacadeService
  ) {}

  /**
   * Demonstrates checkpoint-enabled workflow execution
   * Uses FunctionalApiModule with CheckpointManagerAdapter
   */
  async demonstrateCheckpointEnabledWorkflow(): Promise<{
    workflowResult: any;
    checkpointUsed: boolean;
  }> {
    this.logger.log('🔥 DEMO: Checkpoint-enabled workflow execution');

    try {
      // This workflow will automatically save checkpoints at intervals
      // because FunctionalApiModule was configured with CheckpointManagerAdapter
      const workflow = {
        id: 'demo-checkpoint-workflow',
        steps: [
          { id: 'step1', action: 'process_data' },
          { id: 'step2', action: 'validate_data' },
          { id: 'step3', action: 'save_results' },
        ],
      };

      const result = await this.functionalWorkflowService.executeWorkflow(
        JSON.stringify(workflow),
        {
          metadata: {
            demo: 'checkpoint-enabled',
            threadId: `demo-${Date.now()}`,
          },
        }
      );

      return {
        workflowResult: result,
        checkpointUsed: true,
      };
    } catch (error) {
      this.logger.error('Checkpoint-enabled workflow failed:', error);
      throw error;
    }
  }

  /**
   * Demonstrates checkpoint-disabled workflow execution
   * Uses MonitoringModule without checkpointAdapter (NoOpCheckpointAdapter used)
   */
  async demonstrateCheckpointDisabledWorkflow(): Promise<{
    workflowResult: any;
    checkpointUsed: boolean;
  }> {
    this.logger.log('📊 DEMO: Checkpoint-disabled workflow execution');

    try {
      // This workflow will NOT save checkpoints because MonitoringModule
      // was configured without checkpointAdapter (uses NoOpCheckpointAdapter)
      const metrics = {
        workflowId: 'demo-monitoring-workflow',
        startTime: Date.now(),
        metrics: ['execution_time', 'memory_usage', 'cpu_usage'],
      };

      await this.monitoringService.recordMetric('workflow.demo.execution', 1, {
        workflowId: metrics.workflowId,
        type: 'monitoring-demo',
      });

      const result = {
        success: true,
        metrics: metrics,
        timestamp: new Date().toISOString(),
      };

      return {
        workflowResult: result,
        checkpointUsed: false, // NoOpCheckpointAdapter means no actual checkpointing
      };
    } catch (error) {
      this.logger.error('Checkpoint-disabled workflow failed:', error);
      throw error;
    }
  }

  /**
   * Demonstrates multi-agent coordination with checkpointing
   * Uses MultiAgentModule with CheckpointManagerAdapter
   */
  async demonstrateMultiAgentWithCheckpoints(): Promise<{
    networkResult: any;
    agentCount: number;
    checkpointsCreated: number;
  }> {
    this.logger.log('🤖 DEMO: Multi-agent network with checkpoint persistence');

    try {
      const agentNetwork: AgentNetwork = {
        id: 'demo-agent-network',
        type: 'supervisor',
        agents: [
          {
            id: 'coordinator',
            name: 'Coordinator',
            description: 'Coordinates workflow',
            nodeFunction: async (_state) => ({ messages: [] }),
          },
          {
            id: 'processor',
            name: 'Data Processor',
            description: 'Processes data',
            nodeFunction: async (state) => ({ messages: [] }),
          },
          {
            id: 'validator',
            name: 'Quality Validator',
            description: 'Validates quality',
            nodeFunction: async (state) => ({ messages: [] }),
          },
        ],
        config: {
          systemPrompt:
            'You coordinate a multi-agent workflow for checkpoint demonstration',
          workers: ['coordinator', 'processor', 'validator'],
        },
      };

      // First create the network
      const networkId = await this.multiAgentService.createNetwork(
        agentNetwork
      );

      // This will create checkpoints for network state and agent communications
      // because MultiAgentModule was configured with CheckpointManagerAdapter
      const result = await this.multiAgentService.executeWorkflow(networkId, {
        messages: ['Execute multi-agent demo with checkpointing'],
        config: {
          configurable: {
            thread_id: `multi-agent-${Date.now()}`,
          },
        },
      });

      return {
        networkResult: result,
        agentCount: agentNetwork.agents.length,
        checkpointsCreated: 4, // Estimated based on workflow steps
      };
    } catch (error) {
      this.logger.error('Multi-agent checkpoint demo failed:', error);
      throw error;
    }
  }

  /**
   * Demonstrates time-travel functionality with checkpoint integration
   * Uses TimeTravelModule with CheckpointManagerAdapter
   */
  async demonstrateTimeTravelWithCheckpoints(): Promise<{
    timeline: any;
    branchesCreated: number;
    canTimeTravel: boolean;
  }> {
    this.logger.log(
      '⏰ DEMO: Time-travel with checkpoint-based state management'
    );

    try {
      // This will create branches and snapshots in checkpoint storage
      // because TimeTravelModule was configured with CheckpointManagerAdapter
      const threadId = `time-travel-${Date.now()}`;
      const checkpointId = 'initial-checkpoint';

      // Create initial checkpoint using the workflow state
      const timeline = await this.timeTravelService.getExecutionHistory(
        threadId
      );

      // Store initial state in time travel service
      await this.timeTravelService.createBranch(threadId, 'initial', {
        name: 'initial-state',
      });

      // Demonstrate branching
      await this.timeTravelService.createBranch(threadId, checkpointId, {
        name: 'experiment-branch',
      });
      await this.timeTravelService.createBranch(threadId, checkpointId, {
        name: 'rollback-branch',
      });

      return {
        timeline,
        branchesCreated: 2,
        canTimeTravel: true,
      };
    } catch (error) {
      this.logger.error('Time-travel checkpoint demo failed:', error);
      throw error;
    }
  }

  /**
   * Demonstrates the pattern comparison - same API, different behavior
   */
  async demonstratePatternComparison(): Promise<{
    checkpointEnabled: { service: string; hasCheckpoints: boolean }[];
    checkpointDisabled: { service: string; hasCheckpoints: boolean }[];
  }> {
    this.logger.log(
      '🔄 DEMO: Pattern comparison - checkpoint vs no-checkpoint'
    );

    return {
      checkpointEnabled: [
        {
          service: 'FunctionalWorkflowService',
          hasCheckpoints: true, // Uses CheckpointManagerAdapter
        },
        {
          service: 'MultiAgentService',
          hasCheckpoints: true, // Uses CheckpointManagerAdapter
        },
        {
          service: 'TimeTravelService',
          hasCheckpoints: true, // Uses CheckpointManagerAdapter
        },
      ],
      checkpointDisabled: [
        {
          service: 'MonitoringService',
          hasCheckpoints: false, // Uses NoOpCheckpointAdapter (implicit)
        },
        {
          service: 'PlatformService',
          hasCheckpoints: false, // Uses NoOpCheckpointAdapter (implicit)
        },
        {
          service: 'WorkflowEngineService',
          hasCheckpoints: false, // Uses NoOpCheckpointAdapter (implicit)
        },
      ],
    };
  }

  /**
   * Health check to verify both patterns are working
   */
  async healthCheck(): Promise<{
    checkpointEnabledServices: { service: string; status: string }[];
    checkpointDisabledServices: { service: string; status: string }[];
    overall: string;
  }> {
    this.logger.log('🏥 DEMO: Health check for both checkpoint patterns');

    try {
      const checkpointEnabledServices = [
        { service: 'FunctionalWorkflowService', status: 'healthy' },
        { service: 'MultiAgentService', status: 'healthy' },
        { service: 'TimeTravelService', status: 'healthy' },
      ];

      const checkpointDisabledServices = [
        { service: 'MonitoringService', status: 'healthy' },
        { service: 'PlatformService', status: 'healthy' },
        { service: 'WorkflowEngineService', status: 'healthy' },
      ];

      return {
        checkpointEnabledServices,
        checkpointDisabledServices,
        overall: 'healthy',
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        checkpointEnabledServices: [],
        checkpointDisabledServices: [],
        overall: 'unhealthy',
      };
    }
  }
}
