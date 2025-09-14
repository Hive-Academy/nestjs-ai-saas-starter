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

## 2. Current Core Components

- Services: `TokenStreamingService`, `EventStreamProcessorService`, `WebSocketBridgeService`.
- Adapters: `StreamingServiceAdapter` (+ token/event/progress wrappers) with pending naming normalization hook.
- Lazy Wrapper: `AutoInitTokenStreamingService` (now conceptually extended to events/progress init logic in adapter).
- Decorators: `@StreamToken`, `@StreamEvent`, `@StreamProgress`, `@StreamAll` using centralized default config.
- Auth & Governance: JWT auth, token bucket rate limiting.
- Correlation: `executionId` (canonical) replacing `showcaseId` in service layer.
- Planned Utility: `stream-naming.util.ts` (not yet implemented).
- DI Contracts: `IStreamingService`, `ITokenStreamingService`, `IEventStreamProcessorService`, `IWebSocketBridgeService` + DI tokens & no-op implementations.

## 3. What Has Been Refactored

- Service-layer streaming calls uniformly accept `executionId`.
- Content/Analysis/Quality/Network showcase services migrated & type issues resolved.
- Centralized defaults removed per-decorator duplication.
- Initialization responsibilities removed from callers (auto-init pattern adopted).

## 4. Pending Gaps / Risks

- Workflows (supervisor/swarm) still contain legacy `showcaseId` references.
- No naming normalization enforcement yet—risk of inconsistent nodeIds entering metrics/log streams.
- Concrete service injections remain in multiple libraries (coupling risk for publishable package boundaries).
- Lack of strict mode (cannot escalate invalid naming to errors yet).
- Tests for new naming / normalization behaviors not yet written.

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

## 6. Migration / Enforcement Roadmap (High-Level)

1. Implement naming utility (warn-only mode) + unit tests.
2. Integrate adapter-level normalization (warn once per raw nodeId divergence).
3. Enhance decorators to auto-generate canonical nodeIds from method metadata if omitted.
4. Refactor workflows to use builder → eliminate ad-hoc IDs.
5. Enable optional `strictNaming` flag in module config to escalate invalid IDs to thrown errors.
6. Migrate all publishable libraries to interface DI tokens; remove concrete references.
7. Add regression & coverage tests (adapters, decorators, workflows).
8. Final deprecation marking for `showcaseId` (alias or removal plan documented).

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

## 11. Immediate Next Action

Implement `stream-naming.util.ts` with comprehensive tests, then wire adapter normalization (warning mode).

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

## 13. Naming Utility Specification

### 13.1 Target File

`libs/<core-streaming-lib>/src/lib/utils/stream-naming.util.ts` (exact lib path to be confirmed during implementation—must live where other streaming abstractions reside; avoid polluting feature modules).

### 13.2 Functions (Proposed Signatures)

```ts
export interface NodeIdParts {
  domain: string; // required
  phase: string; // required
  activity: string; // required
  detail?: string; // optional
  original?: string; // optional preservation for diagnostics
}

export interface BuildNodeIdOptions {
  enforceMaxLength?: boolean; // default true
  maxLength?: number; // default 80
  strict?: boolean; // if true, throw on invalid vs. silent normalize
}

export function buildNodeId(parts: NodeIdParts, opts?: BuildNodeIdOptions): string; // assumes already validated, performs normalization
export function normalizeNodeId(raw: string, opts?: BuildNodeIdOptions): string; // parses -> reassembles canonical form
export function parseNodeId(raw: string): NodeIdParts; // tolerant parse (collect original)
export function validateNodeId(raw: string, strict?: boolean): { valid: boolean; errors: string[] }; // no throw unless strict
```

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

## 14. Test Matrix (Planned)

| Area           | Test Case                         | Purpose                                  |
| -------------- | --------------------------------- | ---------------------------------------- |
| Naming Utility | Simple build (all segments)       | Happy path                               |
| Naming Utility | Missing phase (strict false)      | Auto-inference or error accumulation     |
| Naming Utility | Missing phase (strict true)       | Throws                                   |
| Naming Utility | Illegal chars collapse            | Normalization correctness                |
| Naming Utility | Length enforcement                | Boundary condition                       |
| Naming Utility | Idempotency                       | Stability                                |
| Naming Utility | Round-trip parse→build            | Reversibility                            |
| Adapter        | Warn once per raw id              | Log gating                               |
| Adapter        | Strict naming throws              | Enforcement                              |
| Decorator      | Auto-generate from method         | Inference mapping (camelCase → segments) |
| Decorator      | Provided custom id normalized     | Integration path                         |
| Workflow       | Legacy `showcaseId` mapping       | Backwards bridging                       |
| No-Op Fallback | Streaming disabled does not throw | Resilience                               |
| Coverage       | Branches for invalid combos       | >80% branch coverage target              |

## 15. Migration Playbook (Actionable Steps)

1. Implement & test naming utility (warn mode default).
2. Add normalization in adapter; release internal build (no external docs yet).
3. Decorator augmentation for inference + normalization.
4. Migrate workflows using builder; remove ad-hoc strings.
5. Switch injections to interface tokens across publishable libs.
6. Add strictNaming flag; enable in CI (later) with transitional allowlist if needed.
7. Deprecate `showcaseId`; introduce mapping helper; annotate with `@deprecated`.
8. Final cleanup: remove allowlist & enable fail-fast normalization.

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
