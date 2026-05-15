/**
 * Layer 2 — langgraph-adapters (SQLite checkpointer) diagnostic probe.
 *
 * Verifies the `@hive-academy/langgraph-adapters` library exports a
 * SQLite-backed checkpointer adapter usable as a LangGraph
 * `BaseCheckpointSaver`, instantiates it with an in-memory backend,
 * writes a checkpoint, reads it back, and asserts payload integrity
 * (Req 3.6).
 *
 * Public surface verification (performed before any runtime checks):
 *  The architect's plan (§8 step 3) calls for "SQLite in-memory
 *  checkpointer from `@hive-academy/langgraph-adapters`". Inspecting
 *  the lib's public surface
 *  (libs/langgraph-modules/adapters/src/index.ts →
 *  ./lib/adapters/index.ts) reveals only:
 *    - ./hitl  (Neo4j HITL storage adapters — 6 files)
 *    - ./thread-registry  (Neo4j thread registry adapter — 1 file)
 *  There is no SQLite checkpointer export. The underlying upstream
 *  package `@langchain/langgraph-checkpoint-sqlite` IS installed in
 *  node_modules (version 1.0.1), but the adapters lib does not
 *  re-export, wrap, or provide a NestJS-injectable adapter around it.
 *
 *  Per task constraint: "if any required surface is missing... emit
 *  MISSING with precise expected/observedIn rather than hacking" —
 *  this probe emits MISSING and stops. It does NOT fall back to
 *  instantiating the upstream SqliteSaver directly (that would mask
 *  the wiring gap the diagnostic is meant to surface).
 *
 * Behaviour matrix:
 *  - `@hive-academy/langgraph-adapters` exports no SQLite checkpointer
 *    surface → MISSING (current state)
 *  - if/when the lib exports one (e.g. `SqliteCheckpointAdapter`),
 *    update this probe to:
 *      1. instantiate via the adapter's documented factory
 *      2. compile a minimal StateGraph with the saver
 *      3. invoke once → assert getState() returns the checkpoint
 *      4. PASS / FAIL accordingly
 *
 * No DI bootstrap required: the adapters lib export surface is a
 * static (import-time) fact — there's nothing in DI to resolve until
 * the lib actually provides a SQLite adapter class. We dynamically
 * `require()` the lib here so the absence of the export is detected
 * at runtime (not type-check time), which keeps the probe loadable
 * even if the lib surface changes incompatibly later.
 *
 * No fixtures need cleanup (the probe never reaches the runtime
 * write phase under the current MISSING outcome).
 */

import type {
  LibraryId,
  Probe,
  ProbeLayer,
  ProbeResult,
  RunContext,
} from '../../contracts';

/**
 * Set of named exports we'd accept as "the SQLite checkpointer
 * surface". Any one of these (or a future equivalent) being present
 * on the adapters lib means the probe can move past MISSING into
 * runtime validation.
 *
 * Names chosen to match the naming convention already used by other
 * `@hive-academy/langgraph-adapters` exports (e.g.
 * `Neo4jThreadRegistryAdapter`, `Neo4jHitlStorageAdapter`).
 *
 * `unknown` typing because we only need to detect presence, not call
 * any specific shape on these candidates at probe-load time.
 */
const EXPECTED_EXPORT_CANDIDATES = [
  'SqliteCheckpointAdapter',
  'SqliteCheckpointSaver',
  'SqliteCheckpointer',
] as const;

function inspectAdaptersExports(): {
  readonly hasSqliteSurface: boolean;
  readonly observedExports: readonly string[];
} {
  // require() returns the namespace object; Object.keys() gives the
  // full set of named exports (including re-exports from sub-barrels).
  const mod = require('@hive-academy/langgraph-adapters') as Record<
    string,
    unknown
  >;
  const observedExports = Object.keys(mod).sort();
  const hasSqliteSurface = EXPECTED_EXPORT_CANDIDATES.some(
    (name) => name in mod
  );
  return { hasSqliteSurface, observedExports };
}

export class AdaptersSqliteProbe implements Probe {
  public readonly name = 'langgraph-adapters/sqlite-checkpointer-roundtrip';
  public readonly layer: ProbeLayer = 2;
  public readonly suspectedLib: LibraryId = 'langgraph-adapters';

  public async run(_ctx: RunContext): Promise<ProbeResult> {
    // --- Phase 1: inspect the adapters lib public surface -----------
    // No NestJS boot required here — checkpointer adapters are
    // expected to be exported as classes/factories the consumer
    // instantiates directly (matching how `Neo4jHitlStorageAdapter`
    // etc. are documented in libs/langgraph-modules/adapters CLAUDE
    // markdown). Absence of any candidate export is itself the
    // diagnostic finding.
    const { hasSqliteSurface, observedExports } = inspectAdaptersExports();

    if (!hasSqliteSurface) {
      return {
        status: 'MISSING',
        name: this.name,
        layer: this.layer,
        suspectedLib: this.suspectedLib,
        expected: `one of [${EXPECTED_EXPORT_CANDIDATES.join(
          ', '
        )}] — SQLite-backed BaseCheckpointSaver adapter (NestJS-injectable)`,
        observedIn: `@hive-academy/langgraph-adapters lib (verified absence; only Neo4j HITL + thread-registry adapters currently exported; sampled exports: ${observedExports
          .slice(0, 8)
          .join(', ')}${observedExports.length > 8 ? ', …' : ''})`,
      };
    }

    // --- Phase 2 (reserved): runtime round-trip --------------------
    // This branch is unreachable under the current state of the
    // adapters lib. When a SQLite adapter is added, replace the
    // body below with:
    //   1. Resolve / instantiate the adapter (`:memory:` connection).
    //   2. Compile a 1-node StateGraph with `{ checkpointer: adapter }`.
    //   3. Invoke once with a known payload (e.g. `{ marker: runId }`).
    //   4. Call `compiled.getState({ configurable: { thread_id } })`.
    //   5. Deep-equal `snapshot.values.marker` against the input.
    //   6. PASS on match, FAIL with stack on mismatch.
    //
    // The MISSING branch above is intentionally exhaustive for now —
    // returning a "shape unknown" placeholder here would leave the
    // probe contract violated (PASS/FAIL/SKIPPED all require precise
    // semantics). When the surface lands, this comment block becomes
    // the implementation guide.
    return {
      status: 'MISSING',
      name: this.name,
      layer: this.layer,
      suspectedLib: this.suspectedLib,
      expected:
        'runtime round-trip validation against the newly exported SQLite adapter (probe body needs implementation update once the surface lands)',
      observedIn:
        '@hive-academy/langgraph-adapters lib (surface present but probe runtime branch not yet implemented — see source for the reserved Phase 2 outline)',
    };
  }
}
