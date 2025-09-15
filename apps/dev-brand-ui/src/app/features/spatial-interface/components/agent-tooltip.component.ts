import {
  Component,
  signal,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  input,
  output,
} from '@angular/core';

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
  imports: [],
  template: `
    @if (tooltipData()) {
    <div
      #tooltipElement
      class="agent-tooltip"
      [class.visible]="isVisible()"
      [class.following]="config()?.followCursor"
      [style.left.px]="position().x"
      [style.top.px]="position().y"
      [style.max-width.px]="config()?.maxWidth || 320"
      [style.max-height.px]="config()?.maxHeight || 400"
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
            <h4 class="agent-name">{{ tooltipData()?.agent?.name }}</h4>
            <div class="agent-type">{{ tooltipData()?.agent?.type }}</div>
          </div>
        </div>
        <div class="agent-status" [class]="getStatusClass()">
          <div class="status-indicator"></div>
          <span class="status-text">{{ getStatusText() }}</span>
        </div>
      </div>
      <!-- Agent Capabilities -->
      @if (config()?.showCapabilities && hasCapabilities()) {
      <div class="tooltip-section capabilities-section">
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
          @for (capability of tooltipData()?.agent?.capabilities; track
          capability) {
          <div class="capability-item" [title]="capability">
            {{ capability }}
          </div>
          }
        </div>
      </div>
      }
      <!-- Current Tools -->
      @if (config()?.showTools && hasActiveTools()) {
      <div class="tooltip-section tools-section">
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
          @for (tool of tooltipData()?.agent?.currentTools; track tool) {
          <div class="tool-item" [class]="getToolStatusClass(tool.status)">
            <div class="tool-name">{{ tool.toolName }}</div>
            <div class="tool-status">{{ tool.status }}</div>
            @if (tool.progress !== undefined) {
            <div class="tool-progress">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  [style.width.%]="tool.progress"
                ></div>
              </div>
              <span class="progress-text">{{ tool.progress }}%</span>
            </div>
            }
          </div>
          }
        </div>
      </div>
      }
      <!-- Performance Metrics -->
      @if (config()?.showPerformance && hasPerformanceData()) {
      <div class="tooltip-section performance-section">
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
          @if (tooltipData()?.agent?.lastResponse) {
          <div class="metric-item">
            <span class="metric-label">Response Time:</span>
            <span class="metric-value">{{ getResponseTime() }}ms</span>
          </div>
          } @if (tooltipData()?.agent?.memoryUsage) {
          <div class="metric-item">
            <span class="metric-label">Memory:</span>
            <span class="metric-value">{{ getMemoryUsage() }}</span>
          </div>
          }
          <div class="metric-item">
            <span class="metric-label">Uptime:</span>
            <span class="metric-value">{{ getUptime() }}</span>
          </div>
        </div>
      </div>
      }
      <!-- Recent Activity -->
      @if (config()?.showRecentActivity && hasRecentActivity()) {
      <div class="tooltip-section activity-section">
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
          @for (activity of getRecentActivities(); track activity) {
          <div
            class="activity-item"
            [class]="getActivityStatusClass(activity.status)"
          >
            <div class="activity-time">
              {{ formatActivityTime(activity.timestamp) }}
            </div>
            <div class="activity-description">{{ activity.description }}</div>
          </div>
          }
        </div>
      </div>
      }
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
    }
  `,
  styleUrls: ['./agent-tooltip.component.css'],
})
export class AgentTooltipComponent implements OnInit, OnDestroy, OnChanges {
  readonly tooltipData = input<TooltipData | null>(null);
  readonly config = input<TooltipConfig | null>({
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
  });
  readonly focusAgent = output<string>();
  readonly startChat = output<string>();

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
    const tooltipData = this.tooltipData();
    if (!tooltipData) return '';
    return tooltipData.agent.type.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Get CSS class for agent status
   */
  getStatusClass(): string {
    const tooltipData = this.tooltipData();
    if (!tooltipData) return '';
    return tooltipData.agent.status.toLowerCase();
  }

  /**
   * Get human-readable status text
   */
  getStatusText(): string {
    const tooltipData = this.tooltipData();
    if (!tooltipData) return '';
    return tooltipData.agent.status.replace(/_/g, ' ').toUpperCase();
  }

  /**
   * Check if agent has capabilities to display
   */
  hasCapabilities(): boolean {
    return (this.tooltipData()?.agent.capabilities?.length ?? 0) > 0;
  }

  /**
   * Check if agent has active tools
   */
  hasActiveTools(): boolean {
    return (this.tooltipData()?.agent.currentTools?.length ?? 0) > 0;
  }

  /**
   * Check if agent has performance data
   */
  hasPerformanceData(): boolean {
    const tooltipData = this.tooltipData();
    return (
      tooltipData?.agent.lastResponse !== undefined ||
      tooltipData?.agent.memoryUsage !== undefined
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
    const tooltipData = this.tooltipData();
    if (!tooltipData?.agent.lastResponse) return 0;
    return Math.round(tooltipData.agent.lastResponse.responseTime || 0);
  }

  /**
   * Get formatted memory usage
   */
  getMemoryUsage(): string {
    const tooltipData = this.tooltipData();
    if (!tooltipData?.agent.memoryUsage) return 'N/A';
    const usage = tooltipData.agent.memoryUsage;
    return `${usage.current}${usage.unit}`;
  }

  /**
   * Get formatted uptime
   */
  getUptime(): string {
    const tooltipData = this.tooltipData();
    if (!tooltipData?.agent.connectedAt) return 'N/A';
    const uptime =
      Date.now() - new Date(tooltipData.agent.connectedAt).getTime();
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
    const tooltipData = this.tooltipData();
    if (tooltipData) {
      this.focusAgent.emit(tooltipData.agentId);
    }
  }

  /**
   * Handle start chat action
   */
  onStartChat(): void {
    const tooltipData = this.tooltipData();
    if (tooltipData) {
      this.startChat.emit(tooltipData.agentId);
    }
  }

  /**
   * Update tooltip visibility and position
   */
  private updateTooltipState(): void {
    if (this.tooltipData()?.visible) {
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
    const config = this.config();
    const tooltipData = this.tooltipData();
    if (!tooltipData || !config) return;

    const baseX = tooltipData.screenPosition.x + config.offset.x;
    const baseY = tooltipData.screenPosition.y + config.offset.y;

    // Ensure tooltip stays within viewport
    const tooltipWidth = config.maxWidth;
    const tooltipHeight = config.maxHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = baseX;
    let y = baseY;

    // Adjust horizontal position if tooltip would go off-screen
    if (x + tooltipWidth > viewportWidth) {
      x = tooltipData.screenPosition.x - tooltipWidth - config.offset.x;
    }

    // Adjust vertical position if tooltip would go off-screen
    if (y + tooltipHeight > viewportHeight) {
      y = tooltipData.screenPosition.y - tooltipHeight - config.offset.y;
    }

    // Ensure minimum margins
    x = Math.max(10, Math.min(x, viewportWidth - tooltipWidth - 10));
    y = Math.max(10, Math.min(y, viewportHeight - tooltipHeight - 10));

    this.position.set({ x, y });

    // Calculate arrow position relative to tooltip
    const arrowX = Math.max(
      10,
      Math.min(tooltipData.screenPosition.x - x, tooltipWidth - 20)
    );
    this.arrowPosition.set(arrowX);
  }
}
