/**
 * HeroSpaceSceneComponent - Composable Space Scene with Theme Support
 *
 * Composes space primitives (planet, stars, nebula, background) into a complete scene.
 * Supports multiple color themes via SpaceThemeStore service.
 *
 * Features:
 * - Central planet with rotation
 * - Multi-layer star field
 * - Nebula clouds
 * - Themed gradient background
 * - Customizable lighting setup
 * - Reactive theme switching via SpaceThemeStore
 *
 * Usage:
 * ```html
 * <a3d-scene-3d [cameraPosition]="[0, 0, 15]">
 *   <app-hero-space-scene />
 * </a3d-scene-3d>
 * ```
 *
 * Theme switching handled automatically via SpaceThemeStore injection.
 */

import { Component, inject } from '@angular/core';
import { OrbitControls } from 'three-stdlib';

// Import 3D primitives, directives, and lights from the library
import {
  BloomEffectComponent,
  OrbitControlsComponent,
  NebulaVolumetricComponent,
  PlanetComponent,
  SmokeTroikaTextComponent,
  StarFieldComponent,
  GltfModelComponent,
  NebulaComponent,
  SvgIconComponent,
  ParticleTextComponent,
  Rotate3dDirective,
  ScrollZoomCoordinatorDirective,
  Float3dDirective,
  SpaceFlight3dDirective,
  AmbientLightComponent,
  DirectionalLightComponent,
} from '@hive-academy/angular-3d';

import type {
  SpaceFlightWaypoint,
  ScrollZoomDetailedState,
  OrbitControlsChangeEvent,
} from '@hive-academy/angular-3d';

// Import local-only modules (relocated from angular-3d)
import { Colors3D } from '../../../../core/config/colors.config';
import { SpaceThemeStore } from '../../../../core/stores/space-theme.store';
import type { SpaceTheme } from '../../../../core/types/space-theme.types';
import { ViewportPositioner } from '../../../../core/utils/viewport-3d-positioning';

@Component({
  selector: 'app-hero-space-scene',
  standalone: true,
  imports: [
    PlanetComponent,
    StarFieldComponent,
    NebulaVolumetricComponent,
    BloomEffectComponent,
    OrbitControlsComponent,
    NebulaComponent,
    GltfModelComponent,
    SmokeTroikaTextComponent,
    SvgIconComponent,
    ParticleTextComponent,
    Rotate3dDirective,
    ScrollZoomCoordinatorDirective,
    Float3dDirective,
    SpaceFlight3dDirective,
    AmbientLightComponent,
    DirectionalLightComponent,
  ],
  template: `
    <!-- ================================ -->
    <!-- CAMERA CONTROLS (OrbitControls with Scroll Coordination) -->
    <!-- ================================ -->
    <a3d-orbit-controls
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
      (detailedStateChange)="onScrollZoomStateChange($event)"
      (scrollTransition)="onScrollTransition($event)"
      (zoomEnabledChange)="onZoomEnabledChange($event)"
    />

    <!-- ================================ -->
    <!-- LIGHTING SETUP (Theme-based) -->
    <!-- ================================ -->
    <a3d-ambient-light
      [color]="ambientLightColor"
      [intensity]="ambientLightIntensity"
    />
    <a3d-directional-light
      [color]="directionalLightColor"
      [intensity]="directionalLightIntensity"
      [position]="[30, 15, 25]"
      [castShadow]="true"
    />

    <!-- Mini Robot #1 - Flying through space -->
    <a3d-gltf-model
      [modelPath]="'/assets/3d/mini_robot.glb'"
      [position]="[3, 6, -8]"
      [scale]="0.05"
      [rotation]="[0, 0, 0]"
      [useDraco]="false"
      [metalness]="0.4"
      [roughness]="0.6"
      a3dSpaceFlight3d
      [flightPath]="robot1FlightPath"
      [rotationsPerCycle]="4"
      [autoStart]="true"
      [loop]="true"
    />

    <!-- Robo Head - Flying through space -->
    <a3d-gltf-model
      [modelPath]="'/assets/3d/robo_head/scene.gltf'"
      [position]="[4, 6, -6]"
      [scale]="1"
      [rotation]="[0, 0, 0]"
      [useDraco]="false"
      [metalness]="0.5"
      [roughness]="0.5"
      a3dSpaceFlight3d
      [flightPath]="robot2FlightPath"
      [rotationsPerCycle]="4"
      [autoStart]="true"
      [loop]="true"
    />

    <!-- ================================ -->
    <!-- REALISTIC EARTH PLANET -->
    <!-- ================================ -->
    <a3d-gltf-model
      [modelPath]="'/assets/3d/planet_earth/scene.gltf'"
      [position]="planetPosition"
      [scale]="2.3"
      [rotation]="[0, 0, 0]"
      [useDraco]="false"
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

    <a3d-planet
      [position]="moonPosition"
      [radius]="darkPlanetRadius"
      [segments]="150"
      [textureUrl]="'assets/moon.jpg'"
      [color]="darkPlanetBaseColor"
      [emissive]="darkPlanetEmissiveColor"
      [emissiveIntensity]="darkPlanetEmissiveIntensity"
      [glowColor]="darkPlanetGlowColor"
      [glowIntensity]="darkPlanetGlowIntensity"
      [glowDistance]="20"
    />

    <a3d-particle-text
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

    <a3d-particle-text
      text="With Typescript Patterns"
      [position]="textCenterPosition"
      [fontSize]="25"
      [particleColor]="colors.neon.indigo.hex"
      [opacity]="0.35"
      [maxParticleScale]="0.04"
      [particlesPerPixel]="3"
      [blendMode]="'normal'"
      [skipInitialGrowth]="true"
      [particleGrowSpeed]="0.02"
      [pulseSpeed]="0.005"
    />

    <a3d-particle-text
      text="You Already Know"
      [position]="bottomTextPosition"
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

    <!-- Center Text: "Hive Academy" (White Smoke) -->
    <a3d-smoke-troika-text
      text="Hive Academy"
      [position]="hiveAcademyPosition"
      [fontSize]="40"
      [smokeColor]="colors.material.white.hex"
      [fillOpacity]="0.9"
      [flowSpeed]="0.015"
      [edgeSoftness]="0.04"
    />

    <!-- ================================ -->
    <!-- TECH STACK LOGOS (SVG Icons) -->
    <!-- ================================ -->

    <!-- NestJS Logo -->
    <a3d-svg-icon
      [svgPath]="'/assets/images/logos/nestjs.svg'"
      [position]="logoPositions.nestjs"
      [scale]="0.05"
      [rotation]="[Math.PI, 0, 0]"
      [depth]="0.5"
      [useNativeColors]="false"
      [color]="colors.brand.nestjs.hex"
      [emissive]="colors.brand.nestjs.hex"
      [emissiveIntensity]="0.3"
      [metalness]="0.2"
      [roughness]="0.6"
      float3d
      [floatConfig]="{
        height: 0.2,
        speed: 2000,
        delay: 0,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />

    <!-- LangChain Logo -->
    <a3d-svg-icon
      [svgPath]="'/assets/images/logos/langchain.svg'"
      [position]="logoPositions.langchain"
      [scale]="0.2"
      [rotation]="[Math.PI, 0, 0]"
      [depth]="0.5"
      [useNativeColors]="false"
      [color]="colors.brand.langchain.hex"
      [emissive]="colors.accent.emerald.hex"
      [emissiveIntensity]="0.4"
      [metalness]="0.2"
      [roughness]="0.6"
      float3d
      [floatConfig]="{
        height: 0.2,
        speed: 2000,
        delay: 0,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />

    <!-- ChromaDB Logo -->
    <a3d-svg-icon
      [svgPath]="'/assets/images/logos/chroma.svg'"
      [position]="logoPositions.chroma"
      [scale]="1"
      [rotation]="[Math.PI, 0, 0]"
      [depth]="0.5"
      [emissiveIntensity]="0.5"
      [metalness]="0.1"
      [roughness]="0.7"
      float3d
      [floatConfig]="{
        height: 0.2,
        speed: 2000,
        delay: 0,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />

    <!-- Neo4j Logo -->
    <a3d-svg-icon
      [svgPath]="'/assets/images/logos/neo4j.svg'"
      [position]="logoPositions.neo4j"
      [scale]="0.05"
      [rotation]="[Math.PI, 0, 0]"
      [depth]="0.5"
      [useNativeColors]="false"
      [color]="colors.brand.neo4j.hex"
      [emissive]="colors.brand.neo4j.hex"
      [emissiveIntensity]="0.3"
      [metalness]="0.2"
      [roughness]="0.6"
      float3d
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
    <a3d-star-field [starCount]="3000" [radius]="50" [enableTwinkle]="true" />

    <a3d-star-field [starCount]="2000" [radius]="40" [enableTwinkle]="false" />

    <a3d-star-field [starCount]="2500" [radius]="30" [enableTwinkle]="true" />

    <!-- MAIN NEBULA -->
    <a3d-nebula
      [cloudCount]="60"
      [radius]="20"
      [colorPalette]="['#ffffff', '#cccccc']"
      [minSize]="5"
      [maxSize]="20"
      [enableFlow]="false"
      [position]="nebulaPosition"
    />

    <a3d-nebula-volumetric
      [width]="60"
      [height]="20"
      [layers]="2"
      [opacity]="0.9"
      [primaryColor]="34047"
      [secondaryColor]="54527"
      [tertiaryColor]="16739284"
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
    <a3d-bloom-effect [threshold]="0.8" [strength]="0.5" [radius]="0.4" />
  `,
})
export class HeroSpaceSceneComponent {
  // Inject theme store for reactive theme support
  private readonly themeStore = inject(SpaceThemeStore);

  // Math constant for template
  readonly Math = Math;

  // Color configuration for 3D elements
  readonly colors = Colors3D;

  // Store orbit controls reference for scroll coordinator
  public orbitControlsInstance?: OrbitControls;

  // Reactive zoom enable/disable for scroll coordination
  public isZoomEnabled = true;

  // Viewport positioner for CSS-like positioning in 3D
  private readonly positioner = new ViewportPositioner({
    fov: 75,
    cameraZ: 20,
    viewportZ: 0,
  });

  // Computed getter for current theme
  get theme(): SpaceTheme {
    return this.themeStore.currentTheme();
  }

  // ================================
  // TEXT POSITIONS (Viewport-mapped)
  // ================================

  readonly nebulaPosition = this.positioner.getPosition('top-right');
  readonly nebulaVolumetricPosition = this.positioner.getPosition('top-right');

  readonly topTextPosition = this.positioner.getPosition({
    x: '50%',
    y: '38%',
  });

  readonly textCenterPosition = this.positioner.getPosition({
    x: '50%',
    y: '50%',
  });

  readonly bottomTextPosition = this.positioner.getPosition({
    x: '50%',
    y: '62%',
  });

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
  readonly logoPositions = {
    nestjs: this.positioner.getPosition(
      { x: '20%', y: '85%' },
      { offsetZ: -15 }
    ),
    langchain: this.positioner.getPosition(
      { x: '40%', y: '85%' },
      { offsetZ: -15 }
    ),
    chroma: this.positioner.getPosition(
      { x: '60%', y: '85%' },
      { offsetZ: -15 }
    ),
    neo4j: this.positioner.getPosition(
      { x: '80%', y: '85%' },
      { offsetZ: -15 }
    ),
  };

  // ================================
  // ROBOT FLIGHT PATHS
  // ================================
  readonly robot1FlightPath: SpaceFlightWaypoint[] = [
    { position: [-12, 8, -8], duration: 10, easing: 'easeInOut' },
    { position: [10, 12, -5], duration: 8, easing: 'easeInOut' },
    { position: [-6, 4, 10], duration: 9, easing: 'easeIn' },
    { position: [8, 10, -12], duration: 11, easing: 'easeOut' },
    { position: [-12, 8, -8], duration: 8, easing: 'easeInOut' },
  ];

  readonly robot2FlightPath: SpaceFlightWaypoint[] = [
    { position: [4, -3, -8], duration: 9, easing: 'easeOut' },
    { position: [-8, -5, -5], duration: 10, easing: 'easeInOut' },
    { position: [12, -4, 16], duration: 8, easing: 'easeInOut' },
    { position: [10, -6, -15], duration: 11, easing: 'easeIn' },
    { position: [-6, -5, -10], duration: 9, easing: 'easeInOut' },
    { position: [4, -3, -20], duration: 8, easing: 'easeInOut' },
  ];

  // ================================
  // LIGHTING (Theme-based getters)
  // ================================
  get ambientLightIntensity(): number {
    return this.theme.lights.ambient.intensity * 0.05;
  }

  get ambientLightColor(): number {
    return this.theme.lights.ambient.color;
  }

  get directionalLightIntensity(): number {
    return this.theme.lights.directional.intensity * 0.3;
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
    const color =
      this.theme.background.colors[this.theme.background.colors.length - 1];
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  readonly darkPlanetRadius = 3.0;

  get darkPlanetBaseColor(): number {
    return Colors3D.material.white.hex;
  }

  get darkPlanetEmissiveColor(): number {
    return Colors3D.planet.orchid.hex;
  }

  get darkPlanetEmissiveIntensity(): number {
    return 0.3;
  }

  get darkPlanetGlowColor(): number {
    return Colors3D.planet.atmosphereCyan.hex;
  }

  get darkPlanetGlowIntensity(): number {
    return 0.2;
  }

  // ================================
  // STARS (Theme-based getters)
  // ================================
  get starColors(): string[] {
    return this.theme.stars.colors;
  }

  get starSize(): number {
    return this.theme.stars.sizes.min;
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

  onControlsChange(event: OrbitControlsChangeEvent): void {
    if (!this.orbitControlsInstance) {
      this.orbitControlsInstance = event.controls;
    }
  }

  onScrollZoomStateChange(state: ScrollZoomDetailedState): void {
    if (state.atMaxDistance) {
      console.log('At max zoom distance - page scroll enabled');
    } else if (state.atMinDistance) {
      console.log('At min zoom distance - page scroll enabled');
    }
  }

  onScrollTransition(event: { direction: 'up' | 'down' }): void {
    console.log(`Transitioning to page scroll: ${event.direction}`);
  }

  onZoomEnabledChange(enabled: boolean): void {
    this.isZoomEnabled = enabled;
  }
}
