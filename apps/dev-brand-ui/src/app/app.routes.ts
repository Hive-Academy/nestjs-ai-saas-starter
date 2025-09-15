import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/landing',
    pathMatch: 'full',
  },
  {
    path: 'landing',
    loadComponent: () =>
      import('./features/landing-page/landing-page.component').then(
        (m) => m.LandingPageComponent
      ),
    title: 'NestJS AI SaaS Starter',
  },
  {
    path: 'spatial-interface',
    loadComponent: () =>
      import('./features/spatial-interface/spatial-interface.component').then(
        (m) => m.SpatialInterfaceComponent
      ),
    title: '3D Agent Visualization',
  },
  {
    path: 'workflow-canvas',
    loadComponent: () =>
      import('./features/workflow-canvas/workflow-canvas.component').then(
        (m) => m.WorkflowCanvasComponent
      ),
    title: 'Workflow Canvas',
  },
  {
    path: 'memory-constellation',
    loadComponent: () =>
      import(
        './features/memory-constellation/memory-constellation.component'
      ).then((m) => m.MemoryConstellationComponent),
    title: 'Memory Constellation',
  },
  {
    path: 'chat-interface',
    loadComponent: () =>
      import('./features/chat-interface/chat-interface.component').then(
        (m) => m.ChatInterfaceComponent
      ),
    title: 'AI Chat Interface',
  },
  {
    path: 'content-forge',
    loadComponent: () =>
      import('./features/content-forge/content-forge.component').then(
        (m) => m.ContentForgeComponent
      ),
    title: 'Content Forge',
  },
  {
    path: '**',
    redirectTo: '/spatial-interface',
  },
];
