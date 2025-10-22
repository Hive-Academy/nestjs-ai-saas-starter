# Task Context for TASK_2025_019

## User Intent

Execute the first phase of the Angular-LangGraph Generic Rewrite meta-plan (TASK_2025_018) focusing on core services and models infrastructure.

## Parent Task

**TASK_2025_018**: Angular-LangGraph Generic Rewrite (Meta-Plan)
- Status: Complete
- Approved: 2025-01-22
- Documentation: task-tracking/TASK_2025_018/task-description.md

## Task Scope Summary

Transform core services, protocol implementation, state management, and TypeScript models from DevBrand-specific hardcoded implementation to fully generic, workflow-agnostic infrastructure.

### Primary Objectives

1. **Genericize LangGraphConnectionService**
   - Remove hardcoded `/devbrand/execute` endpoint
   - Implement configurable `/:workflowId/execute` pattern
   - Support dynamic WebSocket subscription paths
   - Generic authentication token handling

2. **Implement WorkflowRegistry Pattern**
   - Design `WorkflowDefinition<TInput, TOutput>` interface
   - Create `WorkflowRegistry` service with register/get/list methods
   - Enable multi-workflow support without library modification
   - Support schema validation with Zod

3. **Make LangGraphProtocolService Workflow-Agnostic**
   - Remove DevBrand-specific protocol logic
   - Generic event type handling
   - Configurable state management

4. **Convert TypeScript Models to Generic Interfaces**
   - Remove DevBrand-specific metadata fields
   - Create `WorkflowExecution<TInput, TState>` interface
   - Document schema validation patterns
   - Add custom workflow type definition examples

5. **Add Configuration Interfaces**
   - Dynamic workflow registration at bootstrap
   - Type-safe configuration options
   - Multi-workflow setup patterns

## Technical Context

- **Branch**: feature/019
- **Created**: 2025-10-22
- **Task Type**: REFACTORING + DOCUMENTATION
- **Priority**: P1-High
- **Effort Estimate**: L (10-12 hours)
- **Dependencies**: None (First task in sequence)
- **Blocks**: TASK_2025_020, TASK_2025_021, TASK_2025_022

## Acceptance Criteria (from Meta-Plan)

1. **Zero Hardcoded Endpoints**: No hardcoded endpoints exist in connection service documentation
2. **WorkflowRegistry Support**: Registry supports workflow registration without library modification
3. **Type Parameter Propagation**: All type parameters propagate through Observable streams
4. **Generic Examples**: Examples use placeholder workflow names (e.g., "content-generation", "data-analysis")

## Quality Standards

- **ANTI-BACKWARD COMPATIBILITY**: No v1/v2/legacy versions or compatibility layers
- **REAL IMPLEMENTATION**: Production-ready patterns, no stubs or placeholders
- **TYPE SAFETY**: Full TypeScript generic type support
- **DOCUMENTATION QUALITY**: Clear examples demonstrating WorkflowRegistry pattern

## Critical Requirements (from TASK_2025_018)

1. Target ALL features without bypassing details (all 16 AG-UI event types preserved)
2. 100% generic - zero DevBrand-specific implementations
3. Support all features through generic infrastructure (WorkflowRegistry)
4. Remove ALL DevBrand-specific code from library documentation
5. WorkflowRegistry enables multi-workflow support
6. Use content projection & templates for customization (applicable to components)
7. Create separate examples package (DevBrand moves to examples/)

## Estimated Breakdown

- Service documentation rewrite: 4 hours
- WorkflowRegistry design & documentation: 3 hours
- Models genericization: 2 hours
- Code examples creation: 2-3 hours

**Total**: 10-12 hours

## Execution Strategy

**REFACTORING + DOCUMENTATION (Focused)**:
1. project-manager (requirements analysis) → USER VALIDATION
2. software-architect (WorkflowRegistry design) → USER VALIDATION
3. Developer (documentation implementation)
4. Senior-tester (validation of examples)
5. Code-reviewer (quality check)
6. modernization-detector (future enhancements)

## Related Files

- Source Documentation: `docs/angular-langgraph.md` (services sections)
- Meta-Plan: `task-tracking/TASK_2025_018/task-description.md`
- Registry: `task-tracking/registry.md`

## Next Steps (Post-Completion)

Upon completion of TASK_2025_019:
- TASK_2025_020: Components & Directives Rewrite (depends on WorkflowRegistry)
- TASK_2025_021: Composables & Providers Rewrite (depends on 019, 020)
- TASK_2025_022: Examples Package Creation (depends on 019, 020, 021)
- TASK_2025_023: Documentation Consolidation & Final Review (depends on all)
