import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { Subject } from 'rxjs';

import { TokenStreamingService } from '../../lib/streaming/token-streaming.service';
import { WebSocketBridgeService } from '../../lib/streaming/websocket-bridge.service';
import { ToolDiscoveryService } from '../../lib/tools/tool-discovery.service';
import { ToolRegistryService } from '../../lib/tools/tool-registry.service';
import { HumanApprovalService } from '../../lib/hitl/human-approval.service';
import { ConfidenceEvaluatorService } from '../../lib/hitl/confidence-evaluator.service';
import { ApprovalChainService } from '../../lib/hitl/approval-chain.service';
import { FeedbackProcessorService } from '../../lib/hitl/feedback-processor.service';
import { MetadataProcessorService } from '../../lib/core/metadata-processor.service';

import { StreamEventType } from '../../lib/constants';
import { WorkflowState } from '../../lib/interfaces/workflow.interface';
import { StreamTokenMetadata } from '../../lib/decorators/streaming.decorator';
import { ApprovalRiskLevel } from '../../lib/decorators/approval.decorator';

// Mock implementations for testing
const createMockWorkflowState = (overrides: any = {}) => ({
  executionId: 'test-exec-123',
  input: 'test input',
  currentNode: 'start',
  status: 'active' as const,
  startedAt: new Date(),
  ...overrides
});

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

const mockTokenStreamingService = {
  initializeTokenStream: jest.fn().mockResolvedValue(undefined),
  streamToken: jest.fn(),
  closeTokenStream: jest.fn(),
  closeExecutionTokenStreams: jest.fn(),
  getActiveTokenStreams: jest.fn().mockReturnValue([]),
  getTokenStats: jest.fn().mockReturnValue({
    pipe: jest.fn().mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({ activeStreams: 1, totalTokensProcessed: 100 })
    })
  })
};

const mockWebSocketBridgeService = {
  registerClient: jest.fn(),
  unregisterClient: jest.fn(),
  broadcast: jest.fn(),
  joinRoom: jest.fn(),
  leaveRoom: jest.fn(),
  broadcastToRoom: jest.fn(),
};

const mockToolDiscoveryService = {
  performFullDiscovery: jest.fn().mockResolvedValue({ totalTools: 5, providersScanned: 2 }),
  getDiscoveryStats: jest.fn().mockReturnValue({ totalTools: 5, providersScanned: 2 }),
  validateToolConfiguration: jest.fn().mockResolvedValue({ valid: ['tool1'], invalid: [] }),
  discoveryService: {
    getProviders: jest.fn().mockReturnValue([])
  }
};

const mockToolRegistryService = {
  getToolsForAgent: jest.fn().mockReturnValue([{ name: 'test-tool' }]),
  getTool: jest.fn().mockReturnValue({ invoke: jest.fn().mockResolvedValue({ result: 'success' }) }),
  getAllTools: jest.fn().mockReturnValue([]),
  getToolMetadata: jest.fn().mockReturnValue({ name: 'test-tool', description: 'Test tool' }),
};

const mockHumanApprovalService = {
  requestApproval: jest.fn().mockResolvedValue({ id: 'approval-123', executionId: 'test-exec' }),
  processApprovalResponse: jest.fn().mockResolvedValue({ success: true, nextState: { approvalReceived: true } }),
  getApprovalRequest: jest.fn().mockReturnValue({ id: 'approval-123' }),
  getApprovalStats: jest.fn().mockReturnValue({ total: 1, byState: { in_progress: 0 } }),
  getPendingApprovals: jest.fn().mockReturnValue([]),
  cancelApproval: jest.fn().mockResolvedValue({ success: true }),
};

const mockConfidenceEvaluatorService = {
  evaluateConfidence: jest.fn().mockResolvedValue(0.8),
  assessRisk: jest.fn().mockResolvedValue({ level: 'medium', factors: ['complexity'] }),
};

const mockMetadataProcessorService = {
  extractWorkflowDefinition: jest.fn(),
  validateWorkflowDefinition: jest.fn(),
};

class MockWebSocket {
  send = jest.fn();
  close = jest.fn();
  readyState = 1;
}

const resetAllMocks = () => {
  jest.clearAllMocks();
};

const TEST_TIMEOUT = {
  UNIT: 5000,
  INTEGRATION: 30000,
  E2E: 60000,
};

const waitForAsync = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Phase 2 Performance Tests', () => {
  let module: TestingModule;
  let tokenStreamingService: TokenStreamingService;
  let webSocketBridgeService: WebSocketBridgeService;
  let toolDiscoveryService: ToolDiscoveryService;
  let toolRegistryService: ToolRegistryService;
  let humanApprovalService: HumanApprovalService;
  let confidenceEvaluatorService: ConfidenceEvaluatorService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        {
          provide: TokenStreamingService,
          useValue: mockTokenStreamingService,
        },
        {
          provide: WebSocketBridgeService,
          useValue: mockWebSocketBridgeService,
        },
        {
          provide: ToolDiscoveryService,
          useValue: mockToolDiscoveryService,
        },
        {
          provide: ToolRegistryService,
          useValue: mockToolRegistryService,
        },
        {
          provide: HumanApprovalService,
          useValue: mockHumanApprovalService,
        },
        {
          provide: ConfidenceEvaluatorService,
          useValue: mockConfidenceEvaluatorService,
        },
        {
          provide: ApprovalChainService,
          useValue: {
            processApproval: jest.fn(),
            escalateApproval: jest.fn(),
          },
        },
        {
          provide: FeedbackProcessorService,
          useValue: {
            processFeedback: jest.fn(),
            aggregateFeedback: jest.fn(),
          },
        },
        {
          provide: MetadataProcessorService,
          useValue: mockMetadataProcessorService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
        // Mock dependencies
        {
          provide: 'DiscoveryService',
          useValue: {
            getProviders: jest.fn().mockReturnValue([])
          }
        },
        {
          provide: 'MetadataScanner',
          useValue: {
            getAllMethodNames: jest.fn().mockReturnValue([]),
            scanFromPrototype: jest.fn()
          }
        },
        {
          provide: 'Reflector',
          useValue: {
            get: jest.fn(),
            getMetadata: jest.fn()
          }
        },
        {
          provide: 'ModuleRef',
          useValue: {
            get: jest.fn().mockReturnValue({})
          }
        },
      ],
    }).compile();

    tokenStreamingService = module.get<TokenStreamingService>(TokenStreamingService);
    webSocketBridgeService = module.get<WebSocketBridgeService>(WebSocketBridgeService);
    toolDiscoveryService = module.get<ToolDiscoveryService>(ToolDiscoveryService);
    toolRegistryService = module.get<ToolRegistryService>(ToolRegistryService);
    humanApprovalService = module.get<HumanApprovalService>(HumanApprovalService);
    confidenceEvaluatorService = module.get<ConfidenceEvaluatorService>(ConfidenceEvaluatorService);

    await module.init();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Token Streaming Performance', () => {
    const PERFORMANCE_THRESHOLDS = {
      tokensPerSecond: 1000,
      maxLatencyMs: 100,
      maxMemoryIncreaseMB: 50,
    };

    it('should handle high-volume token streaming efficiently', async () => {
      const executionId = 'perf-test-tokens';
      const nodeId = 'high-volume-node';
      const tokenCount = 10000;
      
      // Initialize stream
      await tokenStreamingService.initializeTokenStream({
        executionId,
        nodeId,
        config: {
          enabled: true,
          bufferSize: 100,
          flushInterval: 50,
          format: 'text',
          methodName: 'perfTest',
        },
      });

      // Measure initial memory
      const initialMemory = process.memoryUsage();
      const startTime = Date.now();

      // Stream large number of tokens
      for (let i = 0; i < tokenCount; i++) {
        tokenStreamingService.streamToken(executionId, nodeId, `token-${i}`, { index: i });
      }

      // Allow processing to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      const endTime = Date.now();
      const finalMemory = process.memoryUsage();
      const duration = endTime - startTime;
      const tokensPerSecond = tokenCount / (duration / 1000);
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;

      // Performance assertions
      expect(tokensPerSecond).toBeGreaterThan(PERFORMANCE_THRESHOLDS.tokensPerSecond);
      expect(duration).toBeLessThan(tokenCount / PERFORMANCE_THRESHOLDS.tokensPerSecond * 1000 + PERFORMANCE_THRESHOLDS.maxLatencyMs);
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.maxMemoryIncreaseMB);

      console.log(`Token Streaming Performance:
        - Tokens/second: ${tokensPerSecond.toFixed(0)}
        - Duration: ${duration}ms
        - Memory increase: ${memoryIncrease.toFixed(2)}MB
        - Total tokens processed: ${tokenCount}`);

      // Cleanup
      tokenStreamingService.closeTokenStream(executionId, nodeId);
    }, 30000);

    it('should maintain performance under concurrent streaming', async () => {
      const concurrentStreams = 20;
      const tokensPerStream = 500;
      const promises: Promise<void>[] = [];

      const startTime = Date.now();

      // Create concurrent token streams
      for (let streamIndex = 0; streamIndex < concurrentStreams; streamIndex++) {
        const executionId = `concurrent-${streamIndex}`;
        const nodeId = 'concurrent-node';

        promises.push(
          tokenStreamingService.initializeTokenStream({
            executionId,
            nodeId,
            config: {
              enabled: true,
              bufferSize: 50,
              flushInterval: 25,
              format: 'text',
              methodName: 'concurrentTest',
            },
          }).then(() => {
            // Stream tokens for this stream
            for (let tokenIndex = 0; tokenIndex < tokensPerStream; tokenIndex++) {
              tokenStreamingService.streamToken(
                executionId,
                nodeId,
                `stream-${streamIndex}-token-${tokenIndex}`,
                { streamIndex, tokenIndex }
              );
            }
          })
        );
      }

      await Promise.all(promises);

      // Allow processing to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      const totalTokens = concurrentStreams * tokensPerStream;
      const tokensPerSecond = totalTokens / (totalDuration / 1000);

      expect(tokensPerSecond).toBeGreaterThan(PERFORMANCE_THRESHOLDS.tokensPerSecond / 2); // Allow some reduction for concurrency overhead
      expect(totalDuration).toBeLessThan(30000); // Should complete within 30 seconds

      console.log(`Concurrent Streaming Performance:
        - Concurrent streams: ${concurrentStreams}
        - Tokens per stream: ${tokensPerStream}
        - Total tokens: ${totalTokens}
        - Duration: ${totalDuration}ms
        - Tokens/second: ${tokensPerSecond.toFixed(0)}`);

      // Cleanup
      for (let i = 0; i < concurrentStreams; i++) {
        tokenStreamingService.closeExecutionTokenStreams(`concurrent-${i}`);
      }
    }, 45000);

    it('should handle WebSocket streaming under load', async () => {
      const connectionCount = 50;
      const messagesPerConnection = 100;
      const mockConnections: any[] = [];

      // Create mock WebSocket connections
      for (let i = 0; i < connectionCount; i++) {
        const mockConnection = {
          send: jest.fn(),
          close: jest.fn(),
          readyState: 1,
          subject: new Subject(),
        };
        mockConnections.push(mockConnection);
        webSocketBridgeService.registerClient(`ws-perf-${i}`, mockConnection.subject, { executionId: `ws-perf-${i}` });
      }

      const startTime = Date.now();

      // Send messages through WebSocket bridge
      const promises = mockConnections.map((connection, index) => {
        return new Promise<void>((resolve) => {
          for (let msgIndex = 0; msgIndex < messagesPerConnection; msgIndex++) {
            const message = {
              type: 'test_message',
              data: `Message ${msgIndex} for connection ${index}`,
              timestamp: new Date(),
            };
            
            // Simulate sending message
            setTimeout(() => {
              connection.send(JSON.stringify(message));
              if (msgIndex === messagesPerConnection - 1) {
                resolve();
              }
            }, msgIndex * 10); // Stagger messages
          }
        });
      });

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;
      const totalMessages = connectionCount * messagesPerConnection;
      const messagesPerSecond = totalMessages / (duration / 1000);

      expect(messagesPerSecond).toBeGreaterThan(100); // Should handle > 100 messages/second
      expect(duration).toBeLessThan(60000); // Should complete within 1 minute

      console.log(`WebSocket Performance:
        - Connections: ${connectionCount}
        - Messages per connection: ${messagesPerConnection}
        - Total messages: ${totalMessages}
        - Duration: ${duration}ms
        - Messages/second: ${messagesPerSecond.toFixed(0)}`);

      // Verify all messages were sent
      mockConnections.forEach(connection => {
        expect(connection.send).toHaveBeenCalledTimes(messagesPerConnection);
      });

      // Cleanup
      mockConnections.forEach((_, index) => {
        webSocketBridgeService.unregisterClient(`ws-perf-${index}`);
      });
    }, 90000);
  });

  describe('Tool Discovery Performance', () => {
    it('should handle tool discovery at scale', async () => {
      // Mock large number of providers
      const providerCount = 100;
      const toolsPerProvider = 10;

      const mockProviders = Array.from({ length: providerCount }, (_, i) => ({
        instance: {
          constructor: {
            name: `MockProvider${i}`
          }
        }
      }));

      // Mock discovery service
      toolDiscoveryService['discoveryService'].getProviders = jest.fn().mockReturnValue(mockProviders);

      const startTime = Date.now();
      await toolDiscoveryService.performFullDiscovery();
      const endTime = Date.now();

      const duration = endTime - startTime;
      const providersPerSecond = providerCount / (duration / 1000);

      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(providersPerSecond).toBeGreaterThan(5); // Should process > 5 providers/second

      console.log(`Tool Discovery Performance:
        - Providers: ${providerCount}
        - Duration: ${duration}ms
        - Providers/second: ${providersPerSecond.toFixed(2)}`);
    }, 45000);

    it('should validate tools efficiently', async () => {
      const toolCount = 1000;

      // Mock large number of tools
      const mockTools = Array.from({ length: toolCount }, (_, i) => ({
        name: `tool_${i}`,
        description: `Test tool ${i}`,
      }));

      toolRegistryService.getAllTools = jest.fn().mockReturnValue(mockTools);
      toolRegistryService.getToolMetadata = jest.fn().mockImplementation((name) => ({
        name,
        description: `Description for ${name}`,
        agents: ['architect'],
      }));

      const startTime = Date.now();
      const validation = await toolDiscoveryService.validateToolConfiguration();
      const endTime = Date.now();

      const duration = endTime - startTime;
      const toolsPerSecond = toolCount / (duration / 1000);

      expect(validation.valid.length + validation.invalid.length).toBe(toolCount);
      expect(toolsPerSecond).toBeGreaterThan(100); // Should validate > 100 tools/second
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      console.log(`Tool Validation Performance:
        - Tools: ${toolCount}
        - Valid: ${validation.valid.length}
        - Invalid: ${validation.invalid.length}
        - Duration: ${duration}ms
        - Tools/second: ${toolsPerSecond.toFixed(0)}`);
    }, 45000);
  });

  describe('Human Approval Performance', () => {
    const createMockState = (id: string): WorkflowState => createMockWorkflowState({
      executionId: id,
      input: 'Test input',
      currentNode: 'test-node',
      confidence: 0.5,
    });

    it('should handle high-volume approval requests', async () => {
      const requestCount = 1000;
      const batchSize = 50;
      
      const startTime = Date.now();
      const requests: any[] = [];

      // Create approval requests in batches
      for (let i = 0; i < requestCount; i += batchSize) {
        const batchPromises = [];
        
        for (let j = 0; j < batchSize && (i + j) < requestCount; j++) {
          const requestId = `perf-request-${i + j}`;
          const state = createMockState(requestId);
          
          batchPromises.push(
            humanApprovalService.requestApproval(
              requestId,
              'perf-node',
              `Performance test request ${i + j}`,
              state,
              {
                confidenceThreshold: 0.8,
                timeoutMs: 300000, // 5 minutes
              }
            )
          );
        }
        
        const batchResults = await Promise.all(batchPromises);
        requests.push(...batchResults);
        
        // Small delay between batches to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const requestsPerSecond = requestCount / (duration / 1000);

      expect(requests.length).toBe(requestCount);
      expect(requestsPerSecond).toBeGreaterThan(50); // Should handle > 50 requests/second
      expect(duration).toBeLessThan(60000); // Should complete within 1 minute

      console.log(`Approval Request Performance:
        - Requests: ${requestCount}
        - Duration: ${duration}ms
        - Requests/second: ${requestsPerSecond.toFixed(0)}
        - Memory usage: ${JSON.stringify(process.memoryUsage(), null, 2)}`);

      // Verify all requests were created properly
      const stats = humanApprovalService.getApprovalStats();
      expect(stats.total).toBe(requestCount);
    }, 90000);

    it('should process approval responses efficiently', async () => {
      const responseCount = 500;
      
      // Create approval requests first
      const requests: any[] = [];
      for (let i = 0; i < responseCount; i++) {
        const requestId = `response-perf-${i}`;
        const state = createMockState(requestId);
        const request = await humanApprovalService.requestApproval(
          requestId,
          'response-node',
          `Response test ${i}`,
          state
        );
        requests.push(request);
      }

      // Process responses
      const startTime = Date.now();
      const results = await Promise.all(
        requests.map((request, index) => {
          const response = {
            requestId: request.id,
            decision: index % 2 === 0 ? 'approved' as const : 'rejected' as const,
            approver: { id: `user-${index}`, name: `User ${index}`, role: 'developer' },
            timestamp: new Date(),
          };
          
          return humanApprovalService.processApprovalResponse(request.id, response);
        })
      );

      const endTime = Date.now();
      const duration = endTime - startTime;
      const responsesPerSecond = responseCount / (duration / 1000);

      expect(results.every(result => result.success)).toBe(true);
      expect(responsesPerSecond).toBeGreaterThan(100); // Should process > 100 responses/second
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      console.log(`Approval Response Performance:
        - Responses: ${responseCount}
        - Duration: ${duration}ms
        - Responses/second: ${responsesPerSecond.toFixed(0)}`);
    }, 90000);

    it('should handle concurrent approval workflows', async () => {
      const concurrentWorkflows = 20;
      const approvalsPerWorkflow = 25;
      
      const startTime = Date.now();
      
      const workflowPromises = Array.from({ length: concurrentWorkflows }, async (_, workflowIndex) => {
        const approvals = [];
        
        // Create approvals for this workflow
        for (let approvalIndex = 0; approvalIndex < approvalsPerWorkflow; approvalIndex++) {
          const executionId = `workflow-${workflowIndex}`;
          const state = createMockState(`${executionId}-approval-${approvalIndex}`);
          
          const request = await humanApprovalService.requestApproval(
            executionId,
            `node-${approvalIndex}`,
            `Workflow ${workflowIndex} approval ${approvalIndex}`,
            state
          );
          
          approvals.push(request);
        }
        
        // Process half the approvals
        const responsesToProcess = approvals.slice(0, Math.floor(approvalsPerWorkflow / 2));
        await Promise.all(
          responsesToProcess.map((request, index) => 
            humanApprovalService.processApprovalResponse(request.id, {
              requestId: request.id,
              decision: 'approved' as const,
              approver: { id: `user-${workflowIndex}-${index}`, name: `User ${workflowIndex}-${index}`, role: 'developer' },
              timestamp: new Date(),
            })
          )
        );
        
        return approvals.length;
      });
      
      const results = await Promise.all(workflowPromises);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      const totalApprovals = results.reduce((sum, count) => sum + count, 0);
      const approvalsPerSecond = totalApprovals / (duration / 1000);
      
      expect(totalApprovals).toBe(concurrentWorkflows * approvalsPerWorkflow);
      expect(approvalsPerSecond).toBeGreaterThan(20); // Should handle > 20 approvals/second
      expect(duration).toBeLessThan(60000); // Should complete within 1 minute

      console.log(`Concurrent Approval Performance:
        - Workflows: ${concurrentWorkflows}
        - Approvals per workflow: ${approvalsPerWorkflow}
        - Total approvals: ${totalApprovals}
        - Duration: ${duration}ms
        - Approvals/second: ${approvalsPerSecond.toFixed(0)}`);
    }, 90000);
  });

  describe('Confidence Evaluation Performance', () => {
    it('should evaluate confidence efficiently at scale', async () => {
      const evaluationCount = 10000;
      const states: WorkflowState[] = [];
      
      // Generate test states
      for (let i = 0; i < evaluationCount; i++) {
        states.push({
          executionId: `eval-${i}`,
          input: `Test input ${i}`,
          currentNode: 'eval-node',
          metadata: {
            complexity: Math.random(),
            reliability: Math.random(),
            userFeedback: Math.random(),
            testCoverage: Math.random(),
            performance: Math.random(),
          },
          confidence: i % 3 === 0 ? Math.random() : 0.5, // Mix of existing and calculated confidence
        });
      }

      const startTime = Date.now();
      
      // Perform evaluations in batches
      const batchSize = 100;
      const results: number[] = [];
      
      for (let i = 0; i < evaluationCount; i += batchSize) {
        const batch = states.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(state => confidenceEvaluatorService.evaluateConfidence(state))
        );
        results.push(...batchResults);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const evaluationsPerSecond = evaluationCount / (duration / 1000);

      expect(results.length).toBe(evaluationCount);
      expect(results.every(confidence => confidence >= 0 && confidence <= 1)).toBe(true);
      expect(evaluationsPerSecond).toBeGreaterThan(1000); // Should handle > 1000 evaluations/second
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      console.log(`Confidence Evaluation Performance:
        - Evaluations: ${evaluationCount}
        - Duration: ${duration}ms
        - Evaluations/second: ${evaluationsPerSecond.toFixed(0)}
        - Average confidence: ${(results.reduce((sum, conf) => sum + conf, 0) / results.length).toFixed(3)}`);
    }, 45000);

    it('should perform risk assessments efficiently', async () => {
      const assessmentCount = 5000;
      const states: WorkflowState[] = Array.from({ length: assessmentCount }, (_, i) => createMockWorkflowState({
        executionId: `risk-${i}`,
        input: `Risk test ${i}`,
        currentNode: 'risk-node',
        metadata: {
          complexity: Math.random(),
          impact: Math.random(),
          reversibility: Math.random(),
          dataSize: Math.floor(Math.random() * 1000000),
          userCount: Math.floor(Math.random() * 100000),
        },
        confidence: Math.random(),
      }));

      const startTime = Date.now();
      
      const riskAssessments = await Promise.all(
        states.map(state => confidenceEvaluatorService.assessRisk(state, {
          factors: ['complexity', 'impact', 'reversibility']
        }))
      );

      const endTime = Date.now();
      const duration = endTime - startTime;
      const assessmentsPerSecond = assessmentCount / (duration / 1000);

      expect(riskAssessments.length).toBe(assessmentCount);
      expect(riskAssessments.every(assessment => 
        Object.values(ApprovalRiskLevel).includes(assessment.level)
      )).toBe(true);
      expect(assessmentsPerSecond).toBeGreaterThan(500); // Should handle > 500 assessments/second
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      // Analyze risk distribution
      const riskDistribution = riskAssessments.reduce((dist, assessment) => {
        dist[assessment.level] = (dist[assessment.level] || 0) + 1;
        return dist;
      }, {} as Record<ApprovalRiskLevel, number>);

      console.log(`Risk Assessment Performance:
        - Assessments: ${assessmentCount}
        - Duration: ${duration}ms
        - Assessments/second: ${assessmentsPerSecond.toFixed(0)}
        - Risk distribution: ${JSON.stringify(riskDistribution)}`);
    }, 45000);
  });

  describe('Memory and Resource Management', () => {
    it('should maintain stable memory usage during extended operation', async () => {
      const operationDuration = 30000; // 30 seconds
      const measurementInterval = 1000; // 1 second
      const memoryMeasurements: number[] = [];
      
      const startTime = Date.now();
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Start continuous operations
      const operations = [
        // Continuous token streaming
        async () => {
          while (Date.now() - startTime < operationDuration) {
            const execId = `mem-test-${Date.now()}`;
            await tokenStreamingService.initializeTokenStream({
              executionId: execId,
              nodeId: 'mem-node',
              config: { enabled: true, bufferSize: 10, methodName: 'memTest' }
            });
            
            for (let i = 0; i < 50; i++) {
              tokenStreamingService.streamToken(execId, 'mem-node', `token-${i}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            tokenStreamingService.closeTokenStream(execId, 'mem-node');
          }
        },
        
        // Continuous confidence evaluations
        async () => {
          while (Date.now() - startTime < operationDuration) {
            const state = createMockWorkflowState({
              executionId: `conf-${Date.now()}`,
              input: 'Memory test',
              currentNode: 'conf-node',
              metadata: { complexity: Math.random(), reliability: Math.random() },
              confidence: Math.random(),
            });
            
            await confidenceEvaluatorService.evaluateConfidence(state);
            await confidenceEvaluatorService.assessRisk(state, { factors: ['complexity'] });
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        },
      ];

      // Memory measurement loop
      const memoryMonitor = setInterval(() => {
        const currentMemory = process.memoryUsage().heapUsed;
        const memoryIncreaseMB = (currentMemory - initialMemory) / 1024 / 1024;
        memoryMeasurements.push(memoryIncreaseMB);
        
        if (Date.now() - startTime >= operationDuration) {
          clearInterval(memoryMonitor);
        }
      }, measurementInterval);

      // Run operations
      await Promise.all(operations.map(op => op()));
      
      // Wait for final measurement
      await new Promise(resolve => setTimeout(resolve, measurementInterval));
      clearInterval(memoryMonitor);

      const finalMemory = process.memoryUsage().heapUsed;
      const totalMemoryIncreaseMB = (finalMemory - initialMemory) / 1024 / 1024;
      const maxMemoryIncrease = Math.max(...memoryMeasurements);
      const avgMemoryIncrease = memoryMeasurements.reduce((sum, mem) => sum + mem, 0) / memoryMeasurements.length;

      // Memory usage should be reasonable
      expect(totalMemoryIncreaseMB).toBeLessThan(100); // Less than 100MB increase
      expect(maxMemoryIncrease).toBeLessThan(150); // Peak usage less than 150MB increase
      
      console.log(`Memory Usage Analysis:
        - Duration: ${operationDuration}ms
        - Total memory increase: ${totalMemoryIncreaseMB.toFixed(2)}MB
        - Max memory increase: ${maxMemoryIncrease.toFixed(2)}MB
        - Average memory increase: ${avgMemoryIncrease.toFixed(2)}MB
        - Measurements taken: ${memoryMeasurements.length}`);
    }, 45000);

    it('should clean up resources properly', async () => {
      // Create resources
      const resourceCount = 100;
      const executionIds: string[] = [];
      
      for (let i = 0; i < resourceCount; i++) {
        const executionId = `cleanup-test-${i}`;
        executionIds.push(executionId);
        
        // Create token stream
        await tokenStreamingService.initializeTokenStream({
          executionId,
          nodeId: 'cleanup-node',
          config: { enabled: true, bufferSize: 10, methodName: 'cleanupTest' }
        });
        
        // Create approval request
        const state = createMockWorkflowState({
          executionId,
          input: 'Cleanup test',
          currentNode: 'cleanup-node',
          confidence: 0.5,
        });
        
        await humanApprovalService.requestApproval(
          executionId,
          'cleanup-node',
          'Cleanup test approval',
          state
        );
      }

      // Verify resources were created
      expect(tokenStreamingService.getActiveTokenStreams().length).toBe(resourceCount);
      const initialApprovalStats = humanApprovalService.getApprovalStats();
      expect(initialApprovalStats.total).toBe(resourceCount);

      // Clean up resources
      const cleanupStart = Date.now();
      
      // Close token streams
      for (const executionId of executionIds) {
        tokenStreamingService.closeExecutionTokenStreams(executionId);
      }
      
      // Cancel approval requests
      const pendingApprovals = humanApprovalService.getPendingApprovals();
      await Promise.all(
        pendingApprovals.map(approval => humanApprovalService.cancelApproval(approval.id))
      );

      const cleanupDuration = Date.now() - cleanupStart;

      // Verify cleanup
      expect(tokenStreamingService.getActiveTokenStreams().length).toBe(0);
      const finalApprovalStats = humanApprovalService.getApprovalStats();
      expect(finalApprovalStats.byState['in_progress']).toBe(0);
      expect(cleanupDuration).toBeLessThan(5000); // Cleanup should be fast

      console.log(`Resource Cleanup Performance:
        - Resources created: ${resourceCount}
        - Cleanup duration: ${cleanupDuration}ms
        - Token streams cleaned: ${resourceCount}
        - Approvals cancelled: ${pendingApprovals.length}`);
    }, 30000);
  });
});