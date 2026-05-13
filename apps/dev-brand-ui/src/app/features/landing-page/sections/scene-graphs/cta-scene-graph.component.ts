/**
 * CTASceneGraphComponent - CTA Section Subtle 3D Background Scene
 *
 * Renders minimal 3D background elements for the CTA section:
 * - Ambient + directional lighting
 * - 3 floating polyhedrons with subtle animations
 * - Slow animations (4000-5000ms) for calm, professional feel
 *
 * Key Differences from Hero Scene:
 * - Fewer elements: 3 polyhedrons (vs 200+ particles)
 * - Smaller shapes: radius 0.3-0.5 (vs 0.6-1.0)
 * - No particle system or background cubes
 * - Slower animations: 4000-5000ms (vs 3000ms)
 */

import { Component, ChangeDetectionStrategy } from '@angular/core';
import {
  PolyhedronComponent,
  AmbientLightComponent,
  DirectionalLightComponent,
  Float3dDirective,
} from '@hive-academy/angular-3d';
import { Colors3D } from '../../../../core/config/colors.config';

@Component({
  selector: 'app-cta-scene-graph',
  standalone: true,
  imports: [
    PolyhedronComponent,
    AmbientLightComponent,
    DirectionalLightComponent,
    Float3dDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Subtle Lighting Setup -->
    <a3d-ambient-light [intensity]="0.4" />
    <a3d-directional-light [position]="[10, 10, 5]" [intensity]="0.6" />

    <!-- Floating Sphere 1 - Left Side (Icosahedron) -->
    <a3d-polyhedron
      type="icosahedron"
      [position]="[-2, 1, -4]"
      [rotation]="[0.2, 0.3, 0]"
      [args]="[0.4, 0]"
      [color]="accentColor"
      float3d
      [floatConfig]="{
        height: 0.3,
        speed: 4500,
        delay: 0,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />

    <!-- Floating Sphere 2 - Right Side (Octahedron) -->
    <a3d-polyhedron
      type="octahedron"
      [position]="[2, -1, -5]"
      [rotation]="[0.1, 0.5, 0.2]"
      [args]="[0.3, 0]"
      [color]="accentColor"
      float3d
      [floatConfig]="{
        height: 0.3,
        speed: 5000,
        delay: 800,
        ease: 'sine.inOut',
        autoStart: true
      }"
    />

    <!-- Floating Sphere 3 - Center Background (Dodecahedron) -->
    <a3d-polyhedron
      type="dodecahedron"
      [position]="[0, 0, -6]"
      [rotation]="[0.3, 0.2, 0.1]"
      [args]="[0.5, 0]"
      [color]="accentColor"
      float3d
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
  // Accent color using Colors3D configuration (accent-primary)
  readonly accentColor = Colors3D.neon.indigo.hex;
}
