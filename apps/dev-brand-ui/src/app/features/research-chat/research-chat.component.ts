import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ResearchService,
  type ResearchWorkflowEvent,
} from './services/research.service';
import { Subscription } from 'rxjs';
import { ApprovalModalComponent } from './components/approval-modal.component';

/**
 * 🔬 RESEARCH CHAT COMPONENT
 *
 * Interactive chat interface for ResearcherAgent with:
 * - Real-time streaming updates
 * - HITL approval modal
 * - Chat history display
 * - Saved reports list
 */

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'status' | 'success' | 'error' | 'draft';
  timestamp: Date;
  metadata?: any;
}

@Component({
  selector: 'app-research-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, ApprovalModalComponent],
  templateUrl: './research-chat.component.html',
  styleUrls: ['./research-chat.component.scss'],
})
export class ResearchChatComponent implements OnInit, OnDestroy {
  messages: ChatMessage[] = [];
  currentQuery = '';
  isResearching = false;
  showApprovalModal = false;
  reportDraft = '';
  currentExecutionId = '';
  userId = 'demo-user-123'; // In production, get from auth service

  private streamSubscription?: Subscription;

  constructor(private researchService: ResearchService) {}

  ngOnInit(): void {
    this.addSystemMessage(
      'Welcome to Research Chat! Ask me to research any topic.'
    );
  }

  ngOnDestroy(): void {
    this.streamSubscription?.unsubscribe();
  }

  /**
   * Send research query
   */
  async sendMessage(): Promise<void> {
    if (!this.currentQuery.trim() || this.isResearching) {
      return;
    }

    const query = this.currentQuery.trim();
    this.currentQuery = '';

    // Add user message to chat
    this.addMessage({
      role: 'user',
      content: query,
      type: 'text',
      timestamp: new Date(),
    });

    this.isResearching = true;

    try {
      // Start research workflow
      this.researchService
        .startResearch(query, this.userId, 'detailed')
        .subscribe({
          next: (response) => {
            this.currentExecutionId = response.executionId;
            this.addStatusMessage(`Research started: ${response.message}`);
            this.streamWorkflow(response.executionId);
          },
          error: (error) => {
            this.addErrorMessage(`Failed to start research: ${error.message}`);
            this.isResearching = false;
          },
        });
    } catch (error: any) {
      this.addErrorMessage(`Error: ${error.message}`);
      this.isResearching = false;
    }
  }

  /**
   * Stream workflow execution
   */
  private streamWorkflow(executionId: string): void {
    this.streamSubscription = this.researchService
      .streamWorkflow(executionId)
      .subscribe({
        next: (event) => {
          this.handleStreamEvent(event);
        },
        error: (error) => {
          console.error('Stream error:', error);
          this.addErrorMessage('Streaming connection lost');
          this.isResearching = false;
        },
        complete: () => {
          console.log('Stream complete');
        },
      });
  }

  /**
   * Handle streaming events from workflow
   */
  private handleStreamEvent(event: ResearchWorkflowEvent): void {
    console.log('Stream event:', event);

    switch (event.type) {
      case 'task_start':
        this.addStatusMessage(`🔄 ${this.formatTaskName(event.taskName)}`);
        break;

      case 'task_complete':
        this.addStatusMessage(
          `✅ ${this.formatTaskName(event.taskName)} completed`
        );
        break;

      case 'state_update':
        // Optional: Show progress updates
        if (event.state?.totalSources) {
          this.addStatusMessage(
            `📊 Found ${event.state.totalSources} research sources`
          );
        }
        break;

      case 'interrupt':
        // Workflow paused for approval
        this.reportDraft = event.state?.reportDraft || 'No draft available';
        this.showApprovalModal = true;
        this.isResearching = false;
        this.addStatusMessage('🛑 Report draft ready for review');
        break;

      case 'workflow_complete':
        this.handleWorkflowComplete(event);
        this.isResearching = false;
        break;

      case 'error':
        this.addErrorMessage(`Error: ${event.error}`);
        this.isResearching = false;
        break;

      default:
        console.log('Unknown event type:', event.type);
    }
  }

  /**
   * Handle workflow completion
   */
  private handleWorkflowComplete(event: ResearchWorkflowEvent): void {
    const state = event.state;

    if (state?.savedReportFilename) {
      this.addSuccessMessage(`✅ Report saved: ${state.savedReportFilename}`);
      this.addMessage({
        role: 'assistant',
        content: state.finalReport || 'Research complete',
        type: 'success',
        timestamp: new Date(),
        metadata: {
          filename: state.savedReportFilename,
          filepath: state.savedReportPath,
        },
      });
    } else {
      this.addMessage({
        role: 'assistant',
        content: state?.finalReport || 'Research workflow completed',
        type: 'text',
        timestamp: new Date(),
      });
    }
  }

  /**
   * User approves/rejects report draft
   */
  onApprovalDecision(approved: boolean, feedback?: string): void {
    this.showApprovalModal = false;

    if (approved) {
      this.addStatusMessage('✅ Report approved - Saving...');
    } else {
      this.addStatusMessage('❌ Report rejected');
    }

    // Resume workflow with decision
    this.researchService
      .approveReport(this.currentExecutionId, approved, feedback)
      .subscribe({
        next: (response) => {
          console.log('Workflow resumed:', response);

          if (approved) {
            // Continue streaming to get save confirmation
            this.streamWorkflow(this.currentExecutionId);
          }
        },
        error: (error) => {
          this.addErrorMessage(`Failed to process approval: ${error.message}`);
        },
      });
  }

  /**
   * Helper methods
   */
  private addMessage(message: ChatMessage): void {
    this.messages.push(message);
    this.scrollToBottom();
  }

  private addSystemMessage(content: string): void {
    this.addMessage({
      role: 'system',
      content,
      type: 'text',
      timestamp: new Date(),
    });
  }

  private addStatusMessage(content: string): void {
    this.addMessage({
      role: 'assistant',
      content,
      type: 'status',
      timestamp: new Date(),
    });
  }

  private addSuccessMessage(content: string): void {
    this.addMessage({
      role: 'assistant',
      content,
      type: 'success',
      timestamp: new Date(),
    });
  }

  private addErrorMessage(content: string): void {
    this.addMessage({
      role: 'assistant',
      content,
      type: 'error',
      timestamp: new Date(),
    });
  }

  private formatTaskName(taskName?: string): string {
    if (!taskName) return 'Processing';

    // Convert camelCase to readable format
    return taskName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  /**
   * Template helpers
   */
  getMessageClass(message: ChatMessage): string {
    const classes = ['message', `message-${message.role}`];

    if (message.type) {
      classes.push(`message-${message.type}`);
    }

    return classes.join(' ');
  }

  formatTimestamp(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
