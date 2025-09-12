import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CodeComparison {
  title: string;
  description: string;
  category: 'agent' | 'workflow' | 'streaming' | 'approval' | 'coordination';
  beforeCode: string;
  afterCode: string;
  improvements: string[];
  metrics: {
    linesOfCode: { before: number; after: number; reduction: number };
    complexity: {
      before: 'high' | 'medium' | 'low';
      after: 'high' | 'medium' | 'low';
    };
    maintainability: { before: number; after: number };
    developmentTime: { before: string; after: string };
  };
}

interface PerformanceMetric {
  category: string;
  metric: string;
  beforeValue: number;
  afterValue: number;
  unit: string;
  improvement: number;
  description: string;
}

/**
 * ⚡ DEVELOPER EXPERIENCE COMPONENT
 *
 * Showcases the "before vs after" transformation
 * Demonstrates 70% code reduction and 5x development velocity
 * Interactive decorator explorer and performance metrics
 */
@Component({
  selector: 'brand-developer-experience',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="developer-experience">
      <!-- Hero Section -->
      <div class="hero-section">
        <h1>⚡ The Developer Experience Revolution</h1>
        <p class="hero-subtitle">
          See how declarative decorators transform AI application development
        </p>

        <div class="impact-metrics">
          <div class="impact-card primary">
            <div class="impact-value">70%</div>
            <div class="impact-label">Code Reduction</div>
            <div class="impact-detail">Less boilerplate, more value</div>
          </div>
          <div class="impact-card success">
            <div class="impact-value">5x</div>
            <div class="impact-label">Development Velocity</div>
            <div class="impact-detail">From concept to production</div>
          </div>
          <div class="impact-card accent">
            <div class="impact-value">100%</div>
            <div class="impact-label">Enterprise Ready</div>
            <div class="impact-detail">Production-grade patterns</div>
          </div>
        </div>
      </div>

      <!-- Category Navigation -->
      <div class="category-nav">
        @for (category of categories(); track category.id) {
        <button
          class="category-btn"
          [class.active]="selectedCategory() === category.id"
          (click)="selectCategory(category.id)"
        >
          <span class="category-icon">{{ category.icon }}</span>
          <div class="category-info">
            <div class="category-name">{{ category.name }}</div>
            <div class="category-count">{{ category.examples }} examples</div>
          </div>
        </button>
        }
      </div>

      <!-- Code Comparison Section -->
      <div class="comparison-section">
        <div class="section-header">
          <h2>🔄 Before vs After Comparison</h2>
          <div class="comparison-selector">
            <select
              [(ngModel)]="selectedComparisonIndex"
              (ngModelChange)="onComparisonChange()"
            >
              @for (comparison of filteredComparisons(); track comparison.title;
              let i = $index) {
              <option [value]="i">{{ comparison.title }}</option>
              }
            </select>
          </div>
        </div>

        @if (currentComparison(); as comparison) {
        <div class="comparison-container">
          <div class="comparison-info">
            <h3>{{ comparison.title }}</h3>
            <p class="comparison-description">{{ comparison.description }}</p>

            <div class="improvement-tags">
              @for (improvement of comparison.improvements; track improvement) {
              <span class="improvement-tag">{{ improvement }}</span>
              }
            </div>
          </div>

          <div class="code-comparison">
            <!-- Before Code -->
            <div class="code-panel before">
              <div class="code-header">
                <h4>❌ Before: Manual Implementation</h4>
                <div class="code-stats">
                  <span class="stat"
                    >{{ comparison.metrics.linesOfCode.before }} lines</span
                  >
                  <span
                    class="stat complexity-{{
                      comparison.metrics.complexity.before
                    }}"
                  >
                    {{ comparison.metrics.complexity.before }} complexity
                  </span>
                </div>
              </div>
              <div class="code-content">
                <pre><code [innerHTML]="formatCode(comparison.beforeCode)"></code></pre>
              </div>
              <div class="code-footer">
                <span class="development-time">
                  ⏱️ Development Time:
                  {{ comparison.metrics.developmentTime.before }}
                </span>
              </div>
            </div>

            <!-- After Code -->
            <div class="code-panel after">
              <div class="code-header">
                <h4>✅ After: Declarative Decorators</h4>
                <div class="code-stats">
                  <span class="stat"
                    >{{ comparison.metrics.linesOfCode.after }} lines</span
                  >
                  <span
                    class="stat complexity-{{
                      comparison.metrics.complexity.after
                    }}"
                  >
                    {{ comparison.metrics.complexity.after }} complexity
                  </span>
                </div>
              </div>
              <div class="code-content">
                <pre><code [innerHTML]="formatCode(comparison.afterCode)"></code></pre>
              </div>
              <div class="code-footer">
                <span class="development-time">
                  ⏱️ Development Time:
                  {{ comparison.metrics.developmentTime.after }}
                </span>
              </div>
            </div>
          </div>

          <!-- Metrics Comparison -->
          <div class="metrics-comparison">
            <h4>📊 Impact Analysis</h4>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-icon">📝</div>
                <div class="metric-content">
                  <div class="metric-title">Lines of Code</div>
                  <div class="metric-comparison-values">
                    <span class="before-value">{{
                      comparison.metrics.linesOfCode.before
                    }}</span>
                    <span class="arrow">→</span>
                    <span class="after-value">{{
                      comparison.metrics.linesOfCode.after
                    }}</span>
                  </div>
                  <div class="metric-improvement">
                    {{ comparison.metrics.linesOfCode.reduction }}% reduction
                  </div>
                </div>
              </div>

              <div class="metric-card">
                <div class="metric-icon">🧠</div>
                <div class="metric-content">
                  <div class="metric-title">Maintainability</div>
                  <div class="metric-comparison-values">
                    <span class="before-value"
                      >{{ comparison.metrics.maintainability.before }}%</span
                    >
                    <span class="arrow">→</span>
                    <span class="after-value"
                      >{{ comparison.metrics.maintainability.after }}%</span
                    >
                  </div>
                  <div class="metric-improvement">
                    {{
                      comparison.metrics.maintainability.after -
                        comparison.metrics.maintainability.before
                    }}% improvement
                  </div>
                </div>
              </div>

              <div class="metric-card">
                <div class="metric-icon">🎯</div>
                <div class="metric-content">
                  <div class="metric-title">Complexity</div>
                  <div class="metric-comparison-values">
                    <span
                      class="before-value complexity-{{
                        comparison.metrics.complexity.before
                      }}"
                    >
                      {{ comparison.metrics.complexity.before }}
                    </span>
                    <span class="arrow">→</span>
                    <span
                      class="after-value complexity-{{
                        comparison.metrics.complexity.after
                      }}"
                    >
                      {{ comparison.metrics.complexity.after }}
                    </span>
                  </div>
                  <div class="metric-improvement">Significantly reduced</div>
                </div>
              </div>

              <div class="metric-card">
                <div class="metric-icon">⚡</div>
                <div class="metric-content">
                  <div class="metric-title">Development Speed</div>
                  <div class="metric-comparison-values">
                    <span class="before-value">{{
                      comparison.metrics.developmentTime.before
                    }}</span>
                    <span class="arrow">→</span>
                    <span class="after-value">{{
                      comparison.metrics.developmentTime.after
                    }}</span>
                  </div>
                  <div class="metric-improvement">5x faster</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        }
      </div>

      <!-- Performance Metrics Section -->
      <div class="performance-section">
        <div class="section-header">
          <h2>📈 Performance & Productivity Metrics</h2>
          <div class="metrics-filter">
            <button
              class="filter-btn"
              [class.active]="metricsView() === 'all'"
              (click)="setMetricsView('all')"
            >
              All Metrics
            </button>
            <button
              class="filter-btn"
              [class.active]="metricsView() === 'development'"
              (click)="setMetricsView('development')"
            >
              Development
            </button>
            <button
              class="filter-btn"
              [class.active]="metricsView() === 'performance'"
              (click)="setMetricsView('performance')"
            >
              Performance
            </button>
            <button
              class="filter-btn"
              [class.active]="metricsView() === 'quality'"
              (click)="setMetricsView('quality')"
            >
              Quality
            </button>
          </div>
        </div>

        <div class="performance-grid">
          @for (metric of filteredMetrics(); track metric.metric) {
          <div class="performance-card">
            <div class="performance-header">
              <div class="performance-category">{{ metric.category }}</div>
              <div class="performance-improvement">
                +{{ metric.improvement }}{{ metric.unit }}
              </div>
            </div>
            <h4 class="performance-title">{{ metric.metric }}</h4>
            <p class="performance-description">{{ metric.description }}</p>

            <div class="performance-comparison">
              <div class="performance-before">
                <span class="label">Before</span>
                <span class="value"
                  >{{ metric.beforeValue }}{{ metric.unit }}</span
                >
              </div>
              <div class="performance-arrow">→</div>
              <div class="performance-after">
                <span class="label">After</span>
                <span class="value"
                  >{{ metric.afterValue }}{{ metric.unit }}</span
                >
              </div>
            </div>

            <div class="improvement-bar">
              <div
                class="improvement-fill"
                [style.width.%]="getImprovementPercentage(metric)"
              ></div>
            </div>
          </div>
          }
        </div>
      </div>

      <!-- Interactive Decorator Explorer -->
      <div class="decorator-explorer">
        <div class="section-header">
          <h2>🎨 Interactive Decorator Explorer</h2>
          <p class="section-subtitle">
            Discover how decorators simplify complex AI application development
          </p>
        </div>

        <div class="decorator-grid">
          @for (decorator of decorators(); track decorator.name) {
          <div
            class="decorator-card"
            [class.expanded]="expandedDecorator() === decorator.name"
          >
            <div
              class="decorator-header"
              tabindex="0"
              (click)="toggleDecorator(decorator.name)"
              (keypress)="toggleDecorator(decorator.name)"
            >
              <div class="decorator-title">
                <span class="decorator-symbol">{{ decorator.symbol }}</span>
                <span class="decorator-name">{{ decorator.name }}</span>
              </div>
              <div class="decorator-toggle">
                {{ expandedDecorator() === decorator.name ? '−' : '+' }}
              </div>
            </div>

            <div class="decorator-content">
              <p class="decorator-description">{{ decorator.description }}</p>

              <div class="decorator-features">
                <h5>Key Features:</h5>
                <ul>
                  @for (feature of decorator.features; track feature) {
                  <li>{{ feature }}</li>
                  }
                </ul>
              </div>

              <div class="decorator-example">
                <h5>Usage Example:</h5>
                <pre><code [innerHTML]="formatCode(decorator.example)"></code></pre>
              </div>

              <div class="decorator-benefits">
                <h5>Benefits:</h5>
                <div class="benefits-list">
                  @for (benefit of decorator.benefits; track benefit) {
                  <span class="benefit-tag">{{ benefit }}</span>
                  }
                </div>
              </div>
            </div>
          </div>
          }
        </div>
      </div>

      <!-- Call to Action -->
      <div class="cta-section">
        <div class="cta-content">
          <h2>🚀 Ready to Transform Your Development?</h2>
          <p class="cta-description">
            Experience enterprise-grade AI application development with 70% less
            code and 5x faster delivery
          </p>

          <div class="cta-buttons">
            <button class="cta-btn primary" (click)="startTrial()">
              <span class="btn-icon">🎯</span>
              Start Free Trial
            </button>
            <button class="cta-btn secondary" (click)="viewDocumentation()">
              <span class="btn-icon">📚</span>
              View Documentation
            </button>
            <button class="cta-btn accent" (click)="scheduleDemo()">
              <span class="btn-icon">📅</span>
              Schedule Demo
            </button>
          </div>

          <div class="cta-stats">
            <div class="cta-stat">
              <div class="stat-number">1000+</div>
              <div class="stat-label">Developers Using</div>
            </div>
            <div class="cta-stat">
              <div class="stat-number">50+</div>
              <div class="stat-label">Enterprise Clients</div>
            </div>
            <div class="cta-stat">
              <div class="stat-number">99.9%</div>
              <div class="stat-label">Uptime SLA</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .developer-experience {
        min-height: 100vh;
        background: linear-gradient(
          135deg,
          #0f0c29 0%,
          #302b63 50%,
          #24243e 100%
        );
        color: white;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      }

      .hero-section {
        text-align: center;
        padding: 60px 20px;
        background: linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.1));
      }

      .hero-section h1 {
        font-size: 3.5rem;
        font-weight: 800;
        margin-bottom: 20px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        background: linear-gradient(45deg, #667eea, #764ba2);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .hero-subtitle {
        font-size: 1.3rem;
        opacity: 0.9;
        margin-bottom: 40px;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
        line-height: 1.6;
      }

      .impact-metrics {
        display: flex;
        justify-content: center;
        gap: 30px;
        flex-wrap: wrap;
      }

      .impact-card {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        padding: 30px;
        text-align: center;
        min-width: 200px;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }

      .impact-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      }

      .impact-card.primary {
        border-color: rgba(34, 197, 94, 0.5);
        background: linear-gradient(
          135deg,
          rgba(34, 197, 94, 0.1),
          rgba(34, 197, 94, 0.05)
        );
      }

      .impact-card.success {
        border-color: rgba(59, 130, 246, 0.5);
        background: linear-gradient(
          135deg,
          rgba(59, 130, 246, 0.1),
          rgba(59, 130, 246, 0.05)
        );
      }

      .impact-card.accent {
        border-color: rgba(168, 85, 247, 0.5);
        background: linear-gradient(
          135deg,
          rgba(168, 85, 247, 0.1),
          rgba(168, 85, 247, 0.05)
        );
      }

      .impact-value {
        font-size: 3rem;
        font-weight: 800;
        line-height: 1;
        background: linear-gradient(45deg, #22c55e, #16a34a);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .impact-label {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 8px 0 4px 0;
      }

      .impact-detail {
        font-size: 0.9rem;
        opacity: 0.8;
      }

      .category-nav {
        display: flex;
        justify-content: center;
        gap: 16px;
        padding: 40px 20px;
        flex-wrap: wrap;
      }

      .category-btn {
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
        min-width: 180px;
      }

      .category-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
      }

      .category-btn.active {
        background: rgba(34, 197, 94, 0.2);
        border-color: rgba(34, 197, 94, 0.5);
        box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
      }

      .category-icon {
        font-size: 1.5rem;
      }

      .category-name {
        font-weight: 600;
        font-size: 1rem;
      }

      .category-count {
        font-size: 0.8rem;
        opacity: 0.8;
      }

      .comparison-section {
        padding: 0 20px 60px 20px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        flex-wrap: wrap;
        gap: 20px;
      }

      .section-header h2 {
        font-size: 2.2rem;
        font-weight: 700;
        margin: 0;
      }

      .comparison-selector select {
        padding: 10px 16px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        color: white;
        font-size: 0.9rem;
        min-width: 250px;
      }

      .comparison-selector select option {
        background: #1a1a1a;
        color: white;
      }

      .comparison-container {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 30px;
      }

      .comparison-info {
        margin-bottom: 30px;
      }

      .comparison-info h3 {
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0 0 10px 0;
      }

      .comparison-description {
        font-size: 1rem;
        opacity: 0.9;
        line-height: 1.6;
        margin-bottom: 20px;
      }

      .improvement-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .improvement-tag {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 0.8rem;
        font-weight: 500;
      }

      .code-comparison {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 30px;
      }

      .code-panel {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .code-panel.before {
        border-color: rgba(239, 68, 68, 0.3);
      }

      .code-panel.after {
        border-color: rgba(34, 197, 94, 0.3);
      }

      .code-header {
        padding: 16px 20px;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .code-header h4 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }

      .code-stats {
        display: flex;
        gap: 12px;
        font-size: 0.8rem;
      }

      .stat {
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
      }

      .complexity-high {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }

      .complexity-medium {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
      }

      .complexity-low {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
      }

      .code-content {
        max-height: 400px;
        overflow-y: auto;
      }

      .code-content pre {
        margin: 0;
        padding: 20px;
        font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
        font-size: 0.85rem;
        line-height: 1.5;
        background: none;
      }

      .code-content code {
        color: #e2e8f0;
      }

      .code-footer {
        padding: 12px 20px;
        background: rgba(255, 255, 255, 0.05);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 0.8rem;
        opacity: 0.8;
      }

      .metrics-comparison {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 20px;
      }

      .metrics-comparison h4 {
        margin: 0 0 20px 0;
        font-size: 1.2rem;
        font-weight: 600;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
      }

      .metric-card {
        display: flex;
        align-items: center;
        gap: 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 16px;
      }

      .metric-icon {
        font-size: 1.5rem;
        min-width: 24px;
      }

      .metric-content {
        flex: 1;
      }

      .metric-title {
        font-size: 0.9rem;
        font-weight: 500;
        margin-bottom: 4px;
      }

      .metric-comparison-values {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }

      .before-value {
        color: #ef4444;
        font-weight: 500;
      }

      .after-value {
        color: #22c55e;
        font-weight: 500;
      }

      .arrow {
        opacity: 0.6;
      }

      .metric-improvement {
        font-size: 0.8rem;
        color: #22c55e;
        font-weight: 500;
      }

      .performance-section {
        padding: 60px 20px;
        background: rgba(0, 0, 0, 0.2);
      }

      .metrics-filter {
        display: flex;
        gap: 8px;
      }

      .filter-btn {
        padding: 8px 16px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        color: white;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .filter-btn.active {
        background: rgba(34, 197, 94, 0.2);
        border-color: rgba(34, 197, 94, 0.5);
        color: #22c55e;
      }

      .performance-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .performance-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 20px;
        transition: transform 0.3s ease;
      }

      .performance-card:hover {
        transform: translateY(-2px);
        border-color: rgba(34, 197, 94, 0.3);
      }

      .performance-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .performance-category {
        background: rgba(59, 130, 246, 0.2);
        color: #3b82f6;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 500;
      }

      .performance-improvement {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 600;
      }

      .performance-title {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0 0 8px 0;
      }

      .performance-description {
        font-size: 0.9rem;
        opacity: 0.8;
        line-height: 1.4;
        margin-bottom: 16px;
      }

      .performance-comparison {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .performance-before,
      .performance-after {
        text-align: center;
      }

      .performance-before .label {
        color: #ef4444;
      }

      .performance-after .label {
        color: #22c55e;
      }

      .performance-before .value,
      .performance-after .value {
        display: block;
        font-weight: 600;
        font-size: 1.1rem;
        margin-top: 4px;
      }

      .performance-arrow {
        font-size: 1.2rem;
        opacity: 0.6;
      }

      .improvement-bar {
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
      }

      .improvement-fill {
        height: 100%;
        background: linear-gradient(90deg, #22c55e, #16a34a);
        transition: width 0.3s ease;
      }

      .decorator-explorer {
        padding: 60px 20px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .section-subtitle {
        text-align: center;
        font-size: 1.1rem;
        opacity: 0.8;
        margin-bottom: 40px;
      }

      .decorator-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 20px;
      }

      .decorator-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        overflow: hidden;
        transition: all 0.3s ease;
      }

      .decorator-card.expanded {
        border-color: rgba(34, 197, 94, 0.3);
        box-shadow: 0 8px 32px rgba(34, 197, 94, 0.1);
      }

      .decorator-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.05);
        transition: background 0.3s ease;
      }

      .decorator-header:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .decorator-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .decorator-symbol {
        font-size: 1.2rem;
        color: #22c55e;
      }

      .decorator-name {
        font-size: 1.1rem;
        font-weight: 600;
      }

      .decorator-toggle {
        font-size: 1.2rem;
        font-weight: 600;
        color: #22c55e;
      }

      .decorator-content {
        padding: 20px;
        display: none;
      }

      .decorator-card.expanded .decorator-content {
        display: block;
      }

      .decorator-description {
        font-size: 0.95rem;
        line-height: 1.6;
        margin-bottom: 20px;
        opacity: 0.9;
      }

      .decorator-features h5,
      .decorator-example h5,
      .decorator-benefits h5 {
        font-size: 0.9rem;
        font-weight: 600;
        margin: 0 0 8px 0;
        color: #22c55e;
      }

      .decorator-features ul {
        margin: 0 0 20px 0;
        padding-left: 16px;
      }

      .decorator-features li {
        font-size: 0.85rem;
        line-height: 1.4;
        margin-bottom: 4px;
      }

      .decorator-example {
        margin-bottom: 20px;
      }

      .decorator-example pre {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 6px;
        padding: 12px;
        margin: 0;
        font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
        font-size: 0.8rem;
        line-height: 1.4;
        overflow-x: auto;
      }

      .benefits-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .benefit-tag {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 500;
      }

      .cta-section {
        padding: 80px 20px;
        background: linear-gradient(
          135deg,
          rgba(34, 197, 94, 0.1),
          rgba(59, 130, 246, 0.1)
        );
        text-align: center;
      }

      .cta-content {
        max-width: 800px;
        margin: 0 auto;
      }

      .cta-content h2 {
        font-size: 2.5rem;
        font-weight: 800;
        margin-bottom: 20px;
      }

      .cta-description {
        font-size: 1.2rem;
        opacity: 0.9;
        line-height: 1.6;
        margin-bottom: 40px;
      }

      .cta-buttons {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-bottom: 60px;
        flex-wrap: wrap;
      }

      .cta-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px 24px;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        min-width: 160px;
      }

      .cta-btn.primary {
        background: linear-gradient(135deg, #22c55e, #16a34a);
        color: white;
      }

      .cta-btn.secondary {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }

      .cta-btn.accent {
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: white;
      }

      .cta-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      }

      .cta-stats {
        display: flex;
        justify-content: center;
        gap: 60px;
        flex-wrap: wrap;
      }

      .cta-stat {
        text-align: center;
      }

      .stat-number {
        font-size: 2rem;
        font-weight: 800;
        color: #22c55e;
        line-height: 1;
      }

      .stat-label {
        font-size: 0.9rem;
        opacity: 0.8;
        margin-top: 4px;
      }

      @media (max-width: 1024px) {
        .code-comparison {
          grid-template-columns: 1fr;
        }

        .metrics-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 768px) {
        .hero-section h1 {
          font-size: 2.5rem;
        }

        .impact-metrics {
          flex-direction: column;
          align-items: center;
        }

        .category-nav {
          flex-direction: column;
          align-items: center;
        }

        .section-header {
          flex-direction: column;
          text-align: center;
        }

        .decorator-grid {
          grid-template-columns: 1fr;
        }

        .cta-buttons {
          flex-direction: column;
          align-items: center;
        }

        .cta-stats {
          flex-direction: column;
          gap: 30px;
        }
      }
    `,
  ],
})
export class DeveloperExperienceComponent implements OnInit {
  // State
  readonly selectedCategory = signal<string>('agent');
  readonly selectedComparisonIndex = signal(0);
  readonly metricsView = signal<
    'all' | 'development' | 'performance' | 'quality'
  >('all');
  readonly expandedDecorator = signal<string | null>(null);

  // Categories
  readonly categories = signal([
    { id: 'agent', name: 'Agent Development', icon: '🤖', examples: 3 },
    { id: 'workflow', name: 'Workflow Orchestration', icon: '🔄', examples: 4 },
    { id: 'streaming', name: 'Real-time Streaming', icon: '📡', examples: 2 },
    { id: 'approval', name: 'Human-in-the-Loop', icon: '👤', examples: 2 },
    {
      id: 'coordination',
      name: 'Multi-Agent Coordination',
      icon: '🐝',
      examples: 3,
    },
  ]);

  // Code comparisons
  readonly codeComparisons = signal<CodeComparison[]>([
    {
      title: 'Agent Creation with Tools',
      description:
        'Creating an intelligent agent with tool integration capabilities',
      category: 'agent',
      beforeCode: `
// Manual agent implementation - 120+ lines of boilerplate
class GitHubAnalyzerAgent {
  private llm: BaseLLM;
  private tools: Array<Tool>;
  private memory: VectorStore;
  private checkpoints: CheckpointStore;

  constructor(config: AgentConfig) {
    this.llm = new OpenAI({ apiKey: config.apiKey });
    this.tools = this.initializeTools();
    this.memory = new ChromaVectorStore(config.vectorConfig);
    this.checkpoints = new RedisCheckpointStore(config.redisConfig);
  }

  private initializeTools(): Array<Tool> {
    const tools = [];

    // GitHub API tool
    tools.push(new Tool({
      name: 'github_analyzer',
      description: 'Analyze GitHub repositories',
      func: async (input: string) => {
        try {
          const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
          const repos = await octokit.rest.repos.listForUser({ username: input });

          const analysis = {
            repositories: repos.data.length,
            languages: new Set(),
            totalStars: 0,
            recentActivity: []
          };

          for (const repo of repos.data.slice(0, 10)) {
            analysis.totalStars += repo.stargazers_count;
            if (repo.language) analysis.languages.add(repo.language);

            const commits = await octokit.rest.repos.listCommits({
              owner: repo.owner.login,
              repo: repo.name,
              per_page: 5
            });

            analysis.recentActivity.push({
              repo: repo.name,
              commits: commits.data.length,
              lastCommit: commits.data[0]?.commit.author.date
            });
          }

          return JSON.stringify(analysis);
        } catch (error) {
          throw new Error(\`GitHub analysis failed: \${error.message}\`);
        }
      }
    }));

    return tools;
  }

  async execute(input: string): Promise<string> {
    // Save checkpoint
    const checkpointId = await this.checkpoints.save({
      input,
      timestamp: new Date(),
      agentState: 'executing'
    });

    try {
      // Retrieve relevant memories
      const memories = await this.memory.similaritySearch(input, 5);
      const context = memories.map(m => m.pageContent).join('\\n');

      // Create chain with tools
      const agent = new AgentExecutor({
        agent: await createReactAgent({
          llm: this.llm,
          tools: this.tools,
          prompt: ChatPromptTemplate.fromMessages([
            ['system', 'You are a GitHub repository analyzer. Use tools when needed.'],
            ['human', '{input}'],
            ['placeholder', '{agent_scratchpad}']
          ])
        }),
        tools: this.tools,
        verbose: true,
        maxIterations: 5,
        returnIntermediateSteps: true
      });

      const result = await agent.invoke({
        input: \`Context: \${context}\\n\\nQuery: \${input}\`
      });

      // Store in memory
      await this.memory.addDocuments([{
        pageContent: result.output,
        metadata: {
          timestamp: new Date(),
          type: 'analysis_result',
          checkpointId
        }
      }]);

      // Update checkpoint
      await this.checkpoints.update(checkpointId, {
        result: result.output,
        agentState: 'completed'
      });

      return result.output;

    } catch (error) {
      await this.checkpoints.update(checkpointId, {
        error: error.message,
        agentState: 'error'
      });

      throw error;
    }
  }
}
      `,
      afterCode: `
// Declarative agent with decorators - 25 lines
@Agent({
  name: 'github-analyzer',
  model: 'gpt-4',
  temperature: 0.1,
  description: 'Analyzes GitHub repositories and extracts development insights',
  memory: {
    type: 'hybrid',
    vectorStore: 'chromadb',
    collections: ['dev_achievements', 'skills_profile']
  },
  checkpoints: {
    adapter: 'redis',
    saveInterval: 'auto'
  }
})
export class GitHubAnalyzerAgent {

  @Tool({
    description: 'Analyze GitHub repositories and extract development insights',
    schema: z.object({
      username: z.string().describe('GitHub username to analyze')
    })
  })
  async analyzeRepositories(username: string): Promise<any> {
    // Tool implementation automatically handled
    return await this.github.analyzeUser(username);
  }

  @Task({
    dependencies: ['analyzeRepositories'],
    retries: 3,
    timeout: 30000
  })
  async execute(input: string): Promise<string> {
    // Memory retrieval, checkpointing, and error handling automatic
    const analysis = await this.analyzeRepositories(input);

    return \`Based on GitHub analysis: \${this.formatAnalysis(analysis)}\`;
  }

  private formatAnalysis(analysis: any): string {
    return \`Analyzed \${analysis.repositories} repositories with \${analysis.totalStars} total stars\`;
  }
}
      `,
      improvements: [
        'Automatic tool registration',
        'Built-in memory management',
        'Declarative checkpointing',
        'Error handling & retries',
        'Type-safe schema validation',
      ],
      metrics: {
        linesOfCode: { before: 120, after: 25, reduction: 79 },
        complexity: { before: 'high', after: 'low' },
        maintainability: { before: 45, after: 92 },
        developmentTime: { before: '2-3 days', after: '2-3 hours' },
      },
    },
    {
      title: 'Multi-Agent Workflow Coordination',
      description:
        'Orchestrating multiple agents in a supervisor pattern with real-time streaming',
      category: 'workflow',
      beforeCode: `
// Manual workflow implementation - 200+ lines
class DevBrandWorkflow {
  private agents: Map<string, BaseAgent>;
  private coordinator: WorkflowCoordinator;
  private streaming: StreamingManager;
  private memory: SharedMemory;

  constructor() {
    this.agents = new Map();
    this.coordinator = new WorkflowCoordinator();
    this.streaming = new StreamingManager();
    this.memory = new SharedMemory();
    this.initializeAgents();
  }

  private initializeAgents() {
    this.agents.set('github-analyzer', new GitHubAnalyzerAgent());
    this.agents.set('content-creator', new ContentCreatorAgent());
    this.agents.set('brand-strategist', new BrandStrategistAgent());
  }

  async execute(input: string): Promise<WorkflowResult> {
    const executionId = uuidv4();
    const context = new ExecutionContext(executionId);

    try {
      // Initialize streaming
      this.streaming.startExecution(executionId);

      // Step 1: GitHub Analysis
      this.streaming.emit('step_start', {
        step: 'github_analysis',
        agent: 'github-analyzer'
      });

      const analysisResult = await this.coordinator.executeAgent(
        this.agents.get('github-analyzer')!,
        input,
        context
      );

      await this.memory.store('analysis', analysisResult, executionId);

      this.streaming.emit('step_complete', {
        step: 'github_analysis',
        result: analysisResult
      });

      // Step 2: Strategy Development
      this.streaming.emit('step_start', {
        step: 'strategy_development',
        agent: 'brand-strategist'
      });

      const strategyInput = {
        analysis: analysisResult,
        originalQuery: input
      };

      const strategyResult = await this.coordinator.executeAgent(
        this.agents.get('brand-strategist')!,
        JSON.stringify(strategyInput),
        context
      );

      await this.memory.store('strategy', strategyResult, executionId);

      this.streaming.emit('step_complete', {
        step: 'strategy_development',
        result: strategyResult
      });

      // Step 3: Content Creation
      this.streaming.emit('step_start', {
        step: 'content_creation',
        agent: 'content-creator'
      });

      const contentInput = {
        analysis: analysisResult,
        strategy: strategyResult,
        originalQuery: input
      };

      const contentResult = await this.coordinator.executeAgent(
        this.agents.get('content-creator')!,
        JSON.stringify(contentInput),
        context
      );

      await this.memory.store('content', contentResult, executionId);

      this.streaming.emit('step_complete', {
        step: 'content_creation',
        result: contentResult
      });

      // Compile final result
      const finalResult = {
        executionId,
        analysis: analysisResult,
        strategy: strategyResult,
        content: contentResult,
        summary: this.generateSummary(analysisResult, strategyResult, contentResult)
      };

      this.streaming.emit('workflow_complete', { result: finalResult });

      return finalResult;

    } catch (error) {
      this.streaming.emit('workflow_error', { error: error.message });
      throw error;
    }
  }

  private generateSummary(analysis: any, strategy: any, content: any): string {
    // Complex summary generation logic
    return \`Workflow completed with analysis, strategy, and content generation\`;
  }
}
      `,
      afterCode: `
// Declarative workflow with streaming - 45 lines
@Workflow({
  name: 'devbrand-supervisor',
  pattern: 'supervisor',
  streaming: {
    enabled: true,
    events: ['step_progress', 'agent_thinking', 'tool_usage'],
    realTime: true
  },
  memory: {
    shared: true,
    persistence: 'redis'
  }
})
export class DevBrandSupervisorWorkflow {

  @Entrypoint({
    timeout: 300000,
    retries: 2
  })
  async initializeShowcase(input: WorkflowInput): Promise<WorkflowState> {
    return {
      input: input.query,
      userId: input.userId,
      sessionId: input.sessionId,
      phase: 'initialization'
    };
  }

  @Task({
    agent: 'github-analyzer',
    dependencies: [],
    streaming: true
  })
  @StreamProgress({ milestones: ['repo_fetch', 'analysis', 'skills_extraction'] })
  async analyzeGitHub(state: WorkflowState): Promise<WorkflowState> {
    // Agent execution and progress tracking automatic
    return { ...state, analysis: await this.executeAgent('github-analyzer', state.input) };
  }

  @Task({
    agent: 'brand-strategist',
    dependencies: ['analyzeGitHub']
  })
  @StreamToken({ filterSensitive: true })
  async developStrategy(state: WorkflowState): Promise<WorkflowState> {
    const strategy = await this.executeAgent('brand-strategist', {
      analysis: state.analysis,
      query: state.input
    });
    return { ...state, strategy };
  }

  @Task({
    agent: 'content-creator',
    dependencies: ['developStrategy']
  })
  @StreamEvent({ eventTypes: ['content_generation', 'platform_optimization'] })
  async createContent(state: WorkflowState): Promise<WorkflowState> {
    const content = await this.executeAgent('content-creator', {
      analysis: state.analysis,
      strategy: state.strategy
    });
    return { ...state, content, phase: 'completed' };
  }
}
      `,
      improvements: [
        'Declarative task dependencies',
        'Automatic streaming integration',
        'Built-in progress tracking',
        'Memory management handled',
        'Error recovery & retries',
      ],
      metrics: {
        linesOfCode: { before: 200, after: 45, reduction: 78 },
        complexity: { before: 'high', after: 'medium' },
        maintainability: { before: 35, after: 88 },
        developmentTime: { before: '1-2 weeks', after: '2-3 days' },
      },
    },
    {
      title: 'Real-time Streaming Implementation',
      description:
        'Implementing WebSocket streaming with progress tracking and token-level updates',
      category: 'streaming',
      beforeCode: `
// Manual streaming setup - 150+ lines
class StreamingService {
  private io: Server;
  private clients: Map<string, Socket>;
  private progressTrackers: Map<string, ProgressTracker>;

  constructor(httpServer: any) {
    this.io = new Server(httpServer, {
      cors: { origin: "*" }
    });
    this.clients = new Map();
    this.progressTrackers = new Map();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      this.clients.set(socket.id, socket);

      socket.on('join_room', (data) => {
        socket.join(data.room);
        socket.emit('joined', { room: data.room });
      });

      socket.on('start_workflow', async (data) => {
        const progressTracker = new ProgressTracker(data.workflowId);
        this.progressTrackers.set(data.workflowId, progressTracker);

        try {
          await this.executeWorkflowWithStreaming(data, socket);
        } catch (error) {
          socket.emit('workflow_error', { error: error.message });
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        this.clients.delete(socket.id);
      });
    });
  }

  private async executeWorkflowWithStreaming(data: any, socket: Socket) {
    const { workflowId, input } = data;
    const progress = this.progressTrackers.get(workflowId)!;

    // Step 1: GitHub Analysis
    socket.emit('step_start', {
      step: 'github_analysis',
      progress: 0,
      eta: '~2 minutes'
    });

    const analyzer = new GitHubAnalyzerAgent();

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      progress.increment(10);
      socket.emit('progress_update', {
        step: 'github_analysis',
        progress: progress.getPercent(),
        message: 'Analyzing repositories...'
      });
    }, 1000);

    try {
      const analysisResult = await analyzer.execute(input);
      clearInterval(progressInterval);

      socket.emit('step_complete', {
        step: 'github_analysis',
        result: analysisResult,
        progress: 33
      });

      // Step 2: Strategy Development
      socket.emit('step_start', {
        step: 'strategy_development',
        progress: 33,
        eta: '~3 minutes'
      });

      const strategist = new BrandStrategistAgent();

      // Token-level streaming for LLM responses
      const streamingResponse = await strategist.executeWithStreaming(
        { analysis: analysisResult, query: input },
        (token: string) => {
          socket.emit('token_stream', {
            step: 'strategy_development',
            token,
            accumulated: strategist.getAccumulatedResponse()
          });
        }
      );

      socket.emit('step_complete', {
        step: 'strategy_development',
        result: streamingResponse,
        progress: 66
      });

      // Step 3: Content Creation
      socket.emit('step_start', {
        step: 'content_creation',
        progress: 66,
        eta: '~2 minutes'
      });

      const contentCreator = new ContentCreatorAgent();
      const contentResult = await contentCreator.execute({
        analysis: analysisResult,
        strategy: streamingResponse
      });

      socket.emit('step_complete', {
        step: 'content_creation',
        result: contentResult,
        progress: 100
      });

      socket.emit('workflow_complete', {
        workflowId,
        finalResult: {
          analysis: analysisResult,
          strategy: streamingResponse,
          content: contentResult
        }
      });

    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }

  broadcastToRoom(room: string, event: string, data: any) {
    this.io.to(room).emit(event, data);
  }
}

class ProgressTracker {
  private current: number = 0;
  private total: number = 100;

  constructor(private id: string) {}

  increment(amount: number) {
    this.current = Math.min(this.current + amount, this.total);
  }

  getPercent(): number {
    return Math.round((this.current / this.total) * 100);
  }
}
      `,
      afterCode: `
// Declarative streaming with decorators - 30 lines
@Workflow({
  name: 'devbrand-streaming',
  streaming: {
    enabled: true,
    websocket: true,
    realTime: true
  }
})
export class DevBrandStreamingWorkflow {

  @Task({ agent: 'github-analyzer' })
  @StreamProgress({
    milestones: ['repo_fetch', 'analysis', 'skills_extraction'],
    estimatedDuration: 120000 // 2 minutes
  })
  async analyzeGitHub(state: WorkflowState): Promise<WorkflowState> {
    // Progress tracking and WebSocket emission automatic
    const result = await this.executeAgent('github-analyzer', state.input);
    return { ...state, analysis: result };
  }

  @Task({
    agent: 'brand-strategist',
    dependencies: ['analyzeGitHub']
  })
  @StreamToken({
    tokenLevel: true,
    filterSensitive: true,
    bufferSize: 10
  })
  async developStrategy(state: WorkflowState): Promise<WorkflowState> {
    // Token-level streaming automatically configured
    const strategy = await this.executeAgent('brand-strategist', {
      analysis: state.analysis,
      query: state.input
    });
    return { ...state, strategy };
  }

  @Task({
    agent: 'content-creator',
    dependencies: ['developStrategy']
  })
  @StreamEvent({
    eventTypes: ['content_generation', 'platform_optimization'],
    customEvents: true
  })
  @StreamAll() // Combines token + event + progress streaming
  async createContent(state: WorkflowState): Promise<WorkflowState> {
    const content = await this.executeAgent('content-creator', {
      analysis: state.analysis,
      strategy: state.strategy
    });
    return { ...state, content, phase: 'completed' };
  }
}
      `,
      improvements: [
        'Zero WebSocket boilerplate',
        'Automatic progress calculation',
        'Built-in token streaming',
        'Event broadcasting handled',
        'Connection management automatic',
      ],
      metrics: {
        linesOfCode: { before: 150, after: 30, reduction: 80 },
        complexity: { before: 'high', after: 'low' },
        maintainability: { before: 40, after: 90 },
        developmentTime: { before: '1 week', after: '4-6 hours' },
      },
    },
  ]);

  // Performance metrics
  readonly performanceMetrics = signal<PerformanceMetric[]>([
    {
      category: 'Development',
      metric: 'Time to First Working Agent',
      beforeValue: 240,
      afterValue: 45,
      unit: ' minutes',
      improvement: 81,
      description: 'Time from project setup to having a functional AI agent',
    },
    {
      category: 'Development',
      metric: 'Workflow Configuration',
      beforeValue: 480,
      afterValue: 60,
      unit: ' minutes',
      improvement: 87,
      description: 'Time to configure complex multi-agent workflows',
    },
    {
      category: 'Performance',
      metric: 'Memory Management Overhead',
      beforeValue: 150,
      afterValue: 25,
      unit: 'MB',
      improvement: 83,
      description: 'Additional memory usage for context and state management',
    },
    {
      category: 'Performance',
      metric: 'Cold Start Time',
      beforeValue: 3500,
      afterValue: 800,
      unit: 'ms',
      improvement: 77,
      description: 'Time to initialize and start workflow execution',
    },
    {
      category: 'Quality',
      metric: 'Bug Reports per Sprint',
      beforeValue: 12,
      afterValue: 3,
      unit: '',
      improvement: 75,
      description: 'Number of bugs reported during development cycles',
    },
    {
      category: 'Quality',
      metric: 'Code Review Time',
      beforeValue: 180,
      afterValue: 45,
      unit: ' minutes',
      improvement: 75,
      description: 'Average time spent in code review per feature',
    },
  ]);

  // Decorators
  readonly decorators = signal([
    {
      name: '@Agent',
      symbol: '🤖',
      description:
        'Declaratively define AI agents with automatic tool integration, memory management, and configuration',
      features: [
        'Automatic LLM integration with multiple providers',
        'Built-in memory and context management',
        'Tool discovery and registration',
        'Configuration through metadata',
      ],
      example: `@Agent({
  name: 'content-specialist',
  model: 'gpt-4',
  temperature: 0.7,
  memory: { type: 'vector', persistent: true },
  tools: ['web-search', 'content-analyzer']
})
export class ContentSpecialistAgent {
  // Implementation automatically handled
}`,
      benefits: [
        'Zero boilerplate',
        'Type safety',
        'Auto-discovery',
        'Memory handling',
      ],
    },
    {
      name: '@Workflow',
      symbol: '🔄',
      description:
        'Define complex multi-agent workflows with dependency management, streaming, and checkpointing',
      features: [
        'Declarative task dependencies',
        'Built-in streaming and real-time updates',
        'Automatic state persistence',
        'Error handling and recovery',
      ],
      example: `@Workflow({
  name: 'content-pipeline',
  pattern: 'supervisor',
  streaming: { enabled: true, realTime: true },
  checkpoints: { interval: 'auto' }
})
export class ContentPipelineWorkflow {
  // Workflow logic with automatic orchestration
}`,
      benefits: [
        'Visual dependencies',
        'Auto-streaming',
        'State recovery',
        'Monitoring',
      ],
    },
    {
      name: '@StreamToken',
      symbol: '📡',
      description:
        'Enable real-time token-level streaming for LLM responses with automatic WebSocket integration',
      features: [
        'Token-level response streaming',
        'Automatic WebSocket management',
        'Sensitive content filtering',
        'Buffer size optimization',
      ],
      example: `@Task({ agent: 'writer' })
@StreamToken({
  tokenLevel: true,
  filterSensitive: true,
  bufferSize: 10
})
async generateContent(state: WorkflowState): Promise<WorkflowState> {
  // Streaming automatically configured
  return await this.executeAgent('writer', state.input);
}`,
      benefits: [
        'Real-time updates',
        'Auto-filtering',
        'WebSocket handling',
        'Buffer control',
      ],
    },
    {
      name: '@RequiresApproval',
      symbol: '👤',
      description:
        'Implement human-in-the-loop workflows with risk assessment and approval management',
      features: [
        'Automatic approval workflow integration',
        'Risk level assessment',
        'Escalation strategies',
        'Timeout and fallback handling',
      ],
      example: `@Task({ agent: 'content-publisher' })
@RequiresApproval({
  riskLevel: ApprovalRiskLevel.MEDIUM,
  approvers: ['content-manager'],
  timeout: 3600000, // 1 hour
  escalation: EscalationStrategy.CHAIN
})
async publishContent(state: WorkflowState): Promise<WorkflowState> {
  // Approval workflow automatic
  return await this.executeAgent('publisher', state.content);
}`,
      benefits: [
        'Risk assessment',
        'Auto-escalation',
        'Timeout handling',
        'Audit trails',
      ],
    },
  ]);

  // Computed properties
  readonly filteredComparisons = computed(() => {
    const category = this.selectedCategory();
    return this.codeComparisons().filter((comp) => comp.category === category);
  });

  readonly currentComparison = computed(() => {
    const comparisons = this.filteredComparisons();
    const index = this.selectedComparisonIndex();
    return comparisons[index] || null;
  });

  readonly filteredMetrics = computed(() => {
    const view = this.metricsView();
    if (view === 'all') return this.performanceMetrics();
    return this.performanceMetrics().filter(
      (metric) => metric.category.toLowerCase() === view
    );
  });

  ngOnInit() {
    // Initialize with first comparison
    this.onComparisonChange();
  }

  selectCategory(category: string) {
    this.selectedCategory.set(category);
    this.selectedComparisonIndex.set(0);
  }

  onComparisonChange() {
    // Reset expanded state when comparison changes
    this.expandedDecorator.set(null);
  }

  setMetricsView(view: 'all' | 'development' | 'performance' | 'quality') {
    this.metricsView.set(view);
  }

  toggleDecorator(decoratorName: string) {
    const current = this.expandedDecorator();
    this.expandedDecorator.set(
      current === decoratorName ? null : decoratorName
    );
  }

  formatCode(code: string): string {
    // Basic syntax highlighting simulation
    return code
      .replace(
        /(@\w+)/g,
        '<span style="color: #22c55e; font-weight: 600;">$1</span>'
      )
      .replace(
        /(class|export|async|await|private|public|constructor)/g,
        '<span style="color: #3b82f6;">$1</span>'
      )
      .replace(
        /(string|number|boolean|Promise|any)/g,
        '<span style="color: #f59e0b;">$1</span>'
      )
      .replace(
        /(\/\/.*$)/gm,
        '<span style="color: #6b7280; font-style: italic;">$1</span>'
      );
  }

  getImprovementPercentage(metric: PerformanceMetric): number {
    return Math.min(metric.improvement, 100);
  }

  // Action methods
  startTrial() {
    console.log('Starting free trial...');
    // Implementation would redirect to trial signup
  }

  viewDocumentation() {
    console.log('Opening documentation...');
    // Implementation would open documentation
  }

  scheduleDemo() {
    console.log('Scheduling demo...');
    // Implementation would open demo scheduling
  }
}
