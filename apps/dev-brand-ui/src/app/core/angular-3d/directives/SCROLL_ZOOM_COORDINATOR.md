# Scroll-Zoom Coordinator

## Overview

The `ScrollZoomCoordinatorDirective` creates a seamless parallax experience by coordinating Three.js OrbitControls zoom with native page scrolling. This directive solves the common problem of scroll conflicts when embedding interactive 3D scenes in scrollable web pages.

## The Problem

When using OrbitControls with zoom enabled, the mouse wheel is captured for 3D camera zoom, preventing natural page scrolling. Users expect:

1. Initial scroll to zoom the 3D camera (immersive experience)
2. Continued scroll at zoom limits to scroll the page (natural web behavior)

Without coordination, users get stuck - either the 3D scene captures all scrolling forever, or scrolling doesn't zoom the camera at all.

## The Solution

This directive monitors OrbitControls distance in real-time and:

- **Within zoom range** (5-50 units): Mouse wheel zooms 3D camera
- **At max distance** (50 units): Additional scroll down triggers page scroll
- **At min distance** (5 units): Additional scroll up triggers page scroll

The transition is smooth and feels natural thanks to:

- Configurable threshold zones near limits
- Optional easing for smooth scroll acceleration
- Debouncing to prevent jitter
- Delta time awareness for consistent behavior

## Architecture

### Key Components

1. **Wheel Event Listener**: Intercepts wheel events on the canvas
2. **Distance Monitor**: Tracks camera distance from target in animation loop
3. **State Machine**: Determines when to zoom vs. scroll
4. **Smooth Scroller**: Applies easing for natural-feeling transitions

### Event Flow

```
User scrolls wheel
  ↓
Wheel event captured
  ↓
Calculate current distance
  ↓
Distance < maxDistance?
  ├─ YES → Normal 3D zoom
  └─ NO → Prevent default, trigger page scroll
```

## Usage

### Basic Setup

```typescript
// In your scene component template
<app-orbit-controls
  scrollZoomCoordinator
  [minDistance]="5"
  [maxDistance]="50"
  [enableZoom]="true"
/>
```

### Advanced Configuration

```typescript
// scene-graph.component.ts
@Component({
  template: `
    <app-orbit-controls
      scrollZoomCoordinator
      [target]="[0, 0, 0]"
      [enableDamping]="true"
      [enableZoom]="true"
      [minDistance]="5"
      [maxDistance]="50"
      <!--
      Scroll
      Coordinator
      Config
      --
    >
      [scrollThreshold]="0.5" [scrollSensitivity]="1.2" [enableEasing]="true" [easingFactor]="0.15"
      [scrollDebounceMs]="16"

      <!-- Event Handlers -->
      (stateChange)="onScrollZoomStateChange($event)"
      (scrollTransition)="onScrollTransition($event)" />
    </app-orbit-controls>
  `,
})
export class MySceneComponent {
  onScrollZoomStateChange(state: ScrollZoomState): void {
    console.log('Distance:', state.distance);
    console.log('At max:', state.atMaxDistance);

    // Show UI hint when at limits
    if (state.allowPageScroll) {
      this.showScrollHint = true;
    }
  }

  onScrollTransition(event: { direction: 'up' | 'down' }): void {
    console.log('Scroll transition:', event.direction);

    // Track analytics
    this.analytics.track('3d-to-page-scroll', event.direction);
  }
}
```

## Configuration Options

### scrollThreshold

**Type:** `number` (0-1)
**Default:** `0.5`
**Description:** Distance threshold from limits before triggering page scroll

Example:

- `0.1` = Trigger at 10% from limit (more responsive)
- `0.5` = Trigger at 50% from limit (balanced)
- `1.0` = Trigger exactly at limit (less responsive)

### scrollSensitivity

**Type:** `number`
**Default:** `1.0`
**Description:** Multiplier for scroll speed on page

Example:

- `0.5` = Half speed (slower scrolling)
- `1.0` = Normal speed
- `2.0` = Double speed (faster scrolling)

### enableEasing

**Type:** `boolean`
**Default:** `true`
**Description:** Enable smooth easing for scroll transitions

When `true`, scroll acceleration is gradual and natural-feeling. When `false`, scroll is immediate and linear.

### easingFactor

**Type:** `number` (0-1)
**Default:** `0.15`
**Description:** Easing interpolation factor

Lower values = smoother but slower transitions
Higher values = snappier but less smooth transitions

### scrollDebounceMs

**Type:** `number`
**Default:** `16` (≈60fps)
**Description:** Minimum time between scroll events in milliseconds

Prevents rapid-fire scroll events from causing jitter. Adjust based on target frame rate.

## Events

### stateChange

**Type:** `output<ScrollZoomState>`
**Emits:** On every distance change

```typescript
interface ScrollZoomState {
  distance: number; // Current camera distance
  atMinDistance: boolean; // At closest zoom
  atMaxDistance: boolean; // At farthest zoom
  allowPageScroll: boolean; // Page scroll enabled
  scrollDirection: number; // 1=down, -1=up, 0=none
}
```

Use for:

- UI feedback (show hints at limits)
- Analytics tracking
- Conditional styling

### scrollTransition

**Type:** `output<{ direction: 'up' | 'down' }>`
**Emits:** When transitioning from 3D zoom to page scroll

Use for:

- Visual effects (highlight scroll indicator)
- Analytics events
- Tutorial hints

## Best Practices

### 1. Set Appropriate Distance Limits

```typescript
// Good: Wide zoom range for exploration
[minDistance] =
  '5'[maxDistance] =
  // Too narrow: Limited zoom feels restrictive
  '50'[minDistance] =
  '18'[maxDistance] =
    '22';
```

### 2. Tune Threshold for Your Scene

```typescript
// Fast-paced landing page: Quick transition
[scrollThreshold] = // Immersive exploration: Let users zoom fully
  '0.2'[scrollThreshold] = '0.8';
```

### 3. Match Scroll Sensitivity to Content

```typescript
// Dense content below: Slower scroll
[scrollSensitivity] = // Spacious layout: Normal scroll
  '0.6'[scrollSensitivity] = '1.0';
```

### 4. Provide Visual Feedback

```typescript
onScrollZoomStateChange(state: ScrollZoomState): void {
  // Show hint when nearing limits
  this.showScrollHint = state.distance >= 45; // 90% of maxDistance
}
```

```html
@if (showScrollHint) {
<div class="scroll-hint">Scroll to continue ↓</div>
}
```

## Performance Considerations

### Animation Frame vs. Event Listener

The directive uses **both** for optimal performance:

- **Wheel Event**: Immediate response to user input
- **Animation Loop**: Continuous state monitoring

This hybrid approach ensures responsive controls without polling overhead.

### Zone Optimization

All monitoring runs **outside Angular zones** via `runOutsideAngular()`, preventing unnecessary change detection cycles. Events only trigger zone runs when emitting to parent components.

### Debouncing

The `scrollDebounceMs` parameter prevents rapid-fire events from overwhelming the browser. Default 16ms matches 60fps (one event per frame).

## Browser Compatibility

Tested and supported:

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile Safari (iOS 15+)
- ✅ Chrome Mobile (Android)

Wheel event handling uses `{ passive: false }` for `preventDefault()` support, which is necessary for scroll hijacking.

## Troubleshooting

### Scroll feels laggy

**Solution:** Reduce `easingFactor` or disable easing

```typescript
[enableEasing] = // Or
  'false'[easingFactor] = '0.3';
```

### Zoom doesn't transition to scroll

**Solution:** Check minDistance/maxDistance match OrbitControls config

```typescript
// These must match:
<app-orbit-controls
  [minDistance]="5"
  [maxDistance]="50"
  scrollZoomCoordinator
/>
```

### Page scrolls too fast at limit

**Solution:** Reduce scroll sensitivity

```typescript
[scrollSensitivity] = '0.5';
```

### Jittery behavior on touchpad

**Solution:** Increase debounce threshold

```typescript
[scrollDebounceMs] = '32';
```

## Examples

### Landing Page Hero Section

```typescript
// Immersive 3D intro that flows into page content
<app-orbit-controls
  scrollZoomCoordinator
  [minDistance]="8"
  [maxDistance]="40"
  [scrollThreshold]="0.3"
  [scrollSensitivity]="0.8"
  [enableEasing]="true"
  (scrollTransition)="onScrollToContent($event)"
/>
```

### Product Showcase

```typescript
// Detailed product exploration with smooth scroll to details
<app-orbit-controls
  scrollZoomCoordinator
  [minDistance]="2"
  [maxDistance]="20"
  [scrollThreshold]="0.6"
  [scrollSensitivity]="1.0"
  [enableEasing]="true"
/>
```

### Architectural Visualization

```typescript
// Precise camera control with deliberate scroll transition
<app-orbit-controls
  scrollZoomCoordinator
  [minDistance]="10"
  [maxDistance]="100"
  [scrollThreshold]="0.8"
  [scrollSensitivity]="1.2"
  [enableEasing]="false"
/>
```

## Implementation Details

### Distance Calculation

```typescript
const distance = controls.object.position.distanceTo(controls.target);
const atMaxDistance = distance >= maxDistance - scrollThreshold;
```

This uses Three.js's `Vector3.distanceTo()` for accurate 3D distance measurement.

### Smooth Scrolling Algorithm

```typescript
// Accumulate wheel delta
this.accumulatedDelta += deltaY;

// Apply with easing
const ease = () => {
  const scrollStep = this.accumulatedDelta * easingFactor;
  window.scrollBy({ top: scrollStep, behavior: 'auto' });
  this.accumulatedDelta -= scrollStep;

  if (Math.abs(this.accumulatedDelta) > 0.5) {
    requestAnimationFrame(ease);
  }
};
```

This creates natural-feeling acceleration/deceleration by gradually reducing accumulated delta.

## Related Resources

- [Three.js OrbitControls Documentation](https://threejs.org/docs/#examples/en/controls/OrbitControls)
- [Codrops: Scroll-Based Animations in Three.js](https://tympanus.net/codrops/2022/01/05/crafting-scroll-based-animations-in-three-js/)
- [Three.js Discourse: Zoom and Scroll Coordination](https://discourse.threejs.org/t/scroll-page-when-maximum-zoom-is-reached/4198)

## License

Part of the Hive Academy Angular 3D system.
