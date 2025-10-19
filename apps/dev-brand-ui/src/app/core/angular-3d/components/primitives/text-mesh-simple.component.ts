/**
 * Simple Text Mesh Component - Canvas-based text rendering for 3D
 *
 * Simpler alternative to HybridTextMesh that uses canvas text rendering
 * instead of html2canvas. More reliable for basic text display.
 */

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  viewChild,
  signal,
  PLATFORM_ID,
  effect,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { extend } from 'angular-three';
import { Mesh, PlaneGeometry, MeshBasicMaterial, CanvasTexture } from 'three';

extend({ Mesh, PlaneGeometry, MeshBasicMaterial });

@Component({
  selector: 'app-text-mesh-simple',
  standalone: true,
  imports: [],
  template: `
    <ngt-mesh
      #mesh
      [position]="position()"
      [scale]="scale()"
      [rotation]="rotation()"
    >
      <ngt-plane-geometry [args]="[width(), height()]" />
      <ngt-mesh-basic-material
        [map]="texture()"
        [transparent]="true"
        [opacity]="opacity()"
        [side]="2"
      />
    </ngt-mesh>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TextMeshSimpleComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  // Inputs
  readonly text = input.required<string>();
  readonly fontSize = input<number>(48);
  readonly fontFamily = input<string>('Arial, sans-serif');
  readonly textColor = input<string>('#ffffff');
  readonly backgroundColor = input<string>('transparent');

  readonly position = input<[number, number, number]>([0, 0, 0]);
  readonly scale = input<[number, number, number] | number>([1, 1, 1]);
  readonly rotation = input<[number, number, number]>([0, 0, 0]);
  readonly width = input<number>(4);
  readonly height = input<number>(2);
  readonly opacity = input<number>(1.0);

  readonly textureWidth = input<number>(1024);
  readonly textureHeight = input<number>(512);

  // State
  readonly texture = signal<CanvasTexture | null>(null);
  readonly meshRef = viewChild<ElementRef<Mesh>>('mesh');

  private canvas?: HTMLCanvasElement;
  private context?: CanvasRenderingContext2D;

  constructor() {
    // Re-render when text changes
    effect(() => {
      const text = this.text();
      if (this.canvas && text) {
        this.renderText();
      }
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    console.log('[TextMeshSimple] Creating texture for:', this.text());

    this.createCanvas();
    this.renderText();

    this.destroyRef.onDestroy(() => {
      this.cleanup();
    });
  }

  private createCanvas(): void {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.textureWidth();
    this.canvas.height = this.textureHeight();

    this.context =
      this.canvas.getContext('2d', {
        alpha: true,
        willReadFrequently: false,
      }) || undefined;

    if (this.context) {
      this.context.imageSmoothingEnabled = true;
      this.context.imageSmoothingQuality = 'high';
    }
  }

  private renderText(): void {
    if (!this.canvas || !this.context) {
      console.warn('[TextMeshSimple] Canvas not ready');
      return;
    }

    const ctx = this.context;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Background
    if (this.backgroundColor() !== 'transparent') {
      ctx.fillStyle = this.backgroundColor();
      ctx.fillRect(0, 0, width, height);
    }

    // Text styling
    const fontSize = this.fontSize();
    ctx.font = `bold ${fontSize}px ${this.fontFamily()}`;
    ctx.fillStyle = this.textColor();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Wrap text
    const text = this.text();
    const lines = this.wrapText(ctx, text, width - 40);
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = (height - totalHeight) / 2 + lineHeight / 2;

    // Draw each line
    lines.forEach((line, index) => {
      const y = startY + index * lineHeight;
      ctx.fillText(line, width / 2, y);
    });

    // Create/update texture
    const currentTexture = this.texture();
    if (currentTexture) {
      currentTexture.needsUpdate = true;
    } else {
      const newTexture = new CanvasTexture(this.canvas);
      newTexture.needsUpdate = true;
      this.texture.set(newTexture);
      console.log(
        '[TextMeshSimple] Texture created for:',
        text.substring(0, 30)
      );
    }
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word) => {
      const testLine = currentLine + word + ' ';
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine.trim());
    }

    return lines.length > 0 ? lines : [text];
  }

  private cleanup(): void {
    const currentTexture = this.texture();
    if (currentTexture) {
      currentTexture.dispose();
    }
    this.canvas = undefined;
    this.context = undefined;
  }

  getMesh(): Mesh | null {
    const meshRef = this.meshRef();
    return meshRef ? meshRef.nativeElement : null;
  }
}
