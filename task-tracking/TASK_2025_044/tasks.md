# Development Tasks - TASK_2025_044

**Task Type**: Frontend (UI Redesign)
**Developer Needed**: frontend-developer (all tasks)
**Total Tasks**: 6
**Decomposed From**:

- implementation-plan.md (6-phase architecture)
- context.md (user requirements)
- docs/RESEARCH_CHAT_REDESIGN_TASK.md (design specifications)

---

## Task Breakdown

### Task 1: Phase 1 - Layout & Structure (Background Removal, Container Setup, Spacing) ✅ COMPLETE

**Assigned To**: frontend-developer
**Estimated Effort**: 1-2 hours
**Git Commit**: 4020f64 - "feat(research-chat): remove purple gradients and implement white background"
**Completed**: 2025-01-11
**Files**:

- MODIFY: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\research-chat.component.scss (lines 1-40)

**Implementation Details**:

1. **Container background removal** (Line 7):

   - REMOVE: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
   - REPLACE: `background: #FFFFFF;` (pure white)

2. **Chat messages container** (Lines 32-40):

   - REMOVE: `background: rgba(255, 255, 255, 0.05);`
   - REPLACE: `background: transparent;`
   - UPDATE: `max-width: 800px;` (centered content)
   - UPDATE: `margin: 0 auto;` (center alignment)
   - UPDATE: `padding: 80px 24px 120px;` (top space for header, bottom for input)

3. **Message spacing** (Line 38):

   - REMOVE: `gap: 1.5rem;` (24px)
   - REPLACE: `gap: 32px;` or `gap: 40px;` (per spec)

4. **Header redesign** (Lines 12-30):
   - RECOMMENDATION: Remove header completely (cleaner, matches target screenshots)
   - ALTERNATIVE: Keep fixed header with transparent background + backdrop blur

**Design System Tokens to Use**:

```scss
// Colors
$bg-white: #ffffff;
$bg-light-gray: #f9fafb;
$text-primary: #23272f;
$text-muted: #71717a;
$accent-primary: #6366f1;
$border-subtle: #e5e7eb;

// Spacing Units (8px base)
$spacing-1x: 8px;
$spacing-2x: 16px;
$spacing-3x: 24px;
$spacing-4x: 32px;
$spacing-5x: 40px;
```

**Verification Requirements**:

- [ ] Background must be pure white (#FFFFFF) with NO gradients
- [ ] Container max-width exactly 800px, centered
- [ ] Vertical spacing between messages exactly 32-40px
- [ ] Top/bottom padding sufficient for header/input area
- [ ] Visual inspection: No purple visible anywhere
- [ ] Measure spacing: Browser DevTools shows 32-40px gaps
- [ ] Responsive test: Container stays centered at all screen sizes
- [ ] Git commit: "feat(research-chat): remove purple gradients and implement white background"

**Git Verification**:

```bash
git log --oneline -1
# Expected: "feat(research-chat): remove purple gradients and implement white background"
```

---

### Task 2: Phase 2 - Message Styles (All Message Type Styles) ✅ COMPLETE

**Assigned To**: frontend-developer
**Estimated Effort**: 2-3 hours
**Git Commit**: 7761a9d - "feat(angular-3d): redesign message styles per design system"
**Completed**: 2025-01-11
**Files**:

- MODIFY: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\research-chat.component.scss (lines 42-143)

**Implementation Details**:

**2.1 Base Message Styles** (Lines 42-47):

- Padding: 16px 24px
- Border radius: 16px
- Animation: messageSlideIn 0.3s ease-out
- Font size: 18px
- Line height: 1.6
- Max width: 80%
- Box shadow: none

**2.2 User Messages** (Lines 49-53):

- Align: Right (flex-end)
- Background: #F9FAFB (light gray)
- Color: #23272F (primary text)
- Margin bottom: 32px
- **NO GRADIENT, NO PURPLE**

**2.3 Assistant Messages** (Lines 55-77):

- Align: Left (flex-start)
- Background: transparent
- Color: #23272F
- Padding: 16px 0 (vertical only)
- Border left: 3px solid #6366F1 (accent border)
- Padding left: 20px (indent from border)
- Margin bottom: 32px

**2.4 Assistant Message Subtypes**:

**Status messages** (lines 60-64):

- Background: transparent (NOT colored)
- Color: #71717A (muted)
- Padding: 8px 0
- Margin bottom: 16px (less than normal)
- Font size: 16px
- Font style: italic
- Display: flex with icon

**Success messages** (lines 66-70):

- Background: #F0FDF4 (very light green)
- Color: #23272F
- Border left: 4px solid #86EFAC
- Padding left: 20px

**Error messages** (lines 72-76):

- Background: #FEF2F2 (very light red)
- Color: #23272F
- Border left: 4px solid #FCA5A5
- Padding left: 20px

**2.5 Tool Execution Messages** (NEW implementation):

- Background: #F9FAFB
- Border: 1px solid #E5E7EB
- Border radius: 12px
- Padding: 16px 20px
- Margin bottom: 32px
- Font size: 16px
- Color: #71717A

**2.6 System Messages** (Lines 79-86):

- Align: center
- Background: transparent
- Border: none
- Color: #71717A (muted)
- Font size: 16px
- Font weight: 400
- Padding: 16px 24px
- Margin: 40px auto
- Max width: 600px
- Text align: center

**2.7 Message Header & Metadata** (Lines 89-128):

- Refactor for minimal design
- Border bottom: 1px solid #E5E7EB (not rgba)
- Message role: No colored text, use #23272F
- Message time: #71717A (not opacity)
- Metadata: #71717A (not accent color)

**2.8 Loading Indicator** (Lines 130-143):

- Color: #71717A (not accent color)
- Keep dots animation

**Verification Requirements**:

- [ ] User messages: Light gray background (#F9FAFB), right-aligned, 18px text
- [ ] Assistant messages: Transparent background, left accent border, 18px text
- [ ] Tool messages: Subtle card with border, 16px text
- [ ] Status messages: Transparent, italic, muted color, 16px text
- [ ] System messages: Centered, transparent, muted, 16px text
- [ ] Success/error: Light colored backgrounds with border-left accent
- [ ] NO purple anywhere, NO heavy shadows
- [ ] Render all message types, verify visual appearance matches spec
- [ ] Measure font sizes, padding, margins with DevTools
- [ ] Verify status messages are visually distinct but minimal
- [ ] Confirm tool execution messages have subtle card appearance
- [ ] Git commit: "feat(research-chat): redesign message styles per design system"

**Git Verification**:

```bash
git log --oneline -1
# Expected: "feat(research-chat): redesign message styles per design system"
```

---

### Task 3: Phase 3 - Input Area (Sticky Positioning, Focus States, Action Icons) ✅ COMPLETE

**Assigned To**: frontend-developer
**Estimated Effort**: 1 hour
**Git Commit**: cab74cb
**Files**:

- MODIFY: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\research-chat.component.scss (lines 145-208)

**Implementation Details**:

**3.1 Input Container** (Lines 145-150):

- Position: sticky (already present)
- Bottom: 0
- Background: #FFFFFF (white, not semi-transparent)
- Border top: 1px solid #E5E7EB
- Padding: 20px 24px
- Z-index: 100

**3.2 Input Form & Wrapper** (NEW structure):

- Max-width: 800px (match message container)
- Margin: 0 auto (center within sticky container)
- Display: flex
- Align items: center
- Gap: 12px
- Background: #F9FAFB
- Border: 1px solid #E5E7EB
- Border radius: 12px
- Padding: 12px 16px
- Transition: border-color 0.2s, box-shadow 0.2s
- Focus-within: Border #6366F1, box-shadow accent glow

**3.3 Action Icons** (NEW - CSS preparation):

- Display: flex
- Gap: 8px
- Button: transparent background, #71717A color
- Hover: #E5E7EB background, #23272F color

**3.4 Text Input** (Lines 157-181):

- Flex: 1
- Border: none
- Background: transparent
- Font size: 16px
- Color: #23272F
- Outline: none
- Placeholder: #9CA3AF
- Disabled: opacity 0.6

**3.5 Send Button** (Lines 183-208):

- Background: #6366F1 solid color (NO GRADIENT)
- Color: white
- Border: none
- Border radius: 8px
- Padding: 10px 20px
- Font size: 1.5rem
- Font weight: 500
- Cursor: pointer
- Transition: background 0.2s, transform 0.1s
- Box shadow: none (remove heavy shadow)
- Hover: background #4F46E5, transform translateY(-1px)
- Active: transform translateY(0)
- Disabled: background #D1D5DB (gray), cursor not-allowed

**Verification Requirements**:

- [x] Input container: Sticky bottom, white background, subtle top border
- [x] Input wrapper: Centered 800px max-width, light gray background, 12px radius
- [x] Focus state: Accent color border + subtle shadow glow
- [x] Text input: 16px font, transparent background, placeholder visible
- [x] Send button: Solid accent color, 8px radius, NO gradient, NO heavy shadow
- [x] Button disabled state: Gray background (not opacity)
- [x] Input area remains visible when scrolling (sticky)
- [x] Focus state shows accent border and glow
- [x] Button hover provides subtle feedback (1px lift, color change)
- [x] Disabled state clearly shows gray, not purple
- [x] Input width matches message container (800px)
- [x] Git commit: "feat(angular-3d): redesign input area with sticky positioning"

**Git Verification**:

```bash
git log --oneline -1
# Expected: "feat(research-chat): redesign input area with sticky positioning"
```

---

### Task 4: Phase 4 - Polish & Responsive (Animations, Breakpoints, Scrollbar) ⏸️ PENDING

**Assigned To**: frontend-developer
**Estimated Effort**: 1-2 hours
**Files**:

- MODIFY: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\research-chat.component.scss (lines 210-236, ADD responsive at end)

**Implementation Details**:

**4.1 Animation Refinement** (Lines 210-236):

**Message slide-in** - ADJUST for subtlety:

- From: opacity 0, translateY(5px) [reduced from 10px]
- To: opacity 1, translateY(0)
- Duration: 0.3s ease-out

**Loading dots** - KEEP as is (lines 221-236)

**4.2 Scrollbar Styling** (Lines 238-255):

- Width: 8px
- Track: #F9FAFB
- Thumb: #E5E7EB
- Thumb hover: #71717A

**4.3 Responsive Design** (NEW - add at end):

**Tablet breakpoint (768px)**:

```scss
@media (max-width: 768px) {
  .chat-messages {
    padding: 60px 16px 100px;
  }
  .research-chat-container {
    max-width: 100%;
  }
  .message-user,
  .message-assistant {
    max-width: 100%;
    font-size: 16px;
  }
  .chat-input-container {
    padding: 12px 16px;
  }
}
```

**Mobile breakpoint (480px)**:

```scss
@media (max-width: 480px) {
  .chat-messages {
    padding: 40px 16px 80px;
  }
  .message,
  .message-user,
  .message-assistant {
    padding: 12px 16px;
    font-size: 15px;
  }
  .message-system {
    font-size: 14px;
    padding: 16px;
  }
  .chat-input-form {
    padding: 8px 12px;
  }
  .chat-input {
    font-size: 15px;
  }
  .send-button {
    padding: 8px 16px;
    font-size: 1.25rem;
  }
}
```

**4.4 Smooth Scroll Behavior**:

- Add `scroll-behavior: smooth;` to `.chat-messages`

**Verification Requirements**:

- [ ] Animation duration: 0.3s (per spec)
- [ ] Animation movement: Subtle (5px translateY)
- [ ] Scrollbar colors: Design system grays (#F9FAFB, #E5E7EB, #71717A)
- [ ] Tablet (768px): Reduced padding, full-width messages, 16px text
- [ ] Mobile (480px): Further reduced padding, 15px text, smaller button
- [ ] Smooth scroll behavior maintained
- [ ] Messages animate in subtly (not jarring)
- [ ] Scrollbar visible and matches design system colors
- [ ] Tablet view: Messages full-width, readable font
- [ ] Mobile view: Comfortable padding, readable text, usable button
- [ ] Smooth scrolling works when new messages appear
- [ ] Git commit: "feat(research-chat): add responsive design and polish animations"

**Git Verification**:

```bash
git log --online -1
# Expected: "feat(research-chat): add responsive design and polish animations"
```

---

### Task 5: Phase 5 - Markdown Rendering Integration ⏸️ PENDING

**Assigned To**: frontend-developer
**Estimated Effort**: 2-3 hours
**Files**:

- MODIFY: D:\projects\nestjs-ai-saas-starter\package.json (ADD dependencies)
- MODIFY: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\app.config.ts (ADD provideMarkdown)
- MODIFY: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\research-chat.component.ts (import MarkdownModule)
- MODIFY: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\research-chat.component.html (add markdown pipe)
- MODIFY: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\research-chat.component.scss (ADD markdown styling)
- MODIFY: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\styles.scss (ADD Prism.js imports)

**Implementation Details**:

**5.1 Check/Install Package Dependencies**:

```bash
npm install ngx-markdown marked prismjs
npm install --save-dev @types/prismjs
```

**5.2 Global Configuration** (app.config.ts):

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

```html
<!-- Before: Plain text rendering -->
<div class="message-content">{{ message.content }}</div>

<!-- After: Markdown rendering -->
<div class="message-content" [innerHTML]="message.content | markdown"></div>
```

**5.5 Prism.js Syntax Highlighting Setup** (styles.scss):

```scss
// Import Prism.js theme
@import 'prismjs/themes/prism-okaidia.css'; // Dark theme (recommended)

// Import Prism.js core languages
@import 'prismjs/components/prism-typescript';
@import 'prismjs/components/prism-javascript';
@import 'prismjs/components/prism-python';
@import 'prismjs/components/prism-bash';
@import 'prismjs/components/prism-json';
```

**5.6 Markdown Styling** (research-chat.component.scss):

Add comprehensive markdown styles:

- Headings (h1-h6): Design system colors, proper spacing
- Paragraphs: Line height 1.6, proper margins
- Lists (ul, ol): Proper indentation, spacing
- Links: Accent color, hover underline
- Code blocks (pre): Light gray background, border, scrollable
- Inline code: Light gray background, proper padding
- Blockquotes: Left accent border, italic, muted color
- Tables: Full width, bordered, hover state
- Horizontal rules: Subtle border

**5.7 Performance Optimization**:

```typescript
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

// In component (for streaming messages)
renderedContent$ = this.message.content$.pipe(
  debounceTime(100), // Render every 100ms during streaming
  distinctUntilChanged(),
  map((content) => content)
);
```

**5.8 Security Configuration**:

- ngx-markdown has built-in XSS protection via Angular DomSanitizer
- Default configuration is secure (no additional config needed)

**Verification Requirements**:

- [ ] Markdown rendering: Bold, italic, lists, links, headings render correctly
- [ ] Code blocks: Syntax highlighting works for TypeScript, JavaScript, Python, Bash, JSON
- [ ] Security: XSS protection enabled (default), safe for user-generated content
- [ ] Performance: Streaming messages render smoothly with 100ms debounce
- [ ] Styling: All markdown elements match design system (colors, spacing, typography)
- [ ] Bundle size: Total addition ~35-50KB gzipped (acceptable)
- [ ] Test markdown rendering: **bold**, _italic_, `code`, lists, headings
- [ ] Test code blocks with syntax highlighting: TypeScript, JavaScript, Python
- [ ] Test tables: Render correctly with design system styling
- [ ] Test links: Accent color, hover state with underline
- [ ] Performance test: Stream 5000+ characters of markdown, verify smooth rendering
- [ ] Security test: Inject malicious HTML/script tags, verify sanitization
- [ ] Bundle size: Verify total bundle increase <60KB
- [ ] Git commit: "feat(research-chat): integrate markdown rendering with syntax highlighting"

**Git Verification**:

```bash
git log --oneline -1
# Expected: "feat(research-chat): integrate markdown rendering with syntax highlighting"
```

---

### Task 6: Phase 6 - Approval Modal Redesign ⏸️ PENDING

**Assigned To**: frontend-developer
**Estimated Effort**: 0.5-1 hour
**Files**:

- MODIFY: D:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\components\approval-modal.component.ts (inline styles, lines 52-251)

**Implementation Details**:

**6.1 Modal Header** (Line 87):

- Padding: 1.5rem 2rem
- Border bottom: 1px solid #E5E7EB (not 2px)
- Display: flex
- Justify content: space-between
- Align items: center
- Background: #FFFFFF (NOT gradient)
- Border radius: 16px 16px 0 0

Header h2:

- Margin: 0
- Font size: 1.5rem
- Font weight: 700
- Color: #23272F (NOT white)

Close button:

- Background: #F9FAFB (NOT semi-transparent white)
- Border: none
- Color: #23272F (NOT white)
- Font size: 1.5rem
- Width: 40px
- Height: 40px
- Border radius: 8px
- Cursor: pointer
- Transition: all 0.2s ease
- Hover: background #E5E7EB, transform rotate(90deg)

**6.2 Modal Content** (Line 70):

- Background: white
- Border radius: 16px
- Width: 90%
- Max-width: 900px
- Max-height: 90vh
- Display: flex
- Flex direction: column
- Box shadow: 0 4px 32px rgba(0, 0, 0, 0.04) [design system shadow]
- Animation: slideUp 0.3s ease-out

**6.3 Action Buttons** (Lines 195-211):

.btn-reject:

- Background: #EF4444 (solid red, NOT gradient)
- Color: white
- Hover: background #DC2626

.btn-approve:

- Background: #6366F1 (accent color, NOT green gradient)
- Color: white
- Hover: background #4F46E5

**Verification Requirements**:

- [ ] Modal header: White background (not gradient), dark text
- [ ] Close button: Light gray background (not semi-transparent)
- [ ] Action buttons: Solid colors (not gradients)
- [ ] Approve button: Accent color (#6366F1), not green
- [ ] Reject button: Solid red (#EF4444)
- [ ] Shadow: Subtle design system shadow
- [ ] Modal opens with white header, dark text
- [ ] Close button is light gray, hovers to darker gray
- [ ] Approve button is accent blue, not green
- [ ] No gradients visible anywhere in modal
- [ ] Git commit: "feat(research-chat): update approval modal to match design system"

**Git Verification**:

```bash
git log --oneline -1
# Expected: "feat(research-chat): update approval modal to match design system"
```

---

## Verification Protocol

**After Each Task Completion**:

1. Developer updates task status to "✅ COMPLETE"
2. Developer adds git commit SHA
3. Team-leader verifies:
   - `git log --oneline -1` matches expected commit pattern
   - `Read([file-path])` confirms changes exist
   - Visual testing (if applicable)
4. If verification passes: Assign next task
5. If verification fails: Mark task as "❌ FAILED", escalate to user

---

## Completion Criteria

**All tasks complete when**:

- All 6 task statuses are "✅ COMPLETE"
- All git commits verified
- All files modified correctly
- Visual testing confirms design matches specifications
- Responsive testing passes (mobile, tablet, desktop)
- Accessibility testing passes (WCAG AA)
- Markdown rendering works correctly with syntax highlighting

**Return to orchestrator with**: "All 6 tasks completed and verified ✅"

---

## Design System Reference

**Colors**:

- Background: #FFFFFF (white), #F9FAFB (ultra-light gray)
- Text: #23272F (primary), #71717A (muted)
- Accent: #6366F1 (primary), #4F46E5 (hover)
- Border: #E5E7EB (subtle gray)
- Success: #F0FDF4 (bg), #86EFAC (border)
- Error: #FEF2F2 (bg), #FCA5A5 (border)

**Spacing Units (8px base)**:

- 8px (1x), 16px (2x), 24px (3x), 32px (4x), 40px (5x)

**Typography**:

- Font Family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- Font Size: 18px (base), 16px (small), 14px (tiny)
- Line Height: 1.6 (relaxed)

**UI Elements**:

- Border Radius: 16px (cards), 12px (input/cards), 8px (buttons)
- Card Shadow: 0 4px 32px rgba(0,0,0,0.04)
- Button Padding: 16px 32px (large), 12px 24px (medium)

---

## Reference Documentation

**Primary Files**:

- Design system: docs/design-system/designs-systems.md
- Task specification: docs/RESEARCH_CHAT_REDESIGN_TASK.md
- Implementation plan: task-tracking/TASK_2025_044/implementation-plan.md

**Target Screenshots**:

- Empty state: docs/Screenshot 2025-11-11 011600.png
- Active chat: docs/Screenshot 2025-11-11 011649.png
- Current design (to be replaced): docs/our-chat-design.png
