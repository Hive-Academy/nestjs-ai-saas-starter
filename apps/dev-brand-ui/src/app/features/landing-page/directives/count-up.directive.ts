import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  effect,
  signal,
} from '@angular/core';

/**
 * Animated number counting directive
 * Triggers count-up animation when element enters viewport
 *
 * @example
 * <span
 *   appCountUp
 *   [targetValue]="1000"
 *   [duration]="2000">
 *   0
 * </span>
 */
@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective implements OnInit, OnDestroy {
  /**
   * Target value to count up to
   */
  @Input({ required: true }) targetValue!: number;

  /**
   * Animation duration in milliseconds
   */
  @Input() duration = 2000;

  /**
   * Number of decimal places to display
   */
  @Input() decimals = 0;

  /**
   * Prefix to add before the number (e.g., '$')
   */
  @Input() prefix = '';

  /**
   * Suffix to add after the number (e.g., '%', '+')
   */
  @Input() suffix = '';

  private observer: IntersectionObserver | null = null;
  private currentValue = signal(0);
  private animationFrameId: number | null = null;

  constructor(private el: ElementRef<HTMLElement>) {
    // Update DOM when currentValue changes
    effect(() => {
      const value = this.currentValue();
      const formatted = this.formatNumber(value);
      this.el.nativeElement.textContent = `${this.prefix}${formatted}${this.suffix}`;
    });
  }

  ngOnInit(): void {
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private setupIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.startAnimation();
            // Disconnect after first trigger
            this.observer?.disconnect();
          }
        });
      },
      {
        threshold: 0.5, // Trigger when 50% visible
      }
    );

    this.observer.observe(this.el.nativeElement);
  }

  private startAnimation(): void {
    const startTime = performance.now();
    const startValue = this.currentValue();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.duration, 1);

      // Easing function: ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + (this.targetValue - startValue) * eased;
      this.currentValue.set(currentValue);

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        // Ensure we end exactly on target value
        this.currentValue.set(this.targetValue);
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private formatNumber(value: number): string {
    return value.toFixed(this.decimals);
  }
}
