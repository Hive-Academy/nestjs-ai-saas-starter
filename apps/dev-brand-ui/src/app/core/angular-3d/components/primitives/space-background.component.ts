/**
 * SpaceBackgroundComponent - Gradient Background Sphere
 *
 * REWRITTEN to follow declarative angular-three pattern.
 *
 * Previous BROKEN implementation:
 * - Created canvas texture programmatically (AfterViewInit)
 * - Used imperative material manipulation
 * - Canvas-based gradient generation
 *
 * NEW CORRECT implementation:
 * - Uses declarative ngt-mesh + ngt-sphere-geometry
 * - Shader material for gradient effect
 * - Signal-based reactive properties
 * - No lifecycle hooks, fully declarative
 *
 * Pattern verified from:
 * - Declarative mesh: planet.component.ts:42-57
 * - Material parameters: planet.component.ts:50-56
 *
 * Usage:
 * ```html
 * <app-space-background
 *   [radius]="100"
 *   [gradientType]="'radial'"
 *   [colors]="[0x000000, 0x0a0a1a, 0x000000]"
 * />
 * ```
 */

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  computed,
} from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-space-background',
  standalone: true,
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Large inverted sphere wrapping the scene -->
    <ngt-mesh [scale]="[-1, 1, 1]">
      <ngt-sphere-geometry [args]="geometryArgs()" />
      <ngt-shader-material
        [vertexShader]="vertexShader()"
        [fragmentShader]="fragmentShader()"
        [uniforms]="uniforms()"
        [side]="backSide"
        [fog]="false"
      />
    </ngt-mesh>
  `,
})
export class SpaceBackgroundComponent {
  // Configuration inputs (signal-based)
  readonly radius = input<number>(100);
  readonly gradientType = input<'linear' | 'radial'>('radial');
  readonly colors = input<number[]>([0x000000, 0x0a0a1a, 0x000000]);

  // Three.js constants
  readonly backSide = THREE.BackSide;

  // Computed geometry arguments
  readonly geometryArgs = computed<
    ConstructorParameters<typeof THREE.SphereGeometry>
  >(() => {
    return [this.radius(), 64, 64]; // [radius, widthSegments, heightSegments]
  });

  // Shader uniforms (reactive)
  readonly uniforms = computed(() => {
    const colors = this.colors();
    const gradientType = this.gradientType();

    return {
      uColors: {
        value: colors.map((c) => new THREE.Color(c)),
      },
      uGradientType: {
        value: gradientType === 'radial' ? 1.0 : 0.0,
      },
    };
  });

  // Vertex shader (pass UV to fragment)
  readonly vertexShader = computed(
    () => `
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `
  );

  // Fragment shader (gradient rendering)
  readonly fragmentShader = computed(
    () => `
    uniform vec3 uColors[3];
    uniform float uGradientType;
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      float gradientFactor;

      if (uGradientType > 0.5) {
        // Radial gradient (from center)
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(vUv, center);
        gradientFactor = dist * 2.0; // 0.0 at center, 1.0 at edges
      } else {
        // Linear gradient (top to bottom)
        gradientFactor = vUv.y;
      }

      // Clamp to [0, 1]
      gradientFactor = clamp(gradientFactor, 0.0, 1.0);

      // Mix colors based on gradient factor
      vec3 color;
      if (gradientFactor < 0.5) {
        // First half: mix uColors[0] -> uColors[1]
        float t = gradientFactor * 2.0;
        color = mix(uColors[0], uColors[1], t);
      } else {
        // Second half: mix uColors[1] -> uColors[2]
        float t = (gradientFactor - 0.5) * 2.0;
        color = mix(uColors[1], uColors[2], t);
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `
  );
}
