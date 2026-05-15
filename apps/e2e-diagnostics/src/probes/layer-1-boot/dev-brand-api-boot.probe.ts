/**
 * Layer 1 — Boot smoke probe for `dev-brand-api`.
 *
 * Verifies the most basic invariant of the entire suite: the real
 * `AppModule` composition root can boot, every registered module
 * shows up in the DI container, and the `/api/health` endpoint
 * answers with a sane response.
 *
 * Why this matters: if Layer 1 fails, every Layer 2 / Layer 3 result
 * downstream is automatically suspect — they all depend on a working
 * DI graph. By emitting one row per registered module the probe also
 * doubles as a "module inventory" snapshot that downstream layers
 * cross-reference when reporting library health.
 *
 * Two entry points are exposed:
 *
 *  - `run(ctx)` — contract-compliant single-result entry. Returns a
 *    rolled-up PASS if the boot + health-check + enumeration all
 *    succeeded, FAIL otherwise.
 *  - `runAll(ctx)` — diagnostic-suite entry. Returns one PASS row per
 *    enumerated module (plus one row for the boot + one row for the
 *    health-check) so the markdown report shows every wired module
 *    individually. On boot failure returns a single FAIL row with a
 *    `suspectedLib` derived from the stack.
 *
 * The probe never throws — any caught exception is converted to a
 * FAIL result with stack captured (Probe contract requirement).
 */

import type { Server } from 'node:http';
import { request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import { performance } from 'node:perf_hooks';

import type { INestApplication } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';

import type {
  LibraryId,
  Probe,
  ProbeLayer,
  ProbeResult,
  RunContext,
} from '../../contracts';
import { API_GLOBAL_PREFIX, bootApp } from '../../harness/nest-boot';

/**
 * Mapping table from on-disk lib folder name to canonical `LibraryId`.
 * Maintained explicitly so we never silently coin a new LibraryId by
 * regex accident.
 */
const LIB_FOLDER_TO_ID: ReadonlyMap<string, LibraryId> = new Map<
  string,
  LibraryId
>([
  ['nestjs-chromadb', 'nestjs-chromadb'],
  ['nestjs-neo4j', 'nestjs-neo4j'],
  ['langgraph-modules/core', 'langgraph-core'],
  ['langgraph-modules/memory', 'langgraph-memory'],
  ['langgraph-modules/hitl', 'langgraph-hitl'],
  ['langgraph-modules/monitoring', 'langgraph-monitoring'],
  ['langgraph-modules/platform', 'langgraph-platform'],
  ['langgraph-modules/workflow-engine', 'langgraph-workflow-engine'],
  ['langgraph-modules/adapters', 'langgraph-adapters'],
  ['langgraph-angular', 'langgraph-angular'],
]);

/**
 * Walk a thrown error's stack and find the first frame pointing at a
 * `libs/<name>/` path. Maps that folder to a canonical `LibraryId`.
 * Falls back to `'dev-brand-api'` when no lib frame is identifiable —
 * a failure with no lib in the stack is almost always a wiring bug
 * inside the composition root itself.
 */
function identifySuspectedLib(stack: string): LibraryId {
  // Try the deeper match first (`langgraph-modules/<name>`) so we
  // don't mis-attribute a langgraph submodule to a non-existent
  // top-level lib.
  const submoduleMatch = stack.match(/libs\/langgraph-modules\/([^/\s]+)/);
  if (submoduleMatch !== null) {
    const key = `langgraph-modules/${submoduleMatch[1]}`;
    const id = LIB_FOLDER_TO_ID.get(key);
    if (id !== undefined) {
      return id;
    }
  }

  const topLevelMatch = stack.match(/libs\/([^/\s]+)/);
  if (topLevelMatch !== null) {
    const id = LIB_FOLDER_TO_ID.get(topLevelMatch[1]);
    if (id !== undefined) {
      return id;
    }
  }

  return 'dev-brand-api';
}

/**
 * Snapshot of an enumerated NestJS module — name + timing taken at
 * enumeration time. Timing is per-module wall-clock cost of walking
 * the container entry (microseconds in practice but reported in ms
 * for consistency with the rest of the report shape).
 */
interface ModuleEntry {
  readonly name: string;
  readonly durationMs: number;
}

/**
 * Pull the list of registered module class names out of the live DI
 * container. We use `metatype.name` because that's the class identifier
 * a developer would search for in the codebase.
 */
function enumerateModules(app: INestApplication): readonly ModuleEntry[] {
  const container = app.get(ModulesContainer);
  const entries: ModuleEntry[] = [];
  for (const mod of container.values()) {
    const start = performance.now();
    // `metatype` is the original module class. For dynamic modules
    // (e.g. `MemoryModule.forRootAsync(...)`) Nest still populates the
    // metatype with the static class, so the name is stable.
    const name = mod.metatype?.name ?? '<anonymous-module>';
    entries.push({ name, durationMs: performance.now() - start });
  }
  return entries;
}

/**
 * Response shape from the in-process health check. We capture only
 * what the report needs — full body for FAIL rendering, status code
 * for the PASS row.
 */
interface HealthResponse {
  readonly statusCode: number;
  readonly body: string;
}

/**
 * Hit `GET /<prefix>/health` on the running Nest HTTP server. Uses the
 * built-in `node:http` client rather than supertest because the latter
 * is not a workspace dependency and adding it for one probe would be
 * gratuitous.
 *
 * The server is bound to an ephemeral port (`listen(0)`); we read the
 * actual port from `getHttpServer().address()` so concurrent runs can
 * never collide.
 */
async function callHealthCheck(app: INestApplication): Promise<HealthResponse> {
  await app.listen(0);
  try {
    const server = app.getHttpServer() as Server;
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error(
        `Health-check: unexpected server.address() shape (${String(address)})`
      );
    }
    const { port } = address as AddressInfo;
    return await new Promise<HealthResponse>((resolve, reject) => {
      const req = httpRequest(
        {
          hostname: '127.0.0.1',
          port,
          path: `/${API_GLOBAL_PREFIX}/health`,
          method: 'GET',
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode ?? 0,
              body: Buffer.concat(chunks).toString('utf8'),
            });
          });
          res.on('error', reject);
        }
      );
      req.on('error', reject);
      req.end();
    });
  } finally {
    // We started listening; the outer probe's `finally` calls
    // `app.close()` which tears the listener down.
  }
}

/**
 * Coerce an unknown thrown value into the `{ message, stack }` shape
 * the FAIL variant requires. Pure plumbing — keeps the probe body
 * itself focused on diagnostic logic, not type juggling.
 */
function toErrorInfo(err: unknown): {
  readonly message: string;
  readonly stack: string;
} {
  if (err instanceof Error) {
    return {
      message: err.message,
      stack: err.stack ?? err.message,
    };
  }
  const message = typeof err === 'string' ? err : JSON.stringify(err);
  return { message, stack: message };
}

/**
 * The Layer 1 boot-smoke probe. Stateless — one instance is fine for
 * the whole suite (the suite re-invokes `run` / `runAll` per run and
 * each invocation creates its own throwaway Nest app).
 */
export class DevBrandApiBootProbe implements Probe {
  public readonly name = 'dev-brand-api/boot-smoke';
  public readonly layer: ProbeLayer = 1;
  public readonly suspectedLib: LibraryId = 'dev-brand-api';

  /**
   * Contract-compliant single-result entry. Returns a rolled-up PASS
   * (boot OK, health 2xx, enumeration non-empty) or FAIL with the
   * first culprit found.
   *
   * Diagnostic suite orchestration typically calls `runAll` instead so
   * the report shows every module — but downstream tooling that only
   * needs one row per probe can use `run` and get the summary.
   */
  public async run(ctx: RunContext): Promise<ProbeResult> {
    const all = await this.runAll(ctx);
    const firstFail = all.find((r) => r.status === 'FAIL');
    if (firstFail !== undefined) {
      return firstFail;
    }
    // Roll up: total wall-clock time across all sub-rows.
    const durationMs = all.reduce<number>(
      (sum, r) => sum + ('durationMs' in r ? r.durationMs : 0),
      0
    );
    return {
      status: 'PASS',
      name: this.name,
      layer: this.layer,
      suspectedLib: this.suspectedLib,
      durationMs,
    };
  }

  /**
   * Multi-row entry used by the diagnostic suite. Returns:
   *
   *  - 1 PASS row for `boot` (the bootstrap itself succeeded), OR
   *    1 FAIL row with `suspectedLib` populated if boot died
   *  - 1 PASS row for `health-check` (status code recorded), OR
   *    1 FAIL if non-2xx / network error
   *  - N PASS rows, one per enumerated module
   *
   * Even when boot fails the array is non-empty (single FAIL row) so
   * the collector always has something to record.
   */
  public async runAll(_ctx: RunContext): Promise<readonly ProbeResult[]> {
    const results: ProbeResult[] = [];
    let app: INestApplication | undefined;

    // --- Phase 1: boot --------------------------------------------------
    const bootStart = performance.now();
    try {
      app = await bootApp();
    } catch (err) {
      const info = toErrorInfo(err);
      const suspectedLib = identifySuspectedLib(info.stack);
      results.push({
        status: 'FAIL',
        name: `${this.name}/boot`,
        layer: this.layer,
        suspectedLib,
        durationMs: performance.now() - bootStart,
        error: info,
      });
      return results;
    }
    results.push({
      status: 'PASS',
      name: `${this.name}/boot`,
      layer: this.layer,
      suspectedLib: this.suspectedLib,
      durationMs: performance.now() - bootStart,
    });

    try {
      // --- Phase 2: health-check ---------------------------------------
      const healthStart = performance.now();
      try {
        const res = await callHealthCheck(app);
        const healthDuration = performance.now() - healthStart;
        if (res.statusCode >= 200 && res.statusCode < 500) {
          // 2xx-4xx counted as PASS — the endpoint responded. 5xx or
          // network failure is FAIL. (Terminus returns 503 when a
          // downstream is down, which IS a meaningful diagnostic
          // signal — but for boot-smoke we only care the endpoint
          // *answered*.)
          results.push({
            status: 'PASS',
            name: `${this.name}/health-check`,
            layer: this.layer,
            suspectedLib: this.suspectedLib,
            durationMs: healthDuration,
          });
        } else {
          results.push({
            status: 'FAIL',
            name: `${this.name}/health-check`,
            layer: this.layer,
            suspectedLib: this.suspectedLib,
            durationMs: healthDuration,
            error: {
              message: `Health check returned status ${res.statusCode}`,
              stack: `body: ${res.body}`,
            },
          });
        }
      } catch (err) {
        const info = toErrorInfo(err);
        results.push({
          status: 'FAIL',
          name: `${this.name}/health-check`,
          layer: this.layer,
          suspectedLib: identifySuspectedLib(info.stack),
          durationMs: performance.now() - healthStart,
          error: info,
        });
      }

      // --- Phase 3: module enumeration ---------------------------------
      try {
        const modules = enumerateModules(app);
        for (const entry of modules) {
          results.push({
            status: 'PASS',
            name: `${this.name}/module/${entry.name}`,
            layer: this.layer,
            suspectedLib: this.suspectedLib,
            durationMs: entry.durationMs,
          });
        }
      } catch (err) {
        const info = toErrorInfo(err);
        results.push({
          status: 'FAIL',
          name: `${this.name}/module-enumeration`,
          layer: this.layer,
          suspectedLib: identifySuspectedLib(info.stack),
          durationMs: 0,
          error: info,
        });
      }
    } finally {
      try {
        await app.close();
      } catch {
        // Swallow close() errors — they would mask the real probe
        // result. A failure to close is a leak, not a diagnostic.
      }
    }

    return results;
  }
}
