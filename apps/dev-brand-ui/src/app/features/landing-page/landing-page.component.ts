import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ArchitectureDiagramComponent } from './sections/architecture-diagram.component';
import { DemoTheaterComponent } from './sections/demo-theater.component';
import { EcosystemExplorerComponent } from './sections/ecosystem-explorer.component';
import { HeroSectionComponent } from './sections/hero-section.component';
import { PlatformPillarsComponent } from './sections/platform-pillars.component';
import { FullPageScrollService } from './services/fullpage-scroll.service';
import { FullPageNavigationComponent } from './components/fullpage-navigation.component';
import { CinematicScrollService } from './services/cinematic-scroll.service';
// import { SectionTransitionService } from './services/section-transition.service';
// import { RecordingPerformanceService } from './services/recording-performance.service';
// import { LoadingStateService } from './services/loading-state.service';
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
    FullPageNavigationComponent
  ],
  template: `
    <div class="w-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a3e] to-[#2d2d5f] text-white opacity-0 transition-opacity duration-700 ease-in-out overflow-x-hidden relative smooth-scroll snap-y snap-mandatory" 
         [class.opacity-100]="isLoaded()" 
         [class.recording-mode]="isRecordingMode()" 
         [class.fullpage-enabled]="fullPageEnabled()" 
         [class.snap-none]="fullPageEnabled()"
         #landingContainer>
      
      <!-- Global Loading Overlay - Temporarily disabled -->
      <!-- <div class="loading-overlay" [class.visible]="loadingStateService.isLoading()" #loadingOverlay>
        <div class="loading-content">
          <div class="loading-header">
            <h2>AI SaaS Platform</h2>
            <p>Preparing your intelligent experience...</p>
          </div>
          
          <div class="loading-spinner"></div>
          
          <div class="loading-progress">
            <div class="loading-progress-fill" [style.width.%]="loadingStateService.loadingProgress()"></div>
          </div>
          
          <div class="loading-stage-info">
            <div class="stage-text">{{ loadingStateService.currentStage() }}</div>
            <div class="progress-text">{{ loadingStateService.loadingProgress() | number:'1.0-0' }}%</div>
          </div>
          
          <div class="section-loading-status">
            <div 
              *ngFor="let section of loadingStateService.sectionLoadingStates()"
              class="section-status"
              [class.loaded]="section.isLoaded"
              [class.error]="section.hasError">
              <div class="section-icon"></div>
              <span class="section-name">{{ section.sectionId | titlecase }}</span>
              <div class="section-progress">
                <div class="section-progress-fill" [style.width.%]="section.loadProgress"></div>
              </div>
            </div>
          </div>
        </div>
      </div> -->
      
      <!-- Cinematic Controls -->
      <div class="fixed top-5 right-5 opacity-0 translate-x-full transition-all duration-300 ease-out" 
           style="z-index: 1000"
           [class.opacity-100]="showCinematicControls()" 
           [class.translate-x-0]="showCinematicControls()">
        <div class="bg-black/80 border border-white/20 rounded-xl p-4 backdrop-blur-lg flex flex-col gap-2" style="min-width: 200px">
          <button 
            class="px-4 py-2 bg-purple-900 bg-opacity-20 border border-purple-500 border-opacity-40 rounded-md text-white cursor-pointer transition-all duration-200 text-sm hover:bg-opacity-40" 
            [class.bg-opacity-60]="fullPageEnabled()" 
            [class.border-opacity-80]="fullPageEnabled()" 
            (click)="toggleFullPageMode()">
            📄 FullPage Mode
          </button>
          <button 
            class="px-4 py-2 bg-purple-900 bg-opacity-20 border border-purple-500 border-opacity-40 rounded-md text-white cursor-pointer transition-all duration-200 text-sm hover:bg-opacity-40 disabled:opacity-50 disabled:cursor-not-allowed" 
            [class.bg-opacity-60]="isRecordingMode()" 
            [class.border-opacity-80]="isRecordingMode()" 
            (click)="toggleRecordingMode()" 
            [disabled]="!fullPageEnabled()">
            🎬 Recording Mode
          </button>
          <button 
            class="px-4 py-2 bg-purple-900 bg-opacity-20 border border-purple-500 border-opacity-40 rounded-md text-white cursor-pointer transition-all duration-200 text-sm hover:bg-opacity-40 disabled:opacity-50 disabled:cursor-not-allowed" 
            [class.bg-opacity-60]="autoPlayActive()" 
            [class.border-opacity-80]="autoPlayActive()" 
            (click)="toggleAutoPlay()" 
            [disabled]="!isRecordingMode() || !fullPageEnabled()">
            ▶️ Auto Play
          </button>
          <button 
            class="px-4 py-2 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-md text-white cursor-pointer transition-all duration-200 text-sm hover:bg-opacity-20" 
            (click)="toggleAdvancedControls()">
            ⚙️ Advanced
          </button>
          
          <!-- Advanced Controls Panel -->
          <div class="max-h-0 overflow-hidden transition-all duration-300 border-t border-white/10 mt-2 pt-0" 
               [class.pt-2]="showAdvancedControls()"
               [style.max-height]="showAdvancedControls() ? '300px' : '0'">
            <label class="block text-xs text-white/70 mb-1">Optimization Level:</label>
            <select class="w-full p-2 bg-black/30 border border-white/20 rounded text-white text-xs mb-2" [value]="selectedOptimization()" (change)="onOptimizationChange($event)">
              <option value="Performance">Performance</option>
              <option value="Balanced Quality">Balanced Quality</option>
              <option value="Ultra Quality">Ultra Quality</option>
            </select>
            
            <div class="my-2 border-t border-white/10 pt-2" *ngIf="fullPageEnabled()">
              <label class="block text-xs text-white/70 mb-1">FullPage Settings:</label>
              <div class="flex flex-col gap-1.5">
                <label class="flex items-center gap-2 text-xs text-white/80 cursor-pointer hover:text-white">
                  <input 
                    type="checkbox" 
                    class="w-3.5 h-3.5 accent-purple-500"
                    [checked]="fullPageConfig().keyboardScrolling"
                    (change)="updateFullPageConfig('keyboardScrolling', $event)">
                  <span>Keyboard Navigation</span>
                </label>
                <label class="flex items-center gap-2 text-xs text-white/80 cursor-pointer hover:text-white">
                  <input 
                    type="checkbox" 
                    class="w-3.5 h-3.5 accent-purple-500"
                    [checked]="fullPageConfig().touchScrolling"
                    (change)="updateFullPageConfig('touchScrolling', $event)">
                  <span>Touch Navigation</span>
                </label>
                <label class="flex items-center gap-2 text-xs text-white/80 cursor-pointer hover:text-white">
                  <input 
                    type="checkbox" 
                    class="w-3.5 h-3.5 accent-purple-500"
                    [checked]="fullPageConfig().continuousVertical"
                    (change)="updateFullPageConfig('continuousVertical', $event)">
                  <span>Continuous Loop</span>
                </label>
              </div>
            </div>
            
            <div class="my-2">
              <label class="block text-xs text-white/70 mb-1">Quick Navigation:</label>
              <div class="grid grid-cols-2 gap-1">
                <button class="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white cursor-pointer text-xs transition-all duration-200 hover:bg-white/10" (click)="navigateToSection('hero')">Hero</button>
                <button class="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white cursor-pointer text-xs transition-all duration-200 hover:bg-white/10" (click)="navigateToSection('platform-pillars')">Pillars</button>
                <button class="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white cursor-pointer text-xs transition-all duration-200 hover:bg-white/10" (click)="navigateToSection('demo-theater')">Theater</button>
                <button class="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white cursor-pointer text-xs transition-all duration-200 hover:bg-white/10" (click)="navigateToSection('ecosystem-explorer')">Ecosystem</button>
                <button class="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white cursor-pointer text-xs transition-all duration-200 hover:bg-white/10" (click)="navigateToSection('architecture-diagram')">Architecture</button>
              </div>
            </div>
            
            <button class="px-4 py-2 bg-sky-500/20 border border-sky-500/40 rounded-md text-white cursor-pointer transition-all duration-200 text-sm hover:bg-sky-500/40" (click)="exportDemoInfo()">
              📊 Export Demo Info
            </button>
          </div>
          
          <div class="my-2 relative">
            <div class="h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-sm transition-all duration-300 relative overflow-hidden before:content-[''] before:absolute before:inset-0 before:bg-white/10 before:-z-10 before:rounded-sm" [style.width.%]="cinematicScrollService.narrativeProgress()"></div>
            <span class="block text-xs text-white/60 capitalize mt-1">{{ cinematicScrollService.currentSection() }}</span>
          </div>
          
          <!-- <div class="performance-monitor" [class.warning]="!recordingPerformanceService.isPerformanceOptimal()">
            <div class="fps-display">FPS: {{ recordingPerformanceService.currentMetrics().fps }}</div>
            <div class="grade-display grade-{{ recordingPerformanceService.performanceGrade().toLowerCase() }}">
              Grade: {{ recordingPerformanceService.performanceGrade() }}
            </div>
          </div> -->
        </div>
      </div>
      <!-- Hero Section -->
      <section id="hero" class="h-screen w-screen relative flex items-center justify-center p-0 m-0 overflow-hidden border-b border-white/10 bg-gradient-radial from-purple-500/15 via-transparent to-transparent snap-start snap-always">
        <div class="w-full h-full flex items-center justify-center relative p-8 box-border opacity-0 transform translate-y-8 transition-all duration-1000 animate-in">
          <brand-hero-section />
        </div>
      </section>

      <!-- Platform Pillars Section -->
      <section id="platform-pillars" class="h-screen w-screen relative flex items-center justify-center p-0 m-0 overflow-hidden border-b border-white/10 bg-gradient-to-r from-pink-500/10 to-purple-500/10 snap-start snap-always">
        <div class="w-full h-full flex items-center justify-center relative p-8 box-border opacity-0 transform translate-y-8 transition-all duration-1000 animate-in">
          <app-platform-pillars />
        </div>
      </section>

      <!-- Demo Theater Section -->
      <section id="demo-theater" class="h-screen w-screen relative flex items-center justify-center p-0 m-0 overflow-hidden border-b border-white/10 bg-gradient-to-br from-sky-500/10 to-purple-500/10 snap-start snap-always">
        <div class="w-full h-full flex items-center justify-center relative p-8 box-border opacity-0 transform translate-y-8 transition-all duration-1000 animate-in">
          <app-demo-theater />
        </div>
      </section>

      <!-- Ecosystem Explorer Section -->
      <section id="ecosystem-explorer" class="h-screen w-screen relative flex items-center justify-center p-0 m-0 overflow-hidden border-b border-white/10 bg-gradient-radial from-green-500/10 via-transparent to-transparent snap-start snap-always">
        <div class="w-full h-full flex items-center justify-center relative p-8 box-border opacity-0 transform translate-y-8 transition-all duration-1000 animate-in">
          <app-ecosystem-explorer />
        </div>
      </section>

      <!-- Architecture Deep Dive Section -->
      <section id="architecture-diagram" class="h-screen w-screen relative flex items-center justify-center p-0 m-0 overflow-hidden border-b border-white/10 bg-gradient-to-b from-yellow-500/10 to-pink-500/10 snap-start snap-always">
        <div class="w-full h-full flex items-center justify-center relative p-8 box-border opacity-0 transform translate-y-8 transition-all duration-1000 animate-in">
          <app-architecture-diagram />
        </div>
      </section>

      <!-- FullPage Navigation Dots -->
      <app-fullpage-navigation *ngIf="fullPageEnabled()"></app-fullpage-navigation>
      
      <!-- Navigation to other features -->
      <nav class="h-screen w-screen flex flex-col items-center justify-center p-8 box-border text-center bg-black/30 relative snap-start snap-always" [class.fullpage-section]="fullPageEnabled()" id="feature-navigation">
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
    </div>
  `,
  styles: [`
    /* Essential CSS that cannot be replicated with Tailwind utilities */
    
    /* Recording Mode CSS Variables */
    .recording-mode {
      --particle-density: 0.3;
      --render-quality: performance;
      --gpu-acceleration: enabled;
    }

    .fully-loaded {
      --particle-density: 1.0;
      --render-quality: high;
    }

    /* FullPage.js mode overrides */
    .fullpage-enabled {
      scroll-snap-type: none !important;
    }
    
    .fullpage-enabled section {
      scroll-snap-align: none !important;
      scroll-snap-stop: normal !important;
    }
    
    /* Animation classes for section entrance */
    .animate-in {
      animation: slideInUp 1s ease-out forwards;
    }
    
    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Performance optimizations */
    .w-screen {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      -webkit-backface-visibility: hidden;
      backface-visibility: hidden;
      transform: translateZ(0); /* Force hardware acceleration */
    }

    /* Mobile viewport height fix */
    @media (max-width: 768px) {
      .h-screen {
        height: 100vh;
        height: 100svh; /* Safari iOS support */
      }
      
      /* Mobile control adjustments */
      .fixed.top-5.right-5 {
        top: 10px;
        right: 10px;
        transform: scale(0.9);
      }

      .grid.grid-cols-2 {
        grid-template-columns: 1fr;
      }

      .grid.grid-cols-1.md\:grid-cols-2.lg\:grid-cols-auto-fit {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .text-3xl {
        font-size: 1.5rem;
      }
    }

    /* Tablet optimizations */
    @media (min-width: 769px) and (max-width: 1024px) {
      .fixed.top-5.right-5 {
        transform: scale(0.95);
      }

      .p-8 {
        padding: 1.5rem;
      }

      .grid.grid-cols-1.md\:grid-cols-2.lg\:grid-cols-auto-fit {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    /* Large screen optimizations */
    @media (min-width: 1400px) {
      .p-8 {
        padding: 3rem;
      }
    }

    /* High DPI display adjustments */
    @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
      .h-1 {
        border-radius: 2px;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .animate-in,
      .transition-all,
      .transition-opacity {
        animation: none;
        transition: none;
      }
    }

    /* Dark mode enhancements */
    @media (prefers-color-scheme: dark) {
      .w-screen {
        color-scheme: dark;
      }
    }

    /* Print styles */
    @media print {
      .fixed,
      .loading-overlay {
        display: none;
      }

      .w-screen {
        background: white !important;
        color: black !important;
      }
    }
  `]
})
export class LandingPageComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('landingContainer', { static: true }) landingContainer!: ElementRef<HTMLElement>;
  // FullPage controls
  readonly fullPageEnabled = signal(false);
  readonly fullPageConfig = computed(() => this.fullPageScrollService.config());
  
  // Cinematic controls
  readonly isRecordingMode = signal(false);
  readonly autoPlayActive = signal(false);
  readonly showCinematicControls = signal(false);
  readonly showAdvancedControls = signal(false);
  readonly selectedOptimization = signal('Balanced Quality');

  constructor(
    private fullPageScrollService: FullPageScrollService,
    public cinematicScrollService: CinematicScrollService,
    // private sectionTransitionService: SectionTransitionService,
    // private recordingPerformanceService: RecordingPerformanceService,
    // private loadingStateService: LoadingStateService
  ) {}
  // Component state
  readonly isLoaded = signal(false);
  readonly sections = signal([
    'hero',
    'platform-pillars',
    'demo-theater',
    'ecosystem-explorer',
    'architecture-diagram'
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
    // this.loadingStateService.reset();
  }

  private async initializeLandingPage(): Promise<void> {
    try {
      // Simplified loading without service
      // this.loadingStateService.startLoading();
      
      // Simulate progressive loading for development
      // if (typeof window !== 'undefined') {
      //   await this.loadingStateService.simulateLoading();
      // }
      
      // Mark as loaded for transition effect
      setTimeout(() => {
        this.isLoaded.set(true);
        this.showCinematicControls.set(true);
      }, 500);

    } catch (error) {
      console.error('Failed to initialize landing page:', error);
      // Complete loading even if there are errors
      // this.loadingStateService.completeLoading();
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
        continuousVertical: false
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
            this.showCinematicControls.update(show => !show);
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
        pauseBetweenSections: 1000
      });
      
      // Optimize fullPage for recording
      this.fullPageScrollService.updateConfig({
        animationDuration: isMobile ? 1500 : 1000,
        easing: 'power2.inOut'
      });
      
      // Set appropriate optimization level based on device
      let optimizationLevel = 'Balanced Quality';
      if (isMobile) {
        optimizationLevel = 'Performance';
      } else if (isHighDPI) {
        optimizationLevel = 'Ultra Quality';
      }
      
      this.selectedOptimization.set(optimizationLevel);
      // this.recordingPerformanceService.setOptimizationLevel(optimizationLevel);
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
      await new Promise(resolve => {
        setTimeout(resolve, config.sectionDuration + config.pauseBetweenSections);
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
    // this.recordingPerformanceService.setOptimizationLevel(levelName);
  }

  exportDemoInfo(): void {
    const demoInfo = this.cinematicScrollService.getDemoInformation();
    // const performanceReport = this.recordingPerformanceService.exportPerformanceReport();
    
    const fullReport = {
      timestamp: new Date().toISOString(),
      demoScript: demoInfo.script,
      timings: demoInfo.timings,
      // performance: JSON.parse(performanceReport),
      // narrativeFlows: this.sectionTransitionService.getAllNarrativeFlows(),
      // loadingMetrics: JSON.parse(this.loadingStateService.exportLoadingMetrics()),
      // sectionSummary: this.loadingStateService.getSectionLoadingSummary()
    };
    
    // Create and download the report
    const blob = new Blob([JSON.stringify(fullReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `demo-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  getCinematicTiming(): { sectionTimings: number[], totalDuration: number } {
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
          // this.recordingPerformanceService.setOptimizationLevel(optimizationLevel);
        } else if (!isMobile && optimizationLevel === 'Performance') {
          optimizationLevel = 'Balanced Quality';
          this.selectedOptimization.set(optimizationLevel);
          // this.recordingPerformanceService.setOptimizationLevel(optimizationLevel);
        }
        
        // Update fullPage timing for device
        if (this.fullPageEnabled()) {
          this.fullPageScrollService.updateConfig({
            animationDuration: isMobile ? 1500 : 1000
          });
        }
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
  }

  /**
   * Handle touch-specific interactions for mobile
   */
  private setupTouchOptimizations(): void {
    if (typeof window === 'undefined') return;

    // Prevent zoom on double-tap for recording controls (but allow fullPage touch)
    document.addEventListener('touchstart', (event) => {
      if (event.touches.length > 1 && !this.fullPageEnabled()) {
        event.preventDefault();
      }
    }, { passive: false });

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
      [key]: value
    } as any);
  }
  /**
   * Toggle advanced controls visibility
   */
  toggleAdvancedControls(): void {
    this.showAdvancedControls.update(show => !show);
  }
}
