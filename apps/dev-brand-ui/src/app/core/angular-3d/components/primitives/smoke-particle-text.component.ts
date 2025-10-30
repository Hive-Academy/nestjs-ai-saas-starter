/**
 * SmokeParticleTextComponent - Dense Particle Cloud Forming Text
 *
 * Creates text where thousands of particles cluster to form letter shapes,
 * similar to volumetric smoke or particle clouds. Inspired by particle-based
 * logos and text effects where the density of particles creates the form.
 *
 * Features:
 * - Dense particle clustering forming recognizable text
 * - Organic drift animation using noise
 * - Volumetric smoky appearance
 * - GPU-instanced rendering for performance
 * - Additive blending for depth
 *
 * Usage:
 * ```html
 * <app-smoke-particle-text
 *   text="HELLO"
 *   [fontSize]="100"
 *   [particleDensity]="50"
 *   [smokeColor]="Colors3D.neon.purple.hex"
 *   [driftSpeed]="0.02"
 * />
 * ```
 */

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  effect,
  signal,
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
} from 'three';
import { Colors3D } from '../../config/colors.config';

// Register Three.js objects with angular-three
extend({ Group, BufferGeometry, Points, PointsMaterial });

interface ParticleData {
  basePos: [number, number, number]; // Original position from text
  currentPos: [number, number, number]; // Current position with drift
  velocity: [number, number, number]; // Drift velocity
  life: number; // For respawn cycles
  maxLife: number;
}

@Component({
  selector: 'app-smoke-particle-text',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngt-group #groupRef>
      <!-- Particles added programmatically -->
    </ngt-group>
  `,
})
export class SmokeParticleTextComponent {
  // Template refs
  readonly groupRef = viewChild.required<ElementRef<Group>>('groupRef');

  // Inputs
  readonly text = input.required<string>();
  readonly position = input<[number, number, number]>([0, 0, 0]);
  readonly fontSize = input<number>(100); // Canvas font size
  readonly particleDensity = input<number>(50); // Particles per 100 pixels
  readonly smokeColor = input<number>(Colors3D.neon.purple.hex); // Purple smoke
  readonly particleSize = input<number>(0.02);
  readonly opacity = input<number>(0.8);
  readonly driftSpeed = input<number>(0.02);
  readonly driftAmount = input<number>(0.05);

  // Internal state
  private particles: ParticleData[] = [];
  private particleSystem?: Points;
  private particleTexture?: CanvasTexture;
  private time = 0;
  readonly positionArray = signal(new Float32Array(0));

  constructor() {
    // Effect 1: Initialize particle system when text changes
    effect(() => {
      const group = this.groupRef().nativeElement;
      const text = this.text();
      const fontSize = this.fontSize();
      const density = this.particleDensity();

      if (!group || !text) return;

      // Sample text pixels
      const positions = this.sampleTextPositions(text, fontSize);

      // Generate particles from sampled positions
      this.generateParticlesFromPositions(positions, density);

      // Create particle texture
      if (!this.particleTexture) {
        this.particleTexture = this.createParticleTexture();
      }

      // Create particle system
      this.createParticleSystem(group);

      console.log('[SmokeParticleText] Initialized:', {
        text,
        particleCount: this.particles.length,
        samplePoints: positions.length,
      });
    });

    // Effect 2: Animate particles
    injectBeforeRender(({ delta }) => {
      this.animateParticles(delta);
    });
  }

  /**
   * Sample pixel positions from canvas-rendered text
   */
  private sampleTextPositions(
    text: string,
    fontSize: number
  ): [number, number][] {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];

    // Setup canvas
    const padding = 20;
    ctx.font = `bold ${fontSize}px Arial`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.2;

    canvas.width = textWidth + padding * 2;
    canvas.height = textHeight + padding * 2;

    // Render text
    ctx.fillStyle = 'white';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // Sample pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const positions: [number, number][] = [];

    // Sample every 2nd pixel for density
    for (let y = 0; y < canvas.height; y += 2) {
      for (let x = 0; x < canvas.width; x += 2) {
        const index = (y * canvas.width + x) * 4;
        const alpha = data[index + 3];

        // If pixel is part of text
        if (alpha > 128) {
          // Normalize to centered coordinates
          const nx = (x - canvas.width / 2) / fontSize;
          const ny = -(y - canvas.height / 2) / fontSize;
          positions.push([nx, ny]);
        }
      }
    }

    return positions;
  }

  /**
   * Generate dense particles from sampled text positions
   */
  private generateParticlesFromPositions(
    positions: [number, number][],
    density: number
  ): void {
    this.particles = [];

    // For each sampled position, create multiple particles for density
    const particlesPerPoint = Math.max(1, Math.floor(density / 10));

    positions.forEach(([x, y]) => {
      for (let i = 0; i < particlesPerPoint; i++) {
        // Add small random offset for volumetric effect
        const offsetX = (Math.random() - 0.5) * 0.02;
        const offsetY = (Math.random() - 0.5) * 0.02;
        const offsetZ = (Math.random() - 0.5) * 0.05;

        const basePos: [number, number, number] = [
          x + offsetX,
          y + offsetY,
          offsetZ,
        ];

        this.particles.push({
          basePos,
          currentPos: [...basePos],
          velocity: [
            (Math.random() - 0.5) * this.driftSpeed(),
            (Math.random() - 0.5) * this.driftSpeed(),
            (Math.random() - 0.5) * this.driftSpeed(),
          ],
          life: Math.random() * 5,
          maxLife: 5,
        });
      }
    });
  }

  /**
   * Create particle system
   */
  private createParticleSystem(group: Group): void {
    // Cleanup existing
    if (this.particleSystem) {
      group.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as PointsMaterial).dispose();
    }

    // Create geometry
    const geometry = new BufferGeometry();
    const positions = new Float32Array(this.particles.length * 3);
    this.updatePositionBuffer(positions);
    geometry.setAttribute('position', new BufferAttribute(positions, 3));

    // Create material
    const material = new PointsMaterial({
      size: this.particleSize(),
      color: new Color(this.smokeColor()),
      map: this.particleTexture!,
      transparent: true,
      opacity: this.opacity(),
      blending: AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    // Create particle system
    this.particleSystem = new Points(geometry, material);
    this.particleSystem.position.set(...this.position());
    group.add(this.particleSystem);
  }

  /**
   * Animate particles with organic drift
   */
  private animateParticles(delta: number): void {
    if (!this.particleSystem || this.particles.length === 0) return;

    this.time += delta;

    this.particles.forEach((particle) => {
      // Simple noise-like drift
      const noise =
        Math.sin(this.time + particle.basePos[0] * 10) *
        Math.cos(this.time + particle.basePos[1] * 10);

      // Update position with drift
      particle.currentPos[0] = particle.basePos[0] + noise * this.driftAmount();
      particle.currentPos[1] =
        particle.basePos[1] +
        Math.sin(this.time * 0.5 + particle.basePos[1]) * this.driftAmount();
      particle.currentPos[2] =
        particle.basePos[2] +
        Math.cos(this.time * 0.3 + particle.basePos[0]) * this.driftAmount();

      // Update life for future respawn logic
      particle.life -= delta;
      if (particle.life <= 0) {
        particle.life = particle.maxLife;
      }
    });

    // Update geometry
    const positionAttr = this.particleSystem.geometry.attributes[
      'position'
    ] as BufferAttribute;
    this.updatePositionBuffer(positionAttr.array as Float32Array);
    positionAttr.needsUpdate = true;
  }

  /**
   * Update position buffer
   */
  private updatePositionBuffer(buffer: Float32Array): void {
    this.particles.forEach((particle, i) => {
      buffer[i * 3] = particle.currentPos[0];
      buffer[i * 3 + 1] = particle.currentPos[1];
      buffer[i * 3 + 2] = particle.currentPos[2];
    });
  }

  /**
   * Create soft circular particle texture
   */
  private createParticleTexture(): CanvasTexture {
    const canvas = document.createElement('canvas');
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Radial gradient
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new CanvasTexture(canvas);
  }

  ngOnDestroy(): void {
    if (this.particleSystem) {
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as PointsMaterial).dispose();
    }
    if (this.particleTexture) {
      this.particleTexture.dispose();
    }
  }
}
