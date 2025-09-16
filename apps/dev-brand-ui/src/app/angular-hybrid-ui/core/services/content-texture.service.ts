import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { ContentTextureOptions, ContentRenderer } from '../types/hybrid-ui.types';

/**
 * Content Texture Service
 * Converts HTML elements to high-quality 3D textures with proper typography,
 * styling, and layout preservation
 */
@Injectable({
  providedIn: 'root'
})
export class ContentTextureService implements ContentRenderer {

  private readonly textureCache = new Map<string, THREE.CanvasTexture>();
  private readonly canvasPool: HTMLCanvasElement[] = [];
  private readonly observer = new MutationObserver(this.handleDOMChanges.bind(this));

  // Default texture options optimized for readability and performance
  private readonly defaultOptions: ContentTextureOptions = {
    width: 1024,
    height: 1280,
    dpi: 2,
    backgroundColor: 'rgba(20, 20, 40, 0.95)',
    padding: 40,
    borderRadius: 12,
    border: {
      width: 3,
      color: '#3b82f6',
      style: 'solid'
    },
    shadow: {
      blur: 20,
      color: 'rgba(0, 0, 0, 0.3)',
      offsetX: 0,
      offsetY: 4
    }
  };

  /**
   * Render HTML element to 3D texture with optimal quality
   */
  render(element: HTMLElement, options?: Partial<ContentTextureOptions>): THREE.CanvasTexture {
    const fullOptions = { ...this.defaultOptions, ...options };
    const cacheKey = this.generateCacheKey(element, fullOptions);

    // Return cached texture if available
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    const canvas = this.getCanvas();
    const ctx = canvas.getContext('2d')!;

    // Setup canvas with high DPI for crisp rendering
    this.setupCanvas(canvas, ctx, fullOptions);

    // Render element content
    this.renderElementContent(element, ctx, fullOptions);

    // Create Three.js texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    // Cache for reuse
    this.textureCache.set(cacheKey, texture);

    // Setup DOM observation for automatic updates
    this.observeElement(element, cacheKey);

    // Return canvas to pool
    this.returnCanvas(canvas);

    return texture;
  }

  /**
   * Update existing texture when DOM changes
   */
  updateTexture(texture: THREE.CanvasTexture, element: HTMLElement): void {
    const canvas = texture.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;

    // Clear and re-render
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const options = this.getOptionsFromTexture(texture);
    this.renderElementContent(element, ctx, options);

    texture.needsUpdate = true;
  }

  /**
   * Dispose texture and cleanup resources
   */
  dispose(texture: THREE.CanvasTexture): void {
    texture.dispose();

    // Remove from cache
    for (const [key, cachedTexture] of this.textureCache.entries()) {
      if (cachedTexture === texture) {
        this.textureCache.delete(key);
        break;
      }
    }
  }

  /**
   * Clear all cached textures
   */
  clearCache(): void {
    this.textureCache.forEach(texture => texture.dispose());
    this.textureCache.clear();
  }

  /**
   * Get texture cache statistics
   */
  getCacheStats() {
    return {
      count: this.textureCache.size,
      memoryEstimate: this.textureCache.size * 4 * 1024 * 1024 // Rough estimate in bytes
    };
  }

  /**
   * Setup canvas with optimal settings
   */
  private setupCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, options: ContentTextureOptions): void {
    const { width, height, dpi } = options;

    // Set actual size with DPI scaling
    canvas.width = width * dpi;
    canvas.height = height * dpi;

    // Scale context for high DPI
    ctx.scale(dpi, dpi);

    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // Removed non-standard ctx.textRenderingOptimization property

    // Set CSS size for proper scaling
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  /**
   * Render HTML element content to canvas with sophisticated styling
   */
  private renderElementContent(element: HTMLElement, ctx: CanvasRenderingContext2D, options: ContentTextureOptions): void {
    const { width, height, backgroundColor, padding, borderRadius, border, shadow } = options;

    // Save context state
    ctx.save();

    // Draw background with border radius
    this.drawBackground(ctx, width, height, backgroundColor, borderRadius, shadow);

    // Draw border
    if (border) {
      this.drawBorder(ctx, width, height, border, borderRadius);
    }

    // Setup text rendering
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    // Parse and render element content
    const contentArea = {
      x: padding,
      y: padding,
      width: width - (padding * 2),
      height: height - (padding * 2)
    };

    this.renderHTMLContent(element, ctx, contentArea);

    // Restore context state
    ctx.restore();
  }

  /**
   * Draw sophisticated background with gradients and effects
   */
  private drawBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    backgroundColor: string,
    borderRadius: number,
    shadow?: ContentTextureOptions['shadow']
  ): void {
    // Draw shadow first
    if (shadow) {
      ctx.save();
      ctx.shadowColor = shadow.color;
      ctx.shadowBlur = shadow.blur;
      ctx.shadowOffsetX = shadow.offsetX;
      ctx.shadowOffsetY = shadow.offsetY;
    }

    // Create rounded rectangle path
    ctx.beginPath();
    this.roundedRect(ctx, 0, 0, width, height, borderRadius);

    // Parse background color and create gradient if needed
    if (backgroundColor.includes('rgba') || backgroundColor.includes('rgb')) {
      ctx.fillStyle = backgroundColor;
    } else {
      // Create subtle gradient for solid colors
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, backgroundColor);
      gradient.addColorStop(1, this.adjustBrightness(backgroundColor, -0.1));
      ctx.fillStyle = gradient;
    }

    ctx.fill();

    if (shadow) {
      ctx.restore();
    }
  }

  /**
   * Draw border with proper styling
   */
  private drawBorder(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    border: NonNullable<ContentTextureOptions['border']>,
    borderRadius: number
  ): void {
    ctx.save();

    ctx.strokeStyle = border.color;
    ctx.lineWidth = border.width;

    // Set line dash for dashed/dotted borders
    if (border.style === 'dashed') {
      ctx.setLineDash([border.width * 3, border.width * 2]);
    } else if (border.style === 'dotted') {
      ctx.setLineDash([border.width, border.width]);
    }

    ctx.beginPath();
    this.roundedRect(ctx, border.width / 2, border.width / 2,
                     width - border.width, height - border.width, borderRadius);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Render HTML content with proper typography and layout
   */
  private renderHTMLContent(element: HTMLElement, ctx: CanvasRenderingContext2D, area: { x: number; y: number; width: number; height: number }): void {
    let currentY = area.y;

    // Process each child element
    const children = Array.from(element.children);
    if (children.length === 0) {
      // Render text content directly
      currentY = this.renderTextContent(element.textContent || '', ctx, area, currentY);
    } else {
      // Render child elements
      for (const child of children) {
        currentY = this.renderChildElement(child as HTMLElement, ctx, area, currentY);
      }
    }
  }

  /**
   * Render individual child element
   */
  private renderChildElement(element: HTMLElement, ctx: CanvasRenderingContext2D, area: { x: number; y: number; width: number; height: number }, currentY: number): number {
    const computed = window.getComputedStyle(element);
    const tagName = element.tagName.toLowerCase();

    // Set font based on element styling
    this.applyTextStyling(ctx, computed, tagName);

    const text = element.textContent || '';
    const lineHeight = this.getLineHeight(computed, tagName);

    // Add spacing before element
    currentY += this.getElementSpacing(tagName, 'before');

    // Render text with word wrapping
    const lines = this.wrapText(ctx, text, area.width);

    for (const line of lines) {
      if (currentY + lineHeight > area.y + area.height) break; // Out of bounds

      ctx.fillText(line, area.x, currentY);
      currentY += lineHeight;
    }

    // Add spacing after element
    currentY += this.getElementSpacing(tagName, 'after');

    return currentY;
  }

  /**
   * Render plain text content
   */
  private renderTextContent(text: string, ctx: CanvasRenderingContext2D, area: { x: number; y: number; width: number; height: number }, startY: number): number {
    ctx.font = '16px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#e0e0e0';

    const lines = this.wrapText(ctx, text, area.width);
    let currentY = startY;

    for (const line of lines) {
      if (currentY + 20 > area.y + area.height) break;
      ctx.fillText(line, area.x, currentY);
      currentY += 24;
    }

    return currentY;
  }

  /**
   * Apply text styling based on computed styles and element type
   */
  private applyTextStyling(ctx: CanvasRenderingContext2D, computed: CSSStyleDeclaration, tagName: string): void {
    const fontSize = this.getFontSize(tagName);
    const fontWeight = tagName.startsWith('h') || tagName === 'strong' ? 'bold' : 'normal';
    const fontFamily = '"Segoe UI", Arial, sans-serif';

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = this.getTextColor(tagName);
  }

  /**
   * Get appropriate font size for element type
   */
  private getFontSize(tagName: string): number {
    const sizes: Record<string, number> = {
      h1: 42, h2: 36, h3: 30, h4: 24, h5: 20, h6: 18,
      p: 16, span: 16, div: 16, li: 16, strong: 16, em: 16
    };
    return sizes[tagName] || 16;
  }

  /**
   * Get appropriate text color for element type
   */
  private getTextColor(tagName: string): string {
    if (tagName.startsWith('h')) return '#ffffff';
    if (tagName === 'strong') return '#f0f0f0';
    return '#e0e0e0';
  }

  /**
   * Get line height for element type
   */
  private getLineHeight(computed: CSSStyleDeclaration, tagName: string): number {
    const fontSize = this.getFontSize(tagName);
    return fontSize * 1.4; // 1.4x line height for readability
  }

  /**
   * Get spacing before/after elements
   */
  private getElementSpacing(tagName: string, position: 'before' | 'after'): number {
    const spacing: Record<string, { before: number; after: number }> = {
      h1: { before: 20, after: 16 },
      h2: { before: 16, after: 12 },
      h3: { before: 12, after: 10 },
      h4: { before: 10, after: 8 },
      p: { before: 8, after: 12 },
      li: { before: 4, after: 4 }
    };

    return spacing[tagName]?.[position] || 0;
  }

  /**
   * Wrap text to fit within specified width
   */
  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Draw rounded rectangle
   */
  private roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  /**
   * Adjust color brightness
   */
  private adjustBrightness(color: string, amount: number): string {
    // Simple brightness adjustment for hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const rgb = parseInt(hex, 16);
      const r = Math.max(0, Math.min(255, ((rgb >> 16) & 255) + amount * 255));
      const g = Math.max(0, Math.min(255, ((rgb >> 8) & 255) + amount * 255));
      const b = Math.max(0, Math.min(255, (rgb & 255) + amount * 255));
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    return color;
  }

  /**
   * Generate cache key for element and options
   */
  private generateCacheKey(element: HTMLElement, options: ContentTextureOptions): string {
    const content = element.outerHTML;
    const optionsStr = JSON.stringify(options);
    return btoa(content + optionsStr).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
  }

  /**
   * Get or create canvas from pool
   */
  private getCanvas(): HTMLCanvasElement {
    return this.canvasPool.pop() || document.createElement('canvas');
  }

  /**
   * Return canvas to pool for reuse
   */
  private returnCanvas(canvas: HTMLCanvasElement): void {
    if (this.canvasPool.length < 5) { // Limit pool size
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.canvasPool.push(canvas);
    }
  }

  /**
   * Setup DOM observation for automatic texture updates
   */
  private observeElement(element: HTMLElement, cacheKey: string): void {
    this.observer.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });
  }

  /**
   * Handle DOM changes for automatic texture updates
   */
  private handleDOMChanges(mutations: MutationRecord[]): void {
    // Invalidate affected textures
    for (const mutation of mutations) {
      if (mutation.target instanceof HTMLElement) {
        this.invalidateElementTextures(mutation.target);
      }
    }
  }

  /**
   * Invalidate textures for changed elements
   */
  private invalidateElementTextures(element: HTMLElement): void {
    // Find and remove cached textures for this element
    const keysToRemove: string[] = [];

    for (const [key, texture] of this.textureCache.entries()) {
      // Simple check - in production would need more sophisticated tracking
      if (key.includes(element.tagName)) {
        texture.dispose();
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => this.textureCache.delete(key));
  }

  /**
   * Extract options from existing texture (for updates)
   */
  private getOptionsFromTexture(texture: THREE.CanvasTexture): ContentTextureOptions {
    const canvas = texture.image as HTMLCanvasElement;
    return {
      ...this.defaultOptions,
      width: canvas.width,
      height: canvas.height
    };
  }
}
