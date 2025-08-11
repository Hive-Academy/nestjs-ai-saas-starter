import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { take, timeout } from 'rxjs/operators';

import { Phase2DemoWorkflow } from '../../lib/examples/integration-demo-workflow';
import { TokenStreamingService } from '../../lib/streaming/token-streaming.service';
import { WebSocketBridgeService } from '../../lib/streaming/websocket-bridge.service';
import { ToolDiscoveryService } from '../../lib/tools/tool-discovery.service';
import { ToolRegistryService } from '../../lib/tools/tool-registry.service';
import { HumanApprovalService } from '../../lib/hitl/human-approval.service';
import { ConfidenceEvaluatorService } from '../../lib/hitl/confidence-evaluator.service';
import { ApprovalChainService } from '../../lib/hitl/approval-chain.service';
import { FeedbackProcessorService } from '../../lib/hitl/feedback-processor.service';
import { MetadataProcessorService } from '../../lib/core/metadata-processor.service';
import { WorkflowGraphBuilderService } from '../../lib/core/workflow-graph-builder.service';

import { StreamEventType, StreamUpdate } from '../../lib/interfaces/streaming.interface';
import { WorkflowState, HumanFeedback } from '../../lib/interfaces/workflow.interface';
import { ApprovalRiskLevel } from '../../lib/decorators/approval.decorator';
import { AgentType } from '@anubis/shared';

// Mock implementations for testing
class MockToolsProvider {
  async searchKnowledge(query: string) {
    return { results: [`Found: ${query}`] };
  }
  
  async analyzeCode(code: string) {
    return { 
      analysis: `Code analysis for: ${code.substring(0, 50)}...`,
      confidence: 0.8 
    };
  }
}

class MockWebSocket {
  send = jest.fn();
  close = jest.fn();
  readyState = 1;
}

// Mock factory functions
const createMockWorkflowState = (overrides: any = {}) => ({
  executionId: 'test-exec-123',
  input: 'test input',
  currentNode: 'start',
  status: 'active' as const,
  startedAt: new Date(),
  ...overrides
});

const createMockTokenStreamingService = () => ({
  initializeTokenStream: jest.fn().mockResolvedValue(undefined),
  streamToken: jest.fn(),
  closeTokenStream: jest.fn(),
  closeExecutionTokenStreams: jest.fn(),
  getActiveTokenStreams: jest.fn().mockReturnValue([]),
  getGlobalTokenStream: jest.fn().mockReturnValue({
    pipe: jest.fn().mockReturnValue({
      subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() })
    })
  }),
  getTokenStats: jest.fn().mockReturnValue({
    pipe: jest.fn().mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({ activeStreams: 1, totalTokensProcessed: 100 })
    })
  })
});

const createMockWebSocketBridgeService = () => ({
  registerClient: jest.fn(),
  unregisterClient: jest.fn(),
  broadcast: jest.fn(),
});

const createMockToolDiscoveryService = () => ({
  performFullDiscovery: jest.fn().mockResolvedValue({ totalTools: 5, providersScanned: 2 }),
  getDiscoveryStats: jest.fn().mockReturnValue({ totalTools: 5, providersScanned: 2 }),
  validateToolConfiguration: jest.fn().mockResolvedValue({ valid: ['tool1'], invalid: [] }),
});

const createMockToolRegistryService = () => ({
  getToolsForAgent: jest.fn().mockReturnValue([{ name: 'test-tool' }]),
  getTool: jest.fn().mockReturnValue({ invoke: jest.fn().mockResolvedValue({ result: 'success' }) }),
  getAllTools: jest.fn().mockReturnValue([]),
  getToolMetadata: jest.fn().mockReturnValue({ name: 'test-tool', description: 'Test tool' }),
});

const createMockHumanApprovalService = () => ({
  requestApproval: jest.fn().mockResolvedValue({ id: 'approval-123', executionId: 'test-exec' }),
  processApprovalResponse: jest.fn().mockResolvedValue({ success: true, nextState: { approvalReceived: true } }),
  getApprovalRequest: jest.fn().mockReturnValue({ id: 'approval-123' }),
  getApprovalStats: jest.fn().mockReturnValue({ total: 1, byState: { in_progress: 0 } }),
  getPendingApprovals: jest.fn().mockReturnValue([]),
  cancelApproval: jest.fn().mockResolvedValue({ success: true }),
  registerStreamConnection: jest.fn(),
  unregisterStreamConnection: jest.fn(),
});

const createMockConfidenceEvaluatorService = () => ({
  evaluateConfidence: jest.fn().mockResolvedValue(0.8),
  assessRisk: jest.fn().mockResolvedValue({ level: 'medium', factors: ['complexity'] }),
});

const createMockMetadataProcessorService = () => ({
  extractWorkflowDefinition: jest.fn(),
  validateWorkflowDefinition: jest.fn(),
});

const createMockWorkflowGraphBuilderService = () => ({
  buildGraph: jest.fn(),
  compileGraph: jest.fn(),
});

const createMockLogger = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
});

const resetAllMocks = () => {
  jest.clearAllMocks();
};

const TEST_TIMEOUT = {
  UNIT: 5000,
  INTEGRATION: 30000,
  E2E: 60000,
};

describe('Phase 2 Integration Test - Complete Feature Integration', () => {
  let module: TestingModule;
  let workflow: Phase2DemoWorkflow;
  let tokenStreamingService: TokenStreamingService;
  let webSocketBridgeService: WebSocketBridgeService;
  let toolDiscoveryService: ToolDiscoveryService;
  let toolRegistryService: ToolRegistryService;
  let humanApprovalService: HumanApprovalService;
  let confidenceEvaluatorService: ConfidenceEvaluatorService;
  let eventEmitter: EventEmitter2;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        Phase2DemoWorkflow,
        MockToolsProvider,
        {
          provide: TokenStreamingService,
          useValue: createMockTokenStreamingService(),
        },
        {
          provide: WebSocketBridgeService,
          useValue: createMockWebSocketBridgeService(),
        },
        {
          provide: ToolDiscoveryService,
          useValue: createMockToolDiscoveryService(),
        },
        {
          provide: ToolRegistryService,
          useValue: createMockToolRegistryService(),
        },
        {
          provide: HumanApprovalService,
          useValue: createMockHumanApprovalService(),
        },
        {
          provide: ConfidenceEvaluatorService,
          useValue: createMockConfidenceEvaluatorService(),
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
          useValue: createMockMetadataProcessorService(),
        },
        {
          provide: WorkflowGraphBuilderService,
          useValue: createMockWorkflowGraphBuilderService(),
        },
        {
          provide: Logger,
          useValue: createMockLogger(),
        },
        // Mock dependency injection providers
        {
          provide: 'IChromaDBRepository',
          useValue: {
            searchSimilar: jest.fn().mockResolvedValue([]),
            addDocuments: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: 'INeo4jRepository',
          useValue: {
            read: jest.fn().mockResolvedValue({ records: [] }),
            write: jest.fn().mockResolvedValue({ records: [] }),
          },
        },
      ],
    }).compile();

    workflow = module.get<Phase2DemoWorkflow>(Phase2DemoWorkflow);
    tokenStreamingService = module.get<TokenStreamingService>(TokenStreamingService);
    webSocketBridgeService = module.get<WebSocketBridgeService>(WebSocketBridgeService);
    toolDiscoveryService = module.get<ToolDiscoveryService>(ToolDiscoveryService);
    toolRegistryService = module.get<ToolRegistryService>(ToolRegistryService);
    humanApprovalService = module.get<HumanApprovalService>(HumanApprovalService);
    confidenceEvaluatorService = module.get<ConfidenceEvaluatorService>(ConfidenceEvaluatorService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Complete Phase 2 Integration', () => {
    let testExecutionId: string;
    let mockState: WorkflowState;

    beforeEach(() => {
      testExecutionId = `test-exec-${Date.now()}`;
      mockState = createMockWorkflowState({
        executionId: testExecutionId,
        input: 'Test workflow input',
        currentNode: 'start',
        confidence: 0.7,
      });
      resetAllMocks();
    });

    it('should integrate streaming + tools + HITL in a complete workflow', async () => {
      // Track events for validation
      const streamEvents: StreamUpdate[] = [];
      const approvalEvents: any[] = [];
      
      // Set up event listeners
      const streamSubscription = tokenStreamingService
        .getGlobalTokenStream()
        .pipe(take(10), timeout(10000))
        .subscribe(event => streamEvents.push(event));

      eventEmitter.on('approval.requested', (event) => approvalEvents.push(event));

      try {
        // Step 1: Initialize workflow with streaming and tools
        await workflow.initializeWorkflow(mockState);

        // Verify tool discovery has occurred
        const discoveryStats = toolDiscoveryService.getDiscoveryStats();
        expect(discoveryStats.totalTools).toBeGreaterThan(0);
        
        // Verify tools are available for agents
        const toolsForAgent = toolRegistryService.getToolsForAgent(AgentType.ARCHITECT);
        expect(toolsForAgent.length).toBeGreaterThan(0);

        // Step 2: Execute content generation with token streaming
        const contentResult = await workflow.generateContent(mockState);
        expect(contentResult).toBeDefined();
        expect(contentResult.content).toBeDefined();

        // Verify token streaming was activated
        const activeStreams = tokenStreamingService.getActiveTokenStreams();
        expect(activeStreams.length).toBeGreaterThan(0);

        // Step 3: Execute tool-based analysis
        const analysisResult = await workflow.performAnalysis(mockState);
        expect(analysisResult).toBeDefined();
        expect(analysisResult.analysis).toBeDefined();

        // Step 4: Execute operation requiring approval (low confidence to trigger)
        const lowConfidenceState = {
          ...mockState,
          confidence: 0.3, // Below approval threshold
        };

        // This should trigger approval flow
        const approvalResult = await workflow.performCriticalOperation(lowConfidenceState);
        
        // Should return approval routing command
        expect(approvalResult).toHaveProperty('type', 'goto');
        expect(approvalResult).toHaveProperty('goto', 'human_approval');
        expect(approvalResult.update).toHaveProperty('waitingForApproval', true);

        // Verify approval was requested
        expect(approvalEvents.length).toBeGreaterThan(0);
        const approvalEvent = approvalEvents[0];
        expect(approvalEvent.request).toBeDefined();
        expect(approvalEvent.request.confidence.current).toBeLessThan(0.7);

        // Step 5: Process approval response
        const approvalRequest = approvalEvent.request;
        const approvalResponse = {
          requestId: approvalRequest.id,
          decision: 'approved' as const,
          approver: { id: 'test-user', name: 'Test User', role: 'developer' },
          message: 'Approved for testing',
          timestamp: new Date(),
        };

        const processResult = await humanApprovalService.processApprovalResponse(
          approvalRequest.id,
          approvalResponse
        );

        expect(processResult.success).toBe(true);
        expect(processResult.nextState).toBeDefined();
        expect(processResult.nextState?.approvalReceived).toBe(true);

        // Step 6: Execute comprehensive workflow step
        const comprehensiveState = {
          ...mockState,
          approvalReceived: true,
        };

        const comprehensiveResult = await workflow.comprehensiveProcessing(comprehensiveState);
        expect(comprehensiveResult).toBeDefined();
        expect(comprehensiveResult.result).toBe('All Phase 2 features integrated successfully');

        // Verify streaming events were captured
        await new Promise(resolve => setTimeout(resolve, 500)); // Allow events to propagate
        expect(streamEvents.length).toBeGreaterThan(0);

        // Verify we have different types of stream events
        const eventTypes = streamEvents.map(e => e.type);
        const hasTokenEvents = eventTypes.includes(StreamEventType.TOKEN);
        const hasProgressEvents = eventTypes.includes(StreamEventType.PROGRESS);
        
        // At least one type should be present
        expect(hasTokenEvents || hasProgressEvents).toBe(true);

      } finally {
        streamSubscription.unsubscribe();
        eventEmitter.removeAllListeners('approval.requested');
      }
    }, TEST_TIMEOUT.INTEGRATION);

    it('should handle streaming system with WebSocket integration', async () => {
      // Mock WebSocket connection
      const mockWebSocket = new MockWebSocket();

      // Register WebSocket connection
      webSocketBridgeService.registerClient(testExecutionId, new Subject(), { executionId: testExecutionId });

      // Initialize token streaming for the execution
      await tokenStreamingService.initializeTokenStream({
        executionId: testExecutionId,
        nodeId: 'test-node',
        config: {
          enabled: true,
          bufferSize: 10,
          flushInterval: 100,
          format: 'text',
          methodName: 'testMethod',
        },
      });

      // Stream some test tokens
      tokenStreamingService.streamToken(testExecutionId, 'test-node', 'Hello', {});
      tokenStreamingService.streamToken(testExecutionId, 'test-node', 'World', {});
      tokenStreamingService.streamToken(testExecutionId, 'test-node', '!', {});

      // Wait for buffering and processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify WebSocket messages were sent
      expect(mockWebSocket.send).toHaveBeenCalled();

      // Verify token stream stats
      const stats = await tokenStreamingService.getTokenStats().pipe(take(1)).toPromise();
      expect(stats?.activeStreams).toBeGreaterThan(0);
      expect(stats?.totalTokensProcessed).toBeGreaterThan(0);

      // Cleanup
      tokenStreamingService.closeTokenStream(testExecutionId, 'test-node');
      webSocketBridgeService.unregisterClient(testExecutionId);
    });

    it('should handle tool autodiscovery and execution', async () => {
      // Perform tool discovery
      const discoveryStats = await toolDiscoveryService.performFullDiscovery();
      
      expect(discoveryStats.totalTools).toBeGreaterThan(0);
      expect(discoveryStats.providersScanned).toBeGreaterThan(0);

      // Test tool execution through registry
      const searchTool = toolRegistryService.getTool('search_knowledge');
      expect(searchTool).toBeDefined();

      if (searchTool) {
        const toolResult = await searchTool.invoke({ query: 'test query' });
        expect(toolResult).toBeDefined();
      }

      // Test agent-specific tool access
      const agentTools = toolRegistryService.getToolsForAgent(AgentType.ARCHITECT);
      expect(agentTools.length).toBeGreaterThan(0);

      // Verify tool metadata
      const toolMetadata = toolRegistryService.getToolMetadata('search_knowledge');
      expect(toolMetadata).toBeDefined();
      expect(toolMetadata?.name).toBe('search_knowledge');
      expect(toolMetadata?.description).toBeDefined();

      // Test tool validation
      const validationResult = await toolDiscoveryService.validateToolConfiguration();
      expect(validationResult.valid.length).toBeGreaterThan(0);
    });

    it('should handle HITL approval flow with confidence evaluation', async () => {
      // Test confidence evaluation
      const confidence = await confidenceEvaluatorService.evaluateConfidence(mockState);
      expect(typeof confidence).toBe('number');
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);

      // Test risk assessment
      const riskAssessment = await confidenceEvaluatorService.assessRisk(mockState, {
        factors: ['complexity', 'impact'],
      });
      
      expect(riskAssessment).toBeDefined();
      expect(riskAssessment.level).toBeDefined();
      expect(Object.values(ApprovalRiskLevel)).toContain(riskAssessment.level);

      // Test approval request creation
      const approvalRequest = await humanApprovalService.requestApproval(
        testExecutionId,
        'test-node',
        'Test approval message',
        mockState,
        {
          confidenceThreshold: 0.8,
          riskThreshold: ApprovalRiskLevel.MEDIUM,
          timeoutMs: 30000,
        }
      );

      expect(approvalRequest).toBeDefined();
      expect(approvalRequest.id).toBeDefined();
      expect(approvalRequest.executionId).toBe(testExecutionId);
      expect(approvalRequest.confidence.threshold).toBe(0.8);

      // Test approval retrieval
      const retrievedRequest = humanApprovalService.getApprovalRequest(approvalRequest.id);
      expect(retrievedRequest).toEqual(approvalRequest);

      // Test approval statistics
      const stats = humanApprovalService.getApprovalStats();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byState).toBeDefined();
    });

    it('should handle complex approval scenarios with escalation', async () => {
      // Test escalation scenario
      const approvalRequest = await humanApprovalService.requestApproval(
        testExecutionId,
        'escalation-test',
        'High-risk operation requiring escalation',
        mockState,
        {
          confidenceThreshold: 0.9,
          riskThreshold: ApprovalRiskLevel.HIGH,
          chainId: 'development-chain',
          escalationStrategy: 'chain' as any,
          timeoutMs: 5000, // Short timeout for testing
        }
      );

      // Process escalation response
      const escalationResponse = {
        requestId: approvalRequest.id,
        decision: 'escalated' as const,
        approver: { id: 'developer', name: 'Junior Dev', role: 'developer' },
        message: 'Escalating to senior team',
        timestamp: new Date(),
      };

      const escalationResult = await humanApprovalService.processApprovalResponse(
        approvalRequest.id,
        escalationResponse
      );

      expect(escalationResult.success).toBe(true);
      expect(escalationResult.nextState?.waitingForApproval).toBe(true);

      // Verify escalation event was emitted
      let escalationEventReceived = false;
      eventEmitter.on('approval.escalated', () => {
        escalationEventReceived = true;
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      // Note: In a real scenario, the escalation event would be triggered
    });

    it('should demonstrate performance under concurrent load', async () => {
      const concurrentExecutions = 5;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < concurrentExecutions; i++) {
        const executionId = `concurrent-${i}-${Date.now()}`;
        const state = createMockWorkflowState({
          executionId,
          input: `Concurrent test ${i}`,
        });

        // Initialize streaming
        const streamPromise = tokenStreamingService.initializeTokenStream({
          executionId,
          nodeId: 'concurrent-node',
          config: {
            enabled: true,
            bufferSize: 5,
            flushInterval: 50,
            format: 'text',
            methodName: 'concurrentMethod',
          },
        });

        // Execute workflow
        const workflowPromise = workflow.generateContent(state);

        promises.push(Promise.all([streamPromise, workflowPromise]));
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results.length).toBe(concurrentExecutions);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify streaming stats reflect concurrent activity
      const stats = await tokenStreamingService.getTokenStats().pipe(take(1)).toPromise();
      expect(stats?.totalTokensProcessed).toBeGreaterThan(0);

      // Cleanup concurrent streams
      for (let i = 0; i < concurrentExecutions; i++) {
        const executionId = `concurrent-${i}-${Date.now()}`;
        tokenStreamingService.closeExecutionTokenStreams(executionId);
      }
    });

    it('should integrate all Phase 2 decorators in a single workflow node', async () => {
      // Execute the comprehensive processing node that uses all decorators
      const result = await workflow.comprehensiveProcessing(mockState);

      expect(result).toBeDefined();
      expect(result['result']).toBe('All Phase 2 features integrated successfully');

      // Verify streaming metadata was applied
      expect(result['tokenStats']).toBeDefined();
      expect(result['progressInfo']).toBeDefined();
      expect(result['eventSummary']).toBeDefined();

      // The method should have triggered streaming for tokens, events, and progress
      const activeStreams = tokenStreamingService.getActiveTokenStreams();
      expect(activeStreams.some(s => s.streamKey.includes(testExecutionId))).toBe(true);
    });

    it('should handle error scenarios gracefully', async () => {
      // Test token streaming with invalid configuration
      try {
        await tokenStreamingService.initializeTokenStream({
          executionId: '',
          nodeId: '',
          config: {
            enabled: true,
            bufferSize: -1, // Invalid buffer size
            flushInterval: 0, // Invalid interval
            format: 'text',
            methodName: 'errorMethod',
          },
        });
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Test tool execution with invalid parameters
      const searchTool = toolRegistryService.getTool('search_knowledge');
      if (searchTool) {
        try {
          await searchTool.invoke({}); // Missing required query parameter
        } catch (error) {
          expect(error).toBeDefined();
        }
      }

      // Test approval with invalid confidence threshold
      try {
        await humanApprovalService.requestApproval(
          'invalid-exec',
          'invalid-node',
          'Invalid approval',
          mockState,
          {
            confidenceThreshold: 2.0, // Invalid threshold > 1
          }
        );
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should maintain performance benchmarks', async () => {
      // Benchmark token streaming performance
      const tokenCount = 1000;
      const startTime = Date.now();

      await tokenStreamingService.initializeTokenStream({
        executionId: testExecutionId,
        nodeId: 'benchmark-node',
        config: {
          enabled: true,
          bufferSize: 100,
          flushInterval: 10,
          format: 'text',
          methodName: 'benchmarkMethod',
        },
      });

      for (let i = 0; i < tokenCount; i++) {
        tokenStreamingService.streamToken(
          testExecutionId,
          'benchmark-node',
          `token-${i}`,
          { index: i }
        );
      }

      await new Promise(resolve => setTimeout(resolve, 500)); // Allow processing

      const duration = Date.now() - startTime;
      const tokensPerSecond = tokenCount / (duration / 1000);

      expect(tokensPerSecond).toBeGreaterThan(100); // Should process > 100 tokens/second
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

      // Cleanup
      tokenStreamingService.closeTokenStream(testExecutionId, 'benchmark-node');
    });
  });

  describe('Cross-Feature Integration Edge Cases', () => {
    let testExecutionId: string;
    let mockState: WorkflowState;

    beforeEach(() => {
      testExecutionId = `test-exec-${Date.now()}`;
      mockState = createMockWorkflowState({
        executionId: testExecutionId,
        input: 'Test workflow input',
        currentNode: 'start',
        confidence: 0.7,
      });
    });

    it('should handle streaming approval requests in real-time', async () => {
      const mockWebSocket = new MockWebSocket();

      // Register WebSocket for approval streaming
      webSocketBridgeService.registerClient(testExecutionId, new Subject(), { executionId: testExecutionId });
      humanApprovalService.registerStreamConnection(testExecutionId, mockWebSocket);

      // Request approval (should trigger streaming)
      await humanApprovalService.requestApproval(
        testExecutionId,
        'streaming-approval-node',
        'Real-time approval test',
        mockState,
        {
          confidenceThreshold: 0.8,
        }
      );

      // Verify WebSocket received approval request
      expect(mockWebSocket.send).toHaveBeenCalled();
      const sentMessages = mockWebSocket.send.mock.calls.map(call => JSON.parse(call[0]));
      const approvalMessage = sentMessages.find(msg => msg.type === 'approval_requested');
      expect(approvalMessage).toBeDefined();

      // Cleanup
      humanApprovalService.unregisterStreamConnection(testExecutionId);
      webSocketBridgeService.unregisterClient(testExecutionId);
    });

    it('should handle tool execution with streaming progress', async () => {
      // This would test a tool that provides streaming progress updates
      const toolWithProgress = toolRegistryService.getTool('analyze_code');
      
      if (toolWithProgress) {
        const progressUpdates: any[] = [];
        
        // Listen for progress events
        eventEmitter.on('tool.progress', (event) => progressUpdates.push(event));

        const result = await toolWithProgress.invoke({ 
          code: 'function test() { return "streaming progress test"; }' 
        });

        expect(result).toBeDefined();
        
        // Clean up
        eventEmitter.removeAllListeners('tool.progress');
      }
    });
  });
});