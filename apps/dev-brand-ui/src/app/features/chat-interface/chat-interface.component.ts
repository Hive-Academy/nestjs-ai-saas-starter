import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DevBrandStateService } from '../../core/state/devbrand-state.service';

@Component({
  selector: 'brand-chat-interface',
  standalone: true,
  imports: [CommonModule],
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
            </div>
          </div>
          }
        </div>

        <div class="chat-messages">
          <div class="message-placeholder">
            Chat messages will appear here when real-time communication is
            active.
          </div>
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

  ngOnInit(): void {
    // Initialize the state service
    this.stateService.initialize();

    // Switch to chat mode
    this.stateService.switchInterfaceMode('chat');
  }
}
