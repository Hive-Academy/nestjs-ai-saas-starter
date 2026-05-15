/**
 * FixtureCleaner — crash-safe garbage collector for leftover fixtures.
 *
 * Runs in `beforeAll` of `suite.spec.ts` (after preflight) to delete
 * stale fixtures from previous runs that crashed or were killed before
 * their own cleanup hook executed.
 *
 * Scope of sweep:
 *  - **ChromaDB**: collections whose name starts with `e2e-` and
 *    whose embedded `runId` differs from the current run, AND whose
 *    metadata `createdAt` (if present) is older than 24h. Collections
 *    without a `createdAt` metadata are conservatively kept (we never
 *    nuke fixtures we can't date — protects against deleting another
 *    in-flight run on the same DB).
 *  - **Neo4j**: nodes carrying any label of the form `E2E_<uuid>` (or
 *    `e2e-...` — both shapes are accepted) where a `createdAt` epoch
 *    property is older than 24h. Same conservative rule: nodes with
 *    no `createdAt` are NOT deleted.
 *
 * Idempotent: running twice produces the same end state (the second
 * pass simply finds nothing to delete).
 *
 * Never throws on individual failures — sweep is best-effort. The
 * suite's correctness must not depend on a successful sweep.
 */

import type { Driver as Neo4jDriver } from 'neo4j-driver';
import type { ChromaClient } from 'chromadb';

import {
  createChromaClient,
  createNeo4jDriver,
} from '../harness/service-clients';

/** 24 hours expressed in milliseconds. */
const STALE_AFTER_MS = 24 * 60 * 60 * 1_000;

/** Prefix shared by every fixture name produced by `RunContext.namespace()`. */
const FIXTURE_PREFIX = 'e2e-';

/**
 * Summary of a sweep — useful in unit tests and for the reporter to
 * surface "cleaned N stale fixtures" in the run header.
 */
export interface FixtureCleanResult {
  readonly chromaCollectionsDeleted: number;
  readonly neo4jLabelsDeleted: number;
  readonly errors: ReadonlyArray<{
    readonly service: string;
    readonly message: string;
  }>;
}

export class FixtureCleaner {
  /**
   * Sweep both stores. Either argument may be supplied for tests;
   * defaults use the real client factories.
   *
   * `currentRunId` is excluded from deletion so a concurrent in-flight
   * run never disturbs another run's fixtures.
   */
  public async sweep(
    currentRunId: string,
    now: Date = new Date()
  ): Promise<FixtureCleanResult> {
    const errors: Array<{ service: string; message: string }> = [];

    const chromaCollectionsDeleted = await this.sweepChroma(
      currentRunId,
      now,
      errors
    );
    const neo4jLabelsDeleted = await this.sweepNeo4j(currentRunId, now, errors);

    return {
      chromaCollectionsDeleted,
      neo4jLabelsDeleted,
      errors,
    };
  }

  // ------------------------------------------------------------------
  // ChromaDB sweep
  // ------------------------------------------------------------------

  private async sweepChroma(
    currentRunId: string,
    now: Date,
    errors: Array<{ service: string; message: string }>
  ): Promise<number> {
    let client: ChromaClient;
    try {
      client = createChromaClient();
    } catch (err) {
      errors.push({
        service: 'chromadb',
        message: `client construction failed: ${stringifyError(err)}`,
      });
      return 0;
    }

    let collections: ReadonlyArray<{
      readonly name: string;
      readonly metadata: Readonly<Record<string, unknown>> | undefined;
    }>;
    try {
      const raw = await client.listCollections();
      collections = raw.map((c) => ({
        name: c.name,
        metadata: c.metadata as Readonly<Record<string, unknown>> | undefined,
      }));
    } catch (err) {
      errors.push({
        service: 'chromadb',
        message: `listCollections failed: ${stringifyError(err)}`,
      });
      return 0;
    }

    let deleted = 0;
    for (const col of collections) {
      if (!col.name.startsWith(FIXTURE_PREFIX)) continue;
      if (containsRunId(col.name, currentRunId)) continue;
      if (!isOlderThan24h(col.metadata, now)) continue;

      try {
        await client.deleteCollection({ name: col.name });
        deleted += 1;
      } catch (err) {
        errors.push({
          service: 'chromadb',
          message: `deleteCollection(${col.name}) failed: ${stringifyError(
            err
          )}`,
        });
      }
    }
    return deleted;
  }

  // ------------------------------------------------------------------
  // Neo4j sweep
  // ------------------------------------------------------------------

  private async sweepNeo4j(
    currentRunId: string,
    now: Date,
    errors: Array<{ service: string; message: string }>
  ): Promise<number> {
    let driver: Neo4jDriver;
    try {
      driver = createNeo4jDriver();
    } catch (err) {
      errors.push({
        service: 'neo4j',
        message: `driver construction failed: ${stringifyError(err)}`,
      });
      return 0;
    }

    const session = driver.session();
    let deleted = 0;
    try {
      // Enumerate all labels. `db.labels()` is the canonical introspection
      // procedure (available on all Neo4j 4.x / 5.x community editions).
      const result = await session.run<{ label: string }>(
        'CALL db.labels() YIELD label RETURN label'
      );
      const labels = result.records.map((r) => r.get('label'));

      const cutoffMs = now.getTime() - STALE_AFTER_MS;

      for (const label of labels) {
        if (!isE2eLabel(label)) continue;
        if (label.includes(currentRunId)) continue;

        // Delete only nodes carrying this label whose `createdAt`
        // (epoch ms, optional) is older than the cutoff. Nodes
        // without `createdAt` are preserved (conservative rule).
        //
        // Label is interpolated because Cypher does not support
        // parameterized labels. It has already been filtered through
        // `isE2eLabel` — characters outside the safe set are rejected.
        try {
          const del = await session.run(
            `MATCH (n:\`${label}\`)
             WHERE n.createdAt IS NOT NULL AND n.createdAt < $cutoff
             DETACH DELETE n
             RETURN count(n) AS removed`,
            { cutoff: cutoffMs }
          );
          const removedRaw: unknown = del.records[0]?.get('removed');
          deleted += coerceCount(removedRaw);
        } catch (err) {
          errors.push({
            service: 'neo4j',
            message: `delete label ${label} failed: ${stringifyError(err)}`,
          });
        }
      }
    } catch (err) {
      errors.push({
        service: 'neo4j',
        message: `enumerate labels failed: ${stringifyError(err)}`,
      });
    } finally {
      try {
        await session.close();
      } catch {
        /* best-effort */
      }
      try {
        await driver.close();
      } catch {
        /* best-effort */
      }
    }
    return deleted;
  }
}

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

/**
 * True when `name` contains the current `runId` (so we never sweep our
 * own fixtures while they're still in-flight).
 */
function containsRunId(name: string, runId: string): boolean {
  return name.includes(runId);
}

/**
 * Returns true iff the metadata's `createdAt` field is a number/ISO
 * string older than 24h. Missing/unparseable `createdAt` → false
 * (conservative — we don't delete fixtures we can't date).
 */
function isOlderThan24h(
  metadata: Readonly<Record<string, unknown>> | undefined,
  now: Date
): boolean {
  if (metadata === undefined) return false;
  const raw = metadata['createdAt'];
  let ms: number;
  if (typeof raw === 'number') {
    ms = raw;
  } else if (typeof raw === 'string') {
    const parsed = Date.parse(raw);
    if (Number.isNaN(parsed)) return false;
    ms = parsed;
  } else {
    return false;
  }
  return now.getTime() - ms > STALE_AFTER_MS;
}

/**
 * Whitelist filter for Neo4j label names emitted by the suite. Accepts:
 *   - `E2E_<runId>` (RAG / per-probe pattern from plan §3)
 *   - `e2e-<runId>-<suffix>` (RunContext.namespace pattern)
 * Anything else is left alone — defense in depth against accidentally
 * touching unrelated labels.
 */
function isE2eLabel(label: string): boolean {
  if (label.startsWith('E2E_')) return /^[A-Za-z0-9_-]+$/.test(label);
  if (label.startsWith(FIXTURE_PREFIX)) return /^[A-Za-z0-9_-]+$/.test(label);
  return false;
}

/**
 * Coerce a Neo4j count() return value into a JS number. neo4j-driver
 * returns either a plain number, a `neo4j.Integer` wrapper, or a
 * BigInt depending on driver config. We accept all three.
 */
function coerceCount(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (
    value !== null &&
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof (value as { toNumber: unknown }).toNumber === 'function'
  ) {
    const fn = (value as { toNumber: () => unknown }).toNumber;
    const n = fn.call(value);
    return typeof n === 'number' ? n : 0;
  }
  return 0;
}

function stringifyError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
