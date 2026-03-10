# Task Context for TASK_2025_061

## User Intent

Researcher Pages Streaming UI/UX Enhancement - Apply the same streaming event processing and UI improvements from TASK_2025_059 (DevBrand workflow) to the researcher pages.

## Technical Context

- Task Type: Feature
- Priority: P1-High
- Effort Estimate: L
- Created: 2026-03-10
- Status: Active
- Branch: ak/implement-work-os-authentication

## Investigation Findings (from TASK_2025_059)

The researcher pages have identical streaming issues to those fixed in the DevBrand workflow:

### Key Files

- `apps/dev-brand-ui/src/app/features/research-chat/services/research.service.ts` (254 lines) - Only 4 event types registered, MISSING `message-stream` and `custom-stream`
- `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.ts` (605 lines) - Monolithic component, no centralized state service, plain class properties not signals
- `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.html` (123 lines)

### Issues Identified

1. Missing `message-stream` and `custom-stream` event listeners
2. No streaming text accumulation for LLM token display
3. No centralized state management service (all state in component)
4. Plain class properties instead of Angular signals
5. No domain event router pattern (silently drops events)

## Reference Implementation

TASK_2025_059 established patterns that should be reused:

- Domain event router in workflow state service
- Agent registry for node name mapping
- Signal-based state management
- Orchestration timeline component
- Agent activity panels
- Streaming text display component
