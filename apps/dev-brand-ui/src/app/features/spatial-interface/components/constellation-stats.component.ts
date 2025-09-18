import {
  Component,
  input,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';

export interface ConstellationStats {
  agentCount: number;
  frameRate: number;
  activeEffects: number;
  isConnected: boolean;
}

/**
 * Constellation Stats Component
 * Displays real-time statistics about the 3D constellation
 */
@Component({
  selector: 'brand-constellation-stats',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="constellation-stats">
      <div class="stat-item">
        <span class="stat-label">Agents:</span>
        <span class="stat-value">{{ stats().agentCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">FPS:</span>
        <span class="stat-value" [class]="fpsClass()">
          {{ stats().frameRate }}
        </span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Effects:</span>
        <span class="stat-value">{{ stats().activeEffects }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Connected:</span>
        <span class="stat-value" [class]="connectionClass()">
          {{ connectionStatus() }}
        </span>
      </div>
    </div>
  `,
  styles: [
    `
      .constellation-stats {
        position: absolute;
        top: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 12px;
        color: white;
        font-family: monospace;
        font-size: 0.85em;
        backdrop-filter: blur(5px);
        pointer-events: auto;
      }

      .stat-item {
        display: flex;
        justify-content: space-between;
        margin: 4px 0;
        min-width: 120px;
      }

      .stat-label {
        color: #999;
      }

      .stat-value {
        color: #fff;
        font-weight: bold;
      }

      .stat-value.connected {
        color: #10b981;
      }

      .stat-value.warning {
        color: #ffaa00;
      }

      .stat-value.error {
        color: #ff4444;
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .constellation-stats {
          top: 10px;
          left: 10px;
          font-size: 0.8em;
        }
      }
    `,
  ],
})
export class ConstellationStatsComponent {
  stats = input.required<ConstellationStats>();

  // Computed properties for better performance
  fpsClass = computed(() => {
    const fps = this.stats().frameRate;
    if (fps < 30) return 'stat-value error';
    if (fps < 45) return 'stat-value warning';
    return 'stat-value';
  });

  connectionClass = computed(() => {
    return this.stats().isConnected ? 'stat-value connected' : 'stat-value';
  });

  connectionStatus = computed(() => {
    return this.stats().isConnected ? 'Yes' : 'No';
  });
}
