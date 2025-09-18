# Angular Hybrid 3D-UI Framework V2.0 - Angular Three Integration POC

```typescript
/**
 * ANGULAR HYBRID 3D-UI FRAMEWORK V2.0
 * Technical Implementation & Proof of Concept
 *
 * This demonstrates how to integrate Angular Three as the foundation
 * while preserving and enhancing our HTML-to-3D conversion capabilities
 */

// =====================================================
// 1. ENHANCED TYPE DEFINITIONS V2
// =====================================================

import type * as THREE from 'three';
import type { Signal } from '@angular/core';
import type { NgtStore } from 'angular-three';

/**
 * Enhanced configuration extending Angular Three integration
 */
export interface HybridElementConfigV2 extends HybridElementConfig {
  // Angular Three specific properties
  angularThree?: {
    parentGroup?: string;
    renderOrder?: number;
    layers?: number;
    castShadow?: boolean;
    receiveShadow?: boolean;
  };

  // Enhanced content conversion with reactive updates
  content?: {
    watchForChanges?: boolean;
    updateTriggers?: ('resize' | 'mutation' | 'animation' | 'style')[];
    quality?: 'low' | 'medium' | 'high' | 'ultra';
    format?: 'webp' | 'png' | 'jpeg';
    compression?: number; // 0-1
    mipmaps?: boolean;
  };

  // Advanced animations using Angular Three + GSAP
  animations?: {
    enter?: AnimationConfigV2;
    exit?: AnimationConfigV2;
    hover?: AnimationConfigV2;
    focus?: AnimationConfigV2;
    idle?: AnimationConfigV2;
    custom?: Record<string, AnimationConfigV2>;
  };

  // Responsive behavior with breakpoints
  responsive?: {
    mobile?: Partial<HybridElementConfigV2>;
    tablet?: Partial<HybridElementConfigV2>;
    desktop?: Partial<HybridElementConfigV2>;
    breakpoints?: {
      mobile: number;
      tablet: number;
      desktop: number;
    };
  };

  // Performance optimizations
  performance?: {
    enableLOD?: boolean;
    lodDistances?: number[];
    enableInstancedRendering?: boolean;
    memoryBudget?: number; // MB
    texturePooling?: boolean;
  };
}

export interface AnimationConfigV2 {
  type: 'transform' | 'material' | 'geometry' | 'custom';
  duration: number;
  easing?: string;
  delay?: number;
  repeat?: number;
  yoyo?: boolean;
  properties: Record<string, any>;
  onComplete?: () => void;
  onUpdate?: (progress: number) => void;
}

/**
 * Enhanced Hybrid Element with Angular Three integration
 */
export interface HybridElement3DV2 extends HybridElement3D {
  // Angular Three objects
  ngtGroup: any; // Will be typed properly when we have angular-three imported
  ngtMesh?: any;
  ngtMaterial?: any;

  // Enhanced state management
  state: Signal<{
    isVisible: boolean;
    isInteracting: boolean;
    isAnimating: boolean;
    lodLevel: number;
    textureQuality: 'low' | 'medium' | 'high' | 'ultra';
    memoryUsage: number;
  }>;

  // Performance metrics
  performance: Signal<{
    renderTime: number;
    textureSize: number;
    triangleCount: number;
    lastUpdate: number;
  }>;

  // Reactive texture updates
  texture: Signal<THREE.CanvasTexture>;
  needsTextureUpdate: Signal<boolean>;

  // Animation controller
  animations: Map<string, any>; // GSAP timeline instances
}

// =====================================================
// 2. ANGULAR THREE FOUNDATION SERVICE
// =====================================================

import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AngularThreeFoundationService {
  private readonly ngtStore = inject(NgtStore, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  // Foundation state
  private readonly isInitialized = signal(false);
  private readonly sceneReady = signal(false);

  // Scene management
  readonly scene = computed(() => this.ngtStore?.get('scene'));
  readonly camera = computed(() => this.ngtStore?.get('camera'));
  readonly renderer = computed(() => this.ngtStore?.get('gl'));

  // Performance monitoring
  private readonly frameTime = signal(16);
  readonly performance = computed(() => ({
    fps: 1000 / this.frameTime(),
    isOptimal: this.frameTime() < 20,
  }));

  /**
   * Initialize Angular Three foundation
   */
  async initialize(): Promise<boolean> {
    try {
      if (!this.ngtStore) {
        throw new Error('Angular Three NgtCanvas not found. Ensure component is wrapped in <ngt-canvas>');
      }

      // Wait for scene to be ready
      await this.waitForSceneReady();

      this.setupPerformanceMonitoring();
      this.isInitialized.set(true);

      return true;
    } catch (error) {
      console.error('Failed to initialize Angular Three foundation:', error);
      return false;
    }
  }

  /**
   * Create a Three.js group integrated with Angular Three
   */
  createHybridGroup(id: string): any {
    const scene = this.scene();
    if (!scene) throw new Error('Scene not ready');

    // This would be properly typed when angular-three is imported
    const group = new THREE.Group();
    group.name = `hybrid-${id}`;
    group.userData = {
      type: 'hybrid-element',
      id,
      createdAt: Date.now(),
    };

    scene.add(group);
    return group;
  }

  /**
   * Add performance-optimized mesh to Angular Three scene
   */
  createOptimizedMesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    options: {
      enableLOD?: boolean;
      renderOrder?: number;
      layers?: number;
    } = {}
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);

    // Apply Angular Three optimizations
    if (options.renderOrder !== undefined) {
      mesh.renderOrder = options.renderOrder;
    }

    if (options.layers !== undefined) {
      mesh.layers.set(options.layers);
    }

    // Enable shadows if scene supports it
    const renderer = this.renderer();
    if (renderer?.shadowMap?.enabled) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }

    return mesh;
  }

  /**
   * Integrate with Angular Three's render loop
   */
  addToRenderLoop(callback: (delta: number, time: number) => void): () => void {
    if (!this.ngtStore) {
      throw new Error('Angular Three not available');
    }

    // This would use Angular Three's proper render loop integration
    // For now, we'll simulate the integration
    let animationId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      this.frameTime.set(delta);
      callback(delta, time);

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    // Return cleanup function
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }

  private async waitForSceneReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for Angular Three scene'));
      }, 10000);

      const checkScene = () => {
        if (this.scene()) {
          clearTimeout(timeout);
          this.sceneReady.set(true);
          resolve();
        } else {
          requestAnimationFrame(checkScene);
        }
      };

      checkScene();
    });
  }

  private setupPerformanceMonitoring(): void {
    // Monitor performance and adjust quality automatically
    let frameCount = 0;
    let totalFrameTime = 0;

    const cleanup = this.addToRenderLoop((delta) => {
      frameCount++;
      totalFrameTime += delta;

      // Calculate average FPS every 60 frames
      if (frameCount >= 60) {
        const avgFrameTime = totalFrameTime / frameCount;
        this.frameTime.set(avgFrameTime);

        frameCount = 0;
        totalFrameTime = 0;
      }
    });

    this.destroyRef.onDestroy(cleanup);
  }
}

// =====================================================
// 3. ENHANCED CONTENT TEXTURE SERVICE V2
// =====================================================

@Injectable({
  providedIn: 'root',
})
export class ContentTextureServiceV2 {
  private readonly angularThree = inject(AngularThreeFoundationService);
  private readonly destroyRef = inject(DestroyRef);

  // Enhanced caching with memory management
  private readonly textureCache = new Map<
    string,
    {
      texture: THREE.CanvasTexture;
      lastUsed: number;
      memorySize: number;
      quality: string;
    }
  >();

  private readonly memoryUsage = signal(0);
  private readonly maxMemory = 256 * 1024 * 1024; // 256MB

  // Active texture observers
  private readonly observers = new Map<
    string,
    {
      element: HTMLElement;
      observer: MutationObserver | ResizeObserver;
      updateSignal: Signal<boolean>;
    }
  >();

  /**
   * Generate reactive texture from HTML element
   */
  generateTexture(element: HTMLElement, options: HybridElementConfigV2['content'] = {}): Signal<THREE.CanvasTexture> {
    const cacheKey = this.generateCacheKey(element, options);
    const textureSignal = signal<THREE.CanvasTexture>(null!);

    // Check cache first
    const cached = this.textureCache.get(cacheKey);
    if (cached) {
      cached.lastUsed = Date.now();
      textureSignal.set(cached.texture);
      return textureSignal.asReadonly();
    }

    // Generate new texture
    this.generateTextureAsync(element, options)
      .then((texture) => {
        textureSignal.set(texture);
        this.cacheTexture(cacheKey, texture, options);
      })
      .catch((error) => {
        console.error('Failed to generate texture:', error);
        textureSignal.set(this.createErrorTexture());
      });

    // Setup reactive updates if requested
    if (options.watchForChanges) {
      this.setupReactiveUpdates(element, textureSignal, options);
    }

    return textureSignal.asReadonly();
  }

  /**
   * Enhanced HTML-to-Canvas conversion with quality options
   */
  private async generateTextureAsync(element: HTMLElement, options: HybridElementConfigV2['content'] = {}): Promise<THREE.CanvasTexture> {
    // Calculate optimal size based on quality setting
    const quality = options.quality || 'medium';
    const baseSize = this.getBaseSizeForQuality(quality);
    const dpr = window.devicePixelRatio || 1;

    // Create high-quality canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: true })!;

    // Calculate dimensions
    const rect = element.getBoundingClientRect();
    const aspectRatio = rect.width / rect.height || 1;

    let width = baseSize;
    let height = baseSize / aspectRatio;

    if (height > baseSize) {
      height = baseSize;
      width = baseSize * aspectRatio;
    }

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    // Scale context for high DPI
    ctx.scale(dpr, dpr);

    // Enhanced rendering with better quality
    await this.renderElementToCanvas(element, ctx, width, height, options);

    // Create Three.js texture with optimizations
    const texture = new THREE.CanvasTexture(canvas);

    // Apply quality-based settings
    this.applyTextureSettings(texture, options);

    return texture;
  }

  /**
   * Advanced HTML element to canvas rendering
   */
  private async renderElementToCanvas(element: HTMLElement, ctx: CanvasRenderingContext2D, width: number, height: number, options: HybridElementConfigV2['content'] = {}): Promise<void> {
    try {
      // Method 1: html2canvas (most compatible)
      if (typeof (window as any).html2canvas !== 'undefined') {
        const canvas = await (window as any).html2canvas(element, {
          width,
          height,
          backgroundColor: null,
          useCORS: true,
          allowTaint: true,
          scale: 1,
          logging: false,
        });

        ctx.drawImage(canvas, 0, 0, width, height);
        return;
      }

      // Method 2: DOM to SVG to Canvas (fallback)
      await this.renderViaSVG(element, ctx, width, height);
    } catch (error) {
      console.warn('Advanced rendering failed, using fallback:', error);
      await this.renderFallback(element, ctx, width, height);
    }
  }

  /**
   * SVG-based rendering fallback
   */
  private async renderViaSVG(element: HTMLElement, ctx: CanvasRenderingContext2D, width: number, height: number): Promise<void> {
    // Clone element to avoid modifying original
    const cloned = element.cloneNode(true) as HTMLElement;

    // Get computed styles
    const styles = window.getComputedStyle(element);
    const styleText = Array.from(styles)
      .map((property) => `${property}: ${styles.getPropertyValue(property)}`)
      .join('; ');

    // Create SVG
    const svgData = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="${styleText}">
            ${element.innerHTML}
          </div>
        </foreignObject>
      </svg>
    `;

    // Convert SVG to image
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        resolve();
      };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
    });
  }

  /**
   * Basic canvas rendering fallback
   */
  private async renderFallback(element: HTMLElement, ctx: CanvasRenderingContext2D, width: number, height: number): Promise<void> {
    // Clear canvas with background
    ctx.fillStyle = 'rgba(20, 20, 40, 0.95)';
    ctx.fillRect(0, 0, width, height);

    // Get text content
    const text = element.textContent || element.innerText || 'Content';

    // Setup text rendering
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Word wrap and draw text
    const lines = this.wrapText(ctx, text, width - 40);
    const lineHeight = 20;
    const startY = height / 2 - (lines.length * lineHeight) / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, startY + i * lineHeight);
    });

    // Add border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);
  }

  /**
   * Setup reactive texture updates
   */
  private setupReactiveUpdates(element: HTMLElement, textureSignal: any, options: HybridElementConfigV2['content']): void {
    const updateTriggers = options.updateTriggers || ['mutation', 'resize'];
    const elementId = this.generateElementId(element);

    // Debounce updates to avoid excessive regeneration
    let updateTimeout: number;
    const debouncedUpdate = () => {
      clearTimeout(updateTimeout);
      updateTimeout = window.setTimeout(() => {
        this.generateTextureAsync(element, options).then((newTexture) => {
          const oldTexture = textureSignal();
          if (oldTexture) {
            oldTexture.dispose();
          }
          textureSignal.set(newTexture);
        });
      }, 100);
    };

    // Setup observers based on triggers
    if (updateTriggers.includes('mutation')) {
      const mutationObserver = new MutationObserver(debouncedUpdate);
      mutationObserver.observe(element, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
      });

      this.observers.set(elementId, {
        element,
        observer: mutationObserver,
        updateSignal: signal(false),
      });
    }

    if (updateTriggers.includes('resize')) {
      const resizeObserver = new ResizeObserver(debouncedUpdate);
      resizeObserver.observe(element);
    }

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      clearTimeout(updateTimeout);
      const observer = this.observers.get(elementId);
      if (observer) {
        observer.observer.disconnect();
        this.observers.delete(elementId);
      }
    });
  }

  /**
   * Apply texture optimization settings
   */
  private applyTextureSettings(texture: THREE.CanvasTexture, options: HybridElementConfigV2['content'] = {}): void {
    // Format optimization
    if (options.format === 'webp' && this.supportsWebP()) {
      texture.format = THREE.RGBAFormat;
    }

    // Filtering
    texture.minFilter = options.quality === 'low' ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;

    // Generate mipmaps if requested and quality allows
    texture.generateMipmaps = options.mipmaps !== false && options.quality !== 'low';

    // Anisotropy for better quality at angles
    if (options.quality === 'ultra' || options.quality === 'high') {
      const renderer = this.angularThree.renderer();
      if (renderer) {
        texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      }
    }

    // Wrap mode
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;

    // Color space
    texture.colorSpace = THREE.SRGBColorSpace;
  }

  // Utility methods
  private generateCacheKey(element: HTMLElement, options: any): string {
    const content = element.innerHTML;
    const optionsHash = JSON.stringify(options);
    return `${content.length}-${optionsHash.length}-${Date.now()}`;
  }

  private generateElementId(element: HTMLElement): string {
    return element.id || `element-${Date.now()}-${Math.random()}`;
  }

  private getBaseSizeForQuality(quality: string): number {
    switch (quality) {
      case 'low':
        return 256;
      case 'medium':
        return 512;
      case 'high':
        return 1024;
      case 'ultra':
        return 2048;
      default:
        return 512;
    }
  }

  private supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word) => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  private createErrorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Error pattern
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Texture Error', 128, 128);

    return new THREE.CanvasTexture(canvas);
  }

  private cacheTexture(key: string, texture: THREE.CanvasTexture, options: HybridElementConfigV2['content'] = {}): void {
    const memorySize = this.estimateTextureMemory(texture);

    // Check memory budget
    if (this.memoryUsage() + memorySize > this.maxMemory) {
      this.cleanupOldTextures();
    }

    this.textureCache.set(key, {
      texture,
      lastUsed: Date.now(),
      memorySize,
      quality: options.quality || 'medium',
    });

    this.updateMemoryUsage();
  }

  private estimateTextureMemory(texture: THREE.CanvasTexture): number {
    const canvas = texture.image as HTMLCanvasElement;
    // RGBA = 4 bytes per pixel
    return canvas.width * canvas.height * 4;
  }

  private cleanupOldTextures(): void {
    const entries = Array.from(this.textureCache.entries()).sort(([, a], [, b]) => a.lastUsed - b.lastUsed);

    // Remove oldest 25% of textures
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      const [key, { texture }] = entries[i];
      texture.dispose();
      this.textureCache.delete(key);
    }

    this.updateMemoryUsage();
  }

  private updateMemoryUsage(): void {
    const total = Array.from(this.textureCache.values()).reduce((sum, { memorySize }) => sum + memorySize, 0);
    this.memoryUsage.set(total);
  }
}

// =====================================================
// 4. ENHANCED HYBRID UI SERVICE V2
// =====================================================

@Injectable({
  providedIn: 'root',
})
export class HybridUIServiceV2 {
  private readonly angularThree = inject(AngularThreeFoundationService);
  private readonly scalingService = inject(ScalingIntelligenceService);
  private readonly textureService = inject(ContentTextureServiceV2);
  private readonly destroyRef = inject(DestroyRef);

  // Enhanced state management
  private readonly elements = signal(new Map<string, HybridElement3DV2>());
  private readonly activeElement = signal<string | null>(null);
  private readonly isLoading = signal(false);

  // Performance tracking
  private readonly performance = signal({
    fps: 60,
    elementCount: 0,
    textureMemory: 0,
    renderTime: 16,
  });

  // Public reactive state
  readonly currentElements = this.elements.asReadonly();
  readonly activeElementId = this.activeElement.asReadonly();
  readonly loadingState = this.isLoading.asReadonly();
  readonly performanceMetrics = this.performance.asReadonly();

  // Computed properties
  readonly elementCount = computed(() => this.elements().size);
  readonly hasElements = computed(() => this.elements().size > 0);
  readonly memoryUsage = computed(() => {
    return Array.from(this.elements().values()).reduce((total, el) => total + el.performance().textureSize, 0);
  });

  constructor() {
    this.setupPerformanceMonitoring();
    this.setupAutomaticOptimization();
  }

  /**
   * Initialize the hybrid UI system with Angular Three
   */
  async initialize(): Promise<boolean> {
    this.isLoading.set(true);

    try {
      // Initialize Angular Three foundation
      const success = await this.angularThree.initialize();
      if (!success) {
        throw new Error('Failed to initialize Angular Three foundation');
      }

      this.isLoading.set(false);
      return true;
    } catch (error) {
      console.error('Failed to initialize Hybrid UI V2:', error);
      this.isLoading.set(false);
      return false;
    }
  }

  /**
   * Add HTML element as enhanced 3D object
   */
  async addElement(element: HTMLElement, config: HybridElementConfigV2, events?: Partial<HybridElementEvents>): Promise<string | null> {
    try {
      const elementId = this.generateElementId();

      // Create Angular Three group
      const ngtGroup = this.angularThree.createHybridGroup(elementId);

      // Generate reactive texture
      const textureSignal = this.textureService.generateTexture(element, config.content);

      // Calculate intelligent scaling
      const scaling = this.scalingService.calculateElementScaling(config);

      // Create enhanced 3D element
      const hybridElement = await this.createHybridElement3D(elementId, element, config, ngtGroup, textureSignal, scaling);

      // Setup interactions and animations
      this.setupElementInteractions(hybridElement, events);
      this.setupElementAnimations(hybridElement, config);

      // Update state
      const currentElements = new Map(this.elements());
      currentElements.set(elementId, hybridElement);
      this.elements.set(currentElements);

      this.updatePerformanceMetrics();

      return elementId;
    } catch (error) {
      console.error('Failed to add hybrid element:', error);
      return null;
    }
  }

  /**
   * Create enhanced hybrid 3D element
   */
  private async createHybridElement3D(id: string, domElement: HTMLElement, config: HybridElementConfigV2, ngtGroup: any, textureSignal: Signal<THREE.CanvasTexture>, scaling: any): Promise<HybridElement3DV2> {
    // Create content mesh with Angular Three optimizations
    const contentMesh = this.createContentMesh(textureSignal(), scaling, config);
    ngtGroup.add(contentMesh);

    // Create decoration if configured
    let decorationMesh: THREE.Mesh | undefined;
    if (config.decoration) {
      decorationMesh = this.createDecorationMesh(config, scaling);
      ngtGroup.add(decorationMesh);
    }

    // Create enhanced element
    const hybridElement: HybridElement3DV2 = {
      id,
      domElement,
      content3D: ngtGroup,
      decoration3D: decorationMesh,
      config,
      scaling,
      isVisible: true,
      isInteracting: false,

      // Angular Three integration
      ngtGroup,
      ngtMesh: contentMesh,

      // Enhanced state management
      state: signal({
        isVisible: true,
        isInteracting: false,
        isAnimating: false,
        lodLevel: 1,
        textureQuality: config.content?.quality || 'medium',
        memoryUsage: 0,
      }),

      performance: signal({
        renderTime: 16,
        textureSize: 0,
        triangleCount: contentMesh.geometry.index?.count || 0,
        lastUpdate: Date.now(),
      }),

      // Reactive texture
      texture: textureSignal,
      needsTextureUpdate: signal(false),

      // Animation system
      animations: new Map(),
    };

    // Setup reactive texture updates
    this.setupTextureReactivity(hybridElement);

    return hybridElement;
  }

  /**
   * Setup reactive texture updates
   */
  private setupTextureReactivity(element: HybridElement3DV2): void {
    // Watch for texture changes
    const textureEffect = () => {
      const newTexture = element.texture();
      if (newTexture && element.ngtMesh?.material) {
        element.ngtMesh.material.map = newTexture;
        element.ngtMesh.material.needsUpdate = true;

        // Update performance metrics
        const currentPerf = element.performance();
        element.performance.set({
          ...currentPerf,
          textureSize: this.estimateTextureSize(newTexture),
          lastUpdate: Date.now(),
        });
      }
    };

    // This would use Angular's effect in real implementation
    // effect(textureEffect);
  }

  /**
   * Setup element interactions with Angular Three
   */
  private setupElementInteractions(element: HybridElement3DV2, events?: Partial<HybridElementEvents>): void {
    // Add Angular Three event handling
    element.ngtGroup.userData = {
      ...element.ngtGroup.userData,
      elementId: element.id,
      isInteractable: true,
      events,
    };

    // Setup pointer events (would integrate with Angular Three's event system)
    if (events?.onClick) {
      element.ngtGroup.addEventListener?.('click', (event: any) => {
        element.state.set({
          ...element.state(),
          isInteracting: true,
        });
        events.onClick!(element, event);
      });
    }

    if (events?.onHover) {
      element.ngtGroup.addEventListener?.('pointerover', () => {
        element.state.set({
          ...element.state(),
          isInteracting: true,
        });
        events.onHover!(element);
      });

      element.ngtGroup.addEventListener?.('pointerout', () => {
        element.state.set({
          ...element.state(),
          isInteracting: false,
        });
        events.onLeave?.(element);
      });
    }
  }

  /**
   * Setup element animations
   */
  private setupElementAnimations(element: HybridElement3DV2, config: HybridElementConfigV2): void {
    if (!config.animations) return;

    // Setup idle animation by default
    if (config.animations.idle) {
      const idleTimeline = this.createAnimation(element, config.animations.idle);
      element.animations.set('idle', idleTimeline);
      idleTimeline.play();
    }

    // Setup enter animation
    if (config.animations.enter) {
      const enterTimeline = this.createAnimation(element, config.animations.enter);
      element.animations.set('enter', enterTimeline);
      enterTimeline.play();
    }
  }

  /**
   * Create GSAP animation timeline
   */
  private createAnimation(element: HybridElement3DV2, config: AnimationConfigV2): any {
    // This would integrate with GSAP when available
    // For now, we'll return a mock timeline
    return {
      play: () => console.log('Animation playing'),
      pause: () => console.log('Animation paused'),
      stop: () => console.log('Animation stopped'),
      progress: (value?: number) => (value !== undefined ? 0 : 0),
    };
  }

  // Utility methods
  private createContentMesh(texture: THREE.CanvasTexture, scaling: any, config: HybridElementConfigV2): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(scaling.contentScale * 2, scaling.contentScale * 2.5);

    const material = new THREE.MeshPhysicalMaterial({
      map: texture,
      transparent: true,
      opacity: scaling.contentOpacity,
      roughness: config.material?.roughness || 0.05,
      metalness: config.material?.metalness || 0.1,
      clearcoat: config.material?.clearcoat || 1.0,
      transmission: config.material?.transmission || 0.02,
      side: THREE.DoubleSide,
    });

    return this.angularThree.createOptimizedMesh(geometry, material, {
      renderOrder: config.angularThree?.renderOrder,
      layers: config.angularThree?.layers,
    });
  }

  private createDecorationMesh(config: HybridElementConfigV2, scaling: any): THREE.Mesh {
    if (!config.decoration) {
      throw new Error('No decoration config provided');
    }

    let geometry: THREE.BufferGeometry;
    switch (config.decoration.geometry) {
      case 'sphere':
        geometry = new THREE.SphereGeometry(scaling.decorationScale, 32, 32);
        break;
      case 'cube':
        geometry = new THREE.BoxGeometry(scaling.decorationScale * 2, scaling.decorationScale * 2, scaling.decorationScale * 2);
        break;
      default:
        geometry = new THREE.SphereGeometry(scaling.decorationScale, 16, 16);
    }

    const material = new THREE.MeshPhysicalMaterial({
      color: config.decoration.color || 0x3b82f6,
      transparent: true,
      opacity: scaling.decorationOpacity,
      roughness: 0.1,
      metalness: 0.1,
      clearcoat: 1.0,
    });

    return this.angularThree.createOptimizedMesh(geometry, material);
  }

  private setupPerformanceMonitoring(): void {
    // Monitor performance and update metrics
    let frameCount = 0;
    let lastTime = performance.now();

    const cleanup = this.angularThree.addToRenderLoop((delta, time) => {
      frameCount++;

      if (time - lastTime > 1000) {
        // Update every second
        const fps = (frameCount * 1000) / (time - lastTime);

        this.performance.set({
          fps: Math.round(fps),
          elementCount: this.elements().size,
          textureMemory: this.memoryUsage(),
          renderTime: delta,
        });

        frameCount = 0;
        lastTime = time;
      }
    });

    this.destroyRef.onDestroy(cleanup);
  }

  private setupAutomaticOptimization(): void {
    // Auto-optimize based on performance
    const performanceEffect = () => {
      const perf = this.performance();

      if (perf.fps < 30) {
        this.applyPerformanceOptimizations();
      } else if (perf.fps > 55 && perf.elementCount < 10) {
        this.relaxPerformanceOptimizations();
      }
    };

    // This would use Angular's effect in real implementation
    // effect(performanceEffect);
  }

  private applyPerformanceOptimizations(): void {
    console.log('Applying performance optimizations...');
    // Reduce texture quality, enable LOD, etc.
  }

  private relaxPerformanceOptimizations(): void {
    console.log('Relaxing performance optimizations...');
    // Increase texture quality, disable LOD, etc.
  }

  private generateElementId(): string {
    return `hybrid-element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private estimateTextureSize(texture: THREE.CanvasTexture): number {
    const canvas = texture.image as HTMLCanvasElement;
    return canvas.width * canvas.height * 4; // RGBA bytes
  }

  private updatePerformanceMetrics(): void {
    const elementCount = this.elements().size;
    const textureMemory = this.memoryUsage();

    this.performance.set({
      ...this.performance(),
      elementCount,
      textureMemory,
    });
  }
}

// =====================================================
// 5. ENHANCED HYBRID 3D DIRECTIVE V2
// =====================================================

import { Directive, ElementRef, OnInit, OnDestroy, input, output, effect, inject } from '@angular/core';

@Directive({
  selector: '[hybrid3D]',
  standalone: true,
  exportAs: 'hybrid3D',
})
export class Hybrid3DDirectiveV2 implements OnInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly hybridService = inject(HybridUIServiceV2);
  private readonly destroyRef = inject(DestroyRef);

  // Configuration inputs
  config = input<HybridElementConfigV2>();
  priority = input<ContentPriority>(ContentPriority.SECONDARY);
  quality = input<'low' | 'medium' | 'high' | 'ultra'>('medium');
  watchChanges = input(true);

  // Element state
  private readonly elementId = signal<string | null>(null);
  private readonly isReady = signal(false);

  // Outputs
  ready = output<HybridElement3DV2>();
  hover = output<HybridElement3DV2>();
  click = output<HybridElement3DV2>();

  // Computed properties
  readonly element3D = computed(() => {
    const id = this.elementId();
    return id ? this.hybridService.currentElements().get(id) || null : null;
  });

  ngOnInit(): void {
    this.initializeElement();
    this.setupConfigWatcher();
  }

  ngOnDestroy(): void {
    const id = this.elementId();
    if (id) {
      // Cleanup would be handled by service
      console.log(`Cleaning up hybrid element ${id}`);
    }
  }

  private async initializeElement(): Promise<void> {
    await this.hybridService.initialize();

    const config = this.buildElementConfig();
    const events = this.createEventHandlers();

    const elementId = await this.hybridService.addElement(this.elementRef.nativeElement, config, events);

    if (elementId) {
      this.elementId.set(elementId);
      this.isReady.set(true);

      const element = this.element3D();
      if (element) {
        this.ready.emit(element);
      }
    }
  }

  private buildElementConfig(): HybridElementConfigV2 {
    const baseConfig = this.config();

    return {
      priority: this.priority(),
      content: {
        quality: this.quality(),
        watchForChanges: this.watchChanges(),
        updateTriggers: ['mutation', 'resize', 'style'],
        ...baseConfig?.content,
      },
      ...baseConfig,
    };
  }

  private createEventHandlers(): Partial<HybridElementEvents> {
    return {
      onHover: (element) => this.hover.emit(element as HybridElement3DV2),
      onClick: (element) => this.click.emit(element as HybridElement3DV2),
    };
  }

  private setupConfigWatcher(): void {
    effect(() => {
      const config = this.config();
      const elementId = this.elementId();

      if (config && elementId) {
        // Update element configuration
        console.log('Updating element configuration', elementId);
      }
    });
  }
}

// =====================================================
// 6. ENHANCED SCENE COMPONENT V2
// =====================================================

@Component({
  selector: 'hybrid-scene-v2',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ngt-canvas [shadows]="shadows()" [camera]="cameraConfig()" [dpr]="[1, 2]" [gl]="glConfig()" (created)="onSceneCreated($event)">
      <!-- Lighting setup -->
      <ngt-ambient-light [intensity]="0.5" />
      <ngt-spot-light [position]="[10, 10, 10]" [intensity]="Math.PI" [cast-shadow]="shadows()" />

      <!-- Scene content -->
      <ngt-group>
        <ng-content></ng-content>
      </ngt-group>

      <!-- Controls -->
      @if (enableControls()) {
      <!-- <ngt-orbit-controls /> -->
      }
    </ngt-canvas>

    <!-- UI Overlays -->
    @if (showPerformance()) {
    <div class="performance-overlay">
      <div class="metric">
        <span>FPS:</span>
        <span>{{ performance().fps }}</span>
      </div>
      <div class="metric">
        <span>Elements:</span>
        <span>{{ performance().elementCount }}</span>
      </div>
      <div class="metric">
        <span>Memory:</span>
        <span>{{ (performance().textureMemory / 1024 / 1024).toFixed(1) }}MB</span>
      </div>
    </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100vh;
        position: relative;
      }

      .performance-overlay {
        position: absolute;
        top: 16px;
        right: 16px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        z-index: 100;
      }

      .metric {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
        min-width: 120px;
      }
    `,
  ],
})
export class HybridSceneV2Component implements OnInit {
  private readonly hybridService = inject(HybridUIServiceV2);

  // Configuration inputs
  shadows = input(true);
  enableControls = input(true);
  showPerformance = input(false);

  // Scene outputs
  sceneReady = output<any>();

  // Reactive state
  readonly performance = this.hybridService.performanceMetrics;
  readonly Math = Math;

  // Camera configuration
  readonly cameraConfig = computed(() => ({
    position: [0, 6, 25] as [number, number, number],
    fov: 75,
  }));

  // WebGL configuration
  readonly glConfig = computed(() => ({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance' as const,
  }));

  async ngOnInit(): Promise<void> {
    await this.hybridService.initialize();
  }

  onSceneCreated(event: any): void {
    console.log('Angular Three scene created:', event);
    this.sceneReady.emit(event);
  }
}

export { HybridSceneV2Component as HybridSceneComponent };

// =====================================================
// 7. USAGE EXAMPLE
// =====================================================

/*
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [HybridSceneV2Component, Hybrid3DDirectiveV2],
  template: `
    <hybrid-scene-v2 [showPerformance]="true">
      
      <!-- Enhanced HTML-to-3D conversion -->
      <div *hybrid3D="{
        priority: 'PRIMARY',
        content: {
          quality: 'high',
          watchForChanges: true
        },
        animations: {
          idle: {
            type: 'transform',
            duration: 3000,
            properties: { rotation: { y: Math.PI * 2 } }
          }
        }
      }" class="content-card">
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
      </div>
      
      <!-- Native Angular Three for traditional 3D -->
      <ngt-mesh [position]="[5, 0, 0]">
        <ngt-box-geometry *args="[1, 1, 1]" />
        <ngt-mesh-standard-material color="blue" />
      </ngt-mesh>
      
    </hybrid-scene-v2>
  `
})
export class ExampleComponent {
  title = 'Enhanced Hybrid UI';
  description = 'Combining Angular Three with HTML-to-3D conversion';
  Math = Math;
}
*/
```
