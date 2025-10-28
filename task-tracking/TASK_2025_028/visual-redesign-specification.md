# Visual Redesign Specification - TASK_2025_028

## Executive Summary

**Objective**: Elevate all landing page sections (except hero) from "way basic" to sophisticated, professional visual design matching design-system reference quality.

**Design Philosophy**: Maintain hero section's visual sophistication as quality benchmark. Apply design-1.png minimalism, design-2.png card mastery, design-3.png dark contrasts, and design-4.png 3D depth throughout.

**Scope**: 6 sections requiring comprehensive visual enhancement + global design system updates.

---

## DESIGN SYSTEM ENHANCEMENTS

### 1. Extended Tailwind Configuration

**Add to `apps/dev-brand-ui/tailwind.config.js` in `theme.extend` section**:

```javascript
module.exports = {
  theme: {
    extend: {
      // ENHANCED TYPOGRAPHY SCALE
      fontSize: {
        display: ['88px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'section-lg': ['72px', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'subsection-lg': ['48px', { lineHeight: '1.25' }],
      },

      // ENHANCED SHADOW SYSTEM (Subtle Layered Depths)
      boxShadow: {
        'card-minimal': '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.03)',
        'card-elevated': '0 4px 12px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.06)',
        'card-glow-indigo': '0 4px 12px rgba(0,0,0,0.04), 0 0 24px rgba(99,102,241,0.15)',
        'card-glow-purple': '0 4px 12px rgba(0,0,0,0.04), 0 0 24px rgba(139,92,246,0.15)',
        'cta-primary': '0 8px 24px rgba(0,0,0,0.08), 0 0 40px rgba(99,102,241,0.3)',
      },

      // ACCENT COLOR VARIATIONS
      colors: {
        'accent-secondary': '#8B5CF6', // Purple for gradients
        'accent-tertiary': '#06B6D4', // Cyan for highlights
      },

      // ENHANCED BORDER RADIUS
      borderRadius: {
        'card-lg': '24px', // Larger cards
        'card-xl': '32px', // Featured cards
      },

      // ENHANCED SPACING (Additional large values)
      spacing: {
        160: '40rem', // 640px for extreme section padding
        200: '50rem', // 800px for hero-level spacing
      },

      // BACKDROP BLUR (Glassmorphism)
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },

      // SCALE VARIATIONS (Micro-interactions)
      scale: {
        98: '0.98', // Active state (pressed)
        102: '1.02', // Subtle hover
        103: '1.03', // Medium hover
        105: '1.05', // Prominent hover
        108: '1.08', // Primary CTA hover
      },

      // ANIMATION DURATIONS
      transitionDuration: {
        400: '400ms',
        600: '600ms',
        800: '800ms',
      },

      // GRADIENT STOPS (Common patterns)
      backgroundImage: {
        'gradient-card': 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
        'gradient-card-hover': 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)',
        'gradient-cta-primary': 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        'gradient-cta-secondary': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        'gradient-roi': 'linear-gradient(135deg, #eef2ff 0%, #ffffff 50%, #faf5ff 100%)',
      },
    },
  },
  plugins: [
    // Add these if not already present
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
};
```

### 2. New Reusable Component Patterns

#### Pattern A: Enhanced Card Base Component

```typescript
// shared/components/enhanced-card.component.ts
@Component({
  selector: 'app-enhanced-card',
  standalone: true,
  imports: [CommonModule, NgClass],
  template: `
    <div
      [ngClass]="{
        'bg-white rounded-card-lg shadow-card-minimal hover:shadow-card-elevated':
          variant === 'default',
        'bg-gradient-card rounded-card-lg shadow-card-minimal hover:shadow-card-hover hover:bg-gradient-card-hover':
          variant === 'gradient',
        'bg-gradient-cta-primary text-white rounded-card-xl shadow-cta-primary':
          variant === 'primary-cta',
        'border border-gray-100': showBorder,
        'transition-all duration-300': true,
        'hover:scale-102': enableHover && variant === 'default',
        'hover:scale-105': enableHover && variant === 'primary-cta'
      }"
      [class]="additionalClasses"
    >
      <ng-content />
    </div>
  `,
})
export class EnhancedCardComponent {
  @Input() variant: 'default' | 'gradient' | 'primary-cta' = 'default';
  @Input() showBorder: boolean = true;
  @Input() enableHover: boolean = true;
  @Input() additionalClasses: string = '';
}
```

#### Pattern B: Glassmorphism Pill Component

```typescript
// shared/components/glass-pill.component.ts
@Component({
  selector: 'app-glass-pill',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center gap-2 px-4 py-2 backdrop-blur-md rounded-full text-sm font-medium transition-all duration-300"
      [ngClass]="{
        'bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 hover:bg-indigo-500/20': color === 'indigo',
        'bg-purple-500/10 border border-purple-500/20 text-purple-700 hover:bg-purple-500/20': color === 'purple',
        'bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 hover:bg-cyan-500/20': color === 'cyan',
      }"
    >
      <ng-content />
    </span>
  `,
})
export class GlassPillComponent {
  @Input() color: 'indigo' | 'purple' | 'cyan' = 'indigo';
}
```

#### Pattern C: 3D Icon Container Component

```typescript
// shared/components/icon-3d-container.component.ts
@Component({
  selector: 'app-icon-3d-container',
  standalone: true,
  imports: [Scene3DComponent],
  template: `
    <div [class]="'relative ' + sizeClass">
      @if (use3D) {
      <app-scene-3d
        [sceneGraph]="sceneGraphComponent"
        [camera]="{ position: [0, 0, 5], fov: 50 }"
        [enableMouseParallax]="false"
      />
      } @else {
      <ng-content />
      }
    </div>
  `,
})
export class Icon3DContainerComponent {
  @Input() use3D: boolean = true;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() sceneGraphComponent?: Type<any>;

  get sizeClass(): string {
    const sizes = {
      sm: 'w-12 h-12',
      md: 'w-16 h-16',
      lg: 'w-20 h-20',
      xl: 'w-24 h-24',
    };
    return sizes[this.size];
  }
}
```

---

## SECTION 1: PROBLEM/SOLUTION REDESIGN

### Overview

**Current**: Basic gray background, simple white cards, heavy shadows
**Target**: Minimal elegance with subtle depth, gradient accents, 3D decorative elements

### Visual Specifications

#### 1.1 Section Container

```typescript
// problem-solution-section.component.ts
template: `
  <section class="relative py-20 md:py-32 px-8 md:px-16 bg-white overflow-hidden">
    <!-- Decorative 3D Background (20% opacity) -->
    <div class="absolute inset-0 z-0 opacity-20 pointer-events-none">
      <app-scene-3d [sceneGraph]="decorativeSceneGraph" />
    </div>

    <!-- Content Layer -->
    <div class="relative z-10 max-w-7xl mx-auto">
      <!-- Section content -->
    </div>
  </section>
`;
```

**Changes from Current**:

- Background: `bg-white` (from `bg-gray-50`)
- Add decorative 3D layer at 20% opacity
- Add `overflow-hidden` for 3D element containment
- Maintain spacing: `py-20 md:py-32`

#### 1.2 Section Headline

```html
<h2
  class="text-5xl md:text-section-lg font-bold text-headline leading-tight mb-16 text-center"
  scrollAnimation
  [scrollConfig]="{
    animation: 'fadeIn',
    start: 'top 80%',
    duration: 1.0,
    ease: 'power3.out',
    once: false
  }"
>
  The Problem <span class="text-accent-primary">TypeScript Developers</span> Face
</h2>
```

**Changes from Current**:

- Size: `text-5xl md:text-section-lg` (from `text-4xl md:text-6xl`)
- Margin: `mb-16` (from `mb-12`) - increased breathing room
- Add color accent: `text-accent-primary` on "TypeScript Developers"
- Animation duration: `1.0` (from `0.8`) - slower, more graceful

#### 1.3 Solution Card (Asymmetric Layout)

```html
<app-enhanced-card
  variant="default"
  additionalClasses="max-w-5xl mx-auto mb-20"
  scrollAnimation
  [scrollConfig]="{
    animation: 'slideUp',
    start: 'top 70%',
    duration: 0.8,
    once: false
  }"
>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-12 p-12 md:p-16">
    <!-- Left Column: Decorative Element -->
    <div class="hidden lg:flex items-center justify-center">
      <app-icon-3d-container size="xl" [sceneGraphComponent]="solutionIconSceneGraph" />
    </div>

    <!-- Right Column: Content -->
    <div class="lg:col-span-2">
      <div
        class="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold uppercase tracking-wide mb-4"
      >
        Our Solution
      </div>
      <h3 class="text-3xl md:text-4xl font-bold text-headline mb-6 leading-tight">
        NestJS Patterns for AI/ML
      </h3>
      <p class="text-lg md:text-xl text-secondary leading-relaxed">
        NestJS AI SaaS Starter applies familiar NestJS patterns (decorators, dependency injection,
        modules) to AI/ML operations. ChromaDB and Neo4j get TypeORM-style repositories. LangGraph
        workflows become declarative classes with @Node and @Edge decorators. Enterprise features
        (monitoring, approvals, streaming) work out-of-the-box.
      </p>
    </div>
  </div>
</app-enhanced-card>
```

**Changes from Current**:

- Use `app-enhanced-card` wrapper with minimal shadow
- Asymmetric 3-column layout (1 col icon, 2 cols content)
- Padding: `p-12 md:p-16` (from `p-8 md:p-12`)
- Add badge label above headline
- Increased bottom margin: `mb-20` (from `mb-16`)
- Typography: `text-3xl md:text-4xl` for headline

#### 1.4 Metric Cards Grid

```html
<div
  class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto"
  scrollAnimation
  [scrollConfig]="{
    animation: 'slideUp',
    start: 'top 80%',
    duration: 0.8,
    ease: 'power3.out',
    stagger: 0.15,
    once: false
  }"
>
  @for (metric of metrics; track metric.value; let idx = $index) {
  <div
    class="bg-gradient-card rounded-card-lg shadow-card-minimal border border-gray-100 p-10 text-center group hover:shadow-card-glow-indigo hover:scale-102 hover:border-indigo-100 transition-all duration-300 cursor-pointer"
  >
    <!-- Icon/Illustration -->
    <div class="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
      <app-icon-3d-container size="md" [sceneGraphComponent]="metricIconSceneGraphs[idx]" />
    </div>

    <!-- Metric Value with Count-Up Animation -->
    <div
      class="text-6xl md:text-7xl font-bold text-accent-primary mb-4 group-hover:scale-105 transition-transform duration-300"
      [appCountUp]="metric.value"
    >
      {{ metric.value }}
    </div>

    <!-- Metric Label -->
    <div class="text-lg text-primary font-semibold mb-3">{{ metric.label }}</div>

    <!-- Metric Description -->
    <div class="text-sm text-secondary leading-relaxed">{{ metric.description }}</div>
  </div>
  }
</div>
```

**Changes from Current**:

- Background: `bg-gradient-card` (subtle gradient, not flat white)
- Border: Add `border border-gray-100`
- Shadow: `shadow-card-minimal` (from `shadow-lg`) - much subtler
- Hover: `shadow-card-glow-indigo` + `border-indigo-100` glow effect
- Scale: `hover:scale-102` (from `hover:scale-105`) - subtle
- Padding: `p-10` (from `p-8`) - more generous
- Corner radius: `rounded-card-lg` (24px, from 16px)
- Add 3D icon above metric
- Add count-up animation directive
- Metric size: `text-6xl md:text-7xl` (from `text-5xl md:text-6xl`)
- Add cursor pointer for interactivity hint

#### 1.5 Decorative 3D Scene Graph

```typescript
// scene-graphs/problem-solution-decorative.component.ts
@Component({
  selector: 'app-problem-solution-decorative',
  standalone: true,
  imports: [NgtArgs, FloatingSphereComponent],
  template: `
    <!-- Ambient lighting -->
    <ngt-ambient-light [intensity]="0.5" />
    <ngt-directional-light [position]="[5, 5, 5]" [intensity]="0.8" />

    <!-- 3 Floating Spheres (subtle, slow motion) -->
    <app-floating-sphere
      [position]="[-8, 4, -10]"
      [radius]="0.6"
      [color]="0x6366F1"
      [segments]="16"
      [float3dConfig]="{
        height: 0.3,
        speed: 5000,
        ease: 'sine.inOut',
        autoStart: true
      }"
      [glow3dConfig]="{
        color: 0x6366F1,
        intensity: 0.15,
        scale: 1.3
      }"
      performance3d
    />

    <app-floating-sphere
      [position]="[8, -2, -12]"
      [radius]="0.4"
      [color]="0x8B5CF6"
      [segments]="16"
      [float3dConfig]="{
        height: 0.2,
        speed: 6000,
        ease: 'sine.inOut',
        autoStart: true
      }"
      [glow3dConfig]="{
        color: 0x8B5CF6,
        intensity: 0.12,
        scale: 1.2
      }"
      performance3d
    />

    <app-floating-sphere
      [position]="[0, 6, -15]"
      [radius]="0.5"
      [color]="0x06B6D4"
      [segments]="16"
      [float3dConfig]="{
        height: 0.25,
        speed: 5500,
        ease: 'sine.inOut',
        autoStart: true
      }"
      [glow3dConfig]="{
        color: 0x06B6D4,
        intensity: 0.1,
        scale: 1.25
      }"
      performance3d
    />
  `,
})
export class ProblemSolutionDecorativeComponent {}
```

**Specifications**:

- 3 spheres total (minimal, not overwhelming)
- Colors: Indigo, purple, cyan (accent variations)
- Slow float speeds: 5000-6000ms
- Low glow intensity: 0.1-0.15
- Positioned far back (z: -10 to -15)

---

## SECTION 2: VALUE PROPOSITIONS REDESIGN

### Overview

**Current**: Simple white cards in spotlight layout (correct structure)
**Target**: Asymmetric layouts with alternating sides, 3D rotating icons, enhanced depth

### Visual Specifications

#### 2.1 ValuePropositionCard Component Redesign

```typescript
// components/value-proposition-card.component.ts
@Component({
  selector: 'app-value-proposition-card',
  standalone: true,
  imports: [CommonModule, ScrollAnimationDirective, Icon3DContainerComponent, GlassPillComponent],
  template: `
    <div
      [ngClass]="{
        'flex flex-col lg:flex-row': true,
        'lg:flex-row-reverse': layoutVariant === 'right'
      }"
      class="bg-white rounded-card-lg shadow-card-minimal border border-gray-100 overflow-hidden group hover:shadow-card-glow-indigo hover:scale-[1.01] transition-all duration-500 cursor-pointer"
      scrollAnimation
      [scrollConfig]="{
        animation: 'slideUp',
        start: 'top 85%',
        duration: 0.8,
        ease: 'power3.out',
        once: false
      }"
    >
      <!-- Left/Right Column: Icon + Metric (30% width) -->
      <div
        class="lg:w-[30%] p-12 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50/50 to-purple-50/30"
      >
        <!-- 3D Rotating Icon -->
        <app-icon-3d-container size="xl" [sceneGraphComponent]="iconSceneGraph" class="mb-8" />

        <!-- Package Name Badge -->
        <app-glass-pill color="indigo" class="mb-8">
          {{ valueProposition.packageName }}
        </app-glass-pill>

        <!-- Metric Callout -->
        <div class="text-center">
          <div class="text-5xl font-bold text-accent-primary mb-2">
            {{ valueProposition.metricValue }}
          </div>
          <div class="text-xs uppercase tracking-wide text-secondary font-semibold">
            {{ valueProposition.metricLabel }}
          </div>
        </div>
      </div>

      <!-- Right/Left Column: Content (70% width) -->
      <div class="lg:w-[70%] p-12">
        <!-- Business Value Headline -->
        <h3
          class="text-3xl md:text-4xl font-bold text-headline mb-6 leading-tight group-hover:text-accent-primary transition-colors duration-300"
        >
          {{ valueProposition.businessHeadline }}
        </h3>

        <!-- Pain Point Section -->
        <div class="mb-6">
          <div
            class="inline-block px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-semibold uppercase tracking-wide mb-2"
          >
            Traditional Approach
          </div>
          <p class="text-base text-secondary leading-relaxed">
            {{ valueProposition.painPoint }}
          </p>
        </div>

        <!-- Solution Section -->
        <div class="mb-8">
          <div
            class="inline-block px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-semibold uppercase tracking-wide mb-2"
          >
            Our Solution
          </div>
          <p class="text-base text-primary leading-relaxed font-medium">
            {{ valueProposition.solution }}
          </p>
        </div>

        <!-- Capabilities List -->
        <ul class="space-y-3">
          @for (capability of valueProposition.capabilities; track capability) {
          <li class="flex items-start gap-3 group/item">
            <!-- Custom Checkmark -->
            <div
              class="flex-shrink-0 w-6 h-6 rounded-full bg-green-50 flex items-center justify-center mt-0.5 group-hover/item:bg-green-100 transition-colors duration-200"
            >
              <svg
                class="w-4 h-4 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <span
              class="text-sm text-secondary leading-relaxed group-hover/item:text-primary transition-colors duration-200"
            >
              {{ capability }}
            </span>
          </li>
          }
        </ul>

        <!-- Hover Arrow Indicator -->
        <div
          class="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300"
        >
          <svg
            class="w-6 h-6 text-accent-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </div>
  `,
})
export class ValuePropositionCardComponent {
  @Input({ required: true }) valueProposition!: ValueProposition;
  @Input() layoutVariant: 'left' | 'right' = 'left';
  @Input() iconSceneGraph!: Type<any>;
}
```

**Key Changes**:

1. **Asymmetric Layout**: 30% icon column, 70% content column
2. **Alternating Sides**: `layoutVariant` prop for left/right alternation
3. **Gradient Background**: Icon column has subtle gradient (`from-indigo-50/50 to-purple-50/30`)
4. **Enhanced Typography**: Larger headline `text-3xl md:text-4xl`
5. **Badge Labels**: Color-coded pain point (red) vs solution (green)
6. **Glassmorphism Pill**: Package name uses glass effect
7. **Enhanced Checkmarks**: Circular background with hover effect
8. **Hover State**: Glow shadow + border color + subtle scale
9. **3D Icon Integration**: Replaces static icon with rotating 3D element

#### 2.2 Section Container with Alternation Logic

```typescript
// value-propositions-section.component.ts
template: `
  <section class="py-20 md:py-32 px-8 md:px-16 bg-white">
    <div class="max-w-7xl mx-auto space-y-32">
      @for (valueProposition of valuePropositions; track valueProposition.packageName; let idx = $index; let isOdd = $odd) {
        <app-value-proposition-card
          [valueProposition]="valueProposition"
          [layoutVariant]="isOdd ? 'left' : 'right'"
          [iconSceneGraph]="iconSceneGraphs[idx]"
        />

        <!-- Decorative Floating Element (Every 3rd card) -->
        @if ((idx + 1) % 3 === 0 && idx < valuePropositions.length - 1) {
          <div class="relative h-32 flex items-center justify-center">
            <div class="w-12 h-12 relative opacity-30">
              <app-scene-3d [sceneGraph]="dividerSceneGraph" />
            </div>
          </div>
        }
      }
    </div>
  </section>
`;
```

**Alternation Pattern**:

- Odd cards (1, 3, 5, 7, 9, 11): Icon left, content right
- Even cards (2, 4, 6, 8, 10): Icon right, content left
- Every 3rd card: Add decorative floating element divider

#### 2.3 3D Icon Scene Graphs (Reusable Pattern)

```typescript
// scene-graphs/value-prop-icon-base.component.ts
@Component({
  selector: 'app-value-prop-icon-base',
  standalone: true,
  imports: [NgtArgs, PolyhedronComponent],
  template: `
    <ngt-ambient-light [intensity]="0.6" />
    <ngt-directional-light [position]="[3, 3, 3]" [intensity]="1" />

    <!-- Single Rotating Polyhedron -->
    <app-polyhedron
      [position]="[0, 0, 0]"
      [geometry]="geometryType"
      [radius]="0.8"
      [color]="color"
      [segments]="1"
      [rotateConfig]="{
        axis: 'y',
        speed: 0.3,
        autoStart: true
      }"
      [glow3dConfig]="{
        color: color,
        intensity: 0.2,
        scale: 1.3
      }"
      performance3d
    />
  `,
})
export class ValuePropIconBaseComponent {
  @Input() geometryType: 'icosahedron' | 'octahedron' | 'dodecahedron' = 'icosahedron';
  @Input() color: number = 0x6366f1;
}
```

**Icon Assignments** (11 icons for 11 value propositions):

1. ChromaDB: Icosahedron, Indigo
2. Neo4j: Dodecahedron, Purple
3. Memory: Octahedron, Cyan
4. Checkpoint: Icosahedron, Indigo (variation)
5. Functional-API: Octahedron, Purple (variation)
6. Multi-Agent: Dodecahedron, Cyan (variation)
7. Platform: Icosahedron, Indigo
8. Time-Travel: Octahedron, Purple
9. Monitoring: Dodecahedron, Cyan
10. HITL: Icosahedron, Indigo
11. Streaming: Octahedron, Purple

---

## SECTION 3: WORKFLOW EXAMPLES REDESIGN

### Overview

**Current**: Not yet implemented
**Target**: Large feature cards with glassmorphism pills, enhanced code blocks, value mini-cards

### Visual Specifications

#### 3.1 WorkflowExampleCard Component

```typescript
// components/workflow-example-card.component.ts
template: `
  <app-enhanced-card
    variant="default"
    additionalClasses="mb-16 overflow-hidden"
    scrollAnimation
    [scrollConfig]="{
      animation: 'fadeIn',
      start: 'top 75%',
      duration: 1.0,
      once: false
    }"
  >
    <div class="p-12 md:p-16">
      <!-- Header: Number + Title -->
      <div class="flex items-start gap-8 mb-10">
        <!-- 3D Number Badge -->
        <div class="flex-shrink-0">
          <div class="relative w-20 h-20 rounded-full bg-gradient-cta-primary flex items-center justify-center text-2xl font-bold text-white shadow-[0_0_30px_rgba(99,102,241,0.4)]">
            {{ index + 1 }}
            <!-- Decorative Ring -->
            <div class="absolute inset-0 rounded-full border-2 border-white/30"></div>
          </div>
        </div>

        <!-- Title + Description -->
        <div class="flex-1">
          <h3 class="text-3xl md:text-4xl font-bold text-headline mb-4 leading-tight">
            {{ workflowExample.title }}
          </h3>
          <p class="text-lg text-secondary leading-relaxed">
            {{ workflowExample.description }}
          </p>
        </div>
      </div>

      <!-- Modules Pills (Glassmorphism) -->
      <div class="flex flex-wrap gap-3 mb-10">
        @for (module of workflowExample.modules; track module) {
          <app-glass-pill [color]="getModuleColor(module)">
            {{ module }}
          </app-glass-pill>
        }
      </div>

      <!-- Architecture Diagram -->
      @if (workflowExample.diagramUrl) {
        <div class="mb-10 rounded-xl border-2 border-gray-100 shadow-card overflow-hidden cursor-pointer hover:shadow-card-elevated hover:border-gray-200 transition-all duration-300">
          <img
            [src]="workflowExample.diagramUrl"
            [alt]="'Architecture diagram for ' + workflowExample.title"
            class="w-full h-auto"
            loading="lazy"
          />
        </div>
      }

      <!-- Code Comparison -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <!-- Before: Traditional Approach -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <div class="inline-block px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-semibold uppercase tracking-wide">
              Traditional Approach
            </div>
            <span class="text-sm text-secondary">{{ workflowExample.codeBeforeLines }}+ lines</span>
          </div>

          <!-- Terminal-Style Code Block -->
          <div class="bg-black rounded-xl overflow-hidden shadow-xl">
            <!-- Terminal Header -->
            <div class="bg-gray-800 px-4 py-3 flex items-center justify-between">
              <div class="flex gap-2">
                <div class="w-3 h-3 rounded-full bg-red-500"></div>
                <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div class="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span class="text-xs text-gray-400">manual-setup.ts</span>
              <button class="text-xs text-gray-400 hover:text-gray-200 transition-colors">
                Copy
              </button>
            </div>
            <!-- Code Content -->
            <pre class="p-6 text-sm text-gray-100 overflow-x-auto leading-relaxed font-mono"><code>{{ workflowExample.codeBefore }}</code></pre>
          </div>
        </div>

        <!-- After: Our Approach -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <div class="inline-block px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold uppercase tracking-wide">
              Our Approach
            </div>
            <span class="text-sm text-secondary">{{ workflowExample.codeAfterLines }} line{{ workflowExample.codeAfterLines > 1 ? 's' : '' }}</span>
          </div>

          <!-- Terminal-Style Code Block (Green Accent) -->
          <div class="bg-black rounded-xl overflow-hidden shadow-xl ring-2 ring-green-500/30">
            <!-- Terminal Header -->
            <div class="bg-gray-800 px-4 py-3 flex items-center justify-between">
              <div class="flex gap-2">
                <div class="w-3 h-3 rounded-full bg-red-500"></div>
                <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div class="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span class="text-xs text-gray-400">our-solution.ts</span>
              <button class="text-xs text-gray-400 hover:text-gray-200 transition-colors">
                Copy
              </button>
            </div>
            <!-- Code Content -->
            <pre class="p-6 text-sm text-gray-100 overflow-x-auto leading-relaxed font-mono"><code>{{ workflowExample.codeAfter }}</code></pre>
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div class="border-t border-gray-200 my-10"></div>

      <!-- Value Delivered (Mini-Cards Grid) -->
      <div>
        <h4 class="text-sm uppercase tracking-wide text-secondary font-semibold mb-6">
          Value Delivered
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          @for (value of workflowExample.valueDelivered; track value) {
            <div class="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:border-indigo-100 hover:shadow-sm transition-all duration-200">
              <svg class="w-5 h-5 text-accent-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-sm text-secondary leading-relaxed">{{ value }}</span>
            </div>
          }
        </div>
      </div>
    </div>
  </app-enhanced-card>
`;
```

**Key Features**:

1. **3D Number Badge**: Gradient background with glow shadow and decorative ring
2. **Glassmorphism Pills**: Module tags use backdrop blur and transparency
3. **Terminal-Style Code Blocks**: macOS-style colored buttons, filename, copy button
4. **Color-Coded Labels**: Red for "before", green for "after"
5. **Ring Accent**: Green ring on "after" code block to emphasize improvement
6. **Value Mini-Cards**: Grid of small cards with gradient backgrounds
7. **Generous Padding**: `p-12 md:p-16` throughout

#### 3.2 Section Container

```typescript
// workflow-examples-section.component.ts
template: `
  <section class="py-20 md:py-32 px-8 md:px-16 bg-gray-50">
    <div class="max-w-7xl mx-auto">
      <!-- Section Headline -->
      <h2
        class="text-5xl md:text-section-lg font-bold text-headline leading-tight mb-10 text-center"
        scrollAnimation
        [scrollConfig]="{
          animation: 'fadeIn',
          start: 'top 80%',
          duration: 1.0,
          once: false
        }"
      >
        See Libraries <span class="text-accent-primary">Working Together</span>
      </h2>

      <!-- Section Intro -->
      <p
        class="text-lg md:text-xl text-secondary leading-relaxed max-w-4xl mx-auto text-center mb-20"
        scrollAnimation
        [scrollConfig]="{
          animation: 'fadeIn',
          start: 'top 75%',
          duration: 0.8,
          delay: 0.2,
          once: false
        }"
      >
        These aren't isolated tools—they're a cohesive ecosystem. See how ChromaDB,
        Neo4j, and LangGraph modules orchestrate together through real production workflows.
      </p>

      <!-- Workflow Cards -->
      @for (workflow of workflows; track workflow.title; let idx = $index) {
        <app-workflow-example-card
          [workflowExample]="workflow"
          [index]="idx"
        />
      }
    </div>
  </section>
`;
```

**Background**: `bg-gray-50` (alternates from white sections)

---

## SECTION 4: CAPABILITIES MATRIX REDESIGN

### Overview

**Current**: Not yet implemented
**Target**: Enhanced table with hover effects, checkmark animations, gradient ROI callout

### Visual Specifications

#### 4.1 Section Container

```typescript
// capabilities-matrix-section.component.ts
template: `
  <section class="py-20 md:py-32 px-8 md:px-16 bg-white">
    <div class="max-w-7xl mx-auto">
      <!-- Section Headline -->
      <h2
        class="text-5xl md:text-section-lg font-bold text-headline leading-tight mb-10 text-center"
        scrollAnimation
        [scrollConfig]="{
          animation: 'fadeIn',
          start: 'top 80%',
          duration: 1.0,
          once: false
        }"
      >
        Production-Ready <span class="text-accent-primary">from Day One</span>
      </h2>

      <!-- Section Intro -->
      <p
        class="text-lg md:text-xl text-secondary leading-relaxed max-w-4xl mx-auto text-center mb-16"
        scrollAnimation
        [scrollConfig]="{
          animation: 'fadeIn',
          start: 'top 75%',
          duration: 0.8,
          delay: 0.2,
          once: false
        }"
      >
        Enterprise capabilities built-in across all 13 libraries. Multi-tenancy,
        monitoring, retry logic, caching, audit logging—zero infrastructure code required.
      </p>

      <!-- Capabilities Matrix Table -->
      <div class="overflow-x-auto mb-20" scrollAnimation [scrollConfig]="tableScrollConfig">
        <table class="w-full border-collapse">
          <!-- Table implementation -->
        </table>
      </div>

      <!-- ROI Callout -->
      <div
        class="relative bg-gradient-roi rounded-card-xl p-16 text-center overflow-hidden"
        scrollAnimation
        [scrollConfig]="{
          animation: 'scaleIn',
          start: 'top 80%',
          duration: 1.0,
          ease: 'back.out(1.2)',
          once: false
        }"
      >
        <!-- 3D Decorative Element -->
        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 opacity-10">
          <app-scene-3d [sceneGraph]="roiSceneGraph" />
        </div>

        <div class="relative z-10">
          <div class="text-7xl md:text-8xl font-bold text-accent-primary mb-6 animate-pulse-slow">
            $262,800
          </div>
          <div class="text-2xl md:text-3xl font-bold text-headline mb-4">
            Infrastructure Development Savings
          </div>
          <p class="text-lg text-secondary max-w-3xl mx-auto leading-relaxed">
            Traditional approach: 11 weeks = 1,760 hours = $264,000 in developer time.
            Our approach: 1 day = 8 hours = $1,200. <span class="font-semibold text-primary">Savings: $262,800.</span>
          </p>
        </div>
      </div>
    </div>
  </section>
`;
```

#### 4.2 Enhanced Table Design

```html
<table class="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
  <!-- Sticky Header -->
  <thead
    class="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200"
  >
    <tr>
      <th class="text-left p-5 text-sm font-bold text-gray-700 uppercase tracking-wide">
        Capability
      </th>
      <th class="text-center p-5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
        ChromaDB
      </th>
      <th class="text-center p-5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
        Neo4j
      </th>
      <!-- ... 9 more library columns -->
    </tr>
  </thead>

  <!-- Table Body -->
  <tbody>
    @for (capability of capabilities; track capability.name; let isEven = $even) {
    <tr
      [ngClass]="{
          'bg-white': !isEven,
          'bg-gray-50': isEven,
          'hover:bg-indigo-50': true
        }"
      class="transition-colors duration-200 cursor-pointer"
    >
      <!-- Capability Name -->
      <td class="p-5 text-sm font-medium text-primary border-b border-gray-100">
        {{ capability.name }}
      </td>

      <!-- Checkmark Cells -->
      @for (library of capability.libraries; track library.name) {
      <td class="p-5 text-center border-b border-gray-100">
        @if (library.supported) {
        <div
          class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 group-hover:bg-green-100 transition-all duration-200"
          scrollAnimation
          [scrollConfig]="{
                  animation: 'scaleIn',
                  start: 'top 90%',
                  duration: 0.4,
                  delay: library.delay,
                  once: false
                }"
        >
          <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        } @else {
        <span class="text-gray-300">—</span>
        }
      </td>
      }
    </tr>
    }
  </tbody>
</table>
```

**Key Features**:

1. **Alternating Rows**: Even rows have `bg-gray-50` background
2. **Hover Effect**: `hover:bg-indigo-50` for entire row
3. **Sticky Header**: `sticky top-0 z-10` for scrolling
4. **Enhanced Checkmarks**: Circular background with animation reveal
5. **Stagger Animation**: Each checkmark animates with slight delay

---

## SECTION 5: DEVELOPER EXPERIENCE REDESIGN

### Overview

**Current**: Not yet implemented
**Target**: Consider dark theme variant with terminal-style code blocks

### Visual Specifications

#### 5.1 Section Container (Dark Theme Variant)

```typescript
// developer-experience-section.component.ts
template: `
  <section class="py-20 md:py-32 px-8 md:px-16 bg-gray-900">
    <div class="max-w-7xl mx-auto">
      <!-- Section Headline -->
      <h2
        class="text-5xl md:text-section-lg font-bold text-white leading-tight mb-10 text-center"
        scrollAnimation
        [scrollConfig]="{
          animation: 'fadeIn',
          start: 'top 80%',
          duration: 1.0,
          once: false
        }"
      >
        Write AI Workflows <span class="text-indigo-400">Like NestJS Controllers</span>
      </h2>

      <!-- Section Intro -->
      <p
        class="text-lg md:text-xl text-gray-300 leading-relaxed max-w-4xl mx-auto text-center mb-20"
        scrollAnimation
        [scrollConfig]="{
          animation: 'fadeIn',
          start: 'top 75%',
          duration: 0.8,
          delay: 0.2,
          once: false
        }"
      >
        Same decorators. Same dependency injection. Same module system. Zero learning curve.
      </p>

      <!-- Code Comparison -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
        <!-- Traditional NestJS Controller -->
        <div>
          <div class="inline-block px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs font-semibold uppercase tracking-wide mb-6">
            Traditional NestJS Controller
          </div>

          <!-- Terminal-Style Code Block -->
          <div class="bg-black rounded-xl overflow-hidden shadow-2xl">
            <!-- Terminal Header -->
            <div class="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
              <div class="flex gap-2">
                <div class="w-3 h-3 rounded-full bg-red-500"></div>
                <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div class="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span class="text-xs text-gray-400">user.controller.ts</span>
              <button class="text-xs text-gray-400 hover:text-gray-200 transition-colors">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <!-- Code Content (Syntax Highlighted) -->
            <pre class="p-8 text-sm text-gray-100 overflow-x-auto leading-loose font-mono"><code class="language-typescript">{{ nestjsCode }}</code></pre>
          </div>
        </div>

        <!-- Our AI/ML Workflow -->
        <div>
          <div class="inline-block px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-semibold uppercase tracking-wide mb-6">
            Our AI/ML Workflow (Same Patterns)
          </div>

          <!-- Terminal-Style Code Block (Indigo Accent) -->
          <div class="bg-black rounded-xl overflow-hidden shadow-2xl ring-2 ring-indigo-500/50">
            <!-- Terminal Header -->
            <div class="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
              <div class="flex gap-2">
                <div class="w-3 h-3 rounded-full bg-red-500"></div>
                <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div class="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span class="text-xs text-gray-400">user-analysis.workflow.ts</span>
              <button class="text-xs text-gray-400 hover:text-gray-200 transition-colors">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <!-- Code Content (Syntax Highlighted) -->
            <pre class="p-8 text-sm text-gray-100 overflow-x-auto leading-loose font-mono"><code class="language-typescript">{{ workflowCode }}</code></pre>
          </div>
        </div>
      </div>

      <!-- Pattern Mapping Table -->
      <div>
        <h3 class="text-2xl md:text-3xl font-bold text-white mb-10 text-center">
          Familiar Patterns Applied to AI/ML
        </h3>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse bg-gray-800 rounded-xl overflow-hidden shadow-xl">
            <thead class="bg-gray-750">
              <tr>
                <th class="text-left p-5 text-sm font-bold text-gray-300 uppercase tracking-wide border-b border-gray-700">
                  NestJS Pattern
                </th>
                <th class="text-left p-5 text-sm font-bold text-gray-300 uppercase tracking-wide border-b border-gray-700">
                  Traditional Use
                </th>
                <th class="text-left p-5 text-sm font-bold text-gray-300 uppercase tracking-wide border-b border-gray-700">
                  Our AI/ML Application
                </th>
              </tr>
            </thead>
            <tbody>
              @for (pattern of patterns; track pattern.decorator) {
                <tr class="hover:bg-gray-750 transition-colors duration-200">
                  <td class="p-5 text-sm font-mono text-indigo-400 border-b border-gray-700">
                    {{ pattern.decorator }}
                  </td>
                  <td class="p-5 text-sm text-gray-300 border-b border-gray-700">
                    {{ pattern.traditional }}
                  </td>
                  <td class="p-5 text-sm text-gray-100 font-medium border-b border-gray-700">
                    {{ pattern.aiMl }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
`;
```

**Key Features**:

1. **Dark Background**: `bg-gray-900` for entire section
2. **Light Text**: `text-white`, `text-gray-300` for readability
3. **Terminal Styling**: macOS-style colored buttons
4. **Ring Accent**: Indigo ring on AI/ML code block
5. **Dark Table**: `bg-gray-800` with hover effects
6. **Copy Buttons**: Icon buttons in code block headers

---

## SECTION 6: CTA REDESIGN

### Overview

**Current**: 3 uniform cards with emoji icons
**Target**: Differentiated cards (primary featured, secondary/tertiary standard), 3D icons, enhanced 3D background

### Visual Specifications

#### 6.1 Section Container with Enhanced 3D Background

```typescript
// cta-section.component.ts
template: `
  <section class="relative min-h-[600px] bg-white py-20 md:py-32 px-6 md:px-16">
    <!-- Enhanced 3D Background Layer (40% opacity) -->
    <div class="absolute inset-0 z-0 opacity-40">
      <app-scene-3d
        [sceneGraph]="enhancedCtaSceneGraph"
        [enableMouseParallax]="true"
        [mouseParallax]="{ sensitivity: 0.3, smoothing: 8 }"
      />
    </div>

    <!-- Content Layer -->
    <div class="relative z-10 max-w-6xl mx-auto">
      <!-- Section Headline -->
      <h2
        class="text-5xl md:text-section-lg font-bold text-headline leading-tight mb-10 text-center"
        scrollAnimation
        [scrollConfig]="{
          animation: 'fadeIn',
          start: 'top 75%',
          duration: 1.0,
          ease: 'power3.out',
          once: false
        }"
      >
        Ready to Build <span class="text-accent-primary">Production-Grade AI Apps?</span>
      </h2>

      <!-- Section Intro -->
      <p
        class="text-lg md:text-xl text-secondary leading-relaxed mb-16 text-center max-w-3xl mx-auto"
        scrollAnimation
        [scrollConfig]="{
          animation: 'fadeIn',
          start: 'top 70%',
          duration: 0.8,
          delay: 0.2,
          once: false
        }"
      >
        Explore complete workflow examples, read comprehensive documentation,
        or see the DevBrand API production use case.
      </p>

      <!-- CTA Grid (Featured + Standard Layout) -->
      <div
        class="grid grid-cols-1 md:grid-cols-5 gap-8"
        scrollAnimation
        [scrollConfig]="{
          animation: 'slideUp',
          start: 'top 80%',
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.15,
          once: false
        }"
      >
        <!-- Primary CTA (Featured - Spans 3 columns) -->
        <div class="md:col-span-3">
          <app-enhanced-card
            variant="primary-cta"
            additionalClasses="h-full"
            [enableHover]="true"
          >
            <div class="p-10 flex flex-col h-full">
              <!-- 3D Icon -->
              <app-icon-3d-container
                size="xl"
                [sceneGraphComponent]="exploreIconSceneGraph"
                class="mb-8"
              />

              <h3 class="text-3xl font-bold text-white mb-4">
                Explore Examples
              </h3>
              <p class="text-base text-white/90 mb-8 flex-1">
                See 3 complete workflows: RAG pipeline with streaming, multi-agent
                document processing, and DevBrand API production integration.
              </p>

              <button
                class="w-full px-8 py-4 bg-white text-indigo-600 font-bold rounded-xl hover:bg-gray-50 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <span>View Complete Examples</span>
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </app-enhanced-card>
        </div>

        <!-- Secondary + Tertiary CTAs (Standard - 1 column each) -->
        <div class="md:col-span-2 space-y-8">
          <!-- Secondary CTA: Read Documentation -->
          <app-enhanced-card variant="default" [enableHover]="true">
            <div class="p-8">
              <app-icon-3d-container
                size="lg"
                [sceneGraphComponent]="docsIconSceneGraph"
                class="mb-6"
              />

              <h3 class="text-xl font-bold text-headline mb-3">
                Read Documentation
              </h3>
              <p class="text-sm text-secondary mb-6">
                17+ comprehensive CLAUDE.md files with real code examples
              </p>

              <button
                class="w-full px-6 py-3 bg-white text-accent-primary font-semibold rounded-button border-2 border-accent-primary hover:bg-accent-primary hover:text-white hover:shadow-button-hover transition-all duration-300"
              >
                Read Docs
              </button>
            </div>
          </app-enhanced-card>

          <!-- Tertiary CTA: See Production Use Case -->
          <app-enhanced-card variant="default" [enableHover]="true">
            <div class="p-8">
              <app-icon-3d-container
                size="lg"
                [sceneGraphComponent]="productionIconSceneGraph"
                class="mb-6"
              />

              <h3 class="text-xl font-bold text-headline mb-3">
                See Production Use Case
              </h3>
              <p class="text-sm text-secondary mb-6">
                DevBrand API: All 13 libraries working together
              </p>

              <button
                class="w-full px-6 py-3 bg-white text-accent-primary font-semibold rounded-button border-2 border-accent-primary hover:bg-accent-primary hover:text-white hover:shadow-button-hover transition-all duration-300"
              >
                View Source Code
              </button>
            </div>
          </app-enhanced-card>
        </div>
      </div>
    </div>
  </section>
`;
```

**Key Changes**:

1. **Layout**: 5-column grid (3 cols primary, 2 cols secondary/tertiary stacked)
2. **Primary Card**: Uses `variant="primary-cta"` (gradient background, larger)
3. **3D Icons**: Replace emoji with rotating 3D polyhedrons
4. **Enhanced 3D Background**: Opacity 40% (from 30%), mouse parallax enabled
5. **Button Icons**: Add arrow/chevron icons to CTAs
6. **Stacked Layout**: Secondary/tertiary CTAs stack vertically in right column

#### 6.2 Enhanced 3D Scene Graph

```typescript
// scene-graphs/enhanced-cta-scene-graph.component.ts
@Component({
  selector: 'app-enhanced-cta-scene-graph',
  standalone: true,
  imports: [NgtArgs, FloatingSphereComponent, PolyhedronComponent],
  template: `
    <ngt-ambient-light [intensity]="0.5" />
    <ngt-directional-light [position]="[5, 5, 5]" [intensity]="1" />

    <!-- 8 Mixed 3D Elements (spheres + polyhedrons) -->
    @for (element of elements; track element.position) { @if (element.type === 'sphere') {
    <app-floating-sphere
      [position]="element.position"
      [radius]="element.radius"
      [color]="element.color"
      [segments]="16"
      [float3dConfig]="element.floatConfig"
      [glow3dConfig]="element.glowConfig"
      performance3d
    />
    } @else {
    <app-polyhedron
      [position]="element.position"
      [geometry]="element.geometry"
      [radius]="element.radius"
      [color]="element.color"
      [segments]="1"
      [float3dConfig]="element.floatConfig"
      [glow3dConfig]="element.glowConfig"
      performance3d
    />
    } }
  `,
})
export class EnhancedCtaSceneGraphComponent implements OnInit {
  elements = [
    {
      type: 'sphere',
      position: [-6, 3, -8],
      radius: 0.5,
      color: 0x6366f1,
      floatConfig: { height: 0.3, speed: 4000, ease: 'sine.inOut', autoStart: true },
      glowConfig: { color: 0x6366f1, intensity: 0.2, scale: 1.3 },
    },
    {
      type: 'polyhedron',
      geometry: 'icosahedron',
      position: [6, -2, -10],
      radius: 0.6,
      color: 0x8b5cf6,
      floatConfig: { height: 0.25, speed: 4500, ease: 'sine.inOut', autoStart: true },
      glowConfig: { color: 0x8b5cf6, intensity: 0.18, scale: 1.25 },
    },
    {
      type: 'sphere',
      position: [0, 5, -12],
      radius: 0.4,
      color: 0x06b6d4,
      floatConfig: { height: 0.2, speed: 5000, ease: 'sine.inOut', autoStart: true },
      glowConfig: { color: 0x06b6d4, intensity: 0.15, scale: 1.2 },
    },
    // ... 5 more elements (mix of spheres and polyhedrons)
  ];
}
```

**Enhancements from Current**:

- 8 elements total (from 5)
- Mix of spheres and polyhedrons
- Color variations: indigo, purple, cyan
- Mouse parallax enabled for interactivity

---

## GLOBAL VISUAL ENHANCEMENTS

### 1. Count-Up Animation Directive

```typescript
// directives/count-up.directive.ts
@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective implements AfterViewInit {
  @Input() appCountUp!: string | number;
  @Input() duration: number = 2000;

  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    const target = this.parseValue(this.appCountUp);
    const element = this.el.nativeElement;
    const start = 0;
    const increment = target / (this.duration / 16);
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        element.textContent = this.formatValue(target);
        clearInterval(timer);
      } else {
        element.textContent = this.formatValue(Math.floor(current));
      }
    }, 16);
  }

  private parseValue(value: string | number): number {
    if (typeof value === 'number') return value;
    return parseInt(value.replace(/[^0-9]/g, '')) || 0;
  }

  private formatValue(value: number): string {
    const original = this.appCountUp.toString();
    if (original.includes('%')) return `${value}%`;
    if (original.includes('$')) return `$${value.toLocaleString()}`;
    if (original.includes('+')) return `${value}+`;
    return value.toString();
  }
}
```

**Usage**:

```html
<div class="text-6xl font-bold" [appCountUp]="'90%'" [duration]="2000">90%</div>
```

### 2. Pulse Animation Utility Class

```css
/* Add to global styles */
@keyframes pulse-slow {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

### 3. Hover Group Variants (Nested Hover States)

Tailwind already supports `group-hover:` but we're using `group/item` for nested hovers in capability lists.

---

## RESPONSIVE ADAPTATIONS

### Mobile (< 768px)

1. **Asymmetric Layouts Collapse**:

   - Value prop cards: Icon column stacks on top
   - Workflow cards: Number badge inline with title
   - CTA grid: All cards stack vertically

2. **Typography Scale**:

   - `text-section-lg` → `text-5xl` (72px → 48px)
   - `text-subsection-lg` → `text-3xl` (48px → 30px)

3. **Spacing Reduction**:

   - Section padding: `py-20` (from `py-32`)
   - Card padding: `p-8` (from `p-12 md:p-16`)

4. **3D Elements**:
   - Hide decorative 3D backgrounds on mobile (performance)
   - Keep 3D icons but reduce complexity

### Tablet (768px - 1024px)

1. **Layout Transitions**:

   - Value props: Keep asymmetric but reduce column widths (40% icon, 60% content)
   - Workflow grid: Stack code comparison vertically
   - CTA: 2-column layout (primary full width on top, secondary/tertiary below)

2. **Typography**:
   - Scale between mobile and desktop (60-64px headlines)

---

## IMPLEMENTATION PRIORITY

### Phase 1: Foundation (2 hours)

- Update Tailwind config with new utilities
- Create EnhancedCard, GlassPill, Icon3DContainer components
- Create CountUp directive

### Phase 2: Problem/Solution (2 hours)

- Apply enhanced styling to existing component
- Create decorative scene graph
- Integrate count-up animations

### Phase 3: Value Propositions (4 hours)

- Redesign ValuePropositionCard with asymmetric layout
- Create 11 3D icon scene graphs
- Implement alternation logic

### Phase 4: Workflow Examples (4 hours)

- Create WorkflowExampleCard component
- Implement terminal-style code blocks
- Create glassmorphism pills

### Phase 5: Capabilities Matrix (3 hours)

- Create enhanced table component
- Implement ROI callout with 3D element
- Add checkmark animations

### Phase 6: Developer Experience (3 hours)

- Implement dark theme variant
- Create terminal code blocks
- Build pattern mapping table

### Phase 7: CTA Enhancement (2 hours)

- Redesign with featured/standard layout
- Create 3D icon scene graphs
- Enhance 3D background

### Phase 8: Testing & Polish (2 hours)

- Responsive testing
- Accessibility validation
- Performance optimization

**Total: 22 hours**

---

## SUCCESS CRITERIA

### Visual Quality

- [ ] All sections match design-system sophistication
- [ ] Shadows are subtle and layered
- [ ] Typography has dramatic hierarchy
- [ ] Cards have unique personality
- [ ] 3D elements integrated throughout
- [ ] Micro-interactions smooth and purposeful

### Design System Compliance

- [ ] All custom Tailwind utilities documented
- [ ] All colors from design tokens
- [ ] All spacing follows 8px grid
- [ ] All shadows follow depth system

### User Experience

- [ ] Smooth scroll animations
- [ ] Tactile hover feedback
- [ ] Clear visual hierarchy
- [ ] Professional polish throughout

### Technical Quality

- [ ] All components use design tokens
- [ ] All 3D elements use Angular-3D directives
- [ ] Build passes without errors
- [ ] WCAG 2.1 AA compliant

---

This specification provides pixel-perfect, implementation-ready visual designs for all 6 sections requiring enhancement. Every design decision is mapped to design-system references and includes exact Tailwind classes and Angular-3D configurations.
