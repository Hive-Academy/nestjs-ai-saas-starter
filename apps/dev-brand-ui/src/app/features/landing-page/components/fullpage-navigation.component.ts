import { CommonModule } from '@angular/common';
import { Component, signal, effect, inject, OnInit, OnDestroy, computed } from '@angular/core';
import { FullPageScrollService, NavigationDot } from '../services/fullpage-scroll.service';

@Component({
  selector: 'app-fullpage-navigation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="fullpage-navigation" [class.visible]="isVisible()" [class.enabled]="isEnabled()">
      <ul class="navigation-dots">
        <li 
          *ngFor="let dot of navigationDots(); trackBy: trackByIndex"
          class="navigation-dot-item"
          [class.active]="dot.isActive"
          [attr.data-section]="dot.sectionId"
          [title]="dot.label"
          (click)="navigateToSection(dot.index)">
          <button 
            class="navigation-dot"
            [attr.aria-label]="'Navigate to ' + dot.label + ' section'"
            [attr.aria-current]="dot.isActive ? 'true' : null">
            <span class="dot-inner"></span>
            <span class="dot-label">{{ dot.label }}</span>
          </button>
        </li>
      </ul>
      
      <!-- Section indicator -->
      <div class="section-indicator">
        <div class="current-section">
          {{ currentSectionLabel() }}
        </div>
        <div class="section-counter">
          {{ currentIndex() + 1 }} / {{ totalSections() }}
        </div>
      </div>
      
      <!-- Scroll hint for first visit -->
      <div class="scroll-hint" [class.visible]="showScrollHint()">
        <div class="hint-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M19 12l-7 7-7-7"/>
          </svg>
        </div>
        <div class="hint-text">Scroll or use arrows</div>
      </div>
    </nav>
  `,
  styles: [`
    .fullpage-navigation {
      position: fixed;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      user-select: none;
    }

    .fullpage-navigation.visible {
      opacity: 1;
      visibility: visible;
    }

    .fullpage-navigation.enabled {
      pointer-events: all;
    }

    .fullpage-navigation:not(.enabled) {
      pointer-events: none;
      opacity: 0.5;
    }

    .navigation-dots {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
    }

    .navigation-dot-item {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .navigation-dot {
      width: 12px;
      height: 12px;
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .navigation-dot:hover {
      transform: scale(1.2);
    }

    .navigation-dot:focus {
      outline: 2px solid rgba(138, 43, 226, 0.6);
      outline-offset: 2px;
    }

    .dot-inner {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.6);
      transition: all 0.3s ease;
      position: relative;
    }

    .dot-inner::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      border-radius: 50%;
      border: 1px solid transparent;
      transition: all 0.3s ease;
    }

    .navigation-dot-item:hover .dot-inner {
      background: rgba(138, 43, 226, 0.6);
      border-color: rgba(138, 43, 226, 0.8);
      box-shadow: 0 0 12px rgba(138, 43, 226, 0.4);
    }

    .navigation-dot-item:hover .dot-inner::before {
      border-color: rgba(138, 43, 226, 0.3);
      transform: scale(1.8);
    }

    .navigation-dot-item.active .dot-inner {
      background: #8a2be2;
      border-color: #8a2be2;
      box-shadow: 0 0 16px rgba(138, 43, 226, 0.6);
      transform: scale(1.2);
    }

    .navigation-dot-item.active .dot-inner::before {
      border-color: rgba(138, 43, 226, 0.4);
      transform: scale(2);
    }

    .dot-label {
      position: absolute;
      right: 24px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      pointer-events: none;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .navigation-dot-item:hover .dot-label {
      opacity: 1;
      visibility: visible;
      transform: translateY(-50%) translateX(-4px);
    }

    .section-indicator {
      margin-top: 20px;
      text-align: center;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.75rem;
      padding: 8px;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 8px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .current-section {
      font-weight: 500;
      color: #8a2be2;
      margin-bottom: 4px;
      font-size: 0.8rem;
    }

    .section-counter {
      color: rgba(255, 255, 255, 0.5);
      font-family: 'Courier New', monospace;
    }

    .scroll-hint {
      position: absolute;
      bottom: -80px;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.75rem;
      opacity: 0;
      visibility: hidden;
      transition: all 0.5s ease;
      animation: pulse 2s infinite;
    }

    .scroll-hint.visible {
      opacity: 1;
      visibility: visible;
    }

    .hint-icon {
      margin-bottom: 4px;
      display: flex;
      justify-content: center;
    }

    .hint-icon svg {
      width: 20px;
      height: 20px;
      color: rgba(138, 43, 226, 0.8);
    }

    .hint-text {
      white-space: nowrap;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    /* Mobile styles */
    @media (max-width: 768px) {
      .fullpage-navigation {
        right: 10px;
        transform: translateY(-50%) scale(0.9);
      }

      .navigation-dots {
        gap: 10px;
      }

      .dot-label {
        right: 20px;
        font-size: 0.7rem;
        padding: 3px 6px;
      }

      .section-indicator {
        margin-top: 16px;
        padding: 6px;
        font-size: 0.7rem;
      }

      .current-section {
        font-size: 0.75rem;
      }

      .scroll-hint {
        bottom: -70px;
        font-size: 0.7rem;
      }

      .hint-icon svg {
        width: 18px;
        height: 18px;
      }
    }

    /* Tablet styles */
    @media (min-width: 769px) and (max-width: 1024px) {
      .fullpage-navigation {
        right: 15px;
      }
    }

    /* Hide on very small screens */
    @media (max-width: 480px) {
      .dot-label {
        display: none;
      }
      
      .section-indicator {
        display: none;
      }
    }

    /* Accessibility improvements */
    @media (prefers-reduced-motion: reduce) {
      .fullpage-navigation,
      .navigation-dot,
      .dot-inner,
      .dot-inner::before,
      .dot-label,
      .scroll-hint {
        transition: none;
        animation: none;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .dot-inner {
        border-width: 2px;
      }
      
      .section-indicator {
        background: rgba(0, 0, 0, 0.9);
        border-width: 2px;
      }
    }
  `]
})
export class FullPageNavigationComponent implements OnInit, OnDestroy {
  private readonly fullPageService = inject(FullPageScrollService);
  
  // Component state
  readonly isVisible = signal(false);
  readonly showScrollHint = signal(true);
  
  // Derived state from service
  readonly navigationDots = this.fullPageService.navigationDots;
  readonly isEnabled = this.fullPageService.isEnabled;
  readonly currentIndex = this.fullPageService.currentSectionIndex;
  
  readonly totalSections = computed(() => {
    return this.navigationDots().length;
  });
  
  readonly currentSectionLabel = computed(() => {
    const dots = this.navigationDots();
    const currentIdx = this.currentIndex();
    const currentDot = dots[currentIdx];
    return currentDot?.label || '';
  });

  private scrollHintTimeout: number | null = null;
  private firstInteractionDetected = false;

  ngOnInit(): void {
    this.setupVisibilityControl();
    this.setupScrollHintBehavior();
    this.setupFirstInteractionDetection();
  }

  ngOnDestroy(): void {
    if (this.scrollHintTimeout) {
      clearTimeout(this.scrollHintTimeout);
    }
  }

  /**
   * Navigate to specific section
   */
  navigateToSection(index: number): void {
    this.hideScrollHint();
    this.fullPageService.goToSection(index);
  }

  /**
   * Track by function for navigation dots
   */
  trackByIndex(index: number, item: NavigationDot): number {
    return item.index;
  }

  /**
   * Setup navigation visibility control
   */
  private setupVisibilityControl(): void {
    // Show navigation when fullPage is enabled and has sections
    effect(() => {
      const isEnabled = this.isEnabled();
      const hasSections = this.navigationDots().length > 0;
      
      if (isEnabled && hasSections) {
        // Delay showing navigation to allow for initial page load
        setTimeout(() => {
          this.isVisible.set(true);
        }, 1000);
      } else {
        this.isVisible.set(false);
      }
    });
  }

  /**
   * Setup scroll hint behavior
   */
  private setupScrollHintBehavior(): void {
    // Show scroll hint for 5 seconds on first load
    this.scrollHintTimeout = window.setTimeout(() => {
      if (!this.firstInteractionDetected) {
        this.showScrollHint.set(true);
        
        // Auto-hide after 10 seconds
        this.scrollHintTimeout = window.setTimeout(() => {
          this.hideScrollHint();
        }, 10000);
      }
    }, 2000);
  }

  /**
   * Setup first interaction detection
   */
  private setupFirstInteractionDetection(): void {
    const interactionEvents = ['wheel', 'keydown', 'touchstart', 'click'];
    
    const handleFirstInteraction = () => {
      this.firstInteractionDetected = true;
      this.hideScrollHint();
      
      // Remove listeners after first interaction
      interactionEvents.forEach(event => {
        document.removeEventListener(event, handleFirstInteraction);
      });
    };

    // Listen for any user interaction
    interactionEvents.forEach(event => {
      document.addEventListener(event, handleFirstInteraction, { passive: true });
    });

    // Listen for fullPage section changes
    document.addEventListener('fullpage-section-change', () => {
      this.hideScrollHint();
    });
  }

  /**
   * Hide scroll hint
   */
  private hideScrollHint(): void {
    this.showScrollHint.set(false);
    if (this.scrollHintTimeout) {
      clearTimeout(this.scrollHintTimeout);
      this.scrollHintTimeout = null;
    }
  }
}