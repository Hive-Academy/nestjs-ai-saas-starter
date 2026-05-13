# TASK_2025_057: Migrate to @hive-academy/angular-3d & Build Metaball Hero

## User Intent

Delete the entire local `angular-3d` implementation at `apps/dev-brand-ui/src/app/core/angular-3d/`, remove `angular-three` and all related packages (`angular-three-soba`, `angular-three-postprocessing`), and fully migrate to `@hive-academy/angular-3d` (v1.1.0) and `@hive-academy/angular-gsap`. Then build a new hero section using the metaball component.

## Strategy

**Task Type**: FEATURE (with REFACTORING elements)
**Complexity**: XL (70+ files affected)
**Priority**: P1-High

## Scope

### Phase 1: Remove local angular-3d & angular-three packages

- Delete `apps/dev-brand-ui/src/app/core/angular-3d/` directory (57 files)
- Remove `angular-three`, `angular-three-soba`, `angular-three-postprocessing` from package.json
- Remove overrides for angular-three packages
- Remove `registerAngularThreePrimitives()` from main.ts

### Phase 2: Migrate all consumers to @hive-academy/angular-3d

- Update ~19 landing-page files to import from `@hive-academy/angular-3d`
- Update scene graph components (hero, value-propositions, cta)
- Update shared components using angular-3d primitives

### Phase 3: Install & configure @hive-academy/angular-gsap

- Install package
- Migrate GSAP-based directives/animations to use library versions

### Phase 4: Build new metaball hero section

- Create hero section using MetaballCursorComponent from @hive-academy/angular-3d
- Design compelling visual with the metaball effect

## Key Risk

- Breaking existing landing page 3D scenes
- Component API differences between local and library versions
