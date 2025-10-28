/**
 * NebulaComponent - Volumetric Cloud/Dust Effect (Sprite-Based)
 *
 * Creates soft, wispy nebula clouds using sprite materials with procedural textures.
 * This replaces the previous point-based approach with proper volumetric rendering.
 *
 * Features:
 * - Procedurally generated cloud textures with soft falloff
 * - Sprite-based rendering for billboarding effect
 * - Additive blending for ethereal glow
 * - Layered depth with varying sizes and opacity
 * - Optional slow rotation animation
 *
 * Pattern inspired by:
 * - Three.js Sprite examples
 * - Volumetric cloud rendering techniques
 *
 * Usage:
 * ```html
 * <app-nebula
 *   [particleCount]="20"
 *   [radius]="50"
 *   [colorPalette]="['#ffffff', '#cccccc']"
 *   [minSize]="5"
 *   [maxSize]="15"
 *   [opacity]="0.3"
 *   [flow]="true"
 * />
 * ```
 */

import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';
import { injectBeforeRender } from 'angular-three';
import { random } from 'maath';
import * as THREE from 'three';

@Component({
  selector: 'app-nebula',
  standalone: true,
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngt-group #nebulaGroup [position]="position()">
      @for (cloud of cloudData(); track cloud.id) {
      <ngt-sprite
        [position]="cloud.position"
        [scale]="cloud.scale"
        [renderOrder]="999"
      >
        <ngt-sprite-material
          [map]="cloudTexture()"
          [color]="cloud.color"
          [transparent]="true"
          [opacity]="cloud.opacity"
          [blending]="additiveBlending"
          [depthWrite]="false"
          [depthTest]="true"
          [fog]="false"
        />
      </ngt-sprite>
      }
    </ngt-group>
  `,
})
export class NebulaComponent {
  private readonly groupRef = viewChild<ElementRef<THREE.Group>>('nebulaGroup');

  /**
   * Get Three.js Group for mouse interaction directives
   */
  getObject3D(): THREE.Group | undefined {
    const groupEl = this.groupRef();
    return groupEl?.nativeElement;
  }

  // Configuration inputs
  readonly position = input<[number, number, number]>([0, 0, 0]); // Group position
  readonly particleCount = input<number>(20); // Fewer, larger clouds
  readonly radius = input<number>(50); // Distribution radius
  readonly colorPalette = input<string[]>(['#ffffff', '#cccccc', '#aaaaaa']);
  readonly minSize = input<number>(5); // Minimum cloud size
  readonly maxSize = input<number>(15); // Maximum cloud size
  readonly minOpacity = input<number>(0.05); // Minimum opacity for realistic wispy clouds
  readonly maxOpacity = input<number>(0.15); // Maximum opacity for realistic wispy clouds
  readonly flow = input<boolean>(true);

  // Three.js constants
  readonly additiveBlending = THREE.AdditiveBlending; // Additive blending for realistic nebula glow

  /**
   * Generate procedural cloud texture with fractal noise
   * Creates realistic wispy clouds using multi-octave simplex noise
   */
  readonly cloudTexture = computed(() => {
    const canvas = document.createElement('canvas');
    const size = 512; // Higher resolution for better detail
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    // Generate fractal noise texture
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Normalize coordinates to -0.5 to 0.5
        const nx = x / size - 0.5;
        const ny = y / size - 0.5;

        // Multi-octave fractal noise (4 octaves)
        let noiseValue = 0;
        let amplitude = 1.0;
        let frequency = 2.0;
        let maxValue = 0; // For normalization

        for (let octave = 0; octave < 4; octave++) {
          noiseValue +=
            amplitude * random.noise.simplex2(nx * frequency, ny * frequency);
          maxValue += amplitude;
          amplitude *= 0.5; // Each octave contributes less
          frequency *= 2.0; // Each octave has higher frequency
        }

        // Normalize to 0-1 range
        noiseValue = (noiseValue / maxValue + 1.0) * 0.5;

        // Apply radial falloff for cloud shape
        const dist = Math.sqrt(nx * nx + ny * ny);
        const radialMask = Math.max(0, 1.0 - dist * 2.0);

        // Combine noise with radial mask for wispy cloud effect
        let alpha = noiseValue * radialMask;

        // Apply power curve for softer edges
        alpha = Math.pow(alpha, 1.5);

        // Write to image data
        const idx = (y * size + x) * 4;
        data[idx] = 255; // R
        data[idx + 1] = 255; // G
        data[idx + 2] = 255; // B
        data[idx + 3] = Math.floor(alpha * 255); // A
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    console.log('[Nebula] Fractal noise cloud texture generated (maath)');
    return texture;
  });

  /**
   * Generate cloud data with positions, sizes, and properties
   */
  readonly cloudData = computed(() => {
    const count = this.particleCount();
    const radius = this.radius();
    const palette = this.colorPalette();
    const minSize = this.minSize();
    const maxSize = this.maxSize();
    const minOpacity = this.minOpacity();
    const maxOpacity = this.maxOpacity();

    // Generate random positions in sphere
    const positions = random.inSphere(new Float32Array(count * 3), {
      radius,
    });

    const clouds = [];
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const position: [number, number, number] = [
        positions[idx],
        positions[idx + 1],
        positions[idx + 2],
      ];

      // Random size for each cloud
      const size = minSize + Math.random() * (maxSize - minSize);

      // Random color from palette
      const color = palette[Math.floor(Math.random() * palette.length)];

      // Random opacity variation
      const opacity = minOpacity + Math.random() * (maxOpacity - minOpacity);

      clouds.push({
        id: i,
        position,
        scale: [size, size, 1] as [number, number, number],
        color,
        opacity,
      });
    }

    console.log(`[Nebula] Generated ${count} cloud sprites`);
    return clouds;
  });

  constructor() {
    // Setup flow animation if enabled
    // injectBeforeRender must be called in injection context (constructor)
    if (this.flow()) {
      injectBeforeRender(({ delta }) => {
        const group = this.groupRef()?.nativeElement;
        if (group) {
          group.rotation.y += delta * 0.02; // Very slow rotation for nebula drift
        }
      });
    }
  }
}
