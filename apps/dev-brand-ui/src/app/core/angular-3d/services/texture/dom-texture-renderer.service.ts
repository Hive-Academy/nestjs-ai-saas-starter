/**
 * DOMTextureRendererService - Renders DOM elements to canvas WITHOUT tainting
 *
 * CORS-Safe Approach using html2canvas:
 * - Renders full HTML including styles, gradients, and complex layout
 * - Proper handling of CSS gradients, emojis, and styled text
 * - CORS-safe by default (no external resources loaded)
 * - Falls back to simple text rendering if html2canvas fails
 */

import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import html2canvas from 'html2canvas';

export interface DOMRenderOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
}

@Injectable({
  providedIn: 'root',
})
export class DOMTextureRendererService {
  private readonly platformId = inject(PLATFORM_ID);
  private canvas?: HTMLCanvasElement;
  private context?: CanvasRenderingContext2D;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeCanvas();
    }
  }

  private initializeCanvas(): void {
    this.canvas = document.createElement('canvas');
    this.context =
      this.canvas.getContext('2d', {
        willReadFrequently: false,
        alpha: true,
      }) || undefined;

    if (this.context) {
      this.context.imageSmoothingEnabled = true;
      this.context.imageSmoothingQuality = 'high';
    }
  }

  /**
   * Render DOM element to THREE.CanvasTexture using html2canvas
   * CORS-safe: html2canvas renders with proper styling
   */
  async renderToTexture(
    element: HTMLElement,
    options: DOMRenderOptions = {}
  ): Promise<THREE.Texture> {
    const width = options.width || 512;
    const height = options.height || 512;

    try {
      // Use html2canvas for proper HTML rendering with all styles
      const canvas = await html2canvas(element, {
        width,
        height,
        scale: this.getScaleForQuality(options.quality),
        backgroundColor: options.backgroundColor || null, // null = transparent
        logging: false,
        allowTaint: false, // IMPORTANT: Prevent tainted canvas
        useCORS: false, // Don't try to load external resources
        removeContainer: true,
        imageTimeout: 0,
        foreignObjectRendering: false, // Don't use foreignObject (causes taint)
      });

      // Create texture from html2canvas result
      const texture = new THREE.CanvasTexture(canvas);

      // Configure for no taint issues
      texture.format = THREE.RGBAFormat;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false; // IMPORTANT: Disable mipmaps to avoid taint issues
      texture.needsUpdate = true;

      return texture;
    } catch (error) {
      console.warn(
        '[DOMTextureRenderer] html2canvas failed, falling back to simple rendering:',
        error
      );
      // Fallback to simple canvas rendering
      return this.renderFallback(element, width, height, options);
    }
  }

  /**
   * Fallback rendering using simple canvas (if html2canvas fails)
   */
  private async renderFallback(
    element: HTMLElement,
    width: number,
    height: number,
    options: DOMRenderOptions
  ): Promise<THREE.Texture> {
    if (!this.canvas || !this.context) {
      throw new Error('Canvas not initialized');
    }

    const backgroundColor = options.backgroundColor || 'transparent';

    // Set canvas size
    this.canvas.width = width;
    this.canvas.height = height;

    // Clear canvas
    this.context.clearRect(0, 0, width, height);

    // Fill background if specified
    if (backgroundColor !== 'transparent') {
      this.context.fillStyle = backgroundColor;
      this.context.fillRect(0, 0, width, height);
    }

    // Render element content using fallback
    await this.renderElement(element, width, height);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(this.canvas);

    // Configure for no taint issues
    texture.format = THREE.RGBAFormat;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * Get scale factor based on quality setting
   */
  private getScaleForQuality(
    quality?: 'low' | 'medium' | 'high' | 'ultra'
  ): number {
    switch (quality) {
      case 'low':
        return 0.5;
      case 'medium':
        return 1.0;
      case 'high':
        return 1.5;
      case 'ultra':
        return 2.0;
      default:
        return 1.0;
    }
  }

  /**
   * Render element using canvas-based approach (CORS-safe)
   */
  private async renderElement(
    element: HTMLElement,
    width: number,
    height: number
  ): Promise<void> {
    if (!this.context) return;

    const ctx = this.context;
    const styles = window.getComputedStyle(element);

    // Get colors
    const bgColor = this.parseColor(styles.backgroundColor);
    const textColor = this.parseColor(styles.color);
    const borderColor = this.parseColor(styles.borderColor);

    // Draw background
    if (bgColor) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
    }

    // Draw border
    const borderWidth = parseInt(styles.borderWidth || '0');
    if (borderWidth > 0 && borderColor) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(0, 0, width, height);
    }

    // Draw text content
    const text = element.textContent || element.innerText || '';
    if (text.trim()) {
      this.renderText(ctx, text, textColor || '#000000', styles, width, height);
    }
  }

  /**
   * Render text with proper wrapping and styling
   */
  private renderText(
    ctx: CanvasRenderingContext2D,
    text: string,
    color: string,
    styles: CSSStyleDeclaration,
    maxWidth: number,
    maxHeight: number
  ): void {
    ctx.fillStyle = color;

    // Parse font properties
    const fontSize = parseInt(styles.fontSize || '16');
    const fontFamily = styles.fontFamily || 'sans-serif';
    const fontWeight = styles.fontWeight || 'normal';
    const fontStyle = styles.fontStyle || 'normal';

    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Wrap text
    const padding = 20;
    const lines = this.wrapText(ctx, text, maxWidth - padding * 2);
    const lineHeight = fontSize * 1.5;
    const totalHeight = lines.length * lineHeight;
    const startY = (maxHeight - totalHeight) / 2;

    // Draw each line
    lines.forEach((line, index) => {
      const y = startY + index * lineHeight + lineHeight / 2;
      ctx.fillText(line, maxWidth / 2, y);
    });
  }

  /**
   * Wrap text to fit within width
   */
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

    return lines;
  }

  /**
   * Parse CSS color to usable format
   */
  private parseColor(color: string): string | null {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
      return null;
    }
    return color;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.canvas = undefined;
    this.context = undefined;
  }
}
