import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'brand-streaming-output',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isExecuting() || streamingOutput()) {
    <div class="bg-white/5 rounded-2xl p-5 mb-8 border border-white/10">
      <div class="flex justify-between items-center mb-5">
        <h3 class="m-0 font-semibold text-white">
          🌊 Real-time Agent Conversation
        </h3>
        <div class="flex items-center gap-2 text-sm text-white/80">
          <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span>Streaming...</span>
        </div>
      </div>

      <div class="bg-black/30 rounded-lg p-5 max-h-[400px] overflow-y-auto">
        <div
          class="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-white/90"
        >
          {{ streamingOutput() }}
          @if (isExecuting()) {
          <span class="animate-pulse font-bold text-green-500">▊</span>
          }
        </div>
      </div>
    </div>
    }
  `,
})
export class StreamingOutputComponent {
  isExecuting = input<boolean>(false);
  streamingOutput = input<string>('');
}
