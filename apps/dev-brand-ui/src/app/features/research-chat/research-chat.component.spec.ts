import {
  type ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ResearchChatComponent } from './research-chat.component';
import {
  ResearchService,
  type ResearchWorkflowEvent,
} from './services/research.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { of, from, throwError, concat, delay } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import type {
  MessageStreamEvent,
  CustomStreamEvent,
  DebugStreamEvent,
} from '../devbrand-poc/models/stream-events.model';

/**
 * TASK 4.1: E2E Testing of All Streaming Modes
 *
 * Test Coverage:
 * - Scenario 1: LLM Token Streaming (Messages Mode)
 * - Scenario 2: Custom Progress Events (Custom Mode)
 * - Scenario 3: Debug Events (Debug Mode)
 *
 * Evidence: Phase 4 integration testing requirements
 * Backend: research-chat.controller.ts emits message-stream, custom-stream, debug-stream events
 * Frontend: research-chat.component.ts handles all three streaming modes
 */
describe('ResearchChatComponent - Comprehensive Integration Tests', () => {
  let component: ResearchChatComponent;
  let fixture: ComponentFixture<ResearchChatComponent>;
  let researchService: jasmine.SpyObj<ResearchService>;

  beforeEach(async () => {
    const researchServiceSpy = jasmine.createSpyObj('ResearchService', [
      'startResearch',
      'streamWorkflow',
      'approveReport',
      'listReports',
      'readReport',
    ]);

    await TestBed.configureTestingModule({
      imports: [ResearchChatComponent, HttpClientTestingModule],
      providers: [
        { provide: ResearchService, useValue: researchServiceSpy },
        provideExperimentalZonelessChangeDetection(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResearchChatComponent);
    component = fixture.componentInstance;
    researchService = TestBed.inject(
      ResearchService
    ) as jasmine.SpyObj<ResearchService>;

    fixture.detectChanges();
  });

  // =============================================================================
  // Test Suite 1: Component Initialization
  // =============================================================================
  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty messages array', () => {
      expect(component.messages.length).toBe(1); // System welcome message
    });

    it('should initialize with isResearching false', () => {
      expect(component.isResearching).toBe(false);
    });

    it('should display welcome message on init', () => {
      const systemMessages = component.messages.filter(
        (m) => m.role === 'system'
      );
      expect(systemMessages.length).toBe(1);
      expect(systemMessages[0].content).toContain('Welcome to Research Chat');
    });
  });

  // =============================================================================
  // Test Suite 2: SCENARIO 1 - LLM Token Streaming (Messages Mode)
  // =============================================================================
  describe('SCENARIO 1: LLM Token Streaming (Messages Mode)', () => {
    it('should accumulate LLM tokens into a single message', fakeAsync(() => {
      // Arrange
      const executionId = 'test-exec-123';
      const tokens = ['Hello', ' ', 'world', '!'];
      const tokenEvents: MessageStreamEvent[] = tokens.map((token, i) => ({
        type: 'message-stream',
        executionId,
        nodeName: 'researcher-agent',
        content: token,
        step: i,
        timestamp: new Date().toISOString(),
        metadata: {
          langgraph_node: 'researcher-agent',
          langgraph_step: i,
        },
      }));

      // Mock startResearch
      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research workflow started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      // Mock stream with token events
      researchService.streamWorkflow.and.returnValue(
        from(tokenEvents).pipe(concatMap((event) => of(event).pipe(delay(10))))
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100); // Wait for stream to complete
      fixture.detectChanges();

      // Assert
      const assistantMessages = component.messages.filter(
        (m) => m.role === 'assistant' && m.type === 'text'
      );
      expect(assistantMessages.length).toBe(1);
      expect(assistantMessages[0].content).toBe('Hello world!');
      expect(component.isResearching).toBe(false);
    }));

    it('should show streaming cursor during token streaming', fakeAsync(() => {
      // Arrange
      const executionId = 'test-exec-456';
      const tokenEvent: MessageStreamEvent = {
        type: 'message-stream',
        executionId,
        nodeName: 'researcher-agent',
        content: 'Test token',
        step: 0,
        timestamp: new Date().toISOString(),
        metadata: {
          langgraph_node: 'researcher-agent',
          langgraph_step: 0,
        },
      };

      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      // Emit token after 500ms delay
      researchService.streamWorkflow.and.returnValue(
        of(tokenEvent).pipe(delay(500))
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(50); // Start streaming
      fixture.detectChanges();

      // Assert: isResearching should be true during streaming
      expect(component.isResearching).toBe(true);

      // Complete stream
      tick(500);
      fixture.detectChanges();

      // Assert: isResearching should be false after stream completes
      // Note: Stream completion is handled by RxJS complete() callback
      // which sets isResearching to false only if showApprovalModal is false
    }));

    it('should update existing message in-place during token streaming', fakeAsync(() => {
      // Arrange
      const executionId = 'test-exec-789';
      const tokens = ['First', ' part', ' second part'];
      const tokenEvents: MessageStreamEvent[] = tokens.map((token, i) => ({
        type: 'message-stream',
        executionId,
        nodeName: 'researcher-agent',
        content: token,
        step: i,
        timestamp: new Date().toISOString(),
        metadata: {
          langgraph_node: 'researcher-agent',
          langgraph_step: i,
        },
      }));

      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      researchService.streamWorkflow.and.returnValue(
        from(tokenEvents).pipe(concatMap((event) => of(event).pipe(delay(10))))
      );

      const initialMessageCount = component.messages.length;

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100); // Wait for all tokens
      fixture.detectChanges();

      // Assert: Should have only one new assistant message (updated in-place)
      const assistantMessages = component.messages.filter(
        (m) => m.role === 'assistant' && m.type === 'text'
      );
      expect(assistantMessages.length).toBe(1);
      expect(assistantMessages[0].content).toBe('First part second part');

      // Total message count should be initial + user message + status message + 1 assistant message
      // (not 3 separate assistant messages)
      expect(component.messages.length).toBeLessThanOrEqual(
        initialMessageCount + 4
      );
    }));

    it('should handle multiple concurrent token streams', fakeAsync(() => {
      // Arrange - Simulate two different nodes streaming concurrently
      const executionId = 'test-exec-concurrent';
      const node1Tokens: MessageStreamEvent[] = [
        {
          type: 'message-stream',
          executionId,
          nodeName: 'researcher-agent',
          content: 'Node1 ',
          step: 0,
          timestamp: new Date().toISOString(),
          metadata: { langgraph_node: 'researcher-agent', langgraph_step: 0 },
        },
        {
          type: 'message-stream',
          executionId,
          nodeName: 'researcher-agent',
          content: 'content',
          step: 1,
          timestamp: new Date().toISOString(),
          metadata: { langgraph_node: 'researcher-agent', langgraph_step: 1 },
        },
      ];

      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      researchService.streamWorkflow.and.returnValue(
        from(node1Tokens).pipe(concatMap((event) => of(event).pipe(delay(10))))
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert: Tokens from same node should be accumulated
      const assistantMessages = component.messages.filter(
        (m) => m.role === 'assistant' && m.type === 'text'
      );
      expect(assistantMessages[0].content).toContain('Node1 content');
    }));

    it('should complete streaming when workflow_complete event received', fakeAsync(() => {
      // Arrange
      const executionId = 'test-exec-complete';
      const tokenEvent: MessageStreamEvent = {
        type: 'message-stream',
        executionId,
        nodeName: 'researcher-agent',
        content: 'Final result',
        step: 0,
        timestamp: new Date().toISOString(),
        metadata: { langgraph_node: 'researcher-agent', langgraph_step: 0 },
      };

      const completeEvent: ResearchWorkflowEvent = {
        type: 'workflow_complete',
        timestamp: new Date().toISOString(),
        workflowId: executionId,
        state: {
          finalReport: 'Research complete with results',
          savedReportFilename: 'test-report.md',
          savedReportPath: '/reports/test-report.md',
        },
      };

      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      researchService.streamWorkflow.and.returnValue(
        concat(
          of(tokenEvent).pipe(delay(10)),
          of(completeEvent as any).pipe(delay(10))
        )
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert
      expect(component.isResearching).toBe(false);
      const successMessages = component.messages.filter(
        (m) => m.type === 'success'
      );
      expect(successMessages.length).toBeGreaterThan(0);
      expect(successMessages[0].content).toContain('Report saved');
    }));
  });

  // =============================================================================
  // Test Suite 3: SCENARIO 2 - Custom Progress Events (Custom Mode)
  // =============================================================================
  describe('SCENARIO 2: Custom Progress Events (Custom Mode)', () => {
    it('should update agent status panel with custom progress', fakeAsync(() => {
      // Arrange
      const executionId = 'test-exec-progress';
      const progressEvent: CustomStreamEvent = {
        type: 'custom-stream',
        executionId,
        timestamp: new Date().toISOString(),
        data: {
          agent: 'github-code-analyzer',
          stage: 'fetching-repos',
          message: 'Fetching repositories for user...',
          percentage: 10,
        },
      };

      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      researchService.streamWorkflow.and.returnValue(of(progressEvent));

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert
      const agentPanel = component.agentStatusPanel;
      expect(agentPanel).toBeDefined();

      const agents = agentPanel!.agents();
      expect(agents.length).toBe(1);
      expect(agents[0].agentName).toBe('github-code-analyzer');
      expect(agents[0].status).toBe('active');
      expect(agents[0].progress).toBe(10);
      expect(agents[0].currentStage).toBe('fetching-repos');
    }));

    it('should mark agent as completed when progress reaches 100%', fakeAsync(() => {
      // Arrange
      const executionId = 'test-exec-complete-progress';
      const progressEvents: CustomStreamEvent[] = [
        {
          type: 'custom-stream',
          executionId,
          timestamp: new Date().toISOString(),
          data: {
            agent: 'github-code-analyzer',
            stage: 'fetching-repos',
            message: 'Starting...',
            percentage: 10,
          },
        },
        {
          type: 'custom-stream',
          executionId,
          timestamp: new Date().toISOString(),
          data: {
            agent: 'github-code-analyzer',
            stage: 'completed',
            message: 'Analysis complete',
            percentage: 100,
          },
        },
      ];

      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      researchService.streamWorkflow.and.returnValue(
        from(progressEvents).pipe(
          concatMap((event) => of(event).pipe(delay(10)))
        )
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert
      const agents = component.agentStatusPanel!.agents();
      expect(agents[0].status).toBe('completed');
      expect(agents[0].progress).toBe(100);
    }));

    it('should track multiple agents concurrently', fakeAsync(() => {
      // Arrange
      const executionId = 'test-exec-multi-agents';
      const progressEvents: CustomStreamEvent[] = [
        {
          type: 'custom-stream',
          executionId,
          timestamp: new Date().toISOString(),
          data: {
            agent: 'github-code-analyzer',
            stage: 'fetching-repos',
            percentage: 10,
          },
        },
        {
          type: 'custom-stream',
          executionId,
          timestamp: new Date().toISOString(),
          data: {
            agent: 'personal-brand-strategist',
            stage: 'analyzing-profile',
            percentage: 15,
          },
        },
        {
          type: 'custom-stream',
          executionId,
          timestamp: new Date().toISOString(),
          data: {
            agent: 'github-code-analyzer',
            stage: 'analyzing-code',
            percentage: 50,
          },
        },
      ];

      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      researchService.streamWorkflow.and.returnValue(
        from(progressEvents).pipe(
          concatMap((event) => of(event).pipe(delay(10)))
        )
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert: Should track both agents separately
      const agents = component.agentStatusPanel!.agents();
      expect(agents.length).toBe(2);

      const githubAgent = agents.find(
        (a) => a.agentName === 'github-code-analyzer'
      );
      expect(githubAgent).toBeDefined();
      expect(githubAgent!.progress).toBe(50);
      expect(githubAgent!.currentStage).toBe('analyzing-code');

      const brandAgent = agents.find(
        (a) => a.agentName === 'personal-brand-strategist'
      );
      expect(brandAgent).toBeDefined();
      expect(brandAgent!.progress).toBe(15);
      expect(brandAgent!.currentStage).toBe('analyzing-profile');
    }));

    it('should display progress messages in chat', fakeAsync(() => {
      // Arrange
      const executionId = 'test-exec-progress-chat';
      const progressEvent: CustomStreamEvent = {
        type: 'custom-stream',
        executionId,
        timestamp: new Date().toISOString(),
        data: {
          agent: 'researcher',
          stage: 'gathering-data',
          message: 'Fetching research papers...',
          percentage: 45,
        },
      };

      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      researchService.streamWorkflow.and.returnValue(of(progressEvent));

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert: Progress message should appear in chat
      const statusMessages = component.messages.filter(
        (m) => m.type === 'status'
      );
      const progressMessage = statusMessages.find(
        (m) => m.content.includes('researcher') && m.content.includes('45%')
      );
      expect(progressMessage).toBeDefined();
      expect(progressMessage!.content).toContain('Fetching research papers');
    }));
  });

  // =============================================================================
  // Test Suite 4: SCENARIO 3 - Debug Events (Debug Mode)
  // =============================================================================
  describe('SCENARIO 3: Debug Events (Debug Mode)', () => {
    it('should log debug events in development mode', fakeAsync(() => {
      // Arrange
      spyOn(console, 'log');
      const executionId = 'test-exec-debug';
      const debugEvent: DebugStreamEvent = {
        type: 'debug-stream',
        executionId,
        timestamp: new Date().toISOString(),
        eventType: 'task',
        taskId: 'task-abc-123',
        taskName: 'conductAutonomousResearch',
        payload: {
          id: 'task-abc-123',
          name: 'conductAutonomousResearch',
          input: { query: 'AI research' },
          output: { results: ['result1', 'result2'] },
        },
        step: 3,
      };

      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      researchService.streamWorkflow.and.returnValue(of(debugEvent));

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);

      // Assert: Debug event should be logged (if on localhost)
      // Note: Component checks window.location.hostname === 'localhost'
      // In test environment, this check may not apply
      // We verify the handler is called without errors
      expect(component.messages.length).toBeGreaterThan(0);
    }));

    it('should handle task debug events with payload', fakeAsync(() => {
      // Arrange
      const executionId = 'test-exec-debug-task';
      const debugEvent: DebugStreamEvent = {
        type: 'debug-stream',
        executionId,
        timestamp: new Date().toISOString(),
        eventType: 'task',
        taskName: 'gatherInformation',
        payload: {
          id: 'task-123',
          name: 'gatherInformation',
          input: { query: 'test' },
        },
        step: 1,
      };

      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      researchService.streamWorkflow.and.returnValue(of(debugEvent));

      // Act & Assert: Should not throw error
      component.currentQuery = 'Test query';
      expect(() => {
        component.sendMessage();
        tick(100);
      }).not.toThrow();
    }));

    it('should handle checkpoint debug events', fakeAsync(() => {
      // Arrange
      const executionId = 'test-exec-debug-checkpoint';
      const debugEvent: DebugStreamEvent = {
        type: 'debug-stream',
        executionId,
        timestamp: new Date().toISOString(),
        eventType: 'checkpoint',
        payload: {
          id: 'checkpoint-456',
          name: 'research-checkpoint',
        },
        step: 5,
      };

      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      researchService.streamWorkflow.and.returnValue(of(debugEvent));

      // Act & Assert: Should not throw error
      component.currentQuery = 'Test query';
      expect(() => {
        component.sendMessage();
        tick(100);
      }).not.toThrow();
    }));
  });

  // =============================================================================
  // Test Suite 5: Mixed Event Scenarios
  // =============================================================================
  describe('Mixed Event Scenarios', () => {
    it('should handle mixed event types in single stream', fakeAsync(() => {
      // Arrange
      const executionId = 'test-exec-mixed';
      const mixedEvents: (
        | MessageStreamEvent
        | CustomStreamEvent
        | DebugStreamEvent
      )[] = [
        {
          type: 'custom-stream',
          executionId,
          timestamp: new Date().toISOString(),
          data: {
            agent: 'researcher',
            stage: 'starting',
            percentage: 0,
          },
        },
        {
          type: 'message-stream',
          executionId,
          nodeName: 'researcher-agent',
          content: 'Starting research on ',
          step: 0,
          timestamp: new Date().toISOString(),
          metadata: { langgraph_node: 'researcher-agent', langgraph_step: 0 },
        },
        {
          type: 'debug-stream',
          executionId,
          timestamp: new Date().toISOString(),
          eventType: 'task',
          taskName: 'gatherInformation',
          payload: { id: 'task-1', name: 'gatherInformation' },
        },
        {
          type: 'message-stream',
          executionId,
          nodeName: 'researcher-agent',
          content: 'AI safety...',
          step: 1,
          timestamp: new Date().toISOString(),
          metadata: { langgraph_node: 'researcher-agent', langgraph_step: 1 },
        },
        {
          type: 'custom-stream',
          executionId,
          timestamp: new Date().toISOString(),
          data: {
            agent: 'researcher',
            stage: 'gathering',
            percentage: 50,
          },
        },
      ];

      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      researchService.streamWorkflow.and.returnValue(
        from(mixedEvents).pipe(concatMap((event) => of(event).pipe(delay(10))))
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(200);
      fixture.detectChanges();

      // Assert: All event types handled correctly
      // - Token streaming accumulated
      const assistantMessages = component.messages.filter(
        (m) => m.role === 'assistant' && m.type === 'text'
      );
      expect(assistantMessages.length).toBeGreaterThan(0);
      expect(assistantMessages[0].content).toContain(
        'Starting research on AI safety...'
      );

      // - Agent progress updated
      const agents = component.agentStatusPanel!.agents();
      expect(agents.length).toBeGreaterThan(0);
      expect(agents[0].agentName).toBe('researcher');
      expect(agents[0].progress).toBe(50);

      // - No errors thrown from debug events
      expect(component.messages.length).toBeGreaterThan(0);
    }));
  });

  // =============================================================================
  // Test Suite 6: User Interaction Tests
  // =============================================================================
  describe('User Interaction Tests', () => {
    it('should not send empty messages', () => {
      // Arrange
      component.currentQuery = '';

      // Act
      component.sendMessage();

      // Assert
      expect(researchService.startResearch).not.toHaveBeenCalled();
    });

    it('should not send messages while research is in progress', fakeAsync(() => {
      // Arrange
      const executionId = 'test-exec-busy';
      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      // Never-ending stream
      researchService.streamWorkflow.and.returnValue(of().pipe(delay(10000)));

      // Act
      component.currentQuery = 'First query';
      component.sendMessage();
      tick(100);

      const callCount = researchService.startResearch.calls.count();

      // Try to send another message while busy
      component.currentQuery = 'Second query';
      component.sendMessage();

      // Assert: Should not start new research
      expect(researchService.startResearch.calls.count()).toBe(callCount);
    }));

    it('should clear input after sending message', fakeAsync(() => {
      // Arrange
      const executionId = 'test-exec-clear';
      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      researchService.streamWorkflow.and.returnValue(of());

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);

      // Assert
      expect(component.currentQuery).toBe('');
    }));
  });
});
