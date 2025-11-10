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
    title: 'NestJS AI SaaS Starter - Enterprise AI Platform',
  },
  {
    path: 'devbrand-poc',
    loadChildren: () =>
      import('./features/devbrand-poc/devbrand-poc.routes').then(
        (m) => m.DEVBRAND_POC_ROUTES
      ),
    title: 'DevBrand Workflow POC - Real-time LangGraph Demo',
  },
  {
    path: 'research-chat',
    loadComponent: () =>
      import('./features/research-chat/research-chat.component').then(
        (m) => m.ResearchChatComponent
      ),
    title: 'Research Chat - Autonomous AI Research Agent',
  },

  {
    path: '**',
    redirectTo: '/landing',
  },
];
