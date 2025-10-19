/**
 * Text3DComponent - 3D Text using Angular Three Soba
 *
 * Modern, performant 3D text rendering using troika-three-text under the hood.
 * This component wraps the Text3D component from angular-three-soba.
 *
 * Features:
 * - High-quality SDF (Signed Distance Field) text rendering
 * - Proper kerning, ligatures, and unicode support
 * - Automatic font loading and glyph generation
 * - Works in web workers for better performance
 * - Full Three.js material support (lighting, shadows, etc.)
 *
 * Usage:
 * ```html
 * <app-text-3d
 *   text="Hello World"
 *   [position]="[0, 2, 0]"
 *   [fontSize]="1"
 *   [color]="0xff0000"
 * />
 * ```
 */

import { Component, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';
import { extend } from 'angular-three';
import { NgtsText3D } from 'angular-three-soba/abstractions';
import { MeshStandardMaterial } from 'three';

extend({ MeshStandardMaterial });
@Component({
  selector: 'app-text-3d',
  standalone: true,
  imports: [NgtsText3D],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngts-text-3d
      [text]="text()"
      [font]="font()"
      [options]="textOptions()"
      [position]="position()"
      [rotation]="rotation()"
      [scale]="scale()"
    >
      <ngt-mesh-standard-material
        [color]="color()"
        [emissive]="emissive()"
        [emissiveIntensity]="emissiveIntensity()"
        [metalness]="metalness()"
        [roughness]="roughness()"
      />
    </ngts-text-3d>
  `,
})
export class Text3DComponent {
  // Text content
  readonly text = input.required<string>();

  // Transform
  readonly position = input<[number, number, number]>([0, 0, 0]);
  readonly rotation = input<[number, number, number]>([0, 0, 0]);
  readonly scale = input<number | [number, number, number]>(1);

  // Text options
  readonly fontSize = input<number>(1);
  readonly font = input<string>(
    'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json'
  );
  readonly curveSegments = input<number>(12);
  readonly bevelEnabled = input<boolean>(false);
  readonly bevelThickness = input<number>(0.03);
  readonly bevelSize = input<number>(0.02);
  readonly bevelOffset = input<number>(0);
  readonly bevelSegments = input<number>(3);
  readonly height = input<number>(0.2);

  // Material properties
  readonly color = input<number>(0xffffff);
  readonly emissive = input<number>(0x000000);
  readonly emissiveIntensity = input<number>(0);
  readonly metalness = input<number>(0.5);
  readonly roughness = input<number>(0.5);

  // Computed text options
  readonly textOptions = () => ({
    size: this.fontSize(),
    font: this.font(),
    curveSegments: this.curveSegments(),
    bevelEnabled: this.bevelEnabled(),
    bevelThickness: this.bevelThickness(),
    bevelSize: this.bevelSize(),
    bevelOffset: this.bevelOffset(),
    bevelSegments: this.bevelSegments(),
    height: this.height(),
    position: this.position(),
    rotation: this.rotation(),
    scale: this.scale(),
  });
}
