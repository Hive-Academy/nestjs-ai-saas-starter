import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PatternDemo {
  id: string;
  name: string;
  description: string;
  icon: string;
  complexity: 'low' | 'medium' | 'high';
  agentCount: number;
  useCases: string[];
  advantages: string[];
  visualizationType: '3d-network' | '2d-flow' | 'hierarchy';
}

@Component({
  selector: 'brand-pattern-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex justify-center gap-5 flex-wrap">
      @for (pattern of patterns(); track pattern.id) {
      <button
        class="flex items-center gap-3 px-6 py-4 bg-white/10 border border-white/20 rounded-xl text-white cursor-pointer transition-all duration-300 min-w-[200px] hover:bg-white/15 hover:-translate-y-0.5 data-[active=true]:bg-green-500/20 data-[active=true]:border-green-500/50 data-[active=true]:shadow-[0_0_20px_rgba(34,197,94,0.3)]"
        [attr.data-active]="selectedPattern() === pattern.id"
        (click)="onPatternSelect(pattern.id)"
      >
        <span class="text-3xl">{{ pattern.icon }}</span>
        <div class="text-left">
          <div class="font-semibold text-base">{{ pattern.name }}</div>
          <div class="text-sm opacity-80 mt-0.5">{{ pattern.description }}</div>
        </div>
      </button>
      }
    </div>
  `,
})
export class PatternSelectorComponent {
  patterns = input.required<PatternDemo[]>();
  selectedPattern = input.required<string>();
  patternSelected = output<string>();

  onPatternSelect(patternId: string) {
    this.patternSelected.emit(patternId);
  }
}
