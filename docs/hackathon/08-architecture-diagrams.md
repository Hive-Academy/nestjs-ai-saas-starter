# Architecture Diagrams

> Visual representations (Mermaid) of key platform structures. These are intentionally concise for hackathon presentation clarity.

## Module Dependency (Logical Layering)

```mermaid
graph TD
  subgraph Core
    core(core)
    wf(workflow-engine)
    fp(functional-api)
  end

  subgraph CrossCutting[Cross-Cutting]
    stream(streaming)
    chk(checkpoint)
    tt(time-travel)
    mem(memory)
    hitl(hitl)
    ma(multi-agent)
    mon(monitoring)
    plat(platform)
  end

  subgraph Adapters
    chroma(nestjs-chromadb)
    neo(nestjs-neo4j)
  end

  core --> wf --> fp
  wf --> stream
  wf --> chk
  wf --> hitl
  wf --> ma
  wf --> plat
  chk --> tt
  mem --> chroma
  mem --> neo
  plat --> mon
```

## Memory Fusion Retrieval Flow

```mermaid
sequenceDiagram
  participant U as Workflow
  participant M as Memory Module
  participant V as Vector (ChromaDB)
  participant G as Graph (Neo4j)
  participant E as Enricher

  U->>M: requestContext(query)
  M->>V: similaritySearch(query)
  V-->>M: topK embeddings
  M->>G: expandRelated(nodes from embeddings)
  G-->>M: relationship subgraph
  M->>E: fuse(vectorDocs + graphContext)
  E-->>U: enrichedContext
```

## Checkpoint + Replay Timeline

```mermaid
timeline
  title Durable Execution Lifecycle
  section Run 1
    Start : Execution created (executionId)
    Stream : Tokens/events emitted
    Checkpoint : State snapshot N
    Failure : Process crash / restart scenario
  section Recovery
    Resume : Load last checkpoint
    Continue : Emit new tokens
    Checkpoint : Subsequent snapshot
  section Replay
    Select : User chooses executionId
    Rehydrate : Load checkpoint + event log
    Emit : Reproduce original token cadence
```

## Notes

- Arrows show conceptual dependencies, not necessarily direct TypeScript imports (DI boundaries abstract some edges).
- `platform` aggregates registration glue; avoid importing it back into leaf modules.
- Replay leverages checkpoint state + persisted event/timeline records (spec in progress).
