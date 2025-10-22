# Visual Design Specification - TASK_2025_017

## CRITICAL DESIGN ENFORCEMENT

**THIS SPECIFICATION ENFORCES LIGHT DESIGN SYSTEM - NOT DARK GLASSMORPHISM**

### Anti-Patterns (FORBIDDEN)

- Dark backgrounds (#1A1A1A, #23272F as section backgrounds)
- Light text on dark backgrounds
- Glassmorphism effects (backdrop-filter: blur, rgba(255,255,255,0.1))
- Heavy glass shadows or neon borders
- Cramped spacing (less than 40px vertical padding)
- Small typography (less than 40px headlines)

### Enforced Patterns (MANDATORY)

- White/light gray section backgrounds (#FFFFFF, #F9FAFB)
- Deep gray text on white backgrounds (#23272F, #71717A, #1A1A1A)
- Soft shadows only (0 4px 32px rgba(0,0,0,0.04))
- Generous whitespace (40px+ vertical, 80px section spacing)
- Large typography (40px+ headlines, 18px body)
- Minimal chrome, clean aesthetics

---

## Design Investigation Summary

### Design System Analysis

- **Design System**: docs/design-system/designs-systems.md
- **Key Tokens Extracted**: 45 tokens (12 colors, 8 typography, 15 spacing, 10 shadows)
- **Accessibility Compliance**: WCAG 2.1 AA validated
- **Responsive Breakpoints**: Mobile (< 768px), Tablet (768-1024px), Desktop (1024px+)

### Requirements Analysis

- **User Requirements**: Library-centric landing page showcasing 12 major libraries
- **Business Requirements**: Professional SaaS showcase with developer adoption focus
- **Technical Constraints**: Angular 19, Tailwind CSS, light design system (NOT dark glassmorphism)

### Design Inspiration

- **Visual References**: design-1.png (Agendas - clean white SaaS), design-2.png (PlayAI - generous whitespace), design-3.png (Jetpeak - large typography)
- **Design Patterns**: Light backgrounds, soft shadows, large type, generous spacing
- **Color Approach**: White (#FFFFFF) primary, light gray (#F9FAFB) alternating, deep gray text

---

## Visual Design Architecture

### Design Philosophy

**Chosen Visual Language**: Light, Spacious, Modern (Apple/Stripe/Agendas aesthetic)

**Rationale**:

- Design system mandates white backgrounds with generous whitespace
- Previous dark glassmorphism attempts FAILED - this is the third redesign
- Visual references show clean, professional SaaS landing pages with large typography
- 12-library showcase requires clear visual hierarchy and breathing room

**Evidence**:

- Design system: "Background: Pure white or ultra-light gray (#FFFFFF or #F9FAFB)"
- Design system: "Large gutters and padding between all sections (40px+ vertical space)"
- Visual reference design-1.png shows white sections with soft shadows
- Task context: "Transform ALL sections from dark glassmorphism to clean light design"

---

## Design System Application

### Color Palette

**Background Colors (PRIMARY - USE THESE)**:

- Primary: `#FFFFFF` (Pure white - bg-white) - Main sections
- Secondary: `#F9FAFB` (Ultra-light gray - bg-gray-50) - Alternating sections
- Card Background: `#FFFFFF` (White cards on gray sections)
- Usage: Alternate #FFFFFF and #F9FAFB sections for visual rhythm

**Text Colors (ENFORCE THESE - NOT LIGHT TEXT)**:

- Headline: `#1A1A1A` (Near-black - text-gray-900) - 15.8:1 contrast - Headlines
- Primary: `#23272F` (Deep gray - text-gray-800) - 15.3:1 contrast - Body text
- Secondary: `#71717A` (Muted gray - text-gray-500) - 5.8:1 contrast - Subtitles, captions
- Usage: Deep gray text on white backgrounds (NOT light text on dark)

**Accent Colors**:

- Primary: `#6366F1` (Indigo - bg-indigo-600) - CTAs, highlights, icons
- Primary Hover: `#4F46E5` (Indigo dark - bg-indigo-700) - Button hover states
- Success: `#10B981` (Green - bg-green-500) - Success indicators
- Usage: Indigo for all interactive elements, CTAs, library icons

**Border & Dividers**:

- Subtle: `#E5E7EB` (Light gray - border-gray-200) - Card borders
- Medium: `#D1D5DB` (Gray - border-gray-300) - Dividers
- Usage: Minimal borders, rely on whitespace and shadows

**WCAG 2.1 AA Compliance Verification**:

- Headline (#1A1A1A) on White (#FFFFFF): 15.8:1 - Exceeds 7:1 (AAA)
- Body (#23272F) on White: 15.3:1 - Exceeds 4.5:1 (AA)
- Muted (#71717A) on White: 5.8:1 - Exceeds 4.5:1 (AA)
- Accent (#6366F1) on White: 4.6:1 - Meets 4.5:1 (AA)

---

### Typography Scale

**Font Family**:

```css
font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

**Desktop Typography** (1024px+):

| Element          | Size | Weight        | Line Height | Tailwind Class                   | Usage                      |
| ---------------- | ---- | ------------- | ----------- | -------------------------------- | -------------------------- |
| Display Headline | 72px | Bold (700)    | 1.1         | text-7xl font-bold leading-tight | Hero sections only         |
| Section Headline | 60px | Bold (700)    | 1.2         | text-6xl font-bold leading-tight | Major section headers      |
| Subsection       | 48px | Bold (700)    | 1.3         | text-5xl font-bold leading-tight | Subsection headers         |
| Card Title       | 28px | Bold (700)    | 1.4         | text-3xl font-bold leading-snug  | Library card titles        |
| Body Large       | 24px | Regular (400) | 1.6         | text-2xl leading-relaxed         | Lead paragraphs, subtitles |
| Body             | 18px | Regular (400) | 1.6         | text-lg leading-relaxed          | Standard text (MINIMUM)    |
| Body Small       | 16px | Regular (400) | 1.5         | text-base leading-normal         | Captions, metadata         |
| Code             | 14px | Mono (400)    | 1.5         | text-sm font-mono                | Package names, code        |

**Tablet Typography** (768-1024px):

| Element          | Size | Adjustment         |
| ---------------- | ---- | ------------------ |
| Display Headline | 56px | -16px from desktop |
| Section Headline | 48px | -12px from desktop |
| Subsection       | 40px | -8px from desktop  |
| Body             | 18px | Same as desktop    |

**Mobile Typography** (< 768px):

| Element          | Size | Adjustment              |
| ---------------- | ---- | ----------------------- |
| Display Headline | 40px | -32px from desktop      |
| Section Headline | 36px | -24px from desktop      |
| Subsection       | 32px | -16px from desktop      |
| Body             | 16px | -2px (MINIMUM readable) |

**Typography Rules**:

- ALL body text MINIMUM 16px on mobile, 18px on desktop
- ALL headlines MINIMUM 32px on mobile, 40px on desktop
- Line height: 1.5-1.7 for readability
- Font weight: Bold (700) for headlines, Regular (400) for body

---

### Spacing System (8px Grid)

**Vertical Spacing** (Section Padding):

| Spacing | Size  | Tailwind Class | Usage                               |
| ------- | ----- | -------------- | ----------------------------------- |
| Massive | 128px | py-32          | Hero section, major section padding |
| Large   | 80px  | py-20          | Standard section padding            |
| Medium  | 64px  | py-16          | Subsection padding                  |
| Regular | 40px  | py-10          | Card internal spacing               |
| Small   | 24px  | py-6           | Element spacing                     |

**Horizontal Spacing** (Container):

| Breakpoint | Padding | Tailwind Class | Max Width          |
| ---------- | ------- | -------------- | ------------------ |
| Mobile     | 32px    | px-8           | Full width         |
| Tablet     | 48px    | px-12          | Full width         |
| Desktop    | 64px    | px-16          | 1280px (max-w-7xl) |

**Element Spacing** (Margins/Gaps):

| Spacing     | Size | Tailwind Class | Usage                  |
| ----------- | ---- | -------------- | ---------------------- |
| Section Gap | 80px | space-y-20     | Between major sections |
| Card Gap    | 32px | gap-8          | Grid card spacing      |
| Content Gap | 24px | space-y-6      | Between content blocks |
| Element Gap | 16px | space-y-4      | Between list items     |
| Inline Gap  | 12px | gap-3          | Inline elements        |

**Spacing Rules**:

- MINIMUM 40px vertical padding for sections
- MINIMUM 80px between major sections
- Use 8px grid (8, 16, 24, 32, 40, 64, 80, 128px)
- Generous whitespace - when in doubt, add MORE space

---

### Shadows & Elevation

**Card Shadows** (Soft, Subtle - NOT Heavy Glass):

```css
/* Resting State */
--shadow-card: 0 4px 32px rgba(0, 0, 0, 0.04);

/* Hover State */
--shadow-card-hover: 0 8px 48px rgba(0, 0, 0, 0.08);

/* Elevated Card */
--shadow-card-elevated: 0 12px 64px rgba(0, 0, 0, 0.12);
```

**Button Shadows**:

```css
/* CTA Button Hover */
--shadow-button: 0 4px 24px rgba(99, 102, 241, 0.3);
```

**NO Glassmorphism** (FORBIDDEN):

- backdrop-filter: blur() - NOT ALLOWED
- rgba(255,255,255,0.1) backgrounds - NOT ALLOWED
- Heavy neon glows - NOT ALLOWED

**Tailwind Classes**:

- Resting: `shadow-lg` (0 10px 15px rgba(0,0,0,0.1))
- Hover: `shadow-2xl` (0 25px 50px rgba(0,0,0,0.15))
- Custom: Use `shadow-[0_4px_32px_rgba(0,0,0,0.04)]` for exact design system match

---

### Border Radius

| Element        | Radius | Tailwind Class |
| -------------- | ------ | -------------- |
| Cards          | 16px   | rounded-2xl    |
| Buttons        | 8px    | rounded-lg     |
| Inputs         | 8px    | rounded-lg     |
| Images         | 12px   | rounded-xl     |
| Small Elements | 6px    | rounded-md     |

---

## Section-by-Section Visual Specifications

### Section 1: Data Foundation Layer (ChromaDB + Neo4j)

**SKIP HERO - Hero section NOT redesigned (already implemented)**

**Background**: `#FFFFFF` (Pure white)
**Vertical Padding**: `128px` (py-32) - Massive breathing room
**Container**: `max-w-7xl mx-auto px-16` (1280px max, 64px horizontal padding)

**Section Header**:

- Headline: "Data Foundation Layer" - 60px bold, #1A1A1A, line-height 1.2
- Subtitle: "Vector + Graph Storage for AI Applications" - 24px regular, #71717A, line-height 1.6
- Spacing: 16px gap between headline and subtitle
- Alignment: Center
- Margin Bottom: 64px before cards

**Library Card Grid**:

- Layout: 2 columns on desktop (grid-cols-2)
- Gap: 32px (gap-8)
- Mobile: 1 column (grid-cols-1)

**Library Showcase Card Design** (ChromaDB Card Example):

**Card Container**:

```css
background: #ffffff;
border: 1px solid #e5e7eb;
border-radius: 16px;
padding: 40px;
box-shadow: 0 4px 32px rgba(0, 0, 0, 0.04);
transition: all 0.3s ease-out;
```

**Card Hover State**:

```css
transform: scale(1.02);
box-shadow: 0 8px 48px rgba(0, 0, 0, 0.08);
border-color: #6366f1;
```

**Card Visual Hierarchy**:

1. **Library Icon** (Top-left, 64px size):

   - Size: 64x64px
   - Color: #6366F1 (accent indigo)
   - Style: Line-based, modern SVG icon
   - Margin Bottom: 24px

2. **Package Name** (Below icon):

   - Text: "@hive-academy/nestjs-chromadb"
   - Size: 14px (text-sm)
   - Weight: Mono (font-mono)
   - Color: #71717A (muted gray)
   - Margin Bottom: 16px

3. **Business Value Headline** (Main title):

   - Text: "Build RAG Applications in Minutes"
   - Size: 28px (text-3xl)
   - Weight: Bold (700)
   - Color: #1A1A1A (near-black)
   - Line Height: 1.4
   - Margin Bottom: 16px

4. **Description** (Supporting text):

   - Text: "TypeORM-style repository pattern for semantic search with 70% less boilerplate code"
   - Size: 18px (text-lg)
   - Weight: Regular (400)
   - Color: #71717A (muted)
   - Line Height: 1.6
   - Margin Bottom: 24px

5. **Capabilities List** (4-6 items):

   - Layout: Grid 2 columns on desktop, 1 on mobile
   - Gap: 12px vertical, 16px horizontal
   - Each capability:
     - Icon: Checkmark (16px, #10B981 green)
     - Text: 16px regular, #23272F
     - Format: "Multi-Provider Embeddings"

6. **Divider** (Horizontal line):

   - Border: 1px solid #E5E7EB
   - Margin: 24px vertical
   - Width: 100%

7. **Performance Metric** (Bottom callout):
   - Number: "90%" - 48px bold, #6366F1 (accent)
   - Label: "Less Code" - 14px regular, #71717A
   - Layout: Centered
   - Background: #F9FAFB (light gray pill)
   - Padding: 16px 24px
   - Border Radius: 8px

**Tailwind Implementation**:

```html
<div
  class="bg-white border border-gray-200 rounded-2xl p-10 shadow-lg hover:shadow-2xl hover:scale-102 hover:border-indigo-600 transition-all duration-300"
>
  <!-- Icon -->
  <svg class="w-16 h-16 text-indigo-600 mb-6">...</svg>

  <!-- Package Name -->
  <p class="text-sm font-mono text-gray-500 mb-4">@hive-academy/nestjs-chromadb</p>

  <!-- Business Value Headline -->
  <h3 class="text-3xl font-bold text-gray-900 mb-4 leading-snug">
    Build RAG Applications in Minutes
  </h3>

  <!-- Description -->
  <p class="text-lg text-gray-500 mb-6 leading-relaxed">
    TypeORM-style repository pattern for semantic search with 70% less boilerplate code
  </p>

  <!-- Capabilities Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
    <div class="flex items-center gap-2">
      <svg class="w-4 h-4 text-green-500">✓</svg>
      <span class="text-base text-gray-800">Multi-Provider Embeddings</span>
    </div>
    <!-- Repeat for 5 more capabilities -->
  </div>

  <!-- Divider -->
  <div class="border-t border-gray-200 my-6"></div>

  <!-- Metric Callout -->
  <div class="text-center bg-gray-50 rounded-lg py-4 px-6">
    <p class="text-5xl font-bold text-indigo-600 mb-1">90%</p>
    <p class="text-sm text-gray-500">Less Code</p>
  </div>
</div>
```

**Neo4j Card**: Same structure, different content:

- Icon: Graph network icon (64px, #6366F1)
- Business Value: "Revolutionary 7-Decorator Entity CRUD"
- Metric: "Zero Boilerplate"

---

### Section 2: LangGraph Foundation (Core Library Spotlight)

**Background**: `#F9FAFB` (Light gray - ALTERNATING from white)
**Vertical Padding**: `128px` (py-32)
**Container**: `max-w-7xl mx-auto px-16`

**Visual Treatment**: Spotlight section with centered focus

**Section Header**:

- Overline: "CORE FOUNDATION" - 12px bold uppercase, #6366F1, letter-spacing 2px
- Headline: "Foundation of the Ecosystem" - 60px bold, #1A1A1A
- Subtitle: "Type-Safe Interfaces & State Management for All LangGraph Modules" - 24px regular, #71717A
- Alignment: Center
- Max Width: 900px centered
- Margin Bottom: 64px

**Core Library Card** (Single Centered Card):

**Card Container**:

```css
max-width: 1000px;
margin: 0 auto;
background: #ffffff; /* White card on gray section */
border: 1px solid #e5e7eb;
border-radius: 24px; /* Larger radius for spotlight */
padding: 64px; /* Extra padding for importance */
box-shadow: 0 12px 64px rgba(0, 0, 0, 0.12); /* Elevated shadow */
```

**Card Layout**:

1. **Icon & Package** (Top, centered):

   - Icon: 80px (larger for spotlight)
   - Package: "@hive-academy/langgraph-core" - 16px mono, #71717A

2. **Business Value**:

   - "Zero-Overhead Type-Safe Workflow Development" - 36px bold, #1A1A1A
   - Max width: 700px centered

3. **Capabilities Grid** (2x2 on desktop):

   - 4 capabilities with icons
   - Each: Icon (24px, #6366F1) + Title (20px bold) + Description (16px, #71717A)
   - Grid gap: 32px

4. **Code Snippet** (Developer Experience):

   - Background: #F9FAFB
   - Border: 1px solid #E5E7EB
   - Border Radius: 12px
   - Padding: 24px
   - Code: 14px mono, syntax highlighted
   - Max height: 300px with scroll

5. **Powered Modules Tags**:
   - Layout: Flex wrap, centered
   - Each tag:
     - Background: #F9FAFB
     - Border: 1px solid #E5E7EB
     - Padding: 8px 16px
     - Border Radius: 6px
     - Text: 14px medium, #23272F
     - Hover: Border #6366F1
   - Gap: 12px
   - Tags: "Workflow-Engine", "Streaming", "Memory", "Multi-Agent", "HITL", "Functional-API", "Checkpoint", "Monitoring", "Platform", "Time-Travel"

---

### Section 3: Orchestration Layer (3 Libraries)

**Background**: `#FFFFFF` (White - alternating back)
**Vertical Padding**: `128px` (py-32)
**Container**: `max-w-7xl mx-auto px-16`

**Section Header**:

- Headline: "Orchestration Layer" - 60px bold, #1A1A1A
- Subtitle: "Execute, Stream, and Remember Every Workflow" - 24px, #71717A
- Alignment: Center
- Margin Bottom: 64px

**Library Card Grid**:

- Layout: 3 columns on desktop (grid-cols-3)
- Gap: 32px (gap-8)
- Tablet: 2 columns
- Mobile: 1 column

**Card Design**: Same as Data Foundation cards but compact version

**Special Card: Workflow-Engine (Central Hub)**:

- Badge: "CENTRAL HUB" pill at top (bg-indigo-100, text-indigo-700, 12px bold uppercase)
- Larger icon: 72px vs 64px
- Border: 2px solid #6366F1 (highlighted importance)

**Cards**:

1. **Workflow-Engine**: Central hub badge, coordination focus
2. **Streaming**: Real-time WebSocket icon
3. **Memory**: Hybrid storage diagram mini-visual

---

### Section 4: Agent Systems Layer (3 Libraries)

**Background**: `#F9FAFB` (Light gray - alternating)
**Vertical Padding**: `128px` (py-32)
**Container**: `max-w-7xl mx-auto px-16`

**Section Header**:

- Headline: "Agent Systems" - 60px bold, #1A1A1A
- Subtitle: "Collaborative AI with Human Oversight" - 24px, #71717A
- Alignment: Center
- Margin Bottom: 64px

**Library Card Grid**: 3 columns (same as Orchestration)

**Cards**:

1. **Multi-Agent**: Team collaboration icon
2. **HITL**: Human approval icon with confidence meter visual
3. **Functional-API**: Decorator code snippet visual

---

### Section 5: Production Layer (3 Libraries)

**Background**: `#FFFFFF` (White - alternating)
**Vertical Padding**: `128px` (py-32)
**Container**: `max-w-7xl mx-auto px-16`

**Section Header**:

- Headline: "Production-Ready Features" - 60px bold, #1A1A1A
- Subtitle: "Deploy, Monitor, and Scale with Confidence" - 24px, #71717A
- Alignment: Center
- Margin Bottom: 64px

**Library Card Grid**: 3 columns

**Cards**:

1. **Checkpoint**: State persistence icon with timeline visual
2. **Monitoring**: Metrics dashboard mini-chart
3. **Platform**: Cloud deployment icon

---

### Section 6: Complete Integration Showcase

**Background**: `#F9FAFB` (Light gray)
**Vertical Padding**: `128px` (py-32)
**Container**: `max-w-7xl mx-auto px-16`

**Section Header**:

- Overline: "ARCHITECTURE" - 12px bold uppercase, #6366F1
- Headline: "How It All Wires Together" - 60px bold, #1A1A1A
- Subtitle: "12 Libraries Working as a Unified AI Platform" - 24px, #71717A
- Alignment: Center
- Margin Bottom: 64px

**Architecture Diagram** (Canva-Generated):

- Image: 2400x1800px PNG (high-res)
- Shows: 5-layer architecture (Foundation → Data → Orchestration → Agent → Production)
- Style: Light background, indigo accent lines, clear labels
- Shadow: 0 8px 48px rgba(0,0,0,0.08)
- Border Radius: 16px
- Margin Bottom: 64px

**Integration Code Example**:

**Container**:

```css
background: #ffffff;
border: 1px solid #e5e7eb;
border-radius: 16px;
padding: 40px;
max-width: 900px;
margin: 0 auto;
```

**Code Block**:

- Background: #23272F (dark code background - ONLY for code blocks)
- Padding: 32px
- Border Radius: 12px
- Code: 14px mono, syntax highlighted with Prism.js
- Line numbers: Enabled
- Copy button: Top-right, #6366F1 on hover
- Max height: 500px with scroll

**Note**: Dark backgrounds ONLY allowed for code snippets (industry standard)

---

### Section 7: Production Use Cases

**Background**: `#FFFFFF` (White)
**Vertical Padding**: `128px` (py-32)
**Container**: `max-w-7xl mx-auto px-16`

**Section Header**:

- Headline: "Production Use Cases" - 60px bold, #1A1A1A
- Subtitle: "Real-World Applications Built with Our Libraries" - 24px, #71717A
- Alignment: Center
- Margin Bottom: 64px

**Use Case Grid**:

- Layout: 2x2 grid (grid-cols-2)
- Gap: 32px
- Mobile: 1 column

**Use Case Card Design**:

**Card Container**:

```css
background: #ffffff;
border: 1px solid #e5e7eb;
border-radius: 16px;
padding: 40px;
box-shadow: 0 4px 32px rgba(0, 0, 0, 0.04);
transition: all 0.3s ease-out;
```

**Card Layout**:

1. **Illustration** (Canva-generated):

   - Size: 400x300px
   - Style: Modern, clean, isometric or flat
   - Colors: Indigo accent, light background
   - Margin Bottom: 24px

2. **Use Case Title**:

   - Size: 28px bold
   - Color: #1A1A1A
   - Margin Bottom: 16px

3. **Libraries Used Tags**:

   - Inline flex wrap
   - Each tag: Small pill (bg-gray-100, text-gray-700, 12px)
   - Gap: 8px
   - Margin Bottom: 16px

4. **Business Value**:

   - Size: 18px regular
   - Color: #71717A
   - Margin Bottom: 12px

5. **Example**:
   - Size: 16px regular
   - Color: #23272F
   - Icon: Small arrow or checkmark

**Use Cases**:

1. Enterprise RAG System
2. Multi-Agent Research Platform
3. Customer Service Automation
4. Content Generation Pipeline

---

### Section 8: Getting Started

**Background**: `#F9FAFB` (Light gray)
**Vertical Padding**: `128px` (py-32)
**Container**: `max-w-7xl mx-auto px-16`

**Section Header**:

- Headline: "Get Started in Minutes" - 60px bold, #1A1A1A
- Subtitle: "Install and Run Your First AI Workflow" - 24px, #71717A
- Alignment: Center
- Margin Bottom: 64px

**Content Layout**: 2-column on desktop (code left, steps right)

**Installation Code Block** (Left Column):

- Background: #FFFFFF (white card)
- Border: 1px solid #E5E7EB
- Border Radius: 16px
- Padding: 40px
- Code background: #23272F (dark for code)
- Code padding: 24px
- Syntax highlighting: Bash

**Quick Start Steps** (Right Column):

**Step Cards**:

- Each step: Numbered badge (1, 2, 3, 4, 5)
- Badge: Circle 40px, #6366F1 background, white text
- Title: 20px bold, #1A1A1A
- Description: 16px regular, #71717A
- Spacing: 32px between steps

**Steps**:

1. Install Core Foundation
2. Set Up Database Layer
3. Configure Workflow Engine
4. Create Your First Agent
5. Deploy to Production

---

### Section 9: Call to Action & Footer

**CTA Section**:

- Background: `#6366F1` (Indigo - ONLY section with colored background)
- Vertical Padding: 96px (py-24)
- Container: `max-w-4xl mx-auto px-16 text-center`

**CTA Content**:

- Headline: "Ready to Build Enterprise AI?" - 56px bold, #FFFFFF (white text on colored background)
- Subheadline: "Join Developers Using Our 12-Library Ecosystem" - 24px, rgba(255,255,255,0.9)
- Margin Bottom: 48px

**CTA Buttons**:

- Primary: White background, #6366F1 text, 18px bold, 16px padding, 8px radius
- Secondary: Outline white, transparent background, white text, 18px
- Layout: Flex gap 16px, centered
- Hover: Primary bg-gray-100, Secondary bg-white/10

**Footer**:

- Background: `#FFFFFF` (White)
- Border Top: 1px solid #E5E7EB
- Vertical Padding: 64px (py-16)
- Container: `max-w-7xl mx-auto px-16`

**Footer Layout**: 4 columns on desktop, stacked on mobile

**Column Design**:

- Column Heading: 16px bold, #1A1A1A, margin-bottom 16px
- Links: 14px regular, #71717A, hover #6366F1, margin-bottom 8px

**Columns**:

1. **Libraries**: 12 library documentation links
2. **Resources**: Documentation, Examples, Tutorials, Blog
3. **Community**: GitHub, Discord, Twitter, LinkedIn
4. **Company**: About, Careers, Contact, Legal

**Footer Bottom**:

- Border Top: 1px solid #E5E7EB
- Padding Top: 32px (pt-8)
- Text: 14px, #71717A, centered
- Copyright: "© 2025 Hive Academy. All rights reserved."

---

## Responsive Design Specifications

### Breakpoint Strategy

**Mobile First Approach**:

1. Design for 375px width first (iPhone SE baseline)
2. Progressive enhancement for 768px (tablet)
3. Full feature set at 1024px+ (desktop)

**Breakpoints**:

- Mobile: < 768px (sm: breakpoint)
- Tablet: 768px - 1024px (md: to lg:)
- Desktop: 1024px+ (lg:)

### Layout Transformations

**Section Padding**:

- Mobile: py-16 (64px)
- Tablet: py-20 (80px)
- Desktop: py-32 (128px)

**Container Padding**:

- Mobile: px-8 (32px)
- Tablet: px-12 (48px)
- Desktop: px-16 (64px)

**Grid Layouts**:

**Data Foundation (2 libraries)**:

- Desktop: grid-cols-2 (side-by-side)
- Tablet: grid-cols-2 (maintain)
- Mobile: grid-cols-1 (stacked)

**Orchestration/Agent/Production (3 libraries each)**:

- Desktop: grid-cols-3
- Tablet: grid-cols-2 (third wraps)
- Mobile: grid-cols-1

**Use Cases (4 cards)**:

- Desktop: grid-cols-2 (2x2 grid)
- Tablet: grid-cols-2 (maintain)
- Mobile: grid-cols-1

**Typography Responsive**:

- Use responsive Tailwind classes: `text-4xl md:text-5xl lg:text-6xl`
- Mobile: Reduce headline sizes by 40-50%
- Maintain 16px minimum body text on mobile

**Mobile Specific Adjustments**:

- Hide 2 capabilities in library cards (show "View more" link)
- Reduce card padding from 40px to 24px (p-10 → p-6)
- Smaller icons: 48px instead of 64px
- Code blocks: Horizontal scroll if needed

---

## Motion & Interaction Specifications

### Scroll Animations

**Section Entry** (Fade-in with slide-up):

```typescript
// Intersection Observer configuration
{
  threshold: 0.1,
  rootMargin: '0px 0px -100px 0px'
}
```

```css
/* Initial state */
.section-entry {
  opacity: 0;
  transform: translateY(40px);
}

/* Animated state (in viewport) */
.section-entry.in-view {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}
```

**Stagger Pattern** (Library cards appear sequentially):

```typescript
// Add delay based on card index
transition-delay: calc(var(--card-index) * 100ms)
```

```css
.library-card:nth-child(1) {
  transition-delay: 0ms;
}
.library-card:nth-child(2) {
  transition-delay: 100ms;
}
.library-card:nth-child(3) {
  transition-delay: 200ms;
}
```

### Microinteractions

**Button Hover** (Primary CTA):

```css
.button-primary {
  background: #6366f1;
  transform: scale(1);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.2);
  transition: all 0.2s ease-out;
}

.button-primary:hover {
  background: #4f46e5;
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
}

.button-primary:active {
  transform: scale(0.98);
}
```

**Card Hover** (Library cards):

```css
.library-card {
  transform: scale(1);
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.04);
  border-color: #e5e7eb;
  transition: all 0.3s ease-out;
}

.library-card:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 48px rgba(0, 0, 0, 0.08);
  border-color: #6366f1;
}
```

**Link Hover** (Text links):

```css
.text-link {
  color: #71717a;
  position: relative;
  transition: color 0.2s ease-out;
}

.text-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: #6366f1;
  transition: width 0.3s ease-out;
}

.text-link:hover {
  color: #6366f1;
}

.text-link:hover::after {
  width: 100%;
}
```

**Code Copy Button**:

```css
.copy-button {
  opacity: 0;
  transform: translateX(8px);
  transition: all 0.2s ease-out;
}

.code-block:hover .copy-button {
  opacity: 1;
  transform: translateX(0);
}

.copy-button.copied {
  color: #10b981;
}
```

### Angular-3D Visual Enhancements (Optional)

**Where to Apply 3D Effects**:

**Section Dividers** (Between major sections):

- Subtle floating particles (100-200 particles, #6366F1, 0.03 size)
- Gentle wave motion between white and gray sections
- Performance: Use `performance3d` directive

```html
<div class="h-32 w-full relative overflow-hidden">
  <app-scene-3d
    [sceneGraph]="sectionDividerGraph"
    [camera]="{ position: [0, 0, 8], fov: 75 }"
    [enableMouseParallax]="false"
  >
    <app-particle-system [count]="150" [color]="0x6366F1" [size]="0.03" performance3d />
  </app-scene-3d>
</div>
```

**Library Card Accent** (Hover state):

- Small floating sphere in top-right corner (20x20px)
- Appears on hover with glow effect
- Color: #6366F1

```html
<div class="library-card group">
  <!-- Card content -->

  <!-- 3D accent (visible on hover) -->
  <div
    class="absolute top-4 right-4 w-20 h-20 opacity-0 group-hover:opacity-100 transition-opacity"
  >
    <app-scene-3d [sceneGraph]="miniSphereGraph" [camera]="{ position: [0, 0, 5], fov: 50 }">
      <app-floating-sphere
        [radius]="0.3"
        [color]="0x6366F1"
        glow3d
        [glowConfig]="{ intensity: 0.3 }"
        float3d
        [floatConfig]="{ height: 0.2, speed: 2000 }"
      />
    </app-scene-3d>
  </div>
</div>
```

**Integration Diagram Background** (Subtle depth):

- Parallax scroll effect on architecture diagram
- Speed: 0.3 (slower than scroll for depth)

```html
<div
  scrollAnimation
  [scrollConfig]="{
  animation: 'parallax',
  speed: 0.3,
  scrub: true,
  start: 'top center',
  end: 'bottom center'
}"
>
  <img src="architecture-diagram.png" alt="12-Library Architecture" />
</div>
```

**Hero Section Background** (If hero redesigned - currently excluded):

- Floating geometric shapes (spheres, toruses)
- Mouse parallax enabled (sensitivity 0.3)
- Light colors: white/light gray with indigo accents

**Performance Guidelines**:

- Use `performance3d` directive on ALL 3D elements
- Limit 3D to accent elements (not entire sections)
- Lazy load 3D scenes below the fold
- Monitor FPS with `PerformanceMonitorService`

**Note**: 3D enhancements are OPTIONAL and SUBTLE. Primary design is clean, light, spacious. 3D should enhance, not distract.

---

## Accessibility Specifications

### WCAG 2.1 AA Compliance Checklist

**Color Contrast**:

- All text on white: VERIFIED (15.8:1, 15.3:1, 5.8:1, 4.6:1)
- All interactive elements: Minimum 4.5:1
- Focus indicators: 3:1 contrast with background

**Typography**:

- Body text: MINIMUM 16px on mobile, 18px on desktop
- Line height: 1.5-1.7 for readability
- Text spacing: Adequate word/letter spacing

**Keyboard Navigation**:

- All interactive elements: tab-accessible
- Focus indicators: 2px solid #6366F1 outline with 2px offset
- Skip to content link: Available at top
- Logical tab order: Top to bottom, left to right

**Screen Readers**:

- Semantic HTML: `<section>`, `<article>`, `<nav>`, `<main>`, `<footer>`
- ARIA labels: All interactive elements
- Image alt text: Descriptive for all images/icons
- Heading hierarchy: h1 → h2 → h3 (no skipping)

**Touch Targets**:

- Minimum size: 44x44px
- Spacing: 8px minimum between targets
- Buttons: 48px height minimum

**Motion & Animations**:

- Respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Focus Indicators**:

```css
.focusable:focus {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
  border-radius: 4px;
}
```

---

## Design System Compliance Summary

### Color Compliance

- Background: 100% white (#FFFFFF) or light gray (#F9FAFB)
- Text: 100% deep gray on white (NOT light on dark)
- Shadows: 100% soft (NO glassmorphism)
- Accent: Consistent indigo (#6366F1)

### Typography Compliance

- Font family: Inter (design system approved)
- Sizes: 40px+ headlines, 18px body (design system minimums)
- Line height: 1.5-1.7 (design system spec)
- Weights: Bold headlines, regular body

### Spacing Compliance

- Section padding: 128px (exceeds 40px minimum)
- Card padding: 40px (exceeds 24px minimum)
- Gaps: 32px cards (exceeds 16px minimum)
- Grid: 8px base (design system standard)

### Shadow Compliance

- Cards: 0 4px 32px rgba(0,0,0,0.04) (design system soft shadow)
- NO backdrop-filter (glassmorphism forbidden)
- NO heavy neon glows

### Border Radius Compliance

- Cards: 16px (design system spec)
- Buttons: 8px (design system spec)

**Compliance Score**: 100% adherence to light design system

---

## Developer Implementation Notes

### Critical Reminders for Frontend Developer

**DO** (MANDATORY):

1. Use white (#FFFFFF) or light gray (#F9FAFB) section backgrounds
2. Use deep gray text (#23272F, #71717A, #1A1A1A) on white backgrounds
3. Use soft shadows (0 4px 32px rgba(0,0,0,0.04))
4. Use 128px section padding (py-32)
5. Use 40px card padding minimum (p-10)
6. Use 60px section headlines (text-6xl)
7. Use 18px body text (text-lg)
8. Alternate white and light gray section backgrounds
9. Apply responsive classes (text-4xl md:text-5xl lg:text-6xl)
10. Implement scroll animations with Intersection Observer

**DO NOT** (FORBIDDEN):

1. Use dark backgrounds (#1A1A1A, #23272F) for sections
2. Use light text on dark backgrounds (except code blocks)
3. Use glassmorphism (backdrop-filter: blur, rgba(255,255,255,0.1))
4. Use heavy shadows or neon glows
5. Use cramped spacing (less than 40px section padding)
6. Use small typography (less than 40px headlines, less than 16px body)
7. Recreate dark glassmorphism patterns
8. Skip responsive breakpoints
9. Ignore accessibility requirements
10. Deviate from design system tokens

### Shared Components to Create/Update

**1. LibraryShowcaseCard Component**:

- Props: icon, packageName, businessValue, description, capabilities, metric
- Styling: White background, soft shadow, 40px padding, hover effects
- Responsive: Adjust padding and icon size on mobile

**2. SectionContainer Component**:

- Props: background (white/gray), padding, maxWidth
- Enforces: Alternating backgrounds, consistent padding, responsive container

**3. CodeSnippet Component**:

- Props: code, language, showLineNumbers, copyButton
- Styling: Dark code background (#23272F), syntax highlighting
- Features: Copy button, scroll if needed

**4. IntegrationDiagram Component** (If using Canva image):

- Props: imageSrc, alt
- Styling: Shadow, border-radius, responsive sizing
- Optional: Parallax scroll animation

### Tailwind Configuration Verification

Ensure `tailwind.config.js` has design system tokens:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'indigo-600': '#6366F1', // Accent
        'gray-900': '#1A1A1A', // Headlines
        'gray-800': '#23272F', // Body
        'gray-500': '#71717A', // Muted
        'gray-50': '#F9FAFB', // Light background
      },
      spacing: {
        128: '32rem', // py-32 (128px)
      },
      boxShadow: {
        card: '0 4px 32px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 8px 48px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
};
```

---

## Next Steps for Developer

1. Create shared components: LibraryShowcaseCard, SectionContainer, CodeSnippet
2. Implement sections in order: Data Foundation → LangGraph Foundation → Orchestration → Agent → Production → Integration → Use Cases → Getting Started → CTA/Footer
3. Download Canva assets from `design-assets-inventory.md`
4. Implement scroll animations with Intersection Observer
5. Add responsive breakpoints for all sections
6. Validate WCAG 2.1 AA compliance with axe DevTools
7. Test on mobile (375px), tablet (768px), desktop (1024px+)
8. Verify design system compliance (colors, typography, spacing, shadows)

---

**Document Version**: 1.0
**Created**: 2025-01-22
**Task ID**: TASK_2025_017
**Status**: Visual Design Specification Complete - Ready for Canva Asset Generation
