/**
 * DiagnosticReporter — custom Jest reporter for the e2e-diagnostics
 * suite.
 *
 * Jest accepts a reporter as any class exposing one or more of the
 * `onRunStart` / `onTestCaseResult` / `onRunComplete` hooks (the full
 * interface lives in `@jest/reporters`, but Jest never validates the
 * shape at runtime — it just calls whatever hooks exist). We avoid
 * pulling `@jest/reporters` as a direct dependency by ducktyping the
 * minimal surface here.
 *
 * Behaviour:
 *
 *  - `onRunStart` is intentionally a no-op for folder creation: the
 *    suite spec creates the report directory in its `beforeAll` so the
 *    `runId`, `startedAt`, and `preflight` snapshot can be threaded
 *    through `RunContext`. The reporter just verifies the global state
 *    is reachable.
 *  - `onRunComplete` reads the shared `RunCollector` from
 *    `global-collector.ts`, builds a `SuiteReport`, and writes
 *    `report.md` + `report.json` into the run folder. All rendering
 *    is wrapped in try/catch so a renderer bug never breaks the
 *    underlying Jest run (acceptance criterion: "reporter never
 *    throws").
 */

import { writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

import type { ProbeLayer, ProbeResult } from '../contracts/probe.contract';
import type {
  LayerReport,
  RunSummary,
  SuiteReport,
} from '../contracts/report.types';
import type { RunCollector } from '../services/run-collector.service';

import { appendFindings } from './findings-appender';
import { getGlobalDiagnosticState } from './global-collector';
import { renderJsonReport } from './json-renderer';
import { renderMarkdownReport } from './markdown-renderer';

/**
 * Absolute path to `task-tracking/TASK_2025_063/future-enhancements.md`.
 * Resolved relative to this file (`apps/e2e-diagnostics/src/reporting/`)
 * up to the repo root so it works regardless of the launching CWD.
 */
const FINDINGS_TARGET_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'task-tracking',
  'TASK_2025_063',
  'future-enhancements.md'
);

/**
 * Minimal subset of Jest's reporter interface that we actually use.
 * Keeping the types loose here avoids a hard dependency on
 * `@jest/reporters` — Jest will happily call the hooks whether or not
 * they implement the full interface.
 */
export class DiagnosticReporter {
  /**
   * Jest invokes the reporter constructor with `(globalConfig, options)`.
   * We accept and ignore both — config is plumbed in via the global
   * state set up by the suite spec.
   */
  constructor(_globalConfig?: unknown, _reporterOptions?: unknown) {
    /* no-op */
  }

  /**
   * Jest hook — called at run start. We don't create the report folder
   * here (the suite spec does that in `beforeAll`) but we do verify the
   * global is reachable so misconfiguration surfaces early in logs.
   */
  public onRunStart(): void {
    try {
      const state = getGlobalDiagnosticState();
      if (state === undefined) {
        // Spec hasn't run `beforeAll` yet — that's fine, the state will
        // appear before `onRunComplete`. Just log for visibility.
        console.warn(
          '[DiagnosticReporter] onRunStart: global state not yet installed (suite spec will set it in beforeAll)'
        );
      }
    } catch (error) {
      this.logRenderError('onRunStart', error);
    }
  }

  /**
   * Jest hook — called at run end. Reads the shared collector, builds
   * a `SuiteReport`, and writes both artifacts. Never throws.
   */
  public onRunComplete(): void {
    try {
      const state = getGlobalDiagnosticState();
      if (state === undefined) {
        console.warn(
          '[DiagnosticReporter] onRunComplete: no global state — suite spec never installed it; skipping report rendering'
        );
        return;
      }

      const report = buildSuiteReport(state.collector, {
        runId: state.runId,
        startedAt: state.startedAt,
        preflight: state.preflight,
      });

      this.writeReports(state.reportDir, report);

      // Append MISSING + FAIL findings to the long-lived task-tracking
      // future-enhancements doc. The appender filters internally; we
      // hand it the full result set so it can decide what's actionable.
      try {
        appendFindings(
          state.runId,
          basename(state.reportDir),
          state.collector.snapshot(),
          FINDINGS_TARGET_PATH
        );
      } catch (error) {
        this.logRenderError('findings-append', error);
      }
    } catch (error) {
      this.logRenderError('onRunComplete', error);
    }
  }

  /**
   * Write `report.md` and `report.json` into the run folder. Each
   * write is independently try/catch-wrapped — a failure rendering the
   * markdown side never blocks the JSON side and vice-versa.
   */
  private writeReports(reportDir: string, report: SuiteReport): void {
    try {
      const markdown = renderMarkdownReport(report);
      writeFileSync(join(reportDir, 'report.md'), markdown, 'utf-8');
    } catch (error) {
      this.logRenderError('markdown', error);
    }

    try {
      const json = renderJsonReport(report);
      writeFileSync(join(reportDir, 'report.json'), json, 'utf-8');
    } catch (error) {
      this.logRenderError('json', error);
    }
  }

  private logRenderError(phase: string, error: unknown): void {
    const message =
      error instanceof Error
        ? `${error.message}\n${error.stack ?? ''}`
        : String(error);
    console.warn(`[DiagnosticReporter] ${phase} failed: ${message}`);
  }
}

/**
 * Inputs needed to construct a `SuiteReport` from a populated
 * `RunCollector`. Kept as a discrete export so unit tests of the
 * reporter (hand-fed `ProbeResult[]`) can hit `buildSuiteReport`
 * directly without going through Jest at all.
 */
export interface BuildSuiteReportInit {
  readonly runId: string;
  readonly startedAt: Date;
  readonly preflight: SuiteReport['preflight'];
  /** Optional override for the `finishedAt` timestamp. Defaults to now. */
  readonly finishedAt?: Date;
}

/**
 * Build a `SuiteReport` from a collector snapshot. Groups results by
 * `layer` to populate `LayerReport[]`, in the canonical layer order
 * (1 → 2 → 3) regardless of insertion order.
 */
export function buildSuiteReport(
  collector: RunCollector,
  init: BuildSuiteReportInit
): SuiteReport {
  const results = collector.snapshot();
  const summary = collector.summary();
  const layers = groupByLayer(results);
  const finishedAt = init.finishedAt ?? new Date();

  return {
    runId: init.runId,
    startedAt: init.startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    preflight: init.preflight,
    results,
    layers,
    summary,
  };
}

const ALL_LAYERS: readonly ProbeLayer[] = [1, 2, 3];

function groupByLayer(results: readonly ProbeResult[]): readonly LayerReport[] {
  return ALL_LAYERS.map((layer) => {
    const slice = results.filter((r) => r.layer === layer);
    return {
      layer,
      results: slice,
      summary: summarize(slice),
    } satisfies LayerReport;
  });
}

function summarize(results: readonly ProbeResult[]): RunSummary {
  let pass = 0;
  let fail = 0;
  let skipped = 0;
  let missing = 0;
  let durationMs = 0;

  for (const result of results) {
    switch (result.status) {
      case 'PASS':
        pass += 1;
        durationMs += result.durationMs;
        break;
      case 'FAIL':
        fail += 1;
        durationMs += result.durationMs;
        break;
      case 'SKIPPED':
        skipped += 1;
        break;
      case 'MISSING':
        missing += 1;
        break;
      default: {
        const _exhaustive: never = result;
        throw new Error(
          `diagnostic-reporter: unhandled status ${JSON.stringify(_exhaustive)}`
        );
      }
    }
  }

  return {
    total: results.length,
    pass,
    fail,
    skipped,
    missing,
    durationMs,
  };
}

// Jest accepts both default and named exports; expose default for
// `<rootDir>/src/reporting/diagnostic-reporter.ts` config entry.
export default DiagnosticReporter;
