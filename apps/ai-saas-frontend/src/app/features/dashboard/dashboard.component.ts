import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HealthService } from '../../shared/services/health.service';
import { Observable } from 'rxjs';

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  description: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">
      <div class="dashboard-header">
        <h1>AI SaaS Starter Dashboard</h1>
        <p>Manage your documents, knowledge graphs, and AI workflows</p>
      </div>

      <div class="services-status">
        <h2>System Overview</h2>
        <div class="status-grid">
          <div class="status-card" *ngFor="let service of services">
            <div class="status-header">
              <div class="status-icon">{{ service.icon }}</div>
              <div class="status-info">
                <h3>{{ service.name }}</h3>
                <span class="status-indicator" [class]="service.status"></span>
                <span class="status-text">{{
                  service.status | titlecase
                }}</span>
              </div>
            </div>
            <p class="status-description">{{ service.description }}</p>
            <a [routerLink]="service.route" class="btn btn-outline">
              Manage {{ service.name }}
            </a>
          </div>
        </div>
      </div>

      <div class="quick-actions">
        <h2>Quick Actions</h2>
        <div class="actions-grid">
          <div class="action-card">
            <h3>📄 Upload Document</h3>
            <p>Add documents to your vector database for semantic search</p>
            <a routerLink="/documents/upload" class="btn btn-primary"
              >Upload Now</a
            >
          </div>

          <div class="action-card">
            <h3>🔗 Create Graph Node</h3>
            <p>Build relationships in your knowledge graph</p>
            <a routerLink="/graph/nodes/create" class="btn btn-primary"
              >Create Node</a
            >
          </div>

          <div class="action-card">
            <h3>⚡ Run Workflow</h3>
            <p>Execute AI-powered document processing workflows</p>
            <a routerLink="/workflows/execute" class="btn btn-primary"
              >Run Workflow</a
            >
          </div>
        </div>
      </div>

      <div class="recent-activity" *ngIf="healthData$ | async as health">
        <h2>System Health</h2>
        <div class="health-summary">
          <div class="health-item">
            <span
              class="status-indicator"
              [class]="health.services?.chromadb?.status || 'unknown'"
            ></span>
            <span
              >ChromaDB:
              {{ health.services?.chromadb?.status || 'Unknown' }}</span
            >
          </div>
          <div class="health-item">
            <span
              class="status-indicator"
              [class]="health.services?.neo4j?.status || 'unknown'"
            ></span>
            <span
              >Neo4j: {{ health.services?.neo4j?.status || 'Unknown' }}</span
            >
          </div>
          <div class="health-item">
            <span
              class="status-indicator"
              [class]="health.services?.redis?.status || 'unknown'"
            ></span>
            <span
              >Redis: {{ health.services?.redis?.status || 'Unknown' }}</span
            >
          </div>
          <div class="health-item">
            <span
              class="status-indicator"
              [class]="health.status || 'unknown'"
            ></span>
            <span>Overall: {{ health.status || 'Unknown' }}</span>
          </div>
        </div>
        <a routerLink="/health" class="btn btn-outline">View Detailed Health</a>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard {
        max-width: 1200px;
        margin: 0 auto;
      }

      .dashboard-header {
        text-align: center;
        margin-bottom: 3rem;
      }

      .dashboard-header h1 {
        font-size: 2.5rem;
        color: #1f2937;
        margin-bottom: 0.5rem;
      }

      .dashboard-header p {
        font-size: 1.1rem;
        color: #6b7280;
      }

      .services-status,
      .quick-actions,
      .recent-activity {
        margin-bottom: 3rem;
      }

      .services-status h2,
      .quick-actions h2,
      .recent-activity h2 {
        font-size: 1.5rem;
        margin-bottom: 1.5rem;
        color: #1f2937;
      }

      .status-grid,
      .actions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
      }

      .status-card,
      .action-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
      }

      .status-header {
        display: flex;
        align-items: center;
        margin-bottom: 1rem;
      }

      .status-icon {
        font-size: 2rem;
        margin-right: 1rem;
      }

      .status-info h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.25rem;
        color: #1f2937;
      }

      .status-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
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

      .status-text {
        font-weight: 500;
        font-size: 0.9rem;
      }

      .status-description {
        color: #6b7280;
        margin-bottom: 1rem;
        line-height: 1.5;
      }

      .action-card h3 {
        font-size: 1.25rem;
        margin-bottom: 0.5rem;
        color: #1f2937;
      }

      .action-card p {
        color: #6b7280;
        margin-bottom: 1rem;
        line-height: 1.5;
      }

      .health-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .health-item {
        display: flex;
        align-items: center;
        padding: 0.75rem;
        background: white;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  healthData$!: Observable<any>;

  services: ServiceStatus[] = [
    {
      name: 'Document Storage',
      status: 'healthy',
      description:
        'ChromaDB vector database for semantic document search and similarity matching',
      icon: '📄',
      route: '/documents',
    },
    {
      name: 'Knowledge Graph',
      status: 'healthy',
      description:
        'Neo4j graph database for complex relationship modeling and traversal',
      icon: '🔗',
      route: '/graph',
    },
    {
      name: 'AI Workflows',
      status: 'healthy',
      description:
        'LangGraph orchestration for intelligent document processing pipelines',
      icon: '⚡',
      route: '/workflows',
    },
  ];

  constructor(private readonly healthService: HealthService) {}

  ngOnInit() {
    this.healthData$ = this.healthService.getHealthStatus();
  }
}
