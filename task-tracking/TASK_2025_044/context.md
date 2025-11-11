# Task Context for TASK_2025_044

## User Intent

Implement the Research Chat UI redesign to transform the current purple gradient design to a modern, minimalist, whitespace-heavy design inspired by contemporary AI chat interfaces (ChatGPT, Claude, Perplexity).

The task is fully specified in docs/RESEARCH_CHAT_REDESIGN_TASK.md with comprehensive design requirements, SCSS specifications, and acceptance criteria.

## Conversation Summary

User provided a complete task specification document with:

- Visual comparison (current vs target states)
- Design system reference from docs/design-system/designs-systems.md
- Target screenshots (Screenshot 2025-11-11 011600.png, Screenshot 2025-11-11 011649.png)
- Complete SCSS specifications for all message types
- Layout structure requirements (centered, max-width 800px, 32-40px vertical spacing)
- Responsive design requirements
- Accessibility requirements
- 5-phase implementation plan (6-9 hours estimated)

## Technical Context

- Branch: feature/044
- Created: 2025-01-11
- Task Type: FEATURE (UI redesign)
- Priority: P1-High
- Effort Estimate: Medium (6-8 hours)

## Key Requirements

### Design Transformation

- Remove purple gradient backgrounds completely
- Implement white (#FFFFFF) or ultra-light gray (#F9FAFB) backgrounds
- Apply design system from docs/design-system/designs-systems.md
- Follow modern AI chat interface patterns

### Message Styling

- User messages: Subtle gray background (#F9FAFB) or transparent
- Assistant messages: Transparent with optional left accent border
- Tool messages: Subtle card with border and minimal shadow
- Status messages: Minimal, italic, muted color
- 32-40px vertical spacing between messages

### Input Area

- Sticky bottom positioning
- Centered with max-width 800px
- Subtle gray background with focus state
- Action icons with hover states
- Accent-colored send button

### Components to Update

Primary files:

1. apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.scss (main redesign)
2. apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.html (structure verification)
3. apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.ts (class method alignment)
4. apps/dev-brand-ui/src/app/features/research-chat/components/approval-modal.component.scss (if exists)

## Execution Strategy

**FEATURE (UI/UX Focused)** - This task has complete specifications and does not require PM or research phases.

Recommended agent sequence:

1. Skip project-manager (requirements fully specified in docs/RESEARCH_CHAT_REDESIGN_TASK.md)
2. Skip researcher-expert (no technical unknowns)
3. Skip ui-ux-designer (design specs complete, target screenshots provided)
4. software-architect (technical design for component updates, SCSS architecture)
5. team-leader MODE 1 (task decomposition based on 5-phase implementation plan)
6. team-leader MODE 2 (iterative assignment - primarily frontend-developer)
7. team-leader MODE 3 (final verification)
8. User chooses QA: senior-tester and/or code-reviewer
9. modernization-detector (future work analysis)

## Acceptance Criteria

Visual Requirements:

- All purple gradients removed
- White/light gray backgrounds applied
- 32-40px message spacing
- All message types styled per specification
- Input area sticky and centered
- 18px body text, proper line-height
- 16px message border radius, 12px input/card radius
- Minimal shadows only

Functional Requirements:

- Responsive design (mobile, tablet, desktop)
- Smooth scroll behavior
- Subtle animations (0.3s fade-in)
- Input focus state with accent color
- All message types properly styled

Accessibility:

- WCAG AA color contrast
- Visible focus indicators
- Readable at 200% zoom
- Semantic HTML maintained

## Reference Materials

- Design system: docs/design-system/designs-systems.md
- Task specification: docs/RESEARCH_CHAT_REDESIGN_TASK.md
- Target screenshots: docs/Screenshot 2025-11-11 011600.png, docs/Screenshot 2025-11-11 011649.png
- Current design: docs/our-chat-design.png (to be replaced)
