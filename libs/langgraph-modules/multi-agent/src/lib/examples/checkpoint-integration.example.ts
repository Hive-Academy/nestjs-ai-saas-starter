/**
 * Example: Multi-Agent Checkpoint Integration
 *
 * This example demonstrates how to:
 * 1. Configure checkpointing for multi-agent networks
 * 2. Create persistent multi-agent workflows
 * 3. Resume workflows from checkpoints
 * 4. Manage checkpoint lifecycle
 */

import { Injectable, Logger } from '@nestjs/common';
import { MultiAgentCoordinatorService } from '../services/multi-agent-coordinator.service';
import type {
  AgentDefinition,
  AgentState,
  MultiAgentResult,
} from '../interfaces/multi-agent.interface';

@Injectable()
export class CheckpointIntegrationExample {
  private readonly logger = new Logger(CheckpointIntegrationExample.name);

  constructor(
    private readonly multiAgentCoordinator: MultiAgentCoordinatorService
  ) {}

  /**
   * Create a persistent research network with checkpoint support
   */
  async createPersistentResearchNetwork(): Promise<string> {
    // Define research agents
    const researcherAgent: AgentDefinition = {
      id: 'researcher',
      name: 'Research Agent',
      description: 'Conducts research and gathers information',
      nodeFunction: async (state: AgentState) => {
        this.logger.log('Researcher: Processing research request');

        // Simulate research work
        await this.delay(1000);

        return {
          messages: [
            ...state.messages,
            {
              content: 'Research completed: Found 3 relevant papers',
              role: 'assistant',
            } as any,
          ],
          scratchpad: `${state.scratchpad || ''}\n- Research phase completed`,
        };
      },
    };

    const analyzerAgent: AgentDefinition = {
      id: 'analyzer',
      name: 'Analysis Agent',
      description: 'Analyzes research data and provides insights',
      nodeFunction: async (state: AgentState) => {
        this.logger.log('Analyzer: Processing analysis request');

        // Simulate analysis work
        await this.delay(1500);

        return {
          messages: [
            ...state.messages,
            {
              content: 'Analysis completed: Key insights extracted',
              role: 'assistant',
            } as any,
          ],
          scratchpad: `${state.scratchpad || ''}\n- Analysis phase completed`,
        };
      },
    };

    const reporterAgent: AgentDefinition = {
      id: 'reporter',
      name: 'Report Agent',
      description: 'Generates final reports from research and analysis',
      nodeFunction: async (state: AgentState) => {
        this.logger.log('Reporter: Generating final report');

        // Simulate report generation
        await this.delay(2000);

        return {
          messages: [
            ...state.messages,
            {
              content: 'Final report generated successfully',
              role: 'assistant',
            } as any,
          ],
          scratchpad: `${
            state.scratchpad || ''
          }\n- Report generation completed`,
        };
      },
    };

    // Create persistent network with automatic checkpointing
    const networkId = await this.multiAgentCoordinator.setupNetwork(
      'research-network-persistent',
      [researcherAgent, analyzerAgent, reporterAgent],
      'supervisor',
      {
        systemPrompt: `You are a research supervisor coordinating a team of specialists.
        Route tasks to the appropriate agent based on the current phase:
        - researcher: for initial data gathering and research
        - analyzer: for data analysis and insights
        - reporter: for final report generation
        
        Each task should be completed in sequence: research → analysis → report.`,
        workers: ['researcher', 'analyzer', 'reporter'],
        enableForwardMessage: true,
        removeHandoffMessages: false, // Keep messages for checkpoint continuity
      }
    );

    this.logger.log(`Created persistent research network: ${networkId}`);
    this.logger.log(
      'Checkpointing is automatically enabled - all workflow state will be persisted'
    );

    return networkId;
  }

  /**
   * Execute a long-running research workflow with automatic checkpointing
   */
  async executePersistentWorkflow(
    networkId: string
  ): Promise<MultiAgentResult> {
    this.logger.log(`Executing persistent workflow: ${networkId}`);

    const result = await this.multiAgentCoordinator.executeWorkflow(networkId, {
      messages: [
        'Please conduct comprehensive research on quantum computing applications in drug discovery, analyze the findings, and generate a final report.',
      ],
      config: {
        configurable: {
          // Enable automatic checkpointing with thread ID
          thread_id: `research-session-${Date.now()}`,
        },
      },
    });

    this.logger.log(
      `Workflow execution completed in ${result.executionTime}ms`
    );
    this.logger.log(
      'All intermediate states have been automatically checkpointed'
    );

    return result;
  }

  /**
   * Demonstrate checkpoint management capabilities
   */
  async demonstrateCheckpointManagement(networkId: string): Promise<void> {
    this.logger.log('=== Checkpoint Management Demo ===');

    // Get checkpoint statistics
    const stats = await this.multiAgentCoordinator.getNetworkCheckpointStats(
      networkId
    );
    this.logger.log(`Checkpoint stats for ${networkId}:`, stats);

    // List recent checkpoints
    const checkpoints = await this.multiAgentCoordinator.getNetworkCheckpoints(
      networkId,
      {
        limit: 5,
      }
    );
    this.logger.log(`Found ${checkpoints.length} recent checkpoints`);

    if (checkpoints.length > 0) {
      const latestCheckpoint = checkpoints[0];
      this.logger.log('Latest checkpoint:', {
        id: latestCheckpoint.config?.configurable?.checkpoint_id,
        timestamp: latestCheckpoint.metadata?.timestamp,
        step: latestCheckpoint.metadata?.step,
      });

      // Demonstrate resuming from checkpoint
      try {
        const resumeResult =
          await this.multiAgentCoordinator.resumeFromCheckpoint(
            networkId,
            latestCheckpoint.config?.configurable?.checkpoint_id,
            {
              messages: [
                'Continue from where we left off and add additional analysis on market impact',
              ],
            }
          );

        this.logger.log('Successfully resumed from checkpoint');
        this.logger.log(
          `Resume execution took ${resumeResult.executionTime}ms`
        );
      } catch (error) {
        this.logger.warn(
          'Could not resume from checkpoint (this is expected in demo):',
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    // Demonstrate checkpoint cleanup (optional)
    // this.logger.log('Cleaning up old checkpoints...');
    // const cleaned = await this.multiAgentCoordinator.clearNetworkCheckpoints(networkId);
    // this.logger.log(`Cleaned up ${cleaned} checkpoints`);
  }

  /**
   * Stream a persistent workflow to show real-time checkpointing
   */
  async *streamPersistentWorkflow(
    networkId: string
  ): AsyncGenerator<any, void, unknown> {
    this.logger.log(`Starting streaming persistent workflow: ${networkId}`);

    const stream = this.multiAgentCoordinator.streamWorkflow(networkId, {
      messages: [
        'Stream a research workflow on artificial intelligence in healthcare, with checkpoints at each major step.',
      ],
      streamMode: 'values',
      config: {
        configurable: {
          thread_id: `streaming-research-${Date.now()}`,
        },
      },
    });

    let stepCount = 0;
    for await (const step of stream) {
      stepCount++;
      this.logger.log(`Step ${stepCount}: Received streaming update`);
      this.logger.log('Current state messages:', step.messages?.length || 0);
      this.logger.log('Scratchpad:', step.scratchpad || 'Empty');

      // Each step is automatically checkpointed
      this.logger.log(`✓ Step ${stepCount} automatically checkpointed`);

      yield {
        step: stepCount,
        state: step,
        timestamp: new Date().toISOString(),
      };
    }

    this.logger.log(
      `Streaming workflow completed with ${stepCount} checkpointed steps`
    );
  }

  /**
   * Demonstrate network-specific checkpoint policies
   */
  async demonstrateAdvancedCheckpointFeatures(
    networkId: string
  ): Promise<void> {
    this.logger.log('=== Advanced Checkpoint Features ===');

    // Get checkpoints with metadata filtering
    const checkpointsWithMetadata =
      await this.multiAgentCoordinator.getNetworkCheckpoints(networkId, {
        limit: 10,
        metadata: {
          networkType: 'supervisor',
          phase: 'analysis',
        },
      });

    this.logger.log(
      `Found ${checkpointsWithMetadata.length} checkpoints with specific metadata`
    );

    // Demonstrate checkpoint inspection
    for (const checkpoint of checkpointsWithMetadata.slice(0, 2)) {
      this.logger.log('Checkpoint details:', {
        id: checkpoint.config?.configurable?.checkpoint_id,
        metadata: checkpoint.metadata,
        messageCount: checkpoint.checkpoint?.messages?.length || 0,
        scratchpadLength: checkpoint.checkpoint?.scratchpad?.length || 0,
      });
    }

    // Get comprehensive checkpoint statistics
    const detailedStats =
      await this.multiAgentCoordinator.getNetworkCheckpointStats(networkId);
    this.logger.log('Detailed checkpoint statistics:', detailedStats);
  }

  /**
   * Complete workflow example with error recovery
   */
  async runCompleteExample(): Promise<void> {
    this.logger.log('🚀 Starting Complete Checkpoint Integration Example');

    try {
      // Step 1: Create persistent network
      const networkId = await this.createPersistentResearchNetwork();

      // Step 2: Execute workflow with automatic checkpointing
      const result = await this.executePersistentWorkflow(networkId);
      this.logger.log('✅ Workflow execution successful', {
        resultKeys: Object.keys(result),
      });

      // Step 3: Demonstrate checkpoint management
      await this.demonstrateCheckpointManagement(networkId);

      // Step 4: Show streaming with checkpointing
      this.logger.log('🌊 Starting streaming demonstration...');
      let streamSteps = 0;
      for await (const step of this.streamPersistentWorkflow(networkId)) {
        streamSteps++;
        this.logger.debug('Stream step:', step);
        if (streamSteps >= 3) break; // Limit for demo
      }

      // Step 5: Advanced checkpoint features
      await this.demonstrateAdvancedCheckpointFeatures(networkId);

      this.logger.log(
        '🎉 Complete checkpoint integration example finished successfully'
      );
    } catch (error) {
      this.logger.error('Example execution failed:', error);

      if (
        error instanceof Error &&
        error.message.includes('CheckpointManager not available')
      ) {
        this.logger.warn(
          '💡 Checkpoint integration requires the global CheckpointModule to be imported in your application'
        );
        this.logger.warn(
          '   Add CheckpointModule.forRoot() to your application imports'
        );
      }
    }
  }

  /**
   * Utility method to simulate work delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Configuration Guide for Checkpoint Integration
 * =============================================
 *
 * To enable checkpoint integration in your application:
 *
 * 1. Install checkpoint dependencies:
 *    npm install @hive-academy/langgraph-checkpoint
 *    npm install @langchain/langgraph-checkpoint-sqlite  # or other checkpoint backend
 *
 * 2. Import CheckpointModule in your app.module.ts:
 *    import { CheckpointModule } from '@hive-academy/langgraph-checkpoint';
 *
 *    @Module({
 *      imports: [
 *        CheckpointModule.forRoot({
 *          checkpoint: {
 *            savers: [
 *              {
 *                type: 'memory',
 *                name: 'default',
 *                default: true,
 *              }
 *            ]
 *          }
 *        }),
 *        MultiAgentModule.forRoot({
 *          checkpointing: {
 *            enabled: true,
 *            enableForAllNetworks: true,
 *            defaultThreadPrefix: 'my-app',
 *          }
 *        }),
 *      ],
 *    })
 *    export class AppModule {}
 *
 * 3. Environment variables (optional):
 *    MULTI_AGENT_CHECKPOINTING_ENABLED=true
 *    MULTI_AGENT_CHECKPOINT_ALL_NETWORKS=true
 *    MULTI_AGENT_CHECKPOINT_THREAD_PREFIX=my-app
 *
 * 4. Use the example service in your controllers:
 *    @Controller('demo')
 *    export class DemoController {
 *      constructor(private readonly exampleService: CheckpointIntegrationExample) {}
 *
 *      @Post('checkpoint-demo')
 *      async runDemo() {
 *        return await this.exampleService.runCompleteExample();
 *      }
 *    }
 */
