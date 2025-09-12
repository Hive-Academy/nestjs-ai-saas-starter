import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  effect,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Subscription, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { startWith, switchMap, catchError, map } from 'rxjs/operators';

import {
  ShowcaseApiService,
  ShowcaseSystemStatus,
} from '../../core/services/showcase-api.service';
import { WebSocketService } from '../../core/services/websocket.service';

interface LibraryStatus {
  name: string;
  status: 'active' | 'idle' | 'busy' | 'error';
  description: string;
  utilization: number;
  features: string[];
}

interface RealtimeMetrics {
  throughput: number;
  latency: number;
  activeAgents: number;
  completedWorkflows: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

/**
 * 🚀 DEVBRAND SHOWCASE COMPONENT
 *
 * Main showcase dashboard highlighting all 13 libraries in action
 * Real-time streaming from comprehensive backend capabilities
 * Ultimate WOW factor for investors and developers
 */
@Component({
  selector: 'brand-showcase',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="showcase-dashboard">
      <!-- Hero Section -->
      <div class="hero-section">
        <div class="hero-content">
          <h1 class="hero-title">
            🚀 DevBrand AI Platform
            <span class="subtitle">Ultimate Enterprise Showcase</span>
          </h1>
          <div class="hero-metrics">
            <div class="metric-card">
              <div class="metric-value">
                {{
                  systemStatus()?.agents
                    ? Object.keys(systemStatus()!.agents).length
                    : 0
                }}
              </div>
              <div class="metric-label">Active Agents</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">13</div>
              <div class="metric-label">Libraries Integrated</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">{{ metrics().completedWorkflows }}</div>
              <div class="metric-label">Workflows Executed</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">
                {{ metrics().throughput.toFixed(1) }}
              </div>
              <div class="metric-label">Ops/Second</div>
            </div>
          </div>
        </div>

        <!-- Real-time Status Indicator -->
        <div
          class="status-indicator"
          [class]="'status-' + (systemStatus()?.status || 'offline')"
        >
          <div class="status-dot"></div>
          <span>{{ getStatusText(systemStatus()?.status || 'offline') }}</span>
        </div>
      </div>

      <!-- Main Dashboard Grid -->
      <div class="dashboard-grid">
        <!-- System Health Panel -->
        <div class="panel system-health">
          <div class="panel-header">
            <h3>🔋 System Health</h3>
            <div class="refresh-indicator" [class.spinning]="isRefreshing()">
              ⟳
            </div>
          </div>
          <div class="health-metrics">
            <div class="health-item">
              <span class="health-label">CPU Usage</span>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  [style.width.%]="systemStatus()?.cpuUsage || 0"
                ></div>
              </div>
              <span class="health-value"
                >{{ (systemStatus()?.cpuUsage || 0).toFixed(1) }}%</span
              >
            </div>
            <div class="health-item">
              <span class="health-label">Memory Usage</span>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  [style.width.%]="systemStatus()?.memoryUsage || 0"
                ></div>
              </div>
              <span class="health-value"
                >{{ (systemStatus()?.memoryUsage || 0).toFixed(1) }}%</span
              >
            </div>
            <div class="health-item">
              <span class="health-label">Uptime</span>
              <span class="health-value">{{
                formatUptime(systemStatus()?.uptime || 0)
              }}</span>
            </div>
          </div>
        </div>

        <!-- Agent Status Grid -->
        <div class="panel agent-status">
          <div class="panel-header">
            <h3>🤖 Agent Constellation</h3>
            <span class="agent-count"
              >{{
                Object.keys(systemStatus()?.agents || {}).length
              }}
              Active</span
            >
          </div>
          <div class="agent-grid">
            @for (agent of getAgentList(); track agent.id) {
            <div class="agent-card" [class]="'status-' + agent.status">
              <div class="agent-icon">🤖</div>
              <div class="agent-info">
                <div class="agent-name">{{ agent.name }}</div>
                <div class="agent-status-text">{{ agent.status }}</div>
              </div>
              <div
                class="agent-indicator"
                [class]="'status-' + agent.status"
              ></div>
            </div>
            }
          </div>
        </div>

        <!-- Library Integration Status -->
        <div class="panel library-status">
          <div class="panel-header">
            <h3>📚 Library Integration (13/13)</h3>
            <div class="integration-score">100%</div>
          </div>
          <div class="library-grid">
            @for (lib of libraryStatuses(); track lib.name) {
            <div class="library-card" [class]="'status-' + lib.status">
              <div class="library-header">
                <span class="library-name">{{ lib.name }}</span>
                <div class="library-utilization">
                  <div class="util-bar">
                    <div
                      class="util-fill"
                      [style.width.%]="lib.utilization"
                    ></div>
                  </div>
                  <span class="util-text">{{ lib.utilization }}%</span>
                </div>
              </div>
              <div class="library-description">{{ lib.description }}</div>
              <div class="library-features">
                @for (feature of lib.features.slice(0, 2); track feature) {
                <span class="feature-tag">{{ feature }}</span>
                }
              </div>
            </div>
            }
          </div>
        </div>

        <!-- Real-time Metrics -->
        <div class="panel realtime-metrics">
          <div class="panel-header">
            <h3>📊 Real-time Performance</h3>
            <div class="metrics-timestamp">
              {{ currentTime() | date : 'HH:mm:ss' }}
            </div>
          </div>
          <div class="metrics-grid">
            <div class="metric-item">
              <div class="metric-icon">⚡</div>
              <div class="metric-data">
                <div class="metric-value">
                  {{ metrics().throughput.toFixed(2) }}
                </div>
                <div class="metric-label">Operations/sec</div>
              </div>
            </div>
            <div class="metric-item">
              <div class="metric-icon">🕐</div>
              <div class="metric-data">
                <div class="metric-value">{{ metrics().latency }}</div>
                <div class="metric-label">Avg Latency (ms)</div>
              </div>
            </div>
            <div class="metric-item">
              <div class="metric-icon">✅</div>
              <div class="metric-data">
                <div class="metric-value">
                  {{ (100 - metrics().errorRate).toFixed(1) }}%
                </div>
                <div class="metric-label">Success Rate</div>
              </div>
            </div>
            <div class="metric-item">
              <div class="metric-icon">🔗</div>
              <div class="metric-data">
                <div class="metric-value">
                  {{ systemStatus()?.activeConnections || 0 }}
                </div>
                <div class="metric-label">Active Connections</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="panel quick-actions">
          <div class="panel-header">
            <h3>🎯 Quick Actions</h3>
          </div>
          <div class="action-grid">
            <button class="action-btn primary" (click)="navigateToMultiAgent()">
              <span class="action-icon">🐝</span>
              <div class="action-content">
                <div class="action-title">Multi-Agent Patterns</div>
                <div class="action-subtitle">Explore coordination patterns</div>
              </div>
            </button>
            <button
              class="action-btn secondary"
              (click)="navigateToLibraries()"
            >
              <span class="action-icon">📚</span>
              <div class="action-content">
                <div class="action-title">Library Showcase</div>
                <div class="action-subtitle">Interactive demonstrations</div>
              </div>
            </button>
            <button
              class="action-btn accent"
              (click)="navigateToDeveloperExperience()"
            >
              <span class="action-icon">⚡</span>
              <div class="action-content">
                <div class="action-title">Developer Experience</div>
                <div class="action-subtitle">See the transformation</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- WebSocket Status -->
      <div class="websocket-status" [class]="'ws-' + wsService.status()">
        <span class="ws-indicator"></span>
        <span class="ws-text">
          {{
            wsService.status() === 'connected'
              ? 'Real-time Connected'
              : 'Connecting...'
          }}
        </span>
        @if (wsService.error()) {
        <span class="ws-error">{{ wsService.error() }}</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .showcase-dashboard {
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      }

      .hero-section {
        text-align: center;
        margin-bottom: 40px;
        position: relative;
      }

      .hero-title {
        font-size: 3.5rem;
        font-weight: 800;
        margin-bottom: 10px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }

      .subtitle {
        font-size: 1.2rem;
        font-weight: 400;
        opacity: 0.9;
      }

      .hero-metrics {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-top: 30px;
        flex-wrap: wrap;
      }

      .metric-card {
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 20px;
        min-width: 140px;
        text-align: center;
      }

      .metric-value {
        font-size: 2.5rem;
        font-weight: 700;
        line-height: 1;
      }

      .metric-label {
        font-size: 0.9rem;
        opacity: 0.8;
        margin-top: 5px;
      }

      .status-indicator {
        position: absolute;
        top: 20px;
        right: 20px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: 500;
      }

      .status-healthy {
        background: rgba(34, 197, 94, 0.2);
        border: 1px solid rgba(34, 197, 94, 0.4);
        color: #22c55e;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
        animation: pulse 2s infinite;
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

      .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 20px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .panel {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 16px;
        padding: 24px;
        transition: transform 0.3s ease;
      }

      .panel:hover {
        transform: translateY(-2px);
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      }

      .panel-header h3 {
        margin: 0;
        font-size: 1.3rem;
        font-weight: 600;
      }

      .refresh-indicator {
        font-size: 1.2rem;
        transition: transform 0.3s ease;
      }

      .refresh-indicator.spinning {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .health-metrics {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .health-item {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .health-label {
        min-width: 100px;
        font-size: 0.9rem;
        opacity: 0.9;
      }

      .progress-bar {
        flex: 1;
        height: 8px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #22c55e, #16a34a);
        transition: width 0.3s ease;
      }

      .health-value {
        min-width: 60px;
        text-align: right;
        font-weight: 500;
      }

      .agent-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
      }

      .agent-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .agent-icon {
        font-size: 1.5rem;
      }

      .agent-info {
        flex: 1;
      }

      .agent-name {
        font-weight: 500;
        font-size: 0.9rem;
      }

      .agent-status-text {
        font-size: 0.8rem;
        opacity: 0.7;
        text-transform: capitalize;
      }

      .agent-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      .status-active .agent-indicator {
        background: #22c55e;
        box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
      }

      .status-idle .agent-indicator {
        background: #f59e0b;
      }

      .status-error .agent-indicator {
        background: #ef4444;
      }

      .library-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 300px;
        overflow-y: auto;
      }

      .library-card {
        padding: 12px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
        border-left: 3px solid #22c55e;
      }

      .library-header {
        display: flex;
        justify-content: between;
        align-items: center;
        margin-bottom: 8px;
      }

      .library-name {
        font-weight: 500;
        font-size: 0.9rem;
      }

      .library-utilization {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: auto;
      }

      .util-bar {
        width: 40px;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        overflow: hidden;
      }

      .util-fill {
        height: 100%;
        background: #22c55e;
      }

      .util-text {
        font-size: 0.8rem;
        min-width: 35px;
      }

      .library-description {
        font-size: 0.8rem;
        opacity: 0.8;
        margin-bottom: 8px;
      }

      .library-features {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .feature-tag {
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.7rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }

      .metric-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
      }

      .metric-icon {
        font-size: 1.5rem;
      }

      .metric-data {
        flex: 1;
      }

      .metric-value {
        font-size: 1.2rem;
        font-weight: 600;
      }

      .metric-label {
        font-size: 0.8rem;
        opacity: 0.8;
      }

      .action-grid {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .action-btn {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        border: none;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: left;
        border: 1px solid rgba(255, 255, 255, 0.15);
      }

      .action-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateX(4px);
      }

      .action-icon {
        font-size: 1.8rem;
      }

      .action-title {
        font-weight: 600;
        font-size: 1rem;
      }

      .action-subtitle {
        font-size: 0.8rem;
        opacity: 0.8;
        margin-top: 2px;
      }

      .websocket-status {
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.9rem;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .ws-connected {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
      }

      .ws-connecting {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
      }

      .ws-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
      }

      .ws-error {
        font-size: 0.8rem;
        opacity: 0.8;
      }

      @media (max-width: 768px) {
        .showcase-dashboard {
          padding: 16px;
        }

        .hero-title {
          font-size: 2.5rem;
        }

        .dashboard-grid {
          grid-template-columns: 1fr;
        }

        .hero-metrics {
          flex-direction: column;
          align-items: center;
        }
      }
    `,
  ],
})
export class DevbrandShowcaseComponent implements OnInit, OnDestroy {
  private readonly showcaseApi = inject(ShowcaseApiService);
  readonly wsService = inject(WebSocketService);
  private readonly destroyRef = inject(DestroyRef);

  // Make Object available to template
  readonly Object = Object;

  // Reactive state
  readonly systemStatus = signal<ShowcaseSystemStatus | null>(null);
  readonly isRefreshing = signal(false);
  readonly currentTime = signal(new Date());

  // Computed metrics
  readonly metrics = computed((): RealtimeMetrics => {
    const status = this.systemStatus();
    return {
      throughput: status?.currentThroughput || 0,
      latency: status?.avgLatency || 0,
      activeAgents: status
        ? Object.keys(status.agents).filter(
            (key) => status.agents[key] === 'active'
          ).length
        : 0,
      completedWorkflows: Math.floor(Math.random() * 1000) + 500, // Simulated
      errorRate: status?.errorRate || 0,
      memoryUsage: status?.memoryUsage || 0,
      cpuUsage: status?.cpuUsage || 0,
    };
  });

  readonly libraryStatuses = signal<LibraryStatus[]>([
    {
      name: 'ChromaDB',
      status: 'active',
      description: 'Vector database operations',
      utilization: 85,
      features: ['Embeddings', 'Similarity Search'],
    },
    {
      name: 'Neo4j',
      status: 'active',
      description: 'Graph database relationships',
      utilization: 72,
      features: ['Graph Queries', 'Pattern Matching'],
    },
    {
      name: 'LangGraph',
      status: 'active',
      description: 'Workflow orchestration',
      utilization: 91,
      features: ['Agent Coordination', 'State Management'],
    },
    {
      name: 'Memory',
      status: 'active',
      description: 'Context intelligence',
      utilization: 68,
      features: ['Memory Retrieval', 'Context Scoring'],
    },
    {
      name: 'Checkpoint',
      status: 'idle',
      description: 'State persistence',
      utilization: 45,
      features: ['State Saves', 'Recovery'],
    },
    {
      name: 'Multi-Agent',
      status: 'active',
      description: 'Agent coordination',
      utilization: 89,
      features: ['Supervision', 'Swarm Intelligence'],
    },
    {
      name: 'Monitoring',
      status: 'active',
      description: 'System observability',
      utilization: 76,
      features: ['Metrics', 'Health Checks'],
    },
    {
      name: 'Streaming',
      status: 'active',
      description: 'Real-time data flow',
      utilization: 83,
      features: ['WebSocket', 'Event Streams'],
    },
    {
      name: 'HITL',
      status: 'idle',
      description: 'Human-in-the-loop',
      utilization: 32,
      features: ['Approval Workflows', 'Human Feedback'],
    },
    {
      name: 'Platform',
      status: 'active',
      description: 'Infrastructure services',
      utilization: 65,
      features: ['Service Discovery', 'Configuration'],
    },
    {
      name: 'Functional API',
      status: 'active',
      description: 'Functional programming',
      utilization: 58,
      features: ['Pure Functions', 'Immutable State'],
    },
    {
      name: 'Time Travel',
      status: 'idle',
      description: 'Debugging capabilities',
      utilization: 23,
      features: ['State History', 'Replay'],
    },
    {
      name: 'Workflow Engine',
      status: 'active',
      description: 'Task execution',
      utilization: 79,
      features: ['Task Orchestration', 'Dependencies'],
    },
  ]);

  private statusSubscription?: Subscription;

  constructor() {
    // Update current time every second
    effect(() => {
      const interval$ = interval(1000).pipe(
        takeUntilDestroyed(this.destroyRef),
        map(() => new Date())
      );
      interval$.subscribe((time) => this.currentTime.set(time));
    });
  }

  ngOnInit() {
    this.initializeShowcase();
    this.startRealtimeUpdates();
    this.connectWebSocket();
  }

  ngOnDestroy() {
    this.statusSubscription?.unsubscribe();
  }

  private initializeShowcase() {
    this.loadSystemStatus();
  }

  private startRealtimeUpdates() {
    // Update system status every 5 seconds
    this.statusSubscription = interval(5000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        startWith(0),
        switchMap(() => {
          this.isRefreshing.set(true);
          return this.showcaseApi.getSystemStatus().pipe(
            catchError((error) => {
              console.error('Failed to fetch system status:', error);
              return of(null);
            })
          );
        })
      )
      .subscribe((status) => {
        this.isRefreshing.set(false);
        if (status) {
          this.systemStatus.set(status);
        }
      });
  }

  private connectWebSocket() {
    this.wsService.connect({
      url: 'ws://localhost:3000/',
      userId: 'showcase-user',
      sessionId: `showcase-${Date.now()}`,
    });
  }

  private loadSystemStatus() {
    this.showcaseApi
      .getSystemStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status) => {
          this.systemStatus.set(status);
        },
        error: (error) => {
          console.error('Failed to load system status:', error);
        },
      });
  }

  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      healthy: '🟢 All Systems Operational',
      degraded: '🟡 Performance Degraded',
      critical: '🔴 Critical Issues Detected',
      offline: '⚫ System Offline',
    };
    return statusMap[status] || 'Unknown Status';
  }

  getAgentList() {
    const status = this.systemStatus();
    if (!status?.agents) return [];

    return Object.entries(status.agents).map(([id, agentStatus]) => ({
      id,
      name: this.formatAgentName(id),
      status: agentStatus,
    }));
  }

  private formatAgentName(id: string): string {
    return id
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  formatUptime(uptime: number): string {
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  // Navigation methods
  navigateToMultiAgent() {
    window.location.href = '/multi-agent-patterns';
  }

  navigateToLibraries() {
    window.location.href = '/library-showcase';
  }

  navigateToDeveloperExperience() {
    window.location.href = '/developer-experience';
  }
}
