# Mouse Interaction System V2

**Component-Internal Mouse Interactions for Angular Three Scenes**

## Overview

The Mouse Interaction System V2 provides mouse-responsive behavior directly within 3D components through optional configuration inputs. Instead of external directives, each component handles its own interactions via config objects passed as inputs.

### Philosophy

**Think "Built-in Interactivity"** - components handle their own mouse interactions when configured, no external directives needed.

```html
<!-- Simple: Components are fixed by default -->
<app-planet [position]="[0, 0, 0]" [radius]="5" />

<!-- Interactive: Opt-in via config inputs -->
<app-planet
  [position]="[0, 0, 0]"
  [radius]="5"
  [mouseRotation]="{ factor: 0.3, axis: 'xy', smoothing: 8 }"
  [mouseHover]="{ scale: 1.12, speed: 6 }"
/>
```

## Architecture

### Components

```
MouseInteractionService (singleton)
  └─ Centralized mouse tracking with signals

Components with Optional Interaction Inputs:
  ├─ PlanetComponent
  │   ├─ mouseRotation?: RotationConfig
  │   └─ mouseHover?: HoverConfig
  │
  └─ StarFieldEnhancedComponent
      └─ mouseParallax?: ParallaxConfig
```

### How It Works

1. **MouseInteractionService** (singleton)

   - Single `mousemove` listener for entire app
   - Provides normalized coordinates (-1 to 1) via signals
   - Optional smoothing for professional animations
   - Reference-counted initialization/cleanup

2. **Component-Internal Handling**

   - Components check for config inputs in constructor
   - If config provided, inject MouseInteractionService
   - Use `injectBeforeRender()` for per-frame updates
   - Direct access to own Three.js objects (no searching needed)

3. **Type-Safe Configuration**
   - `ParallaxConfig`, `RotationConfig`, `HoverConfig` interfaces
   - Optional inputs: `input<ConfigType | undefined>()`
   - Components only initialize interactions when config provided

## Component APIs

### PlanetComponent

Supports rotation and hover interactions.

**Rotation Input:**

```typescript
[mouseRotation] = "{ factor: 0.3, axis: 'xy', smoothing: 8 }";
```

**Config Interface:**

```typescript
interface RotationConfig {
  factor: number; // Intensity (0-1), default: 0.5
  axis: 'x' | 'y' | 'z' | 'xy'; // Rotation axes, default: 'xy'
  smoothing: number; // Transition speed, default: 8
}
```

**Hover Input:**

```typescript
[mouseHover] = '{ scale: 1.12, speed: 6 }';
```

**Config Interface:**

```typescript
interface HoverConfig {
  scale: number; // Scale multiplier, default: 1.15
  glow: number; // Glow intensity multiplier, default: 1.0
  speed: number; // Transition speed, default: 8
}
```

**Example:**

```html
<app-planet
  [position]="[0, 0, 9.5]"
  [radius]="5.0"
  [mouseRotation]="{ factor: 0.3, axis: 'xy', smoothing: 8 }"
  [mouseHover]="{ scale: 1.12, speed: 6 }"
/>
```

### StarFieldEnhancedComponent

Supports parallax depth effect.

**Parallax Input:**

```typescript
[mouseParallax] = "{ factor: 0.3, axis: 'xy', depthScale: true }";
```

**Config Interface:**

```typescript
interface ParallaxConfig {
  factor: number; // Intensity (0-1), default: 0.3
  axis: 'x' | 'y' | 'xy'; // Axes to affect, default: 'xy'
  depthScale: boolean; // Scale by Z-depth, default: true
}
```

**Example:**

```html
<!-- Background stars - subtle parallax -->
<app-star-field-enhanced
  [starCount]="3000"
  [radius]="50"
  [mouseParallax]="{ factor: 0.15, axis: 'xy', depthScale: true }"
/>

<!-- Foreground stars - stronger parallax -->
<app-star-field-enhanced
  [starCount]="2500"
  [radius]="30"
  [mouseParallax]="{ factor: 0.4, axis: 'xy', depthScale: true }"
/>
```

### Nebula Components

Nebula components (NebulaComponent, NebulaVolumetricComponent) are **fixed by default** with no interaction inputs. They don't respond to mouse movement, serving as static atmospheric backgrounds.

```html
<!-- No interaction configuration needed -->
<app-nebula [particleCount]="120" [radius]="80" [position]="[-180, 0, -230]" />
```

## Real-World Example

### Hero Space Scene

```html
<!-- PLANET: Rotation + Hover -->
<app-planet
  [position]="[0, 0, 9.5]"
  [radius]="5.0"
  [mouseRotation]="{ factor: 0.3, axis: 'xy', smoothing: 8 }"
  [mouseHover]="{ scale: 1.12, speed: 6 }"
/>

<!-- BACKGROUND STARS: Subtle parallax -->
<app-star-field-enhanced
  [starCount]="3000"
  [radius]="50"
  [mouseParallax]="{ factor: 0.15, axis: 'xy', depthScale: true }"
/>

<!-- MIDGROUND STARS: Moderate parallax -->
<app-star-field-enhanced
  [starCount]="2000"
  [radius]="40"
  [mouseParallax]="{ factor: 0.25, axis: 'xy', depthScale: true }"
/>

<!-- FOREGROUND STARS: Strong parallax -->
<app-star-field-enhanced
  [starCount]="2500"
  [radius]="30"
  [mouseParallax]="{ factor: 0.4, axis: 'xy', depthScale: true }"
/>

<!-- NEBULA: Fixed position, no interaction -->
<app-nebula-volumetric [width]="240" [height]="100" [position]="[-90, 0, -90]" />
```

**Result:**

- Planet rotates to "look at" mouse and zooms on hover
- Stars create depth perception with varying parallax
- Nebula stays completely still (atmospheric background)
- All interactions smooth and professional
- Template is clean and configuration is explicit

## Benefits

### ✅ **Simplicity**

No external directives to import or apply. Components handle their own interactions.

### ✅ **Type-Safe**

All configuration via typed interfaces with IntelliSense support.

### ✅ **Performance**

- Single mouse listener for entire app
- One handler per component, not per Three.js object
- Star fields: one parallax handler for entire group of thousands of stars

### ✅ **Direct Object Access**

Components access their own Three.js objects via `viewChild` refs, no searching needed.

### ✅ **Opt-In**

Components are fixed by default. Only initialize interactions when config provided.

### ✅ **Clean Templates**

```html
<!-- Before: Verbose directive syntax -->
<app-planet mouseRotation [rotationFactor]="0.3" [rotationAxis]="'xy'" [rotationSmoothing]="8" />

<!-- After: Single config object -->
<app-planet [mouseRotation]="{ factor: 0.3, axis: 'xy', smoothing: 8 }" />
```

## Implementation Pattern

### Adding Mouse Interactions to a Component

**1. Add Configuration Input:**

```typescript
export class MyComponent implements AfterViewInit, OnDestroy {
  readonly mouseRotation = input<RotationConfig | undefined>();

  private mouseService?: MouseInteractionService;
  private originalRotation?: THREE.Euler;
}
```

**2. Check Config in Lifecycle Hook:**

```typescript
ngAfterViewInit(): void {
  const mesh = this.meshRef()?.nativeElement;
  if (!mesh) return;

  // Store original state
  this.originalRotation = mesh.rotation.clone();

  // Setup interactions if configured
  if (this.mouseRotation()) {
    this.mouseService = inject(MouseInteractionService);
    this.mouseService.initialize();
    this.setupMouseRotation(mesh);
  }
}
```

**3. Implement Interaction Handler:**

```typescript
private setupMouseRotation(mesh: THREE.Mesh): void {
  const config = this.mouseRotation();
  if (!config) return;

  injectBeforeRender(() => {
    if (!this.mouseService || !mesh || !this.originalRotation) return;

    const mouseX = this.mouseService.smoothMouseX();
    const mouseY = this.mouseService.smoothMouseY();
    const factor = config.factor ?? 0.5;

    // Apply rotation
    mesh.rotation.x = this.originalRotation.x + mouseY * factor;
    mesh.rotation.y = this.originalRotation.y + mouseX * factor;
  });
}
```

**4. Cleanup:**

```typescript
ngOnDestroy(): void {
  if (this.mouseService) {
    this.mouseService.destroy();
  }
}
```

## API Reference

### MouseInteractionService

**Location:** `@core/angular-3d/services/mouse-interaction.service.ts`

**Methods:**

```typescript
initialize(): void;  // Called by components (reference counted)
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

### Type Definitions

**Location:** `@core/angular-3d/types/mouse-interaction.types.ts`

```typescript
export interface ParallaxConfig {
  factor: number; // 0-1 intensity
  axis: 'x' | 'y' | 'xy';
  depthScale: boolean; // Scale effect by Z-depth
}

export interface RotationConfig {
  factor: number; // 0-1 intensity
  axis: 'x' | 'y' | 'z' | 'xy';
  smoothing: number; // Interpolation speed
}

export interface HoverConfig {
  scale: number; // Scale multiplier (>1.0)
  glow: number; // Glow intensity multiplier
  speed: number; // Transition speed
}
```

## Best Practices

### 1. Use Sensible Defaults

```html
<!-- Start simple, components have default values -->
<app-planet [mouseRotation]="{ factor: 0.3, axis: 'xy', smoothing: 8 }" />
```

### 2. Match Smoothing Across Scene

```html
<!-- Consistent smoothing for professional feel -->
<app-planet [mouseRotation]="{ factor: 0.3, axis: 'xy', smoothing: 8 }" />
<app-star-field-enhanced [mouseParallax]="{ factor: 0.3, axis: 'xy', depthScale: true }" />
<!-- Service smoothing is 8 by default -->
```

### 3. Layer Parallax Depths

```html
<!-- Vary parallax factor to create depth layers -->
<app-star-field-enhanced [radius]="50" [mouseParallax]="{ factor: 0.15 }" />
<!-- Far -->
<app-star-field-enhanced [radius]="40" [mouseParallax]="{ factor: 0.25 }" />
<!-- Mid -->
<app-star-field-enhanced [radius]="30" [mouseParallax]="{ factor: 0.40 }" />
<!-- Near -->
```

### 4. Fixed Backgrounds Don't Need Config

```html
<!-- Nebula is fixed by default, no config needed -->
<app-nebula [position]="[-180, 0, -230]" />
```

## Troubleshooting

### Interactions Not Working

**Check 1: Is config provided?**

```typescript
// Must provide config object
[mouseRotation] = "{ factor: 0.3, axis: 'xy', smoothing: 8 }";
// NOT just boolean flag
```

**Check 2: Check console for errors**

```typescript
[PlanetComponent] Mouse rotation enabled { factor: 0.3, axis: 'xy' }
[StarFieldEnhanced] Mouse parallax enabled { factor: 0.3, axis: 'xy', depthScale: true }
```

### Interactions Feel Janky

**Fix 1: Increase smoothing**

```typescript
[mouseRotation] = "{ factor: 0.3, axis: 'xy', smoothing: 12 }";
// Higher smoothing = slower, smoother transitions
```

**Fix 2: Reduce factor**

```typescript
// Too strong
[mouseParallax] = // Better
  "{ factor: 1.0, axis: 'xy', depthScale: true }"[mouseParallax] =
    "{ factor: 0.3, axis: 'xy', depthScale: true }";
```

## Migration from V1 (Directive-Based)

### Before (External Directives)

```html
<app-planet
  mouseRotation
  [rotationFactor]="0.3"
  [rotationAxis]="'xy'"
  [rotationSmoothing]="8"
  mouseHover
  [hoverScale]="1.12"
/>
```

### After (Component Inputs)

```html
<app-planet
  [mouseRotation]="{ factor: 0.3, axis: 'xy', smoothing: 8 }"
  [mouseHover]="{ scale: 1.12, speed: 6 }"
/>
```

**Key Changes:**

- No directive imports needed
- Single config object instead of multiple separate inputs
- Components handle their own interactions internally
- Fixed by default, opt-in via config

## License

MIT - Part of NestJS AI SaaS Starter
