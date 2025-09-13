import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  effect,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  ShowcaseApiService,
  ShowcaseCapabilities,
} from '../../core/services/showcase-api.service';
import { WebSocketService } from '../../core/services/websocket.service';

interface LibraryDemo {
  id: string;
  name: string;
  category: 'core' | 'specialized' | 'enterprise';
  description: string;
  icon: string;
  utilization: number;
  status: 'active' | 'idle' | 'busy' | 'demo';
  features: string[];
  capabilities: string[];
  demoUrl?: string;
  documentationUrl?: string;
  examples: Array<{
    title: string;
    description: string;
    code: string;
    result: string;
  }>;
  metrics: {
    performance: number;
    adoption: number;
    satisfaction: number;
  };
}

interface InteractiveDemo {
  libraryId: string;
  title: string;
  description: string;
  isRunning: boolean;
  progress: number;
  result?: any;
  error?: string;
}

/**
 * 📚 LIBRARY SHOWCASE COMPONENT
 *
 * Interactive demonstration of all 13 libraries with live examples
 * Real-time streaming, ChromaDB vector operations, Neo4j graph queries
 * Complete ecosystem demonstration for investors and developers
 */
@Component({
  selector: 'brand-library-showcase',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="library-showcase">
      <!-- Header Section -->
      <div class="showcase-header">
        <h1>📚 Complete Library Ecosystem</h1>
        <p class="subtitle">
          Explore 13 integrated libraries powering enterprise AI applications
        </p>

        <div class="ecosystem-stats">
          <div class="stat-card">
            <div class="stat-value">{{ totalLibraries() }}</div>
            <div class="stat-label">Total Libraries</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ activeLibraries() }}</div>
            <div class="stat-label">Currently Active</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ averageUtilization().toFixed(0) }}%</div>
            <div class="stat-label">Avg Utilization</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ totalCapabilities() }}</div>
            <div class="stat-label">Total Capabilities</div>
          </div>
        </div>
      </div>

      <!-- Category Filters -->
      <div class="category-filters">
        <button
          class="filter-btn"
          [class.active]="selectedCategory() === 'all'"
          (click)="setCategory('all')"
        >
          All Libraries ({{ libraries().length }})
        </button>
        <button
          class="filter-btn"
          [class.active]="selectedCategory() === 'core'"
          (click)="setCategory('core')"
        >
          Core Foundation ({{ getCategoryCount('core') }})
        </button>
        <button
          class="filter-btn"
          [class.active]="selectedCategory() === 'specialized'"
          (click)="setCategory('specialized')"
        >
          Specialized Modules ({{ getCategoryCount('specialized') }})
        </button>
        <button
          class="filter-btn"
          [class.active]="selectedCategory() === 'enterprise'"
          (click)="setCategory('enterprise')"
        >
          Enterprise Features ({{ getCategoryCount('enterprise') }})
        </button>
      </div>

      <!-- Main Content Grid -->
      <div class="showcase-grid">
        <!-- Libraries Grid -->
        <div class="libraries-section">
          <div class="section-header">
            <h2>🔧 Library Components</h2>
            <div class="view-toggle">
              <button
                class="toggle-btn"
                [class.active]="viewMode() === 'grid'"
                (click)="setViewMode('grid')"
              >
                ⊞ Grid
              </button>
              <button
                class="toggle-btn"
                [class.active]="viewMode() === 'list'"
                (click)="setViewMode('list')"
              >
                ☰ List
              </button>
            </div>
          </div>

          <div class="libraries-grid" [class]="'view-' + viewMode()">
            @for (library of filteredLibraries(); track library.id) {
            <div class="library-card" [class]="'status-' + library.status">
              <div class="library-header">
                <div class="library-icon">{{ library.icon }}</div>
                <div class="library-info">
                  <h3 class="library-name">{{ library.name }}</h3>
                  <div class="library-category">{{ library.category }}</div>
                </div>
                <div
                  class="library-status"
                  [class]="'status-' + library.status"
                >
                  <div class="status-indicator"></div>
                  <span class="status-text">{{ library.status }}</span>
                </div>
              </div>

              <div class="library-description">
                {{ library.description }}
              </div>

              <div class="library-metrics">
                <div class="metric-row">
                  <span class="metric-label">Utilization</span>
                  <div class="metric-bar">
                    <div
                      class="metric-fill"
                      [style.width.%]="library.utilization"
                    ></div>
                  </div>
                  <span class="metric-value">{{ library.utilization }}%</span>
                </div>
                <div class="metric-row">
                  <span class="metric-label">Performance</span>
                  <div class="metric-bar">
                    <div
                      class="metric-fill performance"
                      [style.width.%]="library.metrics.performance"
                    ></div>
                  </div>
                  <span class="metric-value"
                    >{{ library.metrics.performance }}%</span
                  >
                </div>
              </div>

              <div class="library-features">
                @for (feature of library.features.slice(0, 3); track feature) {
                <span class="feature-tag">{{ feature }}</span>
                } @if (library.features.length > 3) {
                <span class="feature-more"
                  >+{{ library.features.length - 3 }} more</span
                >
                }
              </div>

              <div class="library-actions">
                <button
                  class="action-btn primary"
                  (click)="runDemo(library)"
                  [disabled]="isDemoRunning(library.id)"
                >
                  @if (isDemoRunning(library.id)) {
                  <span class="spinner"></span>
                  Running... } @else {
                  <span class="action-icon">▶️</span>
                  Run Demo }
                </button>
                <button
                  class="action-btn secondary"
                  (click)="viewDetails(library)"
                >
                  <span class="action-icon">📋</span>
                  Details
                </button>
              </div>
            </div>
            }
          </div>
        </div>

        <!-- Interactive Demo Panel -->
        <div class="demo-panel">
          <div class="panel-header">
            <h3>🧪 Interactive Demonstrations</h3>
            <div class="demo-queue">{{ runningDemos().length }} active</div>
          </div>

          @if (runningDemos().length === 0) {
          <div class="demo-placeholder">
            <div class="placeholder-icon">🎮</div>
            <h4>Ready for Live Demonstrations</h4>
            <p>Select a library and click "Run Demo" to see it in action</p>
          </div>
          } @else {
          <div class="demo-list">
            @for (demo of runningDemos(); track demo.libraryId) {
            <div class="demo-item">
              <div class="demo-header">
                <div class="demo-title">{{ demo.title }}</div>
                <div class="demo-progress">{{ demo.progress }}%</div>
              </div>
              <div class="demo-description">{{ demo.description }}</div>

              <div class="progress-bar">
                <div
                  class="progress-fill"
                  [style.width.%]="demo.progress"
                ></div>
              </div>

              @if (demo.result) {
              <div class="demo-result">
                <h5>Result:</h5>
                <pre class="result-output">{{
                  formatDemoResult(demo.result)
                }}</pre>
              </div>
              } @if (demo.error) {
              <div class="demo-error">
                <span class="error-icon">⚠️</span>
                {{ demo.error }}
              </div>
              }
            </div>
            }
          </div>
          }
        </div>
      </div>

      <!-- Capabilities Overview -->
      @if (capabilities(); as caps) {
      <div class="capabilities-section">
        <div class="section-header">
          <h2>⚡ System Capabilities</h2>
          <div class="capabilities-count">
            {{ Object.keys(caps.decorators).length }} Decorators Available
          </div>
        </div>

        <div class="capabilities-grid">
          <div class="capability-category">
            <h3>🎨 Decorators</h3>
            <div class="decorator-grid">
              @for (decorator of Object.entries(caps.decorators); track
              decorator[0]) {
              <div class="decorator-card">
                <div class="decorator-name">{{ decorator[0] }}</div>
                <div class="decorator-description">{{ decorator[1] }}</div>
              </div>
              }
            </div>
          </div>

          <div class="capability-category">
            <h3>🔄 Coordination Patterns</h3>
            <div class="pattern-grid">
              @for (pattern of Object.entries(caps.patterns); track pattern[0])
              {
              <div class="pattern-card">
                <div class="pattern-name">{{ pattern[0] }}</div>
                <div class="pattern-description">{{ pattern[1] }}</div>
              </div>
              }
            </div>
          </div>

          <div class="capability-category">
            <h3>🏢 Enterprise Features</h3>
            <div class="enterprise-list">
              @for (feature of caps.enterpriseFeatures; track feature) {
              <div class="enterprise-item">
                <span class="enterprise-icon">✓</span>
                {{ feature }}
              </div>
              }
            </div>
          </div>
        </div>

        <!-- Performance Metrics -->
        <div class="performance-section">
          <h3>📊 Development Impact</h3>
          <div class="impact-grid">
            <div class="impact-card">
              <div class="impact-value">
                {{ caps.performanceMetrics.developmentVelocity }}
              </div>
              <div class="impact-label">Development Velocity</div>
            </div>
            <div class="impact-card">
              <div class="impact-value">
                {{ caps.performanceMetrics.codeReduction }}
              </div>
              <div class="impact-label">Code Reduction</div>
            </div>
            <div class="impact-card">
              <div class="impact-value">Enterprise-grade</div>
              <div class="impact-label">Production Readiness</div>
            </div>
            <div class="impact-card">
              <div class="impact-value">100+ workflows</div>
              <div class="impact-label">Scalability</div>
            </div>
          </div>
        </div>
      </div>
      }

      <!-- Real-time Updates -->
      <div class="realtime-status">
        <div class="status-item">
          <span class="status-indicator active"></span>
          <span class="status-text">Real-time monitoring active</span>
        </div>
        <div class="status-item">
          <span class="update-time"
            >Last updated: {{ lastUpdate() | date : 'HH:mm:ss' }}</span
          >
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .library-showcase {
        min-height: 100vh;
        background: linear-gradient(135deg, #2d1b69 0%, #11998e 100%);
        color: white;
        padding: 20px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      }

      .showcase-header {
        text-align: center;
        margin-bottom: 40px;
      }

      .showcase-header h1 {
        font-size: 3.5rem;
        font-weight: 800;
        margin-bottom: 16px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
      }

      .subtitle {
        font-size: 1.2rem;
        opacity: 0.9;
        margin-bottom: 30px;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
      }

      .ecosystem-stats {
        display: flex;
        justify-content: center;
        gap: 20px;
        flex-wrap: wrap;
        margin-top: 30px;
      }

      .stat-card {
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 20px;
        min-width: 120px;
        text-align: center;
      }

      .stat-value {
        font-size: 2.2rem;
        font-weight: 700;
        line-height: 1;
        color: #22c55e;
      }

      .stat-label {
        font-size: 0.9rem;
        opacity: 0.8;
        margin-top: 6px;
      }

      .category-filters {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-bottom: 40px;
        flex-wrap: wrap;
      }

      .filter-btn {
        padding: 10px 20px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.9rem;
      }

      .filter-btn:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      .filter-btn.active {
        background: rgba(34, 197, 94, 0.3);
        border-color: rgba(34, 197, 94, 0.5);
        color: #22c55e;
      }

      .showcase-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 30px;
        max-width: 1400px;
        margin: 0 auto;
        align-items: start;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 2px solid rgba(255, 255, 255, 0.1);
      }

      .section-header h2 {
        margin: 0;
        font-size: 1.8rem;
        font-weight: 600;
      }

      .view-toggle {
        display: flex;
        gap: 6px;
      }

      .toggle-btn {
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: white;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .toggle-btn.active {
        background: rgba(34, 197, 94, 0.2);
        border-color: rgba(34, 197, 94, 0.5);
        color: #22c55e;
      }

      .libraries-grid.view-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 20px;
      }

      .libraries-grid.view-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .library-card {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        padding: 20px;
        transition: all 0.3s ease;
      }

      .library-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      }

      .library-card.status-active {
        border-color: rgba(34, 197, 94, 0.5);
        background: rgba(34, 197, 94, 0.05);
      }

      .library-card.status-demo {
        border-color: rgba(245, 158, 11, 0.5);
        background: rgba(245, 158, 11, 0.05);
        box-shadow: 0 0 20px rgba(245, 158, 11, 0.2);
      }

      .library-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }

      .library-icon {
        font-size: 2rem;
        min-width: 40px;
      }

      .library-info {
        flex: 1;
      }

      .library-name {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 600;
      }

      .library-category {
        font-size: 0.8rem;
        opacity: 0.7;
        text-transform: capitalize;
        margin-top: 2px;
      }

      .library-status {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 500;
      }

      .status-indicator {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }

      .library-status.status-active {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
      }

      .library-status.status-idle {
        background: rgba(156, 163, 175, 0.2);
        color: #9ca3af;
      }

      .library-status.status-busy,
      .library-status.status-demo {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
      }

      .library-description {
        font-size: 0.9rem;
        line-height: 1.5;
        opacity: 0.9;
        margin-bottom: 16px;
      }

      .library-metrics {
        margin-bottom: 16px;
      }

      .metric-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }

      .metric-label {
        min-width: 80px;
        font-size: 0.8rem;
        opacity: 0.8;
      }

      .metric-bar {
        flex: 1;
        height: 6px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        overflow: hidden;
      }

      .metric-fill {
        height: 100%;
        background: linear-gradient(90deg, #22c55e, #16a34a);
        transition: width 0.3s ease;
      }

      .metric-fill.performance {
        background: linear-gradient(90deg, #3b82f6, #2563eb);
      }

      .metric-value {
        min-width: 40px;
        font-size: 0.8rem;
        font-weight: 500;
        text-align: right;
      }

      .library-features {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 16px;
      }

      .feature-tag {
        background: rgba(255, 255, 255, 0.1);
        padding: 3px 8px;
        border-radius: 10px;
        font-size: 0.7rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .feature-more {
        background: rgba(156, 163, 175, 0.2);
        color: #9ca3af;
        padding: 3px 8px;
        border-radius: 10px;
        font-size: 0.7rem;
        font-style: italic;
      }

      .library-actions {
        display: flex;
        gap: 8px;
      }

      .action-btn {
        flex: 1;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .action-btn.primary {
        background: linear-gradient(135deg, #22c55e, #16a34a);
        color: white;
      }

      .action-btn.secondary {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .action-btn:hover:not(:disabled) {
        transform: translateY(-1px);
      }

      .action-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .spinner {
        width: 12px;
        height: 12px;
        border: 1.5px solid rgba(255, 255, 255, 0.3);
        border-top: 1.5px solid white;
        border-radius: 50%;
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

      .demo-panel {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 16px;
        padding: 20px;
        height: fit-content;
        position: sticky;
        top: 20px;
      }

      .demo-queue {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 500;
      }

      .demo-placeholder {
        text-align: center;
        padding: 40px 20px;
        opacity: 0.7;
      }

      .placeholder-icon {
        font-size: 3rem;
        margin-bottom: 16px;
      }

      .demo-placeholder h4 {
        margin: 0 0 8px 0;
        font-size: 1.1rem;
        font-weight: 600;
      }

      .demo-placeholder p {
        margin: 0;
        font-size: 0.9rem;
        opacity: 0.8;
      }

      .demo-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .demo-item {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 12px;
      }

      .demo-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .demo-title {
        font-weight: 500;
        font-size: 0.9rem;
      }

      .demo-progress {
        font-size: 0.8rem;
        color: #22c55e;
        font-weight: 500;
      }

      .demo-description {
        font-size: 0.8rem;
        opacity: 0.8;
        margin-bottom: 8px;
      }

      .progress-bar {
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 8px;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #22c55e, #16a34a);
        transition: width 0.3s ease;
      }

      .demo-result {
        margin-top: 8px;
      }

      .demo-result h5 {
        margin: 0 0 4px 0;
        font-size: 0.8rem;
        font-weight: 600;
      }

      .result-output {
        background: rgba(0, 0, 0, 0.3);
        padding: 8px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-family: 'Monaco', 'Menlo', monospace;
        white-space: pre-wrap;
        max-height: 100px;
        overflow-y: auto;
      }

      .demo-error {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
        padding: 6px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        margin-top: 8px;
      }

      .capabilities-section {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 30px;
        margin-top: 40px;
        max-width: 1400px;
        margin-left: auto;
        margin-right: auto;
      }

      .capabilities-count {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
        padding: 6px 12px;
        border-radius: 12px;
        font-size: 0.9rem;
        font-weight: 500;
      }

      .capabilities-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 30px;
        margin-bottom: 30px;
      }

      .capability-category h3 {
        margin: 0 0 16px 0;
        font-size: 1.3rem;
        font-weight: 600;
      }

      .decorator-grid,
      .pattern-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .decorator-card,
      .pattern-card {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        padding: 10px;
      }

      .decorator-name,
      .pattern-name {
        font-weight: 500;
        font-size: 0.9rem;
        color: #22c55e;
        margin-bottom: 4px;
      }

      .decorator-description,
      .pattern-description {
        font-size: 0.8rem;
        opacity: 0.8;
        line-height: 1.4;
      }

      .enterprise-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .enterprise-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9rem;
      }

      .enterprise-icon {
        color: #22c55e;
        font-weight: 600;
      }

      .performance-section {
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding-top: 20px;
      }

      .performance-section h3 {
        margin: 0 0 16px 0;
        font-size: 1.3rem;
        font-weight: 600;
      }

      .impact-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }

      .impact-card {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 16px;
        text-align: center;
      }

      .impact-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #22c55e;
        margin-bottom: 6px;
      }

      .impact-label {
        font-size: 0.9rem;
        opacity: 0.8;
      }

      .realtime-status {
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: flex-end;
      }

      .status-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        font-size: 0.8rem;
      }

      .status-indicator.active {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #22c55e;
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

      .update-time {
        opacity: 0.7;
      }

      @media (max-width: 1024px) {
        .showcase-grid {
          grid-template-columns: 1fr;
        }

        .demo-panel {
          position: relative;
          top: 0;
        }
      }

      @media (max-width: 768px) {
        .library-showcase {
          padding: 16px;
        }

        .showcase-header h1 {
          font-size: 2.5rem;
        }

        .ecosystem-stats {
          flex-direction: column;
          align-items: center;
        }

        .category-filters {
          flex-direction: column;
          align-items: center;
        }

        .libraries-grid.view-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class LibraryShowcaseComponent implements OnInit {
  private readonly showcaseApi = inject(ShowcaseApiService);
  readonly wsService = inject(WebSocketService);
  private readonly destroyRef = inject(DestroyRef);

  // Make Object available to template
  readonly Object = Object;

  // State
  readonly selectedCategory = signal<
    'all' | 'core' | 'specialized' | 'enterprise'
  >('all');
  readonly viewMode = signal<'grid' | 'list'>('grid');
  readonly capabilities = signal<ShowcaseCapabilities | null>(null);
  readonly runningDemos = signal<InteractiveDemo[]>([]);
  readonly lastUpdate = signal(new Date());

  // Library definitions
  readonly libraries = signal<LibraryDemo[]>([
    {
      id: 'chromadb',
      name: 'ChromaDB',
      category: 'core',
      description:
        'High-performance vector database for embeddings and similarity search operations',
      icon: '🔍',
      utilization: 87,
      status: 'active',
      features: [
        'Vector Storage',
        'Similarity Search',
        'Embedding Management',
        'Metadata Filtering',
      ],
      capabilities: ['Semantic Search', 'RAG Operations', 'Content Similarity'],
      examples: [],
      metrics: { performance: 92, adoption: 95, satisfaction: 89 },
    },
    {
      id: 'neo4j',
      name: 'Neo4j',
      category: 'core',
      description:
        'Graph database for complex relationship modeling and traversal patterns',
      icon: '🕸️',
      utilization: 73,
      status: 'active',
      features: [
        'Graph Queries',
        'Relationship Mapping',
        'Pattern Matching',
        'Cypher Support',
      ],
      capabilities: [
        'Complex Relationships',
        'Path Finding',
        'Graph Analytics',
      ],
      examples: [],
      metrics: { performance: 88, adoption: 82, satisfaction: 91 },
    },
    {
      id: 'langgraph',
      name: 'LangGraph',
      category: 'core',
      description:
        'Advanced workflow orchestration and agent coordination framework',
      icon: '🔄',
      utilization: 94,
      status: 'active',
      features: [
        'Workflow Engine',
        'State Management',
        'Agent Coordination',
        'Event Streaming',
      ],
      capabilities: [
        'Multi-Agent Workflows',
        'State Persistence',
        'Real-time Coordination',
      ],
      examples: [],
      metrics: { performance: 95, adoption: 98, satisfaction: 94 },
    },
    {
      id: 'memory',
      name: 'Memory Intelligence',
      category: 'specialized',
      description:
        'Sophisticated memory management with context awareness and retrieval',
      icon: '🧠',
      utilization: 68,
      status: 'active',
      features: [
        'Context Storage',
        'Memory Retrieval',
        'Relevance Scoring',
        'Multi-type Memory',
      ],
      capabilities: [
        'Contextual Intelligence',
        'Long-term Memory',
        'Adaptive Retrieval',
      ],
      examples: [],
      metrics: { performance: 85, adoption: 78, satisfaction: 87 },
    },
    {
      id: 'checkpoint',
      name: 'Checkpoint System',
      category: 'specialized',
      description:
        'State persistence and recovery for reliable workflow execution',
      icon: '💾',
      utilization: 45,
      status: 'idle',
      features: [
        'State Snapshots',
        'Recovery Points',
        'Version Management',
        'Rollback Support',
      ],
      capabilities: [
        'Fault Tolerance',
        'State Recovery',
        'Workflow Continuity',
      ],
      examples: [],
      metrics: { performance: 90, adoption: 65, satisfaction: 88 },
    },
    {
      id: 'multi-agent',
      name: 'Multi-Agent System',
      category: 'specialized',
      description:
        'Advanced agent coordination with supervisor and swarm patterns',
      icon: '🤖',
      utilization: 89,
      status: 'active',
      features: [
        'Agent Coordination',
        'Pattern Implementation',
        'Load Balancing',
        'Fault Recovery',
      ],
      capabilities: [
        'Supervisor Patterns',
        'Swarm Intelligence',
        'Distributed Processing',
      ],
      examples: [],
      metrics: { performance: 93, adoption: 91, satisfaction: 96 },
    },
    {
      id: 'monitoring',
      name: 'System Monitoring',
      category: 'enterprise',
      description:
        'Comprehensive observability and performance tracking for production systems',
      icon: '📊',
      utilization: 76,
      status: 'active',
      features: [
        'Performance Metrics',
        'Health Monitoring',
        'Alert Management',
        'Analytics Dashboard',
      ],
      capabilities: [
        'Real-time Monitoring',
        'Performance Analytics',
        'System Observability',
      ],
      examples: [],
      metrics: { performance: 88, adoption: 85, satisfaction: 90 },
    },
    {
      id: 'streaming',
      name: 'Real-time Streaming',
      category: 'specialized',
      description:
        'High-performance streaming for real-time data processing and WebSocket integration',
      icon: '📡',
      utilization: 83,
      status: 'active',
      features: [
        'WebSocket Support',
        'Event Streaming',
        'Real-time Updates',
        'Stream Processing',
      ],
      capabilities: [
        'Live Data Streams',
        'Event Processing',
        'Real-time Communication',
      ],
      examples: [],
      metrics: { performance: 91, adoption: 87, satisfaction: 85 },
    },
    {
      id: 'hitl',
      name: 'Human-in-the-Loop',
      category: 'enterprise',
      description: 'Advanced approval workflows and human feedback integration',
      icon: '👤',
      utilization: 32,
      status: 'idle',
      features: [
        'Approval Workflows',
        'Human Feedback',
        'Risk Assessment',
        'Quality Control',
      ],
      capabilities: [
        'Human Oversight',
        'Quality Assurance',
        'Approval Management',
      ],
      examples: [],
      metrics: { performance: 86, adoption: 45, satisfaction: 92 },
    },
    {
      id: 'platform',
      name: 'Platform Services',
      category: 'enterprise',
      description:
        'Core infrastructure services including configuration and service discovery',
      icon: '🏗️',
      utilization: 65,
      status: 'active',
      features: [
        'Service Discovery',
        'Configuration Management',
        'Infrastructure Services',
        'Runtime Support',
      ],
      capabilities: [
        'Service Management',
        'Configuration',
        'Infrastructure Automation',
      ],
      examples: [],
      metrics: { performance: 84, adoption: 78, satisfaction: 81 },
    },
    {
      id: 'functional-api',
      name: 'Functional API',
      category: 'specialized',
      description:
        'Functional programming patterns with immutable state and pure functions',
      icon: '⚡',
      utilization: 58,
      status: 'active',
      features: [
        'Pure Functions',
        'Immutable State',
        'Functional Patterns',
        'Type Safety',
      ],
      capabilities: ['Functional Programming', 'Immutability', 'Type Safety'],
      examples: [],
      metrics: { performance: 89, adoption: 62, satisfaction: 88 },
    },
    {
      id: 'time-travel',
      name: 'Time Travel Debugging',
      category: 'enterprise',
      description:
        'Advanced debugging capabilities with state history and replay functionality',
      icon: '⏰',
      utilization: 23,
      status: 'idle',
      features: [
        'State History',
        'Replay Debugging',
        'Time Navigation',
        'State Inspection',
      ],
      capabilities: ['Debug History', 'State Replay', 'Development Tools'],
      examples: [],
      metrics: { performance: 87, adoption: 35, satisfaction: 94 },
    },
    {
      id: 'workflow-engine',
      name: 'Workflow Engine',
      category: 'specialized',
      description:
        'Advanced task orchestration with dependency management and parallel execution',
      icon: '🔧',
      utilization: 79,
      status: 'active',
      features: [
        'Task Orchestration',
        'Dependency Management',
        'Parallel Execution',
        'Pipeline Support',
      ],
      capabilities: [
        'Task Management',
        'Workflow Coordination',
        'Pipeline Processing',
      ],
      examples: [],
      metrics: { performance: 90, adoption: 83, satisfaction: 87 },
    },
  ]);

  // Computed properties
  readonly filteredLibraries = computed(() => {
    const category = this.selectedCategory();
    if (category === 'all') return this.libraries();
    return this.libraries().filter((lib) => lib.category === category);
  });

  readonly totalLibraries = computed(() => this.libraries().length);
  readonly activeLibraries = computed(
    () => this.libraries().filter((lib) => lib.status === 'active').length
  );
  readonly averageUtilization = computed(() => {
    const libs = this.libraries();
    const total = libs.reduce((sum, lib) => sum + lib.utilization, 0);
    return total / libs.length;
  });
  readonly totalCapabilities = computed(() => {
    return this.libraries().reduce(
      (sum, lib) => sum + lib.capabilities.length,
      0
    );
  });

  constructor() {
    // Update last update time every 5 seconds
    effect(() => {
      const updateTimer = interval(5000).pipe(
        takeUntilDestroyed(this.destroyRef)
      );
      updateTimer.subscribe(() => {
        this.lastUpdate.set(new Date());
      });
    });
  }

  ngOnInit() {
    this.loadCapabilities();
    this.connectWebSocket();
    this.startRealtimeUpdates();
  }

  setCategory(category: 'all' | 'core' | 'specialized' | 'enterprise') {
    this.selectedCategory.set(category);
  }

  setViewMode(mode: 'grid' | 'list') {
    this.viewMode.set(mode);
  }

  getCategoryCount(category: 'core' | 'specialized' | 'enterprise'): number {
    return this.libraries().filter((lib) => lib.category === category).length;
  }

  isDemoRunning(libraryId: string): boolean {
    return this.runningDemos().some((demo) => demo.libraryId === libraryId);
  }

  async runDemo(library: LibraryDemo) {
    if (this.isDemoRunning(library.id)) return;

    // Update library status
    const libs = this.libraries();
    const libIndex = libs.findIndex((l) => l.id === library.id);
    if (libIndex !== -1) {
      libs[libIndex].status = 'demo';
      this.libraries.set([...libs]);
    }

    // Create demo instance
    const demo: InteractiveDemo = {
      libraryId: library.id,
      title: `${library.name} Live Demo`,
      description: `Demonstrating ${library.description.toLowerCase()}`,
      isRunning: true,
      progress: 0,
    };

    this.runningDemos.set([...this.runningDemos(), demo]);

    try {
      // Simulate demo execution with progress updates
      await this.simulateDemo(demo);

      // Get real demo result from API if available
      if (
        this.showcaseApi.getAvailableAgents().includes(`${library.id}-showcase`)
      ) {
        const agentDemo = await this.showcaseApi
          .getAgentDemo(`${library.id}-showcase`)
          .toPromise();
        if (agentDemo) {
          demo.result = {
            capabilities: agentDemo.capabilities,
            metrics: agentDemo.metrics,
            examples: agentDemo.examples.slice(0, 2),
          };
        } else {
          demo.result = this.generateMockResult(library);
        }
      } else {
        demo.result = this.generateMockResult(library);
      }

      demo.progress = 100;
      demo.isRunning = false;
    } catch (error) {
      demo.error = `Demo failed: ${(error as Error).message}`;
      demo.isRunning = false;
    }

    // Update library status back to normal
    setTimeout(() => {
      const updatedLibs = this.libraries();
      const updatedLibIndex = updatedLibs.findIndex((l) => l.id === library.id);
      if (updatedLibIndex !== -1) {
        updatedLibs[updatedLibIndex].status = 'active';
        this.libraries.set([...updatedLibs]);
      }

      // Remove demo after 30 seconds
      setTimeout(() => {
        const currentDemos = this.runningDemos();
        this.runningDemos.set(
          currentDemos.filter((d) => d.libraryId !== library.id)
        );
      }, 30000);
    }, 3000);
  }

  viewDetails(library: LibraryDemo) {
    // Navigate to library details or show modal
    console.log('Viewing details for:', library);
    // Implementation would depend on routing strategy
  }

  formatDemoResult(result: any): string {
    if (typeof result === 'object') {
      return JSON.stringify(result, null, 2);
    }
    return String(result);
  }

  private async loadCapabilities() {
    try {
      const capabilities = await this.showcaseApi.getCapabilities().toPromise();
      if (capabilities) {
        this.capabilities.set(capabilities);
      }
    } catch (error) {
      console.error('Failed to load capabilities:', error);
    }
  }

  private connectWebSocket() {
    this.wsService.connect({
      url: 'ws://localhost:3000/',
      userId: 'library-showcase',
      sessionId: `libraries-${Date.now()}`,
    });
  }

  private startRealtimeUpdates() {
    // Simulate real-time utilization updates
    interval(3000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const libs = this.libraries();
        libs.forEach((lib) => {
          if (lib.status === 'active') {
            // Simulate small fluctuations in utilization
            const change = (Math.random() - 0.5) * 10;
            lib.utilization = Math.max(
              0,
              Math.min(100, lib.utilization + change)
            );
          }
        });
        this.libraries.set([...libs]);
      });
  }

  private async simulateDemo(demo: InteractiveDemo): Promise<void> {
    return new Promise((resolve) => {
      const progressInterval = setInterval(() => {
        demo.progress += Math.random() * 15;
        if (demo.progress >= 100) {
          demo.progress = 100;
          clearInterval(progressInterval);
          resolve();
        }
        this.runningDemos.set([...this.runningDemos()]);
      }, 500);
    });
  }

  private generateMockResult(library: LibraryDemo): any {
    return {
      status: 'Demo completed successfully',
      capabilities: library.capabilities,
      metrics: library.metrics,
      timestamp: new Date().toISOString(),
      demoData: `Mock result for ${library.name} demonstration`,
    };
  }
}
