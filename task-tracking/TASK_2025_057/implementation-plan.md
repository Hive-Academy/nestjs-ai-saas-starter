# Implementation Plan - TASK_2025_057

## Migrate to @hive-academy/angular-3d & Build Metaball Hero

---

## Codebase Investigation Summary

### Libraries Discovered

- **@hive-academy/angular-3d** (v1.1.0): Published npm package with 1000+ exports

  - Path: `D:\projects\nestjs-ai-saas-starter\node_modules\@hive-academy\angular-3d`
  - Type declarations: `types/hive-academy-angular-3d.d.ts` (12337 lines)
  - Key exports verified: Scene3dComponent, AnimationService, RenderLoopService, SceneService, OrbitControlsComponent, BloomEffectComponent, PlanetComponent, NebulaComponent, NebulaVolumetricComponent, StarFieldComponent, PolyhedronComponent, BoxComponent, CylinderComponent, TorusComponent, GltfModelComponent, SvgIconComponent, BackgroundCubesComponent, SceneLightingComponent, MetaballSceneComponent, MetaballSphereComponent, MetaballCursorComponent, Float3dDirective, Rotate3dDirective, SpaceFlight3dDirective, ScrollZoomCoordinatorDirective, Glow3dDirective, Performance3dDirective, ViewportPositioningService, MouseTrackerService, and many more
  - Text components: TroikaTextComponent, ResponsiveTroikaTextComponent, GlowTroikaTextComponent, SmokeTroikaTextComponent, ParticleTextComponent, BubbleTextComponent, ExtrudedText3DComponent
  - Metaball: MetaballSceneComponent, MetaballSphereComponent, MetaballCursorComponent with presets (moody, cosmic, neon, sunset, holographic, minimal)
  - TSL functions: 50+ procedural texture/material functions exported

- **@hive-academy/angular-gsap**: NOT INSTALLED in node_modules

  - Will need `npm install @hive-academy/angular-gsap` before use
  - Expected to contain: GSAP scroll animation directives

- **Local angular-3d** (to be removed): `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\angular-3d\`

  - 57 files: components, directives, services, types, utils, config
  - Wraps `angular-three` (v3.7.2) NgtCanvas-based architecture
  - Key distinction: Local Scene3DComponent wraps NgtCanvas (angular-three); Library Scene3dComponent uses direct WebGPU/WebGL renderer

- **angular-three ecosystem** (to be removed from package.json):
  - `angular-three`: 3.7.2 (dependencies line 75)
  - `angular-three-postprocessing`: 3.7.2 (dependencies line 76)
  - `angular-three-soba`: 3.7.2 (devDependencies line 147)
  - Overrides entries: lines 205-218

### Critical API Differences (Local vs Library)

| Local Name                             | Library Name                         | Notes                                 |
| -------------------------------------- | ------------------------------------ | ------------------------------------- |
| `Scene3DComponent` (NgtCanvas wrapper) | `Scene3dComponent` (WebGPU renderer) | **COMPLETELY DIFFERENT ARCHITECTURE** |
| `GLTFModelComponent`                   | `GltfModelComponent`                 | Case change                           |
| `SVGIconComponent`                     | `SvgIconComponent`                   | Case change                           |
| `SmokeParticleTextComponent`           | `SmokeTroikaTextComponent`           | Different implementation              |
| `GlowParticleTextComponent`            | `GlowTroikaTextComponent`            | Different implementation              |
| `InstancedParticleTextComponent`       | `ParticleTextComponent`              | Different implementation              |
| `Text3DComponent`                      | `ExtrudedText3DComponent`            | Different name                        |
| `StarFieldEnhancedComponent`           | `StarFieldComponent`                 | Different name                        |
| `BackgroundCubeComponent` (singular)   | `BackgroundCubeComponent`            | Same                                  |
| `BackgroundCubesComponent` (plural)    | `BackgroundCubesComponent`           | Same                                  |

### Items NOT in @hive-academy/angular-3d (Local-Only)

These items exist in the local code but are NOT exported by the library:

1. **Colors3D** - Color configuration object (`config/colors.config.ts`)
2. **SpaceThemeStore** - Space theme state management (`services/space-theme.store.ts`)
3. **SpaceTheme type** - Theme type definitions (`types/space-theme.types.ts`)
4. **ScrollAnimationDirective** - GSAP ScrollTrigger directive (`directives/scroll-animation.directive.ts`)
5. **SectionStickyDirective** - Sticky section directive (`directives/section-sticky.directive.ts`)
6. **HijackedScrollDirective** - Hijacked scroll container (`directives/hijacked-scroll.directive.ts`)
7. **HijackedScrollItemDirective** - Hijacked scroll item (`directives/hijacked-scroll-item.directive.ts`)
8. **ViewportPositioner** - Utility class for 3D positioning (`utils/viewport-3d-positioning.ts`)
9. **LIGHTING_PRESETS** - Lighting preset configurations (`types/scene-lighting.types.ts`)
10. **registerAngularThreePrimitives()** - angular-three primitive registration (`utils/angular-three-primitives.ts`)

### Items NOT in Library (angular-three specific, must be removed)

1. **NgtCanvas** - angular-three canvas component (used by local Scene3DComponent)
2. **NgtArgs** - angular-three args pipe (used in value-propositions-3d-scene)
3. **extend()** - angular-three primitive registration (used in cta-scene-graph)
4. **ngt-\* elements** - angular-three custom elements (ngt-mesh, ngt-box-geometry, etc.)

### Consumer Files (19 files importing from local angular-3d)

**Scene Graph Components (4 files):**

1. `hero-space-scene.component.ts` - Heavy consumer (17 imports from angular-3d)
2. `hero-scene-graph.component.ts` - 9 imports
3. `cta-scene-graph.component.ts` - 2 imports + angular-three `extend()`
4. `value-propositions-3d-scene.component.ts` - 1 import (Colors3D) + angular-three `NgtArgs`

**Section Components (12 files):** 5. `hero-section.component.ts` - Scene3DComponent, ScrollAnimationDirective 6. `hero-section-space.component.ts` - Scene3DComponent, SpaceThemeStore 7. `cta-section.component.ts` - Scene3DComponent, ScrollAnimationDirective 8. `value-propositions-section.component.ts` - ScrollAnimationDirective, SectionStickyDirective, Scene3DComponent 9. `capabilities-matrix-section.component.ts` - ScrollAnimationDirective 10. `chromadb-section.component.ts` - ScrollAnimationDirective, HijackedScrollItemDirective 11. `neo4j-section.component.ts` - ScrollAnimationDirective, HijackedScrollItemDirective 12. `langgraph-core-section.component.ts` - ScrollAnimationDirective, HijackedScrollItemDirective 13. `langgraph-memory-section.component.ts` - ScrollAnimationDirective, HijackedScrollItemDirective 14. `workflow-examples-section.component.ts` - ScrollAnimationDirective 15. `problem-solution-section.component.ts` - ScrollAnimationDirective 16. `developer-experience-section.component.ts` - ScrollAnimationDirective

**Shared Components (2 files):** 17. `scrolling-code-timeline.component.ts` - HijackedScrollDirective, HijackedScrollItemDirective 18. `hijacked-scroll-timeline.component.ts` - (wrapper around HijackedScrollDirective)

**Config file (1 file):** 19. `colors.config.ts` - Self-referential (inside angular-3d, will be relocated)

---

## Architecture Design

### Design Philosophy

**Approach**: Phased migration with strategic retention of local-only modules

The library `@hive-academy/angular-3d` has a fundamentally different rendering architecture (direct WebGPU/WebGL) compared to the local implementation (angular-three NgtCanvas wrapper). This means:

1. Components that wrap angular-three primitives (Scene3DComponent with NgtCanvas, ngt-\* elements) must be replaced with library equivalents
2. Pure GSAP/DOM directives (ScrollAnimationDirective, SectionStickyDirective, HijackedScroll\*) are NOT in the library and must be retained locally but relocated
3. App-specific config (Colors3D, SpaceThemeStore) must be retained locally but relocated
4. The value-propositions-3d-scene uses angular-three's NgtArgs and ngt-\* elements directly, requiring a rewrite to use library components

### Migration Strategy

**Phase 1: Retain & Relocate Local-Only Modules**

Before deleting the `angular-3d/` directory, relocate modules that are NOT in the library:

- GSAP directives (scroll-animation, section-sticky, hijacked-scroll, hijacked-scroll-item)
- App config (Colors3D, SpaceThemeStore, SpaceTheme types, LIGHTING_PRESETS)
- Viewport positioning utility

**Phase 2: Delete & Clean**

Remove everything that IS replaced by the library:

- All component files (scene-3d, orbit-controls, bloom-effect, all primitives)
- All 3D directives (float-3d, rotate-3d, space-flight, glow-3d, performance-3d, scroll-zoom-coordinator)
- All 3D services (animation, performance-monitor, advanced-performance-optimizer, angular-3d-state.store)
- angular-three packages from package.json
- registerAngularThreePrimitives from main.ts

**Phase 3: Update Imports**

Update all 18 consumer files to import from `@hive-academy/angular-3d` instead of local paths.

**Phase 4: Rewrite angular-three Dependent Components**

Rewrite components that use angular-three's NgtCanvas/NgtArgs/extend()/ngt-\* elements to use library components.

**Phase 5: Build Metaball Hero**

Create new hero section using MetaballSceneComponent from the library.

---

## Component Specifications

### Batch 1: Package Cleanup & Local Module Relocation

#### 1.1 Relocate Local-Only Modules

**Rationale**: These modules are not in `@hive-academy/angular-3d` and must be preserved.

**Files to relocate** (from `core/angular-3d/` to `core/gsap-animations/` and `core/config/`):

CREATE `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\gsap-animations\` directory:

- MOVE `directives/scroll-animation.directive.ts` -> `core/gsap-animations/scroll-animation.directive.ts`
- MOVE `directives/section-sticky.directive.ts` -> `core/gsap-animations/section-sticky.directive.ts`
- MOVE `directives/hijacked-scroll.directive.ts` -> `core/gsap-animations/hijacked-scroll.directive.ts`
- MOVE `directives/hijacked-scroll-item.directive.ts` -> `core/gsap-animations/hijacked-scroll-item.directive.ts`
- CREATE `core/gsap-animations/index.ts` (barrel export)

CREATE `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\config\` directory:

- MOVE `config/colors.config.ts` -> `core/config/colors.config.ts`

RETAIN in `core/` (create new files):

- MOVE `services/space-theme.store.ts` -> `core/stores/space-theme.store.ts`
- MOVE `types/space-theme.types.ts` -> `core/types/space-theme.types.ts`
- MOVE `types/scene-lighting.types.ts` -> `core/types/scene-lighting.types.ts`
- MOVE `utils/viewport-3d-positioning.ts` -> `core/utils/viewport-3d-positioning.ts`

Note: The SpaceThemeStore and scene-lighting types reference Three.js types. After migration, they may need adjustment since the library uses `three/webgpu` not `three`. Check compatibility.

#### 1.2 Delete Local angular-3d Directory

After relocation, delete the entire directory:

- DELETE `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\angular-3d\` (all 57 files)

#### 1.3 Remove angular-three Packages from package.json

**File**: `D:\projects\nestjs-ai-saas-starter\package.json`

Remove from dependencies:

```
"angular-three": "3.7.2",          (line 75)
"angular-three-postprocessing": "3.7.2",  (line 76)
```

Remove from devDependencies:

```
"angular-three-soba": "3.7.2",    (line 147)
```

Remove overrides section entries:

```
"angular-three": { ... },                  (lines 205-209)
"angular-three-soba": { ... },             (lines 210-215)
"angular-three-postprocessing": { ... },   (lines 216-218)
```

#### 1.4 Install @hive-academy/angular-gsap (if available on npm)

```bash
npm install @hive-academy/angular-gsap
```

If not available, the GSAP directives remain in the local `core/gsap-animations/` directory.

#### 1.5 Remove registerAngularThreePrimitives from main.ts

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\main.ts`

Remove:

```typescript
import { registerAngularThreePrimitives } from './app/core/angular-3d/utils/angular-three-primitives';
registerAngularThreePrimitives();
```

Result:

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
```

#### 1.6 Update ESLint Config

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\eslint.config.mjs`

Remove the angular-3d exemption rule block (lines 71-77):

```javascript
// Allow Three.js imports in angular-3d module and test files (overrides above rule)
{
  files: ['src/app/core/angular-3d/**/*.ts', '**/*.spec.ts', '**/*.test.ts'],
  rules: {
    'no-restricted-imports': 'off',
  },
},
```

The `no-restricted-imports` rule for `three` is already set to `'off'` (line 29), so no active restriction exists. The angular-3d exemption is dead code.

#### 1.7 Update ESLint Test Files

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\__eslint-tests__\no-direct-threejs.spec.ts`

This test file validates the no-direct-threejs rule which references the angular-3d module. Review and update or remove the test if it references the deleted directory.

---

### Batch 2: Import Migration - Scene Graph Components

These are the most complex files with many imports from the local angular-3d.

#### 2.1 hero-space-scene.component.ts (REWRITE)

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\landing-page\sections\scene-graphs\hero-space-scene.component.ts`

**Current local imports (17)**:

```typescript
import { BloomEffectComponent } from '../../../../core/angular-3d/components/effects/bloom-effect.component';
import { OrbitControlsComponent } from '../../../../core/angular-3d/components/orbit-controls.component';
import { NebulaVolumetricComponent } from '../../../../core/angular-3d/components/primitives/nebula-volumetric.component';
import { PlanetComponent } from '../../../../core/angular-3d/components/primitives/planet.component';
import { SmokeParticleTextComponent } from '../../../../core/angular-3d/components/primitives/smoke-particle-text.component';
import { StarFieldEnhancedComponent } from '../../../../core/angular-3d/components/primitives/star-field-enhanced.component';
import { SceneLightingComponent } from '../../../../core/angular-3d/components/primitives/scene-lighting.component';
import { Colors3D } from '../../../../core/angular-3d/config/colors.config';
import { SpaceThemeStore } from '../../../../core/angular-3d/services/space-theme.store';
import type { SpaceTheme } from '../../../../core/angular-3d/types/space-theme.types';
import type { SceneLighting } from '../../../../core/angular-3d/types/scene-lighting.types';
import { GLTFModelComponent } from '../../../../core/angular-3d/components/primitives/gltf-model.component';
import type { SpaceFlightWaypoint } from '../../../../core/angular-3d';
import { NebulaComponent } from '../../../../core/angular-3d/components/primitives/nebula.component';
import { SVGIconComponent } from '../../../../core/angular-3d/components/primitives/svg-icon.component';
import { ViewportPositioner } from '../../../../core/angular-3d/utils/viewport-3d-positioning';
import { InstancedParticleTextComponent } from '../../../../core/angular-3d/components/primitives';
import { Rotate3dDirective } from '../../../../core/angular-3d/directives/rotate-3d.directive';
import {
  ScrollZoomCoordinatorDirective,
  type ScrollZoomState,
} from '../../../../core/angular-3d/directives';
```

**New imports**:

```typescript
// From @hive-academy/angular-3d (verified exports from d.ts line 12335)
import {
  BloomEffectComponent,
  OrbitControlsComponent,
  NebulaVolumetricComponent,
  PlanetComponent,
  SmokeTroikaTextComponent, // was SmokeParticleTextComponent
  StarFieldComponent, // was StarFieldEnhancedComponent
  SceneLightingComponent,
  GltfModelComponent, // was GLTFModelComponent
  NebulaComponent,
  SvgIconComponent, // was SVGIconComponent
  ParticleTextComponent, // was InstancedParticleTextComponent
  Rotate3dDirective,
  ScrollZoomCoordinatorDirective,
} from '@hive-academy/angular-3d';
import type { SpaceFlightWaypoint, ScrollZoomState } from '@hive-academy/angular-3d';

// Local-only (relocated)
import { Colors3D } from '../../../../core/config/colors.config';
import { SpaceThemeStore } from '../../../../core/stores/space-theme.store';
import type { SpaceTheme } from '../../../../core/types/space-theme.types';
import type { SceneLighting } from '../../../../core/types/scene-lighting.types';
import { ViewportPositioner } from '../../../../core/utils/viewport-3d-positioning';
```

**Template changes needed**:

- `<app-smoke-particle-text>` -> verify if SmokeTroikaTextComponent uses selector `a3d-smoke-troika-text`
- `<app-star-field-enhanced>` -> verify StarFieldComponent selector (likely `a3d-star-field`)
- `<app-gltf-model>` -> verify GltfModelComponent selector (likely `a3d-gltf-model`)
- `<app-svg-icon>` -> verify SvgIconComponent selector (likely `a3d-svg-icon`)
- `<app-instanced-particle-text>` -> verify ParticleTextComponent selector (likely `a3d-particle-text`)
- Other `app-*` selectors -> verify library equivalents use `a3d-*` prefix

**CRITICAL**: The library components use `a3d-*` selector prefix, not `app-*`. ALL template selectors must be updated.

**Component API differences to verify**:

- SmokeTroikaTextComponent vs SmokeParticleTextComponent: Different props (text, fontSize, particleDensity vs text, fontSize, etc.)
- StarFieldComponent vs StarFieldEnhancedComponent: May have different inputs (check starCount, radius, enableTwinkle)
- ParticleTextComponent vs InstancedParticleTextComponent: Different API (particleColor, opacity, etc.)

**NOTE**: This component's template uses many `app-*` selectors that map to local components. The library uses `a3d-*` selectors. Every template element must be remapped. The developer should read the library type declarations for exact selector names and input names for each component.

#### 2.2 hero-scene-graph.component.ts

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\landing-page\sections\scene-graphs\hero-scene-graph.component.ts`

**Import changes**:

```typescript
// FROM (local):
import { PolyhedronComponent } from '../../../../core/angular-3d/components/primitives/polyhedron.component';
import { CylinderComponent } from '../../../../core/angular-3d/components/primitives/cylinder.component';
import { TorusComponent } from '../../../../core/angular-3d/components/primitives/torus.component';
import { BoxComponent } from '../../../../core/angular-3d/components/primitives/box.component';
import { Text3DComponent } from '../../../../core/angular-3d/components/primitives/text-3d.component';
import { BackgroundCubesComponent } from '../../../../core/angular-3d/components/primitives/background-cubes.component';
import { GLTFModelComponent } from '../../../../core/angular-3d/components/primitives/gltf-model.component';
import { SceneLightingComponent } from '../../../../core/angular-3d/components/primitives/scene-lighting.component';
import { Colors3D } from '../../../../core/angular-3d/config/colors.config';
import type { SceneLighting } from '../../../../core/angular-3d/types/scene-lighting.types';

// TO:
import {
  PolyhedronComponent,
  CylinderComponent,
  TorusComponent,
  BoxComponent,
  ExtrudedText3DComponent, // was Text3DComponent
  BackgroundCubesComponent,
  GltfModelComponent, // was GLTFModelComponent
  SceneLightingComponent,
} from '@hive-academy/angular-3d';
import { Colors3D } from '../../../../core/config/colors.config';
import type { SceneLighting } from '../../../../core/types/scene-lighting.types';
```

**Template changes**: Update all `app-*` selectors to `a3d-*` equivalents.

#### 2.3 cta-scene-graph.component.ts (REWRITE needed)

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\landing-page\sections\scene-graphs\cta-scene-graph.component.ts`

**Current**: Uses `angular-three`'s `extend()` and `CUSTOM_ELEMENTS_SCHEMA` with `ngt-ambient-light`, `ngt-directional-light` elements.

**Import changes**:

```typescript
// REMOVE:
import { extend } from 'angular-three';
import { AmbientLight, DirectionalLight } from 'three';
extend({ AmbientLight, DirectionalLight });

// FROM (local):
import { PolyhedronComponent } from '../../../../core/angular-3d/components/primitives/polyhedron.component';
import { Colors3D } from '../../../../core/angular-3d/config/colors.config';

// TO:
import {
  PolyhedronComponent,
  AmbientLightComponent,
  DirectionalLightComponent,
} from '@hive-academy/angular-3d';
import { Colors3D } from '../../../../core/config/colors.config';
```

**Template rewrite**: Replace `ngt-ambient-light` and `ngt-directional-light` with library's `a3d-ambient-light` and `a3d-directional-light` components. Remove `CUSTOM_ELEMENTS_SCHEMA`.

#### 2.4 value-propositions-3d-scene.component.ts (MAJOR REWRITE)

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\landing-page\sections\scene-graphs\value-propositions-3d-scene.component.ts`

**Current**: Heavily uses `angular-three`'s NgtArgs and ngt-\* elements (ngt-group, ngt-mesh, ngt-box-geometry, ngt-mesh-standard-material, etc.) with CUSTOM_ELEMENTS_SCHEMA.

**This component requires a COMPLETE REWRITE** because it uses low-level angular-three elements that don't exist in the library. Options:

**Option A (Recommended)**: Rewrite using library geometry components

```typescript
// Replace all ngt-* elements with library components
import {
  BoxComponent,
  SphereComponent,
  CylinderComponent,
  TorusComponent,
  PolyhedronComponent,
  GroupComponent,
  AmbientLightComponent,
  DirectionalLightComponent,
  PointLightComponent,
} from '@hive-academy/angular-3d';
import { Colors3D } from '../../../../core/config/colors.config';
```

The template must be rewritten from scratch using library component selectors (a3d-box, a3d-sphere, a3d-cylinder, a3d-torus, a3d-polyhedron, a3d-group) instead of ngt-\* elements. The 11 geometry variations will use these components with their respective material inputs rather than child ngt-mesh-standard-material elements.

**Option B**: Simplify to a single rotating geometry using library components, reducing complexity.

---

### Batch 3: Import Migration - Section Components (ScrollAnimation + Scene3D)

These components primarily use ScrollAnimationDirective and/or Scene3DComponent. Since ScrollAnimationDirective is local-only, these imports simply change path. Scene3DComponent usage needs careful review since the library's Scene3dComponent has a completely different architecture.

#### 3.1 Scene3D Consumer Components

**CRITICAL ARCHITECTURE DECISION**: The local `Scene3DComponent` wraps angular-three's `NgtCanvas` and accepts a `[sceneGraph]` component reference input. The library's `Scene3dComponent` is a WebGPU renderer with content projection (child components render inside it). These are fundamentally different patterns.

**Files using Scene3DComponent** (4 files):

1. `hero-section.component.ts` - uses `<app-scene-3d [sceneGraph]="HeroSceneGraphComponent">`
2. `hero-section-space.component.ts` - uses `<app-scene-3d [sceneGraph]="sceneGraph">`
3. `cta-section.component.ts` - uses `<app-scene-3d [sceneGraph]="CTASceneGraphComponent">`
4. `value-propositions-section.component.ts` - uses `Scene3DComponent`

**Migration pattern**: Replace `<app-scene-3d [sceneGraph]="XComponent">` with:

```html
<a3d-scene-3d [cameraPosition]="[0, 0, 15]" [cameraFov]="60">
  <!-- Scene graph content rendered as children instead of [sceneGraph] input -->
  <app-hero-scene-graph />
</a3d-scene-3d>
```

The scene graph components must be refactored to work as children of `a3d-scene-3d` instead of being passed as a component class reference. They need to inject `SceneService` from the library to add objects to the scene.

**hero-section.component.ts**:

```typescript
// FROM:
import { Scene3DComponent } from '../../../core/angular-3d/components/scene-3d.component';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';

// TO:
import { Scene3dComponent } from '@hive-academy/angular-3d';
import { ScrollAnimationDirective } from '../../../core/gsap-animations/scroll-animation.directive';
```

**hero-section-space.component.ts**:

```typescript
// FROM:
import { Scene3DComponent } from '../../../core/angular-3d/components/scene-3d.component';
import { SpaceThemeStore } from '../../../core/angular-3d/services/space-theme.store';

// TO:
import { Scene3dComponent } from '@hive-academy/angular-3d';
import { SpaceThemeStore } from '../../../core/stores/space-theme.store';
```

**cta-section.component.ts**:

```typescript
// FROM:
import { Scene3DComponent } from '../../../core/angular-3d/components/scene-3d.component';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';

// TO:
import { Scene3dComponent } from '@hive-academy/angular-3d';
import { ScrollAnimationDirective } from '../../../core/gsap-animations/scroll-animation.directive';
```

**value-propositions-section.component.ts**:

```typescript
// FROM:
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';
import { SectionStickyDirective } from '../../../core/angular-3d/directives/section-sticky.directive';
import { Scene3DComponent } from '../../../core/angular-3d';

// TO:
import { Scene3dComponent } from '@hive-academy/angular-3d';
import { ScrollAnimationDirective } from '../../../core/gsap-animations/scroll-animation.directive';
import { SectionStickyDirective } from '../../../core/gsap-animations/section-sticky.directive';
```

#### 3.2 ScrollAnimation-Only Section Components (8 files)

These only use ScrollAnimationDirective (a local-only module). Import path change only:

**Pattern**: Change `from '../../../core/angular-3d/directives/scroll-animation.directive'` to `from '../../../core/gsap-animations/scroll-animation.directive'`

Files:

1. `capabilities-matrix-section.component.ts`
2. `workflow-examples-section.component.ts`
3. `problem-solution-section.component.ts`
4. `developer-experience-section.component.ts`

#### 3.3 ScrollAnimation + HijackedScrollItem Components (4 files)

**Pattern**: Change both import paths:

```typescript
// FROM:
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';
import { HijackedScrollItemDirective } from '../../../core/angular-3d/directives/hijacked-scroll-item.directive';

// TO:
import { ScrollAnimationDirective } from '../../../core/gsap-animations/scroll-animation.directive';
import { HijackedScrollItemDirective } from '../../../core/gsap-animations/hijacked-scroll-item.directive';
```

Files:

1. `chromadb-section.component.ts`
2. `neo4j-section.component.ts`
3. `langgraph-core-section.component.ts`
4. `langgraph-memory-section.component.ts`

---

### Batch 4: Import Migration - Shared Components

#### 4.1 scrolling-code-timeline.component.ts

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\shared\components\scrolling-code-timeline.component.ts`

```typescript
// FROM:
import { HijackedScrollDirective } from '../../core/angular-3d/directives/hijacked-scroll.directive';
import {
  HijackedScrollItemDirective,
  type SlideDirection,
} from '../../core/angular-3d/directives/hijacked-scroll-item.directive';

// TO:
import { HijackedScrollDirective } from '../../core/gsap-animations/hijacked-scroll.directive';
import {
  HijackedScrollItemDirective,
  type SlideDirection,
} from '../../core/gsap-animations/hijacked-scroll-item.directive';
```

#### 4.2 hijacked-scroll-timeline.component.ts

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\shared\components\hijacked-scroll-timeline.component.ts`

Review imports and update any references to `core/angular-3d/` paths. This component wraps HijackedScrollDirective so likely has similar imports.

---

### Batch 5: Build New Metaball Hero Section

#### 5.1 Create MetaballHeroSectionComponent

**File**: `D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\landing-page\sections\metaball-hero-section.component.ts`

**Purpose**: Replace or complement the existing space hero with a metaball-based hero section.

**Library Components Used** (all verified from d.ts):

- `Scene3dComponent` - selector: `a3d-scene-3d` (verified: d.ts line 252-366)
- `MetaballSceneComponent` - selector: `a3d-metaball-scene` (verified: d.ts line 3712-3822)
- `MetaballSphereComponent` - selector: `a3d-metaball-sphere` (verified: d.ts line 3857-3894)
- `MetaballCursorComponent` - selector: `a3d-metaball-cursor` (verified: d.ts line 3917-3948)

**API** (verified from d.ts):

- MetaballSceneComponent inputs: preset (MetaballPreset), fullscreen (boolean), smoothness (number), animationSpeed (number), movementScale (number), mouseProximityEffect (boolean), minMovementScale (number), maxMovementScale (number), cameraDistance (number|null), enableAdaptiveQuality (boolean)
- MetaballSphereComponent inputs: positionPreset (MetaballPositionPreset), position ([number, number]), orbit (MetaballOrbitConfig), radius (number), blendSmoothness (number)
- MetaballCursorComponent inputs: radiusMin (number), radiusMax (number), glowIntensity (number), glowRadius (number), smoothness (number), blendSmoothness (number), proximityDistance (number)

**Presets available**: 'moody' | 'cosmic' | 'neon' | 'sunset' | 'holographic' | 'minimal'
**Position presets**: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'top-center' | 'bottom-center' | 'left-center' | 'right-center'

**Helper functions** (verified from d.ts line 12335):

- `getPresetBackgroundHex(preset: MetaballPreset): number`
- `getPresetLightColor(preset: MetaballPreset): string`
- `createMetaballPresets(isMobile: boolean): Record<MetaballPreset, MetaballPresetConfig>`

**Implementation Pattern**:

```typescript
import { Component } from '@angular/core';
import {
  Scene3dComponent,
  MetaballSceneComponent,
  MetaballSphereComponent,
  MetaballCursorComponent,
  getPresetBackgroundHex,
} from '@hive-academy/angular-3d';

@Component({
  selector: 'brand-metaball-hero-section',
  standalone: true,
  imports: [
    Scene3dComponent,
    MetaballSceneComponent,
    MetaballSphereComponent,
    MetaballCursorComponent,
  ],
  template: `
    <section class="relative w-full h-screen overflow-hidden">
      <!-- Metaball 3D Background -->
      <a3d-scene-3d
        [cameraPosition]="[0, 0, 5]"
        [cameraFov]="75"
        [backgroundColor]="backgroundHex"
        [frameloop]="'always'"
        class="absolute inset-0"
      >
        <a3d-metaball-scene
          [preset]="'holographic'"
          [fullscreen]="true"
          [smoothness]="0.8"
          [animationSpeed]="1.0"
          [mouseProximityEffect]="true"
          [enableAdaptiveQuality]="true"
        >
          <!-- Static corner spheres -->
          <a3d-metaball-sphere positionPreset="top-left" [radius]="1.2" />
          <a3d-metaball-sphere positionPreset="bottom-right" [radius]="0.8" />
          <a3d-metaball-sphere positionPreset="center" [radius]="0.6" />

          <!-- Orbiting spheres -->
          <a3d-metaball-sphere [orbit]="{ radius: 0.5, speed: 0.4 }" [radius]="0.3" />
          <a3d-metaball-sphere [orbit]="{ radius: 0.3, speed: 0.6, phase: 3.14 }" [radius]="0.2" />

          <!-- Cursor follower -->
          <a3d-metaball-cursor
            [radiusMin]="0.08"
            [radiusMax]="0.2"
            [glowIntensity]="0.4"
            [glowRadius]="1.5"
            [smoothness]="0.1"
          />
        </a3d-metaball-scene>
      </a3d-scene-3d>

      <!-- HTML Overlay Content -->
      <div
        class="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
      >
        <h1 class="text-6xl font-bold text-white mb-4 pointer-events-auto">
          Build Production Grade AI Apps
        </h1>
        <p class="text-xl text-white/70 mb-8 pointer-events-auto">
          With TypeScript Patterns You Already Know
        </p>
        <div class="flex gap-4 pointer-events-auto">
          <a
            href="#get-started"
            class="px-8 py-3 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/20 hover:bg-white/20 transition-all"
          >
            Get Started
          </a>
          <a
            href="#learn-more"
            class="px-8 py-3 bg-indigo-600 rounded-full text-white hover:bg-indigo-700 transition-all"
          >
            Learn More
          </a>
        </div>
      </div>
    </section>
  `,
})
export class MetaballHeroSectionComponent {
  readonly backgroundHex = getPresetBackgroundHex('holographic');
}
```

#### 5.2 Wire Metaball Hero into Landing Page

**File**: Update the landing page component/route to include MetaballHeroSectionComponent.

The developer should check the landing page component to determine whether this replaces `brand-hero-section-space` or is added alongside it.

---

## Integration Architecture

### Rendering Architecture Change

**Before**: Local Scene3DComponent wraps NgtCanvas (angular-three), which manages its own THREE.js context and renders scene graph components passed via `[sceneGraph]` input.

**After**: Library Scene3dComponent creates its own WebGPU/WebGL renderer, Scene, Camera. Child components inject `SceneService` to add objects to the scene.

**Impact**: All scene graph components (hero-scene-graph, hero-space-scene, cta-scene-graph, value-propositions-3d-scene) must be refactored from the `[sceneGraph]` pattern to the content projection pattern. Their templates change from using ngt-_ elements to using a3d-_ components.

### Selector Prefix Migration

All template selectors change from `app-*` to `a3d-*`:

- `<app-scene-3d>` -> `<a3d-scene-3d>`
- `<app-planet>` -> `<a3d-planet>`
- `<app-star-field-enhanced>` -> `<a3d-star-field>`
- `<app-nebula>` -> `<a3d-nebula>`
- `<app-orbit-controls>` -> `<a3d-orbit-controls>`
- `<app-bloom-effect>` -> `<a3d-bloom-effect>`
- `<app-scene-lighting>` -> `<a3d-scene-lighting>`
- `<app-gltf-model>` -> `<a3d-gltf-model>`
- `<app-svg-icon>` -> `<a3d-svg-icon>`
- `<app-polyhedron>` -> `<a3d-polyhedron>`
- `<app-box>` -> `<a3d-box>`
- `<app-cylinder>` -> `<a3d-cylinder>`
- `<app-torus>` -> `<a3d-torus>`
- etc.

---

## Quality Requirements

### Functional Requirements

- All existing landing page sections render correctly after migration
- Metaball hero section displays with interactive cursor following
- Scroll animations continue to work (GSAP directives preserved)
- 3D scenes render with WebGPU (or WebGL fallback)
- No angular-three dependencies remain in the build

### Non-Functional Requirements

- **Performance**: WebGPU renderer should match or exceed angular-three NgtCanvas performance
- **Bundle Size**: Removing angular-three should reduce bundle size
- **Compatibility**: WebGL fallback must work on browsers without WebGPU

### Build Verification

- `npx nx build dev-brand-ui` must pass with zero errors
- `npx nx lint dev-brand-ui` must pass
- No TypeScript errors related to imports

---

## Team-Leader Handoff

### Developer Type Recommendation

**Recommended Developer**: frontend-developer

**Rationale**:

- All changes are in Angular UI application code
- Requires understanding of Angular standalone components, signals, and template syntax
- Requires understanding of Three.js and WebGPU rendering concepts
- Template selector migrations require careful attention to detail
- GSAP animation directives are pure DOM manipulation

### Complexity Assessment

**Complexity**: HIGH
**Estimated Effort**: 12-16 hours

**Breakdown**:

- Batch 1 (Cleanup & Relocation): 2-3 hours
- Batch 2 (Scene Graph Rewrites): 4-5 hours (value-propositions-3d-scene is hardest)
- Batch 3 (Section Import Migration): 2-3 hours
- Batch 4 (Shared Component Migration): 1 hour
- Batch 5 (Metaball Hero): 2-3 hours
- Testing & Verification: 1-2 hours

### Files Affected Summary

**CREATE**:

- `apps/dev-brand-ui/src/app/core/gsap-animations/scroll-animation.directive.ts`
- `apps/dev-brand-ui/src/app/core/gsap-animations/section-sticky.directive.ts`
- `apps/dev-brand-ui/src/app/core/gsap-animations/hijacked-scroll.directive.ts`
- `apps/dev-brand-ui/src/app/core/gsap-animations/hijacked-scroll-item.directive.ts`
- `apps/dev-brand-ui/src/app/core/gsap-animations/index.ts`
- `apps/dev-brand-ui/src/app/core/config/colors.config.ts`
- `apps/dev-brand-ui/src/app/core/stores/space-theme.store.ts`
- `apps/dev-brand-ui/src/app/core/types/space-theme.types.ts`
- `apps/dev-brand-ui/src/app/core/types/scene-lighting.types.ts`
- `apps/dev-brand-ui/src/app/core/utils/viewport-3d-positioning.ts`
- `apps/dev-brand-ui/src/app/features/landing-page/sections/metaball-hero-section.component.ts`

**DELETE**:

- `apps/dev-brand-ui/src/app/core/angular-3d/` (entire directory, 57 files)

**MODIFY**:

- `package.json` (remove angular-three packages and overrides)
- `apps/dev-brand-ui/src/main.ts` (remove registerAngularThreePrimitives)
- `apps/dev-brand-ui/eslint.config.mjs` (remove angular-3d exemption)
- `apps/dev-brand-ui/src/app/__eslint-tests__/no-direct-threejs.spec.ts` (review/update)
- All 18 consumer files (import path updates + selector changes)

**REWRITE**:

- `hero-space-scene.component.ts` (17 import changes + template selector migration)
- `hero-scene-graph.component.ts` (9 import changes + template selector migration)
- `cta-scene-graph.component.ts` (remove angular-three extend(), rewrite ngt-_ to a3d-_)
- `value-propositions-3d-scene.component.ts` (complete rewrite from ngt-\* to library components)

### Critical Verification Points

**Before Implementation, Developer Must Verify**:

1. **All library component selectors**: Read the library d.ts file to confirm exact selectors for each component (a3d-scene-3d, a3d-planet, a3d-star-field, etc.)

2. **Component input compatibility**: Verify that library component inputs match the local component inputs used in templates. Key areas:

   - SmokeTroikaTextComponent vs SmokeParticleTextComponent (different props)
   - StarFieldComponent vs StarFieldEnhancedComponent (different props)
   - ParticleTextComponent vs InstancedParticleTextComponent (different props)
   - Scene3dComponent vs Scene3DComponent (completely different architecture)

3. **Scene3dComponent architecture**: The library's Scene3dComponent does NOT accept a `[sceneGraph]` input. Scene graph components must be refactored to be children of `<a3d-scene-3d>` and inject `SceneService` from the library.

4. **No angular-three remnants**: After migration, grep for `angular-three`, `NgtCanvas`, `NgtArgs`, `extend(`, `ngt-` to ensure complete removal.

5. **Colors3D availability**: Ensure relocated colors.config.ts has no dependencies on deleted angular-3d modules.

### Architecture Delivery Checklist

- [x] All components specified with evidence (d.ts line citations)
- [x] All patterns verified from codebase (19 consumer files analyzed)
- [x] All imports/decorators verified as existing (export list from d.ts line 12335)
- [x] Quality requirements defined
- [x] Integration points documented (rendering architecture change)
- [x] Files affected list complete (11 create, 57 delete, 22+ modify)
- [x] Developer type recommended (frontend-developer)
- [x] Complexity assessed (HIGH, 12-16 hours)
- [x] Critical API differences documented (local vs library naming)
- [x] Local-only modules identified and relocation planned
