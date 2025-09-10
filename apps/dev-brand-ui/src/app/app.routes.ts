import type { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: '/chat',
    pathMatch: 'full',
  },
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
    redirectTo: '/chat',
  },
];
