import {
  Directive,
  ElementRef,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  DestroyRef,
  Injector,
  runInInjectionContext,
  effect,
  input,
  output
} from '@angular/core';
// Removed takeUntilDestroyed; using signal effects for reactive updates
import {
  HybridElementConfig,
  ContentPriority,
  HybridElementEvents,
  HybridElement3D
} from '../core/types/hybrid-ui.types';
import { HybridSceneComponent } from '../components/hybrid-scene.component';
import { HybridUIService } from '../core/services/hybrid-ui.service';

/**
 * Content 3D Directive
 * Transforms any HTML element into a 3D object within a hybrid scene
 * Provides declarative API for content-first 3D interfaces
 *
 * Usage:
 * <div *content3D="config" class="my-card">Content</div>
 * <button *content3D="{priority: 'primary', interaction: {hover: 'glow'}}">Click me</button>
 */
@Directive({
  selector: '[content3D]',
  standalone: true,
  exportAs: 'content3D'
})
export class Content3DDirective implements OnInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  // Try to find parent scene component
  private readonly parentScene = inject(HybridSceneComponent, { optional: true });

  // Internal state
  private readonly elementId = signal<string | null>(null);
  private readonly isVisible = signal(false);
  private readonly isInteracting = signal(false);
  private readonly config = signal<HybridElementConfig | null>(null);

  // Configuration input (can be object or string reference)
  contentConfig = input<HybridElementConfig | string | null>(null, { alias: 'content3D' });

  private applyContentConfig(value: HybridElementConfig | string | null) {
    if (typeof value === 'string') {
      // Handle string references to predefined configs
      this.config.set(this.parseConfigString(value));
    } else if (value && typeof value === 'object') {
      this.config.set(value);
    } else {
      this.config.set(this.getDefaultConfig());
    }
  }

  // Individual config properties (for easier template usage)
  priority = input<ContentPriority>(ContentPriority.SECONDARY);
  decoration = input<HybridElementConfig['decoration'] | undefined>(undefined);
  interaction = input<HybridElementConfig['interaction'] | undefined>(undefined);
  position = input<[number, number, number] | undefined>(undefined);
  size = input<'auto' | number | undefined>(undefined);

  // Events
  element3DReady = output<HybridElement3D>();
  element3DHover = output<HybridElement3D>();
  element3DClick = output<HybridElement3D>();
  element3DFocus = output<HybridElement3D>();

  // Computed properties
  readonly is3D = computed(() => this.elementId() !== null);
  private readonly hybridService = inject(HybridUIService);
  readonly element3D = computed(() => {
    const id = this.elementId();
    return id ? this.hybridService.getElement(id) : null;
  });

  // Configuration computed from inputs
  private readonly mergedConfig = computed(() => {
    const baseConfig = this.config() || this.getDefaultConfig();

    // Merge individual property inputs
    return {
      ...baseConfig,
      priority: this.priority() || baseConfig.priority,
      decoration: this.decoration() || baseConfig.decoration,
      interaction: this.interaction() || baseConfig.interaction,
      position: this.position() || baseConfig.position,
      size: this.size() || baseConfig.size
    } as HybridElementConfig;
  });

  ngOnInit(): void {
    this.validateSetup();
    // React to initial and subsequent config changes
    effect(() => {
      this.applyContentConfig(this.contentConfig());
    });
    this.initialize3DElement();
    this.setupEventHandlers();
    this.setupConfigWatcher();
  }

  ngOnDestroy(): void {
    this.remove3DElement();
  }

  /**
   * Manually show the 3D element
   */
  show(): void {
    const element = this.element3D();
    if (element) {
      element.isVisible = true;
      element.content3D.visible = true;
      if (element.decoration3D) {
        element.decoration3D.visible = true;
      }
      this.isVisible.set(true);
    }
  }

  /**
   * Manually hide the 3D element
   */
  hide(): void {
    const element = this.element3D();
    if (element) {
      element.isVisible = false;
      element.content3D.visible = false;
      if (element.decoration3D) {
        element.decoration3D.visible = false;
      }
      this.isVisible.set(false);
    }
  }

  /**
   * Update the 3D element configuration
   */
  updateConfig(newConfig: Partial<HybridElementConfig>): void {
    const currentConfig = this.mergedConfig();
    this.config.set({ ...currentConfig, ...newConfig });
  }

  /**
   * Get the current 3D element
   */
  getElement3D(): HybridElement3D | null {
    return this.element3D();
  }

  /**
   * Set interaction state
   */
  setInteracting(interacting: boolean): void {
    this.isInteracting.set(interacting);
    const element = this.element3D();
    if (element) {
      element.isInteracting = interacting;
    }
  }

  /**
   * Initialize the 3D element
   */
  private async initialize3DElement(): Promise<void> {
    if (!this.parentScene) {
      console.warn('Content3D directive requires a parent HybridSceneComponent');
      return;
    }

    try {
      // Wait for scene to be ready
      await this.waitForSceneReady();

      // Create the 3D element
      const elementId = await this.parentScene.addElement(
        this.elementRef.nativeElement,
        this.mergedConfig(),
        this.createEventHandlers()
      );

      if (elementId) {
        this.elementId.set(elementId);
        this.isVisible.set(true);

        // Emit ready event
        const element = this.element3D();
        if (element) {
          this.element3DReady.emit(element);
        }
      }
    } catch (error) {
      console.error('Failed to initialize 3D element:', error);
    }
  }

  /**
   * Remove the 3D element
   */
  private remove3DElement(): void {
    const id = this.elementId();
    if (id && this.parentScene) {
      this.hybridService.removeElement(this.parentScene.sceneId(), id);
      this.elementId.set(null);
      this.isVisible.set(false);
    }
  }

  /**
   * Wait for parent scene to be ready
   */
  private async waitForSceneReady(): Promise<void> {
    return new Promise((resolve) => {
      if (this.parentScene && !this.parentScene.isLoading()) {
        resolve();
        return;
      }

      // Wait for scene ready event
      const subscription = this.parentScene?.sceneReady.subscribe(() => {
        subscription?.unsubscribe();
        resolve();
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        subscription?.unsubscribe();
        resolve();
      }, 10000);
    });
  }

  /**
   * Create event handlers for 3D interactions
   */
  private createEventHandlers(): Partial<HybridElementEvents> {
    return {
      onHover: (element) => {
        this.setInteracting(true);
        this.element3DHover.emit(element);
      },
      onLeave: (element) => {
        this.setInteracting(false);
      },
      onClick: (element, originalEvent) => {
        this.element3DClick.emit(element);

        // Forward click to original DOM element if needed
        if (originalEvent instanceof MouseEvent) {
          this.elementRef.nativeElement.dispatchEvent(
            new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              clientX: originalEvent.clientX,
              clientY: originalEvent.clientY
            })
          );
        }
      },
      onFocus: (element) => {
        this.element3DFocus.emit(element);
      },
      onShow: (element) => {
        this.isVisible.set(true);
      },
      onHide: (element) => {
        this.isVisible.set(false);
      }
    };
  }

  /**
   * Setup DOM event handlers
   */
  private setupEventHandlers(): void {
    const element = this.elementRef.nativeElement;

    // Forward DOM events to 3D element
    element.addEventListener('mouseenter', () => {
      this.setInteracting(true);
    });

    element.addEventListener('mouseleave', () => {
      this.setInteracting(false);
    });

    element.addEventListener('focus', () => {
      this.parentScene?.setActiveElement(this.elementId());
    });

    // Observe DOM changes for texture updates
    const observer = new MutationObserver(() => {
      this.updateTexture();
    });

    observer.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });

    // Cleanup observer
    this.destroyRef.onDestroy(() => {
      observer.disconnect();
    });
  }

  /**
   * Setup configuration watcher
   */
  private setupConfigWatcher(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const cfg = this.mergedConfig();
        if (cfg) {
          this.updateElementConfig(cfg);
        }
      });
    });
  }

  /**
   * Update 3D element configuration
   */
  private updateElementConfig(newConfig: HybridElementConfig): void {
    const id = this.elementId();
    if (id) {
      this.hybridService.updateElement(id, newConfig);
    }
  }

  /**
   * Update texture when DOM changes
   */
  private updateTexture(): void {
    // Implementation would update the texture through the service
    // This is a placeholder for texture update logic
  }

  /**
   * Validate directive setup
   */
  private validateSetup(): void {
    if (!this.parentScene) {
      console.error(
        'Content3DDirective must be used within a HybridSceneComponent. ' +
        'Wrap your element with <hybrid-scene>.'
      );
    }

    if (!this.elementRef.nativeElement) {
      console.error('Content3DDirective requires a valid DOM element.');
    }
  }

  /**
   * Parse string configuration
   */
  private parseConfigString(configStr: string): HybridElementConfig {
    // Handle predefined config names
    const presets: Record<string, Partial<HybridElementConfig>> = {
      'card': {
        priority: ContentPriority.SECONDARY,
        decoration: { geometry: 'cube', opacity: 0.3, scale: 0.8, animation: 'float' },
        interaction: { hover: 'scale', click: 'focus' }
      },
      'button': {
        priority: ContentPriority.PRIMARY,
        decoration: { geometry: 'sphere', opacity: 0.4, scale: 0.6, animation: 'pulse' },
        interaction: { hover: 'glow', click: 'press' }
      },
      'hero': {
        priority: ContentPriority.HERO,
        decoration: { geometry: 'icosahedron', opacity: 0.5, scale: 1.2, animation: 'rotate' },
        interaction: { hover: 'lift', click: 'focus' }
      },
      'nav': {
        priority: ContentPriority.TERTIARY,
        decoration: { geometry: 'cylinder', opacity: 0.2, scale: 0.5, animation: 'float' },
        interaction: { hover: 'scale', click: 'focus' }
      }
    };

    return { ...this.getDefaultConfig(), ...presets[configStr] } as HybridElementConfig;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): HybridElementConfig {
    return {
      priority: ContentPriority.SECONDARY,
      material: {
        opacity: 0.95,
        roughness: 0.05,
        metalness: 0.1,
        clearcoat: 1.0,
        transmission: 0.02
      },
      interaction: {
        hover: 'scale',
        click: 'focus'
      },
      layout: {
        type: 'grid-2d'
      }
    };
  }
}
