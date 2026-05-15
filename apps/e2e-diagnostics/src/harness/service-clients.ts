/**
 * Service-client factories — thin wrappers that construct the raw,
 * un-NestJS-wrapped clients for ChromaDB, Neo4j and Redis.
 *
 * These factories are deliberately framework-free: probes and the
 * preflight / cleaner services instantiate them directly, never via
 * NestJS DI. That keeps the diagnostic harness independent from the
 * very libraries it is supposed to diagnose (a probe must not depend
 * on `@hive-academy/nestjs-chromadb` because a fault inside that lib
 * would mask the underlying ChromaDB heartbeat result).
 *
 * Connection details are read from process.env at call time so the
 * suite picks up `dev:services` overrides without restart:
 *
 *  - CHROMADB_URL   (default: http://localhost:8000)
 *  - NEO4J_URI      (default: bolt://localhost:7687)
 *  - NEO4J_USERNAME (default: neo4j)
 *  - NEO4J_PASSWORD (default: password)
 *  - REDIS_URL      (default: redis://localhost:6379)
 */

import neo4j, { type Driver as Neo4jDriver } from 'neo4j-driver';
import { ChromaClient } from 'chromadb';
import { createClient, type RedisClientType } from 'redis';

/**
 * Parsed ChromaDB connection parameters. We split the URL ourselves
 * because `ChromaClient` takes `host` / `port` / `ssl` rather than a
 * single URL string.
 */
interface ChromaConnection {
  readonly host: string;
  readonly port: number;
  readonly ssl: boolean;
}

function parseChromaUrl(raw: string): ChromaConnection {
  const url = new URL(raw);
  const ssl = url.protocol === 'https:';
  const port = url.port.length > 0 ? Number(url.port) : ssl ? 443 : 8000;
  return { host: url.hostname, port, ssl };
}

/**
 * Build a raw `ChromaClient`. Reads `CHROMADB_URL` from env at call
 * time so the suite picks up dev-services overrides without restart.
 */
export function createChromaClient(): ChromaClient {
  const url = process.env['CHROMADB_URL'] ?? 'http://localhost:8000';
  const { host, port, ssl } = parseChromaUrl(url);
  return new ChromaClient({ host, port, ssl });
}

/**
 * Build a raw Neo4j `Driver`. Caller is responsible for `driver.close()`
 * — the factory never holds onto the instance.
 */
export function createNeo4jDriver(): Neo4jDriver {
  const uri = process.env['NEO4J_URI'] ?? 'bolt://localhost:7687';
  const username = process.env['NEO4J_USERNAME'] ?? 'neo4j';
  const password = process.env['NEO4J_PASSWORD'] ?? 'password';
  return neo4j.driver(uri, neo4j.auth.basic(username, password));
}

/**
 * Default node-redis client type — explicit alias makes the public
 * factory return type fully inferable without exposing the long
 * generic form.
 */
export type DefaultRedisClient = RedisClientType<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>
>;

/**
 * Build a raw node-redis v4 client. Caller is responsible for both
 * `connect()` and `quit()` — node-redis does not auto-connect.
 *
 * NOTE: the repo carries `redis` (node-redis v4) transitively, not
 * `ioredis`. We use node-redis directly; its `ping()` semantics are
 * identical for our preflight purposes.
 */
export function createRedisClient(): DefaultRedisClient {
  const url = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
  return createClient({ url }) as DefaultRedisClient;
}
