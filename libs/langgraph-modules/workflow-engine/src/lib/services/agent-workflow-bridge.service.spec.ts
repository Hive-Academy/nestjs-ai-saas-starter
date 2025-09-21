import { Test, TestingModule } from '@nestjs/testing';
import { ModuleRef } from '@nestjs/core';
import {
  AgentWorkflowBridgeService,
  InternalWorkflowDefinition,
  AgentRegistration,
  AgentInstance,
} from './agent-workflow-bridge.service';
import {
  Agent,
  AgentType,
  WorkflowAgentConfig,
} from '@hive-academy/langgraph-multi-agent';
import {
  Entrypoint,
  Task,
  Node,
  Edge,
  TaskExecutionContext,
  TaskExecutionResult,
} from '@hive-academy/langgraph-functional-api';
import { Injectable } from '@nestjs/common';
import { StreamProgress } from '@hive-academy/langgraph-streaming';
import type { WorkflowState } from '../interfaces';

/**
 * Test Simple Agent (traditional single nodeFunction agent)
 */
@Agent({
  id: 'test-simple-agent',
  name: 'Test Simple Agent',
  type: 'simple-agent',
  capabilities: ['testing', 'simple-operations'],
  tools: ['test-tool'],
  priority: 'medium',
})
@Injectable()
class TestSimpleAgent {
  async nodeFunction(state: WorkflowState): Promise<Partial<WorkflowState>> {
    return {
      ...state,
      metadata: {
        ...state.metadata,
        simpleAgentExecuted: true,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Test Workflow Agent (multi-step internal workflow agent)
 */
@Agent({
  id: 'test-workflow-agent',
  name: 'Test Workflow Agent',
  type: 'workflow-agent',
  capabilities: ['testing', 'complex-operations', 'multi-step-processing'],
  tools: ['workflow-tool', 'analysis-tool'],
  priority: 'high',
  workflowConfig: {
    enableInternalStreaming: true,
    enableInternalCheckpointing: true,
    internalTimeout: 30000,
    enableErrorRecovery: true,
    maxInternalRetries: 3,
    enableStepProgress: true,
    stateKey: 'test-workflow-agent',
  },
})
@Injectable()
class TestWorkflowAgent {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  @Entrypoint({ timeout: 5000 })
  @StreamProgress({ enabled: true })
  async initializeWorkflow(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    
    return {
      state: {
        ...state,
        metadata: {
          ...state.metadata,
          workflowInitialized: true,
          startTime: new Date().toISOString(),
          executionId: `exec-${Date.now()}`,
        },
      },
    };
  }

  @Task({ dependsOn: ['initializeWorkflow'] })
  async processData(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    
    // Simulate some data processing
    const processedData = {
      inputData: state.metadata?.inputData || 'default-input',
      processedAt: new Date().toISOString(),
      processedBy: 'test-workflow-agent',
    };

    return {
      state: {
        ...state,
        metadata: {
          ...state.metadata,
          dataProcessed: true,
          processedData,
        },
      },
    };
  }

  @Task({ dependsOn: ['processData'] })
  async analyzeResults(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    const processedData = state.metadata?.processedData;
    
    // Simulate analysis
    const analysis = {
      confidence: 0.85,
      quality: 'high',
      recommendations: ['optimize-performance', 'enhance-accuracy'],
      analyzedAt: new Date().toISOString(),
    };

    return {
      state: {
        ...state,
        metadata: {
          ...state.metadata,
          analysisCompleted: true,
          analysis,
          confidenceScore: analysis.confidence,
        },
      },
    };
  }

  @Node({ type: 'condition' })
  async assessQuality(context: TaskExecutionContext): Promise<{ route: string }> {
    const { state } = context;
    const confidence = state.metadata?.confidenceScore || 0.5;
    
    // Decision logic based on confidence
    const route = confidence > 0.8 ? 'finalize' : 'improve';
    
    return { route };
  }

  @Edge('assessQuality', 'finalizeResults', {
    condition: (state: any) => state.metadata?.confidenceScore > 0.8,
  })
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  finalizePathEdge() {}

  @Edge('assessQuality', 'improveResults', {
    condition: (state: any) => state.metadata?.confidenceScore <= 0.8,
  })
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  improvePathEdge() {}

  @Task({ dependsOn: ['assessQuality'] })
  async finalizeResults(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    
    return {
      state: {
        ...state,
        metadata: {
          ...state.metadata,
          finalized: true,
          finalizedAt: new Date().toISOString(),
          workflowPath: 'finalize',
        },
      },
    };
  }

  @Task({ dependsOn: ['assessQuality'] })
  async improveResults(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    
    return {
      state: {
        ...state,
        metadata: {
          ...state.metadata,
          improved: true,
          improvedAt: new Date().toISOString(),
          workflowPath: 'improve',
        },
      },
    };
  }

  @Task({ dependsOn: ['finalizeResults', 'improveResults'] })
  async generateOutput(context: TaskExecutionContext): Promise<TaskExecutionResult> {
    const { state } = context;
    
    const output = {
      workflowCompleted: true,
      executionSummary: {
        path: state.metadata?.workflowPath,
        confidence: state.metadata?.confidenceScore,
        finalized: state.metadata?.finalized || false,
        improved: state.metadata?.improved || false,
      },
      completedAt: new Date().toISOString(),
    };

    return {
      state: {
        ...state,
        metadata: {
          ...state.metadata,
          ...output,
        },
      },
    };
  }
}

describe('AgentWorkflowBridgeService - Enhanced Agent Architecture', () => {
  let service: AgentWorkflowBridgeService;
  let moduleRef: ModuleRef;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentWorkflowBridgeService,
        TestSimpleAgent,
        TestWorkflowAgent,
        {
          provide: ModuleRef,
          useValue: {
            get: jest.fn().mockImplementation((token: string) => {
              if (token === 'TestSimpleAgent') {
                return new TestSimpleAgent();
              }
              if (token === 'TestWorkflowAgent') {
                return new TestWorkflowAgent();
              }
              throw new Error(`Provider not found: ${token}`);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AgentWorkflowBridgeService>(AgentWorkflowBridgeService);
    moduleRef = module.get<ModuleRef>(ModuleRef);

    // Set the agent providers for testing
    service.setAgentProviders([TestSimpleAgent, TestWorkflowAgent]);
  });

  describe('Agent Registration and Detection', () => {
    it('should register simple agent correctly', async () => {
      await service.onModuleInit();

      const simpleAgentRegistration = service.getAgentRegistration('test-simple-agent');
      expect(simpleAgentRegistration).toBeDefined();
      expect(simpleAgentRegistration?.config.type).toBe('simple-agent');
      expect(simpleAgentRegistration?.config.id).toBe('test-simple-agent');
      expect(simpleAgentRegistration?.internalWorkflow).toBeUndefined();
    });

    it('should register workflow agent and detect internal workflow', async () => {
      await service.onModuleInit();

      const workflowAgentRegistration = service.getAgentRegistration('test-workflow-agent');
      expect(workflowAgentRegistration).toBeDefined();
      expect(workflowAgentRegistration?.config.type).toBe('workflow-agent');
      expect(workflowAgentRegistration?.config.id).toBe('test-workflow-agent');
      expect(workflowAgentRegistration?.internalWorkflow).toBeDefined();

      const internalWorkflow = workflowAgentRegistration?.internalWorkflow;
      expect(internalWorkflow?.steps).toBeDefined();
      expect(internalWorkflow?.steps.length).toBeGreaterThan(0);
      expect(internalWorkflow?.entryPoint).toBe('initializeWorkflow');
    });

    it('should detect all workflow steps with correct metadata', async () => {
      await service.onModuleInit();

      const internalWorkflow = service.getInternalWorkflow('test-workflow-agent');
      expect(internalWorkflow).toBeDefined();

      const stepIds = internalWorkflow?.steps.map(s => s.id) || [];
      expect(stepIds).toContain('initializeWorkflow');
      expect(stepIds).toContain('processData');
      expect(stepIds).toContain('analyzeResults');
      expect(stepIds).toContain('assessQuality');
      expect(stepIds).toContain('finalizeResults');
      expect(stepIds).toContain('improveResults');
      expect(stepIds).toContain('generateOutput');

      // Check entrypoint step
      const entrypointStep = internalWorkflow?.steps.find(s => s.type === 'entrypoint');
      expect(entrypointStep).toBeDefined();
      expect(entrypointStep?.id).toBe('initializeWorkflow');

      // Check task dependencies
      const processDataStep = internalWorkflow?.steps.find(s => s.id === 'processData');
      expect(processDataStep?.dependsOn).toContain('initializeWorkflow');
    });

    it('should detect workflow edges correctly', async () => {
      await service.onModuleInit();

      const internalWorkflow = service.getInternalWorkflow('test-workflow-agent');
      expect(internalWorkflow?.edges).toBeDefined();
      expect(internalWorkflow?.edges.length).toBeGreaterThan(0);

      const edgeFroms = internalWorkflow?.edges.map(e => e.from) || [];
      expect(edgeFroms).toContain('assessQuality');
    });
  });

  describe('Agent Instance Resolution', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should resolve simple agent instance with nodeFunction', async () => {
      const agentInstance = await service.resolveAgent('test-simple-agent');

      expect(agentInstance).toBeDefined();
      expect(agentInstance.id).toBe('test-simple-agent');
      expect(agentInstance.config.type).toBe('simple-agent');
      expect(agentInstance.nodeFunction).toBeDefined();
      expect(agentInstance.internalWorkflowExecutor).toBeUndefined();
      expect(typeof agentInstance.nodeFunction).toBe('function');
    });

    it('should resolve workflow agent instance with compiled nodeFunction', async () => {
      const agentInstance = await service.resolveAgent('test-workflow-agent');

      expect(agentInstance).toBeDefined();
      expect(agentInstance.id).toBe('test-workflow-agent');
      expect(agentInstance.config.type).toBe('workflow-agent');
      expect(agentInstance.nodeFunction).toBeDefined();
      expect(agentInstance.internalWorkflowExecutor).toBeDefined();
      expect(typeof agentInstance.nodeFunction).toBe('function');
      expect(typeof agentInstance.internalWorkflowExecutor).toBe('function');
    });

    it('should cache agent instances for performance', async () => {
      const instance1 = await service.resolveAgent('test-simple-agent');
      const instance2 = await service.resolveAgent('test-simple-agent');

      expect(instance1).toBe(instance2); // Same reference due to caching
    });
  });

  describe('Simple Agent Execution', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should execute simple agent nodeFunction', async () => {
      const agentInstance = await service.resolveAgent('test-simple-agent');
      const initialState: WorkflowState = {
        metadata: {
          testInput: 'test-value',
        },
      };

      const result = await agentInstance.nodeFunction(initialState);

      expect(result).toBeDefined();
      expect(result.metadata?.simpleAgentExecuted).toBe(true);
      expect(result.metadata?.timestamp).toBeDefined();
      expect(result.metadata?.testInput).toBe('test-value'); // Preserved from input
    });
  });

  describe('Workflow Agent Execution', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should execute workflow agent with internal workflow', async () => {
      const agentInstance = await service.resolveAgent('test-workflow-agent');
      const initialState: WorkflowState = {
        metadata: {
          inputData: 'test-workflow-input',
        },
      };

      const result = await agentInstance.nodeFunction(initialState);

      expect(result).toBeDefined();
      expect(result.metadata?.workflowInitialized).toBe(true);
      expect(result.metadata?.dataProcessed).toBe(true);
      expect(result.metadata?.analysisCompleted).toBe(true);
      expect(result.metadata?.workflowCompleted).toBe(true);
      expect(result.metadata?.internalWorkflow).toBeDefined();
      expect(result.metadata?.internalWorkflow?.executedSteps).toBeDefined();
    });

    it('should execute decision tree correctly - high confidence path', async () => {
      const agentInstance = await service.resolveAgent('test-workflow-agent');
      
      // Modify the agent to return high confidence
      const originalAnalyzeResults = agentInstance.instance.analyzeResults;
      agentInstance.instance.analyzeResults = async (context: TaskExecutionContext) => {
        const { state } = context;
        return {
          state: {
            ...state,
            metadata: {
              ...state.metadata,
              analysisCompleted: true,
              analysis: { confidence: 0.9 },
              confidenceScore: 0.9,
            },
          },
        };
      };

      const initialState: WorkflowState = {
        metadata: { inputData: 'high-confidence-test' },
      };

      const result = await agentInstance.nodeFunction(initialState);

      expect(result.metadata?.confidenceScore).toBe(0.9);
      expect(result.metadata?.workflowPath).toBe('finalize');
      expect(result.metadata?.finalized).toBe(true);
      expect(result.metadata?.improved).toBeUndefined();

      // Restore original method
      agentInstance.instance.analyzeResults = originalAnalyzeResults;
    });

    it('should execute decision tree correctly - low confidence path', async () => {
      const agentInstance = await service.resolveAgent('test-workflow-agent');
      
      // Modify the agent to return low confidence
      const originalAnalyzeResults = agentInstance.instance.analyzeResults;
      agentInstance.instance.analyzeResults = async (context: TaskExecutionContext) => {
        const { state } = context;
        return {
          state: {
            ...state,
            metadata: {
              ...state.metadata,
              analysisCompleted: true,
              analysis: { confidence: 0.6 },
              confidenceScore: 0.6,
            },
          },
        };
      };

      const initialState: WorkflowState = {
        metadata: { inputData: 'low-confidence-test' },
      };

      const result = await agentInstance.nodeFunction(initialState);

      expect(result.metadata?.confidenceScore).toBe(0.6);
      expect(result.metadata?.workflowPath).toBe('improve');
      expect(result.metadata?.improved).toBe(true);
      expect(result.metadata?.finalized).toBeUndefined();

      // Restore original method
      agentInstance.instance.analyzeResults = originalAnalyzeResults;
    });

    it('should track workflow execution metadata', async () => {
      const agentInstance = await service.resolveAgent('test-workflow-agent');
      const initialState: WorkflowState = {
        metadata: { inputData: 'metadata-test' },
      };

      const result = await agentInstance.nodeFunction(initialState);

      const internalWorkflow = result.metadata?.internalWorkflow;
      expect(internalWorkflow).toBeDefined();
      expect(internalWorkflow?.executedSteps).toBeInstanceOf(Array);
      expect(internalWorkflow?.executedSteps.length).toBeGreaterThan(0);
      expect(internalWorkflow?.executionTime).toBeGreaterThan(0);
      expect(internalWorkflow?.stepCount).toBeGreaterThan(0);
      expect(internalWorkflow?.completedAt).toBeDefined();
    });
  });

  describe('Registry Statistics and Management', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should provide comprehensive registry statistics', () => {
      const stats = service.getRegistryStats();

      expect(stats.totalAgents).toBe(2);
      expect(stats.agentsByType['simple-agent']).toBe(1);
      expect(stats.agentsByType['workflow-agent']).toBe(1);
      expect(stats.agentsByPriority['medium']).toBe(1);
      expect(stats.agentsByPriority['high']).toBe(1);
    });

    it('should identify workflow agents correctly', () => {
      expect(service.isWorkflowAgent('test-simple-agent')).toBe(false);
      expect(service.isWorkflowAgent('test-workflow-agent')).toBe(true);
    });

    it('should provide workflow agent statistics', async () => {
      // Execute workflow agent to generate stats
      const agentInstance = await service.resolveAgent('test-workflow-agent');
      await agentInstance.nodeFunction({ metadata: { inputData: 'stats-test' } });

      const workflowStats = service.getWorkflowAgentStats('test-workflow-agent');
      
      expect(workflowStats.isWorkflowAgent).toBe(true);
      expect(workflowStats.internalSteps).toBeGreaterThan(0);
      expect(workflowStats.internalStepsExecuted).toBeGreaterThan(0);
    });

    it('should handle non-existent agents gracefully', () => {
      expect(service.hasAgent('non-existent-agent')).toBe(false);
      expect(service.getAgentRegistration('non-existent-agent')).toBeUndefined();
      expect(service.isWorkflowAgent('non-existent-agent')).toBe(false);
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should handle agent resolution errors', async () => {
      await expect(service.resolveAgent('non-existent-agent')).rejects.toThrow();
    });

    it('should handle workflow execution errors gracefully', async () => {
      const agentInstance = await service.resolveAgent('test-workflow-agent');
      
      // Modify a step to throw an error
      const originalProcessData = agentInstance.instance.processData;
      agentInstance.instance.processData = async () => {
        throw new Error('Simulated step error');
      };

      const initialState: WorkflowState = {
        metadata: { inputData: 'error-test' },
      };

      // The workflow should handle the error according to errorRecovery settings
      await expect(agentInstance.nodeFunction(initialState)).rejects.toThrow();

      // Restore original method
      agentInstance.instance.processData = originalProcessData;
    });
  });

  describe('Performance and Optimization', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should execute workflow agent efficiently', async () => {
      const agentInstance = await service.resolveAgent('test-workflow-agent');
      const initialState: WorkflowState = {
        metadata: { inputData: 'performance-test' },
      };

      const startTime = performance.now();
      const result = await agentInstance.nodeFunction(initialState);
      const executionTime = performance.now() - startTime;

      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.metadata?.internalWorkflow?.executionTime).toBeLessThan(executionTime);
    });

    it('should maintain execution statistics', async () => {
      const agentInstance = await service.resolveAgent('test-workflow-agent');
      const initialExecutionCount = agentInstance.metadata.executionCount;

      await agentInstance.nodeFunction({ metadata: { inputData: 'stats-test-1' } });
      await agentInstance.nodeFunction({ metadata: { inputData: 'stats-test-2' } });

      expect(agentInstance.metadata.executionCount).toBe(initialExecutionCount + 2);
      expect(agentInstance.metadata.averageExecutionTime).toBeGreaterThan(0);
      expect(agentInstance.metadata.lastExecuted).toBeDefined();
    });
  });
});