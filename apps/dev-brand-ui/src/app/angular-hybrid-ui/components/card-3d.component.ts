import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Content3DDirective } from '../directives/content-3d.directive';
import {
  ContentPriority,
  HybridElementConfig,
  HybridElement3D,
} from '../core/types/hybrid-ui.types';

/**
 * Card 3D Component
 * Pre-built card component optimized for 3D display
 * Follows content-first principles with intelligent scaling
 */
@Component({
  selector: 'card-3d',
  standalone: true,
  imports: [CommonModule, Content3DDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="card-3d"
      *content3D="cardConfig()"
      [class.interactive]="interactive"
      [class.elevated]="elevated"
      [class.priority-hero]="priority === 'HERO'"
      [class.priority-primary]="priority === 'PRIMARY'"
      [class.priority-secondary]="priority === 'SECONDARY'"
      (element3DReady)="onElement3DReady($event)"
      (element3DHover)="onElement3DHover($event)"
      (element3DClick)="onElement3DClick($event)"
    >
      <!-- Card Header -->
      @if (icon || title) {
      <header class="card-header">
        @if (icon) {
        <div class="card-icon" [innerHTML]="icon"></div>
        } @if (title) {
        <h3 class="card-title">{{ title }}</h3>
        }
      </header>
      }

      <!-- Card Content -->
      <div class="card-content">
        @if (description) {
        <p class="card-description">{{ description }}</p>
        }

        <!-- Content projection -->
        <ng-content></ng-content>

        <!-- Features list -->
        @if (features && features.length > 0) {
        <div class="card-features">
          <h4 class="features-title">{{ featuresTitle || 'Features' }}</h4>
          <ul class="features-list">
            @for (feature of features; track feature) {
            <li class="feature-item">{{ feature }}</li>
            }
          </ul>
        </div>
        }

        <!-- Tags -->
        @if (tags && tags.length > 0) {
        <div class="card-tags">
          @for (tag of tags; track tag) {
          <span class="card-tag">{{ tag }}</span>
          }
        </div>
        }
      </div>

      <!-- Card Footer -->
      @if (showFooter) {
      <footer class="card-footer">
        @if (metadata) {
        <div class="card-metadata">{{ metadata }}</div>
        }

        <!-- Action buttons -->
        @if (primaryAction || secondaryAction) {
        <div class="card-actions">
          @if (secondaryAction) {
          <button
            type="button"
            class="card-button secondary"
            (click)="onSecondaryAction()"
          >
            {{ secondaryAction }}
          </button>
          } @if (primaryAction) {
          <button
            type="button"
            class="card-button primary"
            (click)="onPrimaryAction()"
          >
            {{ primaryAction }}
          </button>
          }
        </div>
        }
      </footer>
      }
    </article>
  `,
  styles: [
    `
      .card-3d {
        display: flex;
        flex-direction: column;
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.1) 0%,
          rgba(255, 255, 255, 0.05) 100%
        );
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        padding: 24px;
        color: white;
        backdrop-filter: blur(20px);
        transition: all 0.3s ease;
        min-height: 200px;
        position: relative;
        overflow: hidden;
      }

      .card-3d::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(255, 255, 255, 0.3) 50%,
          transparent 100%
        );
      }

      .card-3d.interactive {
        cursor: pointer;
      }

      .card-3d.interactive:hover {
        border-color: rgba(59, 130, 246, 0.5);
        box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2);
      }

      .card-3d.elevated {
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }

      /* Priority-based styling */
      .card-3d.priority-hero {
        background: linear-gradient(
          135deg,
          rgba(139, 69, 19, 0.15) 0%,
          rgba(255, 215, 0, 0.1) 100%
        );
        border-color: rgba(255, 215, 0, 0.3);
      }

      .card-3d.priority-primary {
        background: linear-gradient(
          135deg,
          rgba(59, 130, 246, 0.15) 0%,
          rgba(147, 51, 234, 0.1) 100%
        );
        border-color: rgba(59, 130, 246, 0.3);
      }

      .card-3d.priority-secondary {
        background: linear-gradient(
          135deg,
          rgba(107, 114, 128, 0.15) 0%,
          rgba(75, 85, 99, 0.1) 100%
        );
      }

      /* Header */
      .card-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;
      }

      .card-icon {
        font-size: 32px;
        line-height: 1;
        flex-shrink: 0;
      }

      .card-title {
        font-size: 24px;
        font-weight: 700;
        margin: 0;
        color: rgba(255, 255, 255, 0.95);
        line-height: 1.2;
      }

      /* Content */
      .card-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .card-description {
        font-size: 16px;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.8);
        margin: 0;
      }

      /* Features */
      .card-features {
        margin-top: 8px;
      }

      .features-title {
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        margin: 0 0 8px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .features-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .feature-item {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.7);
        padding-left: 16px;
        position: relative;
      }

      .feature-item::before {
        content: '•';
        position: absolute;
        left: 0;
        color: rgba(59, 130, 246, 0.7);
        font-weight: bold;
      }

      /* Tags */
      .card-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
      }

      .card-tag {
        font-size: 12px;
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.8);
        padding: 4px 8px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      /* Footer */
      .card-footer {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .card-metadata {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .card-actions {
        display: flex;
        gap: 8px;
      }

      .card-button {
        padding: 8px 16px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .card-button.primary {
        background: rgba(59, 130, 246, 0.8);
        color: white;
      }

      .card-button.primary:hover {
        background: rgba(59, 130, 246, 1);
        transform: translateY(-1px);
      }

      .card-button.secondary {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .card-button.secondary:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
      }
    `,
  ],
})
export class Card3DComponent implements OnInit {
  // Content properties
  @Input() title?: string;
  @Input() description?: string;
  @Input() icon?: string; // HTML string or emoji
  @Input() features?: string[];
  @Input() featuresTitle?: string;
  @Input() tags?: string[];
  @Input() metadata?: string;

  // Behavior properties
  @Input() interactive = true;
  @Input() elevated = false;
  @Input() priority: keyof typeof ContentPriority = 'SECONDARY';

  // Actions
  @Input() primaryAction?: string;
  @Input() secondaryAction?: string;
  @Input() showFooter = false;

  // 3D Configuration
  @Input() decoration?: HybridElementConfig['decoration'];
  @Input() position?: [number, number, number];
  @Input() customConfig?: Partial<HybridElementConfig>;

  // Events
  @Output() ready = new EventEmitter<HybridElement3D>();
  @Output() hover = new EventEmitter<HybridElement3D>();
  @Output() cardClick = new EventEmitter<HybridElement3D>();
  @Output() primaryActionClick = new EventEmitter<void>();
  @Output() secondaryActionClick = new EventEmitter<void>();

  // Internal state
  private readonly element3D = signal<HybridElement3D | null>(null);
  readonly isReady = computed(() => this.element3D() !== null);

  // Computed configuration for the 3D element
  readonly cardConfig = computed((): HybridElementConfig => {
    const basePriority =
      ContentPriority[this.priority as keyof typeof ContentPriority];

    const decoration = this.normalizedDecoration();

    const baseConfig: HybridElementConfig = {
      priority: basePriority,
      position: this.position,
      decoration,
      interaction: {
        hover: this.interactive ? 'scale' : undefined,
        click: this.interactive ? 'focus' : undefined,
      },
      material: {
        opacity: 0.98,
        roughness: 0.02,
        metalness: 0.1,
        clearcoat: 1.0,
        transmission: 0.01,
      },
    };

    return { ...baseConfig, ...this.customConfig };
  });

  ngOnInit(): void {
    // Auto-enable footer if actions are provided
    if ((this.primaryAction || this.secondaryAction) && !this.showFooter) {
      this.showFooter = true;
    }
  }

  /**
   * Handle 3D element ready
   */
  // onElement3DReady(element: HybridElement3D): void {
  onElement3DReady(element: any): void {
    this.element3D.set(element);
    this.ready.emit(element);
  }

  /**
   * Handle 3D element hover
   */
  onElement3DHover(element: any): void {
    this.hover.emit(element);
  }

  /**
   * Handle 3D element click
   */
  onElement3DClick(element: any): void {
    this.cardClick.emit(element);
  }

  /**
   * Handle primary action click
   */
  onPrimaryAction(): void {
    this.primaryActionClick.emit();
  }

  /**
   * Handle secondary action click
   */
  onSecondaryAction(): void {
    this.secondaryActionClick.emit();
  }

  /**
   * Get the 3D element instance
   */
  getElement3D(): HybridElement3D | null {
    return this.element3D();
  }

  /**
   * Update card content dynamically
   */
  updateContent(updates: {
    title?: string;
    description?: string;
    features?: string[];
    tags?: string[];
  }): void {
    if (updates.title !== undefined) this.title = updates.title;
    if (updates.description !== undefined)
      this.description = updates.description;
    if (updates.features !== undefined) this.features = updates.features;
    if (updates.tags !== undefined) this.tags = updates.tags;
  }

  /**
   * Get default geometry based on priority
   */
  private getDefaultGeometry(): NonNullable<
    HybridElementConfig['decoration']
  >['geometry'] {
    switch (this.priority) {
      case 'HERO':
        return 'icosahedron';
      case 'PRIMARY':
        return 'sphere';
      case 'SECONDARY':
        return 'cube';
      case 'TERTIARY':
        return 'cylinder';
      default:
        return 'sphere';
    }
  }

  /**
   * Get default opacity based on priority
   */
  private getDefaultOpacity(): number {
    switch (this.priority) {
      case 'HERO':
        return 0.5;
      case 'PRIMARY':
        return 0.4;
      case 'SECONDARY':
        return 0.3;
      case 'TERTIARY':
        return 0.2;
      default:
        return 0.3;
    }
  }

  /**
   * Get default color based on priority
   */
  private getDefaultColor(): number {
    switch (this.priority) {
      case 'HERO':
        return 0xffd700; // Gold
      case 'PRIMARY':
        return 0x3b82f6; // Blue
      case 'SECONDARY':
        return 0x6b7280; // Gray
      case 'TERTIARY':
        return 0x9ca3af; // Light Gray
      default:
        return 0x3b82f6;
    }
  }

  /**
   * Ensure we always provide a fully realized decoration object
   * Avoids optional property access issues during type checking
   */
  private normalizedDecoration(): NonNullable<
    HybridElementConfig['decoration']
  > {
    const base = {
      geometry: this.getDefaultGeometry(),
      opacity: this.getDefaultOpacity(),
      scale: 0.6,
      animation: 'float' as const,
      color: this.getDefaultColor(),
    };
    return { ...base, ...(this.decoration || {}) };
  }
}
