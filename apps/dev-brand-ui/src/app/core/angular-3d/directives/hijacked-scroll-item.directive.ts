/**
 * HijackedScrollItemDirective - Individual Step Marker
 *
 * Marks elements as steps in a hijacked scroll sequence.
 * Works with HijackedScrollDirective to coordinate multi-step animations.
 *
 * Features:
 * - Registers element with parent scroll container
 * - Configurable slide direction for animations
 * - Optional custom animation properties
 *
 * Usage:
 * ```html
 * <div hijackedScroll>
 *   <div hijackedScrollItem slideDirection="left">Step 1</div>
 *   <div hijackedScrollItem slideDirection="right">Step 2</div>
 *   <div hijackedScrollItem>Step 3</div>
 * </div>
 * ```
 */

import { Directive, ElementRef, input, inject } from '@angular/core';

export type SlideDirection = 'left' | 'right' | 'up' | 'down' | 'none';

export interface HijackedScrollItemConfig {
  slideDirection?: SlideDirection;
  fadeIn?: boolean;
  scale?: boolean;
  customFrom?: Record<string, unknown>;
  customTo?: Record<string, unknown>;
}

@Directive({
  selector: '[hijackedScrollItem]',
  standalone: true,
})
export class HijackedScrollItemDirective {
  private readonly elementRef = inject(ElementRef);

  // Slide direction for entry/exit animations
  readonly slideDirection = input<SlideDirection>('none');

  // Enable fade animation
  readonly fadeIn = input<boolean>(true);

  // Enable scale animation
  readonly scale = input<boolean>(true);

  // Custom GSAP animation properties
  readonly customFrom = input<Record<string, unknown>>();
  readonly customTo = input<Record<string, unknown>>();

  /**
   * Get the native HTML element
   */
  getElement(): HTMLElement {
    return this.elementRef.nativeElement;
  }

  /**
   * Get animation configuration
   */
  getConfig(): HijackedScrollItemConfig {
    return {
      slideDirection: this.slideDirection(),
      fadeIn: this.fadeIn(),
      scale: this.scale(),
      customFrom: this.customFrom(),
      customTo: this.customTo(),
    };
  }

  /**
   * Calculate slide offset based on direction
   */
  getSlideOffset(): { x: number; y: number } {
    const direction = this.slideDirection();
    const offset = 60; // pixels

    switch (direction) {
      case 'left':
        return { x: -offset, y: 0 };
      case 'right':
        return { x: offset, y: 0 };
      case 'up':
        return { x: 0, y: -offset };
      case 'down':
        return { x: 0, y: offset };
      default:
        return { x: 0, y: 0 };
    }
  }
}
