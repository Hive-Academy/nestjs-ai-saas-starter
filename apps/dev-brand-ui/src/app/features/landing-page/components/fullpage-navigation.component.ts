import { Component, inject, computed } from '@angular/core';
import { FullPageScrollService } from '../services/fullpage-scroll.service';

@Component({
  selector: 'brand-fullpage-navigation',
  standalone: true,
  imports: [],
  template: `
    <nav
      class="fixed right-5 top-1/2 -translate-y-1/2 z-[1000] opacity-0 invisible transition-all duration-300 select-none"
      [class.opacity-100]="isVisible()"
      [class.visible]="isVisible()"
      [class.pointer-events-auto]="isEnabled()"
    >
      <ul class="flex flex-col gap-4">
        @for (dot of navigationDots(); track trackByIndex($index)) {
        <li
          class="relative group"
          [class.active]="dot.isActive"
          [attr.data-section]="dot.sectionId"
          [title]="dot.label"
          (click)="navigateToSection(dot.index)"
          (keydown.enter)="navigateToSection(dot.index)"
          tabindex="0"
          role="button"
        >
          <button
            class="relative w-4 h-4 border-2 border-white/50 rounded-full bg-transparent cursor-pointer transition-all duration-300 hover:border-white hover:scale-125 focus:outline-none focus:ring-2 focus:ring-white/50"
            [class.bg-white]="dot.isActive"
            [class.border-white]="dot.isActive"
            [class.scale-125]="dot.isActive"
            [attr.aria-label]="'Navigate to ' + dot.label + ' section'"
            [attr.aria-current]="dot.isActive ? 'true' : null"
          >
            <span
              class="absolute inset-0.5 bg-white/30 rounded-full transition-all duration-300"
              [class.bg-white]="dot.isActive"
            ></span>
            <span
              class="absolute left-6 top-1/2 -translate-y-1/2 whitespace-nowrap bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none transition-all duration-300 group-hover:opacity-100"
            >
              {{ dot.label }}
            </span>
          </button>
        </li>
        }
      </ul>

      <!-- Section indicator -->
      <div class="mt-8 text-right text-white">
        <div class="text-sm font-medium opacity-90">
          {{ currentSectionLabel() }}
        </div>
        <div class="text-xs opacity-60 mt-1">
          {{ currentIndex() + 1 }} / {{ totalSections() }}
        </div>
      </div>

      <!-- Scroll hint for first visit -->
      <div
        class="absolute -bottom-16 right-0 flex flex-col items-center text-white opacity-0 transition-all duration-500"
        [class.opacity-100]="showScrollHint()"
      >
        <div class="mb-2 animate-bounce">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>
        <div class="text-xs text-center">Scroll or use arrows</div>
      </div>
    </nav>
  `,
  styles: [
    `
      /* Minimal styles for complex navigation interactions */
    `,
  ],
})
export class FullPageNavigationComponent {
  private readonly fullPageScrollService = inject(FullPageScrollService);

  readonly isVisible = computed(() => this.fullPageScrollService.isEnabled());
  readonly isEnabled = computed(() => this.fullPageScrollService.isEnabled());
  readonly navigationDots = computed(() =>
    this.fullPageScrollService.navigationDots()
  );
  readonly currentIndex = computed(() =>
    this.fullPageScrollService.currentSectionIndex()
  );
  readonly totalSections = computed(
    () => this.fullPageScrollService.sections().length
  );
  readonly currentSectionLabel = computed(() => {
    const current = this.fullPageScrollService.currentSection();
    return current ? current.id : '';
  });
  readonly showScrollHint = computed(() => false); // Simplified for now

  trackByIndex(index: number): number {
    return index;
  }

  navigateToSection(index: number): void {
    this.fullPageScrollService.goToSection(index);
  }
}
