import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  OnDestroy,
  OnInit,
  signal,
  inject,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  ShowcaseApiService,
  ShowcaseAgent,
  ShowcaseSystemStatus,
} from '../../core/services/showcase-api.service';

@Component({
  selector: 'brand-workflow-canvas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div
      class="relative h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 overflow-hidden"
    >
      <!-- DevBrand Multiverse Navigation -->
      <nav
        class="absolute top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10"
      >
        <div class="flex items-center justify-between px-6 py-4">
          <div class="flex items-center space-x-6">
            <h1
              class="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
            >
              DevBrand Multiverse
            </h1>
            <div class="hidden md:flex space-x-1">
              @for (dimension of dimensions(); track dimension.id) {
              <button
                [routerLink]="dimension.route"
                [class]="getDimensionButtonClass(dimension.id)"
                class="px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium"
                (mouseenter)="hoveredDimension.set(dimension.id)"
                (mouseleave)="hoveredDimension.set(null)"
              >
                <span class="mr-2">{{ dimension.icon }}</span>
                {{ dimension.name }}
              </button>
              }
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <div class="text-sm text-slate-300">
              Active Agents:
              <span class="text-purple-400 font-semibold">{{
                activeAgentCount()
              }}</span>
            </div>
            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </nav>

      <!-- Main Canvas Area -->
      <div class="pt-20 h-full relative">
        <!-- Agent Constellation Layer -->
        <div class="absolute inset-0 z-10">
          <div class="h-full w-full flex items-center justify-center">
            <!-- Central Workflow Hub -->
            <div class="relative">
              <!-- Orbital Agents -->
              @for (agent of orbitalAgents(); track agent.id; let i = $index) {
              <div
                [style.transform]="getAgentPosition(i, orbitalAgents().length)"
                [style.animation-delay]="getAnimationDelay(i)"
                class="absolute w-24 h-24 -translate-x-12 -translate-y-12 agent-orbit"
              >
                <div
                  class="w-full h-full rounded-full bg-gradient-to-br border-2 border-white/20 shadow-2xl cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-purple-400/50"
                  [class]="getAgentGradient(agent.type)"
                  (click)="selectAgent(agent)"
                  (keypress)="selectAgent(agent)"
                  role="button"
                  tabindex="0"
                >
                  <!-- Agent Icon -->
                  <div
                    class="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                  >
                    {{ agent.icon }}
                  </div>
                </div>
                <!-- Agent Name -->
                <div
                  class="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-slate-300 whitespace-nowrap"
                >
                  {{ agent.name }}
                </div>
                <!-- Connection Lines -->
                @if (agent.isActive) {
                <div
                  class="absolute top-1/2 left-1/2 w-32 h-0.5 bg-gradient-to-r from-purple-400/60 to-transparent -translate-y-0.5 origin-left workflow-connection"
                ></div>
                }
              </div>
              }

              <!-- Central Hub -->
              <div
                class="w-32 h-32 rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-purple-800 border-4 border-white/30 shadow-2xl flex items-center justify-center relative hub-pulse"
              >
                <div class="text-2xl">🧠</div>
                <!-- Pulse Rings -->
                <div
                  class="absolute inset-0 rounded-full border-2 border-purple-400/50 scale-110 pulse-ring"
                ></div>
                <div
                  class="absolute inset-0 rounded-full border-2 border-pink-400/30 scale-125 pulse-ring"
                  style="animation-delay: 0.5s"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Workflow Visualization Layer -->
        <div class="absolute inset-0 z-20 pointer-events-none">
          <!-- Data Flow Particles -->
          @for (particle of dataParticles(); track particle.id) {
          <div
            [style.left.px]="particle.x"
            [style.top.px]="particle.y"
            class="absolute w-2 h-2 bg-blue-400 rounded-full opacity-60 data-particle"
            [style.animation-delay]="particle.delay + 's'"
          ></div>
          }
        </div>

        <!-- Multi-Agent Patterns Integration Panel -->
        <div class="absolute bottom-6 left-6 right-6 z-30">
          <div
            class="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6"
          >
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-white">
                Active Workflow Patterns
              </h3>
              <button
                routerLink="/multi-agent-patterns"
                class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium transition-colors duration-200"
              >
                Launch Pattern Designer
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              @for (pattern of activePatterns(); track pattern.id) {
              <div
                class="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-slate-200">{{
                    pattern.name
                  }}</span>
                  <div
                    class="w-2 h-2 rounded-full"
                    [class]="
                      pattern.status === 'active'
                        ? 'bg-green-400'
                        : pattern.status === 'pending'
                        ? 'bg-yellow-400'
                        : 'bg-red-400'
                    "
                  ></div>
                </div>
                <div class="text-xs text-slate-400">
                  {{ pattern.description }}
                </div>
                <div class="mt-2 flex items-center space-x-2">
                  @for (agent of pattern.agents; track agent) {
                  <div
                    class="w-6 h-6 rounded-full bg-purple-600/50 flex items-center justify-center text-xs"
                  >
                    {{ agent.charAt(0).toUpperCase() }}
                  </div>
                  }
                </div>
              </div>
              }
            </div>
          </div>
        </div>

        <!-- Selected Agent Details -->
        @if (selectedAgent()) {
        <div class="absolute top-24 right-6 z-40 w-80">
          <div
            class="bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 p-6"
          >
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-white">
                {{ selectedAgent()?.name }}
              </h3>
              <button
                (click)="selectedAgent.set(null)"
                class="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div class="space-y-3 text-sm">
              <div>
                <span class="text-slate-400">Type:</span>
                <span class="ml-2 text-white">{{ selectedAgent()?.type }}</span>
              </div>
              <div>
                <span class="text-slate-400">Status:</span>
                <span
                  class="ml-2 px-2 py-1 rounded text-xs"
                  [class]="
                    selectedAgent()?.isActive
                      ? 'bg-green-900/50 text-green-300'
                      : 'bg-slate-700/50 text-slate-300'
                  "
                >
                  {{ selectedAgent()?.isActive ? 'Active' : 'Idle' }}
                </span>
              </div>
              <div>
                <span class="text-slate-400">Capabilities:</span>
                <div class="mt-1 flex flex-wrap gap-1">
                  @for (capability of selectedAgent()?.capabilities; track
                  capability) {
                  <span
                    class="px-2 py-1 bg-purple-900/50 text-purple-300 rounded text-xs"
                    >{{ capability }}</span
                  >
                  }
                </div>
              </div>
              <div class="pt-3 border-t border-slate-700">
                <button
                  class="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  Configure Agent
                </button>
              </div>
            </div>
          </div>
        </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .agent-orbit {
        animation: float 6s ease-in-out infinite;
      }

      .workflow-connection {
        animation: data-flow 2s linear infinite;
      }

      .hub-pulse {
        animation: hub-glow 3s ease-in-out infinite;
      }

      .pulse-ring {
        animation: pulse-expand 2s ease-out infinite;
      }

      .data-particle {
        animation: particle-flow 4s linear infinite;
      }

      @keyframes float {
        0%,
        100% {
          transform: translateY(0px) rotate(0deg);
        }
        50% {
          transform: translateY(-10px) rotate(180deg);
        }
      }

      @keyframes data-flow {
        0% {
          transform: scaleX(0);
          opacity: 0;
        }
        50% {
          opacity: 1;
        }
        100% {
          transform: scaleX(1);
          opacity: 0;
        }
      }

      @keyframes hub-glow {
        0%,
        100% {
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
        }
        50% {
          box-shadow: 0 0 40px rgba(236, 72, 153, 0.8);
        }
      }

      @keyframes pulse-expand {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(1.5);
          opacity: 0;
        }
      }

      @keyframes particle-flow {
        0% {
          transform: translateX(-100px) translateY(0);
          opacity: 0;
        }
        10% {
          opacity: 1;
        }
        90% {
          opacity: 1;
        }
        100% {
          transform: translateX(100px) translateY(-20px);
          opacity: 0;
        }
      }
    `,
  ],
})
export class WorkflowCanvasComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly showcaseApi = inject(ShowcaseApiService);

  // Signals for reactive state management
  dimensions = signal([
    { id: 'canvas', name: 'Canvas', icon: '🎨', route: '/canvas' },
    { id: 'spatial', name: 'Spatial', icon: '🌌', route: '/spatial' },
    { id: 'memory', name: 'Memory', icon: '🧠', route: '/memory' },
    { id: 'forge', name: 'Forge', icon: '⚡', route: '/forge' },
    { id: 'chat', name: 'Chat', icon: '💬', route: '/chat' },
    {
      id: 'patterns',
      name: 'Patterns',
      icon: '🔗',
      route: '/multi-agent-patterns',
    },
  ]);

  hoveredDimension = signal<string | null>(null);
  selectedAgent = signal<any>(null);
  activeAgentCount = signal(0);

  // Real agents from showcase API
  orbitalAgents = signal<
    Array<{
      id: string;
      name: string;
      type: string;
      icon: string;
      isActive: boolean;
      capabilities: string[];
      priority: string;
      tools: string[];
    }>
  >([]);

  // System status
  systemStatus = signal<ShowcaseSystemStatus | null>(null);

  activePatterns = signal([
    {
      id: 'content-pipeline',
      name: 'Content Pipeline',
      description: 'Automated content creation workflow',
      status: 'active',
      agents: ['analyzer', 'content'],
    },
    {
      id: 'brand-analysis',
      name: 'Brand Analysis',
      description: 'Comprehensive brand intelligence',
      status: 'pending',
      agents: ['brand', 'research'],
    },
    {
      id: 'github-insights',
      name: 'GitHub Insights',
      description: 'Repository analysis and reporting',
      status: 'active',
      agents: ['analyzer'],
    },
  ]);

  dataParticles = signal([
    { id: 1, x: 100, y: 200, delay: 0 },
    { id: 2, x: 150, y: 300, delay: 0.5 },
    { id: 3, x: 200, y: 250, delay: 1 },
    { id: 4, x: 250, y: 350, delay: 1.5 },
  ]);

  constructor() {
    // Reactive effects for dynamic updates
    effect(() => {
      const agents = this.orbitalAgents();
      const activeCount = agents.filter((agent) => agent.isActive).length;
      this.activeAgentCount.set(activeCount);
    });
  }

  ngOnInit() {
    this.startDataFlowAnimation();
    this.loadRealAgents();
    this.startSystemStatusPolling();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getDimensionButtonClass(dimensionId: string): string {
    const isActive = dimensionId === 'canvas';
    const isHovered = this.hoveredDimension() === dimensionId;

    if (isActive) {
      return 'bg-purple-600 text-white shadow-lg shadow-purple-500/25';
    }
    if (isHovered) {
      return 'bg-white/10 text-white';
    }
    return 'text-slate-300 hover:text-white hover:bg-white/5';
  }

  getAgentPosition(index: number, total: number): string {
    const angle = (index * 360) / total;
    const radius = 120;
    const x = Math.cos((angle * Math.PI) / 180) * radius;
    const y = Math.sin((angle * Math.PI) / 180) * radius;
    return `translate(${x}px, ${y}px)`;
  }

  getAnimationDelay(index: number): string {
    return `${index * 0.2}s`;
  }

  getAgentGradient(type: string): string {
    switch (type) {
      case 'data':
        return 'from-blue-600 to-cyan-600';
      case 'creative':
        return 'from-purple-600 to-pink-600';
      case 'strategic':
        return 'from-green-600 to-emerald-600';
      case 'intelligence':
        return 'from-orange-600 to-red-600';
      case 'basic':
        return 'from-slate-600 to-blue-600';
      case 'coordination':
        return 'from-indigo-600 to-purple-600';
      default:
        return 'from-gray-600 to-slate-600';
    }
  }

  selectAgent(agent: any) {
    this.selectedAgent.set(agent);
  }

  /**
   * Load real agents from showcase API
   */
  private loadRealAgents(): void {
    this.showcaseApi
      .getAvailableAgents()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (agents: ShowcaseAgent[]) => {
          const mappedAgents = agents.map((agent) => ({
            id: agent.id,
            name: agent.name,
            type: this.mapAgentTypeToVisualType(agent.metadata.category),
            icon: this.getAgentIcon(
              agent.metadata.category,
              agent.capabilities
            ),
            isActive: false, // Will be updated by system status
            capabilities: agent.capabilities,
            priority: agent.priority,
            tools: agent.tools,
          }));

          this.orbitalAgents.set(mappedAgents);
          console.log('Loaded real agents from showcase API:', mappedAgents);
        },
        error: (error: any) => {
          console.error('Failed to load agents:', error);
          // Fallback to mock agents if API fails
          this.loadFallbackAgents();
        },
      });
  }

  /**
   * Start polling system status for real-time updates
   */
  private startSystemStatusPolling(): void {
    // Initial fetch
    this.fetchSystemStatus();

    // Poll every 3 seconds
    setInterval(() => {
      this.fetchSystemStatus();
    }, 3000);
  }

  /**
   * Fetch current system status
   */
  private fetchSystemStatus(): void {
    this.showcaseApi
      .getSystemStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status: ShowcaseSystemStatus) => {
          this.systemStatus.set(status);
          this.updateAgentActivityStatus(status);
        },
        error: (error: any) => {
          console.error('Failed to fetch system status:', error);
        },
      });
  }

  /**
   * Update agent activity based on system status
   */
  private updateAgentActivityStatus(status: ShowcaseSystemStatus): void {
    const updatedAgents = this.orbitalAgents().map((agent) => ({
      ...agent,
      isActive:
        status.agents[agent.id] === 'active' ||
        status.agents[agent.id] === 'busy',
    }));

    this.orbitalAgents.set(updatedAgents);
  }

  /**
   * Map agent category to visual type
   */
  private mapAgentTypeToVisualType(category: string): string {
    switch (category.toLowerCase()) {
      case 'demo':
      case 'basic':
        return 'basic';
      case 'enterprise-demonstration':
      case 'advanced':
        return 'strategic';
      case 'specialist':
        return 'intelligence';
      case 'streaming':
        return 'creative';
      case 'hitl':
        return 'coordination';
      default:
        return 'data';
    }
  }

  /**
   * Get appropriate icon for agent
   */
  private getAgentIcon(category: string, capabilities: string[]): string {
    // Check capabilities first
    if (capabilities.includes('analysis')) return '📊';
    if (
      capabilities.includes('generation') ||
      capabilities.includes('content-generation')
    )
      return '✍️';
    if (capabilities.includes('streaming')) return '📡';
    if (capabilities.includes('approval')) return '✅';
    if (capabilities.includes('memory')) return '🧠';
    if (capabilities.includes('web-research')) return '🔍';
    if (capabilities.includes('tools')) return '🔧';

    // Fallback to category
    switch (category.toLowerCase()) {
      case 'demo':
        return '🚀';
      case 'enterprise-demonstration':
        return '💼';
      case 'specialist':
        return '⚡';
      case 'streaming':
        return '📡';
      case 'hitl':
        return '✅';
      default:
        return '🤖';
    }
  }

  /**
   * Fallback agents if API fails
   */
  private loadFallbackAgents(): void {
    const fallbackAgents = [
      {
        id: 'demo-showcase',
        name: 'Demo Showcase',
        type: 'basic',
        icon: '🚀',
        isActive: true,
        capabilities: ['analysis'],
        priority: 'medium',
        tools: ['analysis'],
      },
      {
        id: 'advanced-showcase',
        name: 'Advanced Showcase',
        type: 'strategic',
        icon: '💼',
        isActive: false,
        capabilities: ['generation', 'streaming'],
        priority: 'high',
        tools: ['advanced-analyzer'],
      },
      {
        id: 'specialist-showcase',
        name: 'Specialist',
        type: 'intelligence',
        icon: '⚡',
        isActive: true,
        capabilities: ['memory', 'tools'],
        priority: 'high',
        tools: ['memory-manager'],
      },
    ];
    this.orbitalAgents.set(fallbackAgents);
  }

  private startDataFlowAnimation() {
    // Simulate real-time data flow particles
    setInterval(() => {
      const newParticles = Array.from({ length: 4 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        delay: Math.random() * 2,
      }));
      this.dataParticles.set(newParticles);
    }, 3000);
  }
}
