# Implementation Plan — TASK_2025_065

**Title**: E2E Harness — Load Built Bundle Instead of Source (ESM-Safe)
**Type**: Refactoring · **Priority**: P0-Critical · **Effort**: M · **Branch**: `feature/065`
**Author**: software-architect · **Date**: 2026-05-15
**Status**: Architecture Complete — awaiting user validation

---

## 0. Problem Recap (Evidence-Grounded)

The e2e-diagnostics Jest harness boots `apps/dev-brand-api/src/app/app.module.ts` through `@swc/jest`. Its `.spec.swcrc` declares `module.type=es6` but Jest still drives module evaluation through its CJS host — swc-jest rewrites static `import` statements into `require()` calls. When that `require()` lands on an ESM-only package (e.g. `@langchain/langgraph` declares `"type": "module"` — verified at `node_modules/@langchain/langgraph/package.json:5`), Node throws `ERR_REQUIRE_ESM` (or `ERR_REQUIRE_ASYNC_MODULE` for modules with top-level await), killing AppModule construction before any probe touches real lib code. Result: 9/12 probes fail in boot.

**Confirmed via investigation**:

- `apps/dev-brand-api/dist/main.js` exists, is 332 KB, produced by `@nx/webpack:webpack`.
- The bundle **externalizes** both first-party libs (`@hive-academy/*`) and ESM deps (`@langchain/langgraph`, `@langchain/langgraph-checkpoint`, `@langchain/core/messages`, etc.) via runtime `require()` — verified with `grep -oE 'e\.exports=require\("[^"]+"\)' dist/main.js | sort -u`.
- The bundle does **not** export `AppModule`. Its entrypoint is an IIFE that calls `bootstrap()` at module load. Simply `require()`-ing `dist/main.js` would start the HTTP server.
- Node version on the developer workstation: `v22.16.0`. `process.features.require_module === true` — Node natively supports `require(esm)` for synchronous ESM modules. ESM modules with top-level await still throw `ERR_REQUIRE_ASYNC_MODULE`.
- `npm run e2e` already sets `NODE_OPTIONS=--experimental-vm-modules` and runs `nx test e2e-diagnostics` (root `package.json`).
- `apps/e2e-diagnostics/project.json` already declares `"implicitDependencies": ["dev-brand-api"]` — Nx already knows about the dependency, but the `test` target does not `dependsOn` the build, so Nx will not invoke the build when the user runs `npm run e2e`.

---

## 1. Candidate Evaluation

Scored 1 (worst) → 5 (best). Bold = chosen.

| #   | Candidate                                                                                   | LOC / Files                                                                          | Blast Radius                                                                                       | Production Safety                                 | Correctness                                                                                                                                                                                                                           | Maintainability                                                                       | Total  |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------ |
| 1   | Require existing `dist/main.js` from harness                                                | ~10 LOC, 1 file                                                                      | Tiny, harness only                                                                                 | 5 — no prod change                                | **1 — fails**: bundle does NOT export AppModule, and ESM deps still externalized → same ERR_REQUIRE_ESM                                                                                                                               | 4                                                                                     | 13     |
| 2   | Dedicated `test-bootstrap.ts` + separate webpack target with `externalDependencies: 'none'` | ~120 LOC, 4 files (test-bootstrap.ts, webpack.test.config.js, project.json, harness) | Moderate — adds a second build target on dev-brand-api but main webpack pipeline untouched         | 5 — new target is isolated; prod target unchanged | 5 — fully resolves: AppModule exported, all ESM deps inlined into CJS bundle, no runtime ESM `require()` left                                                                                                                         | 4 — clean Nx-native target wiring, but introduces a second webpack config to maintain | **18** |
| 3   | Switch e2e-diagnostics to native Jest ESM (`extensionsToTreatAsEsm`, `type:module`)         | ~200 LOC, 5+ files (jest.config, package.json, tsconfig, reporter shim, swcrc)       | Large — re-architects every probe's module evaluation; the existing `.cjs` reporter must be ported | 5 — no prod change                                | 3 — addresses ESM at source, BUT static imports of ESM-only deps still need precise `extensionsToTreatAsEsm` lists for every dep + sub-path; nanoid, uuid, p-queue, etc. each have different layouts; high probability of regressions | 2 — fragile, drags every future Jest/swc upgrade into the same maintenance burden     | 10     |
| 4   | `dependsOn: ["dev-brand-api:build"]` + require existing `dist/main.js`                      | ~5 LOC, 2 files                                                                      | Tiny                                                                                               | 5 — no prod change                                | **1 — fails** for the same reasons as #1: bundle does not export AppModule and externalizes ESM deps                                                                                                                                  | 4                                                                                     | 14     |

### Why #2 wins

- **Correctness is binary here**. #1 and #4 _cannot work_ without changing what the build emits. They presume the existing `dist/main.js` is loadable from CJS Jest, but the bundle (a) auto-starts the server on import, and (b) externalizes ESM deps — both verified above.
- **#3 is technically possible but high-risk and high-maintenance**. Native ESM under Jest is still flagged experimental (`--experimental-vm-modules`), and every dep that ships hybrid CJS/ESM with `package.json#exports` conditions needs careful handling. We would still need a custom reporter shim because Jest's classic reporter API is CJS-only.
- **#2 is the smallest viable surgical fix**:
  - Introduces a dedicated test entrypoint that exports `AppModule` (no auto-bootstrap, no listen) — direct replacement, no v1/v2.
  - Builds it through a dedicated webpack config that sets `externalDependencies: 'none'`, asking webpack to **inline every dep** so the produced bundle is pure CJS with no ESM `require()` calls at runtime.
  - Production `serve`/`build` of dev-brand-api is untouched.
  - The harness drops swc-jest from the AppModule's transitive graph entirely — Jest only swc-compiles the harness file and probes, never the lib code.

---

## 2. Chosen Approach

**Option 2 — Dedicated `test-bootstrap.ts` exported from a fully-bundled CJS test artifact.**

### Architecture (high-level)

```
apps/dev-brand-api/
  src/test-bootstrap.ts           ← NEW. Re-exports AppModule + setupApp() helper.
  webpack.test-bootstrap.config.js ← NEW. Bundles test-bootstrap.ts with externalDependencies: 'none'.
  dist-test/                       ← NEW build output (gitignored). Contains test-bootstrap.js (CJS, fully self-contained).
  project.json                     ← MODIFIED. Adds 'build-test-bootstrap' target.

apps/e2e-diagnostics/
  src/harness/nest-boot.ts         ← MODIFIED. Loads ../../../dev-brand-api/dist-test/test-bootstrap.js instead of source.
  project.json                     ← MODIFIED. test target adds dependsOn: ["dev-brand-api:build-test-bootstrap"].

package.json (root)                ← UNCHANGED scripts; npm run e2e already invokes nx which honours dependsOn.
.gitignore                         ← MODIFIED. Adds apps/dev-brand-api/dist-test/.
```

### Why this resolves ERR_REQUIRE_ESM

- `externalDependencies: 'none'` instructs `@nx/webpack`'s plugin to inline every `node_modules` dep into the output bundle (Nx options doc: `node_modules/@nx/webpack/src/plugins/nx-webpack-plugin/nx-app-webpack-plugin-options.d.ts:1` — `externalDependencies?: 'all' | 'none' | string[]`).
- Webpack consumes ESM source code natively (it is an ESM-capable bundler) and emits CJS for `target: 'node'` builds. The output `test-bootstrap.js` therefore contains no `require('@langchain/langgraph')` calls — those modules become normal webpack module IDs inside the bundle.
- Jest only sees one entrypoint: a compiled `.js` file in `dist-test/`. By configuring jest's `transformIgnorePatterns` to skip `dist-test/`, swc-jest never re-transforms the bundle. The CJS code runs as-is under Node 22.
- The only files swc-jest still transforms are: the harness file itself (`nest-boot.ts`), probe `.spec.ts` files, and any helpers under `apps/e2e-diagnostics/src/**`. None of these need to static-import ESM-only packages — they import the already-bundled `AppModule`.

---

## 3. Detailed Design

### 3.1 `apps/dev-brand-api/src/test-bootstrap.ts` (NEW)

```ts
/**
 * E2E test entrypoint. Re-exports AppModule plus a setupApp helper so the
 * e2e-diagnostics harness boots a bit-for-bit copy of production without
 * triggering `bootstrap()` / `app.listen()` on import.
 *
 * Build target: dev-brand-api:build-test-bootstrap → dist-test/test-bootstrap.js
 * Bundles every dependency (externalDependencies: 'none') so the artifact
 * is a self-contained CJS module Node can load without ERR_REQUIRE_ESM.
 */
import { EnvLoader } from './app/config/env-loader.util';

// Load .env files once, mirroring main.ts order. Side-effect at import time
// is intentional — the harness expects env present before AppModule constructs.
EnvLoader.load();

export { AppModule } from './app/app.module';
export { EnvLoader } from './app/config/env-loader.util';
```

**Notes**:

- No `NestFactory.create`, no `bootstrap()`, no `app.listen()`. Pure module export.
- `EnvLoader.load()` runs at import time so when the harness then calls `NestFactory.createApplicationContext(AppModule)`, env vars are already resolved.
- TS strict. No `any`. Single authoritative file — replaces no existing file (clean addition).

### 3.2 `apps/dev-brand-api/webpack.test-bootstrap.config.js` (NEW)

```js
const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, 'dist-test'),
    libraryTarget: 'commonjs2',
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/test-bootstrap.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      externalDependencies: 'none', // ← inline every dep, no runtime require() of ESM
    }),
  ],
};
```

**Why a second webpack file** rather than parameterising the existing one: Nx executors run one webpack config per target, and `NxAppWebpackPlugin` reads options at construction. Splitting the config keeps the prod-vs-test diff explicit and reviewable, and prevents accidental cross-contamination.

### 3.3 `apps/dev-brand-api/project.json` (MODIFIED)

Add a sibling build target (existing `build` target untouched):

```jsonc
{
  "targets": {
    "build": {
      /* unchanged */
    },
    "serve": {
      /* unchanged */
    },

    "build-test-bootstrap": {
      "executor": "@nx/webpack:webpack",
      "outputs": ["{workspaceRoot}/apps/dev-brand-api/dist-test"],
      "options": {
        "target": "node",
        "compiler": "tsc",
        "outputPath": "apps/dev-brand-api/dist-test",
        "main": "apps/dev-brand-api/src/test-bootstrap.ts",
        "tsConfig": "apps/dev-brand-api/tsconfig.app.json",
        "assets": ["apps/dev-brand-api/src/assets"],
        "isolatedConfig": true,
        "webpackConfig": "apps/dev-brand-api/webpack.test-bootstrap.config.js"
      }
    },

    "test": {
      /* unchanged */
    },
    "typecheck": {
      /* unchanged */
    }
  }
}
```

### 3.4 `apps/e2e-diagnostics/project.json` (MODIFIED)

Add `dependsOn` so `nx test e2e-diagnostics` always rebuilds the test artifact first:

```jsonc
{
  "targets": {
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "dependsOn": ["dev-brand-api:build-test-bootstrap"], // ← NEW
      "options": {
        "jestConfig": "apps/e2e-diagnostics/jest.config.ts",
        "passWithNoTests": true,
        "runInBand": true
      }
    },
    "typecheck": {
      /* unchanged */
    }
  }
}
```

`implicitDependencies: ["dev-brand-api"]` stays (Nx graph metadata). Adding `dependsOn` is what actually triggers the build pre-test.

### 3.5 `apps/e2e-diagnostics/src/harness/nest-boot.ts` (MODIFIED)

Replace `loadAppModule()` only — `bootApp()` and `bootContext()` keep their existing shape:

```ts
import { join } from 'node:path';
import type { Type } from '@nestjs/common';

const TEST_BOOTSTRAP_PATH = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'dev-brand-api',
  'dist-test',
  'test-bootstrap.js'
);

function loadAppModule(): Type<unknown> {
  // Resolve via absolute path so Jest's module resolver does not re-route
  // through ts-paths or the swc transform. The artifact is already a fully
  // bundled CJS module — no further transformation is needed (or wanted).
  const mod = require(TEST_BOOTSTRAP_PATH) as { AppModule: Type<unknown> };
  if (!mod?.AppModule) {
    throw new Error(
      `[nest-boot] test-bootstrap.js did not export AppModule. ` +
        `Path resolved to: ${TEST_BOOTSTRAP_PATH}. ` +
        `Re-run \`nx build-test-bootstrap dev-brand-api\`.`
    );
  }
  return mod.AppModule;
}
```

Also add the bundle path to Jest's `transformIgnorePatterns` so swc-jest never touches the artifact (see §3.6).

### 3.6 `apps/e2e-diagnostics/jest.config.ts` (MODIFIED)

```ts
transformIgnorePatterns: [
  // Existing ESM-shipping deps whitelist stays — probes can still
  // touch uuid/chromadb/etc. directly if needed.
  '/node_modules/(?!(uuid|nanoid|chromadb|chromadb-default-embed|@langchain|langchain|@langgraph|p-queue|p-timeout|p-limit|p-retry)/)',
  // NEW: skip the pre-bundled test-bootstrap artifact entirely.
  '/apps/dev-brand-api/dist-test/',
],
```

### 3.7 `.gitignore` (MODIFIED)

```gitignore
apps/dev-brand-api/dist-test/
```

### 3.8 Orchestration (`npm run e2e`)

No script change required. Current flow:

```
npm run e2e
  → NODE_OPTIONS=--experimental-vm-modules nx test e2e-diagnostics
    → Nx resolves dependsOn → runs dev-brand-api:build-test-bootstrap first (cached on re-run)
      → webpack emits apps/dev-brand-api/dist-test/test-bootstrap.js
    → @nx/jest:jest runs apps/e2e-diagnostics/jest.config.ts
      → swc-jest compiles harness + probes (NOT the bundle)
      → harness loads dist-test/test-bootstrap.js (pre-bundled, CJS, ESM-deps inlined)
      → AppModule constructs cleanly — probes reach real lib code
```

---

## 4. Risk + Mitigations

| Risk                                                                                            | Likelihood | Impact | Mitigation                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `externalDependencies: 'none'` produces a giant bundle that takes too long to build             | M          | Low    | Build is cached by Nx — incremental re-runs use the cache. First-build cost is acceptable (one-time per branch). Mitigated further by `optimization: false` (no minification = faster).                                                     |
| A dep performs `require.resolve(__dirname)` and breaks when bundled                             | M          | M      | If it fails, fall back to `externalDependencies: ['some-pkg']` selectively for the offending dep. Document in commit message. The known-fragile deps (`onnxruntime-node`, native modules) are already not used by the AppModule's hot path. |
| `dist-test/` accidentally checked in                                                            | L          | Low    | `.gitignore` entry added. Pre-commit lint-staged ignores untracked.                                                                                                                                                                         |
| Build target name collision with future Nx generators                                           | L          | Low    | Name is explicit (`build-test-bootstrap`) and namespaced to dev-brand-api only.                                                                                                                                                             |
| Webpack inlines a dep that depends on env vars set at app start                                 | L          | M      | EnvLoader runs at the top of test-bootstrap.ts (before AppModule import). Matches production order.                                                                                                                                         |
| Top-level await inside an ESM dep prevents webpack from bundling it as sync CJS                 | L          | H      | Webpack handles TLA via `experiments.topLevelAwait: true` if needed. Add only if the build fails — current evidence shows no TLA in critical path.                                                                                          |
| Jest dependsOn doesn't fire because Nx version disagrees                                        | L          | Low    | Nx 22.5.2 (verified in root package.json) supports `dependsOn` on test target — standard Nx feature since v17.                                                                                                                              |
| Probes that intentionally test source-level behaviour (e.g. type-only files) lose source access | L          | Low    | AppModule is the runtime composition root — type-level testing is unaffected. Probes that need source must import via the e2e-diagnostics tsconfig path, not via AppModule.                                                                 |

---

## 5. Acceptance Criteria (decomposable into atomic tasks)

Each AC maps to one git-verifiable commit.

1. **AC-1**: `apps/dev-brand-api/src/test-bootstrap.ts` exists and exports `AppModule` and `EnvLoader`. `tsc --noEmit` on `dev-brand-api:typecheck` passes.
2. **AC-2**: `apps/dev-brand-api/webpack.test-bootstrap.config.js` exists with `externalDependencies: 'none'` and `output.path = dist-test/`.
3. **AC-3**: `apps/dev-brand-api/project.json` has a new `build-test-bootstrap` target using the new webpack config. `nx build-test-bootstrap dev-brand-api` succeeds and emits `apps/dev-brand-api/dist-test/test-bootstrap.js`.
4. **AC-4**: `grep -E "require\\(['\\\"]@langchain" apps/dev-brand-api/dist-test/test-bootstrap.js` returns **zero matches** (confirms ESM deps are inlined).
5. **AC-5**: `.gitignore` ignores `apps/dev-brand-api/dist-test/`. `git status` after a build is clean.
6. **AC-6**: `apps/e2e-diagnostics/src/harness/nest-boot.ts` loads the new artifact via absolute path, throws a descriptive error if missing.
7. **AC-7**: `apps/e2e-diagnostics/jest.config.ts` ignores `dist-test/` in `transformIgnorePatterns`.
8. **AC-8**: `apps/e2e-diagnostics/project.json` `test` target has `dependsOn: ["dev-brand-api:build-test-bootstrap"]`.
9. **AC-9**: `set -a && source apps/dev-brand-api/.env && set +a && npm run e2e` — all 12 probes boot AppModule (boot-phase ERR_REQUIRE_ESM is gone). Probe assertion outcomes may still differ but failures must originate inside real lib code, not at module-resolution time.
10. **AC-10**: Production `nx build dev-brand-api` and `nx serve dev-brand-api` produce identical output before and after this task (verified by `diff` of `dist/main.js`).

### Out of scope (do NOT touch)

- Any file under `libs/**`.
- Any production bootstrap path (`main.ts`, existing `webpack.config.js`, existing `build` target).
- The existing `.swcrc`, `tsconfig.app.json`, or `tsconfig.base.json`.

---

## 6. Team-Leader Handoff

**Developer type**: `backend-developer` — work is entirely Node/Nx/TypeScript build pipeline + harness wiring. No frontend, no design system.

**Complexity**: MEDIUM — 7 files touched, 1 net-new webpack config, no library code changes. Estimated 4–6 hours including verification.

**Files affected** (summary):

- **CREATE**: `apps/dev-brand-api/src/test-bootstrap.ts`, `apps/dev-brand-api/webpack.test-bootstrap.config.js`
- **MODIFY**: `apps/dev-brand-api/project.json`, `apps/e2e-diagnostics/src/harness/nest-boot.ts`, `apps/e2e-diagnostics/jest.config.ts`, `apps/e2e-diagnostics/project.json`, `.gitignore`
- **REWRITE**: none

**Critical verification points for the developer**:

1. Confirm `node_modules/@nx/webpack/src/plugins/nx-webpack-plugin/nx-app-webpack-plugin-options.d.ts` still documents `externalDependencies: 'none' | 'all' | string[]`.
2. After AC-3 build, run AC-4's grep and confirm zero matches.
3. After AC-8, run `nx test e2e-diagnostics --dry-run` and confirm Nx schedules `build-test-bootstrap` first.
4. Production parity (AC-10) is a hard gate — if `dist/main.js` byte-diffs after this task, something leaked into the prod path.

---

## 7. Architecture Delivery Checklist

- [x] Codebase investigated; ESM-externalisation in current `dist/main.js` confirmed by `grep`.
- [x] Node 22 `require(esm)` capability verified (`process.features.require_module === true`).
- [x] Nx `externalDependencies` option verified in `@nx/webpack` plugin options TS definition.
- [x] All 4 candidates scored on the requested rubric.
- [x] Chosen approach (#2) has explicit rationale grounded in evidence.
- [x] Detailed file-by-file design with before/after diffs.
- [x] Risks + mitigations enumerated.
- [x] 10 acceptance criteria atomically decomposable.
- [x] Out-of-scope guard rails restated.
- [x] No step-by-step implementation (left to team-leader).
- [x] No backward-compat layer, no v1/v2 — direct addition + harness in-place edit.
