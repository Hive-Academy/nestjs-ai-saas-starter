# Pragmatic Feature Slicing & Strategic Design (Lightweight, Non-DDD Heavy)

Date: 2025-09-15
Scope: Align existing code + multi-use-case expansion (Customer Support, Content Marketing, DevOps, Healthcare, Trading, etc.)

## 1. Intent

Provide a minimal, repeatable feature slicing strategy that:

- Uses strategic design concepts (bounded contexts, clear seams) WITHOUT heavyweight DDD ceremony
- Leverages existing 14 publishable libraries (LangGraph modules + persistence) efficiently
- Applies SOLID, KISS, DRY, YAGNI
- Keeps onboarding friction low; favors clear folder naming over abstraction layers

## 2. Core Principles (Pragmatic)

| Principle | Translation in Codebase |
|-----------|-------------------------|
| Single Responsibility | Each feature service does ONE orchestration concern (ticket submission, campaign execution, pipeline trigger) |
| Open/Closed | Extend via new workflow/agent class, not conditionals in legacy service |
| Interface Segregation | Only create a port when an external dependency is likely to vary (e.g. IdGenerator, AgentRegistry) |
| KISS | Prefer plain TypeScript objects & functions over deep class hierarchies |
| DRY | Share cross-feature helpers in internal `shared/` only when duplication appears ≥3 times |
| YAGNI | Do not pre-build repository abstractions unless multiple persistence strategies are imminent |
| Explicit Boundaries | Feature folder = unit of reasoning, testing, release discussion |

## 3. Bounded Context Catalog (Strategic Map)

| Context | Current State | Primary Capabilities | Candidate Slice Name |
|---------|---------------|----------------------|----------------------|
| Customer Support Automation | Implemented (monolithic module) | Ticket workflows, interruptions, metrics, knowledge base | `customer-support` |
| Content Marketing | Use case doc only | Multi-agent content generation/compliance | `content-marketing` |
| DevOps Automation | Use case doc only | CI/CD pipeline, risk & approvals, deployment | `devops-automation` |
| Healthcare Diagnosis | Use case doc only | Diagnostic agents, risk/approval | `healthcare-diagnosis` |
| Financial/Trading | (Doc expected) | Strategy simulation, risk gating | `trading-automation` |
| Shared Memory / Knowledge | Cross-cutting | Vector & graph recall, semantic enrichment | `knowledge-core` |
| Governance & HITL | Cross-cutting | Approval chains, confidence thresholds | `governance` |
| Streaming & Realtime | Cross-cutting | WebSocket/SSE/event multiplex | `realtime` |
| Analytics & Metrics | Cross-cutting | KPIs, performance telemetry | `analytics` |
| Platform Integration | Cross-cutting | LangGraph Platform runs/threads | `platform-integration` |

(You do NOT have to create all slices now—only as they become active.)

## 4. Lightweight Feature Slice Structure

Target shape (backend feature directory under `app/` or future `libs/feature-*` if extracted):

```text
app/
  customer-support/
    module.ts                 # Nest module (imports necessary LangGraph libs)
    api/                      # Controllers, DTOs (route prefix = feature root)
      tickets.controller.ts
      knowledge.controller.ts
    agents/                   # Multi-agent @Agent classes only
    workflows/                # @Workflow classes (functional-api or streaming base)
    services/                 # Thin orchestration services (1 concern each)
      ticket-submission.service.ts
      ticket-status.service.ts
      knowledge-search.service.ts
    integration/              # Optional: wrappers to external libs (platform, memory)
    realtime/                 # Event name constants, mappers, publishers
    models/                   # TypeScript interfaces (reused across folder) – prefer reuse from shared libs first
    config/                   # Typed config + env validation (single file)
    fixtures/                 # Demo data (dev only, tree-shake via env flag)
    index.ts                  # Re-export PUBLIC surface only (no leaking internal libs)
```

Rules:
- No `domain/ application/ infrastructure/` triad unless complexity justifies it
- Each folder stays < ~300 LOC; split when exceeding
- Workflows own complex branching; services never replicate workflow logic
- Agents are atomic; no cross-agent imports
- Controllers only call 1–2 services; never import workflows directly if service facade exists

## 5. Thin Service Patterns

| Pattern | Anti-Pattern |
|---------|--------------|
| `TicketSubmissionService` calls `CustomerSupportWorkflow.execute()` and returns an envelope | Giant `TicketManagementService` doing submission + progress + approval + listing |
| `KnowledgeSearchService` delegates to memory/vector library | A generic util file reaching into multiple adapters |
| `DevOpsPipelineTriggerService` triggering one workflow plus result mapping | A mega service mixing workflow, notifications, security review, rollback logic |

## 6. When to Introduce an Abstraction (Heuristic)

| Condition | Add? | Example |
|-----------|------|---------|
| Forecast ≥2 alternative implementations in next 2 sprints | YES | Id generation (ULID vs external), Agent registry (static vs dynamic) |
| Only a single internal call site | NO | Progress estimator (until variability emerges) |
| External dependency unstable (API may change) | YES | Platform client wrapper facade |
| Testing blocked by heavy dependency | YES | Simple in-memory event publisher / stub memory adapter |

## 7. Event & Naming Conventions (Unified)

| Category | Convention |
|----------|-----------|
| Event Type | `feature.entity.action` (e.g. `customer-support.ticket.progress`) |
| Controller Route | `/api/<kebab-feature>/<resource>` |
| WebSocket Namespace | `/ws/<feature>` (avoid generic root beyond streaming) |
| Config Token | `FEATURE_NAME_CONFIG` (const) |
| Service Class | `<Action><Entity>Service` (SubmitTicketService) |
| Workflow Id | `feature-workflow-purpose` (e.g. `customer-support-ticket-lifecycle`) |

## 8. Library Integration Matrix (Pragmatic)

| Library | Use In Slice | Typical Touchpoint |
|---------|--------------|--------------------|
| nestjs-neo4j | Customer Support, Knowledge, Analytics | Relationship queries (ticket relationships, knowledge taxonomy) |
| nestjs-chromadb | Knowledge, Content Marketing | Semantic search / embedding retrieval |
| langgraph-workflow-engine | ALL workflow-enabled slices | Base class for orchestrated flows |
| langgraph-functional-api | Where declarative nodes add clarity | Content pipelines, simpler ticket flows |
| langgraph-multi-agent | Multi-role collaboration contexts | Content generation, DevOps analysis teams |
| langgraph-streaming | Any UI-progress dependent slice | Ticket progress, pipeline status, campaign generation |
| langgraph-memory | Knowledge + conversational context | Knowledge retrieval, contextual augmentation |
| langgraph-time-travel | Debug-heavy experimental flows | DevOps pipeline replay, diagnosis workflows |
| langgraph-hitl | Governance-critical steps | Approvals in deployment, compliance, escalation |
| langgraph-platform | External hosted runs & audit | DevOps deployments, marketing distribution |
| langgraph-checkpoint | Long-running resilient workflows | CI/CD, multi-stage content campaign |
| langgraph-monitoring | Cross-cutting metrics | Emit workflow KPIs, execution durations |
| langgraph-multi-agent (coord) | (already listed) | Network setup & pattern selection |
| (Future shared util) | Reuse caution | Only after duplication evidence |

## 9. Example Refactor (Customer Support Minimal Step)

Current pain: `TicketManagementService` is overburdened.

Minimal pragmatic change (≤1 day):

1. Create folder `app/customer-support/services/` with:
   - `submit-ticket.service.ts`
   - `ticket-status.service.ts`
   - `ticket-approval.service.ts`
2. Move related methods (cut & paste) into those classes; keep existing controller but delegate.
3. Preserve existing workflow integration unchanged.
4. Add unified event name constants in `realtime/events.ts`.
5. Add `fixtures/mock-agents.ts` & replace inline static list.
6. Delete hardcoded generator → add `id.util.ts` (ULID or `crypto.randomUUID`).

No DDD layering, but immediate SRP + clarity boost.

## 10. Frontend Alignment

For each backend feature slice create corresponding UI slice under `features/`:

```text
features/
  customer-support/
    data-access/ (REST + realtime adapter)
    store/ (signals + derived state)
    ui/ (presentational components)
    models/ (reused contracts—generated types later)
    fixtures/ (only dev)
```

Avoid premature shared component extraction; extract only after 2+ slices need equivalent UI.

## 11. Testing Strategy (Lean)

| Layer | Test Type | Scope |
|-------|-----------|-------|
| Services | Unit | One responsibility per file (mock workflow manager) |
| Workflows | Integration (happy path) | Execute with minimal stub adapters |
| Controllers | Contract tests | HTTP status + shape (snapshot optional) |
| Realtime | Event emission test | Simulate workflow events -> expect mapped WS events |
| Frontend Store | State transition tests | Submit ticket -> state progression |

## 12. Incremental Adoption Roadmap

| Sprint | Actions | Outcome |
|--------|---------|---------|
| 1 | Split ticket service; introduce id util + mock agents fixture | Reduced coupling |
| 2 | Add event constants + frontend slice for customer support | Unified realtime model |
| 3 | Extract content-marketing slice (agents + workflow stub) | Multi-slice baseline |
| 4 | Introduce governance (HITL) facade & shared approval UI component | Consistent approval UX |
| 5 | Add analytics slice (consume monitoring metrics) | Reporting foundation |

## 13. Explicit NON-Goals (Avoid Over-Engineering)

| Potential Overreach | Why Avoid Now |
|---------------------|--------------|
| Full repository pattern everywhere | Single persistence backend currently stable |
| CQRS/Event Sourcing | Adds infra complexity; no current audit gap |
| Global event bus abstraction | Localized event mapping sufficient initially |
| Automated type generation from backend to frontend | Only after core contracts settle |
| Excessive decorators for trivial services | Readability > tool-driven magic at this stage |

## 14. Governance & Consistency Checklist

| Check | Automation Option |
|-------|------------------|
| Feature folder naming consistent | Nx lint rule (optional) |
| Controllers thin (≤ ~80 LOC) | ESLint metric plugin |
| Service file LOC ≤ 200 | Lint rule / CI script |
| No inline mock data in prod code | Custom lint scanning `mock` / `fixture` tokens |
| Event names match regex `^[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+$` | ESLint rule |

## 15. Quick Reference Cheatsheet

| Action | Where |
|--------|-------|
| Add new workflow | `feature/<name>/workflows/*.workflow.ts` |
| Add realtime event | `feature/<name>/realtime/events.ts` |
| Add agent | `feature/<name>/agents/*.agent.ts` |
| Add service | `feature/<name>/services/<action>-<entity>.service.ts` |
| Add controller | `feature/<name>/api/<resource>.controller.ts` |
| Add demo data | `feature/<name>/fixtures/*` (guarded by env flag) |

## 16. Next Concrete Actions (If Approved)

1. Implement customer-support slice restructure (minimal step set §9).
2. Add event constants + unify WebSocket + SSE mapping.
3. Create frontend `features/customer-support` with store + data-access.
4. Extract content marketing workflow skeleton (one agent + workflow stub) to validate pattern reuse.
5. Add lint rule (or script) to disallow mock lists inside controllers.

## 17. Acceptance Criteria for “Pragmatic Slicing Ready”

- At least 2 slices present (`customer-support`, `content-marketing`), each with agents, workflows, services separated.
- No controller contains business branching logic aside from parameter validation.
- No hardcoded base URLs in UI code.
- Realtime events use standardized naming & envelope.
- Mock data isolated to fixture directories.

---
Generated automatically – focused on strategic clarity without heavy DDD overhead.
