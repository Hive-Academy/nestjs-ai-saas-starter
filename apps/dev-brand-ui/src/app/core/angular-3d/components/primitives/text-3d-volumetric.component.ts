/**
 * Text3DVolumetricComponent - Extruded 3D Text with Volumetric Glow
 *
 * Uses NgtsText3D for solid 3D text geometry (with depth and bevels),
 * then applies our custom volumetric glow shader as the material.
 *
 * This combines the best of both worlds:
 * - High-quality 3D text geometry from angular-three-soba
 * - Custom volumetric glow shader for nebula-like effect
 *
 * Features:
 * - Solid extruded 3D letters with depth
 * - Beveled edges for professional look
 * - Volumetric glow shader material
 * - Animated pulsing effect
 * - Bloom-ready for post-processing
 *
 * Usage:
 * ```html
 * <app-text-3d-volumetric
 *   text="NEON"
 *   [position]="[0, 2, 0]"
 *   [glowColor]="0x00ffff"
 *   [glowIntensity]="2.5"
 * />
 * ```
 */

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  signal,
  effect,
  inject,
  DestroyRef,
  viewChild,
  ElementRef,
} from '@angular/core';
import { injectBeforeRender, NgtArgs } from 'angular-three';
import { NgtsText3D } from 'angular-three-soba/abstractions';
import { ShaderMaterial, AdditiveBlending, Color, Mesh } from 'three';
import { Colors3D } from '../../config/colors.config';

@Component({
  selector: 'app-text-3d-volumetric',
  standalone: true,
  imports: [NgtsText3D, NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngts-text-3d
      #text3D
      [text]="text()"
      [font]="fontPath()"
      [options]="{
        bevelEnabled: true,
        bevelSize: bevelSize(),
        bevelThickness: bevelThickness(),
        height: depth(),
        size: size(),
        curveSegments: curveSegments()
      }"
      [position]="position()"
      [rotation]="rotation()"
      [scale]="scale()"
    >
      <!-- Custom volumetric shader material -->
      <ngt-shader-material
        [uniforms]="shaderUniforms()"
        [vertexShader]="vertexShader"
        [fragmentShader]="fragmentShader"
        [transparent]="true"
        [blending]="additiveBlending"
        [depthWrite]="false"
      />
    </ngts-text-3d>
  `,
})
export class Text3DVolumetricComponent {
  private readonly destroyRef = inject(DestroyRef);
  readonly additiveBlending = AdditiveBlending;

  // Text content
  readonly text = input.required<string>();

  // Transform
  readonly position = input<[number, number, number]>([0, 0, 0]);
  readonly rotation = input<[number, number, number]>([0, 0, 0]);
  readonly scale = input<number>(1);

  // Text geometry options
  readonly size = input<number>(1); // Text size
  readonly depth = input<number>(0.2); // Extrusion depth
  readonly bevelEnabled = input<boolean>(true);
  readonly bevelSize = input<number>(0.02);
  readonly bevelThickness = input<number>(0.05);
  readonly curveSegments = input<number>(12);
  readonly fontPath = input<string>('/fonts/helvetiker_bold.typeface.json');

  // Glow options
  readonly glowColor = input<number>(Colors3D.neon.cyan.hex);
  readonly glowIntensity = input<number>(3.0);
  readonly pulseSpeed = input<number>(2.0);
  readonly pulseAmount = input<number>(0.3);

  // Internal state
  private time = 0;
  readonly shaderUniforms = signal<any>({});

  // Shader code - Volumetric glow effect
  readonly vertexShader = `
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  readonly fragmentShader = `
    uniform vec3 glowColor;
    uniform float glowIntensity;
    uniform float time;
    uniform float pulseSpeed;
    uniform float pulseAmount;

    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      // Fresnel effect for edge glow
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);

      // Pulsing glow
      float pulse = sin(time * pulseSpeed) * pulseAmount + 1.0;

      // Multi-layer glow for richness
      float innerGlow = pow(fresnel, 0.3) * glowIntensity * 1.5;
      float middleGlow = pow(fresnel, 1.0) * glowIntensity * pulse;
      float outerGlow = pow(fresnel, 3.0) * glowIntensity * 0.5;

      float totalGlow = max(innerGlow, max(middleGlow, outerGlow));

      // Final color with volumetric glow
      vec3 finalColor = glowColor * totalGlow;
      float finalAlpha = fresnel * 0.8;

      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `;

  constructor() {
    // Initialize shader uniforms
    effect(() => {
      const color = new Color(this.glowColor());

      this.shaderUniforms.set({
        glowColor: { value: color },
        glowIntensity: { value: this.glowIntensity() },
        time: { value: 0 },
        pulseSpeed: { value: this.pulseSpeed() },
        pulseAmount: { value: this.pulseAmount() },
      });

      console.log('[Text3DVolumetric] Initialized:', {
        text: this.text(),
        glowColor: color,
        glowIntensity: this.glowIntensity(),
      });
    });

    // Animate shader uniforms
    injectBeforeRender(({ delta }) => {
      this.time += delta;
      this.updateUniforms();
    });
  }

  /**
   * Update shader uniforms for animation
   */
  private updateUniforms(): void {
    const uniforms = this.shaderUniforms();
    if (uniforms.time) {
      uniforms.time.value = this.time;
    }

    // Update color if changed
    const currentColor = new Color(this.glowColor());
    if (uniforms.glowColor && !uniforms.glowColor.value.equals(currentColor)) {
      uniforms.glowColor.value = currentColor;
    }

    // Update intensity if changed
    if (uniforms.glowIntensity) {
      uniforms.glowIntensity.value = this.glowIntensity();
    }

    // Update pulse parameters if changed
    if (uniforms.pulseSpeed) {
      uniforms.pulseSpeed.value = this.pulseSpeed();
    }
    if (uniforms.pulseAmount) {
      uniforms.pulseAmount.value = this.pulseAmount();
    }
  }
}
