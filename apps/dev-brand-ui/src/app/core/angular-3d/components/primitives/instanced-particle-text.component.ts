/**
 * InstancedParticleTextComponent - Smoke Cloud Text using Instanced Meshes
 *
 * Creates realistic smoke/cloud particle text using THREE.InstancedMesh with billboard
 * rotation. Each particle is a plane that rotates to face the camera, creating a
 * volumetric smoke effect. Based on the approach from:
 * https://tympanus.net/codrops/2022/11/08/3d-typing-effects-with-three-js/
 *
 * Features:
 * - InstancedMesh rendering (better performance than Points for complex particles)
 * - Billboard rotation (particles always face camera)
 * - Individual particle lifecycle (grow → pulse → shrink)
 * - Smoke texture alpha mapping for realistic clouds
 * - Particle recycling for smooth text transitions
 * - Random scale variation for organic depth
 *
 * Usage:
 * ```html
 * <app-instanced-particle-text
 *   text="CLOUDS"
 *   [fontSize]="60"
 *   [particleColor]="Colors3D.neon.cyan.hex"
 *   [opacity]="0.3"
 *   [maxParticleScale]="0.15"
 *   [particlesPerPixel]="3"
 *   [skipInitialGrowth]="true"
 * />
 * ```
 *
 * Tips:
 * - Keep maxParticleScale small (0.1-0.3) for realistic smoke
 * - Increase particlesPerPixel (3-5) for denser smoke clouds
 * - Blend modes:
 *   - 'additive': Soft wispy glow, but can blow out with bloom (use opacity 0.05-0.15)
 *   - 'normal': Solid readable text, prevents extreme glow (use opacity 0.3-0.6)
 * - Use skipInitialGrowth=true to avoid transition artifacts
 * - Uses same fractal noise texture as NebulaComponent for consistent look
 */

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  effect,
  viewChild,
  ElementRef,
  OnDestroy,
} from '@angular/core';
import { extend, injectBeforeRender } from 'angular-three';
import {
  PlaneGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  Group,
  Color,
  CanvasTexture,
  Camera,
  AdditiveBlending,
  NormalBlending,
  type Blending,
} from 'three';
import { random } from 'maath';
import { Colors3D } from '../../config/colors.config';

// Register Three.js objects with angular-three
extend({ Group, InstancedMesh, MeshBasicMaterial, PlaneGeometry });

interface TextureCoordinate {
  x: number;
  y: number;
  old: boolean; // Reused from previous frame
  toDelete: boolean; // Marked for fade-out
}

interface ParticleData {
  x: number;
  y: number;
  z: number;
  isGrowing: boolean;
  toDelete: boolean;
  scale: number;
  maxScale: number;
  deltaScale: number;
  age: number;
  ageDelta: number;
  rotationZ: number;
  deltaRotation: number;
}

@Component({
  selector: 'app-instanced-particle-text',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngt-group #groupRef>
      <!-- InstancedMesh added programmatically -->
    </ngt-group>
  `,
})
export class InstancedParticleTextComponent implements OnDestroy {
  // Template refs
  readonly groupRef = viewChild.required<ElementRef<Group>>('groupRef');

  // Inputs
  readonly text = input.required<string>();
  readonly position = input<[number, number, number]>([0, 0, 0]);
  readonly fontSize = input<number>(60); // Canvas font size
  readonly fontScaleFactor = input<number>(0.08); // Scale from canvas to 3D scene
  readonly particleColor = input<number>(Colors3D.neon.cyan.hex);
  readonly opacity = input<number>(0.15); // Very low opacity like nebula for soft blending
  readonly maxParticleScale = input<number>(0.15); // Maximum particle size (keep small!)
  readonly particlesPerPixel = input<number>(3); // Particles to spawn per sampled pixel
  readonly particleGrowSpeed = input<number>(0.03); // Growth rate
  readonly pulseSpeed = input<number>(0.01); // Pulse animation speed
  readonly smokeIntensity = input<number>(1.0); // Smoke texture intensity
  readonly skipInitialGrowth = input<boolean>(true); // Skip growth animation, appear immediately
  readonly blendMode = input<'additive' | 'normal'>('additive'); // Blending mode: 'additive' for glow, 'normal' for solid

  // Internal state
  private textCanvas!: HTMLCanvasElement;
  private textCtx!: CanvasRenderingContext2D;
  private particleGeometry?: PlaneGeometry;
  private particleMaterial?: MeshBasicMaterial;
  private instancedMesh?: InstancedMesh;
  private smokeTexture?: CanvasTexture;
  private dummy = new Object3D();

  private textureCoordinates: TextureCoordinate[] = [];
  private particles: ParticleData[] = [];

  private stringBox = {
    wTexture: 0,
    wScene: 0,
    hTexture: 0,
    hScene: 0,
  };

  constructor() {
    // Initialize canvas for text rendering
    this.textCanvas = document.createElement('canvas');
    this.textCanvas.width = 0;
    this.textCanvas.height = 0;
    const ctx = this.textCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Failed to get 2D context');
    this.textCtx = ctx;

    // Effect: Initialize particle system when text or settings change
    effect(() => {
      const group = this.groupRef().nativeElement;
      const text = this.text();
      const fontSize = this.fontSize();

      if (!group || !text) return;

      // Create smoke texture if needed
      if (!this.smokeTexture) {
        this.smokeTexture = this.createSmokeTexture();
      }

      // Sample text and create particles
      this.refreshText(text, fontSize);

      console.log('[InstancedParticleText] Initialized:', {
        text,
        particleCount: this.particles.length,
        coordinates: this.textureCoordinates.length,
      });
    });

    // Effect: Animate particles
    injectBeforeRender(({ camera }) => {
      this.animateParticles(camera);
    });
  }

  /**
   * Refresh text rendering and particle system
   */
  private refreshText(text: string, fontSize: number): void {
    this.sampleTextCoordinates(text, fontSize);
    this.updateParticles();
    this.recreateInstancedMesh();
  }

  /**
   * Sample pixel positions from canvas-rendered text
   */
  private sampleTextCoordinates(text: string, fontSize: number): void {
    // Setup canvas dimensions
    const fontName = 'Arial, sans-serif';
    this.textCtx.font = `bold ${fontSize}px ${fontName}`;
    const metrics = this.textCtx.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    const textHeight = Math.ceil(fontSize * 1.2);

    this.stringBox.wTexture = textWidth;
    this.stringBox.hTexture = textHeight;
    this.stringBox.wScene = textWidth * this.fontScaleFactor();
    this.stringBox.hScene = textHeight * this.fontScaleFactor();

    // Resize canvas and render text
    this.textCanvas.width = textWidth;
    this.textCanvas.height = textHeight;
    this.textCtx.font = `bold ${fontSize}px ${fontName}`;
    this.textCtx.fillStyle = '#ffffff';
    this.textCtx.textAlign = 'left';
    this.textCtx.textBaseline = 'top';
    this.textCtx.clearRect(0, 0, textWidth, textHeight);
    this.textCtx.fillText(text, 0, 0);

    // Sample coordinates from image data
    if (this.stringBox.wTexture > 0) {
      const imageData = this.textCtx.getImageData(
        0,
        0,
        this.textCanvas.width,
        this.textCanvas.height
      );
      const imageMask: boolean[][] = Array.from(
        Array(this.textCanvas.height),
        () => new Array(this.textCanvas.width)
      );

      // Build 2D mask from image data
      for (let i = 0; i < this.textCanvas.height; i++) {
        for (let j = 0; j < this.textCanvas.width; j++) {
          const alpha = imageData.data[(j + i * this.textCanvas.width) * 4 + 3];
          imageMask[i][j] = alpha > 128;
        }
      }

      if (this.textureCoordinates.length !== 0) {
        // Clean up deleted coordinates from previous frame
        this.textureCoordinates = this.textureCoordinates.filter(
          (c) => !c.toDelete
        );
        this.particles = this.particles.filter((p) => !p.toDelete);

        // Mark existing coordinates as old or toDelete
        this.textureCoordinates.forEach((c) => {
          if (imageMask[c.y] && imageMask[c.y][c.x]) {
            c.old = true;
            if (!c.toDelete) {
              imageMask[c.y][c.x] = false; // Mark as processed
            }
          } else {
            c.toDelete = true;
          }
        });
      }

      // Add new coordinates - sample every pixel for better text definition
      // For smaller text sizes, we need higher density sampling
      for (let i = 0; i < this.textCanvas.height; i++) {
        for (let j = 0; j < this.textCanvas.width; j++) {
          if (imageMask[i][j]) {
            this.textureCoordinates.push({
              x: j,
              y: i,
              old: false,
              toDelete: false,
            });
          }
        }
      }
    } else {
      this.textureCoordinates = [];
    }
  }

  /**
   * Update particles based on sampled coordinates
   * Creates multiple particles per coordinate for density
   */
  private updateParticles(): void {
    const scaleFactor = this.fontScaleFactor();
    const particlesPerPixel = this.particlesPerPixel();
    const newParticles: ParticleData[] = [];

    this.textureCoordinates.forEach((c, cIdx) => {
      const baseX = c.x * scaleFactor;
      const baseY = c.y * scaleFactor;

      // Create multiple particles per coordinate for smoke density
      for (let i = 0; i < particlesPerPixel; i++) {
        const particleIdx = cIdx * particlesPerPixel + i;

        // Reuse existing particle if coordinate is old
        const p =
          c.old && this.particles[particleIdx]
            ? this.particles[particleIdx]
            : this.createParticle(baseX, baseY);

        // Mark for deletion
        if (c.toDelete) {
          p.toDelete = true;
          p.scale = p.maxScale;
        }

        newParticles.push(p);
      }
    });

    this.particles = newParticles;
  }

  /**
   * Create new particle with random properties
   * Uses power distribution for more varied sizes (many small, few large)
   */
  private createParticle(x: number, y: number): ParticleData {
    // Power distribution: many small particles, few large ones
    const sizeFactor = Math.pow(Math.random(), 3); // Cube for more small particles
    const maxScale = 0.05 + this.maxParticleScale() * sizeFactor;
    const skipGrowth = this.skipInitialGrowth();

    // Smaller random offset for tighter, more readable text
    // Increase for more organic smoke spread, decrease for clearer letters
    const offsetRange = 0.15;

    return {
      x: x + offsetRange * (Math.random() - 0.5),
      y: y + offsetRange * (Math.random() - 0.5),
      z: (Math.random() - 0.5) * 0.05, // Very small z variation for flatter text
      isGrowing: !skipGrowth, // Skip growth if configured
      toDelete: false,
      scale: skipGrowth ? maxScale : 0, // Start at max scale if skipping growth
      maxScale: maxScale,
      deltaScale:
        this.particleGrowSpeed() + this.particleGrowSpeed() * Math.random(),
      age: Math.PI * Math.random(),
      ageDelta: this.pulseSpeed() + this.pulseSpeed() * 2 * Math.random(),
      rotationZ: Math.random() * Math.PI * 2, // Full rotation range
      deltaRotation: 0.01 * (Math.random() - 0.5),
    };
  }

  /**
   * Recreate instanced mesh with current particle count
   */
  private recreateInstancedMesh(): void {
    const group = this.groupRef().nativeElement;

    // Cleanup existing mesh
    if (this.instancedMesh) {
      group.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      (this.instancedMesh.material as MeshBasicMaterial).dispose();
    }

    // Create geometry and material if needed
    if (!this.particleGeometry) {
      this.particleGeometry = new PlaneGeometry(1, 1);
    }

    if (!this.particleMaterial) {
      const blending =
        this.blendMode() === 'additive' ? AdditiveBlending : NormalBlending;

      this.particleMaterial = new MeshBasicMaterial({
        color: new Color(this.particleColor()),
        alphaMap: this.smokeTexture!,
        depthTest: false,
        opacity: this.opacity(),
        transparent: true,
        blending: blending, // Configurable blending mode
        depthWrite: false,
      });
    }

    // Create instanced mesh
    this.instancedMesh = new InstancedMesh(
      this.particleGeometry,
      this.particleMaterial,
      this.particles.length
    );

    // Position mesh to center text (offset by half width/height in scene units)
    const [baseX, baseY, baseZ] = this.position();
    this.instancedMesh.position.set(
      baseX - 0.5 * this.stringBox.wScene,
      baseY - 0.5 * this.stringBox.hScene,
      baseZ
    );

    group.add(this.instancedMesh);
  }

  /**
   * Animate particles and update instance matrices
   */
  private animateParticles(camera: Camera): void {
    if (!this.instancedMesh || this.particles.length === 0) return;

    this.particles.forEach((p, idx) => {
      // Grow particle
      this.growParticle(p);

      // Billboard rotation (face camera)
      this.dummy.quaternion.copy(camera.quaternion);
      this.dummy.rotation.z += p.rotationZ;

      // Update scale and position
      this.dummy.scale.set(p.scale, p.scale, p.scale);
      this.dummy.position.set(p.x, this.stringBox.hScene - p.y, p.z);

      // Update matrix
      this.dummy.updateMatrix();
      this.instancedMesh!.setMatrixAt(idx, this.dummy.matrix);
    });

    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Update particle growth/shrink animation
   */
  private growParticle(p: ParticleData): void {
    p.age += p.ageDelta;
    p.rotationZ += p.deltaRotation;

    if (p.isGrowing) {
      // Growing phase
      p.scale += p.deltaScale;
      if (p.scale >= p.maxScale) {
        p.isGrowing = false;
      }
    } else if (p.toDelete) {
      // Shrinking phase (fade out)
      p.scale -= p.deltaScale;
      if (p.scale <= 0) {
        p.scale = 0;
        p.deltaScale = 0;
      }
    } else {
      // Pulsing phase
      p.scale = p.maxScale + 0.2 * Math.sin(p.age);
    }
  }

  /**
   * Create smoke texture for particles using fractal noise
   * Same approach as NebulaComponent for consistent wispy smoke appearance
   */
  private createSmokeTexture(): CanvasTexture {
    const canvas = document.createElement('canvas');
    const size = 256; // High resolution for quality
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    // Generate fractal noise texture (same as nebula)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Normalize coordinates to -0.5 to 0.5
        const nx = x / size - 0.5;
        const ny = y / size - 0.5;

        // Multi-octave fractal noise (4 octaves)
        let noiseValue = 0;
        let amplitude = 1.0;
        let frequency = 2.0;
        let maxValue = 0;

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

    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;

    console.log(
      '[InstancedParticleText] Fractal noise smoke texture generated'
    );
    return texture;
  }

  ngOnDestroy(): void {
    if (this.instancedMesh) {
      this.instancedMesh.geometry.dispose();
      (this.instancedMesh.material as MeshBasicMaterial).dispose();
    }
    if (this.particleGeometry) {
      this.particleGeometry.dispose();
    }
    if (this.particleMaterial) {
      this.particleMaterial.dispose();
    }
    if (this.smokeTexture) {
      this.smokeTexture.dispose();
    }
  }
}
