import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Role Guard
 *
 * Functional route guard for role-based access control.
 * Checks user roles against route data.
 *
 * @example
 * ```typescript
 * {
 *   path: 'admin',
 *   component: AdminComponent,
 *   canActivate: [roleGuard],
 *   data: { roles: ['admin', 'manager'] }, // OR logic
 * }
 * ```
 */
export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as string[] | undefined;

  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  const hasRole = requiredRoles.some((role) => authService.hasRole(role));

  if (hasRole) {
    return true;
  }

  // Access denied
  return router.createUrlTree(['/access-denied']);
};
