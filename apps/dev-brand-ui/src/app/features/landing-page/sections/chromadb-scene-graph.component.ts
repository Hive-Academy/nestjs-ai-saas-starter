/**
 * ChromaDB Section Scene Graph Component
 *
 * Defines the 3D background elements for ChromaDB section:
 * - Subtle floating spheres (vector embeddings visualization)
 * - Particle system with indigo/purple color scheme
 * - Minimal lighting for clean, professional look
 *
 * Pattern: Scene graph component to be passed to app-scene-3d
 * Inspired by: hero-scene-graph.component.ts but much more subtle
 */

import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { extend } from 'angular-three';
import { AmbientLight, PointLight } from 'three';
import { ParticleSystemComponent } from '../../../core/angular-3d/components/primitives/particle-system.component';
import { FloatingSphereComponent } from '../../../core/angular-3d/components/primitives/floating-sphere.component';

// Register Three.js lights
extend({ AmbientLight, PointLight });

@Component({
  selector: 'app-chromadb-scene-graph',
  standalone: true,
  imports: [ParticleSystemComponent, FloatingSphereComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Soft Ambient Lighting -->
    <ngt-ambient-light [intensity]="0.8" [color]="whiteColor" />

    <!-- Subtle accent lights -->
    <ngt-point-light
      [position]="[-8, 8, 5]"
      [intensity]="0.6"
      [color]="indigoColor"
    />
    <ngt-point-light
      [position]="[8, -8, 5]"
      [intensity]="0.6"
      [color]="purpleColor"
    />

    <!-- Floating Spheres (Vector Embeddings) - Very subtle -->
    <!-- Top Left -->
    <app-floating-sphere
      [position]="[-10, 6, 2]"
      [radius]="0.4"
      [color]="indigoColor"
      [emissive]="indigoColor"
      [emissiveIntensity]="0.2"
      [metalness]="0.5"
      [roughness]="0.5"
      [transparent]="true"
      [opacity]="0.3"
    />

    <!-- Top Right -->
    <app-floating-sphere
      [position]="[10, 6, 1]"
      [radius]="0.35"
      [color]="purpleColor"
      [emissive]="purpleColor"
      [emissiveIntensity]="0.2"
      [metalness]="0.5"
      [roughness]="0.5"
      [transparent]="true"
      [opacity]="0.3"
    />

    <!-- Bottom Left -->
    <app-floating-sphere
      [position]="[-10, -6, 1]"
      [radius]="0.38"
      [color]="blueColor"
      [emissive]="blueColor"
      [emissiveIntensity]="0.2"
      [metalness]="0.5"
      [roughness]="0.5"
      [transparent]="true"
      [opacity]="0.3"
    />

    <!-- Bottom Right -->
    <app-floating-sphere
      [position]="[10, -6, 2]"
      [radius]="0.42"
      [color]="violetColor"
      [emissive]="violetColor"
      [emissiveIntensity]="0.2"
      [metalness]="0.5"
      [roughness]="0.5"
      [transparent]="true"
      [opacity]="0.3"
    />

    <!-- Particle System (subtle, avoiding center) -->
    <app-particle-system
      [particleCount]="150"
      [colorPalette]="particleColors"
      [exclusionZone]="{ x: 12, y: 8 }"
      [size]="0.8"
      [opacity]="0.3"
    />
  `,
})
export class ChromadbSceneGraphComponent {
  // Color constants (hex numbers for Three.js)
  readonly whiteColor = 0xffffff;
  readonly indigoColor = 0x6366f1; // Indigo-500
  readonly purpleColor = 0x9333ea; // Purple-600
  readonly blueColor = 0x3b82f6; // Blue-500
  readonly violetColor = 0x8b5cf6; // Violet-500

  // Particle colors (hex strings for particle system)
  readonly particleColors = [
    '#6366F1', // Indigo-500
    '#818CF8', // Indigo-400
    '#A5B4FC', // Indigo-300
    '#9333EA', // Purple-600
    '#A855F7', // Purple-500
    '#C084FC', // Purple-400
  ];
}
