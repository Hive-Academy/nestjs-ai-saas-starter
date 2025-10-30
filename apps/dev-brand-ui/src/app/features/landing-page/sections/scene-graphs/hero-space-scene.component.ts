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
import { OrbitControls } from 'three-stdlib';

// Import space primitives
import { BloomEffectComponent } from '../../../../core/angular-3d/components/effects/bloom-effect.component';
import { OrbitControlsComponent } from '../../../../core/angular-3d/components/orbit-controls.component';
import { NebulaVolumetricComponent } from '../../../../core/angular-3d/components/primitives/nebula-volumetric.component';
import { PlanetComponent } from '../../../../core/angular-3d/components/primitives/planet.component';
import { SmokeParticleTextComponent } from '../../../../core/angular-3d/components/primitives/smoke-particle-text.component';
import { StarFieldEnhancedComponent } from '../../../../core/angular-3d/components/primitives/star-field-enhanced.component';
import { GlowParticleTextComponent } from '../../../../core/angular-3d/components/primitives/glow-particle-text.component';
import { SceneLightingComponent } from '../../../../core/angular-3d/components/primitives/scene-lighting.component';

// Import theme store and types
import { Colors3D } from '../../../../core/angular-3d/config/colors.config';
import { SpaceThemeStore } from '../../../../core/angular-3d/services/space-theme.store';
import type { SpaceTheme } from '../../../../core/angular-3d/types/space-theme.types';
import type { SceneLighting } from '../../../../core/angular-3d/types/scene-lighting.types';

import { GLTFModelComponent } from '../../../../core/angular-3d/components/primitives/gltf-model.component';
import type { SpaceFlightWaypoint } from '../../../../core/angular-3d';
import { NebulaComponent } from '../../../../core/angular-3d/components/primitives/nebula.component';
import { SVGIconComponent } from '../../../../core/angular-3d/components/primitives/svg-icon.component';
import { ViewportPositioner } from '../../../../core/angular-3d/utils/viewport-3d-positioning';
import { InstancedParticleTextComponent } from '../../../../core/angular-3d/components/primitives';
import { Rotate3dDirective } from '../../../../core/angular-3d/directives/rotate-3d.directive';
import {
  ScrollZoomCoordinatorDirective,
  type ScrollZoomState,
} from '../../../../core/angular-3d/directives';

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
    SmokeParticleTextComponent,
    SVGIconComponent,
    SceneLightingComponent,
    InstancedParticleTextComponent,
    Rotate3dDirective,
    ScrollZoomCoordinatorDirective,
  ],
  template: `
    <!-- ================================ -->
    <!-- SCENE BACKGROUND COLOR -->
    <!-- ================================ -->
    <!-- <ngt-color attach="background" *args="[backgroundColorHex]" /> -->

    <!-- ================================ -->
    <!-- CAMERA CONTROLS (OrbitControls with Scroll Coordination) -->
    <!-- ================================ -->
    <!-- Click and drag to orbit around viewport center, scroll to zoom -->
    <!-- When max zoom distance is reached, additional scroll triggers page scroll -->
    <app-orbit-controls
      scrollZoomCoordinator
      [orbitControls]="orbitControlsInstance"
      [target]="[0, 0, 0]"
      [enableDamping]="true"
      [dampingFactor]="0.05"
      [enableZoom]="isZoomEnabled"
      [minDistance]="5"
      [maxDistance]="50"
      [rotateSpeed]="0.5"
      [enablePan]="false"
      [scrollThreshold]="0.5"
      (controlsChange)="onControlsChange($event)"
      (stateChange)="onScrollZoomStateChange($event)"
      (scrollTransition)="onScrollTransition($event)"
      (zoomEnabledChange)="onZoomEnabledChange($event)"
    />

    <!-- ================================ -->
    <!-- LIGHTING SETUP (Theme-based) -->
    <!-- ================================ -->
    <app-scene-lighting [config]="spaceLighting" />

    <!-- Mini Robot #1 - Flying through space (Smaller scale for new viewport) -->
    <app-gltf-model
      [modelPath]="'/assets/3d/mini_robot.glb'"
      [position]="[3, 6, -8]"
      [scale]="0.05"
      [rotation]="[0, 0, 0]"
      [useDraco]="false"
      [emissiveIntensity]="0.2"
      [metalness]="0.4"
      [roughness]="0.6"
      [spaceFlightPath]="robot1FlightPath"
      [spaceFlightRotations]="4"
      [spaceFlightAutoStart]="true"
      [spaceFlightLoop]="true"
    />

    <!-- Robo Head - Flying through space (Smaller scale for new viewport) -->
    <app-gltf-model
      [modelPath]="'/assets/3d/robo_head/scene.gltf'"
      [position]="[4, 6, -6]"
      [scale]="1"
      [rotation]="[0, 0, 0]"
      [useDraco]="false"
      [emissiveIntensity]="0.3"
      [metalness]="0.5"
      [roughness]="0.5"
      [spaceFlightPath]="robot2FlightPath"
      [spaceFlightRotations]="4"
      [spaceFlightAutoStart]="true"
      [spaceFlightLoop]="true"
    />

    <!-- ================================ -->
    <!-- REALISTIC EARTH PLANET (COMMENTED OUT - Replaced with 3D Text) -->
    <!-- ================================ -->

    <app-gltf-model
      [modelPath]="'/assets/3d/planet_earth/scene.gltf'"
      [position]="planetPosition"
      [scale]="2.3"
      [rotation]="[0, 0, 0]"
      [useDraco]="false"
      [emissiveIntensity]="0.05"
      [metalness]="0.2"
      [roughness]="0.8"
      rotate3d
      [rotateConfig]="{
        axis: 'y',
        speed: 60,
        direction: 1,
        autoStart: true
      }"
    />

    <app-planet
      [position]="moonPosition"
      [radius]="darkPlanetRadius"
      [segments]="150"
      [textureUrl]="'assets/moon.jpg'"
      [baseColor]="darkPlanetBaseColor"
      [emissiveColor]="darkPlanetEmissiveColor"
      [emissiveIntensity]="darkPlanetEmissiveIntensity"
      [glowColor]="darkPlanetGlowColor"
      [glowIntensity]="darkPlanetGlowIntensity"
      [glowDistance]="20"
      [rotationSpeed]="0.9"
      [rotationAxis]="'y'"
    />

    <app-instanced-particle-text
      text="Build Production Grade AI Apps"
      [position]="topTextPosition"
      [fontSize]="25"
      [particleColor]="colors.material.gray.hex"
      [opacity]="0.35"
      [maxParticleScale]="0.04"
      [particlesPerPixel]="3"
      [blendMode]="'normal'"
      [skipInitialGrowth]="true"
      [particleGrowSpeed]="0.02"
      [pulseSpeed]="0.005"
    />

    <!-- colors.accent.blueViolet.hex -->

    <!-- Center Text: "With TypeScript Patterns" (White Smoke)-->
    <app-smoke-particle-text
      text="Hive Academy"
      [position]="hiveAcademyPosition"
      [fontSize]="40"
      [particleDensity]="60"
      [particleSize]="0.05"
      [smokeColor]="colors.material.white.hex"
      [opacity]="0.9"
      [driftSpeed]="0.015"
      [driftAmount]="0.04"
    />

    <!-- ================================ -->
    <!-- TECH STACK LOGOS (SVG Icons) -->
    <!-- ================================ -->
    <!-- Circular orbit pattern around the center -->

    <!-- NestJS Logo - Top Right (Official Red) - Much bigger and rotated -->
    <app-svg-icon
      [svgPath]="'/assets/images/logos/nestjs.svg'"
      [position]="logoPositions.nestjs"
      [scale]="0.05"
      [rotation]="[Math.PI, 0, 0]"
      [extrudeDepth]="0.5"
      [colorOverride]="true"
      [color]="colors.brand.nestjs.hex"
      [emissive]="colors.brand.nestjs.hex"
      [emissiveIntensity]="0.3"
      [metalness]="0.2"
      [roughness]="0.6"
      [castShadow]="true"
      [receiveShadow]="true"
      [floatConfig]="{
        height: 0.2,
        speed: 2000,
        delay: 0,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />

    <!-- LangChain Logo - Top Left (Dark Green with Emerald Glow) - Extra large and rotated -->
    <app-svg-icon
      [svgPath]="'/assets/images/logos/langchain.svg'"
      [position]="logoPositions.langchain"
      [scale]="0.2"
      [rotation]="[Math.PI, 0, 0]"
      [extrudeDepth]="0.5"
      [colorOverride]="true"
      [color]="colors.brand.langchain.hex"
      [emissive]="colors.accent.emerald.hex"
      [emissiveIntensity]="0.4"
      [metalness]="0.2"
      [roughness]="0.6"
      [castShadow]="true"
      [receiveShadow]="true"
      [floatConfig]="{
        height: 0.2,
        speed: 2000,
        delay: 0,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />

    <!-- ChromaDB Logo - Bottom Left (Multi-color: Blue, Yellow, Red) - Much bigger and rotated -->
    <app-svg-icon
      [svgPath]="'/assets/images/logos/chroma.svg'"
      [position]="logoPositions.chroma"
      [scale]="0.02"
      [rotation]="[Math.PI, 0, 0]"
      [extrudeDepth]="0.5"
      [emissiveIntensity]="0.5"
      [metalness]="0.1"
      [roughness]="0.7"
      [castShadow]="true"
      [receiveShadow]="true"
      [floatConfig]="{
        height: 0.2,
        speed: 2000,
        delay: 0,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />

    <!-- Neo4j Logo - Bottom Right (Official Blue) - Much bigger and rotated -->
    <app-svg-icon
      [svgPath]="'/assets/images/logos/neo4j.svg'"
      [position]="logoPositions.neo4j"
      [scale]="0.05"
      [rotation]="[Math.PI, 0, 0]"
      [extrudeDepth]="0.5"
      [colorOverride]="true"
      [color]="colors.brand.neo4j.hex"
      [emissive]="colors.brand.neo4j.hex"
      [emissiveIntensity]="0.3"
      [metalness]="0.2"
      [roughness]="0.6"
      [castShadow]="true"
      [receiveShadow]="true"
      [floatConfig]="{
        height: 0.2,
        speed: 2000,
        delay: 0,
        ease: 'sine.inOut',
        autoStart: true
      }"
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

    <!-- MAIN NEBULA - Far background layer (much further back) -->
    <app-nebula
      [particleCount]="60"
      [radius]="20"
      [colorPalette]="['#ffffff', '#cccccc']"
      [minSize]="5"
      [maxSize]="20"
      [flow]="false"
      [position]="nebulaPosition"
    />

    <app-nebula-volumetric
      [width]="60"
      [height]="20"
      [layers]="2"
      [opacity]="0.9"
      [primaryColor]="'#0088ff'"
      [secondaryColor]="'#00d4ff'"
      [tertiaryColor]="'#ff6bd4'"
      [enableFlow]="false"
      [flowSpeed]="0.8"
      [noiseScale]="0.03"
      [density]="1.2"
      [edgeSoftness]="0.5"
      [contrast]="1.0"
      [glowIntensity]="20"
      [colorIntensity]="2"
      [position]="nebulaVolumetricPosition"
    />

    <!-- ================================ -->
    <!-- BLOOM POST-PROCESSING -->
    <!-- ================================ -->
    <!-- Very subtle bloom to prevent eye strain -->
    <app-bloom-effect
      [kernelSize]="3"
      [luminanceThreshold]="0.8"
      [luminanceSmoothing]="0.5"
      [intensity]="0.5"
    />
  `,
})
export class HeroSpaceSceneComponent {
  // ✅ Inject theme store for reactive theme support
  private readonly themeStore = inject(SpaceThemeStore);

  // ✅ Math constant for template
  readonly Math = Math;

  // ✅ Color configuration for 3D elements
  readonly colors = Colors3D;

  // ✅ Store orbit controls reference for scroll coordinator
  orbitControlsInstance?: OrbitControls;

  // ✅ Reactive zoom enable/disable for scroll coordination
  isZoomEnabled = true;

  // ✅ Viewport positioner for CSS-like positioning in 3D
  // Camera is at Z=20, elements positioned at Z=0 plane (viewport plane)
  private readonly positioner = new ViewportPositioner({
    fov: 75,
    cameraZ: 20,
    viewportZ: 0,
  });

  // ✅ Computed getter for current theme
  get theme(): SpaceTheme {
    return this.themeStore.currentTheme();
  }

  // ✅ Scene lighting configuration (reactive to theme)
  get spaceLighting(): SceneLighting {
    return {
      ambient: {
        color: this.ambientLightColor,
        intensity: this.ambientLightIntensity,
      },
      directional: [
        {
          color: this.directionalLightColor,
          intensity: this.directionalLightIntensity,
          position: [30, 15, 25],
          castShadow: true,
          shadowMapSize: 2048,
        },
      ],
    };
  }

  // ================================
  // TEXT POSITIONS (Viewport-mapped)
  // Hero section centered layout with 3 lines - closer together
  // ================================

  readonly nebulaPosition = this.positioner.getPosition('top-right');

  readonly nebulaVolumetricPosition = this.positioner.getPosition('top-right');

  /** Top text: "Build Production Grade AI Apps" - positioned at 38% from top */
  readonly topTextPosition = this.positioner.getPosition({
    x: '50%',
    y: '38%',
  });

  /** Bottom text: "You Already Know" - positioned at 62% from top */
  readonly bottomTextPosition = this.positioner.getPosition({
    x: '50%',
    y: '62%',
  });

  /** Center text: "Hive Academy" - positioned at center (50%) */
  readonly hiveAcademyPosition = this.positioner.getPosition(
    { x: '100%', y: '50%' },
    { offsetZ: -5 }
  );

  readonly planetPosition = this.positioner.getPosition(
    { x: '50%', y: '50%' },
    { offsetZ: -9 }
  );

  readonly moonPosition = this.positioner.getPosition('top-left', {
    offsetX: 10,
    offsetY: -5,
  });
  // ================================
  // LOGO POSITIONS (Viewport-mapped)
  // ================================

  /**
   * Logo positions using viewport percentages
   * Positioned in corners of the viewport for clear visibility
   */
  readonly logoPositions = {
    nestjs: this.positioner.getPosition(
      { x: '20%', y: '85%' },
      { offsetZ: -15 }
    ), // Top right
    langchain: this.positioner.getPosition(
      { x: '40%', y: '85%' },
      { offsetZ: -15 }
    ), // Top left
    chroma: this.positioner.getPosition(
      { x: '60%', y: '85%' },
      { offsetZ: -15 }
    ), // Bottom left
    neo4j: this.positioner.getPosition(
      { x: '80%', y: '85%' },
      { offsetZ: -15 }
    ), // Bottom right
  };

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
    { position: [4, -3, -8], duration: 9, ease: 'easeOut' },
    // Phase 2: Emerge from behind, moving left and forward
    { position: [-8, -5, -5], duration: 10, ease: 'easeInOut' },
    // Phase 3: Cross low to the right side
    { position: [12, -4, 16], duration: 8, ease: 'easeInOut' },
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
    return this.theme.lights.ambient.intensity * 0.05; // Very low for space atmosphere
  }

  get ambientLightColor(): number {
    return this.theme.lights.ambient.color;
  }

  get directionalLightIntensity(): number {
    return this.theme.lights.directional.intensity * 0.3; // Much lower to prevent eye strain
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

  readonly darkPlanetRadius = 3.0; // Human-scale units for 55% viewport coverage

  get darkPlanetBaseColor(): number {
    return Colors3D.material.white.hex; // White base to let texture colors show naturally
  }

  get darkPlanetEmissiveColor(): number {
    return Colors3D.planet.orchid.hex; // Subtle blue atmospheric glow
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

  // ================================
  // SCROLL-ZOOM COORDINATION
  // ================================

  /**
   * Captures the OrbitControls instance from the controls component
   * This is needed to pass it to the scroll coordinator directive
   */
  onControlsChange(event: { distance: number; controls: OrbitControls }): void {
    // Store controls instance on first change event
    if (!this.orbitControlsInstance) {
      this.orbitControlsInstance = event.controls;
      console.log('✅ OrbitControls instance captured for scroll coordinator');
    }
  }

  /**
   * Handles scroll-zoom state changes from the coordinator directive
   * Logs state for debugging and can be used for UI feedback
   */
  onScrollZoomStateChange(state: ScrollZoomState): void {
    // Optional: Add visual feedback when at zoom limits
    if (state.atMaxDistance) {
      console.log('📏 At max zoom distance - page scroll enabled');
    } else if (state.atMinDistance) {
      console.log('📏 At min zoom distance - page scroll enabled');
    }

    // Optional: Store state for UI indicators
    // this.currentZoomState = state;
  }

  /**
   * Handles transitions from 3D zoom to page scroll
   * Can be used to trigger visual effects or analytics
   */
  onScrollTransition(event: { direction: 'up' | 'down' }): void {
    console.log(`🔄 Transitioning to page scroll: ${event.direction}`);

    // Optional: Add visual feedback or analytics
    // if (event.direction === 'down') {
    //   this.showScrollHint = true;
    // }
  }

  /**
   * Handles zoom enable/disable changes from the scroll coordinator
   * Updates the reactive property that's bound to [enableZoom]
   */
  onZoomEnabledChange(enabled: boolean): void {
    this.isZoomEnabled = enabled;
    console.log(`🎮 Zoom ${enabled ? 'enabled' : 'disabled'} via binding`);
  }
}
