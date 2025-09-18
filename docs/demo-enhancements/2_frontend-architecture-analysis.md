# Frontend Architecture Analysis (dev-brand-ui)

Date: 2025-09-15
Scope: `apps/dev-brand-ui`

## 1. Current Structure Overview

```
app/
  app.routes.ts (lazy feature routing)
  core/
    interfaces/ (agent-state, websocket message types)
    services/
      websocket.service.ts
      showcase-api.service.ts
      agent-communication.service.ts
      streaming-integration.service.ts
      three-integration.service.ts
    state/ (global signals & store services)
    utils/
  features/
    spatial-interface/ (large orchestrating component + subcomponents, services)
    chat-interface/
    memory-constellation/
    workflow-canvas/
    landing-page/
    content-forge/
  shared/
    navigation/ (shared presentational component)
```

Observations:

- Feature folders exist but some features (e.g. spatial-interface) contain both presentation & complex orchestration logic.
- Core services contain domain-like logic (agent communication simulation) along with infrastructure (websocket) & API clients.
- Mixed concerns: `websocket.service.ts` (transport), `agent-communication.service.ts` (domain + simulation + state mutation), `spatial-interface.component.ts` (view + orchestration + test fixture creation).
- Environment usage inconsistent: some direct hardcoded URLs (e.g. `http://localhost:3000/api/customer-support/agents`).
- No shared typed client abstractions per feature; `showcase-api.service.ts` large and multi-purpose.

## 2. Layer & Responsibility Assessment

| Layer | Current Reality | Issues | Target |
|-------|-----------------|--------|--------|
| UI Components | Mix of smart (spatial-interface) & dumb | Smart components too large; hidden state transitions | Convert to Presentation + Container pattern with signals/store |
| State Management | Ad-hoc signals inside services & components | No feature boundary; global risk | Introduce feature store per slice (e.g. `customer-support.store.ts`) |
| Data Access | Direct HttpClient calls in services | Duplicated error handling, no retry/backoff patterns centralised | Data-access layer (e.g. `data-access/customer-support.api.ts`) |
| Realtime | WebSocket service generic but event routing manual | Hard to mock events in tests | Event bus + typed channel registry |
| Domain Models | Interfaces scattered in `core/interfaces` | Risk of coupling unrelated features | Co-locate per feature under `feature/<name>/models` |
| Testing | Some specs present, complex features under-tested | Difficult because of large components | Smaller units + test harness per feature store |

## 3. Identified Hardcoded / Dummy Logic (Frontend)

| Location | Description | Risk | Recommendation |
|----------|-------------|------|---------------|
| `spatial-interface.component.ts#loadAgentsFromBackend` | Hardcoded URL & fallback to mock agents | Environment drift & prod/test inconsistency | Extract to `customer-support.api` + baseUrl from `environment.apiUrl` |
| `spatial-interface.component.ts#createMockAgents` | Mock agent list inside production component | Inflates bundle & logic mixing | Move to `fixtures/agents.fixture.ts` behind dev flag |
| `agent-communication.service.ts` (not fully reviewed) | Simulated events & states | Hard to replace with real backend | Strategy pattern (Simulated vs Live adapter) |
| `showcase-api.service.ts` | Mixed endpoint set (patterns, search, capabilities) | Single large service (>400 lines potential) | Separate per bounded context: `showcase-patterns.api.ts`, `showcase-search.api.ts` |

## 4. UI -> Backend Coupling Issues

- Raw string event types & endpoints referenced at call sites; no central contract map.
- SSE vs WebSocket event shapes not unified in a single stream abstraction.
- Error handling repeated (console + generic `Error`).

## 5. Proposed Feature-Based Folder Architecture

```
app/
  features/
    customer-support/
      ui/
        ticket-list/ (components)
        ticket-detail/
        approve-dialog/
      data-access/
        customer-support.api.ts
        agents.api.ts
        models/
          ticket.model.ts
          agent.model.ts
          metrics.model.ts
      state/
        customer-support.store.ts (signals or @ngrx/signals if added later)
        selectors.ts
        adapters.ts (normalization helpers)
      realtime/
        ticket-events.channel.ts (wraps ws service)
        event-types.ts
      fixtures/ (dev only, tree-shake via environment flag)
        agents.fixture.ts
      index.ts (barrel re-export internal public surface)
    spatial-visualization/
      ui/...
      data-access/
      state/
      realtime/
    showcase/
      data-access/
      ui/
      state/
  core/
    api/
      http-client.factory.ts (sets base headers, interceptors)
      error.interceptor.ts
      retry.strategy.ts
    realtime/
      websocket.service.ts (pure transport layer)
      event-bus.service.ts
    config/
      feature-flags.ts
    utils/
    layout/
  shared/
    ui/ (presentational components)
    lib/ (pure utility functions)
```

Principles:

- Every feature exports ONLY what other features need (UI components + store facade + data-access facade).
- Transport/infrastructure concerns centralized in `core`.
- Mock/fixtures isolated & excluded from prod builds (conditional import or file replacement).

## 6. State Management Strategy

Option A (Native Signals + Facade): Keep lightweight, introduce `FeatureStore` classes encapsulating signal state + derived computed selectors.
Option B (NgRx Signals Store later): Add when complexity or cross-feature synchronization grows.
Initial Recommendation: Option A with explicit typed actions as methods on store for discoverability.

Example (ticket store sketch):

```ts
@Injectable({ providedIn: 'root' })
export class CustomerSupportStore {
  private readonly tickets = signal<Record<string, Ticket>>({});
  private readonly loading = signal(false);
  private readonly selectedId = signal<string | null>(null);

  readonly vm = computed(() => ({
    tickets: Object.values(this.tickets()),
    loading: this.loading(),
    selected: this.selectedId() ? this.tickets()[this.selectedId()!] : null
  }));

  setLoading(v: boolean) { this.loading.set(v); }
  upsertTickets(list: Ticket[]) { ... }
  select(id: string | null) { this.selectedId.set(id); }
}
```

## 7. Realtime Event Normalization

Introduce unified `RealtimeEvent<T>` shape:

```ts
interface RealtimeEvent<T> {
  type: string;            // namespaced (e.g. ticket.progress)
  payload: T;              // validated data
  meta: { ts: number; v:1; source:'ws'|'sse' };
}
```

Channel adapter maps raw WebSocket or SSE message -> `RealtimeEvent`.
Frontend consumes `Observable<RealtimeEvent<any>>` + feature-specific type guards.

## 8. Error Handling & Resilience Improvements

| Concern | Current | Improvement |
|---------|---------|------------|
| HTTP Errors | Local catchError with console logging | Central `HttpErrorInterceptor` + typed `ApiError` model |
| Reconnect Strategy | Implemented in websocket service | Add backoff strategy injection + metrics hooks |
| Mock vs Live | Interwoven | Injection token: `AGENT_DATA_SOURCE` -> `LiveAgentDataSource` / `MockAgentDataSource` |
| Retry Semantics | Ad-hoc RxJS retry() | Central retry utility reading from config (max attempts, status code filters) |

## 9. Performance Considerations

- Large spatial component performing animation loop; ensure change detection isolation (OnPush already) + possibly move heavy loops to Web Worker or OffscreenCanvas later.
- Lazy load heavy 3D libraries (dynamic import) and split spatial feature into sub-routes if necessary.
- Memoize derived computationally expensive selectors (signals already cheap, but guard object churn in lists via normalization).

## 10. Incremental Refactor Roadmap

| Phase | Goal | Slice |
|-------|------|-------|
| 0 | Extract customer-support feature folder & move API calls | Low risk |
| 1 | Create `customer-support.store.ts` with basic ticket load + submit | Medium |
| 2 | Introduce `realtime/ticket-events.channel.ts` mapping ws events | Medium |
| 3 | Remove hardcoded agent load; replace with `agents.api.ts` + fixture fallback | Medium |
| 4 | Split `showcase-api.service.ts` into context-specific files | Medium |
| 5 | Add unified `ApiHttpClient` factory + error interceptor | Low |
| 6 | Migrate spatial-interface to consume store facades instead of direct service mutation | High |

## 11. DX & Testing Enhancements

- Provide Storybook (optional) or component harness tests for UI pieces.
- Add test utilities for realtime event simulation.
- Snapshot tests for store state transitions given sequences of events.

## 12. Expected Benefits

| Metric | Current | Target |
|--------|---------|--------|
| Bundle Clarity | Mixed concerns | Clear vertical slices |
| Mock Swap Ease | Manual edits | Token-based injection |
| Test Coverage Potential | Moderate | High (pure stores + adapters) |
| Maintainability | Medium risk | High |
| Onboarding Time | High (implicit flows) | Reduced (documented contracts) |

## 13. Immediate Action Items

1. Create `features/customer-support` with subfolders (ui, data-access, state, realtime, fixtures, models).
2. Move agent + ticket API interactions out of spatial component.
3. Introduce `RealtimeEvent` & simple adapter wrapping WebSocket messages.
4. Extract mock agent generation to fixtures with feature flag gating.
5. Split `showcase-api.service.ts` (> single-responsibility principle) by context.

## 14. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Refactor churn breaking existing demos | Introduce new feature modules parallel, deprecate old paths gradually |
| Increased file count overhead | Provide index barrels & Nx generator schematics |
| Runtime regression in spatial visualization | Add pre-refactor screenshot / metrics baseline & minimal e2e |

## 15. Summary

The UI has an encouraging feature directory baseline but suffers from orchestration & infrastructure concerns embedded in components and core services. Implementing per-feature data-access + state + realtime channels with unified event contracts will significantly improve clarity, testability, and resilience.

---
Generated automatically. See complementary documents for backend analysis, interaction map, hardcoded audit, and refactor plan.
