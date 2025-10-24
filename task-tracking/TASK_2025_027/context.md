# Task Context for TASK_2025_027

## User Intent

Refactor the space hero scene (hero-space-scene.component.ts) to match a reference screenshot exactly. This is a visual redesign focused on achieving a specific moon-centric aesthetic.

**Reference Screenshot**: c:/Users/abdal/OneDrive/Pictures/Screenshots/Screenshot 2025-10-24 164247.png

### Visual Requirements (from reference)

1. **Single HUGE central planet** - Takes approximately 40% of viewport, radius 80-100, positioned center screen behind hero text
2. **Planet appearance** - Moon-like surface with white/gray texture, highly detailed with craters/surface features
3. **Atmosphere glow** - Strong white/gray fog effect around planet (CRITICAL - needs angular-three fog research)
4. **Background** - Pure black (#000000), NOT gradient
5. **Stars** - Clearly visible white point stars scattered across black space
6. **Nebula** - Gray/white cloudy atmospheric patches on left/right sides (not purple/colored)
7. **Lighting** - Strong directional light creating bright highlights on planet surface
8. **Composition** - Remove the small secondary planet, only one central planet

### Current Issues

- Stars are invisible/not rendering as visible points
- Planets are too small and hidden
- Background is gradient instead of pure black
- No fog/atmosphere glow effect (CRITICAL MISSING FEATURE)
- Wrong colors (should be white/gray/black, not colored themes)

### Technical Context

- **Current File**: apps/dev-brand-ui/src/app/features/landing-page/sections/scene-graphs/hero-space-scene.component.ts
- **Framework**: Angular Three (angular-three library)
- **Components Used**: PlanetComponent, StarFieldComponent, NebulaComponent, SpaceBackgroundComponent
- **Theme System**: SpaceThemeStore (currently providing colored themes, needs white/gray/black override)

### Critical Research Needed

**Angular Three fog implementation** for atmospheric glow around planets - this is the most important visual feature missing from current implementation.

Likely candidates:

- `<ngt-fog>` component for linear fog
- `<ngt-fog-exp2>` component for exponential fog (better for atmospheric effects)

## Conversation Summary

User provided detailed analysis of reference screenshot showing:

- Moon-like planet dominating center screen
- Strong atmospheric glow (white/gray fog)
- Pure black background with visible white stars
- Gray/white nebula clouds
- No secondary planets
- Strong directional lighting for surface detail

## Technical Context

- **Branch**: feature/027
- **Created**: 2025-10-24
- **Task Type**: REFACTORING + RESEARCH
- **Priority**: P1-High (visual bug - scene doesn't match intended design)
- **Effort Estimate**: Medium (4-6 hours)
  - Research: 1 hour (Angular Three fog API)
  - Architecture: 1 hour (redesign scene composition)
  - Implementation: 2-3 hours (refactor component, test visual output)
  - Testing: 1 hour (verify against reference screenshot)

## Execution Strategy

**REFACTORING with RESEARCH** - Modified strategy due to critical research component:

1. **Phase 1**: researcher-expert (Angular Three fog/atmosphere implementation)
2. **Phase 2**: software-architect (scene redesign to match reference)
3. **Phase 3**: team-leader MODE 1 (decompose into atomic tasks)
4. **Phase 4**: team-leader MODE 2 (iterative assignment + verification)
5. **Phase 5**: team-leader MODE 3 (final verification)
6. **Phase 6**: USER CHOOSES QA (tester/reviewer/both/skip)
7. **Phase 7**: modernization-detector (future enhancements)

**Rationale**: Research phase critical because fog/atmosphere implementation is the most important missing feature and requires understanding Angular Three's fog API before architecture phase.
