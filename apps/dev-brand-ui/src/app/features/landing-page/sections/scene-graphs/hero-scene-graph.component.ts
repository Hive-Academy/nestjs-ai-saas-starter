/**
 * HeroSceneGraphComponent - Hero Section 3D Background Scene
 *
 * Renders the 3D background elements for the hero section:
 * - Ambient and directional lighting
 * - Particle system with floating animation
 * - Three floating spheres with glow effects
 *
 * Specification: design-handoff.md:286-396
 * Task: TASK_2025_026 - Task 3
 */

import { Component } from '@angular/core';
import { NgtArgs } from 'angular-three';
import { FloatingSphereComponent } from '../../../../core/angular-3d/components/primitives/floating-sphere.component';
import { ParticleSystemComponent } from '../../../../core/angular-3d/components/primitives/particle-system.component';

@Component({
  selector: 'app-hero-scene-graph',
  standalone: true,
  imports: [NgtArgs, FloatingSphereComponent, ParticleSystemComponent],
  template: `
    <!-- Ambient light -->
    <ngt-ambient-light [intensity]="0.5" />

    <!-- Directional light -->
    <ngt-directional-light [position]="[10, 10, 5]" [intensity]="1" />

    <!-- Background particles -->
    <app-particle-system
      [count]="200"
      [color]="0x6366F1"
      [size]="0.05"
      [spread]="10"
      [float3dConfig]="{
        height: 0.5,
        speed: 3000,
        ease: 'sine.inOut',
        autoStart: true
      }"
      performance3d
    />

    <!-- Accent sphere 1 (left) -->
    <app-floating-sphere
      [position]="[-3, 2, -5]"
      [radius]="0.8"
      [color]="0x6366F1"
      [segments]="32"
      [float3dConfig]="{
        height: 0.3,
        speed: 2500,
        ease: 'sine.inOut',
        delay: 0,
        autoStart: true
      }"
      [glow3dConfig]="{
        color: 0x6366F1,
        intensity: 0.3,
        scale: 1.4,
        segments: 16,
        autoAdjustQuality: true
      }"
      performance3d
    />

    <!-- Accent sphere 2 (right) -->
    <app-floating-sphere
      [position]="[3, -1, -3]"
      [radius]="0.6"
      [color]="0x6366F1"
      [segments]="32"
      [float3dConfig]="{
        height: 0.4,
        speed: 2000,
        ease: 'sine.inOut',
        delay: 500,
        autoStart: true
      }"
      [glow3dConfig]="{
        color: 0x6366F1,
        intensity: 0.25,
        scale: 1.3,
        segments: 16,
        autoAdjustQuality: true
      }"
      performance3d
    />

    <!-- Accent sphere 3 (center back) -->
    <app-floating-sphere
      [position]="[0, 0, -8]"
      [radius]="1.0"
      [color]="0x6366F1"
      [segments]="32"
      [float3dConfig]="{
        height: 0.2,
        speed: 3500,
        ease: 'sine.inOut',
        delay: 1000,
        autoStart: true
      }"
      [glow3dConfig]="{
        color: 0x6366F1,
        intensity: 0.2,
        scale: 1.5,
        segments: 16,
        autoAdjustQuality: true
      }"
      performance3d
    />
  `,
})
export class HeroSceneGraphComponent {}
