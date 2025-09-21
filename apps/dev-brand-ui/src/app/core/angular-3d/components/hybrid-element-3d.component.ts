import {
  Component,
  OnInit,
  OnDestroy,
  input,
  output,
  signal,
  computed,
  effect,
  inject,
  ChangeDetectionStrategy,
  ElementRef,
  viewChild,
} from '@angular/core';
import { injectStore } from 'angular-three';
import * as THREE from 'three';

import { EnhancedContentTextureService } from '../services/enhanced-content-texture.service';
import { AngularThreeFoundationService } from '../services/angular-three-foundation.service';
import { AnimationService } from '../services/animation.service';

// Strict type definitions following Angular best practices
interface ElementConfig {
  readonly width: number;
  readonly height: number;
  readonly interactive: boolean;
}

interface AnimationConfig {
  readonly type: 'fade' | 'slide' | 'scale';
  readonly duration: number;
}

interface ElementInteractionEvent {
  readonly elementId: string;
  readonly type: 'hover' | 'click' | 'focus';
  readonly position: readonly [number, number, number];
}

/**
 * Phase 2 Enhanced: Modern standalone component for hybrid elements using Angular Three primitives
 * Follows Angular 20.1.6 best practices with signals, strict typing, and Angular Three integration
 */
@Component({
  selector: 'app-hybrid-element-3d',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-element-id]': 'elementId()',
    '[class.interactive]': 'config().interactive',
    '[class.hovered]': 'isHovered()',
    '[class.visible]': 'isVisible()',
    '[class.performance-optimized]': 'isPerformanceOptimized()',
    '[style.z-index]': 'zIndex()',
  },
  template: `
    <!-- Phase 2: Enhanced with Angular Three integration -->
    <!-- DOM content container for texture generation -->
    <div #contentContainer 
         class="hybrid-content-container" 
         [style.width.px]="config().width"
         [style.height.px]="config().height"
         [style.opacity]="showDOMContent() ? 1 : 0"
         [style.position]="'absolute'"
         [style.pointer-events]="config().interactive ? 'auto' : 'none'">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
    }
    
    .hybrid-content-container {
      box-sizing: border-box;
      padding: 16px;
      background: rgba(255, 255, 255, 0.95);
      color: #333;
      font-family: system-ui, -apple-system, sans-serif;
      overflow: hidden;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }
    
    :host(.interactive) .hybrid-content-container {
      cursor: pointer;
    }
    
    :host(.hovered) .hybrid-content-container {
      background: rgba(255, 255, 255, 1);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      transform: scale(1.02);
    }
    
    :host(.performance-optimized) .hybrid-content-container {
      will-change: transform, opacity;
    }
  `],
})
export class HybridElement3DComponent implements OnInit, OnDestroy {
  // Required input signals with strict typing
  readonly config = input.required<ElementConfig>();
  readonly content = input.required<string>();
  readonly position = input<readonly [number, number, number]>([0, 0, 0] as const);
  readonly animation = input<AnimationConfig>({
    type: 'fade' as const,
    duration: 1000
  });

  // Optional inputs with defaults
  readonly initialRotation = input<readonly [number, number, number]>([0, 0, 0] as const);
  readonly initialScale = input<readonly [number, number, number]>([1, 1, 1] as const);
  readonly zIndex = input(0);
  readonly opacity = input(1);
  readonly showDOM = input(false); // Controls whether to show DOM content container
  readonly enableLOD = input(true); // Level of Detail optimization
  readonly renderOrder = input(0); // Render order for depth sorting

  // Output events
  readonly interaction = output<ElementInteractionEvent>();
  readonly textureLoaded = output<THREE.Texture>();
  readonly textureError = output<Error>();
  readonly performanceUpdate = output<{ fps: number; memoryUsage: number }>();

  // ViewChild for DOM content container
  readonly contentContainer = viewChild<ElementRef<HTMLDivElement>>('contentContainer');

  // Dependency injection with inject() function - Phase 2 enhanced
  private readonly textureService = inject(EnhancedContentTextureService);
  private readonly ngtStore = injectStore({ optional: true });
  private readonly angularThreeFoundation = inject(AngularThreeFoundationService);

  // State management signals
  private readonly _isHovered = signal(false);
  private readonly _texture = signal<THREE.Texture | null>(null);
  private readonly _rotation = signal<readonly [number, number, number]>([0, 0, 0] as const);
  private readonly _scale = signal<readonly [number, number, number]>([1, 1, 1] as const);
  private readonly _currentOpacity = signal(1);
  private readonly _mesh = signal<THREE.Mesh | null>(null);
  private readonly _group = signal<THREE.Group | null>(null);

  // Component state and lifecycle - Phase 2 enhanced
  private element3D?: THREE.Object3D;
  private isInitialized = false;
  private animationCleanup?: () => void;
  private performanceMonitor?: { interval: NodeJS.Timeout; lastTime: number };

  // Readonly accessors for state
  readonly isHovered = this._isHovered.asReadonly();
  readonly texture = this._texture.asReadonly();
  readonly rotation = this._rotation.asReadonly();
  readonly scale = this._scale.asReadonly();
  readonly currentOpacity = this._currentOpacity.asReadonly();
  readonly mesh = this._mesh.asReadonly();
  readonly group = this._group.asReadonly();

  // Computed derived state
  readonly elementId = computed(() =>
    `hybrid-element-${this.config().width}-${this.config().height}-${Math.random().toString(36).substr(2, 9)}`
  );

  readonly geometryArgs = computed(() =>
    [this.config().width, this.config().height] as const
  );

  readonly isVisible = computed(() => this._currentOpacity() > 0);

  readonly geometry = computed(() =>
    new THREE.PlaneGeometry(this.config().width, this.config().height)
  );

  readonly material = computed(() => new THREE.MeshBasicMaterial({
    map: this._texture(),
    transparent: true,
    opacity: this._currentOpacity(),
    side: THREE.DoubleSide,
  }));

  // Computed transform matrix
  readonly transformMatrix = computed(() => {
    const matrix = new THREE.Matrix4();
    const pos = this.position();
    const rot = this._rotation();
    const scale = this._scale();

    matrix.compose(
      new THREE.Vector3(...pos),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
      new THREE.Vector3(...scale)
    );

    return matrix;
  });

  // Phase 2: Enhanced computed properties for template bindings
  readonly showDOMContent = computed(() => {
    const hasContent = !!this.content()?.trim();
    const showContainer = this.showDOM();
    const isContentElement = this.config().type === 'content';
    return hasContent && showContainer && isContentElement;
  });

  readonly isPerformanceOptimized = computed(() => {
    const lodEnabled = this.enableLOD();
    const hasRenderOrder = this.renderOrder() !== 0;
    const hasOptimalOpacity = this.opacity() > 0.9;
    return lodEnabled && (hasRenderOrder || hasOptimalOpacity);
  });

  readonly elementTransform = computed(() => {
    const pos = this.position();
    const rot = this.initialRotation();
    const scale = this.initialScale();
    return {
      position: `translate3d(${pos[0]}px, ${pos[1]}px, ${pos[2]}px)`,
      rotation: `rotateX(${rot[0]}rad) rotateY(${rot[1]}rad) rotateZ(${rot[2]}rad)`,
      scale: `scale3d(${scale[0]}, ${scale[1]}, ${scale[2]})`
    };
  });

  ngOnInit(): void {
    // Initialize rotation and scale from inputs
    this._rotation.set(this.initialRotation());
    this._scale.set(this.initialScale());
    this._currentOpacity.set(this.opacity());

    // Create Three.js objects
    this.createThreeJSElements();

    // Create texture from content
    effect(() => {
      const content = this.content();
      if (content) {
        this.createTextureFromContent(content);
      }
    });

    // Setup animation effects
    effect(() => {
      const animConfig = this.animation();
      this.setupAnimation(animConfig);
    });

    // Update transforms when computed properties change
    effect(() => {
      const mesh = this._mesh();
      const matrix = this.transformMatrix();

      if (mesh) {
        mesh.matrix.copy(matrix);
        mesh.matrixAutoUpdate = false;
      }
    });

    // Update material when texture or opacity changes
    effect(() => {
      const mesh = this._mesh();
      const texture = this._texture();
      const opacity = this._currentOpacity();

      if (mesh && mesh.material instanceof THREE.MeshBasicMaterial) {
        mesh.material.map = texture;
        mesh.material.opacity = opacity;
        mesh.material.needsUpdate = true;
      }
    });

    // Phase 2: Performance monitoring effect
    effect(() => {
      if (this.isPerformanceOptimized()) {
        this.startPerformanceMonitoring();
      } else {
        this.stopPerformanceMonitoring();
      }
    });

    this.isInitialized = true;
  }

  ngOnDestroy(): void {
    // Cleanup Three.js resources
    this.cleanupThreeJSResources();
    // Cleanup performance monitoring
    this.stopPerformanceMonitoring();
  }

  // Phase 2: Performance monitoring methods
  private startPerformanceMonitoring(): void {
    if (this.performanceMonitor) return;

    const startTime = performance.now();
    let frameCount = 0;
    
    const interval = setInterval(() => {
      frameCount++;
      const currentTime = performance.now();
      const elapsedTime = currentTime - startTime;
      
      if (elapsedTime >= 1000) { // Report every second
        const fps = Math.round((frameCount * 1000) / elapsedTime);
        const memoryUsage = (performance as any).memory ? 
          Math.round((performance as any).memory.usedJSHeapSize / 1048576) : 0;
          
        this.performanceUpdate.emit({ fps, memoryUsage });
        frameCount = 0;
      }
    }, 16); // ~60fps monitoring
    
    this.performanceMonitor = { interval, lastTime: startTime };
  }

  private stopPerformanceMonitoring(): void {
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor.interval);
      this.performanceMonitor = undefined;
    }
  }

  // Event handlers with strict typing
  protected onPointerOver(): void {
    if (!this.config().interactive) return;

    this._isHovered.set(true);

    this.interaction.emit({
      elementId: this.elementId(),
      type: 'hover',
      position: this.position(),
    });
  }

  protected onPointerOut(): void {
    if (!this.config().interactive) return;

    this._isHovered.set(false);
  }

  protected onClick(): void {
    if (!this.config().interactive) return;

    this.interaction.emit({
      elementId: this.elementId(),
      type: 'click',
      position: this.position(),
    });
  }

  // Public API methods

  /**
   * Update element position
   */
  updatePosition(position: readonly [number, number, number]): void {
    const mesh = this._mesh();
    if (mesh) {
      mesh.position.set(...position);
    }
  }

  /**
   * Update element rotation
   */
  updateRotation(rotation: readonly [number, number, number]): void {
    this._rotation.set(rotation);
  }

  /**
   * Update element scale
   */
  updateScale(scale: readonly [number, number, number]): void {
    this._scale.set(scale);
  }

  /**
   * Update opacity with animation
   */
  updateOpacity(opacity: number, animate = false): void {
    if (animate) {
      // TODO: Implement GSAP animation in Phase 2
      this._currentOpacity.set(opacity);
    } else {
      this._currentOpacity.set(opacity);
    }
  }

  /**
   * Show element
   */
  show(animate = false): void {
    this.updateOpacity(1, animate);
  }

  /**
   * Hide element
   */
  hide(animate = false): void {
    this.updateOpacity(0, animate);
  }

  /**
   * Get current Three.js group for external integration
   */
  getThreeGroup(): THREE.Group | null {
    return this._group();
  }

  /**
   * Get current Three.js mesh for external integration
   */
  getThreeMesh(): THREE.Mesh | null {
    return this._mesh();
  }

  // Private methods with proper error handling

  private createThreeJSElements(): void {
    try {
      // Create group container
      const group = new THREE.Group();
      group.name = this.elementId();
      group.userData = {
        elementId: this.elementId(),
        type: 'hybrid-element',
        interactive: this.config().interactive,
        createdAt: Date.now(),
      };

      // Create mesh
      const geometry = this.geometry();
      const material = this.material();
      const mesh = new THREE.Mesh(geometry, material);

      // Configure mesh
      mesh.name = `${this.elementId()}-mesh`;
      mesh.renderOrder = this.zIndex();

      // Add interaction if enabled
      if (this.config().interactive) {
        this.setupMeshInteraction(mesh);
      }

      // Add mesh to group
      group.add(mesh);

      // Store references
      this._group.set(group);
      this._mesh.set(mesh);

    } catch (error) {
      console.error('Failed to create Three.js elements:', error);
      this.textureError.emit(error as Error);
    }
  }

  private setupMeshInteraction(mesh: THREE.Mesh): void {
    // Add event listeners for interaction
    // This will be enhanced with proper Angular Three event handling in Phase 2
    mesh.userData['interactive'] = true;
  }

  private createTextureFromContent(content: string): void {
    try {
      // Create a temporary DOM element to render the content
      const tempElement = document.createElement('div');
      tempElement.innerHTML = content;
      tempElement.style.cssText = `
        width: ${this.config().width}px;
        height: ${this.config().height}px;
        padding: 16px;
        background: white;
        color: black;
        font-family: Arial, sans-serif;
        overflow: hidden;
        box-sizing: border-box;
      `;

      // Temporarily add to DOM for rendering
      document.body.appendChild(tempElement);

      try {
        const texture = this.textureService.createReactiveTexture(tempElement, {
          quality: 'medium',
          watchForChanges: false
        });

        this._texture.set(texture);
        this.textureLoaded.emit(texture);
      } finally {
        // Clean up temporary element
        document.body.removeChild(tempElement);
      }
    } catch (error) {
      console.error('Failed to create texture from content:', error);
      this._texture.set(null);
      this.textureError.emit(error as Error);
    }
  }

  private setupAnimation(config: AnimationConfig): void {
    // Animation setup will be enhanced with GSAP integration in Phase 2
    switch (config.type) {
      case 'fade':
        this.animateFade(config.duration);
        break;
      case 'scale':
        this.animateScale(config.duration);
        break;
      case 'slide':
        this.animateSlide(config.duration);
        break;
      default:
        console.warn(`Unknown animation type: ${config.type}`);
    }
  }

  private animateFade(duration: number): void {
    // Simple fade animation - will be enhanced with GSAP in Phase 2
    const startOpacity = 0;
    const endOpacity = this.opacity();
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentOpacity = startOpacity + (endOpacity - startOpacity) * progress;

      this._currentOpacity.set(currentOpacity);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  private animateScale(duration: number): void {
    // Simple scale animation - will be enhanced with GSAP in Phase 2
    const startScale: readonly [number, number, number] = [0, 0, 0];
    const endScale = this.initialScale();
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const currentScale: readonly [number, number, number] = [
        startScale[0] + (endScale[0] - startScale[0]) * progress,
        startScale[1] + (endScale[1] - startScale[1]) * progress,
        startScale[2] + (endScale[2] - startScale[2]) * progress,
      ];

      this._scale.set(currentScale);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  private animateSlide(duration: number): void {
    // Placeholder for slide animation - will be implemented in Phase 2
    console.log(`Slide animation not yet implemented (duration: ${duration}ms)`);
  }

  private cleanupThreeJSResources(): void {
    // Cleanup Three.js resources
    const mesh = this._mesh();
    const group = this._group();
    const texture = this._texture();

    if (mesh) {
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }

      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    }

    if (texture) {
      texture.dispose();
    }

    if (group) {
      group.clear();
    }

    // Reset signals
    this._mesh.set(null);
    this._group.set(null);
    this._texture.set(null);
  }
}
