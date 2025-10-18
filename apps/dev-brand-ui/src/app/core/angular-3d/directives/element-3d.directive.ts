/**
 * Element3D Directive
 *
 * Transforms native HTML elements (h1, p, img, button) into 3D objects.
 * The original DOM element is hidden and replaced with a 3D mesh textured
 * from the element's content.
 *
 * Usage:
 * <h1 element3d [depth]="-2">Hello World</h1>
 * <button element3d priority="PRIMARY" [position]="[0, -2, -1.5]">Click Me</button>
 */

import {
  Directive,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  input,
  output,
  inject,
  effect,
  signal,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import * as THREE from 'three';

import { HybridUIService } from '../services/hybrid-ui.service';
import type {
  HybridElementConfigExtended,
  HybridElementExtended,
} from '../interfaces';

@Directive({
  selector: '[element3d]',
  standalone: true,
  host: {
    '[attr.data-3d-element]': 'elementId()',
    '[style.opacity]': 'domVisible() ? 1 : 0',
    '[style.pointer-events]': '"none"', // Disable DOM interactions
    '[attr.aria-hidden]': 'true', // Hide from screen readers
  },
})
export class Element3DDirective implements AfterViewInit, OnDestroy {
  // Services
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly hybridUI = inject(HybridUIService);
  private readonly destroyRef = inject(DestroyRef);

  // Inputs
  readonly position = input<[number, number, number] | 'auto'>('auto');
  readonly depth = input<number>(-2); // Z-depth if position is 'auto'
  readonly quality = input<'low' | 'medium' | 'high' | 'ultra'>('medium');
  readonly priority = input<'HERO' | 'PRIMARY' | 'SECONDARY' | 'TERTIARY'>(
    'PRIMARY'
  );
  readonly enableInteraction = input(true);
  readonly keepDOMVisible = input(false); // For debugging
  readonly autoUpdate = input(true); // Watch for content changes

  // Outputs
  readonly initialized = output<HybridElementExtended>();
  readonly clicked = output<MouseEvent>();
  readonly hovered = output<boolean>();

  // State (readonly for host bindings to access)
  readonly elementId = signal<string>('');
  readonly domVisible = signal(true); // TEMPORARY: Keep DOM visible during debugging
  private hybridElement: HybridElementExtended | null = null;

  constructor() {
    // Watch for DOM visibility changes
    effect(() => {
      if (this.keepDOMVisible()) {
        this.domVisible.set(true);
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    try {
      // Wait for HybridUI service to be initialized
      if (!this.hybridUI.initialized()) {
        await this.waitForHybridUI();
      }

      // Calculate position
      const pos = await this.calculatePosition();

      // Create hybrid element configuration
      const config = this.buildConfig(pos);

      // Create 3D element
      this.hybridElement = await this.hybridUI.createHybridElement(
        this.element.nativeElement,
        config
      );

      this.elementId.set(this.hybridElement.id);

      // TEMPORARY: Don't hide DOM element to debug 3D rendering
      this.hideDOMElement(); // Re-enabled but now does nothing

      // Setup event forwarding from 3D mesh to directive outputs
      this.setupEventForwarding();

      // Setup resize observer for responsive updates
      if (this.autoUpdate()) {
        this.setupResizeObserver();
      }

      this.initialized.emit(this.hybridElement);

      console.log(
        `Element3D initialized: ${this.element.nativeElement.tagName}`,
        {
          id: this.hybridElement.id,
          position: pos,
          priority: this.priority(),
        }
      );
    } catch (error) {
      console.error('Failed to initialize Element3D:', error);
      // Fallback: show DOM element
      this.domVisible.set(true);
    }
  }

  ngOnDestroy(): void {
    if (this.hybridElement) {
      this.hybridUI.removeElement(this.hybridElement.id);
    }
  }

  // Calculate world position from DOM position
  private async calculatePosition(): Promise<[number, number, number]> {
    const posInput = this.position();

    if (posInput !== 'auto') {
      return posInput;
    }

    // Auto-calculate position from DOM layout
    const rect = this.element.nativeElement.getBoundingClientRect();
    const camera = this.hybridUI.camera();

    if (!camera) {
      console.warn('Camera not available, using default position');
      return [0, 0, this.depth()];
    }

    // Convert DOM center to normalized device coordinates (-1 to 1)
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const ndcX = (centerX / window.innerWidth) * 2 - 1;
    const ndcY = -(centerY / window.innerHeight) * 2 + 1;

    // Project to world space at specified depth
    const depth = this.depth();
    const aspectRatio = window.innerWidth / window.innerHeight;
    const fov = (camera as THREE.PerspectiveCamera).fov || 75;
    const vFOV = (fov * Math.PI) / 180;

    // Calculate frustum size at depth
    const frustumHeight = 2 * Math.tan(vFOV / 2) * Math.abs(depth);
    const frustumWidth = frustumHeight * aspectRatio;

    const worldX = ndcX * (frustumWidth / 2);
    const worldY = ndcY * (frustumHeight / 2);

    return [worldX, worldY, depth];
  }

  // Build hybrid element configuration
  private buildConfig(
    position: [number, number, number]
  ): HybridElementConfigExtended {
    return {
      priority: this.priority(),
      position,

      // Angular Three configuration
      angularThree: {
        renderOrder: this.getPriorityRenderOrder(),
        castShadow: true,
        receiveShadow: true,
      },

      // Content texture configuration
      content: {
        watchForChanges: this.autoUpdate(),
        updateTriggers: this.autoUpdate()
          ? ['resize', 'mutation', 'style']
          : [],
        quality: this.quality(),
        format: 'webp',
      },

      // Material configuration based on element type
      material: this.getMaterialConfig(),

      // Animation configuration
      animations: this.enableInteraction()
        ? {
            hover: {
              type: 'transform',
              duration: 300,
              easing: 'power2.out',
              properties: {
                scale: 1.05,
                position: { z: 0.2 },
              },
            },
          }
        : undefined,

      // Performance configuration
      performance: {
        enableLOD: true,
        texturePooling: true,
        memoryBudget: 16,
      },
    };
  }

  // Get material config based on element tag
  private getMaterialConfig(): HybridElementConfigExtended['material'] {
    const tagName = this.element.nativeElement.tagName.toLowerCase();

    switch (tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
        // Headings: high opacity, slight metalness for premium feel
        return {
          opacity: 1.0,
          roughness: 0.1,
          metalness: 0.3,
          clearcoat: 0.5,
        };

      case 'button':
      case 'a':
        // Interactive elements: full opacity, moderate metalness
        return {
          opacity: 1.0,
          roughness: 0.2,
          metalness: 0.5,
          clearcoat: 1.0,
        };

      case 'img':
        // Images: full opacity, no metalness
        return {
          opacity: 1.0,
          roughness: 0.8,
          metalness: 0.0,
        };

      case 'p':
      case 'span':
      case 'div':
      default:
        // Text content: high opacity, subtle material
        return {
          opacity: 0.95,
          roughness: 0.3,
          metalness: 0.1,
        };
    }
  }

  private getPriorityRenderOrder(): number {
    const orders = {
      HERO: 1000,
      PRIMARY: 800,
      SECONDARY: 600,
      TERTIARY: 400,
    };
    return orders[this.priority()] || 600;
  }

  private hideDOMElement(): void {
    // TEMPORARY: Disabled to debug 3D rendering
    // const el = this.element.nativeElement;
    // el.style.opacity = '0';
    // el.style.pointerEvents = 'none';
    // if (!this.keepDOMVisible()) {
    //   el.setAttribute('aria-hidden', 'true');
    // }
  }

  private setupEventForwarding(): void {
    if (!this.enableInteraction() || !this.hybridElement) return;

    const domElement = this.element.nativeElement;

    // Forward hover events (in reality, these would come from 3D raycasting)
    fromEvent(domElement, 'mouseenter')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.hovered.emit(true));

    fromEvent(domElement, 'mouseleave')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.hovered.emit(false));

    fromEvent<MouseEvent>(domElement, 'click')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.clicked.emit(event));
  }

  private setupResizeObserver(): void {
    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize updates
      this.handleResize();
    });

    resizeObserver.observe(this.element.nativeElement);

    // Cleanup on destroy
    this.destroyRef.onDestroy(() => resizeObserver.disconnect());
  }

  private handleResize = debounce(() => {
    if (this.hybridElement && this.position() === 'auto') {
      // Recalculate position
      this.calculatePosition().then((newPos) => {
        if (this.hybridElement?.ngtGroup) {
          this.hybridElement.ngtGroup.position.set(...newPos);
        }
      });
    }
  }, 250);

  private async waitForHybridUI(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 50; // 5 second timeout

    while (attempts < maxAttempts && !this.hybridUI.initialized()) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!this.hybridUI.initialized()) {
      throw new Error('HybridUI initialization timeout');
    }
  }
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}
