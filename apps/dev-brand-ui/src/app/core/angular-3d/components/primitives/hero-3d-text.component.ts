/**
 * Hero3DTextComponent - 3D Text with Opacity Support
 *
 * Enhanced 3D text component specifically designed for hero sections.
 * Extends the base Text3DComponent with reactive opacity control for animations.
 *
 * Features:
 * - Reactive opacity control via input signal
 * - Automatic material transparency setup
 * - Bold font optimized for hero text
 * - Slight emissive glow for visual depth
 * - Bevel enabled for 3D effect
 * - Performance optimized (lower curve segments)
 *
 * Usage:
 * ```html
 * <app-hero-3d-text
 *   text="Production Grade AI"
 *   [position]="[0, 1, 11]"
 *   [fontSize]="0.8"
 *   [opacity]="heroState.phase1Opacity()"
 *   [color]="0x6366f1"
 * />
 * ```
 */

import { Component, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';
import { extend } from 'angular-three';
import { NgtsText3D } from 'angular-three-soba/abstractions';
import { MeshStandardMaterial } from 'three';

extend({ MeshStandardMaterial });

@Component({
  selector: 'app-hero-3d-text',
  standalone: true,
  imports: [NgtsText3D],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngts-text-3d
      #textMesh
      [text]="text()"
      [font]="font()"
      [options]="textOptions()"
    >
      <ngt-mesh-standard-material
        [color]="color()"
        [emissive]="emissive()"
        [emissiveIntensity]="emissiveIntensity()"
        [metalness]="metalness()"
        [roughness]="roughness()"
        [transparent]="true"
        [opacity]="opacity()"
      />
    </ngts-text-3d>
  `,
})
export class Hero3DTextComponent {
  // Text content
  readonly text = input.required<string>();

  // Transform
  readonly position = input<[number, number, number]>([0, 0, 0]);
  readonly rotation = input<[number, number, number]>([0, 0, 0]);
  readonly scale = input<number | [number, number, number]>(1);

  // Text options
  readonly fontSize = input<number>(0.5);
  readonly font = input<string>(
    'https://threejs.org/examples/fonts/helvetiker_bold.typeface.json' // Bold for hero text
  );
  readonly height = input<number>(0.1); // Depth/extrusion
  readonly curveSegments = input<number>(6); // Lower for performance
  readonly bevelEnabled = input<boolean>(true);
  readonly bevelThickness = input<number>(0.01);
  readonly bevelSize = input<number>(0.01);

  // Material properties
  readonly color = input<number>(0xffffff);
  readonly emissive = input<number>(0x4444ff); // Slight glow
  readonly emissiveIntensity = input<number>(0.2);
  readonly metalness = input<number>(0.3);
  readonly roughness = input<number>(0.4);

  // NEW: Opacity control
  readonly opacity = input<number>(1.0);

  // Computed text options
  readonly textOptions = () => ({
    size: this.fontSize(),
    font: this.font(),
    curveSegments: this.curveSegments(),
    bevelEnabled: this.bevelEnabled(),
    bevelThickness: this.bevelThickness(),
    bevelSize: this.bevelSize(),
    height: this.height(),
    position: this.position(),
    rotation: this.rotation(),
    scale: this.scale(),
  });
}
