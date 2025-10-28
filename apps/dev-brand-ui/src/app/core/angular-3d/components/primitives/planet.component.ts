/**
 * PlanetComponent - Large Celestial Body Primitive with Mouse Interactions
 *
 * Renders a realistic planet/moon sphere with:
 * - Customizable size and position
 * - Material configuration (color, metalness, roughness)
 * - Emissive glow effects
 * - Optional rotation animation
 * - Point light glow around the planet
 * - Mouse rotation and hover interactions (via config inputs)
 *
 * Usage:
 * ```html
 * <app-planet
 *   [position]="[0, 0, 0]"
 *   [radius]="5"
 *   [baseColor]="0xcccccc"
 *   [mouseRotation]="{ factor: 0.3, axis: 'xy', smoothing: 8 }"
 *   [mouseHover]="{ scale: 1.12, speed: 6 }"
 * />
 * ```
 */

import {
  AfterViewInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  input,
  viewChild,
  inject,
  OnDestroy,
  Injector,
} from '@angular/core';
import { injectBeforeRender, injectLoader } from 'angular-three';
import gsap from 'gsap';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { MouseInteractionService } from '../../services/mouse-interaction.service';
import type {
  RotationConfig,
  HoverConfig,
} from '../../types/mouse-interaction.types';

@Component({
  selector: 'app-planet',
  standalone: true,
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Planet Sphere -->
    <ngt-mesh
      #planetMesh
      [position]="position()"
      [scale]="scale()"
      [castShadow]="true"
      [receiveShadow]="true"
    >
      <ngt-sphere-geometry [args]="[radius(), segments(), segments()]" />
      <!-- Always use standard material, texture loaded if URL provided -->
      <ngt-mesh-standard-material
        [color]="baseColor()"
        [map]="textureUrl() ? moonTexture() : undefined"
        [bumpMap]="textureUrl() ? moonTexture() : undefined"
        [bumpScale]="1"
        [emissive]="emissiveColor()"
        [emissiveIntensity]="emissiveIntensity()"
        [metalness]="textureUrl() ? 0.1 : metalness()"
        [roughness]="textureUrl() ? 0.9 : roughness()"
      />
    </ngt-mesh>

    <!-- Optional glow light around planet -->
    @if (glowIntensity() > 0) {
    <ngt-point-light
      [position]="position()"
      [color]="glowColor()"
      [intensity]="glowIntensity()"
      [distance]="glowDistance()"
      [decay]="2"
    />
    }
  `,
})
export class PlanetComponent implements AfterViewInit, OnDestroy {
  private readonly meshRef = viewChild<ElementRef<THREE.Mesh>>('planetMesh');
  private rotationAnimation?: gsap.core.Tween;

  // Position and size
  readonly position = input<[number, number, number]>([0, 0, 0]);
  readonly radius = input<number>(6.5);
  readonly segments = input<number>(64);
  readonly scale = input<number>(1);

  // Texture URL (optional - for photorealistic rendering)
  readonly textureUrl = input<string | undefined>(null);

  readonly moonTexture = injectLoader(
    () => TextureLoader,
    () => this.textureUrl() ?? 'assets/earth.jpg'
  );

  readonly mouseService = inject(MouseInteractionService);
  readonly injector = inject(Injector);
  // Material properties
  readonly baseColor = input<number>(0xcccccc);
  readonly emissiveColor = input<number>(0x888888);
  readonly emissiveIntensity = input<number>(0.2);
  readonly metalness = input<number>(0.3);
  readonly roughness = input<number>(0.7);

  // Glow effect
  readonly glowColor = input<number>(0xffffff);
  readonly glowIntensity = input<number>(0.8);
  readonly glowDistance = input<number>(15);

  // Rotation animation (GSAP-based, separate from mouse rotation)
  readonly rotationSpeed = input<number>(0);
  readonly rotationAxis = input<'x' | 'y' | 'z'>('y');

  // Mouse Interactions (NEW)
  readonly mouseRotation = input<RotationConfig | undefined>();
  readonly mouseHover = input<HoverConfig | undefined>();

  private originalRotation?: THREE.Euler;
  private originalScale = 1;
  private currentRotationX = 0;
  private currentRotationY = 0;
  private targetRotationX = 0;
  private targetRotationY = 0;
  private currentScale = 1;
  private targetScale = 1;
  private clock = new THREE.Clock();

  ngAfterViewInit(): void {
    const mesh = this.meshRef()?.nativeElement;
    if (!mesh) {
      console.error('[Planet] Mesh ref not found!');
      return;
    }

    console.log('[Planet] Initialized', {
      position: this.position(),
      radius: this.radius(),
      hasMouseRotation: !!this.mouseRotation(),
      hasMouseHover: !!this.mouseHover(),
    });

    // Store original state
    this.originalRotation = mesh.rotation.clone();
    this.originalScale = mesh.scale.x;
    this.currentScale = this.originalScale;
    this.targetScale = this.originalScale;

    // Start GSAP rotation animation if speed > 0
    const speed = this.rotationSpeed();
    if (speed !== 0) {
      this.startGSAPRotation(mesh);
    }

    // Setup mouse interactions if configured
    if (this.mouseRotation() || this.mouseHover()) {
      this.mouseService.initialize();
      this.setupMouseInteractions(mesh);
    }
  }

  /**
   * Setup mouse-based rotation and hover interactions
   */
  private setupMouseInteractions(mesh: THREE.Mesh): void {
    if (!this.mouseService) return;

    const rotationConfig = this.mouseRotation();
    const hoverConfig = this.mouseHover();

    console.log('[Planet] Setting up mouse interactions', {
      rotation: rotationConfig,
      hover: hoverConfig,
    });

    injectBeforeRender(
      () => {
        if (!this.mouseService || !mesh || !this.originalRotation) return;

        const mouseX = this.mouseService.smoothMouseX();
        const mouseY = this.mouseService.smoothMouseY();
        const deltaTime = this.clock.getDelta();

        // Mouse Rotation
        if (rotationConfig) {
          const factor = rotationConfig.factor ?? 0.5;
          const axis = rotationConfig.axis ?? 'xy';
          const smoothing = rotationConfig.smoothing ?? 8;

          // Calculate target rotation based on mouse
          this.targetRotationX = mouseY * factor;
          this.targetRotationY = mouseX * factor;

          // Smooth interpolation
          const smoothingFactor = deltaTime * smoothing;
          this.currentRotationX +=
            (this.targetRotationX - this.currentRotationX) * smoothingFactor;
          this.currentRotationY +=
            (this.targetRotationY - this.currentRotationY) * smoothingFactor;

          // Apply rotation (additive to GSAP rotation)
          if (axis === 'x') {
            mesh.rotation.x = this.originalRotation.x + this.currentRotationX;
          } else if (axis === 'y') {
            mesh.rotation.y = this.originalRotation.y + this.currentRotationY;
          } else if (axis === 'z') {
            mesh.rotation.z = this.originalRotation.z + this.currentRotationY;
          } else if (axis === 'xy') {
            mesh.rotation.x = this.originalRotation.x + this.currentRotationX;
            mesh.rotation.y = this.originalRotation.y + this.currentRotationY;
          }
        }

        // Mouse Hover (simple scale, no raycasting for now)
        if (hoverConfig) {
          const hoverScale = hoverConfig.scale ?? 1.15;
          const hoverSpeed = hoverConfig.speed ?? 8;

          // For now, use simple distance-based hover (can add raycasting later)
          // Just demonstrate the interpolation
          this.targetScale = this.originalScale; // Default to original

          // Smooth scale transition
          const smoothingFactor = deltaTime * hoverSpeed;
          this.currentScale +=
            (this.targetScale - this.currentScale) * smoothingFactor;

          mesh.scale.setScalar(this.currentScale);
        }
      },
      {
        injector: this.injector,
      }
    );
  }

  /**
   * Start GSAP continuous rotation animation
   */
  private startGSAPRotation(mesh: THREE.Mesh): void {
    const speed = this.rotationSpeed();
    const axis = this.rotationAxis();

    const radiansPerSecond = (speed * Math.PI) / 180;
    const duration = (2 * Math.PI) / Math.abs(radiansPerSecond);

    let rotationTarget: number;
    switch (axis) {
      case 'x':
        rotationTarget =
          mesh.rotation.x + (speed > 0 ? 2 * Math.PI : -2 * Math.PI);
        break;
      case 'z':
        rotationTarget =
          mesh.rotation.z + (speed > 0 ? 2 * Math.PI : -2 * Math.PI);
        break;
      case 'y':
      default:
        rotationTarget =
          mesh.rotation.y + (speed > 0 ? 2 * Math.PI : -2 * Math.PI);
        break;
    }

    this.rotationAnimation = gsap.to(mesh.rotation, {
      [axis]: rotationTarget,
      duration,
      ease: 'none',
      repeat: -1,
    });
  }

  /**
   * Get mesh instance for external access
   */
  getMesh(): THREE.Mesh | undefined {
    const meshEl = this.meshRef();
    return meshEl?.nativeElement;
  }

  ngOnDestroy(): void {
    this.rotationAnimation?.kill();
    if (this.mouseService) {
      this.mouseService.destroy();
    }
  }
}
