/**
 * Layer 2 — Neo4j diagnostic probe.
 *
 * Verifies the `@hive-academy/nestjs-neo4j` library is wired into the
 * real `dev-brand-api` composition root AND that an end-to-end graph
 * round-trip — create two nodes → create one relationship → traverse →
 * assert relationship returned — actually works against the live Neo4j
 * instance.
 *
 * Why a round-trip and not just `verifyConnectivity`: preflight already
 * covers connectivity. The next layer of breakage — Cypher syntax
 * drift, Neogma metadata bugs, parameter binding regressions, write
 * permission misconfiguration — only shows up when you actually write
 * something. This probe catches those.
 *
 * Behaviour matrix (Req NFR-reliability):
 *  - preflight.neo4j === 'unreachable' → SKIPPED
 *  - `NeogmaService` not registered in DI → MISSING with diagnostic
 *    `expected` + `observedIn`
 *  - round-trip succeeds → PASS
 *  - any thrown error → FAIL with stack
 *
 * Fixtures use the label `E2E_${runId}_Probe` so concurrent runs never
 * collide AND so a stuck/orphaned run can be reaped by a bulk
 * `MATCH (n) WHERE any(l in labels(n) WHERE l STARTS WITH 'E2E_') DETACH DELETE n`.
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
 * Minimal structural slice of `NeogmaService` this probe uses.
 * Declared locally so the e2e-diagnostics tsconfig does NOT
 * transitively type-check the entire `@hive-academy/nestjs-neo4j`
 * source tree (which carries pre-existing TS6133 violations outside
 * this suite's scope — same rationale as `nest-boot.ts`).
 */
interface Neo4jRecordLike {
  get(key: string): unknown;
}
interface Neo4jQueryResultLike {
  records: readonly Neo4jRecordLike[];
}
interface NeogmaServiceLike {
  run(
    cypher: string,
    params?: Readonly<Record<string, unknown>>
  ): Promise<Neo4jQueryResultLike>;
}

/**
 * Load the `NeogmaService` class via `require()` (mirroring
 * `loadAppModule` in `nest-boot.ts`) to use as a DI token without
 * pulling its full type graph into our type-check.
 */
function loadNeogmaServiceToken(): Type<NeogmaServiceLike> {
  const mod = require('@hive-academy/nestjs-neo4j') as {
    NeogmaService: Type<NeogmaServiceLike>;
  };
  return mod.NeogmaService;
}

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
 * Resolve `NeogmaService` from DI. Returns `null` rather than throwing
 * so the caller can emit MISSING (a wiring fault) instead of FAIL (a
 * runtime fault).
 */
function tryResolveNeogma(
  ctx: INestApplicationContext
): NeogmaServiceLike | null {
  try {
    const token = loadNeogmaServiceToken();
    return ctx.get<NeogmaServiceLike>(token, { strict: false });
  } catch {
    return null;
  }
}

/**
 * Build the fixture label for this run. Neo4j labels must start with a
 * letter — `E2E_` prefix keeps us legal regardless of how `runId` is
 * generated. Suffix `_Probe` keeps the label searchable in browser
 * UIs.
 */
function fixtureLabel(runId: string): string {
  // Strip anything non-alphanumeric from runId — labels can't carry
  // dashes. `DefaultRunContext` uses ISO-ish ids so dashes are likely.
  const safe = runId.replace(/[^A-Za-z0-9]/g, '_');
  return `E2E_${safe}_Probe`;
}

export class Neo4jProbe implements Probe {
  public readonly name = 'nestjs-neo4j/round-trip';
  public readonly layer: ProbeLayer = 2;
  public readonly suspectedLib: LibraryId = 'nestjs-neo4j';

  public async run(ctx: RunContext): Promise<ProbeResult> {
    // --- Preflight gate -----------------------------------------------
    if (ctx.preflight.neo4j === 'unreachable') {
      return {
        status: 'SKIPPED',
        name: this.name,
        layer: this.layer,
        suspectedLib: this.suspectedLib,
        reason:
          'preflight reported neo4j unreachable — see preflight row for the underlying network/auth fault',
      };
    }

    const start = performance.now();
    let appCtx: INestApplicationContext | undefined;

    // --- Phase 1: boot DI container -----------------------------------
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

    const label = fixtureLabel(ctx.runId);
    let fixturesCreated = false;

    try {
      // --- Phase 2: resolve service via DI ----------------------------
      const neogma = tryResolveNeogma(appCtx);
      if (neogma === null) {
        return {
          status: 'MISSING',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          expected: 'NeogmaService DI provider',
          observedIn: 'dev-brand-api AppModule',
        };
      }

      // --- Phase 3: create 2 nodes + 1 relationship -------------------
      // Label cannot be parameter-bound in Cypher (it's part of the
      // query plan, not a value) — but we built it ourselves from
      // alphanumerics only, so it's not user-tainted. The IDs ARE
      // bound as parameters.
      await neogma.run(
        `CREATE (a:${label} { id: $aId })-[:PROBES]->(b:${label} { id: $bId })`,
        { aId: `${ctx.runId}-a`, bId: `${ctx.runId}-b` }
      );
      fixturesCreated = true;

      // --- Phase 4: traverse, assert relationship returned -----------
      const traversal = await neogma.run(
        `MATCH (a:${label})-[r:PROBES]->(b:${label}) RETURN a, r, b LIMIT 1`
      );
      if (traversal.records.length === 0) {
        return {
          status: 'FAIL',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          durationMs: performance.now() - start,
          error: {
            message:
              'traversal returned 0 records immediately after creating the (a)-[:PROBES]->(b) fixture',
            stack: `label=${label} runId=${ctx.runId}`,
          },
        };
      }
      // Defensive: confirm the returned `r` is actually the relationship
      // we wrote, not just any side effect. Neogma's run() returns
      // neo4j-driver records — `.get('r')` must be defined.
      const rel = traversal.records[0]?.get('r');
      if (rel === undefined || rel === null) {
        return {
          status: 'FAIL',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          durationMs: performance.now() - start,
          error: {
            message:
              "traversal record returned but `.get('r')` is null/undefined — relationship not materialised",
            stack: `label=${label} runId=${ctx.runId}`,
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
      // --- Cleanup: DETACH DELETE all probe nodes, then close DI -----
      if (fixturesCreated) {
        try {
          const neogma = tryResolveNeogma(appCtx);
          if (neogma !== null) {
            await neogma.run(`MATCH (n:${label}) DETACH DELETE n`);
          }
        } catch {
          /* best-effort cleanup */
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
