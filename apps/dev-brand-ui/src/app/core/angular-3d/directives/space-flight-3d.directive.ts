/**
 * SpaceFlight3dDirective - Reusable Space Flight Animation
 *
 * Applies a cinematic space flight animation to any 3D object, making it fly
 * through space with depth movement, rotation, and smooth transitions.
 *
 * Uses Angular Three's injectBeforeRender for proper frame-loop integration
 * and supports directive composition API for easy application to any component.
 *
 * **IMPORTANT**: This directive is optional. If no `flightPath` is provided,
 * the directive will do nothing, allowing the component to work normally without
 * animation. This makes it safe to include via hostDirectives.
 *
 * Features:
 * - Configurable multi-phase flight path
 * - Continuous rotation during flight
 * - Depth-based movement (Z-axis animation)
 * - Smooth interpolation between waypoints
 * - Infinite loop with seamless restart
 * - Automatic cleanup via injectBeforeRender
 * - Works with directive composition (hostDirectives)
 * - Optional - no errors if flight path is not provided
 *
 * Usage with Directive Composition:
 * ```html
 * <!-- With animation -->
 * <app-gltf-model
 *   [modelPath]="'/assets/3d/spaceship.glb'"
 *   spaceFlight3d
 *   [flightPath]="customPath"
 *   [rotationsPerCycle]="10"
 * />
 *
 * <!-- Without animation (directive is ignored) -->
 * <app-gltf-model
 *   [modelPath]="'/assets/3d/spaceship.glb'"
 *   [position]="[0, 0, 0]"
 * />
 * ```
 *
 * Advanced Usage with Custom Path:
 * ```typescript
 * customPath: SpaceFlightWaypoint[] = [
 *   { position: [10, 5, -20], duration: 8 },
 *   { position: [-5, -2, 5], duration: 6 },
 *   { position: [0, 0, -15], duration: 7 }
 * ];
 * ```
 */

import {
  Directive,
  input,
  type OnInit,
  inject,
  DestroyRef,
  output,
  ElementRef,
  type AfterViewInit,
} from '@angular/core';
import { injectBeforeRender } from 'angular-three';
import type { Object3D } from 'three';
import { Vector3, Euler } from 'three';

/**
 * Waypoint configuration for flight path
 */
export interface SpaceFlightWaypoint {
  /** Target position [x, y, z] */
  position: [number, number, number];
  /** Duration to reach this waypoint in seconds */
  duration: number;
  /** Easing function ('linear', 'easeInOut', 'easeIn', 'easeOut') */
  ease?: 'linear' | 'easeInOut' | 'easeIn' | 'easeOut';
  /** Optional rotation override at this waypoint [x, y, z] in radians */
  rotation?: [number, number, number];
}

/**
 * Complete flight path configuration
 */
export interface SpaceFlightConfig {
  /** Array of waypoints defining the flight path */
  waypoints: SpaceFlightWaypoint[];
  /** Total rotations to complete during the full cycle */
  rotationsPerCycle?: number;
  /** Whether the animation should loop infinitely */
  loop?: boolean;
  /** Delay before starting animation (ms) */
  delay?: number;
}

/**
 * Easing functions for smooth interpolation
 */
const easingFunctions = {
  linear: (t: number) => t,
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
};

@Directive({
  selector: '[spaceFlight3d]',
  standalone: true,
  hostDirectives: [],
})
export class SpaceFlight3dDirective implements OnInit, AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject<ElementRef<Object3D>>(ElementRef);
  private object3D: Object3D | null = null;

  // Configuration inputs
  readonly flightPath = input<SpaceFlightWaypoint[] | undefined>(undefined);
  readonly rotationsPerCycle = input<number>(8);
  readonly loop = input<boolean>(true);
  readonly autoStart = input<boolean>(true);
  readonly delay = input<number>(0);

  // Lifecycle outputs
  readonly animationStarted = output<void>();
  readonly animationComplete = output<void>();
  readonly waypointReached = output<{
    index: number;
    position: [number, number, number];
  }>();

  // Animation state
  private isAnimating = false;
  private elapsedTime = 0;
  private currentWaypointIndex = 0;
  private segmentElapsedTime = 0;
  private startPosition = new Vector3();
  private targetPosition = new Vector3();
  private startRotation = new Euler();
  private baseRotation = 0;
  private totalCycleDuration = 0;

  // Use injectBeforeRender for frame-loop animation
  private readonly cleanup = injectBeforeRender(({ delta }) => {
    if (!this.isAnimating || !this.object3D) return;

    // Update elapsed time
    this.elapsedTime += delta;
    this.segmentElapsedTime += delta;

    // Get current waypoint
    const path = this.flightPath();
    if (!path || path.length === 0) return;

    const waypoint = path[this.currentWaypointIndex];

    // Check if we've reached the end of this segment
    if (this.segmentElapsedTime >= waypoint.duration) {
      this.waypointReached.emit({
        index: this.currentWaypointIndex,
        position: waypoint.position,
      });

      // Move to next waypoint
      this.currentWaypointIndex++;

      // Check for loop or completion
      if (this.currentWaypointIndex >= path.length) {
        if (this.loop()) {
          this.currentWaypointIndex = 0;
          this.elapsedTime = 0;
          this.baseRotation = this.object3D.rotation.y;
        } else {
          this.isAnimating = false;
          this.animationComplete.emit();
          return;
        }
      }

      // Update segment timing
      this.segmentElapsedTime = 0;
      this.startPosition.copy(this.object3D.position);

      // Set new target
      const nextWaypoint = path[this.currentWaypointIndex];
      this.targetPosition.set(...nextWaypoint.position);
    }

    // Interpolate position
    const t = Math.min(this.segmentElapsedTime / waypoint.duration, 1);
    const easeFunc = easingFunctions[waypoint.ease || 'easeInOut'];
    const easedT = easeFunc(t);

    this.object3D.position.lerpVectors(
      this.startPosition,
      this.targetPosition,
      easedT
    );

    // Continuous rotation
    const rotationProgress = this.elapsedTime / this.totalCycleDuration;
    const totalRotations = this.rotationsPerCycle();
    this.object3D.rotation.y =
      this.baseRotation + rotationProgress * Math.PI * 2 * totalRotations;
    this.object3D.rotation.x = Math.sin(this.elapsedTime * 0.5) * 0.2;
    this.object3D.rotation.z = Math.cos(this.elapsedTime * 0.3) * 0.1;
  });

  ngOnInit(): void {
    // Calculate total cycle duration only if flight path is provided
    const path = this.flightPath();
    if (path && path.length > 0) {
      this.totalCycleDuration = path.reduce((sum, wp) => sum + wp.duration, 0);
    }
  }

  ngAfterViewInit(): void {
    // Get the Three.js object from the element
    this.object3D = this.elementRef.nativeElement as Object3D;

    // Only start animation if flight path is provided and autoStart is enabled
    const path = this.flightPath();
    if (this.autoStart() && path && path.length > 0) {
      // Delay start if specified
      const delayMs = this.delay();
      if (delayMs > 0) {
        setTimeout(() => this.start(), delayMs);
      } else {
        // Use setTimeout to ensure object is fully initialized
        setTimeout(() => this.start(), 0);
      }
    }
  }

  /**
   * Start the space flight animation
   */
  start(): void {
    const object = this.object3D;
    if (!object || this.isAnimating) return;

    const path = this.flightPath();
    if (path.length === 0) {
      console.warn('[SpaceFlight3d] No waypoints defined in flight path');
      return;
    }

    // Initialize animation state
    this.isAnimating = true;
    this.elapsedTime = 0;
    this.currentWaypointIndex = 0;
    this.segmentElapsedTime = 0;
    this.baseRotation = object.rotation.y;

    // Set starting position from initial waypoint
    this.startPosition.copy(object.position);
    this.targetPosition.set(...path[0].position);

    this.animationStarted.emit();
  }

  /**
   * Stop the animation
   */
  stop(): void {
    this.isAnimating = false;
  }

  /**
   * Pause the animation
   */
  pause(): void {
    this.isAnimating = false;
  }

  /**
   * Resume the animation
   */
  resume(): void {
    this.isAnimating = true;
  }

  /**
   * Check if animation is currently running
   */
  isRunning(): boolean {
    return this.isAnimating;
  }
}
