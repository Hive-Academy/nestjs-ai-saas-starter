import { DevBrandSupervisorWorkflow } from './devbrand-supervisor.workflow';
import { WorkflowExecutionService } from '@hive-academy/langgraph-workflow-engine';
import { PersonalBrandMemoryService } from '../../services/personal-brand-memory.service';

describe('DevBrandSupervisorWorkflow - Streaming', () => {
  let workflow: DevBrandSupervisorWorkflow;
  let mockWorkflowExecution: jest.Mocked<WorkflowExecutionService>;
  let mockBrandMemory: jest.Mocked<PersonalBrandMemoryService>;

  beforeEach(() => {
    mockWorkflowExecution = {
      streamWorkflow: jest.fn(),
    } as any;

    mockBrandMemory = {} as any;

    workflow = new DevBrandSupervisorWorkflow(
      mockWorkflowExecution,
      mockBrandMemory
    );
  });

  it('should yield stream events from executeWithStreaming', async () => {
    const mockStateUpdates = [
      { messages: [], metadata: { step: 'github-analysis' } },
      { messages: [], metadata: { step: 'brand-strategy' } },
      { messages: [], metadata: { step: 'content-creation' } },
    ];

    // Mock async generator
    async function* mockStream() {
      for (const update of mockStateUpdates) {
        yield update;
      }
    }

    mockWorkflowExecution.streamWorkflow.mockReturnValue(mockStream());

    const events = [];
    for await (const event of workflow.executeWithStreaming({
      userId: 'user1',
      githubUsername: 'testuser',
    })) {
      events.push(event);
    }

    expect(events).toHaveLength(3);
    expect(events[0]).toHaveProperty('type', 'workflow-update');
    expect(events[0]).toHaveProperty('executionId');
    expect(events[0]).toHaveProperty('state');
    expect(events[0]).toHaveProperty('timestamp');
  });

  it('should call streamWorkflow with correct parameters', async () => {
    async function* mockStream() {
      yield { messages: [], metadata: {} };
    }
    mockWorkflowExecution.streamWorkflow.mockReturnValue(mockStream());

    const generator = workflow.executeWithStreaming({
      userId: 'user1',
      githubUsername: 'testuser',
      executionId: 'exec-123',
    });

    // Consume generator
    for await (const _ of generator) {
      // Just consume
    }

    expect(mockWorkflowExecution.streamWorkflow).toHaveBeenCalledWith(
      expect.any(Function), // DevBrandSupervisorWorkflow class
      expect.objectContaining({
        messages: [],
        metadata: expect.objectContaining({
          userId: 'user1',
          githubUsername: 'testuser',
          executionId: 'exec-123',
        }),
      }),
      expect.objectContaining({
        configurable: { thread_id: 'exec-123' },
        streamMode: 'values',
      })
    );
  });

  it('should generate executionId if not provided', async () => {
    async function* mockStream() {
      yield { messages: [], metadata: {} };
    }
    mockWorkflowExecution.streamWorkflow.mockReturnValue(mockStream());

    const events = [];
    for await (const event of workflow.executeWithStreaming({
      userId: 'user1',
      githubUsername: 'testuser',
    })) {
      events.push(event);
      break; // Just check first event
    }

    expect(events[0].executionId).toMatch(/^devbrand-\d+$/);
  });
});
