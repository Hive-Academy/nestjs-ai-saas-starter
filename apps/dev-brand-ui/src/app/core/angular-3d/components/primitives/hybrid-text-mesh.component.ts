/**
 * HybridTextMeshComponent - Converts DOM elements to textured 3D meshes
 *
 * This component takes HTML content (with all its styling, gradients, emojis),
 * renders it to a canvas texture using html2canvas, and displays it as a 3D mesh
 * that blends seamlessly into the Three.js scene.
 *
 * Features:
 * - Preserves all CSS styling (gradients, shadows, colors, fonts)
 * - Supports emojis and complex text
 * - Configurable mesh properties (size, position, material)
 * - Auto-updates when content changes
 * - CORS-safe rendering
 *
 * Usage:
 * ```html
 * <app-hybrid-text-mesh
 *   [htmlContent]="'<h1>Hello 3D World!</h1>'"
 *   [position]="[0, 1, 0]"
 *   [width]="4"
 *   [height]="1"
 *   [transparent]="true"
 * />
 * ```
 */

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  OnInit,
  viewChild,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { extend } from 'angular-three';
import { Mesh, PlaneGeometry, MeshBasicMaterial } from 'three';
import { DOMTextureRendererService } from '../../services/texture/dom-texture-renderer.service';

extend({ Mesh, PlaneGeometry, MeshBasicMaterial });

@Component({
  selector: 'app-hybrid-text-mesh',
  standalone: true,
  imports: [],
  template: `
    <ngt-mesh
      #mesh
      [position]="position()"
      [scale]="scale()"
      [rotation]="rotation()"
      [castShadow]="castShadow()"
      [receiveShadow]="receiveShadow()"
    >
      <ngt-plane-geometry [args]="[width(), height()]" />
      <ngt-mesh-basic-material
        [map]="texture()"
        [transparent]="transparent()"
        [opacity]="opacity()"
        [side]="2"
      />
    </ngt-mesh>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class HybridTextMeshComponent implements OnInit {
  // Services
  private readonly domRenderer = inject(DOMTextureRendererService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  // ViewChild reference
  readonly meshRef = viewChild<ElementRef<Mesh>>('mesh');

  // Input: HTML content to render as texture
  readonly htmlContent = input.required<string>();

  // Input: CSS classes to apply to the hidden DOM element
  readonly cssClasses = input<string>('');

  // Input: Inline styles for the hidden DOM element
  readonly inlineStyles = input<string>('');

  // Mesh transform inputs
  readonly position = input<[number, number, number]>([0, 0, 0]);
  readonly scale = input<[number, number, number] | number>([1, 1, 1]);
  readonly rotation = input<[number, number, number]>([0, 0, 0]);
  readonly width = input<number>(4);
  readonly height = input<number>(2);

  // Material properties
  readonly transparent = input<boolean>(true);
  readonly opacity = input<number>(1.0);
  readonly castShadow = input<boolean>(false);
  readonly receiveShadow = input<boolean>(false);

  // Texture quality
  readonly textureWidth = input<number>(1024);
  readonly textureHeight = input<number>(512);
  readonly quality = input<'low' | 'medium' | 'high' | 'ultra'>('high');

  // Internal state
  readonly texture = signal<any>(null);
  private hiddenElement?: HTMLElement;

  constructor() {
    // Setup reactive effects for content changes
    this.setupReactiveEffects();
  }

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    console.log('[HybridTextMesh] Initializing...');

    // Create hidden DOM element for rendering
    await this.createHiddenElement();

    // Render to texture
    await this.updateTexture();

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => {
      this.cleanup();
    });

    console.log(
      '[HybridTextMesh] Initialization complete, texture:',
      this.texture()
    );
  }

  /**
   * Create a hidden DOM element with the HTML content
   */
  private async createHiddenElement(): Promise<void> {
    this.hiddenElement = document.createElement('div');

    // Set HTML content
    this.hiddenElement.innerHTML = this.htmlContent();

    // Apply CSS classes
    if (this.cssClasses()) {
      this.hiddenElement.className = this.cssClasses();
    }

    // Apply inline styles
    const baseStyles = `
      position: absolute;
      top: -10000px;
      left: -10000px;
      width: ${this.textureWidth()}px;
      height: ${this.textureHeight()}px;
      visibility: hidden;
      pointer-events: none;
    `;

    this.hiddenElement.setAttribute(
      'style',
      baseStyles + (this.inlineStyles() || '')
    );

    // Append to body (required for proper rendering)
    document.body.appendChild(this.hiddenElement);

    // Wait for styles to apply
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Render the hidden element to a THREE.js texture
   */
  private async updateTexture(): Promise<void> {
    if (!this.hiddenElement) {
      console.warn('[HybridTextMesh] Hidden element not created yet');
      return;
    }

    try {
      const texture = await this.domRenderer.renderToTexture(
        this.hiddenElement,
        {
          width: this.textureWidth(),
          height: this.textureHeight(),
          backgroundColor: 'transparent',
          quality: this.quality(),
        }
      );

      this.texture.set(texture);

      console.log('[HybridTextMesh] Texture updated successfully');
    } catch (error) {
      console.error('[HybridTextMesh] Failed to render texture:', error);
    }
  }

  /**
   * Setup reactive effects for input changes
   */
  private setupReactiveEffects(): void {
    // Re-render when HTML content changes
    effect(() => {
      const content = this.htmlContent();
      if (this.hiddenElement && content) {
        this.hiddenElement.innerHTML = content;
        this.updateTexture();
      }
    });

    // Re-apply classes when they change
    effect(() => {
      const classes = this.cssClasses();
      if (this.hiddenElement && classes) {
        this.hiddenElement.className = classes;
        this.updateTexture();
      }
    });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    // Remove hidden element from DOM
    if (this.hiddenElement && this.hiddenElement.parentElement) {
      this.hiddenElement.parentElement.removeChild(this.hiddenElement);
    }

    // Dispose texture
    const currentTexture = this.texture();
    if (currentTexture) {
      currentTexture.dispose();
    }

    console.log('[HybridTextMesh] Cleanup complete');
  }

  /**
   * Public API: Get the THREE.Mesh instance
   */
  getMesh(): Mesh | null {
    const meshRef = this.meshRef();
    if (!meshRef) {
      console.warn('[HybridTextMesh] Mesh ref not available');
      return null;
    }
    return meshRef.nativeElement;
  }

  /**
   * Public API: Manually trigger texture update
   */
  async refreshTexture(): Promise<void> {
    await this.updateTexture();
  }
}
