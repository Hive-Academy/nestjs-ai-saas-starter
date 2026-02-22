/**
 * OrbitControlsComponent - Camera Controls for Angular Three
 *
 * Uses Angular Three's recommended approach with three-stdlib and NgtArgs.
 * Enables user to rotate camera around a target point (typically the planet).
 *
 * Features:
 * - Click and drag to rotate camera around target
 * - Optional zoom (mouse wheel)
 * - Optional pan (right-click drag)
 * - Damping for smooth, professional feel
 * - Configurable constraints (min/max angles, distances)
 *
 * Usage in scene graph:
 * ```html
 * <app-orbit-controls
 *   [target]="[0, 0, 0]"
 *   [enableDamping]="true"
 *   [dampingFactor]="0.05"
 *   [enableZoom]="true"
 *   [minDistance]="8"
 *   [maxDistance]="20"
 * />
 * ```
 */

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import {
  extend,
  injectBeforeRender,
  injectStore,
  NgtArgs,
} from 'angular-three';
import { OrbitControls } from 'three-stdlib';

// Extend Angular Three catalogue with OrbitControls
extend({ OrbitControls });

@Component({
  selector: 'app-orbit-controls',
  standalone: true,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngt-orbit-controls
      #controls
      *args="[camera(), glDomElement()]"
      [target]="target()"
      [enableDamping]="enableDamping()"
      [dampingFactor]="dampingFactor()"
      [autoRotate]="autoRotate()"
      [autoRotateSpeed]="autoRotateSpeed()"
      [enableZoom]="enableZoom()"
      [minDistance]="minDistance()"
      [maxDistance]="maxDistance()"
      [zoomSpeed]="zoomSpeed()"
      [enablePan]="enablePan()"
      [panSpeed]="panSpeed()"
      [minPolarAngle]="minPolarAngle()"
      [maxPolarAngle]="maxPolarAngle()"
      [minAzimuthAngle]="minAzimuthAngle()"
      [maxAzimuthAngle]="maxAzimuthAngle()"
      [rotateSpeed]="rotateSpeed()"
    />
  `,
})
export class OrbitControlsComponent {
  private store = injectStore();

  // Camera and DOM element access for OrbitControls constructor
  protected camera = this.store.select('camera');
  protected glDomElement = this.store.select('gl', 'domElement');

  // Reference to controls element for update() calls
  private readonly controlsRef =
    viewChild<ElementRef<OrbitControls>>('controls');

  // Target point to orbit around (typically [0, 0, 0] for planet center)
  readonly target = input<[number, number, number]>([0, 0, 0]);

  // Damping (smooth camera movement)
  readonly enableDamping = input<boolean>(true);
  readonly dampingFactor = input<number>(0.05);

  // Auto-rotation (camera slowly rotates automatically)
  readonly autoRotate = input<boolean>(false);
  readonly autoRotateSpeed = input<number>(2.0);

  // Zoom controls
  readonly enableZoom = input<boolean>(true);
  readonly minDistance = input<number>(5);
  readonly maxDistance = input<number>(30);
  readonly zoomSpeed = input<number>(1.0);

  // Pan controls (right-click drag)
  readonly enablePan = input<boolean>(false);
  readonly panSpeed = input<number>(1.0);

  // Rotation constraints
  readonly minPolarAngle = input<number>(0); // Minimum vertical angle
  readonly maxPolarAngle = input<number>(Math.PI); // Maximum vertical angle
  readonly minAzimuthAngle = input<number>(-Infinity); // Minimum horizontal angle
  readonly maxAzimuthAngle = input<number>(Infinity); // Maximum horizontal angle

  // Rotation speed
  readonly rotateSpeed = input<number>(1.0);

  // ================================
  // OUTPUTS - Events
  // ================================

  /**
   * Emits whenever controls change (camera moves, zooms, rotates)
   * Useful for monitoring camera distance and state
   */
  readonly controlsChange = output<{
    distance: number;
    controls: OrbitControls;
  }>();

  constructor() {
    // Update controls in render loop (required when damping is enabled)
    injectBeforeRender(() => {
      const controlsEl = this.controlsRef();
      if (controlsEl && this.enableDamping()) {
        const controls = controlsEl.nativeElement;
        controls.update();

        // Emit change event with current distance
        const distance = controls.object.position.distanceTo(controls.target);
        this.controlsChange.emit({ distance, controls });
      }
    });
  }
}
