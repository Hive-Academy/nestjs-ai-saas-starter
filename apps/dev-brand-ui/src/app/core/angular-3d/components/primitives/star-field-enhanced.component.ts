/**
 * StarFieldEnhancedComponent - Multi-Size Glowing Star System
 *
 * Creates a realistic star field with:
 * - Multiple size variations (tiny, small, medium, large)
 * - Per-star glow using sprite materials
 * - Color temperature variation (blue, white, yellow, orange)
 * - Twinkle animation (optional)
 * - Parallax effect achieved via camera movement (OrbitControls)
 *
 * Usage:
 * ```html
 * <app-star-field-enhanced
 *   [starCount]="2000"
 *   [radius]="40"
 *   [enableTwinkle]="true"
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

interface StarData {
  position: [number, number, number];
  size: number;
  color: string;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

@Component({
  selector: 'app-star-field-enhanced',
  standalone: true,
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngt-group #starGroup>
      @for (star of starData(); track $index) {
      <ngt-sprite
        [position]="star.position"
        [scale]="[star.size, star.size, 1]"
      >
        <ngt-sprite-material
          [map]="starTexture()"
          [color]="star.color"
          [opacity]="star.brightness"
          [transparent]="true"
          [blending]="additiveBlending"
          [depthWrite]="false"
        />
      </ngt-sprite>
      }
    </ngt-group>
  `,
})
export class StarFieldEnhancedComponent {
  private readonly groupRef = viewChild<ElementRef<THREE.Group>>('starGroup');

  // Configuration inputs
  readonly starCount = input<number>(2000);
  readonly radius = input<number>(40);
  readonly enableTwinkle = input<boolean>(false);

  private clock = new THREE.Clock();

  /**
   * Get Three.js Group for external access
   */
  getObject3D(): THREE.Group | undefined {
    const groupEl = this.groupRef();
    return groupEl?.nativeElement;
  }

  // Stellar color palette based on temperature
  // Blue (hot) -> White -> Yellow -> Orange (cool)
  private readonly stellarColors = [
    '#9bb0ff', // O-type (blue, hottest)
    '#aabfff', // B-type (blue-white)
    '#cad7ff', // A-type (white)
    '#f8f7ff', // F-type (yellow-white)
    '#fff4ea', // G-type (yellow, like our Sun)
    '#ffd2a1', // K-type (orange)
    '#ffcc6f', // M-type (red-orange, coolest)
  ];

  // Three.js constants
  readonly additiveBlending = THREE.AdditiveBlending;

  /**
   * Generate procedural star glow texture
   * Creates a radial gradient with soft falloff
   */
  readonly starTexture = computed(() => {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Create radial gradient (center to edge)
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );

    // Bright center fading to transparent edges
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    console.log('[StarFieldEnhanced] Star glow texture generated');
    return texture;
  });

  /**
   * Generate star data with varied sizes and colors
   */
  readonly starData = computed(() => {
    const count = this.starCount();
    const radius = this.radius();

    // Generate random positions in sphere
    const positions = random.inSphere(new Float32Array(count * 3), { radius });

    const stars: StarData[] = [];

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const position: [number, number, number] = [
        positions[idx],
        positions[idx + 1],
        positions[idx + 2],
      ];

      // Size distribution: 80% tiny, 15% small, 4% medium, 1% large
      const rand = Math.random();
      let size: number;
      let brightness: number;

      if (rand < 0.8) {
        size = 0.05 + Math.random() * 0.05;
        brightness = 0.4 + Math.random() * 0.3;
      } else if (rand < 0.95) {
        size = 0.1 + Math.random() * 0.1;
        brightness = 0.6 + Math.random() * 0.3;
      } else if (rand < 0.99) {
        size = 0.2 + Math.random() * 0.15;
        brightness = 0.8 + Math.random() * 0.2;
      } else {
        size = 0.35 + Math.random() * 0.25;
        brightness = 0.9 + Math.random() * 0.1;
      }

      // Random color from stellar palette
      const color =
        this.stellarColors[
          Math.floor(Math.random() * this.stellarColors.length)
        ];

      stars.push({
        position,
        size,
        color,
        brightness,
        twinkleSpeed: 0.5 + Math.random() * 1.5,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }

    console.log('[StarFieldEnhanced] Generated', count, 'stars with glow');
    return stars;
  });

  constructor() {
    // Twinkle animation (if enabled)
    if (this.enableTwinkle()) {
      let time = 0;
      injectBeforeRender(() => {
        const deltaTime = this.clock.getDelta();
        time += deltaTime;

        const group = this.groupRef()?.nativeElement;
        if (!group) return;

        const stars = this.starData();
        group.children.forEach((sprite, index) => {
          if (sprite instanceof THREE.Sprite && stars[index]) {
            const star = stars[index];
            const material = sprite.material as THREE.SpriteMaterial;
            const twinkle =
              Math.sin(time * star.twinkleSpeed + star.twinklePhase) * 0.3 +
              0.7;
            material.opacity = star.brightness * twinkle;
          }
        });
      });
    }
  }
}
