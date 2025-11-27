import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Auth HTTP Interceptor
 *
 * Functional interceptor (Angular v17+) for cookie authentication.
 * Automatically includes cookies in all HTTP requests.
 * Handles 401/403 responses globally.
 *
 * **Pattern**: Functional interceptor (NOT class-based)
 * **Evidence**: Angular v17+ best practice
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // Clone request with withCredentials: true
  const authReq = req.clone({
    withCredentials: true, // Include cookies
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Unauthorized - redirect to landing with login prompt
        console.warn(
          '[AuthInterceptor] 401 Unauthorized - redirecting to login'
        );
        router.navigate(['/landing'], {
          queryParams: { returnUrl: router.url, reason: 'session_expired' },
        });
      } else if (error.status === 403) {
        // Forbidden - show access denied message
        console.error('[AuthInterceptor] 403 Forbidden - access denied');
        // TODO: Show notification toast
      }

      return throwError(() => error);
    })
  );
};
