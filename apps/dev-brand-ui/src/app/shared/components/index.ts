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

export { LibraryShowcaseCardComponent } from './library-showcase-card.component';
export { SectionContainerComponent } from './section-container.component';
export {
  LibraryShowcaseGridComponent,
  type LibraryCard,
} from './library-showcase-grid.component';
export { SectionDividerComponent } from './section-divider.component';
export { SectionParticleBackgroundComponent } from './section-particle-background.component';
export { CodeSnippetComponent } from './code-snippet.component';
export { DecorativePatternComponent } from './decorative-patterns.component';
