/**
 * Layer 2 — langgraph-platform diagnostic probe.
 *
 * Inspects `@hive-academy/langgraph-platform`'s public surface and asks
 * a single question: is there anything Node-testable wired into the real
 * `dev-brand-api` composition root that this suite can exercise end-to-end?
 *
 * Why this probe always emits MISSING (not FAIL, not PASS):
 *
 *  1. The library exports `PlatformModule`, `PlatformClientService`,
 *     `WebhookService` plus type-only interfaces. These are HTTP-client
 *     wrappers around the remote LangGraph Platform API (verified in
 *     libs/langgraph-modules/platform/CLAUDE.md — "Real HTTP client
 *     implementation using @nestjs/axios").
 *
 *  2. `dev-brand-api` ships a `getPlatformConfig()` factory at
 *     `apps/dev-brand-api/src/app/config/platform.config.ts` but does
 *     NOT import `PlatformModule` into its `AppModule`. Grep confirms
 *     zero `PlatformModule.forRoot` / `PlatformModule,` references in
 *     `apps/dev-brand-api/src/`. The config function is dead code from
 *     a DI-reachability standpoint.
 *
 *  3. Even if the module were imported, exercising it without a real
 *     LangGraph Platform API key + remote endpoint would assert HTTP
 *     plumbing against a non-existent server. That is a network
 *     contract test, not an in-process diagnostic — and would belong
 *     in a separate harness with its own credentials.
 *
 * The MISSING result IS the diagnostic value here: it documents the
 * gap between "library is published" and "library is wired into the
 * real app" so the reporter (Task 7.1) can surface it in
 * `future-enhancements.md` as a deferred integration (Req 3.8, 3.11).
 *
 * No DI boot, no fixtures — pure surface inspection via `require()`.
 */

import type {
  LibraryId,
  Probe,
  ProbeLayer,
  ProbeResult,
} from '../../contracts';

/**
 * Minimal structural slice of the platform module entry. We only read
 * the names of exported keys; we never invoke any service. Locally
 * declared to keep the platform lib's HTTP-client type graph out of
 * e2e-diagnostics' type-check (same local-shape rationale as the
 * other Layer-2 probes).
 */
interface PlatformModuleExportsLike {
  readonly [key: string]: unknown;
}

function loadPlatformExports(): PlatformModuleExportsLike {
  return require('@hive-academy/langgraph-platform') as PlatformModuleExportsLike;
}

/**
 * Returns the sorted list of value-level export names from the
 * platform package. Type-only exports are erased at runtime, so this
 * intentionally captures the runtime surface only — the actual set of
 * things a consumer could instantiate or call.
 */
function listValueExports(mod: PlatformModuleExportsLike): readonly string[] {
  return Object.keys(mod)
    .filter((k) => mod[k] !== undefined)
    .sort();
}

export class PlatformProbe implements Probe {
  public readonly name = 'langgraph-platform/surface-check';
  public readonly layer: ProbeLayer = 2;
  public readonly suspectedLib: LibraryId = 'langgraph-platform';

  public run(): Promise<ProbeResult> {
    return Promise.resolve(this.inspect());
  }

  private inspect(): ProbeResult {
    // Inspect the public surface. We don't boot a Nest context here:
    // dev-brand-api doesn't register PlatformModule, so there's nothing
    // resolvable to assert against, and exercising HTTP-client services
    // without a real platform endpoint would be a network contract
    // test, not an in-process diagnostic.
    let exportedNames: readonly string[];
    try {
      const mod = loadPlatformExports();
      exportedNames = listValueExports(mod);
    } catch (err) {
      // The library failed to resolve at all — still emit MISSING (not
      // FAIL) because the diagnostic conclusion is identical: no
      // Node-testable surface reachable from this suite.
      const reason = err instanceof Error ? err.message : String(err);
      return {
        status: 'MISSING',
        name: this.name,
        layer: this.layer,
        suspectedLib: this.suspectedLib,
        expected: 'public platform integration surface',
        observedIn: `package not resolvable: ${reason}`,
      };
    }

    // Even though PlatformClientService + WebhookService exist as
    // exports, they are NOT wired into dev-brand-api's AppModule
    // (verified: zero `PlatformModule.forRoot` references in
    // apps/dev-brand-api/src/). The resulting MISSING entry documents
    // the integration gap for the reporter to route into
    // future-enhancements.md.
    const observedIn =
      exportedNames.length === 0
        ? 'package exports no runtime values'
        : `package exports [${exportedNames.join(
            ', '
          )}] but PlatformModule is not registered in dev-brand-api AppModule (no in-process surface reachable without a remote LangGraph Platform endpoint)`;

    return {
      status: 'MISSING',
      name: this.name,
      layer: this.layer,
      suspectedLib: this.suspectedLib,
      expected: 'public platform integration surface',
      observedIn,
    };
  }
}
