/**
 * HeroInteractivePlanetSceneComponent - Interactive Space Scene with Tech Markers
 *
 * Extends the base space scene with interactive 3D tech stack markers and connections.
 * Combines static scene elements (planet, stars, nebula) with scroll-driven marker animations.
 *
 * Features:
 * - All features from HeroSpaceSceneComponent (planet, stars, nebula, fog, bloom)
 * - 4 interactive tech markers (LangChain, LangGraph, Neo4j, ChromaDB)
 * - Animated connection lines between markers
 * - Scroll-driven opacity and glow effects via HeroSceneStateStore
 * - Theme-aware styling via SpaceThemeStore
 *
 * Scene Composition:
 * 1. Lighting (ambient + directional)
 * 2. Atmospheric fog
 * 3. Central textured planet
 * 4. Tech markers with labels (HTML overlays)
 * 5. Marker connection lines (graph visualization)
 * 6. Multi-layer star fields
 * 7. Dual nebula effects
 * 8. Bloom post-processing
 *
 * Usage:
 * ```html
 * <app-scene-3d [sceneGraph]="HeroInteractivePlanetSceneComponent" />
 * ```
 *
 * State Management:
 * - SpaceThemeStore: Provides theme-based colors, lighting, fog configuration
 * - HeroSceneStateStore: Provides scroll-driven marker/connection animation values
 */

import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  Signal,
} from '@angular/core';

// Import space primitives (from hero-space-scene)
import { PlanetComponent } from '../../../../core/angular-3d/components/primitives/planet.component';
import { StarFieldEnhancedComponent } from '../../../../core/angular-3d/components/primitives/star-field-enhanced.component';
import { NebulaVolumetricComponent } from '../../../../core/angular-3d/components/primitives/nebula-volumetric.component';
import { FogComponent } from '../../../../core/angular-3d/components/primitives/fog.component';
import { BloomEffectComponent } from '../../../../core/angular-3d/components/effects/bloom-effect.component';
import { Float3dDirective } from '../../../../core/angular-3d';
import { Glow3dDirective } from '../../../../core/angular-3d/directives/glow-3d.directive';
import { NebulaComponent } from '../../../../core/angular-3d/components/primitives/nebula.component';

// Import interactive marker components (NEW)
import { TechMarkerComponent } from '../../../../core/angular-3d/components/primitives/tech-marker.component';
import { MarkerConnectionsComponent } from '../../../../core/angular-3d/components/primitives/marker-connections.component';

// Import state stores
import { SpaceThemeStore } from '../../../../core/angular-3d/services/space-theme.store';
import { HeroSceneStateStore } from '../../../../core/angular-3d/services/hero-scene-state.store';
import type { SpaceTheme } from '../../../../core/angular-3d/types/space-theme.types';

@Component({
  selector: 'app-hero-interactive-planet-scene',
  standalone: true,
  imports: [
    // Base scene components
    PlanetComponent,
    StarFieldEnhancedComponent,
    NebulaVolumetricComponent,
    FogComponent,
    BloomEffectComponent,
    Float3dDirective,
    Glow3dDirective,
    NebulaComponent,
    // Interactive marker components
    TechMarkerComponent,
    MarkerConnectionsComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
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
    <!-- INTERACTIVE TECH MARKERS (NEW) -->
    <!-- ================================ -->
    <!-- LangChain - Top Left -->
    <app-tech-marker
      [position]="[-3, 3, 9.5]"
      [rotation]="[0, -Math.PI / 4, 0]"
      label="LangChain"
      [opacity]="markerOpacity()"
      [glowIntensity]="markerGlow()"
    />

    <!-- LangGraph - Top Right -->
    <app-tech-marker
      [position]="[3.5, 2.5, 9.5]"
      [rotation]="[0, Math.PI / 4, 0]"
      label="LangGraph"
      [opacity]="markerOpacity()"
      [glowIntensity]="markerGlow()"
    />

    <!-- Neo4j - Bottom Left -->
    <app-tech-marker
      [position]="[-2.5, -3, 9.5]"
      [rotation]="[0, -Math.PI / 3, 0]"
      label="Neo4j"
      [opacity]="markerOpacity()"
      [glowIntensity]="markerGlow()"
    />

    <!-- ChromaDB - Bottom Right -->
    <app-tech-marker
      [position]="[3, -2.5, 9.5]"
      [rotation]="[0, Math.PI / 3, 0]"
      label="ChromaDB"
      [opacity]="markerOpacity()"
      [glowIntensity]="markerGlow()"
    />

    <!-- ================================ -->
    <!-- MARKER CONNECTIONS (NEW) -->
    <!-- ================================ -->
    <app-marker-connections
      [opacity]="connectionOpacity()"
      [enableGlow]="true"
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
    <!-- NEBULA EFFECTS -->
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

    <!-- VOLUMETRIC NEBULA - Continuous shader-based nebula -->
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
export class HeroInteractivePlanetSceneComponent {
  // ================================
  // STATE STORE INJECTION
  // ================================
  // Theme store for visual styling (colors, lighting, fog)
  private readonly themeStore = inject(SpaceThemeStore);

  // Hero scene state store for scroll-driven marker/connection animations
  private readonly heroSceneState = inject(HeroSceneStateStore);

  // Math constant for template usage
  readonly Math = Math;

  // ================================
  // THEME ACCESSOR
  // ================================
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

  // ================================
  // INTERACTIVE MARKER STATE (NEW - from HeroSceneStateStore)
  // ================================
  /**
   * Marker opacity - controlled by scroll progress
   * Range: 0.4 → 1.0 (from HeroSceneStateStore)
   */
  get markerOpacity(): Signal<number> {
    return this.heroSceneState.markerOpacity;
  }

  /**
   * Marker glow intensity - controlled by scroll progress
   * Range: 0.1 → 0.8 (from HeroSceneStateStore)
   */
  get markerGlow(): Signal<number> {
    return this.heroSceneState.markerGlow;
  }

  /**
   * Connection line opacity - controlled by scroll progress
   * Range: 0 (until 50% scroll) → 0.6 (from HeroSceneStateStore)
   */
  get connectionOpacity(): Signal<number> {
    return this.heroSceneState.connectionOpacity;
  }
}
