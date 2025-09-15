import {
  Component,
  OnDestroy,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';

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
  selector: 'brand-demo-theater',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="w-full h-full min-h-screen bg-gradient-to-br from-gray-900/98 via-blue-900/95 to-gray-900/98 text-white flex flex-col overflow-hidden relative"
    >
      <!-- Theater Header -->
      <div class="text-center pt-12 pb-8 px-8 z-10 relative">
        <h2
          class="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-sky-400 via-pink-400 to-sky-400 bg-[length:200%_200%] bg-clip-text text-transparent animate-[cinematicShimmer_4s_ease-in-out_infinite]"
        >
          Demo Theater
        </h2>
        <p
          class="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed"
        >
          Experience live demonstrations of our AI platform in action
        </p>
        <div class="flex justify-center gap-4 flex-wrap">
          @for (category of categories; track trackCategory($index, category)) {
          <button
            class="px-6 py-3 bg-white/10 border border-sky-400/30 rounded-full text-white/80 cursor-pointer transition-all duration-300 text-sm backdrop-blur-lg hover:border-sky-400 hover:bg-sky-400/20 hover:text-white hover:-translate-y-0.5"
            [class.bg-gradient-to-r]="activeCategory() === category"
            [class.from-sky-400]="activeCategory() === category"
            [class.to-blue-500]="activeCategory() === category"
            [class.border-sky-400]="activeCategory() === category"
            [class.text-white]="activeCategory() === category"
            [class.shadow-[0_4px_20px_rgba(0,191,255,0.4)]]="
              activeCategory() === category
            "
            (click)="selectCategory(category)"
          >
            {{ category }}
          </button>
          }
        </div>
      </div>

      <!-- Main Theater Stage -->
      <div
        class="flex-1 max-h-[60vh] mx-8 rounded-2xl relative overflow-hidden bg-gradient-to-br from-black/80 to-slate-900/60 border-2 border-sky-400/30"
        #theaterStage
      >
        <div
          class="w-full h-full relative rounded-[18px] overflow-hidden bg-slate-900"
          [class.playing]="isPlaying()"
        >
          <!-- Video Player Placeholder -->
          @if (selectedDemo()) {
          <div
            class="w-full h-full relative flex bg-gradient-to-br from-slate-800/80 to-slate-900/90"
          >
            <!-- Enhanced Player Overlay -->
            <div
              class="absolute inset-0 z-10 flex"
              [class.minimal]="isPlaying()"
            >
              <!-- Central Play Controls -->
              <div class="absolute inset-0 flex items-center justify-center">
                <button
                  class="play-btn"
                  [class.playing]="isPlaying()"
                  (click)="togglePlay()"
                >
                  @if (!isPlaying()) {
                  <span>▶</span>
                  } @if (isPlaying()) {
                  <span>⏸</span>
                  }
                </button>
              </div>
              <!-- Demo Information Panel -->
              <div
                class="absolute top-6 left-6 bg-black/70 backdrop-blur-lg rounded-xl p-6 max-w-md transition-all duration-500"
                [class.opacity-30]="isPlaying()"
                [class.scale-90]="isPlaying()"
              >
                <div class="flex items-center justify-between mb-3">
                  <h3 class="text-xl font-semibold text-white">
                    {{ selectedDemo()?.title }}
                  </h3>
                  @if (selectedDemo()?.isLive) {
                  <div
                    class="flex items-center gap-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs"
                  >
                    <div
                      class="w-2 h-2 bg-white rounded-full animate-pulse"
                    ></div>
                    LIVE
                  </div>
                  }
                </div>
                <p class="text-white/80 mb-4 text-sm leading-relaxed">
                  {{ selectedDemo()?.description }}
                </p>
                <div class="flex flex-wrap gap-2">
                  @for (feature of selectedDemo()?.features; track feature) {
                  <span
                    class="bg-sky-500/20 text-sky-300 px-2 py-1 rounded text-xs border border-sky-500/30"
                  >
                    {{ feature }}
                  </span>
                  }
                </div>
              </div>
              <!-- Advanced Player Controls -->
              <div
                class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 transform translate-y-full transition-transform duration-300"
                [class.translate-y-0]="isPlaying()"
              >
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <button
                      class="w-10 h-10 bg-white/20 hover:bg-white/30 border-none rounded-full flex items-center justify-center text-white cursor-pointer transition-all duration-200"
                      (click)="seekBackward()"
                    >
                      <span>⏪</span>
                    </button>
                    <button
                      class="w-10 h-10 bg-white/20 hover:bg-white/30 border-none rounded-full flex items-center justify-center text-white cursor-pointer transition-all duration-200"
                      (click)="togglePlay()"
                    >
                      @if (!isPlaying()) {
                      <span>▶</span>
                      } @if (isPlaying()) {
                      <span>⏸</span>
                      }
                    </button>
                    <button
                      class="w-10 h-10 bg-white/20 hover:bg-white/30 border-none rounded-full flex items-center justify-center text-white cursor-pointer transition-all duration-200"
                      (click)="seekForward()"
                    >
                      <span>⏩</span>
                    </button>
                    <div class="text-white/80 text-sm font-mono">
                      {{ currentTime() }} / {{ totalTime() }}
                    </div>
                  </div>
                  <button
                    class="w-10 h-10 bg-white/20 hover:bg-white/30 border-none rounded-full flex items-center justify-center text-white cursor-pointer transition-all duration-200"
                    (click)="toggleFullscreen()"
                  >
                    @if (!isFullscreen()) {
                    <span>⛶</span>
                    } @if (isFullscreen()) {
                    <span>⛴</span>
                    }
                  </button>
                </div>
                <div
                  class="relative w-full bg-white/20 rounded-full h-2 cursor-pointer"
                >
                  <div
                    class="absolute top-0 left-0 h-2 bg-sky-500 rounded-full transition-all duration-300"
                    [style.width.%]="playbackProgress()"
                  ></div>
                  <div
                    class="absolute top-1/2 w-4 h-4 bg-white rounded-full -translate-y-1/2 shadow-lg transition-all duration-300"
                    [style.left.%]="playbackProgress()"
                  ></div>
                </div>
              </div>
            </div>
            <!-- Enhanced Video Simulation Layer -->
            <div
              class="absolute inset-0 opacity-50 transition-opacity duration-500"
              [class.opacity-100]="isPlaying()"
            >
              <!-- Dynamic Code Animation -->
              <div class="w-full h-full bg-slate-900 font-mono text-sm">
                <div
                  class="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700"
                >
                  <div class="flex items-center gap-2">
                    <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div class="text-white/80 text-xs">
                    AI Workflow Engine - Live Demo
                  </div>
                </div>
                <div class="p-4 overflow-hidden">
                  @for (line of codeLines; track line; let i = $index) {
                  <div
                    class="code-line"
                    [class.active]="
                      isPlaying() &&
                      (playbackProgress() * codeLines.length) / 100 > i
                    "
                    [style.animation-delay.s]="i * 0.15"
                  >
                    <span class="text-slate-500 w-8 text-right mr-4">{{
                      i + 1
                    }}</span>
                    <span class="text-white/70">{{ line }}</span>
                  </div>
                  }
                </div>
              </div>
              <!-- Cinematic Visual Effects -->
              <div
                class="absolute inset-0 pointer-events-none"
                [class.active]="isPlaying()"
              >
                <div class="data-stream"></div>
                <div class="neural-network"></div>
                <div class="flex gap-2 absolute top-4 right-4">
                  @for (indicator of [1, 2, 3, 4, 5]; track indicator) {
                  <div
                    class="w-2 h-2 bg-green-500 rounded-full animate-pulse"
                    [style.animation-delay.s]="indicator * 0.3"
                  ></div>
                  }
                </div>
              </div>
            </div>
          </div>
          } @else {
          <div
            class="flex flex-col items-center justify-center h-full text-center"
          >
            <div class="text-6xl mb-4">🎬</div>
            <h3 class="text-2xl font-semibold text-white mb-2">
              Select a Demo
            </h3>
            <p class="text-white/70">Choose from our curated showcase below</p>
          </div>
          }

          <!-- Demo Selection Prompt -->
        </div>

        <!-- Ambient Effects -->
        <div class="stage-effects">
          <div class="spotlight spotlight-1"></div>
          <div class="spotlight spotlight-2"></div>
          <div class="particle-field" #particleField></div>
        </div>
      </div>

      <!-- Demo Showcase Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
        @for (demo of filteredDemos(); track demo.id) {
        <div
          class="demo-card"
          [class.selected]="selectedDemo()?.id === demo.id"
          (click)="selectDemo(demo)"
          (keypress)="selectDemo(demo)"
          tabindex="0"
        >
          <div
            class="relative h-32 bg-slate-700 flex items-center justify-center text-4xl"
          >
            <div>{{ demo.thumbnail }}</div>
            @if (demo.isLive) {
            <div
              class="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
            >
              🔴 LIVE
            </div>
            }
            <div
              class="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs"
            >
              {{ demo.duration }}
            </div>
          </div>
          <div class="p-4">
            <div class="text-sky-400 text-xs uppercase font-semibold mb-1">
              {{ demo.category }}
            </div>
            <h4 class="text-white font-semibold mb-2">{{ demo.title }}</h4>
            <p class="text-white/70 text-sm leading-relaxed">
              {{ demo.description }}
            </p>
          </div>
        </div>

        }
      </div>
    </div>
  `,
  styles: [
    `
      /* Button and Component Styles */
      .play-btn {
        @apply w-20 h-20 bg-sky-500/80 hover:bg-sky-400 border-none rounded-full flex items-center justify-center text-white text-2xl cursor-pointer transition-all duration-300 backdrop-blur-lg hover:scale-110;
      }
      .play-btn.playing {
        @apply w-16 h-16 bg-slate-700/80 hover:bg-slate-600;
      }
      .code-line {
        @apply flex items-center py-1 opacity-50 transition-all duration-300;
      }
      .code-line.active {
        @apply opacity-100 text-green-400 bg-green-500/10;
      }
      .demo-card {
        @apply bg-slate-800/50 backdrop-blur-lg rounded-xl overflow-hidden border border-slate-700/50 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/50;
      }
      .demo-card.selected {
        @apply border-sky-400 bg-sky-500/10;
      }

      /* Essential Animations and Visual Effects */
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

      .stage-effects {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 1;
      }

      /* Visual effects for code simulation */
      .data-stream::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(0, 255, 127, 0.1),
          transparent
        );
        animation: dataFlow 3s ease-in-out infinite;
      }

      .neural-network::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 200px;
        height: 200px;
        border: 1px solid rgba(0, 191, 255, 0.2);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        animation: pulse 2s ease-in-out infinite;
      }

      @keyframes dataFlow {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 0.3;
          transform: translate(-50%, -50%) scale(1);
        }
        50% {
          opacity: 0.8;
          transform: translate(-50%, -50%) scale(1.2);
        }
      }
    `,
  ],
})
export class DemoTheaterComponent implements OnDestroy {
  readonly selectedDemo = signal<DemoShowcase | null>(null);
  readonly activeCategory = signal<string>('All');
  readonly isPlaying = signal(false);
  readonly isFullscreen = signal(false);
  readonly currentTime = signal('0:00');
  readonly totalTime = signal('5:00');
  readonly playbackProgress = signal(0);

  readonly categories = ['All', 'Workflows', 'Memory', 'Streaming', 'Safety'];

  readonly showcases: DemoShowcase[] = [
    {
      id: 'workflow-orchestration',
      title: 'Workflow Orchestration',
      description: 'Multi-agent coordination with intelligent task routing',
      category: 'Workflows',
      duration: '4:30',
      thumbnail: '🎼',
      isLive: true,
      features: [
        'Multi-agent coordination',
        'Dynamic routing',
        'Error recovery',
      ],
    },
    {
      id: 'memory-fusion',
      title: 'Memory Fusion',
      description: 'Hybrid vector and graph memory systems',
      category: 'Memory',
      duration: '5:15',
      thumbnail: '🧠',
      isLive: false,
      features: ['Vector search', 'Graph traversal', 'Context fusion'],
    },
    {
      id: 'streaming-data',
      title: 'Real-time Streaming',
      description: 'Progressive result delivery with backpressure handling',
      category: 'Streaming',
      duration: '3:45',
      thumbnail: '🌊',
      isLive: true,
      features: [
        'Real-time updates',
        'Chunked processing',
        'WebSocket integration',
      ],
    },
  ];

  readonly codeLines = [
    '// AI Workflow Engine - Live Demo',
    'import { WorkflowEngine } from "@hive-academy/nestjs-langgraph";',
    '',
    'const workflow = new WorkflowEngine({',
    '  agents: [researchAgent, analysisAgent, reportAgent],',
    '  memory: new HybridMemory(),',
    '  streaming: true',
    '});',
    '',
    'await workflow.execute({',
    '  input: "Analyze market trends",',
    '  stream: true',
    '});',
  ];

  private playbackTimer?: number;

  ngOnDestroy(): void {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
    }
  }

  trackCategory(index: number, category: string): string {
    return category;
  }

  trackDemo(index: number, demo: DemoShowcase): string {
    return demo.id;
  }

  selectCategory(category: string): void {
    this.activeCategory.set(category);
  }

  selectDemo(demo: DemoShowcase): void {
    this.selectedDemo.set(demo);
    this.isPlaying.set(false);
    this.playbackProgress.set(0);
    this.currentTime.set('0:00');
  }

  togglePlay(): void {
    const playing = !this.isPlaying();
    this.isPlaying.set(playing);

    if (playing) {
      this.startPlayback();
    } else {
      this.stopPlayback();
    }
  }

  seekBackward(): void {
    const current = this.playbackProgress();
    this.playbackProgress.set(Math.max(0, current - 10));
  }

  seekForward(): void {
    const current = this.playbackProgress();
    this.playbackProgress.set(Math.min(100, current + 10));
  }

  toggleFullscreen(): void {
    this.isFullscreen.set(!this.isFullscreen());
  }

  filteredDemos(): DemoShowcase[] {
    const category = this.activeCategory();
    if (category === 'All') {
      return this.showcases;
    }
    return this.showcases.filter((demo) => demo.category === category);
  }

  private startPlayback(): void {
    this.playbackTimer = window.setInterval(() => {
      const current = this.playbackProgress();
      if (current >= 100) {
        this.stopPlayback();
        return;
      }

      const newProgress = current + 2;
      this.playbackProgress.set(newProgress);

      const totalSeconds = 300; // 5 minutes
      const currentSeconds = Math.floor((newProgress / 100) * totalSeconds);
      const minutes = Math.floor(currentSeconds / 60);
      const seconds = currentSeconds % 60;
      this.currentTime.set(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
  }

  private stopPlayback(): void {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = undefined;
    }
    this.isPlaying.set(false);
  }
}
