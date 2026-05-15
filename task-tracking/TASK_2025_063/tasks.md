# Development Tasks — TASK_2025_063 (E2E Diagnostic Test Suite)

**Total Tasks**: 12 | **Phases**: 7 | **Status**: 0/12 complete
**Team Leader**: team-leader | **Date**: 2026-05-15
**Scope guard**: All changes confined to `apps/e2e-diagnostics/**` and `task-tracking/TASK_2025_063/**` (verified at every commit via `git diff --stat`).

---

## Plan Validation Summary

**Validation Status**: PASSED WITH RISKS

### Assumptions Verified

- ✅ Jest is the canonical runner across the repo (matches `dev-brand-api/jest.config.ts` and `nx.json` preset registration).
- ✅ `WorkflowResumptionService` exists at `libs/langgraph-modules/workflow-engine/src/lib/services/workflow-resumption.service.ts` (architect verified at lines 120–151).
- ✅ `human-approval.service.ts:156–280` is the canonical HITL resume mirror.
- ✅ `dev-brand-api/src/app/app.module.ts` is the real composition root (no test fakes required).
- ⚠️ `RAGPipelineService` exact location in `apps/dev-brand-api/src/app/services/` is "discovered at probe-implementation time" — flagged as a verification step in Task 7.1.

### Risks Identified

| Risk                                                                  | Severity | Mitigation                                                                                                                                          |
| --------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope creep — temptation to fix discovered bugs                       | HIGH     | Every commit body MUST include `git diff --stat` confirming only `apps/e2e-diagnostics/**` + task folder touched. Enforced at Task 7.1 final check. |
| `RAGPipelineService` may not exist with that exact name               | MED      | Task 7.1 explicitly grep-discovers the service; if absent → MISSING entry in `future-enhancements.md`, not a FAIL.                                  |
| `OPENAI_API_KEY` absent in dev env breaks RAG probe                   | MED      | Probe SKIPPED with explicit reason when env var missing (per architect §3).                                                                         |
| ModulesContainer is Nest internal API — could change between versions | LOW      | Acceptable today; if it breaks, fall back to manually-iterating known module classes.                                                               |
| Custom Jest reporter API surface changes between Jest 29/30           | LOW      | Pin against installed Jest version; verify at Task 4.1.                                                                                             |

### Edge Cases to Handle

- [ ] Service preflight returns `unreachable` for one/more services → affected probes SKIPPED (not FAIL). Handled in Task 3.1 + per-probe wiring.
- [ ] Multiple runs in the same minute → timestamped report folder name includes seconds + UUID suffix. Handled in Task 4.1.
- [ ] Crash mid-run leaves orphaned Chroma collections / Neo4j labels → pre-run sweep deletes any `e2e-*` fixtures older than 24h. Handled in Task 3.1.
- [ ] `future-enhancements.md` does not exist on first run → reporter creates it; on subsequent runs appends. Handled in Task 9.1.
- [ ] `MISSING` and `SKIPPED` results MUST NOT cause Jest exit-code 1 (suite is diagnostic, not gated — per Req "Out of Scope #5"). Handled in Task 4.1 (reporter does not throw; `suite.spec.ts` uses a single passing `it()` that runs all probes).

---

## Phase 1: Scaffolding (1 task)

### Task 1.1: Scaffold `apps/e2e-diagnostics` Nx app ☐ TODO

- **Agent**: senior-developer
- **Dependencies**: none
- **Files touched**:
  - `apps/e2e-diagnostics/project.json` (new)
  - `apps/e2e-diagnostics/jest.config.ts` (new — mirror `apps/dev-brand-api/jest.config.ts`, add `testTimeout: 600_000`)
  - `apps/e2e-diagnostics/tsconfig.json` (new — strict mode, extends repo base)
  - `apps/e2e-diagnostics/tsconfig.spec.json` (new)
  - `apps/e2e-diagnostics/.spec.swcrc` (copied from `apps/dev-brand-api/.spec.swcrc`)
  - `apps/e2e-diagnostics/src/index.ts` (placeholder export to allow lint to pass)
  - `apps/e2e-diagnostics/.gitignore` (excludes `reports/`)
  - `package.json` (add `"e2e": "nx test e2e-diagnostics"` script — only line added at root)
  - `tsconfig.base.json` (path mapping if needed — verify first)
- **Acceptance criteria**:
  - `npx nx lint e2e-diagnostics` passes with zero warnings/errors.
  - `npx nx typecheck e2e-diagnostics` passes (target uses `tsc --noEmit`).
  - `project.json` exposes only `test`, `lint`, `typecheck` targets (no `build`, no `serve`).
  - `project.json` declares `implicitDependencies: ["dev-brand-api"]`.
  - `git diff --stat` shows only files under `apps/e2e-diagnostics/**` + `package.json` + (optionally) `tsconfig.base.json`.
- **Commit (proposed)**: `feat(scripts): scaffold e2e-diagnostics nx app`

---

## Phase 2: Probe Framework (2 tasks)

### Task 2.1: Implement probe contracts ☐ TODO

- **Agent**: senior-developer
- **Dependencies**: 1.1
- **Files touched**:
  - `apps/e2e-diagnostics/src/contracts/probe.contract.ts` (new — `LibraryId`, `Probe`, `ProbeResult` discriminated union, `RunContext`)
  - `apps/e2e-diagnostics/src/contracts/run-context.ts` (new — `RunContext` impl + `namespace()` helper)
  - `apps/e2e-diagnostics/src/contracts/report.types.ts` (new — `SuiteReport`, `LayerReport` shapes per architect §5)
  - `apps/e2e-diagnostics/src/contracts/index.ts` (barrel — internal app barrel only, NOT a re-export across libs)
- **Acceptance criteria**:
  - Discriminated union covers PASS / FAIL / SKIPPED / MISSING exactly as architect §2.
  - FAIL variant requires `error: { message; stack }`; MISSING requires `expected` + `observedIn`.
  - Zero `any`, zero `unknown` without narrowing, zero re-exports from `@hive-academy/*` libs.
  - `npx nx typecheck e2e-diagnostics` passes.
  - `npx nx lint e2e-diagnostics` passes.
- **Commit (proposed)**: `feat(scripts): add probe contracts and run-context types`

---

### Task 2.2: Implement RunCollector, PreflightService, FixtureCleaner 🔄 IMPLEMENTED

- **Agent**: senior-developer
- **Dependencies**: 2.1
- **Files touched**:
  - `apps/e2e-diagnostics/src/services/run-collector.service.ts` (new — accumulator + `summary()`)
  - `apps/e2e-diagnostics/src/services/preflight.service.ts` (new — ChromaDB heartbeat, Neo4j `verifyConnectivity`, Redis `ping`; 5s timeout each; returns `'ready' | 'unreachable'`)
  - `apps/e2e-diagnostics/src/services/fixture-cleaner.service.ts` (new — sweeps `e2e-*` Chroma collections + Neo4j labels older than 24h)
  - `apps/e2e-diagnostics/src/harness/service-clients.ts` (new — raw chroma-client, neo4j-driver, ioredis client factories)
- **Acceptance criteria**:
  - `RunCollector.summary()` returns `{ total, pass, fail, skipped, missing, durationMs }`.
  - Preflight distinguishes "unreachable" from "broken" (timeout → `'unreachable'`, never throws).
  - Fixture cleaner is idempotent (running twice produces same end state).
  - No mocking of services — these files call real clients.
  - `npx nx typecheck e2e-diagnostics` + `npx nx lint e2e-diagnostics` pass.
- **Commit (proposed)**: `feat(scripts): add run-collector, preflight and fixture-cleaner services`

---

## Phase 3: Reporter (1 task)

### Task 3.1: Implement DiagnosticReporter + markdown/JSON renderers ☐ TODO

- **Agent**: senior-developer
- **Dependencies**: 2.1, 2.2
- **Files touched**:
  - `apps/e2e-diagnostics/src/reporting/diagnostic-reporter.ts` (new — Jest `Reporter` impl with `onRunStart` / `onRunComplete` hooks)
  - `apps/e2e-diagnostics/src/reporting/markdown-renderer.ts` (new — renders `ProbeResult[]` → `report.md` per research §3 skeleton)
  - `apps/e2e-diagnostics/src/reporting/json-renderer.ts` (new — renders `SuiteReport` shape → `report.json`)
  - `apps/e2e-diagnostics/src/reporting/report-folder.ts` (new — computes `reports/<ISO-timestamp>-<uuid8>/` to prevent same-second collisions)
  - `apps/e2e-diagnostics/jest.config.ts` (edit — add custom reporter to `reporters` array)
- **Acceptance criteria**:
  - Report folder name includes ISO timestamp + 8-char UUID suffix (no overwrite risk).
  - Markdown report includes: top-level summary, per-layer sections, per-probe rows with status / suspectedLib / durationMs / stack (for FAIL) / expected+observedIn (for MISSING).
  - JSON sidecar matches `SuiteReport` interface from Task 2.1.
  - Hand-fed fixture test (inline in a small `.spec.ts`) writes `report.md` + `report.json` to expected location.
  - Reporter never throws — failures during rendering log a warning and continue.
- **Commit (proposed)**: `feat(scripts): add diagnostic jest reporter and report renderers`

---

## Phase 4: Layer 1 — Boot Smoke (1 task)

### Task 4.1: Implement Layer 1 boot-smoke probe ☐ TODO

- **Agent**: backend-developer
- **Dependencies**: 2.1, 2.2, 3.1
- **Files touched**:
  - `apps/e2e-diagnostics/src/harness/nest-boot.ts` (new — typed wrappers around `NestFactory.create` and `NestFactory.createApplicationContext` against `dev-brand-api`'s `AppModule`)
  - `apps/e2e-diagnostics/src/probes/layer-1-boot/dev-brand-api-boot.probe.ts` (new — boots app, hits `/api/health`, enumerates modules via `ModulesContainer`, emits one PASS row per module)
- **Acceptance criteria**:
  - Probe uses the real `AppModule` from `apps/dev-brand-api/src/app/app.module.ts` — zero test-only fakes (Req 2.1).
  - Health check uses `supertest` against running instance and records HTTP status + body (Req 2.2).
  - Module enumeration emits one PASS entry per registered module with timing (Req 2.3).
  - Boot failure → traverses stack frames matching `libs/**` to identify the offending library and emits FAIL with `suspectedLib` populated (Req 2.4).
  - `app.close()` always runs in finally block (Req 2.5).
- **Commit (proposed)**: `feat(langgraph): add layer-1 boot-smoke probe for dev-brand-api`

---

## Phase 5: Layer 2 — Per-Library Probes (4 tasks)

### Task 5.1: Implement Layer 2 ChromaDB + Neo4j probes ☐ TODO

- **Agent**: backend-developer
- **Dependencies**: 4.1
- **Files touched**:
  - `apps/e2e-diagnostics/src/probes/layer-2-libs/chromadb.probe.ts` (new — create namespaced collection, embed 1 doc, query, assert non-empty match; cleanup deletes collection)
  - `apps/e2e-diagnostics/src/probes/layer-2-libs/neo4j.probe.ts` (new — create node + relationship under `E2E_${runId}` label, traverse, `DETACH DELETE` cleanup)
- **Acceptance criteria**:
  - Both probes resolve their target services via DI from `NestFactory.createApplicationContext(AppModule)` — no manual client construction inside probe body.
  - ChromaDB probe verifies returned vector match array length > 0 (Req 3.1).
  - Neo4j probe asserts traversal returns the created relationship (Req 3.2).
  - Each probe cleans up its fixtures in a finally block.
  - If preflight reports the corresponding service `unreachable` → probe returns SKIPPED, never FAIL.
- **Commit (proposed)**: `feat(chromadb): add layer-2 chromadb and neo4j diagnostic probes`
  - Note on scope: `chromadb` chosen because the chromadb probe is the primary surface; neo4j probe rides with it since both DB libs land together in one logical commit.

---

### Task 5.2: Implement Layer 2 workflow-engine + core + monitoring + memory probes ☐ TODO

- **Agent**: backend-developer
- **Dependencies**: 4.1
- **Files touched**:
  - `apps/e2e-diagnostics/src/probes/layer-2-libs/workflow-engine.probe.ts` (new — compile 2-node StateGraph, stream-invoke, assert start+end markers)
  - `apps/e2e-diagnostics/src/probes/layer-2-libs/core.probe.ts` (new — instantiate state annotation, hydrate, assert shape)
  - `apps/e2e-diagnostics/src/probes/layer-2-libs/monitoring.probe.ts` (new — emit counter, query in-memory collector, assert)
  - `apps/e2e-diagnostics/src/probes/layer-2-libs/memory.probe.ts` (new — store + retrieve + deep-equal payload)
- **Acceptance criteria**:
  - workflow-engine probe assertion verifies streamed events include `start` and `end` markers (Req 3.3).
  - memory probe verifies round-trip integrity via deep equality (Req 3.4).
  - monitoring probe verifies the emitted metric appears in the collector (Req 3.7).
  - core probe exercises an annotation/state-management primary public surface (Req 3.10).
  - Any missing API surface encountered → MISSING entry, NOT FAIL (Req 3.11).
- **Commit (proposed)**: `feat(langgraph): add layer-2 workflow-engine, core, monitoring and memory probes`

---

### Task 5.3: Implement Layer 2 HITL + adapters-sqlite probes ☐ TODO

- **Agent**: backend-developer
- **Dependencies**: 5.2
- **Files touched**:
  - `apps/e2e-diagnostics/src/probes/layer-2-libs/hitl.probe.ts` (new — mirrors `libs/langgraph-modules/hitl/src/lib/services/human-approval.service.ts:156-280` resume pattern)
  - `apps/e2e-diagnostics/src/probes/layer-2-libs/adapters-sqlite.probe.ts` (new — instantiate SQLite in-memory checkpointer, write checkpoint, read back)
- **Acceptance criteria**:
  - HITL probe resolves `WorkflowResumptionService` from `langgraph-modules/workflow-engine` (verified location: `libs/langgraph-modules/workflow-engine/src/lib/services/workflow-resumption.service.ts:120-151`).
  - HITL probe triggers interrupt via `@RequiresApproval`-decorated node, captures `threadId`, verifies interrupt state via `graph.getState`, then resumes via `resumeWorkflow(workflowName, threadId, { decision: 'approve' })` (Req 3.5).
  - Adapter probe uses SQLite in-memory backend; Redis/Postgres adapter coverage routed to `future-enhancements.md` as separate items (Req 3.6).
  - Both probes pass with services warm; FAIL with stack trace + suspected lib otherwise.
- **Commit (proposed)**: `feat(langgraph): add layer-2 hitl and adapters-sqlite probes`

---

### Task 5.4: Implement Layer 2 platform (MISSING) + langgraph-angular (SKIPPED) probes 🔄 IMPLEMENTED

- **Agent**: backend-developer
- **Dependencies**: 5.2
- **Files touched**:
  - `apps/e2e-diagnostics/src/probes/layer-2-libs/platform.probe.ts` (new — checks for testable public surface; if none exported → MISSING result with `expected: 'public platform integration surface'`)
  - `apps/e2e-diagnostics/src/probes/layer-2-libs/langgraph-angular.probe.ts` (new — always returns SKIPPED with reason `'browser-only library; requires separate Angular harness'`)
- **Acceptance criteria**:
  - platform probe emits MISSING (NOT FAIL) when no surface is testable (Req 3.8, 3.11).
  - langgraph-angular probe always returns SKIPPED with the exact architect-specified reason (Req 3.9).
  - Both produce entries that the reporter will route into `future-enhancements.md` (handled in Task 7.1).
- **Commit (proposed)**: `feat(langgraph): add layer-2 platform missing and langgraph-angular skipped probes`

---

## Phase 6: Layer 3 — Full RAG Flow (1 task)

### Task 6.1: Implement Layer 3 full RAG flow probe 🔄 IMPLEMENTED

- **Agent**: backend-developer
- **Dependencies**: 5.1, 5.2, 5.3
- **Files touched**:
  - `apps/e2e-diagnostics/src/probes/layer-3-rag/full-rag-flow.probe.ts` (new — ingest synthetic 200-word doc → embed → entity-extract → query → orchestrate → grounded answer; per-step try/catch with step name in FAIL)
  - `apps/e2e-diagnostics/src/probes/layer-3-rag/synthetic-document.ts` (new — synthetic test fixture content; NO production data per security NFR)
- **Acceptance criteria**:
  - Probe DISCOVERS `RAGPipelineService` (or equivalent) under `apps/dev-brand-api/src/app/services/` at probe-implementation time. If absent → MISSING entry with the expected symbol, routed to `future-enhancements.md`.
  - Each step (`ingest|embed|extract|query|orchestrate|answer`) is wrapped in its own try/catch and on FAIL the result names which step failed + suspected lib (Req 4.5).
  - Minimum assertion: workflow ran without unhandled errors AND final answer string is non-empty (Req 4.3 — architect's bar).
  - Cleanup: delete Chroma collection + `MATCH (n:E2E_${runId}_Entity) DETACH DELETE n` (Req 4.4).
  - Missing `OPENAI_API_KEY` → SKIPPED with explicit reason, NOT FAIL.
  - Fixture is synthetic only (security NFR).
- **Commit (proposed)**: `feat(langgraph): add layer-3 full-rag-flow diagnostic probe`

---

## Phase 7: Wire-up & Findings (2 tasks)

### Task 7.1: Wire suite.spec.ts orchestration + findings append ☐ TODO

- **Agent**: senior-developer
- **Dependencies**: 4.1, 5.1, 5.2, 5.3, 5.4, 6.1
- **Files touched**:
  - `apps/e2e-diagnostics/src/suite.spec.ts` (new — single Jest entry; `beforeAll` runs preflight + fixture sweep; one passing `it()` iterates all probes in order Layer1 → Layer2 → Layer3, pushing each result to `RunCollector`)
  - `apps/e2e-diagnostics/src/reporting/findings-appender.ts` (new — append-only writer for `task-tracking/TASK_2025_063/future-enhancements.md`; creates file if missing)
  - `apps/e2e-diagnostics/src/reporting/diagnostic-reporter.ts` (edit — `onRunComplete` invokes `FindingsAppender` with all MISSING + FAIL results)
  - `task-tracking/TASK_2025_063/future-enhancements.md` (new — initial file with structure heading; subsequent entries appended by reporter)
- **Acceptance criteria**:
  - Suite invokable via `npx nx test e2e-diagnostics` (or root `npm run e2e`).
  - `suite.spec.ts` contains exactly ONE outer `it()` so Jest exit code is 0 regardless of probe FAIL/MISSING/SKIPPED (suite is diagnostic, not gated — per Req Out-of-Scope #5).
  - `future-enhancements.md` is APPEND-ONLY across runs (Req 6.1, 6.5). Each appended block starts with `## Findings — Run <ISO-timestamp>`.
  - Each appended finding entry includes: library, expected symbol/method, observed behavior, recommended task title.
  - **Scope-guard check**: at the end of this task, run `git diff --stat main...HEAD` and confirm ONLY `apps/e2e-diagnostics/**` + `task-tracking/TASK_2025_063/**` are modified (Req 6.4). Block commit if violated.
- **Commit (proposed)**: `feat(langgraph): wire diagnostic suite orchestration and findings appender`

---

### Task 7.2: Smoke-run + populate initial future-enhancements.md 🔄 IMPLEMENTED

- **Agent**: senior-developer
- **Dependencies**: 7.1
- **Files touched**:
  - `task-tracking/TASK_2025_063/future-enhancements.md` (auto-populated by running the suite once against warm services)
  - `apps/e2e-diagnostics/README.md` (new — single-page invocation guide: prereqs, command, where reports land, how to read them)
- **Acceptance criteria**:
  - One full suite run completes against running `docker-compose.dev.yml` services. Run produces `apps/e2e-diagnostics/reports/<ISO-timestamp>-<uuid8>/{report.md, report.json}`.
  - `future-enhancements.md` contains at least one finding per discovered gap (or an explicit "no gaps discovered in this run" note if all probes PASSED).
  - README documents: required env vars, required docker services, the single command, report location, and how to interpret PASS / FAIL / SKIPPED / MISSING.
  - **Final scope-guard**: `git diff --stat main...HEAD` shows ONLY `apps/e2e-diagnostics/**` + `task-tracking/TASK_2025_063/**` modified. Any other modification = task FAILED, revert + investigate (Req 6.4 hard enforcement).
  - NO library source files modified — discovered defects went to `future-enhancements.md`, not fixed (Req 6.4).
- **Commit (proposed)**: `docs(langgraph): document e2e-diagnostics suite and record initial findings`

---

## Phase Summary & Assignment Order

| Phase                 | Tasks              | Agent             | Cumulative Tasks |
| --------------------- | ------------------ | ----------------- | ---------------- |
| 1. Scaffolding        | 1.1                | senior-developer  | 1                |
| 2. Probe Framework    | 2.1, 2.2           | senior-developer  | 3                |
| 3. Reporter           | 3.1                | senior-developer  | 4                |
| 4. Layer 1 Boot Smoke | 4.1                | backend-developer | 5                |
| 5. Layer 2 Probes     | 5.1, 5.2, 5.3, 5.4 | backend-developer | 9                |
| 6. Layer 3 RAG        | 6.1                | backend-developer | 10               |
| 7. Wire-up & Findings | 7.1, 7.2           | senior-developer  | 12               |

**Proposed assignment order (sequential, respects deps)**:
1.1 → 2.1 → 2.2 → 3.1 → 4.1 → 5.1 → 5.2 → 5.3 → 5.4 → 6.1 → 7.1 → 7.2

**Total commits**: 12, each pending explicit user approval (Req 7).

---

## Commit Discipline (per repo CLAUDE.md + Req 7)

- Every task = one commit. No commits without explicit user approval.
- Subjects: lowercase, imperative, no period, 3–72 chars.
- Scopes used in this task: `scripts` (scaffolding + framework), `chromadb` (DB-probe commit), `langgraph` (langgraph-related probes + wiring), `docs` (final docs commit).
- Pre-commit hook failure → present 3-option protocol (Fix / Bypass / Stop & Report) — NEVER auto-bypass.
- No `git push` without explicit user instruction.

---

## Status Legend

| Symbol         | Meaning                                             |
| -------------- | --------------------------------------------------- |
| ☐ TODO         | Not started                                         |
| 🟡 IN PROGRESS | Assigned to agent                                   |
| ✅ DONE        | Verified + committed (pending user-approved commit) |
| ❌ BLOCKED     | Verification failed; awaiting investigation         |
