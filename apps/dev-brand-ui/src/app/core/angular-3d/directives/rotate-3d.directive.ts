/**
 * Rotate3dDirective - Declarative Rotation Animation Behavior
 *
 * Adds continuous rotation animation to any 3D component using GSAP.
 * Automatically integrates with component lifecycle and cleans up animations on destroy.
 *
 * Features:
 * - Signal-based reactive configuration
 * - Automatic lifecycle management with DestroyRef
 * - Configurable rotation speed, axis, and direction
 * - Works with any 3D object (GLTF models, meshes, groups)
 * - Zero configuration required - smart defaults provided
 * - Smooth continuous rotation using GSAP
 *
 * Usage:
 * ```html
 * <!-- Simple Y-axis rotation (like Earth spinning) -->
 * <app-gltf-model
 *   [modelPath]="'/assets/3d/planet_earth/scene.gltf'"
 *   rotate3d
 *   [rotateConfig]="{
 *     axis: 'y',
 *     speed: 60,
 *     direction: 1
 *   }"
 * />
 *
 * <!-- Multi-axis rotation -->
 * <app-gltf-model
 *   [modelPath]="'/assets/3d/asteroid.glb'"
 *   rotate3d
 *   [rotateConfig]="{
 *     axis: 'xyz',
 *     speed: 30,
 *     xSpeed: 10,
 *     ySpeed: 20,
 *     zSpeed: 5
 *   }"
 * />
 * ```
 *
 * @example
 * ```html
 * <!-- Earth rotation (realistic ~24h day) -->
 * <app-gltf-model rotate3d [rotateConfig]="{ axis: 'y', speed: 60 }" />
 *
 * <!-- Fast asteroid tumble -->
 * <app-gltf-model rotate3d [rotateConfig]="{ axis: 'xyz', speed: 10 }" />
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
import type { Object3D } from 'three';

/**
 * Rotation configuration interface
 */
export interface RotateConfig {
  /** Rotation axis: 'x', 'y', 'z', or 'xyz' for multi-axis */
  axis?: 'x' | 'y' | 'z' | 'xyz';
  /** Rotation speed in seconds for 360° (lower = faster) */
  speed?: number;
  /** Individual X-axis speed (only used if axis='xyz') */
  xSpeed?: number;
  /** Individual Y-axis speed (only used if axis='xyz') */
  ySpeed?: number;
  /** Individual Z-axis speed (only used if axis='xyz') */
  zSpeed?: number;
  /** Rotation direction: 1 = clockwise, -1 = counter-clockwise */
  direction?: 1 | -1;
  /** Auto-start animation (default: true) */
  autoStart?: boolean;
  /** Easing function (usually 'none' for smooth continuous rotation) */
  ease?: string;
}

/**
 * Rotate3dDirective
 *
 * Applies continuous rotation animation to 3D objects using GSAP.
 * Creates smooth, infinite rotation on specified axes.
 */
@Directive({
  selector: '[rotate3d]',
  standalone: true,
})
export class Rotate3dDirective implements AfterViewInit, OnDestroy {
  // Dependency injection
  private readonly elementRef = inject(ElementRef<Object3D>);
  private readonly destroyRef = inject(DestroyRef);

  // Configuration input
  readonly rotateConfig = input<RotateConfig | undefined>(undefined);

  // Internal state
  private gsapTimeline: any | null = null;
  private object3D: Object3D | null = null;

  ngAfterViewInit(): void {
    // Skip if no configuration provided (directive is optional)
    const config = this.rotateConfig();
    if (!config) {
      return;
    }

    // Get 3D object from Angular Three's nativeElement
    this.object3D = this.elementRef.nativeElement;

    if (!this.object3D) {
      console.warn(
        '[Rotate3dDirective] Could not access object from nativeElement'
      );
      return;
    }

    // Delay initialization to ensure GLTF model is fully loaded
    setTimeout(() => {
      this.initializeAnimation();
    }, 100);

    // Register cleanup on destroy
    this.destroyRef.onDestroy(() => {
      this.cleanup();
    });
  }

  /**
   * Initialize the rotation animation
   */
  private initializeAnimation(): void {
    if (!this.object3D) return;

    this.createRotationAnimation();

    console.log(
      '[Rotate3dDirective] Rotation animation initialized:',
      this.rotateConfig()
    );
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Create the rotation animation timeline
   *
   * Uses GSAP for smooth, continuous rotation.
   * Supports single-axis or multi-axis rotation.
   */
  private createRotationAnimation(): void {
    if (!this.object3D) {
      console.warn(
        '[Rotate3dDirective] object3D is null in createRotationAnimation'
      );
      return;
    }

    const config = this.rotateConfig();
    if (!config) return;

    // Default configuration
    const axis = config.axis ?? 'y';
    const speed = config.speed ?? 60; // 60 seconds for full rotation
    const direction = config.direction ?? 1;
    const autoStart = config.autoStart ?? true;
    const ease = config.ease ?? 'none'; // 'none' for linear continuous rotation

    // Import GSAP to create rotation timeline
    import('gsap').then(({ gsap }) => {
      if (!this.object3D) {
        console.warn(
          '[Rotate3dDirective] object3D became null after GSAP import'
        );
        return;
      }

      // Additional safety check for rotation property
      if (!this.object3D.rotation) {
        console.warn('[Rotate3dDirective] object3D.rotation is undefined');
        return;
      }

      const timeline = gsap.timeline({
        repeat: -1, // Infinite loop
      });

      // Single-axis rotation
      if (axis === 'x' || axis === 'y' || axis === 'z') {
        const fullRotation = Math.PI * 2 * direction;

        timeline.to(this.object3D.rotation, {
          [axis]: `+=${fullRotation}`, // Relative rotation
          duration: speed,
          ease: ease,
        });
      }
      // Multi-axis rotation (tumbling effect)
      else if (axis === 'xyz') {
        const xSpeed = config.xSpeed ?? speed;
        const ySpeed = config.ySpeed ?? speed;
        const zSpeed = config.zSpeed ?? speed;

        // Create simultaneous rotations on all axes
        timeline.to(
          this.object3D.rotation,
          {
            x: `+=${Math.PI * 2 * direction}`,
            duration: xSpeed,
            ease: ease,
            repeat: -1,
          },
          0
        ); // Start at time 0

        timeline.to(
          this.object3D.rotation,
          {
            y: `+=${Math.PI * 2 * direction}`,
            duration: ySpeed,
            ease: ease,
            repeat: -1,
          },
          0
        ); // Start at time 0

        timeline.to(
          this.object3D.rotation,
          {
            z: `+=${Math.PI * 2 * direction}`,
            duration: zSpeed,
            ease: ease,
            repeat: -1,
          },
          0
        ); // Start at time 0
      }

      // Store timeline reference
      this.gsapTimeline = timeline;

      // Auto-start if configured
      if (!autoStart) {
        timeline.pause();
      }

      console.log(
        `[Rotate3dDirective] Rotation animation created - Axis: ${axis}, Speed: ${speed}s`
      );
    });
  }

  /**
   * Cleanup animation resources
   */
  private cleanup(): void {
    if (this.gsapTimeline) {
      this.gsapTimeline.kill();
      this.gsapTimeline = null;
      console.log('[Rotate3dDirective] Animation cleanup completed');
    }
  }

  /**
   * Public API: Play the rotation animation
   */
  play(): void {
    if (this.gsapTimeline) {
      this.gsapTimeline.play();
    }
  }

  /**
   * Public API: Pause the rotation animation
   */
  pause(): void {
    if (this.gsapTimeline) {
      this.gsapTimeline.pause();
    }
  }

  /**
   * Public API: Stop and reset the rotation animation
   */
  stop(): void {
    if (this.gsapTimeline) {
      this.gsapTimeline.progress(0).pause();
    }
  }

  /**
   * Public API: Check if animation is playing
   */
  isPlaying(): boolean {
    return this.gsapTimeline ? this.gsapTimeline.isActive() : false;
  }

  /**
   * Public API: Set rotation speed
   */
  setSpeed(speed: number): void {
    if (this.gsapTimeline) {
      this.gsapTimeline.timeScale(60 / speed); // Adjust time scale
    }
  }

  /**
   * Public API: Reverse rotation direction
   */
  reverse(): void {
    if (this.gsapTimeline) {
      this.gsapTimeline.timeScale(this.gsapTimeline.timeScale() * -1);
    }
  }
}
