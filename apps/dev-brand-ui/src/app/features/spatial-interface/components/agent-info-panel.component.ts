import {
  Component,
  input,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentState } from '../../../core/interfaces/agent-state.interface';

export interface SelectedAgentData {
  agent: AgentState;
}

/**
 * Agent Info Panel Component
 * Displays detailed information about the selected agent
 */
@Component({
  selector: 'brand-agent-info-panel',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (selectedAgent(); as selectedAgentData) {
    <div class="agent-info-panel">
      <h3>{{ selectedAgentData.agent.name }}</h3>
      <div class="agent-details">
        <p><strong>Type:</strong> {{ selectedAgentData.agent.type }}</p>
        <p><strong>Status:</strong> {{ selectedAgentData.agent.status }}</p>
        <p>
          <strong>Capabilities:</strong>
          {{ capabilitiesText() }}
        </p>
        @if (hasActiveTools()) {
        <div class="agent-tools">
          <strong>Active Tools:</strong>
          <ul>
            @for (tool of selectedAgentData.agent.currentTools; track
            tool.toolName) {
            <li>{{ tool.toolName }} ({{ tool.status }})</li>
            }
          </ul>
        </div>
        }
      </div>
    </div>
    }
  `,
  styles: [
    `
      .agent-info-panel {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 8px;
        padding: 16px;
        color: white;
        min-width: 280px;
        backdrop-filter: blur(10px);
        pointer-events: auto;
      }

      .agent-info-panel h3 {
        margin: 0 0 12px 0;
        color: #3b82f6;
        font-size: 1.2em;
      }

      .agent-details p {
        margin: 4px 0;
        font-size: 0.9em;
      }

      .agent-tools {
        margin-top: 12px;
      }

      .agent-tools ul {
        margin: 4px 0;
        padding-left: 16px;
      }

      .agent-tools li {
        font-size: 0.85em;
        margin: 2px 0;
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .agent-info-panel {
          top: 10px;
          right: 10px;
          left: 10px;
          min-width: auto;
          max-width: none;
        }
      }
    `,
  ],
})
export class AgentInfoPanelComponent {
  selectedAgent = input<SelectedAgentData | null>(null);

  // Computed properties for better performance
  capabilitiesText = computed(() => {
    const agent = this.selectedAgent();
    return agent &&
      agent.agent.capabilities &&
      Array.isArray(agent.agent.capabilities)
      ? agent.agent.capabilities.join(', ')
      : 'No capabilities listed';
  });

  hasActiveTools = computed(() => {
    const agent = this.selectedAgent();
    return agent &&
      agent.agent.currentTools &&
      Array.isArray(agent.agent.currentTools)
      ? agent.agent.currentTools.length > 0
      : false;
  });
}
