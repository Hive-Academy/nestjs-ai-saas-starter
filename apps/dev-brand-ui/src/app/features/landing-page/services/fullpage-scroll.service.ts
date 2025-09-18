import { Injectable, signal, computed, effect } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollToPlugin);

export interface FullPageSection {
  id: string;
  index: number;
  element: HTMLElement;
  isActive: boolean;
  isVisible: boolean;
}

export interface FullPageConfig {
  animationDuration: number;
  easing: string;
  autoScrolling: boolean;
  keyboardScrolling: boolean;
  touchScrolling: boolean;
  continuousVertical: boolean;
  mouseWheelSensitivity: number;
  touchSensitivity: number;
}

export interface NavigationDot {
  index: number;
  sectionId: string;
  label: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class FullPageScrollService {
  // Core state management
  private readonly _sections = signal<FullPageSection[]>([]);
  private readonly _currentSectionIndex = signal(0);
  private readonly _isTransitioning = signal(false);
  private readonly _isEnabled = signal(false);

  // Configuration
  private readonly _config = signal<FullPageConfig>({
    animationDuration: 1000,
    easing: 'power2.inOut',
    autoScrolling: false,
    keyboardScrolling: false,
    touchScrolling: false,
    continuousVertical: false,
    mouseWheelSensitivity: 1,
    touchSensitivity: 1,
  });

  // Navigation dots
  private readonly _navigationDots = signal<NavigationDot[]>([]);

  // Touch handling
  private touchStartY = 0;
  private touchEndY = 0;
  private mouseWheelTimeout: number | null = null;

  // Event listeners cleanup
  private eventListenerCleanup: Array<() => void> = [];

  // Public readonly signals
  readonly sections = this._sections.asReadonly();
  readonly currentSectionIndex = this._currentSectionIndex.asReadonly();
  readonly isTransitioning = this._isTransitioning.asReadonly();
  readonly isEnabled = this._isEnabled.asReadonly();
  readonly config = this._config.asReadonly();
  readonly navigationDots = this._navigationDots.asReadonly();

  readonly currentSection = computed(() => {
    const sections = this._sections();
    const index = this._currentSectionIndex();
    return sections[index] || null;
  });

  readonly canScrollUp = computed(() => {
    const index = this._currentSectionIndex();
    const config = this._config();
    return index > 0 || config.continuousVertical;
  });

  readonly canScrollDown = computed(() => {
    const sections = this._sections();
    const index = this._currentSectionIndex();
    const config = this._config();
    return index < sections.length - 1 || config.continuousVertical;
  });

  constructor() {
    // Disable default scroll behavior when enabled
    effect(() => {
      if (this._isEnabled()) {
        this.disableDefaultScrolling();
      } else {
        this.enableDefaultScrolling();
      }
    });
  }

  /**
   * Initialize fullPage.js functionality with sections
   */
  initialize(
    sectionElements: HTMLElement[],
    config?: Partial<FullPageConfig>
  ): void {
    if (config) {
      this._config.update((current) => ({ ...current, ...config }));
    }

    // Set up sections
    const sections: FullPageSection[] = sectionElements.map(
      (element, index) => ({
        id: element.id || `section-${index}`,
        index,
        element,
        isActive: index === 0,
        isVisible: true,
      })
    );

    this._sections.set(sections);

    // Create navigation dots
    const dots: NavigationDot[] = sections.map((section, index) => ({
      index,
      sectionId: section.id,
      label: this.getSectionLabel(section.id),
      isActive: index === 0,
    }));

    this._navigationDots.set(dots);

    // Set up fullPage behavior
    this.setupFullPageLayout();
    this.setupEventListeners();

    // Initialize first section
    this.setActiveSection(0, false);

    this._isEnabled.set(true);
  }

  /**
   * Navigate to specific section by index
   */
  goToSection(index: number, animated = true): Promise<void> {
    return new Promise((resolve) => {
      const sections = this._sections();
      const config = this._config();

      if (index < 0 || index >= sections.length || this._isTransitioning()) {
        resolve();
        return;
      }

      const targetSection = sections[index];
      if (!targetSection) {
        resolve();
        return;
      }

      this._isTransitioning.set(true);

      const duration = animated ? config.animationDuration / 1000 : 0;

      // GSAP scroll animation
      gsap.to(window, {
        duration,
        scrollTo: { y: targetSection.element, offsetY: 0 },
        ease: config.easing,
        onComplete: () => {
          this.setActiveSection(index, true);
          this._isTransitioning.set(false);
          resolve();
        },
      });
    });
  }

  /**
   * Navigate to section by ID
   */
  goToSectionById(sectionId: string, animated = true): Promise<void> {
    const sections = this._sections();
    const sectionIndex = sections.findIndex(
      (section) => section.id === sectionId
    );

    if (sectionIndex >= 0) {
      return this.goToSection(sectionIndex, animated);
    }

    return Promise.resolve();
  }

  /**
   * Scroll to next section
   */
  scrollDown(): Promise<void> {
    const currentIndex = this._currentSectionIndex();
    const sections = this._sections();
    const config = this._config();

    let targetIndex = currentIndex + 1;

    if (config.continuousVertical && targetIndex >= sections.length) {
      targetIndex = 0; // Loop to first section
    }

    return this.goToSection(targetIndex);
  }

  /**
   * Scroll to previous section
   */
  scrollUp(): Promise<void> {
    const currentIndex = this._currentSectionIndex();
    const sections = this._sections();
    const config = this._config();

    let targetIndex = currentIndex - 1;

    if (config.continuousVertical && targetIndex < 0) {
      targetIndex = sections.length - 1; // Loop to last section
    }

    return this.goToSection(targetIndex);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<FullPageConfig>): void {
    this._config.update((current) => ({ ...current, ...newConfig }));
  }

  /**
   * Enable fullPage functionality
   */
  enable(): void {
    this._isEnabled.set(true);
  }

  /**
   * Disable fullPage functionality
   */
  disable(): void {
    this._isEnabled.set(false);
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.enableDefaultScrolling();
    this.cleanupEventListeners();
    this._isEnabled.set(false);
    this._sections.set([]);
    this._navigationDots.set([]);
  }

  /**
   * Setup fullPage layout with 100vh sections
   */
  private setupFullPageLayout(): void {
    const sections = this._sections();

    sections.forEach((section) => {
      const element = section.element;

      // Ensure each section is exactly 100vh
      element.style.height = '100vh';
      element.style.width = '100vw';
      element.style.position = 'relative';
      element.style.overflow = 'auto'; // Allow internal scrolling

      // Add smooth transition classes
      element.classList.add('fullpage-section');
    });

    // Set body and html styles - allow normal scrolling
    document.body.style.overflow = 'auto';
    document.documentElement.style.scrollBehavior = 'smooth';
  }

  /**
   * Setup event listeners for fullPage functionality
   */
  private setupEventListeners(): void {
    const config = this._config();

    // Mouse wheel event
    if (config.autoScrolling) {
      const wheelHandler = this.handleMouseWheel.bind(this);
      document.addEventListener('wheel', wheelHandler, { passive: false });
      this.eventListenerCleanup.push(() =>
        document.removeEventListener('wheel', wheelHandler)
      );
    }

    // Keyboard events
    if (config.keyboardScrolling) {
      const keyHandler = this.handleKeyboard.bind(this);
      document.addEventListener('keydown', keyHandler);
      this.eventListenerCleanup.push(() =>
        document.removeEventListener('keydown', keyHandler)
      );
    }

    // Touch events
    if (config.touchScrolling) {
      const touchStartHandler = this.handleTouchStart.bind(this);
      const touchEndHandler = this.handleTouchEnd.bind(this);

      document.addEventListener('touchstart', touchStartHandler, {
        passive: true,
      });
      document.addEventListener('touchend', touchEndHandler, { passive: true });

      this.eventListenerCleanup.push(() => {
        document.removeEventListener('touchstart', touchStartHandler);
        document.removeEventListener('touchend', touchEndHandler);
      });
    }

    // Resize handler
    const resizeHandler = this.handleResize.bind(this);
    window.addEventListener('resize', resizeHandler);
    this.eventListenerCleanup.push(() =>
      window.removeEventListener('resize', resizeHandler)
    );
  }

  /**
   * Handle mouse wheel events
   */
  private handleMouseWheel(event: WheelEvent): void {
    if (!this._isEnabled() || this._isTransitioning()) {
      return;
    }

    event.preventDefault();

    // Throttle wheel events
    if (this.mouseWheelTimeout) {
      clearTimeout(this.mouseWheelTimeout);
    }

    this.mouseWheelTimeout = window.setTimeout(() => {
      const config = this._config();
      const delta = event.deltaY * config.mouseWheelSensitivity;

      if (delta > 0 && this.canScrollDown()) {
        this.scrollDown();
      } else if (delta < 0 && this.canScrollUp()) {
        this.scrollUp();
      }

      this.mouseWheelTimeout = null;
    }, 100);
  }

  /**
   * Handle keyboard events
   */
  private handleKeyboard(event: KeyboardEvent): void {
    if (!this._isEnabled() || this._isTransitioning()) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'PageDown':
      case ' ': // Spacebar
        event.preventDefault();
        if (this.canScrollDown()) {
          this.scrollDown();
        }
        break;

      case 'ArrowUp':
      case 'PageUp':
        event.preventDefault();
        if (this.canScrollUp()) {
          this.scrollUp();
        }
        break;

      case 'Home':
        event.preventDefault();
        this.goToSection(0);
        break;

      case 'End': {
        event.preventDefault();
        const sections = this._sections();
        this.goToSection(sections.length - 1);
        break;
      }
    }
  }

  /**
   * Handle touch start events
   */
  private handleTouchStart(event: TouchEvent): void {
    if (!this._isEnabled() || this._isTransitioning()) {
      return;
    }

    if (event.touches.length === 1) {
      this.touchStartY = event.touches[0].clientY;
    }
  }

  /**
   * Handle touch end events
   */
  private handleTouchEnd(event: TouchEvent): void {
    if (!this._isEnabled() || this._isTransitioning()) {
      return;
    }

    if (event.changedTouches.length === 1) {
      this.touchEndY = event.changedTouches[0].clientY;
      this.handleTouchGesture();
    }
  }

  /**
   * Process touch gestures
   */
  private handleTouchGesture(): void {
    const config = this._config();
    const diff = this.touchStartY - this.touchEndY;
    const threshold = 50 * config.touchSensitivity;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && this.canScrollDown()) {
        // Swipe up - scroll down
        this.scrollDown();
      } else if (diff < 0 && this.canScrollUp()) {
        // Swipe down - scroll up
        this.scrollUp();
      }
    }
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    // Recalculate section heights
    const sections = this._sections();
    sections.forEach((section) => {
      section.element.style.height = '100vh';
    });
  }

  /**
   * Set active section and update state
   */
  private setActiveSection(index: number, updateScroll = false): void {
    const sections = this._sections();

    // Update sections state
    this._sections.update((currentSections) =>
      currentSections.map((section, i) => ({
        ...section,
        isActive: i === index,
      }))
    );

    // Update navigation dots
    this._navigationDots.update((dots) =>
      dots.map((dot, i) => ({
        ...dot,
        isActive: i === index,
      }))
    );

    this._currentSectionIndex.set(index);

    // Trigger section change event
    const activeSection = sections[index];
    if (activeSection) {
      this.dispatchSectionChangeEvent(activeSection, index);
    }
  }

  /**
   * Dispatch custom section change event
   */
  private dispatchSectionChangeEvent(
    section: FullPageSection,
    index: number
  ): void {
    const event = new CustomEvent('fullpage-section-change', {
      detail: {
        section: section.id,
        index,
        element: section.element,
        direction: index > this._currentSectionIndex() ? 'down' : 'up',
      },
    });

    document.dispatchEvent(event);
    section.element.dispatchEvent(event);
  }

  /**
   * Disable default scrolling behavior
   */
  private disableDefaultScrolling(): void {
    // Allow content scrolling within sections
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
  }

  /**
   * Enable default scrolling behavior
   */
  private enableDefaultScrolling(): void {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
  }

  /**
   * Clean up event listeners
   */
  private cleanupEventListeners(): void {
    this.eventListenerCleanup.forEach((cleanup) => cleanup());
    this.eventListenerCleanup = [];

    if (this.mouseWheelTimeout) {
      clearTimeout(this.mouseWheelTimeout);
      this.mouseWheelTimeout = null;
    }
  }

  /**
   * Get section label for navigation
   */
  private getSectionLabel(sectionId: string): string {
    const labelMap: Record<string, string> = {
      hero: 'Hero',
      'platform-pillars': 'Platform',
      'demo-theater': 'Demos',
      'ecosystem-explorer': 'Ecosystem',
      'architecture-diagram': 'Architecture',
    };

    return labelMap[sectionId] || sectionId.replace('-', ' ');
  }
}
