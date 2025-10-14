import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  DestroyRef,
  input,
  output,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { fromEvent } from 'rxjs';

import { HybridUIService } from '../services/hybrid-ui.service';
import type {
  HybridElementConfigExtended,
  HybridElementExtended,
} from '../interfaces';

@Component({
  selector: 'app-card3d',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      #cardElement
      class="card3d-container"
      [class.initialized]="initialized()"
      [class.interacting]="isInteracting()"
      [class.visible-in-3d]="visibleIn3D()"
      [attr.data-priority]="priority()"
      [style.transform]="transform()"
      [style.transition]="transition()"
    >
      <!-- Card content -->
      <div class="card3d-content" #cardContent>
        <ng-content></ng-content>
      </div>

      <!-- 3D decoration overlay -->
      @if (showDecoration()) {
      <div class="card3d-decoration" [style.opacity]="decorationOpacity()">
        <div
          class="decoration-element"
          [attr.data-geometry]="decoration().geometry"
          [style.color]="decoration().color"
        ></div>
      </div>
      }

      <!-- Interactive overlay -->
      @if (enableInteraction()) {
      <div
        class="card3d-interaction-overlay"
        (mouseenter)="handleInteraction('hover', true)"
        (mouseleave)="handleInteraction('hover', false)"
        (focus)="handleInteraction('focus', true)"
        (blur)="handleInteraction('focus', false)"
        (click)="handleInteraction('click', true)"
        tabindex="0"
      ></div>
      }

      <!-- Debug info overlay -->
      @if (showDebugInfo()) {
      <div class="debug-overlay">
        <div class="debug-info">
          <div>ID: {{ hybridElementId() }}</div>
          <div>Priority: {{ priority() }}</div>
          <div>3D Visible: {{ visibleIn3D() ? 'Yes' : 'No' }}</div>
          <div>Interacting: {{ isInteracting() ? 'Yes' : 'No' }}</div>
          @if (hybridElement()) {
          <div>LOD Level: {{ hybridElement()!.state().lodLevel }}</div>
          <div>
            Texture Quality: {{ hybridElement()!.state().textureQuality }}
          </div>
          <div>
            Memory:
            {{ (hybridElement()!.state().memoryUsage / 1024).toFixed(1) }}KB
          </div>
          }
        </div>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .card3d-container {
        position: relative;
        display: block;
        width: 100%;
        height: 100%;
        border-radius: var(--card3d-border-radius, 8px);
        background: var(--card3d-background, #ffffff);
        box-shadow: var(--card3d-shadow, 0 2px 8px rgba(0, 0, 0, 0.1));
        overflow: hidden;
        transform-style: preserve-3d;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
      }

      .card3d-container.initialized {
        /* Enhanced styling when 3D is active */
        backdrop-filter: blur(1px);
      }

      .card3d-container.interacting {
        transform: translateZ(10px) scale(1.02);
        box-shadow: var(--card3d-shadow-hover, 0 8px 24px rgba(0, 0, 0, 0.15));
      }

      .card3d-container.visible-in-3d {
        /* Subtle indication that this card is rendered in 3D space */
        border: 1px solid var(--card3d-3d-border, rgba(0, 123, 255, 0.2));
      }

      .card3d-container[data-priority='HERO'] {
        z-index: 40;
        --card3d-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      }

      .card3d-container[data-priority='PRIMARY'] {
        z-index: 30;
        --card3d-shadow: 0 3px 12px rgba(0, 0, 0, 0.12);
      }

      .card3d-container[data-priority='SECONDARY'] {
        z-index: 20;
        --card3d-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .card3d-container[data-priority='TERTIARY'] {
        z-index: 10;
        --card3d-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      }

      .card3d-content {
        position: relative;
        width: 100%;
        height: 100%;
        padding: var(--card3d-padding, 16px);
        z-index: 2;
      }

      .card3d-decoration {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
        overflow: hidden;
      }

      .decoration-element {
        position: absolute;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        opacity: 0.1;
        animation: decorationFloat 6s ease-in-out infinite;
      }

      .decoration-element[data-geometry='sphere'] {
        background: radial-gradient(circle, currentColor 0%, transparent 70%);
        top: -30px;
        right: -30px;
      }

      .decoration-element[data-geometry='cube'] {
        background: linear-gradient(45deg, currentColor 0%, transparent 70%);
        border-radius: 8px;
        top: 50%;
        right: -30px;
        transform: rotate(45deg);
      }

      .decoration-element[data-geometry='cylinder'] {
        background: linear-gradient(90deg, currentColor 0%, transparent 70%);
        border-radius: 30px;
        bottom: -30px;
        left: -30px;
      }

      .decoration-element[data-geometry='icosahedron'] {
        background: conic-gradient(currentColor 0deg, transparent 60deg);
        clip-path: polygon(
          50% 0%,
          61% 35%,
          98% 35%,
          68% 57%,
          79% 91%,
          50% 70%,
          21% 91%,
          32% 57%,
          2% 35%,
          39% 35%
        );
        bottom: 20px;
        left: 20px;
      }

      .card3d-interaction-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 5;
        outline: none;
      }

      .debug-overlay {
        position: absolute;
        top: 4px;
        left: 4px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 10px;
        z-index: 100;
        pointer-events: none;
      }

      .debug-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      @keyframes decorationFloat {
        0%,
        100% {
          transform: translateY(0px) rotate(0deg);
        }
        50% {
          transform: translateY(-20px) rotate(180deg);
        }
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .card3d-container {
          --card3d-padding: 12px;
        }

        .decoration-element {
          width: 40px;
          height: 40px;
        }
      }

      /* Dark theme support */
      @media (prefers-color-scheme: dark) {
        .card3d-container {
          --card3d-background: #1a1a1a;
          --card3d-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          --card3d-shadow-hover: 0 8px 24px rgba(0, 0, 0, 0.4);
          --card3d-3d-border: rgba(100, 200, 255, 0.3);
        }
      }

      /* Accessibility */
      @media (prefers-reduced-motion: reduce) {
        .card3d-container,
        .decoration-element {
          animation: none;
          transition: none;
        }
      }

      /* Print styles */
      @media print {
        .card3d-decoration,
        .debug-overlay {
          display: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Card3DComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cardElement', { static: true })
  cardElement!: ElementRef<HTMLDivElement>;
  @ViewChild('cardContent', { static: true })
  cardContent!: ElementRef<HTMLDivElement>;

  // Inputs
  readonly priority = input<'HERO' | 'PRIMARY' | 'SECONDARY' | 'TERTIARY'>(
    'SECONDARY'
  );
  readonly enableInteraction = input(true);
  readonly enable3D = input(true);
  readonly showDecoration = input(false);
  readonly showDebugInfo = input(false);
  readonly position = input<[number, number, number] | undefined>(undefined);
  readonly config = input<Partial<HybridElementConfigExtended>>({});

  // Animation configuration inputs
  readonly animateOnHover = input(true);
  readonly animateOnFocus = input(true);
  readonly animateOnClick = input(false);
  readonly customAnimations = input<Record<string, any>>({});

  // Style inputs
  readonly backgroundColor = input<string>('');
  readonly borderRadius = input<string>('8px');
  readonly padding = input<string>('16px');
  readonly shadow = input<string>('');

  // Decoration configuration
  readonly decoration = input({
    geometry: 'sphere' as 'sphere' | 'cube' | 'cylinder' | 'icosahedron',
    color: 0x007bff,
    opacity: 0.1,
    scale: 1,
    animation: 'float' as 'rotate' | 'float' | 'pulse',
  });

  // Outputs
  readonly initialized3D = output<HybridElementExtended>();
  readonly interactionStart = output<string>();
  readonly interactionEnd = output<string>();
  readonly clicked = output<MouseEvent>();
  readonly hovered = output<boolean>();
  readonly focused = output<boolean>();

  // Services
  private readonly hybridUIService = inject(HybridUIService);
  private readonly destroyRef = inject(DestroyRef);

  // Component state
  private readonly isInitialized = signal(false);
  private readonly isInteractingState = signal(false);
  private readonly visibleIn3DState = signal(false);
  private readonly hybridElementRef = signal<HybridElementExtended | null>(
    null
  );
  private readonly hybridElementIdState = signal<string>('');

  // Computed properties
  readonly initialized = computed(() => this.isInitialized());
  readonly isInteracting = computed(() => this.isInteractingState());
  readonly visibleIn3D = computed(() => this.visibleIn3DState());
  readonly hybridElement = computed(() => this.hybridElementRef());
  readonly hybridElementId = computed(() => this.hybridElementIdState());

  readonly decorationOpacity = computed(() =>
    this.isInteracting()
      ? this.decoration().opacity * 2
      : this.decoration().opacity
  );

  readonly transform = computed(() => {
    const base = '';
    if (this.isInteracting()) {
      return `${base} translateZ(2px) scale(1.01)`;
    }
    return base;
  });

  readonly transition = computed(() => 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)');

  async ngAfterViewInit(): Promise<void> {
    await this.initialize3D();
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private async initialize3D(): Promise<void> {
    if (!this.enable3D()) {
      this.isInitialized.set(true);
      return;
    }

    try {
      // Wait for hybrid UI service to be ready
      if (!this.hybridUIService.initialized()) {
        await new Promise((resolve) => {
          const checkInitialized = () => {
            if (this.hybridUIService.initialized()) {
              resolve(void 0);
            } else {
              setTimeout(checkInitialized, 50);
            }
          };
          checkInitialized();
        });
      }

      // Create hybrid element configuration
      const hybridConfig: HybridElementConfigExtended = {
        priority: this.priority(),
        position: this.position(),

        // Angular Three configuration
        angularThree: {
          renderOrder: this.getPriorityRenderOrder(this.priority()),
          castShadow: true,
          receiveShadow: true,
          ...this.config().angularThree,
        },

        // Content configuration
        content: {
          watchForChanges: true,
          updateTriggers: ['resize', 'mutation', 'style'],
          quality: 'medium',
          format: 'webp',
          ...this.config().content,
        },

        // Material configuration
        material: {
          opacity: 0.95,
          roughness: 0.3,
          metalness: 0.1,
          ...this.config().material,
        },

        // Decoration configuration
        decoration: this.showDecoration() ? this.decoration() : undefined,

        // Animation configuration
        animations: this.buildAnimationConfig(),

        // Performance configuration
        performance: {
          enableLOD: true,
          texturePooling: true,
          memoryBudget: 16, // 16MB per card
          ...this.config().performance,
        },

        // Merge any additional config
        ...this.config(),
      };

      // Create hybrid element
      const hybridElement = await this.hybridUIService.createHybridElement(
        this.cardElement.nativeElement,
        hybridConfig
      );

      this.hybridElementRef.set(hybridElement);
      this.hybridElementIdState.set(hybridElement.id);
      this.visibleIn3DState.set(true);
      this.isInitialized.set(true);

      // Subscribe to element state changes
      this.subscribeToElementState(hybridElement);

      this.initialized3D.emit(hybridElement);
    } catch (error) {
      console.error('Failed to initialize Card3D:', error);
      this.isInitialized.set(true); // Initialize anyway for fallback
    }
  }

  private getPriorityRenderOrder(priority: string): number {
    const orders = {
      HERO: 1000,
      PRIMARY: 800,
      SECONDARY: 600,
      TERTIARY: 400,
    };
    return orders[priority as keyof typeof orders] || 600;
  }

  private buildAnimationConfig() {
    const animations: any = {};

    if (this.animateOnHover()) {
      animations.hover = {
        type: 'transform',
        duration: 300,
        easing: 'power2.out',
        properties: {
          scale: 1.05,
          position: { z: 0.1 },
        },
      };
    }

    if (this.animateOnFocus()) {
      animations.focus = {
        type: 'material',
        duration: 200,
        easing: 'power1.out',
        properties: {
          opacity: 1.0,
          emissive: 0x004499,
        },
      };
    }

    if (this.animateOnClick()) {
      animations.click = {
        type: 'transform',
        duration: 150,
        easing: 'power2.inOut',
        properties: {
          scale: 0.98,
        },
      };
    }

    // Add custom animations
    const customAnims = this.customAnimations();
    Object.assign(animations, customAnims);

    return animations;
  }

  private subscribeToElementState(element: HybridElementExtended): void {
    // This would be enhanced with actual reactive subscriptions
    // For now, we'll use a simple polling mechanism
    const stateInterval = setInterval(() => {
      const state = element.state();
      this.visibleIn3DState.set(state.isVisible);
      this.isInteractingState.set(state.isInteracting);
    }, 100);

    // Clean up on destroy
    this.cleanup = () => {
      clearInterval(stateInterval);
      if (element) {
        this.hybridUIService.removeElement(element.id);
      }
    };
  }

  private setupEventListeners(): void {
    const element = this.cardElement.nativeElement;

    // Mouse events
    fromEvent(element, 'mouseenter')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.hovered.emit(true);
      });

    fromEvent(element, 'mouseleave')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.hovered.emit(false);
      });

    // Focus events
    fromEvent(element, 'focusin')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.focused.emit(true);
      });

    fromEvent(element, 'focusout')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.focused.emit(false);
      });

    // Click events
    fromEvent<MouseEvent>(element, 'click')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        this.clicked.emit(event);
      });
  }

  /**
   * Handle interaction events
   */
  handleInteraction(type: string, active: boolean): void {
    if (!this.enableInteraction()) return;

    const elementId = this.hybridElementId();
    if (!elementId) return;

    if (active) {
      this.isInteractingState.set(true);
      this.interactionStart.emit(type);

      // Trigger 3D animation if enabled
      if (this.enable3D()) {
        this.hybridUIService.triggerAnimation(elementId, type);
      }
    } else {
      this.isInteractingState.set(false);
      this.interactionEnd.emit(type);
    }
  }

  /**
   * Update card configuration
   */
  updateConfig(newConfig: Partial<HybridElementConfigExtended>): void {
    const elementId = this.hybridElementId();
    if (elementId) {
      this.hybridUIService.updateElementConfig(elementId, newConfig);
    }
  }

  /**
   * Trigger custom animation
   */
  triggerAnimation(animationType: string): void {
    const elementId = this.hybridElementId();
    if (elementId) {
      this.hybridUIService.triggerAnimation(elementId, animationType);
    }
  }

  /**
   * Get current element state
   */
  getElementState() {
    const element = this.hybridElement();
    return element ? element.state() : null;
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics() {
    const element = this.hybridElement();
    return element ? element.performance() : null;
  }

  /**
   * Update element visibility in 3D
   */
  setVisibility(visible: boolean): void {
    const element = this.hybridElement();
    if (element && element.ngtGroup) {
      element.ngtGroup.visible = visible;
      this.visibleIn3DState.set(visible);
    }
  }

  /**
   * Focus the card element
   */
  focus(): void {
    this.cardElement.nativeElement.focus();
  }

  /**
   * Blur the card element
   */
  blur(): void {
    this.cardElement.nativeElement.blur();
  }

  private cleanup(): void {
    // Cleanup will be defined by subscribeToElementState
  }
}
