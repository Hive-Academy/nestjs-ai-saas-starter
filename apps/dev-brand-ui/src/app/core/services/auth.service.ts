import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, tap, throwError, EMPTY } from 'rxjs';
import { Router } from '@angular/router';
import type { User, SseTicketResponse } from '../models/auth';

/**
 * AuthService
 *
 * Signal-based authentication service for WorkOS JWT authentication.
 * Manages user state, login/logout flows, SSE ticket generation.
 *
 * **Pattern**: Modern Angular signals (NOT BehaviorSubject)
 * **Evidence**: devbrand-sse.service.ts:76-82 (signal pattern)
 *
 * @example
 * ```typescript
 * const authService = inject(AuthService);
 *
 * // Check auth state
 * if (authService.isAuthenticated()) {
 *   console.log('User:', authService.user());
 * }
 *
 * // Initiate login
 * authService.login();
 *
 * // Logout
 * authService.logout();
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  /**
   * Private writable user signal
   * Pattern: devbrand-sse.service.ts:76-82
   */
  private readonly _user = signal<User | null>(null);

  /**
   * Public readonly user signal
   */
  readonly user$ = this._user.asReadonly();

  /**
   * Computed authentication status
   */
  readonly isAuthenticated$ = computed(() => this.user$() !== null);

  /**
   * Computed user tier
   */
  readonly userTier$ = computed(() => this.user$()?.tier ?? 'free');

  /**
   * Computed user roles
   */
  readonly userRoles$ = computed(() => this.user$()?.roles ?? []);

  /**
   * Load current user from backend
   *
   * Calls GET /auth/me to fetch authenticated user data.
   * Sets user signal on success, clears on 401.
   *
   * @returns Observable<User>
   */
  loadUser(): Observable<User> {
    return this.http.get<User>('/api/auth/me').pipe(
      tap((user) => this._user.set(user)),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Not authenticated - this is a valid state, just clear user
          this._user.set(null);
          return EMPTY; // Return empty observable, don't throw
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Initiate login flow
   *
   * Redirects browser to /auth/login (WorkOS OAuth)
   */
  login(): void {
    // Store return URL before redirect
    const returnUrl = this.router.url;
    sessionStorage.setItem('auth_return_url', returnUrl);

    // Redirect to backend login endpoint
    window.location.href = '/api/auth/login';
  }

  /**
   * Logout user
   *
   * Clears user state and redirects to landing page
   */
  logout(): void {
    // Call backend logout endpoint (clears cookie)
    this.http.post('/api/auth/logout', {}).subscribe({
      next: () => {
        this._user.set(null);
        this.router.navigate(['/landing']);
      },
      error: () => {
        // Clear state even if backend fails
        this._user.set(null);
        this.router.navigate(['/landing']);
      },
    });
  }

  /**
   * Get SSE ticket for EventSource connection
   *
   * Calls POST /auth/stream/ticket to obtain short-lived ticket.
   * Ticket is valid for 30s, single-use.
   *
   * @returns Observable<string> - Ticket value
   */
  getSseTicket(): Observable<string> {
    return this.http
      .post<SseTicketResponse>('/api/auth/stream/ticket', {})
      .pipe(
        tap((response) => console.log('SSE ticket obtained:', response.ticket)),
        catchError((error: HttpErrorResponse) => {
          console.error('Failed to get SSE ticket:', error);
          return throwError(() => 'Failed to obtain SSE ticket');
        }),
        // Extract ticket from response
        map((response) => response.ticket)
      );
  }

  /**
   * Check if user has required role
   */
  hasRole(role: string): boolean {
    return this.userRoles$().includes(role);
  }

  /**
   * Check if user has required tier
   */
  hasTier(tier: 'free' | 'pro' | 'enterprise'): boolean {
    const tierOrder = { free: 0, pro: 1, enterprise: 2 };
    const userTierLevel = tierOrder[this.userTier$()];
    const requiredTierLevel = tierOrder[tier];
    return userTierLevel >= requiredTierLevel;
  }
}
