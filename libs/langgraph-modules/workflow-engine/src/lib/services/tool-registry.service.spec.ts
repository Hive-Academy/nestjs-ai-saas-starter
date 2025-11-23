import { Test, TestingModule } from '@nestjs/testing';
import { ToolRegistryService } from './tool-registry.service';
import { ModuleRef } from '@nestjs/core';
import { Tool } from '../decorators/multi-agent/tool.decorator';
import { z } from 'zod';
import { WorkflowAuthContext } from '../interfaces/auth-context.interface';

class TestTools {
  @Tool({
    name: 'free-tool',
    description: 'Free tool',
    schema: z.object({ input: z.string() }),
    auth: { required: true, tiers: ['free', 'pro'] },
  })
  async freeTool(input: { input: string }) {
    return `Free: ${input.input}`;
  }

  @Tool({
    name: 'pro-tool',
    description: 'Pro tool',
    schema: z.object({ input: z.string() }),
    auth: { required: true, tiers: ['pro'] },
  })
  async proTool(input: { input: string }) {
    return `Pro: ${input.input}`;
  }
}

describe('ToolRegistryService Auth', () => {
  let service: ToolRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolRegistryService,
        {
          provide: ModuleRef,
          useValue: {
            get: jest.fn().mockReturnValue(new TestTools()),
          },
        },
        {
          provide: 'WORKFLOW_ENGINE_TOOL_CLASSES',
          useValue: [TestTools],
        },
      ],
    }).compile();

    service = module.get<ToolRegistryService>(ToolRegistryService);
    await service.onModuleInit();
  });

  it('should allow free user to access free tool', async () => {
    const tools = service.getTools(['free-tool']);
    const tool = tools[0];

    const context: WorkflowAuthContext = {
      user: {
        id: '1',
        email: 'test@test.com',
        roles: [],
        tier: 'free',
        permissions: [],
      },
    };

    const result = await tool.invoke({ input: 'test' }, {
      configurable: { context },
    } as any);
    // Note: In some LangChain versions context is passed via configurable or directly in config
    // We implemented it expecting runtime.context.
    // Let's try passing it in config directly as well to be safe with the test harness

    // Actually, let's look at how we implemented it:
    // const user = runtime.context?.user;
    // runtime extends RunnableConfig which has context?
    // In types.d.ts: type ToolRunnableConfig = RunnableConfig & { context?: ContextSchema };
    // So passing { context } in the second arg to invoke should work.

    const res = await tool.invoke({ input: 'test' }, { context } as any);
    expect(res).toBe('Free: test');
  });

  it('should block free user from pro tool', async () => {
    const tools = service.getTools(['pro-tool']);
    const tool = tools[0];

    const context: WorkflowAuthContext = {
      user: {
        id: '1',
        email: 'test@test.com',
        roles: [],
        tier: 'free',
        permissions: [],
      },
    };

    const res = await tool.invoke({ input: 'test' }, { context } as any);
    expect(res).toEqual(
      expect.objectContaining({
        error: true,
        message: expect.stringContaining('Requires pro tier'),
        tool: 'pro-tool',
      })
    );
  });

  it('should allow pro user to access pro tool', async () => {
    const tools = service.getTools(['pro-tool']);
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

    const res = await tool.invoke({ input: 'test' }, { context } as any);
    expect(res).toBe('Pro: test');
  });

  it('should block unauthenticated user', async () => {
    const tools = service.getTools(['pro-tool']);
    const tool = tools[0];

    // No context
    const res = await tool.invoke({ input: 'test' });
    expect(res).toEqual(
      expect.objectContaining({
        error: true,
        message: 'Authentication required',
      })
    );
  });
});
