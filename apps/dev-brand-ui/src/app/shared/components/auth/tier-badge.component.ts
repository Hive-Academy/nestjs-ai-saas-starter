import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { UserTier } from '../../../core/models/auth';

@Component({
  selector: 'app-tier-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="tier-badge" [class]="tierClass()">
      {{ tier() | titlecase }}
    </span>
  `,
  styles: [
    `
      .tier-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.875rem;
        font-weight: 600;
      }

      .tier-free {
        background: #e5e7eb;
        color: #374151;
      }

      .tier-pro {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .tier-enterprise {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
      }
    `,
  ],
})
export class TierBadgeComponent {
  readonly tier = input<UserTier>('free');

  tierClass(): string {
    return `tier-${this.tier()}`;
  }
}
