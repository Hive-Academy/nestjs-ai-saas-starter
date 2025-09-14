# Library Index

> Snapshot of modular components in the workspace. Some modules are internal (not yet on NPM). See `04-value-prop-per-library.md` for deep value narratives.

| Module | Category | Purpose | Published (NPM) | Maturity* | Demo Relevance | Differentiator |
| ------ | -------- | ------- | --------------- | --------- | -------------- | -------------- |
| core | Core Runtime | Shared tokens, types, DI contracts | No | Alpha | High (all flows) | Opinionated minimal contract layer |
| workflow-engine | Core Runtime | Orchestrated graph & decorator execution | No | Alpha | High | Dual declarative + functional orchestration |
| functional-api | Core Runtime | Functional helpers wrapping engine | No | Alpha | Medium | Seamless opt-in for FP style |
| streaming | Cross-Cutting | Token/event streaming over WS | No | Alpha | High | Decorator-driven adapter injection |
| checkpoint | Cross-Cutting | Durable state snapshots + resume | No | Alpha | High | Deterministic checkpoint schema |
| time-travel | Cross-Cutting | Replay timeline emission | No | Prototype | Medium | Re-emits original token cadence |
| memory | Cross-Cutting | Memory fusion orchestration | No | Prototype | High | Cascade: vector → graph expansion |
| hitl | Cross-Cutting | Human approval gating | No | Alpha | Medium | Zero-churn removable (no-op fallback) |
| multi-agent | Cross-Cutting | Role/agent coordination helpers | No | Prototype | Medium | Lightweight role graph primitives |
| monitoring | Cross-Cutting | Health / telemetry scaffolding | No | Planning | Low | Pre-wired health surfaces |
| platform | Cross-Cutting | Aggregated platform wiring exports | No | Alpha | Medium | Central DI composition boundary |
| nestjs-chromadb | External Adapter | Vector DB integration | Yes | Beta | High | Unified embeddings provider config |
| nestjs-neo4j | External Adapter | Graph DB integration | Yes | Beta | High | Simplified driver + health integration |

*Maturity Legend: Planning → Prototype → Alpha → Beta → Stable

## Notes

- Publishing strategy: external adapters reach Beta earlier; internal runtime aims for cohesive initial release.
- `memory` depends on both vector + graph adapters (chroma + neo4j) for enrichment cascade.
- `time-travel` builds on checkpoint event log—stabilization pending telemetry integration.

## Dependency Highlights (Informal)

- `workflow-engine` ← `core`
- `streaming`, `checkpoint`, `hitl`, `memory`, `time-travel` all integrate via DI tokens from `core` / `workflow-engine`.
- `platform` aggregates and re-exports selected module façades internally (not for circular public coupling).

> For visual graphs see `08-architecture-diagrams.md`.
