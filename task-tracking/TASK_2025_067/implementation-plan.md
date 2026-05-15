# Implementation Plan - TASK_2025_067

## Fix ClsRootModule DI Failure in e2e Context Boot

---

## 1. Confirmed Root Cause (Evidence)

### Symptom

9 Layer-2 / Layer-3 e2e probes fail with:

```
Nest can't resolve dependencies of the ClsRootModule (?, ModuleRef).
HttpAdapterHost at index [0] is not available in the ClsRootModule context.
```

### Root Cause

`ClsRootModule` (from `nestjs-cls@6.1.0`) **unconditionally injects `HttpAdapterHost` as a constructor parameter**, regardless of mount configuration.

**Evidence A — ClsRootModule constructor signature:**
File: `node_modules/nestjs-cls/dist/src/lib/cls-module/cls-root.module.js:30`

```js
constructor(adapterHost, moduleRef) {
    this.adapterHost = adapterHost;
    this.moduleRef = moduleRef;
}
```

File: `node_modules/nestjs-cls/dist/src/lib/cls-module/cls-root.module.js:190`

```js
__metadata('design:paramtypes', [core_1.HttpAdapterHost, core_1.ModuleRef]);
```

The `HttpAdapterHost` dependency is at constructor index `[0]` — exactly matching the error message.

**Evidence B — HttpAdapterHost only registered by HTTP factory:**
`HttpAdapterHost` (`node_modules/@nestjs/core/helpers/http-adapter-host.d.ts:15`) is provided by `NestFactory.create()` via the platform adapter (Express/Fastify). `NestFactory.createApplicationContext()` skips platform-adapter registration → no `HttpAdapterHost` provider in the DI container → ClsRootModule constructor injection fails.

**Evidence C — `middleware.mount` is checked AFTER DI resolution:**
File: `cls-root.module.js:34-42` — `configure()` reads `options.mount` _after_ the module is constructed. So setting `middleware: { mount: false }` does **not** prevent the constructor injection. The flag only suppresses the actual middleware wiring during `configure()`.

**Evidence D — Affected probes use `bootContext()`:**
9 probe files import `bootContext` from `apps/e2e-diagnostics/src/harness/nest-boot.ts:148` which calls `NestFactory.createApplicationContext()`:

- `layer-2-libs/core.probe.ts`
- `layer-2-libs/chromadb.probe.ts`
- `layer-2-libs/neo4j.probe.ts`
- `layer-2-libs/memory.probe.ts`
- `layer-2-libs/hitl.probe.ts`
- `layer-2-libs/workflow-engine.probe.ts`
- `layer-2-libs/monitoring.probe.ts`
- `layer-3-rag/full-rag-flow.probe.ts`
- (one more under layer-2 — total 9 confirmed via grep)

`bootApp()` (Layer-1 boot probe) works fine because `NestFactory.create()` registers `HttpAdapterHost`.

### Current AppModule Config (for reference)

File: `apps/dev-brand-api/src/app/app.module.ts:108-123`

```ts
ClsModule.forRoot({
  global: true,
  middleware: {
    mount: true,
    setup: (cls, req) => { /* sets ipAddress, sessionId */ },
  },
}),
```

Production uses HTTP middleware mounting — must not change.

---

## 2. Candidate Evaluation

### Candidate 1 — Switch Layer-2 probes to `bootApp()`

**Pros:** Zero source-side change. Uses identical boot path as Layer-1.
**Cons:**

- Spins up Express HTTP server per probe (9 probes × ~3s boot = ~27s added per run).
- HTTP server binding can race / leak ports under Jest workers.
- Diverges from harness design intent ("Layer 2 only needs DI resolution" — `nest-boot.ts:11`).
- Layer-3 RAG probe also affected → same cost penalty.
  **Blast radius:** e2e suite runtime + port-binding flakiness.
  **Prod impact:** None.
  **Verdict:** Functional but heavyweight. Reject.

### Candidate 2 — `ClsModule` config flags (`middleware.mount: false`, etc.)

**Pros:** Single-line config tweak in theory.
**Cons:** **DOES NOT WORK.** The `HttpAdapterHost` injection is in the `ClsRootModule` class constructor metadata (`cls-root.module.js:190`) — it is resolved by Nest's DI _before_ the `configure()` method ever reads the `mount` flag. The flag only suppresses middleware _wiring_, not the dependency declaration. Confirmed against `nestjs-cls@6.1.0` source.
**Blast radius:** N/A.
**Prod impact:** Would break CLS middleware in production if it did work.
**Verdict:** Invalid candidate — eliminated by source inspection. Reject.

### Candidate 3 — Stub `HttpAdapterHost` in `bootContext()` ⭐ RECOMMENDED

**Pros:**

- e2e-only fix in `apps/e2e-diagnostics/src/harness/nest-boot.ts` — zero touch on `apps/dev-brand-api/**`.
- Zero production impact (harness file is not compiled into the API).
- `HttpAdapterHost` is a plain class with an optional `_httpAdapter` field; a bare `new HttpAdapterHost()` satisfies the constructor injection.
- Safe because `ClsRootModule.configure()` only dereferences `adapterHost.httpAdapter` when `options.mount === true`. Under `bootContext()` Nest's middleware consumer pipeline doesn't run (no HTTP platform) → `configure()` may not even be invoked, and even if it is, the production `mount: true` config means it would try to access `.httpAdapter` — needs verification (see Note below).
- Uses Nest's standard provider-override mechanism: `Module.overrideProvider(HttpAdapterHost).useValue(...)` — well-trodden pattern.
  **Cons:**
- Adds 5-10 lines to harness. Requires `Test` module override from `@nestjs/testing` OR a custom module wrapper.
- Slight risk: if any _other_ code path in any imported module eagerly accesses `httpAdapterHost.httpAdapter` during `onModuleInit`, the stub would surface a `null`. Mitigated by the stub returning a minimal-no-op adapter shape _only if_ runtime probe shows this is needed.
  **Blast radius:** harness file only.
  **Prod impact:** None.
  **Verdict:** ✅ Selected.

**Note on `configure()`:** Under `createApplicationContext()`, Nest does NOT invoke `MiddlewareConsumer` pipelines (verified by Nest source — `NestApplicationContext` does not implement the HTTP middleware lifecycle). So even with `mount: true` in the prod config, `ClsRootModule.configure()` will not run in context-only boot → the stub is never dereferenced. If a future Nest change alters this, the fallback is to pass a stub adapter object (`{ httpAdapter: { use: () => {}, getType: () => 'express' } as any }`).

### Candidate 4 — Conditional `ClsModule` import in AppModule

**Pros:** Removes the dependency entirely in test mode.
**Cons:**

- Touches production composition root — high blast radius.
- Introduces NODE_ENV branching → AppModule no longer "bit-for-bit what `start:dev-brand-api` produces" (violates harness design principle, `nest-boot.ts:14-18`).
- Probes that exercise security decorators relying on CLS would silently no-op — false-positive PASS risk.
- Adds maintenance footgun (a future dev imports CLS again, breaks the flag).
  **Blast radius:** prod AppModule, all CLS consumers.
  **Prod impact:** Indirect risk (test divergence).
  **Verdict:** Reject.

---

## 3. Recommended Fix

**Candidate 3** — Provide a stub `HttpAdapterHost` in `bootContext()` via `Test.createTestingModule(...).overrideProvider(HttpAdapterHost).useValue(new HttpAdapterHost()).compile()`.

This satisfies the user constraint _"prefer NOT touching app.module.ts if viable"_, keeps production untouched, and isolates the fix to e2e-only infrastructure.

### Why a stub instance, not a mock object

`HttpAdapterHost` is a concrete class with internal RxJS subjects (`_listen$`, `_init$`). Instantiating it bare gives a valid type identity and won't crash if anything inspects the prototype. Empty internal state is fine because `createApplicationContext()` never triggers the HTTP lifecycle that would publish to those subjects.

---

## 4. Exact Diff

**File:** `apps/e2e-diagnostics/src/harness/nest-boot.ts`

```diff
@@
 import type {
   INestApplication,
   INestApplicationContext,
   Type,
 } from '@nestjs/common';
 import { ValidationPipe } from '@nestjs/common';
-import { NestFactory } from '@nestjs/core';
+import { HttpAdapterHost, NestFactory } from '@nestjs/core';
+import { Test } from '@nestjs/testing';
 import cookieParser from 'cookie-parser';
@@
 /**
  * Boot the real `AppModule` as an application context (DI container
  * only — no HTTP server, no platform adapters). Suitable for Layers 2
  * and 3 where probes resolve services via `context.get(Token)` and
  * never make HTTP calls into the app.
  *
  * Callers MUST call `context.close()` in a `finally` block.
+ *
+ * `HttpAdapterHost` override:
+ * `AppModule` imports `ClsModule.forRoot(...)` which (in nestjs-cls@6.1.0)
+ * declares `HttpAdapterHost` as a constructor dependency of `ClsRootModule`.
+ * `NestFactory.createApplicationContext()` does NOT register an HTTP
+ * platform adapter, so the `HttpAdapterHost` provider is missing and DI
+ * fails before any probe can resolve a single service.
+ *
+ * We override it with a bare `HttpAdapterHost` instance. The override is
+ * safe because `createApplicationContext()` never runs the middleware
+ * consumer pipeline, so `ClsRootModule.configure()` (the only code path
+ * that would dereference `httpAdapter`) is never invoked.
+ *
+ * This is an e2e-only workaround — production boot uses `NestFactory.create()`
+ * which provides the real `HttpAdapterHost` via the Express platform adapter.
  */
 export async function bootContext(): Promise<INestApplicationContext> {
-  // See `bootApp` — `abortOnError: false` prevents NestFactory from
-  // calling `process.exit(1)` on bootstrap failure, which is required
-  // for probe isolation under Jest.
-  return NestFactory.createApplicationContext(loadAppModule(), {
-    logger: false,
-    abortOnError: false,
-  });
+  // See `bootApp` — `abortOnError: false` prevents NestFactory from
+  // calling `process.exit(1)` on bootstrap failure, which is required
+  // for probe isolation under Jest.
+  const moduleRef = await Test.createTestingModule({
+    imports: [loadAppModule()],
+  })
+    .overrideProvider(HttpAdapterHost)
+    .useValue(new HttpAdapterHost())
+    .compile();
+
+  return moduleRef.createNestApplicationContext({
+    logger: false,
+    abortOnError: false,
+  });
 }
```

### Notes for the developer

- `@nestjs/testing` is already a workspace dependency (used by existing unit tests). If `apps/e2e-diagnostics/package.json` doesn't currently list it directly, verify the resolution and add it as a `devDependency` if needed (likely already resolved transitively via the root workspace).
- `moduleRef.createNestApplicationContext(options)` is the standard `@nestjs/testing` API for producing an `INestApplicationContext` from a `TestingModule` — preserves `logger: false` and `abortOnError: false` semantics.
- Do NOT add `overrideProvider` calls for anything else — keep the override surface minimal to preserve "bit-for-bit AppModule" fidelity.

---

## 5. Acceptance Criteria

1. ✅ `npm run e2e` no longer reports `HttpAdapterHost at index [0] is not available in the ClsRootModule context` for any probe.
2. ✅ All 9 previously-failing Layer-2 / Layer-3 probes either PASS or fail with a _new, different_ error category (e.g. service-level assertion failures, infra connectivity). Progressing past ClsRootModule DI is the bar.
3. ✅ Layer-1 boot probe (`dev-brand-api-boot.probe.ts`, uses `bootApp()`) remains unaffected — same pass/fail result as before this change.
4. ✅ `npm run start:dev-brand-api` (production composition root) is untouched — verify by `git status` showing zero changes under `apps/dev-brand-api/**`.
5. ✅ TypeScript strict: `npx nx typecheck e2e-diagnostics` passes.
6. ✅ Lint: `npm run lint:fix` reports no new violations in `nest-boot.ts`.

---

## 6. Rollback

Single-file change. Rollback:

```bash
git checkout HEAD -- apps/e2e-diagnostics/src/harness/nest-boot.ts
```

No DB migrations, no config changes, no library edits, no production code touched.

---

## 7. Files Affected

**MODIFY (1 file):**

- `apps/e2e-diagnostics/src/harness/nest-boot.ts` — add `HttpAdapterHost` override in `bootContext()` via `@nestjs/testing`.

**UNCHANGED (explicitly):**

- `apps/dev-brand-api/src/app/app.module.ts` — production composition root preserved.
- `libs/**` — off-limits per constraints.
- All 9 probe files — no changes; they continue calling `bootContext()` with the same signature.

---

## 8. Team-Leader Handoff

**Recommended Developer:** backend-developer
**Rationale:** NestJS DI / testing-module work, no UI.
**Complexity:** LOW (S — single-file, ~15 lines added).
**Estimated effort:** 30-45 minutes (10 min edit, 10 min typecheck/lint, 15-25 min running e2e suite to verify acceptance criteria).

**Critical verification points before commit:**

1. Confirm `@nestjs/testing` resolves at `apps/e2e-diagnostics` (run `node -e "require.resolve('@nestjs/testing')"` from that dir).
2. Run `npm run e2e` and capture: error count by category before vs after. The ClsRootModule error must disappear from all 9 probes.
3. If a probe newly fails with `Cannot read properties of undefined (reading 'httpAdapter')`, fall back to richer stub (see "Note on `configure()`" in §2 Candidate 3) — pass `{ httpAdapter: { use: () => {}, getType: () => 'express' } } as any` to `useValue`.

**No commits during implementation** — user approves each commit per task workflow.
