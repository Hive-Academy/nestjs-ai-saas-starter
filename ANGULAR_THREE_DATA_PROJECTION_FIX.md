# Angular Three Data Projection Fix - Implementation Report

**Date:** 2025-10-18
**Issue:** Content projection doesn't work through Angular Three's `[sceneGraph]` pattern
**Solution:** Pass sphere/cube data as inputs instead of projecting components

---

## Problem Summary

Angular Three's `[sceneGraph]` pattern doesn't support Angular content projection (`<ng-content>`). When you pass a component class to `[sceneGraph]`, Angular Three instantiates that component and only renders **its template** - any content projected from the parent via `<ng-content>` is ignored.

### Before (Broken):

```html
<app-hybrid-scene>
  @for (circle of heroCircles(); track circle.id) {
  <app-floating-sphere [position]="..." [color]="..." /> ❌ NOT RENDERED }
</app-hybrid-scene>
```

**Result:** Empty canvas, no spheres/cubes visible

---

## Solution Implemented

### Architecture: Data-Driven Rendering

Instead of projecting components, we pass **data arrays** as inputs and render inside the sceneGraph component.

```
HeroSectionComponent
  └─> heroCircles(): SphereData[]        (computed signal)
  └─> backgroundCubes(): CubeData[]      (computed signal)
        ↓
  <app-hybrid-scene [spheres]="..." [cubes]="...">
        ↓
  SceneConfigService (signal-based config)
        ↓
  HybridSceneGraphComponent (inside NgtCanvas)
    └─> @for (sphere of config().spheres) { ... } ✅ RENDERS!
```

---

## Implementation Steps

### 1. Created Type Interfaces

**File:** `hybrid-scene-graph.component.ts`

```typescript
export interface SphereData {
  id: string;
  position: { x: number; y: number; z: number };
  radius: number;
  color: number;
  metalness?: number;
  roughness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  floatHeight?: number;
  floatSpeed?: number;
  floatDelay?: number;
  autoStart?: boolean;
}

export interface CubeData {
  id: string;
  position: [number, number, number];
  size: number;
  color: number;
  rotation?: [number, number, number];
  opacity?: number;
}
```

### 2. Updated SceneConfigService

**File:** `scene-config.service.ts`

```typescript
export interface SceneConfig {
  // ... existing camera/lighting config
  spheres: SphereData[];
  cubes: CubeData[];
}
```

### 3. Modified HybridSceneGraphComponent Template

**File:** `hybrid-scene-graph.component.ts`

```html
<!-- Render spheres from data -->
@for (sphere of config().spheres; track sphere.id) {
<app-floating-sphere
  [position]="[sphere.position.x, sphere.position.y, sphere.position.z]"
  [radius]="sphere.radius"
  [color]="sphere.color"
  [metalness]="sphere.metalness ?? 0.3"
  [floatConfig]="{
      height: sphere.floatHeight ?? 0.3,
      speed: sphere.floatSpeed ?? 1500,
      delay: sphere.floatDelay ?? 0,
      autoStart: sphere.autoStart ?? true
    }"
/>
}

<!-- Render cubes from data -->
@for (cube of config().cubes; track cube.id) {
<app-background-cube
  [position]="cube.position"
  [size]="cube.size"
  [color]="cube.color"
  [rotation]="cube.rotation ?? [0, 0, 0]"
  [opacity]="cube.opacity ?? 0.6"
/>
}
```

### 4. Wired Inputs Through HybridSceneComponent

**File:** `hybrid-scene.component.ts`

```typescript
export class HybridSceneComponent {
  // Scene content inputs
  readonly spheres = input<SphereData[]>([]);
  readonly cubes = input<CubeData[]>([]);

  constructor() {
    // Sync sphere/cube data to SceneConfigService
    effect(() => {
      this.sceneConfig.setConfig({
        spheres: this.spheres(),
        cubes: this.cubes(),
      });
    });
  }
}
```

### 5. Converted Hero Section Data

**File:** `hero-section.component.ts`

```typescript
// Convert to SphereData[] format
readonly heroCircles = computed((): SphereData[] => {
  return this.heroCirclesData().map((circle, idx) => ({
    id: circle.id,
    position: circle.position,
    radius: circle.scale * 0.8,
    color: this.parseColor(circle.color),
    metalness: 0.3,
    roughness: 0.1,
    emissive: this.parseColor(circle.color),
    emissiveIntensity: 0.2,
    floatHeight: 0.3,
    floatSpeed: 1500,
    floatDelay: idx * 200,
    autoStart: this.isLoaded(),
  }));
});

// Convert to CubeData[] format
readonly backgroundCubes = computed((): CubeData[] => {
  const cubes: CubeData[] = [];
  // ... generate 35 cubes with proper data structure
  return cubes;
});
```

### 6. Updated Template

**File:** `hero-section.component.ts` (template)

```html
<app-hybrid-scene
  [backgroundColor]="'transparent'"
  [cameraPosition]="[0, 0, 15]"
  [cameraTarget]="[0, 0, -5]"
  [spheres]="heroCircles()"
  [cubes]="backgroundCubes()"
  (sceneInitialized)="onSceneInitialized($event)"
>
  <!-- DOM content still projected normally -->
</app-hybrid-scene>
```

---

## Issues Fixed

### ✅ Spheres and Cubes Rendering

- **Before:** Empty canvas, no 3D objects visible
- **After:** All 5 spheres and 35 background cubes render correctly

### ✅ Dark Overlay Removed

- **Before:** Dark `#0a0a15` background blocking view of cubes
- **After:** Changed to `transparent`, CSS gradient shows through

---

## Issues Remaining

### ⚠️ Floating Animations Not Working

- **Symptom:** Spheres are static, no up/down floating motion
- **Possible Cause:** `float3d` directive not applying GSAP animations
- **Investigation Needed:** Check if Float3dDirective is receiving config and starting animations

### ⚠️ Glow Effects Not Visible

- **Symptom:** No emissive glow around spheres
- **Possible Cause:** `glow3d` directive not creating glow mesh or glow intensity too low
- **Investigation Needed:** Check Glow3dDirective implementation and emissive material properties

### ⚠️ No Mouse Interaction

- **Symptom:** Camera doesn't respond to mouse movement
- **Possible Cause:** Mouse tracking sets `this.mousePosition` but doesn't update camera
- **Note:** Comment in code says "Future enhancement" - feature not yet implemented

---

## Benefits of This Approach

1. **Works with Angular Three's architecture** - Respects sceneGraph pattern limitations
2. **Reactive and performant** - Uses signals throughout the data flow
3. **Type-safe** - Full TypeScript type checking for sphere/cube data
4. **Maintainable** - Clear data flow: Component → Input → Service → SceneGraph
5. **Scalable** - Easy to add more primitive types (toruses, cylinders, etc.)

---

## Next Steps

1. **Fix floating animations** - Debug Float3dDirective to ensure GSAP animations start
2. **Fix glow effects** - Debug Glow3dDirective to ensure emissive materials render
3. **Implement camera interaction** - Use `mousePosition` to add subtle camera movement
4. **Performance testing** - Verify smooth 60fps with all 40 objects (5 spheres + 35 cubes)
5. **Re-enable element3d directive** - Once 3D scene is stable, add DOM-to-texture mapping

---

## Files Modified

- `hybrid-scene-graph.component.ts` - Added SphereData/CubeData types, template with @for loops
- `scene-config.service.ts` - Added spheres/cubes arrays to SceneConfig
- `hybrid-scene.component.ts` - Added spheres/cubes inputs, effect to sync to service
- `hero-section.component.ts` - Converted data to SphereData[]/CubeData[], updated template
- Removed unused imports: FloatingSphereComponent, BackgroundCubeComponent from hero-section

---

**Status:** ✅ Data projection working, spheres/cubes rendering
**Next:** 🔧 Debug floating/glow directive integration
