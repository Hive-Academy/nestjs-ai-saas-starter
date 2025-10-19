/**
 * HeroSceneGraphComponent - Hero Section 3D Background Scene
 *
 * Renders the 3D background elements for the hero section:
 * - Lighting setup (ambient + directional + point)
 * - Floating spheres with GSAP animations
 * - Animated background cubes/particles
 *
 * DOM content (text, badges, buttons) is rendered as HTML overlay, not 3D meshes.
 */

import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { extend } from 'angular-three';
import { AmbientLight, DirectionalLight, PointLight } from 'three';
import { FloatingSphereComponent } from '../../../core/angular-3d/components/primitives/floating-sphere.component';
import { BackgroundCubeComponent } from '../../../core/angular-3d/components/primitives/background-cube.component';
import { ParticleSystemComponent } from '../../../core/angular-3d/components/primitives/particle-system.component';

// Register Three.js lights as Angular Three components
extend({ AmbientLight, DirectionalLight, PointLight });

@Component({
  selector: 'app-hero-scene-graph',
  standalone: true,
  imports: [
    FloatingSphereComponent,
    BackgroundCubeComponent,
    ParticleSystemComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Lighting Setup -->
    <ngt-ambient-light [intensity]="0.8" [color]="ambientColor" />
    <ngt-directional-light
      [position]="[10, 10, 10]"
      [intensity]="1.5"
      [castShadow]="true"
    />
    <ngt-point-light
      [position]="[-10, 5, 5]"
      [intensity]="0.8"
      [color]="purpleColor"
    />

    <!-- Floating Spheres - positioned to orbit and FLOAT OVER center content -->
    <!-- Smaller radius + closer z-distance to prevent zoom effect -->

    <!-- Top-left orbit -->
    <app-floating-sphere
      [position]="[-6, 3, 0.5]"
      [radius]="0.5"
      [color]="purpleColor"
      [metalness]="0.3"
      [roughness]="0.1"
      [emissive]="purpleColor"
      [emissiveIntensity]="0.2"
      [floatConfig]="{
        height: 1.2,
        speed: 2800,
        delay: 0,
        ease: 'sine.inOut',
        autoStart: true
      }"
      [glowConfig]="{ color: purpleColor, opacity: 0.2, scale: 1.5 }"
    />

    <!-- Top-right orbit -->
    <app-floating-sphere
      [position]="[6, 2, 0.3]"
      [radius]="0.45"
      [color]="pinkColor"
      [metalness]="0.3"
      [roughness]="0.1"
      [emissive]="pinkColor"
      [emissiveIntensity]="0.2"
      [floatConfig]="{
        height: 1.5,
        speed: 3200,
        delay: 400,
        ease: 'sine.inOut',
        autoStart: true
      }"
      [glowConfig]="{ color: pinkColor, opacity: 0.2, scale: 1.5 }"
    />

    <!-- Bottom-left orbit -->
    <app-floating-sphere
      [position]="[-5, -3, 0.7]"
      [radius]="0.5"
      [color]="cyanColor"
      [metalness]="0.3"
      [roughness]="0.1"
      [emissive]="cyanColor"
      [emissiveIntensity]="0.2"
      [floatConfig]="{
        height: 1.3,
        speed: 3000,
        delay: 800,
        ease: 'sine.inOut',
        autoStart: true
      }"
      [glowConfig]="{ color: cyanColor, opacity: 0.2, scale: 1.5 }"
    />

    <!-- Right orbit -->
    <app-floating-sphere
      [position]="[7, 0, 0.4]"
      [radius]="0.4"
      [color]="greenColor"
      [metalness]="0.3"
      [roughness]="0.1"
      [emissive]="greenColor"
      [emissiveIntensity]="0.2"
      [floatConfig]="{
        height: 1.4,
        speed: 2600,
        delay: 1200,
        ease: 'sine.inOut',
        autoStart: true
      }"
      [glowConfig]="{ color: greenColor, opacity: 0.2, scale: 1.5 }"
    />

    <!-- Left orbit -->
    <app-floating-sphere
      [position]="[-7, 0, 0.6]"
      [radius]="0.55"
      [color]="goldColor"
      [metalness]="0.3"
      [roughness]="0.1"
      [emissive]="goldColor"
      [emissiveIntensity]="0.2"
      [floatConfig]="{
        height: 1.6,
        speed: 3400,
        delay: 1600,
        ease: 'sine.inOut',
        autoStart: true
      }"
      [glowConfig]="{ color: goldColor, opacity: 0.2, scale: 1.5 }"
    />

    <!-- Particle System (increased to 700 particles avoiding center) -->
    <app-particle-system
      [particleCount]="700"
      [colorPalette]="particleColors"
      [exclusionZone]="{ x: 8, y: 4 }"
      [size]="1.2"
      [opacity]="0.7"
    />

    <!-- Animated Background Cubes - 35 cubes positioned at edges -->
    @for (cube of backgroundCubes; track $index) {
    <app-background-cube
      [position]="cube.position"
      [size]="cube.size"
      [color]="cube.color"
      [rotation]="cube.rotation"
      [transparent]="true"
      [opacity]="0.6"
      [floatConfig]="cube.floatConfig"
    />
    }
  `,
})
export class HeroSceneGraphComponent {
  // Color constants (hex literals not allowed in Angular templates)
  readonly ambientColor = 0x404080;
  readonly purpleColor = 0x8a2be2;
  readonly pinkColor = 0xff69b4;
  readonly cyanColor = 0x00bfff;
  readonly greenColor = 0x32cd32;
  readonly goldColor = 0xffd700;

  // Particle colors - brighter/more visible colors for better contrast
  readonly particleColors = [
    '#8a2be2', // Bright purple
    '#9b59d6', // Medium bright purple
    '#7b3ab3', // Visible purple
    '#a960ee', // Light purple
    '#6a2ba7', // Deep purple (but still visible)
  ];

  // Background cubes configuration - positioned at edges avoiding center
  readonly backgroundCubes = this.generateBackgroundCubes();

  /**
   * Generate 80 background cubes positioned at edges (increased from 35)
   * Based on hero-section-old.component.ts lines 680-770
   */
  private generateBackgroundCubes() {
    const cubes = [];
    const cubeCount = 80; // Increased for denser atmosphere

    // Brighter, more visible colors with better lighting
    const cubeColors = [
      0x7b3ab3, // Bright visible purple
      0x6a2ba7, // Medium bright purple
      0x5e3179, // Visible purple
      0x8a2be2, // Bright purple (blueviolet)
      0x9b59d6, // Light purple
      0x4a2d6e, // Deep but visible purple
    ];

    for (let i = 0; i < cubeCount; i++) {
      // Smaller, more varied cube sizes (line 696)
      const size = 0.8 + Math.random() * 1.8;

      let x = 0;
      let y = 0;
      let z = 0;

      // Create distinct zones: top, bottom, left, right edges (lines 714-737)
      const zone = Math.floor(Math.random() * 4);

      switch (zone) {
        case 0: // Top area
          x = (Math.random() - 0.5) * 50;
          y = 8 + Math.random() * 15; // High up
          z = -8 + Math.random() * -20;
          break;
        case 1: // Bottom area
          x = (Math.random() - 0.5) * 50;
          y = -8 - Math.random() * 15; // Down low
          z = -8 + Math.random() * -20;
          break;
        case 2: // Left side
          x = -15 - Math.random() * 25; // Far left
          y = (Math.random() - 0.5) * 30;
          z = -8 + Math.random() * -20;
          break;
        case 3: // Right side
          x = 15 + Math.random() * 25; // Far right
          y = (Math.random() - 0.5) * 30;
          z = -8 + Math.random() * -20;
          break;
      }

      // Ensure we stay away from the central text area (-10 to 10 x, -6 to 6 y) (lines 739-747)
      if (Math.abs(x) < 12 && Math.abs(y) < 8) {
        // Push further out if too close to center
        if (Math.abs(x) > Math.abs(y)) {
          x = x > 0 ? 15 + Math.random() * 10 : -15 - Math.random() * 10;
        } else {
          y = y > 0 ? 10 + Math.random() * 8 : -10 - Math.random() * 8;
        }
      }

      cubes.push({
        position: [x, y, z] as [number, number, number],
        size,
        color: cubeColors[Math.floor(Math.random() * cubeColors.length)],
        rotation: [
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        ] as [number, number, number],
        floatConfig: {
          height: 1.0 + Math.random() * 1.0, // Increased amplitude (1.0-2.0 units)
          speed: 2500 + Math.random() * 2000, // Smoother speed range (2500-4500ms)
          delay: Math.random() * 2000,
          ease: 'sine.inOut', // Smoother sine easing for natural motion
          autoStart: true,
        },
      });
    }

    return cubes;
  }
}
