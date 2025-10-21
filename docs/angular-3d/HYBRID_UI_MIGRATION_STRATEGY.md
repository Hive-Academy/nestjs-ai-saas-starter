# Hybrid UI Migration Strategy

Date: 2025-09-16
Status: Draft v1
Owner: Frontend / Platform Alignment Initiative
Scope: Migration of all landing page and future 3D / hybrid DOM+WebGL UI surfaces to `apps/dev-brand-ui/src/app/angular-hybrid-ui` canonical module.

---

## 1. Executive Summary

We will migrate ad-hoc Three.js integrations and legacy duplicated Hybrid UI logic toward a consolidated, signal-driven Hybrid UI layer.
The migration minimizes production risk by introducing a compatibility adapter and phased replacement of rendering + interaction responsibilities
while preserving visual parity. Target outcome: a modular, testable, shareable Hybrid UI package with clear manager abstractions (Interaction,
Layout, Animation, Texture, Performance) and no residual direct Three.js usage in application feature components.

---

## 2. Guiding Principles

1. Single Canonical Service: Only `HybridUIService` under the angular-hybrid-ui module creates and owns the Three.js scene, camera, render loop.
2. Type Reuse First: All element/config/layout types live in `core/types/hybrid-ui.types`.
3. Signals Everywhere: No new @Input/@Output; prefer `input()`, `output()`, `signal`, `computed`, `effect`.
4. Eliminate Leaky Abstractions: Feature components cannot reach raw Three.js objects; they use config builders + element registration APIs.
5. Deterministic Layout: Layout recalculation occurs via a single signal-driven pipeline, enabling future SSR or headless test harness.
6. Incremental Safety: Each phase ends in a deployable state; no multi-week big-bang branch.

---

## 3. Current State Inventory (Landing + Hybrid Elements)

| Concern              | Current Pattern                       | Gaps                                  | Migration Target                                                      |
| -------------------- | ------------------------------------- | ------------------------------------- | --------------------------------------------------------------------- |
| Scene creation       | Manual or legacy service (removed)    | Duplication, non-deterministic config | Central `HybridUIService.createScene()` with config signal            |
| Element registration | Imperative pushes with partial config | Inconsistent defaults                 | `createHybridConfig` / specialized builders (card, button, nav, form) |
| Layout               | Ad-hoc grid or manual positioning     | No density / bounds optimization      | `createSceneLayout` + future `LayoutManager`                          |
| Interaction          | Component-level event listeners       | No unified hover/click semantics      | `InteractionManager` (planned) routing interaction modes              |
| Animation            | Inline rAF logic                      | Hard to throttle / profile            | `AnimationController` abstraction with stateful timeline signals      |
| Content -> Texture   | Canvas direct draws                   | No invalidation / caching strategy    | `ContentTextureService` + mutation observer bridge                    |
| Performance metrics  | Mocked or absent                      | No actionable telemetry               | `PerformanceMonitor` exposing fps, frame budget, draw calls           |
| Priority / LOD       | Hard-coded visuals                    | No dynamic adaptation                 | Priority-driven geometry + future adaptive simplification             |

---

## 4. Target Architecture (After Migration)

```text
[ Feature Components ]
       | (register via builders)
       v
[ ElementConfig Builders ] --> [ HybridUIService ] -- orchestrates --> [ Managers ]
                                             |--> InteractionManager
                                             |--> LayoutManager
                                             |--> AnimationController
                                             |--> TextureManager (ContentTextureService wrapper)
                                             |--> PerformanceMonitor
                                             |--> ScalingIntelligenceService

Three.js (Scene, Camera, Renderer) ← isolated inside HybridUIService & managers
```

---

## 5. Phased Migration Plan

### Phase 0 – Baseline (DONE / FOUNDATION)

- Remove legacy duplicate service. (Completed)
- Normalize decorators to signal inputs/outputs. (Completed)
- Ensure clean typecheck & stable config builders. (Completed)

### Phase 1 – Stabilize & Catalog

Goals: Full inventory of raw Three.js usages & hybrid component insertion points.
Actions:

- Search for any `new THREE.` or `from 'three'` imports outside angular-hybrid-ui → log occurrences.
- Create `docs/HYBRID_UI_THREE_AUDIT.md` (spin-off) enumerating each usage category: geometry creation, material customization, camera manipulation, animation loops.
- Replace trivial remaining direct imports in landing components with builder-based configs (card/button/nav).
  Exit Criteria: No direct Three.js imports in landing page except within the hybrid module.

### Phase 2 – Adapter Layer Introduction

Goals: Allow existing feature components that rely on imperative element placement to function while shifting implementation.
Actions:

- Introduce a thin `HybridUIAdapter` (temporary) with API parity to deprecated calls; internally delegates to `HybridUIService`.
- Mark adapter with `@deprecated` JSDoc and schedule removal in Phase 5.
- Provide mapping table old->new methods in adapter file header.
  Exit Criteria: All feature code uses adapter or new service (no raw legacy signatures inline).

### Phase 3 – Manager Extraction

Goals: Decompose responsibilities from monolithic service.
Actions:

- Extract InteractionManager interface (`applyHover`, `applyClick`, `dispatchFocusChange`).
- Extract LayoutManager: accepts element registry signal, emits positioned transforms.
- Extract AnimationController: central rAF loop with subscription registry.
- Refactor `HybridUIService` to orchestrate managers; keep public facade stable.
  Exit Criteria: Service file <200 lines, managers each <180 lines, unit tests for each manager skeleton.

### Phase 4 – Texture & Live Update Pipeline

Goals: Reactive texture updates without full redraw.
Actions:

- Implement MutationObserver directive (already partially conceptualized) to schedule debounced texture re-render in `ContentTextureService`.
- Add cache invalidation & size adaptive logic (respect maxTextureSize from config).
- Provide `textureVersion` signal per element for change detection.
  Exit Criteria: Editing projected DOM inside a content-3d element updates its texture within <120ms (target).

### Phase 5 – Performance & Adaptive Quality

Goals: Instrument and optimize runtime.
Actions:

- Add `PerformanceMonitor` with rAF delta history (rolling window 120 frames) computing average, min, P95.
- Expose signals: `fps`, `frameTimeMs`, `isFrameBudgetBreached`, `drawCallCount` (if accessible), `lodLevel`.
- Introduce dynamic LOD decision: degrade non-primary elements’ geometry when fps < targetFrameRate \* 0.85 for sustained N frames.
  Exit Criteria: Demonstrated LOD downgrade under artificial perf stress; metrics visible in a debug overlay.

### Phase 6 – Consolidation & Adapter Removal

Goals: Remove transitional artifacts.
Actions:

- Remove `HybridUIAdapter` and update any lingering imports.
- Deprecate any config fields superseded by managers.
- Produce updated diagrams + README excerpts.
  Exit Criteria: No deprecated symbols referenced in app code; docs updated.

### Phase 7 – Testing & Hardening

Goals: Achieve reliability & coverage.
Actions:

- Unit tests: managers, builders (happy path + invalid inputs), service orchestration.
- Integration test: register N elements, assert layout transforms snapshot.
- Performance regression harness: synthetic 100 element load to ensure <= target baseline frame budget.
- Add contract tests for priority-driven geometry mapping.
  Exit Criteria: >80% line & branch coverage for hybrid module; green CI with perf harness thresholds.

---

## 6. Workstream Breakdown & Ownership

| Workstream           | Primary Artifacts                                  | Dependencies         | Est. Effort |
| -------------------- | -------------------------------------------------- | -------------------- | ----------- |
| Three.js Audit       | HYBRID_UI_THREE_AUDIT.md                           | Phase 1 start        | 0.5d        |
| Adapter Layer        | hybrid-ui-adapter.ts                               | Audit complete       | 0.5d        |
| Interaction Manager  | interaction-manager.ts + tests                     | Adapter              | 1d          |
| Layout Manager       | layout-manager.ts + tests                          | Adapter              | 1d          |
| Animation Controller | animation-controller.ts + tests                    | Service baseline     | 0.5d        |
| Texture Pipeline     | mutation directive + service updates               | Managers partial     | 1d          |
| Performance Monitor  | performance-monitor.ts + overlay component         | Animation controller | 0.75d       |
| LOD System           | integrated into monitor or separate lod-manager.ts | Performance metrics  | 0.75d       |
| Consolidation        | Adapter removal + docs                             | All managers         | 0.5d        |
| Testing & Hardening  | Jest specs + perf harness                          | All prior            | 1.5d        |

---

## 7. Risk Matrix & Mitigations

| Risk                                    | Impact             | Likelihood | Mitigation                                                                              |
| --------------------------------------- | ------------------ | ---------- | --------------------------------------------------------------------------------------- |
| Hidden direct Three.js usage resurfaces | Breaks abstraction | Medium     | Comprehensive audit & enforce ESLint rule banning external three imports outside module |
| Animation loop duplication              | Perf degradation   | Low        | Single rAF ownership inside AnimationController; assert in tests                        |
| Texture update thrashing                | FPS drops          | Medium     | Debounce + microtask batching; frame budget guard                                       |
| LOD visual artifacts                    | UX regression      | Medium     | Gradual geometry step-down & QA checklist                                               |
| Manager extraction churn                | Refactor fatigue   | Medium     | Keep public facade stable; incremental PRs per manager                                  |

---

## 8. Definition of Done (Full Migration)

Zero direct `three` imports in feature code.

- Zero direct `three` imports in feature code.
- All hybrid-related responsibilities accessed via `HybridUIService` or dedicated managers.
- Adapter removed; no deprecated symbols.
- Live texture updates functioning & covered by tests.
- Performance metrics & adaptive quality operational and observable.
- > 80% coverage and passing perf harness.
- Documentation: Strategy (this file), Three.js audit, Updated README section, Manager API references.

---

## 9. Immediate Next Actions (Phase 1 Kickoff)

1. Implement audit script / grep and create `HYBRID_UI_THREE_AUDIT.md` skeleton.

2. Add an ESLint rule override (temporary) to flag disallowed `three` imports outside angular-hybrid-ui.

3. Replace any residual landing component Three.js usage with config builders.

4. Prepare adapter placeholder file (with TODO stubs) for Phase 2.

---

## 10. Appendix: Mapping Legacy to New API

| Legacy Concept    | Old Pattern                 | New Pattern                                     |
| ----------------- | --------------------------- | ----------------------------------------------- |
| Create element    | manual mesh + add()         | `createCardConfig()` + `hybridUI.addElement()`  |
| Hover effect      | direct material mutation    | interaction: { hover: 'scale' }                 |
| Camera reposition | manual camera.position set  | layout/camera signal from `createSceneLayout()` |
| Priority styling  | hard-coded color            | builder-driven geometry + color mapping         |
| Animation loop    | local requestAnimationFrame | central AnimationController subscription        |

---

## 11. Open Questions

1. Do we need SSR-friendly fallbacks (node-canvas) in v1? (Deferred)

2. Will we expose a public theming API for geometry/color mapping? (Phase 5 candidate)

3. Should LOD adapt interaction sensitivity as well as geometry? (Research during perf phase)

---

End of Document.
