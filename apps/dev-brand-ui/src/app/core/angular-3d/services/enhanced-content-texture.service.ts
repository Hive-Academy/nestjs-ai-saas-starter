import {
  Injectable,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import * as THREE from 'three';
import { fromEvent, debounceTime } from 'rxjs';
import type { ContentTextureServiceConfig } from '../interfaces';

@Injectable({
  providedIn: 'root',
})
export class EnhancedContentTextureService {
  private readonly destroyRef = inject(DestroyRef);

  private readonly config = signal<ContentTextureServiceConfig>({
    maxMemory: 256 * 1024 * 1024, // 256MB
    defaultQuality: 'medium',
    enableCaching: true,
    enableReactiveUpdates: true,
  });

  private readonly textureCache = new Map<string, THREE.CanvasTexture>();
  private readonly renderingQueue = new Set<string>();
  private readonly memoryUsage = signal(0);
  private readonly renderingStrategies = new Map<
    string,
    (element: HTMLElement, quality: string) => HTMLCanvasElement
  >();

  readonly performance = computed(() => ({
    memoryUsage: this.memoryUsage(),
    maxMemory: this.config().maxMemory,
    utilizationPercent: (this.memoryUsage() / this.config().maxMemory) * 100,
    cacheSize: this.textureCache.size,
    isMemoryOptimal: this.memoryUsage() < this.config().maxMemory * 0.8,
  }));

  constructor() {
    this.initializeRenderingStrategies();
    this.setupMemoryMonitoring();
  }

  private initializeRenderingStrategies(): void {
    // Standard Canvas Rendering
    this.renderingStrategies.set(
      'canvas',
      (element: HTMLElement, quality: string) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        const scale = this.getQualityScale(quality);
        const rect = element.getBoundingClientRect();

        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;

        ctx.scale(scale, scale);
        this.renderElementToCanvas(ctx, element);

        return canvas;
      }
    );

    // HTML2Canvas Alternative (using OffscreenCanvas for better performance)
    this.renderingStrategies.set(
      'offscreen',
      (element: HTMLElement, quality: string) => {
        const scale = this.getQualityScale(quality);
        const rect = element.getBoundingClientRect();

        const canvas = new OffscreenCanvas(
          rect.width * scale,
          rect.height * scale
        );
        const ctx = canvas.getContext('2d')!;

        ctx.scale(scale, scale);
        this.renderElementToOffscreenCanvas(ctx, element);

        // Convert OffscreenCanvas to regular canvas for THREE.js compatibility
        const regularCanvas = document.createElement('canvas');
        regularCanvas.width = canvas.width;
        regularCanvas.height = canvas.height;
        const regularCtx = regularCanvas.getContext('2d')!;

        // Transfer ImageBitmap to regular canvas
        canvas.convertToBlob().then((blob) => {
          const img = new Image();
          img.onload = () => {
            regularCtx.drawImage(img, 0, 0);
          };
          img.src = URL.createObjectURL(blob);
        });

        return regularCanvas;
      }
    );

    // SVG-based rendering for vector graphics
    this.renderingStrategies.set(
      'svg',
      (element: HTMLElement, quality: string) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        const scale = this.getQualityScale(quality);
        const rect = element.getBoundingClientRect();

        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;

        // Create SVG representation
        const svg = this.createSVGFromElement(element);
        const img = new Image();

        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };

        const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
        img.src = URL.createObjectURL(svgBlob);

        return canvas;
      }
    );
  }

  private getQualityScale(quality: string): number {
    const scales = {
      low: 0.5,
      medium: 1.0,
      high: 1.5,
      ultra: 2.0,
    };
    return scales[quality as keyof typeof scales] || 1.0;
  }

  private renderElementToCanvas(
    ctx: CanvasRenderingContext2D,
    element: HTMLElement
  ): void {
    const computedStyle = getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    // Background
    if (
      computedStyle.backgroundColor &&
      computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'
    ) {
      ctx.fillStyle = computedStyle.backgroundColor;
      ctx.fillRect(0, 0, rect.width, rect.height);
    }

    // Text content
    if (element.textContent) {
      ctx.fillStyle = computedStyle.color;
      ctx.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const lines = this.wrapText(ctx, element.textContent, rect.width - 20);
      lines.forEach((line, index) => {
        ctx.fillText(
          line,
          10,
          10 + index * parseInt(computedStyle.lineHeight || '20')
        );
      });
    }

    // Border
    if (computedStyle.border && computedStyle.border !== 'none') {
      ctx.strokeStyle = computedStyle.borderColor;
      ctx.lineWidth = parseInt(computedStyle.borderWidth) || 1;
      ctx.strokeRect(0, 0, rect.width, rect.height);
    }
  }

  private renderElementToOffscreenCanvas(
    ctx: OffscreenCanvasRenderingContext2D,
    element: HTMLElement
  ): void {
    // Similar to renderElementToCanvas but for OffscreenCanvas
    const computedStyle = getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    if (
      computedStyle.backgroundColor &&
      computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'
    ) {
      ctx.fillStyle = computedStyle.backgroundColor;
      ctx.fillRect(0, 0, rect.width, rect.height);
    }

    if (element.textContent) {
      ctx.fillStyle = computedStyle.color;
      ctx.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const lines = this.wrapTextOffscreen(
        ctx,
        element.textContent,
        rect.width - 20
      );
      lines.forEach((line, index) => {
        ctx.fillText(
          line,
          10,
          10 + index * parseInt(computedStyle.lineHeight || '20')
        );
      });
    }
  }

  private createSVGFromElement(element: HTMLElement): string {
    const rect = element.getBoundingClientRect();
    const computedStyle = getComputedStyle(element);

    return `
      <svg width="${rect.width}" height="${
      rect.height
    }" xmlns="http://www.w3.org/2000/svg">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="${this.getInlineStyles(
            computedStyle
          )}">
            ${element.innerHTML}
          </div>
        </foreignObject>
      </svg>
    `;
  }

  private getInlineStyles(computedStyle: CSSStyleDeclaration): string {
    const importantStyles = [
      'color',
      'font-family',
      'font-size',
      'font-weight',
      'line-height',
      'background-color',
      'border',
      'padding',
      'margin',
      'text-align',
    ];

    return importantStyles
      .map((prop) => `${prop}: ${computedStyle.getPropertyValue(prop)}`)
      .join('; ');
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  private wrapTextOffscreen(
    ctx: OffscreenCanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  private setupMemoryMonitoring(): void {
    // Monitor memory usage every 5 seconds
    const memoryMonitor = setInterval(() => {
      let totalMemory = 0;

      this.textureCache.forEach((texture) => {
        if (texture.image) {
          const canvas = texture.image as HTMLCanvasElement;
          totalMemory += canvas.width * canvas.height * 4; // RGBA = 4 bytes per pixel
        }
      });

      this.memoryUsage.set(totalMemory);

      // Auto-cleanup if memory usage is too high
      if (totalMemory > this.config().maxMemory * 0.9) {
        this.performMemoryCleanup();
      }
    }, 5000);

    this.destroyRef.onDestroy(() => {
      clearInterval(memoryMonitor);
      this.cleanup();
    });
  }

  private performMemoryCleanup(): void {
    const sortedEntries = Array.from(this.textureCache.entries())
      .map(([key, texture]) => ({
        key,
        texture,
        lastUsed: (texture as any).__lastUsed || 0,
        size: this.calculateTextureSize(texture),
      }))
      .sort((a, b) => a.lastUsed - b.lastUsed);

    // Remove oldest 25% of textures
    const toRemove = Math.ceil(sortedEntries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      const entry = sortedEntries[i];
      entry.texture.dispose();
      this.textureCache.delete(entry.key);
    }
  }

  private calculateTextureSize(texture: THREE.CanvasTexture): number {
    if (texture.image) {
      const canvas = texture.image as HTMLCanvasElement;
      return canvas.width * canvas.height * 4;
    }
    return 0;
  }

  /**
   * Create reactive texture from DOM element
   */
  createReactiveTexture(
    element: HTMLElement,
    options: {
      watchForChanges?: boolean;
      updateTriggers?: ('resize' | 'mutation' | 'animation' | 'style')[];
      quality?: 'low' | 'medium' | 'high' | 'ultra';
      format?: 'webp' | 'png' | 'jpeg';
      strategy?: 'canvas' | 'offscreen' | 'svg';
    } = {}
  ): THREE.CanvasTexture {
    const elementId = this.getElementId(element);
    const cacheKey = `${elementId}-${
      options.quality || this.config().defaultQuality
    }`;

    // Check cache first
    if (this.config().enableCaching && this.textureCache.has(cacheKey)) {
      const cached = this.textureCache.get(cacheKey)!;
      (cached as any).__lastUsed = Date.now();
      return cached;
    }

    const strategy = options.strategy || 'canvas';
    const quality = options.quality || this.config().defaultQuality;

    const canvas = this.renderingStrategies.get(strategy)!(element, quality);
    const texture = new THREE.CanvasTexture(canvas);

    // Configure texture
    texture.generateMipmaps = quality === 'high' || quality === 'ultra';
    texture.minFilter = texture.generateMipmaps
      ? THREE.LinearMipmapLinearFilter
      : THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    texture.flipY = false;

    // Add metadata
    (texture as any).__lastUsed = Date.now();
    (texture as any).__elementId = elementId;

    // Cache texture
    if (this.config().enableCaching) {
      this.textureCache.set(cacheKey, texture);
    }

    // Setup reactive updates
    if (options.watchForChanges && this.config().enableReactiveUpdates) {
      this.setupReactiveUpdates(element, texture, options);
    }

    return texture;
  }

  private getElementId(element: HTMLElement): string {
    return (
      element.id ||
      element.className ||
      element.tagName +
        '-' +
        Array.from(element.parentElement?.children || []).indexOf(element)
    );
  }

  private setupReactiveUpdates(
    element: HTMLElement,
    texture: THREE.CanvasTexture,
    options: any
  ): void {
    const triggers = options.updateTriggers || ['resize', 'mutation'];

    if (triggers.includes('resize')) {
      fromEvent(window, 'resize')
        .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.updateTexture(element, texture, options);
        });
    }

    if (triggers.includes('mutation')) {
      const observer = new MutationObserver(() => {
        this.updateTexture(element, texture, options);
      });

      observer.observe(element, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });

      this.destroyRef.onDestroy(() => observer.disconnect());
    }

    if (triggers.includes('style')) {
      // Watch for style changes
      const styleObserver = new MutationObserver((mutations) => {
        const hasStyleChanges = mutations.some(
          (mutation) =>
            mutation.type === 'attributes' &&
            (mutation.attributeName === 'style' ||
              mutation.attributeName === 'class')
        );

        if (hasStyleChanges) {
          this.updateTexture(element, texture, options);
        }
      });

      styleObserver.observe(element, { attributes: true });
      this.destroyRef.onDestroy(() => styleObserver.disconnect());
    }
  }

  private updateTexture(
    element: HTMLElement,
    texture: THREE.CanvasTexture,
    options: any
  ): void {
    const elementId = this.getElementId(element);

    if (this.renderingQueue.has(elementId)) {
      return; // Already updating
    }

    this.renderingQueue.add(elementId);

    // Use requestAnimationFrame for smooth updates
    requestAnimationFrame(() => {
      try {
        const strategy = options.strategy || 'canvas';
        const quality = options.quality || this.config().defaultQuality;

        const newCanvas = this.renderingStrategies.get(strategy)!(
          element,
          quality
        );

        // Update the existing texture
        texture.image = newCanvas;
        texture.needsUpdate = true;

        // Update metadata
        (texture as any).__lastUsed = Date.now();
      } finally {
        this.renderingQueue.delete(elementId);
      }
    });
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<ContentTextureServiceConfig>): void {
    this.config.update((current) => ({ ...current, ...newConfig }));
  }

  /**
   * Clear texture cache
   */
  clearCache(): void {
    this.textureCache.forEach((texture) => texture.dispose());
    this.textureCache.clear();
    this.memoryUsage.set(0);
  }

  /**
   * Get texture from cache
   */
  getCachedTexture(
    elementId: string,
    quality: string
  ): THREE.CanvasTexture | null {
    const cacheKey = `${elementId}-${quality}`;
    const texture = this.textureCache.get(cacheKey);

    if (texture) {
      (texture as any).__lastUsed = Date.now();
    }

    return texture || null;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.clearCache();
    this.renderingQueue.clear();
  }
}
