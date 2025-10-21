# Hero Section Migration Plan - TASK_2025_014

**Task**: Migrate hero-section.component.ts from imperative THREE.js to declarative Angular Three primitives
**Date**: 2025-10-17
**Status**: 🎯 PLANNING COMPLETE - Ready for Implementation

---

## Executive Summary

### Current State (Imperative)

- **Lines of Code**: 952 lines (379 TypeScript + 573 template/styles)
- **THREE.js Objects**: Manually created Scene, Camera, Renderer, Meshes (60+ lines)
- **Animation**: Manual GSAP + RAF loop (230+ lines)
- **Lifecycle**: Manual setup/cleanup with OnDestroy (50+ lines)
- **Lighting**: Manual THREE.Light creation (25 lines)
- **Responsive**: Manual resize handlers (30 lines)

### Target State (Declarative)

- **Estimated Lines**: ~250 lines (65% reduction)
- **Components**: app-floating-sphere (5x), app-background-cube (35x)
- **Directives**: float3d, performance3d, glow3d (composition pattern)
- **Scene**: app-hybrid-scene (handles all Three.js boilerplate)
- **Animation**: Declarative via directives (zero manual code)
- **Lifecycle**: Automatic (handled by Angular Three)

### Migration Benefits

✅ **Code Reduction**: 65% less code (952 → ~250 lines)
✅ **Maintainability**: Declarative vs imperative (easier to read/modify)
✅ **Type Safety**: THREE.Mesh types enforced by components
✅ **Reusability**: Components can be used across multiple pages
✅ **Performance**: Automatic optimization via performance3d directive
✅ **Testing**: Components independently testable

---

## Current Implementation Analysis

### 1. Manual THREE.js Scene Setup (Lines 522-552)

**Current Code** (30 lines):

```typescript
private async init3DScene(): Promise<void> {
  this.scene = new THREE.Scene();
  this.scene.fog = new THREE.Fog(0x000000, 10, 50);

  this.camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  this.camera.position.set(0, 0, 15);

  this.renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  this.renderer.setSize(window.innerWidth, window.innerHeight);
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  this.renderer.shadowMap.enabled = true;
  this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // ...more configuration

  this.sceneContainer.nativeElement.appendChild(this.renderer.domElement);
}
```

**Replacement**: ✅ app-hybrid-scene component (0 lines)

**Migration**: Use `<app-hybrid-scene>` with signal inputs

```html
<app-hybrid-scene
  [backgroundColor]="'#000000'"
  [enableShadows]="true"
  [performanceTarget]="'desktop'"
  [cameraPosition]="[0, 0, 12]"
  [antialias]="true"
  [alpha]="true"
  [powerPreference]="'high-performance'"
  [enableAnimation]="true"
>
  <!-- 3D primitives here -->
</app-hybrid-scene>
```

**Eliminated**:

- ❌ Manual scene creation (4 lines)
- ❌ Manual camera setup (7 lines)
- ❌ Manual renderer configuration (17 lines)
- ❌ DOM appendChild logic (2 lines)

---

### 2. Manual Floating Spheres Creation (Lines 554-611)

**Current Code** (57 lines):

```typescript
private createAgentConstellation(): void {
  const circles = this.heroCircles();

  circles.forEach((circle, index) => {
    const geometry = new THREE.SphereGeometry(0.8, 32, 32);

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(circle.color),
      metalness: 0.3,
      roughness: 0.1,
      clearcoat: 1.0,
      // ...more material config (14 lines)
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(new THREE.Vector3(
      circle.position.x,
      circle.position.y,
      circle.position.z
    ));
    mesh.scale.setScalar(circle.scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Glow effect (11 lines)
    const glowGeometry = new THREE.SphereGeometry(1.2, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({...});
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glowMesh);

    this.scene.add(mesh);
    this.agentMeshes.push(mesh);

    // Animation setup (3 lines)
    gsap.set(mesh.scale, { x: 0, y: 0, z: 0 });
    gsap.set(mesh.position, { y: mesh.position.y - 5 });
  });
}
```

**Replacement**: ✅ app-floating-sphere component (5-10 lines per sphere)

**Migration**:

```html
@for (circle of heroCircles(); track circle.id) {
<app-floating-sphere
  [position]="[circle.position.x, circle.position.y, circle.position.z]"
  [radius]="circle.scale * 0.8"
  [color]="parseColor(circle.color)"
  [metalness]="0.3"
  [roughness]="0.1"
  [clearcoat]="1.0"
  [emissive]="parseColor(circle.color)"
  [emissiveIntensity]="0.2"
  float3d
  [floatHeight]="0.3"
  [floatSpeed]="1500 + (circle.id | hashToNumber) % 1000"
  performance3d
  glow3d
  [glowColor]="parseColor(circle.color)"
/>
}
```

**Eliminated**:

- ❌ Manual geometry creation (1 line × 5 = 5 lines)
- ❌ Manual material configuration (15 lines × 5 = 75 lines)
- ❌ Manual mesh creation and positioning (8 lines × 5 = 40 lines)
- ❌ Manual glow effect (11 lines × 5 = 55 lines)
- ❌ Manual GSAP animation setup (3 lines × 5 = 15 lines)
- ❌ Manual scene addition and tracking (3 lines × 5 = 15 lines)

**Total Eliminated**: 205 lines → 50 lines declarative HTML

---

### 3. Manual Background Cubes Creation (Lines 684-776)

**Current Code** (92 lines):

```typescript
private createBackgroundCubes(): void {
  const cubeCount = 35;
  const cubeColors = ['#2d1b47', '#1a0d2e', ...];

  for (let i = 0; i < cubeCount; i++) {
    const size = 0.8 + Math.random() * 1.8;
    const geometry = new THREE.BoxGeometry(size, size, size);

    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(cubeColors[Math.floor(Math.random() * cubeColors.length)]),
      transparent: true,
      opacity: 0.6,
    });

    const cube = new THREE.Mesh(geometry, material);

    // Complex positioning logic (45 lines)
    let x = 0; let y = 0; let z = 0;
    const zone = Math.floor(Math.random() * 4);
    switch (zone) {
      case 0: x = ...; y = 8 + ...; z = ...; break;
      // ...3 more cases (40 lines)
    }

    // Exclusion zone logic (9 lines)
    if (Math.abs(x) < 12 && Math.abs(y) < 8) {
      if (Math.abs(x) > Math.abs(y)) {
        x = x > 0 ? 15 + Math.random() * 10 : -15 - Math.random() * 10;
      } else {
        y = y > 0 ? 10 + Math.random() * 8 : -10 - Math.random() * 8;
      }
    }

    cube.position.set(x, y, z);
    cube.rotation.set(Math.random() * Math.PI, ...);
    cube.castShadow = true;
    cube.receiveShadow = true;

    // Store original position (7 lines)
    cube.userData['originalPosition'] = { x, y, z };
    cube.userData['originalRotation'] = {...};

    this.scene.add(cube);
    this.agentMeshes.push(cube);
  }
}
```

**Replacement**: ✅ app-background-cube component (2-3 lines per cube)

**Migration Strategy**:

**Option A: Pre-computed Positions** (Recommended):

```typescript
// In component
readonly backgroundCubes = computed(() => {
  const cubes = [];
  const cubeColors = ['#2d1b47', '#1a0d2e', '#0f0a1c', '#1e1139', '#261242', '#0a0a15'];

  for (let i = 0; i < 35; i++) {
    const zone = Math.floor(Math.random() * 4);
    const position = this.generateZonedPosition(zone, i);

    cubes.push({
      id: `bg-cube-${i}`,
      position,
      size: 0.8 + Math.random() * 1.8,
      color: cubeColors[Math.floor(Math.random() * cubeColors.length)],
      rotation: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ] as const
    });
  }

  return cubes;
});

private generateZonedPosition(zone: number, index: number): [number, number, number] {
  let x = 0, y = 0, z = 0;

  switch (zone) {
    case 0: // Top area
      x = (Math.random() - 0.5) * 50;
      y = 8 + Math.random() * 15;
      z = -8 + Math.random() * -20;
      break;
    case 1: // Bottom area
      x = (Math.random() - 0.5) * 50;
      y = -8 - Math.random() * 15;
      z = -8 + Math.random() * -20;
      break;
    case 2: // Left side
      x = -15 - Math.random() * 25;
      y = (Math.random() - 0.5) * 30;
      z = -8 + Math.random() * -20;
      break;
    case 3: // Right side
      x = 15 + Math.random() * 25;
      y = (Math.random() - 0.5) * 30;
      z = -8 + Math.random() * -20;
      break;
  }

  // Exclusion zone
  if (Math.abs(x) < 12 && Math.abs(y) < 8) {
    if (Math.abs(x) > Math.abs(y)) {
      x = x > 0 ? 15 + Math.random() * 10 : -15 - Math.random() * 10;
    } else {
      y = y > 0 ? 10 + Math.random() * 8 : -10 - Math.random() * 8;
    }
  }

  return [x, y, z];
}
```

**Template**:

```html
@for (cube of backgroundCubes(); track cube.id) {
<app-background-cube
  [position]="cube.position"
  [size]="cube.size"
  [color]="parseColor(cube.color)"
  [rotation]="cube.rotation"
  [transparent]="true"
  [opacity]="0.6"
  performance3d
/>
}
```

**Eliminated**:

- ❌ Manual geometry creation (2 lines × 35 = 70 lines)
- ❌ Manual material configuration (5 lines × 35 = 175 lines)
- ❌ Manual positioning logic (60 lines shared → 30 lines in helper)
- ❌ Manual scene addition and tracking (2 lines × 35 = 70 lines)

**Total**: 92 lines imperative → ~50 lines TypeScript + 10 lines HTML

---

### 4. Manual Lighting Setup (Lines 778-803)

**Current Code** (25 lines):

```typescript
private setupLighting(): void {
  const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
  this.scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 10, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  this.scene.add(directionalLight);

  const light1 = new THREE.PointLight(0x8a2be2, 0.8, 50);
  light1.position.set(-10, 5, 5);
  this.scene.add(light1);

  const light2 = new THREE.PointLight(0x00bfff, 0.8, 50);
  light2.position.set(10, -5, 5);
  this.scene.add(light2);

  const light3 = new THREE.PointLight(0xff69b4, 0.6, 40);
  light3.position.set(0, 10, -5);
  this.scene.add(light3);
}
```

**Replacement**: ✅ app-hybrid-scene signal inputs (5 lines)

**Migration**:

```html
<app-hybrid-scene
  [ambientLightColor]="0x404040"
  [ambientLightIntensity]="0.4"
  [directionalLightColor]="0xffffff"
  [directionalLightIntensity]="1.0"
  [directionalLightPosition]="[10, 10, 10]"
  [directionalShadowsEnabled]="true"
  [shadowMapSize]="2048"
  [pointLightColor]="0x8a2be2"
  [pointLightIntensity]="0.8"
  [pointLightPosition]="[-10, 5, 5]"
></app-hybrid-scene>
```

**Note**: HybridSceneComponent currently supports 1 point light. For multiple colored accent lights, we have 2 options:

**Option A: Enhance HybridSceneComponent** (Recommended):

- Add `accentLights` input accepting array of light configurations
- Modify setupSceneLighting() to create multiple point lights
- Minimal changes (20 lines added to hybrid-scene.component.ts)

**Option B: Create Custom Light Components**:

- Create `app-point-light` component using Angular Three `ngt-point-light`
- More flexible but requires additional primitive components

**Eliminated**:

- ❌ Manual light creation (12 lines)
- ❌ Manual light positioning (5 lines)
- ❌ Manual scene addition (6 lines)
- ❌ Shadow configuration (2 lines)

---

### 5. Manual Animation Loop (Lines 854-932)

**Current Code** (78 lines):

```typescript
private startRenderLoop(): void {
  const animate = () => {
    this.animationFrame = requestAnimationFrame(animate);

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Camera rotation based on mouse (10 lines)
    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * deltaTime * 5;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * deltaTime * 5;
    this.camera.position.x = Math.sin(this.currentRotation.y) * 12;
    this.camera.position.z = Math.cos(this.currentRotation.y) * 12;
    this.camera.position.y = this.currentRotation.x * 6;
    this.camera.lookAt(0, 0, 0);

    // Mesh animation (55 lines)
    this.agentMeshes.forEach((mesh, index) => {
      const originalPos = mesh.userData['originalPosition'];
      if (originalPos) {
        if (index < 5) {
          // Floating circles (15 lines)
          mesh.position.y = originalPos.y + Math.sin(elapsedTime * 1.5 + index) * 0.3;
          mesh.rotation.x = elapsedTime * 0.01 + this.currentRotation.x * 0.6;
          mesh.rotation.y = elapsedTime * 0.02 + this.currentRotation.y * 0.8;
          mesh.position.x = originalPos.x + this.currentRotation.y * 2.0;
          mesh.position.z = originalPos.z + this.currentRotation.x * 1.2;
        } else {
          // Background cubes (20 lines)
          const originalRot = mesh.userData['originalRotation'];
          mesh.rotation.x = originalRot.x + elapsedTime * 0.02 + this.currentRotation.x * 0.3;
          // ...more rotation and position updates
        }
      }
    });

    // Particle system animation (8 lines)
    if (this.particleSystem) {
      this.particleSystem.rotation.y = this.currentRotation.y * 0.3;
      this.particleSystem.rotation.x = this.currentRotation.x * 0.15;
      this.particleSystem.position.x = this.currentRotation.y * 0.5;
      this.particleSystem.position.y = this.currentRotation.x * 0.3;
    }

    this.renderer.render(this.scene, this.camera);
  };

  animate();
}
```

**Replacement**: ✅ float3d directive + Angular Three automatic rendering (0 lines)

**Migration**:

- **Floating Animation**: Handled by `float3d` directive (automatically applied to spheres)
- **Rotation Animation**: Handled by `performance3d` directive (automatic RAF loop)
- **Rendering**: Handled by Angular Three's NgtCanvas (automatic)
- **Mouse Tracking**: Can be kept for camera movement OR use OrbitControls

**Eliminated**:

- ❌ Manual RAF loop (4 lines)
- ❌ Manual clock tracking (2 lines)
- ❌ Manual mesh animation (55 lines)
- ❌ Manual particle animation (8 lines)
- ❌ Manual render call (1 line)
- ❌ Cleanup logic in ngOnDestroy (8 lines)

**Total**: 78 lines → 0 lines (handled by directives)

---

### 6. Manual Resize Handling (Lines 489-520)

**Current Code** (31 lines):

```typescript
private setupResponsiveHandling(): void {
  const handleResize = () => {
    this.sceneWidth.set(window.innerWidth);
    this.sceneHeight.set(window.innerHeight);
    this.updateShapePositions();
  };

  window.addEventListener('resize', handleResize);
}

private updateShapePositions(): void {
  if (this.camera && this.renderer) {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
```

**Replacement**: ✅ app-hybrid-scene automatic resize (0 lines)

**Migration**: app-hybrid-scene handles resize automatically (lines 677-716 in hybrid-scene.component.ts)

**Eliminated**:

- ❌ Manual resize event listener (5 lines)
- ❌ Manual camera aspect update (3 lines)
- ❌ Manual renderer resize (2 lines)

---

### 7. Manual Entrance Animation (Lines 805-852)

**Current Code** (47 lines):

```typescript
private cinematicEntrance(): void {
  // Camera entrance (7 lines)
  gsap.fromTo(
    this.camera.position,
    { z: 30, y: -5 },
    { z: 12, y: 0, duration: 2.5, ease: 'power2.out' }
  );

  // Mesh entrance (19 lines)
  this.agentMeshes.forEach((mesh, index) => {
    gsap.to(mesh.scale, {
      x: 1, y: 1, z: 1,
      duration: 1.2,
      delay: index * 0.2,
      ease: 'back.out(1.4)',
    });

    gsap.to(mesh.position, {
      y: mesh.userData['originalPosition']?.y || mesh.position.y + 5,
      duration: 1.5,
      delay: index * 0.2,
      ease: 'power2.out',
    });
  });

  // Particle fade in (7 lines)
  gsap.fromTo(
    this.particleSystem.material,
    { opacity: 0 },
    { opacity: 0.6, duration: 3, delay: 0.8 }
  );

  // Content visibility (3 lines)
  setTimeout(() => {
    this.contentVisible.set(true);
  }, 1500);
}
```

**Replacement**: CSS animations + float3d directive auto-start

**Migration**:

- **Component Entrance**: CSS `@keyframes slideUp` animation (already in template)
- **Mesh Entrance**: float3d directive with `[autoStart]="true"` + staggered delays
- **Camera Movement**: Angular Three camera animation or HybridSceneComponent method
- **Content Visibility**: CSS animation triggered by `contentVisible()` signal

**Template**:

```html
@for (circle of heroCircles(); track circle.id; let idx = $index) {
<app-floating-sphere ... float3d [floatDelay]="idx * 200" [autoStart]="true" />
}
```

**Eliminated**:

- ❌ Manual GSAP camera animation (7 lines)
- ❌ Manual GSAP mesh entrance (19 lines)
- ❌ Manual particle fade in (7 lines)

**Total**: 47 lines → CSS animations + directive attributes

---

## Migration Implementation Plan

### Phase 1: Setup and Infrastructure (30 minutes)

#### Task 1.1: Export Component Barrel

**File**: `apps/dev-brand-ui/src/app/core/angular-3d/components/primitives/index.ts`

```typescript
export { FloatingSphereComponent } from './floating-sphere.component';
export { BackgroundCubeComponent } from './background-cube.component';
export { CylinderComponent } from './cylinder.component';
export { TorusComponent } from './torus.component';
```

#### Task 1.2: Export Directive Barrel

**File**: `apps/dev-brand-ui/src/app/core/angular-3d/directives/index.ts`

```typescript
export { Float3dDirective } from './float-3d.directive';
export { Performance3dDirective } from './performance-3d.directive';
export { Glow3dDirective } from './glow-3d.directive';
```

#### Task 1.3: Create Color Helper

**File**: `apps/dev-brand-ui/src/app/features/landing-page/sections/hero-section.component.ts`

```typescript
// Add helper method to convert hex string to number
private parseColor(hex: string): number {
  return parseInt(hex.replace('#', '0x'), 16);
}
```

---

### Phase 2: Component Replacement (1.5 hours)

#### Task 2.1: Replace Scene Setup

**Remove**:

```typescript
@ViewChild('sceneContainer', { static: true }) sceneContainer!: ElementRef;
private scene!: THREE.Scene;
private camera!: THREE.PerspectiveCamera;
private renderer!: THREE.WebGLRenderer;
// ...all THREE.js properties
```

**Add to imports**:

```typescript
import { HybridSceneComponent } from '../../../core/angular-3d/components/hybrid-scene.component';
import {
  FloatingSphereComponent,
  BackgroundCubeComponent,
} from '../../../core/angular-3d/components/primitives';
import {
  Float3dDirective,
  Performance3dDirective,
  Glow3dDirective,
} from '../../../core/angular-3d/directives';
```

**Update component decorator**:

```typescript
@Component({
  selector: 'brand-hero-section',
  standalone: true,
  imports: [
    CommonModule,
    HybridSceneComponent,
    FloatingSphereComponent,
    BackgroundCubeComponent,
    Float3dDirective,
    Performance3dDirective,
    Glow3dDirective
  ],
  // ... rest
})
```

#### Task 2.2: Replace Template - Scene Container

**Before**:

```html
<div class="absolute inset-0 z-10" #sceneContainer></div>
```

**After**:

```html
<app-hybrid-scene
  class="absolute inset-0 z-10"
  [backgroundColor]="'#000000'"
  [cameraPosition]="[0, 0, 12]"
  [cameraTarget]="[0, 0, 0]"
  [enableShadows]="true"
  [antialias]="true"
  [alpha]="true"
  [powerPreference]="'high-performance'"
  [performanceTarget]="'desktop'"
  [enableAnimation]="true"
  [ambientLightColor]="0x404040"
  [ambientLightIntensity]="0.4"
  [directionalLightColor]="0xffffff"
  [directionalLightIntensity]="1.0"
  [directionalLightPosition]="[10, 10, 10]"
  [directionalShadowsEnabled]="true"
  [shadowMapSize]="2048"
  [pointLightColor]="0x8a2be2"
  [pointLightIntensity]="0.8"
  [pointLightPosition]="[-10, 5, 5]"
  [enablePerformanceOverlay]="showPerformanceDebug()"
  (sceneInitialized)="onSceneInitialized($event)"
>
  <!-- Floating Spheres -->
  @for (circle of heroCircles(); track circle.id; let idx = $index) {
  <app-floating-sphere
    [position]="[circle.position.x, circle.position.y, circle.position.z]"
    [radius]="circle.scale * 0.8"
    [color]="parseColor(circle.color)"
    [metalness]="0.3"
    [roughness]="0.1"
    [clearcoat]="1.0"
    [clearcoatRoughness]="0.1"
    [transmission]="0.1"
    [emissive]="parseColor(circle.color)"
    [emissiveIntensity]="0.2"
    float3d
    [floatHeight]="0.3"
    [floatSpeed]="1500"
    [floatDelay]="idx * 200"
    [autoStart]="isLoaded()"
    performance3d
    glow3d
    [glowColor]="parseColor(circle.color)"
  />
  }

  <!-- Background Cubes -->
  @for (cube of backgroundCubes(); track cube.id) {
  <app-background-cube
    [position]="cube.position"
    [size]="cube.size"
    [color]="parseColor(cube.color)"
    [rotation]="cube.rotation"
    [transparent]="true"
    [opacity]="0.6"
    performance3d
  />
  }
</app-hybrid-scene>
```

#### Task 2.3: Update Component Logic

**Remove all manual THREE.js methods**:

```typescript
// DELETE:
private async init3DScene(): Promise<void> {...}
private createAgentConstellation(): void {...}
private createBackgroundCubes(): void {...}
private createParticleSystem(): void {...}
private setupLighting(): void {...}
private cinematicEntrance(): void {...}
private startRenderLoop(): void {...}
private updateShapePositions(): void {...}
private setupResponsiveHandling(): void {...}
```

**Add computed signal for background cubes**:

```typescript
readonly backgroundCubes = computed(() => {
  const cubes = [];
  const cubeColors = ['#2d1b47', '#1a0d2e', '#0f0a1c', '#1e1139', '#261242', '#0a0a15'];

  for (let i = 0; i < 35; i++) {
    const zone = Math.floor(Math.random() * 4);
    const position = this.generateZonedPosition(zone, i);

    cubes.push({
      id: `bg-cube-${i}`,
      position,
      size: 0.8 + Math.random() * 1.8,
      color: cubeColors[Math.floor(Math.random() * cubeColors.length)],
      rotation: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ] as const
    });
  }

  return cubes;
});

private generateZonedPosition(zone: number, index: number): [number, number, number] {
  let x = 0, y = 0, z = 0;

  switch (zone) {
    case 0: // Top area
      x = (Math.random() - 0.5) * 50;
      y = 8 + Math.random() * 15;
      z = -8 + Math.random() * -20;
      break;
    case 1: // Bottom area
      x = (Math.random() - 0.5) * 50;
      y = -8 - Math.random() * 15;
      z = -8 + Math.random() * -20;
      break;
    case 2: // Left side
      x = -15 - Math.random() * 25;
      y = (Math.random() - 0.5) * 30;
      z = -8 + Math.random() * -20;
      break;
    case 3: // Right side
      x = 15 + Math.random() * 25;
      y = (Math.random() - 0.5) * 30;
      z = -8 + Math.random() * -20;
      break;
  }

  // Exclusion zone
  if (Math.abs(x) < 12 && Math.abs(y) < 8) {
    if (Math.abs(x) > Math.abs(y)) {
      x = x > 0 ? 15 + Math.random() * 10 : -15 - Math.random() * 10;
    } else {
      y = y > 0 ? 10 + Math.random() * 8 : -10 - Math.random() * 8;
    }
  }

  return [x, y, z];
}

private parseColor(hex: string): number {
  return parseInt(hex.replace('#', '0x'), 16);
}

onSceneInitialized(scene: THREE.Scene): void {
  this.isLoaded.set(true);

  // Trigger content entrance animation
  setTimeout(() => {
    this.contentVisible.set(true);
  }, 1500);
}
```

**Simplified ngOnInit/ngOnDestroy**:

```typescript
ngOnInit(): void {
  // Only setup mouse tracking for potential camera movement
  this.setupMouseTracking();
}

ngOnDestroy(): void {
  // Angular Three handles all cleanup automatically
  // Remove mouse event listener if added
}
```

---

### Phase 3: Handle Particles (Optional Enhancement) (30 minutes)

**Option A: Skip Particles** (Simplest)

- Background cubes provide enough visual depth
- Focus on clean, minimal 3D scene
- Particles can be added later if needed

**Option B: Create Particle Component** (Advanced)

```typescript
// apps/dev-brand-ui/src/app/core/angular-3d/components/primitives/particle-system.component.ts
@Component({
  selector: 'app-particle-system',
  standalone: true,
  template: `
    <ngt-points #points>
      <ngt-buffer-geometry [attach]="'geometry'">
        <!-- Configure buffer attributes -->
      </ngt-buffer-geometry>
      <ngt-points-material
        [size]="size()"
        [sizeAttenuation]="true"
        [vertexColors]="true"
        [transparent]="true"
        [opacity]="opacity()"
        [blending]="blendingMode()"
      />
    </ngt-points>
  `,
})
export class ParticleSystemComponent {...}
```

**Recommendation**: Skip particles initially (Option A), focus on spheres + cubes migration

---

### Phase 4: Testing and Validation (1 hour)

#### Test 1: Visual Comparison

- **Before**: Take screenshot of current hero section
- **After**: Take screenshot of migrated hero section
- **Validate**: Side-by-side comparison for visual parity

#### Test 2: Performance Validation

- **Metrics**: FPS, Memory Usage, Render Time
- **Tool**: Performance overlay (HybridSceneComponent built-in)
- **Expected**: Similar or better performance (directives optimize automatically)

#### Test 3: Responsive Behavior

- **Test**: Resize window to mobile/tablet/desktop sizes
- **Validate**: Scene adapts correctly, no layout breaks

#### Test 4: Animation Smoothness

- **Validate**: Floating spheres animate smoothly
- **Validate**: Background cubes rotate correctly
- **Validate**: Content entrance animation works

---

## Code Reduction Metrics

### Before Migration

- **Total Lines**: 952 lines
- **Template**: 116 lines
- **TypeScript Logic**: 573 lines
- **Styles**: 263 lines

### After Migration (Estimated)

- **Total Lines**: ~250 lines (73% reduction)
- **Template**: 80 lines (includes app-hybrid-scene + primitives)
- **TypeScript Logic**: 120 lines (cube positioning + helpers)
- **Styles**: 50 lines (remove unused styles)

### Eliminated Code

| Category             | Before        | After | Reduction |
| -------------------- | ------------- | ----- | --------- |
| Scene Setup          | 30 lines      | 0     | 100%      |
| Camera/Renderer      | 20 lines      | 0     | 100%      |
| Manual Mesh Creation | 150 lines     | 0     | 100%      |
| Manual Lighting      | 25 lines      | 0     | 100%      |
| Animation Loop       | 78 lines      | 0     | 100%      |
| Resize Handling      | 31 lines      | 0     | 100%      |
| Entrance Animation   | 47 lines      | 0     | 100%      |
| **Total Eliminated** | **381 lines** | **0** | **100%**  |

---

## Benefits Analysis

### 1. Maintainability

✅ **Before**: Imperative THREE.js requires deep knowledge
✅ **After**: Declarative HTML + signals = self-documenting code

**Example - Adding a new sphere**:

```html
<!-- BEFORE: 57 lines of TypeScript -->
const geometry = new THREE.SphereGeometry(0.8, 32, 32); const material = new
THREE.MeshPhysicalMaterial({...}); const mesh = new THREE.Mesh(geometry, material); // ... 50 more
lines

<!-- AFTER: 10 lines of HTML -->
<app-floating-sphere
  [position]="[0, 2, -1]"
  [radius]="0.8"
  [color]="0xff0000"
  float3d
  performance3d
  glow3d
/>
```

### 2. Type Safety

✅ **Before**: `any` types, manual type assertions, runtime errors
✅ **After**: Strongly typed component inputs, compile-time validation

### 3. Reusability

✅ **Before**: Hero-specific code, cannot be reused elsewhere
✅ **After**: Components/directives can be used on ANY page

**Example Usage**:

```html
<!-- Use same primitives in About page -->
<app-hybrid-scene>
  <app-floating-sphere [position]="[0, 0, 0]" float3d />
  <app-background-cube [position]="[2, 0, 0]" />
</app-hybrid-scene>

<!-- Use in Pricing page -->
<app-hybrid-scene>
  <app-torus [position]="[0, 1, 0]" float3d glow3d />
</app-hybrid-scene>
```

### 4. Testing

✅ **Before**: Hard to test (tightly coupled THREE.js code)
✅ **After**: Easy to test (isolated components with inputs/outputs)

**Component Tests**:

```typescript
describe('FloatingSphereComponent', () => {
  it('should render with correct radius', () => {
    const fixture = TestBed.createComponent(FloatingSphereComponent);
    fixture.componentRef.setInput('radius', 2);
    fixture.detectChanges();

    const mesh = fixture.componentInstance.getMesh();
    expect(mesh).toBeTruthy();
    expect(mesh.geometry.parameters.radius).toBe(2);
  });
});
```

### 5. Performance

✅ **Before**: Manual optimization required
✅ **After**: Automatic via performance3d directive

**Automatic Optimizations**:

- Frustum culling (objects outside camera view not rendered)
- LOD (Level of Detail) based on distance
- Texture pooling and reuse
- Automatic dispose on component destroy

---

## Risk Assessment

### Technical Risks

#### Risk 1: Visual Parity

- **Description**: Migrated version might look different from current
- **Likelihood**: MEDIUM
- **Impact**: HIGH (user-facing visual change)
- **Mitigation**:
  1. Take before/after screenshots
  2. Match material properties exactly (metalness, roughness, clearcoat)
  3. Match lighting configuration precisely
  4. Use same color palette
- **Contingency**: Keep old component as backup, easy rollback

#### Risk 2: Performance Regression

- **Description**: New version might be slower
- **Likelihood**: LOW
- **Impact**: MEDIUM
- **Mitigation**:
  1. Use performance3d directive (automatic optimizations)
  2. Enable HybridSceneComponent performance overlay
  3. Compare FPS metrics before/after
  4. Profile with Chrome DevTools Performance tab
- **Contingency**: Tune directive settings, reduce cube count if needed

#### Risk 3: Animation Timing Mismatch

- **Description**: Entrance animations might not match exactly
- **Likelihood**: MEDIUM
- **Impact**: LOW (aesthetic, not functional)
- **Mitigation**:
  1. Use float3d [floatDelay] to stagger sphere entrance
  2. Match CSS animation timing to original GSAP timing
  3. Test entrance sequence multiple times
- **Contingency**: Adjust delay values, keep original timing constants

#### Risk 4: Particle System Gap

- **Description**: No particle system in initial migration
- **Likelihood**: HIGH (planned skip)
- **Impact**: LOW (particles are background visual only)
- **Mitigation**:
  1. Ensure background cubes provide sufficient visual depth
  2. Document particle system as future enhancement
  3. Create ParticleSystemComponent if particles are critical
- **Contingency**: Create particle component in Phase 3 if needed

---

## Timeline and Effort

### Estimated Total Time: 3.5 hours

| Phase                  | Tasks                                          | Estimated Time     |
| ---------------------- | ---------------------------------------------- | ------------------ |
| **Phase 1: Setup**     | Export barrels, helper methods                 | 30 min             |
| **Phase 2: Migration** | Replace scene, update template, refactor logic | 1.5 hours          |
| **Phase 3: Particles** | Optional enhancement                           | 30 min (if needed) |
| **Phase 4: Testing**   | Visual, performance, responsive validation     | 1 hour             |
| **Buffer**             | Unexpected issues, refinements                 | 30 min             |

### Milestone Checkpoints

✅ **Checkpoint 1**: Component builds without errors (30 min)
✅ **Checkpoint 2**: Scene renders with spheres visible (1 hour)
✅ **Checkpoint 3**: All 40 objects visible (cubes + spheres) (1.5 hours)
✅ **Checkpoint 4**: Animations working smoothly (2 hours)
✅ **Checkpoint 5**: Visual parity validated (2.5 hours)
✅ **Checkpoint 6**: Performance validated (3 hours)
✅ **Checkpoint 7**: Production-ready (3.5 hours)

---

## Success Criteria

### Must Have

- ✅ All 5 floating spheres visible with glow effect
- ✅ All 35 background cubes positioned correctly
- ✅ Floating animation works (up/down motion)
- ✅ Content entrance animation works
- ✅ Performance metrics equal or better than current
- ✅ Visual quality matches current implementation
- ✅ Code reduced by at least 60%

### Should Have

- ✅ Mouse interaction for camera movement (bonus)
- ✅ Smooth entrance stagger effect
- ✅ Responsive behavior on mobile/tablet
- ✅ Performance overlay shows healthy FPS (55+)

### Nice to Have

- 🎯 Particle system migrated to component
- 🎯 Additional accent lights configuration
- 🎯 Advanced directive composition (custom animations)

---

## Migration Checklist

### Pre-Migration

- [ ] Review current hero section implementation
- [ ] Take screenshot of current state for comparison
- [ ] Record baseline performance metrics (FPS, memory)
- [ ] Verify all primitive components compile successfully
- [ ] Verify all directives compile successfully

### Phase 1: Setup

- [ ] Create component barrel exports (primitives/index.ts)
- [ ] Create directive barrel exports (directives/index.ts)
- [ ] Add parseColor() helper method
- [ ] Add backgroundCubes computed signal
- [ ] Add generateZonedPosition() helper method

### Phase 2: Migration

- [ ] Update component imports
- [ ] Replace scene container with app-hybrid-scene
- [ ] Add floating spheres with @for loop
- [ ] Add background cubes with @for loop
- [ ] Remove all manual THREE.js methods
- [ ] Update ngOnInit to minimal implementation
- [ ] Update ngOnDestroy to minimal implementation
- [ ] Add onSceneInitialized() handler

### Phase 3: Testing

- [ ] Build succeeds without errors
- [ ] Scene renders correctly
- [ ] All 5 spheres visible
- [ ] All 35 cubes visible
- [ ] Floating animation works
- [ ] Content entrance animation works
- [ ] Take screenshot for visual comparison
- [ ] Measure performance metrics
- [ ] Test responsive behavior (mobile/tablet/desktop)
- [ ] Validate no console errors/warnings

### Post-Migration

- [ ] Document changes in progress.md
- [ ] Create before/after comparison report
- [ ] Update component documentation
- [ ] Commit with descriptive message
- [ ] Tag commit as migration milestone

---

## Conclusion

This migration plan transforms the hero section from 952 lines of imperative THREE.js code to ~250 lines of declarative Angular Three components. The benefits include:

- **73% code reduction** (952 → 250 lines)
- **100% elimination** of manual THREE.js boilerplate
- **Improved maintainability** through declarative HTML
- **Enhanced reusability** via composable components
- **Better type safety** with strict TypeScript
- **Automatic performance optimization** via directives

**Recommended Approach**: Execute phases sequentially, validate each checkpoint, and keep old component as backup for easy rollback if needed.

---

**Next Action**: Begin Phase 1 implementation when ready
**Estimated Completion**: 3.5 hours from start
**Risk Level**: LOW (well-scoped changes, clear rollback path)
