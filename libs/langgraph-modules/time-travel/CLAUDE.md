# Time Travel Module - User Manual

## Overview

The **@hive-academy/langgraph-time-travel** module provides sophisticated workflow debugging and state history capabilities for LangGraph workflows, enabling step-by-step execution analysis, state replay, branch management, and comprehensive workflow testing through temporal navigation.

**Key Features:**

- **Workflow Replay** - Replay workflows from any checkpoint with state modifications
- **State History Tracking** - Complete timeline visualization of workflow execution
- **Branch Management** - Create execution branches for experimentation and testing
- **State Comparison** - Deep comparison between checkpoints to identify changes
- **Debug Analysis** - Step-by-step execution analysis with full state visibility
- **Testing Support** - Replay scenarios with different inputs for validation

## Quick Start

### Installation & Setup

```bash
npm install @hive-academy/langgraph-time-travel
```

```typescript
import { Module } from '@nestjs/common';
import { TimeTravelModule } from '@hive-academy/langgraph-time-travel';

@Module({
  imports: [
    TimeTravelModule.forRoot({
      enableBranching: true,
      enableAutoCheckpoint: true,
      maxCheckpointsPerThread: 100,
      maxBranchesPerThread: 10,
      checkpointInterval: 30000,
      storage: {
        type: 'postgres',
        config: {
          compression: 'gzip',
          retentionDays: 30,
          batchSize: 100,
        },
      },
      performance: {
        lazyLoading: true,
        cacheSize: 1000,
        indexOptimization: true,
      },
    }),
  ],
})
export class AppModule {}
```

## Core Services

### TimeTravelService - Primary Interface

**Main orchestrator** for all time travel operations:

```typescript
// Replay workflow from specific checkpoint
replayFromCheckpoint<T>(threadId: string, checkpointId: string, options?: ReplayOptions<T>): Promise<WorkflowExecution<T>>

// Create execution branch for experimentation
createBranch<T>(threadId: string, fromCheckpointId: string, branchOptions: BranchOptions<T>): Promise<string>

// Get detailed execution history
getExecutionHistory(threadId: string, options?: HistoryOptions): Promise<readonly ExecutionHistoryNode[]>

// Compare states between checkpoints
compareCheckpoints<T>(threadId: string, checkpointId1: string, checkpointId2: string): Promise<StateComparison<T>>

// Export history in different formats
exportHistory(threadId: string, format: 'json' | 'csv' | 'mermaid', options?: ExportOptions): Promise<string>
```

### BranchManagerService - Branch Lifecycle

**Advanced branch management** for experimental workflows:

```typescript
// Branch operations
createBranch(threadId: string, fromCheckpointId: string, branchOptions: BranchOptions): Promise<string>
listBranches(threadId: string): Promise<BranchInfo[]>
getBranchInfo(threadId: string, branchId: string): Promise<BranchInfo>
mergeBranch(threadId: string, branchId: string, strategy: MergeStrategy): Promise<void>
deleteBranch(threadId: string, branchId: string): Promise<void>

// Branch comparison and analysis
compareBranches(threadId: string, branchId1: string, branchId2: string): Promise<BranchComparison>
getBranchStats(threadId: string, branchId: string): Promise<BranchStatistics>
```

### Complete Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { TimeTravelService, BranchManagerService } from '@hive-academy/langgraph-time-travel';

interface DebugConfig {
  workflowId: string;
  failurePoint?: string;
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

@Injectable()
export class WorkflowDebuggerService {
  constructor(private readonly timeTravelService: TimeTravelService, private readonly branchManager: BranchManagerService) {}

  async debugWorkflowFailure(failedThreadId: string, config: DebugConfig): Promise<DebugReport> {
    // Step 1: Get execution history to find failure point
    const history = await this.timeTravelService.getExecutionHistory(failedThreadId, {
      nodeType: 'error',
      limit: 10,
      includeChildren: true,
    });

    const failureNode = history[0];
    if (!failureNode) {
      throw new Error('No failure point found in execution history');
    }

    console.log(`Failure detected at node: ${failureNode.nodeId}`);
    console.log(`Error: ${failureNode.error?.message}`);

    // Step 2: Get state before failure for analysis
    const preFailureCheckpoint = failureNode.parentCheckpointId;
    if (!preFailureCheckpoint) {
      throw new Error('No checkpoint before failure found');
    }

    const preFailureState = await this.getCheckpointState(failedThreadId, preFailureCheckpoint);

    // Step 3: Create debug branch for analysis
    const debugBranchId = await this.timeTravelService.createBranch(failedThreadId, preFailureCheckpoint, {
      name: `debug-${Date.now()}`,
      description: `Debug analysis for failure at ${failureNode.nodeId}`,
      stateModifications: {
        debugMode: true,
        logLevel: config.logLevel,
        failureAnalysis: true,
      },
      metadata: {
        originalFailure: failureNode.error?.message,
        debugConfig: config,
      },
    });

    // Step 4: Replay with debug configuration
    const debugReplay = await this.timeTravelService.replayFromCheckpoint(failedThreadId, preFailureCheckpoint, {
      newThreadId: debugBranchId,
      replaySpeed: 0.5, // Slow replay for detailed analysis
      stateModifications: {
        debugMode: true,
        verbose: true,
        errorHandling: 'continue', // Don't stop on errors
      },
      skipNodes: [], // Don't skip any nodes for complete analysis
      beforeNodeExecution: async (nodeId, state) => {
        console.log(`Executing node: ${nodeId}`, { state: this.sanitizeState(state) });
      },
      afterNodeExecution: async (nodeId, state, result) => {
        console.log(`Node ${nodeId} completed`, { result: this.sanitizeResult(result) });
      },
    });

    // Step 5: Analyze differences and provide fix suggestions
    const stateComparison = await this.timeTravelService.compareCheckpoints(failedThreadId, preFailureCheckpoint, failureNode.checkpointId);

    return {
      failureAnalysis: {
        nodeId: failureNode.nodeId,
        errorMessage: failureNode.error?.message,
        errorCode: failureNode.error?.code,
        timestamp: failureNode.timestamp,
      },
      preFailureState,
      stateChanges: stateComparison.differences,
      debugBranchId,
      debugReplayResult: debugReplay,
      recommendations: await this.generateFixRecommendations(stateComparison, failureNode),
    };
  }

  async testWorkflowFix(originalThreadId: string, fixBranchId: string, testScenarios: TestScenario[]): Promise<TestResults> {
    const results: TestResult[] = [];

    for (const scenario of testScenarios) {
      console.log(`Testing scenario: ${scenario.name}`);

      // Create test branch from fix branch
      const testBranchId = await this.timeTravelService.createBranch(originalThreadId, scenario.fromCheckpointId, {
        name: `test-${scenario.name}-${Date.now()}`,
        description: `Testing fix with scenario: ${scenario.description}`,
        stateModifications: scenario.inputModifications,
        metadata: {
          testScenario: scenario.name,
          expectedOutcome: scenario.expectedOutcome,
        },
      });

      try {
        // Execute test
        const testResult = await this.timeTravelService.replayFromCheckpoint(originalThreadId, scenario.fromCheckpointId, {
          newThreadId: testBranchId,
          stateModifications: scenario.inputModifications,
          replaySpeed: 2.0, // Faster replay for testing
        });

        // Validate result
        const passed = await this.validateTestResult(testResult, scenario.expectedOutcome);

        results.push({
          scenarioName: scenario.name,
          passed,
          result: testResult,
          executionTime: testResult.metadata?.executionTime || 0,
          error: testResult.error,
        });

        // Clean up test branch
        await this.branchManager.deleteBranch(originalThreadId, testBranchId);
      } catch (error) {
        results.push({
          scenarioName: scenario.name,
          passed: false,
          error: error.message,
          executionTime: 0,
        });
      }
    }

    return {
      totalTests: testScenarios.length,
      passedTests: results.filter((r) => r.passed).length,
      failedTests: results.filter((r) => !r.passed).length,
      results,
    };
  }

  async createExperimentalBranch(threadId: string, checkpointId: string, experimentConfig: ExperimentConfig): Promise<string> {
    const branchId = await this.timeTravelService.createBranch(threadId, checkpointId, {
      name: `experiment-${experimentConfig.name}`,
      description: experimentConfig.description,
      stateModifications: experimentConfig.modifications,
      metadata: {
        experimentType: experimentConfig.type,
        hypothesis: experimentConfig.hypothesis,
        researcher: experimentConfig.researcher,
        expectedDuration: experimentConfig.expectedDuration,
      },
    });

    console.log(`Created experimental branch: ${branchId}`);
    console.log(`Experiment: ${experimentConfig.name} - ${experimentConfig.description}`);

    return branchId;
  }

  async compareExperimentResults(threadId: string, baselineCheckpointId: string, experimentBranchIds: string[]): Promise<ExperimentComparison> {
    const comparisons: BranchComparison[] = [];

    for (const branchId of experimentBranchIds) {
      const comparison = await this.branchManager.compareBranches(
        threadId,
        'main', // Baseline branch
        branchId
      );

      comparisons.push(comparison);
    }

    return {
      baselineCheckpoint: baselineCheckpointId,
      experimentBranches: experimentBranchIds,
      comparisons,
      winner: this.determineWinningExperiment(comparisons),
      confidence: this.calculateConfidenceScore(comparisons),
    };
  }

  private sanitizeState(state: any): any {
    // Remove sensitive data for logging
    const sanitized = { ...state };
    delete sanitized.apiKeys;
    delete sanitized.passwords;
    delete sanitized.tokens;
    return sanitized;
  }

  private sanitizeResult(result: any): any {
    // Remove sensitive data from results
    if (typeof result === 'object' && result !== null) {
      const sanitized = { ...result };
      delete sanitized.credentials;
      delete sanitized.secrets;
      return sanitized;
    }
    return result;
  }

  private async generateFixRecommendations(comparison: StateComparison, failureNode: ExecutionHistoryNode): Promise<string[]> {
    const recommendations: string[] = [];

    // Analyze state differences for common issues
    for (const diff of comparison.differences) {
      if (diff.path.includes('validation') && diff.type === 'modified') {
        recommendations.push(`Check validation logic for field: ${diff.path}`);
      }

      if (diff.path.includes('null') || diff.value2 === null) {
        recommendations.push(`Handle null values for: ${diff.path}`);
      }

      if (diff.type === 'type-changed') {
        recommendations.push(`Type mismatch detected in: ${diff.path} (${diff.type1} → ${diff.type2})`);
      }
    }

    // Error-specific recommendations
    if (failureNode.error?.message?.includes('timeout')) {
      recommendations.push('Consider increasing timeout values or optimizing performance');
    }

    if (failureNode.error?.message?.includes('validation')) {
      recommendations.push('Review input validation rules and error handling');
    }

    return recommendations;
  }

  private async validateTestResult(result: any, expectedOutcome: any): Promise<boolean> {
    // Implement test validation logic
    if (expectedOutcome.status && result.status !== expectedOutcome.status) {
      return false;
    }

    if (expectedOutcome.outputContains) {
      const output = JSON.stringify(result.output || {});
      return expectedOutcome.outputContains.every((text: string) => output.includes(text));
    }

    return true;
  }

  private determineWinningExperiment(comparisons: BranchComparison[]): string | null {
    // Implement experiment winner determination logic
    let bestBranch: string | null = null;
    let bestScore = -Infinity;

    for (const comparison of comparisons) {
      const score = this.calculateExperimentScore(comparison);
      if (score > bestScore) {
        bestScore = score;
        bestBranch = comparison.branchId;
      }
    }

    return bestBranch;
  }

  private calculateExperimentScore(comparison: BranchComparison): number {
    // Simple scoring based on performance and success rate
    const performanceScore = comparison.performanceImprovement || 0;
    const successScore = comparison.successRate || 0;
    const errorScore = -(comparison.errorRate || 0);

    return performanceScore + successScore + errorScore;
  }

  private calculateConfidenceScore(comparisons: BranchComparison[]): number {
    // Calculate confidence based on statistical significance
    const scores = comparisons.map((c) => this.calculateExperimentScore(c));
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;

    // Higher variance = lower confidence
    return Math.max(0, 1 - variance / 100);
  }

  private async getCheckpointState(threadId: string, checkpointId: string): Promise<any> {
    // Load checkpoint state via checkpoint adapter
    const checkpoint = await this.timeTravelService['checkpointAdapter'].loadCheckpoint(threadId, checkpointId);
    return checkpoint?.channel_values;
  }
}
```

## Configuration

### Basic Configuration

```typescript
TimeTravelModule.forRoot({
  enableBranching: true,
  enableAutoCheckpoint: true,
  maxCheckpointsPerThread: 100,
  checkpointInterval: 30000,
  storage: {
    type: 'memory',
    config: {
      maxSize: 1000,
    },
  },
});
```

### Production Configuration

```typescript
TimeTravelModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    enableBranching: configService.get('TIME_TRAVEL_BRANCHING', true),
    enableAutoCheckpoint: configService.get('TIME_TRAVEL_AUTO_CHECKPOINT', true),
    maxCheckpointsPerThread: configService.get('TIME_TRAVEL_MAX_CHECKPOINTS', 1000),
    maxBranchesPerThread: configService.get('TIME_TRAVEL_MAX_BRANCHES', 20),
    checkpointInterval: configService.get('TIME_TRAVEL_CHECKPOINT_INTERVAL', 30000),
    storage: {
      type: configService.get('TIME_TRAVEL_STORAGE_TYPE', 'postgres'),
      config: {
        compression: 'gzip',
        retentionDays: configService.get('TIME_TRAVEL_RETENTION_DAYS', 30),
        batchSize: 100,
        connectionString: configService.get('DATABASE_URL'),
      },
    },
    performance: {
      lazyLoading: true,
      cacheSize: configService.get('TIME_TRAVEL_CACHE_SIZE', 1000),
      indexOptimization: true,
    },
    security: {
      sanitizeStates: true,
      auditLogging: configService.get('TIME_TRAVEL_AUDIT_LOGGING', true),
      encryptionEnabled: configService.get('TIME_TRAVEL_ENCRYPTION', false),
    },
  }),
  inject: [ConfigService],
});
```

## Advanced Features

### Branch Management & Experimentation

```typescript
@Injectable()
export class ExperimentationService {
  constructor(private readonly timeTravelService: TimeTravelService, private readonly branchManager: BranchManagerService) {}

  async runABTest(threadId: string, baseCheckpointId: string, variants: ABTestVariant[]): Promise<ABTestResults> {
    const results: VariantResult[] = [];

    for (const variant of variants) {
      // Create branch for each variant
      const branchId = await this.timeTravelService.createBranch(threadId, baseCheckpointId, {
        name: `ab-test-${variant.name}`,
        description: `A/B test variant: ${variant.description}`,
        stateModifications: variant.modifications,
        metadata: {
          testType: 'ab-test',
          variant: variant.name,
          trafficPercent: variant.trafficPercent,
        },
      });

      // Execute variant multiple times for statistical significance
      const runs: VariantRun[] = [];
      for (let i = 0; i < variant.sampleSize; i++) {
        const runResult = await this.timeTravelService.replayFromCheckpoint(threadId, baseCheckpointId, {
          newThreadId: `${branchId}-run-${i}`,
          stateModifications: variant.modifications,
          replaySpeed: 5.0, // Fast execution for testing
        });

        runs.push({
          runId: `run-${i}`,
          success: runResult.status === 'success',
          duration: runResult.metadata?.executionTime || 0,
          metrics: await this.extractMetrics(runResult),
        });
      }

      results.push({
        variantName: variant.name,
        branchId,
        runs,
        statistics: this.calculateStatistics(runs),
      });

      // Clean up variant branch
      await this.branchManager.deleteBranch(threadId, branchId);
    }

    return {
      testId: `ab-test-${Date.now()}`,
      baseCheckpoint: baseCheckpointId,
      variants: results,
      winner: this.determineWinner(results),
      significance: this.calculateSignificance(results),
    };
  }

  async createCanaryDeployment(threadId: string, productionCheckpointId: string, canaryConfig: CanaryConfig): Promise<CanaryDeployment> {
    // Create canary branch
    const canaryBranchId = await this.timeTravelService.createBranch(threadId, productionCheckpointId, {
      name: `canary-${canaryConfig.version}`,
      description: `Canary deployment for version ${canaryConfig.version}`,
      stateModifications: canaryConfig.changes,
      metadata: {
        deploymentType: 'canary',
        version: canaryConfig.version,
        trafficPercent: canaryConfig.trafficPercent,
      },
    });

    // Set up monitoring and gradual rollout
    const monitoring = await this.setupCanaryMonitoring(canaryBranchId, canaryConfig);

    return {
      canaryBranchId,
      productionCheckpointId,
      config: canaryConfig,
      monitoring,
      status: 'active',
      createdAt: new Date(),
    };
  }

  private calculateStatistics(runs: VariantRun[]): VariantStatistics {
    const successRate = runs.filter((r) => r.success).length / runs.length;
    const avgDuration = runs.reduce((sum, r) => sum + r.duration, 0) / runs.length;
    const errorRate = 1 - successRate;

    return {
      successRate,
      errorRate,
      averageDuration: avgDuration,
      sampleSize: runs.length,
    };
  }

  private determineWinner(results: VariantResult[]): string {
    return results.reduce((winner, current) => (current.statistics.successRate > winner.statistics.successRate ? current : winner)).variantName;
  }

  private calculateSignificance(results: VariantResult[]): number {
    // Simplified statistical significance calculation
    if (results.length < 2) return 0;

    const [control, test] = results;
    const controlSuccess = control.statistics.successRate;
    const testSuccess = test.statistics.successRate;

    // Simple z-test approximation
    const pooledRate = (controlSuccess + testSuccess) / 2;
    const se = Math.sqrt(pooledRate * (1 - pooledRate) * (2 / control.statistics.sampleSize));
    const zScore = Math.abs(controlSuccess - testSuccess) / se;

    return zScore > 1.96 ? 0.95 : 0.5; // 95% confidence or 50%
  }
}
```

### State Analysis & Debugging

```typescript
@Injectable()
export class StateAnalysisService {
  constructor(private readonly timeTravelService: TimeTravelService) {}

  async analyzeStateEvolution(threadId: string, fieldPath: string, options?: AnalysisOptions): Promise<StateEvolution> {
    const history = await this.timeTravelService.getExecutionHistory(threadId, {
      limit: options?.limit || 100,
      includeChildren: true,
    });

    const evolution: StateChange[] = [];

    for (const node of history) {
      const value = this.getNestedValue(node.state, fieldPath);

      evolution.push({
        checkpointId: node.checkpointId,
        timestamp: node.timestamp,
        nodeId: node.nodeId,
        value,
        valueType: typeof value,
      });
    }

    return {
      fieldPath,
      changes: evolution,
      summary: {
        totalChanges: evolution.length,
        valueTypes: [...new Set(evolution.map((e) => e.valueType))],
        firstValue: evolution[0]?.value,
        lastValue: evolution[evolution.length - 1]?.value,
      },
    };
  }

  async detectAnomalies(threadId: string, anomalyConfig: AnomalyConfig): Promise<Anomaly[]> {
    const history = await this.timeTravelService.getExecutionHistory(threadId);
    const anomalies: Anomaly[] = [];

    for (let i = 1; i < history.length; i++) {
      const current = history[i];
      const previous = history[i - 1];

      // Check for execution time anomalies
      if (current.executionDuration && previous.executionDuration) {
        const durationIncrease = current.executionDuration / previous.executionDuration;

        if (durationIncrease > anomalyConfig.durationThreshold) {
          anomalies.push({
            type: 'performance',
            checkpointId: current.checkpointId,
            nodeId: current.nodeId,
            severity: durationIncrease > 5 ? 'high' : 'medium',
            description: `Execution time increased by ${Math.round((durationIncrease - 1) * 100)}%`,
            value: durationIncrease,
            timestamp: current.timestamp,
          });
        }
      }

      // Check for state size anomalies
      const currentSize = JSON.stringify(current.state).length;
      const previousSize = JSON.stringify(previous.state).length;
      const sizeIncrease = currentSize / previousSize;

      if (sizeIncrease > anomalyConfig.sizeThreshold) {
        anomalies.push({
          type: 'memory',
          checkpointId: current.checkpointId,
          nodeId: current.nodeId,
          severity: sizeIncrease > 10 ? 'high' : 'medium',
          description: `State size increased by ${Math.round((sizeIncrease - 1) * 100)}%`,
          value: sizeIncrease,
          timestamp: current.timestamp,
        });
      }
    }

    return anomalies.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async generateExecutionReport(threadId: string, reportConfig: ReportConfig): Promise<ExecutionReport> {
    const history = await this.timeTravelService.getExecutionHistory(threadId);
    const anomalies = await this.detectAnomalies(threadId, reportConfig.anomalyConfig);

    const nodeStats = this.calculateNodeStatistics(history);
    const performanceMetrics = this.calculatePerformanceMetrics(history);
    const timeline = this.generateTimeline(history);

    return {
      threadId,
      generatedAt: new Date(),
      totalNodes: history.length,
      totalDuration: performanceMetrics.totalDuration,
      nodeStatistics: nodeStats,
      performanceMetrics,
      anomalies,
      timeline,
      recommendations: this.generateRecommendations(nodeStats, anomalies),
    };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private calculateNodeStatistics(history: ExecutionHistoryNode[]): NodeStatistics {
    const nodeTypes = history.reduce((acc, node) => {
      acc[node.nodeType || 'unknown'] = (acc[node.nodeType || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgDuration = history.filter((n) => n.executionDuration).reduce((sum, n) => sum + (n.executionDuration || 0), 0) / history.length;

    return {
      nodeTypes,
      averageExecutionTime: avgDuration,
      slowestNodes: history
        .filter((n) => n.executionDuration)
        .sort((a, b) => (b.executionDuration || 0) - (a.executionDuration || 0))
        .slice(0, 5)
        .map((n) => ({ nodeId: n.nodeId, duration: n.executionDuration || 0 })),
    };
  }
}
```

## Core Interfaces

### Time Travel Types

```typescript
interface ReplayOptions<T = Record<string, unknown>> {
  newThreadId?: string;
  stateModifications?: Partial<T>;
  replaySpeed?: number;
  skipNodes?: string[];
  beforeNodeExecution?: (nodeId: string, state: T) => Promise<void>;
  afterNodeExecution?: (nodeId: string, state: T, result: any) => Promise<void>;
}

interface BranchOptions<T = Record<string, unknown>> {
  name: string;
  description?: string;
  stateModifications?: Partial<T>;
  metadata?: Record<string, unknown>;
}

interface ExecutionHistoryNode {
  checkpointId: string;
  threadId: string;
  nodeId: string;
  timestamp: Date;
  state: unknown;
  parentCheckpointId?: string;
  branchId?: string;
  branchName?: string;
  workflowName?: string;
  executionDuration?: number;
  nodeType?: 'start' | 'end' | 'task' | 'decision' | 'parallel' | 'error';
  error?: { message: string; code?: string; stack?: string };
  children?: readonly ExecutionHistoryNode[];
}

interface StateComparison<T = Record<string, unknown>> {
  identical: boolean;
  differences: readonly StateDifference[];
  added: readonly string[];
  removed: readonly string[];
  modified: readonly string[];
  state1: T;
  state2: T;
}
```

### Configuration Types

```typescript
interface TimeTravelConfig {
  enableBranching: boolean;
  enableAutoCheckpoint: boolean;
  maxCheckpointsPerThread: number;
  maxBranchesPerThread: number;
  checkpointInterval: number;
  storage: StorageConfig;
  performance?: PerformanceConfig;
  security?: SecurityConfig;
}

interface StorageConfig {
  type: 'memory' | 'redis' | 'postgres' | 'sqlite';
  config: {
    compression?: 'gzip' | 'lz4';
    retentionDays?: number;
    batchSize?: number;
    [key: string]: any;
  };
}
```

## Error Handling

```typescript
import { CheckpointNotFoundError, BranchNotFoundError, ReplayFailedError } from '@hive-academy/langgraph-time-travel';

@Injectable()
export class RobustTimeTravelService {
  constructor(private readonly timeTravelService: TimeTravelService) {}

  async safeReplay<T>(threadId: string, checkpointId: string, options: ReplayOptions<T>): Promise<WorkflowExecution<T> | null> {
    try {
      return await this.timeTravelService.replayFromCheckpoint(threadId, checkpointId, options);
    } catch (error) {
      if (error instanceof CheckpointNotFoundError) {
        this.logger.warn(`Checkpoint ${checkpointId} not found, cannot replay`);
        return null;
      } else if (error instanceof ReplayFailedError) {
        this.logger.error('Replay failed:', error.message);
        // Attempt with simplified state
        return this.attemptSimplifiedReplay(threadId, checkpointId, options);
      } else if (error instanceof BranchNotFoundError) {
        this.logger.error('Branch not found:', error.message);
        return null;
      }
      throw error;
    }
  }

  private async attemptSimplifiedReplay<T>(threadId: string, checkpointId: string, options: ReplayOptions<T>): Promise<WorkflowExecution<T> | null> {
    // Retry with simplified state modifications
    const simplifiedOptions = {
      ...options,
      stateModifications: this.simplifyState(options.stateModifications),
      skipNodes: [...(options.skipNodes || []), 'expensive-computation'],
    };

    try {
      return await this.timeTravelService.replayFromCheckpoint(threadId, checkpointId, simplifiedOptions);
    } catch (error) {
      this.logger.error('Simplified replay also failed:', error.message);
      return null;
    }
  }

  private simplifyState<T>(state: Partial<T> | undefined): Partial<T> | undefined {
    if (!state) return undefined;

    // Remove potentially problematic fields
    const simplified = { ...state };
    delete simplified['complexObjects'];
    delete simplified['largeArrays'];
    delete simplified['circularReferences'];

    return simplified;
  }
}
```

## Testing

### Unit Testing

```typescript
import { Test } from '@nestjs/testing';
import { TimeTravelModule, TimeTravelService } from '@hive-academy/langgraph-time-travel';

describe('TimeTravelService', () => {
  let service: TimeTravelService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        TimeTravelModule.forRoot({
          enableBranching: true,
          enableAutoCheckpoint: false,
          maxCheckpointsPerThread: 10,
          storage: { type: 'memory', config: {} },
        }),
      ],
    }).compile();

    service = module.get<TimeTravelService>(TimeTravelService);
  });

  it('should replay from checkpoint with modifications', async () => {
    const mockCheckpoint = {
      id: 'checkpoint-1',
      thread_id: 'thread-1',
      channel_values: { step: 1, data: 'original' },
    };

    const replayResult = await service.replayFromCheckpoint('thread-1', 'checkpoint-1', {
      stateModifications: { data: 'modified' },
      replaySpeed: 1.0,
    });

    expect(replayResult.status).toBe('running');
    expect(replayResult.initialState).toMatchObject({ data: 'modified' });
  });

  it('should create and manage branches', async () => {
    const branchId = await service.createBranch('thread-1', 'checkpoint-1', {
      name: 'test-branch',
      description: 'Test branch for unit testing',
      stateModifications: { testMode: true },
    });

    expect(branchId).toBeDefined();
    expect(typeof branchId).toBe('string');

    const branches = await service.listBranches('thread-1');
    expect(branches).toHaveLength(1);
    expect(branches[0].name).toBe('test-branch');
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Checkpoint Not Found Errors

```typescript
// Solution: Implement checkpoint validation
async validateCheckpointExists(threadId: string, checkpointId: string): Promise<boolean> {
  try {
    const history = await this.timeTravelService.getExecutionHistory(threadId);
    return history.some(node => node.checkpointId === checkpointId);
  } catch (error) {
    return false;
  }
}
```

#### 2. Memory Usage from State Storage

```typescript
// Solution: Implement state compression and cleanup
const config: TimeTravelConfig = {
  storage: {
    type: 'postgres',
    config: {
      compression: 'gzip',
      retentionDays: 7, // Shorter retention
      batchSize: 50, // Smaller batches
    },
  },
  performance: {
    lazyLoading: true,
    cacheSize: 500, // Smaller cache
  },
};
```

#### 3. Slow Replay Performance

```typescript
// Solution: Optimize replay with selective execution
async optimizedReplay(threadId: string, checkpointId: string): Promise<any> {
  return this.timeTravelService.replayFromCheckpoint(threadId, checkpointId, {
    replaySpeed: 5.0,  // Faster replay
    skipNodes: ['expensive-computation', 'external-api-call'],
    stateModifications: { fastMode: true }
  });
}
```

This comprehensive time travel module provides sophisticated workflow debugging, state analysis, and experimental capabilities for building robust and maintainable LangGraph AI applications.
