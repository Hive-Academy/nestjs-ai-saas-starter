import {
  Directive,
  ElementRef,
  OnInit,
  OnDestroy,
  input,
  output,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, debounceTime, merge } from 'rxjs';

import { HybridUIService } from '../services/hybrid-ui.service';
import type {
  HybridElementConfigExtended,
  HybridElementExtended,
} from '../interfaces';

@Directive({
  selector: '[hybrid3d]',
  standalone: true,
})
export class Hybrid3DDirective implements OnInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly hybridUIService = inject(HybridUIService);

  // Configuration inputs
  readonly priority = input<'HERO' | 'PRIMARY' | 'SECONDARY' | 'TERTIARY'>(
    'SECONDARY'
  );
  readonly enabled = input(true);
  readonly autoInit = input(true);
  readonly watchChanges = input(true);
  readonly position = input<[number, number, number] | undefined>(undefined);

  // Content configuration
  readonly textureQuality = input<'low' | 'medium' | 'high' | 'ultra'>(
    'medium'
  );
  readonly textureFormat = input<'webp' | 'png' | 'jpeg'>('webp');
  readonly updateTriggers = input<
    ('resize' | 'mutation' | 'animation' | 'style')[]
  >(['resize', 'mutation']);

  // Material configuration
  readonly opacity = input(0.95);
  readonly roughness = input(0.3);
  readonly metalness = input(0.1);
  readonly clearcoat = input(0);
  readonly transmission = input(0);

  // Angular Three configuration
  readonly renderOrder = input<number | null>(null);
  readonly castShadow = input(true);
  readonly receiveShadow = input(true);
  readonly layers = input<number | null>(null);

  // Animation configuration
  readonly enableHoverAnimation = input(true);
  readonly enableFocusAnimation = input(true);
  readonly enableClickAnimation = input(false);
  readonly animationDuration = input(300);
  readonly animationEasing = input('power2.out');

  // Performance configuration
  readonly enableLOD = input(true);
  readonly memoryBudget = input(16); // MB
  readonly texturePooling = input(true);

  // Decoration configuration
  readonly enableDecoration = input(false);
  readonly decorationGeometry = input<
    'sphere' | 'cube' | 'cylinder' | 'icosahedron'
  >('sphere');
  readonly decorationColor = input(0x007bff);
  readonly decorationOpacity = input(0.1);
  readonly decorationAnimation = input<'rotate' | 'float' | 'pulse'>('float');

  // Debug configuration
  readonly debug = input(false);

  // Outputs
  readonly hybrid3dInitialized = output<HybridElementExtended>();
  readonly hybrid3dError = output<Error>();
  readonly hybrid3dStateChange = output<any>();
  readonly hybrid3dInteraction = output<{ type: string; active: boolean }>();
  readonly hybrid3dPerformanceUpdate = output<any>();

  // Internal state
  private readonly isInitialized = signal(false);
  private readonly hybridElement = signal<HybridElementExtended | null>(null);
  private readonly lastError = signal<Error | null>(null);

  // Computed properties
  readonly initialized = computed(() => this.isInitialized());
  readonly element = computed(() => this.hybridElement());
  readonly hasError = computed(() => this.lastError() !== null);

  constructor() {
    // React to configuration changes
    effect(() => {
      if (this.initialized() && this.element()) {
        this.updateElementConfig();
      }
    });

    // Auto-initialize if enabled
    effect(() => {
      if (this.autoInit() && this.enabled() && !this.initialized()) {
        this.initialize();
      }
    });
  }

  ngOnInit(): void {
    this.setupEventListeners();

    if (this.autoInit() && this.enabled()) {
      this.initialize();
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Initialize the hybrid 3D element
   */
  async initialize(): Promise<void> {
    if (this.isInitialized() || !this.enabled()) {
      return;
    }

    try {
      // Wait for hybrid UI service to be ready
      await this.waitForHybridUIService();

      // Build configuration
      const config = this.buildHybridConfig();

      // Create hybrid element
      const hybridElement = await this.hybridUIService.createHybridElement(
        this.elementRef.nativeElement,
        config
      );

      this.hybridElement.set(hybridElement);
      this.isInitialized.set(true);
      this.lastError.set(null);

      // Setup element monitoring
      this.setupElementMonitoring(hybridElement);

      // Emit initialization event
      this.hybrid3dInitialized.emit(hybridElement);

      if (this.debug()) {
        console.log(
          '[Hybrid3D] Initialized element:',
          hybridElement.id,
          hybridElement
        );
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.lastError.set(err);
      this.hybrid3dError.emit(err);

      console.error('[Hybrid3D] Failed to initialize:', err);
    }
  }

  /**
   * Destroy the hybrid 3D element
   */
  destroy(): void {
    const element = this.hybridElement();
    if (element) {
      this.hybridUIService.removeElement(element.id);
      this.hybridElement.set(null);
      this.isInitialized.set(false);

      if (this.debug()) {
        console.log('[Hybrid3D] Destroyed element:', element.id);
      }
    }
  }

  /**
   * Enable/disable the hybrid 3D element
   */
  setEnabled(enabled: boolean): void {
    if (enabled && !this.isInitialized()) {
      this.initialize();
    } else if (!enabled && this.isInitialized()) {
      this.destroy();
    }
  }

  /**
   * Update element visibility
   */
  setVisibility(visible: boolean): void {
    const element = this.hybridElement();
    if (element && element.ngtGroup) {
      element.ngtGroup.visible = visible;
    }
  }

  /**
   * Trigger animation
   */
  triggerAnimation(animationType: string): void {
    const element = this.hybridElement();
    if (element) {
      this.hybridUIService.triggerAnimation(element.id, animationType);
    }
  }

  /**
   * Update element configuration
   */
  updateConfiguration(config: Partial<HybridElementConfigExtended>): void {
    const element = this.hybridElement();
    if (element) {
      this.hybridUIService.updateElementConfig(element.id, config);
    }
  }

  /**
   * Get current element state
   */
  getState() {
    const element = this.hybridElement();
    return element ? element.state() : null;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const element = this.hybridElement();
    return element ? element.performance() : null;
  }

  private async waitForHybridUIService(): Promise<void> {
    if (this.hybridUIService.initialized()) {
      return;
    }

    return new Promise((resolve) => {
      const checkInitialized = () => {
        if (this.hybridUIService.initialized()) {
          resolve();
        } else {
          setTimeout(checkInitialized, 50);
        }
      };
      checkInitialized();
    });
  }

  private buildHybridConfig(): HybridElementConfigExtended {
    return {
      priority: this.priority(),
      position: this.position(),

      // Angular Three configuration
      angularThree: {
        renderOrder: this.renderOrder() ?? this.getDefaultRenderOrder(),
        castShadow: this.castShadow(),
        receiveShadow: this.receiveShadow(),
        layers: this.layers() ?? undefined,
      },

      // Content configuration
      content: {
        watchForChanges: this.watchChanges(),
        updateTriggers: this.updateTriggers(),
        quality: this.textureQuality(),
        format: this.textureFormat(),
      },

      // Material configuration
      material: {
        opacity: this.opacity(),
        roughness: this.roughness(),
        metalness: this.metalness(),
        clearcoat: this.clearcoat(),
        transmission: this.transmission(),
      },

      // Decoration configuration
      decoration: this.enableDecoration()
        ? {
            geometry: this.decorationGeometry(),
            color: this.decorationColor(),
            opacity: this.decorationOpacity(),
            scale: 1,
            animation: this.decorationAnimation(),
          }
        : undefined,

      // Animation configuration
      animations: this.buildAnimationConfig(),

      // Performance configuration
      performance: {
        enableLOD: this.enableLOD(),
        memoryBudget: this.memoryBudget(),
        texturePooling: this.texturePooling(),
      },
    };
  }

  private getDefaultRenderOrder(): number {
    const orders = {
      HERO: 1000,
      PRIMARY: 800,
      SECONDARY: 600,
      TERTIARY: 400,
    };
    return orders[this.priority()] || 600;
  }

  private buildAnimationConfig() {
    const animations: any = {};
    const duration = this.animationDuration();
    const easing = this.animationEasing();

    if (this.enableHoverAnimation()) {
      animations.hover = {
        type: 'transform',
        duration,
        easing,
        properties: {
          scale: 1.05,
          position: { z: 0.1 },
        },
      };
    }

    if (this.enableFocusAnimation()) {
      animations.focus = {
        type: 'material',
        duration: duration * 0.7,
        easing,
        properties: {
          opacity: 1.0,
          emissive: 0x004499,
        },
      };
    }

    if (this.enableClickAnimation()) {
      animations.click = {
        type: 'transform',
        duration: duration * 0.5,
        easing: 'power2.inOut',
        properties: {
          scale: 0.98,
        },
      };
    }

    return animations;
  }

  private setupEventListeners(): void {
    const element = this.elementRef.nativeElement;

    // Interaction events
    merge(
      fromEvent(element, 'mouseenter').pipe(debounceTime(10)),
      fromEvent(element, 'mouseleave').pipe(debounceTime(10)),
      fromEvent(element, 'focusin'),
      fromEvent(element, 'focusout'),
      fromEvent(element, 'click')
    )
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        this.handleInteractionEvent(event as Event);
      });

    // Change detection events
    if (this.watchChanges()) {
      merge(
        fromEvent(window, 'resize').pipe(debounceTime(250)),
        fromEvent(element, 'transitionend'),
        fromEvent(element, 'animationend')
      )
        .pipe(takeUntilDestroyed())
        .subscribe(() => {
          this.handleElementChange();
        });
    }
  }

  private handleInteractionEvent(event: Event): void {
    if (!this.isInitialized()) return;

    const type = event.type;
    let active = false;
    let animationType = '';

    switch (type) {
      case 'mouseenter':
        active = true;
        animationType = 'hover';
        break;
      case 'mouseleave':
        active = false;
        animationType = 'hover';
        break;
      case 'focusin':
        active = true;
        animationType = 'focus';
        break;
      case 'focusout':
        active = false;
        animationType = 'focus';
        break;
      case 'click':
        active = true;
        animationType = 'click';
        break;
    }

    // Emit interaction event
    this.hybrid3dInteraction.emit({ type: animationType, active });

    // Trigger animation if configured
    if (active && animationType) {
      this.triggerAnimation(animationType);
    }

    if (this.debug()) {
      console.log('[Hybrid3D] Interaction:', type, active, animationType);
    }
  }

  private handleElementChange(): void {
    if (!this.isInitialized()) return;

    // Element has changed, update the 3D representation
    const element = this.hybridElement();
    if (element) {
      // Mark texture for update - this would be implemented with a writable signal
      // element.needsTextureUpdate.set(true);

      if (this.debug()) {
        console.log('[Hybrid3D] Element changed, updating texture');
      }
    }
  }

  private setupElementMonitoring(hybridElement: HybridElementExtended): void {
    // Monitor element state changes
    let lastStateHash = '';
    const stateMonitor = setInterval(() => {
      const state = hybridElement.state();
      const stateHash = JSON.stringify(state);

      if (stateHash !== lastStateHash) {
        lastStateHash = stateHash;
        this.hybrid3dStateChange.emit(state);
      }
    }, 100);

    // Monitor performance metrics
    let lastPerfUpdate = 0;
    const perfMonitor = setInterval(() => {
      const now = Date.now();
      if (now - lastPerfUpdate > 1000) {
        // Update every second
        const perf = hybridElement.performance();
        this.hybrid3dPerformanceUpdate.emit(perf);
        lastPerfUpdate = now;
      }
    }, 100);

    // Store cleanup functions
    this.cleanup = () => {
      clearInterval(stateMonitor);
      clearInterval(perfMonitor);
      this.destroy();
    };
  }

  private updateElementConfig(): void {
    if (!this.isInitialized()) return;

    const newConfig = this.buildHybridConfig();
    this.updateConfiguration(newConfig);

    if (this.debug()) {
      console.log('[Hybrid3D] Configuration updated:', newConfig);
    }
  }

  private cleanup(): void {
    // Cleanup function will be set by setupElementMonitoring
  }
}
