/**
 * Probe contract — the central abstraction of the e2e-diagnostics suite.
 *
 * Every diagnostic check implements `Probe` and returns a `ProbeResult`
 * discriminated union. The union enforces invariants at the type level:
 *
 *  - FAIL must carry `error: { message; stack }` (Req 5.3)
 *  - MISSING must carry `expected` + `observedIn` (Req 5.4)
 *  - SKIPPED must carry `reason` (NFR-reliability — distinguishes
 *    "infra unreachable" from "library broken")
 *
 * Strict TypeScript: no `any`, no unnarrowed `unknown`, no re-exports
 * from `@hive-academy/*` libs (anti-backward-compat repo rule).
 */

/**
 * Identifier for every library / app whose health a probe can attribute
 * a result to. Includes `dev-brand-api` because Layer 1 (boot smoke)
 * targets the real composition root.
 *
 * Aligned with implementation-plan.md §2.
 */
export type LibraryId =
  | 'nestjs-chromadb'
  | 'nestjs-neo4j'
  | 'langgraph-angular'
  | 'langgraph-core'
  | 'langgraph-memory'
  | 'langgraph-hitl'
  | 'langgraph-monitoring'
  | 'langgraph-platform'
  | 'langgraph-workflow-engine'
  | 'langgraph-adapters'
  | 'dev-brand-api';

/**
 * Three-tier layering — keeps reports readable and aligns with the
 * suite's organization (boot smoke → per-lib → full RAG).
 */
export type ProbeLayer = 1 | 2 | 3;

/**
 * Service-reachability snapshot captured once per run during preflight.
 * Probes whose required service is `unreachable` short-circuit to
 * SKIPPED, never FAIL (Req NFR-reliability).
 */
export type PreflightStatus = 'ready' | 'unreachable';

export type PreflightSnapshot = Readonly<
  Record<'chromadb' | 'neo4j' | 'redis', PreflightStatus>
>;

/**
 * Per-run context shared with every probe. `runId` namespaces fixtures
 * so concurrent or interrupted runs never collide.
 */
export interface RunContext {
  readonly runId: string;
  readonly startedAt: Date;
  readonly preflight: PreflightSnapshot;
  /**
   * Build a fixture name scoped to this run.
   * Example: `namespace('chroma')` → `e2e-${runId}-chroma`.
   */
  namespace(suffix: string): string;
}

/**
 * Discriminated union of all possible probe outcomes.
 *
 * The compiler enforces that:
 *  - FAIL carries an error with both `message` and `stack`,
 *  - MISSING documents what was `expected` and where (`observedIn`),
 *  - SKIPPED carries a human-readable `reason`,
 *  - PASS carries timing.
 */
export type ProbeResult =
  | {
      readonly status: 'PASS';
      readonly name: string;
      readonly layer: ProbeLayer;
      readonly suspectedLib: LibraryId;
      readonly durationMs: number;
    }
  | {
      readonly status: 'FAIL';
      readonly name: string;
      readonly layer: ProbeLayer;
      readonly suspectedLib: LibraryId;
      readonly durationMs: number;
      readonly error: {
        readonly message: string;
        readonly stack: string;
      };
    }
  | {
      readonly status: 'SKIPPED';
      readonly name: string;
      readonly layer: ProbeLayer;
      readonly suspectedLib: LibraryId;
      readonly reason: string;
    }
  | {
      readonly status: 'MISSING';
      readonly name: string;
      readonly layer: ProbeLayer;
      readonly suspectedLib: LibraryId;
      readonly expected: string;
      readonly observedIn: string;
    };

/**
 * Status literal of a `ProbeResult`. Useful for switch exhaustiveness
 * checks downstream (renderers, collector).
 */
export type ProbeStatus = ProbeResult['status'];

/**
 * A diagnostic check. Probes are pure objects: they receive a
 * `RunContext`, do their work, and return a `ProbeResult`. They MUST
 * NOT throw — any thrown exception is a bug in the probe itself.
 * Probes are responsible for catching their own errors and converting
 * them to FAIL results carrying the captured stack.
 */
export interface Probe {
  readonly name: string;
  readonly layer: ProbeLayer;
  readonly suspectedLib: LibraryId;
  run(ctx: RunContext): Promise<ProbeResult>;
}
