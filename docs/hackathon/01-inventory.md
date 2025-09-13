# 01 – Repository Inventory & Synergy Map

> Status: v0.1 (draft)
> Scope: Enumerates all publishable packages + demo apps + their roles in the AI agent platform.

## Summary

| Category | Name | NPM Package | Purpose (Concise) | Key Tech | Depends On | Provides |
| -------- | ---- | ----------- | ------------------| -------- | ---------- | -------- |
| Core | langgraph-core | `@hive-academy/langgraph-core` | Foundational types, decorators, shared abstractions | NestJS, LangGraph | - | Common contracts, DI tokens |
| Workflow | langgraph-workflow-engine | `@hive-academy/langgraph-workflow-engine` | High-level graph/workflow orchestration layer | LangGraph, RxJS | core, streaming*, functional-api, checkpoint | Execution runtime, streaming hooks |
| Functional | langgraph-functional-api | `@hive-academy/langgraph-functional-api` | Declarative/functional composition over workflows & events | NestJS, RxJS | core | Functional decorators, event patterns |
| Memory | langgraph-memory | `@hive-academy/langgraph-memory` | Unified memory module (vector + graph) | NestJS | chromadb*, neo4j* | Adapters, semantic memory APIs |
| Persistence | nestjs-chromadb | `@hive-academy/nestjs-chromadb` | Vector DB integration (embeddings, similarity) | ChromaDB | - | Vector store provider |
| Persistence | nestjs-neo4j | `@hive-academy/nestjs-neo4j` | Graph DB integration (relationships) | Neo4j | - | Graph store provider |
| Checkpointing | langgraph-checkpoint | `@hive-academy/langgraph-checkpoint` | Durable execution state & replay | LangGraph | core | Checkpoint manager, adapters |
| Multi-Agent | langgraph-multi-agent | `@hive-academy/langgraph-multi-agent` | Patterns for multi-agent coordination & messaging | LangGraph | core, streaming* | Coordination layer |
| HITL | langgraph-hitl | `@hive-academy/langgraph-hitl` | Human-in-the-loop approvals & interventions | NestJS | core | Approval workflows |
| Monitoring | langgraph-monitoring | `@hive-academy/langgraph-monitoring` | Metrics & observability scaffolding | NestJS | core | Event emitters, monitoring hooks |
| Streaming | langgraph-streaming | `@hive-academy/langgraph-streaming` | Real-time token/event/progress streaming (WebSockets) | NestJS WS, Socket.IO | core | Streaming service adapter |
| Time Travel | langgraph-time-travel | `@hive-academy/langgraph-time-travel` | State replay & timeline navigation | NestJS | core, checkpoint | Replay utilities |
| Platform | langgraph-platform | `@hive-academy/langgraph-platform` | External LangGraph Platform API integration | HTTP, LangGraph | core | Assistants/Threads/Runs client |
| Orchestration | langgraph-workflow-engine | (dup) | (See above) |  |  |  |

> *Starred dependencies are runtime/environment optional via DI.

## Dependency Layers (Conceptual)

```text
┌─────────────────────────────────────────────────────┐
│                   Applications (API/UI)             │
├─────────────────────────────────────────────────────┤
│   Orchestration: workflow-engine · multi-agent      │
├─────────────────────────────────────────────────────┤
│  Cross-Cutting: streaming · checkpoint · hitl       │
│                  monitoring · time-travel           │
├─────────────────────────────────────────────────────┤
│ Domains: memory · platform                          │
├─────────────────────────────────────────────────────┤
│ Persistence Adapters: chromadb · neo4j              │
├─────────────────────────────────────────────────────┤
│ Foundation: core · functional-api                   │
└─────────────────────────────────────────────────────┘
```

## Detailed Descriptions (One-Liners)

- core: Contracts + DI tokens = stable backbone for all higher-level modules.
- functional-api: Turns verbose class patterns into concise functional declarators.
- checkpoint: Safeguards long-running agent workflows with restart + replay semantics.
- streaming: Bridges internal execution events to real-time WebSocket clients.
- multi-agent: Provides coordination semantics (roles, messaging, swarm patterns).
- hitl: Adds structured gates for human approval, escalation, override.
- monitoring: Seeds metrics pipeline (emit, aggregate, forward) for observability.
- memory: Abstracts vector + graph memory into unified semantic context layer.
- time-travel: Enables deterministic replay & historical inspection for debugging.
- platform: Integrates external LangGraph Platform entities (Assistants/Threads/Runs).
- workflow-engine: High-level orchestrator composing nodes, streaming, checkpoint.
- nestjs-chromadb: First-class ChromaDB integration with DI + health + embeddings.
- nestjs-neo4j: Production-ready Neo4j integration with pooling & health checks.

## Synergy Examples

| Capability | Involved Libraries | Value Story |
| ---------- | ------------------ | ----------- |
| Resumable Streaming Workflows | workflow-engine + streaming + checkpoint | No lost progress; users see live tokens even after restart |
| Human-Gated Agent Actions | hitl + workflow-engine + streaming | Approvers intervene mid-flight with real-time visibility |
| Multi-Agent Debate | multi-agent + streaming + memory | Agents use shared semantic context, visible live in UI |
| Semantic Enriched Graph Ops | memory + chromadb + neo4j | Vector similarity informs relationship creation |
| Debug/Rewind Failures | time-travel + checkpoint + streaming | Replay timeline while inspecting original streamed outputs |

## Current Strengths

- Cohesive layering & DI boundary discipline.
- All packages version-aligned (0.0.1) -> internal stability for hackathon.
- Export maps + types ready for NPM publishing.
- Consistent NestJS module pattern across packages.
- Streaming blueprint already formalized (see `STREAMING_INTEGRATION_BLUEPRINT.md`).

## Gaps / Opportunities (To Address in Docs or Code Before Demo)

| Area | Gap | Planned Remedy |
| ---- | ----| -------------- |
| README Root | Outdated library count & architecture focus | Rewrite to reflect 12+ modules & multi-agent streaming story |
| Streaming Integration | workflow-engine partially console-based | Apply DI adapter patch (already blueprinted) |
| Value Narrative | Business outcomes not emphasized | Add business use-case section (support, code review, market intel) |
| Metrics Story | monitoring module light | Provide roadmap + sample emitted event spec |
| HITL Visibility | Lacks end-to-end example | Add approval flow demo snippet in demo script |
| Time Travel | Not showcased | Include replay scenario in demo script appendix |
| Frontend | Need real-time visual artifact | Capture GIF of live token + multi-agent panel |

## Action Tags

- `#readme` – Root README overhaul
- `#demo` – Live demo script assets
- `#streaming-fix` – Console → DI streaming refactor
- `#business-story` – Business value weaving

## Next

Proceed to gap analysis (02) to map existing docs vs required judging criteria narrative.
