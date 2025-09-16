# Frontend ⇆ Backend Alignment Guide (Customer Support & Showcase Migration)

Date: 2025-09-15
Status: ACTIONABLE – implement in minimal, low‑risk steps for demo readiness.
Owner: DevBrand Integration

---

## 1. Goal

Replace deprecated `showcase` API usage in the Angular app with the currently implemented `customer-support` backend capabilities (ticket workflow, knowledge base, streaming, approvals) OR introduce a temporary compatibility shim. Ensure at least one end‑to‑end interactive demo path (submit ticket → stream progress → optional approval → completion) works today.

---

## 2. Current State Snapshot

### Backend (Implemented)

Root controller namespace: `customer-support`

Key endpoints:

- POST `/customer-support/tickets` – create workflow (returns `{ ticketId, executionId }`)
- POST `/customer-support/tickets/streaming` – same + prewired streaming collection
- GET  `/customer-support/tickets/:ticketId` – status
- SSE  `/customer-support/tickets/:ticketId/stream` – real‑time events
- PUT  `/customer-support/tickets/:ticketId/approve` – human approval
- GET  `/customer-support/agents` – available agents
- POST `/customer-support/knowledge-base/search`
- GET  `/customer-support/knowledge-base/analytics`

### Frontend (Expectations in Code)

`ShowcaseApiService` & `StreamingIntegrationService` call:

- POST `/api/v1/showcase/workflows/supervisor|swarm` (NOT IMPLEMENTED)
- GET  `/api/v1/showcase/status|agents|tools|capabilities` (NOT IMPLEMENTED)
- POST `/api/v1/showcase/search/*` (NOT IMPLEMENTED)
- Streaming IDs: Frontend generates synthetic `executionId` (e.g. `supervisor-<ts>`) that backend does not know.

---

## 3. Integration Strategies

| Strategy | Time | Risk | Pros | Cons |
|----------|------|------|------|------|
| A. Backend Shim (compat controller) | ~10 min | Low | No frontend change now | Adds temporary code to remove later |
| B. Frontend Realignment (recommended) | ~30–40 min | Medium | Future aligned, no throwaway code | Requires touching multiple services |
| C. Hybrid (Shim now, refactor later) | ~10 min now + later | Low→Medium | Immediate demo + planned migration | Two phases required |

Recommendation: If demo is imminent (<1h), do Strategy A, schedule B after. If ≥30m buffer, proceed with Strategy B directly.

---

## 4. Strategy B Detailed Steps (Frontend Realignment)

### 4.1 Environment / Base URL

Ensure `environment.apiUrl` points to backend base (e.g. `http://localhost:3333` or whatever Nest app serves). No change if already correct.

### 4.2 Replace Showcase Workflow Calls

File: `src/app/core/services/showcase-api.service.ts`

- Deprecate methods `executeSupervisorShowcase`, `executeSwarmShowcase` or internally remap.
- New method: `createSupportTicket(request: { title: string; description: string; category?: string; priority?: string; customerTier?: string; })` → POST `/customer-support/tickets`.
- Return shape adaptation:

```ts
interface SupportTicketStartResponse {
  success: boolean;
  data?: { ticketId: string; executionId: string };
  executionId: string;
  streaming: boolean;
  streamUrl?: string; // build as `${apiUrl}/customer-support/tickets/${ticketId}/stream`
}
```

- For UI components expecting `ShowcaseWorkflowResponse`, create adapter:

```ts
function toShowcaseLike(r: SupportTicketStartResponse): ShowcaseWorkflowResponse {
  return {
    id: r.data?.ticketId || r.executionId,
    pattern: 'supervisor', // or map based on user selection if needed
    status: 'running',
    output: '',
    decoratorsShowcased: ['@Workflow','@Entrypoint','@Task','@RequiresApproval','@StreamProgress','@StreamEvent','@StreamToken'],
    enterpriseFeatures: ['hitl','vector','graph','multi-agent'],
    executionPath: [],
    duration: 0,
    streamingUrl: r.streamUrl || `/customer-support/tickets/${r.data?.ticketId}/stream`,
    metricsUrl: `/customer-support/metrics`
  };
}
```

### 4.3 Update Streaming Integration

File: `src/app/core/services/streaming-integration.service.ts`

Currently: generates local `executionId` then POSTs nonexistent showcase endpoint.

Change:

1. Remove manual executionId generation in `startSupervisorShowcase` & `startSwarmShowcase`.
2. Call new `ShowcaseApiService.createSupportTicket` (or direct fetch) with `description` = user input, `title` = first 60 chars.
3. Set `executionId` from backend response (`result.executionId`).
4. Adjust `subscribeToWorkflow(executionId)` to still work—metadata already filters by `executionId`.
5. `streamingUrl` is SSE; current WebSocket bridge expects gateway events—if gateway already bridging by executionId, no change. If not, add fallback SSE consumption path (optional fallback).

Minimal code snippet adjustment (conceptual):

```ts
const start = await fetch(`${api}/customer-support/tickets`, {...});
const json = await start.json();
const executionId = json.executionId;
return this.subscribeToWorkflow(executionId);
```

### 4.4 Optional: Ticket Status Polling

Add a lightweight polling or on-demand method:

GET `/customer-support/tickets/:ticketId` → show progress fallback if WebSocket not connected.

### 4.5 Human Approval Handling

When event `pending_approval` or progress step indicates approval waiting:

- Display an approval banner with action button calling:
`PUT /customer-support/tickets/{ticketId}/approve { approved: true, approvedBy: currentUser }`
- Resume streaming automatically after success.

### 4.6 Knowledge Base Integration (Optional Enhancement)

Add UI tab / modal:

- On ticket creation success, fire parallel POST `/customer-support/knowledge-base/search` with `{ query: ticket.description, maxResults: 3 }`.
- Show “Related Articles” list.

### 4.7 Agents Listing

Replace any call to `/showcase/agents` with `/customer-support/agents` (already returns `{ success, data, total }`).

Adapter:

```ts
const agents = resp.data.map(a => ({ id: a.id || a.name, ...a }));
```

### 4.8 Remove Unsupported Showcase Methods (Phase 2)

- `getSystemStatus`, `getCapabilities`, `explorePattern`, pattern exploration endpoints—either hide UI or mark “Coming Soon”.
- Guard UI components with feature flags until backend parity is implemented.

---

## 5. Strategy A (Shim) – If Chosen Instead

Add new controller `ShowcaseCompatibilityController`:

- POST `/showcase/workflows/:pattern` → internally call `TicketManagementService.submitTicket`
- Pattern param (`supervisor|swarm`) mapped only for labeling.
- Response builds `ShowcaseWorkflowResponse` structure (see adapter earlier).

Frontend remains untouched except streaming executionId mismatch (still advisable to switch to backend executionId). Quick solution: return `executionId` but ignore synthetic one.

---

## 6. Execution Order (Fast Track)

1. (Option A) Implement shim (≈10m) OR (Option B) adjust frontend services.
2. Update streaming service to use backend executionId.
3. Test ticket creation + streaming.
4. Test approval path (modify workflow to force approval if needed).
5. (Optional) Add knowledge base search on ticket open.

---

## 7. Smoke Test Commands

(Adjust base URL & port accordingly.)

```bash
# 1. Create ticket
curl -X POST http://localhost:3333/customer-support/tickets \\
  -H 'Content-Type: application/json' \\
  -d '{"customerId":"demo-user","title":"Password reset not working","description":"User cannot reset password via email link","priority":"high","category":"technical"}'

# 2. Stream (SSE) – in another terminal
curl -N http://localhost:3333/customer-support/tickets/TICKET_ID_HERE/stream

# 3. Approve (if pending)
curl -X PUT http://localhost:3333/customer-support/tickets/TICKET_ID_HERE/approve \\
  -H 'Content-Type: application/json' \\
  -d '{"approved":true,"approvedBy":"demo-admin"}'
```

---

## 8. Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Synthetic executionId persists in UI | Streaming mismatch | Use backend `executionId` uniformly |
| Frontend expects fields not returned | UI errors | Provide adapter or placeholder values |
| Approval never triggered in demo | No HITL showcase | Force condition (set `customerTier=enterprise` or adjust predicate) |
| SSE vs WebSocket mismatch | No live updates | Keep WS path; fallback to SSE if no events after timeout |

---

## 9. Follow-Up (Post-Demo)

- Remove compatibility shim (if used) and finalize multi-agent showcase endpoints.
- Add unified streaming abstraction selecting WS or SSE automatically.
- Implement real pattern workflows: supervisor, swarm, hierarchical.
- Add capability / status endpoints under a new `platform` controller.

---

## 10. Quick Reference (Mappings)

| Frontend Old | Backend New |
|--------------|-------------|
| POST /showcase/workflows/supervisor | POST /customer-support/tickets |
| POST /showcase/workflows/swarm | POST /customer-support/tickets |
| GET /showcase/agents | GET /customer-support/agents |
| POST /showcase/search/web | POST /customer-support/knowledge-base/search |
| GET /showcase/status | (none – use /health or implement later) |

---

## 11. Minimal Frontend Diff Sketch (Strategy B)

```ts
// streaming-integration.service.ts (inside startSupervisorShowcase)
const resp = await fetch(`${environment.apiUrl}/customer-support/tickets`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: 'demo-user',
    title: request.input.slice(0,60) || 'Support Ticket',
    description: request.input,
    priority: 'medium',
    category: 'general'
  })
});
const json = await resp.json();
const executionId = json.executionId; // use real ID
return this.subscribeToWorkflow(executionId);
```

---

## 12. Acceptance Checklist

- [ ] Ticket submission returns executionId consumed by frontend
- [ ] Streaming events visible in UI within 5s
- [ ] Approval path demonstrable (force scenario)
- [ ] Knowledge base search optional enhancement
- [ ] No 404 calls to /showcase/* during demo

---

## 13. Decision Log

- Chosen Path: (Fill after selecting A or B)
- Rationale: Fast demo vs future alignment
- Owner for migration completion: (Assign)

---

## 14. Ready-to-Use Narration (Demo Script)

"We submit a support ticket; the AI agent analyzes context, streams progress, optionally pauses for human approval (show HITL), generates a response, and completes with metrics. This replaces the earlier prototype showcase endpoints with production-aligned workflow infrastructure."

---

End of document.
