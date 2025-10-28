import {
  Directive,
  ElementRef,
  Renderer2,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  untracked,
  output,
} from '@angular/core';

/**
 * Section Sticky Directive - Angular 18+ Signal-Based (2025)
 *
 * Modern implementation using Angular 18's signal inputs, effect, and afterNextRender.
 * Makes child elements sticky only when the parent section is in viewport.
 *
 * Usage:
 * ```html
 * <!-- Simple usage -->
 * <section sectionSticky>
 *   <nav class="section-sticky-target">Sidebar</nav>
 * </section>
 *
 * <!-- With configuration -->
 * <section
 *   sectionSticky
 *   [threshold]="0.2"
 *   [rootMargin]="'100px'"
 *   (inViewChange)="onViewportChange($event)"
 * >
 *   <nav class="section-sticky-target">Sidebar</nav>
 * </section>
 * ```
 *
 * Features:
 * - Signal-based inputs (Angular 18+)
 * - Signal outputs for reactive state
 * - Effect-based observer setup
 * - Automatic cleanup (no manual OnDestroy needed)
 * - Works with Tailwind/CSS to toggle visibility
 *
 * CSS Pattern:
 * ```css
 * .section-sticky-target {
 *   position: absolute;
 *   opacity: 0;
 *   pointer-events: none;
 * }
 *
 * [data-section-in-view="true"] .section-sticky-target {
 *   position: fixed;
 *   opacity: 1;
 *   pointer-events: auto;
 * }
 * ```
 */
@Directive({
  selector: '[sectionSticky]',
  standalone: true,
})
export class SectionStickyDirective {
  // Modern signal-based inputs (Angular 18+)
  readonly threshold = input<number>(0.0, {
    alias: 'stickyThreshold',
  });

  readonly rootMargin = input<string>('0px', {
    alias: 'stickyRootMargin',
  });

  readonly debounce = input<number>(50, {
    alias: 'stickyDebounce',
  });

  readonly debug = input<boolean>(false, {
    alias: 'stickyDebug',
  });

  // Signal output for reactive state changes
  readonly inViewChange = output<boolean>();

  // Internal state as signals
  private readonly isInView = signal<boolean>(false);
  private readonly isInitialized = signal<boolean>(false);

  // Injected dependencies
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  // Observer instance
  private observer?: IntersectionObserver;
  private debounceTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    // Setup observer after render (replaces AfterViewInit)
    afterNextRender(() => {
      this.setupIntersectionObserver();
      this.isInitialized.set(true);
    });

    // React to input changes using effect
    effect(() => {
      const currentThreshold = this.threshold();
      const currentRootMargin = this.rootMargin();
      const initialized = this.isInitialized();

      // Only recreate observer if initialized and inputs changed
      if (initialized) {
        untracked(() => {
          this.reconnectObserver();
        });

        if (this.debug()) {
          console.log('[SectionStickyDirective] Config updated:', {
            threshold: currentThreshold,
            rootMargin: currentRootMargin,
          });
        }
      }
    });

    // React to view state changes
    effect(() => {
      const inView = this.isInView();

      untracked(() => {
        this.updateStickyState(inView);
        this.inViewChange.emit(inView);
      });
    });
  }

  private setupIntersectionObserver(): void {
    if (
      typeof window === 'undefined' ||
      typeof IntersectionObserver === 'undefined'
    ) {
      console.warn(
        '[SectionStickyDirective] IntersectionObserver not available'
      );
      return;
    }

    const options: IntersectionObserverInit = {
      root: null, // viewport
      rootMargin: this.rootMargin(),
      threshold: this.threshold(),
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        // Debounce updates for performance
        this.debouncedUpdate(entry.isIntersecting);
      });
    }, options);

    // Start observing the section element
    this.observer.observe(this.elementRef.nativeElement);

    if (this.debug()) {
      console.log('[SectionStickyDirective] Observer initialized', {
        element: this.elementRef.nativeElement.tagName,
        threshold: this.threshold(),
        rootMargin: this.rootMargin(),
      });
    }
  }

  private reconnectObserver(): void {
    this.observer?.disconnect();
    this.setupIntersectionObserver();
  }

  private debouncedUpdate(isIntersecting: boolean): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    const debounceMs = this.debounce();

    if (debounceMs > 0) {
      this.debounceTimer = setTimeout(() => {
        this.isInView.set(isIntersecting);
      }, debounceMs);
    } else {
      this.isInView.set(isIntersecting);
    }
  }

  private updateStickyState(isIntersecting: boolean): void {
    const element = this.elementRef.nativeElement;

    if (isIntersecting) {
      // Section is in viewport → activate sticky elements
      this.renderer.setAttribute(element, 'data-section-in-view', 'true');
      this.renderer.addClass(element, 'section-in-view');
    } else {
      // Section is out of viewport → deactivate sticky elements
      this.renderer.setAttribute(element, 'data-section-in-view', 'false');
      this.renderer.removeClass(element, 'section-in-view');
    }

    if (this.debug()) {
      console.log('[SectionStickyDirective] State updated:', {
        isIntersecting,
        element: element.tagName,
        classes: element.className,
      });
    }
  }

  // Cleanup happens automatically with signal lifecycle
  // But we still provide explicit cleanup for the observer
  ngOnDestroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }
  }
}
