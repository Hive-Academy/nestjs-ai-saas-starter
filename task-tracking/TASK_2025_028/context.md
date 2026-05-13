# Task Context for TASK_2025_028

## User Intent

Re-validate and re-style all website sections from TASK_2025_026. The hero Three.js section is good and content writing is strong, but all other sections are "way basic" and don't match the quality shown in design-system reference images (docs/design-system/). Create a comprehensive section-by-section re-styling plan that maps current sections to design-system references and implements professional visual design.

## Current State Analysis

**What's Working** (Preserve):

- Hero space scene (Three.js implementation with rich 3D effects)
- Content writing (benefit-focused narrative)
- Overall information architecture

**What Needs Re-styling** (All other sections):

- Problem/Solution section - basic styling
- Value Propositions section - lacks visual polish
- Workflow Examples section - basic card design
- Capabilities Matrix section - basic table layout
- Developer Experience section - minimal styling
- CTA section - basic card grid

## Reference Materials

**Design System Source**: docs/design-system/designs-systems.md

- Philosophy: Generous whitespace, minimal clutter, bold typography
- Key Principles: 40px+ spacing, 18px base font, high contrast, subtle shadows
- INK Games inspiration: GSAP scroll effects, microinteractions, layered cards

**Visual Reference Screenshots**: docs/design-system/

- design-1.png: Agencode portfolio (minimalist, large cards, generous spacing)
- design-2.png: Playful recruitment platform (clean cards, pricing table, testimonials)
- design-3.png: JotPot journal app (dark sections, image overlays, feature cards)
- design-4.png: Flow productivity app (dark theme, 3D elements, glassmorphism)

**Current Website Screenshot**: c:/Users/abdal/Downloads/screenshot_10_27_2025_8-12-03 AM.png

- Shows basic implementation with minimal visual design
- Sections lack depth, polish, and professional finish

## Previous Work Context (TASK_2025_026)

**Completed Deliverables**:

- visual-design-specification.md: 2,092 lines of complete design specs
- design-handoff.md: Developer implementation guide
- design-assets-inventory.md: Canva asset catalog
- tasks.md: 20 atomic tasks (16/20 complete - 80%)

**Implementation Status**:

- Tasks 1-4: Foundation complete (Tailwind config, interfaces, hero)
- Tasks 5-7: Problem/Solution + Value Props (IN PROGRESS - Batch 1)
- Tasks 8-13: Remaining sections (PENDING)
- Tasks 14-16: CTA + Integration (COMPLETE)
- Tasks 17-20: Testing + QA (PENDING)

**Known Issues**:

- Previous quality failure (fabricated work) led to strict verification protocol
- Current sections implemented but lack visual polish
- Design specs exist but need re-validation against reference images

## Technical Context

- Branch: feature/028
- Created: 2025-10-27
- Task Type: UI/UX Redesign + Frontend Implementation
- Priority: P1-High (User explicitly requests redesign)
- Effort Estimate: XL (Comprehensive re-styling of 6 major sections)

## Execution Strategy

**Phase 0**: Initialization ✅ COMPLETE

- TASK_ID generated: TASK_2025_028
- Context file created
- Branch number: 028
- NO git operations (user handles when ready)

**Recommended Agent Sequence**:

1. **ui-ux-designer**: Section-by-section visual redesign

   - Map each section to design-system references
   - Create enhanced visual specifications
   - Generate any needed Canva assets
   - Provide design-to-code handoff

2. **software-architect**: Implementation strategy

   - Review ui-ux-designer specs
   - Create implementation plan
   - Define component hierarchy
   - Specify Tailwind classes and Angular-3D integration

3. **team-leader**: Task decomposition

   - Break implementation plan into atomic tasks
   - Assign to frontend-developer
   - Manage iterative development cycle

4. **frontend-developer**: Implementation

   - Execute tasks from team-leader
   - Apply enhanced visual designs
   - Maintain hero section quality throughout

5. **senior-tester**: Quality validation (user choice)
6. **code-reviewer**: Code quality check (user choice)
7. **modernization-detector**: Future work analysis

**Critical Success Factors**:

1. Preserve hero section's visual quality as baseline
2. Match design-system reference sophistication
3. Apply consistent visual language across all sections
4. Maintain existing content (writing is strong)
5. Use existing Angular-3D framework capabilities

## Key Constraints

**Technical**:

- Angular 19 + Tailwind CSS + Angular-3D framework
- Existing component structure (refactor styling, not architecture)
- WCAG 2.1 AA accessibility compliance
- Mobile-first responsive design

**Design**:

- Light design system (white/light gray backgrounds)
- Generous whitespace (128px+ section padding)
- Bold typography (60-72px headlines)
- Subtle shadows and elevation
- Scroll-driven animations (GSAP ScrollTrigger)

**Quality**:

- Match hero section's visual sophistication
- Professional finish on par with design-1.png to design-4.png
- Smooth microinteractions and hover states
- Performance-optimized 3D elements

## Success Metrics

**Visual Quality**:

- Each section matches design-system sophistication level
- Consistent visual language throughout
- Professional polish (shadows, spacing, typography)

**User Experience**:

- Smooth scroll animations
- Tactile microinteractions
- Clear visual hierarchy
- No basic/unfinished appearance

**Technical Quality**:

- All sections use design tokens from Tailwind config
- All 3D elements use Angular-3D directives
- All animations use GSAP ScrollTrigger
- Build passes, no console errors

## Notes

- User explicitly states hero section is "good" - preserve as quality benchmark
- User states other sections are "way basic" - comprehensive re-styling needed
- Design-system references show target sophistication level
- Previous TASK_2025_026 created foundation but needs visual enhancement
