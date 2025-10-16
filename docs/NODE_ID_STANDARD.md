# Node ID Standard (Centralized Canonicalization)

## 1. Purpose

Provide a single, future-proof contract for identifying workflow / agent / streaming nodes across the platform using a canonical pattern:

```text
<domain>|<phase>:<activity>[:<detail>]
```

This document explains the current implementation (migrated into `@hive-academy/langgraph-core`) and how/when to adopt it more broadly. **Immediate adoption outside streaming is optional**.

---

## 2. Current Scope (What Is Live Now)

Implemented for streaming decorators only:

- Inference + normalization happen automatically inside `@StreamToken`, `@StreamEvent`, `@StreamProgress`, `@StreamAll`.
- Logic relocated from the streaming library to core under: `libs/langgraph-modules/core/src/lib/utils/node-id/`
- New fluent builder + shared helpers:
  - `NodeIdBuilder`
  - `computeCanonicalNodeId`
  - `inferRawNodeId`
  - `normalizeNodeId`, `normalizeAndWarn`
  - `validateNodeId`, `parseNodeId`
  - `InvalidNodeIdError`

No other libraries (workflow-engine, multi-agent, memory, time-travel, etc.) are required to change right now.

---

## 3. Design Goals

| Goal                    | Description                                                        |
| ----------------------- | ------------------------------------------------------------------ |
| Consistency             | Single place to evolve rules (length, casing, allowed chars).      |
| Extensibility           | Builder allows deliberate construction beyond method decorators.   |
| Observability Alignment | Enables stable metrics/tag dimensions (domain / phase / activity). |
| Safety                  | Optional strict mode to reject non-canonical forms early.          |
| Incremental Adoption    | Other modules can opt in progressively (passive → strict).         |

---

---

## 4. Canonical Pattern Semantics

| Segment  | Meaning                             | Example                           |
| -------- | ----------------------------------- | --------------------------------- |
| domain   | Functional area / capability family | `content`, `research`, `checkout` |
| phase    | Lifecycle or stage grouping         | `ingest`, `plan`, `execute`       |
| activity | Primary action at that phase        | `chunk`, `expand`, `route`        |
| detail   | Optional extra disambiguation       | `tokens`, `batch-1`, `v2`         |

Rules (current implementation):

- Lowercase enforced
- Non-alphanumeric collapsed to `-`
- Empty required segments => validation failure
- Max length default 80 (configurable per call)

---

---

## 5. Runtime APIs (Imported from `@hive-academy/langgraph-core`)

| Function / Class                                                     | Use Case                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------ |
| `inferRawNodeId(targetProto, methodName)`                            | Derive baseline id from class + method naming.               |
| `computeCanonicalNodeId(provided?, target, method, strict, logger?)` | Inference + normalization + (optional) strict validation.    |
| `NodeIdBuilder.create()`                                             | Programmatic explicit construction (non-decorator contexts). |
| `normalizeNodeId(raw)`                                               | Deterministic normalization (no warnings).                   |
| `normalizeAndWarn(raw, { strict?, warn? })`                          | Normalize + single warning emission (or throw if strict).    |
| `validateNodeId(raw, strict?, opts?)`                                | Structural + idempotency validation (strict throws).         |
| `parseNodeId(raw)`                                                   | Tolerant decomposition (diagnostics, not enforcement).       |
| `buildNodeId(parts, opts)`                                           | Low-level construction (builder preferred).                  |
| `InvalidNodeIdError`                                                 | Thrown when strict mode rejects a value.                     |

---

---

## 6. Present Adoption Level

| Layer                  | Status      | Notes                                                  |
| ---------------------- | ----------- | ------------------------------------------------------ |
| Streaming Decorators   | Adopted     | Full inference + strict optional.                      |
| Workflow Graph Builder | Not adopted | Could normalize at build time later.                   |
| Multi-Agent Module     | Not adopted | Future: encode agent role → domain.                    |
| Memory / Checkpoint    | Not adopted | Future: canonical keys improve replay diffing.         |
| Time Travel            | Not adopted | Future: parse for lineage grouping / UI facet filters. |
| Monitoring / Metrics   | Not adopted | Future: dimension extraction for dashboards.           |

---

---

## 7. Phased Adoption Strategy (Optional Roadmap)

| Phase        | Description                                     | Example Change                                      |
| ------------ | ----------------------------------------------- | --------------------------------------------------- |
| 0 (Now)      | Streaming only                                  | Already complete                                    |
| 1 Passive    | Normalize in other modules (no strict)          | `nodeId = normalizeAndWarn(nodeId, { warn:false })` |
| 2 Structured | Add parsing for metrics                         | `const {domain,phase}=parseNodeId(nodeId)`          |
| 3 Explicit   | Use `NodeIdBuilder` when dynamically generating | `NodeIdBuilder.create().domain('research')...`      |
| 4 Strict     | Enable strict in CI                             | `normalizeAndWarn(id,{strict:true})` during tests   |
| 5 Contract   | Public API / docs guarantee                     | Add section in external API spec                    |

---

---

## 8. When NOT to Adopt (Yet)

Skip extending adoption if:

- The module only uses ephemeral internal labels.
- You have no analytics or observability grouping needs.
- You are rapidly prototyping and renaming frequently.

---

---

## 9. Migration Decision Matrix

| Question                                | If YES → Consider Phase    |
| --------------------------------------- | -------------------------- |
| Do we persist / replay by node?         | Phase 1 or 2               |
| Do we expose nodeIds externally?        | Phase 4+                   |
| Do we aggregate metrics by node facets? | Phase 2                    |
| Are teams adding ad-hoc naming rules?   | Phase 1 now                |
| Is refactoring causing ID churn?        | Phase 3 (explicit builder) |

---

---

## 10. Example Patterns

### 10.1 Explicit Node Construction

```ts
import { NodeIdBuilder } from '@hive-academy/langgraph-core';
const nodeId = NodeIdBuilder.create().domain('content').phase('ingest').activity('chunk').detail('tokens').build(); // => content|ingest:chunk:tokens
```

### 10.2 Defensive Validation (CI Gate)

```ts
import { normalizeAndWarn, InvalidNodeIdError } from '@hive-academy/langgraph-core';
try {
  normalizeAndWarn(candidate, { strict: true });
} catch (e) {
  if (e instanceof InvalidNodeIdError) {
    throw new Error('Rejecting non-canonical nodeId: ' + e.raw);
  }
}
```

### 10.3 Passive Normalization (Future Phase 1)

```ts
// At workflow build boundary
node.id = normalizeNodeId(node.id);
```

### 10.4 Inference Inside a Custom Decorator

```ts
import { computeCanonicalNodeId } from '@hive-academy/langgraph-core';
function MyDecorator(opts: { nodeId?: string } = {}): MethodDecorator {
  return (target, prop, descriptor) => {
    const { nodeId } = computeCanonicalNodeId(opts.nodeId, target, prop, false);
    Reflect.defineMetadata('my:nodeId', nodeId, target, prop);
    return descriptor;
  };
}
```

---

## 11. Error Semantics

`InvalidNodeIdError` is only thrown when `strict: true` is requested AND:

- Missing required segment(s)
- Contains illegal characters post-normalization
- Exceeds configured max length
- Normalization not idempotent (sanity guard)

---

## 12. Future Extensions (Optional Backlog)

| Idea                                     | Value                        |
| ---------------------------------------- | ---------------------------- |
| `extractNodeIdDimensions(nodeId)` helper | Consistent metrics tags      |
| Domain taxonomy registry                 | Governance / discoverability |
| NodeId deprecation mapping               | Seamless rename migrations   |
| Structured metrics adapter               | Automatic label enrichment   |
| GraphQL / REST schema annotation         | Public contract clarity      |

---

## 13. FAQ

**Q: Do I need to rewrite existing node IDs?**  
No. Only adopt forward where stability matters.

**Q: Can I mix inferred + explicit?**  
Yes. Inferred for prototyping; explicit for long-lived interfaces.

**Q: Will enabling strict later break things?**  
Only if current IDs aren’t canonical. Run a dry pass with `normalizeAndWarn(id,{strict:true})` in CI first.

---

## 14. Recommended Minimum For Now

Do nothing more immediately. Revisit Phase 1 if / when:

- Metrics grouping is requested
- Multi-agent roles proliferate
- Replay tooling needs consistent indexing

Document ends here until adoption escalates.
