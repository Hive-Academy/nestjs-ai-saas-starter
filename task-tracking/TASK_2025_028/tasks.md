# Development Tasks - TASK_2025_028

**Task Type**: Frontend (UI Enhancement)
**Developer Needed**: frontend-developer
**Total Tasks**: 18
**Decomposed From**:

- implementation-plan.md
- visual-redesign-specification.md
- design-handoff-enhanced.md
- section-comparison-analysis.md

**EXECUTION STRATEGY**: Parallel Batch Execution (4 batches, target ~1-2 hours with parallelization)
**ESTIMATED SEQUENTIAL TIME**: 22-26 hours
**ESTIMATED PARALLEL TIME**: ~1-2 hours (with 8+ parallel developers)

---

## BATCH 0: Foundation (Sequential - Complete First)

**Dependencies**: None
**Execution**: Sequential (must complete before Batch 1)
**Estimated Time**: 2 hours (sequential)

### Task 1: Extend Tailwind Configuration

- **Status**: 🔄 IN PROGRESS - Assigned to frontend-developer (BATCH 0 - Sequential)
- **Developer**: frontend-developer
- **File**: apps/dev-brand-ui/tailwind.config.js
- **Specification Reference**: visual-redesign-specification.md:17-103, implementation-plan.md:98-160
- **Description**: Add enhanced design system utilities (typography scale, shadow system, color variations, border radius, gradients, scale variants)
- **Verification Requirements**:
  - ✅ File modified with new theme.extend properties
  - ✅ Git commit pattern: `feat(angular-3d): extend tailwind config with enhanced design system utilities`
  - ✅ Build passes: `npx nx build dev-brand-ui`
  - ✅ Dev server restart confirms utilities available
- **Estimated Time**: 0.5 hours

**Implementation Details**:

- Add fontSize: display (88px), section-lg (72px), subsection-lg (48px)
- Add boxShadow: card-minimal, card-elevated, card-glow-indigo, card-glow-purple, cta-primary
- Add colors: accent-secondary (#8B5CF6), accent-tertiary (#06B6D4)
- Add borderRadius: card-lg (24px), card-xl (32px)
- Add backgroundImage: gradient-card, gradient-card-hover, gradient-cta-primary, gradient-cta-secondary, gradient-roi
- Add scale: 98, 102, 103, 105, 108

---

### Task 2: Create EnhancedCard Reusable Component

- **Status**: 🔄 IN PROGRESS - Assigned to frontend-developer (BATCH 0 - Sequential)
- **Developer**: frontend-developer
- **File**: apps/dev-brand-ui/src/app/shared/components/enhanced-card.component.ts
- **Specification Reference**: visual-redesign-specification.md:107-135, implementation-plan.md:162-210
- **Pattern to Follow**: Existing standalone components in shared/components/
- **Description**: Create base card component with visual variants (default, gradient, primary-cta) and hover configuration
- **Verification Requirements**:
  - ✅ File created with standalone component
  - ✅ Three variants implemented (default, gradient, primary-cta)
  - ✅ Git commit pattern: `feat(angular-3d): add enhanced card component with variants`
  - ✅ Component exports in barrel file (if applicable)
- **Estimated Time**: 0.5 hours

---

### Task 3: Create GlassPill Reusable Component

- **Status**: 🔄 IN PROGRESS - Assigned to frontend-developer (BATCH 0 - Sequential)
- **Developer**: frontend-developer
- **File**: apps/dev-brand-ui/src/app/shared/components/glass-pill.component.ts
- **Specification Reference**: visual-redesign-specification.md:137-158, implementation-plan.md:212-252
- **Pattern to Follow**: Existing standalone components in shared/components/
- **Description**: Create glassmorphism badge/pill component with color variants (indigo, purple, cyan)
- **Verification Requirements**:
  - ✅ File created with standalone component
  - ✅ Backdrop-blur effect implemented
  - ✅ Three color variants working
  - ✅ Git commit pattern: `feat(angular-3d): add glassmorphism pill component`
- **Estimated Time**: 0.25 hours

---

### Task 4: Create Icon3DContainer Reusable Component

- **Status**: 🔄 IN PROGRESS - Assigned to frontend-developer (BATCH 0 - Sequential)
- **Developer**: frontend-developer
- **File**: apps/dev-brand-ui/src/app/shared/components/icon-3d-container.component.ts
- **Specification Reference**: visual-redesign-specification.md:160-199, implementation-plan.md:254-308
- **Pattern to Follow**: Scene3DComponent integration (scene-3d.component.ts:95)
- **Description**: Create wrapper component for 3D icons with size variants (sm, md, lg, xl)
- **Verification Requirements**:
  - ✅ File created with Scene3DComponent import
  - ✅ Four size variants implemented
  - ✅ Camera configuration for icon viewing
  - ✅ Git commit pattern: `feat(angular-3d): add 3d icon container component`
- **Estimated Time**: 0.5 hours

---

### Task 5: Create CountUp Animation Directive

- **Status**: 🔄 IN PROGRESS - Assigned to frontend-developer (BATCH 0 - Sequential)
- **Developer**: frontend-developer
- **File**: apps/dev-brand-ui/src/app/shared/directives/count-up.directive.ts
- **Specification Reference**: visual-redesign-specification.md:1452-1497, implementation-plan.md:310-370
- **Pattern to Follow**: ScrollAnimationDirective (existing directive pattern)
- **Description**: Create attribute directive for animated count-up effect on metrics (60 FPS, format preservation)
- **Verification Requirements**:
  - ✅ File created with standalone directive
  - ✅ 60 FPS animation (16ms intervals)
  - ✅ Format preservation (%, $, +)
  - ✅ Git commit pattern: `feat(angular-3d): add count-up animation directive`
- **Estimated Time**: 0.25 hours

---

## BATCH 1: Parallel Section Group A (Parallel - Run Simultaneously)

**Dependencies**: Batch 0 complete
**Execution**: ALL TASKS IN PARALLEL (6 developers simultaneously)
**Estimated Time**: ~4 hours (parallel), 14 hours (sequential)

### Task 6: Enhance Problem/Solution Section

- **Status**: ⏸️ PENDING
- **Developer**: frontend-developer
- **File**: apps/dev-brand-ui/src/app/features/landing-page/sections/problem-solution-section.component.ts
- **Parallel Group**: BATCH_1
- **Specification Reference**: visual-redesign-specification.md:203-454, implementation-plan.md:372-446
- **Pattern to Follow**: Existing section structure
- **Description**: Enhance existing section with minimal shadows, gradient cards, 3D decorative layer, count-up animations
- **Verification Requirements**:
  - ✅ Background changed to bg-white
  - ✅ Solution card uses EnhancedCard wrapper
  - ✅ Metric cards use gradient backgrounds and minimal shadows
  - ✅ Count-up directive integrated
  - ✅ 3D decorative layer at 20% opacity (Task 7 scene graph)
  - ✅ Git commit pattern: `feat(angular-3d): enhance problem/solution section with refined visuals`
- **Estimated Time**: 2 hours

**Key Changes**:

- Background: bg-gray-50 → bg-white
- Add decorative 3D layer (absolute, z-0, opacity-20)
- Solution card: Use app-enhanced-card with p-12 md:p-16
- Metric cards: bg-gradient-card, shadow-card-minimal, border-gray-100, hover:shadow-card-glow-indigo
- Typography: Add color accent span on "TypeScript Developers"
- Add count-up animation to metric values

---

### Task 7: Create Problem/Solution Decorative 3D Scene Graph

- **Status**: ⏸️ PENDING
- **Developer**: frontend-developer
- **File**: apps/dev-brand-ui/src/app/features/landing-page/sections/scene-graphs/problem-solution-decorative.component.ts
- **Parallel Group**: BATCH_1
- **Specification Reference**: visual-redesign-specification.md:374-446, implementation-plan.md:444-448
- **Pattern to Follow**: Existing scene graphs (cta-scene-graph.component.ts, hero-space-scene.component.ts)
- **Description**: Create decorative 3D scene with 3 floating spheres (indigo, purple, cyan)
- **Verification Requirements**:
  - ✅ File created with 3 FloatingSphereComponents
  - ✅ Colors: indigo (0x6366F1), purple (0x8B5CF6), cyan (0x06B6D4)
  - ✅ Slow float speeds (5000-6000ms)
  - ✅ Git commit pattern: `feat(angular-3d): add problem/solution decorative scene graph`
- **Estimated Time**: 0.5 hours

---

### Task 8: Enhance Value Propositions Section (Card Component Redesign)

- **Status**: ⏸️ PENDING
- **Developer**: frontend-developer
- **File**: apps/dev-brand-ui/src/app/features/landing-page/components/value-proposition-card.component.ts
- **Parallel Group**: BATCH_1
- **Specification Reference**: visual-redesign-specification.md:459-572, implementation-plan.md:448-570
- **Pattern to Follow**: Existing ValuePropositionCard structure
- **Description**: REWRITE card component with asymmetric layout (30% icon column, 70% content column), alternating sides, 3D icons, glassmorphism pills
- **Verification Requirements**:
  - ✅ Asymmetric 30/70 layout implemented
  - ✅ layoutVariant prop (left/right) working
  - ✅ Icon column gradient background
  - ✅ GlassPill component integrated for package name
  - ✅ Enhanced checkmarks with circular backgrounds
  - ✅ Color-coded badges (red pain, green solution)
  - ✅ Git commit pattern: `feat(angular-3d): redesign value proposition card with asymmetric layout`
- **Estimated Time**: 3 hours

**Key Changes**:

- Layout: flex flex-col lg:flex-row with conditional flex-row-reverse
- Icon column (30%): gradient bg, Icon3DContainer, GlassPill, metric callout
- Content column (70%): headline, pain point (red badge), solution (green badge), capabilities list
- Hover: shadow-card-glow-indigo, scale-[1.01], border-indigo-100

---

### Task 9: Update Value Propositions Section Container (Alternation Logic)

- **Status**: ⏸️ PENDING
- **Developer**: frontend-developer
- **File**: apps/dev-brand-ui/src/app/features/landing-page/sections/value-propositions-section.component.ts
- **Parallel Group**: BATCH_1
- **Specification Reference**: visual-redesign-specification.md:587-612, implementation-plan.md:450-572
- **Pattern to Follow**: Existing section container
- **Description**: Add alternation logic for layoutVariant prop and decorative dividers every 3rd card
- **Verification Requirements**:
  - ✅ layoutVariant alternates (isOdd ? 'left' : 'right')
  - ✅ iconSceneGraph array passed to cards
  - ✅ Decorative divider every 3rd card (optional, can defer to integration phase)
  - ✅ Git commit pattern: `feat(angular-3d): add alternation logic to value propositions section`
- **Estimated Time**: 0.5 hours

---

### Task 10: Enhance Workflow Examples Section (Card Component)

- **Status**: ⏸️ PENDING
- **Developer**: frontend-developer
- **File**: apps/dev-brand-ui/src/app/features/landing-page/components/workflow-example-card.component.ts
- **Parallel Group**: BATCH_1
- **Specification Reference**: visual-redesign-specification.md:676-823, implementation-plan.md:575-710
- **Pattern to Follow**: Existing WorkflowExampleCard structure
- **Description**: Enhance card with 3D number badge, glassmorphism pills, terminal-style code blocks, value mini-cards
- **Verification Requirements**:
  - ✅ 3D number badge with gradient and glow
  - ✅ GlassPill components for modules
  - ✅ Terminal-style code blocks (macOS buttons, filename, copy button)
  - ✅ Color-coded labels (red before, green after)
  - ✅ Green ring on "after" code block
  - ✅ Value delivered mini-cards grid
  - ✅ Git commit pattern: `feat(angular-3d): enhance workflow example card with terminal blocks and pills`
- **Estimated Time**: 3 hours

**Key Changes**:

- Number badge: w-20 h-20, gradient-cta-primary, glow shadow, decorative ring
- Glassmorphism pills for modules (backdrop-blur-md)
- Terminal header: colored buttons (red/yellow/green), filename, copy button
- Code blocks: bg-black, gray-800 header, monospace font
- After code: ring-2 ring-green-500/30
- Value delivered: 2x2 grid with gradient cards

---

### Task 11: Enhance Workflow Examples Section Container

- **Status**: ⏸️ PENDING
- **Developer**: frontend-developer
- **File**: apps/dev-brand-ui/src/app/features/landing-page/sections/workflow-examples-section.component.ts
- **Parallel Group**: BATCH_1
- **Specification Reference**: visual-redesign-specification.md:836-881, implementation-plan.md:708-710
- **Pattern to Follow**: Existing section container
- **Description**: Apply enhanced styling to section container (bg-gray-50, refined typography)
- **Verification Requirements**:
  - ✅ Background: bg-gray-50 (alternates from white sections)
  - ✅ Section headline with color accent span
  - ✅ Typography scales match design spec
  - ✅ Git commit pattern: `feat(angular-3d): enhance workflow examples section container`
- **Estimated Time**: 0.5 hours

---

## BATCH 2: Parallel Section Group B (Parallel - Run Simultaneously)

**Dependencies**: Batch 0 complete (Batch 1 can overlap)
**Execution**: ALL TASKS IN PARALLEL (3 developers simultaneously)
**Estimated Time**: ~3 hours (parallel), 9 hours (sequential)

### Task 12: Enhance Capabilities Matrix Section

- **Status**: ⏸️ PENDING
- **Developer**: frontend-developer
- **File**: apps/dev-brand-ui/src/app/features/landing-page/sections/capabilities-matrix-section.component.ts
- **Parallel Group**: BATCH_2
- **Specification Reference**: visual-redesign-specification.md:886-1044, implementation-plan.md:712-825
- **Pattern to Follow**: Existing section structure
- **Description**: Enhance table with alternating rows, sticky header, animated checkmarks, gradient ROI callout
- **Verification Requirements**:
  - ✅ Table with alternating row backgrounds (even:bg-gray-50)
  - ✅ Sticky header with gradient background
  - ✅ Hover effect (hover:bg-indigo-50) on rows
  - ✅ Checkmarks with circular backgrounds and scroll animation
  - ✅ ROI callout with gradient-roi background
  - ✅ 3D decorative element at 10% opacity (Task 13 scene graph)
  - ✅ Git commit pattern: `feat(angular-3d): enhance capabilities matrix with animated table`
- **Estimated Time**: 3 hours

**Key Changes**:

- Table: rounded-xl, shadow-sm, sticky header
- Header: gradient-to-r from-gray-50 to-gray-100, border-b-2
- Rows: alternating backgrounds, hover:bg-indigo-50
- Checkmarks: w-8 h-8 circular bg-green-50, scrollAnimation with stagger
- ROI: gradient-roi, text-7xl metric, pulse-slow animation

---

### Task 13: Create ROI 3D Scene Graph

- **Status**: ⏸️ PENDING
- **Developer**: frontend-developer
- **File**: apps/dev-brand-ui/src/app/features/landing-page/sections/scene-graphs/roi-scene-graph.component.ts
- **Parallel Group**: BATCH_2
- **Specification Reference**: visual-redesign-specification.md:950-967, implementation-plan.md:824-826
- **Pattern to Follow**: Existing scene graphs
- **Description**: Create decorative 3D scene for ROI callout (1-2 floating polyhedrons)
- **Verification Requirements**:
  - ✅ File created with 1-2 polyhedrons
  - ✅ Colors match accent palette
  - ✅ Slow rotation/float
  - ✅ Git commit pattern: `feat(angular-3d): add roi callout scene graph`
- **Estimated Time**: 0.5 hours

---

### Task 14: Enhance Developer Experience Section

- **Status**: ⏸️ PENDING
- **Developer**: frontend-developer
- **File**: apps/dev-brand-ui/src/app/features/landing-page/sections/developer-experience-section.component.ts
- **Parallel Group**: BATCH_2
- **Specification Reference**: visual-redesign-specification.md:1048-1191, implementation-plan.md:828-958
- **Pattern to Follow**: Existing section structure
- **Description**: Apply dark theme variant with terminal code blocks and pattern mapping table
- **Verification Requirements**:
  - ✅ Dark background (bg-gray-900)
  - ✅ Light text (text-white, text-gray-300)
  - ✅ Terminal-style code blocks (same as Workflow Examples)
  - ✅ Indigo ring on AI/ML code block
  - ✅ Dark table (bg-gray-800) with hover effects
  - ✅ Decorator syntax highlighted in indigo
  - ✅ Git commit pattern: `feat(angular-3d): enhance developer experience section with dark theme`
- **Estimated Time**: 3 hours

**Key Changes**:

- Section: bg-gray-900, text-white
- Code blocks: terminal header, bg-black, ring-2 ring-indigo-500/50 on AI/ML
- Table: bg-gray-800, hover:bg-gray-750
- Decorators: text-indigo-400 font-mono

---

## BATCH 3: CTA Enhancement (Sequential After Batch 1 & 2)

**Dependencies**: Batches 1 & 2 complete
**Execution**: Sequential (requires integration readiness)
**Estimated Time**: ~2 hours

### Task 15: Enhance CTA Section

- **Status**: ⏸️ PENDING
- **Developer**: frontend-developer
- **File**: apps/dev-brand-ui/src/app/features/landing-page/sections/cta-section.component.ts
- **Specification Reference**: visual-redesign-specification.md:1202-1361, implementation-plan.md:960-1058
- **Pattern to Follow**: Existing cta-section.component.ts
- **Description**: Redesign with 5-column featured/standard layout, differentiated cards, 3D icons
- **Verification Requirements**:
  - ✅ Layout: 5-column grid (3 primary, 2 secondary/tertiary)
  - ✅ Primary card uses variant="primary-cta"
  - ✅ Icon3DContainer replaces emoji
  - ✅ 3D background opacity 40%, mouse parallax enabled
  - ✅ Buttons with arrow icons
  - ✅ Git commit pattern: `feat(angular-3d): enhance cta section with featured layout`
- **Estimated Time**: 1.5 hours

**Key Changes**:

- Grid: md:grid-cols-5
- Primary card: md:col-span-3, EnhancedCard variant="primary-cta"
- Secondary/tertiary: md:col-span-2 space-y-8, EnhancedCard variant="default"
- Icons: Icon3DContainer with scene graphs
- 3D background: opacity-40, enableMouseParallax=true

---

### Task 16: Enhance CTA 3D Scene Graph

- **Status**: ⏸️ PENDING
- **Developer**: frontend-developer
- **File**: apps/dev-brand-ui/src/app/features/landing-page/sections/scene-graphs/enhanced-cta-scene-graph.component.ts
- **Specification Reference**: visual-redesign-specification.md:1372-1447, implementation-plan.md:1054-1058
- **Pattern to Follow**: Existing cta-scene-graph.component.ts
- **Description**: Enhance scene with 8 elements (mix spheres/polyhedrons), color variations
- **Verification Requirements**:
  - ✅ 8 elements (from 5)
  - ✅ Mix of spheres and polyhedrons
  - ✅ Color variations (indigo, purple, cyan)
  - ✅ Git commit pattern: `feat(angular-3d): enhance cta scene graph with more elements`
- **Estimated Time**: 0.5 hours

---

## BATCH 4: 3D Icon Scene Graphs (Optional Parallelization)

**Dependencies**: Batch 0 complete
**Execution**: Can run in parallel with other batches OR deferred to later
**Estimated Time**: ~2-4 hours (highly parallelizable)

### Task 17: Create Value Proposition 3D Icon Scene Graphs (11 icons)

- **Status**: ⏸️ PENDING
- **Developer**: frontend-developer
- **Files**: apps/dev-brand-ui/src/app/features/landing-page/sections/scene-graphs/value-prop-icon-{name}.component.ts (11 files)
- **Parallel Group**: BATCH_4 (optional)
- **Specification Reference**: visual-redesign-specification.md:620-656, implementation-plan.md:568-572
- **Pattern to Follow**: Reusable icon pattern with geometry variations
- **Description**: Create 11 3D icon scene graphs for value propositions (chromadb, neo4j, memory, checkpoint, functional-api, multi-agent, platform, time-travel, monitoring, hitl, streaming)
- **Verification Requirements**:
  - ✅ 11 files created (one per library)
  - ✅ Geometry variations: icosahedron, octahedron, dodecahedron
  - ✅ Color assignments: indigo, purple, cyan (rotating)
  - ✅ Rotate directive with slow speed (0.3)
  - ✅ Git commit pattern: `feat(angular-3d): add value proposition 3d icon scene graphs`
- **Estimated Time**: 2-3 hours (can be highly parallelized with 11 developers)

**Icon Assignments**:

1. ChromaDB: Icosahedron, Indigo (0x6366F1)
2. Neo4j: Dodecahedron, Purple (0x8B5CF6)
3. Memory: Octahedron, Cyan (0x06B6D4)
4. Checkpoint: Icosahedron, Indigo
5. Functional-API: Octahedron, Purple
6. Multi-Agent: Dodecahedron, Cyan
7. Platform: Icosahedron, Indigo
8. Time-Travel: Octahedron, Purple
9. Monitoring: Dodecahedron, Cyan
10. HITL: Icosahedron, Indigo
11. Streaming: Octahedron, Purple

---

### Task 18: Create CTA 3D Icon Scene Graphs (3 icons)

- **Status**: ⏸️ PENDING
- **Developer**: frontend-developer
- **Files**:
  - apps/dev-brand-ui/src/app/features/landing-page/sections/scene-graphs/cta-icon-explore.component.ts
  - apps/dev-brand-ui/src/app/features/landing-page/sections/scene-graphs/cta-icon-docs.component.ts
  - apps/dev-brand-ui/src/app/features/landing-page/sections/scene-graphs/cta-icon-production.component.ts
- **Parallel Group**: BATCH_4 (optional)
- **Specification Reference**: implementation-plan.md:1054-1058
- **Pattern to Follow**: Value prop icon pattern
- **Description**: Create 3 3D icon scene graphs for CTA cards (explore, docs, production)
- **Verification Requirements**:
  - ✅ 3 files created
  - ✅ Geometry variations
  - ✅ Color assignments match accent palette
  - ✅ Git commit pattern: `feat(angular-3d): add cta 3d icon scene graphs`
- **Estimated Time**: 0.5-1 hour

---

## VERIFICATION PROTOCOL

**After Each Task Completion**:

1. Developer updates task status to "✅ COMPLETE"
2. Developer adds git commit SHA
3. Team-leader verifies:
   - `git log --oneline -1` matches expected commit pattern
   - `Read([file-path])` confirms file exists and content correct
   - Build passes (if applicable): `npx nx build dev-brand-ui`
4. If verification passes: Assign next task in batch OR next batch
5. If verification fails: Mark task as "❌ FAILED", request fix or escalate to user

---

## COMPLETION CRITERIA

**All tasks complete when**:

- All task statuses are "✅ COMPLETE"
- All git commits verified
- All files exist with correct implementations
- Build passes without errors
- Dev server runs without console errors
- All sections render correctly in browser

**Return to orchestrator with**: "All 18 tasks completed and verified across 4 batches ✅"

---

## EXECUTION SUMMARY

**Total Tasks**: 18
**Batches**: 4
**Batch 0 Tasks**: 5 (sequential) - 2 hours
**Batch 1 Tasks**: 6 (parallel) - 4 hours parallel, 14 hours sequential
**Batch 2 Tasks**: 3 (parallel) - 3 hours parallel, 9 hours sequential
**Batch 3 Tasks**: 2 (sequential) - 2 hours
**Batch 4 Tasks**: 2 (optional parallel) - 3-4 hours parallel, 4-5 hours sequential

**Critical Path**: Batch 0 → (Batch 1 || Batch 2) → Batch 3 → Batch 4
**Estimated Parallel Time**: ~2 hours foundation + ~4 hours parallel batches + ~2 hours CTA + ~3 hours icons = **~11 hours** (with 8+ developers)
**Estimated Sequential Time**: 22-26 hours (one developer)

**Parallelization Benefit**: ~50-60% time reduction with adequate developer resources
