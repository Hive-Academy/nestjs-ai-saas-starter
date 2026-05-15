/**
 * Layer 2 — ChromaDB diagnostic probe.
 *
 * Verifies the `@hive-academy/nestjs-chromadb` library is wired into
 * the real `dev-brand-api` composition root AND that an end-to-end
 * round-trip — create collection → embed one document → query →
 * non-empty match — actually works against the live ChromaDB
 * instance.
 *
 * Why a round-trip and not just a heartbeat: preflight already covers
 * "service reachable". This probe's value is in catching the next
 * layer of breakage — embeddings misconfigured, collection API drift,
 * search returning nothing for a near-exact match. A heartbeat would
 * miss every one of those.
 *
 * Behaviour matrix (Req NFR-reliability):
 *  - preflight.chromadb === 'unreachable' → SKIPPED (never FAIL; infra
 *    fault is not a library fault)
 *  - `ChromaDBService` not registered in the DI container → MISSING
 *    with `expected` + `observedIn` populated. We do NOT type-cast our
 *    way around a missing provider — that would silently mask the
 *    real wiring bug.
 *  - round-trip succeeds → PASS with wall-clock duration
 *  - any other thrown error → FAIL with stack captured
 *
 * Fixtures are namespaced by `ctx.namespace(...)` and torn down in a
 * `finally` block so concurrent / interrupted runs cannot collide.
 */

import { performance } from 'node:perf_hooks';

import type { INestApplicationContext, Type } from '@nestjs/common';

import type {
  LibraryId,
  Probe,
  ProbeLayer,
  ProbeResult,
  RunContext,
} from '../../contracts';
import { bootContext } from '../../harness/nest-boot';

/**
 * Minimal structural type for the slice of `ChromaDBService` this
 * probe uses. Declared locally so the e2e-diagnostics tsconfig does
 * NOT transitively type-check the entire `@hive-academy/nestjs-chromadb`
 * source tree (which carries pre-existing TS6133 violations outside
 * this suite's scope — same rationale as `nest-boot.ts`).
 *
 * Runtime behaviour is identical to importing `ChromaDBService`
 * directly; only the compile-time graph is trimmed.
 */
interface ChromaDbServiceLike {
  createCollection(options: { name: string }): Promise<unknown>;
  addDocuments(
    collectionName: string,
    documents: ReadonlyArray<{
      id: string;
      content: string;
      metadata: Readonly<Record<string, string>>;
    }>
  ): Promise<unknown>;
  searchDocuments(
    collectionName: string,
    queryTexts: readonly string[],
    queryEmbeddings: undefined,
    options: { nResults: number }
  ): Promise<{ ids?: ReadonlyArray<readonly string[]> }>;
  deleteCollection(name: string): Promise<unknown>;
}

/**
 * Load the `ChromaDBService` class via `require()` (mirroring
 * `loadAppModule` in `nest-boot.ts`) to use as a DI token without
 * pulling its full type graph into our type-check.
 */
function loadChromaDbServiceToken(): Type<ChromaDbServiceLike> {
  const mod = require('@hive-academy/nestjs-chromadb') as {
    ChromaDBService: Type<ChromaDbServiceLike>;
  };
  return mod.ChromaDBService;
}

/**
 * Coerce an unknown thrown value into the `{ message, stack }` shape
 * the FAIL variant requires. Mirrors the helper in the Layer 1 probe;
 * not extracted to a shared util yet because only two call sites
 * exist (rule of three — extract on the next probe that needs it).
 */
function toErrorInfo(err: unknown): {
  readonly message: string;
  readonly stack: string;
} {
  if (err instanceof Error) {
    return {
      message: err.message,
      stack: err.stack ?? err.message,
    };
  }
  const message = typeof err === 'string' ? err : JSON.stringify(err);
  return { message, stack: message };
}

/**
 * Resolve `ChromaDBService` from the running DI container. Returns
 * `null` (not throw) when the provider is absent — the caller turns
 * that into a MISSING result, not a FAIL, because "service not
 * registered" is a wiring problem, not a runtime exception.
 *
 * We pass `{ strict: false }` so Nest walks the global module tree
 * rather than throwing on the very first module-scope miss; the
 * `ChromaDBModule` registers `ChromaDBService` globally via
 * `@Global()`, but being defensive here costs nothing.
 */
function tryResolveChromaDb(
  ctx: INestApplicationContext
): ChromaDbServiceLike | null {
  try {
    const token = loadChromaDbServiceToken();
    return ctx.get<ChromaDbServiceLike>(token, { strict: false });
  } catch {
    return null;
  }
}

export class ChromaDbProbe implements Probe {
  public readonly name = 'nestjs-chromadb/round-trip';
  public readonly layer: ProbeLayer = 2;
  public readonly suspectedLib: LibraryId = 'nestjs-chromadb';

  public async run(ctx: RunContext): Promise<ProbeResult> {
    // --- Preflight gate -----------------------------------------------
    // If ChromaDB itself is unreachable, this probe cannot meaningfully
    // distinguish "library broken" from "infra down" — short-circuit
    // to SKIPPED so the report attributes the fault correctly.
    if (ctx.preflight.chromadb === 'unreachable') {
      return {
        status: 'SKIPPED',
        name: this.name,
        layer: this.layer,
        suspectedLib: this.suspectedLib,
        reason:
          'preflight reported chromadb unreachable — see preflight row for the underlying network/auth fault',
      };
    }

    const start = performance.now();
    let appCtx: INestApplicationContext | undefined;

    // --- Phase 1: boot DI container -----------------------------------
    // `createApplicationContext` is cheaper than a full HTTP app (no
    // platform adapter, no listener) and is all we need to resolve
    // providers.
    try {
      appCtx = await bootContext();
    } catch (err) {
      return {
        status: 'FAIL',
        name: this.name,
        layer: this.layer,
        suspectedLib: this.suspectedLib,
        durationMs: performance.now() - start,
        error: toErrorInfo(err),
      };
    }

    // Collection name MUST be lower-case + dash-separated to satisfy
    // ChromaDB's regex. `ctx.namespace()` already enforces a safe
    // alphabet (`e2e-${runId}-${suffix}`).
    const collectionName = `${ctx.namespace('chromadb')}-collection`;
    let collectionCreated = false;

    try {
      // --- Phase 2: resolve service via DI ----------------------------
      const chromaDb = tryResolveChromaDb(appCtx);
      if (chromaDb === null) {
        return {
          status: 'MISSING',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          expected: 'ChromaDBService DI provider',
          observedIn: 'dev-brand-api AppModule',
        };
      }

      // --- Phase 3: create namespaced collection ----------------------
      await chromaDb.createCollection({ name: collectionName });
      collectionCreated = true;

      // --- Phase 4: embed one document --------------------------------
      // Single-doc payload is intentional — we want the cheapest
      // possible round-trip that still exercises embedding +
      // persistence + search. Larger batches are a Layer 3 concern.
      await chromaDb.addDocuments(collectionName, [
        {
          id: `${ctx.runId}-doc-1`,
          content: 'diagnostic probe document',
          metadata: { source: 'e2e-diagnostics', runId: ctx.runId },
        },
      ]);

      // --- Phase 5: query and assert non-empty match -----------------
      // ChromaDB's `searchDocuments` returns the native QueryResult,
      // where `ids` is a 2D array: outer dim = query (we sent one),
      // inner dim = matches for that query. Empty inner array means
      // "library returned a shape but found nothing" — that's a FAIL,
      // not a PASS, because we just added a near-exact match.
      const result = await chromaDb.searchDocuments(
        collectionName,
        ['diagnostic'],
        undefined,
        { nResults: 1 }
      );
      const matches = result.ids?.[0] ?? [];
      if (matches.length === 0) {
        return {
          status: 'FAIL',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          durationMs: performance.now() - start,
          error: {
            message:
              'searchDocuments returned 0 matches for an exact-substring query against a freshly-inserted doc',
            stack: `collection=${collectionName} runId=${ctx.runId}`,
          },
        };
      }

      return {
        status: 'PASS',
        name: this.name,
        layer: this.layer,
        suspectedLib: this.suspectedLib,
        durationMs: performance.now() - start,
      };
    } catch (err) {
      return {
        status: 'FAIL',
        name: this.name,
        layer: this.layer,
        suspectedLib: this.suspectedLib,
        durationMs: performance.now() - start,
        error: toErrorInfo(err),
      };
    } finally {
      // --- Cleanup: delete collection, then close DI context ----------
      // Both wrapped in their own try/catch — cleanup failure must
      // never overwrite the diagnostic result.
      if (collectionCreated) {
        try {
          const chromaDb = tryResolveChromaDb(appCtx);
          if (chromaDb !== null) {
            await chromaDb.deleteCollection(collectionName);
          }
        } catch {
          /* best-effort — fixture cleanup is not the probe's verdict */
        }
      }
      try {
        await appCtx.close();
      } catch {
        /* best-effort — context teardown is not the probe's verdict */
      }
    }
  }
}
