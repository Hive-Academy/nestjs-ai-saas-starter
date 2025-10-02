# Project AI Coding Instructions

Concise, project-specific guidance for AI coding agents (Copilot, Claude, etc.). Focus: implement real features using existing architecture without duplicating types or creating parallel versions.

## 1. Core Mission

Build production-grade AI features that integrate ALL three pillars when relevant:

- Vector: `@hive-academy/nestjs-chromadb`
- Graph: `@hive-academy/nestjs-neo4j`
- Workflow/Agents: LangGraph modules under `libs/langgraph-modules/*` (memory, checkpoint, streaming, multi-agent, etc.)

Never create stub/placeholder logic. Modernize code in place (no V1/V2/legacy variants, no compatibility layers).

## 2. Monorepo Shape (Nx)

Key areas:

- Apps: `apps/dev-brand-api` (Nest API), `apps/dev-brand-ui` (Angular), `apps/dev-brand-ui-e2e` (Playwright)
- Core adapters: `libs/nestjs-chromadb`, `libs/nestjs-neo4j`, `libs/nestjs-langgraph`
- Cross-cutting runtime: `libs/langgraph-modules/*` (e.g. `workflow-engine`, `memory`, `checkpoint`, `streaming`, `hitl`, `time-travel` (PoC), `monitoring`, `platform`)
- Task tracking: `task-tracking/registry.md` + `TASK_2025_XXX/`
- Architecture docs: `docs/hackathon/0*-*.md`

## 3. Non‑Negotiable Rules

- NO versioned files/classes (`ServiceV1`, `api/v2/` paths, etc.)
- NO type duplication: search existing interfaces before adding new (extend instead of redefine)
- NO re-exports of types/services across libraries
- Use import paths `@hive-academy/<lib>` (never deep relative unless internal to same lib)
- Strict TypeScript: disallow `any`; add/propagate proper generics
- Real integrations only (persist data, run actual queries, connect modules)

## 4. When Implementing a Feature

1. Identify reusable types/contracts: search in target lib + `libs/langgraph-modules/core` + adapter libs
2. Extend existing service or module in place (do not create a parallel variant)
3. If cross-stack logic (RAG, memory fusion, graph expansion):
   - Vector first (Chroma query) → gather IDs
   - Graph expansion (Neo4j Cypher using IDs) → enrich context
   - Memory module retrieval / retention update
   - Orchestrate via workflow (declarative or functional API)
4. Add tests (unit + integration if DB involved) using existing project Jest setup
5. Update docs only if API surface changed (CHANGELOG + relevant CLAUDE.md)

## 5. Key Patterns

- Module config: Support both `forRoot()` and `forRootAsync()` where present (follow existing module signatures).
- Retrieval cascade (memory fusion): vector query → graph traversal → merge → summarization (memory) → feed workflow.
- Workflow decorators & streaming: prefer existing decorators in `workflow-engine` and `streaming` rather than bespoke event code.
- HITL: integrate approval pauses via provided decorators (no custom gating primitives).
- Checkpoint/Replay: use checkpoint service API for durability instead of ad-hoc persistence.

## 6. Typical Code Snippets

Hybrid search (vector + graph): see pattern in root `CLAUDE.md` (HybridSearchService). Reuse, don’t fork.
RAG pipeline: follow existing steps (memory → vector → graph → workflow → memory store).

## 7. Commands You’ll Need

Build libs: `npm run build:libs`
Single project build: `npx nx build <project>`
Tests (all / affected): `npx nx run-many -t test` / `npx nx affected:test`
Serve API: `npx nx serve dev-brand-api` (older demo name may appear; prefer current app id)
Start backing services: `npm run dev:services`
Lint/format: `npm run lint:fix` / `npm run format`

## 8. Task Protocol (If Using Orchestrator)

Check `task-tracking/registry.md` for active task before large changes. Continue existing sequential `TASK_2025_XXX` unless user clarifies a new task.

## 9. Testing Expectations

- ≥80% coverage target (don’t add untested public surfaces)
- Integration tests should use real Docker services (Neo4j, ChromaDB, Redis) when logic touches persistence or graph operations
- Avoid mocking core adapters unless unit-testing isolated logic

## 10. Anti-Backward Compatibility Enforcement

All modernization = in-place refactor. Reject/avoid: versioned routes, duplicated service classes, feature flags switching impls, adapter bridges.

## 11. Adding Types / Extending APIs

- Search first (`grep` / project search) for existing names
- Prefer intersection/extension of base interfaces from core modules
- Keep domain terms consistent with existing naming (e.g., embeddingId, executionId)

## 12. Logging & Errors

- Provide contextual error messages (operation, entity IDs, query params)
- Do not swallow errors—wrap with domain context and rethrow
- Use existing logger / NestJS Logger where already adopted

## 13. Documentation Touchpoints

Update only if behavior or API changed:

- CHANGELOG.md
- Relevant library `CLAUDE.md`
- Potentially `README.md` (new feature headline) if user requests

## 14. Safe Boundaries

- Do not alter CI workflow names or triggers unless explicitly requested
- Do not introduce new external services without confirmation
- Keep environment variable names consistent (NEO4J_URI, CHROMADB_URL, etc.)

## 15. Ready Checklist Before Commit

- Single authoritative implementation (no duplicates)
- Types reused/extended (search performed)
- Tests added / updated & passing
- Lint + format clean
- Full stack path exercised (if feature claims cross-stack value)
- Docs/CHANGELOG updated if external contract changed

Focus on shipping working, integrated features—avoid ceremony when you already have enough context.
