import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Auth Guard
 *
 * Functional route guard (Angular v17+) for authentication check.
 * Redirects unauthenticated users to landing page.
 *
 * **Pattern**: Functional guard (NOT class-based)
 * **Evidence**: Angular v17+ best practice
 *
 * @example
 * ```typescript
 * // In route config
 * {
 *   path: 'dashboard',
 *   component: DashboardComponent,
 *   canActivate: [authGuard],
 * }
 * ```
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Computed signals are functions, call them to get value
  const isAuthenticated = authService.isAuthenticated$();

  if (isAuthenticated) {
    return true;
  }

  // Redirect to landing with return URL
  return router.createUrlTree(['/landing'], {
    queryParams: { returnUrl: state.url },
  });
};
