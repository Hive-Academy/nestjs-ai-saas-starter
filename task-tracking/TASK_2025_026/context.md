# Task Context for TASK_2025_026

## User Intent

**Strategic Landing Page Redesign - Benefit-Focused Narrative for TypeScript/NestJS Developers**

Transform the landing page from a "feature showcase" approach (11 library sections) to a benefit-focused narrative that communicates value to TypeScript/NestJS developers building AI applications.

## Key Strategic Insight

**Previous Approach Problem**: TASK_2025_024 focused on showcasing code/features (11 library sections) rather than communicating value and benefits to developers. Developers don't care about "11 libraries" - they care about whether they can build production-ready AI agents using familiar NestJS patterns.

## Target Audience

- TypeScript developers familiar with NestJS
- Developers wanting to add AI features to their applications
- Teams needing production-ready AI solutions (not toy examples)
- Enterprise architects requiring monitoring, checkpoints, HITL capabilities

## Core Transformation

**FROM**: "Look at our 11 libraries"
**TO**: "Build production-ready AI agents with NestJS patterns you already know"

**Landing Page Focus**: Benefits and value propositions
**Library Sections (TASK_2025_024)**: Become library detail pages (separate from landing page)

## Content Strategy

The landing page should demonstrate:
1. **Value propositions** extracted from real capabilities
2. **Cohesive agentic workflows** (HITL, multi-agent, memory, checkpointers) working together
3. **Familiar patterns** (adapter patterns, repository patterns, NestJS modules)
4. **Production-ready** solutions (monitoring, persistence, human oversight)
5. **Real integration** examples from dev-brand-api use case

## Research Requirements

**CRITICAL**: Deep analysis required before any design/implementation:

1. Root CLAUDE.md - Architecture principles and integration patterns
2. libs/nestjs-chromadb/CLAUDE.md - Vector search patterns and use cases
3. libs/nestjs-neo4j/CLAUDE.md - Graph database patterns and use cases
4. libs/langgraph-modules/*/CLAUDE.md (all 11 modules):
   - core - Workflow interfaces, state management
   - memory - Contextual memory for agents
   - checkpoint - State persistence
   - functional-api - Functional programming patterns
   - multi-agent - Agent coordination
   - platform - LangGraph Platform integration
   - time-travel - Workflow debugging
   - monitoring - Production observability
   - hitl - Human-in-the-loop patterns
   - streaming - Real-time processing
   - workflow-engine - Central orchestration
5. apps/dev-brand-api/src/app/controllers/devbrand.controller.ts - Real use case showing integration

**Extract**: Real value propositions, developer pain points solved, enterprise capabilities demonstrated

## Conversation Summary

**Strategic Pivot**: User identified that showing "what we built" (libraries) is less effective than showing "what problems we solve" (benefits). The 11 library sections created in TASK_2025_024 should become library detail pages, not landing page content.

**User Validation Point**: Emphasized need for deep research phase to extract real value from all documentation and use cases before any design work begins.

## Technical Context

- Branch: feature/026
- Created: 2025-10-23
- Task Type: FEATURE (Strategic Redesign)
- Priority: P1-High (Strategic Business Impact)
- Effort Estimate: XL (16-24 hours)
- Research Required: YES (Critical prerequisite)

## Execution Strategy

**FEATURE_COMPREHENSIVE with RESEARCH-FIRST approach**:

1. Phase 1: researcher-expert → Deep analysis of CLAUDE.md files + dev-brand-api use case
2. Phase 2: business-analyst → Validate value props align with target personas
3. Phase 3: project-manager → Comprehensive requirements for benefit-focused landing page
4. Phase 4: ui-ux-designer → Visual strategy and section designs
5. Phase 5: software-architect → Information architecture and content flow
6. Phase 6: frontend-developer → Implementation of new sections
7. Phase 7: QA (user choice) → senior-tester AND/OR code-reviewer
8. Phase 8: modernization-detector → Future enhancements

## Related Tasks

- **TASK_2025_024**: Paused - 11 library sections (27% complete) will be repurposed as library detail pages
- **TASK_2025_017**: Paused - Light design system work (may inform visual design)
- **TASK_2025_025**: Active - Dev-brand-UI POC showing real integration patterns

## Success Criteria

1. Landing page communicates clear value to TypeScript/NestJS developers
2. Benefits extracted from real documentation and use cases (not invented)
3. Demonstrates cohesive agentic workflows working together
4. Shows familiar NestJS patterns (adapters, repositories, modules)
5. Enterprise capabilities clearly visible (monitoring, HITL, checkpoints)
6. Clear differentiation: Landing = benefits, Library pages = technical details
