# Implementation Plan — TASK_2025_066

## tslib ESM↔CJS Interop Fix for `webpack.test-bootstrap.config.js`

---

## Codebase Investigation Summary

### Evidence Gathered

**File under repair**: `apps/dev-brand-api/webpack.test-bootstrap.config.js`

- Currently sets `resolve.conditionNames: ['import', 'node', 'require', 'default']` (line 47) — `'import'` is FIRST.
- Currently uses `externalDependencies: OPTIONAL_PEERS` (array, line 76) → array form is supported by `NxAppWebpackPlugin`.

**`node_modules/tslib/package.json` exports map** (verified):

- `"main": "tslib.js"` — CJS entry with `var __extends = ...; exports.__extends = __extends;` (named CJS exports, no default).
- `"module": "tslib.es6.js"` — ESM entry with `export { __extends, __assign, ... }`.
- `exports["."]` chain prefers `tslib.es6.mjs` / `modules/index.js` when `import` condition wins.

**Root cause** (verified):

1. `conditionNames` puts `'import'` first → webpack resolves tslib to `modules/index.js` (ESM).
2. Bundle target is `commonjs2` → webpack wraps the ESM namespace in `__webpack_require__.n()` to expose a `.default`.
3. tslib's ESM module has only named exports, no `default`. The interop helper returns `{ a: undefined }` (no default → `.default = undefined`).
4. `tslib_1.default` is `undefined` → `const { __extends } = tslib_1.default` → `TypeError`.

**`tsconfig.app.json` evidence** (line 4): `"importHelpers": true` — TS emits `import tslib_1 from 'tslib'; tslib_1.__extends(...)` (default-import form under `module: nodenext`). This is what triggers the broken interop path.

---

## Decision: Option 3 — `resolve.alias` tslib to its CJS entry

**Selected**: Alias `tslib` → `tslib/tslib.js` (the CJS build) inside `webpack.test-bootstrap.config.js` ONLY.

### Justification (vs. alternatives)

| Option                                         | Verdict         | Why not                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Externalize tslib**                       | Rejected        | Leaves a runtime `require('tslib')` in the bundle. The test-bootstrap bundle's whole purpose (per file header comment lines 8–13) is to **inline** deps so Jest's CJS host doesn't hit `ERR_REQUIRE_ESM`. Externalizing tslib reintroduces a runtime resolution risk and breaks the bundle's self-containment invariant.                                                                                    |
| **2. `importHelpers: false` sibling tsconfig** | Rejected        | Requires a new `tsconfig.test-bootstrap.json` AND wiring it via `NxAppWebpackPlugin.tsConfig`. Bigger bundle (helpers inlined per-file × hundreds of files). Doesn't address the underlying interop bug — only hides it for this app's own emit, while transitive `node_modules` code that _also_ uses `tslib` (NestJS, RxJS, etc.) still hits the same broken interop. **Would not actually fix the bug.** |
| **3. `resolve.alias` tslib → CJS**             | ✅ **SELECTED** | One-line surgical fix. Forces webpack to resolve tslib to `tslib.js` (CJS, named exports + a `module.exports.__extends` shape). webpack's CJS interop on a CJS module produces a working namespace with all helpers. Fixes the bug for the app's emit AND all transitive `node_modules` users of tslib in one shot. Zero impact on production webpack config.                                               |
| **4. webpack output interop tweak**            | Rejected        | Marked "risky" in brief — confirmed. `output.interop` is undocumented for `commonjs2` and breaks other interop sites.                                                                                                                                                                                                                                                                                       |

### Why Option 3 works (mechanism)

- `resolve.alias` runs BEFORE `conditionNames` evaluation — it short-circuits the `exports` field resolution.
- `tslib/tslib.js` is the CJS UMD build with shape `module.exports.__extends = ...` (verified at `node_modules/tslib/tslib.js`).
- webpack's CJS-on-CJS interop: `tslib_1 = require('tslib/tslib.js')`; `tslib_1.__extends` is the real function. Default-import emit (`tslib_1.default.__extends`) is handled by webpack's `__esModule: false` interop path which falls back to the namespace itself when no `default` exists in `module.exports` — yielding the named members directly.

---

## Exact Webpack Config Diff

**File**: `/Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter/apps/dev-brand-api/webpack.test-bootstrap.config.js`

Replace the `resolve` block (lines 43–48) with:

```js
  resolve: {
    // Prefer the `import` condition so webpack can pull ESM-only packages
    // (e.g. file-type) into the bundle. Webpack 5 consumes ESM and emits CJS
    // for `target: 'node'`, which is exactly what this bundle needs.
    conditionNames: ['import', 'node', 'require', 'default'],
    // FIX (TASK_2025_066): force tslib to its CJS build. The default ESM
    // resolution (via `import` condition → tslib.es6.mjs) produces a
    // namespace with no `default` export; webpack's commonjs2 interop then
    // emits `tslib_1.default.__extends` which throws `__extends undefined`
    // at bundle init. Aliasing to tslib.js (CJS, named module.exports) makes
    // webpack's CJS-on-CJS interop resolve helpers correctly for this app's
    // emit AND every transitive node_modules consumer of tslib.
    alias: {
      tslib: require.resolve('tslib/tslib.js'),
    },
  },
```

**Everything else in the file is untouched.** No other edits, no new files.

---

## Verification Command Sequence

```bash
# 1. Rebuild the test-bootstrap bundle with the alias applied
npx nx build-test-bootstrap dev-brand-api

# 2. Confirm tslib is resolved to the CJS file in the emitted bundle
#    (look for `tslib.js` source markers, NOT `tslib.es6` / `modules/index`)
grep -c "tslib.es6" dist-test/apps/dev-brand-api/test-bootstrap.js   # expect 0
grep -c "modules/index" dist-test/apps/dev-brand-api/test-bootstrap.js | head -1
grep -c "__extends" dist-test/apps/dev-brand-api/test-bootstrap.js   # expect > 0

# 3. Sanity-load the bundle in pure Node (catches __extends crash without Jest noise)
node -e "require('./dist-test/apps/dev-brand-api/test-bootstrap.js')"
# expect: no `__extends undefined` TypeError at line 276

# 4. Run the 9 probes
set -a && source apps/dev-brand-api/.env && set +a && npm run e2e

# 5. Acceptance: probes either PASS or surface a NEW error category
#    (i.e. no probe fails with `Cannot destructure property '__extends'`)
```

---

## Risk Assessment

| Risk                                                                          | Likelihood | Severity | Mitigation                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------- | ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tslib/tslib.js` subpath blocked by tslib's `exports` field                   | Low        | Med      | Verified `node_modules/tslib/tslib.js` exists and is reachable as a file path. `require.resolve('tslib/tslib.js')` returns an absolute path, bypassing the `exports` map entirely (webpack alias uses the resolved path, not the package specifier).  |
| Helpers behave differently between ESM and CJS tslib builds                   | Very Low   | Low      | tslib's CJS and ESM builds are functionally identical — same helper bodies, only the export wrapper differs (verified in `tslib.js` vs `tslib.es6.js`).                                                                                               |
| Some bundled dep destructures `tslib` as ESM namespace and expects no default | Very Low   | Low      | tslib's CJS build sets named `module.exports.__extends` etc. + webpack synthesises an `__esModule` interop shim, so both `tslib.__extends` (CJS style) and `import { __extends } from 'tslib'` (ESM style) resolve correctly under webpack's interop. |
| Production webpack pipeline affected                                          | None       | —        | Edit is scoped to `webpack.test-bootstrap.config.js` only. `webpack.config.js` (production) untouched.                                                                                                                                                |
| `libs/**` affected                                                            | None       | —        | No library files edited.                                                                                                                                                                                                                              |
| TypeScript strict violation                                                   | None       | —        | No TS source edited; JS webpack config has no TS surface.                                                                                                                                                                                             |

**Rollback**: revert the single `alias` block addition in `webpack.test-bootstrap.config.js`. Zero blast radius.

---

## Files Affected Summary

**MODIFY**:

- `apps/dev-brand-api/webpack.test-bootstrap.config.js` — add 3-line `resolve.alias.tslib` block + comment.

**CREATE**: none.
**REWRITE**: none.

---

## Team-Leader Handoff

### Developer Recommendation: **backend-developer**

**Rationale**:

- Pure webpack config edit (Node/build tooling) — backend-developer's lane.
- No Angular/UI surface, no library code, no TS source.
- Single-file diff, ~5 lines added.

### Complexity Assessment

- **Complexity**: LOW
- **Estimated Effort**: 15–30 minutes (edit + 4-step verification + capture probe output)

### Critical Verification Points (for the developer)

1. **Confirm `require.resolve('tslib/tslib.js')` works at config-load time** — run `node -e "console.log(require.resolve('tslib/tslib.js'))"` from `apps/dev-brand-api/` before committing. Must print an absolute path ending in `node_modules/tslib/tslib.js`.
2. **Re-run `nx build-test-bootstrap dev-brand-api`** and grep the output bundle for `tslib.es6` (must be 0 occurrences) — proves the alias took effect.
3. **Run all 9 e2e probes** and confirm none fail with `Cannot destructure property '__extends'`. New failures (different error category) are ACCEPTABLE per task acceptance criteria.

### Architecture Delivery Checklist

- [x] Root cause identified with file:line evidence
- [x] All 4 candidate options evaluated against evidence
- [x] Selected option justified vs. alternatives
- [x] Exact diff specified (no ambiguity)
- [x] Verification sequence provided (4 commands)
- [x] Risk assessment with mitigations
- [x] Production pipeline confirmed untouched
- [x] `libs/**` confirmed untouched
- [x] Developer type recommended (backend-developer)
- [x] No commits made
