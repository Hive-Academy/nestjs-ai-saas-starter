import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  HealthService,
  HealthStatus,
} from '../../shared/services/health.service';
import { Observable, interval, startWith, switchMap } from 'rxjs';

@Component({
  selector: 'app-health',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="health-page">
      <div class="page-header">
        <h1>System Health Monitor</h1>
        <p>Real-time monitoring of all system components and services</p>
      </div>

      <div class="health-overview" *ngIf="healthData$ | async as health">
        <div class="status-card" [class]="health.status">
          <div class="status-header">
            <span class="status-indicator" [class]="health.status"></span>
            <h2>Overall Status</h2>
          </div>
          <p class="status-text">{{ health.status | titlecase }}</p>
          <small>Last updated: {{ health.timestamp | date : 'medium' }}</small>
        </div>

        <div class="system-info">
          <div class="info-item">
            <label>Uptime</label>
            <span>{{ formatUptime(health.uptime) }}</span>
          </div>
          <div class="info-item">
            <label>Version</label>
            <span>{{ health.version }}</span>
          </div>
          <div class="info-item">
            <label>Environment</label>
            <span>Development</span>
          </div>
        </div>
      </div>

      <div class="services-grid" *ngIf="healthData$ | async as health">
        <h2>Service Status</h2>

        <div class="service-card">
          <div class="service-header">
            <div class="service-icon">🗂️</div>
            <div class="service-info">
              <h3>ChromaDB</h3>
              <span
                class="status-indicator"
                [class]="health.services?.chromadb?.status"
              ></span>
              <span class="status-text">{{
                health.services?.chromadb?.status | titlecase
              }}</span>
            </div>
          </div>
          <div class="service-details">
            <div
              class="detail-item"
              *ngIf="health.services?.chromadb?.responseTime"
            >
              <label>Response Time</label>
              <span>{{ health.services.chromadb.responseTime }}ms</span>
            </div>
            <div class="detail-item">
              <label>Purpose</label>
              <span>Vector database for semantic search</span>
            </div>
            <div class="service-error" *ngIf="health.services?.chromadb?.error">
              <strong>Error:</strong> {{ health.services.chromadb.error }}
            </div>
          </div>
        </div>

        <div class="service-card">
          <div class="service-header">
            <div class="service-icon">🕸️</div>
            <div class="service-info">
              <h3>Neo4j</h3>
              <span
                class="status-indicator"
                [class]="health.services?.neo4j?.status"
              ></span>
              <span class="status-text">{{
                health.services?.neo4j?.status | titlecase
              }}</span>
            </div>
          </div>
          <div class="service-details">
            <div
              class="detail-item"
              *ngIf="health.services?.neo4j?.responseTime"
            >
              <label>Response Time</label>
              <span>{{ health.services.neo4j.responseTime }}ms</span>
            </div>
            <div class="detail-item">
              <label>Purpose</label>
              <span>Graph database for relationships</span>
            </div>
            <div class="service-error" *ngIf="health.services?.neo4j?.error">
              <strong>Error:</strong> {{ health.services.neo4j.error }}
            </div>
          </div>
        </div>

        <div class="service-card">
          <div class="service-header">
            <div class="service-icon">⚡</div>
            <div class="service-info">
              <h3>Redis</h3>
              <span
                class="status-indicator"
                [class]="health.services?.redis?.status"
              ></span>
              <span class="status-text">{{
                health.services?.redis?.status | titlecase
              }}</span>
            </div>
          </div>
          <div class="service-details">
            <div
              class="detail-item"
              *ngIf="health.services?.redis?.responseTime"
            >
              <label>Response Time</label>
              <span>{{ health.services.redis.responseTime }}ms</span>
            </div>
            <div class="detail-item">
              <label>Purpose</label>
              <span>Cache and session management</span>
            </div>
            <div class="service-error" *ngIf="health.services?.redis?.error">
              <strong>Error:</strong> {{ health.services.redis.error }}
            </div>
          </div>
        </div>
      </div>

      <div class="monitoring-actions">
        <h2>Health Actions</h2>
        <div class="actions-grid">
          <button class="btn btn-primary" (click)="refreshHealth()">
            🔄 Refresh Status
          </button>
          <button class="btn btn-outline">📊 View Metrics</button>
          <button class="btn btn-outline">🔧 System Diagnostics</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .health-page {
        max-width: 1200px;
        margin: 0 auto;
      }

      .page-header {
        text-align: center;
        margin-bottom: 2rem;
      }

      .page-header h1 {
        font-size: 2rem;
        color: #1f2937;
        margin-bottom: 0.5rem;
      }

      .health-overview {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 2rem;
        margin-bottom: 3rem;
      }

      .status-card {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border-left: 4px solid #6b7280;

        &.healthy {
          border-left-color: #10b981;
        }
        &.degraded {
          border-left-color: #f59e0b;
        }
        &.unhealthy {
          border-left-color: #ef4444;
        }
      }

      .status-header {
        display: flex;
        align-items: center;
        margin-bottom: 1rem;
      }

      .status-header h2 {
        margin: 0 0 0 1rem;
        color: #1f2937;
      }

      .status-text {
        font-size: 1.5rem;
        font-weight: bold;
        margin-bottom: 0.5rem;

        .healthy & {
          color: #10b981;
        }
        .degraded & {
          color: #f59e0b;
        }
        .unhealthy & {
          color: #ef4444;
        }
      }

      .system-info {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .info-item {
        display: flex;
        justify-content: space-between;
        padding: 0.75rem 0;
        border-bottom: 1px solid #e5e7eb;

        &:last-child {
          border-bottom: none;
        }
      }

      .info-item label {
        font-weight: 500;
        color: #6b7280;
      }

      .info-item span {
        color: #1f2937;
        font-family: monospace;
      }

      .services-grid {
        margin-bottom: 3rem;
      }

      .services-grid h2 {
        font-size: 1.5rem;
        color: #1f2937;
        margin-bottom: 1.5rem;
      }

      .service-card {
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        margin-bottom: 1.5rem;
      }

      .service-header {
        display: flex;
        align-items: center;
        margin-bottom: 1rem;
      }

      .service-icon {
        font-size: 2rem;
        margin-right: 1rem;
      }

      .service-info h3 {
        margin: 0 0 0.5rem 0;
        color: #1f2937;
      }

      .service-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
      }

      .detail-item {
        display: flex;
        flex-direction: column;
      }

      .detail-item label {
        font-size: 0.8rem;
        color: #6b7280;
        margin-bottom: 0.25rem;
      }

      .detail-item span {
        font-weight: 500;
        color: #1f2937;
      }

      .service-error {
        grid-column: 1 / -1;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        padding: 1rem;
        color: #dc2626;
        margin-top: 1rem;
      }

      .monitoring-actions h2 {
        font-size: 1.5rem;
        color: #1f2937;
        margin-bottom: 1.5rem;
      }

      .actions-grid {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .status-indicator {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 0.5rem;

        &.healthy {
          background: #10b981;
        }
        &.unhealthy {
          background: #ef4444;
        }
        &.degraded {
          background: #f59e0b;
        }
        &.unknown {
          background: #6b7280;
        }
      }
    `,
  ],
})
export class HealthComponent implements OnInit {
  healthData$!: Observable<HealthStatus>;

  constructor(private healthService: HealthService) {}

  ngOnInit() {
    // Auto-refresh every 30 seconds
    this.healthData$ = interval(30000).pipe(
      startWith(0),
      switchMap(() => this.healthService.getHealthStatus())
    );
  }

  refreshHealth() {
    this.healthData$ = this.healthService.getHealthStatus();
  }

  formatUptime(uptimeMs: number): string {
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
