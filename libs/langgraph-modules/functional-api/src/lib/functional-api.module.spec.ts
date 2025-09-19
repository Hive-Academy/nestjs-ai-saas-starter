import { Test } from '@nestjs/testing';
import { FunctionalApiModule } from './functional-api.module';
import { FunctionalWorkflowService } from './services/functional-workflow.service';
import {
  ICheckpointAdapter,
  NoOpCheckpointAdapter,
  IStreamingService,
  IMemoryAdapter,
} from '@hive-academy/langgraph-core';

// Mock implementations for testing
class MockStreamingService implements IStreamingService {
  streamEvent(threadId: string, taskName: string, event: any): void {
    // Mock implementation
  }
  
  getEventStream(threadId: string): any {
    // Mock implementation
    return null;
  }
  
  subscribeToEvents(threadId: string, callback: (event: any) => void): () => void {
    // Mock implementation
    return () => {
      // Cleanup function
    };
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
        totalSessions: 0
      },
      relevanceScore: 0,
      contextWindow: 0
    };
  }
  
  async storeAgentExecution(state: any, result: any, agentId: string): Promise<void> {
    // Mock implementation
  }
  
  async storeConversationTurn(threadId: string, humanMessage: string, aiMessage: string, metadata?: any): Promise<void> {
    // Mock implementation
  }
  
  getStore(collection?: string): any {
    return {
      search: async () => [],
      get: async () => null,
      put: async () => Promise.resolve(),
      delete: async () => Promise.resolve(),
      list: async () => []
    };
  }
  
  async search(options: any): Promise<any[]> {
    return [];
  }
  
  async store(threadId: string, content: string, metadata?: any): Promise<string> {
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
      totalSessions: 0
    };
  }
  
  async isHealthy(): Promise<boolean> {
    return true;
  }
}

describe('FunctionalApiModule', () => {
  describe('forRoot', () => {
    it('should create module without checkpoint adapter', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [FunctionalApiModule.forRoot()],
      }).compile();

      const workflowService = moduleRef.get<FunctionalWorkflowService>(
        FunctionalWorkflowService
      );
      const checkpointAdapter = moduleRef.get('ICheckpointAdapter');

      expect(workflowService).toBeDefined();
      expect(checkpointAdapter).toBeInstanceOf(NoOpCheckpointAdapter);
    });

    it('should create module with custom checkpoint adapter', async () => {
      const customAdapter = new NoOpCheckpointAdapter();

      const moduleRef = await Test.createTestingModule({
        imports: [
          FunctionalApiModule.forRoot({
            checkpointAdapter: customAdapter,
          }),
        ],
      }).compile();

      const workflowService = moduleRef.get<FunctionalWorkflowService>(
        FunctionalWorkflowService
      );
      const checkpointAdapter = moduleRef.get('ICheckpointAdapter');

      expect(workflowService).toBeDefined();
      expect(checkpointAdapter).toBe(customAdapter);
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

      const workflowService = moduleRef.get<FunctionalWorkflowService>(
        FunctionalWorkflowService
      );
      const checkpointAdapter = moduleRef.get('ICheckpointAdapter');

      expect(workflowService).toBeDefined();
      expect(checkpointAdapter).toBe(customAdapter);
    });
  });
});
