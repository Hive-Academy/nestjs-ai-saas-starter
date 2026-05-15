/**
 * Layer 2 — langgraph-angular diagnostic probe.
 *
 * Always returns SKIPPED. The `@hive-academy/langgraph-angular` package
 * is a browser-only Angular library: its public surface is composed of
 * Angular services (`LangGraphSseService`, `LangGraphWorkflowStateService`,
 * `LangGraphStreamingService`), an Angular component (`LgDynamicComponent`),
 * Angular composables (`useLangGraph*`), and an Angular DI provider
 * (`provideLangGraph`) — all of which depend on `@angular/core` runtime
 * primitives (`inject()`, signals, `EnvironmentInjector`) that have no
 * meaning in a Node-only `INestApplicationContext`.
 *
 * Verifying this library requires a separate Angular harness — either a
 * Karma/Jest-Angular suite running inside `TestBed`, or a real
 * browser-driven e2e (Playwright / Cypress) hitting a running Angular
 * shell. Both are outside the scope of this Node-based diagnostics app
 * (verified scope: `apps/e2e-diagnostics/project.json` declares
 * `executor: '@nx/node:webpack'`).
 *
 * The SKIPPED result IS the diagnostic value here: it documents that
 * coverage exists in principle but is deferred to a separate harness,
 * so the reporter (Task 7.1) can route this into
 * `future-enhancements.md` as a known gap (Req 3.9).
 *
 * Architect-specified reason string is preserved verbatim.
 *
 * No DI boot, no surface inspection, no fixtures. The probe is a pure
 * documentation artefact.
 */

import type {
  LibraryId,
  Probe,
  ProbeLayer,
  ProbeResult,
} from '../../contracts';

export class LanggraphAngularProbe implements Probe {
  public readonly name = 'langgraph-angular/skipped';
  public readonly layer: ProbeLayer = 2;
  public readonly suspectedLib: LibraryId = 'langgraph-angular';

  public run(): Promise<ProbeResult> {
    return Promise.resolve(this.result());
  }

  private result(): ProbeResult {
    return {
      status: 'SKIPPED',
      name: this.name,
      layer: this.layer,
      suspectedLib: this.suspectedLib,
      reason: 'browser-only library; requires separate Angular harness',
    };
  }
}
