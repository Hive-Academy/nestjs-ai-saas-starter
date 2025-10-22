/**
 * Shared Components Barrel Export
 *
 * Centralizes exports for reusable components across the application.
 * Provides clean import paths throughout the application.
 *
 * Usage:
 * ```typescript
 * import {
 *   GlassmorphismCardComponent,
 *   SectionContainerComponent,
 *   LibraryShowcaseGridComponent,
 *   SectionDividerComponent,
 *   SectionParticleBackgroundComponent
 * } from '@shared/components';
 * ```
 */

export { GlassmorphismCardComponent } from './glassmorphism-card.component';
export { SectionContainerComponent } from './section-container.component';
export {
  LibraryShowcaseGridComponent,
  type LibraryCard,
} from './library-showcase-grid.component';
export { SectionDividerComponent } from './section-divider.component';
export { SectionParticleBackgroundComponent } from './section-particle-background.component';
