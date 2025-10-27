import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Enhanced card component with glass morphism effects
 * Used throughout the landing page for modern UI aesthetics
 *
 * @example
 * <app-enhanced-card
 *   [variant]="'glass'"
 *   [hoverable]="true">
 *   <h3>Card Title</h3>
 *   <p>Card content goes here</p>
 * </app-enhanced-card>
 */
@Component({
  selector: 'app-enhanced-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [class]="cardClasses"
      [class.hover:scale-105]="hoverable"
      [class.hover:shadow-card-hover]="hoverable"
    >
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class EnhancedCardComponent {
  /**
   * Visual variant of the card
   * - 'glass': Glass morphism effect with backdrop blur
   * - 'solid': Solid background with shadow
   * - 'minimal': Minimal border-only design
   */
  @Input() variant: 'glass' | 'solid' | 'minimal' = 'glass';

  /**
   * Enable hover scale and shadow effects
   */
  @Input() hoverable = true;

  /**
   * Padding size
   */
  @Input() padding: 'sm' | 'md' | 'lg' = 'md';

  get cardClasses(): string {
    const base = 'rounded-2xl transition-all duration-300';

    const variantClasses = {
      glass: 'bg-white/5 backdrop-blur-md border border-white/10',
      solid: 'bg-white shadow-card',
      minimal: 'border border-border-subtle',
    };

    const paddingClasses = {
      sm: 'p-6',
      md: 'p-8',
      lg: 'p-12',
    };

    return `${base} ${variantClasses[this.variant]} ${
      paddingClasses[this.padding]
    }`;
  }
}
