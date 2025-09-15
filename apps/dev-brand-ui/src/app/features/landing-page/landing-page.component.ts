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
  template: `
  <div class="w-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a3e] to-[#2d2d5f] text-white opacity-0 transition-opacity duration-700 ease-in-out overflow-x-hidden relative" [class.opacity-100]="isLoaded()" [class.recording-mode]="isRecordingMode()" [class.fullpage-enabled]="fullPageEnabled()" [class.smooth-scroll]="!fullPageEnabled()" [class.snap-y]="!fullPageEnabled()" [class.snap-mandatory]="!fullPageEnabled()" #landingContainer>
    <!-- Floating Cinematic Controls -->
    <div class="fixed top-5 right-5 transition-all duration-300 ease-out" style="z-index: 1000" [class.opacity-0]="!showCinematicControls()" [class.translate-x-full]="!showCinematicControls()" [class.opacity-100]="showCinematicControls()" [class.translate-x-0]="showCinematicControls()">
      <!-- Floating Button -->
      <div class="relative">
        <button class="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-full shadow-lg backdrop-blur-lg border border-white/20 flex items-center justify-center text-white transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95" (click)="toggleDropdownControls()">⚙️</button>
        
        <!-- Simple Dropdown Panel -->
        <div class="absolute top-16 right-0 bg-black/90 border border-white/20 rounded-xl backdrop-blur-lg shadow-2xl overflow-hidden transition-all duration-300 w-72" [class.hidden]="!showDropdownControls()">
          <div class="p-4 space-y-3">
            <div class="text-center text-xs text-white/70 border-b border-white/10 pb-2 mb-3">Cinematic Controls</div>
            
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm text-white/80">FullPage Mode</span>
                <button class="px-3 py-1 bg-purple-600/30 hover:bg-purple-600/50 rounded text-xs" (click)="toggleFullPageMode()">Toggle</button>
              </div>
              
              <div class="flex items-center justify-between">
                <span class="text-sm text-white/80">Recording Mode</span>
                <button class="px-3 py-1 bg-red-600/30 hover:bg-red-600/50 rounded text-xs" [disabled]="!fullPageEnabled()" (click)="toggleRecordingMode()">Toggle</button>
              </div>
              
              <div class="flex items-center justify-between">
                <span class="text-sm text-white/80">Auto Play</span>
                <button class="px-3 py-1 bg-green-600/30 hover:bg-green-600/50 rounded text-xs" [disabled]="!isRecordingMode()" (click)="toggleAutoPlay()">Toggle</button>
              </div>
            </div>
            
            <div class="border-t border-white/10 pt-3">
              <div class="flex items-center justify-between text-xs mb-2">
                <span class="text-white/60">Progress</span>
                <span class="text-white/60">{{ cinematicScrollService.currentSection() }}</span>
              </div>
              <div class="h-1 bg-black/50 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300" [style.width.%]="cinematicScrollService.narrativeProgress()"></div>
              </div>
              
              <div class="flex items-center justify-between mt-2 text-xs">
                <span class="text-white/60">FPS: {{ recordingPerformanceService.currentMetrics().fps }}</span>
                <button class="px-2 py-1 bg-sky-600/30 hover:bg-sky-600/50 rounded text-xs" (click)="exportDemoInfo()">Export</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hero Section -->
    <section id="hero" class="h-screen w-screen relative flex items-center justify-center p-0 m-0 overflow-hidden border-b border-white/10 bg-gradient-radial from-purple-500/15 via-transparent to-transparent snap-start snap-always">
      <brand-hero-section class="w-full h-full flex items-center justify-center relative box-border opacity-0 transform translate-y-8 transition-all duration-1000 animate-in"/>
    </section>

    <!-- Platform Pillars Section -->
    <section id="platform-pillars" class="h-screen w-screen relative flex items-center justify-center p-0 m-0 overflow-hidden border-b border-white/10 bg-gradient-to-r from-pink-500/10 to-purple-500/10 snap-start snap-always">
      <brand-platform-pillars class="w-full h-full flex items-center justify-center relative box-border opacity-0 transform translate-y-8 transition-all duration-1000 animate-in"/>
    </section>

    <!-- Demo Theater Section -->
    <section id="demo-theater" class="h-screen w-screen relative flex items-center justify-center p-0 m-0 overflow-hidden border-b border-white/10 bg-gradient-to-br from-sky-500/10 to-purple-500/10 snap-start snap-always">
      <brand-demo-theater class="w-full h-full flex items-center justify-center relative box-border opacity-0 transform translate-y-8 transition-all duration-1000 animate-in"/>
    </section>

    <!-- Ecosystem Explorer Section -->
    <section id="ecosystem-explorer" class="h-screen w-screen relative flex items-center justify-center p-0 m-0 overflow-hidden border-b border-white/10 bg-gradient-radial from-green-500/10 via-transparent to-transparent snap-start snap-always">
      <brand-ecosystem-explorer class="w-full h-full flex items-center justify-center relative box-border opacity-0 transform translate-y-8 transition-all duration-1000 animate-in"/>
    </section>

    <!-- Architecture Deep Dive Section -->
    <section id="architecture-diagram" class="h-screen w-screen relative flex items-center justify-center p-0 m-0 overflow-hidden border-b border-white/10 bg-gradient-to-b from-yellow-500/10 to-pink-500/10 snap-start snap-always">
      <brand-architecture-diagram class="w-full h-full flex items-center justify-center relative box-border opacity-0 transform translate-y-8 transition-all duration-1000 animate-in"/>
    </section>

    @if (fullPageEnabled()) {
    <brand-fullpage-navigation></brand-fullpage-navigation>
    }

    <!-- Navigation to other features -->
    <nav class="h-screen w-screen flex flex-col items-center justify-center box-border text-center bg-black/30 relative snap-start snap-always" [class.fullpage-section]="fullPageEnabled()" id="feature-navigation">
      <h3 class="text-3xl mb-8 text-white text-center">Explore Platform Features</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-auto-fit gap-6 max-w-6xl mx-auto" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))">
        <a routerLink="/spatial-interface" class="block p-6 bg-white/5 border border-white/10 rounded-xl no-underline text-white transition-all duration-300 backdrop-blur-lg hover:bg-white/10 hover:border-purple-500/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/30">
          <h4 class="m-0 mb-2 text-xl text-purple-500">3D Agent Visualization</h4>
          <p class="m-0 text-white/70 text-sm">Interactive spatial interface</p>
        </a>
        <a routerLink="/workflow-canvas" class="block p-6 bg-white/5 border border-white/10 rounded-xl no-underline text-white transition-all duration-300 backdrop-blur-lg hover:bg-white/10 hover:border-purple-500/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/30">
          <h4 class="m-0 mb-2 text-xl text-purple-500">Workflow Canvas</h4>
          <p class="m-0 text-white/70 text-sm">Visual workflow designer</p>
        </a>
        <a routerLink="/memory-constellation" class="block p-6 bg-white/5 border border-white/10 rounded-xl no-underline text-white transition-all duration-300 backdrop-blur-lg hover:bg-white/10 hover:border-purple-500/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/30">
          <h4 class="m-0 mb-2 text-xl text-purple-500">Memory Constellation</h4>
          <p class="m-0 text-white/70 text-sm">Distributed memory system</p>
        </a>
        <a routerLink="/chat-interface" class="block p-6 bg-white/5 border border-white/10 rounded-xl no-underline text-white transition-all duration-300 backdrop-blur-lg hover:bg-white/10 hover:border-purple-500/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/30">
          <h4 class="m-0 mb-2 text-xl text-purple-500">AI Chat Interface</h4>
          <p class="m-0 text-white/70 text-sm">Conversational AI experience</p>
        </a>
        <a routerLink="/content-forge" class="block p-6 bg-white/5 border border-white/10 rounded-xl no-underline text-white transition-all duration-300 backdrop-blur-lg hover:bg-white/10 hover:border-purple-500/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/30">
          <h4 class="m-0 mb-2 text-xl text-purple-500">Content Forge</h4>
          <p class="m-0 text-white/70 text-sm">AI-powered content creation</p>
        </a>
      </div>
    </nav>
  </div>`,
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
  readonly showDropdownControls = signal(false);
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
        this.loadingStateService.completeLoading();
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
      this.landingContainer.nativeElement.querySelectorAll('section')
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

      // Enable fullPage by default for better UX
      this.fullPageEnabled.set(true);
      this.fullPageScrollService.enable();
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
    const performanceReport =
      this.recordingPerformanceService.exportPerformanceReport();

    const fullReport = {
      timestamp: new Date().toISOString(),
      demoScript: demoInfo.script,
      timings: demoInfo.timings,
      performance: JSON.parse(performanceReport),
      narrativeFlows: this.sectionTransitionService.getAllNarrativeFlows(),
      loadingMetrics: JSON.parse(
        this.loadingStateService.exportLoadingMetrics()
      ),
      sectionSummary: this.loadingStateService.getSectionLoadingSummary(),
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
          this.recordingPerformanceService.setOptimizationLevel(
            optimizationLevel
          );
        } else if (!isMobile && optimizationLevel === 'Performance') {
          optimizationLevel = 'Balanced Quality';
          this.selectedOptimization.set(optimizationLevel);
          this.recordingPerformanceService.setOptimizationLevel(
            optimizationLevel
          );
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

  /**
   * Toggle dropdown controls visibility
   */
  toggleDropdownControls(): void {
    this.showDropdownControls.update((show) => !show);
  }
}
