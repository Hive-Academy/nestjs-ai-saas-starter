import { Component, OnInit, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { DevBrandStateService } from '../../core/state/devbrand-state.service';
import { UserInterruptionService } from '../../core/services/user-interruption.service';
import { StreamingIntegrationService } from '../../core/services/streaming-integration.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'brand-chat-interface',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="chat-interface">
      <div class="chat-header">
        <h1>DevBrand Chat Studio</h1>
        <div
          class="connection-status"
          [class.connected]="stateService.store.websocketConnected()"
        >
          {{
            stateService.store.websocketConnected()
              ? 'Connected'
              : 'Disconnected'
          }}
        </div>
      </div>

      <div class="chat-content">
        <div class="agents-panel">
          <h3>Active Agents</h3>
          @for (agent of stateService.store.activeAgents(); track agent.id) {
          <div
            class="agent-card"
            [class.active]="agent.id === stateService.store.activeAgentId()"
          >
            <div
              class="agent-avatar"
              [style.background-color]="agent.personality.color"
            ></div>
            <div class="agent-info">
              <div class="agent-name">{{ agent.name }}</div>
              <div class="agent-status">{{ agent.status }}</div>
              @if (agent.status === 'waiting') {
                <div class="waiting-indicator">🤔 Waiting for input</div>
              }
            </div>
          </div>
          }

          <!-- User Interruption Controls -->
          <div class="interruption-controls">
            <h4>Interrupt Agent</h4>
            <input
              [(ngModel)]="userQuestion"
              placeholder="Ask the agent a question..."
              class="question-input"
              (keyup.enter)="askQuestion()"
            />
            <div class="control-buttons">
              <button (click)="askQuestion()" [disabled]="!userQuestion.trim()">
                Ask Question
              </button>
              <button (click)="injectContext()" [disabled]="!userQuestion.trim()">
                Provide Context
              </button>
            </div>
          </div>
        </div>

        <div class="chat-messages">
          @if (interruptionService.dialogData()) {
            <!-- Active Interruption Dialog -->
            <div class="interruption-dialog">
              <div class="dialog-header">
                <h3>{{ getInterruptionTitle(interruptionService.dialogData()!.type) }}</h3>
                <div class="urgency-badge" [class]="interruptionService.dialogData()!.urgency">
                  {{ interruptionService.dialogData()!.urgency || 'medium' }}
                </div>
              </div>

              <div class="dialog-content">
                <p>{{ interruptionService.dialogData()!.message }}</p>

                @if (interruptionService.dialogData()!.type === 'clarification') {
                  <!-- Predefined options for clarifications -->
                  <div class="option-buttons">
                    <button (click)="respondToInterruption('1')">Option 1: Proceed with standard resolution</button>
                    <button (click)="respondToInterruption('2')">Option 2: Escalate to specialist</button>
                    <button (click)="respondToInterruption('3')">Option 3: Request more customer info</button>
                  </div>
                }

                <!-- Free text response -->
                <div class="response-input">
                  <textarea
                    [(ngModel)]="interruptionResponse"
                    placeholder="Your response..."
                    class="response-textarea"
                  ></textarea>
                  <div class="response-actions">
                    <button
                      (click)="respondToInterruption(interruptionResponse)"
                      [disabled]="!interruptionResponse.trim()"
                      class="respond-btn"
                    >
                      Respond & Continue
                    </button>
                    <button (click)="cancelInterruption()" class="cancel-btn">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          } @else {
            <div class="message-placeholder">
              @if (currentExecutionId()) {
                <div class="active-workflow">
                  <h3>🤖 AI Workflow Active</h3>
                  <p>Execution ID: {{ currentExecutionId() }}</p>
                  <div class="workflow-controls">
                    <button 
                      class="start-workflow-btn" 
                      (click)="startWorkflow()" 
                      [disabled]="workflowRunning()"
                    >
                      {{ workflowRunning() ? 'Workflow Running...' : 'Start Support Workflow' }}
                    </button>
                  </div>
                </div>
              } @else {
                <div class="no-workflow">
                  <h3>💬 DevBrand Chat Interface</h3>
                  <p>Start a workflow to begin real-time communication with AI agents.</p>
                  <button class="start-workflow-btn" (click)="startWorkflow()">Start Support Workflow</button>
                </div>
              }
              @if (interruptionService.interruptions().length > 0) {
                <div class="pending-interruptions">
                  <p>{{ interruptionService.interruptions().length }} pending interruption(s)</p>
                </div>
              }
            </div>
          }
        </div>

        <div class="memory-panel">
          <h3>Active Memory</h3>
          @for (context of stateService.store.activeMemoryContexts(); track
          context.id) {
          <div class="memory-card">
            <div class="memory-type">{{ context.type }}</div>
            <div class="memory-content">{{ context.content }}</div>
            <div class="relevance-score">
              {{ (context.relevanceScore * 100).toFixed(0) }}%
            </div>
          </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .chat-interface {
        height: 100vh;
        display: flex;
        flex-direction: column;
        background: #0a0a0a;
        color: #ffffff;
      }

      .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        border-bottom: 1px solid #333;
      }

      .connection-status {
        padding: 0.5rem 1rem;
        border-radius: 20px;
        background: #ef4444;
        font-size: 0.875rem;
      }

      .connection-status.connected {
        background: #10b981;
      }

      .chat-content {
        flex: 1;
        display: grid;
        grid-template-columns: 300px 1fr 300px;
        gap: 1rem;
        padding: 1rem;
      }

      .agents-panel,
      .memory-panel {
        background: #1a1a1a;
        border-radius: 8px;
        padding: 1rem;
      }

      .agent-card {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        margin: 0.5rem 0;
        border-radius: 6px;
        background: #2a2a2a;
        transition: all 0.2s;
        cursor: pointer;
      }

      .agent-card.active {
        background: #3b82f6;
      }

      .agent-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
      }

      .agent-name {
        font-weight: 600;
      }

      .agent-status {
        font-size: 0.75rem;
        opacity: 0.7;
        text-transform: capitalize;
      }

      .chat-messages {
        background: #1a1a1a;
        border-radius: 8px;
        padding: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .message-placeholder {
        text-align: center;
        opacity: 0.6;
      }

      .interruption-controls {
        margin-top: 2rem;
        padding-top: 1rem;
        border-top: 1px solid #333;
      }

      .question-input {
        width: 100%;
        padding: 0.75rem;
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 6px;
        color: white;
        margin-bottom: 0.5rem;
      }

      .control-buttons {
        display: flex;
        gap: 0.5rem;
      }

      .control-buttons button {
        flex: 1;
        padding: 0.5rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.75rem;
      }

      .control-buttons button:hover {
        background: #2563eb;
      }

      .control-buttons button:disabled {
        background: #374151;
        cursor: not-allowed;
      }

      .interruption-dialog {
        background: #1f2937;
        border: 1px solid #374151;
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1rem;
      }

      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .urgency-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .urgency-badge.high {
        background: #dc2626;
        color: white;
      }

      .urgency-badge.medium {
        background: #f59e0b;
        color: white;
      }

      .urgency-badge.low {
        background: #10b981;
        color: white;
      }

      .option-buttons {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin: 1rem 0;
      }

      .option-buttons button {
        padding: 0.75rem;
        background: #374151;
        color: white;
        border: 1px solid #4b5563;
        border-radius: 6px;
        cursor: pointer;
        text-align: left;
      }

      .option-buttons button:hover {
        background: #4b5563;
      }

      .response-textarea {
        width: 100%;
        min-height: 80px;
        padding: 0.75rem;
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 6px;
        color: white;
        resize: vertical;
        margin-bottom: 0.75rem;
      }

      .response-actions {
        display: flex;
        gap: 0.75rem;
      }

      .respond-btn {
        flex: 1;
        padding: 0.75rem 1rem;
        background: #10b981;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
      }

      .respond-btn:hover {
        background: #059669;
      }

      .respond-btn:disabled {
        background: #374151;
        cursor: not-allowed;
      }

      .cancel-btn {
        padding: 0.75rem 1rem;
        background: #dc2626;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
      }

      .cancel-btn:hover {
        background: #b91c1c;
      }

      .active-workflow, .no-workflow {
        padding: 2rem;
        text-align: center;
      }

      .start-workflow-btn {
        padding: 1rem 2rem;
        background: #8b5cf6;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        margin-top: 1rem;
      }

      .start-workflow-btn:hover {
        background: #7c3aed;
      }

      .start-workflow-btn:disabled {
        background: #374151;
        cursor: not-allowed;
      }

      .workflow-controls {
        margin-top: 1rem;
      }

      .pending-interruptions {
        margin-top: 1rem;
        padding: 0.75rem;
        background: #f59e0b;
        color: #1f2937;
        border-radius: 6px;
        font-weight: 600;
      }

      .waiting-indicator {
        font-size: 0.75rem;
        color: #f59e0b;
        margin-top: 0.25rem;
      }

      .memory-card {
        background: #2a2a2a;
        border-radius: 6px;
        padding: 0.75rem;
        margin: 0.5rem 0;
      }

      .memory-type {
        font-size: 0.75rem;
        text-transform: uppercase;
        color: #f59e0b;
        font-weight: 600;
      }

      .memory-content {
        margin: 0.5rem 0;
        font-size: 0.875rem;
      }

      .relevance-score {
        font-size: 0.75rem;
        opacity: 0.7;
      }
    `,
  ],
})
export class ChatInterfaceComponent implements OnInit {
  protected readonly stateService = inject(DevBrandStateService);
  protected readonly interruptionService = inject(UserInterruptionService);
  private readonly streamingService = inject(StreamingIntegrationService);

  // Component state
  protected userQuestion = '';
  protected interruptionResponse = '';
  protected readonly currentExecutionId = signal<string | null>(null);
  protected readonly workflowRunning = signal(false);
  
  // Subscriptions
  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    // Initialize the state service
    this.stateService.initialize();

    // Switch to chat mode
    this.stateService.switchInterfaceMode('chat');
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async startWorkflow(): Promise<void> {
    if (this.workflowRunning()) return;

    this.workflowRunning.set(true);
    
    try {
      const demoRequest = {
        input: 'Customer support request: Help me understand how to integrate your AI platform with our existing CRM system. I need technical documentation and implementation guidance.',
        demonstrationMode: 'enterprise' as const,
        enableStreaming: true
      };

      console.log('🚀 Starting customer support workflow from chat interface...');
      
      // Subscribe to streaming updates
      const streamSubscription = this.streamingService.startSupervisorShowcase(demoRequest)
        .subscribe({
          next: (update) => {
            console.log('📡 Chat workflow update:', update);
            if (update.executionId && !this.currentExecutionId()) {
              this.currentExecutionId.set(update.executionId);
            }
          },
          error: (error) => {
            console.error('❌ Chat workflow error:', error);
            this.workflowRunning.set(false);
          },
          complete: () => {
            console.log('✅ Chat workflow completed');
            this.workflowRunning.set(false);
          }
        });

      this.subscriptions.push(streamSubscription);

    } catch (error) {
      console.error('Failed to start workflow:', error);
      this.workflowRunning.set(false);
    }
  }

  async askQuestion(): Promise<void> {
    if (!this.userQuestion.trim() || !this.currentExecutionId()) return;

    try {
      await this.interruptionService.askQuestion(
        this.currentExecutionId()!,
        this.userQuestion,
        'medium'
      );
      this.userQuestion = '';
    } catch (error) {
      console.error('Failed to ask question:', error);
    }
  }

  async injectContext(): Promise<void> {
    if (!this.userQuestion.trim() || !this.currentExecutionId()) return;

    try {
      await this.interruptionService.injectInput(
        this.currentExecutionId()!,
        this.userQuestion,
        'correction'
      );
      this.userQuestion = '';
    } catch (error) {
      console.error('Failed to inject context:', error);
    }
  }

  async respondToInterruption(response: string): Promise<void> {
    const interruption = this.interruptionService.dialogData();
    if (!interruption || !response.trim()) return;

    try {
      await this.interruptionService.respondToInterruption(interruption.id, response);
      this.interruptionResponse = '';
    } catch (error) {
      console.error('Failed to respond to interruption:', error);
    }
  }

  async cancelInterruption(): Promise<void> {
    const interruption = this.interruptionService.dialogData();
    if (!interruption) return;

    try {
      await this.interruptionService.cancelInterruption(
        interruption.id,
        'User cancelled from chat interface'
      );
    } catch (error) {
      console.error('Failed to cancel interruption:', error);
    }
  }

  getInterruptionTitle(type: string): string {
    switch (type) {
      case 'question': return '💬 Agent Question';
      case 'clarification': return '❓ Clarification Needed';
      case 'approval_request': return '✋ Approval Required';
      case 'input_request': return '📝 Input Required';
      default: return '🤖 Agent Interaction';
    }
  }
}
