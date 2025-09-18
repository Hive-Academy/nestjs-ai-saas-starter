# Hardcoded Logic & Dummy Data Audit

Date: 2025-09-15
Scope: Backend `dev-brand-api` & Frontend `dev-brand-ui`

## 1. Summary
This audit catalogs non-production hardcoded values, mock data, or placeholder algorithms that should be refactored or gated by environment flags. Items are prioritized by production risk and architectural impact.

## 2. Classification Schema
| Code Smell | Definition |
|------------|-----------|
| MOCK_DATA | Static dataset meant only for demos |
| HARDCODED_CONFIG | Value should come from validated configuration |
| PLACEHOLDER_ALGO | simplistic algorithm lacking real logic (e.g., progress estimate) |
| AD_HOC_ID | Non-standard ID generation logic |
| DEMO_ENDPOINT | Endpoint returning showcase-only data in production path |

## 3. Backend Findings
| Location | Type | Description | Risk | Recommendation |
|----------|------|-------------|------|----------------|
| `customer-support.controller.ts#getAvailableAgents` | MOCK_DATA / DEMO_ENDPOINT | Returns static agent array | UI misalignment & drift | Replace with `AgentRegistryService` providing dynamic entries |
| `ticket-management.service.ts#generateTicketId` | AD_HOC_ID | Random string with timestamp + base36 | Inconsistent format & potential collisions under high load | Introduce ULID/UUID generator service |
| `ticket-management.service.ts#calculateProgress` | PLACEHOLDER_ALGO | Time-based heuristic capped at 90% | Misleading progress display | Implement progress via workflow event weighting or node completion count |
| `ticket-management.service.ts#estimateCompletion` | PLACEHOLDER_ALGO | Back-of-envelope extrapolation | Inaccurate ETA | Replace with moving average of prior workflow durations (persist metrics) |
| SSE events (workflow events) | HARDCODED_CONFIG | Event types inline, no version/meta | Hard to evolve or track | Introduce unified event envelope + version field |
| Config defaults (e.g., sentiment thresholds) | HARDCODED_CONFIG | Provided directly by `configService.get(..., default)` | Hidden default changes risk | Central validated config with explicit defaults & docs |
| Knowledge base seeding endpoint | DEMO_ENDPOINT | Populates sample data (inferred) | Accidental prod invocation | Guard with environment + role + idempotent migration script |

## 4. Frontend Findings
| Location | Type | Description | Risk | Recommendation |
|----------|------|-------------|------|----------------|
| `spatial-interface.component.ts#loadAgentsFromBackend` | HARDCODED_CONFIG | Direct URL `http://localhost:3000/api/customer-support/agents` | Breaks in non-local env | Use `environment.apiUrl` + centralized client |
| `spatial-interface.component.ts#createMockAgents` | MOCK_DATA | Embedded mock agent list | Increased bundle + prod path risk | Move to `fixtures/agents.fixture.ts` & tree-shake with flag |
| `showcase-api.service.ts#getAvailablePatterns` | MOCK_DATA | Returns static patterns list | Drift if backend evolves | Fetch from backend endpoint `/patterns` (add) or keep documented constant with versioning |
| WebSocket URL builder | HARDCODED_CONFIG | Assumes port 3000 and `/streaming` namespace | Wrong in deployed behind reverse proxy | Source from env + fallback detection |
| Reconnect/backoff values | HARDCODED_CONFIG | Numeric constants inline | Hard to tune across environments | Externalize into config token with sensible defaults |
| Tooltip/visualization numeric timings | HARDCODED_CONFIG | Animation & delay constants | Limited adaptability | Central UI timing constants file |

## 5. Priority Remediation List
| Priority | Item | Reason |
|----------|------|--------|
| P0 | Replace mock agents endpoint | Core data integrity for visualization |
| P0 | Standardize ticket ID generation | Data consistency & references |
| P1 | Unified event envelope/versioning | Forward compatibility |
| P1 | Remove hardcoded API base URLs | Deployment readiness |
| P2 | Replace progress/ETA heuristics | User trust in system metrics |
| P2 | Externalize reconnect/backoff config | Operational tuning |
| P3 | Migrate mock agents to fixtures | Bundle hygiene |

## 6. Remediation Patterns
| Smell | Pattern |
|-------|---------|
| MOCK_DATA | Move to `fixtures/` + conditional import guarded by `environment.enableFixtures` |
| AD_HOC_ID | Inject `IdGeneratorPort` (ULID, UUIDv7) |
| PLACEHOLDER_ALGO | Introduce strategy interface + production implementation |
| HARDCODED_CONFIG | Add typed config schema + token DI |
| DEMO_ENDPOINT | Segregate under `/demo/*` or remove; document separately |

## 7. Code Owner Action Plan
| Week | Action |
|------|--------|
| 1 | Implement IdGenerator + AgentRegistry; deprecate mock agents |
| 2 | Event envelope + progress strategy interface |
| 3 | Frontend fixtures isolation + data-access abstraction |
| 4 | Replace heuristics with metrics-backed estimator |

## 8. Definition of Done (Hardcoded Removal)
- No production path references `http://localhost` directly.
- All IDs produced via shared generator service.
- All public events carry `meta.version`, `timestamp`, `correlationId`.
- Mock or fixture data imported only when `environment.enableFixtures === true`.
- Config defaults documented & validated at startup (fail-fast on invalid).

## 9. Monitoring Hooks Post-Refactor
| Metric | Source | Purpose |
|--------|--------|---------|
| ticket.submit.latency_ms | Controller middleware | Detect performance regressions |
| ticket.workflow.duration_ms | Workflow adapter | Accuracy for ETA estimator |
| realtime.event.emit_failures | Event publisher | Reliability tracking |
| websocket.reconnect.count | WebSocket service | Connection health |

## 10. Summary
Hardcoded & mock constructs primarily exist to accelerate early demos; a structured remediation path focusing first on data integrity & contract stability will yield a production-ready baseline without sacrificing iteration speed.

---
Generated automatically as part of architecture enhancement initiative.
