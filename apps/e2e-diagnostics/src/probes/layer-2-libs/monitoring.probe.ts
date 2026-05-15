/**
 * Layer 2 — langgraph-monitoring diagnostic probe.
 *
 * Verifies the `@hive-academy/langgraph-monitoring` library is wired
 * into the real `dev-brand-api` composition root AND that the metric
 * recording path actually persists metrics to the in-memory collector
 * buffer.
 *
 * Why query the collector buffer directly and not `MonitoringFacadeService.queryMetrics`:
 * the facade's `queryMetrics` delegates to `DashboardService.queryMetrics`,
 * which currently returns mock data from an internal map (see
 * `libs/langgraph-modules/monitoring/src/lib/services/dashboard.service.ts:218`,
 * "Execute metric query (mock implementation)"). Routing the probe
 * through that path would assert mock plumbing, not real metric
 * collection. `MetricsCollectorService.getMetrics(name)` reads the
 * actual in-memory buffer where `collect()` writes — that's the real
 * surface (Req 3.7).
 *
 * Behaviour matrix:
 *  - `MonitoringFacadeService` or `MetricsCollectorService` not in DI
 *    → MISSING
 *  - counter emitted and visible in collector buffer → PASS
 *  - any thrown error or empty buffer → FAIL with stack
 *
 * No fixtures need cleanup beyond closing the DI context (the
 * in-memory buffer dies with the process).
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
 * Minimal structural slices of the two monitoring services this probe
 * touches. Same local-shape rationale as the other Layer-2 probes —
 * keep the monitoring lib's type graph out of e2e-diagnostics' type-check.
 */
interface MonitoringFacadeServiceLike {
  recordCounter(
    name: string,
    increment?: number,
    tags?: Record<string, string | number | boolean>
  ): Promise<void>;
}

interface MetricLike {
  readonly name: string;
  readonly value: number;
  readonly tags: Record<string, string | number | boolean>;
}

interface MetricsCollectorServiceLike {
  getMetrics(pattern: string): Promise<readonly MetricLike[]>;
}

function loadMonitoringFacadeToken(): Type<MonitoringFacadeServiceLike> {
  const mod = require('@hive-academy/langgraph-monitoring') as {
    MonitoringFacadeService: Type<MonitoringFacadeServiceLike>;
  };
  return mod.MonitoringFacadeService;
}

function loadMetricsCollectorToken(): Type<MetricsCollectorServiceLike> {
  const mod = require('@hive-academy/langgraph-monitoring') as {
    MetricsCollectorService: Type<MetricsCollectorServiceLike>;
  };
  return mod.MetricsCollectorService;
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

function tryResolveFacade(
  ctx: INestApplicationContext
): MonitoringFacadeServiceLike | null {
  try {
    return ctx.get<MonitoringFacadeServiceLike>(loadMonitoringFacadeToken(), {
      strict: false,
    });
  } catch {
    return null;
  }
}

function tryResolveCollector(
  ctx: INestApplicationContext
): MetricsCollectorServiceLike | null {
  try {
    return ctx.get<MetricsCollectorServiceLike>(loadMetricsCollectorToken(), {
      strict: false,
    });
  } catch {
    return null;
  }
}

export class MonitoringProbe implements Probe {
  public readonly name = 'langgraph-monitoring/counter-roundtrip';
  public readonly layer: ProbeLayer = 2;
  public readonly suspectedLib: LibraryId = 'langgraph-monitoring';

  public async run(ctx: RunContext): Promise<ProbeResult> {
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

    // Namespace the metric so concurrent runs never see each other's
    // data points. `ctx.namespace()` enforces the e2e-${runId}- prefix.
    const metricName = ctx.namespace('monitoring-counter');

    try {
      // --- Phase 1: resolve both services -----------------------------
      const facade = tryResolveFacade(appCtx);
      if (facade === null) {
        return {
          status: 'MISSING',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          expected: 'MonitoringFacadeService DI provider',
          observedIn: 'dev-brand-api AppModule',
        };
      }

      const collector = tryResolveCollector(appCtx);
      if (collector === null) {
        return {
          status: 'MISSING',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          expected: 'MetricsCollectorService DI provider',
          observedIn: 'dev-brand-api AppModule',
        };
      }

      // --- Phase 2: emit a counter via the facade --------------------
      // The facade is the public API; routing through it (not
      // collector.collect directly) verifies the full record path
      // including the facade's safeOperation wrapper.
      await facade.recordCounter(metricName, 1, {
        source: 'e2e-diagnostics',
        runId: ctx.runId,
      });

      // --- Phase 3: query the in-memory collector buffer -------------
      const metrics = await collector.getMetrics(metricName);
      if (metrics.length === 0) {
        return {
          status: 'FAIL',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          durationMs: performance.now() - start,
          error: {
            message: `recordCounter('${metricName}') reported no exception but the metric is not in the in-memory buffer`,
            stack: `runId=${ctx.runId}`,
          },
        };
      }

      // Defensive: confirm the metric carries the value we just sent.
      // `recordCounter(name, 1, ...)` should buffer a metric with
      // value === 1. Anything else means the facade's tag-merge path
      // is mangling the payload.
      const recorded = metrics[metrics.length - 1];
      if (recorded === undefined || recorded.value !== 1) {
        return {
          status: 'FAIL',
          name: this.name,
          layer: this.layer,
          suspectedLib: this.suspectedLib,
          durationMs: performance.now() - start,
          error: {
            message: `expected last buffered metric to have value=1; got value=${
              recorded?.value ?? '(undefined)'
            }`,
            stack: `runId=${ctx.runId}`,
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
      try {
        await appCtx.close();
      } catch {
        /* best-effort teardown */
      }
    }
  }
}
