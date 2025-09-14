# Streaming Integration Conversation Summary (Up to 2025-09-14)

## 1. Objectives Progression

1. Initial Audit
   - Identify placeholder / hardcoded streaming implementations.
   - Verify listener/emitter correctness.
2. Infrastructure Hardening (Phase 1)
   - Added JWT-based `StreamingAuthService` and `RateLimiterService`.
   - Centralized default streaming config; refactored decorators.
   - Hardened WebSocket gateway & event mapping.
3. Real Streaming & Instrumentation (Phase 2)
   - Replaced simulated token streaming with real token flush pipeline.
   - Introduced `executionId` correlation key.
   - Implemented lazy auto-init for token, later extended to events & progress.
4. Ergonomics & Bug Fixes
   - Fixed `@StreamProgress` decorator initialization defect.
   - Made streaming init idempotent and invisible to callers.
5. ExecutionId Normalization
   - Refactored showcase services (content, analysis, quality, network) from `showcaseId` → `executionId`.
   - Guard added in analysis streaming requiring `executionId`.
6. Naming Strategy Initiative
   - Designed canonical nodeId schema: `domain|phase:activity[:detail]` (lowercase, normalized, length-bounded).
   - Planned utility: build / normalize / parse / validate functions.
7. Architectural Alignment
   - Identified concrete service coupling (direct `TokenStreamingService` injections) across libraries.
   - Planned migration to interface-based DI with provided tokens and no-op fallbacks.
8. Fresh Session Consolidation
   - Generated comprehensive 22-item todo list to drive naming utility, adapter hooks, decorator integration, DI refactor, strict mode, test coverage, and deprecation steps.

## 2. Current Core Components (Post Strict-Naming Implementation)

- Services: `TokenStreamingService`, `EventStreamProcessorService`, `WebSocketBridgeService`.
- Adapters: `StreamingServiceAdapter` (+ token/event/progress wrappers) now performing nodeId normalization and enforcing strict mode when configured.
- Lazy Wrapper: `AutoInitTokenStreamingService` (token init); adapter centralizes lazy init for events & progress.
- Decorators: `@StreamToken`, `@StreamEvent`, `@StreamProgress`, `@StreamAll` using centralized default config (auto-id inference still pending).
- Auth & Governance: JWT auth, token bucket rate limiting.
- Correlation: `executionId` (canonical) replacing `showcaseId` in service layer.
- Naming Utility: Implemented `stream-naming.util.ts` (parse / build / normalize / validate / warn-once / strict throw path).
- Error Handling: `InvalidNodeIdError` thrown when `strictNaming` is enabled and a non-canonical id is supplied.
- Config: `strictNaming` module option available (default false) surfaced via runtime config accessor.
- DI Contracts: All streaming adapter dependencies injected via interface tokens (adapters decoupled from concrete classes).

## 3. What Has Been Refactored

- Service-layer streaming calls uniformly accept `executionId`.
- Content/Analysis/Quality/Network showcase services migrated & type issues resolved.
- Centralized defaults removed per-decorator duplication.
- Initialization responsibilities removed from callers (auto-init pattern adopted).

## 4. Pending Gaps / Risks (Updated)

- Workflows (supervisor/swarm) still contain legacy `showcaseId` references.
- Decorator auto-generation & normalization not yet implemented (explicit nodeIds required at use sites).
- Workflow refactor to replace ad-hoc nodeId strings with builder remains outstanding.
- No-op fallback tests (module disabled / absent) not yet added.
- Coverage uplift (utility edge cases, decorators, workflows) required to exceed 80% goal.
- Deprecation annotations for `showcaseId` fields pending; mapping helper not yet introduced.
- Need repository-wide confirmation that all concrete streaming service injections outside streaming module have been replaced (streaming library itself migrated; other libs may still have stragglers).

## 5. Canonical Naming Schema (Planned)

Pattern: `domain|phase:activity[:detail]`

- domain: product or vertical (e.g., `content`, `analysis`, `workflow`).
- phase: coarse lifecycle segment (e.g., `ingest`, `vectorize`, `plan`, `execute`).
- activity: primary action (e.g., `chunk`, `score`, `dispatch`).
- detail (optional): further disambiguation (e.g., `retry`, `v2`).

Normalization Rules:

- Lowercase; non-alphanumeric converted to single `-` inside segments.
- Max total length ~80 chars (enforced/validated).
- Idempotent normalization (double-normalize yields same string).

## 6. Migration / Enforcement Roadmap (Progress)

Completed:

1. Naming utility implemented (warn + strict) and integrated.
2. Adapter-level normalization with warn-once and strict throw.
3. `strictNaming` configuration flag added and tested (InvalidNodeIdError path verified).
4. Streaming adapter & core services refactored to interface DI tokens (decoupled from concrete classes).
5. Initial normalization & strict-mode tests (22 passing including new cases).

Remaining:

1. Decorator auto-id inference + enforced normalization.
1. Workflow nodeId builder & migration off legacy strings.
1. No-op fallback tests & disabled module behavior validation.
1. Cross-library sweep for any remaining direct concrete injections.
1. Expanded regression & coverage (decorators/workflows) to reach >80%.
1. Deprecation strategy execution for `showcaseId` (mapping helper + JSDoc tags).
1. CHANGELOG and migration guide updates.

## 7. Todo List (Authoritative As Of This Document)

(See repository task tracker; summarized)

1. Normalize `executionId` call sites everywhere.
2. Eliminate leftover `showcaseId` in streaming contexts.
3. Decide state-level deprecation strategy for `showcaseId`.
4. Implement naming utility (build/normalize/parse/validate).
5. Adapter normalization hooks & warnings.
6. Decorator auto-id generation & normalization.
7. Workflow refactor to canonical IDs.
8. Strict `executionId` enforcement helpers.
9. Verify no-op fallback behavior across libs.
10. Interface-only DI migration.
11. Cross-library injection matrix (inline docs, no re-exports).
12. `strictNaming` config option.
13. Naming utility tests.
14. Adapter normalization tests.
15. Decorator auto-id tests.
16. Workflow regression tests.
17. Final search & lint cleanup.
18. Inline JSDoc improvements.
19. Metrics readiness TODO annotations.
20. Coverage gate (>80%) validation.
21. Changelog annotations for executionId & naming.
22. Deprecation notice strategy for `showcaseId`.

## 8. Implementation Guidelines Moving Forward

- Introduce naming utility BEFORE mass workflow renames to avoid churn.
- Keep adapter warnings non-fatal until stability proven; then consider enabling `strictNaming` in CI.
- Ensure no library re-exports concrete streaming services—only interfaces/tokens.
- Add tests for both presence and absence of StreamingModule (no-op fallback).

## 9. Quality & Observability Considerations

- Canonical nodeIds will allow deterministic aggregation & future metrics parsing.
- Maintain idempotency in normalization for reliable caching / instrumentation.
- Introduce structured log context: `{ executionId, nodeId, streamType }` (future enhancement; currently implicit).

## 10. Deprecation Strategy (Draft)

- Phase 0 (current): Dual presence; `executionId` required in service streaming; `showcaseId` lingering in workflow state.
- Phase 1: Provide mapping helper (if `showcaseId` present & `executionId` missing, derive).
- Phase 2: Mark `showcaseId` fields with `@deprecated` JSDoc.
- Phase 3: Remove `showcaseId` after consumer migration window; provide codemod.

## 11. Immediate Next Action (Updated)

Implement decorator nodeId inference & normalization, then add workflow nodeId builder utilities. Follow with no-op fallback tests and coverage expansion.

## 12. Detailed Technical Findings

### 12.1 Component & Responsibility Inventory

| Layer        | Component                       | Core Responsibility               | Notes / Gaps                                                         |
| ------------ | ------------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| Correlation  | executionId                     | Global correlation key            | Legacy `showcaseId` still in workflow state objects                  |
| Token Stream | TokenStreamingService           | Buffer & flush token chunks       | Concrete injected directly in several libs                           |
| Event Stream | EventStreamProcessorService     | Event batching/publishing         | Naming normalization hook pending                                    |
| Transport    | WebSocketBridgeService          | Broadcast to sockets              | Depends on auth & rate limiting                                      |
| Ergonomics   | StreamingServiceAdapter         | Unified facade + lazy init        | Will host nodeId normalization/warnings                              |
| Auto Init    | AutoInitTokenStreamingService   | Idempotent initialization trigger | Token-focused; conceptually extended via adapter for events/progress |
| Decorators   | @StreamToken/Event/Progress/All | Declarative streaming config      | Need auto nodeId generation & normalization                          |
| Governance   | StreamingAuthService            | JWT validation                    | Stable                                                               |
| Governance   | RateLimiterService              | Token bucket throttle             | Stable                                                               |
| Fallback     | NoOp\* services                 | Safe disablement path             | Tests missing for absence scenario                                   |

### 12.2 Concrete Injection Coupling (Search Summary)

- Numerous direct `TokenStreamingService` constructor injections across multiple libraries ( > 100 occurrences in earlier grep ).
- Risk: Library publishability reduced (consumers would get unintended concrete impl & side-effects).
- Remediation: Replace with DI tokens (`TOKEN_STREAMING_SERVICE_TOKEN`, etc.) + rely on adapter binding at module level.

### 12.3 ExecutionId Adoption Status

| Area                                                 | Status                    | Action Needed                                 |
| ---------------------------------------------------- | ------------------------- | --------------------------------------------- |
| Showcase services (content/analysis/quality/network) | Migrated                  | None                                          |
| Decorators usage                                     | Mixed (implicit)          | Ensure explicit param or inference; add guard |
| Workflows (supervisor/swarm)                         | Not migrated              | Refactor & mapping helper                     |
| State persistence objects                            | Legacy field `showcaseId` | Deprecation plan & alias                      |

### 12.4 Existing NodeId Pattern Samples (Pre-Normalization)

```text
content:ingest
content:chunking
analysis:stream
analysis|scoring:pass1
workflow
multi-agent|planner:dispatch
quality:approval
network:graphBuild
```

Issues Observed: mixed separators (`:` and `|`), camelCase endings, missing phase segment, absent activity specificity (`workflow`).

### 12.5 Risk Register

- Inconsistent nodeIds → Hard to aggregate metrics & logs later.
- Residual `showcaseId` → Confusion & accidental reintroduction in new code.
- Concrete service re-exports → Breaks modular publishability & violates architecture constraints.
- Lack of tests for no-op fallback → Hidden runtime regressions if streaming disabled.
- Missing strict naming mode → Invalid IDs silently propagate.

### 12.6 Design Constraints Reaffirmed

- No backward compatibility promises; prioritize forward canonicalization.
- Zero `any` types; utility must fully type parsed structures.
- No library re-export of another library's service or type (only DI tokens & interfaces locally defined / imported).

## 13. Naming Utility Specification (Implemented Summary)

Implemented File: `libs/langgraph-modules/streaming/src/lib/utils/stream-naming.util.ts`

Shipped Functions:

- `parseNodeId`, `normalizeNodeId`, `buildNodeId`, `validateNodeId`, `normalizeAndWarn`.
- Warn-once semantics (process-level set) + adapter-level additional suppression.
- Error codes: `MISSING_DOMAIN`, `MISSING_PHASE`, `MISSING_ACTIVITY`, `OVER_MAX_LENGTH`, `INVALID_CHARACTERS`, `IDEMPOTENCY_FAILURE`.
- Idempotency verification and max-length enforcement (default 80).
- Strict path throws `InvalidNodeIdError` including raw, normalized, validation snapshot.

### 13.3 Normalization Rules (Expanded)

- Trim & lowercase entire string.
- Split domain/phase boundary at first `|` (if absent → attempt heuristic from prefixes; else error in strict mode).
- Split phase/activity at first `:`; if multiple `:` left → remaining joined into detail (delimiters collapsed).
- Replace any sequence of `[^a-z0-9]+` inside segments with single `-` then trim leading/trailing `-`.
- Remove empty segments (error in strict if required ones missing).
- Reassemble as: `domain|phase:activity` + `:detail` only if detail present after cleanup.
- Enforce max length (default 80) with error/throw policy based on strict flag.

### 13.4 Validation Checks

1. Required segments: domain, phase, activity non-empty after normalization.
2. Character set limited to `[a-z0-9:-|]` after normalization.
3. No double delimiters (`||`, `::`, `:-`, etc.) in final.
4. Length <= max.
5. Idempotency: `normalizeNodeId(normalizeNodeId(x))` stable.

### 13.5 Error Messaging Strategy

- Aggregate all failures; do not short-circuit.
- Provide machine-parsable codes (e.g., `MISSING_DOMAIN`, `OVER_MAX_LENGTH`).
- Optionally embed original string via `original` in parse results for diagnostics.

### 13.6 Adapter Integration (Planned Flow)

```text
userProvidedNodeId -> normalizeNodeId(raw)
   if changed && !warnedBefore: log warn (include diff)
   if strictNaming && !valid: throw
   proceed with canonicalId
```

## 14. Test Matrix (Status)

| Area           | Test Case                         | Purpose                                  |
| -------------- | --------------------------------- | ---------------------------------------- |
| Naming Utility | Simple build (all segments)       | Happy path                               |
| Naming Utility | Missing phase (strict false)      | Auto-inference or error accumulation     |
| Naming Utility | Missing phase (strict true)       | Throws                                   |
| Naming Utility | Illegal chars collapse            | Normalization correctness                |
| Naming Utility | Length enforcement                | Boundary condition                       |
| Naming Utility | Idempotency                       | Stability                                |
| Naming Utility | Round-trip parse→build            | Reversibility                            |
| Adapter        | Warn once per raw id              | Log gating (Implemented)                 |
| Adapter        | Strict naming throws              | Enforcement (Implemented)                |
| Decorator      | Auto-generate from method         | Inference mapping (camelCase → segments) |
| Decorator      | Provided custom id normalized     | Integration path                         |
| Workflow       | Legacy `showcaseId` mapping       | Backwards bridging                       |
| No-Op Fallback | Streaming disabled does not throw | Resilience                               |
| Coverage       | Branches for invalid combos       | >80% branch coverage target              |

## 15. Migration Playbook (Progress Snapshot)

Completed: Steps 1,2,5 (streaming scope),6.
Upcoming: Steps 3 (decorators), 4 (workflows), 7 (deprecation), 8 (final cleanup) plus coverage & fallback test additions.

## 16. DI Tokens & No-Op Reference

| Token                                  | Interface                      | No-Op Implementation              |
| -------------------------------------- | ------------------------------ | --------------------------------- |
| `STREAMING_SERVICE_TOKEN`              | `IStreamingService`            | `NoOpStreamingService`            |
| `TOKEN_STREAMING_SERVICE_TOKEN`        | `ITokenStreamingService`       | `NoOpTokenStreamingService`       |
| `EVENT_STREAM_PROCESSOR_SERVICE_TOKEN` | `IEventStreamProcessorService` | `NoOpEventStreamProcessorService` |
| `WEBSOCKET_BRIDGE_SERVICE_TOKEN`       | `IWebSocketBridgeService`      | `NoOpWebSocketBridgeService`      |

Recommended Pattern Example (Post-Migration):

```ts
constructor(
   @Inject(TOKEN_STREAMING_SERVICE_TOKEN)
   private readonly tokenStream: ITokenStreamingService,
) {}
```

## 17. Acceptance Criteria (Definition of Done Snapshot)

- 0 occurrences of direct concrete streaming service injections in publishable libs.
- 0 occurrences of `showcaseId` in streaming-related contexts (excluding deprecated type alias sites).
- Adapter logs normalization warning exactly once per unique raw non-canonical id during a process lifecycle.
- All new naming utility functions fully typed; no `any` leakage.
- Branch coverage >80% for utility + adapter + decorators.
- `strictNaming` mode demonstrably throws on invalid ids in tests.
- CHANGELOG updated summarizing executionId & naming standardization.

---

_Appendix note (2025-09-14): document extended with detailed findings & specifications to prevent rework._

Document generated on 2025-09-14 to persist the authoritative summary of the streaming integration initiative up to this point.
