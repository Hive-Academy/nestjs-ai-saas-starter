/**
 * HeroSpaceSceneComponent - Composable Space Scene with Theme Support
 *
 * Composes space primitives (planet, stars, nebula, background) into a complete scene.
 * Supports multiple color themes via SpaceThemeStore service.
 *
 * Features:
 * - Central planet with rotation
 * - Multi-layer star field (NgtsPointsBuffer)
 * - Nebula clouds (NgtsPointsBuffer)
 * - Themed gradient background
 * - Customizable lighting setup
 * - Reactive theme switching via SpaceThemeStore
 *
 * Usage:
 * ```html
 * <app-scene-3d [sceneGraph]="HeroSpaceSceneComponent" />
 * ```
 *
 * Theme switching handled automatically via SpaceThemeStore injection.
 */

import { Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';

// Import space primitives
import { PlanetComponent } from '../../../../core/angular-3d/components/primitives/planet.component';
import { StarFieldComponent } from '../../../../core/angular-3d/components/primitives/star-field.component';
import { NebulaComponent } from '../../../../core/angular-3d/components/primitives/nebula.component';
import { SpaceBackgroundComponent } from '../../../../core/angular-3d/components/primitives/space-background.component';
import { FogComponent } from '../../../../core/angular-3d/components/primitives/fog.component';

// Import theme store and types
import { SpaceThemeStore } from '../../../../core/angular-3d/services/space-theme.store';
import type { SpaceTheme } from '../../../../core/angular-3d/types/space-theme.types';

@Component({
  selector: 'app-hero-space-scene',
  standalone: true,
  imports: [
    PlanetComponent,
    StarFieldComponent,
    NebulaComponent,
    SpaceBackgroundComponent,
    FogComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- ================================ -->
    <!-- LIGHTING SETUP (Theme-based) -->
    <!-- ================================ -->
    <ngt-ambient-light
      [intensity]="ambientLightIntensity"
      [color]="ambientLightColor"
    />
    <ngt-directional-light
      [position]="[10, 10, 10]"
      [intensity]="directionalLightIntensity"
      [color]="directionalLightColor"
    />
    <ngt-point-light
      [position]="pointLightPosition"
      [intensity]="pointLightIntensity"
      [color]="pointLightColor"
    />

    <!-- ================================ -->
    <!-- ATMOSPHERIC FOG (Theme-based) -->
    <!-- ================================ -->
    @if (fogEnabled) {
    <app-fog [fogType]="fogType" [color]="fogColor" [density]="fogDensity" />
    }

    <!-- ================================ -->
    <!-- BACKGROUND GRADIENT SPHERE (Theme-based) -->
    <!-- ================================ -->
    <app-space-background
      [radius]="100"
      [gradientType]="backgroundGradientType"
      [colors]="backgroundColors"
    />

    <!-- ================================ -->
    <!-- LARGE DARK PLANET (Background - behind text, Theme-based) -->
    <!-- ================================ -->
    <app-planet
      [position]="darkPlanetPosition"
      [radius]="darkPlanetRadius"
      [segments]="128"
      [baseColor]="darkPlanetBaseColor"
      [emissiveColor]="darkPlanetEmissiveColor"
      [emissiveIntensity]="darkPlanetEmissiveIntensity"
      [glowColor]="darkPlanetGlowColor"
      [glowIntensity]="darkPlanetGlowIntensity"
      [glowDistance]="20"
      [metalness]="0.3"
      [roughness]="0.8"
      [rotationSpeed]="2"
      [rotationAxis]="'y'"
    />

    <!-- ================================ -->
    <!-- STAR FIELD (NgtsPointsBuffer, Theme-based) -->
    <!-- ================================ -->
    <app-star-field
      [starCount]="2000"
      [radius]="30"
      [colorPalette]="starColors"
      [size]="starSize"
      [opacity]="starOpacity"
    />

    <!-- ================================ -->
    <!-- NEBULA CLOUDS (NgtsPointsBuffer, Theme-based) -->
    <!-- ================================ -->
    <app-nebula
      [particleCount]="1500"
      [radius]="40"
      [colorPalette]="nebulaColors"
      [size]="1.0"
      [opacity]="nebulaOpacity"
      [flow]="nebulaFlow"
    />
  `,
})
export class HeroSpaceSceneComponent {
  // ✅ Inject theme store for reactive theme support
  private readonly themeStore = inject(SpaceThemeStore);

  // ✅ Computed getter for current theme
  get theme(): SpaceTheme {
    return this.themeStore.currentTheme();
  }

  // ================================
  // LIGHTING (Theme-based getters)
  // ================================
  get ambientLightIntensity(): number {
    return this.theme.lights.ambient.intensity;
  }

  get ambientLightColor(): number {
    return this.theme.lights.ambient.color;
  }

  get directionalLightIntensity(): number {
    return this.theme.lights.directional.intensity * 1.5;
  }

  get directionalLightColor(): number {
    return this.theme.lights.directional.color;
  }

  get pointLightIntensity(): number {
    return (this.theme.lights.point[0]?.intensity || 2.0) * 1.3;
  }

  get pointLightColor(): number {
    return this.theme.lights.point[0]?.color || 0xffffff;
  }

  get pointLightPosition(): [number, number, number] {
    return this.theme.lights.point[0]?.position || [10, 5, 5];
  }

  // ================================
  // FOG (Theme-based getters)
  // ================================
  get fogEnabled(): boolean {
    return this.theme.fog?.enabled ?? false;
  }

  get fogType(): 'linear' | 'exponential' {
    return 'exponential';
  }

  get fogColor(): number {
    return this.theme.fog?.color ?? 0xcccccc;
  }

  get fogDensity(): number {
    return this.theme.fog?.density ?? 0.008;
  }

  // ================================
  // BACKGROUND (Theme-based getters)
  // ================================
  get backgroundGradientType(): 'linear' | 'radial' {
    return this.theme.background.type;
  }

  get backgroundColors(): number[] {
    return this.theme.background.colors;
  }

  // ================================
  // PLANETS (Theme-based getters)
  // ================================
  // Camera is at z=50 looking toward negative z
  // Scene composition: Dark planet behind text

  // DARK PLANET - Huge, behind text, takes up most of screen
  readonly darkPlanetPosition: [number, number, number] = [0, 0, -30];
  readonly darkPlanetRadius = 90; // MASSIVE

  get darkPlanetBaseColor(): number {
    return this.theme.planet.baseColor;
  }

  get darkPlanetEmissiveColor(): number {
    return this.theme.planet.emissiveColor;
  }

  get darkPlanetEmissiveIntensity(): number {
    return this.theme.planet.emissiveIntensity * 0.5; // Dimmer for background planet
  }

  get darkPlanetGlowColor(): number {
    return this.theme.planet.glowColor;
  }

  get darkPlanetGlowIntensity(): number {
    return this.theme.planet.glowIntensity * 0.4; // Subtle glow
  }

  // ================================
  // STARS (Theme-based getters)
  // ================================
  get starColors(): string[] {
    return this.theme.stars.colors;
  }

  get starSize(): number {
    return (
      ((this.theme.stars.sizes.min + this.theme.stars.sizes.max) / 2) * 0.025
    );
  }

  get starOpacity(): number {
    return 1.0;
  }

  // ================================
  // NEBULA (Theme-based getters)
  // ================================
  get nebulaColors(): string[] {
    return this.theme.nebula.colors;
  }

  get nebulaOpacity(): number {
    return this.theme.nebula.opacity;
  }

  get nebulaFlow(): boolean {
    return this.theme.nebula.flow;
  }
}
