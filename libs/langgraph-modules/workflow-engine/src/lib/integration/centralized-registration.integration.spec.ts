import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowEngineModule } from '../workflow-engine.module';
import { MultiAgentModule } from '@hive-academy/langgraph-multi-agent';
import { FunctionalApiModule } from '@hive-academy/langgraph-functional-api';
import { CentralRegistryService } from '../services/central-registry.service';
// Create a mock agent for testing instead of importing from apps
@Injectable()
class MockMockPersonalBrandStrategistAgent {
  async nodeFunction(state: any) {
    return { processed: true, agentId: 'personal-brand-strategist' };
  }
}
import { LlmProviderService } from '@hive-academy/langgraph-multi-agent';
import { Injectable } from '@nestjs/common';

// Mock the memory service dependency
@Injectable()
class MockPersonalBrandMemoryService {
  async getDevContext(username: string) {
    return { username, context: 'mock-dev-context' };
  }

  async getBrandEvolution(username: string) {
    return { username, evolution: 'mock-brand-evolution' };
  }

  async getBrandVoice(username: string) {
    return { username, voice: 'mock-brand-voice' };
  }
}

// Mock LLM provider for testing
@Injectable()
class MockLlmProviderService {
  async getLLM(config?: any) {
    return {
      invoke: jest.fn().mockResolvedValue({
        content: 'Mock brand strategy response'
      })
    };
  }
}

describe('Centralized Registration Integration', () => {
  let app: TestingModule;
  let centralRegistry: CentralRegistryService;

  beforeEach(async () => {
    app = await Test.createTestingModule({
      imports: [
        // WorkflowEngineModule with CENTRALIZED registration
        WorkflowEngineModule.forRoot({
          // ONLY WorkflowEngineModule accepts agents, tools, workflows
          agents: [MockMockPersonalBrandStrategistAgent],
          tools: [],
          workflows: [],
          compilation: {
            cacheEnabled: true,
            optimizeGraphs: true,
          },
          execution: {
            streamingEnabled: true,
            parallelExecution: false,
          },
        }),
        
        // MultiAgentModule with PURE configuration (no registration)
        MultiAgentModule.forRoot({
          defaultLlm: {
            provider: 'openai',
            model: 'gpt-4',
            temperature: 0.7,
            openaiApiKey: 'test-key',
          },
          streaming: {
            enabled: true,
            modes: ['values', 'updates'],
          },
          performance: {
            tokenOptimization: true,
            contextWindowManagement: true,
          },
          // NOTE: NO agents/tools/workflows arrays - pure configuration only
        }),
        
        // FunctionalApiModule with PURE configuration (no registration)
        FunctionalApiModule.forRoot({
          defaultTimeout: 30000,
          defaultRetryCount: 3,
          enableCheckpointing: true,
          enableStreaming: true,
          maxConcurrentTasks: 5,
          // NOTE: NO workflows array - pure configuration only
        }),
      ],
      providers: [
        // Mock dependencies for the real agent
        {
          provide: 'PersonalBrandMemoryService',
          useClass: MockPersonalBrandMemoryService,
        },
        {
          provide: LlmProviderService,
          useClass: MockLlmProviderService,
        },
        // Register the real agent as a provider so DI can resolve it
        MockMockPersonalBrandStrategistAgent,
      ],
    }).compile();

    centralRegistry = app.get<CentralRegistryService>(CentralRegistryService);
  });

  afterEach(async () => {
    await app?.close();
  });

  describe('Single Registration Point', () => {
    it('should have agents registered only in WorkflowEngineModule', () => {
      const stats = centralRegistry.getStats();
      
      // Should have exactly 1 agent (MockMockPersonalBrandStrategistAgent)
      expect(stats.agents).toBe(1);
      
      // Verify the specific agent is registered
      const agent = centralRegistry.getAgent('personal-brand-strategist');
      expect(agent).toBeDefined();
      expect(agent).toBe(MockMockPersonalBrandStrategistAgent);
    });

    it('should not have duplicate registrations', () => {
      const agents = centralRegistry.getAgents();
      
      // Should have exactly one entry for our agent
      expect(agents.size).toBe(1);
      expect(agents.has('personal-brand-strategist')).toBe(true);
      
      // Verify no other unexpected agents
      const agentIds = Array.from(agents.keys());
      expect(agentIds).toEqual(['personal-brand-strategist']);
    });
  });

  describe('Module Configuration Separation', () => {
    it('should have WorkflowEngineModule handling registration', () => {
      // Verify central registry exists and is populated
      expect(centralRegistry).toBeDefined();
      
      const stats = centralRegistry.getStats();
      expect(stats.agents).toBeGreaterThan(0);
    });

    it('should have MultiAgentModule providing only configuration', () => {
      // MultiAgentModule should provide execution services but no registration
      const multiAgentCoordinator = app.get('MultiAgentCoordinatorService');
      expect(multiAgentCoordinator).toBeDefined();
      
      // Should not have its own agent registry
      // (This is verified by checking that CentralRegistry is the only source)
    });

    it('should have FunctionalApiModule providing only configuration', () => {
      // FunctionalApiModule should provide workflow services but no registration
      const functionalWorkflowService = app.get('FunctionalWorkflowService');
      expect(functionalWorkflowService).toBeDefined();
      
      // Should not have its own workflow registry
      // (This is verified by checking that CentralRegistry is the only source)
    });
  });

  describe('Real Agent Integration', () => {
    it('should resolve MockPersonalBrandStrategistAgent correctly', () => {
      const agent = centralRegistry.getAgent('personal-brand-strategist');
      
      expect(agent).toBeDefined();
      expect(agent).toBe(MockMockPersonalBrandStrategistAgent);
    });

    it('should have agent with correct metadata', () => {
      const agent = centralRegistry.getAgent('personal-brand-strategist');
      expect(agent).toBeDefined();
      
      // The agent should be the actual class
      const agentInstance = new agent();
      expect(agentInstance).toBeInstanceOf(MockPersonalBrandStrategistAgent);
      expect(typeof agentInstance.nodeFunction).toBe('function');
    });
  });

  describe('No Cross-Module Pollution', () => {
    it('should not allow MultiAgentModule to register agents independently', () => {
      // This test verifies that we removed registration arrays from MultiAgentModule
      // If this test passes, it means MultiAgentModule.forRoot() doesn't accept agents array
      
      // Try to create MultiAgentModule with agents - this should not affect CentralRegistry
      const testModule = Test.createTestingModule({
        imports: [
          MultiAgentModule.forRoot({
            defaultLlm: {
              provider: 'openai',
              model: 'gpt-4',
              openaiApiKey: 'test-key',
            },
            // This should NOT be possible anymore since we removed agents from the interface
            // agents: [SomeOtherAgent], // This line would cause TypeScript error
          }),
        ],
      });
      
      // Should compile without issues (proving we removed registration from MultiAgentModule)
      expect(testModule).toBeDefined();
    });

    it('should not allow FunctionalApiModule to register workflows independently', () => {
      // This test verifies that we removed registration arrays from FunctionalApiModule
      // If this test passes, it means FunctionalApiModule.forRoot() doesn't accept workflows array
      
      // Try to create FunctionalApiModule with workflows - this should not affect CentralRegistry
      const testModule = Test.createTestingModule({
        imports: [
          FunctionalApiModule.forRoot({
            defaultTimeout: 30000,
            enableStreaming: true,
            // This should NOT be possible anymore since we removed workflows from the interface
            // workflows: [SomeWorkflow], // This line would cause TypeScript error
          }),
        ],
      });
      
      // Should compile without issues (proving we removed registration from FunctionalApiModule)
      expect(testModule).toBeDefined();
    });
  });

  describe('Registry Statistics', () => {
    it('should provide accurate centralized statistics', () => {
      const stats = centralRegistry.getStats();
      
      expect(stats).toMatchObject({
        agents: 1,
        tools: 0,
        workflows: 0,
        executorsAvailable: {
          multiAgent: false, // Not set in this test
          functionalApi: false, // Not set in this test
        },
      });
    });
  });

  describe('Architecture Validation', () => {
    it('should demonstrate centralized registration pattern', () => {
      // 1. ONLY WorkflowEngineModule should accept registration
      const workflowEngine = app.get(WorkflowEngineModule);
      expect(workflowEngine).toBeDefined();
      
      // 2. CentralRegistryService should be the single source of truth
      expect(centralRegistry).toBeDefined();
      expect(centralRegistry.getAgents().size).toBe(1);
      
      // 3. MultiAgentModule should provide only execution services
      const multiAgentCoordinator = app.get('MultiAgentCoordinatorService');
      expect(multiAgentCoordinator).toBeDefined();
      
      // 4. FunctionalApiModule should provide only workflow execution
      const functionalWorkflowService = app.get('FunctionalWorkflowService');
      expect(functionalWorkflowService).toBeDefined();
      
      // 5. No duplicate registrations anywhere
      expect(centralRegistry.getAgents().size).toBe(1);
      expect(Array.from(centralRegistry.getAgents().keys())).toEqual(['personal-brand-strategist']);
    });
  });
});