import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Container component for 3D icon integration
 * Provides hover animations, glow effects, and perspective transforms
 *
 * @example
 * <app-icon-3d-container
 *   [size]="'lg'"
 *   [animation]="'float'">
 *   <app-scene-3d [sceneGraph]="IconScene"></app-scene-3d>
 * </app-icon-3d-container>
 */
@Component({
  selector: 'app-icon-3d-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [class]="containerClasses"
      [style.width]="sizeValue"
      [style.height]="sizeValue">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-10px);
      }
    }

    @keyframes rotate-slow {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    @keyframes glow-pulse {
      0%, 100% {
        filter: drop-shadow(0 0 8px rgba(163, 255, 79, 0.3));
      }
      50% {
        filter: drop-shadow(0 0 16px rgba(163, 255, 79, 0.6));
      }
    }

    .animate-float {
      animation: float 3s ease-in-out infinite;
    }

    .animate-rotate {
      animation: rotate-slow 20s linear infinite;
    }

    .animate-glow {
      animation: glow-pulse 2s ease-in-out infinite;
    }
  `]
})
export class Icon3DContainerComponent {
  /**
   * Size of the icon container
   */
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  /**
   * Animation type to apply
   * - 'float': Gentle vertical floating motion
   * - 'rotate': Slow continuous rotation
   * - 'glow': Pulsing glow effect
   * - 'none': No animation
   */
  @Input() animation: 'float' | 'rotate' | 'glow' | 'none' = 'float';

  /**
   * Enable hover scale effect
   */
  @Input() hoverable = true;

  get containerClasses(): string {
    const base = 'relative inline-flex items-center justify-center transition-transform duration-300';

    const animationClasses = {
      float: 'animate-float',
      rotate: 'animate-rotate',
      glow: 'animate-glow',
      none: ''
    };

    const hoverClass = this.hoverable ? 'hover:scale-110' : '';

    return `${base} ${animationClasses[this.animation]} ${hoverClass}`.trim();
  }

  get sizeValue(): string {
    const sizes = {
      sm: '48px',
      md: '64px',
      lg: '96px',
      xl: '128px'
    };

    return sizes[this.size];
  }
}
