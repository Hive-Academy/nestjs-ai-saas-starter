/**
 * SpaceBackgroundComponent - Themed Gradient Background
 *
 * Renders a background sphere/plane with customizable gradients:
 * - Linear or radial gradient support
 * - Theme-based color palettes
 * - Large sphere wrapping the scene
 *
 * Usage:
 * ```html
 * <app-space-background
 *   [gradientType]="'radial'"
 *   [colors]="[0x000000, 0x0a0a1a, 0x000000]"
 *   [radius]="100"
 * />
 * ```
 */

import {
  Component,
  AfterViewInit,
  input,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  viewChild,
} from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-space-background',
  standalone: true,
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Large sphere that wraps the entire scene -->
    <ngt-mesh #backgroundMesh [scale]="[-1, 1, 1]">
      <ngt-sphere-geometry [args]="[radius(), 64, 64]" />
      <ngt-mesh-basic-material [side]="backSide" [fog]="false" />
    </ngt-mesh>
  `,
})
export class SpaceBackgroundComponent implements AfterViewInit {
  private readonly meshRef =
    viewChild<ElementRef<THREE.Mesh>>('backgroundMesh');

  // Configuration inputs
  readonly radius = input<number>(100);
  readonly gradientType = input<'linear' | 'radial'>('radial');
  readonly colors = input<number[]>([0x000000, 0x0a0a1a, 0x000000]);

  // Three.js constants
  readonly backSide = THREE.BackSide;

  ngAfterViewInit(): void {
    const mesh = this.meshRef()?.nativeElement;
    if (!mesh) {
      console.error('[SpaceBackground] Mesh ref not found!');
      return;
    }

    console.log('[SpaceBackground] Creating gradient texture...');
    console.log('[SpaceBackground] Gradient type:', this.gradientType());
    console.log('[SpaceBackground] Colors:', this.colors());

    // Create gradient texture
    const gradientTexture = this.createGradientTexture();

    // Apply texture to material
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.map = gradientTexture;
    material.needsUpdate = true;

    console.log('[SpaceBackground] Texture applied successfully');
  }

  /**
   * Create a canvas-based gradient texture
   */
  private createGradientTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    const size = 512;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }

    const gradientType = this.gradientType();
    const colors = this.colors();

    let gradient: CanvasGradient;

    if (gradientType === 'radial') {
      // Radial gradient from center
      gradient = ctx.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2
      );
    } else {
      // Linear gradient top to bottom
      gradient = ctx.createLinearGradient(0, 0, 0, size);
    }

    // Add color stops
    const stopCount = colors.length;
    colors.forEach((color, index) => {
      const stop = index / (stopCount - 1);
      const hexColor = this.numberToHex(color);
      gradient.addColorStop(stop, hexColor);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Convert number color to hex string
   */
  private numberToHex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  /**
   * Update gradient colors dynamically
   */
  updateGradient(newColors: number[]): void {
    const mesh = this.meshRef()?.nativeElement;
    if (!mesh) return;

    const material = mesh.material as THREE.MeshBasicMaterial;
    const newTexture = this.createGradientTexture();

    // Dispose old texture
    material.map?.dispose();

    // Apply new texture
    material.map = newTexture;
    material.needsUpdate = true;
  }

  /**
   * Get mesh instance
   */
  getMesh(): THREE.Mesh | undefined {
    const meshEl = this.meshRef();
    return meshEl?.nativeElement;
  }
}
