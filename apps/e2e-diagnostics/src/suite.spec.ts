/**
 * E2E Diagnostic Suite — single Jest entry point.
 *
 * One outer `it()` iterates every diagnostic probe in canonical order:
 *
 *   Layer 1 → DevBrandApiBootProbe (multi-row via `runAll`)
 *   Layer 2 → ChromaDb, Neo4j, WorkflowEngine, Core, Monitoring, Memory,
 *             Hitl, AdaptersSqlite, Platform, LanggraphAngular
 *   Layer 3 → FullRagFlowProbe
 *
 * Each probe result is pushed into the shared `RunCollector`. The custom
 * Jest reporter (`reporting/diagnostic-reporter.ts`) drains the collector
 * in `onRunComplete` and writes `report.md` / `report.json` into the
 * per-run folder, then appends MISSING + FAIL findings to
 * `task-tracking/TASK_2025_063/future-enhancements.md`.
 *
 * Critical invariant: this suite is **diagnostic, not gated**. The single
 * `it()` ALWAYS passes regardless of probe FAIL / MISSING / SKIPPED counts
 * so the Jest exit code stays 0 — runners must inspect the generated
 * report, not the Jest verdict (per Req Out-of-Scope #5 / Req Acceptance).
 */

import { writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

import { DefaultRunContext } from './contracts/run-context';
import type {
  Probe,
  ProbeResult,
  RunContext,
} from './contracts/probe.contract';

import { DevBrandApiBootProbe } from './probes/layer-1-boot/dev-brand-api-boot.probe';

import { ChromaDbProbe } from './probes/layer-2-libs/chromadb.probe';
import { Neo4jProbe } from './probes/layer-2-libs/neo4j.probe';
import { WorkflowEngineProbe } from './probes/layer-2-libs/workflow-engine.probe';
import { CoreProbe } from './probes/layer-2-libs/core.probe';
import { MonitoringProbe } from './probes/layer-2-libs/monitoring.probe';
import { MemoryProbe } from './probes/layer-2-libs/memory.probe';
import { HitlProbe } from './probes/layer-2-libs/hitl.probe';
import { AdaptersSqliteProbe } from './probes/layer-2-libs/adapters-sqlite.probe';
import { PlatformProbe } from './probes/layer-2-libs/platform.probe';
import { LanggraphAngularProbe } from './probes/layer-2-libs/langgraph-angular.probe';

import { FullRagFlowProbe } from './probes/layer-3-rag/full-rag-flow.probe';

import { buildSuiteReport } from './reporting/diagnostic-reporter';
import { appendFindings } from './reporting/findings-appender';
import {
  resetGlobalDiagnosticState,
  setGlobalDiagnosticState,
} from './reporting/global-collector';
import { renderJsonReport } from './reporting/json-renderer';
import { renderMarkdownReport } from './reporting/markdown-renderer';
import { ensureRunFolder } from './reporting/report-folder';

import { FixtureCleaner } from './services/fixture-cleaner.service';
import { PreflightService } from './services/preflight.service';
import { RunCollector } from './services/run-collector.service';

/**
 * Absolute path to the `apps/e2e-diagnostics` app root. Resolved once at
 * module load so the reporter and the run-folder helper agree on the
 * same parent regardless of which CWD Jest was launched from.
 */
const APP_ROOT = resolve(__dirname, '..');

/**
 * Layer 2 probes in canonical execution order. Order matters only for
 * report readability — each probe is independent.
 */
const LAYER_2_PROBES: readonly Probe[] = [
  new ChromaDbProbe(),
  new Neo4jProbe(),
  new WorkflowEngineProbe(),
  new CoreProbe(),
  new MonitoringProbe(),
  new MemoryProbe(),
  new HitlProbe(),
  new AdaptersSqliteProbe(),
  new PlatformProbe(),
  new LanggraphAngularProbe(),
];

/**
 * Layer 3 probes. One today; declared as an array for symmetry / future
 * growth (full multi-agent flow, streaming flow, etc.).
 */
const LAYER_3_PROBES: readonly Probe[] = [new FullRagFlowProbe()];

/**
 * Wrap a probe's `run` so any unexpected throw (probes are contract-bound
 * NOT to throw, but defense in depth) is converted to a FAIL row instead
 * of aborting the iteration.
 */
async function safeRun(probe: Probe, ctx: RunContext): Promise<ProbeResult> {
  try {
    return await probe.run(ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack ?? message : message;
    return {
      status: 'FAIL',
      name: probe.name,
      layer: probe.layer,
      suspectedLib: probe.suspectedLib,
      durationMs: 0,
      error: { message, stack },
    };
  }
}

/**
 * Absolute path to `task-tracking/TASK_2025_063/future-enhancements.md`.
 * Used by `afterAll` to append discovered MISSING + FAIL findings.
 */
const FINDINGS_TARGET_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  'task-tracking',
  'TASK_2025_063',
  'future-enhancements.md'
);

describe('e2e-diagnostics suite', () => {
  let collector: RunCollector;
  let ctx: RunContext;
  let reportDir: string;
  let preflightSnapshot: Awaited<ReturnType<PreflightService['run']>>;

  beforeAll(async () => {
    // 1. Service-reachability snapshot (≤ 5s wall-clock).
    const preflight = await new PreflightService().run();
    preflightSnapshot = preflight;

    // 2. Build the RunContext (generates runId, freezes startedAt).
    ctx = new DefaultRunContext({ preflight });

    // 3. Crash-safe sweep of stale fixtures from prior runs. Result is
    //    logged but not surfaced into the report — the sweep is a safety
    //    net, not a diagnostic signal. Best-effort: failures are
    //    swallowed inside FixtureCleaner.
    const sweep = await new FixtureCleaner().sweep(ctx.runId);
    if (sweep.errors.length > 0) {
      console.warn(
        `[e2e-diagnostics] fixture sweep produced ${sweep.errors.length} non-fatal error(s)`
      );
    }

    // 4. Allocate the per-run report folder and install the global state
    //    bridge so the Jest reporter (when running in the same process) can
    //    pick it up in `onRunComplete`. Even if the reporter runs in a
    //    different process, `afterAll` below writes the reports directly.
    reportDir = ensureRunFolder(APP_ROOT, ctx.startedAt);
    collector = new RunCollector();

    // Clear any state left behind by a previous worker (Jest reuses
    // worker processes across files). `setGlobalDiagnosticState` throws
    // if state is already installed — reset defensively first.
    resetGlobalDiagnosticState();
    setGlobalDiagnosticState({
      collector,
      runId: ctx.runId,
      startedAt: ctx.startedAt,
      preflight,
      reportDir,
    });
  }, 120_000);

  afterAll(() => {
    // Write reports directly here (rather than relying solely on the
    // custom Jest reporter). Jest reporters run in the main process while
    // the spec runs in the worker; `globalThis` is not shared across that
    // boundary on every Jest configuration. Writing from `afterAll`
    // guarantees the artifacts land regardless of worker topology.
    //
    // The custom reporter remains registered as a redundant safety net —
    // if it does see the global state (e.g. `runInBand` collapses the
    // boundary), it will simply overwrite the same files with identical
    // content. Failures in either path are logged, never thrown.
    if (
      collector === undefined ||
      ctx === undefined ||
      reportDir === undefined
    ) {
      console.warn(
        '[e2e-diagnostics] afterAll: setup never completed, skipping report write'
      );
      return;
    }

    try {
      const report = buildSuiteReport(collector, {
        runId: ctx.runId,
        startedAt: ctx.startedAt,
        preflight: preflightSnapshot,
      });

      try {
        writeFileSync(
          join(reportDir, 'report.md'),
          renderMarkdownReport(report),
          'utf-8'
        );
      } catch (error) {
        console.warn('[e2e-diagnostics] markdown render failed:', error);
      }

      try {
        writeFileSync(
          join(reportDir, 'report.json'),
          renderJsonReport(report),
          'utf-8'
        );
      } catch (error) {
        console.warn('[e2e-diagnostics] json render failed:', error);
      }

      try {
        appendFindings(
          ctx.runId,
          basename(reportDir),
          collector.snapshot(),
          FINDINGS_TARGET_PATH
        );
      } catch (error) {
        console.warn('[e2e-diagnostics] findings append failed:', error);
      }
    } catch (error) {
      console.warn('[e2e-diagnostics] afterAll report write failed:', error);
    }
  });

  // Single outer test case. ALWAYS passes — see file header.
  // No expect() calls intentional: the suite is diagnostic, not gated.
  it('runs all diagnostic probes', async () => {
    // --- Layer 1 ---------------------------------------------------------
    // `DevBrandApiBootProbe` exposes `runAll(ctx)` returning N rows
    // (1 boot + 1 health-check + N modules) so we get a per-module
    // breakdown in the report. Use it in preference to `run()`.
    const bootProbe = new DevBrandApiBootProbe();
    try {
      const bootRows = await bootProbe.runAll(ctx);
      for (const row of bootRows) {
        collector.collect(row);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack ?? message : message;
      collector.collect({
        status: 'FAIL',
        name: bootProbe.name,
        layer: bootProbe.layer,
        suspectedLib: bootProbe.suspectedLib,
        durationMs: 0,
        error: { message, stack },
      });
    }

    // --- Layer 2 ---------------------------------------------------------
    for (const probe of LAYER_2_PROBES) {
      const result = await safeRun(probe, ctx);
      collector.collect(result);
    }

    // --- Layer 3 ---------------------------------------------------------
    for (const probe of LAYER_3_PROBES) {
      const result = await safeRun(probe, ctx);
      collector.collect(result);
    }

    // No assertions: the suite is diagnostic, not gated. The reporter
    // writes the verdict to disk; Jest's exit code stays 0 regardless.
  }, 600_000);
});
