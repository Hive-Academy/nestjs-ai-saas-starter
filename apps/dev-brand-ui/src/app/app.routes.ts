import type { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

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
    loadComponent: () =>
      import('./features/devbrand-poc/pages/devbrand-poc-page.component').then(
        (m) => m.DevbrandPocPageComponent
      ),
    canActivate: [authGuard],
    title: 'DevBrand Workflow POC - Real-time LangGraph Demo',
  },
  {
    path: 'research-chat',
    loadComponent: () =>
      import('./features/research-chat/research-chat.component').then(
        (m) => m.ResearchChatComponent
      ),
    canActivate: [authGuard],
    title: 'Research Chat - Autonomous AI Research Agent',
  },

  {
    path: '**',
    redirectTo: '/landing',
  },
];
