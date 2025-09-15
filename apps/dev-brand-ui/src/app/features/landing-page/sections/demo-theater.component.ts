import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  signal,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { gsap } from 'gsap';

interface DemoShowcase {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  thumbnail: string;
  videoUrl?: string;
  isLive: boolean;
  features: string[];
}

@Component({
  selector: 'app-demo-theater',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="demo-theater-container">
      <!-- Theater Header -->
      <div class="theater-header">
        <h2 class="section-title">Demo Theater</h2>
        <p class="section-subtitle">
          Experience live demonstrations of our AI platform in action
        </p>
        <div class="theater-controls">
          <button
            *ngFor="let category of categories; trackBy: trackCategory"
            class="category-btn"
            [class.active]="activeCategory() === category"
            (click)="selectCategory(category)"
          >
            {{ category }}
          </button>
        </div>
      </div>

      <!-- Main Theater Stage -->
      <div class="theater-stage" #theaterStage>
        <div class="stage-screen" [class.playing]="isPlaying()">
          <!-- Video Player Placeholder -->
          <div class="video-player" *ngIf="selectedDemo(); else selectPrompt">
            <div class="player-overlay">
              <div class="play-controls">
                <button
                  class="play-btn"
                  (click)="togglePlay()"
                  [class.playing]="isPlaying()"
                >
                  <span *ngIf="!isPlaying()">▶</span>
                  <span *ngIf="isPlaying()">⏸</span>
                </button>
              </div>
              <div class="demo-info">
                <h3>{{ selectedDemo()?.title }}</h3>
                <p>{{ selectedDemo()?.description }}</p>
                <div class="demo-features">
                  <span
                    *ngFor="let feature of selectedDemo()?.features"
                    class="feature-tag"
                  >
                    {{ feature }}
                  </span>
                </div>
              </div>
            </div>
            <!-- Simulated video content -->
            <div class="video-simulation" [class.active]="isPlaying()">
              <div class="code-lines">
                <div
                  *ngFor="let line of codeLines; let i = index"
                  class="code-line"
                  [style.animation-delay.s]="i * 0.1"
                >
                  {{ line }}
                </div>
              </div>
            </div>
          </div>

          <!-- Demo Selection Prompt -->
          <ng-template #selectPrompt>
            <div class="select-prompt">
              <div class="prompt-icon">🎬</div>
              <h3>Select a Demo</h3>
              <p>Choose from our curated showcase below</p>
            </div>
          </ng-template>
        </div>

        <!-- Ambient Effects -->
        <div class="stage-effects">
          <div class="spotlight spotlight-1"></div>
          <div class="spotlight spotlight-2"></div>
          <div class="particle-field" #particleField></div>
        </div>
      </div>

      <!-- Demo Showcase Grid -->
      <div class="showcase-grid">
        <div
          *ngFor="let demo of filteredDemos(); trackBy: trackDemo"
          class="demo-card"
          [class.active]="selectedDemo()?.id === demo.id"
          (click)="selectDemo(demo)"
        >
          <div class="card-thumbnail">
            <div class="thumbnail-placeholder">{{ demo.thumbnail }}</div>
            <div class="live-indicator" *ngIf="demo.isLive">🔴 LIVE</div>
            <div class="duration-badge">{{ demo.duration }}</div>
          </div>
          <div class="card-content">
            <div class="card-category">{{ demo.category }}</div>
            <h4 class="card-title">{{ demo.title }}</h4>
            <p class="card-description">{{ demo.description }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .demo-theater-container {
        width: 100%;
        height: 100%;
        min-height: 100vh;
        background: linear-gradient(
          135deg,
          rgba(10, 10, 10, 0.98) 0%,
          rgba(0, 30, 60, 0.95) 50%,
          rgba(10, 10, 10, 0.98) 100%
        );
        color: #ffffff;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
      }

      .theater-header {
        text-align: center;
        padding: 3rem 2rem 2rem;
        z-index: 10;
        position: relative;
      }

      .section-title {
        font-size: 4rem;
        font-weight: 700;
        margin: 0 0 1rem;
        background: linear-gradient(135deg, #00bfff, #ff69b4, #00bfff);
        background-size: 200% 200%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: cinematicShimmer 4s ease-in-out infinite;
      }

      .section-subtitle {
        font-size: 1.3rem;
        color: rgba(255, 255, 255, 0.8);
        margin: 0 0 2rem;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
        line-height: 1.5;
      }

      .theater-controls {
        display: flex;
        justify-content: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .category-btn {
        padding: 0.8rem 1.5rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(0, 191, 255, 0.3);
        border-radius: 25px;
        color: rgba(255, 255, 255, 0.8);
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.9rem;
        backdrop-filter: blur(10px);
      }

      .category-btn:hover {
        border-color: #00bfff;
        background: rgba(0, 191, 255, 0.2);
        color: #ffffff;
        transform: translateY(-2px);
      }

      .category-btn.active {
        background: linear-gradient(135deg, #00bfff, #0080ff);
        border-color: #00bfff;
        color: #ffffff;
        box-shadow: 0 4px 20px rgba(0, 191, 255, 0.4);
      }

      .theater-stage {
        flex: 1;
        max-height: 60vh;
        margin: 2rem;
        border-radius: 20px;
        position: relative;
        overflow: hidden;
        background: linear-gradient(
          135deg,
          rgba(0, 0, 0, 0.8) 0%,
          rgba(20, 20, 40, 0.6) 100%
        );
        border: 2px solid rgba(0, 191, 255, 0.3);
      }

      .stage-screen {
        width: 100%;
        height: 100%;
        position: relative;
        border-radius: 18px;
        overflow: hidden;
        background: #000011;
      }

      .video-player {
        width: 100%;
        height: 100%;
        position: relative;
        display: flex;
        background: linear-gradient(
          135deg,
          rgba(0, 20, 40, 0.8) 0%,
          rgba(0, 0, 20, 0.9) 100%
        );
      }

      .player-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.4);
        transition: opacity 0.3s ease;
      }

      .stage-screen.playing .player-overlay {
        opacity: 0;
        pointer-events: none;
      }

      .play-controls {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }

      .play-btn {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: linear-gradient(135deg, #00bfff, #0080ff);
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        box-shadow: 0 4px 20px rgba(0, 191, 255, 0.4);
      }

      .play-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 30px rgba(0, 191, 255, 0.6);
      }

      .demo-info {
        position: absolute;
        bottom: 2rem;
        left: 2rem;
        right: 2rem;
        text-align: left;
      }

      .demo-info h3 {
        font-size: 1.8rem;
        margin: 0 0 0.5rem;
        color: #ffffff;
      }

      .demo-info p {
        font-size: 1rem;
        margin: 0 0 1rem;
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.4;
      }

      .demo-features {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .feature-tag {
        padding: 0.3rem 0.8rem;
        background: rgba(0, 191, 255, 0.2);
        border: 1px solid rgba(0, 191, 255, 0.4);
        border-radius: 12px;
        font-size: 0.8rem;
        color: #00bfff;
      }

      .video-simulation {
        width: 100%;
        height: 100%;
        background: #000011;
        position: relative;
        opacity: 0;
        transition: opacity 0.5s ease;
      }

      .video-simulation.active {
        opacity: 1;
      }

      .code-lines {
        padding: 2rem;
        font-family: 'Courier New', monospace;
        font-size: 0.9rem;
        color: #00ff88;
        line-height: 1.6;
      }

      .code-line {
        opacity: 0;
        animation: typewriter 0.5s ease-in-out forwards;
        white-space: pre;
      }

      .select-prompt {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        color: rgba(255, 255, 255, 0.6);
      }

      .prompt-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        opacity: 0.8;
      }

      .select-prompt h3 {
        font-size: 1.5rem;
        margin: 0 0 0.5rem;
        color: rgba(255, 255, 255, 0.8);
      }

      .select-prompt p {
        font-size: 1rem;
        margin: 0;
        color: rgba(255, 255, 255, 0.6);
      }

      .stage-effects {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 1;
      }

      .spotlight {
        position: absolute;
        width: 200px;
        height: 200px;
        border-radius: 50%;
        background: radial-gradient(
          circle,
          rgba(0, 191, 255, 0.1) 0%,
          transparent 70%
        );
        animation: spotlightMove 8s ease-in-out infinite;
      }

      .spotlight-1 {
        top: 10%;
        left: 10%;
        animation-delay: 0s;
      }

      .spotlight-2 {
        bottom: 10%;
        right: 10%;
        animation-delay: 4s;
      }

      .showcase-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.5rem;
        padding: 2rem;
        max-height: 40vh;
        overflow-y: auto;
      }

      .demo-card {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
      }

      .demo-card:hover {
        transform: translateY(-4px);
        border-color: #00bfff;
        box-shadow: 0 8px 32px rgba(0, 191, 255, 0.3);
      }

      .demo-card.active {
        border-color: #ff69b4;
        box-shadow: 0 8px 32px rgba(255, 105, 180, 0.4);
        background: rgba(255, 105, 180, 0.1);
      }

      .card-thumbnail {
        height: 120px;
        background: linear-gradient(
          135deg,
          rgba(0, 191, 255, 0.2) 0%,
          rgba(255, 105, 180, 0.2) 100%
        );
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
      }

      .thumbnail-placeholder {
        font-size: 3rem;
        opacity: 0.8;
      }

      .live-indicator {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        padding: 0.3rem 0.6rem;
        background: rgba(255, 0, 0, 0.8);
        border-radius: 12px;
        font-size: 0.7rem;
        font-weight: bold;
        animation: livePulse 2s ease-in-out infinite;
      }

      .duration-badge {
        position: absolute;
        bottom: 0.5rem;
        left: 0.5rem;
        padding: 0.3rem 0.6rem;
        background: rgba(0, 0, 0, 0.8);
        border-radius: 8px;
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.9);
      }

      .card-content {
        padding: 1rem;
      }

      .card-category {
        font-size: 0.8rem;
        color: #00bfff;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 0.5rem;
      }

      .card-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: #ffffff;
        margin: 0 0 0.5rem;
        line-height: 1.3;
      }

      .card-description {
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.7);
        margin: 0;
        line-height: 1.4;
      }

      /* Animations */
      @keyframes cinematicShimmer {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }

      @keyframes spotlightMove {
        0%,
        100% {
          transform: translate(0, 0) scale(1);
        }
        25% {
          transform: translate(50px, 30px) scale(1.2);
        }
        50% {
          transform: translate(-30px, 50px) scale(0.8);
        }
        75% {
          transform: translate(30px, -20px) scale(1.1);
        }
      }

      @keyframes livePulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
      }

      @keyframes typewriter {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .theater-header {
          padding: 2rem 1rem 1rem;
        }

        .section-title {
          font-size: 2.5rem;
        }

        .section-subtitle {
          font-size: 1.1rem;
        }

        .theater-stage {
          margin: 1rem;
          max-height: 50vh;
        }

        .showcase-grid {
          grid-template-columns: 1fr;
          padding: 1rem;
        }

        .demo-info {
          bottom: 1rem;
          left: 1rem;
          right: 1rem;
        }

        .demo-info h3 {
          font-size: 1.3rem;
        }

        .play-btn {
          width: 60px;
          height: 60px;
          font-size: 1.2rem;
        }
      }
    `,
  ],
})
export class DemoTheaterComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('theaterStage', { static: true })
  theaterStage!: ElementRef<HTMLDivElement>;

  @ViewChild('particleField')
  particleField!: ElementRef<HTMLDivElement>;

  readonly selectedDemo = signal<DemoShowcase | null>(null);
  readonly activeCategory = signal<string>('All');
  readonly isPlaying = signal(false);
  readonly isTheaterReady = signal(false);

  readonly categories = ['All', 'Workflows', 'Memory', 'Streaming', 'Safety'];

  readonly demos: DemoShowcase[] = [
    {
      id: 'workflow-orchestration',
      title: 'Multi-Agent Workflow Orchestration',
      description:
        'Watch multiple AI agents collaborate to solve complex business problems with intelligent coordination.',
      category: 'Workflows',
      duration: '3:45',
      thumbnail: '🤖',
      isLive: true,
      features: [
        'Agent coordination',
        'Dynamic task routing',
        'Error recovery',
        'Performance monitoring',
      ],
    },
    {
      id: 'memory-fusion',
      title: 'Hybrid Memory System in Action',
      description:
        'See how vector search and graph relationships combine to create intelligent context understanding.',
      category: 'Memory',
      duration: '4:20',
      thumbnail: '🧠',
      isLive: false,
      features: [
        'Vector similarity',
        'Graph traversal',
        'Context fusion',
        'Semantic search',
      ],
    },
    {
      id: 'streaming-data',
      title: 'Real-time Streaming Pipeline',
      description:
        'Experience live data processing with progressive results and real-time user feedback.',
      category: 'Streaming',
      duration: '2:30',
      thumbnail: '🌊',
      isLive: true,
      features: [
        'Live updates',
        'Chunked processing',
        'Backpressure handling',
        'WebSocket integration',
      ],
    },
    {
      id: 'safety-gates',
      title: 'Human-in-the-Loop Safety Demo',
      description:
        'Demonstrate how safety checkpoints and human approval workflows ensure responsible AI.',
      category: 'Safety',
      duration: '3:15',
      thumbnail: '🛡️',
      isLive: false,
      features: [
        'Approval workflows',
        'Content validation',
        'Risk assessment',
        'Compliance monitoring',
      ],
    },
    {
      id: 'full-platform',
      title: 'Complete Platform Demonstration',
      description:
        'End-to-end showcase of all platform capabilities working together in a real business scenario.',
      category: 'Workflows',
      duration: '8:00',
      thumbnail: '🚀',
      isLive: true,
      features: [
        'Full integration',
        'Business workflow',
        'All platform features',
        'Production scenario',
      ],
    },
  ];

  readonly codeLines = [
    '// Initializing AI workflow orchestration...',
    'const workflow = await WorkflowEngine.create({',
    '  agents: [researchAgent, analysisAgent, reportAgent],',
    '  memory: hybridMemorySystem,',
    '  streaming: true,',
    '  safetyGates: [contentValidation, humanApproval]',
    '});',
    '',
    '// Starting multi-agent collaboration...',
    'workflow.start({',
    '  input: "Analyze market trends for Q4 strategy",',
    '  onProgress: (update) => console.log(update),',
    '  onComplete: (result) => deliverInsights(result)',
    '});',
    '',
    '// Agent coordination in progress...',
    '[RESEARCH_AGENT] Gathering market data from 15 sources...',
    '[MEMORY_SYSTEM] Indexing 2,847 data points...',
    '[ANALYSIS_AGENT] Processing trends and patterns...',
    '[SAFETY_GATE] Human approval required for insights...',
    '[REPORT_AGENT] Generating executive summary...',
    '',
    '✅ Workflow completed successfully!',
    '📊 Generated comprehensive market analysis report',
    '🎯 Identified 3 key opportunities for Q4',
    '🔒 All safety validations passed',
  ];

  readonly filteredDemos = signal<DemoShowcase[]>([]);

  ngOnInit(): void {
    this.initializeTheater();
    this.updateFilteredDemos();
  }

  ngOnDestroy(): void {
    // Cleanup handled by destroyRef
  }

  trackCategory(_index: number, category: string): string {
    return category;
  }

  trackDemo(_index: number, demo: DemoShowcase): string {
    return demo.id;
  }

  selectCategory(category: string): void {
    this.activeCategory.set(category);
    this.updateFilteredDemos();
    this.animateCategoryChange();
  }

  selectDemo(demo: DemoShowcase): void {
    this.selectedDemo.set(demo);
    this.isPlaying.set(false);
    this.animateDemoSelection();
  }

  togglePlay(): void {
    const newPlayState = !this.isPlaying();
    this.isPlaying.set(newPlayState);
    this.animatePlayState(newPlayState);
  }

  private initializeTheater(): void {
    // Initialize theater with cinematic entrance
    this.animateTheaterEntrance();
    this.isTheaterReady.set(true);
  }

  private updateFilteredDemos(): void {
    const category = this.activeCategory();
    const filtered =
      category === 'All'
        ? this.demos
        : this.demos.filter((demo) => demo.category === category);
    this.filteredDemos.set(filtered);
  }

  private animateTheaterEntrance(): void {
    if (!this.theaterStage?.nativeElement) return;

    const tl = gsap.timeline();

    // Animate stage entrance
    tl.fromTo(
      this.theaterStage.nativeElement,
      {
        scale: 0.8,
        opacity: 0,
        rotationY: -15,
      },
      {
        scale: 1,
        opacity: 1,
        rotationY: 0,
        duration: 1.2,
        ease: 'power2.out',
      }
    );

    // Add subtle continuous animation
    gsap.to(this.theaterStage.nativeElement, {
      boxShadow: '0 0 40px rgba(0, 191, 255, 0.3)',
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'power2.inOut',
    });
  }

  private animateCategoryChange(): void {
    // Animate category transition
    gsap.fromTo(
      '.showcase-grid',
      {
        opacity: 0.5,
        y: 20,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out',
      }
    );
  }

  private animateDemoSelection(): void {
    if (!this.theaterStage?.nativeElement) return;

    // Create selection animation
    const tl = gsap.timeline();

    tl.to('.stage-screen', {
      scale: 1.02,
      duration: 0.2,
      ease: 'power2.out',
    }).to('.stage-screen', {
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
    });

    // Animate demo info appearance
    gsap.fromTo(
      '.demo-info',
      {
        opacity: 0,
        y: 30,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out',
        delay: 0.2,
      }
    );
  }

  private animatePlayState(isPlaying: boolean): void {
    if (isPlaying) {
      // Start "video" simulation
      gsap.to('.code-line', {
        opacity: 1,
        duration: 0.5,
        stagger: 0.1,
        ease: 'power2.out',
      });

      // Add pulsing effect to stage
      gsap.to('.stage-screen', {
        boxShadow: '0 0 60px rgba(0, 191, 255, 0.6)',
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut',
      });
    } else {
      // Stop animations
      gsap.killTweensOf('.code-line');
      gsap.killTweensOf('.stage-screen');

      gsap.to('.stage-screen', {
        boxShadow: '0 0 20px rgba(0, 191, 255, 0.3)',
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  }
}