# Research Report — TASK_2025_063 (E2E Diagnostic Test Suite)

**Researcher**: researcher-expert
**Date**: 2026-05-15
**Confidence**: 85% — recommendations grounded in in-repo precedent + Nx/LangGraph official docs.
**Scope**: 4 focus areas. Goal = give the architect enough signal to commit to a scaffold, runner, report format, and HITL test harness pattern without further investigation.

---

## 1. Nx App Patterns for E2E-Only Suites

**Recommendation (ranked):**

### #1 — `@nx/node` application + `@nx/jest` test target, NO build target

The diagnostic instrument is fundamentally a Jest test runner that consumes the demo app as a library. Use `nx g @nx/node:application e2e-suite --framework=none --bundler=none` and then strip the `build`/`serve` targets from `project.json`. Keep only `test`, `lint`, `typecheck`. Jest is invoked via `nx test e2e-suite`.

**Why this wins:**

- **In-repo precedent**: `apps/dev-brand-api/jest.config.ts:1-20` already uses `@swc/jest` + `jest.preset.js` from `@nx/jest/preset` — identical scaffolding works for our app, and `nx.json:66` already registers `@nx/jest/plugin`. Zero new tooling.
- **`@nx/node` is already a dev-dep** (`package.json:123`) — no install.
- **`apps/dev-brand-ui-e2e/project.json` precedent** shows that an Nx app can legitimately ship with `"targets": {}` overrides and an `implicitDependencies` array — we mirror that for `["dev-brand-api"]`.
- The "run-only, not built" intent maps cleanly to "only the `test` target is defined."

**Tradeoffs vs alternatives:**

- **Custom `nx:run-commands` executor**: simpler config but loses Jest's test discovery, `--testPathPattern`, watch mode, snapshot tooling. Reject.
- **Vitest**: faster cold-start, ESM-native — but every existing lib in the monorepo uses Jest via `@nx/jest`. Mixing runners forces a second preset, second SWC config, second eslint plugin. **Reject for consistency cost.**
- **Putting tests inside `apps/dev-brand-api`**: pollutes the demo app's test scope, blocks running it independently. Reject.

**Source**: in-repo precedent `apps/dev-brand-api/jest.config.ts`, `apps/dev-brand-ui-e2e/project.json`, `nx.json:66`, `package.json:120,123`.

---

## 2. Real-Service Test Orchestration

**Recommendation (ranked):**

### #1 — Direct-connect to the existing `docker-compose.dev.yml` services + per-test namespace isolation

Services are already up via `npm run dev:services` (declared in repo CLAUDE.md). The suite assumes them as a precondition. Each probe gets a **unique namespace per run** (UUID-suffixed collection name in ChromaDB, label prefix in Neo4j, key prefix in Redis) so probes never collide and crashed-run garbage is identifiable.

**Why this wins:**

- **Matches the user's stated constraint** (task-description.md Req 1.5 + Req 5.4 "service unreachable vs library broken"): direct connect is the only model that lets us distinguish _connection failure_ (SKIPPED with explicit reason) from _library failure_ (FAIL with stack).
- **Zero infra add**: docker-compose.dev.yml exists; testcontainers would duplicate it and slow cold-start by 30-60s.
- **Cleanup-on-crash strategy**: prefix every fixture with `e2e-<runId>-` where `runId` is generated once per suite invocation. A pre-flight step at suite start runs a sweep deleting any prefixed fixtures older than 24h. Idempotent, crash-safe, no shared-state.

**Implementation contract for the architect:**

- `PreflightService` — pings each service, emits one of `{ status: 'ready' | 'unreachable' }` per service. Probes consult this before running.
- `RunContext { runId: string, namespace(suffix: string): string }` — passed to every probe; probes derive their fixture names from it.
- Cleanup is **best-effort in `afterAll`** + **mandatory sweep in `beforeAll`** of the next run.

**Tradeoffs vs alternatives:**

- **Testcontainers (@testcontainers/node)**: most authoritative for isolation, but spins up parallel ChromaDB/Neo4j on random ports each run → 60s+ cold start, and ports diverge from the rest of the dev workflow. **Reject for diagnostic-tool slowness.**
- **Shared docker-compose with `docker compose down -v` between runs**: catastrophic — wipes dev state the user is actively using. **Reject.**

**Source**: docker-compose ports declared in repo CLAUDE.md "Required Services" section; precedent for direct-connect in `apps/dev-brand-api` which already talks to these ports in dev mode.

---

## 3. Diagnostic Report Format

**Recommendation (ranked):**

### #1 — Markdown report (primary, human-first) + JSON sidecar (machine-readable, for future CI)

Single timestamped pair per run under `apps/e2e-suite/reports/<ISO-timestamp>/`:

- `report.md` — the canonical artifact the user reads.
- `report.json` — same data, machine-parseable, for diffing or future CI.

**Markdown skeleton:**

```markdown
# E2E Diagnostic Report — 2026-05-15T14:23:11Z

## Summary

- Total: 23 | PASS: 18 | FAIL: 2 | SKIPPED: 1 | MISSING: 2 | Duration: 4m37s

## Preflight

| Service  | Status | Endpoint               |
| -------- | ------ | ---------------------- |
| ChromaDB | ready  | http://localhost:8000  |
| Neo4j    | ready  | bolt://localhost:7687  |
| Redis    | ready  | redis://localhost:6379 |

## Layer 1 — Boot Smoke

| Probe | Status | Duration | Suspected Lib | Notes |
| ----- | ------ | -------- | ------------- | ----- |

## Layer 2 — Per-Library

… (one row per of the 10 libs)

## Layer 3 — RAG Flow

… (one row per pipeline step)

## Failures (stack traces)

### FAIL — workflow-engine: streaming start marker missing

**Suspected Library**: @hive-academy/langgraph-workflow-engine
**Stack**:
```

…

```

## Missing Surfaces
- `@hive-academy/langgraph-core` — expected export `generateId`, not found
- `@hive-academy/langgraph-platform` — no testable public API surface identified
```

**Why this wins:**

- **Matches repo convention**: every `task-tracking/TASK_2025_*/` folder uses markdown for human reports; reports are read more than they're parsed. The user explicitly framed the deliverable as a "single consolidated report" — markdown is the lowest-friction read.
- **JSON sidecar future-proofs CI integration** (out-of-scope for this task but flagged in task-description.md "Out of Scope #4") without paying the cost now.
- Acceptance criterion 5.6 ("no silent overwrite") is satisfied by ISO-timestamped folders.
- Acceptance criterion 5.3 ("FAIL must include stack trace + suspected lib") maps to a dedicated "Failures" section with a structured header.

**Tradeoffs vs alternatives:**

- **JUnit XML only**: CI-native but unreadable by humans, and we have no CI integration in scope. **Reject for primary; could be added later alongside JSON.**
- **HTML reporter (jest-html-reporters)**: pretty but requires browser to consume, lossy for diffing, adds a dep. **Reject.**
- **Console-only**: violates Req 5.1 (single consolidated artifact). **Reject.**

**Implementation note for architect:** Use a custom Jest reporter (`jest-config: { reporters: ['default', '<rootDir>/src/reporting/diagnostic-reporter.ts'] }`) that consumes Jest's lifecycle hooks (`onTestCaseResult`, `onRunComplete`) and writes both files at suite end. Probe-level metadata (suspected lib, MISSING entries) is attached via a custom matcher or via probe-emitted side-channel (a `RunCollector` service injected into each probe).

---

## 4. HITL Command Resume from Test Harness

**Recommendation:** Use the existing `WorkflowResumptionService.resumeWorkflow()` API. It already encapsulates the entire `new Command({ resume })` + `thread_id` + `checkpoint_id` dance.

**Exact API surface (cited):**

`libs/langgraph-modules/workflow-engine/src/lib/services/workflow-resumption.service.ts:120-151`:

```typescript
async resumeWorkflow<TState>(
  workflowClass: string,         // e.g. 'ResearchWorkflowAgent'
  threadId: string,              // from the interrupted run
  resumeValue: any,              // payload passed to Command({ resume })
  checkpointId?: string,
  userConfig?: RunnableConfig
): Promise<TState>
```

Internally (line 134): `const command = new Command({ resume: resumeValue });` — exactly the LangGraph native pattern from `@langchain/langgraph`.

**Streaming variant** at the same file, line 166-192: `async *streamResumeWorkflow(...)` — same signature plus `streamMode`. Use this if the HITL probe needs to assert on streamed events post-resume.

**Test harness pattern for the HITL probe:**

1. **Bootstrap NestJS app** programmatically via `NestFactory.createApplicationContext(AppModule)` (lighter than full HTTP server — sufficient for resolving `WorkflowResumptionService` and a workflow with an `@RequiresApproval` task).
2. **Trigger initial run** with a workflow class that contains an `interrupt()` call (e.g. one decorated with `@RequiresApproval`). Workflow pauses; thread is marked interrupted in the configured checkpointer. Capture `threadId`.
3. **Assert interrupt state**: call `graph.getState({ configurable: { thread_id } })` (LangGraph native) and verify `state.tasks[0].interrupts` is non-empty + payload matches what the node passed to `interrupt()`.
4. **Resume**: `await resumptionService.resumeWorkflow('MyWorkflowClass', threadId, { decision: 'approve' })`.
5. **Assert continuation**: returned state must contain the post-approval fields.

**In-repo example to mirror**: `libs/langgraph-modules/hitl/src/lib/services/human-approval.service.ts:156,278` already drives this exact pattern in production code — line 278 comment: "Resume workflow using Command pattern (NEW)". The probe can be modeled directly on that code path.

**Checkpointer requirement**: HITL probe needs a real checkpointer wired into the compiled graph. Use the SQLite adapter (in-memory mode) from `@hive-academy/langgraph-adapters` for the probe — gives durability semantics without polluting Redis/Postgres. Adapter selection per Req 3.6.

**Source**: `workflow-resumption.service.ts:120-192`, `human-approval.service.ts:156-280`, `hitl.module.ts:62`. LangGraph official Command pattern documented in `task-tracking/TASK_2025_040/research-report.md:42-70`.

---

## Architect Prep — Decisions You Now Have Enough Info to Make

The architect can commit to the following without further research:

- **App name & generator**: `apps/e2e-suite`, generated via `nx g @nx/node:application e2e-suite --framework=none --bundler=none`, then strip `build`/`serve`/`webpack` targets — keep only `test` (Jest), `lint`, `typecheck`. `implicitDependencies: ["dev-brand-api"]`.
- **Test runner**: Jest with `@swc/jest`, extending `jest.preset.js`. Identical to `dev-brand-api/jest.config.ts`.
- **Service strategy**: assume `docker-compose.dev.yml` is up; preflight service before any probe; per-run UUID namespace prefix on every fixture; sweep prefix garbage older than 24h on next run start.
- **Boot strategy**: `NestFactory.createApplicationContext(AppModule)` for layers 2 & 3 (no HTTP overhead). `NestFactory.create(AppModule)` + `app.init()` + health-endpoint hit only for Layer 1 boot-smoke.
- **Report format**: markdown primary + JSON sidecar, written to `apps/e2e-suite/reports/<ISO-timestamp>/`. Implemented as a custom Jest reporter that consumes a `RunCollector` service injected into probes (so probes can attach `suspectedLib` and `MISSING` metadata cleanly without abusing Jest assertions).
- **Probe contract** (single file, exported from `apps/e2e-suite/src/probes/probe.contract.ts`):
  ```typescript
  interface Probe {
    readonly name: string;
    readonly layer: 1 | 2 | 3;
    readonly suspectedLib: string; // pre-declared owning lib
    run(ctx: RunContext): Promise<ProbeResult>;
  }
  type ProbeResult =
    | { status: 'PASS'; durationMs: number }
    | { status: 'FAIL'; durationMs: number; error: Error }
    | { status: 'SKIPPED'; reason: string }
    | { status: 'MISSING'; expected: string; observedIn: string };
  ```
- **HITL probe**: use `WorkflowResumptionService.resumeWorkflow()` directly; wire SQLite adapter as checkpointer; model the assertion sequence on `human-approval.service.ts:156-280`.
- **Adapter probe**: cover **SQLite** only (in-memory). Redis + Postgres become future-enhancements.md entries per Req 3.6.
- **Out-of-band libraries**: `langgraph-angular` → flag as out-of-scope in report (Req 3.9); `langgraph-platform` → MISSING entry if no testable public surface (Req 3.8).
- **Cleanup**: each probe's `afterAll` does best-effort delete by namespace prefix; `beforeAll` of suite sweeps stale prefixes. No `docker compose down`.

---

**Word count**: ~1,420.
