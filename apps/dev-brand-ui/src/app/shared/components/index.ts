/**
 * Shared Components Barrel Export
 *
 * Centralizes exports for reusable components across the application.
 * Provides clean import paths throughout the application.
 *
 * Usage:
 * ```typescript
 * import {
 *   LibraryShowcaseCardComponent,
 *   SectionContainerComponent,
 *   LibraryShowcaseGridComponent,
 *   SectionDividerComponent,
 *   SectionParticleBackgroundComponent
 * } from '@shared/components';
 * ```
 */

export { SectionDividerComponent } from './section-divider.component';
export { CodeSnippetComponent } from './code-snippet.component';
export { DecorativePatternComponent } from './decorative-patterns.component';
export {
  ScrollingCodeTimelineComponent,
  type TimelineStep,
} from './scrolling-code-timeline.component';

// Phase 3: Streaming UI Components
export { TokenStreamDisplayComponent } from './token-stream-display.component';
export {
  ProgressIndicatorComponent,
  type ProgressData,
} from './progress-indicator.component';
export {
  AgentStatusPanelComponent,
  type AgentStatus,
  type AgentStatusType,
} from './agent-status-panel.component';
