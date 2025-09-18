# Hybrid UI Component Migration Map

Date: 2025-09-16
Status: Discovery Update v2
Owner: Frontend / Platform Alignment
Branch: `feature/TASK_FE_004-landing-page-critical-fixes`

> IMPORTANT: Do NOT alter, rename, or delete existing landing page components until the corresponding new Hybrid UI component achieves functional and visual parity and has been reviewed. We maintain side-by-side legacy vs hybrid implementations for comparison, regression detection, and screenshot diffing.

## 1. Purpose

Central tracker mapping each landing page (and related showcase) component from its current implementation (legacy / direct Three.js / ad-hoc) to the standardized Hybrid UI architecture using `HybridUIService`, config builders, and upcoming manager abstractions.

---

## 2. Status Legend

| Code | Meaning |
|------|---------|
| NS | Not Started |
| IP | In Progress |
| BL | Blocked (dependency needed) |
| RV | In Review (awaiting approval & parity verification) |
| DN | Done (legacy can be scheduled for deletion) |

Deletion of legacy variant only occurs after: (a) visual parity approval, (b) no external dependencies, (c) screenshot diff baseline captured.

---

## 3. Component Inventory (Grounded Discovery)

Legend (Patterns): SceneInit, CameraMutate, MeshCreate, MaterialAdjust, rAFLoop, Raycast, Shader, Particles, Instancing, TextureDraw, LayoutCustom

| Component (Legacy) | File Path | Selector (if applicable) | Category | Patterns (Detected) | Migration Builder(s) | Dependencies | Current Status | Notes / Risks |
|--------------------|-----------|--------------------------|----------|---------------------|----------------------|--------------|----------------|---------------|
| Hero / Splash | `features/landing-page/sections/hero-section.component.ts` | `app-hero-section` | Hybrid Content + Decorative | SceneInit, CameraMutate, MeshCreate, MaterialAdjust, Particles, rAFLoop | `createHybridConfig(type:'hero')`, `createCardConfig` (metrics tiles) | None | NS | Capture camera/fog constants before refactor |
| Feature Pillars | `features/landing-page/sections/platform-pillars.component.ts` | `app-platform-pillars` | Content Cards + Interactions | SceneInit, MeshCreate, Raycast, Particles, rAFLoop, LayoutCustom | `createCardConfig` + future `LayoutManager` | LayoutManager (future), InteractionManager | IP | Partial refactor started; raycasting to abstract |
| Demo Theater | `features/landing-page/sections/demo-theater.component.ts` | `app-demo-theater` | Scene Showcase | SceneInit, MeshCreate, Particles?, rAFLoop | `createHybridConfig(type:'gallery')` | AnimationController (future) | NS | Complex node graph visuals—assess abstraction vs adapter |
| Ecosystem Explorer | `features/landing-page/sections/ecosystem-explorer.component.ts` | `app-ecosystem-explorer` | Particle / Network Field | SceneInit, Particles, rAFLoop | DecorationAdapter (temp) + `createHybridConfig` | Performance Manager (future) | NS | High particle count—perf validation needed |
| Libraries Showcase | `features/landing-page/sections/libraries-showcase.component.ts` | `app-libraries-showcase` | Library Icons Orbit | SceneInit, MeshCreate, rAFLoop, MaterialAdjust | `createCardConfig` + orbital layout (LayoutManager) | LayoutManager, AnimationController | NS | Orbital math to move into layout strategy |
| Architecture Diagram | `features/landing-page/sections/architecture-diagram.component.ts` | `app-architecture-diagram` | Structural Diagram | SceneInit, MeshCreate, LineSegments, rAFLoop | `createHybridConfig(type:'diagram')` | None | NS | Line-based geometry—add diagram layout preset |
| 3D Info Card | `features/landing-page/components/three-d-info-card.component.ts` | `app-three-d-info-card` | Single Card + Accent | MeshCreate, MaterialAdjust | `createCardConfig` | None | NS | Fast win: wrap plane + accents as decoration config |
| Section Performance Svc | `features/landing-page/services/section-performance.service.ts` | n/a (service) | Perf Overlay | WebGLRenderer metrics access | Performance metrics integration | Performance Manager | NS | Replace with Hybrid metrics signals |
| Particle / Stars Field (Shared) | present inside multiple sections | n/a | Decorative Field | Particles, rAFLoop | DecorationAdapter | Performance Manager | NS | Create shared particle decoration config |
| (Planned) CTA Banner | (not discovered) | `app-cta-banner` (future) | Buttons + Card | (TBD) | `createButtonConfig`, `createCardConfig` | InteractionManager | NS | Add once implementation lands |
| (Planned) Metrics Panel | (not discovered) | `app-metrics-board` (future) | Dynamic Metrics | (Expected TextureDraw) | `createCardConfig` + texture pipeline | Texture pipeline | NS | Will validate post pipeline PoC |
| (Planned) Testimonial Slider | (not discovered) | `app-testimonial-cards` | Card Carousel | (Expected rAFLoop, LayoutCustom) | `createCardConfig`, AnimationController | AnimationController | NS | Carousels blocked on AnimationController |
| (Planned) Pricing Summary | (not discovered) | `app-pricing-summary` | Tier Cards | (Expected Highlight) | `createCardConfig` + priority mapping | None | NS | Priority -> geometry/color derivation |
| (Planned) Footer Nav 3D | (not discovered) | `app-footer-nav-3d` | Navigation | (Expected Raycast, Interaction) | `createNavConfig` | InteractionManager | NS | Wait for InteractionManager contract |

Removed Placeholder Rows: Consolidated planned components explicitly with (Planned) label to avoid confusing unimplemented vs undiscovered.

---

## 4. Migration Workflow (Per Component)

1. Baseline Capture: Screenshot (desktop + mobile), record camera / spacing constants.
2. Introduce Hybrid Version: New component or variant in parallel (suffix `-hybrid` or colocated subfolder `hybrid/`).
3. Register Elements: Replace manual scene logic with `HybridUIService.addElement(config)` using appropriate builder.
4. Remove Direct Three.js: If unavoidable (e.g., particle system), wrap in temporary adapter under `angular-hybrid-ui/adapters`.
5. Interaction Mapping: Translate hover/click to interaction config (no manual event binding on meshes).
6. Layout Integration: Use `createSceneLayout`; defer advanced layout until `LayoutManager` lands—add TODO referencing issue.
7. Texture Strategy: For dynamic text/content, rely on `content-3d` directive; mark high-frequency updates with TODO for Phase 4 pipeline.
8. Animation: Remove ad-hoc rAF loops; add placeholder `animation:'float'|'pulse'` until AnimationController produced.
9. Parity Review: Side-by-side visual diff (manual or automated screenshot harness TBD).
10. Promotion: Mark status RV → DN, schedule removal of legacy variant in consolidation batch.

---

## 5. Discovery Tasks (Execution Log)

| ID | Task | Status | Output Summary |
|----|------|--------|----------------|
| G1 | Grep raw Three.js imports | Done | 30+ import sites across landing + spatial-interface cataloged |
| G2 | Enumerate landing components | Done | Hero, Pillars, Demo Theater, Ecosystem Explorer, Libraries Showcase, Architecture Diagram, Info Card identified |
| G3 | Tag usage patterns | Done | Patterns column populated (SceneInit, Raycast, Particles, Shader, etc.) |
| G4 | Author audit doc | Pending | Will create `HYBRID_UI_THREE_AUDIT.md` (next task) |

---

## 6. Builder Mapping Cheat Sheet

| Legacy Pattern | Replacement | Notes |
|----------------|------------|-------|
| Manual plane + texture material | `createCardConfig()` + `content-3d` | Geometry auto-selected by priority |
| Spherical button mesh | `createButtonConfig()` | Style controls opacity/color/scale |
| Radial/orbital position loop | `createSceneLayout({ type:'orbital' })` | LayoutManager will refine distribution |
| Hard-coded highlight color | Priority mapping (HERO/PRIMARY) | Color + geometry derived |
| Direct rAF animation | AnimationController subscription (future) | Use decoration.animation placeholder now |
| Mesh hover scale on pointer | interaction.hover = 'scale' | Standardized easing later |
| Material emissive pulse | interaction.hover = 'glow' or animation:'pulse' | Extend InteractionManager for easing curves |
| Texture redraw on every setInterval | Texture versioning + MutationObserver (future) | Debounce + diff detection |

## 7. Parity Validation Checklist

| Check | Description | Pass? |
|-------|-------------|-------|
| Geometry Match | New geometry shape matches intent (card vs hero vs logo) |  |
| Color & Material | Opacity / color within ±5% visual delta |  |
| Layout Spacing | Relative element spacing variance <10% |  |
| Interaction Feel | Hover & click latency <50ms |  |
| Animation Presence | Placeholder animation not distracting |  |
| Content Fidelity | No text clipping or scaling artifacts |  |
| Performance | FPS within 5% of legacy under idle |  |

## 8. Deletion Gate Criteria

A legacy component may be scheduled for removal ONLY if:

- Status = DN in table.
- All parity checklist items Pass.
- No console warnings from hybrid layer under normal interaction.
- Screenshot diff (baseline vs hybrid) approved.
- No downstream modules import the legacy selector.

## 9. Open Items / TODOs

| ID | Item | Blocking | Target Batch |
|----|------|---------|--------------|
| O1 | (Completed) Implement grep audit tasks G1–G3 | None | A |
| O2 | Create `HYBRID_UI_THREE_AUDIT.md` | O1 | A |
| O3 | Add DecorationAdapter | Need design minimal API | E |
| O4 | Define LayoutManager interface | Strategy doc section | B |
| O5 | Define AnimationController interface | Strategy doc section | C |
| O6 | Decide screenshot diff tooling | None | A |
| O7 | Establish ESLint rule banning raw three imports | None | A |
| O8 | Draft MutationObserver texture directive | Texture pipeline phase | B |

## 10. Contribution Rules

1. Never modify original legacy component while hybrid variant is in NS/IP state.
2. Hybrid variant naming: `<component-name>-hybrid` or nested `hybrid/<component>.component.ts` to ease diffing.
3. Each PR must update this document’s table statuses.
4. Add a short PR note: `HybridUI Migration: <Component> -> <Status>`.
5. If a legacy bug is discovered during migration, document under Open Items instead of silently fixing in both—fix only in hybrid path unless security related.

## 11. Exit Definition (Document Can Retire)

- All rows DN.
- Open Items list empty or deferred to separate roadmap.
- Strategy doc updated with final architecture references.
- Legacy landing directory removed in a single cleanup commit.

---
End of Document.
