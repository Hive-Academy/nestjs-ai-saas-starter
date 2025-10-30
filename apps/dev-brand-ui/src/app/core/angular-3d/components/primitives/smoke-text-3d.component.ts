/**
 * SmokeText3DComponent - Crisp Text with Atmospheric Smoke Particles
 *
 * Creates crisp, readable text using troika-three-text SDF rendering with
 * atmospheric smoke particles drifting around the text as a decorative effect.
 *
 * Features:
 * - Crisp text rendering using troika SDF (NOT particles)
 * - Atmospheric smoke particles (NOT text-shaped)
 * - Particles drift and respawn for continuous effect
 * - Additive blending for realistic smoke atmosphere
 * - Configurable particle count and behavior
 *
 * Usage:
 * ```html
 * <app-smoke-text-3d
 *   text="SMOKE"
 *   [position]="[0, 2, 0]"
 *   [fontSize]="1.0"
 *   [particleCount]="500"
 *   [smokeColor]="0xcccccc"
 * />
 * ```
 */

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  effect,
  inject,
  DestroyRef,
  viewChild,
  ElementRef,
} from '@angular/core';
import { extend, injectBeforeRender } from 'angular-three';
import {
  BufferGeometry,
  BufferAttribute,
  Points,
  PointsMaterial,
  AdditiveBlending,
  Color,
  CanvasTexture,
  Group,
  MeshBasicMaterial,
} from 'three';
import { Text } from 'troika-three-text';
import { Colors3D } from '../../config/colors.config';

extend({
  BufferGeometry,
  Points,
  PointsMaterial,
  Group,
});

interface ParticleData {
  pos: [number, number, number];
  vel: [number, number, number];
  life: number;
}

@Component({
  selector: 'app-smoke-text-3d',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngt-group #groupRef [position]="position()">
      <!-- Text and particles added programmatically -->
    </ngt-group>
  `,
})
export class SmokeText3DComponent {
  private readonly destroyRef = inject(DestroyRef);

  // === INPUTS ===
  // Text content
  readonly text = input.required<string>();

  // Transform
  readonly position = input<[number, number, number]>([0, 0, 0]);

  // Text appearance
  readonly fontSize = input<number>(1.0);
  readonly textColor = input<number>(0xffffff);
  readonly textOpacity = input<number>(0.7);
  readonly font = input<string | undefined>(undefined);
  readonly anchorX = input<'left' | 'center' | 'right'>('center');
  readonly anchorY = input<'top' | 'middle' | 'bottom'>('middle');

  // Smoke particle appearance
  readonly smokeColor = input<number>(Colors3D.material.lightGray.hex);
  readonly smokeOpacity = input<number>(0.3);
  readonly particleCount = input<number>(500);
  readonly particleSize = input<number>(0.05);

  // Smoke behavior
  readonly turbulenceSpeed = input<number>(0.02);
  readonly driftSpeed = input<number>(0.02);
  readonly particleLifespan = input<number>(5);

  // === INTERNAL STATE ===
  readonly groupRef = viewChild<ElementRef<Group>>('groupRef');
  private textMesh?: Text;
  private particleSystem?: Points;
  private particles: ParticleData[] = [];
  private smokeTexture?: CanvasTexture;

  constructor() {
    // Effect 1: Text setup with troika
    effect(() => {
      const group = this.groupRef()?.nativeElement;
      if (!group) return;

      this.textMesh = new Text();
      this.textMesh.text = this.text();
      this.textMesh.fontSize = this.fontSize();
      this.textMesh.anchorX = this.anchorX();
      this.textMesh.anchorY = this.anchorY();

      if (this.font()) {
        this.textMesh.font = this.font();
      }

      // Semi-transparent material for smoke-like text
      this.textMesh.material = new MeshBasicMaterial({
        color: new Color(this.textColor()),
        transparent: true,
        opacity: this.textOpacity(),
      });

      this.textMesh.sync();
      group.add(this.textMesh);

      return () => {
        if (this.textMesh) {
          group.remove(this.textMesh);
          this.textMesh.dispose();
          this.textMesh = undefined;
        }
      };
    });

    // Effect 2: Particle system setup
    effect(() => {
      const group = this.groupRef()?.nativeElement;
      if (!group) return;

      // Generate smoke texture
      this.smokeTexture = this.generateSmokeTexture();

      // Initialize particles
      this.initializeParticles();

      // Create particle geometry
      const geometry = new BufferGeometry();
      const positions = new Float32Array(this.particleCount() * 3);
      this.updateParticlePositions(positions);
      geometry.setAttribute('position', new BufferAttribute(positions, 3));

      // Create particle material
      const material = new PointsMaterial({
        size: this.particleSize(),
        color: new Color(this.smokeColor()),
        map: this.smokeTexture,
        transparent: true,
        opacity: this.smokeOpacity(),
        blending: AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });

      // Create particle system
      this.particleSystem = new Points(geometry, material);
      this.particleSystem.position.set(0, 0, -0.5); // Behind text
      group.add(this.particleSystem);

      return () => {
        if (this.particleSystem) {
          group.remove(this.particleSystem);
          this.particleSystem.geometry.dispose();
          (this.particleSystem.material as PointsMaterial).dispose();
          this.particleSystem = undefined;
        }
        if (this.smokeTexture) {
          this.smokeTexture.dispose();
          this.smokeTexture = undefined;
        }
      };
    });

    // Effect 3: Particle animation
    injectBeforeRender(({ delta }) => {
      this.animateParticles(delta);
    });
  }

  /**
   * Initialize particles in simple distribution (NOT text-shaped)
   */
  private initializeParticles(): void {
    const count = this.particleCount();
    const textWidth = this.fontSize() * this.text().length * 0.6; // Approximate
    const textHeight = this.fontSize();

    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        pos: [
          (Math.random() - 0.5) * textWidth,
          (Math.random() - 0.5) * textHeight,
          (Math.random() - 0.5) * 0.5,
        ],
        vel: [
          (Math.random() - 0.5) * this.turbulenceSpeed(),
          Math.random() * this.driftSpeed(),
          (Math.random() - 0.5) * this.turbulenceSpeed(),
        ],
        life: Math.random() * this.particleLifespan(),
      });
    }
  }

  /**
   * Animate particles (drift and respawn)
   */
  private animateParticles(delta: number): void {
    if (!this.particleSystem) return;

    const textWidth = this.fontSize() * this.text().length * 0.6;
    const textHeight = this.fontSize();

    this.particles.forEach((p) => {
      // Update position
      p.pos[0] += p.vel[0];
      p.pos[1] += p.vel[1];
      p.pos[2] += p.vel[2];

      // Update life
      p.life -= delta;

      // Respawn if dead
      if (p.life <= 0) {
        p.pos[0] = (Math.random() - 0.5) * textWidth;
        p.pos[1] = (Math.random() - 0.5) * textHeight;
        p.pos[2] = (Math.random() - 0.5) * 0.5;
        p.life = this.particleLifespan();
      }
    });

    // Update geometry
    const positions = (
      this.particleSystem.geometry.attributes['position'] as BufferAttribute
    ).array as Float32Array;
    this.updateParticlePositions(positions);
    this.particleSystem.geometry.attributes['position'].needsUpdate = true;
  }

  /**
   * Update particle positions in geometry array
   */
  private updateParticlePositions(positions: Float32Array): void {
    this.particles.forEach((p, i) => {
      positions[i * 3] = p.pos[0];
      positions[i * 3 + 1] = p.pos[1];
      positions[i * 3 + 2] = p.pos[2];
    });
  }

  /**
   * Generate soft smoke particle texture
   */
  private generateSmokeTexture(): CanvasTexture {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Radial gradient for soft smoke particle
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new CanvasTexture(canvas);
  }
}
