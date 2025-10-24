/**
 * CTASceneGraphComponent - CTA Section Subtle 3D Background Scene
 *
 * Renders minimal 3D background elements for the CTA section:
 * - Ambient + directional lighting
 * - 3-5 floating spheres with subtle animations
 * - Low opacity (30-40%) for background layer effect
 * - Slow animations (4000-5000ms) for calm, professional feel
 *
 * Key Differences from Hero Scene:
 * - Fewer elements: 3 spheres (vs 200+ particles)
 * - Smaller spheres: radius 0.3-0.5 (vs 0.6-1.0)
 * - Lower glow intensity: 0.1-0.2 (vs default)
 * - No particle system or background cubes
 * - Slower animations: 4000-5000ms (vs 3000ms)
 */

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
} from '@angular/core';
import { extend } from 'angular-three';
import { AmbientLight, DirectionalLight } from 'three';
import { PolyhedronComponent } from '../../../../core/angular-3d/components/primitives/polyhedron.component';

// Register Three.js lights as Angular Three components
extend({ AmbientLight, DirectionalLight });

@Component({
  selector: 'app-cta-scene-graph',
  standalone: true,
  imports: [PolyhedronComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Subtle Lighting Setup -->
    <ngt-ambient-light [intensity]="0.4" />
    <ngt-directional-light [position]="[10, 10, 5]" [intensity]="0.6" />

    <!-- Floating Sphere 1 - Left Side (Icosahedron) -->
    <app-polyhedron
      type="icosahedron"
      [position]="[-2, 1, -4]"
      [rotation]="[0.2, 0.3, 0]"
      [radius]="0.4"
      [color]="accentColor"
      [emissive]="accentColor"
      [emissiveIntensity]="0.15"
      [metalness]="0.6"
      [roughness]="0.4"
      [transparent]="true"
      [opacity]="0.35"
      [floatConfig]="{
        height: 0.3,
        speed: 4500,
        delay: 0,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />

    <!-- Floating Sphere 2 - Right Side (Octahedron) -->
    <app-polyhedron
      type="octahedron"
      [position]="[2, -1, -5]"
      [rotation]="[0.1, 0.5, 0.2]"
      [radius]="0.3"
      [color]="accentColor"
      [emissive]="accentColor"
      [emissiveIntensity]="0.12"
      [metalness]="0.6"
      [roughness]="0.4"
      [transparent]="true"
      [opacity]="0.3"
      [floatConfig]="{
        height: 0.3,
        speed: 5000,
        delay: 800,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />

    <!-- Floating Sphere 3 - Center Background (Dodecahedron) -->
    <app-polyhedron
      type="dodecahedron"
      [position]="[0, 0, -6]"
      [rotation]="[0.3, 0.2, 0.1]"
      [radius]="0.5"
      [color]="accentColor"
      [emissive]="accentColor"
      [emissiveIntensity]="0.18"
      [metalness]="0.6"
      [roughness]="0.4"
      [transparent]="true"
      [opacity]="0.4"
      [floatConfig]="{
        height: 0.4,
        speed: 4000,
        delay: 1600,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />
  `,
})
export class CTASceneGraphComponent {
  // Accent color matching design spec (0x6366F1 = accent-primary)
  readonly accentColor = 0x6366f1;
}
