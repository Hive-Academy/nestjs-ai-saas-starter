import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { CodeSnippetComponent } from './code-snippet.component';
import {
  HijackedScrollDirective,
} from '../../core/angular-3d/directives/hijacked-scroll.directive';
import { HijackedScrollItemDirective, type SlideDirection } from '../../core/angular-3d/directives/hijacked-scroll-item.directive';

/**
 * Progressive code revelation timeline with side-by-side layout
 *
 * This component creates a story-driven code demonstration with:
 * - Title and description on one side
 * - Code block on the other side
 * - Smooth scroll animations
 * - Alternating left/right layouts
 *
 * @example
 * <app-scrolling-code-timeline
 *   [timelineData]="chromaDBTimeline"
 * />
 */
@Component({
  selector: 'app-scrolling-code-timeline',
  standalone: true,
  imports: [
    CommonModule,
    CodeSnippetComponent,
    HijackedScrollDirective,
    HijackedScrollItemDirective,
  ],
  template: `
    <!-- Hijacked Scrolling Container: Uses directive for scroll-jacking -->
    <div
      hijackedScroll
      [scrollHeightPerStep]="700"
      [animationDuration]="0.3"
      (currentStepChange)="currentStep.set($event)"
    >
      @for (step of timeline(); track step.id; let i = $index) {
        <!-- Each step is managed by hijackedScrollItem directive -->
        <div
          hijackedScrollItem
          [slideDirection]="getSlideDirection(step.layout)"
          class="h-[70vh]"
        >
          <div class="container mx-auto px-8 h-full flex items-center">
            <!-- Step Grid: 2 Columns -->
            <div class="grid lg:grid-cols-2 gap-16 items-center">
              <!-- Content Side (Title + Description) -->
              <div
                [class.lg:order-1]="step.layout === 'left'"
                [class.lg:order-2]="step.layout === 'right'"
              >
                <!-- Step Number Badge -->
                <div class="inline-flex items-center gap-3 mb-6">
                  <span
                    class="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-lg shadow-lg"
                  >
                    {{ step.step }}
                  </span>
                  <div
                    class="h-px flex-1 bg-gradient-to-r from-indigo-200 to-transparent max-w-[100px]"
                  ></div>
                </div>

                <!-- Title -->
                <h3 class="text-4xl font-bold text-gray-900 mb-4 leading-tight">
                  {{ step.title }}
                </h3>

                <!-- Description -->
                <p class="text-lg text-gray-600 leading-relaxed mb-6">
                  {{ step.description }}
                </p>

                <!-- Notes -->
                @if (step.notes && step.notes.length > 0) {
                  <div class="space-y-3">
                    @for (note of step.notes; track $index) {
                      <div class="flex items-start gap-3">
                        <svg
                          class="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p class="text-sm text-gray-700">{{ note }}</p>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Code Side -->
              <div
                [class.lg:order-2]="step.layout === 'left'"
                [class.lg:order-1]="step.layout === 'right'"
              >
                @if (step.code) {
                  <app-code-snippet
                    [code]="step.code"
                    [language]="step.language || 'typescript'"
                  />
                }
              </div>
            </div>
          </div>
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
export class ScrollingCodeTimelineComponent {
  @Input({ required: true })
  set timelineData(value: TimelineStep[]) {
    this.timeline.set(value);
  }

  readonly timeline = signal<TimelineStep[]>([]);
  readonly currentStep = signal<number>(0);

  /**
   * Convert layout type to slide direction
   */
  getSlideDirection(layout: 'left' | 'right' | 'center'): SlideDirection {
    switch (layout) {
      case 'left':
        return 'left';
      case 'right':
        return 'right';
      default:
        return 'none';
    }
  }
}

/**
 * Timeline step interface
 */
export interface TimelineStep {
  id: string;
  step: number;
  title: string;
  description: string;
  code?: string;
  language?: string;
  showLineNumbers?: boolean;
  layout: 'left' | 'right' | 'center';
  notes?: string[];
}
