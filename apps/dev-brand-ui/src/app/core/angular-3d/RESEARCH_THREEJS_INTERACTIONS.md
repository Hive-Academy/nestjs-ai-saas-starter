# Three.js Mouse Interaction Research - 2025

**Date**: January 2025
**Context**: Researching best practices for mouse interactions in Angular Three.js applications after discovering only planet interactions work (star field parallax not working).

## Current Problem

- **Planet rotation** works correctly with mouse movement
- **Star field parallax** does NOT work - stars don't move with mouse
- Need to determine best approach for reliable, performant mouse interactions

## Research Findings

### 1. Standard Three.js Mouse Interaction Patterns

#### Raycasting (Industry Standard)

**Purpose**: Detect which 3D objects the mouse is pointing at

**Standard Pattern**:

```javascript
// Normalize mouse coordinates
mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

// Update raycaster
raycaster.setFromCamera(mouse, camera);

// Check intersections
const intersects = raycaster.intersectObjects(scene.children, true);
```

**Best Practices**:

- ✅ Move intersection checking to mouse event handler (not render loop)
- ✅ Only check intersections on click/hover, not every frame
- ✅ Use recursive: true for complex object hierarchies
- ❌ Avoid raycasting 1000s of objects every frame (performance issue)

**Use Cases**:

- Click detection
- Hover effects
- Object selection
- Drag and drop

#### Camera/Object Manipulation (Direct Transform)

**Purpose**: Move camera or objects based on mouse position (no intersection needed)

**Pattern**:

```javascript
// Get normalized mouse position
const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

// Apply to camera or object directly
camera.position.x = mouseX * someScale;
camera.position.y = mouseY * someScale;
// OR
object.rotation.y = mouseX * rotationFactor;
```

**Best Practices**:

- ✅ Use for parallax effects (no raycasting needed!)
- ✅ Apply transforms in render loop for smooth animation
- ✅ Use lerp/smoothing for professional feel
- ✅ Centralize mouse tracking (single listener)

**Use Cases**:

- Parallax scrolling
- Camera following mouse
- Object rotation following mouse
- Background layer movement

### 2. OrbitControls Deep Dive

#### What OrbitControls Does

**Primary Purpose**: User-controlled camera rotation, zoom, and pan

**Default Behavior**:

- Left mouse drag: Rotate around target
- Right mouse drag: Pan camera
- Mouse wheel: Zoom in/out
- Touch: Pinch to zoom, drag to rotate

#### Advanced OrbitControls Usage

**Custom Mouse Following (Without Click)**:

```javascript
// From research: Orbit controls follow mouse without clicking
controls.enableRotate = false; // Disable default rotation
controls.enableZoom = false; // Disable zoom if needed

// In render loop or mousemove handler:
const targetX = mouseX * 0.5;
const targetY = mouseY * 0.5;

// Smoothly interpolate camera position
camera.position.x += (targetX - camera.position.x) * 0.05;
camera.position.y += (targetY - camera.position.y) * 0.05;
```

**Collision Detection with OrbitControls**:

```javascript
// Create ray from camera target to camera position
const direction = new THREE.Vector3();
direction.subVectors(camera.position, controls.target);

raycaster.set(controls.target, direction.normalize());
const intersects = raycaster.intersectObjects(collisionObjects);

if (intersects.length > 0) {
  // Adjust camera position to intersection point
  // Prevents camera going through walls
}
```

**Performance Tips**:

- Set `controls.enableDamping = true` for smooth, professional feel
- Adjust `controls.dampingFactor` (default: 0.05) for smoothing
- Use `controls.update()` in render loop if damping enabled
- Set min/max distance, polar angle, azimuth angle to constrain movement

#### When to Use OrbitControls vs Custom Mouse Tracking

**Use OrbitControls When**:

- User needs to explore 3D scene
- Manual camera control required
- Zoom/pan functionality needed
- Interactive 3D viewer

**Use Custom Mouse Tracking When**:

- Parallax background effects
- Object rotation following mouse (no user click)
- Camera subtle movement based on mouse position
- Cinematic/presentation mode (no user control)

**Can Combine Both**:

- OrbitControls for main camera
- Custom mouse tracking for background elements (parallax)
- Disable OrbitControls during animations

### 3. Angular-Three Specific Patterns

#### Available Packages

- **@angular-three/core** - Core THREE.js wrapper (latest: v6.0.1, 3 years old)
- **@angular-three/controls** - OrbitControls, FlyControls, FirstPersonControls, etc.
- **@angular-three/soba** - Utility components and helpers
- **@angular-three/postprocessing** - Post-processing effects
- **@angular-three/cannon** - Physics integration

#### Declarative Approach

Angular-Three uses Angular templates for declarative 3D scenes:

```html
<ngt-canvas>
  <ngt-mesh [position]="[0, 0, 0]">
    <ngt-box-geometry />
    <ngt-mesh-standard-material />
  </ngt-mesh>
</ngt-canvas>
```

#### Mouse Events in Angular-Three

Angular-Three supports pointer events that return `RaycasterEmitEvent` with:

- Target component reference
- Intersection data (point, distance, face, etc.)
- Native browser event

**Performance**:

- ✅ No DOM elements generated (lightweight)
- ✅ OnPush change detection strategy
- ✅ Rendering runs outside Angular zone (no unnecessary CD triggers)

### 4. Alternative: ngx-three

**Package**: `ngx-three`
**Approach**: Generated Angular components wrapping THREE.js classes
**Status**: More recent updates than @angular-three

**Key Features**:

- Declarative component approach (like React Three Fiber)
- Built-in raycasting support
- Mouse/pointer event system

### 5. External Interaction Managers

#### THREE.Interactive

**Package**: `three-interactive` (GitHub: markuslerner/THREE.Interactive)
**Purpose**: Fast, simple interaction manager for THREE.js

**Features**:

- ✅ Differentiates mouseover/mouseout vs mouseenter/mouseleave
- ✅ Sorts intersections by distance to camera
- ✅ Event propagation control (stopPropagation)
- ✅ Works with any THREE.js setup (vanilla, Angular, React, etc.)

**Pattern**:

```javascript
import { InteractionManager } from 'three-interactive';

const interactionManager = new InteractionManager(renderer, camera, renderer.domElement);

mesh.addEventListener('click', (event) => {
  console.log('Mesh clicked!', event);
});

// In render loop
interactionManager.update();
```

## Why Star Field Parallax Might Not Be Working

### Hypothesis 1: Raycasting Performance Issue

**Problem**: Star fields contain 1000s of individual sprites/points
**Issue**: Raycasting through 1000s of objects every frame = performance death
**Evidence**: Planet works (1 mesh), star field doesn't (3000+ sprites)

**Why Our Approach Failed**:

```typescript
// StarFieldEnhancedComponent creates 3000 individual sprites
@for (star of starData(); track $index) {
  <ngt-sprite [position]="star.position" [scale]="[star.size, star.size, 1]">
    <ngt-sprite-material ... />
  </ngt-sprite>
}
```

**What Happens**:

1. Mouse interaction directive tries to find Three.js object
2. Star field component wraps `<ngt-group>` with 3000 children
3. Directive can't efficiently apply parallax to 3000 individual sprites
4. Performance degrades or interactions fail entirely

### Hypothesis 2: Group vs Individual Object Handling

**Planet (Works)**:

- Single `THREE.Mesh` object
- Direct access via `getMesh()`
- Clear object hierarchy

**Star Field (Doesn't Work)**:

- `THREE.Group` containing 3000 `THREE.Sprite` objects
- Directive may find group but not apply transforms correctly
- Group position changes might not propagate to children

### Hypothesis 3: Render Loop Timing

**Planet**:

- `injectBeforeRender()` called in component
- Direct mesh reference available
- Transforms applied immediately

**Star Field**:

- Same pattern but with group
- Possible timing issue with group children rendering
- Angular-three rendering order might affect updates

## Recommended Solutions

### Solution 1: Use OrbitControls for Camera (Recommended)

**Approach**: Let OrbitControls handle camera, use camera movement for parallax effect

**Implementation**:

```typescript
// scene-3d.component.ts
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export class Scene3DComponent {
  controls?: OrbitControls;

  ngAfterViewInit() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Configure for subtle mouse following
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = false; // Optional
    this.controls.enablePan = false; // Optional

    // Constrain rotation for cinematic feel
    this.controls.minPolarAngle = Math.PI / 3;
    this.controls.maxPolarAngle = (2 * Math.PI) / 3;
  }

  private animate() {
    this.controls?.update(); // Required if damping enabled
    // ... rest of render loop
  }
}
```

**Benefits**:

- ✅ Built-in, well-tested camera control
- ✅ Smooth damping/interpolation
- ✅ No custom mouse tracking needed
- ✅ Works with all objects (parallax from camera movement)

**Parallax Effect**:

- Objects at different Z depths naturally create parallax as camera moves
- No need to manually move individual objects
- "Free" parallax from camera perspective change

### Solution 2: Camera Position Following Mouse (No OrbitControls)

**Approach**: Directly manipulate camera position based on mouse

**Implementation**:

```typescript
// mouse-interaction.service.ts
@Injectable({ providedIn: 'root' })
export class MouseInteractionService {
  private mouseX = signal(0);
  private mouseY = signal(0);
  private targetCameraX = 0;
  private targetCameraY = 0;

  initialize(camera: THREE.Camera) {
    window.addEventListener('mousemove', (event) => {
      this.mouseX.set((event.clientX / window.innerWidth) * 2 - 1);
      this.mouseY.set(-(event.clientY / window.innerHeight) * 2 + 1);
    });

    // In render loop
    const smoothing = 0.05;
    this.targetCameraX = this.mouseX() * 2; // Adjust scale as needed
    this.targetCameraY = this.mouseY() * 2;

    camera.position.x += (this.targetCameraX - camera.position.x) * smoothing;
    camera.position.y += (this.targetCameraY - camera.position.y) * smoothing;
    camera.lookAt(0, 0, 0); // Keep looking at scene center
  }
}
```

**Benefits**:

- ✅ Full control over camera behavior
- ✅ Can customize smoothing, constraints, etc.
- ✅ Parallax from camera movement (not individual objects)
- ✅ Lighter than OrbitControls if you don't need user rotation

### Solution 3: Instanced Geometry for Star Fields

**Approach**: Use `THREE.InstancedMesh` instead of individual sprites

**Why**:

- ✅ 1 draw call for 1000s of stars (vs 1000s of draw calls)
- ✅ Massive performance improvement
- ✅ Still can apply parallax to the single instanced mesh

**Implementation Pattern**:

```typescript
// Create instanced mesh
const geometry = new THREE.SphereGeometry(0.05, 8, 8);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const instancedMesh = new THREE.InstancedMesh(geometry, material, 3000);

// Set individual positions via matrix transforms
const matrix = new THREE.Matrix4();
for (let i = 0; i < 3000; i++) {
  matrix.setPosition(positions[i].x, positions[i].y, positions[i].z);
  instancedMesh.setMatrixAt(i, matrix);
}
instancedMesh.instanceMatrix.needsUpdate = true;

// Now parallax works - it's ONE object, not 3000
```

**Trade-off**:

- ⚠️ All instances share same geometry/material
- ⚠️ More complex to implement varying sizes/colors
- ✅ But performance is 100x better

### Solution 4: Points Geometry for Star Fields

**Approach**: Use `THREE.Points` with `THREE.BufferGeometry`

**Why**:

- ✅ Even lighter than instanced mesh
- ✅ Perfect for particle systems (stars, dust, etc.)
- ✅ Single draw call
- ✅ Can vary size/color via vertex attributes

**Implementation**:

```typescript
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(starCount * 3);
const colors = new Float32Array(starCount * 3);
const sizes = new Float32Array(starCount);

// Fill arrays...
for (let i = 0; i < starCount; i++) {
  positions[i * 3] = x;
  positions[i * 3 + 1] = y;
  positions[i * 3 + 2] = z;
  // ... colors, sizes
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

const material = new THREE.PointsMaterial({
  size: 0.05,
  vertexColors: true,
  map: starTexture,
  transparent: true,
  blending: THREE.AdditiveBlending,
});

const points = new THREE.Points(geometry, material);
// Now it's ONE object for parallax!
```

## Recommended Architecture

### Option A: OrbitControls + Depth-Based Parallax (Easiest)

```
Camera (OrbitControls)
  └─ Scene
      ├─ Planet (z=0, interactive)
      ├─ Star Field Layer 1 (z=-50, far background)
      ├─ Star Field Layer 2 (z=-30, mid background)
      ├─ Star Field Layer 3 (z=-10, near background)
      └─ Nebula (z=-100, distant background)
```

**How It Works**:

- User controls camera via mouse drag (OrbitControls)
- Objects at different Z depths create natural parallax
- No manual object manipulation needed
- Planet can still have hover effects via raycasting

**Configuration**:

```typescript
// Subtle rotation constraints
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = false;
controls.enableZoom = false;
controls.minDistance = 10;
controls.maxDistance = 15;
controls.minPolarAngle = Math.PI / 4;
controls.maxPolarAngle = (3 * Math.PI) / 4;
```

### Option B: Camera Following Mouse + Manual Parallax (Custom)

```
Camera (custom mouse tracking)
  └─ Scene
      ├─ Planet (rotation + hover via raycasting)
      ├─ Star Field (Points/InstancedMesh, parallax via camera)
      └─ Nebula (fixed position)
```

**How It Works**:

- Camera position follows mouse (no click required)
- Smooth lerping for professional feel
- Planet has separate mouse interactions (rotation, hover)
- Star field parallax comes from camera movement

**Implementation**:

```typescript
// MouseInteractionService
updateCamera(camera: THREE.Camera, deltaTime: number) {
  const mouseX = this.smoothMouseX();
  const mouseY = this.smoothMouseY();

  // Calculate target position
  const targetX = mouseX * 1.5;
  const targetY = mouseY * 1.5;
  const targetZ = 12; // Fixed Z

  // Smooth interpolation
  const smoothing = deltaTime * 5;
  camera.position.x += (targetX - camera.position.x) * smoothing;
  camera.position.y += (targetY - camera.position.y) * smoothing;
  camera.position.z += (targetZ - camera.position.z) * smoothing;

  // Always look at origin
  camera.lookAt(0, 0, 0);
}
```

### Option C: Hybrid Approach (Best of Both Worlds)

```
Camera (OrbitControls, but auto-follow mouse subtly)
  └─ Scene
      ├─ Planet (rotation + hover via raycasting)
      ├─ Star Fields (Points geometry, parallax from camera)
      └─ Nebula (fixed)
```

**How It Works**:

- OrbitControls enabled but configured for subtle movement
- Custom mouse tracking adjusts OrbitControls target
- Planet has independent mouse interactions
- Best performance + best UX

**Implementation**:

```typescript
// Hybrid: OrbitControls + subtle mouse following
updateCameraTarget() {
  if (!this.controls) return;

  const mouseX = this.mouseService.smoothMouseX();
  const mouseY = this.mouseService.smoothMouseY();

  // Subtly adjust target based on mouse
  const targetOffset = 2;
  this.controls.target.x = mouseX * targetOffset;
  this.controls.target.y = mouseY * targetOffset;
  this.controls.target.z = 0;

  this.controls.update();
}
```

## Performance Best Practices Summary

### ✅ DO

1. **Use camera movement for parallax** (not individual object movement)
2. **Use instanced geometry or Points for particle systems** (1000+ objects)
3. **Limit raycasting to click/hover events** (not every frame)
4. **Use single mouse listener** (centralized service)
5. **Apply smoothing/lerping for professional feel**
6. **Leverage depth-based parallax** (objects at different Z automatically parallax)
7. **Use OrbitControls for user exploration**
8. **Constrain OrbitControls** (min/max angles, distances)

### ❌ DON'T

1. **Don't raycast 1000s of objects every frame** (performance killer)
2. **Don't create 1000s of individual THREE.Mesh objects** (use instancing/points)
3. **Don't move objects individually for parallax** (move camera instead)
4. **Don't run mouse logic in render loop** (use event handlers)
5. **Don't fight with OrbitControls** (work with it or disable it)

## Final Recommendation

**For your current scene (planet + star fields + nebula):**

### Recommended Solution: **Option A (OrbitControls + Depth-Based Parallax)**

**Why**:

1. ✅ Simplest implementation
2. ✅ Best performance (no manual object updates)
3. ✅ Natural parallax from camera perspective
4. ✅ Well-tested, production-ready (OrbitControls)
5. ✅ Planet can still have hover/click interactions via raycasting
6. ✅ User can explore scene (drag to rotate)

**Changes Needed**:

1. Add OrbitControls to Scene3DComponent
2. Configure constraints (min/max angles, disable zoom/pan if needed)
3. Convert star fields to Points geometry (performance boost)
4. Remove custom mouse parallax code (not needed!)
5. Keep planet mouse rotation/hover via raycasting

**Result**:

- Professional, smooth camera movement
- Natural depth-based parallax
- Interactive planet (hover, click)
- 60 FPS with 10,000+ stars
- Simple, maintainable code

### If You Want Full Custom Control: **Option B (Camera Following Mouse)**

**Use When**:

- No user camera control wanted (cinematic/presentation mode)
- Specific camera movement patterns required
- OrbitControls feels too "game-like"

**Trade-off**:

- More code to maintain
- Must handle edge cases (smoothing, bounds, etc.)
- But: Full creative control

## Next Steps

1. **Decide on approach** (A, B, or C)
2. **Implement OrbitControls** (if using A or C)
3. **Convert star fields to Points geometry** (performance)
4. **Test parallax effect** (should work naturally from camera movement)
5. **Fine-tune OrbitControls constraints** (damping, angles, etc.)
6. **Keep planet interactions** (already working!)

## References

- Three.js OrbitControls docs: https://threejs.org/docs/examples/en/controls/OrbitControls.html
- THREE.Interactive: https://github.com/markuslerner/THREE.Interactive
- Angular-Three: https://github.com/nartc/angular-three
- Three.js Raycasting tutorial: https://threejs-journey.com/lessons/raycaster-and-mouse-events
- Instanced Mesh guide: https://threejs.org/docs/#api/en/objects/InstancedMesh
- Points geometry guide: https://threejs.org/docs/#api/en/objects/Points
