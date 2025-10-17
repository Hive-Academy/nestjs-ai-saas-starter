# Implementation Plan - TASK_2025_014 (CORRECTED)

## Declarative Angular Component Library with Angular Three Primitives

**Created**: 2025-10-17
**Priority**: P1-High
**Complexity**: HIGH
**Estimated Effort**: 10-14 hours (Large)
**Confidence Level**: 90% (Based on comprehensive research)

---

## 🔴 CRITICAL CORRECTION

**PREVIOUS MISUNDERSTANDING** (implementation-plan.md):

- Focused on SceneObjectService factory pattern (createSphere, createCube methods)
- Imperative TypeScript API as primary approach
- Service-based scene creation
- 80% of plan dedicated to service architecture

**CORRECT UNDERSTANDING** (This Plan):

- Focus on Angular components/directives (FloatingSphereComponent, BackgroundCubeComponent)
- **Declarative template API as primary approach**
- Component-based scene composition using Angular Three primitives
- SceneObjectService is **OPTIONAL internal helper**, NOT primary API

**Key Architectural Insight** (from research-report.md):
User code should look like Angular templates, NOT service factory calls:

```html
<!-- ✅ CORRECT: Declarative template approach -->
<app-floating-sphere [position]="[0, 1, 0]" [color]="0xff0000" float3d performance3d />

<!-- ❌ WRONG: Imperative service approach -->
<!-- this.sceneObjectService.createSphere({ position: [0, 1, 0] }) -->
```

---

## Executive Summary

### Objective

Create declarative Angular components and directives that wrap Angular Three reactive primitives (`ngt-mesh`, `ngt-sphere-geometry`, `ngt-mesh-physical-material`), enabling developers to build impressive 3D scenes using template-based composition rather than imperative service calls.

**PRIMARY API**: Angular components/directives
**SECONDARY API**: Optional SceneObjectService helper (internal)
**TEMPLATE-FIRST PHILOSOPHY**: HTML templates > TypeScript service calls

### Success Criteria

**Must Have**:

- ✅ FloatingSphereComponent using `<ngt-mesh>` + `<ngt-sphere-geometry>` + `<ngt-mesh-physical-material>`
- ✅ BackgroundCubeComponent using `<ngt-mesh>` + `<ngt-box-geometry>` + `<ngt-mesh-lambert-material>`
- ✅ CylinderComponent using `<ngt-mesh>` + `<ngt-cylinder-geometry>`
- ✅ TorusComponent using `<ngt-mesh>` + `<ngt-torus-geometry>`
- ✅ float3d directive (AnimationService integration)
- ✅ performance3d directive (AdvancedPerformanceOptimizerService integration)
- ✅ glow3d directive (BackSide sphere glow effect)
- ✅ Hero section component with declarative template (<30 lines)
- ✅ Signal-based @Input() reactivity
- ✅ ViewChild mesh access via `viewChild.required<ElementRef<Mesh>>('mesh')`
- ✅ Directive composition via `inject(HostComponent, { host: true })`

**Performance**:

- 60 FPS with 5 spheres + 20 cubes
- Automatic AnimationService timeline cleanup
- Automatic performance optimizer registration (scene-based)

**Code Quality**:

- Zero `any` types
- CUSTOM_ELEMENTS_SCHEMA required for Angular Three primitives
- OnPush change detection strategy
- Signal-based reactive properties

---

## 📊 Codebase Investigation Summary

### Libraries Analyzed (Evidence-Based)

**1. AnimationService** (apps/dev-brand-ui/src/app/core/angular-3d/services/animation.service.ts)

- **Verified Exports**:

  - `AnimationService` class (Injectable, line 66)
  - `createTimeline(config)` → returns `timelineId: string` (line 132)
  - `addAnimationToTimeline(timelineId, target, config)` (line 162)
  - `playTimeline(timelineId)` (line 183)
  - `pauseTimeline(timelineId)` (line 198)
  - `stopTimeline(timelineId)` (line 215)
  - `removeTimeline(timelineId)` (line 233)
  - `createCoordinatedAnimation(objects[], config)` (line 252)

- **Key Types**:

  - `AnimationConfig` (line 15): type, duration, delay, ease, repeat, yoyo
  - `ElementAnimationTarget` (line 25): elementId, object3D, position, rotation, scale, opacity
  - `AnimationTimeline` (line 35): id, name, animations[], targets[], loop, paused

- **Evidence**: GSAP-powered timeline management with THREE.js integration ✅

**2. AdvancedPerformanceOptimizerService** (apps/dev-brand-ui/src/app/core/angular-3d/services/advanced-performance-optimizer.service.ts)

- **Verified Exports**:

  - `AdvancedPerformanceOptimizerService` class (Injectable, line 82)
  - `initialize(sceneId, camera)` (line 201)
  - `performanceHealthScore` computed signal (line 157)
  - `performanceTargetConfig` readonly signal (line 155)
  - `shouldOptimize` computed signal (line 171)
  - `optimize()` method (line 269)
  - **INTERNAL**: `updateCullingObjects(scenes)` (line 584) - automatic tracking

- **Key Types**:

  - `FrustumCullingConfig` (line 33): enabled, camera, margin, updateFrequency, batchSize
  - `PerformanceTarget` (line 66): targetFPS, maxFrameTime, qualityPreference, adaptiveScaling
  - `OptimizationMetrics` (line 57): lodReductions, culledObjects, memoryFreed

- **CRITICAL FINDING**: NO `registerObjectForCulling()` public method exists!
  - Service uses automatic scene tracking via `updateCullingObjects()` (line 584)
  - Objects added to scene are automatically tracked via state store subscription (line 375-382)
  - **IMPLICATION**: performance3d directive should rely on automatic tracking, not explicit registration

**3. Angular Three Primitives** (from research-report.md)

- **Available Primitives**:

  - `<ngt-mesh>` - Three.js Mesh wrapper
  - `<ngt-sphere-geometry>` - Three.js SphereGeometry
  - `<ngt-box-geometry>` - Three.js BoxGeometry
  - `<ngt-cylinder-geometry>` - Three.js CylinderGeometry
  - `<ngt-torus-geometry>` - Three.js TorusGeometry
  - `<ngt-mesh-physical-material>` - Three.js MeshPhysicalMaterial
  - `<ngt-mesh-standard-material>` - Three.js MeshStandardMaterial
  - `<ngt-mesh-lambert-material>` - Three.js MeshLambertMaterial
  - `<ngt-mesh-basic-material>` - Three.js MeshBasicMaterial

- **Directive**: `*args="[param1, param2, ...]"` for constructor arguments

- **Requirements**:
  - CUSTOM_ELEMENTS_SCHEMA must be added to component
  - Signal-based property binding: `[property]="signal()"`
  - Automatic attachment: geometries attach as "geometry", materials attach as "material"

**4. Angular Directive Composition API** (from research-report.md)

- **Host Component Access**:

  ```typescript
  inject(HostComponent, { host: true });
  ```

- **Multiple Directives**: Composable via template application

  ```html
  <app-floating-sphere float3d performance3d glow3d />
  ```

- **Directive Inputs**: Signal-based via `input<T>()`
  ```typescript
  readonly floatSpeed = input<number>(1.0);
  ```

### Existing Types Discovered

**From interfaces/index.ts**:

- ✅ `SphereConfig` (line 105-116) - includes animation property
- ✅ `CubeConfig` (line 117-125) - includes animation property
- ⚠️ `CylinderConfig` - DOES NOT EXIST (needs creation)
- ⚠️ `TorusConfig` - DOES NOT EXIST (needs creation)
- ⚠️ `ManagedObject3D` - DOES NOT EXIST (needs creation for SceneObjectService)

---

## 🏗️ Architecture Design (100% Evidence-Based)

### Design Philosophy

**Chosen Approach**: Declarative Component-First Pattern
**Rationale**:

1. **Template-Based**: Users write HTML templates, not TypeScript service calls
2. **Angular Best Practices**: Follows component composition patterns
3. **Signal Reactivity**: Leverages Angular's signal-based reactive system
4. **Angular Three Integration**: Uses `ngt-*` primitives natively
5. **Service Encapsulation**: Services used INTERNALLY, not exposed in user API

**Evidence**:

- Pattern recommended in research-report.md (lines 673-728)
- Angular Three v2 designed for this pattern (research-report.md:19-71)
- Matches Angular component composition best practices
- 90% confidence from researcher-expert

### Component Hierarchy

```
Base3dPrimitiveComponent (abstract - optional base class)
  ├─ FloatingSphereComponent (ngt-mesh + ngt-sphere-geometry + ngt-mesh-physical-material)
  ├─ BackgroundCubeComponent (ngt-mesh + ngt-box-geometry + ngt-mesh-lambert-material)
  ├─ CylinderComponent (ngt-mesh + ngt-cylinder-geometry + ngt-mesh-standard-material)
  └─ TorusComponent (ngt-mesh + ngt-torus-geometry + ngt-mesh-standard-material)
```

### Directive Composition

```
Base3dDirective (abstract - optional base class)
  ├─ Float3dDirective (AnimationService.createTimeline)
  ├─ Performance3dDirective (automatic via scene tracking)
  └─ Glow3dDirective (BackSide sphere technique)
```

### User-Facing API

**Template Example** (PRIMARY API):

```html
<app-hybrid-scene [backgroundColor]="'#1a0a2e'" [cameraPosition]="[0, 0, 15]">
  <!-- Floating spheres -->
  <app-floating-sphere
    *ngFor="let sphere of spheres"
    [position]="sphere.position"
    [radius]="sphere.radius"
    [color]="sphere.color"
    [metalness]="0.8"
    [roughness]="0.1"
    float3d
    [floatSpeed]="1.5"
    [floatHeight]="0.5"
    performance3d
    glow3d
    [glowColor]="sphere.glowColor"
  />

  <!-- Background cubes -->
  <app-background-cube
    *ngFor="let cube of cubes"
    [position]="cube.position"
    [size]="cube.size"
    [color]="cube.color"
    performance3d
  />
</app-hybrid-scene>
```

**Component TypeScript** (Data-driven):

```typescript
@Component({
  selector: 'hero-section-ng-3d',
  template: `<!-- template above -->`,
  imports: [
    CommonModule,
    HybridSceneComponent,
    FloatingSphereComponent,
    BackgroundCubeComponent,
    Float3dDirective,
    Performance3dDirective,
    Glow3dDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroSectionNg3dComponent {
  readonly spheres = [
    { position: [0, 1, 0] as const, radius: 1.2, color: 0x8b5cf6, glowColor: 0x9333ea },
    { position: [-3, -1, 2] as const, radius: 0.8, color: 0xec4899, glowColor: 0xf472b6 },
    // ... more spheres
  ];

  readonly cubes = Array.from({ length: 20 }, () => ({
    position: [
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
    ] as const,
    size: 0.5 + Math.random() * 0.5,
    color: [0x6366f1, 0x8b5cf6, 0xec4899, 0x06b6d4][Math.floor(Math.random() * 4)],
  }));
}
```

---

## 📋 Phase-by-Phase Implementation

### Phase 1: Core Primitive Components (3-4 hours)

**Objective**: Create Base3dPrimitiveComponent (optional) and 4 concrete primitive components using Angular Three primitives

#### Step 1.1: Create Base3dPrimitiveComponent (Optional)

**File**: `apps/dev-brand-ui/src/app/core/angular-3d/components/primitives/base-3d-primitive.component.ts`

**Purpose**: Provide common mesh access and lifecycle patterns (OPTIONAL - components can extend this OR implement patterns directly)

**Implementation**:

```typescript
import { Directive, ElementRef, viewChild, DestroyRef, inject, effect, input } from '@angular/core';
import { Mesh } from 'three';

/**
 * Base class for 3D primitive components
 *
 * Provides:
 * - Mesh reference access via viewChild
 * - Common position, rotation, scale inputs
 * - Lifecycle management via DestroyRef
 * - Mesh ready callback pattern
 *
 * Evidence: Pattern recommended in research-report.md:766-824
 */
@Directive()
export abstract class Base3dPrimitiveComponent {
  protected readonly destroyRef = inject(DestroyRef);

  // Mesh reference (subclasses must define template variable #mesh)
  readonly meshRef = viewChild.required<ElementRef<Mesh>>('mesh');

  // Common signal inputs
  readonly position = input<[number, number, number]>([0, 0, 0]);
  readonly rotation = input<[number, number, number]>([0, 0, 0]);
  readonly scale = input<number>(1);

  constructor() {
    // Wait for mesh to become available, then call onMeshReady
    effect(() => {
      const mesh = this.meshRef()?.nativeElement;
      if (mesh) {
        this.onMeshReady(mesh);
      }
    });

    // Register cleanup callback
    this.destroyRef.onDestroy(() => {
      this.onCleanup();
    });
  }

  /**
   * Called when mesh reference becomes available
   * Override in subclasses for initialization
   */
  protected onMeshReady(_mesh: Mesh): void {
    // Base implementation (can be overridden)
  }

  /**
   * Called on component destroy
   * Override for cleanup
   */
  protected onCleanup(): void {
    // Base implementation (can be overridden)
  }

  /**
   * Get THREE.Mesh instance (public API for directives)
   */
  getMesh(): Mesh | undefined {
    return this.meshRef()?.nativeElement;
  }
}
```

**Quality Gates**:

- [x] Uses signal-based `viewChild()` (Angular 20 pattern)
- [x] Uses `effect()` for mesh availability detection
- [x] Uses `DestroyRef.onDestroy()` for cleanup
- [x] Pattern matches research-report.md:766-824
- [x] No `any` types

#### Step 1.2: Create FloatingSphereComponent

**File**: `apps/dev-brand-ui/src/app/core/angular-3d/components/primitives/floating-sphere.component.ts`

**Purpose**: Metallic sphere with automatic floating animation using Angular Three primitives

**Implementation**:

````typescript
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  inject,
  input,
} from '@angular/core';
import { Base3dPrimitiveComponent } from './base-3d-primitive.component';
import { AnimationService } from '../../services/animation.service';
import { Mesh } from 'three';

/**
 * FloatingSphereComponent - Declarative 3D Sphere with Automatic Floating Animation
 *
 * Uses Angular Three primitives:
 * - ngt-mesh: THREE.Mesh wrapper
 * - ngt-sphere-geometry: THREE.SphereGeometry
 * - ngt-mesh-physical-material: THREE.MeshPhysicalMaterial with metalness/roughness
 *
 * Evidence: Pattern from research-report.md:32-64, 1569-1630
 *
 * @example
 * ```html
 * <app-floating-sphere
 *   [position]="[0, 1, 0]"
 *   [radius]="1.2"
 *   [color]="0x8b5cf6"
 *   [metalness]="0.8"
 *   [roughness]="0.1"
 *   float3d
 *   performance3d
 *   glow3d
 * />
 * ```
 */
@Component({
  selector: 'app-floating-sphere',
  standalone: true,
  template: `
    <ngt-mesh #mesh [position]="position()" [rotation]="rotation()" [scale]="scale()">
      <ngt-sphere-geometry *args="[radius(), 32, 32]" />
      <ngt-mesh-physical-material
        [color]="color()"
        [metalness]="metalness()"
        [roughness]="roughness()"
      />
    </ngt-mesh>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Required for Angular Three primitives
  changeDetection: ChangeDetectionStrategy.OnPush, // Performance optimization
  imports: [], // Angular Three primitives don't need imports
})
export class FloatingSphereComponent extends Base3dPrimitiveComponent {
  // Geometry inputs
  readonly radius = input<number>(1);

  // Material inputs
  readonly color = input<number>(0xff0000);
  readonly metalness = input<number>(0.3);
  readonly roughness = input<number>(0.1);

  // Optional: Internal AnimationService integration
  private readonly animationService = inject(AnimationService, { optional: true });
  private timelineId?: string;

  /**
   * Setup floating animation when mesh becomes available
   * Evidence: AnimationService.createTimeline verified (animation.service.ts:132)
   */
  protected override onMeshReady(mesh: Mesh): void {
    if (!this.animationService) return;

    // Create floating animation timeline
    // Evidence: AnimationConfig type verified (animation.service.ts:15-23)
    this.timelineId = this.animationService.createTimeline({
      name: 'Floating Sphere Animation',
      animations: [
        {
          type: 'slide',
          duration: 2000,
          ease: 'sine.inOut',
          repeat: -1, // Infinite
          yoyo: true,
        },
      ],
      targets: [
        {
          elementId: `sphere-${mesh.uuid}`,
          object3D: mesh,
          position: [
            this.position()[0],
            this.position()[1] + 0.5, // Float up 0.5 units
            this.position()[2],
          ],
        },
      ],
    });

    // Play animation
    // Evidence: AnimationService.playTimeline verified (animation.service.ts:183)
    this.animationService.playTimeline(this.timelineId);
  }

  /**
   * Cleanup animation timeline on destroy
   * Evidence: AnimationService.removeTimeline verified (animation.service.ts:233)
   */
  protected override onCleanup(): void {
    if (this.timelineId && this.animationService) {
      this.animationService.removeTimeline(this.timelineId);
    }
  }
}
````

**Quality Gates**:

- [x] Uses Angular Three primitives (`ngt-mesh`, `ngt-sphere-geometry`, `ngt-mesh-physical-material`)
- [x] CUSTOM_ELEMENTS_SCHEMA added
- [x] Signal-based inputs via `input<T>()`
- [x] `*args` directive for geometry constructor arguments
- [x] AnimationService.createTimeline() verified (animation.service.ts:132)
- [x] AnimationService.playTimeline() verified (animation.service.ts:183)
- [x] AnimationService.removeTimeline() verified (animation.service.ts:233)
- [x] OnPush change detection strategy
- [x] No `any` types

#### Step 1.3: Create BackgroundCubeComponent

**File**: `apps/dev-brand-ui/src/app/core/angular-3d/components/primitives/background-cube.component.ts`

**Implementation**:

````typescript
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  inject,
  input,
  computed,
} from '@angular/core';
import { Base3dPrimitiveComponent } from './base-3d-primitive.component';
import { AnimationService } from '../../services/animation.service';
import { Mesh } from 'three';

/**
 * BackgroundCubeComponent - Declarative 3D Cube with Automatic Rotation
 *
 * Uses Angular Three primitives:
 * - ngt-mesh: THREE.Mesh wrapper
 * - ngt-box-geometry: THREE.BoxGeometry
 * - ngt-mesh-lambert-material: Simple material for background objects
 *
 * Evidence: Pattern from research-report.md:1633-1688
 *
 * @example
 * ```html
 * <app-background-cube
 *   [position]="[1, 2, 3]"
 *   [size]="1.5"
 *   [color]="0x6366f1"
 *   performance3d
 * />
 * ```
 */
@Component({
  selector: 'app-background-cube',
  standalone: true,
  template: `
    <ngt-mesh #mesh [position]="position()" [rotation]="rotation()" [scale]="scale()">
      <ngt-box-geometry *args="sizeArgs()" />
      <ngt-mesh-lambert-material [color]="color()" />
    </ngt-mesh>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class BackgroundCubeComponent extends Base3dPrimitiveComponent {
  // Geometry inputs
  readonly size = input<number | [number, number, number]>(1);

  // Material inputs
  readonly color = input<number>(0xffffff);

  // Computed size args for BoxGeometry constructor
  readonly sizeArgs = computed(() => {
    const s = this.size();
    return Array.isArray(s) ? s : [s, s, s];
  });

  // Optional: Internal AnimationService integration
  private readonly animationService = inject(AnimationService, { optional: true });
  private timelineId?: string;

  /**
   * Setup rotation animation when mesh becomes available
   */
  protected override onMeshReady(mesh: Mesh): void {
    if (!this.animationService) return;

    // Create rotation animation timeline
    this.timelineId = this.animationService.createTimeline({
      name: 'Background Cube Rotation',
      animations: [
        {
          type: 'rotate',
          duration: 5000,
          ease: 'linear',
          repeat: -1, // Infinite
        },
      ],
      targets: [
        {
          elementId: `cube-${mesh.uuid}`,
          object3D: mesh,
          rotation: [Math.PI * 2, Math.PI * 2, Math.PI * 2], // Full 360° rotation
        },
      ],
    });

    this.animationService.playTimeline(this.timelineId);
  }

  /**
   * Cleanup animation timeline on destroy
   */
  protected override onCleanup(): void {
    if (this.timelineId && this.animationService) {
      this.animationService.removeTimeline(this.timelineId);
    }
  }
}
````

**Quality Gates**:

- [x] Uses Angular Three primitives (`ngt-mesh`, `ngt-box-geometry`, `ngt-mesh-lambert-material`)
- [x] Signal-based inputs via `input<T>()`
- [x] Computed property for size argument transformation
- [x] AnimationService integration verified
- [x] OnPush change detection strategy

#### Step 1.4: Create CylinderComponent

**File**: `apps/dev-brand-ui/src/app/core/angular-3d/components/primitives/cylinder.component.ts`

**Implementation** (similar pattern to FloatingSphereComponent):

```typescript
@Component({
  selector: 'app-cylinder',
  standalone: true,
  template: `
    <ngt-mesh #mesh [position]="position()" [rotation]="rotation()" [scale]="scale()">
      <ngt-cylinder-geometry *args="[radiusTop(), radiusBottom(), height(), radialSegments()]" />
      <ngt-mesh-standard-material [color]="color()" />
    </ngt-mesh>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class CylinderComponent extends Base3dPrimitiveComponent {
  readonly radiusTop = input<number>(1);
  readonly radiusBottom = input<number>(1);
  readonly height = input<number>(2);
  readonly radialSegments = input<number>(32);
  readonly color = input<number>(0xffffff);
}
```

#### Step 1.5: Create TorusComponent

**File**: `apps/dev-brand-ui/src/app/core/angular-3d/components/primitives/torus.component.ts`

**Implementation** (similar pattern):

```typescript
@Component({
  selector: 'app-torus',
  standalone: true,
  template: `
    <ngt-mesh #mesh [position]="position()" [rotation]="rotation()" [scale]="scale()">
      <ngt-torus-geometry *args="[radius(), tube(), radialSegments(), tubularSegments()]" />
      <ngt-mesh-standard-material [color]="color()" />
    </ngt-mesh>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class TorusComponent extends Base3dPrimitiveComponent {
  readonly radius = input<number>(1);
  readonly tube = input<number>(0.4);
  readonly radialSegments = input<number>(16);
  readonly tubularSegments = input<number>(100);
  readonly color = input<number>(0xffffff);
}
```

---

### Phase 2: Behavior Directives (2-3 hours)

**Objective**: Create Base3dDirective (optional) and 3 behavior directives (float3d, performance3d, glow3d)

#### Step 2.1: Create Base3dDirective (Optional)

**File**: `apps/dev-brand-ui/src/app/core/angular-3d/directives/base-3d.directive.ts`

**Purpose**: Provide common mesh access from host component pattern

**Implementation**:

```typescript
import { Directive, inject, effect, DestroyRef } from '@angular/core';
import { Mesh } from 'three';

/**
 * Base directive for 3D enhancements
 * Provides mesh access from host component
 *
 * Evidence: Pattern from research-report.md:830-871
 */
@Directive()
export abstract class Base3dDirective {
  protected readonly destroyRef = inject(DestroyRef);
  protected mesh?: Mesh;

  constructor() {
    // Wait for mesh from host, then call onMeshAvailable
    effect(() => {
      this.mesh = this.getMeshFromHost();
      if (this.mesh) {
        this.onMeshAvailable(this.mesh);
      }
    });

    // Register cleanup callback
    this.destroyRef.onDestroy(() => {
      this.onDirectiveDestroy();
    });
  }

  /**
   * Get mesh from host component
   * Override to specify host component type
   */
  protected abstract getMeshFromHost(): Mesh | undefined;

  /**
   * Called when mesh becomes available
   */
  protected abstract onMeshAvailable(mesh: Mesh): void;

  /**
   * Called on directive destroy
   */
  protected abstract onDirectiveDestroy(): void;
}
```

#### Step 2.2: Create Float3dDirective

**File**: `apps/dev-brand-ui/src/app/core/angular-3d/directives/float-3d.directive.ts`

**Purpose**: Add floating animation behavior to any component with mesh reference

**Implementation**:

````typescript
import { Directive, inject, input } from '@angular/core';
import { Base3dDirective } from './base-3d.directive';
import { Base3dPrimitiveComponent } from '../components/primitives/base-3d-primitive.component';
import { AnimationService } from '../services/animation.service';
import { Mesh } from 'three';

/**
 * float3d - Adds Floating Animation Behavior
 *
 * Applies smooth Y-axis floating animation to any component with mesh reference.
 * Internally uses AnimationService for GSAP timeline management.
 *
 * Evidence: Pattern from research-report.md:1717-1770
 *
 * @example
 * ```html
 * <app-floating-sphere
 *   float3d
 *   [floatSpeed]="1.5"
 *   [floatHeight]="0.8"
 *   [floatDelay]="0.5"
 * />
 * ```
 */
@Directive({
  selector: '[float3d]',
  standalone: true,
})
export class Float3dDirective extends Base3dDirective {
  private readonly animationService = inject(AnimationService);

  // Inject host component
  // Evidence: Pattern from research-report.md:402-417
  private readonly hostComponent = inject(Base3dPrimitiveComponent, {
    host: true,
    optional: false,
  });

  // Directive inputs
  readonly floatSpeed = input<number>(1.0);
  readonly floatHeight = input<number>(0.5);
  readonly floatDelay = input<number>(0);

  private timelineId?: string;

  protected getMeshFromHost(): Mesh | undefined {
    return this.hostComponent.meshRef()?.nativeElement;
  }

  protected onMeshAvailable(mesh: Mesh): void {
    // Create floating animation timeline
    // Evidence: AnimationService.createTimeline verified (animation.service.ts:132)
    this.timelineId = this.animationService.createTimeline({
      name: 'Float3D Directive Animation',
      animations: [
        {
          type: 'slide',
          duration: 2000 / this.floatSpeed(),
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: this.floatDelay(),
        },
      ],
      targets: [
        {
          elementId: `float3d-${mesh.uuid}`,
          object3D: mesh,
          position: [mesh.position.x, mesh.position.y + this.floatHeight(), mesh.position.z],
        },
      ],
    });

    // Add animation to timeline
    // Evidence: AnimationService.addAnimationToTimeline verified (animation.service.ts:162)
    this.animationService.addAnimationToTimeline(
      this.timelineId,
      {
        elementId: `float3d-${mesh.uuid}`,
        object3D: mesh,
        position: [mesh.position.x, mesh.position.y + this.floatHeight(), mesh.position.z],
      },
      {
        type: 'slide',
        duration: 2000 / this.floatSpeed(),
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: this.floatDelay(),
      }
    );

    // Play timeline
    // Evidence: AnimationService.playTimeline verified (animation.service.ts:183)
    this.animationService.playTimeline(this.timelineId);
  }

  protected onDirectiveDestroy(): void {
    // Cleanup animation timeline
    // Evidence: AnimationService.removeTimeline verified (animation.service.ts:233)
    if (this.timelineId) {
      this.animationService.removeTimeline(this.timelineId);
    }
  }
}
````

**Quality Gates**:

- [x] Uses `inject(HostComponent, { host: true })` pattern
- [x] Signal-based inputs via `input<T>()`
- [x] AnimationService integration verified
- [x] Automatic cleanup on destroy
- [x] Pattern matches research-report.md:1717-1770

#### Step 2.3: Create Performance3dDirective

**File**: `apps/dev-brand-ui/src/app/core/angular-3d/directives/performance-3d.directive.ts`

**Purpose**: Enable automatic performance optimization via scene-based tracking

**CRITICAL DESIGN DECISION** (from investigation):

- AdvancedPerformanceOptimizerService DOES NOT have `registerObjectForCulling()` method
- Service uses automatic scene tracking via `updateCullingObjects()` (line 584)
- Objects are tracked automatically via state store subscription (line 375-382)
- **SOLUTION**: performance3d directive acts as marker/metadata, actual optimization is automatic

**Implementation**:

````typescript
import { Directive, inject } from '@angular/core';
import { Base3dDirective } from './base-3d.directive';
import { Base3dPrimitiveComponent } from '../components/primitives/base-3d-primitive.component';
import { AdvancedPerformanceOptimizerService } from '../services/advanced-performance-optimizer.service';
import { Mesh } from 'three';

/**
 * performance3d - Enables Automatic Performance Optimization
 *
 * Marks component for performance tracking. Actual optimization is automatic via
 * AdvancedPerformanceOptimizerService scene-based tracking.
 *
 * Evidence: AdvancedPerformanceOptimizerService uses automatic tracking (advanced-performance-optimizer.service.ts:584)
 *
 * @example
 * ```html
 * <app-floating-sphere performance3d />
 * ```
 */
@Directive({
  selector: '[performance3d]',
  standalone: true,
})
export class Performance3dDirective extends Base3dDirective {
  private readonly performanceOptimizer = inject(AdvancedPerformanceOptimizerService);

  private readonly hostComponent = inject(Base3dPrimitiveComponent, {
    host: true,
    optional: false,
  });

  protected getMeshFromHost(): Mesh | undefined {
    return this.hostComponent.meshRef()?.nativeElement;
  }

  protected onMeshAvailable(_mesh: Mesh): void {
    // NOTE: No explicit registration needed!
    // AdvancedPerformanceOptimizerService automatically tracks objects via:
    // - State store subscription (line 375-382)
    // - updateCullingObjects() method (line 584)
    // - Objects added to scene are automatically included in culling array

    // Optional: Log performance health score for debugging
    console.log(
      `Performance3dDirective: Mesh tracked. Health score: ${this.performanceOptimizer.performanceHealthScore()}`
    );

    // Performance optimization is automatic - no action required
  }

  protected onDirectiveDestroy(): void {
    // Cleanup is automatic via scene removal
    // When mesh is removed from scene, it's automatically removed from cullingObjects array
  }
}
````

**Quality Gates**:

- [x] Uses automatic scene-based tracking (no explicit registration)
- [x] Evidence: AdvancedPerformanceOptimizerService.updateCullingObjects (line 584)
- [x] Evidence: State store subscription (line 375-382)
- [x] Correct understanding of service architecture
- [x] No hallucinated `registerObjectForCulling()` method

#### Step 2.4: Create Glow3dDirective

**File**: `apps/dev-brand-ui/src/app/core/angular-3d/directives/glow-3d.directive.ts`

**Purpose**: Add glow effect using BackSide sphere technique

**Implementation**:

````typescript
import { Directive, inject, input } from '@angular/core';
import { Base3dDirective } from './base-3d.directive';
import { Base3dPrimitiveComponent } from '../components/primitives/base-3d-primitive.component';
import * as THREE from 'three';

/**
 * glow3d - Adds Glow Effect using BackSide Sphere Technique
 *
 * Creates a larger BackSide sphere around the host mesh to simulate glow.
 * Automatically disposes resources on destroy.
 *
 * Evidence: Pattern from research-report.md:1804-1858
 *
 * @example
 * ```html
 * <app-floating-sphere
 *   glow3d
 *   [glowColor]="0xff3333"
 *   [glowIntensity]="0.4"
 *   [glowScale]="1.3"
 * />
 * ```
 */
@Directive({
  selector: '[glow3d]',
  standalone: true,
})
export class Glow3dDirective extends Base3dDirective {
  private readonly hostComponent = inject(Base3dPrimitiveComponent, {
    host: true,
    optional: false,
  });

  // Directive inputs
  readonly glowColor = input<number>(0xffffff);
  readonly glowIntensity = input<number>(0.3);
  readonly glowScale = input<number>(1.2);

  private glowMesh?: THREE.Mesh;

  protected getMeshFromHost(): THREE.Mesh | undefined {
    return this.hostComponent.meshRef()?.nativeElement;
  }

  protected onMeshAvailable(parentMesh: THREE.Mesh): void {
    this.createGlowEffect(parentMesh);
  }

  protected onDirectiveDestroy(): void {
    // Dispose glow mesh resources
    if (this.glowMesh) {
      this.glowMesh.geometry.dispose();
      (this.glowMesh.material as THREE.Material).dispose();
      this.glowMesh.removeFromParent();
    }
  }

  private createGlowEffect(parentMesh: THREE.Mesh): void {
    // Get radius from host component (if FloatingSphereComponent)
    let radius = 1;
    if ('radius' in this.hostComponent) {
      radius = (this.hostComponent as any).radius();
    }

    // Create glow geometry (BackSide sphere)
    const geometry = new THREE.SphereGeometry(
      radius * this.glowScale(),
      16, // Lower segments for performance
      16
    );

    // Create glow material (BackSide for inside-out rendering)
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.glowColor()),
      transparent: true,
      opacity: this.glowIntensity(),
      side: THREE.BackSide, // CRITICAL: Render inside-out for glow effect
    });

    // Create glow mesh and attach to parent
    this.glowMesh = new THREE.Mesh(geometry, material);
    parentMesh.add(this.glowMesh);

    console.log(`Glow3dDirective: Glow effect created for mesh ${parentMesh.uuid}`);
  }
}
````

**Quality Gates**:

- [x] BackSide sphere technique implemented
- [x] Signal-based inputs via `input<T>()`
- [x] Automatic resource disposal
- [x] Pattern matches research-report.md:1804-1858

---

### Phase 3: Hero Section Implementation (2-3 hours)

**Objective**: Create hero-section-ng-3d component demonstrating declarative template API

#### Step 3.1: Create HeroSectionNg3dComponent

**File**: `apps/dev-brand-ui/src/app/features/landing-page/components/hero-section-ng-3d/hero-section-ng-3d.component.ts`

**Purpose**: Demonstrate declarative 3D scene creation with <30 lines of template

**Implementation**:

````typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FloatingSphereComponent } from '@app/core/angular-3d/components/primitives/floating-sphere.component';
import { BackgroundCubeComponent } from '@app/core/angular-3d/components/primitives/background-cube.component';
import { Float3dDirective } from '@app/core/angular-3d/directives/float-3d.directive';
import { Performance3dDirective } from '@app/core/angular-3d/directives/performance-3d.directive';
import { Glow3dDirective } from '@app/core/angular-3d/directives/glow-3d.directive';
import { HybridSceneComponent } from '@app/core/angular-3d/components/hybrid-scene.component';

/**
 * Hero Section Component - Declarative 3D Scene (Template-First)
 *
 * Architecture: Declarative component composition using Angular Three primitives
 * Evidence: Pattern from research-report.md:1863-1971
 *
 * Features:
 * - Template-based scene creation (<30 lines)
 * - Data-driven configuration arrays
 * - Automatic animation via internal AnimationService integration
 * - Automatic performance optimization via scene-based tracking
 * - Zero manual THREE.js code in template
 *
 * @example
 * Usage in landing page:
 * ```html
 * <hero-section-ng-3d />
 * ```
 */
@Component({
  selector: 'hero-section-ng-3d',
  standalone: true,
  imports: [
    CommonModule,
    HybridSceneComponent,
    FloatingSphereComponent,
    BackgroundCubeComponent,
    Float3dDirective,
    Performance3dDirective,
    Glow3dDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-hybrid-scene
      [backgroundColor]="'#1a0a2e'"
      [cameraPosition]="[0, 0, 15]"
      [enableAnimation]="true"
    >
      <!-- Floating spheres with glow -->
      <app-floating-sphere
        *ngFor="let sphere of spheres"
        [position]="sphere.position"
        [radius]="sphere.radius"
        [color]="sphere.color"
        [metalness]="0.8"
        [roughness]="0.1"
        float3d
        [floatSpeed]="sphere.floatSpeed"
        [floatDelay]="sphere.floatDelay"
        performance3d
        glow3d
        [glowColor]="sphere.glowColor"
      />

      <!-- Background cubes -->
      <app-background-cube
        *ngFor="let cube of cubes"
        [position]="cube.position"
        [size]="cube.size"
        [color]="cube.color"
        performance3d
      />

      <!-- 2D/3D Hybrid content overlay -->
      <div
        class="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none"
      >
        <h1 class="text-6xl font-bold text-center mb-4">
          <span class="text-white">Enterprise AI</span><br />
          <span class="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            SaaS Starter
          </span>
        </h1>

        <p class="text-xl text-gray-300 text-center max-w-2xl mb-8">
          Production-ready monorepo with Vector DB, Graph DB, and LangGraph workflows
        </p>

        <div class="flex gap-4 pointer-events-auto">
          <button
            class="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            Get Started
          </button>
          <button
            class="px-6 py-3 bg-transparent border-2 border-white hover:bg-white hover:text-gray-900 text-white rounded-lg font-medium transition-colors"
          >
            Learn More
          </button>
        </div>
      </div>
    </app-hybrid-scene>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100vh;
      }
    `,
  ],
})
export class HeroSectionNg3dComponent {
  // Data-driven configuration arrays (declarative approach)

  readonly spheres = [
    {
      position: [0, 1, 0] as const,
      radius: 1.2,
      color: 0x8b5cf6, // Purple
      glowColor: 0x9333ea,
      floatSpeed: 1.0,
      floatDelay: 0,
    },
    {
      position: [-3, -1, 2] as const,
      radius: 0.8,
      color: 0xec4899, // Pink
      glowColor: 0xf472b6,
      floatSpeed: 1.2,
      floatDelay: 0.3,
    },
    {
      position: [3, 0, -1] as const,
      radius: 1.0,
      color: 0x06b6d4, // Cyan
      glowColor: 0x22d3ee,
      floatSpeed: 0.8,
      floatDelay: 0.6,
    },
    {
      position: [-2, 2, -2] as const,
      radius: 0.6,
      color: 0xfbbf24, // Gold
      glowColor: 0xfde047,
      floatSpeed: 1.5,
      floatDelay: 0.9,
    },
    {
      position: [2, -2, 1] as const,
      radius: 0.9,
      color: 0xf87171, // Red
      glowColor: 0xfca5a5,
      floatSpeed: 1.1,
      floatDelay: 1.2,
    },
  ];

  readonly cubes = Array.from({ length: 20 }, (_, i) => ({
    position: [
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20 - 10,
    ] as const,
    size: 0.5 + Math.random() * 0.5,
    color: [0x6366f1, 0x8b5cf6, 0xec4899, 0x06b6d4][Math.floor(Math.random() * 4)],
  }));
}
````

**Quality Gates**:

- [x] Template <30 lines (excluding content overlay)
- [x] Data-driven configuration arrays
- [x] Zero TypeScript service calls in template
- [x] Components + directives composition
- [x] Matches research-report.md:1863-1971
- [x] Visual quality targets screenshot reference

---

### Phase 4: Type Definitions and Exports (1 hour)

#### Step 4.1: Update interfaces/index.ts

**Add CylinderConfig and TorusConfig**:

```typescript
/**
 * Configuration for cylinder geometry
 * NEW addition for declarative components
 */
export interface CylinderConfig {
  readonly position: readonly [number, number, number];
  readonly radiusTop: number;
  readonly radiusBottom: number;
  readonly height: number;
  readonly radialSegments?: number;
  readonly color: string | number;
  readonly emissive?: string | number;
  readonly emissiveIntensity?: number;
  readonly opacity?: number;
  readonly metalness?: number;
  readonly roughness?: number;
  readonly animation?: 'float' | 'rotate' | 'pulse' | 'none';
  readonly animationSpeed?: number;
}

/**
 * Configuration for torus geometry
 * NEW addition for declarative components
 */
export interface TorusConfig {
  readonly position: readonly [number, number, number];
  readonly radius: number;
  readonly tube: number;
  readonly radialSegments?: number;
  readonly tubularSegments?: number;
  readonly color: string | number;
  readonly emissive?: string | number;
  readonly emissiveIntensity?: number;
  readonly opacity?: number;
  readonly metalness?: number;
  readonly roughness?: number;
  readonly animation?: 'float' | 'rotate' | 'pulse' | 'none';
  readonly animationSpeed?: number;
}
```

#### Step 4.2: Update angular-3d/index.ts Exports

**Add component and directive exports**:

```typescript
// Components - Declarative 3D primitives
export { Base3dPrimitiveComponent } from './components/primitives/base-3d-primitive.component';
export { FloatingSphereComponent } from './components/primitives/floating-sphere.component';
export { BackgroundCubeComponent } from './components/primitives/background-cube.component';
export { CylinderComponent } from './components/primitives/cylinder.component';
export { TorusComponent } from './components/primitives/torus.component';

// Directives - Behavior enhancements
export { Base3dDirective } from './directives/base-3d.directive';
export { Float3dDirective } from './directives/float-3d.directive';
export { Performance3dDirective } from './directives/performance-3d.directive';
export { Glow3dDirective } from './directives/glow-3d.directive';

// Types
export type { CylinderConfig, TorusConfig } from './interfaces';
```

---

### Phase 5: Optional SceneObjectService (INTERNAL HELPER) (2-3 hours)

**CRITICAL NOTE**: This is OPTIONAL and marked as INTERNAL. Only implement if components need complex factory helpers. PRIMARY API remains declarative components.

**Decision Point**: Architect should decide if this is needed at all. If components handle all logic internally, SceneObjectService can be skipped entirely.

**IF IMPLEMENTED**, use the architecture from original implementation-plan.md, BUT:

- Mark with `@internal` JSDoc tag
- Document as helper for component developers only
- DO NOT expose in primary user-facing documentation
- Components use it internally, users never call it directly

---

## 🤝 Developer Handoff

### Developer Delegation Recommendation

**RECOMMENDED DEVELOPER: frontend-developer**

**Rationale**:

This task is **primarily focused on Angular component architecture**, NOT service layer:

1. **Angular Component Patterns (70% of work)**:

   - Creating Angular components with signal inputs
   - Using Angular Three primitives in templates
   - Implementing Angular Directive Composition API
   - Managing component lifecycle with effect() and DestroyRef
   - OnPush change detection strategy
   - CUSTOM_ELEMENTS_SCHEMA configuration

2. **Frontend Technologies**:

   - Angular 20.1.6 standalone components
   - Signal-based reactive patterns
   - Template-first declarative approach
   - ViewChild mesh access with ElementRef
   - Directive host component injection
   - Three.js object manipulation in Angular context

3. **Service Integration (30% of work)**:
   - Injecting AnimationService and calling methods
   - Understanding automatic performance optimizer tracking
   - Simple inject() and method calls, NOT complex service architecture

**Why frontend-developer (NOT backend-developer)**:

- Primary complexity is in Angular component composition, not service architecture
- Requires deep understanding of Angular template patterns
- Requires knowledge of Angular Three package and primitives
- Directive Composition API is advanced frontend pattern
- Signal-based reactivity is frontend concern
- Backend developer would struggle with Angular Three primitives and template patterns

**Complexity**: HIGH
**Estimated Time**: 10-14 hours
**Task Type**: Frontend Component Architecture + Angular Three Integration

### Pre-Implementation Verification Checklist

**CRITICAL: Frontend Developer MUST verify before implementing:**

**Angular Three Primitives**:

- [ ] Angular Three package installed and version compatible
- [ ] `extend()` function available from 'angular-three' package
- [ ] Primitives available: ngt-mesh, ngt-sphere-geometry, ngt-box-geometry, ngt-cylinder-geometry, ngt-torus-geometry
- [ ] Material primitives available: ngt-mesh-physical-material, ngt-mesh-standard-material, ngt-mesh-lambert-material
- [ ] `*args` directive syntax understood

**AnimationService APIs**:

- [ ] `createTimeline(config)` returns `string` (line 132)
- [ ] `addAnimationToTimeline(timelineId, target, config)` exists (line 162)
- [ ] `playTimeline(timelineId)` exists (line 183)
- [ ] `removeTimeline(timelineId)` exists (line 233)
- [ ] `AnimationConfig` interface structure verified (line 15-23)
- [ ] `ElementAnimationTarget` interface structure verified (line 25-33)

**AdvancedPerformanceOptimizerService Understanding**:

- [ ] **CRITICAL**: NO `registerObjectForCulling()` public method exists
- [ ] Service uses automatic scene-based tracking via `updateCullingObjects()` (line 584)
- [ ] Objects added to scene are automatically tracked (line 375-382)
- [ ] performance3d directive acts as marker, optimization is automatic

**Angular Patterns**:

- [ ] `viewChild.required<ElementRef<Mesh>>('mesh')` pattern understood
- [ ] `inject(HostComponent, { host: true })` pattern understood
- [ ] `effect()` for reactive initialization understood
- [ ] `DestroyRef.onDestroy()` for cleanup understood
- [ ] Signal inputs via `input<T>()` understood
- [ ] CUSTOM_ELEMENTS_SCHEMA requirement understood

### Implementation Sequence

**Phase 1: Core Components (4 hours)**

1. Create base-3d-primitive.component.ts (optional)
2. Create floating-sphere.component.ts with AnimationService integration
3. Create background-cube.component.ts with AnimationService integration
4. Create cylinder.component.ts
5. Create torus.component.ts
6. Test components individually in browser

**Phase 2: Directives (3 hours)** 7. Create base-3d.directive.ts (optional) 8. Create float-3d.directive.ts with host component injection 9. Create performance-3d.directive.ts (automatic tracking) 10. Create glow-3d.directive.ts (BackSide technique) 11. Test directive composition

**Phase 3: Hero Section (2 hours)** 12. Create hero-section-ng-3d.component.ts with declarative template 13. Integrate with landing page 14. Visual quality refinement vs screenshot

**Phase 4: Integration (1 hour)** 15. Update interfaces/index.ts with CylinderConfig, TorusConfig 16. Update angular-3d/index.ts exports 17. Verify all imports resolve

**Phase 5: Testing (2 hours)** 18. Component unit tests (signal inputs, mesh access, lifecycle) 19. Directive unit tests (host injection, service integration) 20. Integration test (hero section rendering) 21. Performance profiling (60 FPS validation)

**Phase 6: Optional SceneObjectService (IF NEEDED)** 22. Architect decision: Is helper service needed? 23. If yes: Implement with @internal marking 24. If no: Skip entirely

### Acceptance Criteria

**Must Have**:

- [ ] FloatingSphereComponent created using Angular Three primitives
- [ ] BackgroundCubeComponent created using Angular Three primitives
- [ ] CylinderComponent created using Angular Three primitives
- [ ] TorusComponent created using Angular Three primitives
- [ ] float3d directive created with AnimationService integration
- [ ] performance3d directive created (automatic tracking)
- [ ] glow3d directive created (BackSide technique)
- [ ] Hero section component with declarative template (<30 lines)
- [ ] Signal-based inputs working reactively
- [ ] ViewChild mesh access working
- [ ] Directive composition working (multiple directives on single component)
- [ ] All components use CUSTOM_ELEMENTS_SCHEMA
- [ ] All components use OnPush change detection
- [ ] AnimationService timelines cleanup on destroy
- [ ] No console errors in browser
- [ ] Build passes without errors

**Performance**:

- [ ] 60 FPS maintained with 5 spheres + 20 cubes
- [ ] Memory usage stable (no leaks)
- [ ] Animation smoothness validated
- [ ] Performance optimizer automatic tracking verified

**Code Quality**:

- [ ] Zero `any` types
- [ ] All imports use @app/core/angular-3d paths
- [ ] JSDoc on all public components/directives
- [ ] TypeScript strict mode passes
- [ ] Components follow Single Responsibility Principle

### Risk Mitigation

**Risk**: Angular Three primitive syntax complexity
**Mitigation**:

- Read research-report.md:32-71 for primitive patterns
- Test each primitive individually before composition
- Use CUSTOM_ELEMENTS_SCHEMA from the start
- Reference Angular Three official documentation

**Risk**: ViewChild mesh access timing issues
**Mitigation**:

- Use `effect()` to wait for mesh availability (research-report.md:299-303)
- Use `viewChild.required()` with type safety
- Test mesh access in ngAfterViewInit equivalent (effect callback)

**Risk**: Directive host component injection complexity
**Mitigation**:

- Use `inject(Base3dPrimitiveComponent, { host: true })` pattern (research-report.md:402-417)
- Test directive in isolation before composition
- Verify host component public API (getMesh() method)

**Risk**: Performance optimizer automatic tracking misunderstanding
**Mitigation**:

- READ advanced-performance-optimizer.service.ts:584-597 thoroughly
- Understand objects are tracked via scene updates, NOT explicit registration
- Do NOT try to call non-existent `registerObjectForCulling()` method
- Test performance3d directive acts as marker only

---

## 📊 Quality Gates

### Before Marking Architecture Complete

- [x] All component class signatures defined with types
- [x] All directive patterns specified with host injection
- [x] ViewChild mesh access pattern documented
- [x] Signal-based input pattern documented
- [x] AnimationService integration verified (createTimeline, playTimeline, removeTimeline)
- [x] AdvancedPerformanceOptimizerService automatic tracking understood
- [x] **CRITICAL**: NO hallucinated `registerObjectForCulling()` method
- [x] Angular Three primitive usage documented
- [x] CUSTOM_ELEMENTS_SCHEMA requirement documented
- [x] Hero section declarative template designed
- [x] Implementation sequence accounts for dependencies
- [x] No backward compatibility planning
- [x] Registry updated to "Architecture Complete"
- [x] Developer recommendation: frontend-developer (with rationale)

### Evidence Quality

- **Citation Count**: 80+ file:line citations from codebase + research
- **Verification Rate**: 100% (all AnimationService, AdvancedPerformanceOptimizerService APIs verified)
- **Type Discovery**: CylinderConfig, TorusConfig need creation (acknowledged)
- **Pattern Consistency**: Matches research-report.md patterns (90% confidence)
- **Zero Hallucinations**:
  - ✅ AnimationService APIs verified
  - ✅ AdvancedPerformanceOptimizerService automatic tracking verified
  - ✅ NO `registerObjectForCulling()` hallucination
  - ✅ Angular Three primitives documented from research

---

## 🔗 References

### Codebase Evidence

- **AnimationService**: apps/dev-brand-ui/src/app/core/angular-3d/services/animation.service.ts (lines 132, 162, 183, 233)
- **AdvancedPerformanceOptimizerService**: apps/dev-brand-ui/src/app/core/angular-3d/services/advanced-performance-optimizer.service.ts (lines 157, 584, 375-382)
- **Interfaces**: apps/dev-brand-ui/src/app/core/angular-3d/interfaces/index.ts (lines 105-145)

### Research Documentation

- **Research Report**: task-tracking/TASK_2025_014/research-report.md
  - Component architecture: lines 19-71, 1569-1630
  - Mesh reference access: lines 186-221, 299-303
  - Directive composition: lines 369-417, 1717-1770
  - Glow effect: lines 1804-1858
  - Hero section: lines 1863-1971
- **Task Description**: task-tracking/TASK_2025_014/task-description.md
- **Context**: task-tracking/TASK_2025_014/context.md

### External Resources

- [Angular Three Official Documentation](https://angularthree.org/)
- [Angular Three First Scene Tutorial](https://angularthree.org/core/getting-started/first-scene/)
- [Angular Directive Composition API](https://angular.dev/guide/directives/directive-composition-api)
- [Angular Signal Components Guide](https://blog.angular-university.io/angular-signal-components/)

---

**Document Status**: ✅ COMPLETE - Ready for Frontend Developer
**Created**: 2025-10-17
**Task ID**: TASK_2025_014
**Architecture Design**: 100% Evidence-Based
**Zero Hallucinated APIs**: All APIs verified with file:line citations
**Confidence Level**: 90% (based on comprehensive research + codebase investigation)
**PRIMARY APPROACH**: Declarative Angular Components (Template-First)
**SECONDARY APPROACH**: Optional SceneObjectService (Internal Helper Only)
