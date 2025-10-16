/**
 * Landing Page Sections Index
 *
 * Centralized exports for all landing page section components.
 * Provides easy access to all section components for use throughout the application.
 */

// Core landing page sections
export { HeroSectionComponent } from './hero-section.component';

// Architecture and demo sections
export { ArchitectureDiagramComponent } from './architecture-diagram.component';
export { DemoTheaterComponent } from './demo-theater.component';

// Platform showcase sections
export { EcosystemExplorerComponent } from './ecosystem-explorer.component';
export { LibrariesShowcaseComponent } from './libraries-showcase.component';
export { PlatformPillarsComponent } from './platform-pillars.component';

// Type definitions for landing page
export interface LandingPageSection {
  readonly id: string;
  readonly title: string;
  readonly component: any;
  readonly visible: boolean;
  readonly order: number;
}

export interface LandingPageConfig {
  readonly sections: readonly LandingPageSection[];
  readonly theme: 'light' | 'dark' | 'auto';
  readonly animations: boolean;
}
