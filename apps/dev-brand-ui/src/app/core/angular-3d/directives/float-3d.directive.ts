/**
 * Float3dDirective - Declarative Floating Animation Behavior
 *
 * Adds floating animation effect to any 3D component using AnimationService and GSAP.
 * Automatically integrates with component lifecycle and cleans up animations on destroy.
 *
 * Features:
 * - Signal-based reactive configuration
 * - Automatic lifecycle management with DestroyRef
 * - Seamless integration with AnimationService
 * - Configurable float height, speed, and delay
 * - Works with any component that exposes getMesh() method
 * - Zero configuration required - smart defaults provided
 *
 * Usage:
 * ```html
 * <app-floating-sphere
 *   [position]="[0, 1, 0]"
 *   [radius]="1"
 *   [color]="0xff0000"
 *   float3d
 *   [floatHeight]="0.5"
 *   [floatSpeed]="2000"
 *   [floatDelay]="0"
 * />
 * ```
 *
 * @example
 * ```html
 * <!-- Simple usage with defaults -->
 * <app-background-cube float3d />
 *
 * <!-- Customized floating behavior -->
 * <app-floating-sphere
 *   float3d
 *   [floatHeight]="1.5"
 *   [floatSpeed]="3000"
 *   [floatDelay]="500"
 * />
 * ```
 */

import {
  AfterViewInit,
  DestroyRef,
  Directive,
  inject,
  input,
  OnDestroy,
  ElementRef,
} from '@angular/core';
import { Mesh } from 'three';
import { AnimationService } from '../services/animation.service';

/**
 * Float3dDirective
 *
 * Applies floating animation to 3D components by creating a GSAP timeline
 * that animates the component's position in a gentle up-and-down motion.
 */
@Directive({
  selector: '[float3d]',
  standalone: true,
})
export class Float3dDirective implements AfterViewInit, OnDestroy {
  // Dependency injection
  private readonly animationService = inject(AnimationService);
  private readonly elementRef = inject(ElementRef<Mesh>);
  private readonly destroyRef = inject(DestroyRef);

  // Configuration input - optional, directive is inactive if undefined
  readonly floatConfig = input<
    | {
        height?: number;
        speed?: number;
        delay?: number;
        ease?: string;
        autoStart?: boolean;
      }
    | undefined
  >(undefined);

  // Legacy individual inputs (deprecated - use floatConfig instead)
  readonly floatHeight = input<number>(0.3); // Height in 3D units
  readonly floatSpeed = input<number>(2000); // Duration in milliseconds
  readonly floatDelay = input<number>(0); // Delay before starting
  readonly floatEase = input<string>('sine.inOut'); // GSAP easing function
  readonly autoStart = input<boolean>(true); // Auto-start animation

  // Internal state
  private timelineId: string | null = null;
  private mesh: Mesh | null = null;
  private originalPosition: [number, number, number] | null = null;

  ngAfterViewInit(): void {
    // Skip if no configuration provided (directive is optional)
    const config = this.floatConfig();
    if (!config) {
      console.log('[Float3dDirective] No config provided, directive inactive');
      return;
    }

    // Get mesh from Angular Three's nativeElement
    this.mesh = this.elementRef.nativeElement;

    if (!this.mesh) {
      console.warn(
        '[Float3dDirective] Could not access mesh from nativeElement'
      );
      return;
    }

    this.initializeAnimation();

    // Register cleanup on destroy
    this.destroyRef.onDestroy(() => {
      this.cleanup();
    });
  }

  /**
   * Initialize the floating animation
   */
  private initializeAnimation(): void {
    if (!this.mesh) return;

    // Store original position for animation
    this.originalPosition = [
      this.mesh.position.x,
      this.mesh.position.y,
      this.mesh.position.z,
    ];

    // Create floating animation
    this.createFloatingAnimation();

    console.log(
      '[Float3dDirective] Animation initialized for mesh:',
      this.mesh.name || 'unnamed'
    );
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Create the floating animation timeline
   */
  private createFloatingAnimation(): void {
    if (!this.mesh || !this.originalPosition) return;

    const [x, y, z] = this.originalPosition;

    // Get config with fallback to legacy inputs
    const config = this.floatConfig();
    const height = config?.height ?? this.floatHeight();
    const speed = config?.speed ?? this.floatSpeed();
    const delay = config?.delay ?? this.floatDelay();
    const ease = config?.ease ?? this.floatEase();
    const autoStart = config?.autoStart ?? this.autoStart();

    // Create timeline with AnimationService
    this.timelineId = this.animationService.createTimeline({
      name: `Float Animation (${this.mesh.name || 'unnamed'})`,
      animations: [
        {
          type: 'slide',
          duration: speed,
          delay,
          ease,
          repeat: -1, // Infinite loop
          yoyo: true, // Back and forth
        },
      ],
      targets: [
        {
          elementId: `float-${this.mesh.uuid || Date.now()}`,
          object3D: this.mesh,
          position: [x, y + height, z] as const,
        },
      ],
      loop: true,
      paused: !autoStart,
    });

    // Add animation to timeline
    if (this.timelineId) {
      this.animationService.addAnimationToTimeline(
        this.timelineId,
        {
          elementId: `float-${this.mesh.uuid || Date.now()}`,
          object3D: this.mesh,
          position: [x, y + height, z] as const,
        },
        {
          type: 'slide',
          duration: speed,
          delay,
          ease,
          repeat: -1,
          yoyo: true,
        }
      );

      // Auto-start if configured
      if (autoStart) {
        this.animationService.playTimeline(this.timelineId);
      }

      console.log(
        `[Float3dDirective] Floating animation created for mesh:`,
        this.mesh.name || 'unnamed',
        `- Timeline ID: ${this.timelineId}`
      );
    }
  }

  /**
   * Cleanup animation resources
   */
  private cleanup(): void {
    if (this.timelineId) {
      this.animationService.stopTimeline(this.timelineId);
      this.animationService.removeTimeline(this.timelineId);
      this.timelineId = null;
      console.log('[Float3dDirective] Animation cleanup completed');
    }

    // Reset position to original if mesh still exists
    if (this.mesh && this.originalPosition) {
      const [x, y, z] = this.originalPosition;
      this.mesh.position.set(x, y, z);
    }
  }

  /**
   * Public API: Play the floating animation
   */
  play(): void {
    if (this.timelineId) {
      this.animationService.playTimeline(this.timelineId);
    }
  }

  /**
   * Public API: Pause the floating animation
   */
  pause(): void {
    if (this.timelineId) {
      this.animationService.pauseTimeline(this.timelineId);
    }
  }

  /**
   * Public API: Stop and reset the floating animation
   */
  stop(): void {
    if (this.timelineId) {
      this.animationService.stopTimeline(this.timelineId);
      if (this.mesh && this.originalPosition) {
        const [x, y, z] = this.originalPosition;
        this.mesh.position.set(x, y, z);
      }
    }
  }

  /**
   * Public API: Check if animation is playing
   */
  isPlaying(): boolean {
    if (!this.timelineId) return false;
    const state = this.animationService.getTimelineState(this.timelineId);
    return state?.isActive ?? false;
  }
}
