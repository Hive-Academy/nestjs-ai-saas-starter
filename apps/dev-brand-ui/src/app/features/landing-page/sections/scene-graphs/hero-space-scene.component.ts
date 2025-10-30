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
import { BloomEffectComponent } from '../../../../core/angular-3d/components/effects/bloom-effect.component';
import { OrbitControlsComponent } from '../../../../core/angular-3d/components/orbit-controls.component';
import { NebulaVolumetricComponent } from '../../../../core/angular-3d/components/primitives/nebula-volumetric.component';
import { PlanetComponent } from '../../../../core/angular-3d/components/primitives/planet.component';
import { SmokeText3DComponent } from '../../../../core/angular-3d/components/primitives/smoke-text-3d.component';
import { StarFieldEnhancedComponent } from '../../../../core/angular-3d/components/primitives/star-field-enhanced.component';
import { Text3DVolumetricComponent } from '../../../../core/angular-3d/components/primitives/text-3d-volumetric.component';

// Import theme store and types
import { Colors3D } from '../../../../core/angular-3d/config/colors.config';
import { SpaceThemeStore } from '../../../../core/angular-3d/services/space-theme.store';
import type { SpaceTheme } from '../../../../core/angular-3d/types/space-theme.types';

import { GLTFModelComponent } from 'apps/dev-brand-ui/src/app/core/angular-3d/components/primitives/gltf-model.component';
import type { SpaceFlightWaypoint } from '../../../../core/angular-3d';
import { NebulaComponent } from '../../../../core/angular-3d/components/primitives/nebula.component';

@Component({
  selector: 'app-hero-space-scene',
  standalone: true,
  imports: [
    PlanetComponent,
    StarFieldEnhancedComponent,
    NebulaVolumetricComponent,
    BloomEffectComponent,
    OrbitControlsComponent,
    NebulaComponent,
    GLTFModelComponent,
    SmokeText3DComponent,
    Text3DVolumetricComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- ================================ -->
    <!-- SCENE BACKGROUND COLOR -->
    <!-- ================================ -->
    <!-- <ngt-color attach="background" *args="[backgroundColorHex]" /> -->

    <!-- ================================ -->
    <!-- CAMERA CONTROLS (OrbitControls) -->
    <!-- ================================ -->
    <!-- Click and drag to orbit around planet, scroll to zoom -->
    <app-orbit-controls
      [target]="[0, 0, 6.5]"
      [enableDamping]="true"
      [dampingFactor]="0.05"
      [enableZoom]="false"
      [minDistance]="0"
      [maxDistance]="4.5"
      [rotateSpeed]="0.8"
      [enablePan]="false"
    />

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

    <!-- Mini Robot #1 - Flying through space (Default path) - ORANGE THEME -->
    <app-gltf-model
      [modelPath]="'/assets/3d/mini_robot.glb'"
      [position]="[7, 15, -20]"
      [scale]="0.03"
      [rotation]="[0, 0, 0]"
      [useDraco]="false"
      [colorOverride]="'#ff6b35'"
      [emissiveColor]="'#ff4500'"
      [emissiveIntensity]="0.3"
      [metalness]="0.8"
      [roughness]="0.2"
      [spaceFlightPath]="robot1FlightPath"
      [spaceFlightRotations]="4"
      [spaceFlightAutoStart]="true"
      [spaceFlightLoop]="true"
    />

    <!-- Robo Head - Flying through space (Custom path) - CYAN THEME -->
    <app-gltf-model
      [modelPath]="'/assets/3d/robo_head/scene.gltf'"
      [position]="[10, 1, 5]"
      [scale]="0.5"
      [rotation]="[0, 0, 0]"
      [useDraco]="false"
      [colorOverride]="'#00d4ff'"
      [emissiveColor]="'#0088ff'"
      [emissiveIntensity]="0.5"
      [metalness]="0.9"
      [roughness]="0.1"
      [spaceFlightPath]="robot2FlightPath"
      [spaceFlightRotations]="2"
      [spaceFlightAutoStart]="true"
      [spaceFlightLoop]="true"
    />

    <!-- ================================ -->
    <!-- REALISTIC EARTH PLANET (COMMENTED OUT - Replaced with 3D Text) -->
    <!-- ================================ -->
    <!--
    <app-planet
      [position]="[0, 0, 8.5]"
      [radius]="darkPlanetRadius"
      [segments]="150"
      [textureUrl]="'assets/earth.jpg'"
      [baseColor]="darkPlanetBaseColor"
      [emissiveColor]="darkPlanetEmissiveColor"
      [emissiveIntensity]="darkPlanetEmissiveIntensity"
      [glowColor]="darkPlanetGlowColor"
      [glowIntensity]="darkPlanetGlowIntensity"
      [glowDistance]="20"
      [rotationSpeed]="0.7"
      [rotationAxis]="'y'"
    />
    -->

    <!-- ================================ -->
    <!-- 3D TEXT ELEMENTS (Replacing HTML Text) -->
    <!-- ================================ -->

    <!-- Top Pill Text: "Build Production Grade AI Applications" (3D Volumetric Glow) -->
    <app-text-3d-volumetric
      text="Build Production"
      [position]="[-2, 2.5, 6.5]"
      [size]="0.3"
      [depth]="0.1"
      [bevelSize]="0.01"
      [bevelThickness]="0.02"
      [glowColor]="colors.neon.indigo.hex"
      [glowIntensity]="3.5"
      [pulseSpeed]="1.5"
      [pulseAmount]="0.2"
    />

    <app-text-3d-volumetric
      text="Grade AI Apps"
      [position]="[-1.8, 2.1, 6.5]"
      [size]="0.3"
      [depth]="0.1"
      [bevelSize]="0.01"
      [bevelThickness]="0.02"
      [glowColor]="colors.neon.purple.hex"
      [glowIntensity]="3.5"
      [pulseSpeed]="1.8"
      [pulseAmount]="0.2"
    />

    <!-- Center Smoke Text: "With TypeScript Patterns" (Particle Smoke) -->
    <app-smoke-text-3d
      text="With TypeScript"
      [position]="[0, 0.3, 8]"
      [fontSize]="80"
      [particleCount]="15000"
      [particleSize]="0.3"
      [smokeColor]="colors.material.white.hex"
      [baseOpacity]="1.0"
      [turbulenceSpeed]="0.1"
      [turbulenceScale]="0.2"
      [particleLifespan]="10"
    />

    <app-smoke-text-3d
      text="Patterns"
      [position]="[0, -0.5, 8]"
      [fontSize]="80"
      [particleCount]="12000"
      [particleSize]="0.3"
      [smokeColor]="colors.material.lightGray.hex"
      [baseOpacity]="1.0"
      [turbulenceSpeed]="0.12"
      [turbulenceScale]="0.22"
      [particleLifespan]="10"
    />

    <!-- Bottom Pill Text: "You Already Know" (3D Volumetric Glow) -->
    <app-text-3d-volumetric
      text="You Already Know"
      [position]="[-1.5, -2, 6.5]"
      [size]="0.3"
      [depth]="0.1"
      [bevelSize]="0.01"
      [bevelThickness]="0.02"
      [glowColor]="colors.neon.cyan.hex"
      [glowIntensity]="3.5"
      [pulseSpeed]="2.0"
      [pulseAmount]="0.2"
    />

    <!-- ================================ -->
    <!-- ENHANCED STAR FIELD (Multi-size with glow) -->
    <!-- ================================ -->
    <!-- Background stars (distant) - Parallax from camera movement -->
    <app-star-field-enhanced
      [starCount]="3000"
      [radius]="50"
      [enableTwinkle]="true"
    />

    <!-- Midground stars (brighter) - Natural depth parallax -->
    <app-star-field-enhanced
      [starCount]="2000"
      [radius]="40"
      [enableTwinkle]="false"
    />

    <!-- Foreground stars (closest, brightest) - Depth-based parallax -->
    <app-star-field-enhanced
      [starCount]="2500"
      [radius]="30"
      [enableTwinkle]="true"
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

    <!-- MAIN NEBULA - Continuous smoke/cloud effect (FIXED position by default) -->
    <app-nebula
      [particleCount]="120"
      [radius]="80"
      [colorPalette]="['#ffffff', '#cccccc']"
      [minSize]="40"
      [maxSize]="80"
      [opacity]="0.2"
      [flow]="false"
      [position]="[-180, 0, -250]"
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
    <!-- Subtle bloom for atmospheric glow effect -->
    <app-bloom-effect
      [kernelSize]="5"
      [luminanceThreshold]="0.4"
      [luminanceSmoothing]="0.7"
      [intensity]="1.8"
    />
  `,
})
export class HeroSpaceSceneComponent {
  // ✅ Inject theme store for reactive theme support
  private readonly themeStore = inject(SpaceThemeStore);

  // ✅ Color configuration for 3D elements
  readonly colors = Colors3D;

  // ✅ Computed getter for current theme
  get theme(): SpaceTheme {
    return this.themeStore.currentTheme();
  }

  // ================================
  // ROBOT FLIGHT PATHS
  // ================================

  /**
   * Robot 1 (Mini Robot - Orange) - HIGH ALTITUDE PATH
   * Flies in upper regions with dramatic height changes
   * Stays mostly above the earth, diving and climbing
   */
  readonly robot1FlightPath: SpaceFlightWaypoint[] = [
    // Phase 1: High approach from far upper left
    { position: [-12, 8, -8], duration: 10, ease: 'easeInOut' },
    // Phase 2: Soar across the top, very high
    { position: [10, 12, -5], duration: 8, ease: 'easeInOut' },
    // Phase 3: Dramatic dive toward viewer
    { position: [-6, 4, 10], duration: 9, ease: 'easeIn' },
    // Phase 4: Climb back up and away
    { position: [8, 10, -12], duration: 11, ease: 'easeOut' },
    // Phase 5: High arc return to start
    { position: [-12, 8, -8], duration: 8, ease: 'easeInOut' },
  ];

  /**
   * Robot 2 (Robo Head - Cyan) - LOW DEPTH PATH
   * Flies in lower regions with deep forward/backward movement
   * Stays mostly below earth level, exploring depth
   */
  readonly robot2FlightPath: SpaceFlightWaypoint[] = [
    // Phase 1: Start deep behind and low
    { position: [4, -3, -20], duration: 9, ease: 'easeOut' },
    // Phase 2: Emerge from behind, moving left and forward
    { position: [-8, -5, 8], duration: 10, ease: 'easeInOut' },
    // Phase 3: Cross low to the right side
    { position: [12, -4, 6], duration: 8, ease: 'easeInOut' },
    // Phase 4: Dive deep and right
    { position: [10, -6, -15], duration: 11, ease: 'easeIn' },
    // Phase 5: Low sweep back to center-left
    { position: [-6, -5, -10], duration: 9, ease: 'easeInOut' },
    // Phase 6: Return to deep starting position
    { position: [4, -3, -20], duration: 8, ease: 'easeInOut' },
  ];

  // ================================
  // LIGHTING (Theme-based getters)
  // ================================
  get ambientLightIntensity(): number {
    return this.theme.lights.ambient.intensity * 0.25; // Increased to show Earth's colors
  }

  get ambientLightColor(): number {
    return this.theme.lights.ambient.color;
  }

  get directionalLightIntensity(): number {
    return this.theme.lights.directional.intensity * 2.0; // Strong sunlight to illuminate Earth
  }

  get directionalLightColor(): number {
    return this.theme.lights.directional.color;
  }

  get pointLightIntensity(): number {
    return (this.theme.lights.point[0]?.intensity || 2.0) * 1.3;
  }

  get pointLightColor(): number {
    return this.theme.lights.point[0]?.color || Colors3D.material.white.hex;
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
    return this.theme.fog?.color ?? Colors3D.space.deepVoid.hex;
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

  readonly darkPlanetRadius = 5.0; // Human-scale units for 55% viewport coverage

  get darkPlanetBaseColor(): number {
    return Colors3D.material.white.hex; // White base to let texture colors show naturally
  }

  get darkPlanetEmissiveColor(): number {
    return Colors3D.planet.atmosphereBlue.hex; // Subtle blue atmospheric glow
  }

  get darkPlanetEmissiveIntensity(): number {
    return 0.3; // Very subtle emissive for atmospheric rim lighting
  }

  get darkPlanetGlowColor(): number {
    return Colors3D.planet.atmosphereCyan.hex; // Cyan/blue atmospheric glow (like Earth's atmosphere)
  }

  get darkPlanetGlowIntensity(): number {
    return 0.2; // Moderate glow for realistic atmospheric halo
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
