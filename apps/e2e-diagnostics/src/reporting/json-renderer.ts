/**
 * JSON renderer — serializes a `SuiteReport` to a pretty-printed JSON
 * string suitable for writing to `report.json`. Stable shape — CI
 * dashboards and regression diffs may depend on it (see
 * `report.types.ts`).
 */

import type { SuiteReport } from '../contracts/report.types';

/**
 * Render the report to a 2-space-indented JSON string with a trailing
 * newline (POSIX-friendly).
 */
export function renderJsonReport(report: SuiteReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
