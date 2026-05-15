/**
 * PreflightService — service-reachability snapshot captured ONCE per
 * run, before any probe executes. Result populates
 * `RunContext.preflight` so probes whose required service is
 * `unreachable` immediately short-circuit to `SKIPPED` rather than
 * `FAIL` (Req NFR-reliability — distinguishes infra fault from library
 * fault).
 *
 * Strict guarantees:
 *  - Never throws. Any error (timeout, network, auth, malformed url)
 *    is converted to `'unreachable'`.
 *  - 5-second hard timeout per service (caller never blocks > 5s per
 *    check; checks run in parallel so wall-clock is ~5s worst case).
 *  - Uses raw clients from `harness/service-clients.ts`. No NestJS DI.
 */

import type {
  PreflightSnapshot,
  PreflightStatus,
} from '../contracts/probe.contract';
import {
  createChromaClient,
  createNeo4jDriver,
  createRedisClient,
} from '../harness/service-clients';

/** Hard ceiling per check. Exposed for readability, not configurable. */
const TIMEOUT_MS = 5_000;

/**
 * Race a promise against a timeout. Resolves to `'unreachable'` on
 * either the promise rejecting or the timeout firing first. Never
 * rejects.
 *
 * The timer is cleared in a `finally` so the Node process can exit
 * cleanly even when the underlying op succeeds before the timeout.
 */
async function withTimeout(
  op: () => Promise<unknown>
): Promise<PreflightStatus> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<PreflightStatus>((resolve) => {
    timer = setTimeout(() => resolve('unreachable'), TIMEOUT_MS);
  });
  const work = op()
    .then<PreflightStatus>(() => 'ready')
    .catch<PreflightStatus>(() => 'unreachable');
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

export class PreflightService {
  /**
   * Probe ChromaDB via the official client's `heartbeat()` method,
   * which calls `/api/v2/heartbeat` under the hood (verified against
   * `chromadb@3.x` dist). No need to hand-roll a fetch.
   */
  private async checkChromaDb(): Promise<PreflightStatus> {
    return withTimeout(async () => {
      const client = createChromaClient();
      await client.heartbeat();
    });
  }

  /**
   * Probe Neo4j via `driver.verifyConnectivity()`. The driver is
   * always closed in `finally` so a successful connectivity check
   * doesn't leak background workers into Jest's open-handle detector.
   */
  private async checkNeo4j(): Promise<PreflightStatus> {
    return withTimeout(async () => {
      const driver = createNeo4jDriver();
      try {
        await driver.verifyConnectivity();
      } finally {
        await driver.close();
      }
    });
  }

  /**
   * Probe Redis with `connect()` + `PING`. node-redis v4 requires an
   * explicit connect; we also explicitly `quit()` to avoid lingering
   * sockets.
   *
   * We also swallow `error` events (node-redis emits an unhandled
   * 'error' event on connect failure even though our promise chain
   * already catches the rejection — without this listener Node would
   * print to stderr).
   */
  private async checkRedis(): Promise<PreflightStatus> {
    return withTimeout(async () => {
      const client = createRedisClient();
      client.on('error', () => {
        /* swallow — promise rejection is the source of truth */
      });
      try {
        await client.connect();
        const pong = await client.ping();
        if (pong !== 'PONG') {
          throw new Error(`unexpected redis ping response: ${pong}`);
        }
      } finally {
        try {
          await client.quit();
        } catch {
          /* best-effort close */
        }
      }
    });
  }

  /**
   * Run all three checks in parallel. Total wall-clock is bounded by
   * the slowest check (≤ 5s). Result is immutable.
   */
  public async run(): Promise<PreflightSnapshot> {
    const [chromadb, neo4jStatus, redis] = await Promise.all([
      this.checkChromaDb(),
      this.checkNeo4j(),
      this.checkRedis(),
    ]);
    return Object.freeze({
      chromadb,
      neo4j: neo4jStatus,
      redis,
    });
  }
}
