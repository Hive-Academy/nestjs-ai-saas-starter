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
    <ngt-group #nebulaGroup>
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
          [blending]="normalBlending"
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

  // Configuration inputs
  readonly particleCount = input<number>(20); // Fewer, larger clouds
  readonly radius = input<number>(50); // Distribution radius
  readonly colorPalette = input<string[]>(['#ffffff', '#cccccc', '#aaaaaa']);
  readonly minSize = input<number>(5); // Minimum cloud size
  readonly maxSize = input<number>(15); // Maximum cloud size
  readonly minOpacity = input<number>(0.1); // Minimum opacity (reduced for normal blending)
  readonly maxOpacity = input<number>(0.3); // Maximum opacity (reduced for normal blending)
  readonly flow = input<boolean>(true);

  // Three.js constants
  readonly normalBlending = THREE.NormalBlending; // Changed from AdditiveBlending to fix planet rendering

  /**
   * Generate procedural cloud texture
   * Creates a soft radial gradient with noise-like variation
   */
  readonly cloudTexture = computed(() => {
    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Create radial gradient from center
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );

    // Soft cloud gradient with smooth falloff
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)'); // Bright center
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)'); // Transparent edges

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Add noise/variation for organic appearance
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Add subtle random variation to alpha channel
      const noise = Math.random() * 0.3 - 0.15; // -0.15 to +0.15
      data[i + 3] = Math.max(0, Math.min(255, data[i + 3] * (1 + noise)));
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    console.log('[Nebula] Procedural cloud texture generated');
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
