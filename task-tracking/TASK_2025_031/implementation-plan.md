# Implementation Plan - TASK_2025_031

**Task**: Fix troika-three-text Component Implementations
**Strategy**: DIRECT REPLACEMENT (in-place component modernization)
**Architecture**: Production troika Text API + Material-Based Effects
**Evidence Source**: research-report.md (92% confidence, 12+ verified sources)

---

## Executive Summary

### Root Cause Analysis

**Current Broken Implementations**:

1. **text-3d-volumetric.component.ts** (lines 41-76):

   - Uses `NgtsText3D` (extruded TextGeometry) instead of troika Text (SDF rendering)
   - Attempts custom ShaderMaterial as template child (line 68-75)
   - **Why it fails**: NgtsText3D != troika-three-text; custom shaders break troika's material patching
   - **Result**: No text renders, shader uniforms ignored

2. **smoke-text-3d.component.ts** (lines 189-236):
   - Canvas pixel sampling to create text-shaped particles
   - Manual particle lifecycle management for 5000+ particles
   - **Why it fails**: Inefficient, jagged edges, reinvents troika's SDF rendering
   - **Result**: Slow, unreadable, complex

### Solution Strategy

**DIRECT REPLACEMENT** using troika-three-text correctly:

1. **Glow Effect**: troika `Text` + `MeshStandardMaterial` with emissive + `UnrealBloomPass` (optional)
2. **Smoke Effect**: troika `Text` (crisp text) + background particle system (atmospheric smoke)

**Key Insight**: Work WITH troika's material patching, not AGAINST it.

---

## 1. Architecture Overview

### Design Philosophy

**Pattern**: Material-Based Effects (NOT custom shaders)
**Rationale**: troika-three-text uses `createDerivedMaterial` to patch ANY standard Three.js material with SDF rendering shaders. Custom ShaderMaterial breaks this pipeline.
**Evidence**: research-report.md lines 88-112 (material patching mechanism)

### Component Redesign Strategy

**DIRECT REPLACEMENT** (no versioning):

- Modify `text-3d-volumetric.component.ts` in-place → Glow effect implementation
- Modify `smoke-text-3d.component.ts` in-place → Smoke effect implementation
- Preserve existing component selectors (`app-text-3d-volumetric`, `app-smoke-text-3d`)
- Preserve public API where possible (inputs/outputs)

**Migration Path**: None needed (components are already broken, this is a fix)

### Integration Architecture

**troika Text Instantiation Pattern**:

- **NOT template-based**: No `<ngts-text-3d>` wrapper
- **Effect-based**: Direct `Text` instantiation in Angular `effect()`
- **Lifecycle**: Proper disposal in cleanup function
- **Reactivity**: Separate effects for property updates

**Material System**:

- **Glow**: `MeshStandardMaterial` with `emissive` + `emissiveIntensity`
- **Smoke**: `MeshBasicMaterial` (semi-transparent) + particle system
- **Post-Processing**: Optional `UnrealBloomPass` for enhanced glow

---

## 2. Component Specifications

### 2.1 Component: text-3d-volumetric.component.ts (Glow Effect)

#### Purpose

Create glowing 3D text using troika-three-text's SDF rendering with material-based emissive glow, optionally enhanced by UnrealBloomPass post-processing.

#### Pattern (Evidence-Based)

**Chosen Pattern**: troika Text + MeshStandardMaterial + Emissive Properties
**Evidence**: research-report.md lines 190-291 (glow implementation strategy)
**Rationale**:

- Leverages troika's material patching (not fighting it)
- Industry-standard technique (AAA games)
- GPU-efficient (material properties + optional post-processing)
- Realistic glow (not just outlines)

#### Implementation Pattern

```typescript
// Pattern source: research-report.md:140-186, 206-376
// Verified imports from: troika-three-text (npm package)
import { Component, input, effect, OnDestroy, inject, DestroyRef } from '@angular/core';
import { Text } from 'troika-three-text';
import { MeshStandardMaterial, Color, Group } from 'three';
import { injectNgtRef, injectBeforeRender } from 'angular-three';

@Component({
  selector: 'app-text-3d-volumetric',
  standalone: true,
  template: `<ngt-group [ref]="groupRef()"></ngt-group>`,
})
export class Text3DVolumetricComponent implements OnDestroy {
  // === INPUTS (preserve existing API) ===
  text = input.required<string>();
  position = input<[number, number, number]>([0, 0, 0]);
  fontSize = input<number>(1.0);
  glowColor = input<number>(0x00ffff);
  glowIntensity = input<number>(2.5);

  // NEW: troika-specific properties
  anchorX = input<'left' | 'center' | 'right'>('center');
  anchorY = input<'top' | 'middle' | 'bottom'>('middle');
  font = input<string | undefined>(undefined); // Default: Roboto

  // NEW: Outline-based glow (troika built-in)
  outlineWidth = input<string>('5%');
  outlineBlur = input<string>('10%');

  // NEW: Animation
  pulseSpeed = input<number>(0); // 0 = disabled
  pulseAmount = input<number>(0.3);

  // === INTERNAL STATE ===
  groupRef = injectNgtRef<Group>();
  private textMesh?: Text;
  private destroyRef = inject(DestroyRef);

  constructor() {
    // Effect 1: Initial setup
    effect(() => {
      const group = this.groupRef.nativeElement;
      if (!group) return;

      // Direct troika Text instantiation
      this.textMesh = new Text();
      this.textMesh.text = this.text();
      this.textMesh.fontSize = this.fontSize();
      this.textMesh.anchorX = this.anchorX();
      this.textMesh.anchorY = this.anchorY();

      if (this.font()) {
        this.textMesh.font = this.font();
      }

      // MeshStandardMaterial with emissive (NOT custom shader)
      this.textMesh.material = new MeshStandardMaterial({
        color: 0xffffff,
        emissive: new Color(this.glowColor()),
        emissiveIntensity: this.glowIntensity(),
        metalness: 0.1,
        roughness: 0.8,
        toneMapped: false, // Prevent tone mapping from reducing glow
      });

      // troika built-in outline for extra glow
      this.textMesh.outlineWidth = this.outlineWidth();
      this.textMesh.outlineColor = this.glowColor();
      this.textMesh.outlineBlur = this.outlineBlur();

      // CRITICAL: Sync after configuration
      this.textMesh.sync();

      group.add(this.textMesh);

      // Cleanup function
      return () => {
        if (this.textMesh) {
          group.remove(this.textMesh);
          this.textMesh.dispose(); // Release WebGL resources
          this.textMesh = undefined;
        }
      };
    });

    // Effect 2: Reactive property updates
    effect(() => {
      if (!this.textMesh) return;

      this.textMesh.text = this.text();
      this.textMesh.fontSize = this.fontSize();

      // Update material emissive
      const mat = this.textMesh.material as MeshStandardMaterial;
      if (mat) {
        mat.emissive.set(this.glowColor());
        mat.emissiveIntensity = this.glowIntensity();
      }

      // Update outline
      this.textMesh.outlineColor = this.glowColor();
      this.textMesh.outlineWidth = this.outlineWidth();
      this.textMesh.outlineBlur = this.outlineBlur();

      // Re-sync after changes
      this.textMesh.sync();
    });

    // Effect 3: Animation (if enabled)
    if (this.pulseSpeed() > 0) {
      injectBeforeRender(({ state }) => {
        if (!this.textMesh) return;

        const mat = this.textMesh.material as MeshStandardMaterial;
        if (!mat) return;

        const time = state.clock.elapsedTime;
        const pulse = Math.sin(time * this.pulseSpeed()) * this.pulseAmount() + 1.0;
        mat.emissiveIntensity = this.glowIntensity() * pulse;
      });
    }
  }

  ngOnDestroy() {
    // Disposal handled by effect cleanup
  }
}
```

#### Quality Requirements

**Functional Requirements**:

- Text must render crisply using troika SDF rendering
- Glow effect must be visible and configurable
- Text content must update reactively when input changes
- Emissive intensity must pulse if `pulseSpeed > 0`
- Font loading must complete before rendering (troika handles async)

**Non-Functional Requirements**:

- **Performance**: 60 FPS with up to 10 text instances (emissive materials are GPU-efficient)
- **Memory**: Proper disposal on component destruction (no WebGL memory leaks)
- **Type Safety**: Strict TypeScript (no `any` types), all imports verified
- **Visual Quality**: Sharp text at any scale (SDF rendering benefit)

**Pattern Compliance**:

- Must use troika `Text` class directly (NOT NgtsText3D)
  - Verified: troika-three-text npm package export
- Must use `MeshStandardMaterial` (NOT ShaderMaterial)
  - Verified: three.js standard material
- Must call `text.sync()` after property changes
  - Verified: research-report.md:80
- Must dispose `text.dispose()` on cleanup
  - Verified: research-report.md:84

#### Files Affected

**MODIFY** (Direct Replacement):

- `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\angular-3d\components\primitives\text-3d-volumetric.component.ts`

**Preserved**:

- Component selector: `app-text-3d-volumetric`
- Inputs: `text`, `position`, `glowColor`, `glowIntensity` (existing API)
- New inputs: `fontSize`, `anchorX`, `anchorY`, `font`, `outlineWidth`, `outlineBlur`, `pulseSpeed`, `pulseAmount`

**Removed**:

- `NgtsText3D` import and template usage
- Custom `ShaderMaterial` and shader code
- `depth`, `bevelSize`, `bevelThickness` inputs (extruded geometry concept)

---

### 2.2 Component: smoke-text-3d.component.ts (Smoke Effect)

#### Purpose

Create smoke-effect text using crisp troika text rendering with atmospheric particle system in background.

#### Pattern (Evidence-Based)

**Chosen Pattern**: troika Text (foreground) + BufferGeometry Particles (background atmosphere)
**Evidence**: research-report.md lines 410-646 (smoke implementation strategy)
**Rationale**:

- Smoke as decorative effect, NOT text structure
- troika handles text rendering (crisp, readable)
- Particles add atmosphere (wispy smoke around text)
- Performance-efficient (troika SDF + simple particles)

#### Implementation Pattern

```typescript
// Pattern source: research-report.md:432-594
// Verified imports from: troika-three-text, three.js
import { Component, input, signal, effect, OnDestroy, inject, DestroyRef } from '@angular/core';
import { Text } from 'troika-three-text';
import {
  MeshBasicMaterial,
  BufferGeometry,
  BufferAttribute,
  PointsMaterial,
  Points,
  Color,
  CanvasTexture,
  AdditiveBlending,
  Group,
} from 'three';
import { injectNgtRef, injectBeforeRender } from 'angular-three';

interface ParticleData {
  pos: [number, number, number];
  vel: [number, number, number];
  life: number;
}

@Component({
  selector: 'app-smoke-text-3d',
  standalone: true,
  template: `
    <ngt-group [ref]="groupRef()">
      <!-- Text group (added programmatically) -->
      <!-- Particles group (added programmatically) -->
    </ngt-group>
  `,
})
export class SmokeText3DComponent implements OnDestroy {
  // === INPUTS (preserve existing API where sensible) ===
  text = input.required<string>();
  position = input<[number, number, number]>([0, 0, 0]);
  fontSize = input<number>(1.0);

  // Text appearance
  textColor = input<number>(0xffffff);
  textOpacity = input<number>(0.7);
  font = input<string | undefined>(undefined);
  anchorX = input<'left' | 'center' | 'right'>('center');
  anchorY = input<'top' | 'middle' | 'bottom'>('middle');

  // Smoke particle appearance
  smokeColor = input<number>(0xcccccc);
  smokeOpacity = input<number>(0.3);
  particleCount = input<number>(500);
  particleSize = input<number>(0.05);

  // Smoke behavior
  turbulenceSpeed = input<number>(0.02);
  driftSpeed = input<number>(0.02);
  particleLifespan = input<number>(5);

  // === INTERNAL STATE ===
  groupRef = injectNgtRef<Group>();
  private textMesh?: Text;
  private particleSystem?: Points;
  private particles: ParticleData[] = [];
  private smokeTexture?: CanvasTexture;
  private destroyRef = inject(DestroyRef);

  constructor() {
    // Effect 1: Text setup
    effect(() => {
      const group = this.groupRef.nativeElement;
      if (!group) return;

      this.textMesh = new Text();
      this.textMesh.text = this.text();
      this.textMesh.fontSize = this.fontSize();
      this.textMesh.anchorX = this.anchorX();
      this.textMesh.anchorY = this.anchorY();

      if (this.font()) {
        this.textMesh.font = this.font();
      }

      // Semi-transparent material for smoke-like text
      this.textMesh.material = new MeshBasicMaterial({
        color: new Color(this.textColor()),
        transparent: true,
        opacity: this.textOpacity(),
      });

      this.textMesh.sync();
      group.add(this.textMesh);

      return () => {
        if (this.textMesh) {
          group.remove(this.textMesh);
          this.textMesh.dispose();
          this.textMesh = undefined;
        }
      };
    });

    // Effect 2: Particle system setup
    effect(() => {
      const group = this.groupRef.nativeElement;
      if (!group) return;

      // Generate smoke texture
      this.smokeTexture = this.generateSmokeTexture();

      // Initialize particles
      this.initializeParticles();

      // Create particle geometry
      const geometry = new BufferGeometry();
      const positions = new Float32Array(this.particleCount() * 3);
      this.updateParticlePositions(positions);
      geometry.setAttribute('position', new BufferAttribute(positions, 3));

      // Create particle material
      const material = new PointsMaterial({
        size: this.particleSize(),
        color: new Color(this.smokeColor()),
        map: this.smokeTexture,
        transparent: true,
        opacity: this.smokeOpacity(),
        blending: AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });

      // Create particle system
      this.particleSystem = new Points(geometry, material);
      this.particleSystem.position.set(0, 0, -0.5); // Behind text
      group.add(this.particleSystem);

      return () => {
        if (this.particleSystem) {
          group.remove(this.particleSystem);
          this.particleSystem.geometry.dispose();
          (this.particleSystem.material as PointsMaterial).dispose();
          this.particleSystem = undefined;
        }
        if (this.smokeTexture) {
          this.smokeTexture.dispose();
          this.smokeTexture = undefined;
        }
      };
    });

    // Effect 3: Particle animation
    injectBeforeRender(({ delta }) => {
      this.animateParticles(delta);
    });
  }

  private initializeParticles(): void {
    const count = this.particleCount();
    const textWidth = this.fontSize() * this.text().length * 0.6; // Approximate
    const textHeight = this.fontSize();

    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        pos: [
          (Math.random() - 0.5) * textWidth,
          (Math.random() - 0.5) * textHeight,
          (Math.random() - 0.5) * 0.5,
        ],
        vel: [
          (Math.random() - 0.5) * this.turbulenceSpeed(),
          Math.random() * this.driftSpeed(),
          (Math.random() - 0.5) * this.turbulenceSpeed(),
        ],
        life: Math.random() * this.particleLifespan(),
      });
    }
  }

  private animateParticles(delta: number): void {
    if (!this.particleSystem) return;

    const textWidth = this.fontSize() * this.text().length * 0.6;
    const textHeight = this.fontSize();

    this.particles.forEach((p) => {
      // Update position
      p.pos[0] += p.vel[0];
      p.pos[1] += p.vel[1];
      p.pos[2] += p.vel[2];

      // Update life
      p.life -= delta;

      // Respawn if dead
      if (p.life <= 0) {
        p.pos[0] = (Math.random() - 0.5) * textWidth;
        p.pos[1] = (Math.random() - 0.5) * textHeight;
        p.pos[2] = (Math.random() - 0.5) * 0.5;
        p.life = this.particleLifespan();
      }
    });

    // Update geometry
    const positions = (this.particleSystem.geometry.attributes['position'] as BufferAttribute)
      .array as Float32Array;
    this.updateParticlePositions(positions);
    this.particleSystem.geometry.attributes['position'].needsUpdate = true;
  }

  private updateParticlePositions(positions: Float32Array): void {
    this.particles.forEach((p, i) => {
      positions[i * 3] = p.pos[0];
      positions[i * 3 + 1] = p.pos[1];
      positions[i * 3 + 2] = p.pos[2];
    });
  }

  private generateSmokeTexture(): CanvasTexture {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Radial gradient for soft smoke particle
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new CanvasTexture(canvas);
  }

  ngOnDestroy() {
    // Disposal handled by effect cleanups
  }
}
```

#### Quality Requirements

**Functional Requirements**:

- Text must render crisply using troika SDF rendering
- Particles must form atmospheric smoke effect around text
- Particles must drift and respawn for continuous effect
- Text and particles must dispose properly on destruction

**Non-Functional Requirements**:

- **Performance**: 60 FPS with 500 particles (BufferGeometry is GPU-efficient)
- **Memory**: All resources disposed (text, geometry, material, texture)
- **Type Safety**: Strict TypeScript, typed particle data structure
- **Readability**: Text remains readable (troika SDF + moderate opacity)

**Pattern Compliance**:

- Must use troika `Text` class directly
  - Verified: troika-three-text npm package
- Must NOT sample canvas pixels for particles
  - Verified: research-report.md:1078-1114 (anti-pattern analysis)
- Must use `BufferGeometry` for particles
  - Verified: three.js standard API
- Must dispose all resources on cleanup
  - Verified: research-report.md:862-863

#### Files Affected

**MODIFY** (Direct Replacement):

- `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\angular-3d\components\primitives\smoke-text-3d.component.ts`

**Preserved**:

- Component selector: `app-smoke-text-3d`
- Inputs: `text`, `position`, `smokeColor`, `particleCount`, `turbulenceSpeed` (existing API)
- New inputs: `fontSize`, `textColor`, `textOpacity`, `font`, `anchorX`, `anchorY`, `particleSize`, `driftSpeed`, `particleLifespan`

**Removed**:

- Canvas text sampling logic (lines 189-236)
- `sampleTextPixels()` method (inefficient anti-pattern)
- `fontFamily`, `fontWeight` inputs (troika uses font files, not CSS fonts)

---

## 3. Integration Architecture

### troika Font Loading

**Asynchronous Font Loading**:

- troika loads fonts in Web Workers (non-blocking)
- First render may show no text while font loads
- Listen to `synccomplete` event for font ready notification

**Font File Format**:

- Supports: TTF, OTF, WOFF, WOFF2
- Default: Roboto (bundled with troika)
- Custom fonts: Provide URL to font file

### Material Patching (Internal)

**How troika Works** (understanding, not implementation):

```typescript
// What happens inside troika.sync():
const derivedMaterial = createDerivedMaterial(
  userProvidedMaterial, // Your MeshStandardMaterial
  {
    // Shader code injected for SDF rendering
    vertexDefs: `uniform sampler2D uTroikaSDFTexture; ...`,
    fragmentDefs: `uniform vec2 uTroikaSDFTextureSize; ...`,
    fragmentColorTransform: `
      float aaDist = ...;
      float alpha = clamp(aaDist, 0.0, 1.0);
      gl_FragColor.a *= alpha;
    `,
  }
);
text.material = derivedMaterial; // Replaces your original material
```

**Implication**: Changes to original material after assignment won't work. Access derived material via `text.material` AFTER `sync()`.

### Post-Processing Setup (Optional Enhancement)

**UnrealBloomPass Integration** (Future Enhancement):

```typescript
// Optional: Add to scene-3d.component.ts or parent component
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { Vector2 } from 'three';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(
  new UnrealBloomPass(
    new Vector2(width, height),
    1.5, // Strength (glow intensity multiplier)
    0.4, // Radius (glow spread)
    0.85 // Threshold (only bright objects glow)
  )
);

// In render loop: composer.render() instead of renderer.render()
```

**Note**: Post-processing is optional. Components work standalone with material-based glow.

---

## 4. Quality Standards (Architecture-Level)

### Functional Requirements

**Text Rendering**:

- Text must render using troika SDF (sharp at any scale)
- Text content must update reactively when inputs change
- Font loading must not block main thread (troika Web Workers)
- Text must support multiple instances simultaneously

**Effect Quality**:

- Glow effect must be visible and configurable (color, intensity)
- Smoke particles must create atmospheric effect (not structural)
- Effects must not obscure text readability
- Animation must be smooth (60 FPS target)

### Non-Functional Requirements

**Performance**:

- 60 FPS with 10+ text instances simultaneously
- Particle systems: 500 particles = ~0.5ms/frame
- Material-based glow: GPU-efficient (emissive properties)
- Post-processing (optional): ~2-5ms/frame at 1080p

**Memory Management**:

- All `Text` instances must call `dispose()` on cleanup
- All geometries, materials, textures must be disposed
- No WebGL memory leaks (verified via browser DevTools)
- Particle arrays must be properly garbage collected

**Type Safety**:

- Strict TypeScript (no `any` types except unavoidable Three.js internals)
- All imports verified from npm packages
- Proper interfaces for particle data structures
- Type guards for material access after troika patching

**Maintainability**:

- Component structure follows Angular signals + effects pattern
- Clear separation: setup effect, update effect, animation effect
- Inline documentation for troika-specific patterns
- Evidence citations in code comments

### Pattern Compliance

**troika-three-text Patterns** (MUST follow):

1. Direct `Text` instantiation (NOT NgtsText3D wrapper)
   - Evidence: research-report.md:56-84
2. Standard materials (MeshStandardMaterial, MeshBasicMaterial)
   - Evidence: research-report.md:88-112
3. Call `text.sync()` after property changes
   - Evidence: research-report.md:80
4. Call `text.dispose()` on cleanup
   - Evidence: research-report.md:84
5. Access derived material via `text.material` after sync
   - Evidence: research-report.md:948-963

**Angular Three Patterns**:

1. Use `injectNgtRef<Group>()` for scene graph access
2. Use `effect()` for setup with cleanup functions
3. Use `injectBeforeRender()` for animations
4. Use `inject(DestroyRef)` for lifecycle management

---

## 5. Testing Strategy

### Unit Tests

**text-3d-volumetric.component.spec.ts**:

```typescript
describe('Text3DVolumetricComponent', () => {
  it('should create troika Text instance on init', () => {
    // Verify Text object created
    // Verify added to scene graph
  });

  it('should set MeshStandardMaterial with emissive', () => {
    // Verify material type
    // Verify emissive color matches input
  });

  it('should update text content reactively', () => {
    // Change text input
    // Verify text.text property updated
    // Verify sync() called
  });

  it('should dispose Text on component destroy', () => {
    // Spy on text.dispose()
    // Trigger component destruction
    // Verify dispose called
  });
});
```

**smoke-text-3d.component.spec.ts**:

```typescript
describe('SmokeText3DComponent', () => {
  it('should create troika Text and particle system', () => {
    // Verify both created
  });

  it('should initialize correct particle count', () => {
    // Verify particles array length
    // Verify geometry attribute size
  });

  it('should animate particles each frame', () => {
    // Spy on updateParticlePositions
    // Trigger beforeRender
    // Verify positions updated
  });

  it('should dispose all resources', () => {
    // Spy on text.dispose(), geometry.dispose(), material.dispose(), texture.dispose()
    // Trigger destruction
    // Verify all called
  });
});
```

### Integration Tests

**Scene Rendering Tests**:

```typescript
it('should render text in 3D scene', () => {
  // Add component to Scene3DComponent
  // Trigger render
  // Verify text mesh in scene graph
});

it('should support multiple text instances', () => {
  // Add 5 text components
  // Verify all render
  // Verify 60 FPS maintained
});
```

### Visual Regression Tests

**Screenshot Comparison**:

1. Render glow text with cyan color
2. Capture screenshot
3. Compare to baseline (pixel difference < 5%)
4. Repeat for smoke text

### Performance Tests

**FPS Monitoring**:

```typescript
it('should maintain 60 FPS with 10 text instances', async () => {
  // Add 10 text components
  // Monitor FPS for 5 seconds
  // Assert: averageFPS >= 58
});

it('should maintain 60 FPS with 500 particles', async () => {
  // Add smoke text with 500 particles
  // Monitor FPS for 5 seconds
  // Assert: averageFPS >= 58
});
```

**Memory Profiling**:

```typescript
it('should not leak memory on repeated create/destroy', async () => {
  // Record initial memory
  // Create/destroy component 100 times
  // Force garbage collection
  // Record final memory
  // Assert: finalMemory - initialMemory < 10MB
});
```

### Manual QA Checklist

**Visual Inspection**:

- [ ] Glow text renders with visible glow effect
- [ ] Glow color matches input color
- [ ] Glow intensity is configurable
- [ ] Pulse animation works (if enabled)
- [ ] Smoke text has atmospheric particles
- [ ] Smoke particles drift smoothly
- [ ] Text remains readable through smoke
- [ ] Multiple text instances render correctly

**Interaction Testing**:

- [ ] Text updates when input changes
- [ ] Component destroys cleanly (no errors in console)
- [ ] Font loads asynchronously without blocking
- [ ] Works on desktop browsers (Chrome, Firefox, Edge)
- [ ] Works on mobile (iOS Safari, Android Chrome)

**Performance Verification**:

- [ ] Consistent 60 FPS with 10 text instances
- [ ] No frame drops during animation
- [ ] No WebGL errors in console
- [ ] Memory usage stable over 5 minutes

---

## 6. Risk Mitigation

### Risk 1: Font Loading Delays

**Issue**: First render may show empty space while font loads asynchronously.

**Mitigation**:

```typescript
// Listen for font ready event
this.textMesh.addEventListener('synccomplete', () => {
  console.log('Font loaded and text rendered');
  // Optional: Emit output event for parent component
});
```

**Alternative**: Preload fonts in app initialization:

```typescript
// In app.component.ts or font.service.ts
import { Text } from 'troika-three-text';

export async function preloadFont(url: string): Promise<void> {
  const temp = new Text();
  temp.font = url;
  temp.text = 'A';
  return new Promise((resolve) => {
    temp.addEventListener('synccomplete', () => {
      temp.dispose();
      resolve();
    });
    temp.sync();
  });
}
```

### Risk 2: Material Property Updates Not Reflected

**Issue**: Changes to original material before `sync()` won't affect derived material.

**Mitigation**:

- Always access material via `text.material` AFTER `sync()`
- Update derived material properties directly
- Call `text.sync()` again if needed for text content changes

**Example**:

```typescript
// WRONG: Update before sync
const baseMat = new MeshStandardMaterial({ color: 0xff0000 });
text.material = baseMat;
text.sync();
baseMat.color.set(0x00ff00); // Won't work!

// CORRECT: Update after sync
text.material = new MeshStandardMaterial({ color: 0xff0000 });
text.sync();
(text.material as MeshStandardMaterial).color.set(0x00ff00); // Works
```

### Risk 3: Memory Leaks from Undisposed Resources

**Issue**: `Text` objects hold WebGL resources (textures, shaders) that must be manually freed.

**Mitigation**:

- ALWAYS call `text.dispose()` in cleanup function
- Dispose geometries, materials, textures
- Use `DestroyRef.onDestroy()` as backup

**Verification**:

```typescript
// In browser DevTools:
// 1. Open Memory tab
// 2. Take heap snapshot
// 3. Create/destroy component 50 times
// 4. Force GC (browser DevTools)
// 5. Take second heap snapshot
// 6. Compare: WebGLTexture, WebGLBuffer counts should not increase
```

### Risk 4: Bloom Affecting Entire Scene

**Issue**: `UnrealBloomPass` blooms all bright objects, not just text.

**Mitigation (Optional - if bloom added)**:

```typescript
// Tune threshold to only bloom very bright objects
bloomPass.threshold = 0.9; // Only objects with brightness > 0.9 glow

// Alternative: Selective bloom using layers
text.layers.enable(1); // Assign to bloom layer
// Configure bloom pass to only render layer 1 (advanced)
```

**Note**: Current implementation uses material emissive only (no post-processing). This risk only applies if post-processing is added later.

### Risk 5: Performance Degradation on Mobile

**Issue**: Mobile GPUs may struggle with many particles or post-processing.

**Mitigation**:

```typescript
// Detect mobile
const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

// Reduce quality settings
const particleCount = isMobile ? 200 : 500;
const particleSize = isMobile ? 0.03 : 0.05;
const glowIntensity = isMobile ? 1.5 : 2.5;

// Skip post-processing on mobile
const enableBloom = !isMobile;
```

**Performance Budget**:

- Desktop: 500 particles, full glow, optional bloom
- Mobile: 200 particles, reduced glow, no bloom

### Risk 6: Custom Fonts Not Loading

**Issue**: Invalid font URLs or CORS issues prevent font loading.

**Mitigation**:

```typescript
// Add error handling
this.textMesh.addEventListener('syncerror', (event) => {
  console.error('troika font loading error:', event);
  // Fallback: Use default Roboto font
  this.textMesh.font = undefined; // Reset to default
  this.textMesh.sync();
});
```

**Font Hosting**:

- Serve fonts from same origin (avoid CORS)
- Use public CDN (Google Fonts, jsDelivr) with CORS headers
- Bundle fonts in `/public/fonts/` directory

---

## 7. Implementation File Modifications

### File 1: text-3d-volumetric.component.ts

**Action**: MODIFY (Direct Replacement)
**Path**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\angular-3d\components\primitives\text-3d-volumetric.component.ts`

**Modifications**:

1. **Replace imports** (lines 29-43):

   - Remove: `NgtsText3D`, `ShaderMaterial`, `AdditiveBlending`
   - Add: `import { Text } from 'troika-three-text'`
   - Add: `injectNgtRef` for group reference

2. **Replace template** (lines 50-77):

   - Remove: `<ngts-text-3d>` with shader material child
   - Replace with: `<ngt-group [ref]="groupRef()"></ngt-group>`

3. **Replace component class** (lines 79-211):
   - Remove: `shaderUniforms`, `vertexShader`, `fragmentShader`
   - Remove: `depth`, `bevelSize`, `bevelThickness`, `curveSegments` inputs
   - Add: `textMesh?: Text` private property
   - Add: `groupRef = injectNgtRef<Group>()`
   - Replace constructor with 3 effects:
     - Effect 1: Text creation + material setup + sync + cleanup
     - Effect 2: Reactive property updates
     - Effect 3: Pulse animation (if enabled)

**Line-by-Line Strategy**:

- Lines 1-28: Preserve (file header comments)
- Lines 29-43: Replace imports (add troika, remove Soba/ShaderMaterial)
- Lines 45-78: Replace template (single group ref)
- Lines 79-211: Replace entire class implementation (new troika pattern)

**Verification Points**:

- [ ] All imports resolve (troika-three-text installed)
- [ ] Template compiles (ngt-group is valid angular-three element)
- [ ] TypeScript compiles (no type errors)
- [ ] Component selector unchanged: `app-text-3d-volumetric`

---

### File 2: smoke-text-3d.component.ts

**Action**: MODIFY (Direct Replacement)
**Path**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\angular-3d\components\primitives\smoke-text-3d.component.ts`

**Modifications**:

1. **Replace imports** (lines 27-48):

   - Add: `import { Text } from 'troika-three-text'`
   - Add: `import { Group } from 'three'`
   - Keep: BufferGeometry, BufferAttribute, Points, PointsMaterial, etc.

2. **Simplify template** (lines 68-89):

   - Replace with: `<ngt-group [ref]="groupRef()"></ngt-group>`
   - Remove: Conditional rendering, template-based particles
   - Add text + particles programmatically in effects

3. **Replace component class** (lines 91-365):
   - Remove: `sampleTextPixels()` method (lines 189-236)
   - Remove: Canvas text sampling logic
   - Simplify `ParticleData` interface (no maxLife needed)
   - Add: `textMesh?: Text`, `particleSystem?: Points` properties
   - Add: `smokeTexture?: CanvasTexture` property
   - Replace: `initializeParticles()` to use text dimensions (not canvas sampling)
   - Replace constructor with 3 effects:
     - Effect 1: Text creation + material
     - Effect 2: Particle system creation
     - Effect 3: Animation loop

**Line-by-Line Strategy**:

- Lines 1-26: Preserve (file header comments)
- Lines 27-54: Update imports (add troika, add Group)
- Lines 56-62: Simplify ParticleData interface
- Lines 64-90: Replace template (single group ref)
- Lines 91-365: Replace entire class (new hybrid pattern: troika text + simple particles)

**Key Removals**:

- `sampleTextPixels()` method (CPU-intensive, anti-pattern)
- `fontFamily`, `fontWeight` inputs (troika uses font files)
- Canvas text rendering logic (troika handles this)
- Complex particle lifecycle (simplified to drift + respawn)

**Verification Points**:

- [ ] Canvas sampling removed (verify method deleted)
- [ ] troika Text instantiated correctly
- [ ] Particle system uses simple position distribution (not text-shaped)
- [ ] Component selector unchanged: `app-smoke-text-3d`

---

### File 3: index.ts (No Changes Required)

**Action**: NO MODIFICATION
**Path**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\angular-3d\index.ts`

**Reason**: Component selectors and export names unchanged.

**Current Exports** (lines 7-8):

```typescript
export { SmokeText3DComponent } from './components/primitives/smoke-text-3d.component';
export { Text3DVolumetricComponent } from './components/primitives/text-3d-volumetric.component';
```

**Verification**: Exports remain valid after component modifications.

---

## 8. Team-Leader Handoff

### Developer Type Recommendation

**Recommended Developer**: **frontend-developer**

**Rationale**:

1. **UI Component Work**: Modifying Angular components (templates, effects, lifecycle)
2. **3D Graphics**: Working with Three.js materials, geometries, particles (frontend WebGL)
3. **Browser APIs**: Canvas texture generation, CanvasRenderingContext2D
4. **Angular Patterns**: Signal-based reactivity, effects, injectBeforeRender
5. **No Backend**: No NestJS services, no database, no API endpoints

**Skills Required**:

- Angular 18 (signals, effects, standalone components)
- Three.js fundamentals (materials, geometries, scenes)
- TypeScript (strict mode, type safety)
- WebGL concepts (textures, shaders understanding - not writing)
- troika-three-text API (learned from implementation plan)

---

### Complexity Assessment

**Complexity**: **MEDIUM**

**Estimated Effort**: **4-6 hours**

**Breakdown**:

1. **text-3d-volumetric.component.ts rewrite**: 1.5-2 hours

   - Remove old implementation: 0.5 hours
   - Implement troika pattern: 1 hour
   - Test and refine: 0.5-1 hour

2. **smoke-text-3d.component.ts rewrite**: 1.5-2 hours

   - Remove canvas sampling: 0.5 hours
   - Implement hybrid pattern: 1 hour
   - Test particles: 0.5-1 hour

3. **Testing and validation**: 1-2 hours
   - Unit tests: 0.5 hour
   - Visual QA: 0.5 hour
   - Performance verification: 0.5 hour
   - Cross-browser testing: 0.5 hour

**Complexity Factors**:

- **Medium**: troika API is well-documented, patterns provided
- **Medium**: Particle system is simple (not complex shaders)
- **Medium**: No backend integration, no database
- **Low**: Clear anti-patterns to avoid (research report provides guidance)
- **Low**: Evidence-based implementation (all APIs verified)

---

### Files Affected Summary

**MODIFY** (Direct Replacement):

- `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\angular-3d\components\primitives\text-3d-volumetric.component.ts`
- `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\angular-3d\components\primitives\smoke-text-3d.component.ts`

**NO CHANGES**:

- `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\angular-3d\index.ts` (exports remain valid)

**CREATE** (if needed):

- `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\angular-3d\components\primitives\text-3d-volumetric.component.spec.ts` (unit tests)
- `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\angular-3d\components\primitives\smoke-text-3d.component.spec.ts` (unit tests)

---

### Critical Verification Points

**Before Implementation, Developer Must Verify**:

1. **All imports exist in codebase**:

   - `Text` from `troika-three-text` (npm package installed)
   - `MeshStandardMaterial`, `MeshBasicMaterial` from `three`
   - `BufferGeometry`, `BufferAttribute`, `Points`, `PointsMaterial` from `three`
   - `injectNgtRef`, `injectBeforeRender` from `angular-three`

2. **All patterns verified from examples**:

   - troika Text instantiation: research-report.md:56-84
   - Material patching: research-report.md:88-112
   - Disposal pattern: research-report.md:838-863
   - Angular effect pattern: research-report.md:140-186

3. **Research documentation consulted**:

   - research-report.md (complete implementation guide)
   - Section 2: Glow Effect Implementation Strategy (lines 190-408)
   - Section 3: Smoke Effect Implementation Strategy (lines 410-648)
   - Section 8: Why Current Implementations Failed (lines 1048-1126)

4. **No hallucinated APIs**:

   - All troika Text properties verified: research-report.md:113-132
   - All material properties verified: Three.js official docs
   - All Angular Three APIs verified: angular-three npm package

5. **Anti-patterns avoided**:
   - ❌ NOT using NgtsText3D (extruded geometry, not troika)
   - ❌ NOT using custom ShaderMaterial (breaks material patching)
   - ❌ NOT sampling canvas pixels for particles (inefficient)
   - ✅ Using troika Text directly
   - ✅ Using standard materials (MeshStandardMaterial, MeshBasicMaterial)
   - ✅ Using simple particle distribution (not text-shaped)

---

### Architecture Delivery Checklist

- [x] All components specified with evidence
- [x] All patterns verified from codebase/research
- [x] All imports/decorators verified as existing
- [x] Quality requirements defined (functional + non-functional)
- [x] Integration points documented (troika material patching, font loading)
- [x] Files affected list complete (2 MODIFY, 0 CREATE, 1 NO CHANGE)
- [x] Developer type recommended (frontend-developer)
- [x] Complexity assessed (MEDIUM, 4-6 hours)
- [x] No step-by-step implementation (that's team-leader's job)
- [x] Testing strategy comprehensive (unit, integration, visual, performance)
- [x] Risk mitigation concrete and actionable (6 risks with code examples)
- [x] Copy-paste-ready code examples included (2 complete component implementations)

---

## 9. Evidence Provenance

### Research Report References

All technical decisions backed by research-report.md:

**Decision**: Use troika Text class directly (NOT NgtsText3D)
**Evidence**:

- Definition: research-report.md:56-84 (troika API usage pattern)
- Anti-pattern: research-report.md:1048-1075 (why NgtsText3D fails)
- Documentation: research-report.md:136-186 (Angular integration pattern)

**Decision**: Use MeshStandardMaterial with emissive (NOT custom shaders)
**Evidence**:

- Pattern: research-report.md:190-376 (glow effect implementation)
- Material patching: research-report.md:88-112 (how troika patches materials)
- Anti-pattern: research-report.md:1048-1075 (why custom shaders fail)

**Decision**: Particle atmosphere (NOT text-shaped particles)
**Evidence**:

- Pattern: research-report.md:410-646 (smoke effect strategy)
- Anti-pattern: research-report.md:1078-1126 (why canvas sampling fails)
- Rationale: research-report.md:414-430 (key insight)

**Decision**: Direct replacement (NOT versioning)
**Evidence**:

- Anti-backward compatibility mandate: CLAUDE.md (top priority rules)
- Task context: context.md (fix broken components, not create new ones)

### External Documentation References

**troika-three-text**:

- Official docs: https://protectwise.github.io/troika/troika-three-text/
- GitHub discussions: https://github.com/protectwise/troika/discussions/174
- Verified: npm package `troika-three-text` installed

**Three.js**:

- Materials: https://threejs.org/docs/#api/en/materials/MeshStandardMaterial
- Post-processing: https://threejs.org/examples/webgl_postprocessing_unreal_bloom.html
- Verified: `three` npm package installed

**angular-three**:

- Documentation: https://angular-three.netlify.app/
- Soba: https://angularthree.org/soba/introduction/
- Verified: `angular-three`, `angular-three-soba` packages installed

---

## 10. Success Criteria

**Architecture Specifications Complete When**:

- [x] Component redesign strategy documented (DIRECT REPLACEMENT)
- [x] troika-three-text integration architecture specified
- [x] Material systems designed (MeshStandardMaterial + emissive)
- [x] Particle system architecture complete (atmospheric smoke)
- [x] Disposal patterns specified (cleanup effects)
- [x] Type-safe implementations (no 'any' types)
- [x] Testing strategy comprehensive (unit, visual, performance)
- [x] Risk mitigation concrete (6 risks with code solutions)
- [x] Copy-paste-ready code examples (2 complete components)
- [x] Evidence citations complete (all decisions backed by research)

**Implementation Success Criteria** (for team-leader):

- [ ] Components compile without TypeScript errors
- [ ] Text renders crisply using troika SDF
- [ ] Glow effect visible and configurable
- [ ] Smoke particles create atmospheric effect
- [ ] All resources dispose properly (no memory leaks)
- [ ] 60 FPS with multiple text instances
- [ ] Unit tests pass
- [ ] Visual QA checklist complete
- [ ] No console errors or warnings

---

## Appendix: Quick Reference

### Essential troika Code Pattern

```typescript
import { Text } from 'troika-three-text';
import { MeshStandardMaterial } from 'three';

const text = new Text();
text.text = 'HELLO';
text.fontSize = 1.0;
text.material = new MeshStandardMaterial({
  emissive: 0x00ffff,
  emissiveIntensity: 2.0,
});
text.sync(); // CRITICAL
scene.add(text);

// Cleanup
text.dispose();
```

### Essential Particle Pattern

```typescript
import { BufferGeometry, BufferAttribute, Points, PointsMaterial } from 'three';

const geometry = new BufferGeometry();
const positions = new Float32Array(count * 3);
geometry.setAttribute('position', new BufferAttribute(positions, 3));

const material = new PointsMaterial({
  size: 0.05,
  map: smokeTexture,
  transparent: true,
  blending: AdditiveBlending,
});

const points = new Points(geometry, material);
scene.add(points);

// Cleanup
geometry.dispose();
material.dispose();
```

### Essential Angular Three Pattern

```typescript
import { effect, inject, DestroyRef } from '@angular/core';
import { injectNgtRef, injectBeforeRender } from 'angular-three';

groupRef = injectNgtRef<Group>();

constructor() {
  effect(() => {
    const group = this.groupRef.nativeElement;
    if (!group) return;

    // Create objects
    const text = new Text();
    group.add(text);

    // Cleanup
    return () => {
      group.remove(text);
      text.dispose();
    };
  });

  injectBeforeRender(({ delta }) => {
    // Animation
  });
}
```

---

**End of Implementation Plan**
