/**
 * ProgressIndicatorComponent
 *
 * Displays custom progress events with percentage, stage, and message.
 * Used for visualizing agent workflow progress in real-time.
 *
 * Features:
 * - Progress bar with smooth animations
 * - Agent name and status display
 * - Stage and message information
 * - Accessible ARIA attributes
 *
 * Usage:
 * ```html
 * <app-progress-indicator
 *   [progress]="{
 *     agent: 'researcher',
 *     stage: 'gathering-data',
 *     message: 'Fetching research papers...',
 *     percentage: 45
 *   }"
 * />
 * ```
 *
 * @remarks
 * Component Complexity Assessment: Level 1 (Simple)
 * - Signals: < 50 lines, single responsibility (display progress)
 * - Patterns Applied: Standalone component, input signals, accessible UI
 * - Patterns Rejected: Complex state management (not needed for simple display)
 * - SOLID Principles:
 *   - Single Responsibility: Only displays progress information
 *   - Composition: Self-contained, no sub-components needed
 */

import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ProgressData {
  readonly agent?: string;
  readonly stage?: string;
  readonly message?: string;
  readonly percentage?: number;
}

@Component({
  selector: 'app-progress-indicator',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (progress(); as p) {
    <div class="progress-container" role="status" aria-live="polite">
      <div class="progress-header">
        <span class="agent-name">{{ p.agent || 'Agent' }}</span>
        <span class="percentage" aria-label="Progress percentage">
          {{ p.percentage ?? 0 }}%
        </span>
      </div>
      <div
        class="progress-bar"
        role="progressbar"
        [attr.aria-valuenow]="p.percentage ?? 0"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="progress-fill" [style.width.%]="p.percentage ?? 0"></div>
      </div>
      @if (p.stage || p.message) {
      <div class="progress-message">
        @if (p.stage) {
        <span class="stage">{{ p.stage }}</span>
        } @if (p.message) {
        <span class="message">{{ p.message }}</span>
        }
      </div>
      }
    </div>
    }
  `,
  styles: [
    `
      .progress-container {
        padding: 12px;
        background: #f9fafb;
        border-radius: 8px;
        margin: 8px 0;
        border: 1px solid #e5e7eb;
      }

      .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .agent-name {
        font-weight: 600;
        color: #23272f;
        font-size: 14px;
        text-transform: capitalize;
      }

      .percentage {
        color: #6b7280;
        font-size: 13px;
        font-weight: 500;
      }

      .progress-bar {
        height: 8px;
        background: #e9ecef;
        border-radius: 4px;
        overflow: hidden;
        margin: 8px 0;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #6366f1, #8b5cf6);
        transition: width 0.3s ease;
        border-radius: 4px;
      }

      .progress-message {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 8px;
        font-size: 13px;
      }

      .stage {
        font-weight: 500;
        color: #6366f1;
        text-transform: capitalize;
      }

      .message {
        color: #71717a;
        line-height: 1.4;
      }
    `,
  ],
})
export class ProgressIndicatorComponent {
  readonly progress = input<ProgressData>();
}
