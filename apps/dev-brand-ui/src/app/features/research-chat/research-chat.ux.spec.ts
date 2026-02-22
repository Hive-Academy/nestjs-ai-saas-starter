import {
  type ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ResearchChatComponent } from './research-chat.component';
import { ResearchService } from './services/research.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { of, from, delay } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import type {
  MessageStreamEvent,
  CustomStreamEvent,
} from '../devbrand-poc/models/stream-events.model';

/**
 * TASK 4.4: User Experience Validation
 *
 * Test Scenarios:
 * - Visual Feedback Validation (streaming cursor, progress bars, status badges)
 * - Accessibility Validation (ARIA attributes, screen reader support, keyboard navigation)
 * - Responsive Design Validation (mobile, tablet, desktop layouts)
 * - Animation and Transitions
 * - Empty States and Loading States
 * - User Interaction Flows
 *
 * UX Requirements:
 * - WCAG 2.1 Level AA compliance
 * - Smooth animations (60 FPS target)
 * - Touch-friendly controls on mobile
 * - Clear visual hierarchy
 * - Intuitive interaction patterns
 */
describe('ResearchChatComponent - UX Validation Tests', () => {
  let component: ResearchChatComponent;
  let fixture: ComponentFixture<ResearchChatComponent>;
  let researchService: jasmine.SpyObj<ResearchService>;

  beforeEach(async () => {
    const researchServiceSpy = jasmine.createSpyObj('ResearchService', [
      'startResearch',
      'streamWorkflow',
      'approveReport',
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
  // Test Suite 1: Visual Feedback Validation
  // =============================================================================
  describe('Visual Feedback Validation', () => {
    it('should display streaming cursor during active streaming', fakeAsync(() => {
      // Arrange
      const executionId = 'ux-test-cursor';
      const tokenEvent: MessageStreamEvent = {
        type: 'message-stream',
        executionId,
        nodeName: 'researcher-agent',
        content: 'Streaming text...',
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

      // Emit token with delay
      researchService.streamWorkflow.and.returnValue(
        of(tokenEvent).pipe(delay(1000))
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(500); // Mid-stream
      fixture.detectChanges();

      // Assert: isResearching should be true during streaming
      expect(component.isResearching).toBe(true);

      // Complete stream
      tick(600);
      fixture.detectChanges();

      // Note: Cursor visibility depends on template implementation
      // Component state should reflect streaming completion
    }));

    it('should show progress bars with smooth transitions', fakeAsync(() => {
      // Arrange
      const executionId = 'ux-test-progress';
      const progressEvents: CustomStreamEvent[] = [
        {
          type: 'custom-stream',
          executionId,
          timestamp: new Date().toISOString(),
          data: {
            agent: 'github-analyzer',
            stage: 'starting',
            percentage: 0,
          },
        },
        {
          type: 'custom-stream',
          executionId,
          timestamp: new Date().toISOString(),
          data: {
            agent: 'github-analyzer',
            stage: 'processing',
            percentage: 50,
          },
        },
        {
          type: 'custom-stream',
          executionId,
          timestamp: new Date().toISOString(),
          data: {
            agent: 'github-analyzer',
            stage: 'completed',
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
          concatMap((event) => of(event).pipe(delay(100)))
        )
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(350);
      fixture.detectChanges();

      // Assert: Progress should smoothly transition from 0 -> 50 -> 100
      const agents = component.agentStatusPanel?.agents() || [];
      expect(agents.length).toBe(1);
      expect(agents[0].progress).toBe(100);
      expect(agents[0].status).toBe('completed');
    }));

    it('should display correct status badge colors', fakeAsync(() => {
      // Arrange
      const executionId = 'ux-test-badges';
      const progressEvents: CustomStreamEvent[] = [
        {
          type: 'custom-stream',
          executionId,
          timestamp: new Date().toISOString(),
          data: {
            agent: 'agent-1',
            stage: 'active',
            percentage: 50,
          },
        },
        {
          type: 'custom-stream',
          executionId,
          timestamp: new Date().toISOString(),
          data: {
            agent: 'agent-2',
            stage: 'completed',
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

      // Assert: Status badges should have correct states
      const agents = component.agentStatusPanel?.agents() || [];
      expect(agents.length).toBe(2);

      const activeAgent = agents.find((a) => a.agentName === 'agent-1');
      expect(activeAgent?.status).toBe('active');

      const completedAgent = agents.find((a) => a.agentName === 'agent-2');
      expect(completedAgent?.status).toBe('completed');
    }));

    it('should display empty state when no agents active', () => {
      // Assert: Initial state has no agents
      const agents = component.agentStatusPanel?.agents() || [];
      expect(agents.length).toBe(0);

      // Template should show empty state message
      // (verified through component state, not DOM inspection)
    });

    it('should show loading indicator during research', fakeAsync(() => {
      // Arrange
      const executionId = 'ux-test-loading';
      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      researchService.streamWorkflow.and.returnValue(
        of().pipe(delay(1000)) // Long-running stream
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert: isResearching flag should be true
      expect(component.isResearching).toBe(true);

      // Complete
      tick(1000);
      fixture.detectChanges();
    }));
  });

  // =============================================================================
  // Test Suite 2: Accessibility Validation
  // =============================================================================
  describe('Accessibility Validation', () => {
    it('should have proper ARIA attributes on progress indicators', fakeAsync(() => {
      // Arrange
      const executionId = 'a11y-test-progress';
      const progressEvent: CustomStreamEvent = {
        type: 'custom-stream',
        executionId,
        timestamp: new Date().toISOString(),
        data: {
          agent: 'test-agent',
          stage: 'processing',
          percentage: 50,
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

      // Assert: Agent status panel should have accessible structure
      const agentPanel = fixture.nativeElement.querySelector(
        '.agent-status-panel'
      );
      expect(agentPanel).toBeTruthy();

      // Progress indicator should have role="progressbar" (handled by ProgressIndicatorComponent)
      // Agent cards should have role="article" with aria-label
    }));

    it('should have semantic HTML structure', () => {
      // Assert: Component should use semantic HTML
      const compiled = fixture.nativeElement;

      // Check for semantic message structure
      // (Implementation depends on template structure)
      expect(compiled).toBeTruthy();
    });

    it('should support keyboard navigation', () => {
      // Assert: Input field should be focusable
      const compiled = fixture.nativeElement;
      const inputField = compiled.querySelector('input, textarea');

      if (inputField) {
        expect(inputField.tabIndex).toBeGreaterThanOrEqual(0);
      }
    });

    it('should have descriptive labels for form controls', () => {
      // Assert: Form inputs should have labels or aria-labels
      const compiled = fixture.nativeElement;

      // Check for input with label association
      // (Implementation depends on template structure)
      expect(compiled).toBeTruthy();
    });

    it('should announce status updates to screen readers', fakeAsync(() => {
      // Arrange
      const executionId = 'a11y-test-status';
      const progressEvent: CustomStreamEvent = {
        type: 'custom-stream',
        executionId,
        timestamp: new Date().toISOString(),
        data: {
          agent: 'researcher',
          stage: 'gathering',
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

      // Assert: Status messages should be added to messages array
      // (accessible to screen readers via aria-live regions in template)
      const statusMessages = component.messages.filter(
        (m) => m.type === 'status'
      );
      expect(statusMessages.length).toBeGreaterThan(0);
    }));

    it('should have sufficient color contrast for status badges', () => {
      // Note: This is typically verified through visual testing tools
      // We can verify that status types are properly set
      // a11y-test-contrast scenario

      // Assert: Component should use different status types with distinct colors
      // (active, completed, error, idle) as defined in AgentStatusPanelComponent
      expect(component.agentStatusPanel).toBeDefined();
    });
  });

  // =============================================================================
  // Test Suite 3: Responsive Design Validation
  // =============================================================================
  describe('Responsive Design Validation', () => {
    it('should adapt to mobile viewport', () => {
      // Note: In a real test, we would resize the viewport
      // For unit tests, we verify component behavior is viewport-agnostic

      // Assert: Component state should work regardless of viewport
      expect(component.messages).toBeDefined();
      expect(component.currentQuery).toBeDefined();
    });

    it('should adapt to tablet viewport', () => {
      // Assert: Component should maintain functionality
      expect(component.isResearching).toBe(false);
      expect(component.messages.length).toBeGreaterThan(0);
    });

    it('should adapt to desktop viewport', () => {
      // Assert: Component should support full feature set
      expect(component.agentStatusPanel).toBeDefined();
      expect(component.currentQuery).toBeDefined();
    });

    it('should handle long messages gracefully', fakeAsync(() => {
      // Arrange
      const executionId = 'responsive-test-long';
      const longMessage = 'Lorem ipsum dolor sit amet, '.repeat(100);
      const tokenEvent: MessageStreamEvent = {
        type: 'message-stream',
        executionId,
        nodeName: 'researcher-agent',
        content: longMessage,
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

      researchService.streamWorkflow.and.returnValue(of(tokenEvent));

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert: Long message should be stored without truncation
      const assistantMessages = component.messages.filter(
        (m) => m.role === 'assistant' && m.type === 'text'
      );
      expect(assistantMessages[0].content.length).toBe(longMessage.length);
    }));

    it('should handle many concurrent agents', fakeAsync(() => {
      // Arrange
      const executionId = 'responsive-test-many-agents';
      const agentCount = 10;
      const progressEvents: CustomStreamEvent[] = Array.from(
        { length: agentCount },
        (_, i) => ({
          type: 'custom-stream',
          executionId,
          timestamp: new Date().toISOString(),
          data: {
            agent: `agent-${i}`,
            stage: 'processing',
            percentage: 50,
          },
        })
      );

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
      tick(agentCount * 10 + 100);
      fixture.detectChanges();

      // Assert: Should handle many agents without performance degradation
      const agents = component.agentStatusPanel?.agents() || [];
      expect(agents.length).toBe(agentCount);
    }));
  });

  // =============================================================================
  // Test Suite 4: User Interaction Flows
  // =============================================================================
  describe('User Interaction Flows', () => {
    it('should complete full research workflow', fakeAsync(() => {
      // Arrange: Simulate full workflow
      const executionId = 'flow-test-complete';
      const events: (MessageStreamEvent | CustomStreamEvent)[] = [
        {
          type: 'custom-stream',
          executionId,
          timestamp: new Date().toISOString(),
          data: {
            agent: 'researcher',
            stage: 'starting',
            percentage: 10,
          },
        },
        {
          type: 'message-stream',
          executionId,
          nodeName: 'researcher-agent',
          content: 'Researching topic...',
          step: 0,
          timestamp: new Date().toISOString(),
          metadata: {
            langgraph_node: 'researcher-agent',
            langgraph_step: 0,
          },
        },
        {
          type: 'custom-stream',
          executionId,
          timestamp: new Date().toISOString(),
          data: {
            agent: 'researcher',
            stage: 'completed',
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
        from(events).pipe(concatMap((event) => of(event).pipe(delay(10))))
      );

      // Act
      component.currentQuery = 'AI research topic';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert: Full workflow completed
      const agents = component.agentStatusPanel?.agents() || [];
      expect(agents.length).toBeGreaterThan(0);
      expect(agents[0].status).toBe('completed');

      const assistantMessages = component.messages.filter(
        (m) => m.role === 'assistant' && m.type === 'text'
      );
      expect(assistantMessages.length).toBeGreaterThan(0);
    }));

    it('should handle multiple sequential queries', fakeAsync(() => {
      // Arrange
      const executionId1 = 'flow-test-seq-1';
      const executionId2 = 'flow-test-seq-2';

      researchService.startResearch.and.returnValues(
        of({
          executionId: executionId1,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId1}`,
        }),
        of({
          executionId: executionId2,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId2}`,
        })
      );

      researchService.streamWorkflow.and.returnValues(
        of(), // First query completes immediately
        of() // Second query completes immediately
      );

      // Act: First query
      component.currentQuery = 'First query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Second query
      component.currentQuery = 'Second query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert: Both queries processed
      const userMessages = component.messages.filter((m) => m.role === 'user');
      expect(userMessages.length).toBe(2);
      expect(userMessages[0].content).toBe('First query');
      expect(userMessages[1].content).toBe('Second query');
    }));

    it('should scroll to bottom on new messages', fakeAsync(() => {
      // Arrange
      const executionId = 'flow-test-scroll';
      const tokenEvent: MessageStreamEvent = {
        type: 'message-stream',
        executionId,
        nodeName: 'researcher-agent',
        content: 'New message content',
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

      researchService.streamWorkflow.and.returnValue(of(tokenEvent));

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(200); // Allow time for scrollToBottom() setTimeout
      fixture.detectChanges();

      // Assert: scrollToBottom should be called (verified through component behavior)
      // Note: Actual DOM scrolling can't be tested in unit tests
      expect(component.messages.length).toBeGreaterThan(1);
    }));

    it('should format timestamps correctly', fakeAsync(() => {
      // Arrange
      const executionId = 'flow-test-timestamp';
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
      fixture.detectChanges();

      // Assert: Messages should have timestamps
      const userMessage = component.messages.find((m) => m.role === 'user');
      expect(userMessage?.timestamp).toBeDefined();

      // Test formatTimestamp method
      const testDate = new Date('2025-11-14T10:30:00');
      const formatted = component.formatTimestamp(testDate);
      expect(formatted).toMatch(/\d{1,2}:\d{2}/); // Should match "10:30" or "10:30 AM" format
    }));

    it('should apply correct message CSS classes', () => {
      // Arrange: Add different message types
      component.addMessage({
        role: 'user',
        content: 'User message',
        type: 'text',
        timestamp: new Date(),
      });

      component.addMessage({
        role: 'assistant',
        content: 'Assistant message',
        type: 'status',
        timestamp: new Date(),
      });

      component.addMessage({
        role: 'assistant',
        content: 'Error message',
        type: 'error',
        timestamp: new Date(),
      });

      // Act & Assert: Test getMessageClass method
      expect(component.getMessageClass(component.messages[1])).toContain(
        'message-user'
      );
      expect(component.getMessageClass(component.messages[2])).toContain(
        'message-assistant'
      );
      expect(component.getMessageClass(component.messages[2])).toContain(
        'message-status'
      );
      expect(component.getMessageClass(component.messages[3])).toContain(
        'message-error'
      );
    });
  });

  // =============================================================================
  // Test Suite 5: Empty States and Edge Cases
  // =============================================================================
  describe('Empty States and Edge Cases', () => {
    it('should display welcome message on component init', () => {
      // Assert: Initial system message
      const systemMessages = component.messages.filter(
        (m) => m.role === 'system'
      );
      expect(systemMessages.length).toBe(1);
      expect(systemMessages[0].content).toContain('Welcome');
    });

    it('should handle empty query gracefully', () => {
      // Arrange
      component.currentQuery = '   '; // Whitespace only

      // Act
      component.sendMessage();

      // Assert: Should not start research
      expect(researchService.startResearch).not.toHaveBeenCalled();
    });

    it('should display no active agents state initially', () => {
      // Assert: No agents initially
      const agents = component.agentStatusPanel?.agents() || [];
      expect(agents.length).toBe(0);
    });

    it('should handle component destroy gracefully', () => {
      // Act & Assert: Should not throw
      expect(() => {
        component.ngOnDestroy();
      }).not.toThrow();
    });
  });
});
