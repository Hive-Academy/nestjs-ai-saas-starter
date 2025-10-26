/**
 * NebulaVolumetricComponent - Advanced Volumetric Nebula with Custom Shaders
 *
 * Creates realistic nebula clouds using:
 * - Custom vertex/fragment shaders
 * - Multi-octave Perlin/Simplex noise for wispy structures
 * - Volumetric ray-marching techniques
 * - Multiple color channels (red, blue, purple like Hubble images)
 * - Soft additive blending for glow
 *
 * Features:
 * - Procedural 3D noise textures
 * - Custom shader for volumetric rendering
 * - Color mixing based on astronomical nebulae
 * - Optional pulsing/flowing animation
 * - Depth-based alpha falloff
 *
 * Usage:
 * ```html
 * <app-nebula-volumetric
 *   [cloudCount]="8"
 *   [radius]="30"
 *   [primaryColor]="'#ff6b9d'"
 *   [secondaryColor]="'#4d4dff'"
 *   [tertiaryColor]="'#9d4dff'"
 *   [flow]="true"
 * />
 * ```
 */

import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  viewChild,
} from '@angular/core';
import { injectBeforeRender } from 'angular-three';
import { random } from 'maath';
import * as THREE from 'three';

interface NebulaCloud {
  id: number;
  position: [number, number, number];
  scale: [number, number, number];
  rotationSpeed: number;
  pulsePhase: number;
  colorMix: number; // 0-1 value for blending colors
}

@Component({
  selector: 'app-nebula-volumetric',
  standalone: true,
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngt-group #nebulaGroup [position]="position()">
      @for (cloud of cloudData(); track cloud.id) {
      <ngt-mesh
        [position]="cloud.position"
        [scale]="cloud.scale"
        [renderOrder]="998"
      >
        <ngt-circle-geometry [args]="[0.5, 32]" />
        <ngt-shader-material
          [vertexShader]="vertexShader"
          [fragmentShader]="fragmentShader"
          [uniforms]="getUniforms(cloud)"
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
  // Configuration inputs
  readonly position = input<[number, number, number]>([0, 0, 0]);
  readonly cloudCount = input<number>(8);
  readonly radius = input<number>(30);
  readonly minSize = input<number>(20);
  readonly maxSize = input<number>(45);
  readonly minOpacity = input<number>(0.15);
  readonly maxOpacity = input<number>(0.35);
  readonly flow = input<boolean>(true);

  // Color inputs (astronomical nebula colors)
  readonly primaryColor = input<string>('#ff6b9d'); // Red/Pink (H-alpha)
  readonly secondaryColor = input<string>('#4d4dff'); // Blue (Oxygen-III)
  readonly tertiaryColor = input<string>('#9d4dff'); // Purple (Sulfur-II)

  // Three.js constants
  readonly additiveBlending = THREE.AdditiveBlending;
  readonly doubleSide = THREE.DoubleSide;

  // Shader code
  readonly vertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  readonly fragmentShader = `
    uniform float uTime;
    uniform float uOpacity;
    uniform float uNoiseScale;
    uniform float uColorMix;
    uniform vec3 uPrimaryColor;
    uniform vec3 uSecondaryColor;
    uniform vec3 uTertiaryColor;

    varying vec2 vUv;
    varying vec3 vPosition;

    // 3D Simplex noise function (from Stefan Gustavson)
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

    // FBM (Fractional Brownian Motion) - standard implementation
    float fbm(vec3 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;

      // 4 octaves - enough detail without artifacts
      for (int i = 0; i < 4; i++) {
        value += amplitude * snoise(p * frequency);
        frequency *= 2.0;  // lacunarity
        amplitude *= 0.5;  // gain
      }

      return value;
    }

    void main() {
      // Center coordinates (-0.5 to 0.5)
      vec2 centeredUv = vUv - 0.5;

      // Calculate distance from center for circular falloff
      float dist = length(centeredUv);

      // Time-based animation
      float time = uTime * 0.03;

      // Generate noise position with time flow
      vec3 noisePos = vec3(centeredUv * uNoiseScale, time);

      // Main density using FBM
      float density = fbm(noisePos + vec3(time * 0.5, time * 0.3, 0.0));

      // Add second layer for detail
      float detail = fbm(noisePos * 2.5 + vec3(time * 0.3, -time * 0.2, 0.0));

      // Combine layers
      float combinedNoise = density * 0.6 + detail * 0.4;
      combinedNoise = (combinedNoise + 1.0) * 0.5; // Normalize to 0-1

      // Very soft radial falloff for cloud-like edges (important for circular geometry)
      float radialFalloff = 1.0 - smoothstep(0.0, 1.0, dist);
      radialFalloff = pow(radialFalloff, 0.8); // Gentle curve for very soft edges

      // Add noise-based irregularity to edges
      float edgeNoise = fbm(noisePos * 3.0) * 0.3;
      float irregularEdge = radialFalloff * (0.7 + edgeNoise);

      // Combine density with edge falloff
      float alpha = combinedNoise * irregularEdge;

      // Very soft power curve for fog-like appearance
      alpha = pow(max(alpha, 0.0), 1.5);

      // Apply overall opacity
      alpha *= uOpacity;

      // Smooth color gradient
      float colorGradient = combinedNoise * 0.5 + 0.5;
      vec3 color1 = mix(uPrimaryColor, uSecondaryColor, colorGradient);
      vec3 color2 = mix(uSecondaryColor, uTertiaryColor, density * 0.5 + 0.5);
      vec3 finalColor = mix(color1, color2, uColorMix);

      // Brightness variation
      float brightness = 0.9 + combinedNoise * 0.3;
      finalColor *= brightness;

      gl_FragColor = vec4(finalColor, alpha);
    }
  `;

  /**
   * Generate uniform values for a specific cloud
   */
  getUniforms(cloud: NebulaCloud): { [uniform: string]: THREE.IUniform } {
    return {
      uTime: { value: 0.0 },
      uOpacity: {
        value:
          this.minOpacity() +
          Math.random() * (this.maxOpacity() - this.minOpacity()),
      },
      uNoiseScale: { value: 0.8 + Math.random() * 0.4 }, // 0.8-1.2
      uColorMix: { value: cloud.colorMix },
      uPrimaryColor: { value: new THREE.Color(this.primaryColor()) },
      uSecondaryColor: { value: new THREE.Color(this.secondaryColor()) },
      uTertiaryColor: { value: new THREE.Color(this.tertiaryColor()) },
    };
  }

  /**
   * Generate cloud data with positions and properties
   */
  readonly cloudData = computed(() => {
    const count = this.cloudCount();
    const radius = this.radius();
    const minSize = this.minSize();
    const maxSize = this.maxSize();

    // Generate horizontal/elongated nebula distribution (not spherical)
    const clouds: NebulaCloud[] = [];

    for (let i = 0; i < count; i++) {
      // Create elongated horizontal distribution with higher density in center
      const t = i / count; // 0 to 1

      // Use gaussian-like distribution for center density
      const centerBias = Math.pow(Math.sin(t * Math.PI), 1.5);

      const noise1 = (Math.random() - 0.5) * 2; // -1 to 1
      const noise2 = (Math.random() - 0.5) * 2;
      const noise3 = (Math.random() - 0.5) * 2;

      // Horizontal spread (much wider, with denser center)
      const x =
        (t - 0.5) * radius * 3 + noise1 * radius * (0.3 + centerBias * 0.4);

      // Vertical variation (tighter in center for defined core)
      const y = noise2 * radius * (0.2 + (1 - centerBias) * 0.3);

      // Depth variation (more depth at center)
      const z = noise3 * radius * (0.3 + centerBias * 0.2);

      const position: [number, number, number] = [x, y, z];

      // Vary size: larger in center, much smaller at edges for wispy tendrils
      const centerFactor = 1 - Math.abs(t - 0.5) * 2; // 0 at edges, 1 at center
      const sizeVariation = minSize + Math.random() * (maxSize - minSize);
      const size = sizeVariation * (0.4 + centerFactor * 0.6);

      // Random rotation speed
      const rotationSpeed = 0.02 + Math.random() * 0.05;

      // Random pulse phase
      const pulsePhase = Math.random() * Math.PI * 2;

      // Color mix varies smoothly along the nebula length
      const colorMix = t + (Math.random() - 0.5) * 0.2;

      clouds.push({
        id: i,
        position,
        scale: [size, size, 1] as [number, number, number],
        rotationSpeed,
        pulsePhase,
        colorMix: Math.max(0, Math.min(1, colorMix)), // Clamp to 0-1
      });
    }

    console.log(
      `[NebulaVolumetric] Generated ${count} horizontal nebula clouds`
    );
    return clouds;
  });

  private time = 0;

  constructor() {
    // Setup flow animation if enabled

    effect(() => {
      if (this.flow()) {
        injectBeforeRender(
          ({ delta }) => {
            const group = this.groupRef()?.nativeElement;
            if (!group) return;

            // Track elapsed time
            this.time += delta;

            // Slow rotation for nebula drift
            group.rotation.y += delta * 0.01;

            // Update shader uniforms for each cloud
            const clouds = this.cloudData();
            group.children.forEach((mesh, i) => {
              const cloud = clouds[i];
              if (!cloud) return;

              const material = (mesh as THREE.Mesh)
                .material as THREE.ShaderMaterial;

              // Update time uniform for animated noise
              material.uniforms['uTime'].value = this.time;

              // Subtle rotation of individual clouds
              mesh.rotation.z += delta * cloud.rotationSpeed;
            });
          },
          {
            injector: this.injector,
          }
        );
      }
    });
  }
}
