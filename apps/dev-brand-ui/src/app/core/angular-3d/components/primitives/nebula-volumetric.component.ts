/**
 * NebulaVolumetricComponent - True Volumetric Smoke/Cloud Nebula
 *
 * Creates realistic smoke-like nebula clouds using:
 * - Large continuous planes (not particles/circles)
 * - Multi-octave 3D Perlin noise for organic smoke patterns
 * - Ultra-soft edge falloff (no visible geometry)
 * - Slow-flowing animation for natural cloud movement
 * - Additive blending for luminous glow
 *
 * Technical approach:
 * - Single large plane mesh per layer (not multiple circles)
 * - Continuous noise field across entire plane
 * - World-space coordinates for seamless appearance
 * - Domain warping for organic smoke tendrils
 *
 * Usage:
 * ```html
 * <app-nebula-volumetric
 *   [width]="120"
 *   [height]="60"
 *   [layers]="2"
 *   [opacity]="0.6"
 *   [primaryColor]="'#0088ff'"
 *   [secondaryColor]="'#00d4ff'"
 *   [tertiaryColor]="'#ff6bd4'"
 *   [enableFlow]="true"
 * />
 * ```
 */

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  viewChild,
} from '@angular/core';
import { injectBeforeRender } from 'angular-three';
import * as THREE from 'three';

@Component({
  selector: 'app-nebula-volumetric',
  standalone: true,
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngt-group #nebulaGroup [position]="position()">
      <!-- Layer 1: Main cloud layer (background) -->
      <ngt-mesh
        [position]="[0, 0, 0]"
        [scale]="[width(), height(), 1]"
        [renderOrder]="997"
      >
        <ngt-plane-geometry [args]="[1, 1, 256, 256]" />
        <ngt-shader-material
          [vertexShader]="vertexShader"
          [fragmentShader]="fragmentShader"
          [uniforms]="layer1Uniforms"
          [transparent]="true"
          [blending]="additiveBlending"
          [depthWrite]="false"
          [depthTest]="true"
          [side]="doubleSide"
          [fog]="false"
        />
      </ngt-mesh>

      <!-- Layer 2: Secondary cloud layer (adds depth) -->
      @if (layers() >= 2) {
      <ngt-mesh
        [position]="[8, -5, -8]"
        [scale]="[width() * 0.85, height() * 0.85, 1]"
        [renderOrder]="998"
      >
        <ngt-plane-geometry [args]="[1, 1, 256, 256]" />
        <ngt-shader-material
          [vertexShader]="vertexShader"
          [fragmentShader]="fragmentShader"
          [uniforms]="layer2Uniforms"
          [transparent]="true"
          [blending]="additiveBlending"
          [depthWrite]="false"
          [depthTest]="true"
          [side]="doubleSide"
          [fog]="false"
        />
      </ngt-mesh>
      }
    </ngt-group>
  `,
})
export class NebulaVolumetricComponent {
  private readonly groupRef = viewChild<ElementRef<THREE.Group>>('nebulaGroup');
  private readonly injector = inject(Injector);

  /**
   * Get Three.js Group for mouse interaction directives
   */
  getObject3D(): THREE.Group | undefined {
    const groupEl = this.groupRef();
    return groupEl?.nativeElement;
  }

  // Configuration inputs
  readonly position = input<[number, number, number]>([0, 0, 0]);
  readonly width = input<number>(120);
  readonly height = input<number>(60);
  readonly layers = input<number>(2);
  readonly opacity = input<number>(0.6);
  readonly enableFlow = input<boolean>(true);
  readonly flowSpeed = input<number>(0.5);

  // Visual quality controls
  readonly noiseScale = input<number>(0.01); // Smaller = larger features, bigger = more detail
  readonly density = input<number>(1.1); // Overall cloud density (0.5 - 2.0)
  readonly edgeSoftness = input<number>(0.3); // Edge fade softness (0.1 = hard, 0.5 = very soft)
  readonly contrast = input<number>(1.0); // Bright/dim contrast (0.5 = low, 2.0 = high)
  readonly glowIntensity = input<number>(3.0); // Glow strength in bright areas (1.0 - 5.0)
  readonly colorIntensity = input<number>(1.8); // Color brightness multiplier (0.5 - 3.0)

  // Color inputs
  readonly primaryColor = input<string>('#0088ff');
  readonly secondaryColor = input<string>('#00d4ff');
  readonly tertiaryColor = input<string>('#ff6bd4');

  // Three.js constants
  readonly additiveBlending = THREE.AdditiveBlending;
  readonly doubleSide = THREE.DoubleSide;

  // Shader code
  readonly vertexShader = `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  readonly fragmentShader = `
    uniform float uTime;
    uniform float uOpacity;
    uniform float uNoiseScale;
    uniform float uFlowSpeed;
    uniform float uDensity;
    uniform float uEdgeSoftness;
    uniform float uContrast;
    uniform float uGlowIntensity;
    uniform float uColorIntensity;
    uniform vec3 uPrimaryColor;
    uniform vec3 uSecondaryColor;
    uniform vec3 uTertiaryColor;

    varying vec2 vUv;
    varying vec3 vWorldPosition;

    // 3D Simplex noise
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);

      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);

      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;

      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));

      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);

      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);

      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    // FBM for smoke/cloud patterns
    float fbm(vec3 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;

      for (int i = 0; i < 5; i++) {
        value += amplitude * snoise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
      }

      return value;
    }

    // Domain warping for organic smoke tendrils
    vec3 domainWarp(vec3 p) {
      float warpAmount = 0.6;
      return p + vec3(
        fbm(p + vec3(1.7, 9.2, 4.1)) * warpAmount,
        fbm(p + vec3(8.3, 2.8, 5.5)) * warpAmount,
        fbm(p + vec3(3.5, 6.1, 2.9)) * warpAmount
      );
    }

    void main() {
      // World-space position for continuous field
      vec3 pos = vWorldPosition * uNoiseScale;

      // Slow-flowing animation
      float time = uTime * uFlowSpeed * 0.05;
      vec3 flowOffset = vec3(time * 0.15, time * 0.08, time * 0.05);

      // Apply domain warping for organic smoke
      vec3 warpedPos = domainWarp(pos + flowOffset);

      // Generate multi-scale smoke density
      float smoke1 = fbm(warpedPos);
      float smoke2 = fbm(warpedPos * 1.5 + vec3(5.2, 3.7, 8.1));
      float smoke3 = fbm(warpedPos * 0.6 + vec3(2.3, 7.1, 4.6));

      // Combine smoke layers
      float smokeDensity = smoke1 * 0.45 + smoke2 * 0.35 + smoke3 * 0.2;
      smokeDensity = (smokeDensity + 1.0) * 0.5; // Normalize to [0, 1]

      // Apply density multiplier
      smokeDensity *= uDensity;

      // CRITICAL: Ultra-soft edge falloff with NO visible boundaries
      vec2 centeredUv = vUv - 0.5;
      float distFromCenter = length(centeredUv);

      // Multi-stage radial falloff for extremely soft edges
      float radialFalloff1 = 1.0 - smoothstep(0.0, 0.6, distFromCenter);
      float radialFalloff2 = 1.0 - smoothstep(0.0, 0.5, distFromCenter);
      float radialFalloff3 = 1.0 - smoothstep(0.0, 0.4, distFromCenter);

      // Combine multiple falloff stages
      float edgeFalloff = radialFalloff1 * 0.3 + radialFalloff2 * 0.4 + radialFalloff3 * 0.3;

      // Configurable edge softness (lower = softer)
      edgeFalloff = pow(edgeFalloff, uEdgeSoftness);

      // Strong noise-based irregularity for organic edges
      float edgeNoise1 = fbm(warpedPos * 1.2) * 0.5 + 0.5;
      float edgeNoise2 = fbm(warpedPos * 0.6 + vec3(5.0, 5.0, 5.0)) * 0.5 + 0.5;
      float edgeNoise = edgeNoise1 * 0.6 + edgeNoise2 * 0.4;

      edgeFalloff *= 0.2 + edgeNoise * 0.8;

      // Calculate base alpha
      float alpha = smokeDensity * edgeFalloff;

      // Create BRIGHT and DIM areas (configurable contrast)
      // Use thresholding to create intense bright spots
      float brightAreas = smoothstep(0.55, 0.75, smokeDensity);
      float dimAreas = smoothstep(0.2, 0.4, smokeDensity);

      // Contrast control: either very bright or very dim
      float intensityMask = brightAreas * (2.5 * uContrast) + dimAreas * (0.3 * uContrast);

      // Very soft alpha curves for gas-like appearance
      alpha = pow(max(alpha, 0.0), 1.8);
      alpha = smoothstep(0.0, 1.0, alpha);
      alpha = smoothstep(0.0, 1.0, alpha); // Double smoothstep for extra softness

      // Apply opacity with intensity variation
      alpha *= uOpacity * intensityMask;

      // Discard nearly transparent pixels
      if (alpha < 0.002) discard;

      // Color mixing with HIGH CONTRAST
      // Bright areas = intense primary color
      // Dim areas = very dark secondary color
      float densityContrast = smoothstep(0.3, 0.7, smokeDensity);

      // Dark base color for dim areas
      vec3 darkColor = uSecondaryColor * 0.15;

      // Bright color for intense areas (configurable)
      vec3 brightColor = uPrimaryColor * uColorIntensity;

      // Mid-tone color
      vec3 midColor = mix(uSecondaryColor, uPrimaryColor, 0.6);

      // Mix based on density with high contrast
      vec3 color1 = mix(darkColor, midColor, densityContrast);
      vec3 color2 = mix(color1, brightColor, brightAreas);

      // Add accent color in specific density ranges
      vec3 finalColor = mix(color2, uTertiaryColor * 1.5, brightAreas * 0.2);

      // Strong brightness variation for dramatic lighting
      float brightness = 0.4 + smokeDensity * 1.2 + brightAreas * 1.5;
      finalColor *= brightness;

      // Configurable glow in VERY bright areas only
      float strongGlow = pow(brightAreas, 3.0) * uGlowIntensity;
      finalColor += strongGlow * uPrimaryColor * 2.0;

      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  // Uniform sets for each layer
  layer1Uniforms: { [uniform: string]: THREE.IUniform } = {
    uTime: { value: 0.0 },
    uOpacity: { value: 0.6 },
    uNoiseScale: { value: 0.01 },
    uFlowSpeed: { value: 0.5 },
    uDensity: { value: 1.1 },
    uEdgeSoftness: { value: 0.3 },
    uContrast: { value: 1.0 },
    uGlowIntensity: { value: 3.0 },
    uColorIntensity: { value: 1.8 },
    uPrimaryColor: { value: new THREE.Color('#0088ff') },
    uSecondaryColor: { value: new THREE.Color('#00d4ff') },
    uTertiaryColor: { value: new THREE.Color('#ff6bd4') },
  };

  layer2Uniforms: { [uniform: string]: THREE.IUniform } = {
    uTime: { value: 0.0 },
    uOpacity: { value: 0.5 },
    uNoiseScale: { value: 0.013 },
    uFlowSpeed: { value: -0.3 },
    uDensity: { value: 0.9 },
    uEdgeSoftness: { value: 0.3 },
    uContrast: { value: 1.0 },
    uGlowIntensity: { value: 3.0 },
    uColorIntensity: { value: 1.8 },
    uPrimaryColor: { value: new THREE.Color('#0088ff') },
    uSecondaryColor: { value: new THREE.Color('#00d4ff') },
    uTertiaryColor: { value: new THREE.Color('#ff6bd4') },
  };

  private time = 0;

  constructor() {
    // Update colors when inputs change
    effect(() => {
      const primary = new THREE.Color(this.primaryColor());
      const secondary = new THREE.Color(this.secondaryColor());
      const tertiary = new THREE.Color(this.tertiaryColor());

      this.layer1Uniforms['uPrimaryColor'].value = primary;
      this.layer1Uniforms['uSecondaryColor'].value = secondary;
      this.layer1Uniforms['uTertiaryColor'].value = tertiary;

      this.layer2Uniforms['uPrimaryColor'].value = primary;
      this.layer2Uniforms['uSecondaryColor'].value = secondary;
      this.layer2Uniforms['uTertiaryColor'].value = tertiary;
    });

    // Update opacity
    effect(() => {
      const opacity = this.opacity();
      this.layer1Uniforms['uOpacity'].value = opacity * 0.5;
      this.layer2Uniforms['uOpacity'].value = opacity * 0.4;
    });

    // Update flow speed
    effect(() => {
      const speed = this.flowSpeed();
      this.layer1Uniforms['uFlowSpeed'].value = speed;
      this.layer2Uniforms['uFlowSpeed'].value = -speed * 0.6;
    });

    // Update noise scale (size)
    effect(() => {
      const scale = this.noiseScale();
      this.layer1Uniforms['uNoiseScale'].value = scale;
      this.layer2Uniforms['uNoiseScale'].value = scale * 1.3;
    });

    // Update density
    effect(() => {
      const density = this.density();
      this.layer1Uniforms['uDensity'].value = density;
      this.layer2Uniforms['uDensity'].value = density * 0.9;
    });

    // Update edge softness
    effect(() => {
      const softness = this.edgeSoftness();
      this.layer1Uniforms['uEdgeSoftness'].value = softness;
      this.layer2Uniforms['uEdgeSoftness'].value = softness;
    });

    // Update contrast
    effect(() => {
      const contrast = this.contrast();
      this.layer1Uniforms['uContrast'].value = contrast;
      this.layer2Uniforms['uContrast'].value = contrast;
    });

    // Update glow intensity
    effect(() => {
      const glow = this.glowIntensity();
      this.layer1Uniforms['uGlowIntensity'].value = glow;
      this.layer2Uniforms['uGlowIntensity'].value = glow;
    });

    // Update color intensity
    effect(() => {
      const intensity = this.colorIntensity();
      this.layer1Uniforms['uColorIntensity'].value = intensity;
      this.layer2Uniforms['uColorIntensity'].value = intensity;
    });

    // Setup animation
    effect(() => {
      if (this.enableFlow()) {
        injectBeforeRender(
          ({ delta }) => {
            const group = this.groupRef()?.nativeElement;
            if (!group) return;

            this.time += delta;

            // Update time uniforms
            this.layer1Uniforms['uTime'].value = this.time;
            this.layer2Uniforms['uTime'].value = this.time;
          },
          {
            injector: this.injector,
          }
        );
      }
    });
  }
}
