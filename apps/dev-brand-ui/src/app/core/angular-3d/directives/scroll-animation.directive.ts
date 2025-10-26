/**
 * ScrollAnimationDirective - GSAP ScrollTrigger Integration
 *
 * Reusable directive for scroll-based animations using GSAP ScrollTrigger.
 * Provides declarative scroll animations with configurable options.
 *
 * Features:
 * - Scroll-triggered animations (fade, slide, scale, etc.)
 * - Configurable trigger points and animation properties
 * - Automatic cleanup and performance optimization
 * - Works with both DOM elements and Angular Three components
 *
 * Usage:
 * ```html
 * <!-- Simple fade-in on scroll -->
 * <h1 scrollAnimation>Title</h1>
 *
 * <!-- Custom animation -->
 * <div
 *   scrollAnimation
 *   [scrollConfig]="{
 *     animation: 'slideUp',
 *     trigger: 'top 80%',
 *     duration: 1.2,
 *     ease: 'power3.out'
 *   }"
 * >
 *   Content
 * </div>
 *
 * <!-- Parallax effect -->
 * <div
 *   scrollAnimation
 *   [scrollConfig]="{
 *     animation: 'parallax',
 *     speed: 0.5,
 *     scrub: true
 *   }"
 * >
 *   Parallax element
 * </div>
 * ```
 */

import {
  Directive,
  ElementRef,
  input,
  type OnInit,
  type OnDestroy,
  inject,
  effect,
} from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

export type AnimationType =
  | 'fadeIn'
  | 'fadeOut'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'scaleIn'
  | 'scaleOut'
  | 'parallax'
  | 'custom';

export interface ScrollAnimationConfig {
  // Animation type
  animation?: AnimationType;

  // ScrollTrigger settings
  trigger?: string; // CSS selector or 'self' for the element itself
  start?: string; // e.g., 'top 80%', 'center center'
  end?: string; // e.g., 'bottom 20%'
  scrub?: boolean | number; // Link animation to scroll progress
  pin?: boolean; // Pin the element during scroll
  pinSpacing?: boolean; // Add spacing when pinning (default: true)
  markers?: boolean; // Show debug markers (dev only)

  // Animation properties
  duration?: number; // Animation duration in seconds
  delay?: number; // Animation delay in seconds
  ease?: string; // GSAP easing function
  stagger?: number; // Stagger delay for child elements

  // Parallax settings
  speed?: number; // Parallax speed (0.5 = half speed, 2 = double speed)
  yPercent?: number; // Y-axis movement percentage
  xPercent?: number; // X-axis movement percentage

  // Custom animation properties
  from?: gsap.TweenVars; // Starting values
  to?: gsap.TweenVars; // Ending values

  // Callbacks
  onEnter?: () => void;
  onLeave?: () => void;
  onEnterBack?: () => void;
  onLeaveBack?: () => void;
  onUpdate?: (progress: number) => void;

  // Performance
  once?: boolean; // Run animation only once
  toggleActions?: string; // 'play pause resume reset' etc.
}

@Directive({
  selector: '[scrollAnimation]',
  standalone: true,
})
export class ScrollAnimationDirective implements OnInit, OnDestroy {
  private readonly elementRef = inject(ElementRef);
  private scrollTrigger?: ScrollTrigger;
  private animation?: gsap.core.Tween | gsap.core.Timeline;

  // Configuration input
  readonly scrollConfig = input<ScrollAnimationConfig>({
    animation: 'fadeIn',
    start: 'top 80%',
    duration: 1,
    ease: 'power2.out',
  });

  constructor() {
    // React to config changes
    effect(() => {
      const config = this.scrollConfig();
      if (this.scrollTrigger) {
        this.cleanup();
        this.initializeAnimation(config);
      }
    });
  }

  ngOnInit(): void {
    this.initializeAnimation(this.scrollConfig());
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private initializeAnimation(config: ScrollAnimationConfig): void {
    const element = this.elementRef.nativeElement;

    // Debug logging
    const elementInfo = {
      tagName: element.tagName,
      className: element.className,
      offsetTop: element.offsetTop,
      offsetHeight: element.offsetHeight,
      boundingRect: element.getBoundingClientRect(),
    };
    // console.log('[ScrollAnimation] Initializing on element:', elementInfo);

    // Determine animation based on type
    const animationProps = this.getAnimationProperties(config);

    // Create GSAP timeline (paused by default to prevent auto-play)
    const timeline = gsap.timeline({
      paused: true,
    });
    timeline.fromTo(element, animationProps.from, animationProps.to);
    this.animation = timeline;

    // Create ScrollTrigger with the timeline
    this.scrollTrigger = ScrollTrigger.create({
      trigger:
        config.trigger === 'self' || !config.trigger ? element : config.trigger,
      start: config.start ?? 'top 80%',
      end: config.end,
      scrub: config.scrub ?? false,
      pin: config.pin ?? false,
      pinSpacing: config.pinSpacing ?? true, // Default to true (GSAP default)
      markers: config.markers ?? false, // Enable with markers: true in config
      animation: timeline,
      once: config.once ?? false,
      toggleActions: config.toggleActions ?? 'play none none none',
      onEnter: () => {
        // console.log('[ScrollAnimation] ScrollTrigger ENTER');
        config.onEnter?.();
      },
      onLeave: () => {
        // console.log('[ScrollAnimation] ScrollTrigger LEAVE');
        config.onLeave?.();
      },
      onEnterBack: () => {
        // console.log('[ScrollAnimation] ScrollTrigger ENTER BACK');
        config.onEnterBack?.();
      },
      onLeaveBack: () => {
        // console.log('[ScrollAnimation] ScrollTrigger LEAVE BACK');
        config.onLeaveBack?.();
      },
      onUpdate: (self) => {
        config.onUpdate?.(self.progress);
      },
      onRefresh: () => {
        // console.log('[ScrollAnimation] ScrollTrigger REFRESH');
      },
    });

    // Refresh ScrollTrigger after a short delay to ensure DOM is ready
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);
  }

  private getAnimationProperties(config: ScrollAnimationConfig): {
    from: gsap.TweenVars;
    to: gsap.TweenVars;
  } {
    const duration = config.duration ?? 1;
    const delay = config.delay ?? 0;
    const ease = config.ease ?? 'power2.out';

    // Handle custom animations
    if (config.animation === 'custom' && config.from && config.to) {
      return {
        from: config.from,
        to: {
          ...config.to,
          duration,
          delay,
          ease,
        },
      };
    }

    // Predefined animations
    switch (config.animation) {
      case 'fadeIn':
        return {
          from: { opacity: 0 },
          to: { opacity: 1, duration, delay, ease },
        };

      case 'fadeOut':
        return {
          from: { opacity: 1 },
          to: { opacity: 0, duration, delay, ease },
        };

      case 'slideUp':
        return {
          from: { y: 100, opacity: 0 },
          to: { y: 0, opacity: 1, duration, delay, ease },
        };

      case 'slideDown':
        return {
          from: { y: -100, opacity: 0 },
          to: { y: 0, opacity: 1, duration, delay, ease },
        };

      case 'slideLeft':
        return {
          from: { x: 100, opacity: 0 },
          to: { x: 0, opacity: 1, duration, delay, ease },
        };

      case 'slideRight':
        return {
          from: { x: -100, opacity: 0 },
          to: { x: 0, opacity: 1, duration, delay, ease },
        };

      case 'scaleIn':
        return {
          from: { scale: 0.8, opacity: 0 },
          to: { scale: 1, opacity: 1, duration, delay, ease },
        };

      case 'scaleOut':
        return {
          from: { scale: 1.2, opacity: 0 },
          to: { scale: 1, opacity: 1, duration, delay, ease },
        };

      case 'parallax':
        return {
          from: {
            y: 0,
            yPercent: config.yPercent ?? 0,
            xPercent: config.xPercent ?? 0,
          },
          to: {
            y: config.speed ? (config.speed - 1) * 100 : -50,
            yPercent: config.yPercent ?? 0,
            xPercent: config.xPercent ?? 0,
            ease: 'none', // Parallax should be linear
          },
        };

      default:
        return {
          from: { opacity: 0 },
          to: { opacity: 1, duration, delay, ease },
        };
    }
  }

  private cleanup(): void {
    if (this.scrollTrigger) {
      this.scrollTrigger.kill();
      this.scrollTrigger = undefined;
    }
    if (this.animation) {
      this.animation.kill();
      this.animation = undefined;
    }
  }

  /**
   * Public API: Manually refresh ScrollTrigger
   * Useful when content changes dynamically
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
   * Public API: Enable/disable the scroll trigger
   */
  setEnabled(enabled: boolean): void {
    if (enabled) {
      this.scrollTrigger?.enable();
    } else {
      this.scrollTrigger?.disable();
    }
  }
}
