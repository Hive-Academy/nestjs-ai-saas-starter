import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShowcaseWorkflowResponse } from '../../../../core/services/showcase-api.service';

@Component({
  selector: 'brand-execution-results',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (execution(); as exec) {
    <div
      class="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-6 mt-8"
    >
      <div
        class="flex justify-between items-center mb-5 pb-3 border-b border-white/15"
      >
        <h3 class="m-0 text-xl font-semibold text-white">
          📋 Execution Results
        </h3>
        <div class="flex gap-4 flex-wrap">
          <span
            class="flex items-center gap-1 px-3 py-1 bg-white/10 rounded-2xl text-xs text-white"
          >
            ⏱️ {{ exec.duration }}ms
          </span>
          <span
            class="flex items-center gap-1 px-3 py-1 bg-white/10 rounded-2xl text-xs text-white"
          >
            🎯 {{ exec.decoratorsShowcased.length }} Decorators
          </span>
          <span
            class="flex items-center gap-1 px-3 py-1 bg-white/10 rounded-2xl text-xs text-white"
          >
            ✨ {{ exec.enterpriseFeatures.length }} Features
          </span>
        </div>
      </div>

      <div class="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
        <div class="bg-white/5 rounded-lg p-4">
          <h4 class="m-0 mb-3 text-base font-semibold text-white/90">Output</h4>
          <div
            class="bg-black/20 p-3 rounded-md text-sm leading-relaxed text-white/90"
          >
            {{ exec.output }}
          </div>
        </div>

        <div class="bg-white/5 rounded-lg p-4">
          <h4 class="m-0 mb-3 text-base font-semibold text-white/90">
            Decorators Demonstrated
          </h4>
          <div class="flex flex-wrap gap-1.5">
            @for (decorator of exec.decoratorsShowcased; track decorator) {
            <span
              class="bg-green-500/20 text-green-400 px-2 py-1 rounded-xl text-xs font-medium"
            >
              {{ decorator }}
            </span>
            }
          </div>
        </div>

        <div class="bg-white/5 rounded-lg p-4">
          <h4 class="m-0 mb-3 text-base font-semibold text-white/90">
            Enterprise Features
          </h4>
          <div class="flex flex-wrap gap-1.5">
            @for (feature of exec.enterpriseFeatures; track feature) {
            <span
              class="bg-green-500/20 text-green-400 px-2 py-1 rounded-xl text-xs font-medium"
            >
              {{ feature }}
            </span>
            }
          </div>
        </div>

        <div class="bg-white/5 rounded-lg p-4">
          <h4 class="m-0 mb-3 text-base font-semibold text-white/90">
            Execution Path
          </h4>
          <div class="flex flex-wrap items-center gap-2">
            @for (step of exec.executionPath; track step; let i = $index) {
            <div
              class="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-2xl text-xs"
            >
              <span
                class="bg-green-500/30 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-xs font-semibold"
              >
                {{ i + 1 }}
              </span>
              <span>{{ step }}</span>
            </div>
            @if (i < exec.executionPath.length - 1) {
            <div class="text-white/60 text-xl">→</div>
            } }
          </div>
        </div>

        @if (exec.swarmResults) {
        <div class="bg-white/5 rounded-lg p-4 col-span-full">
          <h4 class="m-0 mb-3 text-base font-semibold text-white/90">
            Swarm Intelligence Metrics
          </h4>
          <div
            class="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3"
          >
            <div class="bg-white/10 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold leading-none text-green-400">
                {{ exec.swarmResults.peerCount }}
              </div>
              <div class="text-xs text-white/80 mt-1">Peer Agents</div>
            </div>
            <div class="bg-white/10 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold leading-none text-green-400">
                {{ (exec.swarmResults.consensusScore * 100).toFixed(1) }}%
              </div>
              <div class="text-xs text-white/80 mt-1">Consensus Score</div>
            </div>
            <div class="bg-white/10 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold leading-none text-green-400">
                {{ exec.swarmResults.emergentBehaviors }}
              </div>
              <div class="text-xs text-white/80 mt-1">Emergent Behaviors</div>
            </div>
            <div class="bg-white/10 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold leading-none text-green-400">
                {{
                  (exec.swarmResults.collectiveIntelligenceGain * 100).toFixed(
                    1
                  )
                }}%
              </div>
              <div class="text-xs text-white/80 mt-1">Intelligence Gain</div>
            </div>
          </div>
        </div>
        }
      </div>
    </div>
    }
  `,
})
export class ExecutionResultsComponent {
  execution = input<ShowcaseWorkflowResponse | null>(null);
}
