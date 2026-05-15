/**
 * Internal app barrel for `apps/e2e-diagnostics/src/contracts/`.
 *
 * NOTE: This is a LOCAL barrel — it re-exports symbols within this
 * app only. It does NOT re-export anything from `@hive-academy/*`
 * libs (anti-backward-compat repo rule, see root CLAUDE.md).
 */

export type {
  LibraryId,
  PreflightSnapshot,
  PreflightStatus,
  Probe,
  ProbeLayer,
  ProbeResult,
  ProbeStatus,
  RunContext,
} from './probe.contract';

export { DefaultRunContext } from './run-context';
export type { RunContextInit } from './run-context';

export type { LayerReport, RunSummary, SuiteReport } from './report.types';
