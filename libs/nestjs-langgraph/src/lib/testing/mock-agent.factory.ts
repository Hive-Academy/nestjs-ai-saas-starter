import { Injectable } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage, AIMessage } from '@langchain/core/messages';

/**
 * Factory for creating mock agents and LLMs for testing
 */
@Injectable()
export class MockAgentFactory {
  /**
   * Create a mock LLM with predefined responses
   */
  createMockLLM(responses: Record<string, string>): BaseChatModel {
    const mockLLM = {
      async invoke(messages: BaseMessage[]): Promise<AIMessage> {
        const lastMessage = messages[messages.length - 1];
        const content = lastMessage.content as string;
        
        // Find matching response
        for (const [pattern, response] of Object.entries(responses)) {
          if (content.includes(pattern)) {
            return new AIMessage(response);
          }
        }
        
        return new AIMessage('Default mock response');
      },

      async stream(messages: BaseMessage[]): Promise<AsyncIterableIterator<any>> {
        const response = await this.invoke(messages);
        
        async function* generator() {
          yield { content: response.content };
        }
        
        return generator();
      },

      bindTools(tools: any[]): BaseChatModel {
        return this;
      },
    } as any;

    return mockLLM;
  }

  /**
   * Create a mock tool
   */
  createMockTool(name: string, response: any) {
    return {
      name,
      description: `Mock tool: ${name}`,
      schema: {
        type: 'object',
        properties: {},
      },
      func: async () => response,
    };
  }

  /**
   * Create a mock workflow
   */
  createMockWorkflow(name: string, result: any) {
    return {
      name,
      compile: () => ({
        invoke: async (state: any) => ({
          ...state,
          ...result,
        }),
        stream: async function* (state: any) {
          yield { ...state, ...result };
        },
      }),
    };
  }

  /**
   * Create a mock checkpoint saver
   */
  createMockCheckpointer() {
    const checkpoints = new Map<string, any>();
    
    return {
      async put(config: any, checkpoint: any) {
        const threadId = config.configurable?.thread_id || 'default';
        checkpoints.set(threadId, checkpoint);
      },

      async get(config: any) {
        const threadId = config.configurable?.thread_id || 'default';
        return checkpoints.get(threadId);
      },

      async list(config: any) {
        return Array.from(checkpoints.entries()).map(([threadId, checkpoint]) => ({
          threadId,
          checkpoint,
        }));
      },
    };
  }
}