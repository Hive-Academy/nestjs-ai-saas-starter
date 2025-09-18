# Recommended Architecture Refactor Plan

Date: 2025-09-15

## 1. Objectives
- Establish vertical feature slices for Customer Support domain (and others later).
- Introduce Clean/Hexagonal style boundaries: domain, application, infrastructure, interfaces.
- Unify realtime event model & streaming approach.
- Eliminate hardcoded/demo logic from production paths while preserving demo capability via fixtures & feature flags.
- Improve testability & observability.

## 2. Guiding Principles
| Principle | Rationale |
|-----------|-----------|
| Boundary Clarity | Reduce incidental coupling & accelerate onboarding |
| Pure Domain | Enable fast unit tests, protect business invariants |
| Port/Adapter | Abstract workflow engine, vector search, graph DB away from core logic |
| Contract Versioning | Forward-compatible evolution of APIs & events |
| Single Source of Config Truth | Prevent drift & runtime surprises |
| Telemetry First | Measure latency, failures, throughput early |

## 3. Refactor Phases Summary
| Phase | Name | Primary Deliverable | Duration (est) |
|-------|------|---------------------|----------------|
| 0 | Foundation | Skeleton feature module + tokens | 0.5 day |
| 1 | Domain Extraction | Entities + Repositories (ports) + Value Objects | 1 day |
| 2 | Application Layer | Use Cases + Facade + DTO mappers | 1 day |
| 3 | Infrastructure Adapters | Neo4jTicketRepository + WorkflowAdapter + EventPublisher | 1.5 days |
| 4 | Controller Migration | New controllers using facade + response envelope | 0.5 day |
| 5 | Realtime Unification | Event taxonomy + WS adapter + SSE fallback | 1 day |
| 6 | Frontend Feature Slice | customer-support feature: data-access, store, realtime channel | 1 day |
| 7 | Cleanup & Deprecation | Remove legacy endpoints, mark deprecated | 0.5 day |

## 4. Detailed Work Breakdown
### Phase 0: Foundation
- Create `app/customer-support` directory with module + index barrel.
- Define DI tokens (symbols) for ports: `TICKET_REPOSITORY`, `WORKFLOW_ADAPTER`, `EVENT_PUBLISHER`, `AGENT_REGISTRY`.
- Add config schema (Zod or manual) returning `CustomerSupportConfig`.

### Phase 1: Domain Extraction
Artifacts:
- `domain/entities/ticket.entity.ts`
- `domain/value-objects/ticket-id.vo.ts` (ULID wrapper)
- `domain/repositories/ticket.repository.port.ts`
- `domain/events/*.event.ts`
Logic:
- Pure TypeScript (no Nest imports).
- Domain service (if needed) for ticket state transitions `TicketDomainService`.

### Phase 2: Application Layer
Artifacts:
- `application/dto/create-ticket.dto.ts`, `ticket-response.dto.ts`
- `application/services/submit-ticket.usecase.ts`
- `application/services/approve-ticket.usecase.ts`
- `application/facade/customer-support.facade.ts`
- `application/mappers/ticket.mapper.ts`
Responsibilities:
- Coordinate repository + workflow adapter + event publication.
- Shape output API DTOs.

### Phase 3: Infrastructure Adapters
Artifacts:
- `infrastructure/persistence/neo4j-ticket.repository.ts`
- `infrastructure/workflow/langgraph-ticket.workflow-adapter.ts`
- `infrastructure/streaming/ticket-event.publisher.ts`
- `infrastructure/ids/ulid.generator.ts`
Testing:
- Provide in-memory repository & fake workflow adapter for unit tests.

### Phase 4: Controller Migration
- Move old `CustomerSupportController` to `interfaces/rest/ticket.controller.ts` (split into multiple controllers: `ticket.controller.ts`, `interruption.controller.ts`, `knowledge.controller.ts`, `metrics.controller.ts`).
- Introduce consistent response envelope:
```ts
interface ApiResponse<T> { data: T; meta: { version: number; timestamp: number; correlationId?: string }; errors?: ApiError[] }
```
- Add middleware to inject correlation id.

### Phase 5: Realtime Unification
- Event taxonomy file `domain/events/event-types.ts`.
- Single publisher interface bridging domain events to WebSocket (primary) & SSE fallback.
- Deprecate existing SSE endpoint in favor of `/tickets/:id/events` unified stream.
- Add event version & correlation id.

### Phase 6: Frontend Feature Slice
Structure:
```
features/customer-support/
  data-access/
    customer-support.api.ts
    agents.api.ts
  state/
    customer-support.store.ts
    customer-support.facade.ts
  realtime/
    ticket-events.channel.ts
    event-normalizer.ts
  ui/
    ticket-list/
    ticket-detail/
  models/
    ticket.model.ts
    agent.model.ts
  fixtures/
    agents.fixture.ts
```
Steps:
- Remove hardcoded agent fetch from spatial interface; replace with injected facade.
- Provide store actions: `loadAgents()`, `submitTicket()`, `approveTicket()`, `subscribeTicketEvents(ticketId)`.
- Map realtime `ticket.*` events into store state transitions.

### Phase 7: Cleanup & Deprecation
- Mark legacy endpoints (workflow status duplicate, separate SSE path) with `Deprecation` header.
- Remove mock agent endpoint; ensure AgentRegistry is real (in-memory until persistence defined).
- Update documentation & interaction map.

## 5. Cross-Cutting Enhancements
| Area | Enhancement |
|------|-------------|
| Logging | Structured logger context (ticketId, executionId) |
| Metrics | Timer decorators on use cases feeding Monitoring module |
| Validation | Class-validator on DTOs; domain invariants in value objects |
| Security | Rate limiting on mutation endpoints, CORS validated |
| Testing | Add unit tests for domain & use cases; integration tests for controllers using in-memory adapters |

## 6. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Scope Creep | Delays | Freeze new feature requests during Phases 0-4 |
| Event Drift | Client breakage | Introduce dual event emission (old + new) two releases |
| Performance Regression | Latency increases | Add baseline measurements before refactor |
| Team Adoption | Inconsistent patterns | Create Nx generator for feature slice scaffolding |

## 7. Tooling Suggestions
- Nx Generators: `generate:feature-slice` (creates domain/app/infra skeletons).
- ESLint rules to forbid importing infrastructure from domain.
- Husky pre-commit hook to verify no `any` & architecture boundaries.

## 8. Success Metrics (Post-Refactor)
| Metric | Baseline | Target |
|--------|----------|--------|
| Average Ticket Submit Latency | TBD | -10% (less orchestration overhead) |
| Unit Test Coverage (customer-support) | <30% | >85% lines, >80% branches |
| Mean PR Review Time | High | -20% (smaller, isolated changes) |
| Production Error Rate (domain logic) | Unknown | Monitored & <1% of requests |

## 9. Immediate Next Sprint Scope (Minimal Viable Refactor)
1. Phase 0 & 1 (Skeleton + Domain) completed.
2. Implement in-memory ticket repository + ULID generator.
3. Submit ticket use case + facade.
4. New `POST /v1/customer-support/tickets` controller using facade (parallel to old one).
5. Frontend: abstract agent fetch into feature data-access & remove hardcoded base URL.

## 10. Out-of-Scope (Deferred)
| Item | Reason |
|------|--------|
| GraphQL API layer | Add after REST stabilized |
| Full Knowledge Base refactor | Separate initiative; larger modeling complexity |
| Multi-tenant support | Requires auth/claims strategy first |

## 11. Summary
This refactor plan introduces a pragmatic yet robust vertical slicing and boundary enforcement strategy that aligns with enterprise-grade NestJS + Angular practices. Incremental phases minimize risk while delivering early, testable value.

---
Generated automatically as part of architecture enhancement initiative.
