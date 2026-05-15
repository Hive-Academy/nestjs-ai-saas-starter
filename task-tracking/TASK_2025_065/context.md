# Task Context for TASK_2025_065

## User Intent

Redesign the `apps/e2e-diagnostics` Nest boot harness so it loads the dev-brand-api **built webpack bundle** (or a dedicated ESM-bundled test-bootstrap entry) instead of the source `apps/dev-brand-api/src/app/app.module.ts` via swc-node. This is required because the current source-loading path passes through Jest's swc CJS transform which rewrites every static `import` of an ESM-only package (`@langchain/langgraph-checkpoint*`, `uuid`, etc.) into a synchronous `require()` — surfacing as `ERR_REQUIRE_ESM` at boot and blocking 9 of 12 probes from real coverage.

## Conversation Summary

### Background

- TASK_2025_063: e2e-diagnostics suite landed (15 commits on develop) — provides 12 probes covering full-stack real-service integration
- TASK_2025_064: Fixed `checkpoint.config.ts` to use `Function('return import(s)')` indirection — works for production webpack bundle, does NOT fix Jest path because swc-node retransforms source separately
- The dev-brand-api source + all 10 `@hive-academy/*` libs static-import ESM-only deps in many places — file-by-file refactor is high-cost, broad-blast-radius

### Repro

```bash
set -a && source apps/dev-brand-api/.env && set +a && npm run e2e
# → apps/e2e-diagnostics/reports/<latest>/report.md
# → 9 of 12 probes FAIL with ERR_REQUIRE_ESM at AppModule boot
```

### Candidate Solutions (architect chooses)

1. **Load webpack-built bundle**: Modify `apps/e2e-diagnostics/src/harness/nest-boot.ts` to `require('../../../../dist/apps/dev-brand-api/main.js')`. Requires bundle to export AppModule. Currently `main.js` bootstraps via NestFactory directly — needs entrypoint change.

2. **Dedicated test-bootstrap export**: Add `apps/dev-brand-api/src/test-bootstrap.ts` that re-exports AppModule. Bundle separately via webpack with ESM output OR ensure existing webpack pipeline produces a CJS bundle where all ESM deps are pre-resolved. Harness imports that pre-built artifact.

3. **Switch e2e-diagnostics to native Jest ESM**: `extensionsToTreatAsEsm`, `"type": "module"` in `apps/e2e-diagnostics/package.json`, drop swc CJS transform in favor of `@swc-node/register` ESM mode. Static imports of ESM deps become native ESM. Requires reconfiguring jest + tsconfig + reporter shim.

4. **Hybrid: pre-build dev-brand-api before e2e run**: Add `nx test e2e-diagnostics` `dependsOn: ["dev-brand-api:build"]` to project.json. Harness uses the built `dist/apps/dev-brand-api/main.js` — needs main.js to export AppModule, not just bootstrap.

### Constraints

- Probes must reach real lib code in libs/\*\* — boot must succeed in Jest
- Production behavior of dev-brand-api unchanged
- TypeScript strict, no `any`
- Repo CLAUDE.md rules apply (no v1/v2, no re-exports, direct replacement)
- Commit policy: user approves every commit explicitly
- Scope guard: changes confined to `apps/e2e-diagnostics/**`, `apps/dev-brand-api/src/test-bootstrap.ts` (if option 2), `apps/dev-brand-api/project.json` (if needed), root `package.json` if needed — but NEVER libs/\*\*

## Technical Context

- Branch: feature/065 (to be created by user when ready)
- Created: 2026-05-15
- Task Type: REFACTORING (architecture-driven, not bugfix — the e2e suite design needs an explicit "load already-bundled artifact" mode)
- Priority: P0-Critical (blocks 9 of 12 e2e probes from real coverage)
- Effort Estimate: M (medium — bundle pipeline + harness rewiring, ~4-8h)
- Cwd: /Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter

## Execution Strategy

**Strategy**: REFACTORING_FOCUSED

Rationale: This is a deliberate architecture refactor of the e2e-diagnostics harness boot pipeline. Requirements are clear (boot AppModule successfully under Jest without ESM transform mismatch). No PM phase needed — user has scoped the problem and listed 4 candidate solutions. Architect must evaluate trade-offs and pick the right one before decomposition.

**Planned Agent Sequence**:

1. software-architect → evaluates 4 candidate solutions, produces implementation-plan.md → USER VALIDATION
2. team-leader MODE 1 → decomposes plan into atomic tasks → tasks.md
3. team-leader MODE 2 (iterative) → assigns each task to backend-developer (likely all backend — harness + webpack config + Nest module wiring)
4. team-leader MODE 3 → final verification
5. USER CHOICE → senior-tester (validate 12 probes now reach real lib code) and/or code-reviewer
6. modernization-detector → future work (libs/\*\* ESM refactor opportunities)
