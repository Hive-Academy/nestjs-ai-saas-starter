import type {
  TimeTravelMetadata,
  BranchMetadata,
  ReplayMetadata,
  CheckpointRestoreMetadata,
  StateComparisonMetadata,
  TimeTravelOperationPayloads,
  CreateBranchMetadata,
  CreateReplayMetadata,
  CreateRestoreMetadata,
  CreateComparisonMetadata,
  TimeTravelCheckpointRecord,
  TimeTravelCheckpointFilter,
} from './time-travel-metadata.interface';

import {
  isTimeTravelMetadata,
  isBranchMetadata,
  isReplayMetadata,
  isRestoreMetadata,
  isComparisonMetadata,
} from './time-travel-metadata.interface';

describe('TimeTravelMetadata Types', () => {
  describe('Type Safety and Generic Support', () => {
    it('should support custom payload types', () => {
      // Custom payload interface
      interface CustomBranchPayload {
        experimentName: string;
        hypothesis: string;
        expectedResults: string[];
      }

      // Should compile without errors with custom payload
      const branchMetadata: BranchMetadata<CustomBranchPayload> = {
        executionId: 'exec_123',
        type: 'progress',
        created_at: new Date().toISOString(),
        timeTravelType: 'branch',
        branchInfo: {
          branchId: 'branch_456',
          branchName: 'experiment-branch',
          parentThreadId: 'thread_789',
          parentCheckpointId: 'checkpoint_abc',
          createdAt: new Date().toISOString(),
          status: 'active',
        },
        payload: {
          experimentName: 'User Behavior Test',
          hypothesis: 'Users will prefer the new UI',
          expectedResults: ['increased engagement', 'better conversion'],
        },
      };

      expect(branchMetadata.payload?.experimentName).toBe('User Behavior Test');
      expect(branchMetadata.branchInfo.status).toBe('active');
    });

    it('should support replay metadata with custom payloads', () => {
      interface CustomReplayPayload {
        testSuite: string;
        environment: 'development' | 'staging' | 'production';
        performanceBaseline: number;
      }

      const replayMetadata: ReplayMetadata<CustomReplayPayload> = {
        executionId: 'exec_replay_123',
        type: 'progress',
        created_at: new Date().toISOString(),
        timeTravelType: 'replay',
        replayInfo: {
          originalThreadId: 'thread_original',
          replayThreadId: 'thread_replay',
          sourceCheckpointId: 'checkpoint_source',
          replayStartTime: new Date().toISOString(),
          status: 'running',
        },
        payload: {
          testSuite: 'integration-tests',
          environment: 'staging',
          performanceBaseline: 2000,
        },
      };

      expect(replayMetadata.payload?.environment).toBe('staging');
      expect(replayMetadata.replayInfo.status).toBe('running');
    });

    it('should support checkpoint restore metadata', () => {
      const restoreMetadata: CheckpointRestoreMetadata<TimeTravelOperationPayloads.RestoreOperationPayload> =
        {
          executionId: 'exec_restore_123',
          type: 'progress',
          created_at: new Date().toISOString(),
          timeTravelType: 'restore',
          restoreInfo: {
            sourceCheckpointId: 'checkpoint_source',
            targetThreadId: 'thread_target',
            restoreTimestamp: new Date().toISOString(),
            strategy: 'overwrite',
          },
          payload: {
            purpose: 'rollback',
            authorization: {
              approvedBy: 'admin@example.com',
              approvalTimestamp: new Date().toISOString(),
              reason: 'Critical bug found in production',
              riskLevel: 'high',
            },
          },
        };

      expect(restoreMetadata.payload?.authorization?.riskLevel).toBe('high');
      expect(restoreMetadata.restoreInfo.strategy).toBe('overwrite');
    });

    it('should support state comparison metadata', () => {
      const comparisonMetadata: StateComparisonMetadata<TimeTravelOperationPayloads.ComparisonOperationPayload> =
        {
          executionId: 'exec_compare_123',
          type: 'progress',
          created_at: new Date().toISOString(),
          timeTravelType: 'compare',
          comparisonInfo: {
            checkpoint1Id: 'checkpoint_1',
            checkpoint2Id: 'checkpoint_2',
            comparisonTimestamp: new Date().toISOString(),
            algorithm: 'deep',
          },
          comparisonResults: {
            identical: false,
            differenceCount: 5,
            addedCount: 2,
            removedCount: 1,
            modifiedCount: 2,
            similarityScore: 0.75,
          },
          payload: {
            purpose: 'debugging',
            scope: {
              fields: ['user', 'session', 'cart'],
              includeMetadata: true,
              maxDepth: 3,
            },
          },
        };

      expect(comparisonMetadata.comparisonResults.similarityScore).toBe(0.75);
      expect(comparisonMetadata.payload?.scope?.maxDepth).toBe(3);
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify time-travel metadata', () => {
      const branchMetadata: BranchMetadata = {
        executionId: 'exec_123',
        type: 'progress',
        created_at: new Date().toISOString(),
        timeTravelType: 'branch',
        branchInfo: {
          branchId: 'branch_456',
          branchName: 'test-branch',
          parentThreadId: 'thread_789',
          parentCheckpointId: 'checkpoint_abc',
          createdAt: new Date().toISOString(),
          status: 'active',
        },
      };

      expect(isTimeTravelMetadata(branchMetadata)).toBe(true);
      expect(isBranchMetadata(branchMetadata)).toBe(true);
      expect(isReplayMetadata(branchMetadata)).toBe(false);
    });

    it('should correctly identify different metadata types', () => {
      const replayMetadata: ReplayMetadata = {
        executionId: 'exec_replay',
        type: 'progress',
        created_at: new Date().toISOString(),
        timeTravelType: 'replay',
        replayInfo: {
          originalThreadId: 'thread_original',
          replayThreadId: 'thread_replay',
          sourceCheckpointId: 'checkpoint_source',
          replayStartTime: new Date().toISOString(),
          status: 'completed',
        },
      };

      expect(isReplayMetadata(replayMetadata)).toBe(true);
      expect(isBranchMetadata(replayMetadata)).toBe(false);
      expect(isRestoreMetadata(replayMetadata)).toBe(false);
    });

    it('should reject invalid metadata', () => {
      const invalidMetadata = {
        timeTravelType: 'invalid',
        someField: 'value',
      };

      expect(isTimeTravelMetadata(invalidMetadata)).toBe(false);
      expect(isBranchMetadata(invalidMetadata)).toBe(false);
    });
  });

  describe('Helper Types and Utilities', () => {
    it('should support checkpoint records with typed metadata', () => {
      interface TestCheckpointData {
        userId: string;
        sessionId: string;
        cart: { items: string[]; total: number };
      }

      const checkpointRecord: TimeTravelCheckpointRecord<
        TestCheckpointData,
        TimeTravelOperationPayloads.BranchOperationPayload
      > = {
        id: 'checkpoint_123',
        thread_id: 'thread_456',
        checkpoint: {
          version: 1,
          data: {
            userId: 'user_789',
            sessionId: 'session_abc',
            cart: {
              items: ['item1', 'item2'],
              total: 99.99,
            },
          },
        },
        metadata: {
          executionId: 'exec_123',
          type: 'progress',
          created_at: new Date().toISOString(),
          timeTravelType: 'branch',
          branchInfo: {
            branchId: 'branch_456',
            branchName: 'test-branch',
            parentThreadId: 'thread_parent',
            parentCheckpointId: 'checkpoint_parent',
            createdAt: new Date().toISOString(),
            status: 'active',
          },
          payload: {
            purpose: 'testing',
            creationStrategy: 'fork',
          },
        },
      };

      expect(checkpointRecord.checkpoint.data.cart.total).toBe(99.99);
      expect(checkpointRecord.metadata.payload?.purpose).toBe('testing');
    });

    it('should support checkpoint filtering with typed metadata', () => {
      const filter: TimeTravelCheckpointFilter<TimeTravelOperationPayloads.BranchOperationPayload> =
        {
          timeTravelType: ['branch', 'replay'],
          branchFilter: {
            status: 'active',
            branchName: 'experiment-*',
          },
          performanceFilter: {
            maxOperationDuration: 5000,
            minStateSize: 1000,
          },
          metadataFilter: (metadata) => {
            return metadata.payload?.purpose === 'testing';
          },
        };

      // Test that the filter function works with typed metadata
      const testMetadata: BranchMetadata<TimeTravelOperationPayloads.BranchOperationPayload> =
        {
          executionId: 'exec_test',
          type: 'progress',
          created_at: new Date().toISOString(),
          timeTravelType: 'branch',
          branchInfo: {
            branchId: 'branch_test',
            branchName: 'test-branch',
            parentThreadId: 'thread_parent',
            parentCheckpointId: 'checkpoint_parent',
            createdAt: new Date().toISOString(),
            status: 'active',
          },
          payload: {
            purpose: 'testing',
          },
        };

      expect(filter.metadataFilter?.(testMetadata)).toBe(true);
    });
  });

  describe('Payload Types', () => {
    it('should support all operation payload types', () => {
      // Branch operation payload
      const branchPayload: TimeTravelOperationPayloads.BranchOperationPayload =
        {
          creationStrategy: 'fork',
          expectedDivergence: 'moderate',
          purpose: 'experiment',
          creator: {
            type: 'user',
            id: 'user_123',
            context: {
              sessionId: 'session_456',
              userAgent: 'Mozilla/5.0...',
            },
          },
          expiration: {
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            autoCleanup: true,
            retentionPolicy: 'experimental-data',
          },
        };

      // Replay operation payload
      const replayPayload: TimeTravelOperationPayloads.ReplayOperationPayload =
        {
          purpose: 'debugging',
          expectedOutcome: 'different',
          testScenario: {
            name: 'Error Reproduction Test',
            description: 'Attempting to reproduce the cart calculation bug',
            expectedResults: {
              errorOccurred: true,
              errorType: 'calculation',
            },
            validationCriteria: ['error logs captured', 'state preserved'],
          },
          monitoring: {
            trackMemory: true,
            trackLatency: true,
            samplingRate: 0.1,
          },
        };

      // Performance payload
      const performancePayload: TimeTravelOperationPayloads.PerformancePayload =
        {
          memory: {
            heapUsed: 45678912,
            heapTotal: 67108864,
            external: 1234567,
            rss: 78901234,
          },
          cpu: {
            processingTime: 1250,
            cpuPercentage: 12.5,
            userTime: 800,
            systemTime: 450,
          },
          timeTravel: {
            checkpointLoadTime: 150,
            stateDiffTime: 75,
            replicationTime: 300,
            validationTime: 25,
          },
        };

      expect(branchPayload.creator?.type).toBe('user');
      expect(replayPayload.testScenario?.name).toBe('Error Reproduction Test');
      expect(performancePayload.timeTravel?.checkpointLoadTime).toBe(150);
    });
  });
});
