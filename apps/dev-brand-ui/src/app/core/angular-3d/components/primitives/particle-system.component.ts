/**
 * ParticleSystemComponent - Background Particle System
 *
 * Creates a particle system with configurable count, colors, and positioning.
 * Automatically creates particles in zones avoiding the center text area.
 *
 * Pattern Source: hero-section-old.component.ts lines 608-678
 *
 * Usage:
 * ```html
 * <app-particle-system
 *   [particleCount]="200"
 *   [colorPalette]="purpleColors"
 *   [exclusionZone]="{ x: 8, y: 4 }"
 * />
 * ```
 */

import {
  Component,
  AfterViewInit,
  input,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  viewChild,
} from '@angular/core';
import { extend } from 'angular-three';
import * as THREE from 'three';

extend(THREE);

@Component({
  selector: 'app-particle-system',
  standalone: true,
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngt-points #particlePoints>
      <ngt-buffer-geometry [attach]="['geometry']">
        <ngt-buffer-attribute
          attach="attributes-position"
          [args]="[particleData().positions, 3]"
        />
        <ngt-buffer-attribute
          attach="attributes-color"
          [args]="[particleData().colors, 3]"
        />
        <ngt-buffer-attribute
          attach="attributes-size"
          [args]="[particleData().sizes, 1]"
        />
      </ngt-buffer-geometry>
      <ngt-points-material
        [size]="size()"
        [sizeAttenuation]="true"
        [vertexColors]="true"
        [transparent]="true"
        [opacity]="opacity()"
        [blending]="additiveBlending"
      />
    </ngt-points>
  `,
})
export class ParticleSystemComponent implements AfterViewInit {
  private readonly meshRef =
    viewChild<ElementRef<THREE.Points>>('particlePoints');

  // Configuration inputs
  readonly particleCount = input<number>(200);
  readonly colorPalette = input<string[]>([
    '#4a1d6b', // Darker purple
    '#2d1b47', // Dark purple
    '#1a0d2e', // Very dark purple
    '#261242', // Dark violet
    '#1e1139', // Dark navy
  ]);
  readonly exclusionZone = input<{ x: number; y: number }>({ x: 8, y: 4 });
  readonly size = input<number>(0.8);
  readonly opacity = input<number>(0.5);

  // Three.js constants
  readonly additiveBlending = THREE.AdditiveBlending;

  /**
   * Generate particle data as computed signal
   * Based on hero-section-old.component.ts lines 613-654
   */
  readonly particleData = computed(() => {
    const count = this.particleCount();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const exclusion = this.exclusionZone();
    const colorChoices = this.colorPalette().map((hex) => new THREE.Color(hex));

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Create a larger "exclusion zone" around the text - push particles to edges
      let x: number, y: number, z: number;
      do {
        const radius = 12 + Math.random() * 25; // Start further from center
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.PI / 2 + (Math.random() - 0.5) * 1.4;

        x = radius * Math.sin(phi) * Math.cos(theta);
        y = (Math.random() - 0.5) * 15; // Wider vertical spread
        z = radius * Math.cos(phi) * 0.3; // Shallow depth
      } while (Math.abs(x) < exclusion.x && Math.abs(y) < exclusion.y);

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      // Random color from our palette
      const chosenColor =
        colorChoices[Math.floor(Math.random() * colorChoices.length)];
      colors[i3] = chosenColor.r;
      colors[i3 + 1] = chosenColor.g;
      colors[i3 + 2] = chosenColor.b;

      sizes[i] = Math.random() * 1.5 + 0.3;
    }

    return { positions, colors, sizes };
  });

  ngAfterViewInit(): void {
    // Store original position for parallax animation
    const meshEl = this.meshRef();
    if (meshEl?.nativeElement) {
      const mesh = meshEl.nativeElement;
      // Safety check: ensure position exists before accessing properties
      if (mesh.position) {
        mesh.userData['originalPosition'] = {
          x: mesh.position.x,
          y: mesh.position.y,
          z: mesh.position.z,
        };
      }
    }
  }

  /**
   * Get mesh instance for external manipulation
   */
  getMesh(): THREE.Points | undefined {
    const meshEl = this.meshRef();
    return meshEl?.nativeElement;
  }
}
