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
    path: '**',
    redirectTo: '/landing',
  },
];
