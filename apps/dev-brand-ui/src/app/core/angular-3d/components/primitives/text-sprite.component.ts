/**
 * TextSpriteComponent - Canvas-based Billboard Text Label
 *
 * Creates text labels that always face the camera using Sprite + CanvasTexture.
 * Based on Three.js billboard pattern for optimal performance and readability.
 *
 * Features:
 * - Automatic billboarding (always faces camera)
 * - Canvas-based text rendering with custom styling
 * - High-quality text with proper anti-aliasing
 * - Customizable font, size, color, and padding
 * - Transparent background support
 *
 * Usage:
 * ```html
 * <app-text-sprite
 *   text="LangChain"
 *   [position]="[0, 5, 0]"
 *   [fontSize]="32"
 *   [color]="'#3b82f6'"
 * />
 * ```
 *
 * Reference: https://threejs.org/manual/en/billboards.html
 */

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  computed,
  effect,
  ElementRef,
  viewChild,
} from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-text-sprite',
  standalone: true,
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngt-sprite [position]="position()" [scale]="spriteScale()">
      <ngt-sprite-material
        [map]="canvasTexture()"
        [transparent]="true"
        [depthTest]="true"
        [depthWrite]="false"
      />
    </ngt-sprite>
  `,
})
export class TextSpriteComponent {
  // Text content and positioning
  readonly text = input.required<string>();
  readonly position = input<[number, number, number]>([0, 0, 0]);

  // Text styling
  readonly fontSize = input<number>(32); // Canvas font size in pixels
  readonly fontFamily = input<string>('Arial, sans-serif');
  readonly color = input<string>('#ffffff');
  readonly backgroundColor = input<string | undefined>(undefined);
  readonly padding = input<number>(4);
  readonly borderRadius = input<number>(4);

  // Sprite scaling (controls world-space size)
  // Default 0.01 means 1 pixel = 0.01 units (centimeters if using meters)
  readonly scale = input<number>(0.01);

  /**
   * Generate canvas texture with text
   */
  protected readonly canvasTexture = computed(() => {
    const canvas = this.makeTextCanvas(
      this.text(),
      this.fontSize(),
      this.fontFamily(),
      this.color(),
      this.backgroundColor(),
      this.padding(),
      this.borderRadius()
    );

    const texture = new THREE.CanvasTexture(canvas);
    // Set proper filtering for non-power-of-2 canvas
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    return texture;
  });

  /**
   * Calculate sprite scale based on canvas dimensions
   */
  protected readonly spriteScale = computed<[number, number, number]>(() => {
    const texture = this.canvasTexture();
    const baseScale = this.scale();

    if (texture && texture.image) {
      const canvas = texture.image as HTMLCanvasElement;
      return [canvas.width * baseScale, canvas.height * baseScale, 1];
    }

    return [1, 1, 1];
  });

  /**
   * Create canvas with rendered text
   * Based on Three.js billboard example
   */
  private makeTextCanvas(
    text: string,
    fontSize: number,
    fontFamily: string,
    textColor: string,
    bgColor: string | undefined,
    padding: number,
    borderRadius: number
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }

    // Set font for measurement
    const font = `bold ${fontSize}px ${fontFamily}`;
    ctx.font = font;

    // Measure text
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.2; // Approximate height with line spacing

    // Calculate canvas size with padding
    const canvasWidth = Math.ceil(textWidth + padding * 2);
    const canvasHeight = Math.ceil(textHeight + padding * 2);

    // Set actual canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Re-set font after canvas resize (canvas clears on resize)
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Enable high-quality text rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw background if provided
    if (bgColor) {
      ctx.fillStyle = bgColor;
      if (borderRadius > 0) {
        // Rounded rectangle
        this.roundRect(ctx, 0, 0, canvasWidth, canvasHeight, borderRadius);
        ctx.fill();
      } else {
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
    }

    // Draw text
    ctx.fillStyle = textColor;
    ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);

    return canvas;
  }

  /**
   * Helper to draw rounded rectangle
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
