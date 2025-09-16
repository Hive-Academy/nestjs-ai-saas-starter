# Hybrid UI Global Three.js Usage Audit

Date: 2025-09-16  
Status: Draft v1  
Scope: All direct Three.js usages in `apps/dev-brand-ui` (landing page + spatial interface) to inform abstraction & migration.

> Goal: Classify every raw Three.js touchpoint into (a) Keep (specialized), (b) Abstract (fold into Hybrid UI builder/manager), (c) Adapter (temporary wrapper until manager lands), (d) Remove (redundant/unnecessary post-migration).

---
 
## 1. Pattern Taxonomy

| Code | Pattern | Description | Target Abstraction |
|------|---------|-------------|--------------------|
| SceneInit | Scene / renderer / camera creation | Manual setup of renderer/camera/scene | `HybridUIService` core (already) |
| CameraMutate | Direct camera position / fog / FOV tweaks | Camera config adjustments per component | Scene config in `createHybridConfig` (extend) |
| MeshCreate | Geometry + material mesh instantiation | Creating primitives (Plane/Sphere/Box) | Config builders (card/button/decoration) |
| MaterialAdjust | Direct material param changes (color, emissive) | Dynamic styling | InteractionManager / style config mapping |
| rAFLoop | Manual requestAnimationFrame loops | Animation / per-frame updates | AnimationController (future) |
| Particles | BufferGeometry + Points/ShaderMaterial particle fields | Decorative particle systems | DecorationAdapter -> ParticleManager (future) |
| Raycast | Raycaster for hover/intersection | Interaction detection | InteractionManager |
| Shader | ShaderMaterial definitions & uniforms updates | Custom GLSL logic | Shader preset registry (future) |
| Instancing | InstancedMesh / InstancedBufferGeometry usage | Performance optimization | Performance/Instancing Manager |
| TextureDraw | Canvas / dynamic texture redraw logic | Text / metrics | Texture pipeline (MutationObserver) |
| LayoutCustom | Manual placement/orbital math | Spatial layout algorithms | LayoutManager |
| LineSegments | Wireframe / line geometry constructs | Structural diagrams | Diagram layout + line style config |

---
 
## 2. Landing Page Section Audit

| Component | File | Patterns | Action Classification | Notes |
|-----------|------|----------|-----------------------|-------|
| Hero Section | hero-section.component.ts | SceneInit, CameraMutate, MeshCreate, Particles, rAFLoop | Abstract (most), Adapter (particles) | Introduce hero scene preset; wrap particle system |
| Platform Pillars | platform-pillars.component.ts | SceneInit, MeshCreate, Raycast, Particles, rAFLoop, LayoutCustom | Abstract (cards), Adapter (particles), Abstract (raycast) | Raycast → InteractionManager; layout math → LayoutManager |
| Demo Theater | demo-theater.component.ts | SceneInit, MeshCreate, rAFLoop | Abstract | Might require gallery layout preset |
| Ecosystem Explorer | ecosystem-explorer.component.ts | SceneInit, Particles, rAFLoop | Adapter (particles) | Particle density tuning needed |
| Libraries Showcase | libraries-showcase.component.ts | SceneInit, MeshCreate, rAFLoop, MaterialAdjust | Abstract, Adapter (orbital layout) | Orbital math to LayoutManager strategy |
| Architecture Diagram | architecture-diagram.component.ts | SceneInit, MeshCreate, LineSegments, rAFLoop | Abstract + New diagram preset | Wireframe lines need config-driven creation |
| 3D Info Card | three-d-info-card.component.ts | MeshCreate, MaterialAdjust | Abstract | Straightforward card → `createCardConfig` |
| Section Performance Service | section-performance.service.ts | Renderer metrics | Abstract | Replace with metrics signals from Hybrid layer |

---
 
## 3. Spatial Interface Audit (Advanced / Non-Landing)

| Module Element | File | Patterns | Action | Rationale |
|----------------|------|----------|--------|-----------|
| Scene Component | scene-3d.component.ts | SceneInit, MeshCreate, Particles, rAFLoop, LazyLoad | Abstract + Adapter | Replace scene init with HybridUIService; particles adapter |
| Agent Component | agent-3d.component.ts | MeshCreate, Shader, Particles, rAFLoop | Adapter (Shader/Particles), Abstract (geometry) | Agent visuals may remain specialized initially |
| Navigation Controls | navigation-controls.component.ts | SceneInit? (indirect), CameraMutate | Abstract | Camera config mapping |
| Agent Visualizer Service | agent-visualizer.service.ts | Raycast, MaterialAdjust | Abstract | Centralize hover detection |
| Agent Interaction Service | agent-interaction.service.ts | Raycast | Abstract | Merge raycaster logic into InteractionManager |
| Agent State Visualizer Svc | agent-state-visualizer.service.ts | Shader, rAFLoop | Adapter | Complex shader animations—defer abstraction |
| Performance Monitor Service | performance-monitor.service.ts | rAFLoop, metrics | Abstract | Provide metrics via signals |
| Constellation Layout Service | constellation-layout.service.ts | LayoutCustom, Instancing | Abstract | Seeds LayoutManager + Instancing strategy |
| Scene Content Service | scene-content.service.ts | MeshCreate, Particles | Abstract + Adapter | Basic primitives → builders; particles adapter |
| Performance 3D Service | performance-3d.service.ts | Instancing, Geometry pool, rAFLoop | Abstract | Performance/Instancing Manager base |
| Visual Effect LOD Util | visual-effect-lod.util.ts | Shader, Instancing | Adapter | Keep utility until Shader/LOD managers exist |
| Tool Execution Ring Effect | tool-execution-ring.ts | Shader, rAFLoop | Adapter | Custom effect → effect registry later |
| Memory Access Effect | memory-access-effect.ts | Shader, Particles, rAFLoop | Adapter | Complex staged animations |
| Communication Stream Effect | communication-stream.ts | Particles, Shader, rAFLoop | Adapter | Particle + shader blend |
| Agent State Shader | agent-state.shader.ts | Shader | Adapter | High complexity GLSL; keep isolated |
| Lazy Loading Service | lazy-loading.service.ts | Loader (EffectComposer, GLTFLoader) | Abstract | Future asset loader manager |
| Three Lifecycle Util | three-lifecycle.util.ts | WebGLRenderer mgmt | Remove | Superseded by HybridUIService lifecycle |
| Three Integration Service (legacy) | three-integration.service.ts | Renderer, MeshCreate | Remove | Consolidate into Hybrid service |

---
 
## 4. Abstraction Roadmap Mapping

| Manager / Builder | Patterns Consumed | Initial Sources | Priority |
|-------------------|-------------------|-----------------|----------|
| LayoutManager | LayoutCustom, Orbital, Diagram | Pillars, Libraries Showcase, Architecture Diagram, Constellation svc | High |
| InteractionManager | Raycast, Hover scaling, Click | Platform Pillars, Agent Visualizer/Interaction | High |
| AnimationController | rAFLoop consolidation | Hero, Pillars, Agent, Particles effects | High |
| Particle/Decoration Adapter | Particles | Hero, Ecosystem, Pillars ambient, Effects | High |
| Texture Pipeline | TextureDraw | (Planned metrics/testimonial components) | Medium |
| Performance/Instancing Manager | Instancing, Geometry pool | Performance 3D svc, Constellation svc | Medium |
| Shader/Effect Registry | Shader, LOD materials | Agent shaders, Effects, LOD util | Medium |
| Diagram Preset | LineSegments structural lines | Architecture Diagram | Medium |
| Asset Loader Manager | GLTFLoader, EffectComposer | Lazy Loading Service | Low (after core) |

---
 
## 5. Migration Action List (Derived)

| ID | Action | Source Files | Target Abstraction | Batch | Notes |
|----|--------|-------------|--------------------|-------|-------|
| A1 | Replace direct scene init in landing sections | hero, pillars, theater, explorer, showcase, diagram | HybridUIService scene config | Batch 1 | Introduce scene presets (hero, gallery, diagram) |
| A2 | Abstract card/plane geometry creation | pillars, info-card, hero metrics | `createCardConfig` | Batch 1 | Remove manual PlaneGeometry usage |
| A3 | Centralize raycasting | platform-pillars, agent-* services | InteractionManager | Batch 1 | Single Raycaster instance w/ delegation |
| A4 | Particle adapter PoC | hero, ecosystem, pillars ambient | DecorationAdapter | Batch 1 | Define minimal interface (init/update/dispose) |
| A5 | Animation loop consolidation | all rAFLoop sites | AnimationController | Batch 2 | Register per-frame callbacks via signals |
| A6 | Layout orbital/diagram strategy | libraries showcase, architecture diagram, constellation | LayoutManager | Batch 2 | Provide strategy tokens |
| A7 | Instancing manager integration | performance-3d, constellation | Performance/Instancing Manager | Batch 2 | Geometry pool + instancing API |
| A8 | Shader effect registry draft | agent shaders, tool ring, memory access, communication stream | Shader/Effect Registry | Batch 3 | Uniform schema + lifecycle hooks |
| A9 | Remove legacy lifecycle/util services | three-lifecycle.util, three-integration.service | HybridUIService | Batch 3 | After scene migrations stable |
| A10 | Texture update pipeline implementation | (planned metrics/testimonial) | Texture Pipeline | Batch 3 | MutationObserver + debounced redraw |

---
 
## 6. Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Particle density harms FPS | User experience degradation | Introduce adaptive particle budget via Performance Manager |
| Shader abstraction delays migration | Stalled components | Keep adapters until registry stable; avoid premature refactor |
| Raycast consolidation regression | Interaction bugs | Provide feature-flag to fall back to local raycast during QA |
| Over-abstraction too early | Complexity / velocity loss | Batch order enforces high-value abstractions first |
| Screenshot diff tooling gap | Delayed parity verification | Temporary manual capture checklist; automate later |

---
 
## 7. Decommission Candidates

| File | Condition to Remove | Status |
|------|---------------------|--------|
| three-lifecycle.util.ts | All sections on Hybrid scene API | Pending |
| three-integration.service.ts | Same as above + no references | Pending |
| performance-3d.service.ts (parts) | Instancing Manager in place | Pending (partial) |
| constellation-layout.service.ts (parts) | LayoutManager orbital strategy merged | Pending |
| individual particle code blocks | Particle adapter adopted | Pending |

---
 
## 8. Next Steps

1. Implement A1–A4 (Batch 1) scaffolds in hybrid layer (no visual regression allowed).
2. Create minimal InteractionManager (central raycaster + hover scaling strategy registry).
3. Draft DecorationAdapter interface and migrate hero + ecosystem particles.
4. Update `HYBRID_UI_COMPONENT_MIGRATION_MAP.md` statuses post Batch 1 PR.
5. Begin LayoutManager design doc referencing collected layout math patterns.

---
End of Document.
