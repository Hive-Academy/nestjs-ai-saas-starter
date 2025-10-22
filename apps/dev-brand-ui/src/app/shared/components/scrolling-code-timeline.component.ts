import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  signal,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CodeSnippetComponent } from './code-snippet.component';
import { ScrollAnimationDirective } from '../../core/angular-3d/directives/scroll-animation.directive';

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
  imports: [CommonModule, CodeSnippetComponent, ScrollAnimationDirective],
  template: `
    <div class="relative w-full" #timelineContainer>
      @for (step of timeline(); track step.id) {
        <!-- Timeline Step Container -->
        <div class="relative min-h-screen flex items-center py-24">
          <div class="container mx-auto px-8">
            <!-- Step Grid: 2 Columns -->
            <div class="grid lg:grid-cols-2 gap-16 items-center">
              <!-- Content Side (Title + Description) -->
              <div
                [class.lg:order-1]="step.layout === 'left'"
                [class.lg:order-2]="step.layout === 'right'"
                scrollAnimation
                [scrollConfig]="{
                  animation: 'custom',
                  start: 'top 80%',
                  end: 'top 30%',
                  scrub: 1,
                  from: {
                    opacity: 0,
                    x: step.layout === 'left' ? -60 : 60,
                    y: 30
                  },
                  to: {
                    opacity: 1,
                    x: 0,
                    y: 0
                  }
                }"
              >
                <!-- Step Number Badge -->
                <div class="inline-flex items-center gap-3 mb-6">
                  <span class="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-lg shadow-lg">
                    {{ step.step }}
                  </span>
                  <div class="h-px flex-1 bg-gradient-to-r from-indigo-200 to-transparent max-w-[100px]"></div>
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
                        <svg class="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                scrollAnimation
                [scrollConfig]="{
                  animation: 'custom',
                  start: 'top 75%',
                  end: 'top 35%',
                  scrub: 0.8,
                  from: {
                    opacity: 0,
                    x: step.layout === 'left' ? 60 : -60,
                    scale: 0.95
                  },
                  to: {
                    opacity: 1,
                    x: 0,
                    scale: 1
                  }
                }"
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
export class ScrollingCodeTimelineComponent implements AfterViewInit {
  @ViewChild('timelineContainer', { static: true })
  timelineContainer!: ElementRef<HTMLElement>;

  @Input({ required: true })
  set timelineData(value: TimelineStep[]) {
    this.timeline.set(value);
  }

  readonly timeline = signal<TimelineStep[]>([]);

  ngAfterViewInit(): void {
    console.log('[ScrollingCodeTimeline] Initialized with', this.timeline().length, 'steps');
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
