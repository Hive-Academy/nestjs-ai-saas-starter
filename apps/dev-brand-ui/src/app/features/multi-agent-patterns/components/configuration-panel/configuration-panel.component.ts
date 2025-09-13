import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatternDemo } from '../pattern-selector/pattern-selector.component';

export interface PatternConfig {
  inputQuery: string;
  agentCount: number;
  complexityLevel: 'low' | 'medium' | 'high';
  demonstrationMode: 'basic' | 'advanced' | 'enterprise';
}

@Component({
  selector: 'brand-configuration-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-6"
    >
      <div
        class="flex justify-between items-center mb-5 pb-3 border-b border-white/15"
      >
        <h3 class="m-0 text-xl font-semibold text-white">⚙️ Configuration</h3>
        <div
          class="px-3 py-1.5 rounded-2xl text-sm font-medium"
          [class]="getStatusClass(executionStatus())"
        >
          {{ getStatusText(executionStatus()) }}
        </div>
      </div>

      <div class="mb-8">
        <div class="mb-4">
          <label
            for="input"
            class="block mb-1.5 font-medium text-sm text-white/90"
            >Input Query:</label
          >
          <textarea
            id="input"
            [(ngModel)]="inputQuery"
            placeholder="Enter your query to demonstrate the selected pattern..."
            rows="3"
            class="w-full px-3 py-2.5 border border-white/20 rounded-lg bg-white/10 text-white text-sm placeholder:text-white/50 focus:outline-none focus:border-white/40"
          ></textarea>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div class="form-group">
            <label
              for="agentCount"
              class="block mb-1.5 font-medium text-sm text-white/90"
              >Agent Count:</label
            >
            <select
              id="agentCount"
              [(ngModel)]="agentCount"
              class="w-full px-3 py-2.5 border border-white/20 rounded-lg bg-white/10 text-white text-sm"
            >
              <option value="2">2 Agents</option>
              <option value="3">3 Agents</option>
              <option value="4">4 Agents</option>
              <option value="5">5 Agents</option>
            </select>
          </div>

          <div class="form-group">
            <label
              for="complexity"
              class="block mb-1.5 font-medium text-sm text-white/90"
              >Complexity:</label
            >
            <select
              id="complexity"
              [(ngModel)]="complexityLevel"
              class="w-full px-3 py-2.5 border border-white/20 rounded-lg bg-white/10 text-white text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div class="form-group">
            <label
              for="mode"
              class="block mb-1.5 font-medium text-sm text-white/90"
              >Demo Mode:</label
            >
            <select
              id="mode"
              [(ngModel)]="demonstrationMode"
              class="w-full px-3 py-2.5 border border-white/20 rounded-lg bg-white/10 text-white text-sm"
            >
              <option value="basic">Basic</option>
              <option value="advanced">Advanced</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>

        <button
          class="w-full px-5 py-3.5 bg-gradient-to-r from-green-500 to-green-600 border-none rounded-xl text-white text-base font-semibold cursor-pointer transition-all duration-300 flex items-center justify-center gap-2.5 mt-6 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(34,197,94,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
          [disabled]="isExecuting() || !inputQuery().trim()"
          (click)="onExecute()"
        >
          @if (isExecuting()) {
          <span
            class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
          ></span>
          Executing... } @else {
          <span class="text-lg">🚀</span>
          Execute {{ getPatternName() }}
          }
        </button>
      </div>

      <!-- Pattern Information -->
      @if (selectedPatternInfo(); as info) {
      <div class="bg-white/5 rounded-lg p-4">
        <h4 class="m-0 mb-3 text-lg font-semibold text-white">
          {{ info.name }} Pattern Details
        </h4>

        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="flex justify-between items-center">
            <span class="text-sm text-white/80">Complexity:</span>
            <span
              class="px-2 py-1 rounded-xl text-xs font-medium"
              [class]="getComplexityClass(info.complexity)"
            >
              {{ info.complexity }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-white/80">Optimal Agents:</span>
            <span class="text-white">{{ info.agentCount }}</span>
          </div>
        </div>

        <div class="mb-3">
          <h5 class="text-sm font-semibold text-white/90 mb-1.5">Use Cases:</h5>
          <ul class="m-0 pl-4 text-xs text-white/80">
            @for (useCase of info.useCases; track useCase) {
            <li class="mb-1">{{ useCase }}</li>
            }
          </ul>
        </div>

        <div>
          <h5 class="text-sm font-semibold text-white/90 mb-1.5">
            Key Advantages:
          </h5>
          <ul class="m-0 pl-4 text-xs text-white/80">
            @for (advantage of info.advantages; track advantage) {
            <li class="mb-1">{{ advantage }}</li>
            }
          </ul>
        </div>
      </div>
      }
    </div>
  `,
})
export class ConfigurationPanelComponent {
  selectedPatternInfo = input<PatternDemo | undefined>();
  executionStatus = input<'idle' | 'running' | 'completed' | 'error'>('idle');
  isExecuting = input<boolean>(false);

  configurationExecuted = output<PatternConfig>();

  inputQuery = signal(
    'Analyze my GitHub repositories and create a comprehensive personal brand strategy with multi-platform content'
  );
  agentCount = signal(3);
  complexityLevel = signal<'low' | 'medium' | 'high'>('medium');
  demonstrationMode = signal<'basic' | 'advanced' | 'enterprise'>('advanced');

  onExecute(): void {
    if (!this.inputQuery().trim() || this.isExecuting()) return;

    const config: PatternConfig = {
      inputQuery: this.inputQuery(),
      agentCount: this.agentCount(),
      complexityLevel: this.complexityLevel(),
      demonstrationMode: this.demonstrationMode(),
    };

    this.configurationExecuted.emit(config);
  }

  getPatternName(): string {
    const pattern = this.selectedPatternInfo();
    return pattern ? pattern.name : 'Pattern';
  }

  getStatusClass(status: string): string {
    const classes = {
      idle: 'bg-gray-500/20 text-gray-400',
      running: 'bg-yellow-500/20 text-yellow-500 animate-pulse',
      completed: 'bg-green-500/20 text-green-400',
      error: 'bg-red-500/20 text-red-400',
    };
    return classes[status as keyof typeof classes] || classes.idle;
  }

  getStatusText(status: string): string {
    const statusMap = {
      idle: '⚪ Ready to Execute',
      running: '🟡 Executing...',
      completed: '🟢 Completed',
      error: '🔴 Error Occurred',
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.idle;
  }

  getComplexityClass(complexity: string): string {
    const classes = {
      low: 'bg-green-500/20 text-green-400',
      medium: 'bg-yellow-500/20 text-yellow-500',
      high: 'bg-red-500/20 text-red-400',
    };
    return classes[complexity as keyof typeof classes] || classes.medium;
  }
}
