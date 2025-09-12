import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ShowcaseApiService,
  ShowcaseWorkflowRequest,
  ShowcaseWorkflowResponse,
} from '../../core/services/showcase-api.service';
import { WebSocketService } from '../../core/services/websocket.service';

interface PatternDemo {
  id: string;
  name: string;
  description: string;
  icon: string;
  complexity: 'low' | 'medium' | 'high';
  agentCount: number;
  useCases: string[];
  advantages: string[];
  visualizationType: '3d-network' | '2d-flow' | 'hierarchy';
}

interface ExecutionStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  agent?: string;
  progress: number;
  duration?: number;
  output?: string;
}

/**
 * 🐝 MULTI-AGENT PATTERNS COMPONENT
 *
 * Interactive demonstration of Supervisor vs Swarm patterns
 * Real-time visualization of agent coordination
 * Connects to showcase API endpoints for live demonstrations
 */
@Component({
  selector: 'brand-multi-agent-patterns',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="patterns-container">
      <!-- Header -->
      <div class="patterns-header">
        <h1>🐝 Multi-Agent Coordination Patterns</h1>
        <p class="subtitle">
          Explore the power of declarative agent coordination with real-time
          demonstrations
        </p>

        <div class="pattern-selector">
          @for (pattern of availablePatterns(); track pattern.id) {
          <button
            class="pattern-btn"
            [class.active]="selectedPattern() === pattern.id"
            (click)="selectPattern(pattern.id)"
          >
            <span class="pattern-icon">{{ pattern.icon }}</span>
            <div class="pattern-info">
              <div class="pattern-name">{{ pattern.name }}</div>
              <div class="pattern-desc">{{ pattern.description }}</div>
            </div>
          </button>
          }
        </div>
      </div>

      <div class="patterns-main">
        <!-- Pattern Configuration Panel -->
        <div class="config-panel">
          <div class="panel-header">
            <h3>⚙️ Configuration</h3>
            <div class="execution-status" [class]="executionStatus()">
              {{ getStatusText() }}
            </div>
          </div>

          <div class="config-form">
            <div class="form-group">
              <label for="input">Input Query:</label>
              <textarea
                id="input"
                [(ngModel)]="inputQuery"
                placeholder="Enter your query to demonstrate the selected pattern..."
                rows="3"
              ></textarea>
            </div>

            <div class="config-row">
              <div class="form-group">
                <label for="agentCount">Agent Count:</label>
                <select id="agentCount" [(ngModel)]="agentCount">
                  <option value="2">2 Agents</option>
                  <option value="3">3 Agents</option>
                  <option value="4">4 Agents</option>
                  <option value="5">5 Agents</option>
                </select>
              </div>

              <div class="form-group">
                <label for="complexity">Complexity:</label>
                <select id="complexity" [(ngModel)]="complexityLevel">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div class="form-group">
                <label for="mode">Demo Mode:</label>
                <select id="mode" [(ngModel)]="demonstrationMode">
                  <option value="basic">Basic</option>
                  <option value="advanced">Advanced</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            <button
              class="execute-btn"
              [disabled]="isExecuting() || !inputQuery.trim()"
              (click)="executePattern()"
            >
              @if (isExecuting()) {
              <span class="spinner"></span>
              Executing... } @else {
              <span class="execute-icon">🚀</span>
              Execute {{ getPatternName() }}
              }
            </button>
          </div>

          <!-- Pattern Information -->
          @if (selectedPatternInfo(); as info) {
          <div class="pattern-details">
            <h4>{{ info.name }} Pattern Details</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Complexity:</span>
                <span
                  class="complexity-badge"
                  [class]="'complexity-' + info.complexity"
                >
                  {{ info.complexity }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Optimal Agents:</span>
                <span>{{ info.agentCount }}</span>
              </div>
            </div>

            <div class="use-cases">
              <h5>Use Cases:</h5>
              <ul>
                @for (useCase of info.useCases; track useCase) {
                <li>{{ useCase }}</li>
                }
              </ul>
            </div>

            <div class="advantages">
              <h5>Key Advantages:</h5>
              <ul>
                @for (advantage of info.advantages; track advantage) {
                <li>{{ advantage }}</li>
                }
              </ul>
            </div>
          </div>
          }
        </div>

        <!-- Visualization Panel -->
        <div class="visualization-panel">
          <div class="panel-header">
            <h3>📊 Real-time Coordination Visualization</h3>
            <div class="viz-controls">
              <button
                class="viz-btn"
                [class.active]="visualizationMode() === '2d'"
                (click)="setVisualizationMode('2d')"
              >
                2D Flow
              </button>
              <button
                class="viz-btn"
                [class.active]="visualizationMode() === '3d'"
                (click)="setVisualizationMode('3d')"
              >
                3D Network
              </button>
            </div>
          </div>

          <div
            class="visualization-area"
            [class]="'viz-' + visualizationMode()"
          >
            @if (!currentExecution()) {
            <div class="viz-placeholder">
              <div class="placeholder-icon">🎭</div>
              <h4>Ready for Pattern Demonstration</h4>
              <p>
                Configure and execute a pattern to see real-time agent
                coordination
              </p>
            </div>
            } @else {
            <!-- Agent Network Visualization -->
            <div class="agent-network">
              @for (step of executionSteps(); track step.id) {
              <div class="agent-node" [class]="'status-' + step.status">
                <div class="node-header">
                  <span class="node-icon">🤖</span>
                  <span class="node-name">{{ step.name }}</span>
                  <div class="node-status" [class]="'status-' + step.status">
                    {{ step.status }}
                  </div>
                </div>

                @if (step.status === 'running' || step.status === 'completed') {
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    [style.width.%]="step.progress"
                  ></div>
                </div>
                <div class="progress-text">{{ step.progress }}%</div>
                } @if (step.output) {
                <div class="step-output">
                  {{ step.output }}
                </div>
                } @if (step.duration) {
                <div class="step-duration">⏱️ {{ step.duration }}ms</div>
                }
              </div>
              }
            </div>

            <!-- Pattern Flow Connections -->
            @if (selectedPattern() === 'supervisor') {
            <div class="supervisor-connections">
              <div class="supervisor-node">Supervisor</div>
              @for (step of executionSteps().slice(1); track step.id) {
              <div
                class="connection-line"
                [class]="'status-' + step.status"
              ></div>
              }
            </div>
            } @if (selectedPattern() === 'swarm') {
            <div class="swarm-connections">
              @for (step of executionSteps(); track step.id; let i = $index) {
              @for (otherStep of executionSteps(); track otherStep.id; let j =
              $index) { @if (i !== j && i < j) {
              <div
                class="peer-connection"
                [class]="getConnectionStatus(step, otherStep)"
              ></div>
              } } }
            </div>
            } }
          </div>
        </div>
      </div>

      <!-- Results Panel -->
      @if (currentExecution(); as execution) {
      <div class="results-panel">
        <div class="panel-header">
          <h3>📋 Execution Results</h3>
          <div class="execution-metrics">
            <span class="metric"> ⏱️ {{ execution.duration }}ms </span>
            <span class="metric">
              🎯 {{ execution.decoratorsShowcased.length }} Decorators
            </span>
            <span class="metric">
              ✨ {{ execution.enterpriseFeatures.length }} Features
            </span>
          </div>
        </div>

        <div class="results-content">
          <div class="result-section">
            <h4>Output</h4>
            <div class="result-output">
              {{ execution.output }}
            </div>
          </div>

          <div class="result-section">
            <h4>Decorators Demonstrated</h4>
            <div class="decorator-list">
              @for (decorator of execution.decoratorsShowcased; track decorator)
              {
              <span class="decorator-tag">{{ decorator }}</span>
              }
            </div>
          </div>

          <div class="result-section">
            <h4>Enterprise Features</h4>
            <div class="feature-list">
              @for (feature of execution.enterpriseFeatures; track feature) {
              <span class="feature-tag">{{ feature }}</span>
              }
            </div>
          </div>

          <div class="result-section">
            <h4>Execution Path</h4>
            <div class="execution-path">
              @for (step of execution.executionPath; track step; let i = $index)
              {
              <div class="path-step">
                <span class="step-number">{{ i + 1 }}</span>
                <span class="step-name">{{ step }}</span>
              </div>
              @if (i < execution.executionPath.length - 1) {
              <div class="path-arrow">→</div>
              } }
            </div>
          </div>

          @if (execution.swarmResults) {
          <div class="result-section">
            <h4>Swarm Intelligence Metrics</h4>
            <div class="swarm-metrics">
              <div class="metric-card">
                <div class="metric-value">
                  {{ execution.swarmResults.peerCount }}
                </div>
                <div class="metric-label">Peer Agents</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">
                  {{
                    (execution.swarmResults.consensusScore * 100).toFixed(1)
                  }}%
                </div>
                <div class="metric-label">Consensus Score</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">
                  {{ execution.swarmResults.emergentBehaviors }}
                </div>
                <div class="metric-label">Emergent Behaviors</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">
                  {{
                    (
                      execution.swarmResults.collectiveIntelligenceGain * 100
                    ).toFixed(1)
                  }}%
                </div>
                <div class="metric-label">Intelligence Gain</div>
              </div>
            </div>
          </div>
          }
        </div>
      </div>
      }

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
      </div>
    </div>
  `,
  styles: [
    `
      .patterns-container {
        min-height: 100vh;
        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        color: white;
        padding: 20px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      }

      .patterns-header {
        text-align: center;
        margin-bottom: 40px;
      }

      .patterns-header h1 {
        font-size: 3rem;
        font-weight: 800;
        margin-bottom: 10px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
      }

      .subtitle {
        font-size: 1.1rem;
        opacity: 0.9;
        margin-bottom: 30px;
      }

      .pattern-selector {
        display: flex;
        justify-content: center;
        gap: 20px;
        flex-wrap: wrap;
      }

      .pattern-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 24px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        min-width: 200px;
      }

      .pattern-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
      }

      .pattern-btn.active {
        background: rgba(34, 197, 94, 0.2);
        border-color: rgba(34, 197, 94, 0.5);
        box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
      }

      .pattern-icon {
        font-size: 1.8rem;
      }

      .pattern-info {
        text-align: left;
      }

      .pattern-name {
        font-weight: 600;
        font-size: 1rem;
      }

      .pattern-desc {
        font-size: 0.8rem;
        opacity: 0.8;
        margin-top: 2px;
      }

      .patterns-main {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 30px;
        max-width: 1400px;
        margin: 0 auto;
        align-items: start;
      }

      .config-panel,
      .visualization-panel {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 16px;
        padding: 24px;
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

      .execution-status {
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: 500;
      }

      .execution-status.idle {
        background: rgba(156, 163, 175, 0.2);
        color: #9ca3af;
      }

      .execution-status.running {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
        animation: pulse 2s infinite;
      }

      .execution-status.completed {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
      }

      .execution-status.error {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }

      .config-form {
        margin-bottom: 30px;
      }

      .form-group {
        margin-bottom: 16px;
      }

      .form-group label {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
        font-size: 0.9rem;
        opacity: 0.9;
      }

      .form-group textarea,
      .form-group select {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        font-size: 0.9rem;
      }

      .form-group textarea::placeholder {
        color: rgba(255, 255, 255, 0.5);
      }

      .config-row {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 16px;
      }

      .execute-btn {
        width: 100%;
        padding: 14px 20px;
        background: linear-gradient(135deg, #22c55e, #16a34a);
        border: none;
        border-radius: 10px;
        color: white;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }

      .execute-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(34, 197, 94, 0.3);
      }

      .execute-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
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

      .pattern-details {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 16px;
      }

      .pattern-details h4 {
        margin: 0 0 12px 0;
        font-size: 1.1rem;
        font-weight: 600;
      }

      .detail-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
      }

      .detail-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .detail-label {
        font-size: 0.9rem;
        opacity: 0.8;
      }

      .complexity-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 500;
      }

      .complexity-low {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
      }

      .complexity-medium {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
      }

      .complexity-high {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }

      .use-cases,
      .advantages {
        margin-bottom: 12px;
      }

      .use-cases h5,
      .advantages h5 {
        margin: 0 0 6px 0;
        font-size: 0.9rem;
        font-weight: 600;
        opacity: 0.9;
      }

      .use-cases ul,
      .advantages ul {
        margin: 0;
        padding-left: 16px;
        font-size: 0.8rem;
        opacity: 0.8;
      }

      .viz-controls {
        display: flex;
        gap: 8px;
      }

      .viz-btn {
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: white;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .viz-btn.active {
        background: rgba(34, 197, 94, 0.2);
        border-color: rgba(34, 197, 94, 0.5);
      }

      .visualization-area {
        min-height: 400px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
        padding: 20px;
        position: relative;
      }

      .viz-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        opacity: 0.6;
      }

      .placeholder-icon {
        font-size: 3rem;
        margin-bottom: 16px;
      }

      .viz-placeholder h4 {
        margin: 0 0 8px 0;
        font-size: 1.2rem;
        font-weight: 600;
      }

      .viz-placeholder p {
        margin: 0;
        font-size: 0.9rem;
        opacity: 0.8;
      }

      .agent-network {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
      }

      .agent-node {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 12px;
        transition: all 0.3s ease;
      }

      .agent-node.status-running {
        border-color: rgba(245, 158, 11, 0.5);
        background: rgba(245, 158, 11, 0.1);
        box-shadow: 0 0 20px rgba(245, 158, 11, 0.2);
      }

      .agent-node.status-completed {
        border-color: rgba(34, 197, 94, 0.5);
        background: rgba(34, 197, 94, 0.1);
      }

      .agent-node.status-error {
        border-color: rgba(239, 68, 68, 0.5);
        background: rgba(239, 68, 68, 0.1);
      }

      .node-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .node-icon {
        font-size: 1.2rem;
      }

      .node-name {
        flex: 1;
        font-weight: 500;
        font-size: 0.9rem;
      }

      .node-status {
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 0.7rem;
        text-transform: capitalize;
        font-weight: 500;
      }

      .node-status.status-pending {
        background: rgba(156, 163, 175, 0.2);
        color: #9ca3af;
      }

      .node-status.status-running {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
      }

      .node-status.status-completed {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
      }

      .node-status.status-error {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }

      .progress-bar {
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 6px;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #22c55e, #16a34a);
        transition: width 0.3s ease;
      }

      .progress-text {
        font-size: 0.8rem;
        text-align: center;
        opacity: 0.8;
        margin-bottom: 8px;
      }

      .step-output {
        background: rgba(0, 0, 0, 0.2);
        padding: 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        font-family: 'Monaco', 'Menlo', monospace;
        margin-bottom: 6px;
      }

      .step-duration {
        font-size: 0.7rem;
        opacity: 0.7;
        text-align: center;
      }

      .results-panel {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 16px;
        padding: 24px;
        margin-top: 30px;
      }

      .execution-metrics {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }

      .metric {
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        font-size: 0.8rem;
      }

      .results-content {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
      }

      .result-section {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 16px;
      }

      .result-section h4 {
        margin: 0 0 12px 0;
        font-size: 1rem;
        font-weight: 600;
        opacity: 0.9;
      }

      .result-output {
        background: rgba(0, 0, 0, 0.2);
        padding: 12px;
        border-radius: 6px;
        font-size: 0.9rem;
        line-height: 1.5;
      }

      .decorator-list,
      .feature-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .decorator-tag,
      .feature-tag {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 500;
      }

      .execution-path {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }

      .path-step {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.1);
        padding: 6px 10px;
        border-radius: 16px;
        font-size: 0.8rem;
      }

      .step-number {
        background: rgba(34, 197, 94, 0.3);
        color: white;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: 600;
      }

      .path-arrow {
        color: rgba(255, 255, 255, 0.6);
        font-size: 1.2rem;
      }

      .swarm-metrics {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 12px;
      }

      .metric-card {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 12px;
        text-align: center;
      }

      .metric-value {
        font-size: 1.8rem;
        font-weight: 700;
        line-height: 1;
        color: #22c55e;
      }

      .metric-label {
        font-size: 0.8rem;
        opacity: 0.8;
        margin-top: 4px;
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

      @media (max-width: 1024px) {
        .patterns-main {
          grid-template-columns: 1fr;
        }

        .config-row {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 768px) {
        .patterns-container {
          padding: 16px;
        }

        .patterns-header h1 {
          font-size: 2rem;
        }

        .pattern-selector {
          flex-direction: column;
          align-items: center;
        }

        .results-content {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class MultiAgentPatternsComponent implements OnInit {
  private readonly showcaseApi = inject(ShowcaseApiService);
  readonly wsService = inject(WebSocketService);

  // State
  readonly selectedPattern = signal<string>('supervisor');
  readonly isExecuting = signal(false);
  readonly executionStatus = signal<'idle' | 'running' | 'completed' | 'error'>(
    'idle'
  );
  readonly visualizationMode = signal<'2d' | '3d'>('2d');
  readonly currentExecution = signal<ShowcaseWorkflowResponse | null>(null);
  readonly executionSteps = signal<ExecutionStep[]>([]);

  // Form data
  inputQuery =
    'Analyze my GitHub repositories and create a comprehensive personal brand strategy with multi-platform content';
  agentCount = 3;
  complexityLevel: 'low' | 'medium' | 'high' = 'medium';
  demonstrationMode: 'basic' | 'advanced' | 'enterprise' = 'advanced';

  // Pattern definitions
  readonly availablePatterns = signal<PatternDemo[]>([
    {
      id: 'supervisor',
      name: 'Supervisor Pattern',
      description: 'Hierarchical coordination with intelligent routing',
      icon: '👑',
      complexity: 'medium',
      agentCount: 3,
      useCases: [
        'Content creation workflows',
        'Task delegation scenarios',
        'Quality assurance processes',
      ],
      advantages: [
        'Clear command structure',
        'Efficient resource allocation',
        'Quality control through supervision',
        'Scalable coordination',
      ],
      visualizationType: 'hierarchy',
    },
    {
      id: 'swarm',
      name: 'Swarm Pattern',
      description: 'Peer-to-peer collaboration with collective intelligence',
      icon: '🐝',
      complexity: 'high',
      agentCount: 4,
      useCases: [
        'Distributed problem solving',
        'Collaborative analysis',
        'Emergent solution finding',
      ],
      advantages: [
        'Resilient to failures',
        'Emergent behaviors',
        'Self-organizing optimization',
        'No single point of failure',
      ],
      visualizationType: '3d-network',
    },
  ]);

  readonly selectedPatternInfo = computed(() => {
    return this.availablePatterns().find(
      (p) => p.id === this.selectedPattern()
    );
  });

  constructor() {
    // Simulate execution steps for demo purposes
    effect(() => {
      const pattern = this.selectedPattern();
      this.updateExecutionSteps(pattern);
    });
  }

  ngOnInit() {
    this.connectWebSocket();
  }

  selectPattern(patternId: string) {
    this.selectedPattern.set(patternId);
    this.executionStatus.set('idle');
    this.currentExecution.set(null);
  }

  setVisualizationMode(mode: '2d' | '3d') {
    this.visualizationMode.set(mode);
  }

  getPatternName(): string {
    const pattern = this.selectedPatternInfo();
    return pattern ? pattern.name : 'Pattern';
  }

  getStatusText(): string {
    const status = this.executionStatus();
    const statusMap = {
      idle: '⚪ Ready to Execute',
      running: '🟡 Executing...',
      completed: '🟢 Completed',
      error: '🔴 Error Occurred',
    };
    return statusMap[status];
  }

  async executePattern() {
    if (!this.inputQuery.trim() || this.isExecuting()) return;

    this.isExecuting.set(true);
    this.executionStatus.set('running');
    this.currentExecution.set(null);

    // Start step simulation
    this.simulateExecution();

    const request: ShowcaseWorkflowRequest = {
      input: this.inputQuery,
      demonstrationMode: this.demonstrationMode,
      userId: 'demo-user',
      sessionId: `pattern-${Date.now()}`,
    };

    try {
      let response: ShowcaseWorkflowResponse | undefined;

      if (this.selectedPattern() === 'supervisor') {
        response = await this.showcaseApi
          .executeSupervisorShowcase(request)
          .toPromise();
      } else {
        response = await this.showcaseApi
          .executeSwarmShowcase(request)
          .toPromise();
      }

      if (response) {
        this.currentExecution.set(response);
        this.executionStatus.set('completed');
        this.completeAllSteps();
      } else {
        throw new Error('No response received from showcase API');
      }
    } catch (error) {
      console.error('Pattern execution failed:', error);
      this.executionStatus.set('error');
      this.errorAllSteps();
    } finally {
      this.isExecuting.set(false);
    }
  }

  private connectWebSocket() {
    this.wsService.connect({
      url: 'ws://localhost:3000/',
      userId: 'pattern-demo',
      sessionId: `patterns-${Date.now()}`,
    });
  }

  private updateExecutionSteps(pattern: string) {
    const supervisorSteps: ExecutionStep[] = [
      {
        id: 'supervisor',
        name: 'Supervisor Agent',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'github-analyzer',
        name: 'GitHub Analyzer',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'content-creator',
        name: 'Content Creator',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'brand-strategist',
        name: 'Brand Strategist',
        status: 'pending',
        progress: 0,
      },
    ];

    const swarmSteps: ExecutionStep[] = [
      { id: 'peer-1', name: 'Analysis Peer', status: 'pending', progress: 0 },
      { id: 'peer-2', name: 'Strategy Peer', status: 'pending', progress: 0 },
      { id: 'peer-3', name: 'Content Peer', status: 'pending', progress: 0 },
      { id: 'peer-4', name: 'Quality Peer', status: 'pending', progress: 0 },
    ];

    this.executionSteps.set(
      pattern === 'supervisor' ? supervisorSteps : swarmSteps
    );
  }

  private simulateExecution() {
    const steps = this.executionSteps();
    let currentStep = 0;

    const progressStep = () => {
      if (currentStep < steps.length && this.executionStatus() === 'running') {
        const step = steps[currentStep];
        step.status = 'running';

        // Simulate progress
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += Math.random() * 20;
          step.progress = Math.min(100, progress);

          if (progress >= 100) {
            clearInterval(progressInterval);
            step.status = 'completed';
            step.duration = Math.floor(Math.random() * 2000) + 500;
            step.output = this.generateStepOutput(step.name);

            currentStep++;
            if (currentStep < steps.length) {
              setTimeout(progressStep, 500);
            }
          }
        }, 200);
      }
    };

    // Start first step after a brief delay
    setTimeout(progressStep, 1000);
  }

  private generateStepOutput(stepName: string): string {
    const outputs = {
      'Supervisor Agent':
        'Coordinating workflow execution and delegating tasks...',
      'GitHub Analyzer':
        'Analyzing repositories, extracting skills and achievements...',
      'Content Creator':
        'Generating multi-platform content based on analysis...',
      'Brand Strategist':
        'Developing comprehensive brand strategy and positioning...',
      'Analysis Peer': 'Distributed analysis of technical capabilities...',
      'Strategy Peer':
        'Collaborative strategy development with peer consensus...',
      'Content Peer': 'Peer-to-peer content ideation and optimization...',
      'Quality Peer': 'Collective quality assurance and refinement...',
    };

    return outputs[stepName as keyof typeof outputs] || 'Processing...';
  }

  private completeAllSteps() {
    const steps = this.executionSteps();
    steps.forEach((step) => {
      if (step.status !== 'completed') {
        step.status = 'completed';
        step.progress = 100;
        step.duration = Math.floor(Math.random() * 2000) + 500;
        step.output = this.generateStepOutput(step.name);
      }
    });
    this.executionSteps.set([...steps]);
  }

  private errorAllSteps() {
    const steps = this.executionSteps();
    steps.forEach((step) => {
      if (step.status === 'running') {
        step.status = 'error';
      }
    });
    this.executionSteps.set([...steps]);
  }

  getConnectionStatus(step1: ExecutionStep, step2: ExecutionStep): string {
    if (step1.status === 'completed' && step2.status === 'completed') {
      return 'status-active';
    } else if (step1.status === 'running' || step2.status === 'running') {
      return 'status-active';
    }
    return 'status-inactive';
  }
}
