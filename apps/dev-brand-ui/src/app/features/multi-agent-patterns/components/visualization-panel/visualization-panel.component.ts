import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ExecutionStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  agent?: string;
  progress: number;
  duration?: number;
  output?: string;
}

export interface ServiceCoordination {
  id: string;
  name: string;
  status: 'idle' | 'active' | 'completed' | 'error';
  description: string;
  progress: number;
  executionOrder: number;
}

@Component({
  selector: 'brand-visualization-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-6"
    >
      <div
        class="flex justify-between items-center mb-5 pb-3 border-b border-white/15"
      >
        <h3 class="m-0 text-xl font-semibold text-white">
          📊 Real-time Coordination Visualization
        </h3>
        <div class="flex gap-2">
          <button
            class="px-3 py-1.5 bg-white/10 border border-white/20 rounded-md text-white text-xs cursor-pointer transition-all duration-300 data-[active=true]:bg-green-500/20 data-[active=true]:border-green-500/50"
            [attr.data-active]="visualizationMode() === '2d'"
            (click)="onVisualizationModeChange('2d')"
          >
            2D Flow
          </button>
          <button
            class="px-3 py-1.5 bg-white/10 border border-white/20 rounded-md text-white text-xs cursor-pointer transition-all duration-300 data-[active=true]:bg-green-500/20 data-[active=true]:border-green-500/50"
            [attr.data-active]="visualizationMode() === '3d'"
            (click)="onVisualizationModeChange('3d')"
          >
            3D Network
          </button>
        </div>
      </div>

      <div
        class="min-h-[400px] bg-black/20 rounded-lg p-5 relative"
        [class]="'viz-' + visualizationMode()"
      >
        @if (!currentExecution() && !isExecuting()) {
        <div
          class="flex flex-col items-center justify-center h-full text-center opacity-60"
        >
          <div class="text-5xl mb-4">🎭</div>
          <h4 class="m-0 mb-2 text-xl font-semibold text-white">
            Ready for Pattern Demonstration
          </h4>
          <p class="m-0 text-sm text-white/80">
            Configure and execute a pattern to see real-time agent coordination
          </p>
        </div>
        } @else {
        <!-- Agent Network Visualization -->
        <div
          class="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 mb-6"
        >
          @for (step of executionSteps(); track step.id) {
          <div
            class="bg-white/10 border border-white/20 rounded-lg p-3 transition-all duration-300"
            [class]="getNodeStatusClass(step.status)"
          >
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xl">🤖</span>
              <span class="flex-1 font-medium text-sm text-white">{{
                step.name
              }}</span>
              <div
                class="px-1.5 py-0.5 rounded-2xl text-xs text-white/90 font-medium capitalize"
                [class]="getStatusBadgeClass(step.status)"
              >
                {{ step.status }}
              </div>
            </div>

            @if (step.status === 'running' || step.status === 'completed') {
            <div class="h-1 bg-white/20 rounded-sm overflow-hidden mb-1.5">
              <div
                class="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                [style.width.%]="step.progress"
              ></div>
            </div>
            <div class="text-xs text-center text-white/80 mb-2">
              {{ step.progress }}%
            </div>
            } @if (step.output) {
            <div
              class="bg-black/20 p-2 rounded text-xs text-white/90 font-mono mb-1.5"
            >
              {{ step.output }}
            </div>
            } @if (step.duration) {
            <div class="text-xs text-center text-white/70">
              ⏱️ {{ step.duration }}ms
            </div>
            }
          </div>
          }
        </div>

        <!-- Service Coordination Visualization -->
        <div class="bg-white/5 rounded-xl p-6 mb-6 border border-white/15">
          <h4 class="text-white mb-4 font-semibold">
            🔧 Service Coordination Layer
          </h4>

          <div
            class="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 mb-4"
          >
            @for (service of serviceCoordination(); track service.id) {
            <div
              class="bg-white/5 p-4 rounded-lg border-2 border-white/20 transition-all duration-300"
              [class]="getServiceStatusClass(service.status)"
            >
              <div class="flex items-center gap-3 mb-3">
                <span
                  class="bg-gradient-to-r from-indigo-500 to-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                >
                  {{ service.executionOrder }}
                </span>
                <span class="font-semibold text-white flex-1">{{
                  service.name
                }}</span>
                <span
                  class="px-2 py-0.5 rounded-xl text-xs font-medium uppercase"
                  [class]="getServiceStatusBadgeClass(service.status)"
                >
                  {{ service.status }}
                </span>
              </div>

              <div class="text-white/80 text-sm leading-relaxed mb-4">
                {{ service.description }}
              </div>

              @if (service.status === 'active' || service.status ===
              'completed') {
              <div class="flex items-center gap-3">
                <div
                  class="flex-1 h-1.5 bg-white/20 rounded-sm overflow-hidden"
                >
                  <div
                    class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                    [style.width.%]="service.progress"
                  ></div>
                </div>
                <span class="text-sm font-medium text-white min-w-[40px]"
                  >{{ service.progress }}%</span
                >
              </div>
              } @if (service.status === 'active') {
              <div class="text-center mt-3">
                <span class="text-blue-400 text-sm font-medium"
                  >🔄 Processing...</span
                >
              </div>
              }
            </div>
            }
          </div>

          <!-- Service Flow Arrows -->
          <div class="flex justify-center items-center gap-8 mt-4">
            @for (service of serviceCoordination(); track service.id; let i =
            $index) { @if (i < serviceCoordination().length - 1) {
            <div
              class="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 border-2 border-white/30 transition-all duration-300"
              [class]="
                service.status === 'completed' || service.status === 'active'
                  ? 'bg-blue-500/20 border-blue-500/50'
                  : ''
              "
            >
              <span
                class="text-xl font-bold"
                [class]="
                  service.status === 'completed' || service.status === 'active'
                    ? 'text-blue-400'
                    : 'text-white/60'
                "
              >
                →
              </span>
            </div>
            } }
          </div>
        </div>

        <!-- Pattern Flow Connections -->
        @if (selectedPattern() === 'supervisor') {
        <div class="supervisor-connections bg-white/5 rounded-lg p-4">
          <div class="text-center text-white font-medium mb-2">
            Supervisor Coordination
          </div>
          @for (step of executionSteps().slice(1); track step.id) {
          <div
            class="h-1 mx-8 mb-2 rounded-sm transition-all duration-300"
            [class]="
              step.status === 'completed' || step.status === 'running'
                ? 'bg-green-500'
                : 'bg-white/20'
            "
          ></div>
          }
        </div>
        } @if (selectedPattern() === 'swarm') {
        <div class="swarm-connections bg-white/5 rounded-lg p-4">
          <div class="text-center text-white font-medium mb-4">
            Swarm Network Topology
          </div>
          <div class="grid grid-cols-2 gap-2">
            @for (step of executionSteps(); track step.id; let i = $index) {
            @for (otherStep of executionSteps(); track otherStep.id; let j =
            $index) { @if (i !== j && i < j) {
            <div
              class="h-0.5 rounded-sm transition-all duration-300"
              [class]="
                (step.status === 'completed' &&
                  otherStep.status === 'completed') ||
                step.status === 'running' ||
                otherStep.status === 'running'
                  ? 'bg-purple-500'
                  : 'bg-white/20'
              "
            ></div>
            } } }
          </div>
        </div>
        } }
      </div>
    </div>
  `,
})
export class VisualizationPanelComponent {
  visualizationMode = input<'2d' | '3d'>('2d');
  currentExecution = input<any>(null);
  isExecuting = input<boolean>(false);
  executionSteps = input<ExecutionStep[]>([]);
  serviceCoordination = input<ServiceCoordination[]>([]);
  selectedPattern = input<string>('supervisor');

  onVisualizationModeChange(mode: '2d' | '3d'): void {
    // This would typically emit an event to parent component
    // For now, we'll handle it internally or leave for parent to manage
  }

  getNodeStatusClass(status: string): string {
    const classes = {
      running:
        'border-yellow-500/50 bg-yellow-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]',
      completed: 'border-green-500/50 bg-green-500/10',
      error: 'border-red-500/50 bg-red-500/10',
    };
    return classes[status as keyof typeof classes] || '';
  }

  getStatusBadgeClass(status: string): string {
    const classes = {
      pending: 'bg-gray-500/20 text-gray-400',
      running: 'bg-yellow-500/20 text-yellow-500',
      completed: 'bg-green-500/20 text-green-400',
      error: 'bg-red-500/20 text-red-400',
    };
    return classes[status as keyof typeof classes] || classes.pending;
  }

  getServiceStatusClass(status: string): string {
    const classes = {
      idle: 'border-gray-500/50',
      active:
        'border-blue-500/70 bg-blue-500/10 shadow-[0_4px_20px_rgba(59,130,246,0.2)] animate-pulse',
      completed: 'border-green-500/70 bg-green-500/10',
      error: 'border-red-500/70 bg-red-500/10',
    };
    return classes[status as keyof typeof classes] || classes.idle;
  }

  getServiceStatusBadgeClass(status: string): string {
    const classes = {
      idle: 'bg-gray-500/20 text-gray-400',
      active: 'bg-blue-500/20 text-blue-400',
      completed: 'bg-green-500/20 text-green-400',
      error: 'bg-red-500/20 text-red-400',
    };
    return classes[status as keyof typeof classes] || classes.idle;
  }
}
