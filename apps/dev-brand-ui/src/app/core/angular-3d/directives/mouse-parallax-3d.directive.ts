/**
 * MouseParallax3dDirective - Mouse-responsive camera and object movement
 *
 * Adds smooth mouse tracking with parallax effects to Angular Three scenes.
 * Objects move at different rates based on mouse position for depth perception.
 *
 * Features:
 * - Normalized mouse tracking (-1 to 1)
 * - Smooth camera orbital movement
 * - Parallax object positioning
 * - Configurable sensitivity and easing
 *
 * Usage:
 * ```html
 * <ngt-canvas mouseParallax3d [sensitivity]="0.4" />
 * ```
 */

import { Directive, OnInit, OnDestroy, input } from '@angular/core';
import { injectStore } from 'angular-three';
import * as THREE from 'three';

@Directive({
  selector: '[mouseParallax3d]',
  standalone: true,
})
export class MouseParallax3dDirective implements OnInit, OnDestroy {
  private readonly store = injectStore();

  // Configuration inputs
  readonly sensitivity = input<number>(0.4); // Mouse rotation multiplier
  readonly smoothing = input<number>(5); // Interpolation speed (higher = faster)
  readonly cameraDistance = input<number>(12); // Orbit radius

  // Mouse tracking state
  private mousePosition = { x: 0, y: 0 };
  private targetRotation = { x: 0, y: 0 };
  private currentRotation = { x: 0, y: 0 };

  private animationFrameId?: number;
  private mouseMoveHandler?: (event: MouseEvent) => void;
  private clock = new THREE.Clock();

  ngOnInit(): void {
    this.setupMouseTracking();
    this.startAnimationLoop();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.mouseMoveHandler) {
      window.removeEventListener('mousemove', this.mouseMoveHandler);
    }
  }

  private setupMouseTracking(): void {
    this.mouseMoveHandler = (event: MouseEvent) => {
      // Normalize mouse position to -1 to 1 range
      this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Calculate target rotation based on mouse position
      this.targetRotation.y = this.mousePosition.x * this.sensitivity();
      this.targetRotation.x = this.mousePosition.y * (this.sensitivity() * 0.5);
    };

    window.addEventListener('mousemove', this.mouseMoveHandler, {
      passive: true,
    });
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      const scene = this.store.get('scene');
      const camera = this.store.get('camera');

      if (!scene || !camera) return;

      const deltaTime = this.clock.getDelta();

      // Smooth interpolation to mouse movement
      const smoothingFactor = deltaTime * this.smoothing();
      this.currentRotation.x +=
        (this.targetRotation.x - this.currentRotation.x) * smoothingFactor;
      this.currentRotation.y +=
        (this.targetRotation.y - this.currentRotation.y) * smoothingFactor;

      // Apply mouse-based rotation to camera (orbital movement)
      const distance = this.cameraDistance();
      camera.position.x = Math.sin(this.currentRotation.y) * distance;
      camera.position.z = Math.cos(this.currentRotation.y) * distance;
      camera.position.y = this.currentRotation.x * (distance * 0.5);
      camera.lookAt(0, 0, 0);

      // Apply parallax to all meshes in the scene
      this.applyParallaxToObjects(scene);
    };

    animate();
  }

  private applyParallaxToObjects(scene: THREE.Scene): void {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        // Store original position if not already stored
        if (!object.userData['originalPosition']) {
          object.userData['originalPosition'] = {
            x: object.position.x,
            y: object.position.y,
            z: object.position.z,
          };
        }

        const originalPos = object.userData['originalPosition'];

        // Different parallax factors based on object type/distance
        let parallaxFactorX = 1.0;
        let parallaxFactorZ = 0.5;
        let rotationFactor = 0.3;

        // Stronger parallax for closer objects (z > -2)
        if (originalPos.z > -2) {
          parallaxFactorX = 2.0;
          parallaxFactorZ = 1.2;
          rotationFactor = 0.6;
        }

        // Apply parallax position offset
        object.position.x =
          originalPos.x + this.currentRotation.y * parallaxFactorX;
        object.position.z =
          originalPos.z + this.currentRotation.x * parallaxFactorZ;

        // Apply rotation for spheres/meshes (not particles)
        if (object instanceof THREE.Mesh) {
          object.rotation.x += this.currentRotation.x * rotationFactor * 0.01;
          object.rotation.y += this.currentRotation.y * rotationFactor * 0.01;
        }

        // Apply rotation for particle systems
        if (object instanceof THREE.Points) {
          object.rotation.y = this.currentRotation.y * 0.3;
          object.rotation.x = this.currentRotation.x * 0.15;
        }
      }
    });
  }
}
