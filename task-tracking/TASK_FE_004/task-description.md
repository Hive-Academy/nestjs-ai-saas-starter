# Task Requirements - TASK_FE_004

## User's Request

**Original Request**: "Fix critical issues in landing page - ensure all services are correctly utilized, fix layout width issues where only hero section looks correct and other sections are too small in width and need to take full screen width, remove showcase-navigation component that shouldn't be shown"

**Core Need**: Fix the landing page layout and service integration issues that are causing visual inconsistencies and unwanted navigation elements.

## Requirements Analysis

### Requirement 1: Fix Layout Width Issues

**User Story**: As a visitor to the landing page, I want all sections to display with full screen width like the hero section, so that the visual experience is consistent throughout the page.

**Acceptance Criteria**:
- WHEN viewing the landing page THEN all sections (Platform Pillars, Demo Theater, Library Ecosystem, Architecture Deep Dive) should have full screen width
- WHEN comparing sections THEN the width should be consistent with the hero section
- WHEN the page loads THEN there should be no constrained width sections that look smaller than intended

### Requirement 2: Remove Showcase Navigation Component

**User Story**: As a user viewing the landing page, I want the unwanted showcase navigation component removed, so that the page layout is clean and focused.

**Acceptance Criteria**:
- WHEN viewing the landing page THEN the showcase-navigation component should not be visible
- WHEN navigating the page THEN only appropriate navigation elements should be present
- WHEN the page loads THEN no unwanted navigation components should appear at the bottom or anywhere else

### Requirement 3: Restore Critical Services

**User Story**: As a developer maintaining the landing page, I want all critical services to be properly utilized, so that the page functions as designed with proper state management and performance monitoring.

**Acceptance Criteria**:
- WHEN the landing page loads THEN SectionTransitionService should be properly integrated and functioning
- WHEN recording performance monitoring is needed THEN RecordingPerformanceService should be available
- WHEN managing loading states THEN LoadingStateService should be properly connected
- WHEN examining the code THEN commented out service imports should be restored and properly injected

## Success Metrics

- All sections display with consistent full screen width matching the hero section
- Showcase navigation component is completely removed from the landing page
- All three critical services (SectionTransitionService, RecordingPerformanceService, LoadingStateService) are properly imported and functioning
- Visual layout is uniform across all sections
- No layout constraints affecting section width

## Implementation Scope

**Timeline Estimate**: 4-6 hours
- 2 hours for investigating and fixing layout width constraints
- 1 hour for removing showcase-navigation component
- 2-3 hours for restoring and integrating the three commented services

**Complexity**: Medium - involves layout debugging, service integration, and component removal

## Dependencies & Constraints

- The sections currently use `w-full h-full` classes but may have container constraints
- Hero section works correctly, so that can be used as a reference for proper layout
- Services are already developed but commented out, need investigation for why they were disabled
- The showcase-navigation component is imported at the app level (app.html)
- Layout uses Tailwind CSS with custom CSS overrides

## Technical Context

**Current Issues Identified**:
1. **Layout Width Problem**: Sections use `w-screen` but content divs may have width constraints
2. **Showcase Navigation**: Component is imported in `app.html` as `<brand-showcase-navigation>`
3. **Commented Services**: Three services are commented out in landing-page.component.ts:
   - `SectionTransitionService` 
   - `RecordingPerformanceService`
   - `LoadingStateService`

**Files Requiring Changes**:
- `apps/dev-brand-ui/src/app/app.html` - Remove showcase-navigation
- `apps/dev-brand-ui/src/app/features/landing-page/landing-page.component.ts` - Restore services
- `apps/dev-brand-ui/src/app/features/landing-page/landing-page.component.html` - Fix layout constraints
- Possibly section component templates if they have width constraints

## Next Agent Decision

**Recommendation**: software-architect
**Rationale**: This is a focused bug fix with clear technical requirements. The issues are well-defined (layout constraints, component removal, service restoration) and the approach is straightforward - no research into new technologies or patterns is needed. A software architect can directly implement the fixes by analyzing the existing code structure and making the necessary adjustments.

**Key Context for Next Agent**: 
- Hero section layout should be used as reference for correct full-width implementation
- Services were previously working but commented out - investigate why before restoring
- Showcase-navigation removal should be straightforward but verify no other dependencies