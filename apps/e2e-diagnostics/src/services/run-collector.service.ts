/**
 * RunCollector — single in-memory accumulator for `ProbeResult`s.
 *
 * One instance is constructed in `suite.spec.ts` `beforeAll` and shared
 * with every probe. The custom Jest reporter reads `snapshot()` and
 * `summary()` in `onRunComplete` to render `report.md` + `report.json`.
 *
 * Plain TS class — no NestJS decorators. The collector lives below the
 * Nest composition root because it has to be reachable from a Jest
 * reporter (which runs in a different module-graph than the app).
 */

import type { ProbeResult } from '../contracts/probe.contract';
import type { RunSummary } from '../contracts/report.types';

export class RunCollector {
  private readonly results: ProbeResult[] = [];
  private readonly startedAt: number = Date.now();

  /** Append a probe outcome. Order of insertion is preserved. */
  public collect(result: ProbeResult): void {
    this.results.push(result);
  }

  /**
   * Immutable view of all results captured so far. Returns a fresh
   * copy on every call so consumers can sort / slice without mutating
   * the underlying buffer.
   */
  public snapshot(): readonly ProbeResult[] {
    return [...this.results];
  }

  /**
   * Aggregate counts + total wall-clock duration since collector
   * construction. Shape matches `RunSummary` (consumed by the JSON
   * sidecar and the markdown header).
   *
   * Counts are computed via a switch on the discriminator so the
   * compiler enforces exhaustiveness if a new `ProbeStatus` literal
   * is ever added.
   */
  public summary(): RunSummary {
    let pass = 0;
    let fail = 0;
    let skipped = 0;
    let missing = 0;

    for (const result of this.results) {
      switch (result.status) {
        case 'PASS':
          pass += 1;
          break;
        case 'FAIL':
          fail += 1;
          break;
        case 'SKIPPED':
          skipped += 1;
          break;
        case 'MISSING':
          missing += 1;
          break;
        default: {
          // Exhaustiveness guard — if a new status is added to the
          // discriminated union, TS will flag this assignment.
          const _exhaustive: never = result;
          throw new Error(
            `RunCollector.summary: unhandled status ${JSON.stringify(
              _exhaustive
            )}`
          );
        }
      }
    }

    return {
      total: this.results.length,
      pass,
      fail,
      skipped,
      missing,
      durationMs: Date.now() - this.startedAt,
    };
  }
}
