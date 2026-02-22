import { Component, OnInit, OnDestroy, inject, viewChild } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ResearchService,
  type ResearchWorkflowEvent,
} from './services/research.service';
import { Subscription } from 'rxjs';
import { ApprovalModalComponent } from './components/approval-modal.component';
import { MarkdownModule } from 'ngx-markdown';
import { AgentStatusPanelComponent } from '../../shared/components';
import { ConversationSidebarComponent } from '../../shared/components/conversation-sidebar/conversation-sidebar.component';
import { ConversationApiService } from '../../shared/services/conversation-api.service';
import {
  isMessageStreamEvent,
  isCustomStreamEvent,
  isDebugStreamEvent,
  type MessageStreamEvent,
  type CustomStreamEvent,
  type DebugStreamEvent,
} from '../devbrand-poc/models/stream-events.model';

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
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  type?: 'text' | 'status' | 'success' | 'error' | 'draft' | 'tool-execution';
  timestamp: Date;
  metadata?: any;
  toolData?: {
    toolName?: string;
    toolInput?: any;
    toolOutput?: any;
  };
}

@Component({
  selector: 'app-research-chat',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    FormsModule,
    ApprovalModalComponent,
    MarkdownModule,
    AgentStatusPanelComponent,
    ConversationSidebarComponent,
  ],
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
  userId = 'test-researcher-001'; // Hardcoded test user for POC
  currentThreadId?: string; // Current conversation thread

  // Phase 3: Token streaming state
  private currentStreamingMessage = '';

  // ViewChild references for new components
  readonly agentStatusPanel = viewChild(AgentStatusPanelComponent);

  private streamSubscription?: Subscription;
  private readonly researchService = inject(ResearchService);
  private readonly conversationApi = inject(ConversationApiService);

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

    // Reset streaming state for new message
    this.currentStreamingMessage = '';

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
            this.currentThreadId = response.executionId; // Track thread ID
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
   * Handle conversation selection from sidebar
   */
  onConversationSelected(threadId: string): void {
    this.loadConversationHistory(threadId);
  }

  /**
   * Load conversation history from API
   */
  private loadConversationHistory(threadId: string): void {
    this.conversationApi.getResearcherConversationHistory(threadId).subscribe({
      next: (response) => {
        this.currentThreadId = threadId;
        this.messages = response.conversationHistory.map((msg) => ({
          role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
          content: msg.content,
          type: 'text',
          timestamp: new Date(msg.timestamp),
          toolData: msg.toolCalls ? { toolOutput: msg.toolCalls } : undefined,
        }));
        this.scrollToBottom();
      },
      error: (error) => {
        this.addErrorMessage(`Failed to load conversation: ${error}`);
      },
    });
  }

  /**
   * Handle new conversation creation from sidebar
   */
  onNewConversation(threadId: string): void {
    this.currentThreadId = threadId;
    this.messages = [];
    this.currentQuery = '';
    this.addSystemMessage(
      'New conversation started. Ask me to research any topic.'
    );
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
  private handleStreamEvent(
    event:
      | ResearchWorkflowEvent
      | MessageStreamEvent
      | CustomStreamEvent
      | DebugStreamEvent
  ): void {
    console.log('Stream event:', event);

    // Phase 3: Handle new LangGraph streaming events
    // Use any to satisfy type guards (they check the discriminant property)
    const streamEvent = event as any;

    if (isMessageStreamEvent(streamEvent)) {
      this.handleMessageStream(streamEvent);
      return;
    }

    if (isCustomStreamEvent(streamEvent)) {
      this.handleCustomProgress(streamEvent);
      return;
    }

    if (isDebugStreamEvent(streamEvent)) {
      this.handleDebugTrace(streamEvent);
      return;
    }

    // Existing event handlers (backward compatibility)
    const workflowEvent = event as ResearchWorkflowEvent;
    switch (workflowEvent.type) {
      case 'task_start':
        this.addStatusMessage(
          `🔄 ${this.formatTaskName(workflowEvent.taskName)}`
        );
        break;

      case 'task_complete':
        this.addStatusMessage(
          `✅ ${this.formatTaskName(workflowEvent.taskName)} completed`
        );
        break;

      case 'state_update':
        // Show node execution progress
        if (workflowEvent.nodeName) {
          this.addStatusMessage(
            `▶️ ${this.formatTaskName(workflowEvent.nodeName)} running...`
          );
        }

        // Show research progress updates
        if (workflowEvent.state?.metadata?.totalSources) {
          this.addStatusMessage(
            `📊 Found ${workflowEvent.state.metadata.totalSources} research sources`
          );
        }
        break;

      case 'tool_execution':
        // Show tool execution details
        this.handleToolExecution(workflowEvent);
        break;

      case 'interrupt':
        // Workflow paused for approval
        this.reportDraft =
          workflowEvent.state?.metadata?.reportDraft || 'No draft available';
        this.showApprovalModal = true;
        this.isResearching = false;
        this.addStatusMessage('🛑 Report draft ready for review');
        break;

      case 'workflow_complete':
        this.handleWorkflowComplete(workflowEvent);
        this.isResearching = false;
        break;

      case 'error':
        this.addErrorMessage(`Error: ${workflowEvent.error}`);
        this.isResearching = false;
        break;

      default:
        console.log('Unknown event type:', workflowEvent.type);
    }
  }

  /**
   * Phase 3: Handle LLM token streaming events
   */
  private handleMessageStream(event: MessageStreamEvent): void {
    this.currentStreamingMessage += event.content;

    // Update the last message in chat with accumulated tokens
    const lastMessage = this.messages[this.messages.length - 1];
    if (
      lastMessage &&
      lastMessage.role === 'assistant' &&
      lastMessage.type === 'text'
    ) {
      lastMessage.content = this.currentStreamingMessage;
    } else {
      // Create new streaming message
      this.addMessage({
        role: 'assistant',
        content: this.currentStreamingMessage,
        type: 'text',
        timestamp: new Date(),
      });
    }

    this.scrollToBottom();
  }

  /**
   * Phase 3: Handle custom progress events
   */
  private handleCustomProgress(event: CustomStreamEvent): void {
    // Update agent status panel
    const panel = this.agentStatusPanel();
    if (panel) {
      panel.updateAgentStatus(event);
    }

    // Also show as status message in chat
    if (event.data.message) {
      const agent = event.data.agent || 'Agent';
      const percentage = event.data.percentage ?? 0;
      this.addStatusMessage(
        `📊 ${agent}: ${event.data.message} (${percentage}%)`
      );
    }
  }

  /**
   * Phase 3: Handle debug trace events (dev mode only)
   */
  private handleDebugTrace(event: DebugStreamEvent): void {
    // Only log in development mode
    if (
      typeof window !== 'undefined' &&
      (window as any).location?.hostname === 'localhost'
    ) {
      console.log('🐛 Debug Trace:', {
        eventType: event.eventType,
        taskName: event.taskName,
        step: event.step,
        payload: event.payload,
      });
    }
  }

  /**
   * Handle tool execution events
   * Shows which tools are being called and their results
   */
  private handleToolExecution(event: ResearchWorkflowEvent): void {
    const toolData = event.toolData;
    if (!toolData) return;

    const toolName = toolData.toolName || 'unknown-tool';
    const toolInput = toolData.toolInput;
    const toolOutput = toolData.toolOutput;

    // Format tool call message
    let content = `🔧 Tool: ${this.formatToolName(toolName)}`;

    if (toolInput) {
      const inputSummary = this.formatToolInput(toolName, toolInput);
      if (inputSummary) {
        content += `\n   Input: ${inputSummary}`;
      }
    }

    if (toolOutput) {
      const outputSummary = this.formatToolOutput(toolName, toolOutput);
      if (outputSummary) {
        content += `\n   Result: ${outputSummary}`;
      }
    }

    this.addMessage({
      role: 'tool',
      content,
      type: 'tool-execution',
      timestamp: new Date(),
      toolData: {
        toolName,
        toolInput,
        toolOutput,
      },
    });
  }

  /**
   * Format tool name for display
   */
  private formatToolName(toolName: string): string {
    return toolName
      .replace(/-/g, ' ')
      .replace(/^./, (str) => str.toUpperCase());
  }

  /**
   * Format tool input for display (tool-specific formatting)
   */
  private formatToolInput(toolName: string, input: any): string {
    if (!input) return '';

    switch (toolName) {
      case 'web-search':
      case 'research-search':
        return `"${input.query || input.search_query || ''}"`;

      case 'create-report':
      case 'save-report':
        return `"${input.title || input.filename || ''}"`;

      default:
        // Generic formatting
        if (typeof input === 'string') return input;
        if (input.query) return `"${input.query}"`;
        return JSON.stringify(input).substring(0, 100);
    }
  }

  /**
   * Format tool output for display (tool-specific formatting)
   */
  private formatToolOutput(toolName: string, output: any): string {
    if (!output) return '';

    // If output is a string, show it directly
    if (typeof output === 'string') {
      return output.length > 150 ? output.substring(0, 150) + '...' : output;
    }

    // Tool-specific output formatting
    switch (toolName) {
      case 'web-search':
      case 'research-search': {
        const resultCount = output.results?.length || output.length || 0;
        return `Found ${resultCount} result(s)`;
      }

      case 'create-report': {
        return 'Report created successfully';
      }

      case 'save-report': {
        return `Saved to ${output.filename || output.filepath || 'file'}`;
      }

      default: {
        // Generic formatting
        const summary = JSON.stringify(output).substring(0, 100);
        return summary + (summary.length >= 100 ? '...' : '');
      }
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
