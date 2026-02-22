/**
 * AgentStatusPanelComponent
 *
 * Displays real-time agent status with active tasks, progress, and completion tracking.
 * Provides a live dashboard view of all agents working on the current workflow.
 *
 * Features:
 * - Real-time agent activity tracking
 * - Visual status indicators (idle, active, completed, error)
 * - Progress bar integration for active agents
 * - Automatic agent list management
 * - Accessible ARIA attributes
 *
 * Usage:
 * ```html
 * <app-agent-status-panel #agentPanel />
 * ```
 * ```typescript
 * @ViewChild('agentPanel') agentPanel!: AgentStatusPanelComponent;
 *
 * // Update agent status from stream event
 * this.agentPanel.updateAgentStatus(customStreamEvent);
 * ```
 *
 * @remarks
 * Component Complexity Assessment: Level 2 (Medium)
 * - Signals: 50-100 lines, some state management (agent list tracking)
 * - Patterns Applied: Standalone component, signals for reactive state, composition with ProgressIndicator
 * - Patterns Rejected: Container/Presentational (not needed, UI and logic are tightly coupled)
 * - SOLID Principles:
 *   - Single Responsibility: Manages agent status display and updates
 *   - Composition: Uses ProgressIndicatorComponent for progress visualization
 */

import { Component, signal, ChangeDetectionStrategy } from '@angular/core';

import { ProgressIndicatorComponent } from './progress-indicator.component';
import type { CustomStreamEvent } from '../../features/devbrand-poc/models/stream-events.model';

export type AgentStatusType = 'idle' | 'active' | 'completed' | 'error';

export interface AgentStatus {
  readonly agentName: string;
  status: AgentStatusType;
  currentStage?: string;
  progress?: number;
  message?: string;
}

@Component({
  selector: 'app-agent-status-panel',
  standalone: true,
  imports: [ProgressIndicatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="agent-status-panel">
      <h3 class="panel-title">Agent Activity</h3>
      @if (agents().length === 0) {
      <div class="empty-state" role="status">
        <p>No active agents</p>
      </div>
      } @else {
      <div class="agents-list">
        @for (agent of agents(); track agent.agentName) {
        <div
          class="agent-card"
          [class.active]="agent.status === 'active'"
          [class.completed]="agent.status === 'completed'"
          [class.error]="agent.status === 'error'"
          role="article"
          [attr.aria-label]="agent.agentName + ' status: ' + agent.status"
        >
          <div class="agent-header">
            <span class="agent-name">{{ agent.agentName }}</span>
            <span
              class="status-badge"
              [attr.data-status]="agent.status"
              role="status"
            >
              {{ agent.status }}
            </span>
          </div>
          @if (agent.progress !== undefined && agent.status === 'active') {
          <app-progress-indicator
            [progress]="{
              agent: agent.agentName,
              stage: agent.currentStage,
              message: agent.message,
              percentage: agent.progress
            }"
          />
          }
        </div>
        }
      </div>
      }
    </div>
  `,
  styles: [
    `
      .agent-status-panel {
        background: #ffffff;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
      }

      .panel-title {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 600;
        color: #23272f;
      }

      .empty-state {
        text-align: center;
        padding: 32px 16px;
        color: #9ca3af;
        font-size: 14px;
      }

      .empty-state p {
        margin: 0;
      }

      .agents-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .agent-card {
        border-left: 4px solid #e5e7eb;
        padding: 12px;
        background: #f9fafb;
        border-radius: 8px;
        transition: all 0.3s ease;
      }

      .agent-card.active {
        border-left-color: #6366f1;
        background: #eff6ff;
      }

      .agent-card.completed {
        border-left-color: #10b981;
        background: #f0fdf4;
      }

      .agent-card.error {
        border-left-color: #ef4444;
        background: #fef2f2;
      }

      .agent-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .agent-name {
        font-weight: 600;
        font-size: 14px;
        color: #23272f;
        text-transform: capitalize;
      }

      .status-badge {
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        text-transform: capitalize;
      }

      .status-badge[data-status='active'] {
        background: #dbeafe;
        color: #1e40af;
      }

      .status-badge[data-status='completed'] {
        background: #d1fae5;
        color: #065f46;
      }

      .status-badge[data-status='error'] {
        background: #fee2e2;
        color: #991b1b;
      }

      .status-badge[data-status='idle'] {
        background: #f3f4f6;
        color: #6b7280;
      }

      @media (max-width: 768px) {
        .agent-status-panel {
          padding: 12px;
        }

        .panel-title {
          font-size: 16px;
        }

        .agent-card {
          padding: 10px;
        }
      }
    `,
  ],
})
export class AgentStatusPanelComponent {
  // State (using signals for reactivity)
  readonly agents = signal<AgentStatus[]>([]);

  /**
   * Update agent status from custom stream event
   * Automatically manages agent list (adds new, updates existing)
   */
  updateAgentStatus(event: CustomStreamEvent): void {
    const agentName = event.data.agent || 'unknown';
    const currentAgents = this.agents();
    const existingAgentIndex = currentAgents.findIndex(
      (a) => a.agentName === agentName
    );

    if (existingAgentIndex >= 0) {
      // Update existing agent
      const updatedAgents = [...currentAgents];
      updatedAgents[existingAgentIndex] = {
        ...updatedAgents[existingAgentIndex],
        status: event.data.percentage === 100 ? 'completed' : 'active',
        currentStage: event.data.stage,
        progress: event.data.percentage,
        message: event.data.message,
      };
      this.agents.set(updatedAgents);
    } else {
      // Add new agent
      this.agents.update((agents) => [
        ...agents,
        {
          agentName,
          status: 'active',
          currentStage: event.data.stage,
          progress: event.data.percentage,
          message: event.data.message,
        },
      ]);
    }
  }

  /**
   * Reset all agents (useful for new workflow execution)
   */
  reset(): void {
    this.agents.set([]);
  }

  /**
   * Mark an agent as completed
   */
  markAgentCompleted(agentName: string): void {
    this.agents.update((agents) =>
      agents.map((agent) =>
        agent.agentName === agentName
          ? { ...agent, status: 'completed' as const }
          : agent
      )
    );
  }

  /**
   * Mark an agent as error
   */
  markAgentError(agentName: string, message?: string): void {
    this.agents.update((agents) =>
      agents.map((agent) =>
        agent.agentName === agentName
          ? { ...agent, status: 'error' as const, message }
          : agent
      )
    );
  }
}
