/**
 * GlowParticleTextComponent - Neon Tube Particle Text
 *
 * Creates glowing neon-like text using dense particles with bright emissive colors.
 * Particles form letter shapes similar to neon tube signs, with bloom post-processing
 * for enhanced glow effect.
 *
 * Features:
 * - Dense particle clustering forming bright glowing text
 * - Neon tube aesthetic with emissive colors
 * - Pulse/flow animation along text
 * - GPU-instanced rendering for performance
 * - Bloom-ready (works with UnrealBloomPass)
 *
 * Usage:
 * ```html
 * <app-glow-particle-text
 *   text="NEON"
 *   [fontSize]="100"
 *   [particleDensity]="70"
 *   [glowColor]="Colors3D.neon.cyan.hex"
 *   [glowIntensity]="3.0"
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

interface GlowParticleData {
  basePos: [number, number, number];
  currentPos: [number, number, number];
  pathPosition: number; // Position along text path (0-1) for flow animation
  brightness: number; // Individual particle brightness
}

@Component({
  selector: 'app-glow-particle-text',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngt-group #groupRef>
      <!-- Particles added programmatically -->
    </ngt-group>
  `,
})
export class GlowParticleTextComponent {
  // Template refs
  readonly groupRef = viewChild.required<ElementRef<Group>>('groupRef');

  // Inputs
  readonly text = input.required<string>();
  readonly position = input<[number, number, number]>([0, 0, 0]);
  readonly fontSize = input<number>(100);
  readonly particleDensity = input<number>(70); // Higher density for neon effect
  readonly glowColor = input<number>(Colors3D.neon.cyan.hex); // Cyan neon
  readonly glowIntensity = input<number>(3.0);
  readonly particleSize = input<number>(0.025);
  readonly pulseSpeed = input<number>(2.0);
  readonly pulseAmount = input<number>(0.3);
  readonly flowSpeed = input<number>(1.0); // Speed of flow animation

  // Internal state
  private particles: GlowParticleData[] = [];
  private particleSystem?: Points;
  private particleTexture?: CanvasTexture;
  private time = 0;

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
      this.generateGlowParticles(positions, density);

      // Create particle texture
      if (!this.particleTexture) {
        this.particleTexture = this.createGlowTexture();
      }

      // Create particle system
      this.createParticleSystem(group);

      console.log('[GlowParticleText] Initialized:', {
        text,
        particleCount: this.particles.length,
        samplePoints: positions.length,
      });
    });

    // Effect 2: Animate particles (pulse and flow)
    injectBeforeRender(({ delta }) => {
      this.animateGlow(delta);
    });
  }

  /**
   * Sample pixel positions from canvas-rendered text
   */
  private sampleTextPositions(
    text: string,
    fontSize: number
  ): Array<{ pos: [number, number]; pathPos: number }> {
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
    const positions: Array<{ pos: [number, number]; pathPos: number }> = [];

    // Sample every pixel for high density
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const index = (y * canvas.width + x) * 4;
        const alpha = data[index + 3];

        if (alpha > 128) {
          const nx = (x - canvas.width / 2) / fontSize;
          const ny = -(y - canvas.height / 2) / fontSize;
          // Calculate path position (0-1) based on x position for flow effect
          const pathPos = x / canvas.width;
          positions.push({ pos: [nx, ny], pathPos });
        }
      }
    }

    return positions;
  }

  /**
   * Generate dense glow particles
   */
  private generateGlowParticles(
    positions: Array<{ pos: [number, number]; pathPos: number }>,
    density: number
  ): void {
    this.particles = [];

    // Higher particle count for neon tube effect
    const particlesPerPoint = Math.max(1, Math.floor(density / 15));

    positions.forEach(({ pos: [x, y], pathPos }) => {
      for (let i = 0; i < particlesPerPoint; i++) {
        // Minimal offset to keep particles tight (neon tube effect)
        const offsetX = (Math.random() - 0.5) * 0.01;
        const offsetY = (Math.random() - 0.5) * 0.01;
        const offsetZ = (Math.random() - 0.5) * 0.02;

        const basePos: [number, number, number] = [
          x + offsetX,
          y + offsetY,
          offsetZ,
        ];

        this.particles.push({
          basePos,
          currentPos: [...basePos],
          pathPosition: pathPos,
          brightness: 0.8 + Math.random() * 0.2, // Random brightness variation
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

    // Create material with bright emissive color
    const material = new PointsMaterial({
      size: this.particleSize(),
      color: new Color(this.glowColor()),
      map: this.particleTexture!,
      transparent: true,
      opacity: 1.0,
      blending: AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      toneMapped: false, // Prevent tone mapping from reducing glow
    });

    // Create particle system
    this.particleSystem = new Points(geometry, material);
    this.particleSystem.position.set(...this.position());
    group.add(this.particleSystem);
  }

  /**
   * Animate glow with pulse and flow
   */
  private animateGlow(delta: number): void {
    if (!this.particleSystem || this.particles.length === 0) return;

    this.time += delta;

    // Global pulse
    const pulse =
      Math.sin(this.time * this.pulseSpeed()) * this.pulseAmount() + 1.0;

    // Update material brightness
    const material = this.particleSystem.material as PointsMaterial;
    material.opacity = 0.7 + pulse * 0.3;

    // Flow animation: particles pulse based on their path position
    this.particles.forEach((particle) => {
      // Flow wave traveling along text
      const flowPhase =
        (this.time * this.flowSpeed() + particle.pathPosition) % 1.0;
      const flowPulse = Math.sin(flowPhase * Math.PI * 2) * 0.5 + 0.5;

      // Subtle position variation for energy effect
      const energyOffset = flowPulse * 0.01;
      particle.currentPos[0] = particle.basePos[0];
      particle.currentPos[1] = particle.basePos[1] + energyOffset;
      particle.currentPos[2] = particle.basePos[2] + energyOffset * 0.5;
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
   * Create bright glow texture
   */
  private createGlowTexture(): CanvasTexture {
    const canvas = document.createElement('canvas');
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Bright radial gradient for glow
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
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
