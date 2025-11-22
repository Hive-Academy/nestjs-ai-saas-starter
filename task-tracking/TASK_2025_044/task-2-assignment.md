# Task 2 Assignment - TASK_2025_044

**Status**: 🔄 IN PROGRESS - Assigned to frontend-developer
**Task**: Phase 2 - Message Styles (All Message Type Styles)
**Estimated Effort**: 2-3 hours
**Date Assigned**: 2025-01-11

## CRITICAL INSTRUCTIONS FOR FRONTEND-DEVELOPER

You are assigned ONLY Task 2. Read tasks.md (lines 89-209) for complete specifications.

## Implementation Summary

**File to Modify**:

- D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\research-chat.component.scss (lines 42-143)

## Key Changes Required

### 2.1 Base Message Styles (Lines 42-47)

- Padding: 16px 24px
- Border radius: 16px
- Font size: 18px
- Line height: 1.6
- Remove box shadow

### 2.2 User Messages (Lines 49-53)

- Background: #F9FAFB (light gray)
- Color: #23272F (primary text)
- **REMOVE purple gradient completely**
- Right-aligned

### 2.3 Assistant Messages (Lines 55-77)

- Background: transparent
- Border left: 3px solid #6366F1
- Padding left: 20px
- Left-aligned

### 2.4 Message Subtypes

- **Status**: Transparent, italic, muted (#71717A), 16px
- **Success**: #F0FDF4 background, #86EFAC border
- **Error**: #FEF2F2 background, #FCA5A5 border
- **Tool Execution**: #F9FAFB background, 1px border #E5E7EB

### 2.5 System Messages (Lines 79-86)

- Centered, transparent
- Color: #71717A (muted)
- Font size: 16px

### 2.6 Headers & Metadata

- Border: 1px solid #E5E7EB (not rgba)
- Text: #23272F (not colored)
- Metadata: #71717A (not accent)

### 2.7 Loading Indicator

- Color: #71717A (not accent)

## Design System Colors

- Background: #FFFFFF, #F9FAFB
- Text: #23272F (primary), #71717A (muted)
- Accent: #6366F1, #4F46E5
- Border: #E5E7EB
- Success: #F0FDF4 (bg), #86EFAC (border)
- Error: #FEF2F2 (bg), #FCA5A5 (border)

## Verification Checklist

- [ ] User messages: Light gray background, right-aligned, 18px text
- [ ] Assistant messages: Transparent, left accent border, 18px text
- [ ] Tool messages: Subtle card with border, 16px text
- [ ] Status messages: Transparent, italic, muted, 16px text
- [ ] System messages: Centered, transparent, muted, 16px text
- [ ] Success/error: Light backgrounds with border-left accent
- [ ] NO purple anywhere
- [ ] NO heavy shadows

## Git Commit Requirements

```bash
git add apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.scss
git commit -m "feat(research-chat): redesign message styles per design system"
```

## After Completion

1. Update tasks.md Task 2 status to "✅ COMPLETE"
2. Add git commit SHA to Task 2 entry
3. Return to team-leader with completion report including:
   - Commit SHA
   - Changes made
   - Verification results
