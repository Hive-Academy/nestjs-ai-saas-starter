# Task Context for TASK_2025_013

## User Intent

Continue TASK_2025_013: Angular 3D Folder Refactoring - Execute the systematic cleanup of parallel implementations in the angular-3d folder.

## Relationship to Previous Work

**Parent Task**: TASK_2025_012 (Angular 3D Hero Redesign)

- During TASK_2025_012, comprehensive documentation analysis revealed ANTI-BACKWARD COMPATIBILITY violations
- CORRECTED_VALIDATION_REPORT.md identified multiple parallel implementations
- This refactoring is a prerequisite for clean hero section implementation

## Task Description

Systematic refactoring to eliminate parallel implementations and consolidate the angular-3d folder structure from 26 files to 18 files, reducing codebase by 32.6% (3,722 lines).

### Key Violations Identified

1. **4 Parallel Directive/Component Implementations** for 3D element rendering
2. **2 Parallel Texture Services** (ContentTextureService vs ContentTexturePipelineService)
3. **2 Parallel State Management Services** (ReactiveStateManager vs Angular3DStateStore)
4. **2 Parallel Scene Components** (HybridThreeSceneComponent vs HybridSceneComponent)

### ANTI-BACKWARD COMPATIBILITY Mandate

- NO version compatibility layers
- NO v1/v2 parallel implementations
- Direct replacement and consolidation only
- Single authoritative implementation per feature

## Technical Context

- **Branch**: feature/012 (continuing from TASK_2025_012)
- **Created**: 2025-10-17 02:25:54
- **Task Type**: REFACTORING
- **Priority**: P0-Critical
- **Effort Estimate**: Medium (4-5 hours)
- **Complexity**: MEDIUM-HIGH (requires careful consolidation and testing)

## Execution Strategy: REFACTORING_FOCUSED

Based on task analysis:

- **Type**: REFACTORING (code improvement, architecture consolidation)
- **Complexity**: MEDIUM-HIGH (4 phases, multiple service consolidations)
- **Research**: NO (clear plan already defined in MASTER_REFACTORING_PLAN.md)

### Planned Agent Sequence

1. **Phase 1**: software-architect (validate refactoring strategy)
2. **Phase 2**: frontend-developer (execute 4-phase refactoring)
3. **Phase 3**: senior-tester (comprehensive testing & validation)
4. **Phase 4**: code-reviewer (final review & quality gate)
5. **Phase 5**: modernization-detector (future work consolidation)

### Skip Agents

- project-manager (requirements already documented)
- researcher-expert (no research needed, plan is defined)
- backend-developer (frontend-only refactoring)

## Existing Deliverables

Already created in task-tracking/TASK_2025_013/:

1. **MASTER_REFACTORING_PLAN.md** - Comprehensive 4-phase execution plan
2. **ANGULAR_3D_FOLDER_AUDIT.md** - Detailed file-by-file analysis
3. **CORRECTED_VALIDATION_REPORT.md** - Validation findings & violations

## 4-Phase Refactoring Plan Summary

### Phase 1: Immediate Deletions (30 min, ZERO RISK)

- Delete 6 unused files (3,228 lines)
- Components: card3d, hybrid-element-3d, geometry-node
- Directives: hybrid3d, animation
- Services: content-texture (after Phase 2.3)

### Phase 2: Service Consolidation (2-3 hours, MEDIUM RISK)

- 2.1: Merge HybridThreeSceneComponent → HybridSceneComponent
- 2.2: Merge ReactiveStateManager → Angular3DStateStore
- 2.3: Update HybridUIService → Use ContentTexturePipelineService

### Phase 3: Public API Cleanup (30 min, LOW RISK)

- Update index.ts exports
- Remove deleted exports
- Clean component/service indices

### Phase 4: Final Validation (1 hour, LOW RISK)

- Build validation (dev + production)
- Test validation (unit + integration)
- Visual validation (dev server)
- Dependency validation (grep checks)
- Create validation report

## Success Criteria

### Technical

- All builds pass (dev + production)
- All tests pass (unit + integration)
- Zero console errors in dev mode
- 60 FPS performance maintained
- No broken imports

### Code Quality

- Single implementation per feature (no parallels)
- Clean dependency graph (no circular deps)
- Proper angular-three integration
- ANTI-BACKWARD COMPATIBILITY compliance
- Documentation updated

### Metrics

- 30%+ code reduction achieved (target: 32.6%)
- 50%+ component reduction achieved (target: 77.8%)
- Bundle size reduced or stable
- Test coverage maintained or improved

## Post-Refactoring Integration

After cleanup, the cleaned angular-3d architecture will be used for hero section implementation:

- Element3DDirective (single source of truth)
- HybridSceneComponent (consolidated scene management)
- ContentTexturePipelineService (authoritative texture service)
- createHeroSceneConfig() (validated config builder)

## References

- MASTER_REFACTORING_PLAN.md - Detailed execution plan
- ANGULAR_3D_FOLDER_AUDIT.md - File analysis
- CORRECTED_VALIDATION_REPORT.md - Validation findings
- CLAUDE.md - ANTI-BACKWARD COMPATIBILITY mandate
