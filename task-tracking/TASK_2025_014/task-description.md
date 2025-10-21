# Requirements Document - TASK_2025_014 (CORRECTED)

## Introduction

### Business Context

Following architectural analysis in task-tracking/architectural-refactor-plan.md, we discovered that 90% of Angular Three's reactive primitives (ngt-mesh, ngt-sphere-geometry, ngt-mesh-standard-material) are NOT being used. Instead, developers are writing manual THREE.js imperative code, missing Angular Three's declarative template-based approach entirely.

This creates:

- Verbose, imperative TypeScript code instead of clean declarative templates
- Lost benefits of Angular's reactive signal system
- Missed integration with Angular Three's built-in animation and optimization features
- Code that doesn't follow Angular component composition patterns

### Value Proposition

This task delivers declarative Angular components and directives that:

- Enable template-based 3D scene creation (HTML templates, not TypeScript factories)
- Leverage Angular Three's reactive primitives (ngt-mesh, ngt-sphere-geometry, etc.)
- Provide reusable 3D components (FloatingSphereComponent, BackgroundCubeComponent)
- Integrate existing services INTERNALLY (AnimationService, AdvancedPerformanceOptimizerService)
- Allow component composition for building complex scenes

### Project Overview

Build Angular components/directives that wrap Angular Three primitives, enabling developers to create impressive 3D scenes using declarative templates rather than imperative service calls.

**KEY INSIGHT**: Users write Angular templates, NOT TypeScript service calls.

---

## Requirements

### Requirement 1: Declarative 3D Component Library

**User Story:** As a frontend developer using the Angular 3D system, I want Angular components that wrap Angular Three primitives (ngt-mesh, ngt-sphere-geometry, etc.), so that I can build 3D scenes declaratively using Angular templates rather than writing manual THREE.js code.

#### Acceptance Criteria

1. WHEN FloatingSphereComponent is created THEN it SHALL:
   - Use `<ngt-mesh>` Angular Three primitive in its template
   - Use `<ngt-sphere-geometry>` Angular Three primitive for geometry
   - Use `<ngt-mesh-physical-material>` Angular Three primitive for materials
   - Accept @Input() properties: position, radius, color, metalness, roughness
   - Internally integrate AnimationService for floating animation
   - Return managed object reference via @Output() for lifecycle tracking
2. WHEN BackgroundCubeComponent is created THEN it SHALL:
   - Use `<ngt-mesh>` with `<ngt-box-geometry>` Angular Three primitives
   - Use `<ngt-mesh-lambert-material>` for simple material rendering
   - Accept @Input() properties: position, size, color, rotation
   - Internally integrate AnimationService for rotation animation
   - Internally register with AdvancedPerformanceOptimizerService
3. WHEN CylinderComponent is created THEN it SHALL:
   - Use `<ngt-mesh>` with `<ngt-cylinder-geometry>` Angular Three primitives
   - Accept @Input() properties for cylinder configuration
   - Support reusable composition patterns
4. WHEN TorusComponent is created THEN it SHALL:
   - Use `<ngt-mesh>` with `<ngt-torus-geometry>` Angular Three primitives
   - Accept @Input() properties for torus configuration
   - Support reusable composition patterns
5. WHEN any component is used in a template THEN developers SHALL NOT need to:
   - Write manual THREE.js object instantiation code
   - Call service methods directly for animations
   - Manually register objects with performance optimizer
   - Handle THREE.js lifecycle manually

**Example of CORRECT Usage:**

```typescript
@Component({
  template: `
    <app-hybrid-scene>
      <app-floating-sphere
        [position]="[0, 1, 0]"
        [radius]="1"
        [color]="0xff0000"
        float3d
        performance3d
      />

      <app-background-cube
        *ngFor="let cube of cubes"
        [position]="cube.position"
        [size]="cube.size"
      />
    </app-hybrid-scene>
  `,
})
export class HeroSection3dComponent {}
```

### Requirement 2: Declarative 3D Behavior Directives

**User Story:** As a frontend developer, I want Angular directives that add 3D behaviors to components, so that I can compose features declaratively in templates rather than calling services in TypeScript.

#### Acceptance Criteria

1. WHEN float3d directive is created THEN it SHALL:
   - Be applicable to any 3D component (FloatingSphereComponent, BackgroundCubeComponent, etc.)
   - Internally use AnimationService to create floating animation timeline
   - Accept @Input() properties: floatSpeed, floatHeight, floatDelay
   - Automatically cleanup animations on directive destroy
   - Use signal-based reactive updates
2. WHEN performance3d directive is created THEN it SHALL:
   - Be applicable to any mesh-based component
   - Internally register object with AdvancedPerformanceOptimizerService.registerObjectForCulling()
   - Automatically enable LOD when performance health score drops
   - Automatically unregister on directive destroy
   - No configuration required from user (automatic)
3. WHEN glow3d directive is created THEN it SHALL:
   - Add glow effect using BackSide sphere geometry technique
   - Accept @Input() properties: glowColor, glowIntensity, glowScale
   - Internally create glow mesh using Angular Three primitives
   - Automatically cleanup glow mesh on directive destroy
4. WHEN directives are applied THEN user code SHALL:
   - Apply directives in template declaratively
   - NOT call services directly
   - Compose multiple directives on single component
   - Benefit from automatic lifecycle management

**Example of CORRECT Usage:**

```html
<app-floating-sphere
  [position]="[0, 1, 0]"
  [radius]="1"
  [color]="0xff0000"
  float3d
  performance3d
  glow3d
  [glowColor]="0xff3333"
/>
```

### Requirement 3: Angular Three Primitive Integration

**User Story:** As a component developer, I want my 3D components to use Angular Three reactive primitives internally, so that I get signal-based reactivity, built-in optimizations, and Angular component patterns.

#### Acceptance Criteria

1. WHEN FloatingSphereComponent template is examined THEN it SHALL contain:
   ```html
   <ngt-mesh [position]="position()">
     <ngt-sphere-geometry [args]="[radius(), 32, 32]" />
     <ngt-mesh-physical-material
       [color]="color()"
       [metalness]="metalness()"
       [roughness]="roughness()"
     />
   </ngt-mesh>
   ```
2. WHEN component @Input() properties change THEN Angular signals SHALL:
   - Automatically trigger Angular Three primitive updates
   - Update geometry/material reactively
   - No manual THREE.js property assignment needed
3. WHEN components use Angular Three primitives THEN they SHALL:
   - Leverage Angular Three's built-in performance optimizations
   - Benefit from Angular Three's reactive scene graph
   - Support Angular's change detection natively
   - No manual requestAnimationFrame loops in component code

### Requirement 4: Service Integration (INTERNAL ONLY)

**User Story:** As a component/directive developer, I want my 3D components and directives to internally integrate specialized services, so that users get professional animations and automatic performance optimization without configuration.

#### Acceptance Criteria

1. WHEN FloatingSphereComponent implements floating animation THEN it SHALL:
   - Inject AnimationService privately
   - Create GSAP timeline using AnimationService.createTimeline() in ngAfterViewInit
   - Store timeline ID for cleanup
   - Stop timeline in ngOnDestroy
   - Users SHALL NOT see AnimationService in their code
2. WHEN performance3d directive is applied THEN it SHALL:
   - Inject AdvancedPerformanceOptimizerService privately
   - Register target mesh with registerObjectForCulling()
   - Enable LOD automatically based on performance health score
   - Unregister in directive destroy
   - Users SHALL NOT call AdvancedPerformanceOptimizerService directly
3. WHEN glow3d directive creates glow effect THEN it SHALL:
   - Query ContentTexturePipelineService.qualitySettings() for glow complexity
   - Adjust glow segments based on performance
   - Use high-quality glow if performanceHealthScore > 60, else low-quality
4. WHEN any component/directive uses services THEN:
   - Services SHALL be private injected (not public API)
   - Users interact with components/directives only
   - Service integration is implementation detail

### Requirement 5: Hero Section Declarative Implementation

**User Story:** As a frontend developer, I want a hero section component that demonstrates declarative 3D scene creation, so that I can see how to build impressive 3D scenes using component composition rather than service calls.

#### Acceptance Criteria

1. WHEN hero-section-ng-3d component template is examined THEN it SHALL:

   ```html
   <app-hybrid-scene
     [backgroundColor]="'#1a0a2e'"
     [cameraPosition]="[0, 0, 15]"
     [enableAnimation]="true"
   >
     <!-- Floating spheres using declarative components -->
     <app-floating-sphere
       *ngFor="let sphere of spheres"
       [position]="sphere.position"
       [radius]="sphere.radius"
       [color]="sphere.color"
       float3d
       performance3d
       glow3d
     />

     <!-- Background cubes -->
     <app-background-cube
       *ngFor="let cube of cubes"
       [position]="cube.position"
       [size]="cube.size"
       performance3d
     />

     <!-- 2D/3D Hybrid content -->
     <div class="absolute inset-0 flex flex-col items-center justify-center z-20">
       <h1 element3d [priority]="'HERO'" [depth]="-2">Enterprise AI SaaS Starter</h1>
     </div>
   </app-hybrid-scene>
   ```

2. WHEN component TypeScript is examined THEN it SHALL:
   - Define sphere/cube configuration arrays (position, color, etc.)
   - NO service calls for creating objects
   - NO manual THREE.js code
   - Simple data-driven approach
3. WHEN hero section is rendered THEN it SHALL:
   - Visually match reference screenshot
   - Show 5 floating metallic spheres with glow
   - Show 20 background animated cubes
   - Maintain 60 FPS
   - Have zero console errors
4. WHEN browser developer tools are opened THEN:
   - Zero errors related to scene creation
   - Smooth animations via AnimationService (internally)
   - Performance optimization active (internally)

### Requirement 6: SceneObjectService Role (INTERNAL HELPER - NOT PRIMARY API)

**User Story:** As a component developer, I MAY optionally use SceneObjectService as an internal helper for complex object creation, but it SHALL NOT be the primary user-facing API.

#### Acceptance Criteria

1. WHEN SceneObjectService is created THEN it SHALL:
   - Be marked as internal implementation detail in JSDoc
   - Provide factory methods for components that need complex setup
   - Integrate AnimationService, AdvancedPerformanceOptimizerService internally
   - Be used BY components, NOT by end users
2. WHEN components use SceneObjectService THEN:
   - Service is private implementation detail
   - Users interact with component APIs only
   - Service is optional (components can use Angular Three primitives directly)
3. WHEN documentation is written THEN:
   - PRIMARY API: Angular components/directives (FloatingSphereComponent, etc.)
   - INTERNAL HELPER: SceneObjectService (optional, for component developers)
   - WRONG: Direct SceneObjectService usage in user code

---

## Non-Functional Requirements

### Performance Requirements

- **Animation Frame Rate**: Maintain 60 FPS (16.67ms frame time) with declarative component composition
- **Component Initialization**: Each 3D component SHALL initialize within 50ms
- **Signal Reactivity**: @Input() changes SHALL propagate to Angular Three primitives within 1 frame
- **Memory Usage**: Component-based scene creation SHALL NOT exceed 50MB memory allocation
- **LOD Switching**: Automatic via performance3d directive, seamless transitions

### Code Quality Requirements

- **Type Safety**: Zero usage of 'any' type
- **Template-First**: Declarative templates preferred over imperative code
- **Component Composition**: Support multiple directives per component
- **Signal-Based**: Use Angular signals for reactive properties
- **Lifecycle Management**: Automatic cleanup in ngOnDestroy
- **Import Paths**: Use @hive-academy/\* aliases exclusively

### Scalability Requirements

- **Component Capacity**: Support up to 100 declarative 3D components in scene
- **Directive Composition**: Support up to 5 directives per component
- **Performance Adaptation**: performance3d directive SHALL auto-reduce quality at <45 FPS

### Reliability Requirements

- **Zero Memory Leaks**: Components/directives SHALL cleanup all resources
- **Animation Cleanup**: Directives SHALL stop all GSAP timelines on destroy
- **Error Recovery**: Component failure SHALL NOT crash entire scene
- **State Consistency**: Angular signals SHALL always reflect actual state

### Maintainability Requirements

- **Declarative Over Imperative**: Templates > TypeScript service calls
- **Component Composition**: Small, reusable components
- **Separation of Concerns**: Components handle rendering, directives handle behaviors
- **Testability**: All components/directives support unit testing

---

## Technical Constraints

### Technology Stack

- **Framework**: Angular 20.1.6 with standalone components
- **3D Library**: Three.js + Angular Three reactive primitives
- **Animation**: GSAP (internal integration via AnimationService)
- **Reactive Patterns**: Angular signals, computed properties, effects
- **Template Approach**: Declarative template-first architecture

### Integration Points

- **Angular Three Primitives**: ngt-mesh, ngt-sphere-geometry, ngt-mesh-standard-material, ngt-box-geometry, ngt-cylinder-geometry, ngt-torus-geometry
- **AngularThreeFoundationService**: Scene/camera/renderer access
- **AnimationService**: Internal integration for animations (not exposed to users)
- **AdvancedPerformanceOptimizerService**: Internal integration via performance3d directive
- **ContentTexturePipelineService**: Internal quality optimization

### Architectural Constraints

- **ANTI-BACKWARD COMPATIBILITY**: Direct replacement only, NO versioned implementations
- **DECLARATIVE FIRST**: Templates > Service calls > Manual THREE.js
- **COMPONENT COMPOSITION**: Build scenes by composing components, not calling factories
- **INTERNAL SERVICE INTEGRATION**: Services used internally, not exposed to users

---

## Dependencies and Assumptions

### Dependencies

- **Prerequisite**: TASK_2025_013 (Angular 3D folder refactoring) completed
- **External Libraries**: Three.js, GSAP, angular-three package installed
- **Services**: AnimationService, AdvancedPerformanceOptimizerService available for internal integration
- **Angular Three**: Reactive primitives available and functional

### Assumptions

- Angular Three primitives (ngt-mesh, ngt-sphere-geometry, etc.) work correctly
- AnimationService.createTimeline() can integrate with component lifecycle
- AdvancedPerformanceOptimizerService accepts THREE.Object3D from Angular Three
- Developers prefer declarative templates over imperative TypeScript
- Reference screenshot achievable with declarative approach

---

## Risk Analysis

### Technical Risks

#### Risk 1: Angular Three Primitive Learning Curve

- **Probability**: Medium
- **Impact**: Medium
- **Description**: Developers may not be familiar with Angular Three declarative primitives
- **Mitigation**:
  - Create comprehensive component examples (FloatingSphereComponent, etc.)
  - Document template patterns clearly
  - Provide migration guide from imperative to declarative
  - Show before/after code comparisons
- **Contingency**: Provide both declarative components AND optional imperative helpers

#### Risk 2: Service Integration in Component Lifecycle

- **Probability**: Medium
- **Impact**: High
- **Description**: Integrating AnimationService/AdvancedPerformanceOptimizerService in component/directive lifecycle may be complex
- **Mitigation**:
  - Use ngAfterViewInit for accessing Angular Three mesh references
  - Use DestroyRef for automatic cleanup
  - Test lifecycle hooks thoroughly
  - Review existing AnimationService usage patterns
- **Contingency**: Simplify animations initially, enhance in future iterations

#### Risk 3: Directive Composition Conflicts

- **Probability**: Low
- **Impact**: Medium
- **Description**: Multiple directives on same component may conflict (float3d + performance3d)
- **Mitigation**:
  - Design directives to be orthogonal (separate concerns)
  - Test common directive combinations
  - Document supported combinations
  - Use unique selector prefixes
- **Contingency**: Provide combined directives for common use cases

### Business Risks

#### Risk 1: Paradigm Shift for Developers

- **Probability**: Medium
- **Impact**: Medium
- **Description**: Developers accustomed to imperative service calls may resist declarative templates
- **Mitigation**:
  - Show clear benefits (less code, more readable, reactive)
  - Provide migration path with examples
  - Create video tutorials
  - Document in CLAUDE.md
- **Contingency**: Support both approaches temporarily with deprecation warnings

#### Risk 2: Visual Quality Not Matching Reference

- **Probability**: Low
- **Impact**: Medium
- **Description**: Declarative components may not achieve screenshot visual quality
- **Mitigation**:
  - Replicate material properties from screenshot analysis
  - Iterate on lighting configuration
  - Test on multiple devices
  - Gather design feedback
- **Contingency**: Accept minor differences, document for future enhancement

---

## Risk Matrix

| Risk                            | Probability | Impact | Score | Mitigation Strategy                          |
| ------------------------------- | ----------- | ------ | ----- | -------------------------------------------- |
| Angular Three Learning Curve    | Medium      | Medium | 4     | Comprehensive examples + documentation       |
| Service Integration Lifecycle   | Medium      | High   | 6     | Careful lifecycle testing + DestroyRef       |
| Directive Composition Conflicts | Low         | Medium | 3     | Orthogonal design + combination testing      |
| Developer Paradigm Shift        | Medium      | Medium | 4     | Migration path + clear benefit communication |
| Visual Quality Mismatch         | Low         | Medium | 3     | Iterative refinement + design feedback       |

---

## Implementation Phases

### Phase 1: Core Declarative Components (3-4 hours)

**Objectives:**

- Create FloatingSphereComponent using Angular Three primitives
- Create BackgroundCubeComponent using Angular Three primitives
- Create CylinderComponent using Angular Three primitives
- Create TorusComponent using Angular Three primitives
- Implement signal-based @Input() properties
- Integrate AnimationService internally

**Deliverables:**

- apps/dev-brand-ui/src/app/core/angular-3d/components/primitives/floating-sphere.component.ts
- apps/dev-brand-ui/src/app/core/angular-3d/components/primitives/background-cube.component.ts
- apps/dev-brand-ui/src/app/core/angular-3d/components/primitives/cylinder.component.ts
- apps/dev-brand-ui/src/app/core/angular-3d/components/primitives/torus.component.ts
- Unit tests for each component

**Success Criteria:**

- Components render using Angular Three primitives
- @Input() changes trigger reactive updates
- AnimationService integrated internally
- Zero manual THREE.js instantiation in component code

### Phase 2: Declarative Behavior Directives (2-3 hours)

**Objectives:**

- Create float3d directive with AnimationService integration
- Create performance3d directive with AdvancedPerformanceOptimizerService integration
- Create glow3d directive with material enhancement
- Implement directive composition support
- Test lifecycle cleanup

**Deliverables:**

- apps/dev-brand-ui/src/app/core/angular-3d/directives/float-3d.directive.ts
- apps/dev-brand-ui/src/app/core/angular-3d/directives/performance-3d.directive.ts
- apps/dev-brand-ui/src/app/core/angular-3d/directives/glow-3d.directive.ts
- Unit tests for each directive

**Success Criteria:**

- Directives applicable to components declaratively
- Multiple directives composable on single component
- Services integrated internally (not exposed)
- Automatic cleanup verified

### Phase 3: Hero Section Declarative Implementation (2-3 hours)

**Objectives:**

- Create hero-section-ng-3d component with declarative template
- Use FloatingSphereComponent + BackgroundCubeComponent
- Apply float3d, performance3d, glow3d directives
- Implement data-driven configuration arrays
- Verify visual quality matches screenshot

**Deliverables:**

- hero-section-ng-3d.component.ts with declarative template
- Configuration arrays for spheres/cubes
- Integration with hybrid-scene wrapper
- Visual quality refinement

**Success Criteria:**

- Template-based scene creation (minimal TypeScript)
- Visual quality matches reference screenshot
- 60 FPS maintained
- Zero console errors

### Phase 4: Optional SceneObjectService (1-2 hours)

**Objectives:**

- Create SceneObjectService as INTERNAL helper (not primary API)
- Provide factory methods for complex object creation
- Document as internal implementation detail
- Integrate with AnimationService, AdvancedPerformanceOptimizerService

**Deliverables:**

- scene-object.service.ts (marked as internal)
- JSDoc clearly stating this is NOT user-facing API
- Factory methods for components that need complex setup

**Success Criteria:**

- Service marked as internal helper
- Used BY components, not by end users
- Documentation clarifies component API is primary

### Phase 5: Configuration and Documentation (1-2 hours)

**Objectives:**

- Update angular-3d/index.ts to export components/directives
- Update CLAUDE.md with declarative patterns
- Create migration guide from imperative to declarative
- Document component composition patterns

**Deliverables:**

- Updated angular-3d/index.ts with component/directive exports
- Updated CLAUDE.md with declarative examples
- Migration guide document
- Component composition pattern documentation

**Success Criteria:**

- All components/directives exported correctly
- Documentation shows declarative approach first
- Migration path clear for existing users
- Examples demonstrate template-first philosophy

---

## Stakeholder Analysis

### Primary Stakeholders

#### Frontend Developers

- **Needs**: Simple, declarative template API for building 3D scenes
- **Pain Points**: Manual THREE.js code is complex, imperative, not Angular-like
- **Success Criteria**: Create hero section with template-based components
- **Impact Level**: High - Primary users of declarative components
- **Involvement**: Implementation feedback, API usability testing

#### Angular 3D Architecture Team

- **Needs**: Components that leverage Angular Three primitives correctly
- **Pain Points**: Current code doesn't use Angular Three's reactive capabilities
- **Success Criteria**: 90% Angular Three primitive utilization achieved
- **Impact Level**: High - Responsible for Angular 3D architecture
- **Involvement**: Code review, architectural validation

### Secondary Stakeholders

#### Performance Engineering Team

- **Needs**: Automatic performance optimization via directives
- **Pain Points**: Manual optimization requires deep knowledge
- **Success Criteria**: performance3d directive works automatically
- **Impact Level**: Medium - Concerned with runtime performance
- **Involvement**: Performance profiling, optimization validation

#### QA/Testing Team

- **Needs**: Testable components with clear contracts
- **Pain Points**: Complex 3D code is difficult to test
- **Success Criteria**: 80%+ test coverage, component isolation works
- **Impact Level**: Medium - Responsible for quality assurance
- **Involvement**: Test plan review, component testing

#### Product/Design Team

- **Needs**: Visually impressive 3D scenes matching design specs
- **Pain Points**: Inconsistent implementation quality
- **Success Criteria**: Hero section matches reference screenshot
- **Impact Level**: Medium - Concerned with visual quality
- **Involvement**: Visual quality review, design approval

---

## Stakeholder Impact Matrix

| Stakeholder         | Impact Level | Involvement   | Success Criteria                        |
| ------------------- | ------------ | ------------- | --------------------------------------- |
| Frontend Developers | High         | Daily Usage   | Template-based scene creation           |
| Architecture Team   | High         | Code Review   | 90% Angular Three primitive utilization |
| Performance Team    | Medium       | Profiling     | Automatic optimization via directives   |
| QA Team             | Medium       | Testing       | 80% coverage, component testability     |
| Design Team         | Medium       | Visual Review | Matches reference screenshot            |

---

## Success Metrics

### Quantitative Metrics

1. **Angular Three Utilization**: Increase from 10% to 90% (ngt-mesh, ngt-sphere-geometry, etc.)
2. **Code Reduction**: Hero section with <30 lines of template code
3. **Component Reusability**: FloatingSphereComponent usable in 5+ different scenes
4. **Performance**: Maintain 60 FPS with declarative component composition
5. **Test Coverage**: Achieve 80%+ coverage for components/directives

### Qualitative Metrics

1. **Declarative API**: Templates preferred over TypeScript service calls
2. **Visual Quality**: Hero section matches reference screenshot
3. **Developer Experience**: Positive feedback on declarative component API
4. **Code Maintainability**: Components follow Single Responsibility Principle
5. **Zero Defects**: No console errors, no memory leaks, no visual glitches

---

## Acceptance Testing Scenarios

### Scenario 1: Create Hero Section with Declarative Components

```typescript
Feature: Declarative Hero Section Creation
  As a frontend developer
  I want to create a hero section using declarative components
  So that I can build impressive 3D scenes with clean template code

  Scenario: Create hero section with floating spheres
    Given I have imported FloatingSphereComponent in my component
    When I use <app-floating-sphere> in my template
    Then I should see floating metallic spheres in the scene
    And I should NOT need to write any THREE.js code
    And I should NOT need to call any service methods
    And spheres should animate automatically
```

### Scenario 2: Compose Multiple Directives on Component

```typescript
Feature: Directive Composition
  As a frontend developer
  I want to apply multiple directives to a component
  So that I can compose behaviors declaratively

  Scenario: Apply float3d, performance3d, and glow3d directives
    Given I have a FloatingSphereComponent in my template
    When I apply float3d, performance3d, and glow3d directives
    Then the sphere SHALL float via AnimationService
    And the sphere SHALL be registered with performance optimizer
    And the sphere SHALL have glow effect
    And I should NOT write any TypeScript for these behaviors
```

### Scenario 3: Angular Three Reactive Updates

```typescript
Feature: Signal-Based Reactivity
  As a frontend developer
  I want component @Input() changes to update reactively
  So that I can use Angular's reactive patterns

  Scenario: Change sphere color dynamically
    Given I have FloatingSphereComponent with [color]="myColor"
    When I change myColor signal value
    Then Angular Three SHALL update the material color reactively
    And I should NOT need to manually update THREE.js properties
    And update should occur within 1 frame
```

---

## Quality Gates

Before delegation to software-architect, verify:

- [x] All requirements follow SMART criteria
- [x] Acceptance criteria in proper WHEN/THEN/SHALL format
- [x] Stakeholder analysis complete
- [x] Risk assessment with mitigation strategies
- [x] Success metrics defined
- [x] Dependencies identified
- [x] Non-functional requirements specified
- [x] No backward compatibility planning
- [x] **CRITICAL**: Declarative template approach clearly prioritized over imperative service calls

---

## Scope Boundaries

### In Scope

- FloatingSphereComponent using Angular Three primitives
- BackgroundCubeComponent using Angular Three primitives
- CylinderComponent, TorusComponent using Angular Three primitives
- float3d, performance3d, glow3d directives
- Hero section component with declarative template
- Internal service integration (AnimationService, AdvancedPerformanceOptimizerService)
- SceneObjectService as OPTIONAL internal helper (NOT primary API)

### Out of Scope (Explicitly NOT Included)

- ❌ Imperative TypeScript API for users (createSphere(), createCube() methods)
- ❌ Service-based scene creation as primary API
- ❌ Manual THREE.js code in user templates
- ❌ Public SceneObjectService as primary user-facing API
- Additional geometry types beyond sphere, cube, cylinder, torus - deferred to future
- Physics integration - separate feature
- Advanced shader materials - advanced features phase

---

## References

### Documentation

- [Angular Style Guide](https://angular.dev/style-guide)
- [Angular Three Documentation](https://angular-three.netlify.app/)
- [Three.js Documentation](https://threejs.org/docs/)
- [GSAP Documentation](https://greensock.com/docs/)

### Related Tasks

- TASK_2025_012: Angular 3D Hero Redesign (completed)
- TASK_2025_013: Angular 3D Folder Refactoring (completed)

### Visual Reference

- task-tracking/TASK_2025_012/screencapture-localhost-4200-landing-hero-2025-09-15-19_15_48.png

### Architectural Documentation

- task-tracking/architectural-refactor-plan.md (Phase 2.2 - lines 60-90 critical findings)
- CLAUDE.md (project-level guidelines)

---

**Document Status**: CORRECTED - Ready for Software Architect
**Created**: 2025-10-17
**Corrected**: 2025-10-17
**Task ID**: TASK_2025_014
**Priority**: P1-High
**Effort Estimate**: L (Large - 10-14 hours total)

---

## CRITICAL CORRECTION SUMMARY

**Previous Misunderstanding:**

- Focused on SceneObjectService factory pattern (createSphere, createCube)
- Imperative TypeScript API as primary approach
- Service-based scene creation

**Correct Understanding:**

- Focus on Angular components/directives (FloatingSphereComponent, BackgroundCubeComponent)
- Declarative template API as primary approach
- Component-based scene composition
- SceneObjectService is OPTIONAL internal helper, NOT primary API

**Key Architectural Insight:**
User code should look like Angular templates, NOT service factory calls:

```html
<!-- ✅ CORRECT: Declarative template approach -->
<app-floating-sphere [position]="[0, 1, 0]" [color]="0xff0000" float3d />

<!-- ❌ WRONG: Imperative service approach -->
<!-- this.sceneObjectService.createSphere({ position: [0, 1, 0] }) -->
```
