/**
 * Nest-boot harness — typed wrappers around `NestFactory` that target
 * the real `dev-brand-api` composition root.
 *
 * Two flavours are exposed because the three diagnostic layers have
 * different needs:
 *
 *  - Layer 1 (boot smoke) needs the full HTTP application so it can
 *    hit `/api/health` over a real socket → `bootApp()`.
 *  - Layers 2 & 3 only need DI resolution (workflow services, repos,
 *    storage adapters) — spinning up an HTTP listener for those is
 *    wasteful and racy → `bootContext()`.
 *
 * The harness deliberately matches `apps/dev-brand-api/src/main.ts`
 * setup (global prefix `api`, global validation pipe, cookie parser)
 * so what we boot is bit-for-bit what `npm run start:dev-brand-api`
 * produces. Anything less and Layer 1 would be measuring a stripped
 * NestJS, not the real app.
 *
 * Logger is silenced via `{ logger: false }` because diagnostic runs
 * pipe stdout into a Jest reporter — chatty Nest bootstrap logs would
 * pollute the report and bury real probe output.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  INestApplication,
  INestApplicationContext,
  Type,
} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

/**
 * Absolute path to the pre-built CJS test bundle for `dev-brand-api`.
 *
 * The bundle is produced by the dedicated `build-test-bootstrap` Nx target
 * with `externalDependencies: 'none'`, so every ESM-only dep (e.g.
 * `@langchain/langgraph`, `uuid`, `nanoid`) is inlined into a single CJS
 * artifact. Loading this artifact — rather than the TypeScript source —
 * bypasses swc-jest's CJS retransform of those ESM-only packages, which
 * is the root cause of `ERR_REQUIRE_ESM` at AppModule construction time.
 *
 * Resolved from `__dirname` so the path stays correct whether Jest runs
 * from the workspace root, the project root, or anywhere else.
 *
 * Layout (repo-root anchored):
 *   apps/e2e-diagnostics/src/harness/nest-boot.ts
 *   →   ../../../..             → repo root
 *   →   dist-test/apps/dev-brand-api/test-bootstrap.js
 */
const TEST_BOOTSTRAP_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'dist-test',
  'apps',
  'dev-brand-api',
  'test-bootstrap.js'
);

/**
 * Load `AppModule` from the pre-built test bundle.
 *
 * Why the bundle (and not the source):
 * - swc-jest rewrites static `import` statements to `require()` calls.
 *   When a `require()` lands on an ESM-only dep (`"type": "module"`),
 *   Node throws `ERR_REQUIRE_ESM` and the AppModule never constructs.
 * - The bundle has all ESM deps inlined, so there is no runtime
 *   `require()` of an ESM module — only normal webpack module IDs
 *   inside a self-contained CJS file. Node loads it cleanly.
 *
 * If the bundle is missing, fail loudly with a remediation hint rather
 * than crashing deep inside Node's module resolver.
 */
function loadAppModule(): Type<unknown> {
  if (!existsSync(TEST_BOOTSTRAP_PATH)) {
    throw new Error(
      'Run `npx nx build-test-bootstrap dev-brand-api` before npm run e2e ' +
        '(or use the npm e2e script which chains them). ' +
        `Expected bundle at: ${TEST_BOOTSTRAP_PATH}`
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(TEST_BOOTSTRAP_PATH) as {
    AppModule?: Type<unknown>;
  };
  if (!mod?.AppModule) {
    throw new Error(
      `[nest-boot] test-bootstrap.js did not export AppModule. ` +
        `Path resolved to: ${TEST_BOOTSTRAP_PATH}. ` +
        'Re-run `npx nx build-test-bootstrap dev-brand-api`.'
    );
  }
  return mod.AppModule;
}

/**
 * Global API prefix mirrored from `dev-brand-api/src/main.ts`. Exposed
 * so probes can construct the same URLs the live app would serve.
 */
export const API_GLOBAL_PREFIX = 'api';

/**
 * Boot the real `AppModule` as a full HTTP application. The returned
 * instance is `init()`-ed but NOT yet listening — callers decide
 * whether to bind a port (boot-smoke probe binds an ephemeral port;
 * other tests can stay in-memory).
 *
 * Callers MUST call `app.close()` in a `finally` block. The harness
 * intentionally does not register a process-level shutdown hook —
 * suite-level orchestration owns that responsibility.
 */
export async function bootApp(): Promise<INestApplication> {
  // `abortOnError: false` is critical — by default NestFactory calls
  // `process.exit(1)` if module instantiation throws, which would kill
  // the whole Jest run. The diagnostic suite must observe failures as
  // thrown errors, not as process-exit, so each probe stays isolated.
  const app = await NestFactory.create(loadAppModule(), {
    logger: false,
    abortOnError: false,
  });
  app.use(cookieParser());
  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );
  await app.init();
  return app;
}

/**
 * Boot the real `AppModule` as an application context (DI container
 * only — no HTTP server, no platform adapters). Suitable for Layers 2
 * and 3 where probes resolve services via `context.get(Token)` and
 * never make HTTP calls into the app.
 *
 * Callers MUST call `context.close()` in a `finally` block.
 */
export async function bootContext(): Promise<INestApplicationContext> {
  // See `bootApp` — `abortOnError: false` prevents NestFactory from
  // calling `process.exit(1)` on bootstrap failure, which is required
  // for probe isolation under Jest.
  return NestFactory.createApplicationContext(loadAppModule(), {
    logger: false,
    abortOnError: false,
  });
}
