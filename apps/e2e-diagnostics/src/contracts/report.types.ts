/**
 * Report types — the JSON sidecar shape rendered by the custom Jest
 * reporter. Matches implementation-plan.md §5 verbatim, plus a
 * `LayerReport` grouping used by the markdown renderer for the
 * "Layer N" section headings.
 */

import type {
  PreflightSnapshot,
  ProbeLayer,
  ProbeResult,
} from './probe.contract';

/**
 * Aggregate counts produced by `RunCollector.summary()`. The shape is
 * referenced by both the JSON sidecar and the markdown header.
 */
export interface RunSummary {
  readonly total: number;
  readonly pass: number;
  readonly fail: number;
  readonly skipped: number;
  readonly missing: number;
  readonly durationMs: number;
}

/**
 * Per-layer grouping. The reporter slices the flat `results` array
 * by `layer` to render the three top-level sections.
 */
export interface LayerReport {
  readonly layer: ProbeLayer;
  readonly results: readonly ProbeResult[];
  readonly summary: RunSummary;
}

/**
 * Top-level report serialized to `report.json` after each run. Stable
 * shape — downstream tooling (CI dashboards, regression diffs) is
 * allowed to depend on it.
 */
export interface SuiteReport {
  readonly runId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly preflight: PreflightSnapshot;
  readonly results: readonly ProbeResult[];
  readonly layers: readonly LayerReport[];
  readonly summary: RunSummary;
}
