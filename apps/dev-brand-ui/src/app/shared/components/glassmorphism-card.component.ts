/**
 * GlassmorphismCard Component
 *
 * Reusable glassmorphism card component following the hero section badge pattern.
 * Provides consistent styling across all landing page sections with support for
 * multiple color schemes, metrics, features lists, and status badges.
 *
 * Pattern Source: hero-section.component.ts:76-89 (badge cards with hover effects)
 * Design System: Extracted from hero section glassmorphism patterns
 *
 * Usage:
 * ```html
 * <app-glassmorphism-card
 *   icon="🔍"
 *   title="ChromaDB Integration"
 *   description="Enterprise-grade vector search"
 *   color="purple"
 *   [metric]="{ label: 'Code Reduction', value: '90% Less Code' }"
 *   [features]="['Multi-provider embeddings', 'Built-in multi-tenancy']"
 *   statusBadge="Alpha"
 *   (cardClick)="onExplore()"
 * />
 * ```
 */

import { CommonModule } from '@angular/common';
import { Component, input, output, computed } from '@angular/core';

@Component({
  selector: 'app-glassmorphism-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      [class]="cardClasses()"
      [style.borderColor]="borderColor()"
      [style.boxShadow]="shadowStyle()"
      (click)="onCardClick()"
      (keyup)="onCardClick()"
      role="button"
      tabindex="0"
      class="group px-6 py-4 rounded-xl backdrop-blur-sm border
             transform transition-all duration-300 hover:scale-105 hover:-translate-y-2
             cursor-pointer"
    >
      <!-- Icon (emoji or custom) -->
      @if (icon()) {
      <div
        class="text-4xl mb-3 transition-transform duration-300 group-hover:scale-110"
      >
        {{ icon() }}
      </div>
      }

      <!-- Title -->
      <h3 class="text-xl font-bold text-white mb-2">{{ title() }}</h3>

      <!-- Description -->
      <p class="text-gray-300 text-sm leading-relaxed mb-3">
        {{ description() }}
      </p>

      <!-- Business Metric (optional) -->
      @if (metric()) {
      <div class="mt-3 pt-3 border-t border-white/10">
        <div
          class="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
        >
          {{ metric()!.value }}
        </div>
        <div class="text-xs text-gray-400 mt-1">{{ metric()!.label }}</div>
      </div>
      }

      <!-- Features List (optional) -->
      @if (features().length > 0) {
      <ul class="mt-3 space-y-1">
        @for (feature of features(); track feature) {
        <li class="text-xs text-gray-400 flex items-center gap-2">
          <span class="text-green-400">✓</span>
          {{ feature }}
        </li>
        }
      </ul>
      }

      <!-- Status Badge (optional) -->
      @if (statusBadge()) {
      <div class="mt-3">
        <span [class]="statusBadgeClasses()">
          {{ statusBadge() }}
        </span>
      </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class GlassmorphismCardComponent {
  // Configuration inputs
  readonly icon = input<string>(''); // Emoji or icon
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly color = input<string>('purple'); // purple, pink, cyan, green, orange, blue, gold
  readonly metric = input<{ label: string; value: string } | null>(null);
  readonly features = input<string[]>([]);
  readonly statusBadge = input<string>(''); // Alpha, Beta, Planning, Prototype

  // Output events
  readonly cardClick = output<void>();

  // Computed classes based on color
  readonly cardClasses = computed(() => {
    const colorMap: Record<string, string> = {
      purple: 'bg-purple-600/30 border-purple-400/30',
      pink: 'bg-pink-600/30 border-pink-400/30',
      cyan: 'bg-cyan-600/30 border-cyan-400/30',
      green: 'bg-green-600/30 border-green-400/30',
      orange: 'bg-orange-600/30 border-orange-400/30',
      blue: 'bg-blue-600/30 border-blue-400/30',
      gold: 'bg-yellow-600/30 border-yellow-400/30',
    };
    return colorMap[this.color()] || colorMap['purple'];
  });

  readonly borderColor = computed(() => {
    const colorMap: Record<string, string> = {
      purple: 'rgba(168, 85, 247, 0.3)',
      pink: 'rgba(236, 72, 153, 0.3)',
      cyan: 'rgba(6, 182, 212, 0.3)',
      green: 'rgba(34, 197, 94, 0.3)',
      orange: 'rgba(245, 158, 11, 0.3)',
      blue: 'rgba(59, 130, 246, 0.3)',
      gold: 'rgba(255, 215, 0, 0.3)',
    };
    return colorMap[this.color()] || colorMap['purple'];
  });

  readonly shadowStyle = computed(() => {
    const colorMap: Record<string, string> = {
      purple: '0 10px 30px rgba(168, 85, 247, 0.2)',
      pink: '0 10px 30px rgba(236, 72, 153, 0.2)',
      cyan: '0 10px 30px rgba(6, 182, 212, 0.2)',
      green: '0 10px 30px rgba(34, 197, 94, 0.2)',
      orange: '0 10px 30px rgba(245, 158, 11, 0.2)',
      blue: '0 10px 30px rgba(59, 130, 246, 0.2)',
      gold: '0 10px 30px rgba(255, 215, 0, 0.2)',
    };
    return colorMap[this.color()] || colorMap['purple'];
  });

  readonly statusBadgeClasses = computed(() => {
    const badge = this.statusBadge();
    const baseClasses = 'text-xs px-2 py-1 rounded-full font-semibold';
    if (badge === 'Alpha')
      return `${baseClasses} bg-green-500/20 text-green-300`;
    if (badge === 'Beta') return `${baseClasses} bg-blue-500/20 text-blue-300`;
    if (badge === 'Planning')
      return `${baseClasses} bg-yellow-500/20 text-yellow-300`;
    if (badge === 'Prototype')
      return `${baseClasses} bg-purple-500/20 text-purple-300`;
    return baseClasses;
  });

  onCardClick(): void {
    this.cardClick.emit();
  }
}
