/**
 * Report folder helper.
 *
 * Computes (and creates) a unique per-run output directory under
 * `apps/e2e-diagnostics/reports/`. Folder name is
 * `<ISO-timestamp>-<uuid8>` where:
 *  - ISO timestamp is `YYYY-MM-DDTHH-mm-ss` (colons replaced with `-`
 *    so the path is filesystem-safe on Windows and macOS).
 *  - `uuid8` is an 8-char hex suffix preventing same-second collisions
 *    across concurrent runs (Req 5.6 — no silent overwrite).
 */

import { mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';

/**
 * Convert a Date to a filesystem-safe ISO-ish timestamp:
 * `2026-05-15T14-32-08`.
 */
export function formatRunTimestamp(date: Date): string {
  const iso = date.toISOString();
  // Drop milliseconds + `Z`, replace colons with dashes.
  return iso.slice(0, 19).replace(/:/g, '-');
}

/**
 * Generate an 8-character lowercase hex suffix.
 */
export function generateRunSuffix(): string {
  return randomBytes(4).toString('hex');
}

/**
 * Build the folder name (without parent path) for a run.
 */
export function buildRunFolderName(
  startedAt: Date = new Date(),
  suffix: string = generateRunSuffix()
): string {
  return `${formatRunTimestamp(startedAt)}-${suffix}`;
}

/**
 * Resolve (and `mkdirSync` -p) the absolute path for a run's report
 * directory. The default root assumes the reporter runs from the repo
 * root (Jest's `rootDir` for this project is `apps/e2e-diagnostics`).
 *
 * @param appRoot Absolute path to the `apps/e2e-diagnostics` directory.
 *                Defaults to two levels above this file (`src/reporting`).
 */
export function ensureRunFolder(
  appRoot: string = resolve(__dirname, '..', '..'),
  startedAt: Date = new Date(),
  suffix: string = generateRunSuffix()
): string {
  const folder = resolve(
    appRoot,
    'reports',
    buildRunFolderName(startedAt, suffix)
  );
  mkdirSync(folder, { recursive: true });
  return folder;
}
