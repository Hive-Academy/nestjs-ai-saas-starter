# Requirements Document - TASK_2025_063

## Introduction

The NestJS AI SaaS Starter monorepo ships 10 publishable libraries (2 database integrations + 1 Angular client + 7 LangGraph modules) plus a demo application (`dev-brand-api`). Currently the codebase has fragmented unit-test coverage and no end-to-end exercise of the full stack against real services. This task delivers a **diagnostic E2E test suite** — a dedicated Nx application that programmatically boots the demo app, exercises each library's real functionality against running services (ChromaDB, Neo4j, Redis), runs a complete RAG flow, and emits a single consolidated report showing what works, what fails (with stack trace + suspected lib), and what surface area is missing.

**Business value**: Establish a reliable, repeatable instrument that surfaces real cross-library breakage before users encounter it, captures missing API surfaces as backlog items, and produces an objective baseline for monorepo health on every run.

**Critical scoping rule**: This task creates the diagnostic instrument and documents findings. It explicitly does **not** fix discovered issues — discovered defects, missing exports, stale assertions, and missing spec files are routed to `future-enhancements.md` as backlog items for separate tasks.

## Requirements

### Requirement 1: E2E Suite Application Scaffolding

**User Story:** As a developer maintaining the monorepo, I want a dedicated Nx application that runs the full diagnostic suite via a single command, so that I can verify cross-library health on demand and in CI without manual orchestration.

#### Acceptance Criteria

1. WHEN the suite is invoked via Nx run target THEN the application SHALL programmatically boot the test harness without requiring any manual setup beyond running `docker-compose.dev.yml`.
2. WHEN the suite scaffolding is generated THEN the new Nx app SHALL live under `apps/` (final name decided by the software-architect), follow the existing repo Nx conventions, and pass `nx lint` and `nx build` for the new project.
3. WHEN any source file is added to the suite THEN it SHALL compile under TypeScript strict mode with zero `any` types and zero re-exports across libraries (per repo CLAUDE.md).
4. WHEN the test runner is selected (jest or vitest — architect's call) THEN the choice SHALL be justified in `implementation-plan.md` and used uniformly across all three layers.
5. WHEN the suite runs THEN it SHALL NOT mock ChromaDB, Neo4j, Redis, or any LangGraph runtime — all probes execute against real services on their docker-compose ports (ChromaDB:8000, Neo4j:7687, Redis:6379).

### Requirement 2: Layer 1 — Boot Smoke Probe

**User Story:** As a developer, I want a boot-smoke layer that programmatically starts `dev-brand-api` and inventories every module's initialization status, so that DI failures and module-registration regressions surface immediately before any functional probe runs.

#### Acceptance Criteria

1. WHEN the boot-smoke probe runs THEN it SHALL programmatically bootstrap the `dev-brand-api` NestJS application using its real composition root (no test-only fakes).
2. WHEN the application boots THEN the probe SHALL execute a health check against the running instance and record HTTP status and response body.
3. WHEN bootstrap completes THEN the probe SHALL enumerate every NestJS module that registered and emit a PASS entry for each, with timing.
4. WHEN any module fails to initialize THEN the probe SHALL capture the full stack trace, identify the failing module by name, and emit a FAIL entry tagging the suspected library (one of: nestjs-chromadb, nestjs-neo4j, langgraph-angular, langgraph-modules/core, memory, hitl, monitoring, platform, workflow-engine, adapters).
5. WHEN the boot-smoke probe finishes THEN it SHALL gracefully shut down the application before subsequent layers run.

### Requirement 3: Layer 2 — Per-Library Functional Probes

**User Story:** As a developer, I want one functional probe per library that exercises that library's primary public API surface against real services, so that I can pinpoint exactly which library is broken when something fails.

#### Acceptance Criteria

1. WHEN the ChromaDB probe runs THEN it SHALL embed and query at least one real document against ChromaDB at `http://localhost:8000` and verify the returned vector match is non-empty.
2. WHEN the Neo4j probe runs THEN it SHALL create a node, create a relationship, traverse it, and delete the test fixtures against `bolt://localhost:7687`.
3. WHEN the workflow-engine probe runs THEN it SHALL execute a minimal graph workflow end-to-end and assert the streamed events include the expected start/end markers.
4. WHEN the memory probe runs THEN it SHALL store a memory entry, retrieve it, and verify content round-trip integrity.
5. WHEN the HITL probe runs THEN it SHALL trigger an interrupt and resume via the LangGraph native Command resume pattern (per repo CLAUDE.md HITL convention).
6. WHEN the adapters probe runs THEN it SHALL exercise at least one adapter (SQLite, Redis, or Postgres — architect's choice; the rest become future-enhancements items if not covered) for checkpoint write + resume.
7. WHEN the monitoring probe runs THEN it SHALL emit a metric and verify it was collected.
8. WHEN the platform probe runs THEN it SHALL exercise the LangGraph Platform integration's primary public surface OR be flagged in the report as "no probe available — surface unclear" if the architect determines no testable public API exists (this becomes a future-enhancements item).
9. WHEN the langgraph-angular probe runs THEN it SHALL be flagged in the report as either "covered by client-side test in a separate harness" OR "out of scope for backend e2e suite — documented in future-enhancements.md" (architect decides).
10. WHEN the langgraph-modules/core probe runs THEN it SHALL exercise its primary annotation/state-management public surface and report PASS/FAIL accordingly.
11. WHEN any probe encounters a missing API surface (e.g. no exported `generateId`, no public retrieve method) THEN it SHALL log a "MISSING" entry with the specific symbol/method expected and the library where it was expected — this is then captured in `future-enhancements.md` rather than being treated as a test failure.

### Requirement 4: Layer 3 — Full RAG Flow Probe

**User Story:** As a developer, I want a full RAG flow probe that exercises the complete document-ingest → embed → entity-extract → query → workflow-orchestrate → grounded-answer pipeline, so that I can verify cross-library integration works end-to-end and not just in isolation.

#### Acceptance Criteria

1. WHEN the RAG probe runs THEN it SHALL ingest at least one real text document, generate embeddings via ChromaDB, extract entities into Neo4j, and persist both stores.
2. WHEN ingestion completes THEN the probe SHALL issue a real natural-language query and orchestrate retrieval from both ChromaDB (vector) and Neo4j (graph) through the workflow-engine.
3. WHEN the workflow completes THEN the probe SHALL verify the grounded answer references content drawn from the ingested document (assertion strength = architect's call — at minimum, the answer is non-empty and the workflow ran without unhandled errors).
4. WHEN the RAG probe finishes THEN it SHALL clean up its test fixtures from ChromaDB and Neo4j (or document why cleanup is deferred — architect's call).
5. WHEN any step in the RAG pipeline fails THEN the probe SHALL capture which step failed (ingest / embed / extract / query / orchestrate / answer), the stack trace, and the suspected library.

### Requirement 5: Consolidated Diagnostic Report

**User Story:** As a developer running the suite, I want every run to emit a single consolidated report (location and format = architect's call) so that I can review what passed, what failed (with stack trace + suspected lib), and what's missing in one document without grepping logs.

#### Acceptance Criteria

1. WHEN a suite run completes THEN it SHALL emit exactly one consolidated report per run (file path and format — markdown / JSON / both — decided by architect and justified in `implementation-plan.md`).
2. WHEN the report is emitted THEN it SHALL include, per probe: probe name, layer (1/2/3), status (PASS / FAIL / SKIPPED / MISSING), execution time in milliseconds.
3. WHEN any probe FAILs THEN the report SHALL include the full stack trace and a "Suspected Library" field naming exactly one of the 10 publishable libraries (or `dev-brand-api` if the failure is in the demo app composition).
4. WHEN any MISSING-functionality entry exists THEN the report SHALL list the expected symbol/method and the library where it was expected.
5. WHEN the report is emitted THEN it SHALL include a top-level summary: total probes, pass count, fail count, missing count, total runtime.
6. WHEN multiple runs occur THEN reports SHALL not silently overwrite each other — either timestamped filenames or an append-style log (architect's call).

### Requirement 6: Findings-Documented-Not-Fixed Policy

**User Story:** As the task owner, I want all discovered defects, missing API surfaces, and stale test assertions documented in `future-enhancements.md` rather than fixed inside this task, so that the diagnostic instrument is delivered on time and discovered issues are triaged separately with their own task IDs.

#### Acceptance Criteria

1. WHEN any probe surfaces a missing export, missing public method, or missing module entirely THEN the finding SHALL be recorded in `task-tracking/TASK_2025_063/future-enhancements.md` as a discrete backlog item with: library, symbol/method, expected behavior, observed behavior.
2. WHEN any probe surfaces a stale assertion or outdated test in an existing library spec THEN the finding SHALL be recorded in the same `future-enhancements.md` file with file path and line reference.
3. WHEN any library is found to have no spec file at all THEN the finding SHALL be recorded with the library name and recommended starting coverage area.
4. WHEN the task completes THEN NO source files outside `apps/<e2e-suite>/` and the task-tracking folder SHALL have been modified — the diagnostic instrument does not patch the libraries it diagnoses (verified via `git diff --stat`).
5. WHEN a developer reading `future-enhancements.md` later THEN each item SHALL be actionable enough to become its own `TASK_2025_NNN` without further investigation.

### Requirement 7: Commit Discipline

**User Story:** As the user, I want every commit explicitly approved by me before it lands, so that I retain control over what enters the branch and when.

#### Acceptance Criteria

1. WHEN any agent in this workflow reaches a commit-ready state THEN it SHALL stage changes and pause for explicit user approval before running `git commit`.
2. WHEN the user approves a commit THEN the commit message SHALL follow the repo's commitlint format (`type(scope): subject`) with a valid scope from the allowed list (most likely `chore`, `test`, or `feat` with scope `langgraph` / `chromadb` / `neo4j` depending on the probe being added, or `scripts` for tooling — final scope per commit decided at commit time).
3. WHEN a pre-commit hook fails THEN the agent SHALL stop and present the 3-option protocol (Fix / Bypass / Stop & Report) per repo CLAUDE.md, NOT auto-bypass.
4. WHEN the task completes THEN no `git push` SHALL have occurred without explicit user instruction.

## Non-Functional Requirements

### Performance Requirements

- **Suite runtime**: Full three-layer run SHALL complete in under 10 minutes on a developer laptop with services already warm (target — not a hard fail).
- **Probe isolation**: Each probe SHALL clean up after itself such that subsequent probes are not influenced by prior fixtures (or explicitly document shared fixtures in the report).

### Reliability Requirements

- **Real-service flakiness handling**: The suite SHALL distinguish between "service unreachable" (infrastructure fault, report SKIPPED with clear reason) and "service reachable but library broke" (FAIL with stack trace).
- **Cleanup on crash**: If the suite crashes mid-run, the next run SHALL still execute cleanly (idempotent fixture setup or explicit pre-run cleanup step).

### Maintainability Requirements

- **Probe contract**: All probes SHALL implement a common contract (interface signature TBD by architect) so adding a new probe is a single-file change.
- **Zero re-exports**: Probes SHALL import directly from each library's public entry point — no re-exports through aggregator files (per repo CLAUDE.md).
- **Type discovery first**: When a probe needs a type, it SHALL be discovered in the target library, not redefined locally (per repo CLAUDE.md).

### Security Requirements

- **No secrets in report**: The report SHALL NOT include any environment variable values, API keys, or connection strings — only library names and stack traces.
- **No production data**: All test fixtures SHALL be synthetic; the suite SHALL NOT ingest real user content.

## Out of Scope

The following are explicitly **not** part of this task and SHALL NOT be addressed in implementation:

1. **Fixing any discovered defects** — all findings go to `future-enhancements.md`.
2. **Backfilling missing spec files** in libraries — the diagnostic surfaces the gap; closing the gap is a separate task.
3. **Adding new library API surface** to make a probe pass — if the probe can't probe, that's a MISSING entry in the report.
4. **CI integration** — the suite must be invokable; wiring it into a CI workflow is a future enhancement.
5. **Coverage thresholds or gates** — this is diagnostic, not gated. No build fails because of probe FAILs in this task.
6. **Performance benchmarking** — timing is captured for diagnostic context, not benchmarked or asserted against thresholds.
7. **`langgraph-angular` deep coverage** — this is a browser-side library; if the architect determines it cannot be exercised from the Node-based e2e suite, that decision is documented and the library is listed in `future-enhancements.md` for a separate Angular-side harness.
8. **Multi-adapter coverage of `adapters` module** — covering one adapter is sufficient; uncovered adapters become future-enhancements items.

## Stakeholder Analysis

### Primary Stakeholders

- **User (task owner / monorepo maintainer)**: Needs an objective diagnostic to know what's actually broken across 10 libs without manually exercising each. Success = report runs end-to-end, surfaces real failures with traceable stack traces, and respects the no-auto-commit rule.
- **Future contributors**: Need a reliable health-check before opening PRs touching cross-library code. Success = single command, deterministic report.

### Secondary Stakeholders

- **Future task owners of follow-up tasks**: Need actionable backlog items from this task's `future-enhancements.md`. Success = each finding is self-contained enough to become its own task.

### Stakeholder Impact Matrix

| Stakeholder         | Impact Level | Involvement                          | Success Criteria                                      |
| ------------------- | ------------ | ------------------------------------ | ----------------------------------------------------- |
| User / maintainer   | High         | Validates requirements + each commit | Single-command diagnostic, no auto-commits            |
| Future contributors | Medium       | Consumers of the suite               | Suite runs cleanly when services are up               |
| Future task owners  | Medium       | Consumers of future-enhancements.md  | Findings are actionable without further investigation |

## Risk Analysis

### Risk Matrix

| Risk                                                                    | Probability | Impact | Score | Mitigation Strategy                                                                                  |
| ----------------------------------------------------------------------- | ----------- | ------ | ----- | ---------------------------------------------------------------------------------------------------- |
| Real-service flakiness causes false FAILs                               | High        | Medium | 6     | Distinguish "unreachable" (SKIPPED) from "broken" (FAIL); document service pre-flight in report      |
| Library has no testable public API (partial-API surface)                | High        | Medium | 6     | MISSING category in report; route to future-enhancements.md per Req 6                                |
| Environment coupling (OPENAI_API_KEY etc.) makes RAG probe non-portable | Medium      | High   | 6     | Architect documents required env vars; RAG probe SKIPS with clear reason if key absent               |
| Scope creep: temptation to fix discovered bugs                          | High        | High   | 9     | Acceptance criterion 6.4 enforces `git diff --stat` outside `apps/<e2e-suite>/` is empty at task end |
| LangGraph Angular cannot be exercised from Node                         | High        | Low    | 3     | Documented as out-of-scope (Req 3.9) — separate browser harness becomes future-enhancements item     |
| Test runner choice (jest vs vitest) causes friction with existing repo  | Medium      | Medium | 4     | Architect justifies choice in implementation-plan.md against repo's current tooling                  |
| Report format bloat (too verbose to be useful)                          | Medium      | Medium | 4     | Architect proposes report skeleton; user validates before implementation                             |
| HITL probe complexity (Command resume pattern is nuanced)               | Medium      | Medium | 4     | Reference TASK_2025_040 (HITL LangGraph Native Integration) for the canonical resume pattern         |
| Adapter probe choice underspecified (SQLite/Redis/Postgres)             | Medium      | Low    | 2     | Architect picks one; uncovered adapters become future-enhancements items                             |

### Mitigation Summary

The highest risk is **scope creep into fixing discovered bugs**. The hardest enforcement is acceptance criterion 6.4: the only files modified outside the task-tracking folder must live under the new `apps/<e2e-suite>/` directory. Any agent tempted to "just fix this one missing export" must be redirected to add the finding to `future-enhancements.md` instead.

## Dependencies

### Infrastructure Dependencies

- `docker-compose.dev.yml` services SHALL be running before suite invocation: ChromaDB (port 8000), Neo4j (port 7687), Redis (port 6379).
- Environment variables per repo CLAUDE.md SHALL be set: `OPENAI_API_KEY`, `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `CHROMADB_URL`, `REDIS_URL`. Missing values SHALL produce SKIPPED probes with clear reasons rather than crashes.

### Code Dependencies

- All 10 publishable libraries SHALL be buildable at the time of suite execution (`npm run build:libs` passes).
- `dev-brand-api` SHALL be in a runnable state — its existing composition root is used directly, not re-implemented.

### Workflow Dependencies

- `task-description.md` (this file) → validated by user → `implementation-plan.md` (software-architect) → validated by user → `tasks.md` (team-leader decomposition) → assignment loop → final report.

## Success Metrics

- **Coverage**: At least 1 probe per publishable library, or a documented MISSING/out-of-scope entry justified in `implementation-plan.md`.
- **Report fidelity**: Every FAIL entry includes a stack trace AND a suspected-library tag.
- **Backlog quality**: `future-enhancements.md` exists at task completion and contains at least one finding per discovered gap.
- **Commit hygiene**: `git log feature/063` shows only commits the user explicitly approved, and `git diff main feature/063 --stat` modifies only files under `apps/<e2e-suite>/` and `task-tracking/TASK_2025_063/`.
- **Repeatability**: Two consecutive runs (services warm) produce comparable reports without manual cleanup between runs.

## Quality Gates

Before delegation to the next agent:

- [x] All requirements follow SMART criteria
- [x] Acceptance criteria use WHEN/THEN/SHALL format
- [x] Stakeholder analysis complete
- [x] Risk matrix with mitigations
- [x] Out-of-scope explicit
- [x] Findings-documented-not-fixed policy is a non-negotiable acceptance criterion (6.1–6.5)
- [x] Real-service-only constraint reflected in acceptance criteria (1.5, plus per-probe ACs in Req 3)
- [x] 10 publishable libraries individually addressed in Req 3
- [x] Commit policy explicit (Req 7)
- [x] Dependencies documented
