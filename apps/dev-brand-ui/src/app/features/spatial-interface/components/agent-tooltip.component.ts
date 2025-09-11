import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipData } from '../services/agent-interaction.service';

export interface TooltipConfig {
  showCapabilities: boolean;
  showStatus: boolean;
  showTools: boolean;
  showPerformance: boolean;
  showRecentActivity: boolean;
  maxWidth: number;
  maxHeight: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  followCursor: boolean;
  offset: { x: number; y: number };
}

export interface ActivityItem {
  timestamp: Date;
  type: 'tool_execution' | 'memory_access' | 'communication' | 'state_change';
  description: string;
  status: 'success' | 'warning' | 'error' | 'in_progress';
}

/**
 * Agent Tooltip Component
 * Rich tooltip display with agent capabilities, status, and recent activity
 * Follows 3D world coordinates while rendering in screen space
 */
@Component({
  selector: 'brand-agent-tooltip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      #tooltipElement
      class="agent-tooltip"
      [class.visible]="isVisible()"
      [class.following]="config?.followCursor"
      [style.left.px]="position().x"
      [style.top.px]="position().y"
      [style.max-width.px]="config?.maxWidth || 320"
      [style.max-height.px]="config?.maxHeight || 400"
      *ngIf="tooltipData"
    >
      <!-- Agent Header -->
      <div class="tooltip-header">
        <div class="agent-identity">
          <div class="agent-avatar" [class]="getAgentTypeClass()">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="3" />
              <circle cx="12" cy="12" r="1" />
            </svg>
          </div>
          <div class="agent-info">
            <h4 class="agent-name">{{ tooltipData.agent.name }}</h4>
            <div class="agent-type">{{ tooltipData.agent.type }}</div>
          </div>
        </div>

        <div class="agent-status" [class]="getStatusClass()">
          <div class="status-indicator"></div>
          <span class="status-text">{{ getStatusText() }}</span>
        </div>
      </div>

      <!-- Agent Capabilities -->
      <div
        class="tooltip-section capabilities-section"
        *ngIf="config?.showCapabilities && hasCapabilities()"
      >
        <div class="section-header">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
          </svg>
          <span>Capabilities</span>
        </div>
        <div class="capabilities-list">
          <div
            class="capability-item"
            *ngFor="let capability of tooltipData.agent.capabilities"
            [title]="capability"
          >
            {{ capability }}
          </div>
        </div>
      </div>

      <!-- Current Tools -->
      <div
        class="tooltip-section tools-section"
        *ngIf="config?.showTools && hasActiveTools()"
      >
        <div class="section-header">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
            />
          </svg>
          <span>Active Tools</span>
        </div>
        <div class="tools-list">
          <div
            class="tool-item"
            *ngFor="let tool of tooltipData.agent.currentTools"
            [class]="getToolStatusClass(tool.status)"
          >
            <div class="tool-name">{{ tool.toolName }}</div>
            <div class="tool-status">{{ tool.status }}</div>
            <div class="tool-progress" *ngIf="tool.progress !== undefined">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  [style.width.%]="tool.progress"
                ></div>
              </div>
              <span class="progress-text">{{ tool.progress }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Metrics -->
      <div
        class="tooltip-section performance-section"
        *ngIf="config?.showPerformance && hasPerformanceData()"
      >
        <div class="section-header">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
          </svg>
          <span>Performance</span>
        </div>
        <div class="performance-metrics">
          <div class="metric-item" *ngIf="tooltipData.agent.lastResponse">
            <span class="metric-label">Response Time:</span>
            <span class="metric-value">{{ getResponseTime() }}ms</span>
          </div>
          <div class="metric-item" *ngIf="tooltipData.agent.memoryUsage">
            <span class="metric-label">Memory:</span>
            <span class="metric-value">{{ getMemoryUsage() }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Uptime:</span>
            <span class="metric-value">{{ getUptime() }}</span>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div
        class="tooltip-section activity-section"
        *ngIf="config?.showRecentActivity && hasRecentActivity()"
      >
        <div class="section-header">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
          <span>Recent Activity</span>
        </div>
        <div class="activity-list">
          <div
            class="activity-item"
            *ngFor="let activity of getRecentActivities()"
            [class]="getActivityStatusClass(activity.status)"
          >
            <div class="activity-time">
              {{ formatActivityTime(activity.timestamp) }}
            </div>
            <div class="activity-description">{{ activity.description }}</div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="tooltip-actions">
        <button
          class="action-button focus-button"
          (click)="onFocusAgent()"
          title="Focus Camera on Agent"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="4.5" cy="4.5" r="1" />
            <circle cx="19.5" cy="19.5" r="1" />
          </svg>
          Focus
        </button>

        <button
          class="action-button chat-button"
          (click)="onStartChat()"
          title="Start Conversation"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            />
          </svg>
          Chat
        </button>
      </div>

      <!-- Tooltip Arrow -->
      <div class="tooltip-arrow" [style.left.px]="arrowPosition()"></div>
    </div>
  `,
  styles: [
    `
      .agent-tooltip {
        position: fixed;
        background: rgba(0, 0, 0, 0.95);
        border: 1px solid rgba(59, 130, 246, 0.4);
        border-radius: 8px;
        padding: 0;
        color: white;
        font-size: 0.85em;
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        z-index: 1000;
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.2s ease, transform 0.2s ease;
        pointer-events: auto;
        overflow: hidden;
      }

      .agent-tooltip.visible {
        opacity: 1;
        transform: translateY(0);
      }

      .agent-tooltip.following {
        transition: left 0.1s ease, top 0.1s ease;
      }

      .tooltip-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 12px 16px;
        background: rgba(59, 130, 246, 0.1);
        border-bottom: 1px solid rgba(59, 130, 246, 0.2);
      }

      .agent-identity {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .agent-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(59, 130, 246, 0.2);
        border: 1px solid rgba(59, 130, 246, 0.4);
      }

      .agent-avatar.coordinator {
        background: rgba(147, 51, 234, 0.2);
        border-color: rgba(147, 51, 234, 0.4);
        color: #a855f7;
      }

      .agent-avatar.specialist {
        background: rgba(34, 197, 94, 0.2);
        border-color: rgba(34, 197, 94, 0.4);
        color: #22c55e;
      }

      .agent-avatar.worker {
        background: rgba(249, 115, 22, 0.2);
        border-color: rgba(249, 115, 22, 0.4);
        color: #f97316;
      }

      .agent-name {
        margin: 0;
        font-size: 1.1em;
        font-weight: 600;
        color: white;
      }

      .agent-type {
        font-size: 0.9em;
        color: rgba(255, 255, 255, 0.7);
        text-transform: capitalize;
      }

      .agent-status {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.8em;
      }

      .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
      }

      .agent-status.busy .status-indicator {
        background: #f59e0b;
        animation: pulse 2s infinite;
      }

      .agent-status.error .status-indicator {
        background: #ef4444;
      }

      .agent-status.idle .status-indicator {
        background: #6b7280;
      }

      .tooltip-section {
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .tooltip-section:last-of-type {
        border-bottom: none;
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 8px;
        font-weight: 600;
        color: #3b82f6;
        font-size: 0.9em;
      }

      .capabilities-list {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      .capability-item {
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 12px;
        padding: 2px 8px;
        font-size: 0.8em;
        color: #93c5fd;
        white-space: nowrap;
      }

      .tools-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .tool-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        border-left: 3px solid #10b981;
      }

      .tool-item.running {
        border-left-color: #f59e0b;
      }

      .tool-item.error {
        border-left-color: #ef4444;
      }

      .tool-name {
        font-weight: 500;
        font-size: 0.9em;
      }

      .tool-status {
        font-size: 0.8em;
        color: rgba(255, 255, 255, 0.7);
        text-transform: capitalize;
      }

      .tool-progress {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 4px;
      }

      .progress-bar {
        flex: 1;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: #3b82f6;
        transition: width 0.3s ease;
      }

      .progress-text {
        font-size: 0.75em;
        color: rgba(255, 255, 255, 0.8);
        min-width: 35px;
        text-align: right;
      }

      .performance-metrics {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .metric-item {
        display: flex;
        justify-content: space-between;
        font-size: 0.85em;
      }

      .metric-label {
        color: rgba(255, 255, 255, 0.7);
      }

      .metric-value {
        color: white;
        font-weight: 500;
        font-family: monospace;
      }

      .activity-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 120px;
        overflow-y: auto;
      }

      .activity-item {
        padding: 6px 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        border-left: 3px solid #10b981;
      }

      .activity-item.warning {
        border-left-color: #f59e0b;
      }

      .activity-item.error {
        border-left-color: #ef4444;
      }

      .activity-item.in_progress {
        border-left-color: #3b82f6;
      }

      .activity-time {
        font-size: 0.75em;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 2px;
      }

      .activity-description {
        font-size: 0.8em;
        line-height: 1.3;
      }

      .tooltip-actions {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.02);
      }

      .action-button {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 12px;
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 4px;
        color: #93c5fd;
        font-size: 0.8em;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .action-button:hover {
        background: rgba(59, 130, 246, 0.2);
        border-color: rgba(59, 130, 246, 0.5);
        color: white;
      }

      .tooltip-arrow {
        position: absolute;
        bottom: -6px;
        width: 12px;
        height: 12px;
        background: rgba(0, 0, 0, 0.95);
        border: 1px solid rgba(59, 130, 246, 0.4);
        border-top: none;
        border-left: none;
        transform: rotate(45deg);
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      /* Scrollbar styling */
      .activity-list::-webkit-scrollbar {
        width: 4px;
      }

      .activity-list::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
      }

      .activity-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .agent-tooltip {
          max-width: 280px !important;
          font-size: 0.8em;
        }

        .tooltip-header {
          padding: 10px 12px;
        }

        .tooltip-section {
          padding: 10px 12px;
        }

        .tooltip-actions {
          padding: 10px 12px;
        }

        .action-button {
          padding: 6px 10px;
          font-size: 0.75em;
        }
      }
    `,
  ],
})
export class AgentTooltipComponent implements OnInit, OnDestroy, OnChanges {
  @Input() tooltipData: TooltipData | null = null;
  @Input() config: TooltipConfig | null = null;
  @Output() focusAgent = new EventEmitter<string>();
  @Output() startChat = new EventEmitter<string>();

  @ViewChild('tooltipElement') tooltipElement!: ElementRef<HTMLDivElement>;

  // Component state
  readonly isVisible = signal(false);
  readonly position = signal({ x: 0, y: 0 });
  readonly arrowPosition = signal(0);

  // Mock activity data (in real implementation, this would come from service)
  private readonly recentActivities = signal<ActivityItem[]>([
    {
      timestamp: new Date(Date.now() - 5000),
      type: 'tool_execution',
      description: 'Executed search query',
      status: 'success',
    },
    {
      timestamp: new Date(Date.now() - 15000),
      type: 'memory_access',
      description: 'Retrieved conversation history',
      status: 'success',
    },
    {
      timestamp: new Date(Date.now() - 30000),
      type: 'communication',
      description: 'Coordinated with specialist agent',
      status: 'success',
    },
  ]);

  constructor() {
    // Set default configuration
    if (!this.config) {
      this.config = {
        showCapabilities: true,
        showStatus: true,
        showTools: true,
        showPerformance: true,
        showRecentActivity: true,
        maxWidth: 320,
        maxHeight: 400,
        fadeInDuration: 200,
        fadeOutDuration: 150,
        followCursor: false,
        offset: { x: 10, y: -10 },
      };
    }
  }

  ngOnInit(): void {
    this.updateTooltipState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tooltipData']) {
      this.updateTooltipState();
    }
  }

  ngOnDestroy(): void {
    // Component cleanup handled by parent
    this.isVisible.set(false);
  }

  /**
   * Get CSS class for agent type
   */
  getAgentTypeClass(): string {
    if (!this.tooltipData) return '';
    return this.tooltipData.agent.type.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Get CSS class for agent status
   */
  getStatusClass(): string {
    if (!this.tooltipData) return '';
    return this.tooltipData.agent.status.toLowerCase();
  }

  /**
   * Get human-readable status text
   */
  getStatusText(): string {
    if (!this.tooltipData) return '';
    return this.tooltipData.agent.status.replace(/_/g, ' ').toUpperCase();
  }

  /**
   * Check if agent has capabilities to display
   */
  hasCapabilities(): boolean {
    return (this.tooltipData?.agent.capabilities?.length ?? 0) > 0;
  }

  /**
   * Check if agent has active tools
   */
  hasActiveTools(): boolean {
    return (this.tooltipData?.agent.currentTools?.length ?? 0) > 0;
  }

  /**
   * Check if agent has performance data
   */
  hasPerformanceData(): boolean {
    return (
      this.tooltipData?.agent.lastResponse !== undefined ||
      this.tooltipData?.agent.memoryUsage !== undefined
    );
  }

  /**
   * Check if agent has recent activity
   */
  hasRecentActivity(): boolean {
    return this.recentActivities().length > 0;
  }

  /**
   * Get CSS class for tool status
   */
  getToolStatusClass(status: string): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Get CSS class for activity status
   */
  getActivityStatusClass(status: string): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Get formatted response time
   */
  getResponseTime(): number {
    if (!this.tooltipData?.agent.lastResponse) return 0;
    return Math.round(this.tooltipData.agent.lastResponse.responseTime || 0);
  }

  /**
   * Get formatted memory usage
   */
  getMemoryUsage(): string {
    if (!this.tooltipData?.agent.memoryUsage) return 'N/A';
    const usage = this.tooltipData.agent.memoryUsage;
    return `${usage.current}${usage.unit}`;
  }

  /**
   * Get formatted uptime
   */
  getUptime(): string {
    if (!this.tooltipData?.agent.connectedAt) return 'N/A';
    const uptime =
      Date.now() - new Date(this.tooltipData.agent.connectedAt).getTime();
    const minutes = Math.floor(uptime / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Get recent activities
   */
  getRecentActivities(): ActivityItem[] {
    return this.recentActivities().slice(0, 3); // Show last 3 activities
  }

  /**
   * Format activity timestamp
   */
  formatActivityTime(timestamp: Date): string {
    const now = Date.now();
    const diff = now - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ago`;
    }
    return `${seconds}s ago`;
  }

  /**
   * Handle focus agent action
   */
  onFocusAgent(): void {
    if (this.tooltipData) {
      this.focusAgent.emit(this.tooltipData.agentId);
    }
  }

  /**
   * Handle start chat action
   */
  onStartChat(): void {
    if (this.tooltipData) {
      this.startChat.emit(this.tooltipData.agentId);
    }
  }

  /**
   * Update tooltip visibility and position
   */
  private updateTooltipState(): void {
    if (this.tooltipData?.visible) {
      this.isVisible.set(true);
      this.updatePosition();
    } else {
      this.isVisible.set(false);
    }
  }

  /**
   * Update tooltip position based on screen coordinates
   */
  private updatePosition(): void {
    if (!this.tooltipData || !this.config) return;

    const baseX = this.tooltipData.screenPosition.x + this.config.offset.x;
    const baseY = this.tooltipData.screenPosition.y + this.config.offset.y;

    // Ensure tooltip stays within viewport
    const tooltipWidth = this.config.maxWidth;
    const tooltipHeight = this.config.maxHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = baseX;
    let y = baseY;

    // Adjust horizontal position if tooltip would go off-screen
    if (x + tooltipWidth > viewportWidth) {
      x =
        this.tooltipData.screenPosition.x - tooltipWidth - this.config.offset.x;
    }

    // Adjust vertical position if tooltip would go off-screen
    if (y + tooltipHeight > viewportHeight) {
      y =
        this.tooltipData.screenPosition.y -
        tooltipHeight -
        this.config.offset.y;
    }

    // Ensure minimum margins
    x = Math.max(10, Math.min(x, viewportWidth - tooltipWidth - 10));
    y = Math.max(10, Math.min(y, viewportHeight - tooltipHeight - 10));

    this.position.set({ x, y });

    // Calculate arrow position relative to tooltip
    const arrowX = Math.max(
      10,
      Math.min(this.tooltipData.screenPosition.x - x, tooltipWidth - 20)
    );
    this.arrowPosition.set(arrowX);
  }
}
