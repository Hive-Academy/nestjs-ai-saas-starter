import { Test, TestingModule } from '@nestjs/testing';
import { SupervisorGraphBuilder } from './supervisor-graph-builder';
import { ModuleRef } from '@nestjs/core';
import { LlmProviderService } from '../../llm/llm-provider.service';
import { MetadataProcessorService } from '../../../core/metadata-processor.service';
import { Agent } from '../../../decorators/multi-agent/agent.decorator';
import { WorkflowAuthContext } from '../../../interfaces/auth-context.interface';

@Agent({
  id: 'auth-agent',
  name: 'Auth Agent',
  description: 'Agent requiring auth',
  auth: { required: true, tiers: ['pro'] },
})
class AuthAgent {}

describe('SupervisorGraphBuilder Auth', () => {
  let builder: SupervisorGraphBuilder;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupervisorGraphBuilder,
        {
          provide: ModuleRef,
          useValue: {
            get: jest.fn().mockReturnValue(new AuthAgent()),
          },
        },
        {
          provide: LlmProviderService,
          useValue: {
            getLLM: jest.fn().mockResolvedValue({
              bindTools: jest.fn().mockReturnThis(),
              invoke: jest.fn(),
            }),
          },
        },
        {
          provide: MetadataProcessorService,
          useValue: {
            extractWorkflowDefinition: jest
              .fn()
              .mockReturnValue({ nodes: [], edges: [] }),
          },
        },
      ],
    }).compile();

    builder = module.get<SupervisorGraphBuilder>(SupervisorGraphBuilder);
  });

  it('should create tool with auth enforcement', async () => {
    // Access private method createWorkerTools via any
    const tools = await (builder as any).createWorkerTools([AuthAgent]);
    const tool = tools[0];

    expect(tool.name).toBe('auth-agent');

    // Test auth enforcement
    const context: WorkflowAuthContext = {
      user: {
        id: '1',
        email: 'test@test.com',
        roles: [],
        tier: 'free',
        permissions: [],
      },
    };

    // Invoke tool with context
    const res = await tool.invoke({ task: 'test' }, { context } as any);
    const output = JSON.parse(res);

    expect(output.error).toBe(true);
    expect(output.message).toContain('Requires pro tier');
  });

  it('should allow authorized user', async () => {
    // Mock buildAgentSubgraph to return a mock graph that returns success
    (builder as any).buildAgentSubgraph = jest.fn().mockReturnValue({
      compile: jest.fn().mockReturnValue({
        invoke: jest.fn().mockResolvedValue({
          messages: [{ content: 'Success' }],
        }),
      }),
    });

    const tools = await (builder as any).createWorkerTools([AuthAgent]);
    const tool = tools[0];

    const context: WorkflowAuthContext = {
      user: {
        id: '1',
        email: 'test@test.com',
        roles: [],
        tier: 'pro',
        permissions: [],
      },
    };

    const res = await tool.invoke({ task: 'test' }, { context } as any);
    expect(res).toBe('Success');
  });
});
