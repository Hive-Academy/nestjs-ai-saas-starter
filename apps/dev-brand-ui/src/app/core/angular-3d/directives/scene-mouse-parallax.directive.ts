/**
 * SceneMouseParallaxDirective - Scene-wide mouse-responsive camera and object movement
 *
 * Applies parallax effects to the ENTIRE scene - moves camera in orbital pattern
 * and applies parallax to ALL objects in the scene based on mouse position.
 *
 * NEW: Optionally updates HeroSceneStateStore with mouse Y position for state-driven animations
 *
 * ⚠️ SCENE-LEVEL ONLY: Apply to <ngt-canvas> / Scene3DComponent, NOT individual elements
 *
 * Features:
 * - Normalized mouse tracking (-1 to 1)
 * - Smooth camera orbital movement around scene origin
 * - Automatic parallax for ALL meshes and points in scene
 * - Configurable sensitivity and easing
 * - Optional hero state updates (mouse Y → animation progress)
 *
 * Usage:
 * ```html
 * <!-- Basic parallax -->
 * <ngt-canvas sceneMouseParallax [sensitivity]="0.4" />
 *
 * <!-- With hero state updates -->
 * <app-scene-3d
 *   [enableMouseParallax]="true"
 *   [mouseParallax]="{
 *     sensitivity: 0.4,
 *     smoothing: 5,
 *     cameraDistance: 12,
 *     updateHeroState: true
 *   }"
 * />
 * ```
 */

import { Directive, OnInit, OnDestroy, input, inject } from '@angular/core';
import { injectStore } from 'angular-three';
import * as THREE from 'three';
import { HeroSceneStateStore } from '../services/hero-scene-state.store';

@Directive({
  selector: '[sceneMouseParallax]',
  standalone: true,
})
export class SceneMouseParallaxDirective implements OnInit, OnDestroy {
  private readonly store = injectStore();

  // Optional hero state store injection
  private readonly heroState = inject(HeroSceneStateStore, { optional: true });

  // Configuration inputs
  readonly sensitivity = input<number>(0.4); // Mouse rotation multiplier
  readonly smoothing = input<number>(5); // Interpolation speed (higher = faster)
  readonly cameraDistance = input<number>(12); // Orbit radius

  // NEW: Enable state store updates
  readonly updateHeroState = input<boolean>(false);

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

      // NEW: Update hero state store if enabled and available
      if (this.updateHeroState() && this.heroState) {
        // Convert mouseY from -1/+1 to 0/1 progress
        // mouseY = -1 (top) → progress = 0
        // mouseY = 0 (middle) → progress = 0.5
        // mouseY = +1 (bottom) → progress = 1.0
        const progress = (this.mousePosition.y + 1) / 2;
        this.heroState.setMouseProgress(progress);
      }
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

        // Safety check: ensure originalPosition exists before using it
        if (!originalPos) return;

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
