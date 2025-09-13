import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'brand-websocket-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed bottom-5 right-5 flex items-center gap-2 px-4 py-2 rounded-2xl text-sm backdrop-blur-sm border border-white/20"
      [class]="getStatusClass(status())"
    >
      <span class="w-2 h-2 rounded-full bg-current"></span>
      <span>{{ getStatusText(status()) }}</span>
    </div>
  `,
})
export class WebSocketStatusComponent {
  status = input<string>('connecting');

  getStatusClass(status: string): string {
    const classes = {
      connected: 'bg-green-500/20 text-green-400',
      connecting: 'bg-yellow-500/20 text-yellow-500',
      disconnected: 'bg-red-500/20 text-red-400',
    };
    return classes[status as keyof typeof classes] || classes.connecting;
  }

  getStatusText(status: string): string {
    const textMap = {
      connected: 'Real-time Connected',
      connecting: 'Connecting...',
      disconnected: 'Disconnected',
    };
    return textMap[status as keyof typeof textMap] || 'Connecting...';
  }
}
