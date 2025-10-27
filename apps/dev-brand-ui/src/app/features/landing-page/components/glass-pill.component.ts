import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Glass pill component for tags and badges
 * Features gradient backgrounds and glassmorphism effects
 *
 * @example
 * <app-glass-pill
 *   [label]="'New Feature'"
 *   [color]="'electric'">
 * </app-glass-pill>
 */
@Component({
  selector: 'app-glass-pill',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="pillClasses">
      {{ label }}
    </span>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class GlassPillComponent {
  /**
   * Text label displayed in the pill
   */
  @Input({ required: true }) label!: string;

  /**
   * Color variant for the pill
   * - 'electric': Electric blue gradient
   * - 'neon': Neon purple gradient
   * - 'lime': Lime green gradient
   * - 'neutral': Neutral gray
   */
  @Input() color: 'electric' | 'neon' | 'lime' | 'neutral' = 'electric';

  /**
   * Size of the pill
   */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  get pillClasses(): string {
    const base = 'inline-flex items-center justify-center rounded-full backdrop-blur-md font-medium transition-all duration-300';

    const colorClasses = {
      electric: 'bg-gradient-to-r from-accent-electric/20 to-accent-electric/10 text-accent-electric border border-accent-electric/30',
      neon: 'bg-gradient-to-r from-accent-neon/20 to-accent-neon/10 text-accent-neon border border-accent-neon/30',
      lime: 'bg-gradient-to-r from-accent-lime/20 to-accent-lime/10 text-accent-lime border border-accent-lime/30',
      neutral: 'bg-white/10 text-text-secondary border border-white/20'
    };

    const sizeClasses = {
      sm: 'px-3 py-1 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    return `${base} ${colorClasses[this.color]} ${sizeClasses[this.size]}`;
  }
}
