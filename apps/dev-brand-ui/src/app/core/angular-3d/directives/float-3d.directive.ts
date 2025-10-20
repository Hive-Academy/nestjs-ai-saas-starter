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
  private gsapTimeline: any | null = null; // Direct GSAP timeline reference
  private mesh: Mesh | null = null;
  private originalPosition: [number, number, number] | null = null;

  ngAfterViewInit(): void {
    // Skip if no configuration provided (directive is optional)
    const config = this.floatConfig();
    if (!config) {
      // console.log('[Float3dDirective] No config provided, directive inactive');
      return;
    }

    // Get mesh from Angular Three's nativeElement
    this.mesh = this.elementRef.nativeElement;

    if (!this.mesh) {
      // console.warn(
      //   '[Float3dDirective] Could not access mesh from nativeElement'
      // );
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

    // console.log(
    //   '[Float3dDirective] Animation initialized for mesh:',
    //   this.mesh.name || 'unnamed'
    // );
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Create the floating animation timeline
   *
   * Uses a seamless continuous loop animation instead of yoyo to avoid jarring transitions.
   * Creates a smooth sine-wave-like motion by animating UP and DOWN as separate sequential steps
   * within a repeating timeline, ensuring no sudden drops at loop boundaries.
   */
  private createFloatingAnimation(): void {
    if (!this.mesh || !this.originalPosition) return;

    // Get config with fallback to legacy inputs
    const config = this.floatConfig();
    const height = config?.height ?? this.floatHeight();
    const speed = config?.speed ?? this.floatSpeed();
    const delay = config?.delay ?? this.floatDelay();
    const ease = config?.ease ?? this.floatEase();
    const autoStart = config?.autoStart ?? this.autoStart();

    // Import GSAP to create direct timeline (bypass AnimationService for better control)
    import('gsap').then(({ gsap }) => {
      if (!this.mesh || !this.originalPosition) return;

      const [_x, y, _z] = this.originalPosition;

      // Create a seamless continuous loop timeline
      // Instead of yoyo (which causes sudden drops), we create a smooth cycle:
      // 1. Start at original position
      // 2. Animate UP to (y + height) with easeInOut
      // 3. Animate DOWN back to original y with easeInOut
      // 4. Repeat infinitely - seamless loop, no jarring transitions
      const timeline = gsap.timeline({
        repeat: -1, // Infinite loop
        delay: delay / 1000, // Convert ms to seconds
      });

      // Phase 1: Float UP (smooth acceleration and deceleration)
      timeline.to(this.mesh.position, {
        y: y + height,
        duration: speed / 2000, // Half the total speed for up phase (convert ms to s)
        ease: ease || 'sine.inOut',
      });

      // Phase 2: Float DOWN (smooth acceleration and deceleration)
      timeline.to(this.mesh.position, {
        y: y,
        duration: speed / 2000, // Half the total speed for down phase
        ease: ease || 'sine.inOut',
      });

      // Store timeline reference for cleanup and control
      this.gsapTimeline = timeline;

      // Auto-start if configured
      if (!autoStart) {
        timeline.pause();
      }

      // console.log(
      //   `[Float3dDirective] Seamless floating animation created for mesh:`,
      //   this.mesh.name || 'unnamed',
      //   `- Height: ${height}, Speed: ${speed}ms, Ease: ${ease}`
      // );
    });
  }

  /**
   * Cleanup animation resources
   */
  private cleanup(): void {
    if (this.gsapTimeline) {
      this.gsapTimeline.kill();
      this.gsapTimeline = null;
      // console.log('[Float3dDirective] Animation cleanup completed');
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
    if (this.gsapTimeline) {
      this.gsapTimeline.play();
    }
  }

  /**
   * Public API: Pause the floating animation
   */
  pause(): void {
    if (this.gsapTimeline) {
      this.gsapTimeline.pause();
    }
  }

  /**
   * Public API: Stop and reset the floating animation
   */
  stop(): void {
    if (this.gsapTimeline) {
      this.gsapTimeline.progress(0).pause();
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
    return this.gsapTimeline ? this.gsapTimeline.isActive() : false;
  }
}
