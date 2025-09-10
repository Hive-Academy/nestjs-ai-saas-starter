import { Controller, Get, Post, Logger } from '@nestjs/common';
import { CheckpointExamplesService } from '../services/checkpoint-examples.service';

/**
 * Controller for demonstrating the optional checkpoint DI pattern
 *
 * Endpoints showcase:
 * 1. Checkpoint-enabled workflows
 * 2. Checkpoint-disabled workflows
 * 3. Pattern comparison
 * 4. Health checks
 */
@Controller('checkpoint-demo')
export class CheckpointExamplesController {
  private readonly logger = new Logger(CheckpointExamplesController.name);

  constructor(
    private readonly checkpointExamplesService: CheckpointExamplesService
  ) {}

  /**
   * GET /checkpoint-demo/enabled
   * Demonstrates checkpoint-enabled workflow execution
   */
  @Get('enabled')
  async demonstrateCheckpointEnabled() {
    this.logger.log('🔥 API: Demonstrating checkpoint-enabled workflow');

    try {
      const result =
        await this.checkpointExamplesService.demonstrateCheckpointEnabledWorkflow();

      return {
        success: true,
        message: 'Checkpoint-enabled workflow executed successfully',
        data: result,
        explanation: {
          pattern: 'forRootAsync with CheckpointManagerAdapter',
          behavior: 'Automatic checkpointing at configured intervals',
          storage: 'Persistent state in configured checkpoint storage',
        },
      };
    } catch (error: any) {
      this.logger.error('Checkpoint-enabled demo failed:', error);
      return {
        success: false,
        message: 'Checkpoint-enabled workflow failed',
        error: error.message,
      };
    }
  }

  /**
   * GET /checkpoint-demo/disabled
   * Demonstrates checkpoint-disabled workflow execution
   */
  @Get('disabled')
  async demonstrateCheckpointDisabled() {
    this.logger.log('📊 API: Demonstrating checkpoint-disabled workflow');

    try {
      const result =
        await this.checkpointExamplesService.demonstrateCheckpointDisabledWorkflow();

      return {
        success: true,
        message: 'Checkpoint-disabled workflow executed successfully',
        data: result,
        explanation: {
          pattern: 'forRoot without checkpointAdapter',
          behavior: 'No checkpointing (NoOpCheckpointAdapter used)',
          storage: 'No persistent state - in-memory only',
        },
      };
    } catch (error: any) {
      this.logger.error('Checkpoint-disabled demo failed:', error);
      return {
        success: false,
        message: 'Checkpoint-disabled workflow failed',
        error: error.message,
      };
    }
  }

  /**
   * POST /checkpoint-demo/multi-agent
   * Demonstrates multi-agent coordination with checkpointing
   */
  @Post('multi-agent')
  async demonstrateMultiAgentCheckpoints() {
    this.logger.log('🤖 API: Demonstrating multi-agent with checkpoints');

    try {
      const result =
        await this.checkpointExamplesService.demonstrateMultiAgentWithCheckpoints();

      return {
        success: true,
        message: 'Multi-agent network with checkpoints executed successfully',
        data: result,
        explanation: {
          pattern: 'MultiAgentModule with CheckpointManagerAdapter',
          behavior: 'Network state and agent communications checkpointed',
          benefits: 'Recovery from failures, state introspection, debugging',
        },
      };
    } catch (error: any) {
      this.logger.error('Multi-agent checkpoint demo failed:', error);
      return {
        success: false,
        message: 'Multi-agent checkpoint demo failed',
        error: error.message,
      };
    }
  }

  /**
   * POST /checkpoint-demo/time-travel
   * Demonstrates time-travel functionality with checkpoint integration
   */
  @Post('time-travel')
  async demonstrateTimeTravelCheckpoints() {
    this.logger.log('⏰ API: Demonstrating time-travel with checkpoints');

    try {
      const result =
        await this.checkpointExamplesService.demonstrateTimeTravelWithCheckpoints();

      return {
        success: true,
        message: 'Time-travel with checkpoints executed successfully',
        data: result,
        explanation: {
          pattern: 'TimeTravelModule with CheckpointManagerAdapter',
          behavior: 'Branch creation and timeline management via checkpoints',
          capabilities: 'Workflow debugging, state replay, branch management',
        },
      };
    } catch (error: any) {
      this.logger.error('Time-travel checkpoint demo failed:', error);
      return {
        success: false,
        message: 'Time-travel checkpoint demo failed',
        error: error.message,
      };
    }
  }

  /**
   * GET /checkpoint-demo/comparison
   * Shows pattern comparison between checkpoint-enabled vs disabled
   */
  @Get('comparison')
  async demonstratePatternComparison() {
    this.logger.log('🔄 API: Demonstrating pattern comparison');

    try {
      const result =
        await this.checkpointExamplesService.demonstratePatternComparison();

      return {
        success: true,
        message: 'Pattern comparison completed',
        data: result,
        explanation: {
          'checkpoint-enabled': {
            pattern: 'forRootAsync + CheckpointManagerAdapter injection',
            modules: ['FunctionalApi', 'MultiAgent', 'TimeTravel'],
            benefits: 'State persistence, recovery, debugging, introspection',
          },
          'checkpoint-disabled': {
            pattern: 'forRoot without checkpointAdapter',
            modules: ['Monitoring', 'Platform', 'WorkflowEngine'],
            benefits: 'Simpler setup, lower resource usage, faster execution',
          },
        },
      };
    } catch (error: any) {
      this.logger.error('Pattern comparison failed:', error);
      return {
        success: false,
        message: 'Pattern comparison failed',
        error: error.message,
      };
    }
  }

  /**
   * GET /checkpoint-demo/health
   * Health check for both checkpoint patterns
   */
  @Get('health')
  async healthCheck() {
    this.logger.log('🏥 API: Health check for checkpoint patterns');

    try {
      const result = await this.checkpointExamplesService.healthCheck();

      return {
        success: true,
        message: 'Health check completed',
        data: result,
        timestamp: new Date().toISOString(),
        patterns: {
          'checkpoint-enabled': 'Working correctly with persistent state',
          'checkpoint-disabled': 'Working correctly with in-memory state',
        },
      };
    } catch (error: any) {
      this.logger.error('Health check failed:', error);
      return {
        success: false,
        message: 'Health check failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * GET /checkpoint-demo/info
   * Provides information about the checkpoint DI pattern implementation
   */
  @Get('info')
  async getPatternInfo() {
    this.logger.log('ℹ️ API: Providing checkpoint DI pattern information');

    return {
      title: 'Optional Checkpoint DI Pattern Demo',
      description:
        'Demonstrates the new dependency injection pattern for optional checkpoint integration',
      patterns: {
        'checkpoint-enabled': {
          setup:
            'Module.forRootAsync({ useFactory: (checkpointManager) => ({ checkpointAdapter: new CheckpointManagerAdapter(checkpointManager) }), inject: [CheckpointManagerService] })',
          behavior:
            'Uses CheckpointManagerAdapter for persistent state management',
          modules: [
            'FunctionalApiModule',
            'MultiAgentModule',
            'TimeTravelModule',
          ],
        },
        'checkpoint-disabled': {
          setup: 'Module.forRoot({ /* no checkpointAdapter */ })',
          behavior: 'Uses NoOpCheckpointAdapter for in-memory operation only',
          modules: [
            'MonitoringModule',
            'PlatformModule',
            'WorkflowEngineModule',
          ],
        },
      },
      benefits: [
        'Optional dependency: checkpoint functionality is not required',
        'Backward compatibility: existing code works without changes',
        'Flexible deployment: can enable/disable checkpointing per environment',
        'Clear separation: checkpoint concerns isolated to adapter layer',
        'Type safety: Full TypeScript support for both scenarios',
      ],
      endpoints: {
        '/checkpoint-demo/enabled': 'Demonstrates checkpoint-enabled workflow',
        '/checkpoint-demo/disabled':
          'Demonstrates checkpoint-disabled workflow',
        '/checkpoint-demo/multi-agent':
          'Multi-agent coordination with checkpoints',
        '/checkpoint-demo/time-travel':
          'Time-travel functionality with checkpoints',
        '/checkpoint-demo/comparison': 'Side-by-side pattern comparison',
        '/checkpoint-demo/health': 'Health check for both patterns',
        '/checkpoint-demo/info': 'This information endpoint',
      },
    };
  }
}
