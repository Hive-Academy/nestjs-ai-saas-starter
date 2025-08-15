import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
    title: 'Dashboard - AI SaaS Starter',
  },
  {
    path: 'documents',
    loadChildren: () =>
      import('./features/documents/documents.routes').then(
        (m) => m.DOCUMENTS_ROUTES
      ),
    title: 'Document Management',
  },
  {
    path: 'graph',
    loadChildren: () =>
      import('./features/graph/graph.routes').then((m) => m.GRAPH_ROUTES),
    title: 'Knowledge Graph',
  },
  {
    path: 'workflows',
    loadChildren: () =>
      import('./features/workflows/workflows.routes').then(
        (m) => m.WORKFLOWS_ROUTES
      ),
    title: 'AI Workflows',
  },
  {
    path: 'health',
    loadComponent: () =>
      import('./features/health/health.component').then(
        (m) => m.HealthComponent
      ),
    title: 'System Health',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
