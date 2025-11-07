# Task Context for TASK_2025_031

## User Intent

Remove broken 3D text components and create new implementations using troika-three-text library with angular-three-soba.

## Conversation Summary

User identified two broken text component implementations:

- `text-3d-volumetric.component.ts` - Currently non-functional volumetric text component
- `smoke-text-3d.component.ts` - Currently non-functional smoke text effect component

**Technical Requirements**:

- Remove the 2 broken components from the codebase
- Research troika-three-text library implementation patterns for:
  - Glowing text effects
  - Smoke-like text effects
- Create new components using proper troika-three-text integration:
  - `text-3d-glow.component.ts` - Glowing text effect using troika-three-text
  - `text-3d-smoke.component.ts` - Smoke text effect using troika-three-text
- Leverage Soba (angular-three-soba) utilities where helpful
- Reference documentation: https://angularthree.org/soba/introduction/

**Dependencies Status**: All required dependencies already installed

**Root Cause**: Current implementations are completely broken and need complete rewrite with correct library usage

## Technical Context

- Branch: feature/031
- Created: 2025-01-30
- Task Type: REFACTORING + RESEARCH
- Priority: P2-Medium (Quality improvement for 3D text rendering)
- Effort Estimate: Medium (4-6 hours)
  - Research troika-three-text: 1-2 hours
  - Remove broken components: 0.5 hours
  - Implement text-3d-glow: 1-2 hours
  - Implement text-3d-smoke: 1-2 hours
  - Testing and refinement: 1 hour

## Execution Strategy

REFACTORING with RESEARCH component:

1. researcher-expert (troika-three-text patterns and best practices)
2. software-architect (design new component architecture)
3. team-leader MODE 1 (task decomposition into atomic tasks)
4. team-leader MODE 2 (iterative assignment + verification)
5. team-leader MODE 3 (final verification)
6. [USER CHOICE] QA phase (tester/reviewer/both/skip)
7. modernization-detector (future work analysis)
