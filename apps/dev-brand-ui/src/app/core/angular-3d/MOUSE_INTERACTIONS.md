# Mouse Interaction System

**Composable element-level mouse interactions for Angular Three scenes**

## Overview

The Mouse Interaction System provides declarative, composable directives for adding mouse-responsive behavior to 3D objects. Instead of scene-level traversal with hardcoded logic, each element controls its own interaction through explicit directives in the template.

### Philosophy

Think **Tailwind CSS but for 3D interactions** - declarative, composable, and element-scoped.

```html
<!-- OLD WAY: Scene-level, implicit, hardcoded -->
<ngt-canvas sceneMouseParallax [sensitivity]="0.4">
  <app-planet />
  <!-- Need userData hack to exclude -->
  <app-stars />
  <!-- Implicitly gets parallax -->
</ngt-canvas>

<!-- NEW WAY: Element-level, explicit, composable -->
<ngt-canvas>
  <!-- Nebula: Explicitly fixed -->
  <app-nebula mouseFixed />

  <!-- Stars: Configurable parallax -->
  <app-stars mouseParallax [parallaxFactor]="0.3" [parallaxAxis]="'xy'" />

  <!-- Planet: Rotation + hover (composable!) -->
  <app-planet mouseRotation [rotationFactor]="0.5" mouseHover [hoverScale]="1.12" />
</ngt-canvas>
```

## Architecture

### Components

```
MouseInteractionService (singleton)
  └─ Centralized mouse tracking with signals

MouseInteractionDirective (base class)
  ├─ MouseParallaxDirective    // Position offset based on depth
  ├─ MouseRotationDirective    // Rotation following mouse
  ├─ MouseHoverDirective       // Scale/glow on hover (raycasting)
  └─ MouseFixedDirective       // Explicit opt-out marker
```

### How It Works

1. **MouseInteractionService** (singleton)

   - Single `mousemove` listener for entire app
   - Provides normalized coordinates (-1 to 1) via signals
   - Optional smoothing for professional animations
   - Reference-counted initialization/cleanup

2. **Base Directive** (abstract)

   - Handles Three.js object resolution
   - Stores original transform state
   - Manages lifecycle and cleanup
   - Provides utility methods for depth calculations

3. **Specific Directives**
   - Extend base directive
   - Define interaction-specific behavior
   - Use `injectBeforeRender()` for frame-by-frame updates
   - Composable - multiple directives on same element

## Directives

### MouseParallaxDirective

Applies depth-based position offset based on mouse movement.

**Usage:**

```html
<!-- Simple parallax -->
<app-star-field mouseParallax [parallaxFactor]="0.5" />

<!-- With depth scaling (farther = less movement) -->
<app-star-field
  mouseParallax
  [parallaxFactor]="0.3"
  [parallaxAxis]="'xy'"
  [parallaxDepthScale]="true"
  [parallaxDepthBase]="50"
/>

<!-- Horizontal only -->
<app-nebula mouseParallax [parallaxFactor]="0.2" [parallaxAxis]="'x'" />
```

**Inputs:**

- `parallaxFactor: number` - Intensity (0-1), default: 0.3
- `parallaxAxis: 'x' | 'y' | 'xy'` - Axes to affect, default: 'xy'
- `parallaxDepthScale: boolean` - Scale by Z-depth, default: true
- `parallaxDepthBase: number` - Base distance for scaling, default: 50

**Effect:**
Objects move opposite to mouse movement, creating depth perception. Farther objects (higher Z) move less when depth scaling is enabled.

---

### MouseRotationDirective

Rotates object based on mouse position, creating a "following" effect.

**Usage:**

```html
<!-- Planet that "looks at" mouse -->
<app-planet mouseRotation [rotationFactor]="0.5" [rotationAxis]="'xy'" />

<!-- Spinning logo following mouse on Y axis -->
<app-logo mouseRotation [rotationFactor]="0.3" [rotationAxis]="'y'" [rotationSmoothing]="8" />
```

**Inputs:**

- `rotationFactor: number` - Intensity (0-1), default: 0.5
- `rotationAxis: 'x' | 'y' | 'z' | 'xy'` - Rotation axes, default: 'xy'
- `rotationSmoothing: number` - Transition speed, default: 8

**Effect:**
Object rotates to track mouse position. Rotation is additive (doesn't replace existing rotation from animations).

---

### MouseHoverDirective

Detects hover via raycasting and applies scale/glow effects.

**Usage:**

```html
<!-- Simple hover scale -->
<app-planet mouseHover [hoverScale]="1.12" />

<!-- Scale + glow + custom speed -->
<app-planet mouseHover [hoverScale]="1.15" [hoverGlow]="1.5" [hoverSpeed]="8" />
```

**Inputs:**

- `hoverScale: number` - Scale multiplier, default: 1.15 (15% larger)
- `hoverGlow: number` - Glow intensity multiplier, default: 1.0 (no change)
- `hoverSpeed: number` - Transition speed, default: 8

**Effect:**
Uses Three.js raycasting to detect when mouse cursor intersects the 3D object. Smoothly scales up/down with configurable transition speed.

**Note:** Glow effect requires material emissive properties (TODO: implementation pending).

---

### MouseFixedDirective

Explicitly marks an object as non-interactive (documentation/clarity marker).

**Usage:**

```html
<!-- Nebula explicitly marked as fixed -->
<app-nebula-volumetric mouseFixed />

<!-- Background that should never move -->
<app-gradient-background mouseFixed />
```

**Inputs:** None

**Effect:**
This is a no-op directive that serves as documentation. It makes intent clear in templates - "this object SHOULD be fixed, not forgotten to add interaction."

**Why it exists:**

```html
<!-- Without mouseFixed: Did we forget interaction? Or is it intentionally fixed? -->
<app-nebula-volumetric />

<!-- With mouseFixed: Clear intent, no ambiguity -->
<app-nebula-volumetric mouseFixed />
```

## Real-World Example

### Hero Space Scene

```html
<ngt-canvas>
  <!-- PLANET: Rotation + Hover -->
  <app-planet
    [position]="[0, 0, 9.5]"
    [radius]="5.0"
    mouseRotation
    [rotationFactor]="0.3"
    [rotationAxis]="'xy'"
    mouseHover
    [hoverScale]="1.12"
  />

  <!-- BACKGROUND STARS: Subtle parallax -->
  <app-star-field-enhanced
    [starCount]="3000"
    [radius]="50"
    mouseParallax
    [parallaxFactor]="0.15"
    [parallaxDepthScale]="true"
  />

  <!-- MIDGROUND STARS: Moderate parallax -->
  <app-star-field-enhanced [starCount]="2000" [radius]="40" mouseParallax [parallaxFactor]="0.25" />

  <!-- FOREGROUND STARS: Strong parallax -->
  <app-star-field-enhanced [starCount]="2500" [radius]="30" mouseParallax [parallaxFactor]="0.4" />

  <!-- NEBULA: Fixed position, no interaction -->
  <app-nebula-volumetric mouseFixed />
  <app-nebula mouseFixed />
</ngt-canvas>
```

**Result:**

- Planet rotates to "look at" mouse and zooms on hover
- Stars create depth perception with varying parallax
- Nebula stays completely still (atmospheric background)
- All interactions smooth and professional
- Template clearly documents interaction intent

## Benefits

### ✅ **Declarative**

Interaction behavior visible in template, not hidden in TypeScript.

### ✅ **Composable**

Combine multiple directives on the same element:

```html
<app-planet mouseRotation mouseHover />
```

### ✅ **Configurable**

Fine-grained control per element:

```html
<app-stars mouseParallax [parallaxFactor]="0.15" />
<app-stars mouseParallax [parallaxFactor]="0.40" />
```

### ✅ **Reusable**

Works across any scene without hardcoding:

```html
<!-- Same directives work in hero scene, about scene, etc. -->
<app-scene-3d [sceneGraph]="HeroSceneComponent" />
<app-scene-3d [sceneGraph]="AboutSceneComponent" />
```

### ✅ **Type-Safe**

All inputs properly typed with IntelliSense:

```typescript
parallaxFactor: number; // 0-1 intensity
parallaxAxis: 'x' | 'y' | 'xy'; // Clear options
```

### ✅ **Performant**

- Single mouse listener for entire app
- Signals for reactive updates
- No scene traversal needed
- Reference-counted cleanup

## Performance

### Single Mouse Tracker

```typescript
@Injectable({ providedIn: 'root' })
export class MouseInteractionService {
  readonly mouseX = signal(0); // -1 to 1
  readonly mouseY = signal(0);
  // ... smoothing, lifecycle, etc.
}
```

**Benefits:**

- One `mousemove` listener total
- All directives read from shared signals
- Automatic cleanup via reference counting

### Efficient Updates

```typescript
injectBeforeRender(() => {
  const x = this.mouseService.smoothMouseX();
  const y = this.mouseService.smoothMouseY();
  // Apply transformation only to this element
});
```

**Benefits:**

- Per-frame updates via `injectBeforeRender`
- Only affected elements updated
- No scene traversal overhead

## Migration from Old System

### Before (Scene-Level Directive)

```typescript
// scene-3d.component.ts
<ngt-canvas sceneMouseParallax [sensitivity]="0.4">
  <app-planet />  <!-- Needs userData hack to exclude -->
  <app-stars />   <!-- Implicitly gets parallax -->
</ngt-canvas>

// scene-mouse-parallax.directive.ts
scene.traverse((object) => {
  if (object.userData?.excludeFromParallax) return; // userData hack
  // Apply parallax to ALL objects
});

// planet.component.ts
mesh.userData['excludeFromParallax'] = true; // Hacky exclusion
```

### After (Element-Level Directives)

```typescript
// hero-space-scene.component.ts
<ngt-canvas>
  <app-planet mouseRotation mouseHover />  <!-- Explicit behavior -->
  <app-stars mouseParallax [parallaxFactor]="0.3" />  <!-- Configurable -->
  <app-nebula mouseFixed />  <!-- Clear intent -->
</ngt-canvas>

// No userData hacks needed
// No scene traversal
// Clear template-level configuration
```

## API Reference

### MouseInteractionService

**Location:** `@core/angular-3d/services/mouse-interaction.service.ts`

**Methods:**

```typescript
initialize(): void;  // Called automatically by directives
destroy(): void;     // Reference-counted cleanup
setSmoothingFactor(factor: number): void;
getSmoothingFactor(): number;
```

**Signals:**

```typescript
readonly mouseX: Signal<number>;      // Raw position (-1 to 1)
readonly mouseY: Signal<number>;
readonly smoothMouseX: Signal<number>; // Interpolated position
readonly smoothMouseY: Signal<number>;
```

### Base Directive

**Location:** `@core/angular-3d/directives/mouse-interaction-base.directive.ts`

**Protected Properties:**

```typescript
targetObject: THREE.Object3D | null;
originalPosition: THREE.Vector3 | null;
originalRotation: THREE.Euler | null;
originalScale: THREE.Vector3 | null;
```

**Protected Methods:**

```typescript
abstract setupInteraction(): void;
calculateDepthFactor(baseDistance: number): number;
isTargetValid(): boolean;
```

### Types

**Location:** `@core/angular-3d/types/mouse-interaction.types.ts`

```typescript
export interface ParallaxConfig {
  factor: number;
  axis: 'x' | 'y' | 'xy';
  depthScale: boolean;
}

export interface RotationConfig {
  factor: number;
  axis: 'x' | 'y' | 'z' | 'xy';
  smoothing: number;
}

export interface HoverConfig {
  scale: number;
  glow: number;
  speed: number;
}
```

## Best Practices

### 1. Start with Sensible Defaults

```html
<!-- Good: Start simple -->
<app-stars mouseParallax />

<!-- Then tune if needed -->
<app-stars mouseParallax [parallaxFactor]="0.25" />
```

### 2. Use mouseFixed for Clarity

```html
<!-- Good: Intent is clear -->
<app-nebula mouseFixed />

<!-- Bad: Is it forgotten or intentional? -->
<app-nebula />
```

### 3. Compose Interactions Thoughtfully

```html
<!-- Good: Complementary interactions -->
<app-planet mouseRotation mouseHover />

<!-- Questionable: Parallax + Rotation may conflict -->
<app-planet mouseParallax mouseRotation />
```

### 4. Depth-Scale Background Elements

```html
<!-- Good: Farther stars move less -->
<app-star-field [radius]="50" mouseParallax [parallaxDepthScale]="true" />
```

### 5. Match Smoothing Across Scene

```html
<!-- Consistent smoothing for professional feel -->
<app-planet mouseRotation [rotationSmoothing]="8" />
<app-stars mouseParallax <!-- Uses service smoothing (8 by default) --> /></app-stars>
```

## Troubleshooting

### Directive Not Working

**Check 1: Is the element a Three.js object?**

```typescript
// Must be one of:
// - Direct THREE.Object3D (ngt-mesh, ngt-group)
// - Component with getMesh() method
// - Component with getObject3D() method
```

**Check 2: Import the directive**

```typescript
imports: [
  MouseParallaxDirective, // Don't forget!
  // ...
];
```

**Check 3: Check console for warnings**

```typescript
[MouseInteraction] Could not find Three.js object
[MouseParallax] Target object is invalid
```

### Interactions Feel Janky

**Fix 1: Increase smoothing**

```typescript
// Service-level (all directives)
constructor() {
  inject(MouseInteractionService).setSmoothingFactor(10);
}

// Per-directive (rotation only)
<app-planet
  mouseRotation
  [rotationSmoothing]="10"
/>
```

**Fix 2: Reduce intensity**

```typescript
<!-- Too strong -->
<app-stars mouseParallax [parallaxFactor]="1.0" />

<!-- Better -->
<app-stars mouseParallax [parallaxFactor]="0.3" />
```

### Hover Not Detecting

**Issue:** Raycasting requires proper mesh structure

**Fix:**

```typescript
// In your component
getMesh(): THREE.Mesh {
  return this.meshRef()?.nativeElement;
}
```

**Verify:**

```typescript
// Check if mesh is a Group or Mesh
console.log(component.getMesh().type);
// Should be 'Mesh' for hover to work reliably
```

## Future Enhancements

### Planned Features

1. **Glow Effect Implementation**

   - Currently `hoverGlow` input exists but not implemented
   - Needs material emissive intensity manipulation

2. **Custom Interaction Directive**

   ```typescript
   <app-object
     mouseCustom
     [transformFn]="(mouseX, mouseY, object) => { ... }"
   />
   ```

3. **Interaction Presets**

   ```typescript
   <app-object mouseInteraction="floating-card" />
   <app-object mouseInteraction="3d-button" />
   ```

4. **Touch Support**

   - Extend MouseInteractionService for touch events
   - Normalized touch position tracking

5. **VR/AR Support**
   - Controller-based interactions
   - Gaze-based hover detection

## Contributing

### Adding a New Directive

1. **Extend Base Class**

   ```typescript
   @Directive({ selector: '[myInteraction]' })
   export class MyInteractionDirective extends MouseInteractionDirective {
     protected setupInteraction(): void {
       // Your logic here
     }
   }
   ```

2. **Export from Index**

   ```typescript
   // angular-3d/index.ts
   export { MyInteractionDirective } from './directives/my-interaction.directive';
   ```

3. **Add Tests**

   ```typescript
   // my-interaction.directive.spec.ts
   describe('MyInteractionDirective', () => {
     // Test initialization, transformation, cleanup
   });
   ```

4. **Document Usage**
   - Add section to this file
   - Include real-world examples
   - Document all inputs and effects

## License

MIT - Part of NestJS AI SaaS Starter
