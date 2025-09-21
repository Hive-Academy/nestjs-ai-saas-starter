import { Test, TestingModule } from '@nestjs/testing';
import { EnhancedDecoratorTranslationService } from './enhanced-decorator-translation.service';
import { AgentWorkflowBridgeService, type AgentInstance } from './agent-workflow-bridge.service';
import { Agent } from '@hive-academy/langgraph-multi-agent';
import { Injectable } from '@nestjs/common';
import type { 
  DecoratorDefinition,
  EnhancedDecoratorBridgeConfig 
} from '../interfaces/decorator-bridge.interface';
import type { 
  EnhancedDecoratorMetadata,
  AgentStepContext
} from '../interfaces/enhanced-decorator-metadata.interface';
import type { WorkflowState } from '../interfaces';
import type { 
  AgentStepMetadata, 
  SubworkflowMetadata 
} from '@hive-academy/langgraph-functional-api';

// Mock agent for testing
@Agent({
  id: 'test-decorator-agent',
  name: 'Test Decorator Agent',
  description: 'Agent for testing decorator translation',
  tools: ['test_tool'],
  capabilities: ['testing'],
  priority: 'medium',
  executionTime: 'fast'
})
@Injectable()
class TestDecoratorAgent {
  async nodeFunction(state: WorkflowState): Promise<Partial<WorkflowState>> {
    return { 
      agentExecuted: true, 
      agentId: 'test-decorator-agent',
      result: 'decorator-test-result' 
    };
  }
}

// Mock streaming service
class MockStreamingService {
  streamToken = jest.fn();
  streamEvent = jest.fn();
  streamProgress = jest.fn();
  emitEvent = jest.fn();
  initializeTokenStream = jest.fn();
  initializeEventStream = jest.fn();
  initializeProgressTracker = jest.fn();
}

// Mock memory adapter
class MockMemoryAdapter {
  store = jest.fn();
  retrieve = jest.fn();
  search = jest.fn();
  getMemoryContext = jest.fn().mockResolvedValue({
    memories: [],
    context: {}
  });
}

// Mock approval service
class MockApprovalService {
  requestApproval = jest.fn().mockResolvedValue({ approved: true });
}

// Mock checkpoint service
class MockCheckpointService {
  createCheckpoint = jest.fn();
}

describe('EnhancedDecoratorTranslationService', () => {
  let service: EnhancedDecoratorTranslationService;
  let agentBridgeService: AgentWorkflowBridgeService;
  let streamingService: MockStreamingService;
  let memoryAdapter: MockMemoryAdapter;
  let approvalService: MockApprovalService;
  let checkpointService: MockCheckpointService;
  let testAgent: TestDecoratorAgent;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnhancedDecoratorTranslationService,
        TestDecoratorAgent,
        {
          provide: AgentWorkflowBridgeService,
          useValue: {
            resolveAgent: jest.fn(),
            coordinateAgents: jest.fn(),
            hasAgent: jest.fn(),
            getRegisteredAgents: jest.fn()
          }
        }
      ],
    }).compile();

    service = module.get<EnhancedDecoratorTranslationService>(EnhancedDecoratorTranslationService);
    agentBridgeService = module.get<AgentWorkflowBridgeService>(AgentWorkflowBridgeService);
    testAgent = module.get<TestDecoratorAgent>(TestDecoratorAgent);

    // Create mock services
    streamingService = new MockStreamingService();
    memoryAdapter = new MockMemoryAdapter();
    approvalService = new MockApprovalService();
    checkpointService = new MockCheckpointService();

    // Inject mocks into service
    (service as any).streamingService = streamingService;
    (service as any).memoryAdapter = memoryAdapter;
    (service as any).approvalService = approvalService;
    (service as any).checkpointService = checkpointService;
    (service as any).agentWorkflowBridge = agentBridgeService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Enhanced Translation', () => {
    it('should translate decorator definition with enhanced capabilities', async () => {
      const mockDefinition: DecoratorDefinition = {
        className: 'TestWorkflow',
        methods: [
          {
            name: 'testMethod',
            handler: jest.fn().mockResolvedValue({ enhanced: true })
          }
        ]
      };

      const mockInstance = {
        testMethod: jest.fn()
      };

      const config: Partial<EnhancedDecoratorBridgeConfig> = {
        enableAgentIntegration: true,
        enableStreaming: true,
        enableMemory: true
      };

      // Mock base translation
      const mockBaseResult = {
        nodes: [
          {
            id: 'testMethod',
            handler: jest.fn()
          }
        ],
        edges: [],
        entryPoint: 'testMethod',
        metadata: {}
      };

      jest.spyOn(service, 'translateDecoratorDefinition').mockResolvedValue(mockBaseResult);

      const result = await service.translateDecoratorDefinitionEnhanced(
        mockDefinition,
        mockInstance,
        config
      );

      expect(result).toBeDefined();
      expect(result.nodes).toBeDefined();
      expect(result.metadata.enhancementLevel).toBe('full');
      expect(result.metadata.translationTime).toBeDefined();
    });
  });

  describe('Agent Step Execution', () => {
    const mockAgentStepMetadata: AgentStepMetadata = {
      agent: 'test-decorator-agent',
      tools: ['test_tool'],
      coordination: 'sequential',
      streaming: true,
      memory: true,
      method: 'testAgentStep',
      decoratorType: 'agent-step'
    };

    const mockAgentInstance: AgentInstance = {
      id: 'test-decorator-agent',
      config: {
        id: 'test-decorator-agent',
        name: 'Test Decorator Agent',
        description: 'Agent for testing'
      },
      instance: testAgent,
      nodeFunction: testAgent.nodeFunction.bind(testAgent),
      capabilities: {
        tools: ['test_tool'],
        capabilities: ['testing'],
        priority: 'medium',
        executionTime: 'fast'
      },
      metadata: {
        executionCount: 0,
        createdAt: new Date()
      }
    };

    beforeEach(() => {
      (agentBridgeService.resolveAgent as jest.Mock).mockResolvedValue(mockAgentInstance);
    });

    it('should execute agent step with real agent resolution', async () => {
      const mockState: WorkflowState = {
        executionId: 'test-exec',
        currentNode: 'testAgentStep',
        data: 'test-data'
      };

      const mockContext = {
        executionId: 'test-exec',
        nodeId: 'testAgentStep',
        workflowName: 'TestWorkflow',
        state: mockState,
        decoratorMetadata: {
          agentStep: mockAgentStepMetadata,
          methodName: 'testAgentStep',
          hasDecorators: true,
          decoratorCount: 1
        },
        capabilities: {
          hasAgentIntegration: true,
          hasStreaming: true,
          hasMemory: true
        },
        streamingService,
        memoryAdapter
      };

      const mockHandler = jest.fn().mockResolvedValue({ handled: true });

      const result = await (service as any).executeAsAgentStep(
        mockHandler,
        mockContext,
        mockAgentStepMetadata,
        {}
      );

      expect(agentBridgeService.resolveAgent).toHaveBeenCalledWith('test-decorator-agent');
      expect(result).toBeDefined();
      expect(result.agentExecuted).toBe(true);
      expect(result.agentId).toBe('test-decorator-agent');
    });

    it('should handle agent resolution failure gracefully', async () => {
      (agentBridgeService.resolveAgent as jest.Mock).mockRejectedValue(
        new Error('Agent not found')
      );

      const mockState: WorkflowState = {
        executionId: 'test-exec',
        currentNode: 'testAgentStep'
      };

      const mockContext = {
        state: mockState,
        decoratorMetadata: {
          agentStep: mockAgentStepMetadata,
          methodName: 'testAgentStep',
          hasDecorators: true,
          decoratorCount: 1
        },
        capabilities: {
          hasAgentIntegration: true
        }
      };

      const mockHandler = jest.fn().mockResolvedValue({ fallback: true });

      // Enable graceful degradation
      (service as any).defaultEnhancedConfig.gracefulDegradation = true;

      const result = await (service as any).executeAsAgentStep(
        mockHandler,
        mockContext,
        mockAgentStepMetadata,
        {}
      );

      expect(result).toBeDefined();
      // Should fall back to enhanced execution
    });

    it('should apply context transformation if specified', async () => {
      const mockContextTransform = jest.fn((state) => ({
        ...state,
        transformed: true
      }));

      const transformedMetadata = {
        ...mockAgentStepMetadata,
        contextTransform: mockContextTransform
      };

      const mockState: WorkflowState = {
        executionId: 'test-exec',
        currentNode: 'testAgentStep',
        originalData: 'test'
      };

      const mockContext = {
        executionId: 'test-exec',
        nodeId: 'testAgentStep',
        workflowName: 'TestWorkflow',
        state: mockState,
        decoratorMetadata: {
          agentStep: transformedMetadata,
          methodName: 'testAgentStep',
          hasDecorators: true,
          decoratorCount: 1
        },
        capabilities: {
          hasAgentIntegration: true
        }
      };

      const mockHandler = jest.fn();

      await (service as any).executeAsAgentStep(
        mockHandler,
        mockContext,
        transformedMetadata,
        {}
      );

      expect(mockContextTransform).toHaveBeenCalledWith(mockState);
    });

    it('should apply result transformation if specified', async () => {
      const mockResultTransform = jest.fn((result) => ({
        ...result,
        transformed: true
      }));

      const transformedMetadata = {
        ...mockAgentStepMetadata,
        resultTransform: mockResultTransform
      };

      const mockState: WorkflowState = {
        executionId: 'test-exec',
        currentNode: 'testAgentStep'
      };

      const mockContext = {
        executionId: 'test-exec',
        nodeId: 'testAgentStep',
        workflowName: 'TestWorkflow',
        state: mockState,
        decoratorMetadata: {
          agentStep: transformedMetadata,
          methodName: 'testAgentStep',
          hasDecorators: true,
          decoratorCount: 1
        },
        capabilities: {
          hasAgentIntegration: true
        }
      };

      const mockHandler = jest.fn();

      const result = await (service as any).executeAsAgentStep(
        mockHandler,
        mockContext,
        transformedMetadata,
        {}
      );

      expect(mockResultTransform).toHaveBeenCalled();
      expect(result.transformed).toBe(true);
    });

    it('should emit streaming events during agent execution', async () => {
      const streamingMetadata = {
        ...mockAgentStepMetadata,
        streaming: true
      };

      const mockState: WorkflowState = {
        executionId: 'test-exec',
        currentNode: 'testAgentStep'
      };

      const mockContext = {
        executionId: 'test-exec',
        nodeId: 'testAgentStep',
        workflowName: 'TestWorkflow',
        state: mockState,
        decoratorMetadata: {
          agentStep: streamingMetadata,
          methodName: 'testAgentStep',
          hasDecorators: true,
          decoratorCount: 1
        },
        capabilities: {
          hasAgentIntegration: true,
          hasStreaming: true
        },
        streamingService
      };

      const mockHandler = jest.fn();

      await (service as any).executeAsAgentStep(
        mockHandler,
        mockContext,
        streamingMetadata,
        {}
      );

      expect(streamingService.emitEvent).toHaveBeenCalledWith(
        'AGENT_EXECUTION_COMPLETE',
        expect.objectContaining({
          agentId: 'test-decorator-agent',
          method: 'testAgentStep'
        })
      );
    });
  });

  // Additional comprehensive tests would continue here...
  // For brevity, focusing on the core functionality tests
});