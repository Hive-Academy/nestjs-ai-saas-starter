import type { Routes } from '@angular/router';

export const DOCUMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: async () =>
      import('./documents-list/documents-list.component').then(
        (m) => m.DocumentsListComponent
      ),
    title: 'Documents - AI SaaS Starter',
  },
  {
    path: 'upload',
    loadComponent: async () =>
      import('./document-upload/document-upload.component').then(
        (m) => m.DocumentUploadComponent
      ),
    title: 'Upload Document - AI SaaS Starter',
  },
  {
    path: 'search',
    loadComponent: async () =>
      import('./document-search/document-search.component').then(
        (m) => m.DocumentSearchComponent
      ),
    title: 'Search Documents - AI SaaS Starter',
  },
  {
    path: ':id',
    loadComponent: async () =>
      import('./document-detail/document-detail.component').then(
        (m) => m.DocumentDetailComponent
      ),
    title: 'Document Details - AI SaaS Starter',
  },
];
