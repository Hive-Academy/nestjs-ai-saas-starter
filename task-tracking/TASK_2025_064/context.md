# Task Context for TASK_2025_064

## User Intent

Fix `ERR_REQUIRE_ESM` blocking `dev-brand-api` boot inside the Jest VM. The e2e-diagnostics suite (TASK_2025_063, just landed on origin/develop) surfaces this — 9 of 12 probes fail because dev-brand-api's CJS bundle cannot `require()` one of its langchain checkpoint deps that ships ESM-only. The exact error captured is `{"code":"ERR_REQUIRE_ESM"}` originating during `NestFactory.create(AppModule)`.

## Conversation Summary

**Discovery context**: This bug was surfaced by the e2e-diagnostics test suite created in TASK_2025_063 (just merged to develop, 16 commits). 9 of 12 Layer-2 probes fail at app boot before reaching their actual lib code paths.

**Suspected dep candidates** (ESM-only, externalized by webpack):

- `@langchain/langgraph-checkpoint`
- `@langchain/langgraph-checkpoint-sqlite`
- `@langchain/langgraph-checkpoint-redis`
- Possibly a transitive

**Probable investigation areas**:

- `apps/dev-brand-api/src/app/config/checkpoint.config.ts` — calls `getCheckpointSaver` (SqliteSaver instantiation)
- `apps/dev-brand-api/src/main.ts` + `tsconfig.json` — compilation target / module setting
- `libs/langgraph-modules/adapters/` — checkpoint factory location

**Possible fix paths** (architect must choose, document trade-offs):

1. Convert dev-brand-api to ESM (`"type": "module"`, jest config updates) — invasive
2. Replace direct `require()` with dynamic `await import()` for ESM-only deps — surgical, recommended
3. Swap to CJS-compatible alternative checkpoint package
4. Pin upstream dep to last CJS-compatible version

**Constraints**:

- Real fix in app/lib layer — NOT a workaround in the e2e probe layer
- TypeScript strict, no `any`
- Anti-backward-compat rule applies (no v1/v2 versioning)
- **Commit policy**: User explicitly approves each commit — DO NOT auto-commit
- **Acceptance**: Re-run e2e-diagnostics suite — Layer-2 probes must reach actual lib code (not fail-fast on boot)

## Technical Context

- Task ID: TASK_2025_064
- Branch: feature/064 (not yet created — user handles git when ready)
- Created: 2026-05-15
- Task Type: BUGFIX
- Priority: P0-Critical (blocks e2e diagnostics observability)
- Effort Estimate: M (Medium — surgical fix expected, but architecture decision needed first)
- Source task: TASK_2025_063 (e2e-diagnostics, just landed)

## Execution Strategy

**Strategy**: BUGFIX_FOCUSED (with architect involvement due to fix-path decision)

Standard BUGFIX skips PM (requirements known). However, given multiple viable fix paths with different blast radii, software-architect should evaluate and choose path before decomposition. Researcher likely not needed — root cause is well-scoped and reproducible.

**Planned sequence**:

1. software-architect → evaluates 4 fix paths, picks one, produces implementation-plan.md → USER VALIDATION
2. team-leader MODE 1 → decomposes plan into atomic tasks (tasks.md)
3. team-leader MODE 2 (iterative) → assigns each task to backend-developer, verifies completion
4. team-leader MODE 3 → final verification
5. USER CHOICE → senior-tester (re-run e2e-diagnostics) and/or code-reviewer
6. modernization-detector → future work
