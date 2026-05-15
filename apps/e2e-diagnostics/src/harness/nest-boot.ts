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

import type {
  INestApplication,
  INestApplicationContext,
  Type,
} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

/**
 * `AppModule` is loaded via `require()` rather than a static import so
 * the e2e-diagnostics tsconfig does not transitively type-check every
 * `@hive-academy/*` library (the libs carry pre-existing strictness
 * violations — TS6133/TS2589 — that are outside this suite's scope).
 *
 * Runtime behaviour is identical to a static import; only the
 * compile-time graph is trimmed.
 */
function loadAppModule(): Type<unknown> {
  const mod = require('../../../dev-brand-api/src/app/app.module') as {
    AppModule: Type<unknown>;
  };
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
