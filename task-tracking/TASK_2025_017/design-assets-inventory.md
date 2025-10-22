# Design Assets Inventory - TASK_2025_017

## Asset Creation Strategy (UPDATED)

**STRATEGIC APPROACH**: Use the right tool for each asset type

### Angular-3D/Three.js Assets (Interactive, Complex Visualizations)

**Use Angular-3D for these assets**:

- Architecture diagram (12-library 5-layer system) - Interactive 3D visualization
- Use case demonstrations (complex interactive scenarios) - Real-time 3D demos
- Flowcharts and system diagrams (HITL workflow, Checkpoint timeline) - Dynamic 3D graphs
- Complex visualizations (network graphs, data flows) - Animated 3D scenes

**Benefits**:

- Interactive (mouse parallax, scroll animations)
- Smaller file sizes (Three.js scenes vs large PNGs)
- Showcases Angular-3D capabilities
- Dynamic animations (floating, pulsing, connecting lines)

### Canva/Static Assets (Simple Icons, Graphics)

**Use Canva/static images for these assets**:

- Library icons (12 simple SVG icons) - Lightweight, fast loading
- Simple graphics and decorative elements - Standard web assets
- Logos and branding elements - Brand consistency

**Benefits**:

- Fast creation and iteration
- Lightweight (< 10KB SVGs)
- Broad browser compatibility
- Easy to update

---

## Asset Creation Status

**Note**: Canva MCP tools is available in current environment. This document provides detailed specifications for manual asset creation AND Angular-3D integration specifications.

**Creation Method Options**:

1. **Angular-3D Components** (for complex visualizations) - Implemented by frontend-developer
2. MCP creation with Canva mcp tool (for simple icons)
3. Use Figma/Sketch with provided specifications
4. Commission from designer using these specs
5. Generate with AI image tools (DALL-E, Midjourney) using prompts below

---

## Primary Assets Required

### Asset 1: 12-Library Architecture Diagram ⚡ ANGULAR-3D

**Purpose**: Show how all 12 libraries integrate in a 5-layer architecture (INTERACTIVE 3D VISUALIZATION)
**Usage**: Section 6 (Complete Integration Showcase)
**Implementation**: Interactive 3D Scene (NOT static PNG)
**Component**: `Architecture3DSceneComponent` using Angular-Three primitives
**File Location**: `apps/dev-brand-ui/src/app/features/landing-page/components/architecture-3d-scene.component.ts`
**Fallback**: Static SVG for non-WebGL browsers (`architecture-12-libraries-fallback.svg`)

**3D Scene Specification**:

**Scene Setup**:

- Canvas size: Full section width (responsive, height: 600px)
- Camera: OrthographicCamera for clean isometric view
    - Position: [0, 0, 800]
    - LookAt: [0, 0, 0]
    - Zoom: Auto-adjust based on screen width
- Renderer: WebGL with antialiasing, alpha: true (transparent background)
- Lighting:
    - AmbientLight: 0xFFFFFF intensity 0.6
    - DirectionalLight: 0xFFFFFF intensity 0.4 from [500, 500, 500]
- Background: Transparent (section background shows through)

**Overall Layout**:

- 5 horizontal layers stacked vertically (bottom to top, isometric 3D view)
- Each layer contains 1-3 library boxes (BoxGeometry with borders)
- Vertical spacing: 150 units between layer centers (3D space)
- Horizontal spacing: 450 units between boxes in same layer

**Layer 1 - CORE FOUNDATION (Bottom)**:

**Geometry**:

- Component: `<app-box>` (BoxComponent)
- Dimensions: BoxGeometry(600, 120, 20) - Width x Height x Depth
- Position: [0, -300, 0] (centered at bottom)

**Material**:

- Type: MeshStandardMaterial
- Color: 0xEEF2FF (light indigo - #EEF2FF)
- Metalness: 0.1 (minimal metallic reflection)
- Roughness: 0.8 (matte finish)
- Transparent: false
- Opacity: 1.0

**Edge Highlighting** (for borders):

- EdgesGeometry applied to BoxGeometry
- LineSegments with LineBasicMaterial
- Color: 0xC7D2FE (indigo border - #C7D2FE)
- Linewidth: 2

**Text Label** (3D text):

- Component: `<app-text-3d>` (Text3DComponent) OR CSS overlay
- Text: "LangGraph Core"
- Font: Inter, size: 24
- Color: 0x1A1A1A (near-black)
- Position: Centered on box face

**Animation**:

- Directive: `float3d` with `[floatConfig]="{ height: 0.2, speed: 4000, ease: 'sine.inOut' }"`
- Subtle floating effect (0.2 units up/down over 4 seconds)

**Layer 2 - DATA LAYER**:

**3 Boxes (Side-by-Side)**:

- Geometry: BoxGeometry(400, 120, 20) each
- Positions: [-450, -150, 0], [0, -150, 0], [450, -150, 0]
- Material: MeshStandardMaterial({ color: 0xDBEAFE, metalness: 0.1, roughness: 0.8 })
- Borders: EdgeGeometry + LineBasicMaterial({ color: 0xBFDBFE, linewidth: 2 })
- Text Labels: "ChromaDB", "Neo4j", "Time-Travel" (24px, 0x1A1A1A)
- Animations: Staggered `float3d` (delays: 0ms, 200ms, 400ms)
    - Box 1: `[floatConfig]="{ height: 0.2, speed: 4200, delay: 0 }"`
    - Box 2: `[floatConfig]="{ height: 0.2, speed: 4200, delay: 200 }"`
    - Box 3: `[floatConfig]="{ height: 0.2, speed: 4200, delay: 400 }"`

**Layer 3 - ORCHESTRATION LAYER**:

**3 Boxes (Side-by-Side)**:

- Geometry: BoxGeometry(400, 120, 20) each
- Positions: [-450, 0, 0], [0, 0, 0], [450, 0, 0]
- Material: MeshStandardMaterial({ color: 0xD1FAE5, metalness: 0.1, roughness: 0.8 })
- Borders: EdgeGeometry + LineBasicMaterial({ color: 0xA7F3D0, linewidth: 2 })
- Text Labels: "Workflow-Engine", "Streaming", "Memory" (24px)
- Animations: Staggered `float3d` (delays: 100ms, 300ms, 500ms)
    - Box 1: `[floatConfig]="{ height: 0.25, speed: 4000, delay: 100 }"`
    - Box 2: `[floatConfig]="{ height: 0.25, speed: 4000, delay: 300 }"`
    - Box 3: `[floatConfig]="{ height: 0.25, speed: 4000, delay: 500 }"`

**Layer 4 - AGENT SYSTEMS**:

**3 Boxes (Side-by-Side)**:

- Geometry: BoxGeometry(400, 120, 20) each
- Positions: [-450, 150, 0], [0, 150, 0], [450, 150, 0]
- Material: MeshStandardMaterial({ color: 0xF3E8FF, metalness: 0.1, roughness: 0.8 })
- Borders: EdgeGeometry + LineBasicMaterial({ color: 0xE9D5FF, linewidth: 2 })
- Text Labels: "Multi-Agent", "HITL", "Functional-API" (24px)
- Animations: Staggered `float3d` (delays: 200ms, 400ms, 600ms)
    - Box 1: `[floatConfig]="{ height: 0.3, speed: 3800, delay: 200 }"`
    - Box 2: `[floatConfig]="{ height: 0.3, speed: 3800, delay: 400 }"`
    - Box 3: `[floatConfig]="{ height: 0.3, speed: 3800, delay: 600 }"`

**Layer 5 - PRODUCTION LAYER (Top)**:

**3 Boxes (Side-by-Side)**:

- Geometry: BoxGeometry(400, 120, 20) each
- Positions: [-450, 300, 0], [0, 300, 0], [450, 300, 0]
- Material: MeshStandardMaterial({ color: 0xFED7AA, metalness: 0.1, roughness: 0.8 })
- Borders: EdgeGeometry + LineBasicMaterial({ color: 0xFDBB8E, linewidth: 2 })
- Text Labels: "Checkpoint", "Monitoring", "Platform" (24px)
- Animations: Staggered `float3d` (delays: 300ms, 500ms, 700ms)
    - Box 1: `[floatConfig]="{ height: 0.35, speed: 3600, delay: 300 }"`
    - Box 2: `[floatConfig]="{ height: 0.35, speed: 3600, delay: 500 }"`
    - Box 3: `[floatConfig]="{ height: 0.35, speed: 3600, delay: 700 }"`

**Connecting Arrows**:

**Vertical Arrows** (Layer-to-layer connections):

- Geometry: CylinderGeometry for shaft (radius: 2, height: calculated, radialSegments: 8)
    - ConeGeometry for arrowhead (radius: 6, height: 15, radialSegments: 8)
- Material: MeshBasicMaterial({ color: 0x6366F1 }) - Indigo arrows
- Positions: Calculate based on layer positions
    - Core → Data: From [0, -240, 0] to [0, -210, 0]
    - Data → Orchestration: From [0, -90, 0] to [0, -60, 0]
    - Orchestration → Agent: From [0, 60, 0] to [0, 90, 0]
    - Agent → Production: From [0, 210, 0] to [0, 240, 0]
- Animation: Pulsing glow effect on hover (optional)
    - Use `glow3d` directive with `[glowConfig]="{ color: 0x6366F1, intensity: 0.2, scale: 1.2 }"`

**Horizontal Arrows** (Integration within layers - optional):

- Lighter connections between boxes in same layer
- Material: LineBasicMaterial({ color: 0x9CA3AF, linewidth: 2 }) - Light gray dashed lines
- Pattern: Dashed (THREE.LineDashedMaterial)

**Camera & Interaction**:

**Camera Configuration**:

- Type: OrthographicCamera
- Position: [0, 0, 800]
- LookAt: [0, 0, 0]
- Left/Right/Top/Bottom: Auto-calculated based on viewport aspect ratio
- Zoom: 1.0 (adjust for smaller screens)

**Mouse Parallax**:

- Directive: `mouseParallax3d`
- Sensitivity: 0.3 (subtle depth perception)
- Smoothing: 6 (smooth camera movement)
- Camera Distance: 800

**Scroll Animation**:

- Directive: `scrollAnimation`
- Config: `[scrollConfig]="{ animation: 'fadeIn', start: 'top 80%', duration: 1.5, ease: 'power3.out' }"`
- Entire scene fades in as user scrolls to section

**Performance Optimization**:

- Directive: `performance3d` on root `<app-scene-3d>`
- Target FPS: 60
- Auto-reduces quality if FPS drops below 30
- Polygon budget: ~15,000 polygons (13 boxes + arrows + text)

**Fallback for Non-WebGL Browsers**:

**Static SVG Fallback**:

- File: `architecture-12-libraries-fallback.svg`
- Same visual design as 3D scene (flat 2D view)
- Dimensions: Responsive SVG (viewBox: 0 0 1400 1000)
- Detection: Check for `WebGLRenderingContext` support

```typescript
// WebGL detection
if (!this.checkWebGLSupport()) {
  // Render static SVG fallback
  return;
}
```

**Benefits of Angular-3D vs Static PNG**:

- Interactive depth with mouse parallax
- Smooth floating animations on all 13 boxes
- Smaller file size (~30KB Three.js scene vs 200KB+ PNG)
- Scales perfectly to any screen size (responsive 3D)
- Showcases project's Angular-3D capabilities
- Demonstrates enterprise-grade 3D integration

**Example Component Implementation Sketch**:

```typescript
// architecture-3d-scene.component.ts (Simplified example)
import { Component } from '@angular/core';
import { Scene3DComponent } from '../../../core/angular-3d/components/scene-3d.component';
import { BoxComponent } from '../../../core/angular-3d/components/primitives/box.component';
import { ScrollAnimationDirective } from '../../../core/angular-3d/directives/scroll-animation.directive';

@Component({
  selector: 'app-architecture-3d-scene',
  standalone: true,
  imports: [Scene3DComponent, BoxComponent, ScrollAnimationDirective],
  template: `
    <app-scene-3d
      [sceneGraph]="ArchitectureSceneGraph"
      [camera]="{ position: [0, 0, 800], fov: 75 }"
      [enableMouseParallax]="true"
      [mouseParallax]="{ sensitivity: 0.3, smoothing: 6, cameraDistance: 800 }"
      scrollAnimation
      [scrollConfig]="{ animation: 'fadeIn', start: 'top 80%', duration: 1.5 }"
      performance3d
    />
  `
})
export class Architecture3DSceneComponent {
  // Scene graph defined separately
  ArchitectureSceneGraph = ArchitectureSceneGraphComponent;
}

// Scene graph component (simplified)
@Component({
  template: `
    <!-- Layer 1: Core Foundation -->
    <app-box
      [position]="[0, -300, 0]"
      [width]="600"
      [height]="120"
      [depth]="20"
      [color]="0xEEF2FF"
      [floatConfig]="{ height: 0.2, speed: 4000, ease: 'sine.inOut' }"
    />

    <!-- Layer 2: Data Layer (3 boxes) -->
    <app-box
      [position]="[-450, -150, 0]"
      [width]="400"
      [height]="120"
      [depth]="20"
      [color]="0xDBEAFE"
      [floatConfig]="{ height: 0.2, speed: 4200, delay: 0 }"
    />
    <!-- ... more boxes ... -->

    <!-- Vertical arrows (simplified) -->
    <!-- ... arrow geometry ... -->
  `
})
class ArchitectureSceneGraphComponent {}
```

---

### Asset 2: Library Icons (12 Individual Icons) 🎨 CANVA/STATIC

**Purpose**: Visual identification for each library in showcase cards
**Usage**: All library showcase cards (Sections 1-5)
**Implementation**: Simple static SVG icons (NOT Angular-3D)
**Reason**: Icons are simple graphics - don't benefit from 3D complexity
**File Name Pattern**: `icon-{library-name}.svg`
**File Location**: `apps/dev-brand-ui/src/assets/icons/libraries/`
**Dimensions**: 256x256px
**Format**: SVG (vector) preferred for scalability

**Icon Design Specifications**:

**Overall Style**:

- Line-based icons (NOT filled)
- Stroke width: 3px
- Color: #6366F1 (indigo)
- Transparent background
- Rounded corners on shapes
- Modern, minimalist, geometric

**Individual Icon Concepts**:

1. **icon-chromadb.svg** (ChromaDB):

   - Concept: Database with vector arrows radiating outward
   - Elements: Cylinder (database) + 4-6 arrows pointing outward (vector search)
   - Size: 256x256px
   - Style: Line-based, geometric

2. **icon-neo4j.svg** (Neo4j):

   - Concept: Network graph with connected nodes
   - Elements: 5-6 circles (nodes) connected by lines (relationships)
   - Size: 256x256px
   - Style: Graph visualization, interconnected

3. **icon-langgraph-core.svg** (Core):

   - Concept: Foundation/building blocks
   - Elements: Layered rectangles or foundation stones
   - Size: 256x256px
   - Style: Solid foundation symbol

4. **icon-workflow-engine.svg** (Workflow-Engine):

   - Concept: Gear/cog (orchestration machine)
   - Elements: Large gear with inner teeth
   - Size: 256x256px
   - Style: Mechanical, precise

5. **icon-streaming.svg** (Streaming):

   - Concept: Lightning bolt or streaming waves
   - Elements: Zigzag lightning OR wavy lines flowing
   - Size: 256x256px
   - Style: Dynamic, motion-implied

6. **icon-memory.svg** (Memory):

   - Concept: Brain or memory chip
   - Elements: Brain outline OR chip with circuits
   - Size: 256x256px
   - Style: Cognitive, intelligent

7. **icon-multi-agent.svg** (Multi-Agent):

   - Concept: Team of people or multiple agents
   - Elements: 3-4 person silhouettes grouped together
   - Size: 256x256px
   - Style: Collaborative, teamwork

8. **icon-hitl.svg** (HITL):

   - Concept: Hand with checkmark (human approval)
   - Elements: Hand outline + checkmark symbol
   - Size: 256x256px
   - Style: Human touch, approval

9. **icon-functional-api.svg** (Functional-API):

   - Concept: Code brackets or function symbol
   - Elements: Curly braces {} or fn() symbol
   - Size: 256x256px
   - Style: Coding, developer-focused

10. **icon-checkpoint.svg** (Checkpoint):

    - Concept: Save/bookmark icon
    - Elements: Bookmark flag or save disk icon
    - Size: 256x256px
    - Style: Persistence, state saving

11. **icon-monitoring.svg** (Monitoring):

    - Concept: Line chart or dashboard
    - Elements: Upward trending line chart
    - Size: 256x256px
    - Style: Analytics, metrics

12. **icon-platform.svg** (Platform):
    - Concept: Cloud with server/deployment
    - Elements: Cloud outline with upward arrow
    - Size: 256x256px
    - Style: Cloud deployment, scalability

**SVG Template Example** (ChromaDB):

```svg
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <!-- Database cylinder -->
  <ellipse cx="128" cy="80" rx="60" ry="20" fill="none" stroke="#6366F1" stroke-width="3"/>
  <line x1="68" y1="80" x2="68" y2="160" stroke="#6366F1" stroke-width="3"/>
  <line x1="188" y1="80" x2="188" y2="160" stroke="#6366F1" stroke-width="3"/>
  <ellipse cx="128" cy="160" rx="60" ry="20" fill="none" stroke="#6366F1" stroke-width="3"/>

  <!-- Vector arrows -->
  <line x1="128" y1="120" x2="180" y2="100" stroke="#6366F1" stroke-width="2"/>
  <line x1="128" y1="120" x2="180" y2="140" stroke="#6366F1" stroke-width="2"/>
  <line x1="128" y1="120" x2="76" y2="100" stroke="#6366F1" stroke-width="2"/>
  <line x1="128" y1="120" x2="76" y2="140" stroke="#6366F1" stroke-width="2"/>
</svg>
```

**Alternative: Use Icon Libraries**:

- Heroicons (<https://heroicons.com>) - Line-based, free
- Lucide Icons (<https://lucide.dev>) - Modern, clean
- Feather Icons (<https://feathericons.com>) - Minimal, geometric

**Customization**:

- Download base icon (database, network, code, etc.)
- Change stroke color to #6366F1
- Adjust stroke width to 3px
- Export as SVG 256x256px

---

### Asset 3: Use Case Demonstrations 💎 HYBRID (Angular-3D + Static)

**Purpose**: Visual representation of production use cases
**Usage**: Section 7 (Production Use Cases)
**Strategy**: Use Angular-3D for complex interactive demos, static images for simple flows

**Complex Use Cases → Angular-3D 3D Scenes**:

- Enterprise RAG System (interactive retrieval visualization)
- Multi-Agent Research (dynamic collaboration visualization)

**Simple Use Cases → Static Images**:

- Customer Service Automation (simple flow diagram)
- Content Generation Pipeline (linear pipeline diagram)

---

#### Use Case 1: Enterprise RAG System ⚡ ANGULAR-3D

**Implementation**: Interactive 3D Scene
**Component**: `EnterpriseRAG3DSceneComponent`
**File Location**: `apps/dev-brand-ui/src/app/features/landing-page/components/enterprise-rag-3d-scene.component.ts`

**3D Scene Specification**:

**Scene Setup**:

- Canvas size: 600x500px (responsive)
- Camera: PerspectiveCamera, position [0, 5, 15], FOV 50
- Renderer: WebGL with antialiasing
- Lighting: AmbientLight (0.6) + PointLight (0.4 from top)

**3D Elements**:

1. **Laptop/Screen Mesh (Center)**:
   - Geometry: BoxGeometry(4, 3, 0.2) for screen + BoxGeometry(5, 0.3, 3) for keyboard
   - Material: MeshStandardMaterial({ color: 0xE5E7EB, metalness: 0.3, roughness: 0.7 })
   - Position: [0, 0, 0] (center stage)
   - Screen texture: Chat interface (CSS overlay or texture map)
   - Animation: `float3d` with `[floatConfig]="{ height: 0.1, speed: 3000 }"`

2. **Floating Document Meshes (4-6 documents)**:
   - Geometry: BoxGeometry(0.6, 0.8, 0.05) each (book-like)
   - Material: MeshStandardMaterial({ color: 0xDBEAFE, metalness: 0.1, roughness: 0.9 })
   - Positions: Circular arrangement around laptop at radius 5
     - Doc 1: [-4, 2, 2]
     - Doc 2: [4, 2, 2]
     - Doc 3: [-3, -1, 3]
     - Doc 4: [3, -1, 3]
   - Texture: Simple document lines (white rectangles on blue)
   - Animations: Each with `float3d` + `rotation` (slow spin)

3. **Search Connection Lines (Vector search visualization)**:
   - Geometry: Line geometry connecting laptop to each document
   - Material: LineBasicMaterial({ color: 0x6366F1, linewidth: 2, transparent: true, opacity: 0.6 })
   - Animation: Pulsing opacity (0.3 → 0.9 → 0.3) using GSAP timeline
   - Pattern: Dashed lines (THREE.LineDashedMaterial) for vector search effect

4. **Particle System (Semantic search particles)**:
   - Component: `<app-particle-system>`
   - Count: 100 particles
   - Color: 0x6366F1 (indigo)
   - Size: 0.03
   - Distribution: Around laptop and documents (showing search space)
   - Animation: Slow drift motion + `float3d`

**Interaction**:

- Mouse Parallax: `mouseParallax3d` with sensitivity 0.4
- Scroll Animation: `scrollAnimation` fade-in on viewport entry
- Performance: `performance3d` directive (auto-adjust quality)

**Benefit**: Shows real-time RAG retrieval as interactive 3D visualization (vs static image)

---

#### Use Case 2: Multi-Agent Research ⚡ ANGULAR-3D

**Implementation**: Interactive 3D Scene
**Component**: `MultiAgent3DSceneComponent`

**3D Scene Specification**:

**Scene Setup**:

- Canvas size: 600x500px
- Camera: PerspectiveCamera, position [0, 8, 20], FOV 55
- Circular arrangement of agents around central knowledge base

**3D Elements**:

1. **Agent Spheres (3-4 agents)**:
   - Geometry: SphereGeometry(0.8, 32, 32) each
   - Material: MeshStandardMaterial with gradient (indigo shades: 0x6366F1, 0x8B5CF6, 0xA855F7, 0xC084FC)
   - Positions: Circular arrangement at radius 6
     - Agent 1: [6, 0, 0]
     - Agent 2: [3, 5.2, 0] (120° rotation)
     - Agent 3: [-3, 5.2, 0] (240° rotation)
     - Agent 4: [-6, 0, 0] (optional 4th agent)
   - Animation: `float3d` + slow rotation on Y-axis
   - Glow Effect: `glow3d` with `[glowConfig]="{ color: 0x6366F1, intensity: 0.3, scale: 1.3 }"`

2. **Central Knowledge Base (Large sphere with particles)**:
   - Geometry: SphereGeometry(2, 32, 32)
   - Material: MeshStandardMaterial({ color: 0xEEF2FF, metalness: 0.2, roughness: 0.6, emissive: 0x6366F1, emissiveIntensity: 0.1 })
   - Position: [0, 0, 0] (center)
   - Particle System: 200 particles orbiting knowledge base
   - Animation: Slow rotation + pulsing scale (1.0 → 1.05 → 1.0)

3. **Thought Bubbles (Communication visualization)**:
   - Geometry: SphereGeometry(0.2, 16, 16) - small spheres
   - Material: MeshBasicMaterial({ color: 0xFFFBEB, transparent: true, opacity: 0.8 })
   - Animation: Move from agent to knowledge base along curved path (using GSAP MotionPathPlugin)
   - Spawn rate: Every 2 seconds, random agent as source
   - Lifecycle: Fade out when reaching knowledge base

4. **Connection Lines (Agent collaboration)**:
   - Geometry: Lines connecting each agent to knowledge base
   - Material: LineBasicMaterial({ color: 0x9CA3AF, transparent: true, opacity: 0.4 })
   - Animation: Pulsing opacity when thought bubble travels

**Interaction**:

- Mouse Parallax: Subtle camera rotation (sensitivity: 0.3)
- Agent Hover: Scale up agent on mouse hover (future enhancement)
- Scroll Animation: `scrollAnimation` with staggered agent appearances

**Benefit**: Dynamic collaboration visualization showing agents working together (vs static diagram)

---

#### Use Case 3: Customer Service Automation 🎨 STATIC IMAGE

**Implementation**: Simple static PNG/SVG illustration (NOT Angular-3D)
**Reason**: Simple linear flow - doesn't benefit from 3D interactivity
**File Name**: `use-case-customer-service.png`
**Dimensions**: 800x600px
**Format**: PNG or SVG

**Illustration Concept**: AI + Human hybrid support flow

**Elements**:

- Left: AI robot icon (simple flat illustration)
- Center: Customer inquiry chat bubble
- Right: Human support agent icon
- Arrows: Customer → AI → Human (escalation flow)
- Style: Clean, flat, 2D illustration
- Colors: Indigo (#6366F1), light indigo (#EEF2FF), white background
- Source: unDraw.co or Blush Design (customize to indigo color)

---

#### Use Case 4: Content Generation Pipeline 🎨 STATIC IMAGE

**Implementation**: Simple static PNG/SVG illustration (NOT Angular-3D)
**Reason**: Linear pipeline flow - better shown as 2D diagram
**File Name**: `use-case-content-pipeline.png`
**Dimensions**: 800x600px
**Format**: PNG or SVG

**Elements**:

- 3 stations/stages: Research → Writing → Editing
- Each station: Simple agent icon + processing indicator
- Document icon moving left-to-right through pipeline
- Progress indicators (1 of 3, 2 of 3, 3 of 3)
- Style: Clean, flat, 2D flow diagram
- Colors: Indigo (#6366F1), light indigo (#EEF2FF), white background
- Source: unDraw.co or custom Figma design

---

**Decision Matrix for Use Cases**:

| Use Case | Implementation | Reason |
|----------|---------------|--------|
| Enterprise RAG System | ⚡ Angular-3D | Complex retrieval visualization, benefits from interactivity |
| Multi-Agent Research | ⚡ Angular-3D | Dynamic collaboration, benefits from 3D depth |
| Customer Service Automation | 🎨 Static Image | Simple linear flow, 2D sufficient |
| Content Generation Pipeline | 🎨 Static Image | Sequential process, 2D sufficient |

**AI Prompt for Static Images** (DALL-E/Midjourney):

```
Create a clean, modern flat illustration for a SaaS landing page showing [USE CASE CONCEPT]. Use indigo (#6366F1) and light indigo (#EEF2FF) colors on white background. Minimalist 2D design style with 3-5 geometric elements. Professional, tech-focused aesthetic. 800x600px composition. Clean lines, generous whitespace, Apple/Stripe aesthetic.
```

**Recommended Source for Static Images**:

- unDraw (<https://undraw.co>) - Free, customizable, indigo color option
- Humaaans (<https://www.humaaans.com>) - Mix & match characters
- Blush Design (<https://blush.design>) - Curated illustrations
- Figma + unDraw library - Customize and export

---

### Asset 4: Section Divider Graphics (Optional)

**Purpose**: Visual separation between major sections
**Usage**: Between all sections (optional enhancement)
**File Name Pattern**: `divider-{style}.svg`
**Dimensions**: Full-width responsive (SVG)
**Format**: SVG

**Divider Styles**:

1. **Wavy Divider**:

   - Smooth wave curve
   - Color: Light gray (#F9FAFB) to white gradient
   - Height: 100px

2. **Dot Pattern**:

   - Sparse dots fading out
   - Color: #E5E7EB
   - Height: 60px

3. **Angled Separator**:
   - Diagonal slice
   - Color: Section background colors
   - Height: 80px

**SVG Example** (Wavy Divider):

```svg
<svg width="100%" height="100" viewBox="0 0 1440 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M0,50 Q360,20 720,50 T1440,50 L1440,100 L0,100 Z" fill="#F9FAFB"/>
</svg>
```

---

## Asset Integration Instructions

### Where to Place Assets

**Architecture Diagram**:

- Location: `apps/dev-brand-ui/src/assets/images/architecture-12-libraries.png`
- Usage: `<img src="assets/images/architecture-12-libraries.png" alt="12-Library Architecture" />`
- Section: Complete Integration Showcase

**Library Icons**:

- Location: `apps/dev-brand-ui/src/assets/icons/libraries/`
- Pattern: `icon-chromadb.svg`, `icon-neo4j.svg`, etc.
- Usage: `<img src="assets/icons/libraries/icon-chromadb.svg" alt="ChromaDB" class="w-16 h-16" />`
- Sections: Data Foundation, LangGraph Foundation, Orchestration, Agent Systems, Production

**Use Case Illustrations**:

- Location: `apps/dev-brand-ui/src/assets/images/use-cases/`
- Pattern: `use-case-rag-system.png`, etc.
- Usage: `<img src="assets/images/use-cases/use-case-rag-system.png" alt="Enterprise RAG System" />`
- Section: Production Use Cases

**Section Dividers** (Optional):

- Location: `apps/dev-brand-ui/src/assets/images/dividers/`
- Usage: Background images or inline SVG
- Sections: Between all major sections

### Asset Optimization

**Before Integration**:

1. **Optimize PNGs**:

   - Use TinyPNG or ImageOptim
   - Target: < 100KB per image
   - Format: PNG-8 if possible, PNG-24 if gradients

2. **Optimize SVGs**:

   - Use SVGO or SVGOMG
   - Remove unnecessary metadata
   - Minify paths
   - Target: < 10KB per icon

3. **Responsive Images**:

   - Provide 1x and 2x versions for retina displays
   - Architecture diagram: `architecture-12-libraries.png` (1200px) and `architecture-12-libraries@2x.png` (2400px)
   - Use `srcset` attribute:

     ```html
     <img
       src="architecture-12-libraries.png"
       srcset="architecture-12-libraries.png 1x, architecture-12-libraries@2x.png 2x"
       alt="12-Library Architecture"
     />
     ```

4. **Lazy Loading**:
   - Add `loading="lazy"` to all images except above-the-fold
   - Example: `<img src="use-case.png" loading="lazy" />`

### Asset Creation Workflow

**If using Canva.com manually**:

1. Go to Canva.com → Create Design → Custom Size
2. Enter dimensions (2400x1800px for architecture diagram)
3. Use specifications above for layout, colors, typography
4. Add elements: Shapes, text, icons, arrows
5. Export → PNG → Download
6. Optimize with TinyPNG
7. Upload to project assets folder

**If using Figma**:

1. Create frame with specified dimensions
2. Use Auto Layout for consistent spacing
3. Add rectangles, text, vector icons per specs
4. Use color variables for design system colors
5. Export → PNG or SVG
6. Optimize and upload

**If using AI Image Generation** (DALL-E, Midjourney):

1. Use provided AI prompts above
2. Generate multiple variations
3. Select best match to specifications
4. Download highest resolution
5. Post-process if needed (crop, resize, optimize)
6. Upload to project

---

## Asset Delivery Checklist

Before marking assets complete, ensure:

- [ ] Architecture diagram created (2400x1800px PNG)
- [ ] 12 library icons created (256x256px SVG or PNG)
- [ ] 4 use case illustrations created (800x600px PNG)
- [ ] All assets optimized (< 100KB PNGs, < 10KB SVGs)
- [ ] All assets placed in correct asset folders
- [ ] File naming convention followed (lowercase, hyphens)
- [ ] Alternative text descriptions prepared
- [ ] Responsive versions created (1x and 2x)
- [ ] Assets referenced in developer handoff document

---

## Fallback Options (If Assets Cannot Be Created)

**If professional assets unavailable**:

1. **Use Icon Libraries**:

   - Heroicons, Lucide, Feather for library icons
   - Customize color to #6366F1

2. **Use Free Illustration Libraries**:

   - unDraw for use case illustrations (select indigo color)
   - Humaaans for character-based illustrations

3. **Create Simple SVG Icons**:

   - Use basic shapes (circles, rectangles, paths)
   - Follow SVG template examples above
   - Keep minimal and clean

4. **Placeholder Approach**:

   - Use colored rectangles with library names
   - Focus on typography and layout first
   - Replace with professional assets later

5. **ASCII/Text Diagrams**:
   - For architecture diagram, use styled HTML boxes
   - Create with CSS Grid and Flexbox
   - Add arrows with CSS pseudo-elements or SVG

---

## Asset Sources & Tools

**Icon Creation**:

- Figma: Free, browser-based design tool
- Inkscape: Free, open-source vector editor
- Canva: Free tier available with export options

**Illustration Creation**:

- unDraw: Free customizable illustrations
- Blush Design: Curated illustration libraries
- Storyset: Animated and static illustrations (free tier)

**Optimization Tools**:

- TinyPNG: PNG compression (<https://tinypng.com>)
- SVGOMG: SVG optimization (<https://jakearchibald.github.io/svgomg/>)
- ImageOptim: Mac app for image optimization

**AI Generation** (if available):

- DALL-E 3: High-quality AI image generation
- Midjourney: Artistic AI illustrations
- Stable Diffusion: Open-source AI generation

---

**Document Version**: 1.0
**Created**: 2025-01-22
**Task ID**: TASK_2025_017
**Status**: Asset Specifications Complete - Ready for Creation
**Total Assets**: 18 (1 diagram + 12 icons + 4 illustrations + 1 optional dividers)
