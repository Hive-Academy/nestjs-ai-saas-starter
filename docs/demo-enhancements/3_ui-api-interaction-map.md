# UI ↔ API Interaction Map

Date: 2025-09-15
Scope: dev-brand-ui <> dev-brand-api

## 1. Overview
This document maps current frontend feature interactions to backend endpoints & realtime channels, highlighting transport, response shape, and improvement opportunities.

## 2. Endpoint Inventory (Observed & Inferred)
| Frontend Feature | API Path (Backend) | Method | Purpose | Notes |
|------------------|--------------------|--------|---------|-------|
| Spatial Interface (agents load) | /api/customer-support/agents | GET | Fetch available agents | Currently mock response in controller |
| Ticket Submission (planned UI) | /api/customer-support/tickets | POST | Submit ticket & start workflow | Returns streaming metadata (executionId, streamUrl) |
| Ticket Streaming (SSE) | /api/customer-support/tickets/:ticketId/stream | GET (SSE) | Listen for workflow/ticket events | Observer pattern; SSE events types varied |
| Ticket Status Poll | /api/customer-support/tickets/:ticketId | GET | Retrieve status snapshot | Derives progress heuristics |
| Workflow Status | /api/customer-support/workflows/status/:ticketId | GET | Workflow status detail | Some duplication with ticket status |
| Ticket Approval | /api/customer-support/tickets/:ticketId/approve | PUT | Approve or reject | Resumes workflow if approved |
| Interruption: question | /api/customer-support/interruptions/question | POST | Inject user question | Workflow pause/resume semantics |
| Interruption: clarification | /api/customer-support/interruptions/clarification | POST | Request clarification | Same service path |
| Interruption: respond | /api/customer-support/interruptions/:id/respond | PUT | Resolve interruption | |
| Interruption: list active | /api/customer-support/interruptions/:executionId | GET | List active interruptions | |
| Interruption: cancel | /api/customer-support/interruptions/:id/cancel | PUT | Cancel | |
| Dynamic interruption | /api/customer-support/interruptions/dynamic | POST | Generic typed interruption | |
| Inject user input | /api/customer-support/workflows/:executionId/inject-input | POST | Provide runtime input | |
| Metrics summary | /api/customer-support/metrics | GET | Support KPIs | |
| Business impact | /api/customer-support/metrics/business-impact | GET | ROI metrics | |
| Customer metrics | /api/customer-support/customers/:customerId/metrics | GET | Per-customer | |
| Metrics streaming (SSE) | /api/customer-support/metrics/stream | GET (SSE) | Real-time metrics | |
| Analytics dashboard | /api/customer-support/analytics/dashboard | GET | Aggregated stats | |
| Analytics trends | /api/customer-support/analytics/trends | GET | Time series | |
| Agent performance | /api/customer-support/analytics/agents | GET | Performance metrics | |
| Knowledge search | /api/customer-support/knowledge-base/search | POST | Semantic search | Uses vector search config |
| Knowledge analytics | /api/customer-support/knowledge-base/analytics | GET | Usage analytics | |
| Article feedback | /api/customer-support/knowledge-base/articles/:id/feedback | PUT | Feedback submission | |
| Seed knowledge | /api/customer-support/admin/knowledge-base/seed | POST | Seed dataset | Should be dev-only |
| Knowledge stats | /api/customer-support/knowledge-base/stats | GET | Stats | |
| Popular articles | /api/customer-support/knowledge-base/popular | GET | Popular listing | |
| Review queue | /api/customer-support/knowledge-base/review-queue | GET | Articles needing review | |
| Search suggestions | /api/customer-support/knowledge-base/suggestions?q= | GET | Query expansion | |
| Content gaps | /api/customer-support/knowledge-base/content-gaps | GET | Coverage analysis | |

## 3. Realtime Channels (Current & Proposed)
| Channel | Transport | Producer | Consumer | Event Types (Examples) | Issues |
|---------|-----------|----------|----------|------------------------|--------|
| Ticket Updates | SSE (/tickets/:id/stream) | TicketManagementService → Workflow events mapping | (Planned UI components) | workflow_started, workflow_progress, workflow_completed, workflow_failed, node_executed | Mixed event shape; no version field |
| Metrics Stream | SSE (/metrics/stream) | MetricsAnalyticsService | Future dashboard UI | metrics_update | Potential duplication with polling endpoints |
| WebSocket Gateway (/streaming namespace) | Socket.io | StreamingModule / WorkflowEngine | Web UI (agent visualization) | STREAM_UPDATE, CONNECTION_STATUS, ERROR, PING/PONG | Generic event envelope, not domain specific |

## 4. Observed Client Patterns
| Pattern | Current Implementation | Concern | Improvement |
|---------|-----------------------|---------|------------|
| Agent Load | Hardcoded GET in spatial component | No reuse / test difficulty | Move to `customer-support.api.ts` | 
| Streaming Handling | SSE & WebSocket disjoint | Duplicate parsing logic risk | Unified `RealtimeEventAdapter` | 
| Error Handling | Console + throwError in API service | Inconsistent user feedback | Global interceptor + toast service | 
| Execution Subscription | Manual subscribe by ID | No lifecycle handshake | Add subscribe/unsubscribe abstraction | 

## 5. Contract Gaps & Normalization Needs
- Responses lack `version`/`meta` object (except streaming wrappers). Propose envelope:
```json
{
  "data": { ... },
  "meta": { "version": 1, "timestamp": 1737000000000 },
  "errors": []
}
```
- Event payloads should include `eventVersion` & `correlationId` for tracing.
- Uniform ticket identifier -> replace mixed `ticketId` / `id` fields.

## 6. Proposed Unified Event Taxonomy
| Domain | Event Type | Description | Payload Core Fields |
|--------|------------|-------------|---------------------|
| ticket | ticket.created | Ticket accepted | ticketId, createdAt, priority |
| ticket | ticket.progress | % + stage update | ticketId, progress, stage, updatedAt |
| ticket | ticket.completed | Workflow done | ticketId, resolution, elapsedMs |
| ticket | ticket.failed | Failure state | ticketId, reason, stage |
| interruption | interruption.requested | User/system interruption | executionId, type, nodeId |
| interruption | interruption.resolved | Interruption addressed | interruptionId, resolution |
| knowledge | kb.article.feedback | Feedback registered | articleId, helpful, userId |
| metrics | metrics.update | KPI snapshot | period, kpis{} |

## 7. UI Interaction Sequence (Ticket Submit + Streaming)
1. UI calls POST `/tickets` with ticket payload.
2. API returns `{ executionId, ticketId, streamUrl }` (initial).
3. UI subscribes to unified realtime channel (WebSocket preferred) using `executionId`.
4. WebSocket emits namespaced events `ticket.progress` etc.
5. On completion, UI unsubscribes automatically (event-driven cleanup).
6. Fallback: If WebSocket unavailable, fallback to SSE at `streamUrl`.

## 8. Simplification Opportunities
| Current | Simplified Approach |
|---------|--------------------|
| Separate endpoints for ticket status & workflow status | Single `GET /tickets/:ticketId/status` combining both |
| Manual progress estimation in service | Dedicated `ProgressEstimator` strategy + recorded metrics |
| Multiple knowledge analytics endpoints | Aggregate `GET /knowledge-base/analytics?sections=stats,popular,gaps` with selective includes |
| Ad-hoc SSE + WebSocket | Single WebSocket for all; SSE only for legacy/fallback |

## 9. Versioning & Deprecation Plan
| Step | Action |
|------|--------|
| Phase 1 | Introduce `X-API-Version: 1` header & `meta.version` field |
| Phase 2 | Mark older SSE-only endpoints as deprecated (response header `Deprecation: true`) |
| Phase 3 | Remove duplicate workflow status endpoint after clients migrated |

## 10. Metrics & Observability Additions
- Add correlation ID propagation: request header `X-Correlation-Id` -> include in all events.
- Emit latency metrics for key operations (ticket submit, knowledge search) via Monitoring module adapters.
- Frontend: maintain `latencyTracker` service capturing round-trip & processing times; feed into dev overlay.

## 11. Action Items Summary
| Priority | Item | Owner Suggestion |
|----------|------|------------------|
| High | Implement unified event envelope & taxonomy | Backend |
| High | Refactor agents load to data-access layer | Frontend |
| High | Introduce combined ticket status endpoint | Backend |
| Medium | WebSocket abstraction for subscription lifecycle | Frontend |
| Medium | Response envelope standardization | Backend |
| Medium | Correlation ID end-to-end | Both |
| Low | Consolidate knowledge base analytics endpoints | Backend |
| Low | SSE fallback strategy docs | Both |

## 12. Summary
The existing interaction pattern works for demos but mixes transport concerns, duplicates status retrieval paths, and embeds mock data. A unified contract, vertical slicing, and event normalization will produce a more maintainable, observable system.

---
Generated automatically as part of architecture enhancement initiative.
