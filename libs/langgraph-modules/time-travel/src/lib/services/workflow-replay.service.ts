import { Injectable, Logger, Inject } from '@nestjs/common';
import { ICheckpointAdapter } from '@hive-academy/langgraph-core';
import {
  ReplayOptions,
  WorkflowExecution,
  CheckpointNotFoundError,
  ReplayOptionsSchema,
} from '../interfaces/time-travel.interface';

/**
 * Service responsible for workflow replay functionality
 * Handles replaying workflows from checkpoints with state modifications
 */
@Injectable()
export class WorkflowReplayService {
  private readonly logger = new Logger(WorkflowReplayService.name);

  constructor(
    @Inject('ICheckpointAdapter')
    private readonly checkpointAdapter: ICheckpointAdapter,
    @Inject('WORKFLOW_REGISTRY')
    private readonly workflowRegistry: Map<string, unknown>
  ) {}

  /**
   * Replay workflow from specific checkpoint with optional modifications
   */
  async replayFromCheckpoint<T extends Record<string, unknown>>(
    threadId: string,
    checkpointId: string,
    options: ReplayOptions<T> = {}
  ): Promise<WorkflowExecution<T>> {
    this.logger.log(
      `Starting replay from checkpoint ${checkpointId} for thread ${threadId}`
    );

    // Validate options
    const validation = ReplayOptionsSchema.safeParse(options);
    if (!validation.success) {
      throw new Error(`Invalid replay options: ${validation.error.message}`);
    }

    // Load the target checkpoint
    const checkpoint = await this.checkpointAdapter.loadCheckpoint<T>(
      threadId,
      checkpointId
    );

    if (!checkpoint) {
      throw new CheckpointNotFoundError(
        `Checkpoint ${checkpointId} not found for thread ${threadId}`,
        threadId,
        checkpointId
      );
    }

    // Create new execution context
    const replayThreadId =
      options.newThreadId ?? `${threadId}_replay_${Date.now()}`;
    const executionId = `exec_${crypto.randomUUID()}`;

    // Apply input modifications if provided
    let modifiedState = checkpoint.channel_values;
    if (options.stateModifications) {
      modifiedState = {
        ...modifiedState,
        ...options.stateModifications,
      };
    }

    // Get workflow definition from checkpoint state
    const workflowName = checkpoint.channel_values?.workflowName as string;
    if (!workflowName) {
      throw new Error('Checkpoint state missing workflow name');
    }

    const workflow = this.workflowRegistry.get(workflowName);
    if (!workflow) {
      throw new Error(`Workflow ${workflowName} not found in registry`);
    }

    // Create execution result
    const execution: WorkflowExecution<T> = {
      executionId,
      threadId: replayThreadId,
      startTime: new Date(),
      state: modifiedState,
      status: 'running',
      checkpoints: [checkpointId],
    };

    try {
      // Execute workflow before hook if provided
      if (options.beforeNodeExecution) {
        await options.beforeNodeExecution('replay-start', modifiedState);
      }

      // Execute using the actual workflow instance
      const workflowRegistration = this.workflowRegistry.get(workflowName);
      if (!workflowRegistration) {
        throw new Error(
          `Workflow ${workflowName} not registered. Available: ${this.getAvailableWorkflows().join(
            ', '
          )}`
        );
      }

      const workflowInstance = (workflowRegistration as any).instance;

      // Determine entry point based on workflow metadata
      const entrypoint =
        (workflowRegistration as any).metadata?.entrypoint || 'execute';

      // Execute the actual workflow method
      const result = await workflowInstance[entrypoint](modifiedState);

      // Execute workflow after hook if provided
      if (options.afterNodeExecution) {
        await options.afterNodeExecution(
          'replay-complete',
          modifiedState,
          result
        );
      }

      // Update execution with results
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.result = result;

      this.logger.log(
        `Workflow replay completed successfully: ${replayThreadId}`
      );
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error as Error;

      this.logger.error(`Workflow replay failed for ${replayThreadId}:`, error);
      throw error;
    }

    return execution;
  }

  /**
   * Replay workflow with custom execution speed
   */
  async replayWithSpeed<T extends Record<string, unknown>>(
    threadId: string,
    checkpointId: string,
    replaySpeed = 1.0,
    options: Omit<ReplayOptions<T>, 'replaySpeed'> = {}
  ): Promise<WorkflowExecution<T>> {
    const replayOptions = {
      ...options,
      replaySpeed,
    };

    // Add artificial delays for slower replay speeds
    if (replaySpeed < 1.0) {
      const originalBeforeHook = options.beforeNodeExecution;
      const originalAfterHook = options.afterNodeExecution;

      replayOptions.beforeNodeExecution = async (nodeId, state) => {
        if (originalBeforeHook) {
          await originalBeforeHook(nodeId, state);
        }
        // Add delay based on replay speed
        const delayMs = 1000 / replaySpeed - 1000;
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      };

      replayOptions.afterNodeExecution = async (nodeId, state, result) => {
        if (originalAfterHook) {
          await originalAfterHook(nodeId, state, result);
        }
        // Add delay after node execution
        const delayMs = 500 / replaySpeed - 500;
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      };
    }

    return this.replayFromCheckpoint(threadId, checkpointId, replayOptions);
  }

  /**
   * Replay workflow for testing purposes with validation
   */
  async replayForTesting<T extends Record<string, unknown>>(
    threadId: string,
    checkpointId: string,
    testScenario: {
      name: string;
      stateModifications: Partial<T>;
      expectedOutcome: {
        status?: 'completed' | 'failed';
        outputContains?: string[];
        stateContains?: Partial<T>;
      };
    }
  ): Promise<{
    passed: boolean;
    execution: WorkflowExecution<T>;
    failures: string[];
  }> {
    const execution = await this.replayFromCheckpoint(threadId, checkpointId, {
      newThreadId: `test_${testScenario.name}_${Date.now()}`,
      stateModifications: testScenario.stateModifications,
      replaySpeed: 2.0, // Faster for testing
    });

    const failures: string[] = [];

    // Validate expected status
    if (
      testScenario.expectedOutcome.status &&
      execution.status !== testScenario.expectedOutcome.status
    ) {
      failures.push(
        `Expected status ${testScenario.expectedOutcome.status}, got ${execution.status}`
      );
    }

    // Validate output contains expected content
    if (testScenario.expectedOutcome.outputContains) {
      const outputStr = JSON.stringify(execution.result || {});
      for (const expectedContent of testScenario.expectedOutcome
        .outputContains) {
        if (!outputStr.includes(expectedContent)) {
          failures.push(
            `Output does not contain expected content: ${expectedContent}`
          );
        }
      }
    }

    // Validate state contains expected values
    if (testScenario.expectedOutcome.stateContains) {
      for (const [key, expectedValue] of Object.entries(
        testScenario.expectedOutcome.stateContains
      )) {
        const actualValue = (execution.state as any)[key];
        if (actualValue !== expectedValue) {
          failures.push(
            `State ${key}: expected ${expectedValue}, got ${actualValue}`
          );
        }
      }
    }

    return {
      passed: failures.length === 0,
      execution,
      failures,
    };
  }

  /**
   * Batch replay multiple checkpoints for comparison
   */
  async batchReplay<T extends Record<string, unknown>>(
    replays: Array<{
      threadId: string;
      checkpointId: string;
      name: string;
      options?: ReplayOptions<T>;
    }>
  ): Promise<
    Array<{
      name: string;
      execution: WorkflowExecution<T>;
      success: boolean;
      error?: Error;
    }>
  > {
    const results = await Promise.allSettled(
      replays.map(async (replay) => {
        const execution = await this.replayFromCheckpoint(
          replay.threadId,
          replay.checkpointId,
          replay.options || {}
        );
        return {
          name: replay.name,
          execution,
          success: execution.status === 'completed',
        };
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: replays[index].name,
          execution: {
            executionId: `failed_${index}`,
            threadId: replays[index].threadId,
            startTime: new Date(),
            status: 'failed' as const,
            checkpoints: [],
            state: {} as T,
          },
          success: false,
          error: result.reason,
        };
      }
    });
  }

  /**
   * Get available workflows for replay
   */
  getAvailableWorkflows(): string[] {
    return Array.from(this.workflowRegistry.keys());
  }

  /**
   * Validate if a workflow can be replayed
   */
  async canReplay(
    threadId: string,
    checkpointId: string
  ): Promise<{
    canReplay: boolean;
    reason?: string;
    workflowName?: string;
  }> {
    try {
      const checkpoint = await this.checkpointAdapter.loadCheckpoint(
        threadId,
        checkpointId
      );

      if (!checkpoint) {
        return {
          canReplay: false,
          reason: `Checkpoint ${checkpointId} not found`,
        };
      }

      const workflowName = (
        checkpoint.channel_values as Record<string, unknown>
      )?.workflowName as string;
      if (!workflowName) {
        return {
          canReplay: false,
          reason: 'Checkpoint missing workflow name',
        };
      }

      const workflow = this.workflowRegistry.get(workflowName);
      if (!workflow) {
        return {
          canReplay: false,
          reason: `Workflow ${workflowName} not registered`,
          workflowName,
        };
      }

      return {
        canReplay: true,
        workflowName,
      };
    } catch (error) {
      return {
        canReplay: false,
        reason: `Error validating replay: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
}
