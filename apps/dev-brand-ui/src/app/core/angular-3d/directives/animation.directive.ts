/**
 * AnimationDirective - Phase 2 Enhanced
 *
 * Modern Angular directive for declarative animation binding with GSAP integration.
 * Follows Angular 20.1.6 best practices with signals, inject() function, and strict TypeScript.
 */

import {
  Directive,
  ElementRef,
  inject,
  input,
  output,
  effect,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import {
  AnimationService,
  AnimationConfig,
} from '../services/animation.service';

export interface DirectiveAnimationConfig extends AnimationConfig {
  readonly trigger?: 'immediate' | 'hover' | 'click' | 'visible' | 'manual';
  readonly target?: 'self' | 'parent' | 'children';
}

export interface AnimationEvent {
  readonly elementId: string;
  readonly phase: 'start' | 'update' | 'complete' | 'pause';
  readonly progress: number;
}

/**
 * Declarative animation directive for template integration
 *
 * Usage:
 * <div appAnimation
 *      [config]="animConfig"
 *      trigger="hover"
 *      (animationEvent)="onAnimationEvent($event)">
 *   Content to animate
 * </div>
 */
@Directive({
  selector: '[appAnimation]',
  standalone: true,
  host: {
    '[attr.data-animation-id]': 'elementId()',
    '[class.animation-ready]': 'isReady()',
    '[class.animation-playing]': 'isPlaying()',
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
    '(click)': 'onClick()',
  },
})
export class AnimationDirective implements OnInit, OnDestroy {
  // Input signals with strict typing
  readonly config = input.required<DirectiveAnimationConfig>();
  readonly timelineId = input<string>('');
  readonly autoStart = input(false);
  readonly disabled = input(false);

  // Output events
  readonly animationEvent = output<AnimationEvent>();

  // Dependency injection with inject() function
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly animationService = inject(AnimationService);

  // Internal state management
  private readonly _isReady = signal(false);
  private readonly _isPlaying = signal(false);
  private readonly _elementId = signal('');
  private timelineIdInternal = '';

  // Computed properties
  readonly elementId = computed(() => this._elementId());
  readonly isReady = computed(() => this._isReady() && !this.disabled());
  readonly isPlaying = computed(() => this._isPlaying() && !this.disabled());

  readonly shouldAutoStart = computed(() => {
    const config = this.config();
    return this.autoStart() && config.trigger === 'immediate' && this.isReady();
  });

  ngOnInit(): void {
    // Generate unique element ID
    const id = `anim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this._elementId.set(id);

    // Setup animation effects
    this.setupAnimationEffects();

    // Mark as ready
    this._isReady.set(true);
  }

  ngOnDestroy(): void {
    // Cleanup timeline if we created it
    if (this.timelineIdInternal && !this.timelineId()) {
      this.animationService.removeTimeline(this.timelineIdInternal);
    }
  }

  // Public methods for manual control
  play(): void {
    if (!this.isReady()) return;

    const timelineId = this.getOrCreateTimeline();
    this.animationService.playTimeline(timelineId);
    this._isPlaying.set(true);

    this.emitAnimationEvent('start', 0);
  }

  pause(): void {
    if (!this.isPlaying()) return;

    const timelineId = this.getTimelineId();
    if (timelineId) {
      this.animationService.pauseTimeline(timelineId);
      this._isPlaying.set(false);

      const state = this.animationService.getTimelineState(timelineId);
      this.emitAnimationEvent('pause', state?.progress ?? 0);
    }
  }

  stop(): void {
    const timelineId = this.getTimelineId();
    if (timelineId) {
      this.animationService.stopTimeline(timelineId);
      this._isPlaying.set(false);

      this.emitAnimationEvent('complete', 0);
    }
  }

  // Event handlers for trigger-based animations
  protected onMouseEnter(): void {
    if (this.config().trigger === 'hover') {
      this.play();
    }
  }

  protected onMouseLeave(): void {
    if (this.config().trigger === 'hover') {
      this.pause();
    }
  }

  protected onClick(): void {
    if (this.config().trigger === 'click') {
      if (this.isPlaying()) {
        this.stop();
      } else {
        this.play();
      }
    }
  }

  // Private methods

  private setupAnimationEffects(): void {
    // Auto-start effect
    effect(() => {
      if (this.shouldAutoStart()) {
        this.play();
      }
    });

    // Configuration change effect
    effect(() => {
      const config = this.config();
      if (this.timelineIdInternal) {
        // Recreation timeline with new config
        this.recreateTimeline(config);
      }
    });

    // Monitor animation service state
    effect(() => {
      const animState = this.animationService.animationState();
      const timelineId = this.getTimelineId();

      if (timelineId) {
        const isActive = animState.activeAnimations.includes(timelineId);
        if (this._isPlaying() !== isActive) {
          this._isPlaying.set(isActive);

          if (!isActive) {
            this.emitAnimationEvent('complete', 1);
          }
        }
      }
    });
  }

  private getOrCreateTimeline(): string {
    let timelineId = this.getTimelineId();

    if (!timelineId) {
      timelineId = this.createTimeline();
    }

    return timelineId;
  }

  private getTimelineId(): string {
    return this.timelineId() || this.timelineIdInternal;
  }

  private createTimeline(): string {
    const config = this.config();
    const element = this.elementRef.nativeElement;

    // Create timeline through animation service
    const timelineId = this.animationService.createTimeline({
      name: `Directive Animation - ${this.elementId()}`,
      animations: [config],
      targets: [
        {
          elementId: this.elementId(),
          domElement: element,
          position: [0, 0, 0] as const,
          rotation: [0, 0, 0] as const,
          scale: [1, 1, 1] as const,
          opacity: 1,
        },
      ],
    });

    // Add the animation to the timeline
    this.animationService.addAnimationToTimeline(
      timelineId,
      {
        elementId: this.elementId(),
        domElement: element,
        position: this.getTargetPosition(config),
        rotation: this.getTargetRotation(config),
        scale: this.getTargetScale(config),
        opacity: this.getTargetOpacity(config),
      },
      config
    );

    // Store timeline ID if we created it
    if (!this.timelineId()) {
      this.timelineIdInternal = timelineId;
    }

    return timelineId;
  }

  private recreateTimeline(config: DirectiveAnimationConfig): void {
    // Remove old timeline
    if (this.timelineIdInternal) {
      this.animationService.removeTimeline(this.timelineIdInternal);
    }

    // Create new timeline with updated config
    this.timelineIdInternal = this.createTimeline();
  }

  private getTargetPosition(
    config: DirectiveAnimationConfig
  ): readonly [number, number, number] {
    switch (config.type) {
      case 'slide':
        // Default slide animation moves element right and down
        return [100, 50, 0] as const;
      default:
        return [0, 0, 0] as const;
    }
  }

  private getTargetRotation(
    config: DirectiveAnimationConfig
  ): readonly [number, number, number] {
    switch (config.type) {
      case 'rotate':
        // Default rotation around Y-axis
        return [0, Math.PI, 0] as const;
      default:
        return [0, 0, 0] as const;
    }
  }

  private getTargetScale(
    config: DirectiveAnimationConfig
  ): readonly [number, number, number] {
    switch (config.type) {
      case 'scale':
        // Default scale up animation
        return [1.2, 1.2, 1.2] as const;
      default:
        return [1, 1, 1] as const;
    }
  }

  private getTargetOpacity(config: DirectiveAnimationConfig): number {
    switch (config.type) {
      case 'fade':
        // Default fade to fully visible
        return 1;
      default:
        return 1;
    }
  }

  private emitAnimationEvent(
    phase: AnimationEvent['phase'],
    progress: number
  ): void {
    this.animationEvent.emit({
      elementId: this.elementId(),
      phase,
      progress,
    });
  }
}
