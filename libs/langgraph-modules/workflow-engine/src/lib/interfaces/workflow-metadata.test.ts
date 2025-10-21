/**
 * Test file to validate the generic metadata system
 * This ensures type safety and proper functionality
 */

import {
  type WorkflowCheckpointMetadata,
  type WorkflowStreamMetadata,
  WorkflowCheckpointRecord,
  type WorkflowCheckpointListResult,
  type WorkflowAIMetadata,
  type WorkflowPerformanceMetadata,
  type WorkflowBusinessMetadata,
  type CreateWorkflowMetadata,
  type CreateCheckpointRecord,
} from './workflow-metadata.interface';

describe('Workflow Metadata Types', () => {
  it('should compile with proper types', () => {
    expect(true).toBe(true);
  });
});

// Test 1: Basic metadata creation
function testBasicMetadataCreation(): void {
  const metadata: WorkflowCheckpointMetadata<{ customField: string }> = {
    timestamp: new Date().toISOString(),
    source: 'input',
    step: 1,
    parents: {},
    executionId: 'test-execution-123',
    type: 'initial',
    created_at: new Date().toISOString(),
    payload: {
      customField: 'test-value',
    },
  };

  // Type assertion tests
  const executionId: string = metadata.executionId;
  const customField: string = metadata.payload?.customField ?? '';
  const type: 'initial' | 'progress' | 'final' | 'error' | 'milestone' =
    metadata.type;

  console.log('✅ Basic metadata creation test passed');
}

// Test 2: AI workflow metadata
function testAIWorkflowMetadata(): void {
  type AIMetadata = WorkflowAIMetadata & {
    promptVersion: string;
  };

  const aiMetadata: CreateWorkflowMetadata<AIMetadata> = {
    timestamp: new Date().toISOString(),
    source: 'update',
    step: 2,
    parents: {},
    executionId: 'ai-workflow-456',
    type: 'progress',
    created_at: new Date().toISOString(),
    payload: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
      promptVersion: 'v2.1',
      tokenUsage: {
        prompt: 150,
        completion: 300,
        total: 450,
      },
    },
  };

  // Type assertions
  const model: string = aiMetadata.payload?.model ?? '';
  const tokenCount: number = aiMetadata.payload?.tokenUsage?.total ?? 0;
  const promptVersion: string = aiMetadata.payload?.promptVersion ?? '';

  console.log('✅ AI workflow metadata test passed');
}

// Test 3: Checkpoint record with generics
function testCheckpointRecord(): void {
  interface WorkflowData {
    input: string;
    output: string;
    status: 'processing' | 'completed';
  }

  const checkpointRecord: CreateCheckpointRecord<
    WorkflowData,
    WorkflowPerformanceMetadata
  > = {
    id: 'checkpoint-789',
    thread_id: 'thread-abc',
    checkpoint: {
      version: 1,
      data: {
        input: 'user query',
        output: 'ai response',
        status: 'completed',
      },
    },
    metadata: {
      timestamp: new Date().toISOString(),
      source: 'update',
      step: 3,
      parents: {},
      executionId: 'exec-789',
      type: 'final',
      created_at: new Date().toISOString(),
      payload: {
        duration: 1500,
        memoryUsage: 256,
        cpuUsage: 45,
        networkCalls: 3,
        cacheHits: 12,
        cacheMisses: 2,
      },
    },
  };

  // Type assertions
  const status: 'processing' | 'completed' =
    checkpointRecord.checkpoint.data.status;
  const duration: number = checkpointRecord.metadata.payload?.duration ?? 0;
  const version: number = checkpointRecord.checkpoint.version;

  console.log('✅ Checkpoint record test passed');
}

// Test 4: Stream metadata
function testStreamMetadata(): void {
  interface StreamData {
    eventType: 'user_action' | 'system_event';
    priority: number;
  }

  const streamMetadata: WorkflowStreamMetadata<StreamData> = {
    timestamp: new Date().toISOString(),
    source: 'update',
    step: 1,
    parents: {},
    executionId: 'stream-exec-101',
    type: 'progress',
    created_at: new Date().toISOString(),
    sequenceNumber: 42,
    streamType: 'event',
    streamData: {
      eventType: 'user_action',
      priority: 5,
    },
    buffer: {
      size: 1024,
      accumulated: 'partial content',
      progress: 75.5,
    },
  };

  // Type assertions
  const sequenceNumber: number = streamMetadata.sequenceNumber;
  const streamType:
    | 'token'
    | 'message'
    | 'event'
    | 'progress'
    | 'milestone'
    | 'debug' = streamMetadata.streamType;
  const eventType: 'user_action' | 'system_event' =
    streamMetadata.streamData?.eventType ?? 'system_event';
  const bufferProgress: number = streamMetadata.buffer?.progress ?? 0;

  console.log('✅ Stream metadata test passed');
}

// Test 5: Checkpoint list result
function testCheckpointListResult(): void {
  interface SimpleData {
    message: string;
  }

  interface SimpleMetadata {
    category: string;
  }

  const listResult: WorkflowCheckpointListResult<SimpleData, SimpleMetadata> = {
    checkpoints: [
      {
        id: 'cp-1',
        thread_id: 'thread-1',
        checkpoint: {
          version: 1,
          data: { message: 'Hello' },
        },
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'input',
          step: 1,
          parents: {},
          executionId: 'exec-1',
          type: 'initial',
          created_at: new Date().toISOString(),
          payload: { category: 'greeting' },
        },
      },
    ],
    total: 1,
    hasMore: false,
  };

  // Type assertions
  const firstCheckpoint = listResult.checkpoints[0];
  const message: string = firstCheckpoint.checkpoint.data.message;
  const category: string = firstCheckpoint.metadata.payload?.category ?? '';
  const hasMore: boolean = listResult.hasMore;

  console.log('✅ Checkpoint list result test passed');
}

// Test 6: Type validation - this should cause TypeScript errors if types are wrong
function testTypeValidation(): void {
  // This should work - valid metadata structure
  const validMetadata: WorkflowCheckpointMetadata<{ flag: boolean }> = {
    timestamp: new Date().toISOString(),
    source: 'input',
    step: 1,
    parents: {},
    executionId: 'valid-exec',
    type: 'progress',
    created_at: new Date().toISOString(),
    payload: { flag: true },
  };

  // Type assertions that should compile without errors
  const isValid: boolean = validMetadata.payload?.flag ?? false;
  const readonlyId: string = validMetadata.executionId; // Should be readonly

  // These should cause compilation errors if uncommented:
  // validMetadata.executionId = 'new-id'; // Error: readonly property
  // validMetadata.type = 'invalid-type'; // Error: invalid type
  // validMetadata.payload = { wrongField: 'value' }; // Error: wrong payload type

  console.log('✅ Type validation test passed');
}

// Test 7: Complex multi-domain metadata
function testComplexMetadata(): void {
  type ComplexMetadata = WorkflowAIMetadata &
    WorkflowBusinessMetadata &
    WorkflowPerformanceMetadata & {
      customDomain: {
        version: string;
        features: string[];
      };
    };

  const complexMetadata: CreateWorkflowMetadata<ComplexMetadata> = {
    timestamp: new Date().toISOString(),
    source: 'update',
    step: 5,
    parents: {},
    executionId: 'complex-exec-999',
    type: 'milestone',
    created_at: new Date().toISOString(),
    payload: {
      // AI metadata
      model: 'gpt-4-turbo',
      temperature: 0.3,
      tokenUsage: { prompt: 200, completion: 800, total: 1000 },

      // Business metadata
      tenantId: 'enterprise-123',
      organizationId: 'org-456',
      environment: 'production',

      // Performance metadata
      duration: 2500,
      memoryUsage: 512,
      cpuUsage: 78,

      // Custom domain metadata
      customDomain: {
        version: '3.2.1',
        features: ['advanced-ai', 'real-time', 'analytics'],
      },
    },
  };

  // Type assertions across all domains
  const model: string = complexMetadata.payload?.model ?? '';
  const tenantId: string = complexMetadata.payload?.tenantId ?? '';
  const duration: number = complexMetadata.payload?.duration ?? 0;
  const features: string[] =
    complexMetadata.payload?.customDomain?.features ?? [];

  console.log('✅ Complex metadata test passed');
}

// Run all tests
export function runMetadataTests(): void {
  console.log('🧪 Running workflow metadata type safety tests...\n');

  try {
    testBasicMetadataCreation();
    testAIWorkflowMetadata();
    testCheckpointRecord();
    testStreamMetadata();
    testCheckpointListResult();
    testTypeValidation();
    testComplexMetadata();

    console.log('\n✅ All metadata type safety tests passed!');
    console.log('🎉 Generic metadata system is working correctly.');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Export for potential runtime testing
export const MetadataTestSuite = {
  testBasicMetadataCreation,
  testAIWorkflowMetadata,
  testCheckpointRecord,
  testStreamMetadata,
  testCheckpointListResult,
  testTypeValidation,
  testComplexMetadata,
  runMetadataTests,
};
