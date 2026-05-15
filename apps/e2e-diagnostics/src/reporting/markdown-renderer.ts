/**
 * Markdown renderer — converts a `SuiteReport` into the
 * `report.md` skeleton described in the implementation plan §5 and
 * research §3.
 *
 * Layout:
 *
 *   # E2E Diagnostics — Run <runId>
 *   - Started: <iso>
 *   - Finished: <iso>
 *   - Duration: <ms>
 *   - Preflight: chromadb=ready, neo4j=ready, redis=unreachable
 *
 *   ## Summary
 *   | Total | PASS | FAIL | SKIPPED | MISSING |
 *   | ... pipe table ... |
 *
 *   ## Layer 1 — Boot Smoke
 *   ### Summary
 *   | ... |
 *   ### Probes
 *   | Status | Probe | Library | Duration (ms) | Details |
 *   | ... |
 *
 *   ## Layer 2 — Per-Library
 *   ...
 *
 *   ## Layer 3 — Full RAG
 *   ...
 *
 * FAIL rows include the captured stack inside a fenced block under
 * the table. MISSING rows include `expected` + `observedIn`.
 */

import type {
  PreflightSnapshot,
  ProbeLayer,
  ProbeResult,
} from '../contracts/probe.contract';
import type {
  LayerReport,
  RunSummary,
  SuiteReport,
} from '../contracts/report.types';

const LAYER_TITLES: Record<ProbeLayer, string> = {
  1: 'Layer 1 — Boot Smoke',
  2: 'Layer 2 — Per-Library',
  3: 'Layer 3 — Full RAG',
};

/**
 * Render the full markdown report.
 */
export function renderMarkdownReport(report: SuiteReport): string {
  const parts: string[] = [];
  parts.push(renderHeader(report));
  parts.push(renderSummarySection(report.summary));
  for (const layer of report.layers) {
    parts.push(renderLayerSection(layer));
  }
  return `${parts.join('\n\n').trimEnd()}\n`;
}

function renderHeader(report: SuiteReport): string {
  const lines: string[] = [];
  lines.push(`# E2E Diagnostics — Run \`${report.runId}\``);
  lines.push('');
  lines.push(`- **Started**: ${report.startedAt}`);
  lines.push(`- **Finished**: ${report.finishedAt}`);
  lines.push(`- **Duration**: ${report.summary.durationMs} ms`);
  lines.push(`- **Preflight**: ${renderPreflight(report.preflight)}`);
  return lines.join('\n');
}

function renderPreflight(preflight: PreflightSnapshot): string {
  return (['chromadb', 'neo4j', 'redis'] as const)
    .map((service) => `${service}=${preflight[service]}`)
    .join(', ');
}

function renderSummarySection(summary: RunSummary): string {
  const lines: string[] = [];
  lines.push('## Summary');
  lines.push('');
  lines.push('| Total | PASS | FAIL | SKIPPED | MISSING | Duration (ms) |');
  lines.push('| ---: | ---: | ---: | ---: | ---: | ---: |');
  lines.push(
    `| ${summary.total} | ${summary.pass} | ${summary.fail} | ${summary.skipped} | ${summary.missing} | ${summary.durationMs} |`
  );
  return lines.join('\n');
}

function renderLayerSection(layer: LayerReport): string {
  const lines: string[] = [];
  lines.push(`## ${LAYER_TITLES[layer.layer]}`);
  lines.push('');
  lines.push('### Summary');
  lines.push('');
  lines.push('| Total | PASS | FAIL | SKIPPED | MISSING |');
  lines.push('| ---: | ---: | ---: | ---: | ---: |');
  lines.push(
    `| ${layer.summary.total} | ${layer.summary.pass} | ${layer.summary.fail} | ${layer.summary.skipped} | ${layer.summary.missing} |`
  );
  lines.push('');
  lines.push('### Probes');
  lines.push('');

  if (layer.results.length === 0) {
    lines.push('_No probes recorded for this layer._');
    return lines.join('\n');
  }

  lines.push('| Status | Probe | Library | Duration (ms) | Details |');
  lines.push('| --- | --- | --- | ---: | --- |');
  for (const result of layer.results) {
    lines.push(renderProbeRow(result));
  }

  // Append detail blocks (stacks for FAIL, expected/observed for MISSING)
  // below the table so the table itself stays scannable.
  const details: string[] = [];
  for (const result of layer.results) {
    const block = renderDetailBlock(result);
    if (block.length > 0) {
      details.push(block);
    }
  }
  if (details.length > 0) {
    lines.push('');
    lines.push(details.join('\n\n'));
  }

  return lines.join('\n');
}

function renderProbeRow(result: ProbeResult): string {
  const status = `\`${result.status}\``;
  const probe = escapeCell(result.name);
  const lib = `\`${result.suspectedLib}\``;
  switch (result.status) {
    case 'PASS':
      return `| ${status} | ${probe} | ${lib} | ${result.durationMs} | — |`;
    case 'FAIL':
      return `| ${status} | ${probe} | ${lib} | ${
        result.durationMs
      } | ${escapeCell(result.error.message)} (see below) |`;
    case 'SKIPPED':
      return `| ${status} | ${probe} | ${lib} | — | ${escapeCell(
        result.reason
      )} |`;
    case 'MISSING':
      return `| ${status} | ${probe} | ${lib} | — | expected ${escapeCell(
        result.expected
      )} (see below) |`;
    default: {
      const _exhaustive: never = result;
      throw new Error(
        `markdown-renderer: unhandled status ${JSON.stringify(_exhaustive)}`
      );
    }
  }
}

function renderDetailBlock(result: ProbeResult): string {
  switch (result.status) {
    case 'FAIL': {
      const lines: string[] = [];
      lines.push(`#### FAIL — ${result.name}`);
      lines.push('');
      lines.push(`- **Library**: \`${result.suspectedLib}\``);
      lines.push(`- **Message**: ${escapePlain(result.error.message)}`);
      lines.push('');
      lines.push('```');
      lines.push(result.error.stack);
      lines.push('```');
      return lines.join('\n');
    }
    case 'MISSING': {
      const lines: string[] = [];
      lines.push(`#### MISSING — ${result.name}`);
      lines.push('');
      lines.push(`- **Library**: \`${result.suspectedLib}\``);
      lines.push(`- **Expected**: ${escapePlain(result.expected)}`);
      lines.push(`- **Observed in**: ${escapePlain(result.observedIn)}`);
      return lines.join('\n');
    }
    case 'PASS':
    case 'SKIPPED':
      return '';
    default: {
      const _exhaustive: never = result;
      throw new Error(
        `markdown-renderer: unhandled status ${JSON.stringify(_exhaustive)}`
      );
    }
  }
}

/**
 * Escape a value for use inside a markdown table cell — collapse
 * newlines and escape pipes so the row can't break the table.
 */
function escapeCell(value: string): string {
  return value.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}

/**
 * Escape a value for use in inline markdown (outside a table) — only
 * pipes are unsafe inside tables; in body text we just preserve
 * content but trim trailing whitespace.
 */
function escapePlain(value: string): string {
  return value.replace(/\r?\n/g, ' ').trim();
}
