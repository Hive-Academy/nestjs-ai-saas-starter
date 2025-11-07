/**
 * HijackedScrollDirective - Scroll-Jacking Container
 *
 * Creates scroll-jacked sequences where the viewport is pinned while
 * scrolling through steps. Core pattern for interactive presentations,
 * tutorials, and step-by-step content.
 *
 * Features:
 * - Pins viewport during scroll sequence
 * - Coordinates animations across multiple steps
 * - Emits current step and scroll progress
 * - Configurable scroll height and timing
 * - Works with any content type (not just code)
 *
 * Usage:
 * ```html
 * <div
 *   hijackedScroll
 *   [scrollHeightPerStep]="100"
 *   [animationDuration]="0.3"
 *   (currentStepChange)="onStepChange($event)"
 *   (progressChange)="onProgress($event)"
 * >
 *   <div hijackedScrollItem slideDirection="left">
 *     <h2>Step 1</h2>
 *     <p>Content...</p>
 *   </div>
 *   <div hijackedScrollItem slideDirection="right">
 *     <h2>Step 2</h2>
 *     <p>More content...</p>
 *   </div>
 * </div>
 * ```
 */

import {
  Directive,
  ElementRef,
  input,
  output,
  type OnDestroy,
  inject,
  effect,
  contentChildren,
  Injector,
  afterNextRender,
} from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HijackedScrollItemDirective } from './hijacked-scroll-item.directive';

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

export interface HijackedScrollConfig {
  scrollHeightPerStep?: number; // vh per step (default: 100)
  animationDuration?: number; // animation duration in seconds (default: 0.3)
  ease?: string; // GSAP easing function (default: 'power2.out')
  markers?: boolean; // show debug markers (default: false)
  minHeight?: string; // minimum container height (default: '70vh')
  start?: string; // ScrollTrigger start point (default: 'top top')
  end?: string; // ScrollTrigger end point (default: calculated from steps)
}

@Directive({
  selector: '[hijackedScroll]',
  standalone: true,
})
export class HijackedScrollDirective implements OnDestroy {
  private readonly elementRef = inject(ElementRef);
  private readonly injector = inject(Injector);
  private scrollTrigger?: ScrollTrigger;
  private masterTimeline?: gsap.core.Timeline;

  // Query all child step items using signal-based API
  readonly items = contentChildren(HijackedScrollItemDirective, {
    descendants: true,
  });

  // Configuration inputs
  readonly scrollHeightPerStep = input<number>(100); // vh per step
  readonly animationDuration = input<number>(0.3); // seconds
  readonly ease = input<string>('power2.out');
  readonly markers = input<boolean>(false);
  readonly minHeight = input<string>('100vh');
  readonly start = input<string>('top top'); // ScrollTrigger start point
  readonly end = input<string | undefined>(undefined); // ScrollTrigger end point (optional)

  // Event outputs
  readonly currentStepChange = output<number>();
  readonly progressChange = output<number>();

  constructor() {
    // React to items changes and initialize
    effect(() => {
      const itemsList = this.items();

      console.log('[HijackedScroll] Items changed, count:', itemsList.length);

      if (itemsList.length > 0) {
        // Clean up previous instance
        this.cleanup();

        // Initialize after next render to ensure DOM is ready
        afterNextRender(
          () => {
            this.initializeHijackedScroll();
          },
          { injector: this.injector }
        );
      }
    });

    // React to configuration changes (only re-init if already initialized)
    effect(() => {
      this.scrollHeightPerStep();
      this.animationDuration();
      this.ease();
      this.markers();

      // Re-initialize if already initialized and has items
      if (this.scrollTrigger && this.items().length > 0) {
        console.log('[HijackedScroll] Config changed, re-initializing');
        this.cleanup();
        afterNextRender(
          () => {
            this.initializeHijackedScroll();
          },
          { injector: this.injector }
        );
      }
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private initializeHijackedScroll(): void {
    const container = this.elementRef.nativeElement as HTMLElement;
    const items = this.items(); // Get signal value
    const totalSteps = items.length;

    if (totalSteps === 0) {
      console.warn('[HijackedScroll] No items found');
      return;
    }

    console.log('[HijackedScroll] Initializing with', totalSteps, 'steps');

    // Set minimum height on container
    container.style.minHeight = this.minHeight();
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    // Create master timeline
    this.masterTimeline = gsap.timeline({
      paused: true,
    });

    // Animate each step
    items.forEach((item, index) => {
      const element = item.getElement();
      const config = item.getConfig();
      const slideOffset = item.getSlideOffset();

      // Ensure absolute positioning
      element.style.position = 'absolute';
      element.style.inset = '0';
      element.style.display = 'flex';
      element.style.alignItems = 'flex-start';

      // Find decoration element for this step (if exists)
      const decoration = element.querySelector(
        `[data-decoration-index="${index}"]`
      ) as HTMLElement;
      const decorationInner = decoration?.querySelector(
        '.decoration-inner'
      ) as HTMLElement;

      // Build initial state (from)
      const fromState: gsap.TweenVars = {
        opacity: config.fadeIn ? 0 : 1,
        x: slideOffset.x,
        y: slideOffset.y,
        scale: config.scale ? 0.95 : 1,
        ...config.customFrom,
      };

      // Build target state (to)
      const toState: gsap.TweenVars = {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        duration: this.animationDuration(),
        ease: this.ease(),
        ...config.customTo,
      };

      // Build exit state
      const exitState: gsap.TweenVars = {
        opacity: config.fadeIn ? 0 : 1,
        x: -slideOffset.x,
        y: -slideOffset.y,
        scale: config.scale ? 0.95 : 1,
        duration: this.animationDuration(),
        ease: this.ease(),
      };

      // Set initial state for ALL steps (including first one)
      this.masterTimeline!.set(element, fromState, 0);

      // Add fade in animation
      const stepStartTime = index;

      // For the first step, add a small delay before animating in
      // This ensures it animates smoothly when the user first scrolls
      if (index === 0) {
        // First step fades in immediately at scroll start
        this.masterTimeline!.to(element, toState, stepStartTime);
      } else {
        // Other steps fade in at their designated time
        this.masterTimeline!.to(element, toState, stepStartTime);
      }

      // Add fade out animation (except for last step)
      if (index < totalSteps - 1) {
        this.masterTimeline!.to(element, exitState, stepStartTime + 0.7);
      }

      // Animate decoration during the step's visible period
      if (decorationInner) {
        // Set initial decoration state
        this.masterTimeline!.set(
          decorationInner,
          {
            rotation: 0,
            scale: 0.8,
            opacity: 0,
          },
          0
        );

        // Fade in and scale up decoration as step appears
        this.masterTimeline!.to(
          decorationInner,
          {
            rotation: 10,
            scale: 1,
            opacity: 1,
            duration: 0.4,
            ease: 'power2.out',
          },
          stepStartTime
        );

        // Continue rotating/moving during step visibility
        this.masterTimeline!.to(
          decorationInner,
          {
            rotation: -10,
            scale: 1.1,
            duration: 0.5,
            ease: 'sine.inOut',
          },
          stepStartTime + 0.3
        );

        // Fade out decoration as step exits (if not last step)
        if (index < totalSteps - 1) {
          this.masterTimeline!.to(
            decorationInner,
            {
              rotation: 20,
              scale: 0.7,
              opacity: 0,
              duration: 0.3,
              ease: 'power2.in',
            },
            stepStartTime + 0.7
          );
        }
      }
    });

    // Create ScrollTrigger
    this.scrollTrigger = ScrollTrigger.create({
      trigger: container,
      start: this.start(), // Configurable start point
      end: this.end() || `+=${totalSteps * this.scrollHeightPerStep()}vh`, // Configurable or calculated end
      pin: true,
      scrub: 1,
      animation: this.masterTimeline,
      markers: this.markers(),
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        // Calculate current step based on progress
        const currentStep = Math.floor(self.progress * totalSteps);
        const clampedStep = Math.min(currentStep, totalSteps - 1);

        this.currentStepChange.emit(clampedStep);
        this.progressChange.emit(self.progress);
      },
    });

    // Refresh ScrollTrigger
    ScrollTrigger.refresh();
  }

  private cleanup(): void {
    if (this.scrollTrigger) {
      this.scrollTrigger.kill();
      this.scrollTrigger = undefined;
    }
    if (this.masterTimeline) {
      this.masterTimeline.kill();
      this.masterTimeline = undefined;
    }
  }

  /**
   * Public API: Manually refresh ScrollTrigger
   * Useful when container size changes
   */
  refresh(): void {
    this.scrollTrigger?.refresh();
  }

  /**
   * Public API: Get current scroll progress (0-1)
   */
  getProgress(): number {
    return this.scrollTrigger?.progress ?? 0;
  }

  /**
   * Public API: Jump to specific step
   */
  jumpToStep(stepIndex: number): void {
    const items = this.items(); // Get signal value
    if (stepIndex < 0 || stepIndex >= items.length) {
      console.warn('[HijackedScroll] Invalid step index:', stepIndex);
      return;
    }

    const progress = stepIndex / items.length;
    this.scrollTrigger?.scroll(progress);
  }
}
