import type { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: '/devbrand-showcase',
    pathMatch: 'full',
  },
  // New Showcase Routes
  {
    path: 'devbrand-showcase',
    loadComponent: () =>
      import('./features/devbrand-showcase/devbrand-showcase.component').then(
        (m) => m.DevbrandShowcaseComponent
      ),
    title: 'DevBrand Platform Showcase',
  },
  {
    path: 'multi-agent-patterns',
    loadComponent: () =>
      import(
        './features/multi-agent-patterns/multi-agent-patterns.component'
      ).then((m) => m.MultiAgentPatternsComponent),
    title: 'Multi-Agent Coordination Patterns',
  },
  {
    path: 'library-showcase',
    loadComponent: () =>
      import('./features/library-showcase/library-showcase.component').then(
        (m) => m.LibraryShowcaseComponent
      ),
    title: 'Complete Library Ecosystem',
  },
  {
    path: 'developer-experience',
    loadComponent: () =>
      import(
        './features/developer-experience/developer-experience.component'
      ).then((m) => m.DeveloperExperienceComponent),
    title: 'Developer Experience Revolution',
  },
  // Original Interface Modes
  {
    path: 'chat',
    loadComponent: () =>
      import('./features/chat-interface/chat-interface.component').then(
        (m) => m.ChatInterfaceComponent
      ),
    title: 'DevBrand Chat Studio',
  },
  {
    path: 'spatial',
    loadComponent: () =>
      import('./features/spatial-interface/spatial-interface.component').then(
        (m) => m.SpatialInterfaceComponent
      ),
    title: 'Agent Constellation',
  },
  {
    path: 'canvas',
    loadComponent: () =>
      import('./features/workflow-canvas/workflow-canvas.component').then(
        (m) => m.WorkflowCanvasComponent
      ),
    title: 'Living Workflow Canvas',
  },
  {
    path: 'memory',
    loadComponent: () =>
      import(
        './features/memory-constellation/memory-constellation.component'
      ).then((m) => m.MemoryConstellationComponent),
    title: 'Memory Constellation',
  },
  {
    path: 'forge',
    loadComponent: () =>
      import('./features/content-forge/content-forge.component').then(
        (m) => m.ContentForgeComponent
      ),
    title: 'Content Forge',
  },
  {
    path: '**',
    redirectTo: '/devbrand-showcase',
  },
];
