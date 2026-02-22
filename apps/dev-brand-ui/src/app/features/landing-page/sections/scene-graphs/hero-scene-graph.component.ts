/**
 * HeroSceneGraphComponent - Hero Section 3D Background Scene
 *
 * Renders the 3D background elements for the hero section:
 * - Lighting setup (ambient + directional + point + spotlight)
 * - Floating polyhedrons with GSAP animations
 * - Animated background cubes via BackgroundCubesComponent
 * - Mini Robot GLTF model (center stage)
 * - Floating tech keyword text labels
 *
 * DOM content (text, badges, buttons) is rendered as HTML overlay, not 3D meshes.
 */

import { Component } from '@angular/core';

import {
  PolyhedronComponent,
  CylinderComponent,
  TorusComponent,
  BoxComponent,
  ExtrudedText3DComponent,
  BackgroundCubesComponent,
  GltfModelComponent,
  PointLightComponent,
  SpotLightComponent,
  AmbientLightComponent,
  DirectionalLightComponent,
  Float3dDirective,
} from '@hive-academy/angular-3d';

import { Colors3D } from '../../../../core/config/colors.config';

@Component({
  selector: 'app-hero-scene-graph',
  standalone: true,
  imports: [
    PolyhedronComponent,
    CylinderComponent,
    TorusComponent,
    BoxComponent,
    ExtrudedText3DComponent,
    BackgroundCubesComponent,
    GltfModelComponent,
    PointLightComponent,
    SpotLightComponent,
    AmbientLightComponent,
    DirectionalLightComponent,
    Float3dDirective,
  ],
  template: `
    <!-- Scene Lighting Configuration -->
    <a3d-ambient-light [color]="whiteColor" [intensity]="1.2" />
    <a3d-directional-light
      [color]="whiteColor"
      [intensity]="2.0"
      [position]="[10, 10, 10]"
      [castShadow]="true"
    />
    <!-- Purple accent light from left -->
    <a3d-point-light
      [color]="purpleColor"
      [intensity]="1.5"
      [position]="[-10, 5, 5]"
      [castShadow]="true"
    />
    <!-- Pink accent light from right -->
    <a3d-point-light
      [color]="pinkColor"
      [intensity]="1.5"
      [position]="[10, 5, 5]"
      [castShadow]="true"
    />
    <!-- Cyan bottom light for depth -->
    <a3d-point-light
      [color]="cyanColor"
      [intensity]="1.0"
      [position]="[0, -5, 8]"
    />

    <!-- Tech Shapes - Using dedicated primitive components + Text Labels + Glow Effects -->

    <!-- AI Brain (Icosahedron) - TOP LEFT EDGE -->
    <a3d-polyhedron
      type="icosahedron"
      [position]="[-12, 6, 1]"
      [rotation]="[0.3, 0.5, 0]"
      [args]="[0.7, 0]"
      [color]="purpleColor"
      float3d
      [floatConfig]="{
        height: 1.0,
        speed: 3500,
        delay: 0,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />
    <!-- Subtle glow light -->
    <a3d-point-light
      [position]="[-12, 6, 2]"
      [intensity]="1.2"
      [color]="purpleColor"
      [distance]="4"
      [decay]="2"
    />

    <!-- Network Node (Octahedron) - TOP RIGHT EDGE -->
    <a3d-polyhedron
      type="octahedron"
      [position]="[12, 6, -1]"
      [rotation]="[0.2, 0.8, 0.1]"
      [args]="[0.7, 0]"
      [color]="pinkColor"
      float3d
      [floatConfig]="{
        height: 1.0,
        speed: 3200,
        delay: 400,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />
    <!-- Subtle glow light -->
    <a3d-point-light
      [position]="[12, 6, 2]"
      [intensity]="1.2"
      [color]="pinkColor"
      [distance]="4"
      [decay]="2"
    />

    <!-- Database Stack (Cylinder) - BOTTOM LEFT EDGE -->
    <a3d-cylinder
      [position]="[-12, -6, 1]"
      [args]="[0.6, 0.6, 1.2, 32]"
      [color]="cyanColor"
      float3d
      [floatConfig]="{
        height: 1.0,
        speed: 3000,
        delay: 800,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />
    <!-- Subtle glow light -->
    <a3d-point-light
      [position]="[-12, -6, 2]"
      [intensity]="1.2"
      [color]="cyanColor"
      [distance]="4"
      [decay]="2"
    />

    <!-- Cloud/Connectivity (Torus) - BOTTOM RIGHT EDGE -->
    <a3d-torus
      [position]="[12, -6, 1]"
      [rotation]="[0.5, 0.3, 0.2]"
      [args]="[0.6, 0.22, 16, 100]"
      [color]="greenColor"
      [emissive]="greenColor"
      [emissiveIntensity]="0.3"
      float3d
      [floatConfig]="{
        height: 1.0,
        speed: 2800,
        delay: 1200,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />
    <!-- Subtle glow light -->
    <a3d-point-light
      [position]="[12, -6, 2]"
      [intensity]="1.2"
      [color]="greenColor"
      [distance]="4"
      [decay]="2"
    />

    <!-- Microchip (Box) - LEFT MID EDGE -->
    <a3d-box
      [position]="[-13, 0, 1]"
      [rotation]="[0.4, 0.6, 0.1]"
      [args]="[1.2, 1.2, 0.25]"
      [color]="goldColor"
      [emissive]="goldColor"
      [emissiveIntensity]="0.3"
      float3d
      [floatConfig]="{
        height: 1.0,
        speed: 3400,
        delay: 1600,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />
    <!-- Subtle glow light -->
    <a3d-point-light
      [position]="[-13, 0, 2]"
      [intensity]="1.2"
      [color]="goldColor"
      [distance]="4"
      [decay]="2"
    />

    <!-- Animated Background Cubes -->
    <a3d-background-cubes
      [count]="200"
      [colorPalette]="cubeColors"
      [exclusionZone]="{ x: 14, y: 10 }"
      [sizeRange]="{ min: 0.5, max: 2.0 }"
    />

    <!-- Mini Robot GLTF Model - CENTER STAGE -->
    <a3d-gltf-model
      [modelPath]="'/assets/3d/mini_robot.glb'"
      [position]="[0, -1, -5]"
      [scale]="0.005"
      [rotation]="[0, 0, 0]"
      float3d
      [floatConfig]="{
        height: 0.2,
        speed: 2000,
        delay: 0,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />
    <!-- Spotlight for the robot -->
    <a3d-spot-light
      [position]="[0, 5, 0]"
      [intensity]="1.5"
      [color]="whiteColor"
      [angle]="0.6"
      [penumbra]="0.5"
      [castShadow]="true"
      [target]="[0, -1, -5]"
    />

    <!-- ================================ -->
    <!-- FLOATING TECH KEYWORDS (Far Background Layer) -->
    <!-- ================================ -->

    <a3d-extruded-text-3d
      text="AI"
      [position]="[-12, 4, -7]"
      [fontSize]="0.7"
      [color]="purpleColor"
      [emissiveColor]="purpleColor"
      [emissiveIntensity]="0.4"
      [metalness]="0.3"
      [roughness]="0.7"
      [depth]="0.15"
      [bevelEnabled]="true"
      [bevelSize]="0.015"
      [bevelThickness]="0.025"
    />

    <a3d-extruded-text-3d
      text="LangChain"
      [position]="[15, 12, -20]"
      [fontSize]="0.7"
      [color]="pinkColor"
      [emissiveColor]="pinkColor"
      [emissiveIntensity]="0.4"
      [metalness]="0.3"
      [roughness]="0.7"
      [depth]="0.12"
      [bevelEnabled]="true"
      [bevelSize]="0.012"
      [bevelThickness]="0.02"
    />

    <a3d-extruded-text-3d
      text="Angular"
      [position]="[-20, 0, -10]"
      [fontSize]="0.7"
      [color]="cyanColor"
      [emissiveColor]="cyanColor"
      [emissiveIntensity]="0.4"
      [metalness]="0.3"
      [roughness]="0.7"
      [depth]="0.13"
      [bevelEnabled]="true"
      [bevelSize]="0.013"
      [bevelThickness]="0.022"
    />

    <a3d-extruded-text-3d
      text="NestJS"
      [position]="[13, 4, -12]"
      [fontSize]="0.7"
      [color]="goldColor"
      [emissiveColor]="goldColor"
      [emissiveIntensity]="0.4"
      [metalness]="0.3"
      [roughness]="0.7"
      [depth]="0.12"
      [bevelEnabled]="true"
      [bevelSize]="0.012"
      [bevelThickness]="0.02"
    />

    <a3d-extruded-text-3d
      text="ChromaDB"
      [position]="[-12, -10, -15]"
      [fontSize]="0.7"
      [color]="purpleColor"
      [emissiveColor]="purpleColor"
      [emissiveIntensity]="0.4"
      [metalness]="0.3"
      [roughness]="0.7"
      [depth]="0.11"
      [bevelEnabled]="true"
      [bevelSize]="0.011"
      [bevelThickness]="0.018"
    />

    <a3d-extruded-text-3d
      text="Neo4j"
      [position]="[12, -10, -15]"
      [fontSize]="0.7"
      [color]="greenColor"
      [emissiveColor]="greenColor"
      [emissiveIntensity]="0.4"
      [metalness]="0.3"
      [roughness]="0.7"
      [depth]="0.12"
      [bevelEnabled]="true"
      [bevelSize]="0.012"
      [bevelThickness]="0.02"
    />

    <a3d-extruded-text-3d
      text="WebSockets"
      [position]="[-22, 14, -20]"
      [fontSize]="0.7"
      [color]="pinkColor"
      [emissiveColor]="pinkColor"
      [emissiveIntensity]="0.4"
      [metalness]="0.3"
      [roughness]="0.7"
      [depth]="0.1"
      [bevelEnabled]="true"
      [bevelSize]="0.01"
      [bevelThickness]="0.015"
    />
  `,
})
export class HeroSceneGraphComponent {
  // Color constants using Colors3D configuration
  readonly ambientColor = Colors3D.space.ambientBlue.hex;
  readonly purpleColor = Colors3D.neon.purple.hex;
  readonly pinkColor = Colors3D.accent.hotPink.hex;
  readonly cyanColor = Colors3D.accent.deepSkyBlue.hex;
  readonly greenColor = Colors3D.accent.limeGreen.hex;
  readonly goldColor = Colors3D.accent.gold.hex;
  readonly whiteColor = Colors3D.material.white.hex;

  // Particle colors using Colors3D CSS values
  readonly particleColors = [
    Colors3D.neon.purple.css,
    Colors3D.neon.indigo.css,
    Colors3D.accent.blueViolet.css,
    Colors3D.neon.cyan.css,
    Colors3D.accent.deepPurple.css,
  ];

  // Cube colors using Colors3D hex values
  readonly cubeColors = [
    Colors3D.neon.purple.hex,
    Colors3D.accent.hotPink.hex,
    Colors3D.accent.deepSkyBlue.hex,
    Colors3D.neon.indigo.hex,
    Colors3D.accent.mediumOrchid.hex,
    Colors3D.accent.mediumSlateBlue.hex,
    Colors3D.accent.slateBlue.hex,
    Colors3D.accent.royalBlue.hex,
  ];
}
