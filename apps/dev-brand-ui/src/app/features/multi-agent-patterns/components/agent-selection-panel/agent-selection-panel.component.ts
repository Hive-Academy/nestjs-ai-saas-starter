import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShowcaseAgent } from '../../../../core/services/showcase-api.service';

@Component({
  selector: 'brand-agent-selection-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (agents().length > 0) {
    <div
      class="my-8 p-6 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-sm"
    >
      <h3 class="text-white mb-2 font-semibold">🤖 Real Agent Selection</h3>
      <p class="text-white/80 mb-6 text-sm">
        Select from actual @Agent decorated agents with real capabilities
      </p>

      <div
        class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 mb-4"
      >
        @for (agent of agents(); track agent.id) {
        <div
          class="bg-white/5 border-2 border-white/20 rounded-xl p-4 cursor-pointer transition-all duration-300 relative hover:border-green-500/50 hover:bg-green-500/10 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(34,197,94,0.2)] data-[selected=true]:border-green-500 data-[selected=true]:bg-green-500/15 data-[selected=true]:shadow-[0_8px_25px_rgba(34,197,94,0.3)]"
          [attr.data-selected]="isSelected(agent.id)"
          (click)="toggleSelection(agent.id)"
          (keypress)="toggleSelection(agent.id)"
          tabindex="0"
        >
          <div class="flex justify-between items-center mb-3">
            <div class="font-semibold text-white text-lg">{{ agent.name }}</div>
            <div
              class="px-2 py-1 rounded-xl text-xs font-semibold uppercase"
              [class]="getPriorityClass(agent.priority)"
            >
              {{ agent.priority }}
            </div>
          </div>

          <div class="text-white/80 text-sm mb-4 leading-relaxed">
            {{ agent.description }}
          </div>

          <div class="mb-4">
            @for (row of getMetadataRows(agent); track row.label) {
            <div class="flex justify-between mb-1">
              <span class="font-medium text-white/90 text-sm"
                >{{ row.label }}:</span
              >
              <span
                class="text-sm text-white/70"
                [class]="row.extraClass || ''"
              >
                {{ row.value }}
              </span>
            </div>
            }
          </div>

          <div class="mb-4">
            <h5
              class="text-xs font-semibold text-white/90 mb-2 uppercase tracking-wide"
            >
              Capabilities:
            </h5>
            <div class="flex flex-wrap gap-1">
              @for (capability of agent.capabilities; track capability) {
              <span
                class="text-xs px-2 py-1 rounded-xl font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30"
              >
                {{ capability }}
              </span>
              }
            </div>
          </div>

          <div class="mb-4">
            <h5
              class="text-xs font-semibold text-white/90 mb-2 uppercase tracking-wide"
            >
              Decorators Used:
            </h5>
            <div class="flex flex-wrap gap-1">
              @for (decorator of agent.metadata.decoratorsUsed; track decorator)
              {
              <span
                class="text-xs px-2 py-1 rounded-xl font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30"
              >
                {{ decorator }}
              </span>
              }
            </div>
          </div>

          @if (agent.metadata.enterpriseFeatures.length > 0) {
          <div class="mb-4">
            <h5
              class="text-xs font-semibold text-white/90 mb-2 uppercase tracking-wide"
            >
              Enterprise Features:
            </h5>
            <div class="flex flex-wrap gap-1">
              @for (feature of agent.metadata.enterpriseFeatures; track feature)
              {
              <span
                class="text-xs px-2 py-1 rounded-xl font-medium bg-green-500/20 text-green-400 border border-green-500/30"
              >
                {{ feature }}
              </span>
              }
            </div>
          </div>
          }

          <div class="text-center mt-4 pt-4 border-t border-white/20">
            @if (isSelected(agent.id)) {
            <span class="text-green-400 font-semibold text-sm">✓ Selected</span>
            } @else {
            <span class="text-white/60 text-sm">Click to select</span>
            }
          </div>
        </div>
        }
      </div>

      @if (selectedAgents().length > 0) {
      <div
        class="bg-green-500/10 p-4 rounded-xl border border-green-500/30 mt-4 text-white"
      >
        <strong>Selected Agents ({{ selectedAgents().length }}):</strong>
        @for (agentId of selectedAgents(); track agentId) {
        <span
          class="inline-block bg-green-500/30 text-green-400 px-2 py-1 m-1 rounded-xl text-xs font-medium border border-green-500/50"
        >
          {{ agentId }}
        </span>
        }
      </div>
      }
    </div>
    }
  `,
})
export class AgentSelectionPanelComponent {
  agents = input.required<ShowcaseAgent[]>();
  selectedAgents = input.required<string[]>();
  agentToggled = output<string>();

  isSelected(agentId: string): boolean {
    return this.selectedAgents().includes(agentId);
  }

  toggleSelection(agentId: string): void {
    this.agentToggled.emit(agentId);
  }

  getPriorityClass(priority: string): string {
    const classes = {
      high: 'bg-red-500/20 text-red-400 border border-red-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      low: 'bg-green-500/20 text-green-400 border border-green-500/30',
    };
    return classes[priority as keyof typeof classes] || classes.medium;
  }

  getMetadataRows(agent: ShowcaseAgent) {
    return [
      {
        label: 'Version',
        value: agent.metadata.version,
      },
      {
        label: 'Complexity',
        value: agent.metadata.complexity,
        extraClass: this.getComplexityClass(agent.metadata.complexity),
      },
    ];
  }

  getComplexityClass(complexity: string): string {
    const classes = {
      basic:
        'px-1.5 py-0.5 rounded-lg font-medium bg-green-500/20 text-green-400',
      advanced:
        'px-1.5 py-0.5 rounded-lg font-medium bg-yellow-500/20 text-yellow-400',
      enterprise:
        'px-1.5 py-0.5 rounded-lg font-medium bg-red-500/20 text-red-400',
    };
    return classes[complexity as keyof typeof classes] || classes.advanced;
  }
}
