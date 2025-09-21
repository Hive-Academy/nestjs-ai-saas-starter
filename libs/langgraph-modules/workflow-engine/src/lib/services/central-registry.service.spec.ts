import { Test, TestingModule } from '@nestjs/testing';
import { ModuleRef } from '@nestjs/core';
import { CentralRegistryService } from './central-registry.service';
import { Agent } from '@hive-academy/langgraph-multi-agent';
import { Injectable } from '@nestjs/common';

// Mock agent for testing
@Agent({
  id: 'test-agent',
  name: 'Test Agent',
  description: 'Agent for testing centralized registration',
  capabilities: ['testing', 'validation'],
  tools: ['test-tool'],
  priority: 'high',
  executionTime: 'fast',
})
@Injectable()
class TestAgent {
  async nodeFunction(state: any): Promise<any> {
    return {
      ...state,
      testCompleted: true,
      testAgent: 'executed',
    };
  }
}

// Mock tool for testing
@Injectable()
class TestTool {
  name = 'test-tool';
  description = 'Tool for testing';

  async execute(input: any): Promise<any> {
    return { result: 'test-tool-executed', input };
  }
}

// Mock workflow for testing
@Injectable()
class TestWorkflow {
  name = 'test-workflow';
  description = 'Workflow for testing';

  async execute(input: any): Promise<any> {
    return { result: 'test-workflow-executed', input };
  }
}

describe('CentralRegistryService', () => {
  let service: CentralRegistryService;
  let moduleRef: ModuleRef;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CentralRegistryService,
        {
          provide: 'WORKFLOW_ENGINE_AGENTS',
          useValue: [TestAgent],
        },
        {
          provide: 'WORKFLOW_ENGINE_TOOLS',
          useValue: [TestTool],
        },
        {
          provide: 'WORKFLOW_ENGINE_WORKFLOWS',
          useValue: [TestWorkflow],
        },
        TestAgent,
        TestTool,
        TestWorkflow,
      ],
    }).compile();

    service = module.get<CentralRegistryService>(CentralRegistryService);
    moduleRef = module.get<ModuleRef>(ModuleRef);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Registry Initialization', () => {
    it('should initialize with configured agents', () => {
      const agents = service.getAgents();
      expect(agents.size).toBe(1);
      // The ID extraction uses the class name if no decorator metadata is available
      expect(agents.has('TestAgent')).toBe(true);
    });

    it('should initialize with configured tools', () => {
      const tools = service.getTools();
      expect(tools.size).toBe(1);
      expect(tools.has('TestTool')).toBe(true);
    });

    it('should initialize with configured workflows', () => {
      const workflows = service.getWorkflows();
      expect(workflows.size).toBe(1);
      expect(workflows.has('TestWorkflow')).toBe(true);
    });
  });

  describe('Agent Management', () => {
    it('should register agent providers', () => {
      const agentsBefore = service.getAgents().size;
      service.registerAgent(TestAgent);
      const agentsAfter = service.getAgents().size;
      
      // Should not increase since TestAgent is already registered
      expect(agentsAfter).toEqual(agentsBefore);
    });

    it('should retrieve specific agent', () => {
      const agent = service.getAgent('TestAgent');
      expect(agent).toBeDefined();
      expect(agent).toBe(TestAgent);
    });

    it('should return undefined for non-existent agent', () => {
      const agent = service.getAgent('non-existent-agent');
      expect(agent).toBeUndefined();
    });
  });

  describe('Tool Management', () => {
    it('should register tool providers', () => {
      const toolsBefore = service.getTools().size;
      service.registerTool(TestTool);
      const toolsAfter = service.getTools().size;
      
      // Should not increase since TestTool is already registered
      expect(toolsAfter).toEqual(toolsBefore);
    });

    it('should retrieve specific tool', () => {
      const tool = service.getTool('TestTool');
      expect(tool).toBeDefined();
      expect(tool).toBe(TestTool);
    });
  });

  describe('Workflow Management', () => {
    it('should register workflow providers', () => {
      const workflowsBefore = service.getWorkflows().size;
      service.registerWorkflow(TestWorkflow);
      const workflowsAfter = service.getWorkflows().size;
      
      // Should not increase since TestWorkflow is already registered
      expect(workflowsAfter).toEqual(workflowsBefore);
    });

    it('should retrieve specific workflow', () => {
      const workflow = service.getWorkflow('TestWorkflow');
      expect(workflow).toBeDefined();
      expect(workflow).toBe(TestWorkflow);
    });
  });

  describe('Registry Statistics', () => {
    it('should provide accurate statistics', () => {
      const stats = service.getStats();
      
      expect(stats.agents).toBe(1);
      expect(stats.tools).toBe(1);
      expect(stats.workflows).toBe(1);
      expect(stats.executorsAvailable.multiAgent).toBe(false);
      expect(stats.executorsAvailable.functionalApi).toBe(false);
    });
  });

  describe('Execution Services Integration', () => {
    it('should set execution services', () => {
      const mockMultiAgentExecutor = {
        executeAgent: jest.fn(),
      };
      const mockFunctionalApiExecutor = {
        executeWorkflow: jest.fn(),
      };

      service.setExecutionServices({
        multiAgentExecutor: mockMultiAgentExecutor,
        functionalApiExecutor: mockFunctionalApiExecutor,
      });

      const stats = service.getStats();
      expect(stats.executorsAvailable.multiAgent).toBe(true);
      expect(stats.executorsAvailable.functionalApi).toBe(true);
    });
  });

  describe('Registry Clearing', () => {
    it('should clear all registrations', () => {
      // Verify initial state
      expect(service.getAgents().size).toBeGreaterThan(0);
      expect(service.getTools().size).toBeGreaterThan(0);
      expect(service.getWorkflows().size).toBeGreaterThan(0);

      // Clear registry
      service.clear();

      // Verify cleared state
      expect(service.getAgents().size).toBe(0);
      expect(service.getTools().size).toBe(0);
      expect(service.getWorkflows().size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when agent not found for execution', async () => {
      await expect(
        service.executeAgent('non-existent-agent', {})
      ).rejects.toThrow('Agent non-existent-agent not found in registry');
    });

    it('should throw error when workflow not found for execution', async () => {
      await expect(
        service.executeWorkflow('non-existent-workflow', {})
      ).rejects.toThrow('Workflow non-existent-workflow not found in registry');
    });

    it('should throw error when multi-agent executor not available', async () => {
      await expect(
        service.executeAgent('TestAgent', {})
      ).rejects.toThrow('Multi-agent executor not available');
    });

    it('should throw error when functional API executor not available', async () => {
      await expect(
        service.executeWorkflow('TestWorkflow', {})
      ).rejects.toThrow('Functional API executor not available');
    });
  });
});