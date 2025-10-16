import { Injectable, signal, computed, inject } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SectionTransitionService } from './section-transition.service';
import { RecordingPerformanceService } from './recording-performance.service';

gsap.registerPlugin(ScrollTrigger);

export interface SectionProgress {
  id: string;
  progress: number;
  isActive: boolean;
  isVisible: boolean;
  element?: HTMLElement;
}

export interface CinematicConfig {
  autoPlay: boolean;
  playbackSpeed: number;
  sectionDuration: number;
  transitionDuration: number;
  pauseBetweenSections: number;
}

@Injectable({
  providedIn: 'root',
})
export class CinematicScrollService {
  // Section management
  private readonly _sections = signal<SectionProgress[]>([]);
  private readonly _currentSection = signal<string>('hero');
  private readonly _isRecordingMode = signal(false);
  private readonly _autoPlayConfig = signal<CinematicConfig>({
    autoPlay: false,
    playbackSpeed: 1,
    sectionDuration: 8000, // 8 seconds per section
    transitionDuration: 2000, // 2 seconds for transitions
    pauseBetweenSections: 1000, // 1 second pause
  });

  // Performance tracking
  private readonly _fps = signal(60);
  private readonly _performanceMetrics = signal({
    frameDrops: 0,
    averageFps: 60,
    lastFrameTime: 0,
  });

  // Auto-play state
  private autoPlayTimeline?: gsap.core.Timeline;
  private performanceMonitor?: number;

  // Public readonly signals
  readonly sections = this._sections.asReadonly();
  readonly currentSection = this._currentSection.asReadonly();
  readonly isRecordingMode = this._isRecordingMode.asReadonly();
  readonly autoPlayConfig = this._autoPlayConfig.asReadonly();
  readonly fps = this._fps.asReadonly();
  readonly performanceMetrics = this._performanceMetrics.asReadonly();

  readonly narrativeProgress = computed(() => {
    const sections = this._sections();
    const current = this._currentSection();
    const currentIndex = sections.findIndex((s) => s.id === current);
    return currentIndex >= 0 ? ((currentIndex + 1) / sections.length) * 100 : 0;
  });

  readonly isOptimalPerformance = computed(() => {
    return this._fps() >= 55; // Allow 5fps tolerance for recording
  });

  private readonly sectionTransitionService = inject(SectionTransitionService);
  private readonly recordingPerformanceService = inject(
    RecordingPerformanceService
  );

  constructor() {
    this.initializePerformanceMonitoring();
    this.setupScrollTriggers();
  }

  /**
   * Initialize scroll-triggered animations for cinematic flow
   */
  initializeSections(sectionElements: HTMLElement[]): void {
    const sectionData: SectionProgress[] = sectionElements.map(
      (element, index) => ({
        id: element.id || `section-${index}`,
        progress: 0,
        isActive: index === 0,
        isVisible: false,
        element,
      })
    );

    this._sections.set(sectionData);

    // Set up scroll triggers for each section
    sectionElements.forEach((element, index) => {
      this.createSectionScrollTrigger(element, index);
    });
  }

  /**
   * Enable recording mode with optimized performance
   */
  enableRecordingMode(config?: Partial<CinematicConfig>): void {
    this._isRecordingMode.set(true);

    if (config) {
      this._autoPlayConfig.update((current) => ({ ...current, ...config }));
    }

    // Enable performance optimization
    this.recordingPerformanceService.enableRecordingMode('Balanced Quality');

    // Optimize for recording
    this.optimizeForRecording();
  }

  /**
   * Start auto-play demo progression
   */
  startAutoPlay(): Promise<void> {
    return new Promise((resolve) => {
      const config = this._autoPlayConfig();
      const sections = this._sections();

      if (!config.autoPlay || sections.length === 0) {
        resolve();
        return;
      }

      this.autoPlayTimeline = gsap.timeline({
        onComplete: resolve,
      });

      sections.forEach((section, index) => {
        if (section.element) {
          this.addSectionToAutoPlay(section.element, index);
        }
      });

      this.autoPlayTimeline.play();
    });
  }

  /**
   * Stop auto-play and return control to user
   */
  stopAutoPlay(): void {
    if (this.autoPlayTimeline) {
      this.autoPlayTimeline.kill();
      this.autoPlayTimeline = undefined;
    }

    const config = this._autoPlayConfig();
    this._autoPlayConfig.set({ ...config, autoPlay: false });

    // Disable recording optimizations if no longer recording
    if (!this._isRecordingMode()) {
      this.recordingPerformanceService.disableRecordingMode();
    }
  }

  /**
   * Navigate to specific section programmatically
   */
  async navigateToSection(sectionId: string, smooth = true): Promise<void> {
    const section = this._sections().find((s) => s.id === sectionId);
    if (!section?.element) return;

    const currentSection = this._currentSection();

    // Use transition service for enhanced navigation
    await this.sectionTransitionService.executeTransition(
      currentSection,
      sectionId,
      'programmatic',
      {
        duration: smooth ? 1.5 : 0.5,
        ease: 'power2.inOut',
        stagger: 0.1,
        delay: 0,
      }
    );

    this._currentSection.set(sectionId);
  }

  /**
   * Get cinematic timing for narration synchronization
   */
  getCinematicTiming(): { sectionTimings: number[]; totalDuration: number } {
    const config = this._autoPlayConfig();
    const sections = this._sections();

    const sectionTimings = sections.map((_, index) => {
      return (
        index *
        (config.sectionDuration +
          config.transitionDuration +
          config.pauseBetweenSections)
      );
    });

    const totalDuration =
      sectionTimings[sectionTimings.length - 1] + config.sectionDuration;

    return { sectionTimings, totalDuration };
  }

  private setupScrollTriggers(): void {
    // Global scroll trigger for performance monitoring
    ScrollTrigger.create({
      trigger: 'body',
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        // this.updatePerformanceMetrics();
      },
    });
  }

  private createSectionScrollTrigger(
    element: HTMLElement,
    index: number
  ): void {
    // Create entrance animation
    const entranceTimeline = gsap.timeline({
      paused: true,
    });

    // Add subtle entrance effects
    entranceTimeline
      .from(element, {
        opacity: 0,
        y: 50,
        duration: 1,
        ease: 'power2.out',
      })
      .from(
        element.querySelectorAll('.animate-in'),
        {
          opacity: 0,
          y: 30,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power2.out',
        },
        '-=0.5'
      );

    ScrollTrigger.create({
      trigger: element,
      start: 'top 80%',
      end: 'bottom 20%',
      animation: entranceTimeline,
      toggleActions: 'play none none reverse',
      onEnter: () => {
        this._currentSection.set(element.id);
        this.updateSectionProgress(element.id, 0);
      },
      // onProgress: (self: any) => {
      //   this.updateSectionProgress(element.id, self.progress);
      // },
      onLeave: () => {
        this.updateSectionProgress(element.id, 1);
      },
    });
  }

  private addSectionToAutoPlay(element: HTMLElement, index: number): void {
    if (!this.autoPlayTimeline) return;

    const config = this._autoPlayConfig();
    const isFirst = index === 0;

    // Add pause before section (except first)
    if (!isFirst) {
      this.autoPlayTimeline.to(
        {},
        { duration: config.pauseBetweenSections / 1000 }
      );
    }

    // Scroll to section
    this.autoPlayTimeline.to(window, {
      duration: config.transitionDuration / 1000,
      scrollTo: {
        y: element,
        offsetY: 0,
      },
      ease: 'power2.inOut',
      onStart: () => {
        this._currentSection.set(element.id);
      },
    });

    // Stay on section for demonstration
    this.autoPlayTimeline.to(
      {},
      {
        duration: config.sectionDuration / 1000,
        onUpdate: () => {
          // Trigger any section-specific animations
          this.triggerSectionDemonstration(element.id);
        },
      }
    );
  }

  private triggerSectionDemonstration(sectionId: string): void {
    // Use transition service for enhanced demonstration
    this.sectionTransitionService.triggerSectionDemo(sectionId);

    // Dispatch custom event for section components to handle
    const sectionElement = document.getElementById(sectionId);
    if (sectionElement) {
      sectionElement.dispatchEvent(
        new CustomEvent('cinematic-demonstration', {
          detail: {
            sectionId,
            timestamp: Date.now(),
            narrativeFlow:
              this.sectionTransitionService.getNarrativeFlow(sectionId),
          },
        })
      );
    }
  }

  private updateSectionProgress(sectionId: string, progress: number): void {
    this._sections.update((sections) =>
      sections.map((section) =>
        section.id === sectionId
          ? { ...section, progress, isActive: progress > 0.1 && progress < 0.9 }
          : section
      )
    );
  }

  private optimizeForRecording(): void {
    // Disable expensive effects during recording
    if (this._isRecordingMode()) {
      // Reduce particle counts
      document.documentElement.style.setProperty('--particle-density', '0.3');

      // Optimize render quality
      document.documentElement.style.setProperty(
        '--render-quality',
        'performance'
      );

      // Enable hardware acceleration
      document.documentElement.style.setProperty(
        '--gpu-acceleration',
        'enabled'
      );
    }
  }

  private initializePerformanceMonitoring(): void {
    let lastTime = performance.now();
    let frameCount = 0;
    let totalFps = 0;

    const measurePerformance = (currentTime: number) => {
      frameCount++;
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= 1000) {
        const currentFps = Math.round((frameCount * 1000) / deltaTime);
        totalFps += currentFps;

        this._fps.set(currentFps);
        this._performanceMetrics.update((metrics) => ({
          ...metrics,
          averageFps: Math.round(totalFps / (frameCount / 60)),
          lastFrameTime: deltaTime,
          frameDrops:
            currentFps < 55 ? metrics.frameDrops + 1 : metrics.frameDrops,
        }));

        frameCount = 0;
        lastTime = currentTime;
      }

      this.performanceMonitor = requestAnimationFrame(measurePerformance);
    };

    this.performanceMonitor = requestAnimationFrame(measurePerformance);
  }

  /**
   * Get comprehensive demo information
   */
  getDemoInformation(): {
    script: string;
    timings: { sectionTimings: number[]; totalDuration: number };
    performanceReport: string;
  } {
    return {
      script: this.sectionTransitionService.generateDemoScript(),
      timings: this.getCinematicTiming(),
      performanceReport:
        this.recordingPerformanceService.exportPerformanceReport(),
    };
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics() {
    return {
      fps: this.recordingPerformanceService.currentMetrics().fps,
      grade: this.recordingPerformanceService.performanceGrade(),
      isOptimal: this.recordingPerformanceService.isPerformanceOptimal(),
      recommendations:
        this.recordingPerformanceService.getPerformanceRecommendations(),
    };
  }

  destroy(): void {
    if (this.autoPlayTimeline) {
      this.autoPlayTimeline.kill();
    }

    if (this.performanceMonitor) {
      cancelAnimationFrame(this.performanceMonitor);
    }

    // Clean up services
    this.recordingPerformanceService.destroy();

    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  }
}
