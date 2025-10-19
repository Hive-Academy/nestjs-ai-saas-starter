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

    <!-- AI Brain (Icosahedron) - Top-left -->
    <app-polyhedron
      type="icosahedron"
      [position]="[-8, 4, 1]"
      [rotation]="[0.3, 0.5, 0]"
      [radius]="1.0"
      [color]="purpleColor"
      [emissive]="purpleColor"
      [emissiveIntensity]="0.5"
      [metalness]="0.9"
      [roughness]="0.1"
      [floatConfig]="{
        height: 1.2,
        speed: 3500,
        delay: 0,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />
    <!-- Glow light for AI shape -->
    <ngt-point-light
      [position]="[-8, 4, 2]"
      [intensity]="2.0"
      [color]="purpleColor"
      [distance]="5"
      [decay]="2"
    />
    <app-text-3d
      text="AI"
      [position]="[-8, 5.5, 1]"
      [fontSize]="0.5"
      [color]="purpleColor"
      [emissive]="purpleColor"
      [emissiveIntensity]="0.3"
      [metalness]="0.8"
      [roughness]="0.2"
      [height]="0.1"
      [bevelEnabled]="true"
      [bevelSize]="0.01"
      [bevelThickness]="0.02"
    />

    <!-- Network Node (Octahedron) - Top-right -->
    <app-polyhedron
      type="octahedron"
      [position]="[8, 3, 1]"
      [rotation]="[0.2, 0.8, 0.1]"
      [radius]="1.0"
      [color]="pinkColor"
      [emissive]="pinkColor"
      [emissiveIntensity]="0.5"
      [metalness]="0.9"
      [roughness]="0.1"
      [floatConfig]="{
        height: 1.5,
        speed: 3200,
        delay: 400,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />
    <!-- Glow light for Network shape -->
    <ngt-point-light
      [position]="[8, 3, 2]"
      [intensity]="2.0"
      [color]="pinkColor"
      [distance]="5"
      [decay]="2"
    />
    <app-text-3d
      text="NETWORK"
      [position]="[8, 4.5, 1]"
      [fontSize]="0.4"
      [color]="pinkColor"
      [emissive]="pinkColor"
      [emissiveIntensity]="0.3"
      [metalness]="0.8"
      [roughness]="0.2"
      [height]="0.1"
      [bevelEnabled]="true"
      [bevelSize]="0.01"
      [bevelThickness]="0.02"
    />

    <!-- Database Stack (Cylinder) - Bottom-left -->
    <app-cylinder
      [position]="[-7, -3.5, 1]"
      [radiusTop]="0.8"
      [radiusBottom]="0.8"
      [height]="1.5"
      [color]="cyanColor"
      [emissive]="cyanColor"
      [emissiveIntensity]="0.5"
      [metalness]="0.9"
      [roughness]="0.1"
      [floatConfig]="{
        height: 1.3,
        speed: 3000,
        delay: 800,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />
    <!-- Glow light for Database shape -->
    <ngt-point-light
      [position]="[-7, -3.5, 2]"
      [intensity]="2.0"
      [color]="cyanColor"
      [distance]="5"
      [decay]="2"
    />
    <app-text-3d
      text="DATABASE"
      [position]="[-7, -2, 1]"
      [fontSize]="0.4"
      [color]="cyanColor"
      [emissive]="cyanColor"
      [emissiveIntensity]="0.3"
      [metalness]="0.8"
      [roughness]="0.2"
      [height]="0.1"
      [bevelEnabled]="true"
      [bevelSize]="0.01"
      [bevelThickness]="0.02"
    />

    <!-- Cloud/Connectivity (Torus) - Right -->
    <app-torus
      [position]="[8.5, 0, 1]"
      [rotation]="[0.5, 0.3, 0.2]"
      [radius]="0.8"
      [tube]="0.3"
      [color]="greenColor"
      [emissive]="greenColor"
      [emissiveIntensity]="0.5"
      [metalness]="0.9"
      [roughness]="0.1"
      [floatConfig]="{
        height: 1.4,
        speed: 2800,
        delay: 1200,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />
    <!-- Glow light for Cloud shape -->
    <ngt-point-light
      [position]="[8.5, 0, 2]"
      [intensity]="2.0"
      [color]="greenColor"
      [distance]="5"
      [decay]="2"
    />
    <app-text-3d
      text="CLOUD"
      [position]="[8.5, 1.5, 1]"
      [fontSize]="0.45"
      [color]="greenColor"
      [emissive]="greenColor"
      [emissiveIntensity]="0.3"
      [metalness]="0.8"
      [roughness]="0.2"
      [height]="0.1"
      [bevelEnabled]="true"
      [bevelSize]="0.01"
      [bevelThickness]="0.02"
    />

    <!-- Microchip (Box) - Left -->
    <app-box
      [position]="[-8.5, -1, 1]"
      [rotation]="[0.4, 0.6, 0.1]"
      [width]="1.6"
      [height]="1.6"
      [depth]="0.3"
      [color]="goldColor"
      [emissive]="goldColor"
      [emissiveIntensity]="0.5"
      [metalness]="0.9"
      [roughness]="0.1"
      [floatConfig]="{
        height: 1.6,
        speed: 3400,
        delay: 1600,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />
    <!-- Glow light for Chip shape -->
    <ngt-point-light
      [position]="[-8.5, -1, 2]"
      [intensity]="2.0"
      [color]="goldColor"
      [distance]="5"
      [decay]="2"
    />
    <app-text-3d
      text="CHIP"
      [position]="[-8.5, 0.5, 1]"
      [fontSize]="0.5"
      [color]="goldColor"
      [emissive]="goldColor"
      [emissiveIntensity]="0.3"
      [metalness]="0.8"
      [roughness]="0.2"
      [height]="0.1"
      [bevelEnabled]="true"
      [bevelSize]="0.01"
      [bevelThickness]="0.02"
    />

    <!-- Particle System (700 particles avoiding center) -->
    <app-particle-system
      [particleCount]="700"
      [colorPalette]="particleColors"
      [exclusionZone]="{ x: 8, y: 4 }"
      [size]="1.2"
      [opacity]="0.7"
    />

    <!-- Animated Background Cubes - more cubes with vibrant colors -->
    <app-background-cubes
      [count]="200"
      [colorPalette]="cubeColors"
      [exclusionZone]="{ x: 12, y: 8 }"
      [sizeRange]="{ min: 0.5, max: 2.2 }"
      [transparent]="true"
      [opacity]="0.7"
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

    <!-- AI - Far left edge, deep background -->
    <app-text-3d
      text="AI"
      [position]="[-15, 6, -18]"
      [fontSize]="1.0"
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

    <!-- LangChain - Top right edge, deep background -->
    <app-text-3d
      text="LangChain"
      [position]="[14, 8, -20]"
      [fontSize]="0.8"
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

    <!-- Angular - Left edge mid, deep background -->
    <app-text-3d
      text="Angular"
      [position]="[-14, -1, -17]"
      [fontSize]="0.9"
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

    <!-- NestJS - Right edge mid, deep background -->
    <app-text-3d
      text="NestJS"
      [position]="[15, -2, -16]"
      [fontSize]="0.85"
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

    <!-- ChromaDB - Bottom left edge, deep background -->
    <app-text-3d
      text="ChromaDB"
      [position]="[-13, -7, -15]"
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

    <!-- Neo4j - Bottom right edge, deep background -->
    <app-text-3d
      text="Neo4j"
      [position]="[16, -6, -19]"
      [fontSize]="0.75"
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

    <!-- WebSockets - Top left edge, deep background -->
    <app-text-3d
      text="WebSockets"
      [position]="[-12, 9, -20]"
      [fontSize]="0.65"
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
