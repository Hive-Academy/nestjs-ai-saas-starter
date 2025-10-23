# Architecture Design - TASK_2025_024

**Document Purpose**: Component architecture blueprint for 11 library landing page sections
**Author**: software-architect
**Date**: 2025-01-23
**Pattern Source**: ChromadbSectionComponent (TASK_2025_017)

---

## I. ARCHITECTURE INVESTIGATION SUMMARY

### Codebase Investigation Results

**Pattern Source**: `apps/dev-brand-ui/src/app/features/landing-page/sections/chromadb-section.component.ts`

**Evidence Discovery**:
1. Analyzed ChromaDB section component (500 lines) - Complete working implementation
2. Verified scroll directives:
   - `HijackedScrollTimelineComponent` (line 4) - Timeline container
   - `HijackedScrollItemDirective` (line 5) - Step marker
   - `ScrollAnimationDirective` (line 3) - Independent scroll animations
3. Verified shared components:
   - `CodeSnippetComponent` (line 6) - Syntax highlighting + image display
   - `DecorativePatternComponent` (line 7) - SVG decorative patterns
4. Read UI/UX specifications:
   - `task-description.md` - 11 library requirements with acceptance criteria
   - `asset-manifest.md` - 44 AI-generated image specifications
   - `library-analysis.md` - Business value content source

**Pattern Verification**:
- ✅ All imports verified in codebase
- ✅ Component structure matches Angular 19 standalone pattern
- ✅ Signal-based reactivity confirmed (line 2, 390, 416, 482)
- ✅ Inline template/styles confirmed (line 42, 366)
- ✅ Animation directives verified with GSAP ScrollTrigger integration
- ✅ Zero `any` types confirmed

---

## II. CORE ARCHITECTURAL PATTERNS (Verified from ChromaDB)

### Pattern 1: Component Structure (100% Reusable)

**Evidence**: chromadb-section.component.ts:31-42

```typescript
@Component({
  selector: 'app-{library-name}-section',
  standalone: true,
  imports: [
    CommonModule,                          // Line 34
    HijackedScrollTimelineComponent,       // Line 35
    HijackedScrollItemDirective,           // Line 36
    CodeSnippetComponent,                  // Line 37
    DecorativePatternComponent,            // Line 38
    ScrollAnimationDirective,              // Line 39
  ],
  template: `<!-- Inline template -->`,
  styles: [`/* Inline styles */`],
})
export class {LibraryName}SectionComponent {
  // Signal-based state management
  readonly ecosystemOpacity = signal(0);
  readonly codeTimeline = signal<TimelineStep[]>([...]);
  readonly integrations = signal([...]);
}
```

**Pattern Reuse**: All 11 components follow this EXACT structure

---

### Pattern 2: Signal-Based State Management (Verified)

**Evidence**: chromadb-section.component.ts:386-499

```typescript
export class ChromadbSectionComponent {
  /**
   * Ecosystem section opacity control
   */
  readonly ecosystemOpacity = signal(0);  // Line 390

  constructor() {
    // Fade in ecosystem after mount
    setTimeout(() => {
      this.ecosystemOpacity.set(1);
    }, 500);  // Line 396
  }

  /**
   * Business value timeline - 4 steps per library
   */
  readonly codeTimeline = signal<TimelineStep[]>([
    {
      id: 'step-id',              // Unique identifier
      step: 1,                    // Step number
      title: 'Business Value',    // User-facing benefit
      description: '150-200 word description',  // Full paragraph
      code: 'assets/images/libraries/{library}_step_{N}.png',
      language: 'image',          // Use 'image' for PNG assets
      layout: 'left',             // Alternating: left/right
      notes: [                    // 4 bullet points
        'Benefit 1 (10-15 words)',
        'Benefit 2 (10-15 words)',
        'Benefit 3 (10-15 words)',
        'Benefit 4 (10-15 words)',
      ],
    },
    // ... 3 more steps
  ]);  // Line 416-477

  /**
   * Integration ecosystem cards - 3 per library
   */
  readonly integrations = signal([
    {
      icon: '🧠',                 // Emoji icon
      name: 'Module Name',
      description: '8-12 word integration description',
    },
    // ... 2 more integrations
  ]);  // Line 482-498
}
```

**Pattern Reuse**: Exact signal structure for all 11 components

---

### Pattern 3: Scroll-Jacked Timeline Architecture (Verified)

**Evidence**: chromadb-section.component.ts:167-363

```typescript
<!-- Progressive Code Timeline with Content Projection -->
<app-hijacked-scroll-timeline
  [scrollHeightPerStep]="1000"     <!-- Line 169: 1000vh per step -->
  [start]="'top top'"              <!-- Line 170: Pin at top -->
>
  @for (step of codeTimeline(); track step.id; let i = $index) {
    <div hijackedScrollItem [slideDirection]="'none'">  <!-- Line 173 -->
      <!-- Step Container with Decoration -->
      <div class="relative flex items-start">  <!-- Line 175 -->

        <!-- Decorative Pattern (alternating per step) -->
        @if (i === 0) {
          <div class="absolute left-0 top-1/2 w-full h-96 opacity-30">
            <app-decorative-pattern [pattern]="'data-flow'" />  <!-- Line 183 -->
          </div>
        }
        <!-- ... More decoration patterns per step -->

        <!-- Content Grid: 2-column layout -->
        <div class="container mx-auto px-8 relative z-10">
          <div class="grid lg:grid-cols-2 gap-16 items-center">

            <!-- Content Side: Title + Description + Notes -->
            <div
              [class.lg:order-1]="step.layout === 'left'"    <!-- Line 223 -->
              [class.lg:order-2]="step.layout === 'right'"   <!-- Line 224 -->
              scrollAnimation
              [scrollConfig]="{
                animation: 'custom',
                start: 'top 80%',
                end: 'top 30%',
                scrub: 1,
                from: { opacity: 0, x: step.layout === 'left' ? -60 : 60, y: 20 },
                to: { opacity: 1, x: 0, y: 0 }
              }"  <!-- Lines 225-234 -->
            >
              <!-- Step Number Badge -->
              <div class="inline-flex items-center gap-3 mb-6">
                <span class="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-lg shadow-lg">
                  {{ step.step }}  <!-- Line 240 -->
                </span>
              </div>

              <!-- Title -->
              <h3 class="text-4xl font-bold text-gray-900 mb-4 leading-tight text-3d">
                {{ step.title }}  <!-- Line 249 -->
              </h3>

              <!-- Description -->
              <p class="text-lg text-gray-600 leading-relaxed mb-6">
                {{ step.description }}  <!-- Line 254 -->
              </p>

              <!-- Notes (4 bullet points) -->
              @if (step.notes && step.notes.length > 0) {
                <div class="space-y-3">
                  @for (note of step.notes; track $index) {
                    <div class="flex items-start gap-3">
                      <svg class="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0">
                        <!-- Checkmark icon -->
                      </svg>
                      <p class="text-sm text-gray-700">{{ note }}</p>  <!-- Line 275 -->
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Visual Side: Image or Code -->
            <div
              [class.lg:order-2]="step.layout === 'left'"    <!-- Line 284 -->
              [class.lg:order-1]="step.layout === 'right'"   <!-- Line 285 -->
              scrollAnimation
              [scrollConfig]="{
                animation: 'custom',
                start: 'top 75%',
                end: 'top 25%',
                scrub: 1,
                from: { opacity: 0, x: step.layout === 'left' ? 80 : -80, scale: 0.95 },
                to: { opacity: 1, x: 0, scale: 1 }
              }"  <!-- Lines 286-295 -->
            >
              @if (step.language === 'image') {
                <!-- AI-Generated Image -->
                <div class="relative group pt-5">
                  <img
                    [src]="step.code"
                    [alt]="step.title"
                    class="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                    loading="lazy"  <!-- Line 303 -->
                  />
                </div>
              }
            </div>

          </div>
        </div>
      </div>
    </div>
  }

  <!-- Integration Ecosystem - Sticky Bottom Cards -->
  <div
    class="fixed bottom-0 left-0 right-0 z-0 pointer-events-none"
    [style.opacity]="ecosystemOpacity()"  <!-- Line 338 -->
  >
    <div class="container mx-auto px-8 relative z-10 pointer-events-auto">
      <div class="max-w-5xl mx-auto py-6">
        <h3 class="text-2xl font-bold text-gray-900 mb-4 text-center animate-fade-in-up">
          LangGraph Ecosystem Integration  <!-- Line 342 -->
        </h3>
        <div class="grid grid-cols-3 gap-4">
          @for (integration of integrations(); track integration.name; let i = $index) {
            <div
              class="bg-white/95 backdrop-blur-sm rounded-xl p-4 border border-indigo-100 hover:shadow-lg transition-all duration-300 animate-fade-in-up"
              [style.animation-delay]="(i * 100) + 'ms'"  <!-- Line 349 -->
            >
              <div class="text-3xl mb-2">{{ integration.icon }}</div>
              <h4 class="text-base font-bold text-gray-900 mb-1">{{ integration.name }}</h4>
              <p class="text-xs text-gray-500">{{ integration.description }}</p>
            </div>
          }
        </div>
      </div>
    </div>
  </div>
</app-hijacked-scroll-timeline>
```

**Pattern Reuse**: All 11 components use identical template structure

---

### Pattern 4: Sticky Header with Scroll Animations (Verified)

**Evidence**: chromadb-section.component.ts:46-165

```typescript
<!-- Section Hero - Becomes sticky during scroll -->
<div
  class="relative text-center py-16 flex flex-col justify-center"
  scrollAnimation
  [scrollConfig]="{
    animation: 'custom',
    start: 'top top',
    end: '+=4000',
    scrub: 0.5,
    from: { scale: 1, y: 0 },
    to: { scale: 0.8, y: -20, opacity: 0.6 }
  }"  <!-- Lines 50-58 -->
>
  <!-- Decorative Pattern (unique per library) -->
  <div
    class="absolute inset-0 flex items-center justify-end pointer-events-none"
    scrollAnimation
    [scrollConfig]="{
      animation: 'custom',
      start: 'top 90%',
      end: 'bottom 30%',
      scrub: 0.5,
      from: { scale: 0.6, opacity: 0, rotation: -20, y: 50 },
      to: { scale: 1, opacity: 0.8, rotation: 0, y: -50 }
    }"  <!-- Lines 64-71 -->
  >
    <div class="w-[800px] h-[800px] text-indigo-500 pt-18">
      <app-decorative-pattern [pattern]="'vector-arrows'" />  <!-- Line 74 -->
    </div>
  </div>

  <!-- Hero Content -->
  <div class="relative z-10">
    <!-- Layer Badge -->
    <div scrollAnimation [scrollConfig]="{ /* ... */ }">
      <span class="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-full text-sm font-semibold text-indigo-700 mb-6">
        <svg class="w-4 h-4" fill="currentColor"><!-- Database icon --></svg>
        DATA FOUNDATION LAYER  <!-- Line 99 -->
      </span>
    </div>

    <!-- Main Headline -->
    <h2 class="text-7xl font-bold text-gray-900 mb-6 leading-tight text-3d-extruded" scrollAnimation>
      ChromaDB  <!-- Line 116 -->
    </h2>

    <!-- Subtitle -->
    <p class="text-2xl text-gray-500 leading-relaxed max-w-3xl mx-auto" scrollAnimation>
      Vector database for semantic search and RAG applications.
      <span class="block mt-2 text-indigo-600 font-semibold">
        Build production-ready AI features in minutes, not weeks.  <!-- Lines 132-135 -->
      </span>
    </p>

    <!-- Floating Metrics (3 key metrics) -->
    <div class="flex justify-center gap-12 mt-12" scrollAnimation>
      <div class="text-center">
        <div class="text-4xl font-bold text-indigo-600 mb-2">Sub-100ms</div>
        <div class="text-sm text-gray-500 uppercase tracking-wide">Vector Search</div>
      </div>
      <div class="text-center">
        <div class="text-4xl font-bold text-purple-600 mb-2">70%</div>
        <div class="text-sm text-gray-500 uppercase tracking-wide">Less Boilerplate</div>
      </div>
      <div class="text-center">
        <div class="text-4xl font-bold text-pink-600 mb-2">10K+</div>
        <div class="text-sm text-gray-500 uppercase tracking-wide">Documents/sec</div>
      </div>  <!-- Lines 151-163 -->
    </div>
  </div>
</div>
```

**Pattern Reuse**: All 11 components use identical sticky header structure

---

### Pattern 5: Decorative Patterns (Verified Per Step)

**Evidence**: chromadb-section.component.ts:177-216

```typescript
<!-- Step 0: data-flow pattern (left side, purple-400) -->
@if (i === 0) {
  <div class="absolute left-0 top-1/2 -translate-y-1/2 w-full h-96 pointer-events-none opacity-30">
    <div class="w-full h-full text-purple-400">
      <app-decorative-pattern [pattern]="'data-flow'" />  <!-- Line 183 -->
    </div>
  </div>
}

<!-- Step 1: network-nodes pattern (right side, indigo-400) -->
@if (i === 1) {
  <div class="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none opacity-30">
    <div class="w-full h-full text-indigo-400">
      <app-decorative-pattern [pattern]="'network-nodes'" />  <!-- Line 194 -->
    </div>
  </div>
}

<!-- Step 2: circuit-board pattern (left side, purple-300) -->
@if (i === 2) {
  <div class="absolute left-[-5%] top-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none opacity-30">
    <div class="w-full h-full text-purple-300">
      <app-decorative-pattern [pattern]="'circuit-board'" />  <!-- Line 203 -->
    </div>
  </div>
}

<!-- Step 3: gradient-blob pattern (right side, indigo-300) -->
@if (i === 3) {
  <div class="absolute right-[-5%] top-1/2 -translate-y-1/2 w-[400px] h-[400px] pointer-events-none opacity-30">
    <div class="w-full h-full text-indigo-300">
      <app-decorative-pattern [pattern]="'gradient-blob'" />  <!-- Line 212 -->
    </div>
  </div>
}
```

**Pattern Reuse**: Decorative patterns alternating per step across all 11 components

---

### Pattern 6: CSS Animations (Verified)

**Evidence**: chromadb-section.component.ts:366-383

```typescript
styles: [
  `
    @keyframes fade-in-up {
      from {
        opacity: 0;
        transform: translateY(20px);  <!-- Line 370 -->
      }
      to {
        opacity: 1;
        transform: translateY(0);  <!-- Line 374 -->
      }
    }

    .animate-fade-in-up {
      animation: fade-in-up 0.6s ease-out forwards;
      opacity: 0;  <!-- Line 380 -->
    }
  `,
],
```

**Pattern Reuse**: All 11 components include this keyframe animation

---

## III. COMPONENT ARCHITECTURE DESIGN

### Design Philosophy

**Chosen Approach**: Exact replication of ChromaDB pattern
**Rationale**: Proven working implementation with production-grade animations and performance
**Evidence**: ChromadbSectionComponent successfully implements all requirements (smooth scroll, animations, responsive design)

### Architectural Decisions

#### Decision 1: Signal-Based State Management

**Evidence**: chromadb-section.component.ts:390, 416, 482
**Rationale**: Angular 19 signals provide optimal performance for scroll-based reactivity
**Implementation**: All 11 components use 3 signals (ecosystemOpacity, codeTimeline, integrations)

#### Decision 2: Independent Scroll Animations

**Evidence**: scroll-animation.directive.ts:1-345
**Rationale**: GSAP ScrollTrigger provides professional-grade scroll animations
**Implementation**: Text (1.0x speed) and images (0.95x speed) animate independently for parallax effect

#### Decision 3: Scroll-Jacked Timeline

**Evidence**: hijacked-scroll-timeline.component.ts:1-84
**Rationale**: 1000vh per step provides comfortable reading pace without overwhelming users
**Implementation**: HijackedScrollTimelineComponent wraps all 4 steps per library section

#### Decision 4: CodeSnippet for Images

**Evidence**: chromadb-section.component.ts:296-328
**Rationale**: CodeSnippetComponent supports `language: 'image'` for unified asset handling
**Implementation**: All 44 AI-generated images use CodeSnippetComponent with language='image'

---

## IV. COMPONENT STRUCTURE BLUEPRINT

### File Naming Convention

**Pattern**: `{library-name}-section.component.ts`

**Examples**:
- `neo4j-section.component.ts`
- `langgraph-core-section.component.ts`
- `langgraph-memory-section.component.ts`
- `langgraph-workflow-engine-section.component.ts`
- `langgraph-streaming-section.component.ts`
- `langgraph-multi-agent-section.component.ts`
- `langgraph-hitl-section.component.ts`
- `langgraph-functional-api-section.component.ts`
- `langgraph-checkpoint-section.component.ts`
- `langgraph-monitoring-section.component.ts`
- `langgraph-platform-section.component.ts`

**Location**: `apps/dev-brand-ui/src/app/features/landing-page/sections/`

---

### Component Template Structure

```typescript
import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';
import { HijackedScrollTimelineComponent } from '../../../shared/components/hijacked-scroll-timeline.component';
import { HijackedScrollItemDirective } from '../../../core/angular-3d/directives/hijacked-scroll-item.directive';
import { CodeSnippetComponent } from '../../../shared/components/code-snippet.component';
import { DecorativePatternComponent } from '../../../shared/components/decorative-patterns.component';
import type { TimelineStep } from '../../../shared/components/scrolling-code-timeline.component';

/**
 * {LibraryName} Section - {Primary Purpose}
 *
 * Showcases:
 * - {Business Value 1}
 * - {Business Value 2}
 * - {Business Value 3}
 * - {Business Value 4}
 *
 * Design Pattern:
 * - Hero intro with floating metrics
 * - Scrolling timeline (4 business value steps)
 * - Decorative patterns for visual depth
 * - Real business value from library-analysis.md
 *
 * Data Sources:
 * - task-tracking/TASK_2025_017/library-analysis.md (business value)
 * - task-tracking/TASK_2025_024/asset-manifest.md (visual assets)
 */
@Component({
  selector: 'app-{library-name}-section',
  standalone: true,
  imports: [
    CommonModule,
    HijackedScrollTimelineComponent,
    HijackedScrollItemDirective,
    CodeSnippetComponent,
    DecorativePatternComponent,
    ScrollAnimationDirective,
  ],
  template: `
    <!-- SECTION 1: Container -->
    <div class="relative w-full bg-gradient-to-b from-white via-{color}-50/30 to-white overflow-hidden">
      <div class="container mx-auto px-8 py-12">

        <!-- SECTION 2: Sticky Header (Copy from ChromaDB) -->
        <!-- ... -->

        <!-- SECTION 3: Scroll-Jacked Timeline (Copy from ChromaDB) -->
        <app-hijacked-scroll-timeline [scrollHeightPerStep]="1000" [start]="'top top'">
          @for (step of codeTimeline(); track step.id; let i = $index) {
            <div hijackedScrollItem [slideDirection]="'none'">
              <!-- Decorative patterns per step -->
              <!-- Content grid: title/description + image -->
            </div>
          }

          <!-- SECTION 4: Sticky Bottom Integration Cards (Copy from ChromaDB) -->
          <!-- ... -->
        </app-hijacked-scroll-timeline>

      </div>
    </div>
  `,
  styles: [`/* Copy keyframes from ChromaDB */`],
})
export class {LibraryName}SectionComponent {
  readonly ecosystemOpacity = signal(0);

  constructor() {
    setTimeout(() => { this.ecosystemOpacity.set(1); }, 500);
  }

  readonly codeTimeline = signal<TimelineStep[]>([/* 4 steps */]);
  readonly integrations = signal([/* 3 integrations */]);
}
```

---

## V. DATA STRUCTURE SPECIFICATIONS

### TimelineStep Interface (Verified)

**Evidence**: scrolling-code-timeline.component.ts (imported at line 8)

```typescript
interface TimelineStep {
  id: string;              // Unique step identifier
  step: number;            // Step number (1-4)
  title: string;           // Business value title (from library-analysis.md)
  description: string;     // 150-200 word business value description
  code: string;            // Image path: 'assets/images/libraries/{library}_step_{N}.png'
  language: string;        // Always 'image' for PNG assets
  layout: 'left' | 'right'; // Alternating per step
  notes: string[];         // 4 bullet points (10-15 words each)
}
```

### Integration Card Interface

```typescript
interface IntegrationCard {
  icon: string;            // Emoji icon (e.g., '🧠', '🔄', '📊')
  name: string;            // Module name (e.g., 'Memory Module')
  description: string;     // 8-12 word integration description
}
```

---

## VI. CONTENT MAPPING STRATEGY

### Content Source: library-analysis.md

**Evidence**: task-tracking/TASK_2025_017/library-analysis.md (716 lines)

**Extraction Strategy per Library**:

1. **Find Library Section**: Locate library in library-analysis.md (e.g., "### 2. @hive-academy/nestjs-neo4j")
2. **Extract Business Value**: Use "Business Value Proposition" bullets as step titles
3. **Extract Capabilities**: Use "Key Technical Capabilities" as step descriptions
4. **Extract Integrations**: Use "Integration Points" as integration card descriptions
5. **Extract Metrics**: Use "Performance Metrics" as sticky header metrics

**Example Mapping (Neo4j)**:

**Library Analysis (Lines 58-106)**:
```
### 2. @hive-academy/nestjs-neo4j

Business Value Proposition:
- Model complex relationships for AI decision-making
- Revolutionary 7-decorator Entity CRUD system (90% less code)
- Multi-tenant graph isolation with database-per-tenant
- Graph algorithms for centrality, community detection, path finding

Key Technical Capabilities:
- Revolutionary Entity CRUD Decorators: @FindOne, @FindMany, ...
- Type-Safe Query Builder: Enterprise Neo4jQueryBuilder
- Specialized Repositories: GraphRepository, RelationshipRepository
- Enterprise Security: 5-decorator security layer
- Multi-Tenancy: Database-per-tenant isolation

Integration Points:
- LangGraph Memory Module: Graph storage for relationship tracking
- LangGraph Multi-Agent: Agent coordination
- Workflow Engine: Workflow relationship analysis

Performance Metrics:
- 100+ concurrent connections
- 1000+ nodes/second graph traversal
```

**Component Data (Transformed)**:

```typescript
readonly codeTimeline = signal<TimelineStep[]>([
  {
    id: 'complex-relationships',
    step: 1,
    title: 'Model Complex Relationships',  // From business value
    description: 'Revolutionary 7-decorator Entity CRUD system (@FindOne, @FindMany, @CreateEntity, @UpdateEntity, @DeleteEntity, @CountEntities, @ExistsEntity) reduces code by 90%. Build knowledge graphs and relationship models for AI decision-making with type-safe queries and intelligent graph traversal.',
    code: 'assets/images/libraries/neo4j_step_1.png',
    language: 'image',
    layout: 'left',
    notes: [
      '7 CRUD decorators eliminate 90% of boilerplate',
      'Type-safe query builder for complex relationships',
      'Knowledge graphs for AI decision-making',
      'Intelligent graph traversal algorithms',
    ],
  },
  // ... 3 more steps
]);

readonly integrations = signal([
  {
    icon: '🧠',
    name: 'Memory Module',
    description: 'Graph storage for relationship tracking',  // From integration points
  },
  {
    icon: '🤖',
    name: 'Multi-Agent',
    description: 'Agent coordination and relationship modeling',
  },
  {
    icon: '⚙️',
    name: 'Workflow Engine',
    description: 'Workflow relationship analysis',
  },
]);
```

---

## VII. ANIMATION CONFIGURATION SPECIFICATIONS

### Scroll Animation Timings (Verified from ChromaDB)

**Evidence**: chromadb-section.component.ts:50-58, 225-234, 286-295

```typescript
// 1. Sticky Header Animation
scrollAnimation [scrollConfig]="{
  animation: 'custom',
  start: 'top top',        // Pin at top
  end: '+=4000',           // 4000px scroll distance
  scrub: 0.5,              // Smooth scrub
  from: { scale: 1, y: 0 },
  to: { scale: 0.8, y: -20, opacity: 0.6 }
}"

// 2. Text Content Animation (1.0x speed baseline)
scrollAnimation [scrollConfig]="{
  animation: 'custom',
  start: 'top 80%',        // Start when 80% from top
  end: 'top 30%',          // End when 30% from top
  scrub: 1,                // 1.0x speed (baseline)
  from: { opacity: 0, x: -60, y: 20 },  // Slide from left/right + up
  to: { opacity: 1, x: 0, y: 0 }
}"

// 3. Image/Visual Animation (0.95x speed for parallax)
scrollAnimation [scrollConfig]="{
  animation: 'custom',
  start: 'top 75%',        // Start slightly earlier
  end: 'top 25%',          // End slightly earlier
  scrub: 1,                // 1.0x speed (but opposite direction)
  from: { opacity: 0, x: 80, scale: 0.95 },  // Opposite direction from text
  to: { opacity: 1, x: 0, scale: 1 }
}"

// 4. Decorative Pattern Animation
scrollAnimation [scrollConfig]="{
  animation: 'custom',
  start: 'top 90%',
  end: 'bottom 30%',
  scrub: 0.5,
  from: { scale: 0.6, opacity: 0, rotation: -20, y: 50 },
  to: { scale: 1, opacity: 0.8, rotation: 0, y: -50 }
}"
```

---

## VIII. REUSABLE PATTERNS EXTRACTION

### Pattern 1: Metric Configuration (Per Library)

**Evidence**: chromadb-section.component.ts:151-163

```typescript
// ChromaDB Metrics
<div class="text-4xl font-bold text-indigo-600 mb-2">Sub-100ms</div>
<div class="text-sm text-gray-500 uppercase tracking-wide">Vector Search</div>

<div class="text-4xl font-bold text-purple-600 mb-2">70%</div>
<div class="text-sm text-gray-500 uppercase tracking-wide">Less Boilerplate</div>

<div class="text-4xl font-bold text-pink-600 mb-2">10K+</div>
<div class="text-sm text-gray-500 uppercase tracking-wide">Documents/sec</div>
```

**Reusable Metric Component Structure**:

```typescript
interface LibraryMetric {
  value: string;        // Metric value (e.g., 'Sub-100ms', '70%', '10K+')
  label: string;        // Metric label (e.g., 'Vector Search')
  color: 'indigo' | 'purple' | 'pink';  // Color gradient
}

// Example for Neo4j
const neo4jMetrics: LibraryMetric[] = [
  { value: '7 Decorators', label: 'CRUD System', color: 'indigo' },
  { value: '100+ Connections', label: 'Concurrent Pool', color: 'purple' },
  { value: '1000+ Nodes/sec', label: 'Graph Traversal', color: 'pink' },
];
```

---

### Pattern 2: Layer Badge Configuration (Per Library)

**Evidence**: chromadb-section.component.ts:93-101

```typescript
<span class="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-full text-sm font-semibold text-indigo-700 mb-6">
  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <!-- Database icon for DATA FOUNDATION LAYER -->
  </svg>
  DATA FOUNDATION LAYER
</span>
```

**Layer Badge Mapping**:

```typescript
const layerBadges: Record<string, { icon: string; label: string }> = {
  'neo4j': { icon: 'database', label: 'DATA FOUNDATION LAYER' },
  'langgraph-core': { icon: 'cube', label: 'CORE FOUNDATION' },
  'langgraph-memory': { icon: 'brain', label: 'ORCHESTRATION LAYER' },
  'langgraph-workflow-engine': { icon: 'cogs', label: 'ORCHESTRATION LAYER' },
  'langgraph-streaming': { icon: 'stream', label: 'ORCHESTRATION LAYER' },
  'langgraph-multi-agent': { icon: 'users', label: 'AGENT COORDINATION' },
  'langgraph-hitl': { icon: 'hand', label: 'AGENT COORDINATION' },
  'langgraph-functional-api': { icon: 'code', label: 'AGENT COORDINATION' },
  'langgraph-checkpoint': { icon: 'save', label: 'PRODUCTION LAYER' },
  'langgraph-monitoring': { icon: 'chart', label: 'PRODUCTION LAYER' },
  'langgraph-platform': { icon: 'cloud', label: 'PRODUCTION LAYER' },
};
```

---

### Pattern 3: Decorative Pattern Assignment (Per Step)

**Evidence**: chromadb-section.component.ts:177-216

```typescript
const decorativePatterns: Record<number, { pattern: string; position: string; size: string; color: string }> = {
  0: { pattern: 'data-flow', position: 'left-0', size: 'w-full h-96', color: 'purple-400' },
  1: { pattern: 'network-nodes', position: 'right-[-10%]', size: 'w-[600px] h-[600px]', color: 'indigo-400' },
  2: { pattern: 'circuit-board', position: 'left-[-5%]', size: 'w-[500px] h-[500px]', color: 'purple-300' },
  3: { pattern: 'gradient-blob', position: 'right-[-5%]', size: 'w-[400px] h-[400px]', color: 'indigo-300' },
};
```

**Pattern Rotation Strategy**:
- Step 1: Left side, larger pattern
- Step 2: Right side, medium pattern
- Step 3: Left side, smaller pattern
- Step 4: Right side, smallest pattern

---

## IX. IMPLEMENTATION GUIDANCE FOR FRONTEND-DEVELOPER

### Step-by-Step Component Creation Process

#### Phase 1: Component Scaffold (5 minutes per component)

1. **Copy ChromaDB Component**: `cp chromadb-section.component.ts {library}-section.component.ts`
2. **Update Component Metadata**:
   - Change selector: `app-{library}-section`
   - Update component name: `{Library}SectionComponent`
   - Update JSDoc comments with library-specific details
3. **Update Imports**: Verify all imports are correct (no changes needed)

#### Phase 2: Sticky Header Customization (10 minutes per component)

1. **Update Layer Badge**:
   - Copy badge HTML from ChromaDB
   - Replace label with library-specific layer (from layerBadges mapping)
   - Update icon if needed (database → cube/brain/cogs/etc.)

2. **Update Headline**:
   - Replace "ChromaDB" with library name (e.g., "Neo4j", "LangGraph Core")

3. **Update Subtitle**:
   - Replace with library-specific tagline from library-analysis.md

4. **Update Metrics**:
   - Replace 3 metrics with library-specific values from library-analysis.md
   - Update metric colors (indigo/purple/pink gradients)

5. **Update Hero Decorative Pattern**:
   - Replace `vector-arrows` with library-specific pattern

#### Phase 3: Timeline Data Population (20 minutes per component)

1. **Read Library Analysis Section**:
   - Open library-analysis.md
   - Find library section (e.g., "### 2. @hive-academy/nestjs-neo4j")

2. **Extract Business Value Steps**:
   - Copy 4 business value propositions from "Business Value Proposition" section
   - Transform into step titles

3. **Write Step Descriptions**:
   - Extract technical capabilities from "Key Technical Capabilities"
   - Expand into 150-200 word business-focused descriptions
   - Emphasize user benefits over technical details

4. **Create Bullet Notes**:
   - Extract 4 key points per step
   - Keep each bullet 10-15 words
   - Focus on tangible benefits

5. **Assign Image Paths**:
   - Use pattern: `assets/images/libraries/{library}_step_{N}.png`
   - Set `language: 'image'` for all steps

6. **Assign Layouts**:
   - Step 1: `layout: 'left'`
   - Step 2: `layout: 'right'`
   - Step 3: `layout: 'left'`
   - Step 4: `layout: 'right'`

#### Phase 4: Integration Cards Configuration (5 minutes per component)

1. **Read Integration Points**:
   - Extract from "Integration Points" section in library-analysis.md

2. **Create 3 Integration Cards**:
   - Card 1: Primary integration (most important module)
   - Card 2: Secondary integration
   - Card 3: Tertiary integration

3. **Assign Emoji Icons**:
   - Use thematic emojis (🧠 memory, 🔄 workflow, 📊 monitoring)

#### Phase 5: Decorative Pattern Assignment (5 minutes per component)

1. **Assign Patterns Per Step**:
   - Step 1: Choose pattern from task-description.md requirements
   - Step 2: Alternate position (left → right)
   - Step 3: Alternate position (right → left)
   - Step 4: Alternate position (left → right)

2. **Update Colors**:
   - Step 1: purple-400
   - Step 2: indigo-400
   - Step 3: purple-300
   - Step 4: indigo-300

#### Phase 6: Validation (5 minutes per component)

1. **Visual Validation**:
   - [ ] Sticky header displays correctly
   - [ ] 3 metrics show library-specific values
   - [ ] Layer badge shows correct category
   - [ ] Hero decorative pattern animates on scroll

2. **Timeline Validation**:
   - [ ] 4 steps display with correct data
   - [ ] Images load correctly (after asset generation)
   - [ ] Alternating layouts work (left/right/left/right)
   - [ ] Notes display 4 bullet points per step

3. **Animation Validation**:
   - [ ] Text slides from correct direction (left steps slide right, right steps slide left)
   - [ ] Images slide from opposite direction (parallax effect)
   - [ ] Decorative patterns animate smoothly
   - [ ] Sticky bottom cards fade in after 500ms

4. **Integration Validation**:
   - [ ] 3 integration cards display
   - [ ] Emoji icons show correctly
   - [ ] Hover effects work (shadow elevation)

---

### Validation Checklist (Per Component)

**Component Structure**:
- [ ] File named correctly (`{library}-section.component.ts`)
- [ ] Component selector correct (`app-{library}-section`)
- [ ] All imports present (CommonModule, directives, components)
- [ ] Signals defined (ecosystemOpacity, codeTimeline, integrations)

**Sticky Header**:
- [ ] Layer badge shows correct category
- [ ] Library name in headline
- [ ] Subtitle matches library purpose
- [ ] 3 metrics display library-specific values
- [ ] Metrics use gradient colors (indigo/purple/pink)
- [ ] Hero decorative pattern unique per library

**Timeline Steps**:
- [ ] 4 steps defined in codeTimeline signal
- [ ] Each step has unique id
- [ ] Step numbers 1-4
- [ ] Titles from library-analysis.md business value
- [ ] Descriptions 150-200 words
- [ ] Image paths: `assets/images/libraries/{library}_step_{N}.png`
- [ ] Language: 'image' for all steps
- [ ] Layouts alternate: left/right/left/right
- [ ] 4 bullet notes per step (10-15 words each)

**Integration Cards**:
- [ ] 3 integration cards defined in integrations signal
- [ ] Emoji icons assigned
- [ ] Module names correct
- [ ] Descriptions 8-12 words
- [ ] Descriptions match library-analysis.md integration points

**Decorative Patterns**:
- [ ] Step 1: Pattern assigned (from requirements)
- [ ] Step 2: Pattern assigned, opposite position
- [ ] Step 3: Pattern assigned, opposite position
- [ ] Step 4: Pattern assigned, opposite position
- [ ] Colors: purple-400, indigo-400, purple-300, indigo-300

**Animations**:
- [ ] Sticky header: start 'top top', end '+=4000', scrub 0.5
- [ ] Text: start 'top 80%', end 'top 30%', scrub 1
- [ ] Images: start 'top 75%', end 'top 25%', scrub 1
- [ ] Decorative patterns: start 'top 90%', end 'bottom 30%', scrub 0.5
- [ ] Integration cards: fade in after 500ms

**TypeScript Quality**:
- [ ] Zero `any` types
- [ ] All signals properly typed
- [ ] TimelineStep interface satisfied
- [ ] ESLint passing
- [ ] Prettier formatted

---

### Common Patterns to Reuse

**Pattern 1: Copy/Paste Template Sections**

```bash
# Sections that are 100% identical across all components:
# - HijackedScrollTimelineComponent wrapper (lines 167-363)
# - Sticky bottom integration cards structure (lines 336-360)
# - CSS keyframes (lines 366-383)
# - Constructor with ecosystemOpacity timer (lines 392-397)
```

**Pattern 2: Find/Replace Transformations**

```bash
# When copying ChromaDB component:
# 1. Replace "ChromaDB" → "{Library Name}"
# 2. Replace "chromadb" → "{library-slug}"
# 3. Replace "Vector database for semantic search" → "{Library tagline}"
# 4. Replace "DATA FOUNDATION LAYER" → "{Correct layer}"
# 5. Replace metric values with library-specific metrics
```

**Pattern 3: Timeline Data Template**

```typescript
// Copy this template 4 times, fill in library-specific content
{
  id: '{business-value-slug}',
  step: 1,  // Increment: 1, 2, 3, 4
  title: '{Business Value Title from library-analysis.md}',
  description: '{150-200 word description from library-analysis.md capabilities}',
  code: 'assets/images/libraries/{library}_step_1.png',  // Increment step number
  language: 'image',
  layout: 'left',  // Alternate: left, right, left, right
  notes: [
    '{Benefit 1 (10-15 words)}',
    '{Benefit 2 (10-15 words)}',
    '{Benefit 3 (10-15 words)}',
    '{Benefit 4 (10-15 words)}',
  ],
}
```

---

### Testing Strategy (Per Component)

**Unit Tests** (Optional - components are primarily presentational):
- Test signal initialization
- Test ecosystemOpacity timer
- Test codeTimeline length (should be 4)
- Test integrations length (should be 3)

**Visual Regression Tests** (Recommended):
- Screenshot sticky header at scroll position 0
- Screenshot timeline step 1 at scroll position 1000
- Screenshot timeline step 2 at scroll position 2000
- Screenshot sticky bottom cards (visible state)

**Performance Tests**:
- Lighthouse performance score > 90
- Scroll animation FPS > 50 (60 target)
- Image lazy loading working
- No layout shift during scroll

**Accessibility Tests**:
- WCAG 2.1 AA compliance
- Screen reader compatibility
- Keyboard navigation support
- Proper heading hierarchy (H2 → H3)

---

## X. ARCHITECTURE QUALITY GATES

### Before Marking Architecture Complete

- [x] All 11 component file names defined
- [x] Component structure verified against ChromaDB pattern
- [x] Signal-based state management documented
- [x] Scroll animation configurations specified
- [x] Content mapping strategy from library-analysis.md documented
- [x] Decorative pattern assignments per step defined
- [x] Integration card configurations per library planned
- [x] Metrics configuration per library extracted
- [x] Layer badge assignments per library defined
- [x] Reusable patterns extracted and documented
- [x] Implementation guidance step-by-step provided
- [x] Validation checklist created
- [x] Testing strategy documented

---

## XI. ARCHITECTURE SUMMARY

### Key Architectural Decisions

1. **100% ChromaDB Pattern Replication**: All 11 components follow ChromadbSectionComponent exactly
2. **Signal-Based Reactivity**: Angular 19 signals for optimal scroll performance
3. **Independent Scroll Animations**: Text (1.0x) and images (0.95x) for parallax effect
4. **Scroll-Jacked Timeline**: 1000vh per step for comfortable reading pace
5. **Content-First Design**: All content extracted from library-analysis.md (authoritative source)
6. **Decorative Patterns**: Alternating per step for visual interest without distraction
7. **Sticky Elements**: Header (top) and integration cards (bottom) remain visible
8. **Type Safety**: Zero `any` types, comprehensive TypeScript interfaces

### Patterns Identified for Code Reuse

**Template Patterns** (100% reusable):
- Sticky header structure (lines 46-165)
- Scroll-jacked timeline wrapper (lines 167-363)
- Integration card grid (lines 336-360)
- CSS keyframe animations (lines 366-383)

**Data Patterns** (parameterized):
- TimelineStep interface (4 steps per library)
- IntegrationCard interface (3 cards per library)
- LibraryMetric interface (3 metrics per library)
- Layer badge configuration (per library category)

**Animation Patterns** (configuration-based):
- Sticky header scroll config
- Text content scroll config
- Image/visual scroll config
- Decorative pattern scroll config

### Ready Status for Frontend-Developer Phase

**Architecture Design**: ✅ COMPLETE
**Content Mapping**: ✅ COMPLETE
**Pattern Extraction**: ✅ COMPLETE
**Implementation Guidance**: ✅ COMPLETE

**Deliverables**:
1. ✅ architecture-design.md - This document (complete architectural blueprint)
2. ⏳ content-mapping.md - Detailed content extraction per library (next document)
3. ⏳ implementation-plan.md - Developer handoff with step-by-step instructions (next document)

**Next Phase**: Content mapping extraction from library-analysis.md

---

**Architecture Design Complete**
**Created**: 2025-01-23
**Author**: software-architect
**Status**: Ready for content-mapping.md creation
