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
import { of, throwError, concat, delay, EMPTY } from 'rxjs';
import type {
  MessageStreamEvent,
  CustomStreamEvent,
} from '../devbrand-poc/models/stream-events.model';

/**
 * TASK 4.3: Error Handling and Reconnection Logic
 *
 * Test Scenarios:
 * - SSE Connection Failures
 * - Malformed Event Data
 * - Missing Required Fields
 * - Stream Interruption with Partial Results
 * - Backend Error Responses (500, 404, timeout)
 * - Network Errors
 * - Type Guard Validation
 *
 * Error Handling Requirements:
 * - User-friendly error messages displayed
 * - Partial results preserved on failure
 * - No application crashes from invalid data
 * - Graceful degradation of functionality
 */
describe('ResearchChatComponent - Error Handling Tests', () => {
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
  // Test Suite 1: SSE Connection Failures
  // =============================================================================
  describe('SSE Connection Failures', () => {
    it('should display error message on SSE connection failure', fakeAsync(() => {
      // Arrange
      const executionId = 'error-test-connection';
      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      // Simulate stream connection error
      researchService.streamWorkflow.and.returnValue(
        throwError(() => new Error('Connection failed'))
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert
      const errorMessages = component.messages.filter(
        (m) => m.type === 'error'
      );
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(errorMessages[0].content).toContain('Streaming connection lost');
      expect(component.isResearching).toBe(false);
    }));

    it('should handle network timeout gracefully', fakeAsync(() => {
      // Arrange
      const executionId = 'error-test-timeout';
      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      // Simulate timeout error
      researchService.streamWorkflow.and.returnValue(
        throwError(() => ({
          name: 'TimeoutError',
          message: 'Request timeout after 30000ms',
        }))
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert
      expect(component.isResearching).toBe(false);
      const errorMessages = component.messages.filter(
        (m) => m.type === 'error'
      );
      expect(errorMessages.length).toBeGreaterThan(0);
    }));

    it('should handle SSE connection close mid-stream', fakeAsync(() => {
      // Arrange
      const executionId = 'error-test-close';
      const tokenEvent: MessageStreamEvent = {
        type: 'message-stream',
        executionId,
        nodeName: 'researcher-agent',
        content: 'Partial content',
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

      // Emit one event then error
      researchService.streamWorkflow.and.returnValue(
        concat(
          of(tokenEvent).pipe(delay(10)),
          throwError(() => new Error('Connection closed'))
        )
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert: Error displayed
      const errorMessages = component.messages.filter(
        (m) => m.type === 'error'
      );
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(component.isResearching).toBe(false);
    }));
  });

  // =============================================================================
  // Test Suite 2: Malformed Event Data
  // =============================================================================
  describe('Malformed Event Data', () => {
    it('should handle malformed message-stream event gracefully', fakeAsync(() => {
      // Arrange
      const executionId = 'error-test-malformed';
      const malformedEvent = {
        type: 'message-stream',
        // Missing required fields: executionId, nodeName, content, step, timestamp
      };

      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      researchService.streamWorkflow.and.returnValue(of(malformedEvent as any));

      // Act & Assert: Should not crash
      expect(() => {
        component.currentQuery = 'Test query';
        component.sendMessage();
        tick(100);
        fixture.detectChanges();
      }).not.toThrow();

      // Error should be logged, but app continues
      expect(component.messages.length).toBeGreaterThan(0); // At least user message
    }));

    it('should skip events with invalid type discriminator', fakeAsync(() => {
      // Arrange
      const executionId = 'error-test-invalid-type';
      const invalidEvent = {
        type: 'invalid-stream-type',
        executionId,
        data: { foo: 'bar' },
      };

      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      researchService.streamWorkflow.and.returnValue(of(invalidEvent as any));

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert: Should handle gracefully
      expect(component.messages.length).toBeGreaterThan(0);
    }));

    it('should handle null or undefined event data', fakeAsync(() => {
      // Arrange
      const executionId = 'error-test-null';

      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      // Emit null and undefined
      researchService.streamWorkflow.and.returnValue(
        of(null as any, undefined as any)
      );

      // Act & Assert: Should not crash
      expect(() => {
        component.currentQuery = 'Test query';
        component.sendMessage();
        tick(100);
        fixture.detectChanges();
      }).not.toThrow();
    }));

    it('should handle custom-stream event with missing percentage', fakeAsync(() => {
      // Arrange
      const executionId = 'error-test-missing-percentage';
      const incompleteEvent: Partial<CustomStreamEvent> = {
        type: 'custom-stream',
        executionId,
        timestamp: new Date().toISOString(),
        data: {
          agent: 'test-agent',
          stage: 'processing',
          // Missing percentage
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
        of(incompleteEvent as any)
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert: Should handle gracefully
      // Agent status panel may or may not be updated
      expect(() => {
        const agents = component.agentStatusPanel?.agents() || [];
        // No error should occur
      }).not.toThrow();
    }));
  });

  // =============================================================================
  // Test Suite 3: Stream Interruption with Partial Results
  // =============================================================================
  describe('Stream Interruption with Partial Results', () => {
    it('should preserve partial results on stream interruption', fakeAsync(() => {
      // Arrange
      const executionId = 'error-test-partial';
      const events: MessageStreamEvent[] = [
        {
          type: 'message-stream',
          executionId,
          nodeName: 'researcher-agent',
          content: 'Hello ',
          step: 0,
          timestamp: new Date().toISOString(),
          metadata: { langgraph_node: 'researcher-agent', langgraph_step: 0 },
        },
        {
          type: 'message-stream',
          executionId,
          nodeName: 'researcher-agent',
          content: 'world',
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

      // Emit partial results then error
      researchService.streamWorkflow.and.returnValue(
        concat(
          of(events[0]).pipe(delay(10)),
          of(events[1]).pipe(delay(10)),
          throwError(() => new Error('Stream interrupted'))
        )
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert: Partial content should be preserved
      const assistantMessages = component.messages.filter(
        (m) => m.role === 'assistant' && m.type === 'text'
      );
      expect(assistantMessages.length).toBeGreaterThan(0);
      expect(assistantMessages[0].content).toContain('Hello world');
    }));

    it('should preserve agent progress on stream failure', fakeAsync(() => {
      // Arrange
      const executionId = 'error-test-agent-progress';
      const progressEvents: CustomStreamEvent[] = [
        {
          type: 'custom-stream',
          executionId,
          timestamp: new Date().toISOString(),
          data: {
            agent: 'github-analyzer',
            stage: 'fetching',
            percentage: 25,
          },
        },
        {
          type: 'custom-stream',
          executionId,
          timestamp: new Date().toISOString(),
          data: {
            agent: 'github-analyzer',
            stage: 'analyzing',
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
        concat(
          of(progressEvents[0]).pipe(delay(10)),
          of(progressEvents[1]).pipe(delay(10)),
          throwError(() => new Error('Stream failed'))
        )
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert: Agent progress preserved at last known state
      const agents = component.agentStatusPanel?.agents() || [];
      expect(agents.length).toBeGreaterThan(0);
      expect(agents[0].agentName).toBe('github-analyzer');
      expect(agents[0].progress).toBe(50);
      expect(agents[0].currentStage).toBe('analyzing');
    }));
  });

  // =============================================================================
  // Test Suite 4: Backend Error Responses
  // =============================================================================
  describe('Backend Error Responses', () => {
    it('should handle 500 Internal Server Error', fakeAsync(() => {
      // Arrange
      researchService.startResearch.and.returnValue(
        throwError(() => ({
          status: 500,
          statusText: 'Internal Server Error',
          error: { message: 'Database connection failed' },
        }))
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert
      expect(component.isResearching).toBe(false);
      const errorMessages = component.messages.filter(
        (m) => m.type === 'error'
      );
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(errorMessages[0].content).toContain('Failed to start research');
    }));

    it('should handle 404 Not Found', fakeAsync(() => {
      // Arrange
      researchService.startResearch.and.returnValue(
        throwError(() => ({
          status: 404,
          statusText: 'Not Found',
          error: { message: 'Endpoint not found' },
        }))
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert
      expect(component.isResearching).toBe(false);
      const errorMessages = component.messages.filter(
        (m) => m.type === 'error'
      );
      expect(errorMessages.length).toBeGreaterThan(0);
    }));

    it('should handle 401 Unauthorized', fakeAsync(() => {
      // Arrange
      researchService.startResearch.and.returnValue(
        throwError(() => ({
          status: 401,
          statusText: 'Unauthorized',
          error: { message: 'Authentication required' },
        }))
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert
      expect(component.isResearching).toBe(false);
      const errorMessages = component.messages.filter(
        (m) => m.type === 'error'
      );
      expect(errorMessages.length).toBeGreaterThan(0);
    }));

    it('should handle 429 Too Many Requests', fakeAsync(() => {
      // Arrange
      researchService.startResearch.and.returnValue(
        throwError(() => ({
          status: 429,
          statusText: 'Too Many Requests',
          error: { message: 'Rate limit exceeded' },
        }))
      );

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert
      expect(component.isResearching).toBe(false);
      const errorMessages = component.messages.filter(
        (m) => m.type === 'error'
      );
      expect(errorMessages.length).toBeGreaterThan(0);
    }));
  });

  // =============================================================================
  // Test Suite 5: Type Guard Validation
  // =============================================================================
  describe('Type Guard Validation', () => {
    it('should correctly identify valid message-stream events', fakeAsync(() => {
      // Arrange
      const executionId = 'type-guard-test-valid';
      const validEvent: MessageStreamEvent = {
        type: 'message-stream',
        executionId,
        nodeName: 'researcher-agent',
        content: 'Valid token',
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

      researchService.streamWorkflow.and.returnValue(of(validEvent));

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert: Event should be processed
      const assistantMessages = component.messages.filter(
        (m) => m.role === 'assistant' && m.type === 'text'
      );
      expect(assistantMessages.length).toBeGreaterThan(0);
      expect(assistantMessages[0].content).toContain('Valid token');
    }));

    it('should reject events with missing type property', fakeAsync(() => {
      // Arrange
      const executionId = 'type-guard-test-missing';
      const invalidEvent = {
        // Missing type property
        executionId,
        content: 'Invalid',
      };

      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      researchService.streamWorkflow.and.returnValue(of(invalidEvent as any));

      // Act & Assert: Should not crash
      expect(() => {
        component.currentQuery = 'Test query';
        component.sendMessage();
        tick(100);
        fixture.detectChanges();
      }).not.toThrow();

      // Event should be skipped
      const assistantMessages = component.messages.filter(
        (m) => m.role === 'assistant' && m.type === 'text'
      );
      expect(assistantMessages.length).toBe(0);
    }));
  });

  // =============================================================================
  // Test Suite 6: Edge Cases
  // =============================================================================
  describe('Edge Cases', () => {
    it('should handle empty stream (no events)', fakeAsync(() => {
      // Arrange
      const executionId = 'edge-test-empty';
      researchService.startResearch.and.returnValue(
        of({
          executionId,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId}`,
        })
      );

      // Empty stream (completes immediately)
      researchService.streamWorkflow.and.returnValue(EMPTY);

      // Act
      component.currentQuery = 'Test query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert: Should handle gracefully
      expect(component.messages.length).toBeGreaterThan(0);
    }));

    it('should handle extremely long content strings', fakeAsync(() => {
      // Arrange
      const executionId = 'edge-test-long-content';
      const longContent = 'x'.repeat(100000); // 100k characters
      const tokenEvent: MessageStreamEvent = {
        type: 'message-stream',
        executionId,
        nodeName: 'researcher-agent',
        content: longContent,
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

      // Assert: Should handle large content
      const assistantMessages = component.messages.filter(
        (m) => m.role === 'assistant' && m.type === 'text'
      );
      expect(assistantMessages.length).toBeGreaterThan(0);
      expect(assistantMessages[0].content.length).toBe(longContent.length);
    }));

    it('should handle rapid error recovery', fakeAsync(() => {
      // Arrange
      const executionId1 = 'edge-test-recovery-1';
      const executionId2 = 'edge-test-recovery-2';

      // First request fails
      researchService.startResearch.and.returnValues(
        throwError(() => new Error('First request failed')),
        of({
          executionId: executionId2,
          status: 'started',
          message: 'Research started',
          streamUrl: `/api/research/stream/${executionId2}`,
        })
      );

      researchService.streamWorkflow.and.returnValue(of());

      // Act: First request fails
      component.currentQuery = 'First query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Second request succeeds
      component.currentQuery = 'Second query';
      component.sendMessage();
      tick(100);
      fixture.detectChanges();

      // Assert: Should recover and handle second request
      expect(researchService.startResearch).toHaveBeenCalledTimes(2);
      const userMessages = component.messages.filter((m) => m.role === 'user');
      expect(userMessages.length).toBe(2);
    }));

    it('should handle special characters in event data', fakeAsync(() => {
      // Arrange
      const executionId = 'edge-test-special-chars';
      const specialContent = '<script>alert("xss")</script> & "quotes" \' \n\t';
      const tokenEvent: MessageStreamEvent = {
        type: 'message-stream',
        executionId,
        nodeName: 'researcher-agent',
        content: specialContent,
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

      // Assert: Should handle special characters safely
      const assistantMessages = component.messages.filter(
        (m) => m.role === 'assistant' && m.type === 'text'
      );
      expect(assistantMessages.length).toBeGreaterThan(0);
      expect(assistantMessages[0].content).toBe(specialContent);
    }));
  });
});
