# Task Context for TASK_2025_066

## User Intent

Fix `tslib` ESM↔CJS interop mismatch in the `apps/dev-brand-api/webpack.test-bootstrap.config.js` bundle, surfaced by TASK_2025_065. All 9 Layer-1/Layer-2 e2e probes currently fail with:

```
TypeError: Cannot destructure property '__extends' of
  _tslib_js__WEBPACK_IMPORTED_MODULE_0___default(...)
  as it is undefined.
  at Module.root (dist-test/apps/dev-brand-api/test-bootstrap.js:276:5)
```

Origin: webpack 5 bundles `tslib` (ESM) into a CJS output and the `__webpack_require__.n()` default-interop wrapper returns `undefined` for tslib's namespace import, causing every TypeScript runtime helper (`__extends`, `__assign`, etc.) to be unreachable.

## Conversation Summary

- Surfaced by TASK_2025_065 (E2E Harness — Load Built Bundle Instead of Source)
- Repro:
  ```bash
  npx nx build-test-bootstrap dev-brand-api
  set -a && source apps/dev-brand-api/.env && set +a && npm run e2e
  # → 9 probes fail with __extends undefined at test-bootstrap.js:276:5
  ```
- Candidate fixes (architect picks):
  1. Externalize tslib via `externalDependencies` array — Node resolves at runtime via CJS (simple, surgical)
  2. `importHelpers: false` for test-bootstrap build — inline helpers per file (bigger bundle, no interop bug)
  3. Alias tslib to its CJS entry — `resolve.alias: { tslib: require.resolve('tslib/tslib.js') }`
  4. Custom webpack output interop config — risky

## Technical Context

- Branch: feature/066
- Created: 2026-05-15
- Task Type: BUGFIX
- Priority: P0-Critical
- Effort Estimate: S (1-2 file fix)

## Constraints

- Edit only `apps/dev-brand-api/webpack.test-bootstrap.config.js` (and possibly a sibling `tsconfig.test-bootstrap.json` for option 2)
- Production webpack pipeline UNCHANGED — `apps/dev-brand-api/webpack.config.js`, `tsconfig.app.json`, source files NOT touched
- NEVER touch `libs/**`
- TypeScript strict
- Commit policy: user approves

## Acceptance Criteria

The 9 probes that currently fail with `__extends undefined` progress past tslib step. Either PASS (real lib code reached) or new error category (different finding).

## Execution Strategy

BUGFIX_STREAMLINED (minimal — 1-2 file fix):

- Skip project-manager (requirements clear from task brief)
- Skip team-leader decomposition (atomic fix)
- software-architect picks among 4 candidate fixes → USER VALIDATION
- backend-developer (webpack config) implements
- USER decides QA (tester/reviewer/skip)
