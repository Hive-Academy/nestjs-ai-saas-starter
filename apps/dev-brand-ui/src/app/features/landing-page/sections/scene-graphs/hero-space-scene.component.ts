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
    GlowParticleTextComponent,
    SVGIconComponent,
    SceneLightingComponent,
  ],
  template: `
    <!-- ================================ -->
    <!-- SCENE BACKGROUND COLOR -->
    <!-- ================================ -->
    <!-- <ngt-color attach="background" *args="[backgroundColorHex]" /> -->

    <!-- ================================ -->
    <!-- CAMERA CONTROLS (OrbitControls) -->
    <!-- ================================ -->
    <!-- Click and drag to orbit around viewport center, scroll to zoom -->
    <app-orbit-controls
      [target]="[0, 0, 0]"
      [enableDamping]="true"
      [dampingFactor]="0.05"
      [enableZoom]="true"
      [minDistance]="5"
      [maxDistance]="50"
      [rotateSpeed]="0.5"
      [enablePan]="false"
    />

    <!-- ================================ -->
    <!-- LIGHTING SETUP (Theme-based) -->
    <!-- ================================ -->
    <app-scene-lighting [config]="spaceLighting" />

    <!-- Mini Robot #1 - Flying through space (Smaller scale for new viewport) -->
    <app-gltf-model
      [modelPath]="'/assets/3d/mini_robot.glb'"
      [position]="[3, 6, -8]"
      [scale]="0.015"
      [rotation]="[0, 0, 0]"
      [useDraco]="false"
      [emissiveIntensity]="0.3"
      [metalness]="0.8"
      [roughness]="0.2"
      [spaceFlightPath]="robot1FlightPath"
      [spaceFlightRotations]="4"
      [spaceFlightAutoStart]="true"
      [spaceFlightLoop]="true"
    />

    <!-- Robo Head - Flying through space (Smaller scale for new viewport) -->
    <app-gltf-model
      [modelPath]="'/assets/3d/robo_head/scene.gltf'"
      [position]="[4, 0, -6]"
      [scale]="0.25"
      [rotation]="[0, 0, 0]"
      [useDraco]="false"
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

    <!-- Top Pill Text: "Build Production" (Glow Particle Text) -->
    <app-glow-particle-text
      text="Build Production"
      [position]="topTextPosition"
      [fontSize]="30"
      [particleDensity]="70"
      [glowColor]="colors.neon.indigo.hex"
      [glowIntensity]="3.5"
      [pulseSpeed]="1.5"
      [pulseAmount]="0.2"
    />

    <!-- Large Text: "Grade AI Apps" (Glow Particle Text) -->
    <app-glow-particle-text
      text="Grade AI Apps"
      [position]="largeTextPosition"
      [fontSize]="90"
      [particleDensity]="70"
      [glowColor]="colors.neon.purple.hex"
      [glowIntensity]="3.5"
      [pulseSpeed]="1.8"
      [pulseAmount]="0.2"
    />

    <!-- Center Smoke Text: "With TypeScript" (Smoke Particle Text) -->
    <app-smoke-particle-text
      text="With TypeScript"
      [position]="centerTextPosition"
      [fontSize]="90"
      [particleDensity]="50"
      [particleSize]="0.03"
      [smokeColor]="colors.material.white.hex"
      [opacity]="0.8"
      [driftSpeed]="0.02"
      [driftAmount]="0.05"
    />

    <!-- Second Smoke Text: "Patterns" (Smoke Particle Text) -->
    <app-smoke-particle-text
      text="Patterns"
      [position]="patternsTextPosition"
      [fontSize]="90"
      [particleDensity]="50"
      [particleSize]="0.03"
      [smokeColor]="colors.material.lightGray.hex"
      [opacity]="0.8"
      [driftSpeed]="0.02"
      [driftAmount]="0.05"
    />

    <!-- Bottom Pill Text: "You Already Know" (Glow Particle Text) -->
    <app-glow-particle-text
      text="You Already Know"
      [position]="bottomTextPosition"
      [fontSize]="30"
      [particleDensity]="70"
      [glowColor]="colors.neon.cyan.hex"
      [glowIntensity]="3.5"
      [pulseSpeed]="2.0"
      [pulseAmount]="0.2"
    />

    <!-- ================================ -->
    <!-- TECH STACK LOGOS (SVG Icons) -->
    <!-- ================================ -->
    <!-- Circular orbit pattern around the center -->

    <!-- NestJS Logo - Top Right (Official Red) -->
    <app-svg-icon
      [svgPath]="'/assets/images/logos/nestjs.svg'"
      [position]="logoPositions.nestjs"
      [scale]="0.015"
      [extrudeDepth]="0.5"
      [colorOverride]="true"
      [color]="colors.brand.nestjs.hex"
      [emissive]="colors.brand.nestjs.hex"
      [emissiveIntensity]="0.3"
      [metalness]="0.2"
      [roughness]="0.6"
      [castShadow]="true"
      [receiveShadow]="true"
    />

    <!-- LangChain Logo - Top Left (Dark Green with Emerald Glow) -->
    <app-svg-icon
      [svgPath]="'/assets/images/logos/langchain.svg'"
      [position]="logoPositions.langchain"
      [scale]="0.015"
      [extrudeDepth]="0.5"
      [colorOverride]="true"
      [color]="colors.brand.langchain.hex"
      [emissive]="colors.accent.emerald.hex"
      [emissiveIntensity]="0.4"
      [metalness]="0.2"
      [roughness]="0.6"
      [castShadow]="true"
      [receiveShadow]="true"
    />

    <!-- ChromaDB Logo - Bottom Left (Multi-color: Blue, Yellow, Red) -->
    <app-svg-icon
      [svgPath]="'/assets/images/logos/chroma.svg'"
      [position]="logoPositions.chroma"
      [scale]="0.015"
      [extrudeDepth]="0.5"
      [emissiveIntensity]="0.5"
      [metalness]="0.1"
      [roughness]="0.7"
      [castShadow]="true"
      [receiveShadow]="true"
    />

    <!-- Neo4j Logo - Bottom Right (Official Blue) -->
    <app-svg-icon
      [svgPath]="'/assets/images/logos/neo4j.svg'"
      [position]="logoPositions.neo4j"
      [scale]="0.015"
      [extrudeDepth]="0.5"
      [colorOverride]="true"
      [color]="colors.brand.neo4j.hex"
      [emissive]="colors.brand.neo4j.hex"
      [emissiveIntensity]="0.3"
      [metalness]="0.2"
      [roughness]="0.6"
      [castShadow]="true"
      [receiveShadow]="true"
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
      [particleCount]="120"
      [radius]="40"
      [colorPalette]="['#ffffff', '#cccccc']"
      [minSize]="20"
      [maxSize]="40"
      [maxOpacity]="0.2"
      [flow]="false"
      [position]="[-60, 0, -100]"
    />

    <app-nebula-volumetric
      [width]="120"
      [height]="60"
      [layers]="6"
      [opacity]="0.5"
      [primaryColor]="'#0088ff'"
      [secondaryColor]="'#00d4ff'"
      [tertiaryColor]="'#ff6bd4'"
      [enableFlow]="false"
      [flowSpeed]="0.8"
      [noiseScale]="0.01"
      [density]="1.1"
      [edgeSoftness]="0.5"
      [contrast]="1.0"
      [glowIntensity]="20"
      [colorIntensity]="2"
      [position]="[-30, 0, -80]"
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
  // ================================

  /** Top text: "Build Production" - positioned at 15% from top */
  readonly topTextPosition = this.positioner.getPosition({
    x: '50%',
    y: '15%',
  });

  /** Large text: "Grade AI Apps" - positioned slightly below top text */
  readonly largeTextPosition = this.positioner.getPosition({
    x: '50%',
    y: '25%',
  });

  /** Center smoke text: "With TypeScript" - positioned at center */
  readonly centerTextPosition = this.positioner.getPosition('center');

  /** Second smoke text: "Patterns" - positioned slightly below center */
  readonly patternsTextPosition = this.positioner.getPosition({
    x: '50%',
    y: '55%',
  });

  /** Bottom text: "You Already Know" - positioned at 85% from top */
  readonly bottomTextPosition = this.positioner.getPosition({
    x: '50%',
    y: '85%',
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
      { x: '85%', y: '20%' },
      { offsetZ: -2 }
    ), // Top right
    langchain: this.positioner.getPosition(
      { x: '15%', y: '20%' },
      { offsetZ: -2 }
    ), // Top left
    chroma: this.positioner.getPosition(
      { x: '15%', y: '80%' },
      { offsetZ: -2 }
    ), // Bottom left
    neo4j: this.positioner.getPosition({ x: '85%', y: '80%' }, { offsetZ: -2 }), // Bottom right
  };

  /**
   * Flight paths for each logo
   * Each logo orbits in its own unique pattern
   */
  readonly logoFlightPaths = {
    // NestJS - Circular orbit (clockwise)
    nestjs: [
      { position: [6, 4, 5], duration: 10, ease: 'easeInOut' },
      { position: [6, -4, 5], duration: 10, ease: 'easeInOut' },
      { position: [-6, -4, 5], duration: 10, ease: 'easeInOut' },
      { position: [-6, 4, 5], duration: 10, ease: 'easeInOut' },
      { position: [6, 4, 5], duration: 10, ease: 'easeInOut' },
    ] as SpaceFlightWaypoint[],

    // LangChain - Figure-8 pattern
    langchain: [
      { position: [-6, 4, 5], duration: 8, ease: 'easeInOut' },
      { position: [0, 0, 7], duration: 8, ease: 'easeInOut' },
      { position: [-6, -4, 5], duration: 8, ease: 'easeInOut' },
      { position: [0, 0, 3], duration: 8, ease: 'easeInOut' },
      { position: [-6, 4, 5], duration: 8, ease: 'easeInOut' },
    ] as SpaceFlightWaypoint[],

    // ChromaDB - Vertical wave pattern
    chroma: [
      { position: [-6, -4, 5], duration: 9, ease: 'easeInOut' },
      { position: [-8, 0, 6], duration: 9, ease: 'easeInOut' },
      { position: [-6, 4, 5], duration: 9, ease: 'easeInOut' },
      { position: [-4, 0, 4], duration: 9, ease: 'easeInOut' },
      { position: [-6, -4, 5], duration: 9, ease: 'easeInOut' },
    ] as SpaceFlightWaypoint[],

    // Neo4j - Horizontal wave pattern
    neo4j: [
      { position: [6, -4, 5], duration: 9, ease: 'easeInOut' },
      { position: [8, -2, 6], duration: 9, ease: 'easeInOut' },
      { position: [6, 0, 7], duration: 9, ease: 'easeInOut' },
      { position: [4, -2, 4], duration: 9, ease: 'easeInOut' },
      { position: [6, -4, 5], duration: 9, ease: 'easeInOut' },
    ] as SpaceFlightWaypoint[],
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
