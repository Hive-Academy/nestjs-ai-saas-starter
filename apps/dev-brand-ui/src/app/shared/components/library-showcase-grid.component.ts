/**
 * LibraryShowcaseGrid Component
 *
 * Responsive grid for library cards with progressive disclosure.
 * Designed for 12-library showcase with flexible column layouts.
 *
 * Design System: Light theme with responsive breakpoints
 * - 1 column (mobile < 768px)
 * - 2 columns (tablet 768px-1024px)
 * - 3 columns (desktop 1024px+)
 *
 * Usage:
 * ```html
 * <app-library-showcase-grid
 *   [libraries]="libraries()"
 *   [columns]="2"
 * />
 * ```
 */

import { CommonModule } from '@angular/common';
import { Component, input, computed } from '@angular/core';
import { LibraryShowcaseCardComponent } from './library-showcase-card.component';

export interface LibraryCard {
  icon: string;
  packageName: string; // @hive-academy/package-name
  businessValue: string; // "Build RAG applications in minutes"
  description: string;
  capabilities: string[];
  metric: { value: string; label: string };
  ctaText?: string;
  slug: string; // For routing to detail pages
}

@Component({
  selector: 'app-library-showcase-grid',
  standalone: true,
  imports: [CommonModule, LibraryShowcaseCardComponent],
  template: `
    <div [class]="gridClasses()">
      @for (library of libraries(); track library.packageName) {
      <app-library-showcase-card
        [icon]="library.icon"
        [packageName]="library.packageName"
        [title]="library.businessValue"
        [description]="library.description"
        [capabilities]="library.capabilities"
        [metric]="library.metric"
        [ctaText]="library.ctaText || 'Learn more'"
        (cardClick)="onLibraryClick(library.slug)"
      />
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
export class LibraryShowcaseGridComponent {
  readonly libraries = input.required<LibraryCard[]>();
  readonly columns = input<1 | 2 | 3>(2); // Responsive columns

  readonly gridClasses = computed(() => {
    const colMap: Record<number, string> = {
      1: 'grid grid-cols-1 gap-8',
      2: 'grid grid-cols-1 md:grid-cols-2 gap-8',
      3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8',
    };
    return colMap[this.columns()] || colMap[2];
  });

  onLibraryClick(slug: string): void {
    console.log('Navigate to library:', slug);
    // Future: Implement routing to library detail page
  }
}
