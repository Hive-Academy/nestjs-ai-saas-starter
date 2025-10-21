# Task Context for TASK_2025_014

## User Intent

Build a declarative service layer architecture for Angular 3D that provides ready-made directives and components for users to create impressive 3D sections like the hero section screenshot.

## Problem Statement

Based on the architectural refactor plan (task-tracking/architectural-refactor-plan.md), we have identified critical gaps:

- 90% of specialized services are unused (AnimationService, AdvancedPerformanceOptimizerService)
- Manual THREE.js code is duplicated across components
- Angular-Three package is underutilized (~10% usage)
- No service layer exists for 3D object creation
- Scene object creation logic is misplaced in HybridUIService (violates Single Responsibility Principle)

## Desired Outcome

Users should be able to build impressive 3D sections declaratively using:

1. **SceneObjectService** - Factory service for creating managed 3D objects (spheres, cubes, particles, lights)
2. **Full Service Integration** - All specialized services working together (AnimationService, AdvancedPerformanceOptimizerService, ContentTexturePipelineService)
3. **Declarative Components** - Easy-to-use Angular components and directives
4. **Automatic Optimization** - LOD, culling, texture quality management without manual configuration
5. **Professional Animations** - GSAP-powered animations via AnimationService (no manual loops)

## Visual Reference

See task-tracking/TASK_2025_012/screencapture-localhost-4200-landing-hero-2025-09-15-19_15_48.png for the target visual quality.

The screenshot shows:

- Floating metallic spheres with glow effects
- Background animated cubes
- Particle systems
- Professional lighting
- Smooth animations

All of this should be achievable with simple declarative API calls.

## Technical Context

- **Branch**: feature/014
- **Created**: 2025-10-17
- **Task Type**: FEATURE (New service layer + declarative API)
- **Priority**: P1-High
- **Effort Estimate**: L (Large - comprehensive service layer implementation)

## Related Documentation

- **Architectural Plan**: task-tracking/architectural-refactor-plan.md
- **Previous Task**: TASK_2025_013 (Angular 3D folder refactoring)
- **Hero Section Screenshot**: task-tracking/TASK_2025_012/screencapture-localhost-4200-landing-hero-2025-09-15-19_15_48.png

## Key Requirements

### Must Implement

1. **SceneObjectService** with factory methods:

   - createFloatingSpheres()
   - createBackgroundCubes()
   - createParticleSystem()
   - createLights()
   - Lifecycle management (removeObject, disposeAll)

2. **Service Integration**:

   - Use AnimationService for all animations (no manual render loops)
   - Register objects with AdvancedPerformanceOptimizerService for LOD/culling
   - Use ContentTexturePipelineService for texture quality management
   - Use AngularThreeFoundationService for scene access

3. **Refactor HybridUIService**:

   - REMOVE createSceneObjects() method (300+ lines)
   - REMOVE setupSceneObjectAnimations() method
   - Keep only hybrid 2D/3D element functionality

4. **Create Hero Component**:

   - New hero-section-ng-3d component using service layer
   - Declarative scene setup via config
   - Automatic animations and optimization

5. **Update Documentation**:
   - Config builder JSDoc updates
   - Index exports for new services
   - Architecture documentation

## Execution Strategy: FEATURE_COMPREHENSIVE

This is a complex feature requiring full workflow:

1. **Phase 1**: Requirements Analysis (project-manager)
2. **Phase 2**: Technical Research (researcher-expert) - CONDITIONAL if unknowns exist
3. **Phase 3**: Architecture Design (software-architect)
4. **Phase 4**: Implementation (frontend-developer - Angular/TypeScript focus)
5. **Phase 5**: Testing (senior-tester)
6. **Phase 6**: Code Review (code-reviewer)
7. **Phase 7**: Pull Request Creation
8. **Phase 8**: Future Work Consolidation (modernization-detector)

## Success Criteria

### Must Have

- [ ] SceneObjectService created and exported
- [ ] AnimationService integrated (0% usage to 100%)
- [ ] AdvancedPerformanceOptimizerService integrated (0% usage to 100%)
- [ ] createSceneObjects removed from HybridUIService
- [ ] Hero section uses service layer
- [ ] All tests passing
- [ ] No console errors in browser
- [ ] Documentation updated

### Should Have

- [ ] FPS improvement from LOD/culling
- [ ] Memory stable (no leaks)
- [ ] Animation performance smooth
- [ ] Code duplication eliminated

### Nice to Have

- [ ] Increased angular-three utilization (10% to 40%+)
- [ ] Additional geometry factories
- [ ] Advanced LOD configurations
- [ ] Texture atlas for scene objects

## Validation Gates

Each phase must be validated by business-analyst before proceeding:

- Requirements validation
- Architecture validation (if research phase executed)
- Implementation validation
- Testing validation
- Code review validation
