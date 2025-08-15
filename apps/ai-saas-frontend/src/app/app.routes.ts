import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: async () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
    title: 'Dashboard - AI SaaS Starter',
  },
  {
    path: 'documents',
    loadChildren: async () =>
      import('./features/documents/documents.routes').then(
        (m) => m.DOCUMENTS_ROUTES
      ),
    title: 'Document Management',
  },
  {
    path: 'graph',
    loadChildren: async () =>
      import('./features/graph/graph.routes').then((m) => m.GRAPH_ROUTES),
    title: 'Knowledge Graph',
  },
  {
    path: 'workflows',
    loadChildren: async () =>
      import('./features/workflows/workflows.routes').then(
        (m) => m.WORKFLOWS_ROUTES
      ),
    title: 'AI Workflows',
  },
  {
    path: 'health',
    loadComponent: async () =>
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
