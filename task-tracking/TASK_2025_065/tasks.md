# Development Tasks — TASK_2025_065

**Title**: E2E Harness — Load Built Bundle Instead of Source (ESM-Safe)
**Branch**: `feature/065`
**Developer**: `backend-developer` (all tasks)
**Total Tasks**: 8 | **Phases**: 5 | **Status**: 0/8 complete

---

## Plan Validation Summary

**Validation Status**: PASSED WITH RISKS

### Assumptions Verified (from architect's plan)

- ✅ `dist/main.js` exists, externalizes ESM deps via runtime `require()` — verified via grep
- ✅ Node 22 `process.features.require_module === true` — but ESM with top-level await still throws `ERR_REQUIRE_ASYNC_MODULE`
- ✅ `@nx/webpack` plugin documents `externalDependencies: 'all' | 'none' | string[]`
- ✅ `apps/e2e-diagnostics/project.json` already has `implicitDependencies: ["dev-brand-api"]` — but `dependsOn` is what actually triggers the build
- ⚠️ Assumption: no critical dep uses top-level await. If TLA appears, webpack `experiments.topLevelAwait: true` may be needed — addressed in Task 2.1's quality requirements.

### Risks Identified

| Risk                                                                  | Severity | Mitigation                                                                                                                                                |
| --------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `externalDependencies: 'none'` produces a slow first build            | MED      | `optimization: false` + Nx cache. Task 3.1 measures build time, documents in commit body.                                                                 |
| A dep performs `require.resolve(__dirname)` and breaks when bundled   | MED      | If Task 3.1 fails, fall back to selective `externalDependencies: ['some-pkg']`. Document fallback in Task 3.1 commit.                                     |
| Top-level await in an ESM dep prevents sync CJS bundling              | LOW/HIGH | Webpack supports `experiments.topLevelAwait: true`. Add only if build fails in Task 3.1.                                                                  |
| Production bundle byte-diff (AC-10) — silent leakage of test settings | LOW/HIGH | Phase 5 final verification gates merge. Task 5.1 compares `dist/main.js` md5 before/after.                                                                |
| `dist-test/` accidentally committed                                   | LOW      | Task 1.3 adds `.gitignore` entry before any build runs.                                                                                                   |
| AC-9 boot probes still fail for non-ESM reasons                       | LOW      | Acceptance is "ERR_REQUIRE_ESM is gone at boot phase". Probe-level assertion failures inside lib code are out-of-scope for this task — documented in 5.2. |

### Edge Cases to Handle

- [ ] Harness must throw a descriptive error if `dist-test/test-bootstrap.js` is missing (Task 4.1)
- [ ] Jest must NOT re-transform the bundled artifact (Task 4.2 — `transformIgnorePatterns`)
- [ ] EnvLoader runs at import time inside `test-bootstrap.ts` to mirror production order (Task 1.1)

---

## Phase 1: Test Entrypoint + Bundling Config ⏸️ PENDING

**Dependencies**: None
**Tasks**: 3 (1.1, 1.2, 1.3)
**Goal**: Create the test-only source entry and webpack config so a self-contained CJS bundle can be produced. `.gitignore` updated before any build runs.

---

### Task 1.1: Create `test-bootstrap.ts` entrypoint ⏸️ TODO

**Agent**: backend-developer
**File (CREATE)**: `/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/dev-brand-api/src/test-bootstrap.ts`
**Spec Reference**: implementation-plan.md §3.1 (AC-1)
**Pattern**: Reference `apps/dev-brand-api/src/main.ts` for EnvLoader import order — but DO NOT call `NestFactory.create` / `bootstrap()` / `app.listen()`.
**Dependencies**: None

**Acceptance Criteria**:

- File exists at the absolute path above.
- Imports `EnvLoader` from `./app/config/env-loader.util` and calls `EnvLoader.load()` at module top-level (side-effect at import time is intentional).
- Re-exports `AppModule` from `./app/app.module`.
- Re-exports `EnvLoader` from `./app/config/env-loader.util`.
- No `NestFactory`, no `bootstrap()`, no `app.listen()`, no `process.exit`.
- TS strict; no `any`.
- `npx nx typecheck dev-brand-api` passes.

**Validation Notes**:

- EnvLoader at top-level mirrors production env-resolution order before AppModule constructs.
- Single authoritative file — no v1/v2, no compatibility shim.

**Proposed Commit Message**:

```
feat(scripts): add test-bootstrap entry for dev-brand-api e2e harness
```

---

### Task 1.2: Create webpack config for test-bootstrap bundle ⏸️ TODO

**Agent**: backend-developer
**File (CREATE)**: `/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/dev-brand-api/webpack.test-bootstrap.config.js`
**Spec Reference**: implementation-plan.md §3.2 (AC-2)
**Pattern**: Reference `apps/dev-brand-api/webpack.config.js` (existing) for `NxAppWebpackPlugin` shape. Diverge by setting `externalDependencies: 'none'` and `output.path` → `dist-test`.
**Dependencies**: 1.1 (entry file must exist for webpack to resolve `main`)

**Acceptance Criteria**:

- File exists at the absolute path above.
- Exports a webpack config object with `output.path = join(__dirname, 'dist-test')` and `output.libraryTarget = 'commonjs2'`.
- Uses `NxAppWebpackPlugin` from `@nx/webpack/app-plugin`.
- Plugin options include: `target: 'node'`, `compiler: 'tsc'`, `main: './src/test-bootstrap.ts'`, `tsConfig: './tsconfig.app.json'`, `optimization: false`, `outputHashing: 'none'`, `generatePackageJson: false`, **`externalDependencies: 'none'`**.
- No reference to ESM-only deps as externals (everything inlines).
- Production `webpack.config.js` is **untouched** (verify via `git diff`).

**Validation Notes**:

- `externalDependencies: 'none'` is the critical line — it instructs Nx to inline every node_modules dep.
- `optimization: false` keeps build fast (no minification) — first build cost matters.

**Proposed Commit Message**:

```
feat(scripts): add webpack config to bundle test-bootstrap with inlined deps
```

---

### Task 1.3: Ignore `dist-test/` in git ⏸️ TODO

**Agent**: backend-developer
**File (MODIFY)**: `/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/.gitignore`
**Spec Reference**: implementation-plan.md §3.7 (AC-5)
**Dependencies**: None (but logically before Task 3.1's build run)

**Acceptance Criteria**:

- `.gitignore` includes the line `apps/dev-brand-api/dist-test/` (or pattern that covers it).
- `git check-ignore apps/dev-brand-api/dist-test/test-bootstrap.js` returns the ignored path.
- No other entries removed.

**Validation Notes**:

- Must land BEFORE Task 3.1 runs the first build, otherwise the build artifact may get staged.

**Proposed Commit Message**:

```
chore(scripts): ignore dev-brand-api dist-test build output
```

---

**Phase 1 Verification Gate**:

- All 3 files exist / are modified.
- `npx nx typecheck dev-brand-api` passes.
- `git status` shows `.gitignore` modified and 2 new files staged — no `dist-test/` artifact tracked.

---

## Phase 2: Nx Build Target Wiring ⏸️ PENDING

**Dependencies**: Phase 1
**Tasks**: 1 (2.1)
**Goal**: Register the new bundle build as an Nx target so it can be invoked via `nx build-test-bootstrap dev-brand-api` and chained from other targets via `dependsOn`.

---

### Task 2.1: Add `build-test-bootstrap` target to `dev-brand-api` ⏸️ TODO

**Agent**: backend-developer
**File (MODIFY)**: `/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/dev-brand-api/project.json`
**Spec Reference**: implementation-plan.md §3.3 (AC-3 wiring half)
**Dependencies**: 1.1, 1.2

**Acceptance Criteria**:

- New target `build-test-bootstrap` added to `targets` map.
- Executor: `@nx/webpack:webpack`.
- `outputs`: `["{workspaceRoot}/apps/dev-brand-api/dist-test"]`.
- Options include: `target: "node"`, `compiler: "tsc"`, `outputPath: "apps/dev-brand-api/dist-test"`, `main: "apps/dev-brand-api/src/test-bootstrap.ts"`, `tsConfig: "apps/dev-brand-api/tsconfig.app.json"`, `isolatedConfig: true`, `webpackConfig: "apps/dev-brand-api/webpack.test-bootstrap.config.js"`.
- Existing `build`, `serve`, `test`, `typecheck` targets are **unchanged** (verify via `git diff` — diff should only add the new target).

**Validation Notes**:

- `isolatedConfig: true` is required so webpack reads our custom config rather than the default Nx one.
- AC-10 (production parity) depends on this task NOT modifying the existing `build` target.

**Proposed Commit Message**:

```
feat(scripts): add build-test-bootstrap nx target for dev-brand-api
```

---

**Phase 2 Verification Gate**:

- `git diff apps/dev-brand-api/project.json` shows only an addition of `build-test-bootstrap`.
- `npx nx show project dev-brand-api --json` lists the new target.

---

## Phase 3: First Bundle Build + Bundle Verification ⏸️ PENDING

**Dependencies**: Phase 2
**Tasks**: 1 (3.1)
**Goal**: Actually produce the bundle once, verify ESM deps are inlined (no runtime `require('@langchain/...')` left in output). This is the make-or-break correctness gate.

---

### Task 3.1: Run first bundle build + verify ESM inlining ⏸️ TODO

**Agent**: backend-developer
**Files (NONE modified — verification + commit of any TLA fix only)**:

- If build succeeds first try: no file change, just a verification commit referencing the build output (commit body documents grep result).
- If build fails with TLA error: modify `/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/dev-brand-api/webpack.test-bootstrap.config.js` to add `experiments: { topLevelAwait: true }`.
- If a specific dep fails (`require.resolve(__dirname)` issue): selectively externalize that dep in the same webpack config: `externalDependencies: ['offending-pkg']`.

**Spec Reference**: implementation-plan.md §3.3 + §4 (AC-3 build half, AC-4 verification)
**Dependencies**: 2.1

**Acceptance Criteria**:

- `npx nx build-test-bootstrap dev-brand-api` exits 0.
- `apps/dev-brand-api/dist-test/test-bootstrap.js` exists and is non-empty.
- `grep -E "require\(['\"]@langchain" apps/dev-brand-api/dist-test/test-bootstrap.js` returns **zero matches** (AC-4).
- `grep -cE "require\(['\"](uuid|nanoid|chromadb|@langchain|langchain|p-queue|p-timeout|p-limit|p-retry)" apps/dev-brand-api/dist-test/test-bootstrap.js` returns `0`.
- If TLA fix or selective external was needed: webpack config change is committed separately with rationale in body.
- `git status` shows no `dist-test/` files tracked (verifies Task 1.3 worked).

**Validation Notes**:

- This is the binary-correctness gate. If ESM deps are still externalized, the harness will still hit `ERR_REQUIRE_ESM` at boot.
- Document build duration in commit body (informs future cache/optimization decisions).
- Only commit if a webpack config fallback was applied; pure verification with no file changes = no commit.

**Proposed Commit Message** (only if config fallback applied):

```
fix(scripts): enable topLevelAwait for test-bootstrap webpack bundle
```

OR

```
fix(scripts): selectively externalize <pkg> in test-bootstrap webpack config
```

If no config change is needed, **no commit is produced for this task** — verification is captured in Task 5.1's PR description.

---

**Phase 3 Verification Gate**:

- Build succeeds, ESM-grep returns zero, no tracked artifacts.

---

## Phase 4: Harness Rewire ⏸️ PENDING

**Dependencies**: Phase 3 (bundle must exist before harness can `require()` it)
**Tasks**: 3 (4.1, 4.2, 4.3)
**Goal**: Switch the e2e harness from source-loading to bundle-loading, and tell Jest to leave the bundle alone.

---

### Task 4.1: Rewrite `loadAppModule()` to require the bundle ⏸️ TODO

**Agent**: backend-developer
**File (MODIFY)**: `/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/e2e-diagnostics/src/harness/nest-boot.ts`
**Spec Reference**: implementation-plan.md §3.5 (AC-6)
**Dependencies**: 3.1 (bundle must exist for runtime `require()` to succeed)

**Acceptance Criteria**:

- `loadAppModule()` resolves the bundle via absolute path: `join(__dirname, '..', '..', '..', '..', 'dev-brand-api', 'dist-test', 'test-bootstrap.js')`.
- Loads via `require(TEST_BOOTSTRAP_PATH)` — NOT via ts-paths or any import alias.
- Validates the loaded module exports `AppModule`; throws a descriptive error otherwise. Error message includes the resolved path and a "re-run `nx build-test-bootstrap dev-brand-api`" hint.
- `bootApp()` and `bootContext()` signatures unchanged (only `loadAppModule()` internals change).
- No `any` types. Use `Type<unknown>` for the returned class reference.
- No re-routing through swc-jest transforms (path resolution must NOT go through TS path mappings).

**Validation Notes**:

- Descriptive error is critical for developer experience — when the bundle is missing, the message must say exactly how to rebuild it.
- Absolute path resolution sidesteps Jest's `moduleNameMapper` / `paths`.

**Proposed Commit Message**:

```
refactor(scripts): load dev-brand-api test-bootstrap bundle in e2e harness
```

---

### Task 4.2: Add `dist-test/` to Jest `transformIgnorePatterns` ⏸️ TODO

**Agent**: backend-developer
**File (MODIFY)**: `/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/e2e-diagnostics/jest.config.ts`
**Spec Reference**: implementation-plan.md §3.6 (AC-7)
**Dependencies**: 4.1 (logically grouped — both harness-side changes)

**Acceptance Criteria**:

- `transformIgnorePatterns` includes the new pattern `'/apps/dev-brand-api/dist-test/'`.
- The existing ESM-whitelist pattern (`/node_modules/(?!(uuid|nanoid|chromadb|...))/`) is preserved unchanged.
- No other config keys touched.

**Validation Notes**:

- Without this, swc-jest will attempt to retransform the bundle and undo the work — the bundle must be loaded as-is.

**Proposed Commit Message**:

```
fix(scripts): skip dist-test bundle in e2e-diagnostics jest transform
```

---

### Task 4.3: Add `dependsOn` to e2e-diagnostics test target ⏸️ TODO

**Agent**: backend-developer
**File (MODIFY)**: `/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/e2e-diagnostics/project.json`
**Spec Reference**: implementation-plan.md §3.4 (AC-8)
**Dependencies**: 2.1 (target it references must exist)

**Acceptance Criteria**:

- `targets.test.dependsOn` set to `["dev-brand-api:build-test-bootstrap"]`.
- `implicitDependencies: ["dev-brand-api"]` preserved (graph metadata stays).
- No other target keys modified.
- `npx nx test e2e-diagnostics --dry-run` (or `--graph` inspection) confirms `build-test-bootstrap` is scheduled before `test`.

**Validation Notes**:

- `dependsOn` is what triggers the upstream build; `implicitDependencies` only affects affected-graph computation.

**Proposed Commit Message**:

```
feat(scripts): chain e2e test target to dev-brand-api test-bootstrap build
```

---

**Phase 4 Verification Gate**:

- Harness `require()`s the bundle.
- Jest leaves the bundle alone.
- Nx schedules build before test.

---

## Phase 5: End-to-End Smoke + Production Parity ⏸️ PENDING

**Dependencies**: Phase 4
**Tasks**: 1 (5.1)
**Goal**: Run the full `npm run e2e` flow end-to-end, confirm boot-phase `ERR_REQUIRE_ESM` is gone, and confirm production `dist/main.js` is byte-identical (AC-9 + AC-10).

---

### Task 5.1: Full e2e smoke + production parity verification ⏸️ TODO

**Agent**: backend-developer
**Files (NONE modified — verification only)**:

- Captures md5 / sha of `apps/dev-brand-api/dist/main.js` before any change on this branch (if not already captured: rebuild from `main` checkout into a temp dir, or use git stash + rebuild).
- Runs `npx nx build dev-brand-api` on current branch.
- Compares md5 / sha.
- Runs `set -a && source apps/dev-brand-api/.env && set +a && npm run e2e`.
- Reads `apps/e2e-diagnostics/reports/<latest>/report.md`.

**Spec Reference**: implementation-plan.md §3.8 + §5 (AC-9, AC-10)
**Dependencies**: 4.1, 4.2, 4.3, 3.1

**Acceptance Criteria**:

- `npm run e2e` exits without `ERR_REQUIRE_ESM` or `ERR_REQUIRE_ASYNC_MODULE` at AppModule construction phase.
- All 12 probes reach AppModule boot success (probe-level assertion failures inside real lib code are acceptable and out-of-scope — document them as follow-up tasks if found).
- Production `nx build dev-brand-api` produces a `dist/main.js` whose md5 matches the pre-branch md5 (AC-10). If different, investigate and fix any leakage from test config into prod path.
- Findings (probe pass/fail counts, byte-diff result, any follow-up tasks) written into the PR description, NOT a separate file.

**Validation Notes**:

- AC-10 is the hard gate — if prod bundle differs, something leaked. Block merge until resolved.
- This task usually produces NO commit (pure verification). If a leakage fix is needed, it gets its own commit with `fix(scripts):` scope.

**Proposed Commit Message** (only if a fix was needed):

```
fix(scripts): isolate test-bootstrap config from production build
```

If no fix is needed, no commit is produced.

---

**Phase 5 Verification Gate**:

- All 12 probes boot AppModule.
- Production parity confirmed.
- PR description carries the smoke report.

---

## Summary

| Phase | Tasks                   | Cumulative Commits (max)      |
| ----- | ----------------------- | ----------------------------- |
| 1     | 1.1, 1.2, 1.3           | 3                             |
| 2     | 2.1                     | 4                             |
| 3     | 3.1 (verification only) | 4 or 5 (5 only if config fix) |
| 4     | 4.1, 4.2, 4.3           | 7 or 8                        |
| 5     | 5.1 (verification only) | 7–9 total                     |

**Out of scope** (do NOT touch in this task):

- Any file under `libs/**`.
- `apps/dev-brand-api/src/main.ts` (production entrypoint).
- `apps/dev-brand-api/webpack.config.js` (production webpack).
- `.swcrc`, `tsconfig.app.json`, `tsconfig.base.json`.
- Probe-level assertion fixes (separate follow-up tasks if found).
