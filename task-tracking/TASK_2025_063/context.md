# Task Context for TASK_2025_063

## User Intent

Build a full end-to-end test suite for the NestJS AI SaaS Starter monorepo. Purpose = diagnostic instrument that exercises real functionality (not unit assertions) across the full stack — ChromaDB + Neo4j + LangGraph workflow engine + memory + HITL + adapters + monitoring. Output of any run = single report showing what works, what breaks (with stack trace + suspected lib), what's missing.

## Conversation Summary

### Three Layers Required

1. **Boot smoke** — programmatic boot of `dev-brand-api`, health probe, verify all modules register, list DI/module-init failures
2. **Per-lib functional probes** — real ChromaDB embed/query, Neo4j node/relate/traverse, workflow-engine graph exec, memory store/retrieve, HITL interrupt/resume via Command, adapters checkpoint/resume, monitoring metric emit/collect
3. **Full RAG flow** — ingest doc → embed (chroma) + entity extract (neo4j) → query → workflow orchestrates retrieval from both → grounded answer

### Key Constraints

- **Real services only** — no mocks. Services already up via `docker-compose.dev.yml` (ChromaDB:8000, Neo4j:7687, Redis:6379)
- **New Nx app** `apps/e2e-suite` (or similar name — architect's call) — jest or vitest, architect's call
- **TypeScript strict**, no `any`
- **Repo CLAUDE.md rules** — no v1/v2 versioning, no re-exports, type discovery first
- **Findings documented, NOT fixed** — e.g. missing `generateId` export from langgraph-core, stale assertions, missing spec files in 4 libs → all become follow-up backlog items in `future-enhancements.md`

### Commit Policy

- Stage commits but DO NOT push or merge
- User will explicitly approve commit moments
- Per repo CLAUDE.md global rule "Do not start commit process before i tell you"

## Technical Context

- **Branch**: feature/063 (to be created by user when ready)
- **Created**: 2026-05-15
- **Task Type**: FEATURE (new test infrastructure / diagnostic tooling)
- **Priority**: P1-High
- **Effort Estimate**: L (Large) — spans 10 libraries, 3 test layers, real-service integration
- **Cwd**: /Volumes/SanDiskSSD/mine/nestjs-ai-saas-starter

## Execution Strategy

**Strategy**: FEATURE_COMPREHENSIVE (research likely needed for Nx app scaffolding patterns + real-service test orchestration)

**Planned Agent Sequence**:

1. project-manager — formalize requirements (3-layer scope, output report format, findings-not-fixes policy)
2. researcher-expert [CONDITIONAL] — investigate Nx test app patterns, real-service test runners, report-output formats
3. software-architect — design e2e-suite app structure, test harness, report generator, per-layer probe contracts
4. team-leader MODE 1 — decompose into atomic tasks (likely 1 task per probe + scaffolding + report tooling)
5. team-leader MODE 2 (iterative) — assign each task to backend-developer
6. team-leader MODE 3 — final verification
7. QA: user-chosen (senior-tester / code-reviewer / both / skip)
8. modernization-detector — capture findings (missing exports, stale specs, etc.) as future-enhancements.md backlog

**Validation Gates**: User validates project-manager's task-description.md and software-architect's implementation-plan.md before proceeding.
