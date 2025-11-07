import { Test } from '@nestjs/testing';
import { FunctionalApiModule } from './functional-api.module';
import { WorkflowValidator } from './validation/workflow-validator';
import { FUNCTIONAL_API_MODULE_OPTIONS } from './constants/module.constants';
import {
  NoOpCheckpointAdapter,
  type IStreamingService,
  type IMemoryAdapter,
} from '@hive-academy/langgraph-core';

// Mock implementations for testing
class MockStreamingService implements IStreamingService {
  async initializeTokenStream(options: any): Promise<void> {
    // Mock implementation
  }

  streamToken(
    executionId: string,
    nodeId: string,
    token: string,
    metadata?: Record<string, unknown>
  ): void {
    // Mock implementation
  }

  async flushTokens(executionId: string, nodeId: string): Promise<void> {
    // Mock implementation
  }

  streamEvent(executionId: string, nodeId: string, event: any): void {
    // Mock implementation
  }

  async emitEvent(eventType: string, data: any): Promise<void> {
    // Mock implementation
  }

  streamProgress(executionId: string, nodeId: string, progress: any): void {
    // Mock implementation
  }

  async emitProgress(eventType: string, data: any): Promise<void> {
    // Mock implementation
  }

  async broadcastToExecution(executionId: string, data: any): Promise<void> {
    // Mock implementation
  }

  async sendToClient(clientId: string, data: any): Promise<void> {
    // Mock implementation
  }
}

class MockMemoryAdapter implements IMemoryAdapter {
  async getAgentContext(state: any): Promise<any> {
    return {
      threadMemories: [],
      userMemories: [],
      agentMemories: [],
      userPatterns: {
        userId: 'test',
        commonTopics: [],
        interactionFrequency: {},
        preferredMemoryTypes: [],
        averageSessionLength: 0,
        totalSessions: 0,
      },
      relevanceScore: 0,
      contextWindow: 0,
    };
  }

  async storeAgentExecution(
    state: any,
    result: any,
    agentId: string
  ): Promise<void> {
    // Mock implementation
  }

  async storeConversationTurn(
    threadId: string,
    humanMessage: string,
    aiMessage: string,
    metadata?: any
  ): Promise<void> {
    // Mock implementation
  }

  getStore(collection?: string): any {
    return {
      search: async () => [],
      get: async () => null,
      put: async () => Promise.resolve(),
      delete: async () => Promise.resolve(),
      list: async () => [],
    };
  }

  async search(options: any): Promise<any[]> {
    return [];
  }

  async store(
    threadId: string,
    content: string,
    metadata?: any
  ): Promise<string> {
    return 'mock-id';
  }

  async storeBatch(threadId: string, entries: any[]): Promise<string[]> {
    return ['mock-id'];
  }

  async getUserPatterns(userId: string, limitDays?: number): Promise<any> {
    return {
      userId,
      commonTopics: [],
      interactionFrequency: {},
      preferredMemoryTypes: [],
      averageSessionLength: 0,
      totalSessions: 0,
    };
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}

describe('FunctionalApiModule', () => {
  describe('forRoot', () => {
    it('should create module with default options', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [FunctionalApiModule.forRoot()],
      }).compile();

      const workflowValidator =
        moduleRef.get<WorkflowValidator>(WorkflowValidator);
      const moduleOptions = moduleRef.get(FUNCTIONAL_API_MODULE_OPTIONS);

      expect(workflowValidator).toBeDefined();
      expect(moduleOptions).toBeDefined();
      expect(moduleOptions.defaultTimeout).toBe(30000);
      expect(moduleOptions.enableCheckpointing).toBe(true);
    });

    it('should create module with custom options', async () => {
      const customAdapter = new NoOpCheckpointAdapter();

      const moduleRef = await Test.createTestingModule({
        imports: [
          FunctionalApiModule.forRoot({
            checkpointAdapter: customAdapter,
            defaultTimeout: 5000,
            enableStreaming: true,
          }),
        ],
      }).compile();

      const workflowValidator =
        moduleRef.get<WorkflowValidator>(WorkflowValidator);
      const moduleOptions = moduleRef.get(FUNCTIONAL_API_MODULE_OPTIONS);

      expect(workflowValidator).toBeDefined();
      expect(moduleOptions.checkpointAdapter).toBe(customAdapter);
      expect(moduleOptions.defaultTimeout).toBe(5000);
      expect(moduleOptions.enableStreaming).toBe(true);
    });
  });

  describe('forRootAsync', () => {
    it('should create module with async factory', async () => {
      const customAdapter = new NoOpCheckpointAdapter();

      const moduleRef = await Test.createTestingModule({
        imports: [
          FunctionalApiModule.forRootAsync({
            useFactory: () => ({
              checkpointAdapter: customAdapter,
              defaultTimeout: 5000,
            }),
          }),
        ],
      }).compile();

      const workflowValidator =
        moduleRef.get<WorkflowValidator>(WorkflowValidator);
      const moduleOptions = moduleRef.get(FUNCTIONAL_API_MODULE_OPTIONS);

      expect(workflowValidator).toBeDefined();
      expect(moduleOptions.checkpointAdapter).toBe(customAdapter);
      expect(moduleOptions.defaultTimeout).toBe(5000);
    });

    it('should work with streaming and memory adapters', async () => {
      const mockStreamingService = new MockStreamingService();
      const mockMemoryAdapter = new MockMemoryAdapter();
      const customAdapter = new NoOpCheckpointAdapter();

      const moduleRef = await Test.createTestingModule({
        imports: [
          FunctionalApiModule.forRoot({
            checkpointAdapter: customAdapter,
            streamingAdapter: mockStreamingService,
            memoryAdapter: mockMemoryAdapter,
          }),
        ],
      }).compile();

      const workflowValidator =
        moduleRef.get<WorkflowValidator>(WorkflowValidator);
      const moduleOptions = moduleRef.get(FUNCTIONAL_API_MODULE_OPTIONS);

      expect(workflowValidator).toBeDefined();
      expect(moduleOptions.streamingAdapter).toBe(mockStreamingService);
      expect(moduleOptions.memoryAdapter).toBe(mockMemoryAdapter);
    });
  });
});
