# Task Context for TASK_2025_015

## User Intent

Radical simplification of Angular 3D architecture: Replace complex HybridSceneComponent (892 lines) + 6 services with simple Scene3DComponent (~100 lines) following Angular Three best practices.

## Pain Point

2 days fighting over-engineered DOM-3D hybrid system when only need simple 3D background.

## What to Delete

- HybridSceneComponent
- HybridSceneGraphComponent
- SceneConfigService
- HybridUIService
- Angular3DStateStore
- Element3DDirective
- ContentTexturePipelineService
- AdvancedPerformanceOptimizerService

## What to Keep

- FloatingSphereComponent
- AnimationService
- Float3dDirective (valuable GSAP animations)

## What to Create

- Scene3DComponent (thin NgtCanvas wrapper)
- HeroSceneGraphComponent (lights + primitives)

## What to Update

- hero-section.component.ts

## Goal

- 85% code reduction
- Working scene in 2-3 hours
- Follows anti-backward-compatibility principle

## Technical Context

- Branch: feature/015
- Created: 2025-10-18 22:58:10
- Task Type: REFACTORING
- Priority: P1-High
- Effort Estimate: L (Large - 8-16 hours, but target is 2-3 hours for working scene)
- Complexity: Medium-Complex (architecture simplification with clear requirements)

## Execution Strategy

REFACTORING_FOCUSED: This is a major architectural refactoring that eliminates over-engineering in favor of Angular Three best practices. No new features - pure simplification and direct replacement.
