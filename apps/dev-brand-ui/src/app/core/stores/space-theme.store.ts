/**
 * SpaceThemeStore - Centralized Theme Management Service
 *
 * Manages the currently selected space theme using Angular signals.
 * Provides a single source of truth for theme state across all components.
 *
 * Benefits:
 * - Decouples theme selection from scene rendering
 * - No need to pass inputs through component hierarchy
 * - Any component can read/update theme
 * - Reactive via signals
 *
 * Usage:
 * ```typescript
 * // In theme switcher component
 * constructor(private themeStore = inject(SpaceThemeStore)) {}
 *
 * selectTheme(themeId: string) {
 *   this.themeStore.setTheme(themeId);
 * }
 *
 * // In scene component
 * constructor(private themeStore = inject(SpaceThemeStore)) {}
 *
 * ngOnInit() {
 *   const theme = this.themeStore.currentTheme();
 * }
 * ```
 */

import { Injectable, signal, computed } from '@angular/core';
import { SPACE_THEMES, type SpaceTheme } from '../types/space-theme.types';

/**
 * Theme option for UI display
 */
export interface ThemeOption {
  id: string;
  name: string;
  icon: string; // Emoji or icon identifier
  description: string;
}

@Injectable({
  providedIn: 'root', // Singleton service
})
export class SpaceThemeStore {
  /**
   * Currently selected theme ID
   */
  private readonly selectedThemeId = signal<string>('classicSpace');

  /**
   * Computed current theme object
   */
  readonly currentTheme = computed<SpaceTheme>(() => {
    const themeId = this.selectedThemeId();
    return SPACE_THEMES[themeId] || SPACE_THEMES['classicSpace'];
  });

  /**
   * Get current theme ID
   */
  readonly currentThemeId = this.selectedThemeId.asReadonly();
  readonly planetRadius = signal<number>(4);

  /**
   * Update planet radius dynamically
   */
  setPlanetRadius(radius: number): void {
    this.planetRadius.set(radius);
  }
  /**
   * Set the active theme
   */
  setTheme(themeId: string): void {
    if (SPACE_THEMES[themeId]) {
      this.selectedThemeId.set(themeId);
      console.log(`[SpaceThemeStore] Theme changed to: ${themeId}`);
    } else {
      console.warn(`[SpaceThemeStore] Unknown theme: ${themeId}`);
    }
  }

  /**
   * Available themes with UI metadata
   */
  readonly availableThemes: ThemeOption[] = [
    {
      id: 'classicSpace',
      name: 'Classic Space',
      icon: '🌌',
      description: 'Traditional dark space',
    },
    {
      id: 'purpleNebula',
      name: 'Purple Nebula',
      icon: '💜',
      description: 'Cosmic purple aesthetic',
    },
    {
      id: 'cyanCosmos',
      name: 'Cyan Cosmos',
      icon: '🔷',
      description: 'Cool tech-focused blue',
    },
    {
      id: 'warmSunset',
      name: 'Warm Sunset',
      icon: '🌅',
      description: 'Warm Mars-like orange',
    },
    {
      id: 'lightSky',
      name: 'Light Sky',
      icon: '☀️',
      description: 'Bright daytime sky',
    },
    {
      id: 'greenAurora',
      name: 'Green Aurora',
      icon: '🌿',
      description: 'Ethereal green aurora',
    },
  ];

  /**
   * Get all available theme IDs
   */
  getAvailableThemeIds(): string[] {
    return Object.keys(SPACE_THEMES);
  }

  /**
   * Get theme by ID
   */
  getTheme(themeId: string): SpaceTheme | undefined {
    return SPACE_THEMES[themeId];
  }

  /**
   * Reset to default theme
   */
  resetTheme(): void {
    this.selectedThemeId.set('classicSpace');
  }
}
