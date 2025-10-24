/**
 * HeroSceneGraphComponent - Hero Section 3D Background Scene
 *
 * Renders the 3D background elements for the hero section:
 * - Lighting setup (ambient + directional + point)
 * - Floating spheres with GSAP animations
 * - Animated background cubes via BackgroundCubesComponent
 * - Particle system
 *
 * DOM content (text, badges, buttons) is rendered as HTML overlay, not 3D meshes.
 */

import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { extend } from 'angular-three';
import { AmbientLight, DirectionalLight, PointLight } from 'three';
import { PolyhedronComponent } from '../../../core/angular-3d/components/primitives/polyhedron.component';
import { CylinderComponent } from '../../../core/angular-3d/components/primitives/cylinder.component';
import { TorusComponent } from '../../../core/angular-3d/components/primitives/torus.component';
import { BoxComponent } from '../../../core/angular-3d/components/primitives/box.component';
import { Text3DComponent } from '../../../core/angular-3d/components/primitives/text-3d.component';
import { BackgroundCubesComponent } from '../../../core/angular-3d/components/primitives/background-cubes.component';
import { ParticleSystemComponent } from '../../../core/angular-3d/components/primitives/particle-system.component';

// Register Three.js lights as Angular Three components
// TODO: create shared abstractions for these lights to be applied across scenes
extend({ AmbientLight, DirectionalLight, PointLight });

@Component({
  selector: 'app-hero-scene-graph',
  standalone: true,
  imports: [
    PolyhedronComponent,
    CylinderComponent,
    TorusComponent,
    BoxComponent,
    Text3DComponent,
    BackgroundCubesComponent,
    ParticleSystemComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Enhanced Lighting Setup with Multiple Colored Lights -->
    <ngt-ambient-light [intensity]="1.2" [color]="whiteColor" />
    <ngt-directional-light
      [position]="[10, 10, 10]"
      [intensity]="2.0"
      [castShadow]="true"
    />
    <!-- Purple accent light from left -->
    <ngt-point-light
      [position]="[-10, 5, 5]"
      [intensity]="1.5"
      [color]="purpleColor"
      [castShadow]="true"
    />
    <!-- Pink accent light from right -->
    <ngt-point-light
      [position]="[10, 5, 5]"
      [intensity]="1.5"
      [color]="pinkColor"
      [castShadow]="true"
    />
    <!-- Cyan bottom light for depth -->
    <ngt-point-light
      [position]="[0, -5, 8]"
      [intensity]="1.0"
      [color]="cyanColor"
    />

    <!-- Tech Shapes - Using dedicated primitive components + Text Labels + Glow Effects -->

    <!-- AI Brain (Icosahedron) - TOP LEFT EDGE -->
    <app-polyhedron
      type="icosahedron"
      [position]="[-12, 6, 1]"
      [rotation]="[0.3, 0.5, 0]"
      [radius]="0.7"
      [color]="purpleColor"
      [emissive]="purpleColor"
      [emissiveIntensity]="0.3"
      [metalness]="0.7"
      [roughness]="0.3"
      [floatConfig]="{
        height: 1.0,
        speed: 3500,
        delay: 0,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />
    <!-- Subtle glow light -->
    <ngt-point-light
      [position]="[-12, 6, 2]"
      [intensity]="1.2"
      [color]="purpleColor"
      [distance]="4"
      [decay]="2"
    />

    <!-- Network Node (Octahedron) - TOP RIGHT EDGE -->
    <app-polyhedron
      type="octahedron"
      [position]="[12, 6, -1]"
      [rotation]="[0.2, 0.8, 0.1]"
      [radius]="0.7"
      [color]="pinkColor"
      [emissive]="pinkColor"
      [emissiveIntensity]="0.3"
      [metalness]="0.7"
      [roughness]="0.3"
      [floatConfig]="{
        height: 1.0,
        speed: 3200,
        delay: 400,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />
    <!-- Subtle glow light -->
    <ngt-point-light
      [position]="[12, 6, 2]"
      [intensity]="1.2"
      [color]="pinkColor"
      [distance]="4"
      [decay]="2"
    />

    <!-- Database Stack (Cylinder) - BOTTOM LEFT EDGE -->
    <app-cylinder
      [position]="[-12, -6, 1]"
      [radiusTop]="0.6"
      [radiusBottom]="0.6"
      [height]="1.2"
      [color]="cyanColor"
      [emissive]="cyanColor"
      [emissiveIntensity]="0.3"
      [metalness]="0.7"
      [roughness]="0.3"
      [floatConfig]="{
        height: 1.0,
        speed: 3000,
        delay: 800,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />
    <!-- Subtle glow light -->
    <ngt-point-light
      [position]="[-12, -6, 2]"
      [intensity]="1.2"
      [color]="cyanColor"
      [distance]="4"
      [decay]="2"
    />

    <!-- Cloud/Connectivity (Torus) - BOTTOM RIGHT EDGE -->
    <app-torus
      [position]="[12, -6, 1]"
      [rotation]="[0.5, 0.3, 0.2]"
      [radius]="0.6"
      [tube]="0.22"
      [color]="greenColor"
      [emissive]="greenColor"
      [emissiveIntensity]="0.3"
      [metalness]="0.7"
      [roughness]="0.3"
      [floatConfig]="{
        height: 1.0,
        speed: 2800,
        delay: 1200,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />
    <!-- Subtle glow light -->
    <ngt-point-light
      [position]="[12, -6, 2]"
      [intensity]="1.2"
      [color]="greenColor"
      [distance]="4"
      [decay]="2"
    />

    <!-- Microchip (Box) - LEFT MID EDGE -->
    <app-box
      [position]="[-13, 0, 1]"
      [rotation]="[0.4, 0.6, 0.1]"
      [width]="1.2"
      [height]="1.2"
      [depth]="0.25"
      [color]="goldColor"
      [emissive]="goldColor"
      [emissiveIntensity]="0.3"
      [metalness]="0.7"
      [roughness]="0.3"
      [floatConfig]="{
        height: 1.0,
        speed: 3400,
        delay: 1600,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />
    <!-- Subtle glow light -->
    <ngt-point-light
      [position]="[-13, 0, 2]"
      [intensity]="1.2"
      [color]="goldColor"
      [distance]="4"
      [decay]="2"
    />

    <!-- Particle System (avoiding large center area) -->
    <app-particle-system
      [particleCount]="700"
      [colorPalette]="particleColors"
      [exclusionZone]="{ x: 14, y: 10 }"
      [size]="1.2"
      [opacity]="0.6"
    />

    <!-- Animated Background Cubes (avoiding large center area for clean focus) -->
    <app-background-cubes
      [count]="200"
      [colorPalette]="cubeColors"
      [exclusionZone]="{ x: 14, y: 10 }"
      [sizeRange]="{ min: 0.5, max: 2.0 }"
      [transparent]="true"
      [opacity]="0.6"
      [floatAnimation]="{
        heightMin: 0.8,
        heightMax: 2.0,
        speedMin: 2500,
        speedMax: 5000,
        ease: 'sine.inOut'
      }"
    />

    <!-- ================================ -->
    <!-- FLOATING TECH KEYWORDS (Far Background Layer) -->
    <!-- Positioned much further back (z: -15 to -20) and near edges for depth -->
    <!-- ================================ -->

    <!-- AI - Far edge, deep background (matching shape positions) -->
    <app-text-3d
      text="AI"
      [position]="[-12, 4, -7]"
      [fontSize]="0.7"
      [color]="purpleColor"
      [emissive]="purpleColor"
      [emissiveIntensity]="0.4"
      [metalness]="0.3"
      [roughness]="0.7"
      [height]="0.15"
      [bevelEnabled]="true"
      [bevelSize]="0.015"
      [bevelThickness]="0.025"
    />

    <!-- LangChain - Far edge, deep background (matching shape positions) -->
    <app-text-3d
      text="LangChain"
      [position]="[15, 12, -20]"
      [fontSize]="0.7"
      [color]="pinkColor"
      [emissive]="pinkColor"
      [emissiveIntensity]="0.4"
      [metalness]="0.3"
      [roughness]="0.7"
      [height]="0.12"
      [bevelEnabled]="true"
      [bevelSize]="0.012"
      [bevelThickness]="0.02"
    />

    <!-- Angular - Far edge, deep background (matching shape positions) -->
    <app-text-3d
      text="Angular"
      [position]="[-20, 0, -10]"
      [fontSize]="0.7"
      [color]="cyanColor"
      [emissive]="cyanColor"
      [emissiveIntensity]="0.4"
      [metalness]="0.3"
      [roughness]="0.7"
      [height]="0.13"
      [bevelEnabled]="true"
      [bevelSize]="0.013"
      [bevelThickness]="0.022"
    />

    <!-- NestJS - Far edge, deep background (matching shape positions) -->
    <app-text-3d
      text="NestJS"
      [position]="[13, 4, -12]"
      [fontSize]="0.7"
      [color]="goldColor"
      [emissive]="goldColor"
      [emissiveIntensity]="0.4"
      [metalness]="0.3"
      [roughness]="0.7"
      [height]="0.12"
      [bevelEnabled]="true"
      [bevelSize]="0.012"
      [bevelThickness]="0.02"
    />

    <!-- ChromaDB - Far edge, deep background (matching shape positions) -->
    <app-text-3d
      text="ChromaDB"
      [position]="[-12, -10, -15]"
      [fontSize]="0.7"
      [color]="purpleColor"
      [emissive]="purpleColor"
      [emissiveIntensity]="0.4"
      [metalness]="0.3"
      [roughness]="0.7"
      [height]="0.11"
      [bevelEnabled]="true"
      [bevelSize]="0.011"
      [bevelThickness]="0.018"
    />

    <!-- Neo4j - Far edge, deep background (matching shape positions) -->
    <app-text-3d
      text="Neo4j"
      [position]="[12, -10, -15]"
      [fontSize]="0.7"
      [color]="greenColor"
      [emissive]="greenColor"
      [emissiveIntensity]="0.4"
      [metalness]="0.3"
      [roughness]="0.7"
      [height]="0.12"
      [bevelEnabled]="true"
      [bevelSize]="0.012"
      [bevelThickness]="0.02"
    />

    <!-- WebSockets - Far edge, deep background (matching shape positions) -->
    <app-text-3d
      text="WebSockets"
      [position]="[-22, 14, -20]"
      [fontSize]="0.7"
      [color]="pinkColor"
      [emissive]="pinkColor"
      [emissiveIntensity]="0.4"
      [metalness]="0.3"
      [roughness]="0.7"
      [height]="0.1"
      [bevelEnabled]="true"
      [bevelSize]="0.01"
      [bevelThickness]="0.015"
    />
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
  readonly whiteColor = 0xffffff;

  // Particle colors - brighter/more visible colors for better contrast
  readonly particleColors = [
    '#8a2be2', // Bright purple
    '#9b59d6', // Medium bright purple
    '#7b3ab3', // Visible purple
    '#a960ee', // Light purple
    '#6a2ba7', // Deep purple (but still visible)
  ];

  // Cube colors - brighter colors matching the hero theme
  readonly cubeColors = [
    0x8a2be2, // Bright purple (matches AI icon)
    0xff69b4, // Hot pink (matches Network icon)
    0x00bfff, // Deep sky blue (matches Database icon)
    0x9b59d6, // Medium purple
    0xba55d3, // Medium orchid
    0x7b68ee, // Medium slate blue
    0x6a5acd, // Slate blue
    0x4169e1, // Royal blue
  ];
}
