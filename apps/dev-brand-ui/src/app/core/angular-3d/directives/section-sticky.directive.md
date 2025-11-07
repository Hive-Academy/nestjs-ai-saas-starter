# Section Sticky Directive

## Overview

The `SectionStickyDirective` makes child elements sticky **only when the parent section is in the viewport**. This prevents sticky elements from appearing across the entire page and provides better UX by containing sticky behavior within logical sections.

## Problem Solved

**Before**: Using `position: fixed` makes elements stick to the viewport across the entire page, appearing on sections where they don't belong.

**After**: Elements become fixed only when their parent section is visible, and return to hidden/absolute positioning when the section exits the viewport.

## Usage

### Basic Implementation

```typescript
import { SectionStickyDirective } from './directives/section-sticky.directive';

@Component({
  imports: [SectionStickyDirective],
  template: `
    <section sectionSticky>
      <nav class="section-sticky-target">
        <!-- This sidebar will be sticky only when section is in viewport -->
      </nav>

      <div class="content">
        <!-- Main content -->
      </div>
    </section>
  `,
  styles: [`
    /* Sidebar is hidden by default */
    .section-sticky-target {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    /* When section is in viewport, sidebar becomes fixed */
    [data-section-in-view='true'] .section-sticky-target {
      position: fixed;
      opacity: 1;
      pointer-events: auto;
    }
  `]
})
```

### With Custom Threshold

```html
<section sectionSticky [stickyThreshold]="0.2" [stickyRootMargin]="-100px">
  <nav class="section-sticky-target">
    <!-- Sidebar content -->
  </nav>
</section>
```

## How It Works

1. **IntersectionObserver**: Monitors when the section enters/exits the viewport
2. **Data Attribute**: Sets `data-section-in-view="true"` when section is visible
3. **CSS Control**: Child elements with `.section-sticky-target` respond to this attribute
4. **Position Toggle**: Switches between `absolute` (hidden) and `fixed` (visible)

## API

### Inputs

| Input              | Type     | Default | Description                                              |
| ------------------ | -------- | ------- | -------------------------------------------------------- |
| `stickyThreshold`  | `number` | `0.1`   | Percentage of section that must be visible (0-1)         |
| `stickyRootMargin` | `string` | `'0px'` | Margin around viewport for triggering (e.g., `'-100px'`) |

### Data Attributes

| Attribute              | Value     | Description                    |
| ---------------------- | --------- | ------------------------------ |
| `data-section-in-view` | `"true"`  | Section is visible in viewport |
| `data-section-in-view` | `"false"` | Section is out of viewport     |

## CSS Patterns

### Fade In/Out

```css
.section-sticky-target {
  position: absolute;
  opacity: 0;
  transition: opacity 0.3s ease;
}

[data-section-in-view='true'] .section-sticky-target {
  position: fixed;
  opacity: 1;
}
```

### Slide In/Out

```css
.section-sticky-target {
  position: absolute;
  left: -200px;
  transition: left 0.3s ease;
}

[data-section-in-view='true'] .section-sticky-target {
  position: fixed;
  left: 32px; /* 8 * 4px = 32px (left-8) */
}
```

### Scale In/Out

```css
.section-sticky-target {
  position: absolute;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.3s ease;
}

[data-section-in-view='true'] .section-sticky-target {
  position: fixed;
  opacity: 1;
  transform: scale(1);
}
```

## Real-World Example: Value Propositions Section

```typescript
@Component({
  template: `
    <section sectionSticky class="relative min-h-screen bg-gray-900">
      <!-- Sidebar with numbered navigation -->
      <nav class="section-sticky-target absolute left-8 top-32 z-20">
        <div class="space-y-3">
          @for (item of items; track $index) {
            <button class="w-10 h-10 rounded-lg bg-gray-800">
              {{ ($index + 1).toString().padStart(2, '0') }}
            </button>
          }
        </div>
      </nav>

      <!-- Main content -->
      <div class="ml-32 pl-8">
        @for (item of items; track $index) {
          <article class="min-h-screen flex items-center">
            <div class="grid lg:grid-cols-2 gap-12">
              <div>3D Scene</div>
              <div>Content</div>
            </div>
          </article>
        }
      </div>
    </section>
  `,
  styles: [`
    .section-sticky-target {
      position: absolute;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }

    [data-section-in-view='true'] .section-sticky-target {
      position: fixed;
      opacity: 1;
      pointer-events: auto;
    }
  `]
})
```

## Browser Compatibility

- ✅ Chrome 51+
- ✅ Firefox 55+
- ✅ Safari 12.1+
- ✅ Edge 15+

Requires `IntersectionObserver` support (all modern browsers).

## Performance

- Uses native `IntersectionObserver` (highly optimized)
- No scroll event listeners
- Minimal DOM manipulation (single attribute toggle)
- CSS handles visual transitions
- ~0.1ms per intersection change

## Common Patterns

### Multiple Sticky Elements

```html
<section sectionSticky>
  <nav class="section-sticky-target left-8">Sidebar 1</nav>
  <aside class="section-sticky-target right-8">Sidebar 2</aside>
  <div class="content">Main content</div>
</section>
```

### Nested Sections

```html
<!-- Each section manages its own sticky elements independently -->
<section sectionSticky>
  <nav class="section-sticky-target">Section 1 Nav</nav>
  <div>Section 1 Content</div>
</section>

<section sectionSticky>
  <nav class="section-sticky-target">Section 2 Nav</nav>
  <div>Section 2 Content</div>
</section>
```

## Troubleshooting

### Sticky element not appearing

**Issue**: `data-section-in-view="true"` is set but element not visible

**Solution**: Check CSS specificity. The selector `[data-section-in-view='true'] .section-sticky-target` might be overridden.

```css
/* Add !important if needed */
[data-section-in-view='true'] .section-sticky-target {
  position: fixed !important;
  opacity: 1 !important;
}
```

### Sticky element flickers

**Issue**: Element appears/disappears rapidly during scroll

**Solution**: Adjust `stickyThreshold` and `stickyRootMargin` to create a buffer zone.

```html
<section sectionSticky [stickyThreshold]="0.2" [stickyRootMargin]="100px"></section>
```

### Sticky element appears on wrong sections

**Issue**: Element stays visible after section exits viewport

**Solution**: Ensure only one section has `sectionSticky` per sticky element, and verify CSS transitions complete.

## Related

- [ScrollAnimationDirective](./scroll-animation.directive.ts) - For animating content on scroll
- [SceneMouseParallaxDirective](./scene-mouse-parallax.directive.ts) - For 3D parallax effects
