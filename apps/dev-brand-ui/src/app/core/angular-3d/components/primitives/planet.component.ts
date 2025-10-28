/**
 * PlanetComponent - Large Celestial Body Primitive
 *
 * Renders a realistic planet/moon sphere with:
 * - Customizable size and position
 * - Material configuration (color, metalness, roughness)
 * - Emissive glow effects
 * - Optional rotation animation (GSAP)
 * - Point light glow around the planet
 * - OrbitControls will handle user interactions
 *
 * Usage:
 * ```html
 * <app-planet
 *   [position]="[0, 0, 0]"
 *   [radius]="5"
 *   [baseColor]="0xcccccc"
 *   [rotationSpeed]="0.5"
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
  OnDestroy,
} from '@angular/core';
import { injectLoader } from 'angular-three';
import gsap from 'gsap';
import * as THREE from 'three';
import { TextureLoader } from 'three';

@Component({
  selector: 'app-planet',
  standalone: true,
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Planet Group (for child content to rotate with planet) -->
    <ngt-group #planetGroup [position]="position()">
      <!-- Planet Sphere -->
      <ngt-mesh
        #planetMesh
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

      <!-- Child content (markers, etc.) rotates with planet -->
      <ng-content />
    </ngt-group>

    <!-- Optional glow light around planet (outside group, doesn't rotate) -->
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
  private readonly groupRef = viewChild<ElementRef<THREE.Group>>('planetGroup');
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

  // Rotation animation (GSAP-based)
  readonly rotationSpeed = input<number>(0);
  readonly rotationAxis = input<'x' | 'y' | 'z'>('y');

  ngAfterViewInit(): void {
    const group = this.groupRef()?.nativeElement;
    if (!group) {
      console.error('[Planet] Group ref not found!');
      return;
    }

    console.log('[Planet] Initialized', {
      position: this.position(),
      radius: this.radius(),
    });

    // Start GSAP rotation animation if speed > 0
    const speed = this.rotationSpeed();
    if (speed !== 0) {
      this.startGSAPRotation(group);
    }
  }

  /**
   * Start GSAP continuous rotation animation
   * Note: Rotates the group so child content (markers) rotates with planet
   */
  private startGSAPRotation(group: THREE.Group): void {
    const speed = this.rotationSpeed();
    const axis = this.rotationAxis();

    const radiansPerSecond = (speed * Math.PI) / 180;
    const duration = (2 * Math.PI) / Math.abs(radiansPerSecond);

    let rotationTarget: number;
    switch (axis) {
      case 'x':
        rotationTarget =
          group.rotation.x + (speed > 0 ? 2 * Math.PI : -2 * Math.PI);
        break;
      case 'z':
        rotationTarget =
          group.rotation.z + (speed > 0 ? 2 * Math.PI : -2 * Math.PI);
        break;
      case 'y':
      default:
        rotationTarget =
          group.rotation.y + (speed > 0 ? 2 * Math.PI : -2 * Math.PI);
        break;
    }

    this.rotationAnimation = gsap.to(group.rotation, {
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
  }
}
