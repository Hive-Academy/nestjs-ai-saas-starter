/**
 * Global collector bridge.
 *
 * The custom Jest reporter (`diagnostic-reporter.ts`) runs in a
 * different module graph than the test workers — Jest instantiates
 * reporters in the main process while spec files run in worker
 * processes. To share the in-memory `RunCollector` between the spec
 * and the reporter, we stash it on `globalThis` keyed by a Symbol-like
 * string. The spec file populates it inside `beforeAll`; the reporter
 * reads it inside `onRunComplete`.
 *
 * This is intentional, narrow coupling — the global key is private to
 * this app and never leaks into library code.
 */

import type { PreflightSnapshot } from '../contracts/probe.contract';
import type { RunCollector } from '../services/run-collector.service';

/**
 * Shape of the shared state exposed across the spec ↔ reporter boundary.
 */
export interface GlobalDiagnosticState {
  readonly collector: RunCollector;
  readonly runId: string;
  readonly startedAt: Date;
  readonly preflight: PreflightSnapshot;
  /** Absolute path of the per-run report directory. */
  readonly reportDir: string;
}

const GLOBAL_KEY = '__e2eDiagnosticState__' as const;

interface GlobalWithDiagnostic {
  [GLOBAL_KEY]?: GlobalDiagnosticState;
}

function globalRef(): GlobalWithDiagnostic {
  return globalThis as unknown as GlobalWithDiagnostic;
}

/**
 * Install the shared state. Called once from the suite spec after
 * preflight + run-folder creation. Throws if already set — callers
 * are responsible for tearing down between runs (Jest reuses the
 * worker process across test files).
 */
export function setGlobalDiagnosticState(state: GlobalDiagnosticState): void {
  const ref = globalRef();
  if (ref[GLOBAL_KEY] !== undefined) {
    throw new Error(
      'global-collector: state already installed; clear it with resetGlobalDiagnosticState() first'
    );
  }
  ref[GLOBAL_KEY] = state;
}

/**
 * Read the shared state. Returns `undefined` if the suite never
 * populated it (e.g. test run aborted before `beforeAll`).
 */
export function getGlobalDiagnosticState(): GlobalDiagnosticState | undefined {
  return globalRef()[GLOBAL_KEY];
}

/**
 * Clear the shared state. Useful for tests of the reporter itself.
 */
export function resetGlobalDiagnosticState(): void {
  delete globalRef()[GLOBAL_KEY];
}
