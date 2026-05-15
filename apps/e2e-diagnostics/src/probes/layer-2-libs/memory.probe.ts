/**
 * Layer 2 — langgraph-memory diagnostic probe.
 *
 * Verifies the `@hive-academy/langgraph-memory` library is wired into
 * the real `dev-brand-api` composition root AND that a store →
 * retrieve round-trip preserves payload integrity exactly (Req 3.4).
 *
 * The memory module's public surface (per its CLAUDE.md) is the
 * LangGraph `BaseStore` interface, injected via `BASE_STORE_TOKEN`.
 * `put(namespace, key, value)` / `get(namespace, key)` is the
 * canonical API; we exercise both and deep-equal the round-tripped
 * payload against the original.
 *
 * Why chromadb-preflight gate: the bound `BaseStore` is
 * `ChromaDBBaseStore` which persists through `LangGraphStoreRepository`
 * → ChromaDB. If Chroma is unreachable the probe cannot meaningfully
 * distinguish "memory library broken" from "underlying vector store
 * down" — short-circuit to SKIPPED so the report attributes the fault
 * to the right layer.
 *
 * Behaviour matrix:
 *  - preflight.chromadb === 'unreachable' → SKIPPED
 *  - `BASE_STORE_TOKEN` not resolvable → MISSING
 *  - put + get round-trip with deep-equal payload → PASS
 *  - shape mismatch / thrown error → FAIL with stack
 *
 * Cleanup: best-effort `delete(namespace, key)` in a `finally` block.
 */

import { performance } from 'node:perf_hooks';
import { isDeepStrictEqual } from 'node:util';

import type { INestApplicationContext } from '@nestjs/common';

import type {
  LibraryId,
  Probe,
  ProbeLayer,
  ProbeResult,
  RunContext,
} from '../../contracts';
import { bootContext } from '../../harness/nest-boot';

/**
 * Minimal structural slice of LangGraph's `BaseStore` shape that this
 * probe needs. Mirrors the `put/get/delete` triple documented in
 * libs/langgraph-modules/memory/CLAUDE.md and implemented by
 * `ChromaDBBaseStore`.
 *
 * `Item.value` is typed as `Record<string, unknown>` because that's
 * what `ChromaDBBaseStore.put` accepts and what `.get()` reconstructs
 * — `unknown` would force the probe into ad-hoc narrowing and lose
 * the deep-equal precision we need.
 */
interface StoreItemLike {
  readonly value: Record<string, unknown>;
}
interface BaseStoreLike {
  put(
    namespace: readonly string[],
    key: string,
    value: Record<string, unknown>
  ): Promise<void>;
  get(namespace: readonly string[], key: string): Promise<StoreItemLike | null>;
  delete(namespace: readonly string[], key: string): Promise<void>;
}

/**
 * `BASE_STORE_TOKEN` is a `Symbol` (per memory's index.ts), not a
 * class, so we cannot use `Type<>` here — load and return the symbol
 * directly. The DI container accepts both `Type` and `Symbol` tokens.
 */
function loadBaseStoreToken(): symbol {
  const mod = require('@hive-academy/langgraph-memory') as {
    BASE_STORE_TOKEN: symbol;
  };
  return mod.BASE_STORE_TOKEN;
}

function toErrorInfo(err: unknown): {
  readonly message: string;
  readonly stack: string;
} {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack ?? err.message };
  }
  const message = typeof err === 'string' ? err : JSON.stringify(err);
  return { message, stack: message };
}

function tryResolveStore(ctx: INestApplicationContext): BaseStoreLike | null {
  try {
    return ctx.get<BaseStoreLike>(loadBaseStoreToken(), { strict: false });
  } catch {
    return null;
  }
}

export class MemoryProbe implements Probe {
  public readonly name = 'langgraph-memory/store-retrieve-roundtrip';
  public readonly layer: ProbeLayer = 2;
  public readonly suspectedLib: LibraryId = 'langgraph-memory';

  public async run(ctx: RunContext): Promise<ProbeResult> {
    // --- Preflight gate -----------------------------------------------
    // BaseStore is ChromaDB-backed; if Chroma is down the probe can't
    // attribute fault correctly. Mirror chromadb.probe.ts behaviour.
    if (ctx.preflight.chromadb === 'unreachable') {
      return {
        status: 'SKIPPED',
        name: this.name,
        layer: this.layer,
        suspectedLib: this.suspectedLib,
        reason:
          'preflight reported chromadb unreachable — memory module persists through ChromaDB, see preflight row for the underlying fault',
      };
    }

    const start = performance.now();
    let appCtx: INestApplicationContext | undefined;

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

    // Namespace is an array per the BaseStore contract. We use the
    // run-scoped `ctx.namespace(...)` for the leaf segment so the
    // FixtureCleaner's `e2e-` sweep can reap stragglers.
    const namespace: readonly string[] = [
      'e2e-diagnostics',
      ctx.namespace('memory'),
    ];
    const key = `${ctx.runId}-roundtrip`;
    // Payload deliberately includes nested objects, arrays, and
    // multiple primitive types so deep-equal failure modes (key
    // re-ordering, primitive coercion, array→object collapse) all get
    // covered by a single assertion.
    const payload: Record<string, unknown> = {
      runId: ctx.runId,
      probe: 'langgraph-memory',
      counts: { total: 3, nested: { deep: true } },
      tags: ['e2e', 'diagnostic', 'round-trip'],
      flag: false,
    };
    let stored = false;

    try {
      // --- Phase 1: resolve BaseStore via DI --------------------------
      const store = tryResolveStore(appCtx);
      if (store === null) {
        return {
          status: 'MISSING',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          expected: 'BASE_STORE_TOKEN provider (BaseStore)',
          observedIn: 'dev-brand-api AppModule (MemoryModule)',
        };
      }

      // --- Phase 2: put the payload -----------------------------------
      await store.put(namespace, key, payload);
      stored = true;

      // --- Phase 3: get it back ---------------------------------------
      const item = await store.get(namespace, key);
      if (item === null) {
        return {
          status: 'FAIL',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          durationMs: performance.now() - start,
          error: {
            message: `store.get returned null immediately after store.put — write did not persist or namespace/key mismatch`,
            stack: `namespace=${namespace.join('/')} key=${key} runId=${
              ctx.runId
            }`,
          },
        };
      }

      // --- Phase 4: deep-equal the payload ---------------------------
      // `isDeepStrictEqual` is Node's structural equality (Map/Set
      // aware, NaN-aware, property-order-independent). Anything less
      // strict would let object-key reordering slip past.
      if (!isDeepStrictEqual(item.value, payload)) {
        return {
          status: 'FAIL',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          durationMs: performance.now() - start,
          error: {
            message: 'round-tripped payload does not deep-equal the original',
            stack: `expected=${JSON.stringify(payload)} got=${JSON.stringify(
              item.value
            )} runId=${ctx.runId}`,
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
      if (stored) {
        try {
          const store = tryResolveStore(appCtx);
          if (store !== null) {
            await store.delete(namespace, key);
          }
        } catch {
          /* best-effort cleanup — sweep handles stragglers */
        }
      }
      try {
        await appCtx.close();
      } catch {
        /* best-effort teardown */
      }
    }
  }
}
