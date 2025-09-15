import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FullPageNavigationComponent } from './components/fullpage-navigation.component';
import { ArchitectureDiagramComponent } from './sections/architecture-diagram.component';
import { DemoTheaterComponent } from './sections/demo-theater.component';
import { EcosystemExplorerComponent } from './sections/ecosystem-explorer.component';
import { HeroSectionComponent } from './sections/hero-section.component';
import { PlatformPillarsComponent } from './sections/platform-pillars.component';
import { CinematicScrollService } from './services/cinematic-scroll.service';
import { FullPageScrollService } from './services/fullpage-scroll.service';

import { SectionTransitionService } from './services/section-transition.service';
import { RecordingPerformanceService } from './services/recording-performance.service';
import { LoadingStateService } from './services/loading-state.service';

import { gsap } from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollToPlugin);

@Component({
  selector: 'brand-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeroSectionComponent,
    PlatformPillarsComponent,
    DemoTheaterComponent,
    EcosystemExplorerComponent,
    ArchitectureDiagramComponent,
    FullPageNavigationComponent,
  ],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css'],
})
export class LandingPageComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('landingContainer', { static: true })
  landingContainer!: ElementRef<HTMLElement>;
  // FullPage controls
  readonly fullPageEnabled = signal(false);
  readonly fullPageConfig = computed(() => this.fullPageScrollService.config());

  // Cinematic controls
  readonly isRecordingMode = signal(false);
  readonly autoPlayActive = signal(false);
  readonly showCinematicControls = signal(false);
  readonly showAdvancedControls = signal(false);
  readonly selectedOptimization = signal('Balanced Quality');

  private fullPageScrollService = inject(FullPageScrollService);
  public cinematicScrollService = inject(CinematicScrollService);
  private sectionTransitionService = inject(SectionTransitionService);
  public recordingPerformanceService = inject(RecordingPerformanceService);
  public loadingStateService = inject(LoadingStateService);

  // Component state
  readonly isLoaded = signal(false);
  readonly sections = signal([
    'hero',
    'platform-pillars',
    'demo-theater',
    'ecosystem-explorer',
    'architecture-diagram',
  ]);

  readonly loadingProgress = computed(() => {
    // Calculate loading progress based on loaded sections
    return 100; // For now, return 100% once component initializes
  });

  ngOnInit(): void {
    this.initializeLandingPage();
    this.setupKeyboardControls();
    this.setupResponsiveOptimization();
    this.setupTouchOptimizations();
  }

  ngAfterViewInit(): void {
    // Initialize both scroll systems after view is ready
    setTimeout(() => {
      this.initializeScrollSystems();
    }, 100);
  }

  ngOnDestroy(): void {
    this.fullPageScrollService.destroy();
    this.cinematicScrollService.destroy();
    this.loadingStateService.reset();
  }

  private async initializeLandingPage(): Promise<void> {
    try {
      // Start loading state service
      this.loadingStateService.startLoading();

      // Simulate progressive loading for development
      if (typeof window !== 'undefined') {
        await this.loadingStateService.simulateLoading();
      }

      // Mark as loaded for transition effect
      setTimeout(() => {
        this.isLoaded.set(true);
        this.showCinematicControls.set(true);
      }, 500);
    } catch (error) {
      console.error('Failed to initialize landing page:', error);
      // Complete loading even if there are errors
      this.loadingStateService.completeLoading();
      this.isLoaded.set(true);
    }
  }

  private initializeScrollSystems(): void {
    const sectionElements = Array.from(
      this.landingContainer.nativeElement.querySelectorAll('.section-container')
    ) as HTMLElement[];

    if (sectionElements.length > 0) {
      // Initialize cinematic scroll system (always available)
      this.cinematicScrollService.initializeSections(sectionElements);

      // Initialize fullPage scroll system but don't enable yet
      this.fullPageScrollService.initialize(sectionElements, {
        animationDuration: 1000,
        easing: 'power2.inOut',
        keyboardScrolling: true,
        touchScrolling: true,
        mouseWheelSensitivity: 1,
        touchSensitivity: 1,
        continuousVertical: false,
      });

      // Disable fullPage initially - let user enable it
      this.fullPageScrollService.disable();
    }
  }

  private setupKeyboardControls(): void {
    // Keyboard shortcuts for demo control
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'r':
            event.preventDefault();
            this.toggleRecordingMode();
            break;
          case 'p':
            event.preventDefault();
            if (this.isRecordingMode()) {
              this.toggleAutoPlay();
            }
            break;
          case 'h':
            event.preventDefault();
            this.showCinematicControls.update((show) => !show);
            break;
        }
      }
    });
  }

  toggleRecordingMode(): void {
    if (!this.fullPageEnabled()) {
      return; // Recording mode only works with fullPage enabled
    }

    const currentMode = this.isRecordingMode();
    this.isRecordingMode.set(!currentMode);

    if (!currentMode) {
      // Enable recording mode with device-appropriate settings
      const isMobile = window.innerWidth < 768;
      const isHighDPI = window.devicePixelRatio > 1;

      this.cinematicScrollService.enableRecordingMode({
        autoPlay: false,
        playbackSpeed: 1,
        sectionDuration: isMobile ? 10000 : 8000, // Longer on mobile
        transitionDuration: isMobile ? 2500 : 2000,
        pauseBetweenSections: 1000,
      });

      // Optimize fullPage for recording
      this.fullPageScrollService.updateConfig({
        animationDuration: isMobile ? 1500 : 1000,
        easing: 'power2.inOut',
      });

      // Set appropriate optimization level based on device
      let optimizationLevel = 'Balanced Quality';
      if (isMobile) {
        optimizationLevel = 'Performance';
      } else if (isHighDPI) {
        optimizationLevel = 'Ultra Quality';
      }

      this.selectedOptimization.set(optimizationLevel);
      this.recordingPerformanceService.setOptimizationLevel(optimizationLevel);
    } else {
      // Disable auto-play when exiting recording mode
      if (this.autoPlayActive()) {
        this.stopAutoPlay();
      }
    }
  }

  async toggleAutoPlay(): Promise<void> {
    if (!this.isRecordingMode() || !this.fullPageEnabled()) return;

    const isActive = this.autoPlayActive();

    if (!isActive) {
      this.autoPlayActive.set(true);

      try {
        // Use fullPage for auto-play progression
        await this.startFullPageAutoPlay();
        this.autoPlayActive.set(false);
      } catch (error) {
        console.error('Auto-play failed:', error);
        this.autoPlayActive.set(false);
      }
    } else {
      this.stopAutoPlay();
    }
  }

  /**
   * Start auto-play using fullPage navigation
   */
  private async startFullPageAutoPlay(): Promise<void> {
    const sections = this.fullPageScrollService.sections();
    const config = this.cinematicScrollService.autoPlayConfig();

    for (let i = 0; i < sections.length; i++) {
      if (!this.autoPlayActive()) break;

      // Navigate to section
      await this.fullPageScrollService.goToSection(i, true);

      // Wait for section duration
      await new Promise((resolve) => {
        setTimeout(
          resolve,
          config.sectionDuration + config.pauseBetweenSections
        );
      });
    }
  }

  private stopAutoPlay(): void {
    this.cinematicScrollService.stopAutoPlay();
    this.autoPlayActive.set(false);
  }

  navigateToSection(sectionId: string): void {
    if (this.fullPageEnabled()) {
      this.fullPageScrollService.goToSectionById(sectionId, true);
    } else {
      this.cinematicScrollService.navigateToSection(sectionId, true);
    }
  }

  onOptimizationChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const levelName = target.value;
    this.selectedOptimization.set(levelName);
    this.recordingPerformanceService.setOptimizationLevel(levelName);
  }

  exportDemoInfo(): void {
    const demoInfo = this.cinematicScrollService.getDemoInformation();
    const performanceReport = this.recordingPerformanceService.exportPerformanceReport();

    const fullReport = {
      timestamp: new Date().toISOString(),
      demoScript: demoInfo.script,
      timings: demoInfo.timings,
      performance: JSON.parse(performanceReport),
      narrativeFlows: this.sectionTransitionService.getAllNarrativeFlows(),
      loadingMetrics: JSON.parse(this.loadingStateService.exportLoadingMetrics()),
      sectionSummary: this.loadingStateService.getSectionLoadingSummary()
    };

    // Create and download the report
    const blob = new Blob([JSON.stringify(fullReport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `demo-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  getCinematicTiming(): { sectionTimings: number[]; totalDuration: number } {
    return this.cinematicScrollService.getCinematicTiming();
  }

  /**
   * Handle responsive optimization based on viewport changes
   */
  private setupResponsiveOptimization(): void {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      // const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

      if (this.isRecordingMode()) {
        // Adjust optimization level based on viewport
        let optimizationLevel = this.selectedOptimization();

        if (isMobile && optimizationLevel === 'Ultra Quality') {
          optimizationLevel = 'Performance';
          this.selectedOptimization.set(optimizationLevel);
          this.recordingPerformanceService.setOptimizationLevel(optimizationLevel);
        } else if (!isMobile && optimizationLevel === 'Performance') {
          optimizationLevel = 'Balanced Quality';
          this.selectedOptimization.set(optimizationLevel);
          this.recordingPerformanceService.setOptimizationLevel(optimizationLevel);
        }

        // Update fullPage timing for device
        if (this.fullPageEnabled()) {
          this.fullPageScrollService.updateConfig({
            animationDuration: isMobile ? 1500 : 1000,
          });
        }
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, {
      passive: true,
    });
  }

  /**
   * Handle touch-specific interactions for mobile
   */
  private setupTouchOptimizations(): void {
    if (typeof window === 'undefined') return;

    // Prevent zoom on double-tap for recording controls (but allow fullPage touch)
    document.addEventListener(
      'touchstart',
      (event) => {
        if (event.touches.length > 1 && !this.fullPageEnabled()) {
          event.preventDefault();
        }
      },
      { passive: false }
    );

    // Add touch-friendly scroll behavior
    (document.body.style as any).webkitOverflowScrolling = 'touch';
  }

  /**
   * Toggle fullPage.js mode
   */
  toggleFullPageMode(): void {
    const currentMode = this.fullPageEnabled();
    this.fullPageEnabled.set(!currentMode);

    if (!currentMode) {
      // Enable fullPage mode
      this.fullPageScrollService.enable();

      // Disable recording mode if it was active
      if (this.isRecordingMode()) {
        this.isRecordingMode.set(false);
        this.stopAutoPlay();
      }
    } else {
      // Disable fullPage mode
      this.fullPageScrollService.disable();
    }
  }

  /**
   * Update fullPage configuration
   */
  updateFullPageConfig(key: string, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.checked;

    this.fullPageScrollService.updateConfig({
      [key]: value,
    } as any);
  }
  /**
   * Toggle advanced controls visibility
   */
  toggleAdvancedControls(): void {
    this.showAdvancedControls.update((show) => !show);
  }
}
