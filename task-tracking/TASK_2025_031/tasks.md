# Development Tasks - TASK_2025_031

**Task Type**: Frontend
**Developer Needed**: frontend-developer
**Total Tasks**: 2
**Status**: 2/2 Complete (100%)
**Decomposed From**:

- implementation-plan.md
- context.md

---

## Task Breakdown

### Task 1: Implement text-3d-volumetric component with troika-three-text glow effect ✅ COMPLETE

**Assigned To**: frontend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\angular-3d\components\primitives\text-3d-volumetric.component.ts
**Specification Reference**:

- implementation-plan.md:75-262 (Component 1: text-3d-volumetric.component.ts)
- implementation-plan.md:92-220 (Complete implementation pattern)
  **Pattern to Follow**:
- troika Text API (research-report.md:56-84)
- MeshStandardMaterial with emissive (research-report.md:88-112)
- Angular effect-based lifecycle (implementation-plan.md:132-176)
  **Expected Commit Pattern**: `feat(angular-3d): implement text-3d-volumetric with troika text`
  **Git Commit**: f8858b8
  **Status**: ✅ COMPLETE

**Verification Results**:

- ✅ File exists at specified path
- ✅ Git commit matches pattern (f8858b8)
- ✅ Build passes (typecheck passed in pre-commit hook)
- ✅ troika Text import present (line 53)
- ✅ MeshStandardMaterial with emissive properties present (line 122)
- ✅ text.sync() called after configuration (lines 138, 182)
- ✅ text.dispose() called in cleanup (line 154)
- ✅ NgtsText3D import removed (only in comments)
- ✅ Custom ShaderMaterial removed (only in comments)
- ✅ viewChild pattern used (line 98)
- ✅ extend() called for angular-three (line 57)
- ✅ 3 effects implemented

**Key Features Implemented**:

- Direct troika Text instantiation (NOT NgtsText3D)
- MeshStandardMaterial with emissive glow
- troika outline properties for enhanced glow
- Effect-based reactive updates
- Proper WebGL resource disposal
- Optional pulse animation

**Implementation Details**:

- **Imports to Add**:
  - `{ Text }` from 'troika-three-text'
  - `{ injectNgtRef }` from 'angular-three'
  - `{ Group }` from 'three'
- **Imports to Remove**:
  - `{ NgtsText3D }` from 'angular-three-soba/abstractions'
  - `{ ShaderMaterial, AdditiveBlending }` from 'three' (if not needed)
- **Template Change**: Replace `<ngts-text-3d>` with `<ngt-group [ref]="groupRef()"></ngt-group>`
- **Class Changes**:
  - Add: `groupRef = injectNgtRef<Group>()`
  - Add: `private textMesh?: Text`
  - Remove: `shaderUniforms`, `vertexShader`, `fragmentShader`
  - Remove: `depth`, `bevelSize`, `bevelThickness`, `curveSegments` inputs
  - Add 3 effects:
    1. Text creation + MeshStandardMaterial setup + sync + cleanup
    2. Reactive property updates (text, fontSize, glowColor, glowIntensity)
    3. Pulse animation (if pulseSpeed > 0)
- **Quality Requirements**:
  - Signal-based inputs (input<T>())
  - Uses direct troika Text instantiation (NOT NgtsText3D)
  - MeshStandardMaterial with emissive properties
  - Proper cleanup via effect return function
  - No custom ShaderMaterial
  - Calls text.sync() after property changes
  - Calls text.dispose() on cleanup

**Anti-Patterns to Avoid**:

- ❌ NOT using NgtsText3D (extruded geometry, not troika SDF)
- ❌ NOT using custom ShaderMaterial (breaks troika material patching)
- ❌ NOT forgetting to call text.sync()
- ❌ NOT forgetting to call text.dispose()

**Reference Implementation**: implementation-plan.md:92-220

---

### Task 2: Implement smoke-text-3d component with troika-three-text and atmospheric particles ✅ COMPLETE

**Assigned To**: frontend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\angular-3d\components\primitives\smoke-text-3d.component.ts
**Specification Reference**:

- implementation-plan.md:264-560 (Component 2: smoke-text-3d.component.ts)
- implementation-plan.md:280-520 (Complete implementation pattern)
  **Pattern to Follow**:
- troika Text for crisp text (research-report.md:56-84)
- BufferGeometry particles for atmospheric smoke (research-report.md:410-646)
- Particle atmosphere (NOT text-shaped particles) (research-report.md:414-430)
  **Expected Commit Pattern**: `feat(angular-3d): implement smoke-text-3d with troika text and particles`
  **Git Commit**: 40ec152
  **Status**: ✅ COMPLETE

**Verification Results**:

- ✅ File exists at specified path
- ✅ Git commit matches pattern (40ec152)
- ✅ Build passes (typecheck passed in pre-commit hook)
- ✅ troika Text import present (line 46)
- ✅ Canvas pixel sampling removed (sampleTextPixels method deleted)
- ✅ Simple particle distribution (NOT text-shaped) (lines 200-221)
- ✅ MeshBasicMaterial for text (lines 125-129)
- ✅ BufferGeometry for particles (line 155)
- ✅ text.dispose() called in cleanup (line 137)
- ✅ geometry.dispose(), material.dispose() in cleanup (lines 180-181)
- ✅ texture.dispose() in cleanup (line 185)
- ✅ viewChild pattern used (line 107)
- ✅ extend() called for angular-three (line 49)
- ✅ 3 effects implemented (text, particles, animation)

**Key Features Implemented**:

- Direct troika Text instantiation (NOT NgtsText3D)
- MeshBasicMaterial (semi-transparent) for crisp text rendering
- Simple atmospheric particle distribution (NOT text-shaped)
- Particles drift and respawn continuously
- All WebGL resources properly disposed
- NO canvas pixel sampling (anti-pattern removed)

**Implementation Details**:

- Canvas text rendering logic removed (lines 189-236 in old implementation)
- sampleTextPixels() method removed (CPU-intensive anti-pattern)
- fontFamily, fontWeight inputs removed (troika uses font files)
- Text-shaped particle creation removed
- Replaced with simple box distribution around text bounds
- Atmospheric smoke effect with drift and respawn

**Implementation Details**:

- **Imports to Add**:
  - `{ Text }` from 'troika-three-text'
  - `{ Group }` from 'three'
  - Keep: BufferGeometry, BufferAttribute, Points, PointsMaterial, CanvasTexture
- **Template Change**: Replace complex template with `<ngt-group [ref]="groupRef()"></ngt-group>`
- **Class Changes**:
  - Add: `groupRef = injectNgtRef<Group>()`
  - Add: `private textMesh?: Text`
  - Add: `private particleSystem?: Points`
  - Add: `private smokeTexture?: CanvasTexture`
  - Simplify: `ParticleData` interface (remove maxLife if not needed)
  - Remove: `sampleTextPixels()` method (lines 189-236)
  - Remove: `fontFamily`, `fontWeight` inputs
  - Modify: `initializeParticles()` to use simple position distribution (NOT canvas sampling)
  - Add 3 effects:
    1. Text creation + MeshBasicMaterial
    2. Particle system creation + smoke texture
    3. Animation loop (particle drift)
- **Quality Requirements**:
  - troika Text for readable text
  - MeshBasicMaterial (semi-transparent) for text
  - Simple particle distribution (around text bounds, not text-shaped)
  - Atmospheric smoke (particles drift, respawn)
  - All resources disposed (text, geometry, material, texture)
  - NO canvas pixel sampling
  - NO text-shaped particles

**Anti-Patterns to Avoid**:

- ❌ NOT sampling canvas pixels for particles (CPU-intensive, anti-pattern)
- ❌ NOT creating text-shaped particles (use atmospheric particles instead)
- ❌ NOT using fontFamily/fontWeight inputs (troika uses font files, not CSS fonts)

**Key Removals**:

- sampleTextPixels() method (lines 189-236)
- fontFamily, fontWeight inputs
- Canvas text rendering logic
- Text-shaped particle creation

**Reference Implementation**: implementation-plan.md:280-520

---

## Verification Protocol

**After Each Task Completion**:

1. Developer updates task status to "✅ COMPLETE"
2. Developer adds git commit SHA
3. Team-leader verifies:
   - `git log --oneline -1` matches expected commit pattern
   - `Read([file-path])` confirms file exists and has correct implementation
   - Build passes: `npx nx build dev-brand-ui`
   - All imports correct (troika Text, no NgtsText3D)
   - All anti-patterns avoided (no custom ShaderMaterial, no canvas sampling)
4. If verification passes: Assign next task
5. If verification fails: Mark task as "❌ FAILED", escalate to user

---

## Completion Criteria

**All tasks complete when**:

- All task statuses are "✅ COMPLETE"
- All git commits verified
- All files exist with correct implementations
- Build passes (npx nx build dev-brand-ui)
- No NgtsText3D imports
- No custom ShaderMaterial in text-3d-volumetric
- No canvas pixel sampling in smoke-text-3d
- All troika Text patterns followed (sync, dispose)

**Return to orchestrator with**: "All 2 tasks completed and verified ✅"
