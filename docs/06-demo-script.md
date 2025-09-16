# 06 – Demo Script & Timeline (Draft)

> Status: v0.1 (draft)
> Target Duration: 3:00 main + (optional 1:00 extended)
> Audience: Hackathon judges (mixed technical/business)
> Goal: Prove innovation (streaming + replay + memory fusion), implementation rigor (adapter DI, layering), and reliability (checkpoint + resume + HITL gating). Also showcase how **Kiro** agent workflows co-created architecture (meta-evidence of AI-augmented build process).

---

## 0. Structure At-A-Glance

| Segment    | Time (mm:ss) | Theme                           | Criteria Emphasis    | Visual / Asset                                                                      |
| ---------- | ------------ | ------------------------------- | -------------------- | ----------------------------------------------------------------------------------- |
| 1          | 00:00–00:15  | Kiro Co-Creation Receipts       | Innovation / Process | Scroll of prior AI agent spec conversation (fast montage)                           |
| 2          | 00:15–00:35  | Problem → Platform Pillars      | Clarity / Innovation | Slide: 5 Pillars (Exec Orchestration, Streaming, Durability, Memory Fusion, Safety) |
| 3          | 00:35–01:05  | Live Orchestrated Run (Kickoff) | Implementation       | Terminal: `/orchestrate` request + executionId                                      |
| 4          | 01:05–01:40  | Real-Time Token Streaming       | Innovation / UX      | UI panel: tokens flowing (decorators visible briefly)                               |
| 5          | 01:40–02:05  | Checkpoint + Forced Restart     | Reliability          | Kill & restart terminal; resume mid-node                                            |
| 6          | 02:05–02:25  | HITL Approval Gate              | Safety / Control     | Pause screen + approval response action                                             |
| 7          | 02:25–02:45  | Memory Fusion Enrichment        | Implementation Depth | Diff: baseline answer vs enriched context (vector+graph)                            |
| 8          | 02:45–03:00  | Replay (Time Travel Flash)      | Innovation           | Timeline replay clip (accelerated)                                                  |
| (Optional) | 03:00–03:30  | Monitoring + Roadmap Hooks      | Extensibility        | Event log / metrics placeholders                                                    |
| (Optional) | 03:30–04:00  | Q&A Ready Slide                 | Completeness         | Summary grid (criteria → evidence)                                                  |

---

## 1. Cold Open – Kiro Co-Creation (00:00–00:15)

Narration: "We didn't just build AI workflows – we _used_ AI (Kiro orchestrator agents) to iteratively design architecture, enforce constraints, and generate specs. What you're seeing is an AI-augmented engineering loop."  
Action: Rapid capture (screen recording) scrolling through: `CLAUDE.md`, `STREAMING_INTEGRATION_BLUEPRINT.md`, `01-inventory.md`, `04-value-prop-per-library.md`.  
On-Screen Highlight: Keywords: `MANDATORY AGENT WORKFLOW`, `DI ADAPTER PATTERN`, `REPLAY`, `MEMORY FUSION`.  
Callout Overlay: "AI-in-the-loop engineering receipts".

---

## 2. Platform Pillars (00:15–00:35)

Narration: "From that process emerged five platform pillars: Orchestration, Real-Time Streaming, Durability & Replay, Unified Memory Fusion, and Human Safety Gates."  
Visual: Single concise slide (or static markdown) with icons + short phrase each.  
CTA: "Now let's see them _together_ in one execution."

---

## 3. Kickoff Orchestrated Run (00:35–01:05)

Narration: "Every workflow starts through a single orchestrate command – enforcing consistency and enabling checkpoint + replay."  
Action: Run: `POST /orchestrate` (or CLI alias) – show returned `{ executionId: ... }`.  
Overlay: Micro diagram (executionId flows downward).  
Criteria Tag: Implementation Rigor.

---

## 4. Live Token Streaming (01:05–01:40)

Narration: "Token-level decorators stream partial output instantly. This improves perceived performance and enables mid-flight introspection."  
Action: UI shows incremental tokens; briefly flash the `@StreamToken` decorator in code.  
Overlay: Badge row: `@StreamToken` → Adapter → WebSocket → UI.  
Micro-proof: Show `NoOp` fallback stub next to real adapter (underscores optionality).  
Criteria Tag: Innovation + Developer Experience.

---

## 5. Checkpoint & Restart (01:40–02:05)

Narration: "If the process dies, we don't lose session context – we continue from the last persisted node."  
Action: Manually kill process (Ctrl+C), restart server, pass same executionId (auto-detected / resumed).  
UI: Streaming picks up again (remaining tokens only).  
Overlay: `saved ➜ resumed (delta only)`.  
Criteria Tag: Reliability.

---

## 6. Human-in-the-Loop Gate (02:05–02:25)

Narration: "Critical actions pass through an approval gate – fully declarative, removable with zero code churn."  
Action: Execution pauses; UI shows 'Approval Required'. Operator clicks Approve.  
Code Flash: `@RequiresApproval()` decorator.  
Overlay: `Gate (timeout fallback ready)`.  
Criteria Tag: Safety / Control.

---

## 7. Memory Fusion (02:25–02:45)

Narration: "Context isn’t just semantic – we _fuse_ vector relevance with graph relationships for richer grounding."  
Action: Side-by-side responses: (Left) semantic-only; (Right) fused memory answer referencing entities.  
Overlay: Flow: Chroma → entities → Neo4j expansion → ranked context bundle.  
Criteria Tag: Implementation Depth.

---

## 8. Replay Flash (02:45–03:00)

Narration: "Any execution can be replayed deterministically – including original streaming rhythm – for debugging or audit."  
Action: Launch replay; show accelerated timeline with token bursts.  
Overlay: `checkpoint snapshot ➜ deterministic iterator ➜ streaming adapter`.  
Criteria Tag: Innovation.

---

## (Optional Extension) Monitoring & Roadmap (03:00–03:30)

Narration: "Instrumentation hooks are scaffolded – events already classified: token_stream, node_progress, approval_request, checkpoint_save."  
Action: Show mock dashboard capturing emitted events.  
Overlay: Future: metrics sink + anomaly detection pipeline.  
Criteria Tag: Extensibility.

---

## (Optional Extension) Q&A Slide (03:30–04:00)

Table: Criteria → Feature → Evidence reference (doc section IDs).  
Call to Action: "Clone, toggle off features, and watch graceful degradation – that's architectural discipline."

---

## 9. Scripted Narration (Condensed Reading Text)

> (Use as Teleprompter – aim for energetic but calm delivery.)

"We built this platform _with_ AI – Kiro’s orchestrated agents helped enforce constraints you see documented here. Out of that loop came five pillars: orchestration, streaming, durability & replay, unified memory fusion, and human safety gates. Let’s watch them combine.

First, every run begins at a single orchestrate endpoint – giving us consistent lifecycle control. Now tokens start streaming – decorators map directly to our DI adapter so this could be swapped or disabled with zero code edits. I’ll simulate a crash – and after restart we resume exactly where we left off thanks to checkpointing.

Next, we hit an approval gate; a human confirms and the workflow continues. The answer you see is enriched, not by plain vector search alone, but by a fusion of semantic similarity and graph expansion. Finally, we replay the whole thing – same timeline, same token cadence – proving determinism and auditability. That’s innovation, depth, and reliability working together."

---

## 10. Asset Checklist

| Asset                                          | Status  | Notes                              |
| ---------------------------------------------- | ------- | ---------------------------------- |
| Fast scroll recording of specs & conversations | Pending | Use VSCode + terminal transcripts  |
| Pillars slide                                  | Pending | 5 icons minimal text               |
| Orchestrate terminal capture                   | Pending | Show executionId clearly           |
| Streaming UI panel                             | Pending | Ensure high contrast font          |
| Kill & resume sequence                         | Pending | Maybe annotate with on-screen text |
| Approval modal                                 | Pending | Include timestamp                  |
| Memory fusion diff                             | Pending | Pre-build deterministic example    |
| Replay timeline                                | Pending | Use accelerated speed 2×           |
| Optional metrics dashboard mock                | Pending | Simple bar / list                  |
| Criteria summary table                         | Pending | Derived from architecture doc      |

---

## 11. Risk Mitigation

| Risk                               | Mitigation                                                |
| ---------------------------------- | --------------------------------------------------------- |
| Live LLM latency spike             | Warm up model & cache first embedding call                |
| Restart fails to detect checkpoint | Pre-run health check; fallback to demonstration recording |
| Approval event not fired           | Add manual trigger endpoint as safety net                 |
| Memory fusion returns empty graph  | Use curated dataset with guaranteed relationships         |
| Replay drift (non-deterministic)   | Fix seed & ensure no wall-clock dependent logic           |

---

## 12. Success Criteria

| Dimension        | Metric                                             |
| ---------------- | -------------------------------------------------- |
| Time Budget      | <= 3:05 primary section                            |
| Feature Coverage | All 5 pillars touched                              |
| Visual Clarity   | No screen >10s static without purposeful voiceover |
| Judge Recall     | Pillars & replay concept referenced in Q&A         |

---

## 13. Next Actions

1. Generate minimal dataset for memory fusion segment (entities + related docs).
2. Implement remaining streaming wiring (multi-agent + hitl) if not already.
3. Script rehearsal with timer; trim narration to fit.
4. Capture all raw footage; then assemble quick cut.
5. Update root `README.md` with a distilled "Demo Story" section linking this script.

---

Prepared for: High-impact demo execution.
