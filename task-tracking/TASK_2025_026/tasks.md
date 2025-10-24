# Development Tasks - TASK_2025_026

**Task Type**: Frontend (Angular 19 + Tailwind + Angular-3D)
**Developer Needed**: frontend-developer
**Total Tasks**: 20 atomic tasks
**Status**: 3/20 Complete (15%)
**Decomposed From**:

- implementation-plan.md (40-hour architecture plan, 5 phases, 7 sections)
- visual-design-specification.md (Complete visual design specs)
- design-handoff.md (Developer implementation guide)
- quality-failure-report.md (Previous failure analysis - strict verification required)

---

## CRITICAL CONTEXT - QUALITY FAILURE

A previous frontend-developer invocation FAILED with complete fabrication of work. This tasks.md implements ATOMIC task breakdown with MANDATORY git verification to prevent recurrence.

**Zero Tolerance Policy**:

- Every task MUST have git commit before marking complete
- Every task MUST have verifiable file evidence
- NO task can be marked complete without team-leader verification
- NO bulk completion - one task at a time only

---

## Task Breakdown

### Task 1: Extend Tailwind Configuration ✅ COMPLETE

**Assigned To**: frontend-developer
**File(s)**: apps/dev-brand-ui/tailwind.config.js
**Specification Reference**:

- design-handoff.md:42-183 (Tailwind config extensions)
- visual-design-specification.md:16-83 (Design tokens)
  **Expected Commit Pattern**: `feat(angular-3d): extend tailwind config with design tokens`
  **Git Commit SHA**: 9512b43
  **Status**: ✅ COMPLETE

**Verification Results**:

- ✅ File exists: apps/dev-brand-ui/tailwind.config.js
- ✅ Git commit exists matching pattern: 9512b43
- ✅ Build passes: npx nx build dev-brand-ui (SUCCESS)
- ✅ Contains 10 custom colors: bg-primary, bg-secondary, text-headline, text-primary, text-secondary, accent-primary, accent-primary-dark, border-subtle, glow-accent, glow-dark
- ✅ Contains custom spacing: 128px (py-32)
- ✅ Contains 3 custom shadows: card, card-hover, button-hover
- ✅ Contains 2 custom border radius: card (16px), button (8px)
- ✅ Contains custom scale: 102 (1.02)
- ✅ All values added to theme.extend section (NOT top-level)

**Implementation Details**:

- Add to `theme.extend` section (NOT top-level theme)
- 10 custom colors from design-handoff.md:48-68
- 1 custom spacing value (128px) from design-handoff.md:118
- 3 custom box shadows from design-handoff.md:144-148
- 2 custom border radius from design-handoff.md:162-165
- 1 custom scale from design-handoff.md:177

---

### Task 2: Create Shared TypeScript Interfaces 🔄 IN PROGRESS - Assigned to frontend-developer

**Assigned To**: frontend-developer
**File(s)**: apps/dev-brand-ui/src/app/features/landing-page/interfaces/index.ts
**Specification Reference**:

- implementation-plan.md:544-549 (Shared interfaces)
- design-handoff.md:691-705 (ValueProposition interface)
  **Expected Commit Pattern**: `feat(angular-3d): add landing page shared interfaces`
  **Verification Requirements**:
- ✅ File exists: apps/dev-brand-ui/src/app/features/landing-page/interfaces/index.ts
- ✅ Git commit exists matching pattern
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ Contains ValueProposition interface (8 properties)
- ✅ Contains WorkflowExample interface (9 properties)
- ✅ Contains MetricCardData interface (3 properties)
- ✅ All interfaces exported

**Implementation Details**:

- ValueProposition interface: packageName, businessHeadline, painPoint, solution, capabilities[], metricValue, metricLabel, iconUrl?
- WorkflowExample interface: title, description, modules[], diagramUrl, codeBeforeLines, codeAfterLines, codeBefore, codeAfter, valueDelivered[]
- MetricCardData interface: value, label, description

---

### Task 3: Reorganize Hero Scene Graph Component ✅ COMPLETE

**Assigned To**: frontend-developer
**File(s)**: apps/dev-brand-ui/src/app/features/landing-page/sections/scene-graphs/hero-scene-graph.component.ts
**Action Taken**: Moved existing enhanced hero scene graph to scene-graphs folder
**Git Commit SHA**: 26b2def
**Expected Commit Pattern**: `refactor(angular-3d): reorganize hero scene graph to scene-graphs folder`

**Note**: Initial task created poor duplicate. User intervention corrected to preserve existing enhanced implementation (388 lines with rich features) and reorganize to scene-graphs folder structure.

**Verification Results**:

- ✅ File exists at specified path
- ✅ Git commit exists matching pattern: 50f858b
- ✅ Typecheck passes: npx nx typecheck dev-brand-ui (SUCCESS)
- ✅ Contains ParticleSystemComponent (200 count, color 0x6366F1, size 0.05)
- ✅ Contains 3 FloatingSphereComponent instances
- ✅ All spheres have float3dConfig property binding
- ✅ All spheres have glow3dConfig property binding
- ✅ All spheres have performance3d directive
- ✅ Particle system has performance3d directive

**Implementation Details**:

- Import: NgtArgs, FloatingSphereComponent, ParticleSystemComponent
- Ambient light: intensity 0.5
- Directional light: position [10, 10, 5], intensity 1
- Particles: 200 count, spread 10
- Sphere 1: position [-3, 2, -5], radius 0.8
- Sphere 2: position [3, -1, -3], radius 0.6
- Sphere 3: position [0, 0, -8], radius 1.0
- All glow configs: autoAdjustQuality true
- Used direct imports instead of barrel imports to resolve typecheck errors

---

### Task 4: Implement Hero Section Component ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: apps/dev-brand-ui/src/app/features/landing-page/sections/hero-section.component.ts
**Specification Reference**:

- design-handoff.md:453-544 (Hero section template)
- implementation-plan.md:186-229 (Hero section architecture)
  **Expected Commit Pattern**: `feat(angular-3d): implement hero section with 3D parallax background`
  **Verification Requirements**:
- ✅ File exists at specified path
- ✅ Git commit exists matching pattern
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ Imports Scene3DComponent, ScrollAnimationDirective
- ✅ References HeroSceneGraphComponent
- ✅ Contains headline (72px desktop, 40px mobile)
- ✅ Contains subheadline (20px desktop, 18px mobile)
- ✅ Contains 3 value proposition bullets
- ✅ Contains 2 CTA buttons
- ✅ Parallax scroll animation on 3D background
- ✅ Fade-in scroll animation on content

**Implementation Details**:

- Full-screen section: min-h-screen
- 3D background layer: absolute inset-0 z-0
- Content layer: relative z-10
- Scene3D config: camera position [0, 0, 15], fov 60
- Mouse parallax: sensitivity 0.35, smoothing 6
- ScrollAnimationDirective: parallax for background, fadeIn for content
- Tailwind classes: text-5xl md:text-7xl for headline
- Example file to read first: apps/dev-brand-ui/src/app/features/landing-page/sections/hero-section.component.ts (existing pattern)

---

### Task 5: Implement Problem/Solution Section Component ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: apps/dev-brand-ui/src/app/features/landing-page/sections/problem-solution-section.component.ts
**Specification Reference**:

- design-handoff.md:574-684 (Problem/solution template)
- implementation-plan.md:240-293 (Problem/solution architecture)
  **Expected Commit Pattern**: `feat(angular-3d): implement problem/solution section with metric cards`
  **Verification Requirements**:
- ✅ File exists at specified path
- ✅ Git commit exists matching pattern
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ Imports ScrollAnimationDirective
- ✅ Background: bg-secondary (#F9FAFB)
- ✅ Section headline (60px desktop, 36px mobile)
- ✅ Problem statement paragraph
- ✅ Solution card (white background, rounded-card shadow-card)
- ✅ 4 metric cards in 2x2 grid (90%, 60%, 75+, $262K)
- ✅ Stagger animation on metric cards (0.15s delay)

**Implementation Details**:

- Section padding: py-20 md:py-32
- Container: max-w-7xl mx-auto
- Solution card: bg-white rounded-card shadow-card p-8 md:p-12
- Metric cards grid: grid-cols-1 md:grid-cols-2 gap-8
- ScrollAnimationDirective config: animation 'slideUp', stagger 0.15, once true
- Metric values: text-5xl md:text-6xl font-bold text-accent-primary
- Example file to read first: apps/dev-brand-ui/src/app/features/landing-page/sections/chromadb-section.component.ts (metric display pattern)

---

### Task 6: Create Value Proposition Card Component ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: apps/dev-brand-ui/src/app/features/landing-page/components/value-proposition-card.component.ts
**Specification Reference**:

- design-handoff.md:687-802 (Value proposition card component)
- implementation-plan.md:296-343 (Card component specification)
  **Expected Commit Pattern**: `feat(angular-3d): add reusable value proposition card component`
  **Verification Requirements**:
- ✅ File exists at specified path
- ✅ Git commit exists matching pattern
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ Imports ScrollAnimationDirective
- ✅ Defines ValueProposition interface (8 properties)
- ✅ Component accepts @Input() valueProposition
- ✅ Card hover states: scale-102, border-accent-primary, shadow-card-hover
- ✅ ScrollAnimationDirective: slideUp, start 'top 85%', once true
- ✅ Contains icon, package name, headline, pain point, solution, capabilities, metric

**Implementation Details**:

- Card base: bg-white border border-gray-200 rounded-card shadow-card
- Hover transition: transition-all duration-300
- Icon container: w-16 h-16 mb-6
- Package name: text-sm font-mono text-secondary
- Headline: text-2xl font-bold group-hover:text-accent-primary
- Pain point label: "Traditional Approach"
- Solution label: "Our Solution"
- Capabilities: space-y-2 with checkmark icons
- Metric: text-4xl font-bold text-accent-primary
- Hover arrow: absolute bottom-8 right-8 opacity-0 group-hover:opacity-100

---

### Task 7: Implement Value Propositions Section Component (ChromaDB) ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: apps/dev-brand-ui/src/app/features/landing-page/sections/value-propositions-section.component.ts
**Specification Reference**:

- implementation-plan.md:344-387 (Value propositions section)
- design-handoff.md:804-862 (Usage example)
  **Expected Commit Pattern**: `feat(angular-3d): add value propositions section with ChromaDB data`
  **Verification Requirements**:
- ✅ File exists at specified path
- ✅ Git commit exists matching pattern
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ Imports ValuePropositionCardComponent
- ✅ Imports ValueProposition interface
- ✅ Defines chromaDBProposition object
- ✅ Template uses app-value-proposition-card
- ✅ Section spacing: py-20 md:py-32
- ✅ Container: max-w-7xl mx-auto space-y-32

**Implementation Details**:

- ChromaDB data: packageName '@hive-academy/nestjs-chromadb'
- Headline: 'Build RAG Applications in Minutes'
- Pain point: '50+ lines of manual ChromaDB client setup...'
- Solution: 'TypeORM-style repository pattern...'
- Capabilities: 4 items (multi-provider embeddings, multi-tenant, caching, auto-chunking)
- Metric: '90%' / 'Less Code'
- Section background: bg-white
- Full-width individual spotlights, NOT card grids

---

### Task 8: Add Neo4j Value Proposition Data ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: apps/dev-brand-ui/src/app/features/landing-page/sections/value-propositions-section.component.ts
**Specification Reference**:

- implementation-plan.md:652-668 (Value propositions data)
- design-handoff.md:844-861 (Neo4j example)
  **Expected Commit Pattern**: `feat(angular-3d): add Neo4j value proposition data`
  **Verification Requirements**:
- ✅ File modified at specified path
- ✅ Git commit exists matching pattern
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ Defines neo4jProposition object
- ✅ Template renders 2 value proposition cards (ChromaDB + Neo4j)
- ✅ Spacing between cards: space-y-32 (128px)

**Implementation Details**:

- Neo4j data: packageName '@hive-academy/nestjs-neo4j'
- Headline: 'Graph Queries Without Cypher Boilerplate'
- Pain point: 'Raw Cypher queries with manual parameter binding...'
- Solution: 'Specialized repository pattern for graphs...'
- Capabilities: 4 items (GraphRepository, type-safe builder, multi-tenancy, DI)
- Metric: '85%' / 'Less Boilerplate'

---

### Task 9: Add Remaining 9 Value Proposition Data Objects ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: apps/dev-brand-ui/src/app/features/landing-page/sections/value-propositions-section.component.ts
**Specification Reference**:

- implementation-plan.md:652-668 (All 11 value propositions)
- research-report.md from TASK_2025_026 (if exists)
  **Expected Commit Pattern**: `feat(angular-3d): add remaining 9 value proposition data objects`
  **Verification Requirements**:
- ✅ File modified at specified path
- ✅ Git commit exists matching pattern
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ Total 11 valueProposition objects defined
- ✅ Template renders all 11 cards
- ✅ Each has unique packageName, headline, capabilities, metric

**Implementation Details**:

- Add 9 more: Checkpoint, Functional-API, Multi-Agent, Platform, Time-Travel, Monitoring, HITL, Streaming, Workflow-Engine
- Each follows same structure as ChromaDB/Neo4j
- Metrics from implementation-plan.md lines 652-668
- Use research-report.md for specific capabilities if available
- Total cards: 11 (full ecosystem showcase)

---

### Task 10: Create Workflow Example Card Component ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: apps/dev-brand-ui/src/app/features/landing-page/components/workflow-example-card.component.ts
**Specification Reference**:

- design-handoff.md:834-947 (Workflow example card template)
- implementation-plan.md:398-432 (Workflow example component)
  **Expected Commit Pattern**: `feat(angular-3d): add workflow example card component`
  **Verification Requirements**:
- ✅ File exists at specified path
- ✅ Git commit exists matching pattern
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ Imports ScrollAnimationDirective
- ✅ Defines WorkflowExample interface (9 properties)
- ✅ Component accepts @Input() workflowExample, @Input() index
- ✅ Contains title, modules pills, diagram, code comparison, value delivered

**Implementation Details**:

- Card base: bg-white rounded-card shadow-card p-12 mb-12
- Number badge: w-12 h-12 bg-accent-primary text-white rounded-full
- Modules pills: flex flex-wrap gap-2
- Diagram container: bg-gray-50 rounded-xl p-8
- Code comparison: grid-cols-1 md:grid-cols-2 gap-8
- "Before" label: "Traditional Approach (75+ lines)"
- "After" label: "Our Approach (1 line)"
- Value delivered: grid-cols-1 md:grid-cols-2 gap-4

---

### Task 11: Implement Workflow Examples Section ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: apps/dev-brand-ui/src/app/features/landing-page/sections/workflow-examples-section.component.ts
**Specification Reference**:

- implementation-plan.md:676-684 (Workflow examples section)
- visual-design-specification.md:800-962 (Section 4 specifications)
  **Expected Commit Pattern**: `feat(angular-3d): implement workflow examples section with 3 workflows`
  **Verification Requirements**:
- ✅ File exists at specified path
- ✅ Git commit exists matching pattern
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ Imports WorkflowExampleCardComponent
- ✅ Imports WorkflowExample interface
- ✅ Defines 3 workflow objects: RAG Pipeline, Multi-Agent, DevBrand API
- ✅ Background: bg-secondary (#F9FAFB)
- ✅ Section headline and intro

**Implementation Details**:

- Section padding: py-20 md:py-32
- Container: max-w-7xl mx-auto
- Workflow 1: RAG Pipeline (ChromaDB + Neo4j + Memory + Streaming + Monitoring)
- Workflow 2: Multi-Agent Document Processing
- Workflow 3: DevBrand API (production use case)
- Each workflow has: title, description, modules[], diagramUrl, code before/after
- Diagram URLs: Placeholder for now (Canva assets pending)

---

### Task 12: Implement Enterprise Capabilities Matrix Section ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: apps/dev-brand-ui/src/app/features/landing-page/sections/capabilities-matrix-section.component.ts
**Specification Reference**:

- visual-design-specification.md:963-1053 (Matrix specifications)
- design-handoff.md (no specific template, use visual spec)
  **Expected Commit Pattern**: `feat(angular-3d): implement enterprise capabilities matrix section`
  **Verification Requirements**:
- ✅ File exists at specified path
- ✅ Git commit exists matching pattern
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ Background: bg-white
- ✅ Section headline and intro
- ✅ Table with 11 capabilities x 11 libraries
- ✅ ROI callout: $262,800 savings
- ✅ Horizontal scroll on mobile with sticky first column

**Implementation Details**:

- Section padding: py-20 md:py-32
- Container: max-w-7xl mx-auto
- Table: overflow-x-auto wrapper
- Capabilities: Multi-Tenancy, Monitoring, Retry Logic, Caching, Audit Logging, etc.
- Libraries: ChromaDB, Neo4j, Core, Memory, Checkpoint, etc.
- Checkmark icons for supported features
- ROI callout: bg-accent-primary/10 rounded-card p-12 text-center
- Metric: text-6xl font-bold text-accent-primary

---

### Task 13: Implement Developer Experience Section ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: apps/dev-brand-ui/src/app/features/landing-page/sections/developer-experience-section.component.ts
**Specification Reference**:

- visual-design-specification.md:1054-1189 (DevEx specifications)
- design-handoff.md:1085-1185 (Code comparison template)
  **Expected Commit Pattern**: `feat(angular-3d): implement developer experience section with code comparison`
  **Verification Requirements**:
- ✅ File exists at specified path
- ✅ Git commit exists matching pattern
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ Background: bg-secondary (#F9FAFB)
- ✅ Section headline and intro
- ✅ Side-by-side code comparison (NestJS controller vs AI workflow)
- ✅ Pattern mapping table (NestJS patterns → AI/ML applications)

**Implementation Details**:

- Section padding: py-20 md:py-32
- Container: max-w-7xl mx-auto
- Code comparison: grid-cols-1 lg:grid-cols-2 gap-12
- Code blocks: bg-gray-900 text-gray-100 p-6 rounded-lg
- Traditional NestJS: @Controller, @Get, @Post decorators
- AI workflow: @Workflow, @Node, @Edge decorators
- Pattern table: bg-white rounded-card shadow-card
- Table columns: NestJS Pattern, Traditional Use, Our AI/ML Application

---

### Task 14: Create CTA Scene Graph Component ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: apps/dev-brand-ui/src/app/features/landing-page/sections/scene-graphs/cta-scene-graph.component.ts
**Specification Reference**:

- implementation-plan.md:726-730 (CTA scene graph)
- visual-design-specification.md:1190-1278 (Section 7 CTA)
  **Expected Commit Pattern**: `feat(angular-3d): add CTA scene graph with subtle 3D elements`
  **Verification Requirements**:
- ✅ File exists at specified path
- ✅ Git commit exists matching pattern
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ Contains 3-5 floating shapes
- ✅ All elements have low opacity (30-40%)
- ✅ Subtle animations (no aggressive movement)

**Implementation Details**:

- Fewer elements than hero (3-5 vs 200+ particles)
- Smaller spheres (radius 0.3-0.5)
- Lower glow intensity (0.1-0.2)
- Background layer only (no interactive elements)
- Color: 0x6366F1 (accent-primary)
- Float animations: slow speed (4000-5000ms)

---

### Task 15: Implement CTA Section ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: apps/dev-brand-ui/src/app/features/landing-page/sections/cta-section.component.ts
**Specification Reference**:

- visual-design-specification.md:1190-1278 (CTA section specifications)
- design-handoff.md:1204-1275 (CTA template)
  **Expected Commit Pattern**: `feat(angular-3d): implement CTA section with 3 action cards`
  **Verification Requirements**:
- ✅ File exists at specified path
- ✅ Git commit exists matching pattern
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ Imports Scene3DComponent, CTASceneGraphComponent
- ✅ Background: bg-white with 3D layer at 30% opacity
- ✅ Section headline and intro
- ✅ 3 CTA cards: Explore Examples, Read Documentation, See Production Use Case

**Implementation Details**:

- Section padding: py-20 md:py-32
- 3D background: absolute inset-0 z-0 opacity-30
- Content layer: relative z-10
- CTA grid: grid-cols-1 md:grid-cols-3 gap-8
- Card hover: scale-105, shadow-card-hover
- Card icons: emoji (📚, 📖, 🚀) or custom SVG
- Buttons: Primary (accent-primary), Secondary (white with border)

---

### Task 16: Integrate All Sections into Landing Page Component ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: apps/dev-brand-ui/src/app/features/landing-page/landing-page.component.ts
**Specification Reference**:

- implementation-plan.md:756-765 (Integration step)
- All section components from Tasks 4-15
  **Expected Commit Pattern**: `feat(angular-3d): integrate all 7 sections into landing page`
  **Verification Requirements**:
- ✅ File modified at specified path
- ✅ Git commit exists matching pattern
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ Imports all 7 section components
- ✅ Template renders sections in order
- ✅ No console errors
- ✅ App runs without errors: `npx nx serve dev-brand-ui`

**Implementation Details**:

- Section order:
  1. app-hero-section
  2. app-problem-solution-section
  3. app-value-propositions-section
  4. app-workflow-examples-section
  5. app-capabilities-matrix-section
  6. app-developer-experience-section
  7. app-cta-section
- Each section is self-contained (no props needed yet)
- Landing page component is container only

---

### Task 17: Responsive Testing (Mobile 375px) ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: (Multiple sections - code adjustments as needed)
**Specification Reference**:

- implementation-plan.md:769-772 (Responsive testing)
- visual-design-specification.md:1573-1643 (Responsive specs)
  **Expected Commit Pattern**: `fix(angular-3d): responsive adjustments for mobile 375px`
  **Verification Requirements**:
- ✅ Git commit exists (even if no code changes, document testing)
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ Hero headline readable at 40px
- ✅ CTA buttons stacked vertically
- ✅ Section padding: py-20 (80px)
- ✅ 3D particle count: 100 (reduced from 200)
- ✅ No horizontal scroll

**Implementation Details**:

- Test at 375px width in browser dev tools
- Verify text-5xl (40px mobile, 72px desktop) works
- Verify flex-col sm:flex-row for CTAs
- Adjust particle counts conditionally (mobile detection)
- Document any issues found

---

### Task 18: Accessibility Validation (WCAG 2.1 AA) ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: (Multiple sections - accessibility additions)
**Specification Reference**:

- implementation-plan.md:775-779 (Accessibility implementation)
- design-handoff.md:920-1004 (Accessibility specs)
  **Expected Commit Pattern**: `feat(angular-3d): add ARIA labels and focus states for a11y`
  **Verification Requirements**:
- ✅ Git commit exists matching pattern
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ All sections have aria-labelledby
- ✅ 3D elements have aria-hidden="true"
- ✅ Code examples have role="region"
- ✅ Focus states visible on all interactive elements
- ✅ Keyboard navigation follows visual hierarchy

**Implementation Details**:

- Add ARIA labels: aria-labelledby for sections, aria-hidden for decorative
- Add focus styles: \*:focus-visible outline 2px solid accent-primary
- Add role attributes: role="banner", role="article", role="region"
- Test keyboard navigation: Tab key follows top-to-bottom, left-to-right
- Verify contrast ratios meet 4.5:1 minimum (already validated in design)

---

### Task 19: Performance Optimization ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: (Multiple sections - performance improvements)
**Specification Reference**:

- implementation-plan.md:781-787 (Performance optimization)
- design-handoff.md:1228-1248 (3D performance)
  **Expected Commit Pattern**: `perf(angular-3d): optimize 3D scenes and lazy load images`
  **Verification Requirements**:
- ✅ Git commit exists matching pattern
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ All images below fold have loading="lazy"
- ✅ All 3D elements have performance3d directive
- ✅ Particle count adjusts by viewport (100 mobile, 150 tablet, 200 desktop)
- ✅ No layout shift (test with Lighthouse)

**Implementation Details**:

- Add loading="lazy" to all images except hero
- Add decoding="async" to all images
- Enable performance3d directive on all FloatingSphere and ParticleSystem
- Conditionally reduce particle counts: use window.innerWidth
- Test 3D performance: verify 60 FPS on desktop, 30+ FPS on mobile

---

### Task 20: Final QA and Documentation ⏸️ PENDING

**Assigned To**: frontend-developer
**File(s)**: task-tracking/TASK_2025_026/final-qa-report.md
**Specification Reference**:

- implementation-plan.md:789-813 (Final QA checklist)
- design-handoff.md:1087-1155 (Quality checklist)
  **Expected Commit Pattern**: `docs(angular-3d): add final QA report for landing page`
  **Verification Requirements**:
- ✅ Git commit exists matching pattern
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ All console errors resolved
- ✅ All sections render correctly
- ✅ All animations work as expected
- ✅ QA report created with test results

**Implementation Details**:

- Run through design-handoff.md quality checklist (lines 1087-1155)
- Test all breakpoints: 375px, 768px, 1024px, 1280px
- Verify all design system compliance (colors, spacing, shadows)
- Verify all Angular-3D integration (scroll animations, 3D scenes)
- Create final-qa-report.md with checklist results
- Note any deviations from design specs

---

## Verification Protocol

**After Each Task Completion**:

1. Developer implements task ONLY
2. Developer commits to git immediately with exact commit pattern
3. Developer updates task status to "✅ COMPLETE"
4. Developer adds git commit SHA to task
5. Developer returns to team-leader with completion report

**Team-leader verification (MANDATORY)**:

1. Verify git commit exists: `git log --oneline -1`
2. Verify commit message matches pattern
3. Verify file exists: `Read([file-path])`
4. Verify build passes (if applicable): `npx nx build dev-brand-ui`
5. If ALL verifications pass → Assign next task
6. If ANY verification fails → Mark task "❌ FAILED", escalate to user

---

## Completion Criteria

**All tasks complete when**:

- All 20 task statuses are "✅ COMPLETE"
- All 20 git commits verified
- All files exist at specified paths
- Build passes: `npx nx build dev-brand-ui`
- App runs without errors: `npx nx serve dev-brand-ui`

**Return to orchestrator with**: "All 20 tasks completed and verified ✅"

---

## Anti-Patterns to Prevent (from quality-failure-report.md)

**❌ FORBIDDEN**:

- Claiming multiple tasks complete without git commits
- Marking pre-existing files as "newly created"
- Self-reporting completion without commit evidence
- Bulk completion (multiple tasks at once)
- Fabricating branch creation
- Inventing implementation metrics

**✅ REQUIRED**:

- One task at a time
- Git commit immediately after implementation
- Update tasks.md status only after commit
- Return to team-leader for verification
- Accept verification failure gracefully
