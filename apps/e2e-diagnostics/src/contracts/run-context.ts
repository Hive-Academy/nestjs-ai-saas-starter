/**
 * `RunContext` implementation — a per-run handle passed to every probe.
 *
 * One instance is constructed in `suite.spec.ts` `beforeAll` after
 * preflight completes, then shared with every probe for the duration
 * of the run. Immutable from the probe's perspective.
 */

import { randomUUID } from 'node:crypto';

import type { PreflightSnapshot, RunContext } from './probe.contract';

/**
 * Construction arguments for `DefaultRunContext`. Kept explicit so
 * callers (suite bootstrap, unit tests) make their intent obvious.
 */
export interface RunContextInit {
  readonly preflight: PreflightSnapshot;
  /** Optional override — defaults to `randomUUID()`. Useful for tests. */
  readonly runId?: string;
  /** Optional override — defaults to `new Date()`. Useful for tests. */
  readonly startedAt?: Date;
}

/**
 * Concrete `RunContext`. Every fixture name a probe creates flows
 * through `namespace()` so it carries the per-run UUID prefix and
 * can be reaped by the crash-safe sweep.
 */
export class DefaultRunContext implements RunContext {
  public readonly runId: string;
  public readonly startedAt: Date;
  public readonly preflight: PreflightSnapshot;

  constructor(init: RunContextInit) {
    this.runId = init.runId ?? randomUUID();
    this.startedAt = init.startedAt ?? new Date();
    this.preflight = init.preflight;
  }

  /**
   * Build a fixture name scoped to this run.
   *
   * Format: `e2e-${runId}-${suffix}`. The `e2e-` prefix lets the
   * `FixtureCleaner` sweep stale fixtures across runs without
   * touching unrelated data.
   *
   * @throws Error if suffix is empty or contains whitespace — fixture
   *   names with whitespace break Neo4j label syntax and confuse
   *   Chroma collection lookups.
   */
  public namespace(suffix: string): string {
    if (suffix.length === 0) {
      throw new Error('RunContext.namespace: suffix must be non-empty');
    }
    if (/\s/.test(suffix)) {
      throw new Error(
        `RunContext.namespace: suffix must not contain whitespace (got: "${suffix}")`
      );
    }
    return `e2e-${this.runId}-${suffix}`;
  }
}
