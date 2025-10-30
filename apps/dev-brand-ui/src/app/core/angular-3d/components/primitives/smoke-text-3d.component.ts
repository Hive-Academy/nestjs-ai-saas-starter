/**
 * SmokeText3DComponent - Text Formed by Smoke Particles
 *
 * Creates text where the letters themselves ARE smoke particles, similar to
 * the nebula component but shaped into text. Uses canvas sampling to generate
 * particle positions that form the text shape.
 *
 * Features:
 * - Text rendered as particle cloud
 * - Particles sampled from canvas text rendering
 * - Smoke-like movement with turbulence
 * - Additive blending for realistic smoke density
 * - Configurable particle count and spread
 *
 * Usage:
 * ```html
 * <app-smoke-text-3d
 *   text="SMOKE"
 *   [position]="[0, 2, 0]"
 *   [fontSize]="2"
 *   [particleCount]="5000"
 *   [smokeColor]="0xcccccc"
 * />
 * ```
 */

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  computed,
  effect,
  signal,
  inject,
  DestroyRef,
  AfterViewInit,
} from '@angular/core';
import { extend, injectBeforeRender, NgtArgs } from 'angular-three';
import {
  BufferGeometry,
  BufferAttribute,
  Points,
  PointsMaterial,
  AdditiveBlending,
  Color,
  CanvasTexture,
} from 'three';
import { Colors3D } from '../../config/colors.config';

extend({
  BufferGeometry,
  Points,
  PointsMaterial,
});

interface ParticleData {
  position: [number, number, number];
  velocity: [number, number, number];
  life: number;
  maxLife: number;
}

@Component({
  selector: 'app-smoke-text-3d',
  standalone: true,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @if (particleTexture() && positionArray().length > 0) {
    <ngt-points [position]="position()">
      <ngt-buffer-geometry>
        <ngt-buffer-attribute
          attach="attributes-position"
          *args="[positionArray(), 3]"
        />
      </ngt-buffer-geometry>
      <ngt-points-material
        [size]="particleSize()"
        [color]="smokeColor()"
        [map]="particleTexture()"
        [transparent]="true"
        [opacity]="baseOpacity()"
        [blending]="additiveBlending"
        [depthWrite]="false"
        [sizeAttenuation]="true"
      />
    </ngt-points>
    }
  `,
})
export class SmokeText3DComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  readonly additiveBlending = AdditiveBlending;

  // Text content
  readonly text = input.required<string>();

  // Transform
  readonly position = input<[number, number, number]>([0, 0, 0]);

  // Text rendering options
  readonly fontSize = input<number>(100); // Canvas font size
  readonly fontFamily = input<string>('Arial, sans-serif');
  readonly fontWeight = input<string>('bold');

  // Particle options
  readonly particleCount = input<number>(5000);
  readonly particleSize = input<number>(0.05);
  readonly smokeColor = input<number>(Colors3D.material.lightGray.hex);
  readonly baseOpacity = input<number>(0.8);

  // Smoke behavior
  readonly turbulenceSpeed = input<number>(0.3);
  readonly turbulenceScale = input<number>(0.5);
  readonly particleLifespan = input<number>(5); // seconds
  readonly respawnParticles = input<boolean>(true);

  // Internal state
  private particles: ParticleData[] = [];
  private textSamplePoints: [number, number][] = [];
  private time = 0;

  // Signals for reactive arrays
  readonly positionArray = signal(new Float32Array(0));
  readonly particleTexture = signal<CanvasTexture | null>(null);

  constructor() {
    // Generate particle texture
    effect(() => {
      this.generateParticleTexture();
    });

    // Initialize particles when text or particle count changes
    effect(() => {
      const text = this.text();
      const count = this.particleCount();
      if (text) {
        this.initializeParticles();
      }
    });

    // Animate particles
    injectBeforeRender(() => {
      this.updateParticles();
    });
  }

  ngAfterViewInit(): void {
    this.destroyRef.onDestroy(() => {
      this.cleanup();
    });
  }

  /**
   * Generate a soft circular particle texture
   */
  private generateParticleTexture(): void {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Create radial gradient for soft particle
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

    const texture = new CanvasTexture(canvas);
    this.particleTexture.set(texture);
  }

  /**
   * Sample text pixels from canvas and create particle spawn points
   */
  private sampleTextPixels(): void {
    const canvas = document.createElement('canvas');
    const fontSize = this.fontSize();
    const padding = 20;

    // Set canvas size based on text
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = `${this.fontWeight()} ${fontSize}px ${this.fontFamily()}`;
    const textMetrics = ctx.measureText(this.text());
    const textWidth = textMetrics.width;
    const textHeight = fontSize * 1.2;

    canvas.width = textWidth + padding * 2;
    canvas.height = textHeight + padding * 2;

    // Render text to canvas
    ctx.fillStyle = 'white';
    ctx.font = `${this.fontWeight()} ${fontSize}px ${this.fontFamily()}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text(), canvas.width / 2, canvas.height / 2);

    // Sample pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const samplePoints: [number, number][] = [];

    // Sample every Nth pixel where text is rendered
    const samplingRate = 3; // Sample every 3rd pixel
    for (let y = 0; y < canvas.height; y += samplingRate) {
      for (let x = 0; x < canvas.width; x += samplingRate) {
        const index = (y * canvas.width + x) * 4;
        const alpha = data[index + 3];

        // If pixel has text (alpha > threshold), add to sample points
        if (alpha > 128) {
          // Normalize coordinates centered at origin
          const nx = (x - canvas.width / 2) / fontSize;
          const ny = -(y - canvas.height / 2) / fontSize; // Flip Y for Three.js coords
          samplePoints.push([nx, ny]);
        }
      }
    }

    this.textSamplePoints = samplePoints;
  }

  /**
   * Initialize particles at text sample points
   */
  private initializeParticles(): void {
    // Sample text pixels
    this.sampleTextPixels();

    console.log('[SmokeText3D] Sample points:', this.textSamplePoints.length);

    if (this.textSamplePoints.length === 0) {
      console.warn('[SmokeText3D] No text sample points generated!');
      return;
    }

    this.particles = [];
    const count = this.particleCount();

    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle());
    }

    this.updateArrays();
    console.log(
      '[SmokeText3D] Initialized',
      this.particles.length,
      'particles'
    );
  }

  /**
   * Create a new particle at a random text sample point
   */
  private createParticle(): ParticleData {
    const samplePoint =
      this.textSamplePoints[
        Math.floor(Math.random() * this.textSamplePoints.length)
      ];

    // Add some random offset for smoke spread
    const spread = 0.02;
    const x = samplePoint[0] + (Math.random() - 0.5) * spread;
    const y = samplePoint[1] + (Math.random() - 0.5) * spread;
    const z = (Math.random() - 0.5) * 0.05;

    return {
      position: [x, y, z],
      velocity: [
        (Math.random() - 0.5) * 0.005,
        Math.random() * 0.002, // Slight upward drift
        (Math.random() - 0.5) * 0.005,
      ],
      life: Math.random() * this.particleLifespan(),
      maxLife: this.particleLifespan(),
    };
  }

  /**
   * Update particle positions and lifecycle
   */
  private updateParticles(): void {
    const delta = 0.016; // ~60fps
    this.time += delta;

    const turbulence = this.turbulenceSpeed();
    const scale = this.turbulenceScale();

    this.particles.forEach((particle, i) => {
      // Update life
      particle.life -= delta;

      // Respawn if dead
      if (particle.life <= 0) {
        if (this.respawnParticles()) {
          const newParticle = this.createParticle();
          Object.assign(particle, newParticle);
        }
        return;
      }

      // Apply turbulence (simple Perlin-like movement)
      const turbX =
        Math.sin(this.time + particle.position[0] * scale) * turbulence;
      const turbY =
        Math.sin(this.time + particle.position[1] * scale) * turbulence;
      const turbZ =
        Math.sin(this.time + particle.position[2] * scale) * turbulence;

      // Update position
      particle.position[0] += particle.velocity[0] + turbX * delta;
      particle.position[1] += particle.velocity[1] + turbY * delta;
      particle.position[2] += particle.velocity[2] + turbZ * delta;
    });

    this.updateArrays();
  }

  /**
   * Update position arrays for rendering
   */
  private updateArrays(): void {
    const positions = new Float32Array(this.particles.length * 3);

    this.particles.forEach((particle, i) => {
      positions[i * 3] = particle.position[0];
      positions[i * 3 + 1] = particle.position[1];
      positions[i * 3 + 2] = particle.position[2];
    });

    this.positionArray.set(positions);

    // Debug: Log first particle position once
    if (this.particles.length > 0 && positions.length > 0) {
      console.log('[SmokeText3D] First particle:', {
        x: positions[0],
        y: positions[1],
        z: positions[2],
        totalParticles: this.particles.length,
      });
    }
  }

  private cleanup(): void {
    const texture = this.particleTexture();
    if (texture) {
      texture.dispose();
    }
  }
}
