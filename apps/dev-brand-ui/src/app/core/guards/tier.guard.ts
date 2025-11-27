import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import type { UserTier } from '../models/auth';

/**
 * Tier Guard
 *
 * Functional route guard for tier-based access control.
 * Redirects users without required tier to upgrade page.
 *
 * @example
 * ```typescript
 * {
 *   path: 'premium-features',
 *   component: PremiumComponent,
 *   canActivate: [tierGuard],
 *   data: { tier: 'pro' }, // Minimum tier required
 * }
 * ```
 */
export const tierGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredTier = route.data['tier'] as UserTier | undefined;

  if (!requiredTier) {
    return true;
  }

  if (authService.hasTier(requiredTier)) {
    return true;
  }

  // Redirect to upgrade page
  return router.createUrlTree(['/upgrade'], {
    queryParams: { tier: requiredTier },
  });
};
