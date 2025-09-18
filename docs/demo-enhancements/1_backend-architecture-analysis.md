# Backend Architecture Analysis (dev-brand-api)

Date: 2025-09-15
Scope: `apps/dev-brand-api`
Branch: feature/TASK_INT_001-streaming-integration-blueprint

## 1. Current High-Level Structure
```
app/
  app.module.ts (assembles all infra + business modules)
  adapters/ (chroma, neo4j, hitl, interruption)
  config/ (factory functions returning raw objects)
  business-workflows/
    business-workflows.module.ts
    agents/ (CustomerSupportAgent)
    controllers/ (CustomerSupportController)
    services/ (mixed domain + orchestration responsibilities)
    workflows/ (CustomerSupportWorkflow, EnhancedSupportWorkflow)
    dto/, types/ (API contracts + internal types mixed)
    ... metrics, knowledge base, ticket mgmt, interruption services
  showcase/ (parallel module demonstrating patterns)
  streaming/ (tests)
```
Observations:
- Single "BusinessWorkflowsModule" acts as a god-module for the customer-support feature.
- Domain logic (ticket lifecycle, knowledge base) mixed with orchestration (workflow execution, streaming progress) inside same service classes (e.g. `TicketManagementService`).
- No clear separation of domain/application/infrastructure layers; repository pattern absent (graph/vector access abstracted only indirectly via memory / adapters).
- Configuration scattered across multiple `getXConfig` functions (fine) but no central validation schema (e.g. Zod / Joi) executed once at bootstrap.
- Hardcoded / mock responses (agents list, ticket IDs) still present inside production controller/service paths.
- Workflow-centric services are strongly coupled to specific multi-agent framework classes (e.g. `WorkflowManagerService`) inhibiting testability.
- Types: Internal types & externally exposed DTOs appear co-located; potential duplication risk vs shared libs (must check `@hive-academy/shared` for reuse, but out-of-scope here— mandate: search first before adding new types).

## 2. Layering Evaluation
| Aspect | Current | Issue | Impact |
|--------|---------|-------|--------|
| Domain Entities | Implicit (plain objects) | No explicit entity modeling | Harder to evolve invariants, validation duplication |
| Repositories / Ports | Absent (using framework services directly) | Tight coupling to workflow/memory libs | Harder to swap persistence or simulate in tests |
| Application Services | Mixed with domain + transport concerns | Violates SRP | Larger classes (>200 lines risk) |
| Controllers | Heavy mapping logic + some fallback logic | Should be thin | Harder to test business logic |
| Config | Factory per concern | Lacks centralized validation & typed contract | Runtime misconfig risk |
| Error Handling | Try/catch returning `{ success:false }` objects | No unified exception strategy | Inconsistent HTTP semantics, complicates clients |
| Streaming | SSE + WebSocket both used, ad-hoc URLs | No contract versioning | Frontend coupling & drift risk |

## 3. Modularity & Feature Slicing Gaps
- Feature boundary (Customer Support) not encapsulated as vertical slice with internal sublayers.
- Cross-cutting capabilities (streaming, HITL, checkpoint) wired at root; usage should inject via interfaces defined in feature slice (Hexagonal approach) → create ports like `TicketWorkflowPort`, `ApprovalGatewayPort`.
- Knowledge base, metrics, tickets, interruptions each qualify as sub-features; currently flattened.

## 4. Identified Hardcoded / Dummy Logic (Backend)
| Location | Description | Risk | Suggested Fix |
|----------|-------------|------|---------------|
| `customer-support.controller.ts#getAvailableAgents` | Static array of one mock agent | Misleads UI, blocks dynamic registry | Introduce AgentRegistry service + repository port |
| `ticket-management.service.ts#generateTicketId` | Ad-hoc ID function | Non-deterministic format & scaling | Replace with ULID/UUID service | 
| Various services (status/progress estimation) | Hardcoded estimation logic (5 min) | Inaccurate metrics | Move to `ExecutionProgressEstimator` strategy |
| Knowledge base seeding (not shown) | Likely mock data population | Non-prod initialization pattern | Replace with migration/seed pipeline behind env flag |

Full detailed audit in separate file `4_hardcoded-audit.md` (to be generated).

## 5. Coupling Hotspots
| Class | Coupled To | Concern |
|-------|------------|---------|
| `TicketManagementService` | WorkflowManagerService, CustomerSupportWorkflowService, direct instance metadata shape | Orchestration + domain + query responsibilities conflated |
| `CustomerSupportController` | Four management services | Controller boundary OK, but responses manually shaped without DTO mappers |
| `BusinessWorkflowsModule` | Injects Config logic + AI agent + workflows | Module initialization mixes config provisioning & domain exports |
| Config factories | Directly produce JS objects | Missing typed schema -> latent config drift |

## 6. Testing & Observability Considerations
- Absence of distinct in-memory fakes (e.g., TicketRepositoryInMemory) hinders fast unit tests; reliance on multi-agent runtime for ticket state.
- Workflow progress & event subscription logic intertwined with data retrieval logic; propose event dispatcher domain events -> adapters emit SSE/WebSocket messages.
- Monitoring module imported but no specific feature-level telemetry wrappers (e.g., `TicketMetricsRecorder`).

## 7. Proposed Target Architecture (Feature-based + Clean/Hexagonal Hybrid)
```
app/
  customer-support/
    customer-support.module.ts
    domain/
      entities/
        ticket.entity.ts
        knowledge-article.entity.ts
        interruption.entity.ts
      value-objects/
        ticket-id.vo.ts
        priority.vo.ts
      services/
        ticket-domain.service.ts (pure business rules)
      events/
        ticket-created.event.ts
        ticket-status-changed.event.ts
      repositories/
        ticket.repository.port.ts
        knowledge.repository.port.ts
    application/
      dto/
        create-ticket.dto.ts
        ticket-response.dto.ts
      services/
        submit-ticket.usecase.ts
        approve-ticket.usecase.ts
        search-knowledge.usecase.ts
      mappers/
        ticket.mapper.ts
      facades/
        customer-support.facade.ts (coordinates workflows + domain)
      orchestrators/
        ticket-workflow.orchestrator.ts (wraps external WorkflowEngine)
    infrastructure/
      persistence/
        neo4j-ticket.repository.ts
        chroma-knowledge.repository.ts
      workflow/
        langgraph-ticket.workflow-adapter.ts
      streaming/
        ticket-stream.publisher.ts (publishes domain events)
      config/
        customer-support.config.ts (validated schema)
    interfaces/
      rest/
        ticket.controller.ts
        knowledge.controller.ts
        metrics.controller.ts
      graphql/ (future)
      ws/
        ticket.gateway.ts (optional)
```
Key principles:
- Controllers talk only to Application Facade / Use Cases (no direct workflow manager usage).
- Use Cases depend on Ports (repositories, workflow adapter, event publisher interface).
- Infrastructure implements Ports & is wired in module provider array.
- Domain layer pure (no Nest imports) enabling isolated tests.
- Streaming enters ONLY via event publisher adapter subscribed to domain events.

## 8. Configuration Strategy
- Introduce `config/validation` using Zod (if allowed) or lightweight manual validator: produce a `CustomerSupportConfig` typed object.
- Central `ConfigTokens` export for DI.
- Example: `export const CUSTOMER_SUPPORT_CONFIG = Symbol('CUSTOMER_SUPPORT_CONFIG');`

## 9. Error & Result Handling
- Replace manual `{ success: boolean }` envelopes with either:
  1. HTTP semantics (throw `HttpException` subclasses) + DTO responses, OR
  2. Consistent `ApiResponse<T>` generic with `data`, `meta`, `errors` arrays + version field.
- Add versioning: header `X-API-Version` or route prefix `/v1/customer-support` (already partial). Reflect version inside response meta.

## 10. Streaming & Realtime Alignment
- Single event model: Domain emits `TicketEvent` variants. Infrastructure maps to:
  - WebSocket events (namespaced: `ticket.updated`, `ticket.progress`)
  - SSE stream endpoints consolidated: `/tickets/:id/events`
- Remove duplication of SSE + per-endpoint `streamTicketUpdates`; unify via event stream aggregator.

## 11. Migration Path (Incremental Refactor Plan)
| Phase | Goals | Risks | Mitigation |
|-------|-------|------|-----------|
| 0 | Introduce new feature module skeleton alongside existing | Dual paths | Keep controllers proxying old services |
| 1 | Extract Domain entities + repositories ports | Type drift | Add mapper tests |
| 2 | Implement infrastructure adapters bridging existing workflow manager | Hidden coupling | Wrap existing manager in adapter interface |
| 3 | Move controller to new application facade | Behavior regression | Write contract tests against old responses |
| 4 | Replace hardcoded agent endpoint with dynamic registry service | Missing data source | Start with in-memory registry seeded from config |
| 5 | Consolidate streaming | Client adaptation | Provide alias events for one release |

## 12. Immediate Actionable Items
1. Create `customer-support` feature directory skeleton.
2. Add domain Ticket entity & repository port.
3. Introduce ULID generator service (pure) + replace ad-hoc ID.
4. Implement basic in-memory TicketRepository (for tests) + adapter registration.
5. Refactor controller to delegate to `CustomerSupportFacade` orchestrating `SubmitTicketUseCase` etc.
6. Introduce event publisher interface + in-memory publisher; later bind to streaming.
7. Replace mock agents endpoint with `AgentRegistryService` (port + in-memory impl) delivering real metadata.

## 13. Risks & Considerations
- Additional verbosity; mitigate via code generators or schematics (Nx generator) for feature scaffolding.
- Must ensure no cross-library re-export violations per repository rules.
- Need to check existing shared libs for duplicate type reuse before creating new DTOs.

## 14. KPI Improvements Expected
| KPI | Current | Target | Mechanism |
|-----|---------|--------|-----------|
| Unit Testability | Low (requires workflow runtime) | High | Ports + pure domain services |
| Change Isolation | Low | Medium/High | Vertical slicing & facade boundary |
| Config Safety | Medium | High | Central validation schema |
| Streaming Consistency | Low | High | Unified event model |
| Hardcoded Logic | Present | Eliminated | Registry + generators + configs |

## 15. Summary
The backend currently centralizes multiple responsibilities inside a single module and service set. Adopting a feature-based vertical slice with Clean/Hexagonal layering will reduce coupling, improve testability, and enable safer evolution of workflow + streaming capabilities.

---
Generated automatically. See complementary documents for frontend, interaction map, hardcoded audit, and refactor plan.
