/**
 * Findings appender.
 *
 * Append-only writer for `task-tracking/TASK_2025_063/future-enhancements.md`.
 * Invoked by the custom Jest reporter (`diagnostic-reporter.ts`) at the end
 * of every suite run with the MISSING + FAIL results captured by the run.
 *
 * Contract (Req 6.1, 6.5):
 *   - File is APPEND-ONLY across runs. Prior findings are never overwritten.
 *   - The file is created with a header if it does not yet exist.
 *   - Each appended block is prefixed by `## Findings — Run <ISO-timestamp>`.
 *   - Each finding entry surfaces: library, expected symbol/method, observed
 *     behavior, recommended task title.
 *   - Never throws — failures are logged via the supplied logger and swallowed
 *     so a write fault never breaks the diagnostic run.
 */

import { appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

import type { ProbeResult } from '../contracts/probe.contract';

const FILE_HEADER = `# Future Enhancements — TASK_2025_063

This file is **append-only**. Each successful run of the e2e-diagnostics
suite appends a new \`## Findings — Run <ISO-timestamp>\` section below.
Prior findings are never overwritten so the document preserves the full
history of library gaps discovered across runs.

Each finding lists:

- **Library** — the \`@hive-academy/*\` package the gap belongs to
- **Expected** — the symbol / method / behavior the probe asked for
- **Observed in** — where the probe looked (file path or DI scope)
- **Recommended task** — a one-line suggestion the team can lift verbatim
  into the next task-tracking entry

---

`;

/**
 * Minimal logger interface so callers can wire `console`, a NestJS logger,
 * or a no-op in tests without dragging a dependency in.
 */
export interface FindingsLogger {
  warn(message: string): void;
}

const DEFAULT_LOGGER: FindingsLogger = {
  warn(message: string): void {
    console.warn(message);
  },
};

/**
 * Filter a results array down to the rows that warrant an entry in
 * `future-enhancements.md`. Only `MISSING` and `FAIL` rows produce findings —
 * `PASS` and `SKIPPED` are reported in the per-run markdown report only.
 */
function selectActionableResults(
  results: readonly ProbeResult[]
): readonly ProbeResult[] {
  return results.filter(
    (r): r is ProbeResult => r.status === 'MISSING' || r.status === 'FAIL'
  );
}

/**
 * Render a single MISSING / FAIL row to a markdown block. Pure — no side
 * effects.
 */
function renderEntry(result: ProbeResult): string {
  if (result.status === 'MISSING') {
    return [
      `### MISSING — ${result.suspectedLib}: ${result.name}`,
      ``,
      `- **Library**: ${result.suspectedLib}`,
      `- **Expected**: ${result.expected}`,
      `- **Observed in**: ${result.observedIn}`,
      `- **Recommended task**: add support for \`${result.expected}\` in \`${result.suspectedLib}\` (surfaced by probe \`${result.name}\`)`,
      ``,
    ].join('\n');
  }
  if (result.status === 'FAIL') {
    // Keep stack trimmed — full stack lives in `report.md` / `report.json`.
    // The findings file is a triage queue, not a debug log.
    const firstStackLine = result.error.stack
      .split('\n')
      .slice(0, 4)
      .join('\n');
    return [
      `### FAIL — ${result.suspectedLib}: ${result.name}`,
      ``,
      `- **Library**: ${result.suspectedLib}`,
      `- **Expected**: probe \`${result.name}\` to PASS`,
      `- **Observed**: ${result.error.message}`,
      `- **Recommended task**: investigate failure in \`${result.suspectedLib}\` reported by probe \`${result.name}\``,
      ``,
      `<details><summary>stack (first 4 lines)</summary>`,
      ``,
      `\`\`\``,
      firstStackLine,
      `\`\`\``,
      ``,
      `</details>`,
      ``,
    ].join('\n');
  }
  // Defensive — selectActionableResults filters everything else out.
  return '';
}

/**
 * Append a `## Findings — Run <ISO-timestamp>` block to the supplied target
 * file. Creates the file with the standard header if it does not yet exist.
 *
 * Atomicity: a single `appendFileSync` call after one optional `writeFileSync`
 * to seed the header. We rely on the host filesystem's append semantics —
 * good enough for the diagnostic suite, which is single-process per run.
 *
 * @param runId            UUID of the current run (kept for traceability).
 * @param runFolderName    Folder name under `apps/e2e-diagnostics/reports/`
 *                         that the per-run report.md / report.json landed in.
 *                         Embedded in the section header so triagers can jump
 *                         straight to the full report.
 * @param results          All probe results from the run. MISSING + FAIL
 *                         entries are extracted and rendered; everything else
 *                         is ignored.
 * @param targetPath       Absolute path to the markdown file to append to.
 * @param logger           Optional warn-only logger (defaults to `console`).
 */
export function appendFindings(
  runId: string,
  runFolderName: string,
  results: readonly ProbeResult[],
  targetPath: string,
  logger: FindingsLogger = DEFAULT_LOGGER
): void {
  try {
    // Seed the file with a header on first ever run.
    if (!existsSync(targetPath)) {
      try {
        mkdirSync(dirname(targetPath), { recursive: true });
      } catch {
        /* parent dir may already exist — best-effort */
      }
      writeFileSync(targetPath, FILE_HEADER, 'utf-8');
    }

    const actionable = selectActionableResults(results);
    const sectionHeader = `## Findings — Run ${new Date().toISOString()}`;
    const metaLine = `_Run ID: \`${runId}\` · Report folder: \`${runFolderName}\`_`;

    let body: string;
    if (actionable.length === 0) {
      body = [
        sectionHeader,
        ``,
        metaLine,
        ``,
        `No MISSING or FAIL findings in this run — every probe either PASSED or was SKIPPED.`,
        ``,
        `---`,
        ``,
      ].join('\n');
    } else {
      body = [
        sectionHeader,
        ``,
        metaLine,
        ``,
        ...actionable.map(renderEntry),
        `---`,
        ``,
      ].join('\n');
    }

    appendFileSync(targetPath, body, 'utf-8');
  } catch (err) {
    const message =
      err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);
    logger.warn(`[findings-appender] failed to append findings: ${message}`);
  }
}
