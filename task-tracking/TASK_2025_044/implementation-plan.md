# Implementation Plan - TASK_2025_044: Research Chat UI Redesign

## 📊 Current State Analysis

### Existing Component Structure

**File**: `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.html`

- **Structure**: Clean, semantic HTML with Angular control flow
- **Message container**: `.chat-messages` with `@for` loop rendering
- **Input area**: `.chat-input-container` with form and sticky positioning logic
- **Modal component**: Separate `<app-approval-modal>` component
- **Assessment**: HTML structure is GOOD - minimal changes needed, primarily class adjustments

**File**: `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.ts`

- **Message types**: `user`, `assistant`, `system`, `tool` (4 role types)
- **Message subtypes**: `text`, `status`, `success`, `error`, `draft`, `tool-execution` (6 type variants)
- **CSS class method**: `getMessageClass()` generates dynamic classes (line 422-430)
- **Message helpers**: System, status, success, error message creators (lines 364-398)
- **Assessment**: TypeScript logic is COMPLETE - no changes required, class method already supports all message types

**File**: `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.scss` (256 lines)

**Current Design Issues Identified**:

1. **Line 7**: Purple gradient background `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` - MUST REMOVE
2. **Line 51**: User message purple gradient background - REPLACE with light gray
3. **Line 39**: Chat messages container with `rgba(255, 255, 255, 0.05)` overlay - REPLACE with white
4. **Line 44**: Message gap is `1.5rem` (24px) - INCREASE to 32-40px per spec
5. **Line 14**: Chat header with semi-transparent white - UPDATE to design system
6. **Line 185**: Send button purple gradient - REPLACE with accent color (#6366F1)
7. **Lines 57-76**: Assistant message variants (status, success, error) with colored backgrounds - REFACTOR to minimal design
8. **Line 82**: System message with light background - SIMPLIFY to transparent
9. **Line 147**: Input container styling - NEEDS redesign for centered, max-width approach

**Reusable Patterns to Preserve**:

- Animations: `@keyframes slideIn` (lines 210-219) - KEEP but adjust timing
- Animations: `@keyframes dots` (lines 221-236) - KEEP for loading states
- Scrollbar styling (lines 239-255) - UPDATE colors to design system
- Message header structure (lines 89-106) - REFACTOR for minimal design
- Loading indicator pattern (lines 130-143) - REFACTOR styling

**File**: `apps/dev-brand-ui/src/app/features/research-chat/components/approval-modal.component.ts`

- **Structure**: Inline template and styles (component-level)
- **Current styling**: Purple gradient header (line 87), colored action buttons (lines 195-211)
- **Assessment**: Requires style updates to match design system, NO structural changes

---

## 🏗️ Technical Architecture

### Component Structure

**No HTML template changes required** - The existing structure already supports the new design:

- Message container with proper semantic structure
- Message role switching with `@switch`
- Conditional metadata rendering with `@if`
- Form-based input area

**No TypeScript changes required** - The existing logic is complete:

- `getMessageClass()` method already generates all needed CSS classes
- Message helper methods support all message types
- No new message types or subtypes needed for design

**SCSS Architecture - Complete Rewrite Strategy**:

The implementation will follow a **direct replacement** approach (NO backward compatibility):

1. **Preserve animations and scrollbar utilities** (lines 210-255)
2. **Replace all component styles** with design system-aligned implementations
3. **Organize SCSS** with clear sections: Layout → Messages → Input → Utilities

### SCSS Architecture Details

**Design System Integration**:

Create reusable SCSS variables at the top of the file:

```scss
// Design System Tokens (from docs/design-system/designs-systems.md)
$bg-white: #ffffff;
$bg-light-gray: #f9fafb;
$text-primary: #23272f;
$text-muted: #71717a;
$accent-primary: #6366f1;
$accent-hover: #4f46e5;
$border-subtle: #e5e7eb;
$error-bg: #fef2f2;
$error-border: #fca5a5;
$success-bg: #f0fdf4;
$success-border: #86efac;

// Spacing Units (8px base)
$spacing-1x: 8px;
$spacing-2x: 16px;
$spacing-3x: 24px;
$spacing-4x: 32px;
$spacing-5x: 40px;

// Border Radius
$radius-small: 8px;
$radius-medium: 12px;
$radius-large: 16px;

// Typography
$font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
$font-size-base: 18px;
$font-size-small: 16px;
$font-size-tiny: 14px;
$line-height-relaxed: 1.6;

// Shadows
$shadow-subtle: 0 4px 32px rgba(0, 0, 0, 0.04);
$shadow-card: 0 2px 8px rgba(0, 0, 0, 0.08);
```

**SCSS File Organization Strategy**:

```scss
// FILE STRUCTURE:
// 1. Design System Tokens (variables)
// 2. Layout - Container, Header, Chat Messages Container
// 3. Message Styles - Base, User, Assistant, System, Tool, Status
// 4. Input Area - Container, Wrapper, Icons, Input, Button
// 5. Utilities - Animations, Scrollbar, Responsive Breakpoints
```

**Responsive Breakpoints Strategy**:

```scss
// Breakpoints (matching design spec requirements)
$breakpoint-mobile: 480px;
$breakpoint-tablet: 768px;
$breakpoint-desktop: 1200px;

// Approach: Mobile-first with progressive enhancement
// Base styles = mobile, then tablet/desktop overrides
```

**Animation Implementation Approach**:

Preserve existing `slideIn` animation but adjust for subtlety:

- Keep 0.3s duration (per spec)
- Reduce translateY from 10px to 5px for more subtle entrance
- Add fade-in timing function for smoothness

---

## 📋 Implementation Strategy

### Phase 1: Layout & Structure (Background Removal, Container Setup, Spacing)

**Goal**: Remove purple gradient, establish white background, implement centered max-width layout

**Technical Changes**:

1. **Container background removal** (Line 7):

   - REMOVE: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
   - REPLACE: `background: $bg-white;` (pure white)

2. **Chat messages container** (Lines 32-40):

   - REMOVE: `background: rgba(255, 255, 255, 0.05);`
   - REPLACE: `background: transparent;`
   - UPDATE: `max-width: 800px;` (centered content)
   - UPDATE: `margin: 0 auto;` (center alignment)
   - UPDATE: `padding: 80px 24px 120px;` (top space for header, bottom for input)

3. **Message spacing** (Line 38):

   - REMOVE: `gap: 1.5rem;` (24px)
   - REPLACE: `gap: $spacing-4x;` (32px) or `gap: $spacing-5x;` (40px per spec)

4. **Header redesign** (Lines 12-30):
   - OPTION A: Keep fixed header with transparent background + backdrop blur
   - OPTION B: Remove header completely (target screenshots show no header)
   - **RECOMMENDATION**: Option B (cleaner, matches target screenshots)

**Files Affected**:

- `research-chat.component.scss` (MODIFY: lines 1-40)

**Quality Requirements**:

- Background must be pure white (#FFFFFF) with NO gradients
- Container max-width exactly 800px, centered
- Vertical spacing between messages exactly 32-40px
- Top/bottom padding sufficient for header/input area

**Verification Checkpoints**:

- Visual inspection: No purple visible anywhere
- Measure spacing: Browser DevTools shows 32-40px gaps
- Responsive test: Container stays centered at all screen sizes

---

### Phase 2: Message Styles (User, Assistant, Tool, Status, Error Messages)

**Goal**: Implement message type styles per design specification

**Technical Changes**:

**2.1 Base Message Styles** (Lines 42-47):

```scss
.message {
  padding: $spacing-2x $spacing-3x; // 16px 24px
  border-radius: $radius-large; // 16px
  animation: messageSlideIn 0.3s ease-out;
  font-size: $font-size-base; // 18px
  line-height: $line-height-relaxed; // 1.6
  max-width: 80%; // Constrain width for readability
  box-shadow: none; // Remove all shadows initially
}
```

**2.2 User Messages** (Lines 49-53):

```scss
.message-user {
  align-self: flex-end; // Right-aligned
  background: $bg-light-gray; // #F9FAFB (ultra-light gray)
  color: $text-primary; // #23272F
  margin-left: auto;
  margin-bottom: $spacing-4x; // 32px

  // NO GRADIENT, NO PURPLE
}
```

**Alternative centered approach** (per spec Option B):

```scss
.message-user {
  background: transparent;
  color: $text-primary;
  padding: $spacing-2x 0;
  text-align: left;
  margin: 0 auto $spacing-4x;
  max-width: 100%;
  font-weight: 500; // Slightly bold for emphasis
}
```

**RECOMMENDATION**: Implement right-aligned with light gray background (Option A) as primary, document centered approach as alternative.

**2.3 Assistant Messages** (Lines 55-77):

```scss
.message-assistant {
  align-self: flex-start; // Left-aligned
  background: transparent; // NO BACKGROUND
  color: $text-primary;
  padding: $spacing-2x 0; // Vertical padding only
  max-width: 100%;
  margin-bottom: $spacing-4x;
  border-left: 3px solid $accent-primary; // #6366F1 accent border
  padding-left: 20px; // Indent from border

  // Subtypes handled by additional classes
}
```

**2.4 Assistant Message Subtypes**:

**Status messages** (lines 60-64):

```scss
.message-status {
  background: transparent; // NOT colored
  color: $text-muted; // #71717A
  padding: $spacing-1x 0; // 8px 0
  margin-bottom: $spacing-2x; // 16px (less than normal)
  font-size: $font-size-small; // 16px
  font-style: italic;
  display: flex;
  align-items: center;
  gap: $spacing-1x; // 8px

  .status-icon {
    font-size: 16px;
  }
}
```

**Success messages** (lines 66-70):

```scss
.message-success {
  background: $success-bg; // #F0FDF4 (very light green)
  color: $text-primary;
  border-left: 4px solid $success-border; // #86EFAC
  padding-left: 20px;
}
```

**Error messages** (lines 72-76):

```scss
.message-error {
  background: $error-bg; // #FEF2F2 (very light red)
  color: $text-primary;
  border-left: 4px solid $error-border; // #FCA5A5
  padding-left: 20px;
}
```

**2.5 Tool Execution Messages** (NEW implementation for `message-tool` class):

```scss
.message-tool {
  background: $bg-light-gray; // #F9FAFB
  border: 1px solid $border-subtle; // #E5E7EB
  border-radius: $radius-medium; // 12px
  padding: $spacing-2x 20px; // 16px 20px
  margin-bottom: $spacing-4x;
  font-size: $font-size-small; // 16px
  color: $text-muted; // #71717A

  .tool-icon {
    display: inline-block;
    margin-right: $spacing-1x;
    font-size: 18px;
  }

  .tool-name {
    font-weight: 600;
    color: $text-primary;
  }

  // Tool execution uses .message-content class for output
}
```

**2.6 System Messages** (Lines 79-86):

```scss
.message-system {
  align-self: center;
  background: transparent; // NO BACKGROUND
  border: none;
  color: $text-muted; // #71717A
  font-size: $font-size-small; // 16px
  font-weight: 400;
  padding: $spacing-2x $spacing-3x;
  margin: $spacing-5x auto; // 40px auto
  max-width: 600px;
  text-align: center;
}
```

**2.7 Message Header & Metadata** (Lines 89-128):

**Message header** - REFACTOR for minimal design:

```scss
.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem; // Reduce from 0.75rem
  padding-bottom: 0.25rem; // Reduce padding
  border-bottom: 1px solid $border-subtle; // Subtle border, not rgba

  .message-role {
    font-weight: 600;
    font-size: 0.85rem;
    color: $text-primary; // Not colored by role
  }

  .message-time {
    font-size: 0.75rem;
    color: $text-muted;
    opacity: 1; // Remove opacity, use muted color instead
  }
}
```

**Message metadata**:

```scss
.message-metadata {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid $border-subtle;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: $text-muted; // Not accent color
  font-weight: 500;

  .file-icon {
    font-size: 1.2rem;
  }
}
```

**2.8 Loading Indicator** (Lines 130-143):

```scss
.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: $text-muted; // Not accent color
  font-weight: 500;

  .loading-dots {
    &::after {
      content: '⋯';
      animation: dots 1.5s steps(4, end) infinite;
    }
  }
}
```

**Files Affected**:

- `research-chat.component.scss` (REWRITE: lines 42-143)

**Quality Requirements**:

- User messages: Light gray background (#F9FAFB), right-aligned, 18px text
- Assistant messages: Transparent background, left accent border, 18px text
- Tool messages: Subtle card with border, 16px text
- Status messages: Transparent, italic, muted color, 16px text
- System messages: Centered, transparent, muted, 16px text
- Success/error: Light colored backgrounds with border-left accent
- NO purple anywhere, NO heavy shadows

**Verification Checkpoints**:

- Render all message types, verify visual appearance matches spec
- Measure font sizes, padding, margins with DevTools
- Verify status messages are visually distinct but minimal
- Confirm tool execution messages have subtle card appearance

---

### Phase 3: Input Area (Sticky Positioning, Focus States, Action Icons)

**Goal**: Redesign input area with sticky bottom positioning, centered max-width, subtle styling

**Technical Changes**:

**3.1 Input Container** (Lines 145-150):

```scss
.chat-input-container {
  position: sticky; // Already present
  bottom: 0;
  left: 0;
  right: 0;
  background: $bg-white; // White, not semi-transparent
  border-top: 1px solid $border-subtle; // #E5E7EB
  padding: 20px $spacing-3x; // 20px 24px
  z-index: 100;
}
```

**3.2 Input Form & Wrapper** (NEW structure):

```scss
.chat-input-form {
  max-width: 800px; // Match message container
  margin: 0 auto; // Center within sticky container
  display: flex;
  align-items: center;
  gap: 12px;
  background: $bg-light-gray; // #F9FAFB
  border: 1px solid $border-subtle;
  border-radius: $radius-medium; // 12px
  padding: 12px $spacing-2x; // 12px 16px
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus-within {
    border-color: $accent-primary; // #6366F1
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); // Accent glow
  }
}
```

**3.3 Action Icons** (NEW - not currently in design):

```scss
.input-icons {
  display: flex;
  gap: $spacing-1x; // 8px

  button {
    background: transparent;
    border: none;
    color: $text-muted;
    padding: $spacing-1x;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;

    &:hover {
      background: $border-subtle;
      color: $text-primary;
    }
  }
}
```

**NOTE**: Current HTML doesn't have action icons. This is CSS preparation - HTML update would be needed if icons are added.

**3.4 Text Input** (Lines 157-181):

```scss
.chat-input {
  flex: 1; // Fill available space
  border: none;
  background: transparent; // Blend with form background
  font-size: $font-size-small; // 16px
  color: $text-primary;
  outline: none;
  font-family: $font-family;

  &::placeholder {
    color: #9ca3af; // Slightly darker than muted for readability
  }

  &:disabled {
    background: transparent; // Don't change background
    cursor: not-allowed;
    opacity: 0.6;
  }
}
```

**3.5 Send Button** (Lines 183-208):

```scss
.send-button {
  background: $accent-primary; // #6366F1 solid color
  color: white;
  border: none;
  border-radius: $radius-small; // 8px
  padding: 10px 20px;
  font-size: 1.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  box-shadow: none; // Remove heavy shadow

  &:hover:not(:disabled) {
    background: $accent-hover; // #4F46E5
    transform: translateY(-1px); // Subtle lift, not -2px
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background: #d1d5db; // Gray
    cursor: not-allowed;
    opacity: 1; // Don't use opacity, use gray directly
  }
}
```

**Files Affected**:

- `research-chat.component.scss` (REWRITE: lines 145-208)

**Quality Requirements**:

- Input container: Sticky bottom, white background, subtle top border
- Input wrapper: Centered 800px max-width, light gray background, 12px radius
- Focus state: Accent color border + subtle shadow glow
- Text input: 16px font, transparent background, placeholder visible
- Send button: Solid accent color, 8px radius, NO gradient, NO heavy shadow
- Button disabled state: Gray background (not opacity)

**Verification Checkpoints**:

- Input area remains visible when scrolling (sticky)
- Focus state shows accent border and glow
- Button hover provides subtle feedback (1px lift, color change)
- Disabled state clearly shows gray, not purple
- Input width matches message container (800px)

---

### Phase 4: Polish & Responsive (Animations, Breakpoints, Consistency)

**Goal**: Add subtle animations, implement responsive breakpoints, ensure consistency

**Technical Changes**:

**4.1 Animation Refinement** (Lines 210-236):

**Message slide-in** - ADJUST for subtlety:

```scss
@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(5px); // Reduced from 10px for subtlety
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Loading dots** - KEEP as is (lines 221-236) - already good.

**4.2 Scrollbar Styling** (Lines 238-255):

**UPDATE colors to design system**:

```scss
.chat-messages::-webkit-scrollbar {
  width: 8px; // Keep size
}

.chat-messages::-webkit-scrollbar-track {
  background: $bg-light-gray; // #F9FAFB
  border-radius: 4px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: $border-subtle; // #E5E7EB
  border-radius: 4px;

  &:hover {
    background: $text-muted; // #71717A - darker on hover
  }
}
```

**4.3 Responsive Design** (NEW - add at end of file):

**Tablet breakpoint (768px)**:

```scss
@media (max-width: $breakpoint-tablet) {
  .chat-messages {
    padding: 60px $spacing-2x 100px; // Reduce horizontal padding
  }

  .research-chat-container {
    max-width: 100%; // Remove max-width constraint
  }

  .message-user,
  .message-assistant {
    max-width: 100%; // Full width on tablet
    font-size: $font-size-small; // 16px
  }

  .chat-input-container {
    padding: 12px $spacing-2x;
  }
}
```

**Mobile breakpoint (480px)**:

```scss
@media (max-width: $breakpoint-mobile) {
  .chat-messages {
    padding: 40px $spacing-2x 80px; // Further reduce padding
  }

  .message,
  .message-user,
  .message-assistant {
    padding: 12px $spacing-2x; // Reduce message padding
    font-size: 15px; // Slightly smaller text
  }

  .message-system {
    font-size: 14px;
    padding: $spacing-2x;
  }

  .chat-input-form {
    padding: $spacing-1x 12px; // Tighter input padding
  }

  .chat-input {
    font-size: 15px;
  }

  .send-button {
    padding: $spacing-1x $spacing-2x; // Smaller button
    font-size: 1.25rem;
  }
}
```

**4.4 Smooth Scroll Behavior** (Add to `.chat-messages`):

```scss
.chat-messages {
  // ... existing styles
  scroll-behavior: smooth;
  overflow-y: auto;
}
```

**Files Affected**:

- `research-chat.component.scss` (MODIFY: lines 210-236, ADD: responsive breakpoints at end)

**Quality Requirements**:

- Animation duration: 0.3s (per spec)
- Animation movement: Subtle (5px translateY)
- Scrollbar colors: Design system grays (#F9FAFB, #E5E7EB, #71717A)
- Tablet (768px): Reduced padding, full-width messages, 16px text
- Mobile (480px): Further reduced padding, 15px text, smaller button
- Smooth scroll behavior maintained

**Verification Checkpoints**:

- Messages animate in subtly (not jarring)
- Scrollbar visible and matches design system colors
- Tablet view: Messages full-width, readable font
- Mobile view: Comfortable padding, readable text, usable button
- Smooth scrolling works when new messages appear

---

### Phase 5: Markdown Rendering Integration

**Goal**: Add markdown rendering capability to chat messages with syntax highlighting

**Technical Changes**:

**5.1 Check Package Installation**:

- Make sure we have `ngx-markdown` and `prismjs` installed:

**5.2 Global Configuration** (app.config.ts or main application file):

```typescript
import { provideMarkdown } from 'ngx-markdown';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideMarkdown(),
    // ... other providers
  ],
};
```

**5.3 Component Integration** (research-chat.component.ts):

```typescript
import { MarkdownModule } from 'ngx-markdown';

@Component({
  selector: 'app-research-chat',
  standalone: true,
  imports: [
    // ... existing imports
    MarkdownModule,
  ],
  // ... rest of component
})
```

**5.4 Template Update** (research-chat.component.html):

Update message content rendering to use markdown pipe:

```html
<!-- Before: Plain text rendering -->
<div class="message-content">{{ message.content }}</div>

<!-- After: Markdown rendering -->
<div class="message-content" [innerHTML]="message.content | markdown"></div>
```

**5.5 Prism.js Syntax Highlighting Setup** (styles.scss or global styles):

```scss
// Import Prism.js theme (choose one)
@import 'prismjs/themes/prism-okaidia.css'; // Dark theme (recommended)
// OR
@import 'prismjs/themes/prism.css'; // Light theme

// Import Prism.js core languages (only what you need)
@import 'prismjs/components/prism-typescript';
@import 'prismjs/components/prism-javascript';
@import 'prismjs/components/prism-python';
@import 'prismjs/components/prism-bash';
@import 'prismjs/components/prism-json';
```

**5.6 Markdown Styling** (research-chat.component.scss):

Add markdown-specific styles that integrate with design system:

```scss
.message-content {
  // Headings
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    color: $text-primary;
    margin: $spacing-3x 0 $spacing-2x;
    font-weight: 700;
    line-height: 1.3;

    &:first-child {
      margin-top: 0;
    }
  }

  h1 {
    font-size: 2rem;
  }
  h2 {
    font-size: 1.5rem;
  }
  h3 {
    font-size: 1.25rem;
  }
  h4 {
    font-size: 1.1rem;
  }

  // Paragraphs
  p {
    margin: $spacing-2x 0;
    line-height: $line-height-relaxed;

    &:first-child {
      margin-top: 0;
    }

    &:last-child {
      margin-bottom: 0;
    }
  }

  // Lists
  ul,
  ol {
    margin: $spacing-2x 0;
    padding-left: $spacing-3x;
    line-height: $line-height-relaxed;

    li {
      margin: $spacing-1x 0;
    }
  }

  // Links
  a {
    color: $accent-primary;
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 0.2s;

    &:hover {
      border-bottom-color: $accent-primary;
    }
  }

  // Code blocks
  pre {
    background-color: $bg-light-gray; // Subtle gray per design spec
    border: 1px solid $border-subtle;
    border-radius: $radius-medium;
    padding: $spacing-2x $spacing-3x;
    margin: $spacing-2x 0;
    overflow-x: auto;
    font-size: $font-size-small;
    line-height: 1.5;

    code {
      background: transparent;
      padding: 0;
      border: none;
      font-family: 'Courier New', Courier, monospace;
    }
  }

  // Inline code
  code {
    background-color: $bg-light-gray;
    color: $text-primary;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
    font-family: 'Courier New', Courier, monospace;
  }

  // Blockquotes
  blockquote {
    border-left: 4px solid $accent-primary;
    padding-left: $spacing-2x;
    margin: $spacing-2x 0;
    color: $text-muted;
    font-style: italic;
  }

  // Tables
  table {
    width: 100%;
    border-collapse: collapse;
    margin: $spacing-2x 0;

    th,
    td {
      padding: $spacing-1x $spacing-2x;
      border: 1px solid $border-subtle;
      text-align: left;
    }

    th {
      background-color: $bg-light-gray;
      font-weight: 600;
      color: $text-primary;
    }

    tr:hover {
      background-color: $bg-light-gray;
    }
  }

  // Horizontal rules
  hr {
    border: none;
    border-top: 1px solid $border-subtle;
    margin: $spacing-4x 0;
  }
}
```

**5.7 Performance Optimization** (for streaming messages):

Add debouncing for real-time markdown rendering:

```typescript
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

// In component
renderedContent$ = this.message.content$.pipe(
  debounceTime(100), // Render every 100ms during streaming
  distinctUntilChanged(),
  map((content) => content) // Pipe will handle markdown conversion
);
```

**5.8 Security Configuration** (already enabled by default):

ngx-markdown has built-in XSS protection via Angular DomSanitizer. No additional configuration needed unless you want to customize:

```typescript
// Optional: Custom security configuration
import { SecurityContext } from '@angular/core';

// In app.config.ts
provideMarkdown({
  sanitize: SecurityContext.HTML, // Default - keeps XSS protection
});
```

**Files Affected**:

- `package.json` (ADD: dependencies)
- `app.config.ts` or main app file (MODIFY: add provideMarkdown)
- `research-chat.component.ts` (MODIFY: import MarkdownModule)
- `research-chat.component.html` (MODIFY: add markdown pipe to message content)
- `research-chat.component.scss` (ADD: markdown styling section)
- `styles.scss` or global styles (ADD: Prism.js theme imports)

**Quality Requirements**:

- Markdown rendering: Bold, italic, lists, links, headings render correctly
- Code blocks: Syntax highlighting works for TypeScript, JavaScript, Python, Bash, JSON
- Security: XSS protection enabled (default), safe for user-generated content
- Performance: Streaming messages render smoothly with 100ms debounce
- Styling: All markdown elements match design system (colors, spacing, typography)
- Bundle size: Total addition ~35-50KB gzipped (acceptable)

**Verification Checkpoints**:

- Test markdown rendering: **bold**, _italic_, `code`, lists, headings
- Test code blocks with syntax highlighting: TypeScript, JavaScript, Python
- Test tables: Render correctly with design system styling
- Test links: Accent color, hover state with underline
- Performance test: Stream 5000+ characters of markdown, verify smooth rendering
- Security test: Inject malicious HTML/script tags, verify sanitization
- Bundle size: Verify total bundle increase <60KB

---

### Phase 6: Approval Modal Redesign

**Goal**: Update approval modal to match design system (white background, subtle styling)

**Technical Changes**:

**File**: `apps/dev-brand-ui/src/app/features/research-chat/components/approval-modal.component.ts`

**6.1 Modal Header** (Line 87):

```scss
.modal-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid $border-subtle; // Not 2px
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: $bg-white; // NOT gradient
  border-radius: $radius-large $radius-large 0 0;

  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: $text-primary; // NOT white
  }

  .close-button {
    background: $bg-light-gray; // NOT semi-transparent white
    border: none;
    color: $text-primary; // NOT white
    font-size: 1.5rem;
    width: 40px;
    height: 40px;
    border-radius: $radius-small;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: $border-subtle;
      transform: rotate(90deg); // Keep rotation
    }
  }
}
```

**6.2 Modal Content** (Line 70):

```scss
.modal-content {
  background: white;
  border-radius: $radius-large;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: $shadow-subtle; // Design system shadow
  animation: slideUp 0.3s ease-out;
}
```

**6.3 Action Buttons** (Lines 195-211):

```scss
.btn-reject {
  background: #ef4444; // Solid red, NOT gradient
  color: white;

  &:hover {
    background: #dc2626; // Darker red on hover
  }
}

.btn-approve {
  background: $accent-primary; // Accent color, NOT green gradient
  color: white;

  &:hover {
    background: $accent-hover; // Accent hover
  }
}
```

**Files Affected**:

- `approval-modal.component.ts` (MODIFY: inline styles, lines 52-251)

**Quality Requirements**:

- Modal header: White background (not gradient), dark text
- Close button: Light gray background (not semi-transparent)
- Action buttons: Solid colors (not gradients)
- Approve button: Accent color (#6366F1), not green
- Reject button: Solid red (#EF4444)
- Shadow: Subtle design system shadow

**Verification Checkpoints**:

- Modal opens with white header, dark text
- Close button is light gray, hovers to darker gray
- Approve button is accent blue, not green
- No gradients visible anywhere in modal

---

## 🎯 Risk Assessment

### Potential Breaking Changes to Existing Functionality

**RISK: None Identified**

- **Rationale**: HTML structure unchanged, TypeScript logic unchanged
- **Impact**: Only CSS changes - no functional regressions expected
- **Mitigation**: Visual testing after each phase to catch styling issues early

### Browser Compatibility Considerations

**RISK: Low**

- **CSS Features Used**: All modern standard properties (flexbox, transitions, animations)
- **Backdrop Filter**: Used in original design, keeping in modal (may not work in older browsers)
- **Mitigation**: Test in Chrome, Firefox, Safari, Edge (all modern versions support used features)

### Performance Impact of CSS Changes

**RISK: Improvement Expected**

- **Removed**: Heavy gradient backgrounds, multiple box-shadows
- **Added**: Simple flat colors, minimal shadows
- **Impact**: Reduced paint complexity → better rendering performance
- **Mitigation**: Test scrolling performance with 50+ messages

### Accessibility Compliance Risks

**RISK: Medium**

- **Concern 1**: Removing colored message backgrounds may reduce visual distinction
  - **Mitigation**: Left accent border for assistant, right-alignment for user
- **Concern 2**: Light gray (#F9FAFB) on white may have low contrast
  - **Mitigation**: Border around user messages, accent border for assistant
- **Concern 3**: Status messages with italic muted text may be hard to read
  - **Mitigation**: Icon + text combination, adequate font size (16px)

**Accessibility Testing Required**:

- Color contrast: Run automated tool (e.g., axe DevTools)
- Focus states: Verify visible focus indicators on input and button
- Zoom test: Verify text readable at 200% zoom
- Screen reader: Verify semantic structure maintained (already good in HTML)

---

## 🧪 Testing Strategy

### Visual Regression Testing Approach

**Manual Visual Testing**:

1. **Baseline capture**: Screenshot current design before changes
2. **Phase-by-phase**: Screenshot after each phase implementation
3. **Side-by-side comparison**: Compare with target screenshots (docs/Screenshot 2025-11-11 011600.png, 011649.png)
4. **Checklist validation**: Verify all acceptance criteria visually

**Automated Testing** (Optional Enhancement):

- Use Percy or Chromatic for automated visual regression
- Capture screenshots of key states: empty, with messages, with modal
- Compare against baseline on each commit

### Responsive Design Testing Checkpoints

**Desktop (1200px+)**:

- [ ] Container centered with max-width 800px
- [ ] Generous whitespace on sides
- [ ] 32-40px vertical spacing between messages
- [ ] Input area centered, 800px max-width

**Tablet (768px-1199px)**:

- [ ] Container full-width with 16px horizontal padding
- [ ] Messages full-width
- [ ] Font size reduced to 16px
- [ ] Input area full-width with reduced padding

**Mobile (480px-767px)**:

- [ ] Comfortable padding (16px horizontal)
- [ ] Font size reduced to 15px
- [ ] Button appropriately sized
- [ ] Scrolling works smoothly

**Mobile Small (<480px)**:

- [ ] Text remains readable
- [ ] Button usable (not too small)
- [ ] No horizontal scroll

### Accessibility Validation Steps

**Automated Testing**:

1. Run axe DevTools or WAVE on research-chat page
2. Check color contrast ratios (WCAG AA minimum)
3. Verify focus indicators present and visible
4. Check semantic HTML structure

**Manual Testing**:

1. Tab through all interactive elements (input, button, modal buttons)
2. Verify focus visible at each stop
3. Zoom to 200% in browser, verify text readable
4. Test with screen reader (NVDA/JAWS/VoiceOver)

**Checklist**:

- [ ] Color contrast ≥ 4.5:1 for normal text
- [ ] Color contrast ≥ 3:1 for large text (18px+)
- [ ] Focus indicators visible on all interactive elements
- [ ] Text readable at 200% zoom (no text truncation)
- [ ] Semantic HTML preserved (headings, labels, roles)

### Cross-Browser Testing Requirements

**Browsers to Test**:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Test Cases per Browser**:

1. Load research-chat page
2. Send message, verify styling
3. Trigger status message, verify styling
4. Trigger tool execution message, verify styling
5. Open approval modal, verify styling
6. Test input focus state
7. Test button hover/disabled states
8. Verify animations work

**Known Browser Differences**:

- Backdrop filter: May not work in older browsers (used in modal overlay)
- Scrollbar styling: Webkit-only (Firefox has different approach)

---

## 📋 Acceptance Criteria Mapping

### Visual Requirements (from docs/RESEARCH_CHAT_REDESIGN_TASK.md:519-529)

| Requirement                                                                 | Implementation Phase          | Verification Method                               |
| --------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------- |
| Remove ALL purple gradient backgrounds                                      | Phase 1 (Lines 7, 51, 185)    | Visual inspection: No purple anywhere             |
| Implement pure white (#FFFFFF) or ultra-light gray (#F9FAFB) background     | Phase 1 (Line 7)              | DevTools color picker: Verify #FFFFFF             |
| Messages have 32-40px vertical spacing                                      | Phase 1 (Line 38)             | DevTools measure: gap = 32-40px                   |
| User messages: subtle gray background OR transparent with bold text         | Phase 2.2 (Lines 49-53)       | Visual: Gray background #F9FAFB OR transparent    |
| Assistant messages: transparent background with optional left accent border | Phase 2.3 (Lines 55-77)       | Visual: Transparent + 3px left border #6366F1     |
| Tool messages: subtle card style with border and minimal shadow             | Phase 2.5 (NEW)               | Visual: Light gray bg, 1px border, minimal shadow |
| Input area: sticky bottom, centered, max-width 800px                        | Phase 3.1-3.2 (Lines 145-150) | DevTools: position=sticky, max-width=800px        |
| Font sizing: 18px body text, proper line-height (1.6)                       | Phase 2.1 (Base message)      | DevTools: font-size=18px, line-height=1.6         |
| Border radius: 16px for messages, 12px for input/cards                      | Phase 2.1, 3.2                | DevTools: border-radius values                    |
| No heavy shadows (use `rgba(0,0,0,0.04)` only)                              | Phase 2.1, 4.2                | DevTools: box-shadow = none or subtle             |

### Functional Requirements (from docs/RESEARCH_CHAT_REDESIGN_TASK.md:531-539)

| Requirement                                                                           | Implementation Phase                | Verification Method                     |
| ------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------- |
| Responsive design works on mobile, tablet, desktop                                    | Phase 4.3 (Responsive breakpoints)  | Test at 480px, 768px, 1200px+           |
| Smooth scroll behavior maintained                                                     | Phase 4.4 (scroll-behavior: smooth) | Send 20+ messages, verify smooth scroll |
| Message animations subtle (0.3s fade-in)                                              | Phase 4.1 (Adjust slideIn)          | Visual: Observe animation timing        |
| Input focus state visible with accent color                                           | Phase 3.2 (focus-within)            | Click input, verify blue border + glow  |
| Send button disabled state clear                                                      | Phase 3.5 (disabled styling)        | Disable button, verify gray color       |
| All message types (system, user, assistant, tool, status, error) styled appropriately | Phase 2 (All message types)         | Render each type, verify styling        |

### Accessibility (from docs/RESEARCH_CHAT_REDESIGN_TASK.md:541-545)

| Requirement                                      | Implementation Phase              | Verification Method                     |
| ------------------------------------------------ | --------------------------------- | --------------------------------------- |
| Sufficient color contrast (WCAG AA minimum)      | All phases (design system colors) | Automated tool (axe DevTools)           |
| Focus indicators visible on interactive elements | Phase 3.2, 3.5 (focus states)     | Tab through elements, verify visibility |
| Text remains readable at 200% zoom               | Phase 4.3 (responsive units)      | Zoom to 200%, verify no truncation      |
| Semantic HTML maintained                         | No changes (HTML preserved)       | Screen reader test                      |

---

## 🤝 Team-Leader Handoff

### Developer Type Recommendation

**Recommended Developer**: `frontend-developer`

**Rationale**:

1. **100% Frontend Work**: All changes are Angular components (SCSS + HTML + minimal TypeScript)
2. **No Backend Changes**: No NestJS services, no database, no APIs
3. **Minor TypeScript Changes**: Import statements, markdown pipe integration, optional streaming optimization
4. **Browser-Focused Skills**: Requires CSS expertise, responsive design, browser testing
5. **Design Implementation**: Requires translating design specs to CSS + markdown library integration

**Complexity**: MEDIUM

**Rationale**:

- **Not LOW**: Requires careful attention to design system, multiple message types, responsive breakpoints
- **Not HIGH**: No complex logic, no new features, no integrations - purely visual redesign
- **MEDIUM**: Systematic SCSS rewrite, testing across browsers/devices, accessibility validation

### Estimated Effort

**Total Estimated Effort**: 8-11 hours

**Breakdown by Phase**:

- **Phase 1**: Layout & Structure - 1-2 hours
  - Background removal, container setup, spacing adjustments
  - Testing: Visual verification, spacing measurements
- **Phase 2**: Message Styles - 2-3 hours
  - User, assistant, system, tool, status, error message styles
  - Testing: Render all message types, verify appearance
- **Phase 3**: Input Area - 1 hour
  - Sticky positioning, focus states, button redesign
  - Testing: Focus state, button states, responsive width
- **Phase 4**: Polish & Responsive - 1-2 hours
  - Animations, scrollbar, responsive breakpoints
  - Testing: Tablet, mobile, animations, scrolling
- **Phase 5**: Markdown Rendering - 2-3 hours
  - Package installation, configuration, component integration
  - Markdown styling, syntax highlighting setup
  - Performance optimization, security testing
  - Testing: All markdown elements, code blocks, security
- **Phase 6**: Approval Modal - 0.5-1 hour
  - Modal styling updates
  - Testing: Modal appearance, button colors

**Buffer**: 1 hour for unexpected issues, cross-browser testing, accessibility fixes

### Files Affected Summary

**MODIFY** (1 file - SCSS rewrite + markdown styles):

- `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.scss`
  - Complete SCSS rewrite with design system tokens
  - Preserve animations and scrollbar utilities
  - Add responsive breakpoints
  - Add markdown styling section (headings, lists, code blocks, tables, etc.)

**MODIFY** (1 file - Inline styles update):

- `apps/dev-brand-ui/src/app/features/research-chat/components/approval-modal.component.ts`
  - Update inline styles (lines 52-251)
  - Remove gradients, apply design system colors

**MODIFY** (3 files - Markdown integration):

- `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.ts`
  - Import MarkdownModule
  - Add performance optimization for streaming (debounce)
- `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.html`
  - Update message content rendering to use markdown pipe
- `app.config.ts` (or main application config file)
  - Add provideMarkdown() configuration

**ADD** (1 file - Package dependencies):

- `package.json`
  - Add ngx-markdown, marked, prismjs dependencies

**ADD** (1 file - Global styles):

- `apps/dev-brand-ui/src/styles.scss` (or global styles file)
  - Import Prism.js theme and language support

### Critical Verification Points

**Before Implementation, Developer Must Verify**:

1. **Design System Token Values**:

   - Colors: #FFFFFF, #F9FAFB, #23272F, #71717A, #6366F1, #E5E7EB (from docs/design-system/designs-systems.md:27-47)
   - Spacing: 8px, 16px, 24px, 32px, 40px units (from docs/design-system/designs-systems.md:49-54)
   - Border radius: 16px (cards), 12px (input/cards), 8px (buttons) (from docs/design-system/designs-systems.md:58)
   - Typography: 18px base, 16px small, 1.6 line-height (from docs/design-system/designs-systems.md:56-58)

2. **Target Screenshot Reference**:

   - Empty state: `docs/Screenshot 2025-11-11 011600.png`
   - Active chat: `docs/Screenshot 2025-11-11 011649.png`
   - Current design (to be replaced): `docs/our-chat-design.png`

3. **All Message Type Classes Exist in TypeScript**:

   - `getMessageClass()` generates: `.message-user`, `.message-assistant`, `.message-system`, `.message-tool`
   - Subtypes: `.message-status`, `.message-success`, `.message-error`, `.message-tool-execution`
   - Verified: research-chat.component.ts:422-430

4. **No Breaking Changes to HTML/TypeScript**:

   - HTML structure unchanged (verified: research-chat.component.html)
   - TypeScript logic unchanged (verified: research-chat.component.ts)
   - Only CSS classes and styling modified

5. **Accessibility Baseline**:
   - Semantic HTML already present (headings, form, labels)
   - Focus states must be visible after implementation
   - Color contrast must meet WCAG AA (4.5:1 for normal text)

### Git Commit Strategy (Per Phase)

**Phase 1 Commit**:

```
feat(research-chat): remove purple gradients and implement white background

- Remove linear-gradient backgrounds from container and messages
- Set pure white (#FFFFFF) background for main container
- Implement centered 800px max-width layout
- Update message spacing to 32-40px vertical gaps
- Remove colored header styling
```

**Phase 2 Commit**:

```
feat(research-chat): redesign message styles per design system

- User messages: light gray background (#F9FAFB), right-aligned
- Assistant messages: transparent with left accent border
- Tool messages: subtle card with border and minimal shadow
- Status messages: transparent, italic, muted color
- System messages: centered, transparent, no background
- Success/error: light colored backgrounds with accent borders
- Update message header and metadata styling
```

**Phase 3 Commit**:

```
feat(research-chat): redesign input area with sticky positioning

- Implement sticky bottom positioning with white background
- Add centered max-width wrapper (800px)
- Update focus state with accent color border and glow
- Redesign send button with solid accent color
- Remove gradients from input area
```

**Phase 4 Commit**:

```
feat(research-chat): add responsive design and polish animations

- Refine message slide-in animation for subtlety
- Update scrollbar colors to design system
- Add tablet breakpoint (768px) with reduced padding
- Add mobile breakpoint (480px) with compact sizing
- Enable smooth scroll behavior
```

**Phase 5 Commit**:

```
feat(research-chat): integrate markdown rendering with syntax highlighting

- Install ngx-markdown, marked, and prismjs dependencies
- Configure provideMarkdown() in application config
- Update component to use markdown pipe for message content
- Add markdown styling (headings, lists, code blocks, tables)
- Configure Prism.js syntax highlighting for code blocks
- Add performance optimization with debouncing for streaming
- Implement design system styling for all markdown elements
```

**Phase 6 Commit**:

```
feat(research-chat): update approval modal to match design system

- Remove gradient from modal header, use white background
- Update close button styling with light gray background
- Replace gradient action buttons with solid colors
- Approve button: accent color (#6366F1)
- Reject button: solid red (#EF4444)
```

### Architecture Delivery Checklist

- [x] **Component architecture specified** - SCSS rewrite strategy with design system tokens
- [x] **All patterns verified from design specs** - All styles extracted from docs/RESEARCH_CHAT_REDESIGN_TASK.md
- [x] **All design tokens documented** - From docs/design-system/designs-systems.md
- [x] **Quality requirements defined** - Visual, functional, accessibility for each phase
- [x] **Integration points documented** - No integrations (CSS-only changes)
- [x] **Files affected list complete** - 2 files: research-chat.component.scss, approval-modal.component.ts
- [x] **Developer type recommended** - frontend-developer (CSS expertise required)
- [x] **Complexity assessed** - MEDIUM (6-8 hours, systematic SCSS rewrite)
- [x] **No step-by-step implementation** - Architecture provides WHAT/WHY, team-leader creates HOW

---

## 📚 Reference Documentation

### Design Specifications

**Primary Specification**:

- `docs/RESEARCH_CHAT_REDESIGN_TASK.md` - Complete task specification with SCSS samples

**Design System Reference**:

- `docs/design-system/designs-systems.md` - Design tokens, typography, color palette, spacing

**Target Screenshots**:

- `docs/Screenshot 2025-11-11 011600.png` - Initial empty state (clean white background, minimal input)
- `docs/Screenshot 2025-11-11 011649.png` - Active chat with messages (whitespace-heavy, minimal chrome)

**Current Design (To Be Replaced)**:

- `docs/our-chat-design.png` - Current purple gradient design (shows what to remove)

### Current Implementation Files

**Component Files**:

- `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.scss` - SCSS file to rewrite (256 lines)
- `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.html` - HTML template (unchanged)
- `apps/dev-brand-ui/src/app/features/research-chat/research-chat.component.ts` - TypeScript logic (unchanged)

**Modal Component**:

- `apps/dev-brand-ui/src/app/features/research-chat/components/approval-modal.component.ts` - Modal with inline styles to update

### Design System Token Reference

**Colors** (from docs/design-system/designs-systems.md:27-47):

```scss
Background: #FFFFFF (white), #F9FAFB (ultra-light gray)
Text: #23272F (primary), #71717A (muted)
Accent: #6366F1 (primary), #4F46E5 (hover)
Border: #E5E7EB (subtle gray)
```

**Spacing** (from docs/design-system/designs-systems.md:49-54):

```scss
8px (1x), 16px (2x), 24px (3x), 32px (4x), 40px (5x)
```

**Typography** (from docs/design-system/designs-systems.md:56-58):

```scss
Font Family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
Font Size: 18px (base), 16px (small), 14px (tiny)
Line Height: 1.6 (relaxed)
```

**UI Elements** (from docs/design-system/designs-systems.md:58-64):

```scss
Border Radius: 16px (cards), 12px (input/cards), 8px (buttons)
Card Shadow: 0 4px 32px rgba(0,0,0,0.04)
Button Padding: 16px 32px (large), 12px 24px (medium)
```

---

## ✅ Success Criteria

### Visual Success Criteria

Implementation is successful when:

1. **No purple visible anywhere** - All gradients removed, white/gray backgrounds applied
2. **Message spacing correct** - DevTools shows 32-40px vertical gaps between messages
3. **Design system alignment** - All colors, fonts, spacing match specified tokens
4. **Target screenshot match** - Side-by-side comparison shows 95%+ visual similarity
5. **Professional appearance** - Clean, modern, minimalist aesthetic achieved

### Functional Success Criteria

Implementation is successful when:

1. **Responsive design verified** - Works correctly at mobile (480px), tablet (768px), desktop (1200px+)
2. **Smooth interactions** - Animations subtle (0.3s), scroll smooth, focus states clear
3. **All message types rendered** - User, assistant, system, tool, status, success, error display correctly
4. **Input area functional** - Sticky positioning works, focus state visible, button states clear
5. **Modal updated** - Approval modal matches design system (white header, solid button colors)

### Accessibility Success Criteria

Implementation is successful when:

1. **Color contrast passes** - Automated tool (axe DevTools) shows no contrast violations
2. **Focus indicators visible** - Tab through all elements, focus visible at each stop
3. **Zoom test passes** - Text readable at 200% zoom, no horizontal scroll, no truncation
4. **Semantic HTML preserved** - Screen reader announces elements correctly

### Performance Success Criteria

Implementation is successful when:

1. **Rendering performance maintained/improved** - No janky scrolling with 50+ messages
2. **Animation performance smooth** - 60fps animation on modern devices
3. **Paint complexity reduced** - Removed gradients improve paint performance

---

## 🚀 Ready for Team-Leader Decomposition

This architecture specification provides:

- **WHAT to build**: Complete SCSS redesign with 5 phases
- **WHY these decisions**: All patterns extracted from design specifications
- **WHERE to implement**: 2 files identified with line-level guidance
- **QUALITY requirements**: Visual, functional, accessibility, performance criteria per phase
- **VERIFICATION methods**: Testing strategy, acceptance criteria mapping, checkpoints

**Next Steps for Team-Leader**:

1. Read this implementation plan
2. Decompose into atomic, git-verifiable tasks (5 phases → 5-8 tasks)
3. Create tasks.md with step-by-step execution plan
4. Assign tasks to frontend-developer with git verification after each commit
5. Validate completion against acceptance criteria after all phases complete

**Architecture Complete** ✅
