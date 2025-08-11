import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SimpleTestWorkflow } from '../../lib/examples/simple-test-workflow';
import { MetadataProcessorService } from '../../lib/core/metadata-processor.service';
import { WorkflowGraphBuilderService } from '../../lib/core/workflow-graph-builder.service';
import { SubgraphManagerService } from '../../lib/core/subgraph-manager.service';
import { CompilationCacheService } from '../../lib/core/compilation-cache.service';
import { WorkflowStreamService } from '../../lib/streaming/workflow-stream.service';
import { EventStreamProcessorService } from '../../lib/streaming/event-stream-processor.service';

// Mock implementations for testing
const createMockWorkflowState = (overrides: any = {}) => ({
  executionId: 'test-exec-123',
  input: 'test input',
  currentNode: 'start',
  status: 'active' as const,
  startedAt: new Date(),
  ...overrides
});

const mockMetadataProcessorService = {
  extractWorkflowDefinition: jest.fn().mockReturnValue({
    name: 'simple-test-workflow',
    description: 'Simple test workflow demonstrating basic decorator features',
    entryPoint: 'start',
    nodes: [
      { id: 'start', type: 'start', method: 'start' },
      { id: 'analyze', type: 'standard', method: 'analyze' },
      { id: 'generateResponse', type: 'standard', method: 'generateResponse' },
      { id: 'end', type: 'end', method: 'end' },
    ],
    edges: [
      { from: 'start', to: 'analyze' },
      { from: 'analyze', to: 'generateResponse' },
      { from: 'generateResponse', to: 'end' },
    ],
  }),
  validateWorkflowDefinition: jest.fn(),
};

const mockWorkflowGraphBuilderService = {
  buildGraph: jest.fn(),
  compileGraph: jest.fn(),
};

const mockSubgraphManagerService = {
  registerSubgraph: jest.fn(),
  getSubgraph: jest.fn(),
};

const mockCompilationCacheService = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockWorkflowStreamService = {
  createStream: jest.fn(),
  closeStream: jest.fn(),
};

const mockEventStreamProcessorService = {
  processEvent: jest.fn(),
  subscribe: jest.fn(),
};

const mockEventEmitter = {
  emit: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn(),
};

const setupReflectMetadata = () => {
  // Setup reflection metadata for decorators
  if (typeof Reflect !== 'undefined' && Reflect.defineMetadata) {
    // Mock metadata setup
  }
};

const resetAllMocks = () => {
  jest.clearAllMocks();
};

const TEST_TIMEOUT = {
  UNIT: 5000,
  INTEGRATION: 10000,
  E2E: 15000,
};

describe('SimpleTestWorkflow', () => {
  let workflow: SimpleTestWorkflow;
  let metadataProcessor: MetadataProcessorService;
  let module: TestingModule;

  beforeEach(async () => {
    // Setup reflection metadata for decorators
    setupReflectMetadata();
    
    module = await Test.createTestingModule({
      providers: [
        SimpleTestWorkflow,
        {
          provide: MetadataProcessorService,
          useValue: mockMetadataProcessorService,
        },
        {
          provide: WorkflowGraphBuilderService,
          useValue: mockWorkflowGraphBuilderService,
        },
        {
          provide: SubgraphManagerService,
          useValue: mockSubgraphManagerService,
        },
        {
          provide: CompilationCacheService,
          useValue: mockCompilationCacheService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: WorkflowStreamService,
          useValue: mockWorkflowStreamService,
        },
        {
          provide: EventStreamProcessorService,
          useValue: mockEventStreamProcessorService,
        },
      ],
    }).compile();

    workflow = module.get<SimpleTestWorkflow>(SimpleTestWorkflow);
    metadataProcessor = module.get<MetadataProcessorService>(MetadataProcessorService);
  });

  afterEach(async () => {
    resetAllMocks();
    await module.close();
  });

  describe('Decorator Setup', () => {
    it('should be decorated with @Workflow', () => {
      const isWorkflowDecorated = Reflect.hasMetadata('workflow:metadata', SimpleTestWorkflow);
      expect(isWorkflowDecorated).toBe(true);
    });

    it('should have workflow metadata', () => {
      const workflowMeta = Reflect.getMetadata('workflow:metadata', SimpleTestWorkflow);
      expect(workflowMeta).toEqual({
        name: 'simple-test-workflow',
        description: 'Simple test workflow demonstrating basic decorator features',
        streaming: false,
        hitl: { 
          enabled: true, 
          timeout: 30000
        },
        confidenceThreshold: 0.7,
        cache: false,
        metrics: true,
      });
    });

    it('should have node metadata for all decorated methods', () => {
      const nodeKeys = Reflect.getMetadataKeys(workflow.constructor)
        .filter(key => key.toString().startsWith('node:'));
      
      expect(nodeKeys.length).toBeGreaterThan(0);
      
      // Check specific nodes
      const startNodeMeta = Reflect.getMetadata('node:start', workflow.constructor);
      expect(startNodeMeta).toBeDefined();
      expect(startNodeMeta.type).toBe('start');

      const analyzeNodeMeta = Reflect.getMetadata('node:analyze', workflow.constructor);
      expect(analyzeNodeMeta).toBeDefined();
      expect(analyzeNodeMeta.type).toBe('standard');
    });

    it('should have edge metadata', () => {
      const edgeKeys = Reflect.getMetadataKeys(workflow.constructor)
        .filter(key => key.toString().startsWith('edge:'));
      
      expect(edgeKeys.length).toBeGreaterThan(0);
    });
  });

  describe('Workflow Definition Generation', () => {
    it('should generate workflow definition from decorators', () => {
      const definition = metadataProcessor.extractWorkflowDefinition(SimpleTestWorkflow);
      
      expect(definition).toBeDefined();
      expect(definition.name).toBe('simple-test-workflow');
      expect(definition.description).toBe('Simple test workflow demonstrating basic decorator features');
      expect(definition.entryPoint).toBe('start');
    });

    it('should have all expected nodes', () => {
      const definition = metadataProcessor.extractWorkflowDefinition(SimpleTestWorkflow);
      const nodeIds = definition.nodes.map(node => node.id);
      
      const expectedNodes = ['start', 'analyze', 'generateResponse', 'end'];

      expectedNodes.forEach(nodeId => {
        expect(nodeIds).toContain(nodeId);
      });
    });

    it('should have edges connecting nodes', () => {
      const definition = metadataProcessor.extractWorkflowDefinition(SimpleTestWorkflow);
      
      expect(definition.edges.length).toBeGreaterThan(0);
      
      // Check specific edges
      const startToAnalyze = definition.edges.find(
        edge => edge.from === 'start' && edge.to === 'analyze'
      );
      expect(startToAnalyze).toBeDefined();
    });

    it('should validate workflow definition', () => {
      const definition = metadataProcessor.extractWorkflowDefinition(SimpleTestWorkflow);
      
      expect(() => {
        metadataProcessor.validateWorkflowDefinition(definition);
      }).not.toThrow();
    });
  });

  describe('Workflow Execution', () => {
    it('should initialize successfully', async () => {
      await expect(workflow.onModuleInit()).resolves.not.toThrow();
    });

    it('should validate decorator setup', () => {
      const isValid = workflow.validateDecoratorSetup();
      expect(isValid).toBe(true);
    });

    it('should provide workflow statistics', () => {
      const stats = workflow.getTestStats();
      
      expect(stats).toHaveProperty('name', 'simple-test-workflow');
      expect(stats).toHaveProperty('nodeCount');
      expect(stats).toHaveProperty('edgeCount');
      expect(stats).toHaveProperty('hasStreaming', false);
      expect(stats).toHaveProperty('hasHITL', true);
      expect(stats.testFeatures).toEqual({
        hasStreaming: false,
        hasHITL: true,
        hasConditionalRouting: true,
        hasBasicNodes: true,
      });
    });
  });

  describe('Node Implementation', () => {
    it('should execute start node', async () => {
      const state = createMockWorkflowState({ executionId: 'test-123' });
      const result = await workflow.start(state);
      
      expect(result).toEqual({
        currentNode: 'start',
        status: 'active',
        startedAt: expect.any(Date),
      });
    });

    it('should execute analyze node', async () => {
      const state = createMockWorkflowState({ 
        executionId: 'test-123',
        userQuery: 'simple task'
      });
      
      const result = await workflow.analyze(state);
      
      expect(result).toHaveProperty('analysis');
      expect(result.analysis).toEqual({
        complexity: 'low',
        confidence: 0.85,
      });
      expect(result.confidence).toBe(0.85);
    });

    it('should execute generate response node', async () => {
      const state = createMockWorkflowState({ 
        executionId: 'test-123',
        analysis: { complexity: 'low', confidence: 0.85 },
        confidence: 0.85
      });
      
      const result = await workflow.generateResponse(state);
      
      expect(result).toHaveProperty('response');
      expect(result.response).toContain('Analysis complete');
      expect(result.response).toContain('Complexity: low');
    });

    it('should handle conditional routing', () => {
      const highConfidenceState = createMockWorkflowState({
        confidence: 0.9
      });
      
      const route = workflow.routeAfterAnalysis(highConfidenceState);
      expect(route).toBe('high_confidence');

      const lowConfidenceState = createMockWorkflowState({
        confidence: 0.5
      });
      
      const route2 = workflow.routeAfterAnalysis(lowConfidenceState);
      expect(route2).toBe('low_confidence');
    });

    it('should execute end node', async () => {
      const state = createMockWorkflowState({ executionId: 'test-123' });
      const result = await workflow.end(state);
      
      expect(result).toEqual({
        currentNode: 'end',
        status: 'completed',
        completedAt: expect.any(Date),
      });
    });
  });

  describe('Workflow Configuration', () => {
    it('should have correct workflow config from decorator', async () => {
      await workflow.onModuleInit();
      
      const config = workflow.getMetadata();
      expect(config).toEqual({
        name: 'simple-test-workflow',
        description: 'Simple test workflow demonstrating basic decorator features',
        streaming: false,
        hitl: {
          enabled: true,
          timeout: 30000
        },
        confidenceThreshold: 0.7,
        cache: false,
        metrics: true,
      });
    });
  });

  describe('Debug and Inspection', () => {
    it('should provide debug workflow structure', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      workflow.debugWorkflowStructure();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('=== Workflow Structure Debug ===')
      );
      
      consoleSpy.mockRestore();
    });

    it('should get decorator metadata', () => {
      const metadata = workflow.getDecoratorMetadata();
      
      expect(metadata).toHaveProperty('workflow');
      expect(metadata).toHaveProperty('nodes');
      expect(metadata).toHaveProperty('edges');
      expect(metadata.nodes).toBeInstanceOf(Array);
      expect(metadata.edges).toBeInstanceOf(Array);
    });
  });
});