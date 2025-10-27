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
import { StarFieldEnhancedComponent } from '../../../../core/angular-3d/components/primitives/star-field-enhanced.component';
import { NebulaVolumetricComponent } from '../../../../core/angular-3d/components/primitives/nebula-volumetric.component';
import { FogComponent } from '../../../../core/angular-3d/components/primitives/fog.component';
import { BloomEffectComponent } from '../../../../core/angular-3d/components/effects/bloom-effect.component';

// Import theme store and types
import { SpaceThemeStore } from '../../../../core/angular-3d/services/space-theme.store';
import type { SpaceTheme } from '../../../../core/angular-3d/types/space-theme.types';

import { Float3dDirective } from '../../../../core/angular-3d';
import { Glow3dDirective } from '../../../../core/angular-3d/directives/glow-3d.directive';
import { NebulaComponent } from '../../../../core/angular-3d/components/primitives/nebula.component';

@Component({
  selector: 'app-hero-space-scene',
  standalone: true,
  imports: [
    PlanetComponent,
    StarFieldEnhancedComponent,
    NebulaVolumetricComponent,
    FogComponent,
    BloomEffectComponent,
    Float3dDirective,
    Glow3dDirective,
    NebulaComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- ================================ -->
    <!-- SCENE BACKGROUND COLOR -->
    <!-- ================================ -->
    <!-- <ngt-color attach="background" *args="[backgroundColorHex]" /> -->

    <!-- ================================ -->
    <!-- LIGHTING SETUP (Theme-based) -->
    <!-- ================================ -->
    <!-- Very low ambient for deep space darkness -->
    <ngt-ambient-light
      [intensity]="ambientLightIntensity"
      [color]="ambientLightColor"
    />
    <!-- Softer directional "sun" light from upper-right for darker planet -->
    <ngt-directional-light
      [position]="[30, 15, 25]"
      [intensity]="directionalLightIntensity"
      [color]="directionalLightColor"
      [castShadow]="true"
      [shadow-mapSize-width]="2048"
      [shadow-mapSize-height]="2048"
      [shadow-camera-near]="0.5"
      [shadow-camera-far]="500"
    />
    <!-- Point light removed for realistic space lighting (directional only) -->

    <!-- ================================ -->
    <!-- ATMOSPHERIC FOG (Theme-based) -->
    <!-- ================================ -->
    @if (fogEnabled) {
    <app-fog
      attach="fog"
      [fogType]="fogType"
      [color]="fogColor"
      [density]="fogDensity"
    />
    }

    <!-- ================================ -->
    <!-- LARGE DARK PLANET (Background - behind text, Textured) -->
    <!-- ================================ -->
    <app-planet
      [position]="darkPlanetPosition"
      [radius]="darkPlanetRadius"
      [segments]="150"
      [textureUrl]="'assets/moon_1024.jpg'"
      [glowColor]="darkPlanetGlowColor"
      [glowIntensity]="0"
      [glowDistance]="20"
      [rotationSpeed]="0.5"
      [rotationAxis]="'y'"
    />

    <!-- ================================ -->
    <!-- ENHANCED STAR FIELD (Multi-size with glow) -->
    <!-- ================================ -->
    <!-- Background stars (distant) -->
    <app-star-field-enhanced
      [starCount]="3000"
      [radius]="50"
      [enableTwinkle]="true"
    />

    <!-- Midground stars (brighter) -->
    <app-star-field-enhanced
      [starCount]="2000"
      [radius]="40"
      [enableTwinkle]="false"
    />

    <!-- Foreground stars (closest, brightest) -->
    <app-star-field-enhanced
      [starCount]="2500"
      [radius]="30"
      [enableTwinkle]="true"
      float3d
      glow3d
      [glowColor]="darkPlanetGlowColor"
      [glowIntensity]="0.3"
    />

    <!-- ================================ -->
    <!-- VOLUMETRIC SMOKE/CLOUD NEBULA (Continuous shader, not circles) -->
    <!-- Large plane with organic smoke patterns -->
    <!-- Planet at z=9.5, Camera at z=12, Nebula at z=-60 (far behind) -->
    <!--
    TWEAKABLE PARAMETERS:
    - [width]/[height]: Size of nebula (increase for larger coverage)
    - [noiseScale]: 0.005-0.02 (smaller = larger features, bigger = more detail)
    - [density]: 0.5-2.0 (cloud thickness)
    - [edgeSoftness]: 0.1-0.5 (0.1 = hard edges, 0.5 = very soft/invisible)
    - [contrast]: 0.5-2.0 (difference between bright and dim areas)
    - [glowIntensity]: 1.0-5.0 (brightness of glowing areas)
    - [colorIntensity]: 0.5-3.0 (overall color brightness)
    - [opacity]: 0.3-1.0 (overall transparency)
    - [flowSpeed]: 0.1-2.0 (animation speed, higher = faster)
    -->
    <!-- ================================ -->

    <!-- MAIN NEBULA - Continuous smoke/cloud effect -->
    <app-nebula
      [particleCount]="120"
      [radius]="80"
      [colorPalette]="['#ffffff', '#cccccc']"
      [minSize]="40"
      [maxSize]="80"
      [opacity]="0.2"
      [flow]="false"
      [position]="[-180, 0, -230]"
    />

    <app-nebula-volumetric
      [width]="240"
      [height]="100"
      [layers]="6"
      [opacity]="0.65"
      [primaryColor]="'#0088ff'"
      [secondaryColor]="'#00d4ff'"
      [tertiaryColor]="'#ff6bd4'"
      [enableFlow]="false"
      [flowSpeed]="0.8"
      [noiseScale]="0.01"
      [density]="1.1"
      [edgeSoftness]="0.5"
      [contrast]="1.0"
      [glowIntensity]="30"
      [colorIntensity]="3"
      [position]="[-90, 0, -90]"
    />

    <!-- ================================ -->
    <!-- BLOOM POST-PROCESSING -->
    <!-- ================================ -->
    <!-- Enhanced bloom for luminous nebula core -->
    <app-bloom-effect
      [kernelSize]="5"
      [luminanceThreshold]="0.15"
      [luminanceSmoothing]="0.75"
      [intensity]="2.8"
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
    return this.theme.lights.ambient.intensity * 0.02; // Very dark ambient for deep space
  }

  get ambientLightColor(): number {
    return this.theme.lights.ambient.color;
  }

  get directionalLightIntensity(): number {
    return this.theme.lights.directional.intensity * 1.5; // Reduced for darker planet
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
    return this.theme.fog?.enabled ?? true;
  }

  get fogType(): 'linear' | 'exponential' {
    return 'exponential';
  }

  get fogColor(): number {
    return this.theme.fog?.color ?? 0x000508;
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

  get backgroundColorHex(): string {
    // Use darkest background color for scene background
    const color =
      this.theme.background.colors[this.theme.background.colors.length - 1];
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  // ================================
  // PLANETS (Theme-based getters)
  // ================================
  // Camera is at z=45 looking toward NEGATIVE z direction
  // Scene composition: Large planet filling ~60-70% of viewport
  // Math: At FOV=65° and distance=65, visible height ≈ 76.5 units
  // For 65% coverage: diameter ≈ 50 units, so radius ≈ 25 units

  // DARK PLANET - Using Three.js human scale (camera at z=12)
  // At distance 12, FOV 75°: visible height ≈ 18.4 units
  // For 55% coverage: diameter ≈ 10.1 units, radius ≈ 5.0 units
  readonly darkPlanetPosition: [number, number, number] = [0, 0, 9.5];
  readonly darkPlanetRadius = 5.0; // Human-scale units for 55% viewport coverage

  get darkPlanetBaseColor(): number {
    return this.theme.planet.baseColor;
  }

  get darkPlanetEmissiveColor(): number {
    return this.theme.planet.emissiveColor;
  }

  get darkPlanetEmissiveIntensity(): number {
    return 0.05; // Minimal emissive - let directional light define shape realistically
  }

  get darkPlanetGlowColor(): number {
    return this.theme.planet.glowColor;
  }

  get darkPlanetGlowIntensity(): number {
    return 0.5; // Very subtle atmospheric glow for realism
  }

  // ================================
  // STARS (Theme-based getters)
  // ================================
  get starColors(): string[] {
    return this.theme.stars.colors;
  }

  get starSize(): number {
    return this.theme.stars.sizes.min; // Tiny pinpoints for realistic star appearance
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
