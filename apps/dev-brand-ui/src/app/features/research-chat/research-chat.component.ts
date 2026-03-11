import { Component, inject, signal, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ResearchService } from './services/research.service';
import { ResearchWorkflowStateService } from './services/research-workflow-state.service';
import { ApprovalModalComponent } from './components/approval-modal.component';
import { ResearchTimelineComponent } from './components/research-timeline.component';
import { ResearchDebugPanelComponent } from './components/research-debug-panel.component';
import { ConversationSidebarComponent } from '../../shared/components/conversation-sidebar/conversation-sidebar.component';
import { ConversationApiService } from '../../shared/services/conversation-api.service';

/**
 * ResearchChatComponent
 *
 * Lean orchestration component for the research workflow.
 * All display state is read from ResearchWorkflowStateService signals.
 * Component only handles user actions and delegates to services.
 *
 * Responsibilities:
 * - Wire conversation sidebar for thread navigation
 * - Wire input area for sending research queries
 * - Wire approval modal for HITL report review
 * - Compose ResearchTimelineComponent and ResearchDebugPanelComponent
 */
@Component({
  selector: 'app-research-chat',
  standalone: true,
  imports: [
    FormsModule,
    ApprovalModalComponent,
    ConversationSidebarComponent,
    ResearchTimelineComponent,
    ResearchDebugPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./research-chat.component.scss'],
  template: `
    <div class="research-chat-container">
      <!-- Conversation Sidebar -->
      <div class="conversation-sidebar-column">
        <app-conversation-sidebar
          workflowType="researcher"
          [userId]="userId"
          [currentThreadId]="currentThreadId()"
          (conversationSelected)="onConversationSelected($event)"
          (newConversationCreated)="onNewConversation($event)"
        />
      </div>

      <!-- Main Content Area -->
      <div class="main-content">
        <!-- Research Timeline (replaces chat messages) -->
        <app-research-timeline />

        <!-- Input Area -->
        <div class="chat-input-container">
          <form (submit)="sendMessage()" class="chat-input-form">
            <input
              type="text"
              [(ngModel)]="currentQuery"
              name="query"
              placeholder="Ask anything about a topic to research..."
              [disabled]="stateService.isExecuting()"
              class="chat-input"
              autocomplete="off"
              aria-label="Research query input"
            />
            <button
              type="submit"
              [disabled]="!currentQuery().trim() || stateService.isExecuting()"
              class="send-button"
              title="Send research query"
              aria-label="Send research query"
            >
              @if (stateService.isExecuting()) {
                <span aria-hidden="true">&#x23F3;</span>
              } @else {
                <span aria-hidden="true">&#x27A4;</span>
              }
            </button>
          </form>
        </div>

        <!-- Debug Panel -->
        <app-research-debug-panel />

        <!-- Approval Modal (HITL) -->
        <app-approval-modal
          [visible]="stateService.hasPendingApproval()"
          [reportDraft]="stateService.hitlApproval()?.reportDraft ?? ''"
          (approve)="onApprovalDecision(true)"
          (reject)="onApprovalDecision(false)"
        />
      </div>
    </div>
  `,
})
export class ResearchChatComponent implements OnDestroy {
  /** Public state service for template signal reads */
  readonly stateService = inject(ResearchWorkflowStateService);

  private readonly researchService = inject(ResearchService);
  private readonly conversationApi = inject(ConversationApiService);

  /** Hardcoded test user for POC */
  readonly userId = 'test-researcher-001';

  /** Current conversation thread */
  readonly currentThreadId = signal<string | undefined>(undefined);

  /** Current query input bound via ngModel */
  readonly currentQuery = signal('');

  /** Track current execution ID for approval flow */
  private currentExecutionId = '';

  /** Subscription for startResearch HTTP call */
  private startSubscription?: Subscription;

  /** Subscription for approval HTTP call */
  private approvalSubscription?: Subscription;

  ngOnDestroy(): void {
    this.stateService.reset();
    this.startSubscription?.unsubscribe();
    this.approvalSubscription?.unsubscribe();
  }

  /**
   * Send research query to backend.
   * On success, delegates SSE streaming to stateService.startExecution().
   */
  sendMessage(): void {
    const query = this.currentQuery().trim();
    if (!query || this.stateService.isExecuting()) {
      return;
    }

    this.startSubscription?.unsubscribe();
    this.startSubscription = this.researchService
      .startResearch(query, this.userId, 'detailed')
      .subscribe({
        next: (response) => {
          this.currentQuery.set('');
          this.currentExecutionId = response.executionId;
          this.currentThreadId.set(response.executionId);
          this.stateService.startExecution(response.executionId);
        },
        error: (error: Error) => {
          console.error('[ResearchChat] Failed to start research:', error.message);
        },
      });
  }

  /**
   * Handle HITL approval decision.
   * Calls backend to approve/reject, clears approval state.
   * If approved, resumes SSE streaming for post-approval workflow steps.
   */
  onApprovalDecision(approved: boolean): void {
    const executionId = this.stateService.hitlApproval()?.executionId ?? this.currentExecutionId;

    this.approvalSubscription?.unsubscribe();
    this.approvalSubscription = this.researchService
      .approveReport(executionId, approved)
      .subscribe({
        next: () => {
          this.stateService.clearApproval();
          if (approved) {
            // Resume streaming without resetting state (preserves timeline/history)
            this.stateService.resumeExecution(executionId);
          }
        },
        error: (error: Error) => {
          console.error('[ResearchChat] Failed to process approval:', error.message);
        },
      });
  }

  /**
   * Handle conversation selection from sidebar.
   */
  onConversationSelected(threadId: string): void {
    this.currentThreadId.set(threadId);
  }

  /**
   * Handle new conversation creation from sidebar.
   */
  onNewConversation(threadId: string): void {
    this.stateService.reset();
    this.currentThreadId.set(threadId);
    this.currentQuery.set('');
  }
}
