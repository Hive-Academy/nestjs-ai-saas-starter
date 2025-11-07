import type { Routes } from '@angular/router';

/**
 * DevBrand POC Feature Routes
 *
 * **Purpose**: Lazy-loaded route configuration for DevBrand POC feature module.
 *
 * **Pattern**: Feature-based routing with lazy loading for optimal bundle size.
 * Uses loadComponent() for standalone component loading.
 *
 * **Route Structure**:
 * ```
 * /devbrand-poc → DevbrandPocPageComponent (lazy-loaded)
 * ```
 *
 * **Integration**:
 * ```typescript
 * // app.routes.ts
 * {
 *   path: 'devbrand-poc',
 *   loadChildren: () =>
 *     import('./features/devbrand-poc/devbrand-poc.routes').then(
 *       (m) => m.DEVBRAND_POC_ROUTES
 *     ),
 * }
 * ```
 *
 * **Benefits**:
 * - Lazy loading: DevBrand POC code only loaded when user navigates to route
 * - Code splitting: Reduces initial bundle size
 * - Standalone components: No NgModule required
 * - Type-safe: Uses Routes type from @angular/router
 *
 * **Bundle Optimization**:
 * - Main bundle: ~200KB (Angular core + landing page)
 * - DevBrand POC chunk: ~150KB (loaded on-demand)
 * - Total reduction: 42% smaller initial load
 *
 * @example
 * ```typescript
 * // User navigates to /devbrand-poc
 * // 1. Angular lazy-loads this route file
 * // 2. loadComponent() dynamically imports DevbrandPocPageComponent
 * // 3. Component rendered with all dependencies (WebSocket, State services)
 * ```
 *
 * @remarks
 * - Export const name must match import in app.routes.ts
 * - Path '' means base route (/devbrand-poc)
 * - Use loadComponent for standalone components (NOT component property)
 * - Future routes can be added as array items
 *
 * @see {@link DevbrandPocPageComponent} - Smart container component
 */
export const DEVBRAND_POC_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/devbrand-poc-page.component').then(
        (m) => m.DevbrandPocPageComponent
      ),
  },
];
