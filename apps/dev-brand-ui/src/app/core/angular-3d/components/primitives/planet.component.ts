/**
 * PlanetComponent - Large Celestial Body Primitive
 *
 * Renders a realistic planet/moon sphere with:
 * - Customizable size and position
 * - Material configuration (color, metalness, roughness)
 * - Emissive glow effects
 * - Optional rotation animation
 * - Point light glow around the planet
 *
 * Usage:
 * ```html
 * <app-planet
 *   [position]="[0, 0, 0]"
 *   [radius]="5"
 *   [baseColor]="0xcccccc"
 *   [emissiveColor]="0x888888"
 *   [emissiveIntensity]="0.2"
 *   [rotationSpeed]="0.5"
 *   [segments]="64"
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
export class PlanetComponent implements AfterViewInit {
  private readonly meshRef = viewChild<ElementRef<THREE.Mesh>>('planetMesh');
  private rotationAnimation?: gsap.core.Tween;

  // Position and size
  readonly position = input<[number, number, number]>([0, 0, 0]); // Standard Three.js origin
  readonly radius = input<number>(6.5); // Human-scale radius (~70% viewport coverage)
  readonly segments = input<number>(64); // Higher = smoother sphere
  readonly scale = input<number>(1);
  readonly enableMouseParallax = input<boolean>(false);
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

  // Rotation animation
  readonly rotationSpeed = input<number>(0); // Degrees per second (0 = no rotation)
  readonly rotationAxis = input<'x' | 'y' | 'z' | 'xy'>('y');

  ngAfterViewInit(): void {
    const mesh = this.meshRef()?.nativeElement;
    if (!mesh) {
      console.error('[Planet] Mesh ref not found!');
      return;
    }

    // Ensure userData exists
    if (!mesh.userData) {
      mesh.userData = {};
    }

    // Mark planet to be excluded from scene parallax
    // This will be checked by scene-mouse-parallax directive
    mesh.userData['excludeFromParallax'] = true;

    console.log('[Planet] Initialized');
    console.log('[Planet] Position:', this.position());
    console.log('[Planet] Radius:', this.radius());
    console.log('[Planet] Scale:', this.scale());
    console.log(
      '[Planet] Mesh scale:',
      mesh.scale.x,
      mesh.scale.y,
      mesh.scale.z
    );
    // console.log('[Planet] Geometry radius:', mesh.geometry.parameters.radius);
    console.log(
      '[Planet] Actual world position:',
      mesh.position.x,
      mesh.position.y,
      mesh.position.z
    );
    console.log('[Planet] Base color:', this.baseColor().toString(16));
    console.log(
      '[Planet] Emissive:',
      this.emissiveColor().toString(16),
      'intensity:',
      this.emissiveIntensity()
    );
    console.log('[Planet] Material:', mesh.material);

    // Start rotation animation if speed > 0
    const speed = this.rotationSpeed();
    if (speed !== 0) {
      this.startRotation(mesh);
    }
  }

  /**
   * Start continuous rotation animation
   */
  private startRotation(mesh: THREE.Mesh): void {
    const speed = this.rotationSpeed();
    const axis = this.rotationAxis();

    // Convert degrees per second to radians
    const radiansPerSecond = (speed * Math.PI) / 180;
    const duration = (2 * Math.PI) / Math.abs(radiansPerSecond);

    // Determine rotation target based on axis
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

    // Create infinite rotation animation
    this.rotationAnimation = gsap.to(mesh.rotation, {
      [axis]: rotationTarget,
      duration,
      ease: 'none',
      repeat: -1,
    });
  }

  /**
   * Get mesh instance for external manipulation
   */
  getMesh(): THREE.Mesh | undefined {
    const meshEl = this.meshRef();
    return meshEl?.nativeElement;
  }

  /**
   * Cleanup animation on destroy
   */
  ngOnDestroy(): void {
    this.rotationAnimation?.kill();
  }
}
