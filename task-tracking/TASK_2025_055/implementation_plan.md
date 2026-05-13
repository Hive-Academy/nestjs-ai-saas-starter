# Implementation Plan - TASK_2025_055

**Task**: Frontend Authentication Integration  
**Status**: Architecture Complete  
**Date**: 2025-11-28  
**Architect**: Software Architect Agent

---

## Goal

Integrate Angular frontend (`apps/dev-brand-ui`) with the completed backend authentication system from TASK_2025_054. Implement WorkOS OAuth login/logout flow, JWT cookie-based authentication, SSE ticket authentication, protected route guards (role/permission/tier-based), tier-based UI elements, and user profile display using Angular signals and standalone components.

**Business Value**: Enable secure user access to Dev Brand SaaS platform with tier-based features (free/pro/enterprise), protected workflows, and authenticated real-time streaming.

---

## 📊 Codebase Investigation Summary

### Patterns Discovered

**1. Service Pattern** (Evidence: `conversation-api.service.ts:60-68`)

- **Injectable**: `providedIn: 'root'` for singleton services
- **Inject Function**: Modern `inject(HttpClient)` instead of constructor injection
- **HttpClient**: RxJS Observable-based HTTP requests
- **Error Handling**: `catchError` operator with user-friendly messages

**2. Signal-Based State** (Evidence: `token-stream-display.component.ts:94-95`)

- **Signal**: `signal<T>()` for writable state
- **Readonly**: `.asReadonly()` for immutable public accessors
- **Computed**: `computed(() => ...)` for derived state
- **Pattern**: Private writable signals, readonly public signals

**3. SSE EventSource Pattern** (Evidence: `devbrand-sse.service.ts:161-186`)

- **EventSource API**: Native browser SSE support
- **Event Handling**: `.addEventListener()` for custom events
- **State Management**: Signal-based connection state
- **Cleanup**: `.close()` on disconnect

**4. Standalone Components** (Evidence: `token-stream-display.component.ts:41-45`)

- **Decorator**: `@Component({ standalone: true })`
- **Imports**: Array of imported modules as Established pattern across all components **Modern**
  - `signal()` for state
  - `input()` / `output()` for props/events
  - `computed()` for derived values
  - `inject()` for dependency injection

**6. HTTP Configuration** (Evidence: `app.config.ts:19`)

- **Provider**: `provideHttpClient(withInterceptorsFromDi())`
- **Interceptors**: Allows DI-based HTTP interceptors
- **Location**: Configured in `app.config.ts`

---

## 🏗️ Architecture Design

### Design Philosophy

**Chosen Approach**: Signal-Based Authentication Service + Functional Route Guards + HTTP Interceptor

**Rationale**:

1. **Signals**: Modern Angular pattern for reactive state (evidence: all existing components)
2. **Functional Guards**: Angular v17+ best practice for route protection
3. **Cookie Auth**: Backend sets HTTP-only cookies, frontend includes automatically
4. **SSE Tickets**: Short-lived tickets for EventSource (evidence: devbrand-sse.service.ts pattern)

**Evidence**:

- Signal pattern: `token-stream-display.component.ts:94-95`
- Service pattern: `conversation-api.service.ts:60-68`
- SSE pattern: `devbrand-sse.service.ts:161-186`
- Standalone components: Universal across codebase

### Backend Integration Contract

From TASK_2025_054 completion:

```typescript
// Authentication Endpoints
POST   /auth/login              // Redirect to WorkOS OAuth
GET    /auth/callback?code=X    // Sets JWT cookie, redirects to frontend
GET    /auth/me                 // Returns { userId, email, roles, tier, permissions }
POST   /auth/stream/ticket      // Returns { ticket: string } (30s TTL, single-use)

// JWT Cookie
// - Name:AuthentityToken
// - HTTP-only: true
// - SameSite: Lax
// - Automatically included by browser

// SSE Authentication
//  EventSource cannot send custom headers
// - Solution:Use query parameter: ?token={ticket}
// - Guard: QueryTokenAuthGuard validates ticket
```

---

## 🎯 Component Specifications

### Component 1: Auth Models

**Purpose**: TypeScript interfaces matching backend contracts

**Pattern**: Model-first design (Evidence: `conversation.model.ts`)

#### Files to Create

##### [CREATE] `apps/dev-brand-ui/src/app/core/models/auth.ts`

**Purpose**: Type-safe auth models matching backend UserContext

**Pattern Reference**: `shared/models/conversation.model.ts` (export pattern)

**Implementation**:

```typescript
/**
 * User authentication model
 * Matches backend UserContext from WorkflowAuthContextService
 */
export interface User {
  /** User unique identifier */
  userId: string;

  /** Tenant/organization identifier */
  tenantId: string;

  /** User email address */
  email: string;

  /** User roles (e.g., 'admin', 'user', 'viewer') */
  roles: string[];

  /** Subscription tier */
  tier: UserTier;

  /** Fine-grained permissions */
  permissions?: string[];
}

/**
 * Subscription tier enum
 */
export type UserTier = 'free' | 'pro' | 'enterprise';

/**
 * Auth state configuration for routes
 */
export interface AuthConfig {
  /** Require authentication */
  required?: boolean;

  /** Required roles (OR logic) */
  roles?: string[];

  /** Required tier (minimum tier) */
  tier?: UserTier;

  /** Required permissions (AND logic) */
  permissions?: string[];
}

/**
 * SSE ticket response from backend
 */
export interface SseTicketResponse {
  /** Short-lived ticket (30s TTL) */
  ticket: string;
}

/**
 * Auth error types
 */
export type AuthErrorType =
  | 'UNAUTHENTICATED'
  | 'INSUFFICIENT_ROLE'
  | 'INSUFFICIENT_TIER'
  | 'INSUFFICIENT_PERMISSION';
```

**Quality Requirements**:

- Exact match with backend `UserContext` interface
- Export all types from barrel file
- JSDoc comments for IDE autocomplete
- No `any` types, full TypeScript strict compliance

---

### Component 2: AuthService

**Purpose**: Centralized auth state management using Angular signals

**Pattern**: Signal-based state service (Evidence: `devbrand-sse.service.ts:76-82`)

#### Files to Create

##### [CREATE] `apps/dev-brand-ui/src/app/core/services/auth.service.ts`

**Purpose**: Manage authentication state, login/logout, user data loading

**Pattern Reference**:

- Signal state: `devbrand-sse.service.ts:76-82` (private writable, readonly accessors)
- HttpClient injection: `conversation-api.service.ts:68`
- Error handling: `conversation-api.service.ts:448-508`

**Implementation**:

````typescript
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
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
          // Not authenticated
          this._user.set(null);
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
    return this.http.post<SseTicketResponse>('/api/auth/stream/ticket', {}).pipe(
      tap((response) => console.log('SSE ticket obtained:', response.ticket)),
      catchError((error: HttpErrorResponse) => {
        console.error('Failed to get SSE ticket:', error);
        return throwError(() => 'Failed to obtain SSE ticket');
      }),
      // Extract ticket from response
      tap((response) => response.ticket)
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
````

**Quality Requirements**:

- Signal-based state (NOT RxJS BehaviorSubject)
- Readonly public accessors for immutability
- Computed signals for derived state (isAuthenticated, tier, roles)
- Cookie authentication (no manual token storage)
- Error handling with catchError
- Console logging for debugging

**Files Affected**:

- [CREATE] `apps/dev-brand-ui/src/app/core/services/auth.service.ts`

---

### Component 3: HTTP Interceptor

**Purpose**: Automatically include cookies in requests, handle 401/403 globally

**Pattern**: Angular HttpInterceptor with DI

#### Files to Create

##### [CREATE] `apps/dev-brand-ui/src/app/core/interceptors/auth.interceptor.ts`

**Purpose**: Add `withCredentials: true` to all requests, handle auth errors

**Pattern Reference**: Angular Functional Interceptor (v17+)

**Implementation**:

```typescript
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
        console.warn('[AuthInterceptor] 401 Unauthorized - redirecting to login');
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
```

**Quality Requirements**:

- Functional interceptor (Angular v17+)
- `withCredentials: true` for all requests
- Global 401/403 handling
- Preserve return URL for post-login redirect

**Files Affected**:

- [CREATE] `apps/dev-brand-ui/src/app/core/interceptors/auth.interceptor.ts`
- [MODIFY] `apps/dev-brand-ui/src/app/app.config.ts` - Register interceptor

---

### Component 4: Route Guards

**Purpose**: Protect routes based on authentication, roles, tiers

**Pattern**: Functional guards (Angular v17+)

#### Files to Create

##### [CREATE] `apps/dev-brand-ui/src/app/core/guards/auth.guard.ts`

**Purpose**: Redirect unauthenticated users to landing page

**Pattern Reference**: Angular Functional Guard

**Implementation**:

````typescript
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

  if (authService.isAuthenticated$()) {
    return true;
  }

  // Redirect to landing with return URL
  return router.createUrlTree(['/landing'], {
    queryParams: { returnUrl: state.url },
  });
};
````

##### [CREATE] `apps/dev-brand-ui/src/app/core/guards/role.guard.ts`

**Purpose**: Enforce role-based access control

**Implementation**:

````typescript
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
````

##### [CREATE] `apps/dev-brand-ui/src/app/core/guards/tier.guard.ts`

**Purpose**: Enforce tier-based access control

**Implementation**:

````typescript
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
````

**Quality Requirements**:

- Functional guards (Angular v17+)
- Type-safe with AuthConfig interface
- Preserve return URL for post-login redirect
- User-friendly error routes (/access-denied, /upgrade)

**Files Affected**:

- [CREATE] `apps/dev-brand-ui/src/app/core/guards/auth.guard.ts`
- [CREATE] `apps/dev-brand-ui/src/app/core/guards/role.guard.ts`
- [CREATE] `apps/dev-brand-ui/src/app/core/guards/tier.guard.ts`

---

### Component 5: Auth Components

**Purpose**: Login button, user profile dropdown, tier badge UI

**Pattern**: Standalone components with signals

#### Files to Create

##### [CREATE] `apps/dev-brand-ui/src/app/shared/components/auth/login-button.component.ts`

**Purpose**: Login CTA button for unauthenticated users

**Pattern Reference**: `token-stream-display.component.ts:41-45` (standalone component)

**Implementation**:

```typescript
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!authService.isAuthenticated$()) {
    <button type="button" class="login-btn" (click)="authService.login()">Log In</button>
    }
  `,
  styles: [
    `
      .login-btn {
        padding: 0.75rem 1.5rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s;
      }

      .login-btn:hover {
        transform: translateY(-2px);
      }
    `,
  ],
})
export class LoginButtonComponent {
  readonly authService = inject(AuthService);
}
```

##### [CREATE] `apps/dev-brand-ui/src/app/shared/components/auth/user-profile.component.ts`

**Purpose**: User profile dropdown in header

**Implementation**:

```typescript
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { TierBadgeComponent } from './tier-badge.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, TierBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (authService.isAuthenticated$(); as user) {
    <div class="profile-container">
      <button class="profile-button" (click)="toggleDropdown()">
        <div class="avatar">
          {{ getInitials(authService.user$()?.email) }}
        </div>
        <span class="email">{{ authService.user$()?.email }}</span>
      </button>

      @if (isDropdownOpen()) {
      <div class="dropdown">
        <div class="tier-section">
          <app-tier-badge [tier]="authService.userTier$()" />
        </div>
        <button class="dropdown-item" (click)="openAccountSettings()">Account Settings</button>
        <button class="dropdown-item" (click)="authService.logout()">Logout</button>
      </div>
      }
    </div>
    }
  `,
  styles: [
    /* TailwindCSS or inline styles */
  ],
})
export class UserProfileComponent {
  readonly authService = inject(AuthService);
  readonly isDropdownOpen = signal(false);

  toggleDropdown(): void {
    this.isDropdownOpen.update((open) => !open);
  }

  getInitials(email?: string): string {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  }

  openAccountSettings(): void {
    // TODO: Navigate to account settings
  }
}
```

##### [CREATE] `apps/dev-brand-ui/src/app/shared/components/auth/tier-badge.component.ts`

**Purpose**: Visual tier indicator (Free/Pro/Enterprise)

**Implementation**:

```typescript
import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { UserTier } from '../../../core/models/auth';

@Component({
  selector: 'app-tier-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="tier-badge" [class]="tierClass()">
      {{ tier() | titlecase }}
    </span>
  `,
  styles: [
    `
      .tier-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.875rem;
        font-weight: 600;
      }

      .tier-free {
        background: #e5e7eb;
        color: #374151;
      }

      .tier-pro {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .tier-enterprise {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
      }
    `,
  ],
})
export class TierBadgeComponent {
  readonly tier = input<UserTier>('free');

  tierClass(): string {
    return `tier-${this.tier()}`;
  }
}
```

**Quality Requirements**:

- Standalone components
- Signal-based state
- OnPush change detection
- Accessible (ARIA labels)
- Responsive design

**Files Affected**:

- [CREATE] `apps/dev-brand-ui/src/app/shared/components/auth/login-button.component.ts`
- [CREATE] `apps/dev-brand-ui/src/app/shared/components/auth/user-profile.component.ts`
- [CREATE] `apps/dev-brand-ui/src/app/shared/components/auth/tier-badge.component.ts`

---

### Component 6: SSE Ticket Integration

**Purpose**: Enhance existing SSE service to use authentication tickets

**Pattern**: Modify existing SSE service (Evidence: `devbrand-sse.service.ts`)

#### Files to Modify

##### [MODIFY] `apps/dev-brand-ui/src/app/features/devbrand-poc/services/devbrand-sse.service.ts`

**Line Range**: 161-186 (connect method)

**Changes**:

1. Import `AuthService`
2. Get SSE ticket before creating EventSource
3. Append ticket to streamUrl as query parameter

**Pattern Reference**: `devbrand-sse.service.ts:161-186` (existing connect pattern)

**Updated Implementation**:

```typescript
// Add to imports
import { AuthService } from '../../../core/services/auth.service';

// Update class
@Injectable({ providedIn: 'root' })
export class DevBrandSseService {
  private readonly authService = inject(AuthService);

  /**
   * Connect to SSE stream with authentication ticket
   *
   * Modified to obtain SSE ticket before establishing connection.
   * Evidence: TASK_2025_054 (backend SSE ticket authentication)
   */
  connect(streamUrl: string): void {
    console.log('🔌 [DevBrandSseService] connect() called');

    // Guard: Check if already connected
    if (this.eventSource) {
      console.warn('⚠️ [DevBrandSseService] Already connected');
      return;
    }

    // Update state: connecting
    this._connectionState.update((state) => ({ ...state, status: 'connecting' }));

    // NEW: Obtain SSE ticket from backend
    this.authService.getSseTicket().subscribe({
      next: (ticket) => {
        // Append ticket to URL as query parameter
        const authenticatedUrl = `${streamUrl}?token=${ticket}`;
        console.log('🎫 [DevBrandSseService] Ticket obtained, connecting...');

        // Create EventSource with authenticated URL
        this.eventSource = new EventSource(authenticatedUrl);

        // Register event listeners
        this.registerEventListeners();
      },
      error: (error) => {
        console.error('❌ [DevBrandSseService] Failed to obtain ticket:', error);
        this._connectionState.update((state) => ({
          ...state,
          status: 'error',
          lastError: 'Failed to obtain authentication ticket',
        }));
      },
    });
  }
}
```

**Quality Requirements**:

- Obtain ticket before EventSource creation
- Append ticket as query parameter
- Handle ticket errors gracefully
- Preserve existing event handling

**Files Affected**:

- [MODIFY] `apps/dev-brand-ui/src/app/features/devbrand-poc/services/devbrand-sse.service.ts`
- [MODIFY] `apps/dev-brand-ui/src/app/features/research-chat/services/research.service.ts` (if has SSE)

---

### Component 7: App Initialization

**Purpose**: Load user on app startup, register interceptor

#### Files to Modify

##### [MODIFY] `apps/dev-brand-ui/src/app/app.config.ts`

**Line Range**: 15-22 (providers array)

**Changes**:

1. Import auth interceptor
2. Register `provideHttpClient` with interceptor
3. Add APP_INITIALIZER to load user

**Pattern Reference**: `app.config.ts:19` (existing HttpClient provider)

**Updated Implementation**:

```typescript
import {
  type ApplicationConfig,
  APP_INITIALIZER,
  provideBrowser GlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideMarkdown } from 'ngx-markdown';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';

/**
 * Initialize user on app startup
 */
function initializeAuth(authService: AuthService) {
  return () => authService.loadUser().pipe(
    // Silently fail if not authenticated
    catchError(() => of(null))
  );
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // Register auth interceptor
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withInterceptorsFromDi()
    ),
    provideMarkdown(),
    // Load user on app startup
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
};
```

**Quality Requirements**:

- Interceptor registered properly
- User loaded on app startup (silently fail if unauthenticated)
- No breaking changes to existing config

**Files Affected**:

- [MODIFY] `apps/dev-brand-ui/src/app/app.config.ts`

---

### Component 8: Protected Routes Example

**Purpose**: Demonstrate guard usage in routing

#### Files to Modify

##### [MODIFY] `apps/dev-brand-ui/src/app/app.routes.ts`

**Line Range**: 3-38 (routes array)

**Changes**:

1. Add protected route examples
2. Apply guards to sensitive routes

**Pattern Reference**: `app.routes.ts:17-31` (existing routes)

**Example Protected Routes**:

```typescript
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { tierGuard } from './core/guards/tier.guard';

export const routes: Routes = [
  // ... existing routes

  // Protected: Authenticated users only
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component'),
    canActivate: [authGuard],
    title: 'Dashboard',
  },

  // Protected: Admin role required
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin.component'),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    title: 'Admin',
  },

  // Protected: Pro tier required
  {
    path: 'premium-features',
    loadComponent: () => import('./features/premium/premium.component'),
    canActivate: [authGuard, tierGuard],
    data: { tier: 'pro' },
    title: 'Premium Features',
  },

  // Existing routes retain current behavior
  {
    path: 'research-chat',
    loadComponent: () => import('./features/research-chat/research-chat.component'),
    title: 'Research Chat',
  },

  // Access Denied page
  {
    path: 'access-denied',
    loadComponent: () => import('./shared/components/access-denied.component'),
    title: 'Access Denied',
  },

  // Upgrade page
  {
    path: 'upgrade',
    loadComponent: () => import('./features/upgrade/upgrade.component'),
    title: 'Upgrade Your Plan',
  },
];
```

**Quality Requirements**:

- Guards applied correctly
- Route data typed properly
- Fallback routes defined (access-denied, upgrade)

**Files Affected**:

- [MODIFY] `apps/dev-brand-ui/src/app/app.routes.ts`

---

## Integration Architecture

### Data Flow

```
User Action (Login Button)
  ↓
window.location.href = '/api/auth/login'
  ↓
Backend WorkOS OAuth Flow
  ↓
GET /auth/callback?code=X (Backend sets JWT cookie)
  ↓
Redirect to Frontend
  ↓
APP_INITIALIZER: AuthService.loadUser()
  ↓
GET /api/auth/me (Cookie sent automatically)
  ↓
User Signal Updated → UI Reactively Updates
```

### SSE Authentication Flow

```
User Request (Open SSE Stream)
  ↓
AuthService.getSseTicket()
  ↓
POST /auth/stream/ticket (Cookie auth)
  ↓
Backend Returns { ticket: "abc123" }
  ↓
EventSource(`/api/stream?token=abc123`)
  ↓
Backend QueryTokenAuthGuard Validates Ticket
  ↓
Events Stream to Frontend
```

### State Management Flow

```
AuthService (Signal-Based)
  ↓
  ├─► user$ (readonly signal)
  ├─► isAuthenticated$ (computed)
  ├─► userTier$ (computed)
  └─► userRoles$ (computed)
       ↓
  Components (Reactive)
  ├─► LoginButtonComponent (@if !isAuthenticated)
  ├─► UserProfileComponent (@if isAuthenticated)
  ├─► Route Guards (canActivate: [authGuard])
  └─► Tier-Based UI (@if hasTier('pro'))
```

---

## Verification Plan

### Automated Tests

#### Unit Tests (New)

```bash
# Auth Service Tests
npx nx test dev-brand-ui --testPathPattern=auth.service.spec.ts

# Test Coverage:
# - loadUser() success/failure
# - login() redirect
# - logout() state clearing
# - getSseTicket() success/failure
# - hasRole() logic
# - hasTier() logic
```

**Test File to Create**:

- `apps/dev-brand-ui/src/app/core/services/auth.service.spec.ts`

#### Guard Tests (New)

```bash
# Auth Guard Tests
npx nx test dev-brand-ui --testPathPattern=auth.guard.spec.ts

# Test Coverage:
# - Allow authenticated users
# - Redirect unauthenticated with returnUrl
# - Role guard: allow matching role
# - Role guard: deny without role
# - Tier guard: allow sufficient tier
# - Tier guard: redirect to upgrade
```

**Test Files to Create**:

- `apps/dev-brand-ui/src/app/core/guards/auth.guard.spec.ts`
- `apps/dev-brand-ui/src/app/core/guards/role.guard.spec.ts`
- `apps/dev-brand-ui/src/app/core/guards/tier.guard.spec.ts`

#### Integration Tests (Existing + New)

```bash
# Run existing tests with auth context
npx nx test dev-brand-ui --testPathPattern=integration

# Verify:
# - HttpClient includes cookies (withCredentials: true)
# - 401 responses trigger redirect
# - SSE connections include tickets
```

### Manual Verification

**Prerequisites**:

1. Backend running with WorkOS configured
2. Frontend dev server running (`npm run dev`)

**Test Steps**:

1. **Login Flow**:

   - Navigate to `http://localhost:4200/landing`
   - Click "Log In" button
   - Should redirect to WorkOS OAuth
   - After login, should return to landing page
   - User profile should appear in header

2. **Protected Route**:

   - While logged out, navigate to `/dashboard`
   - Should redirect to `/landing?returnUrl=/dashboard`
   - Log in
   - Should redirect back to `/dashboard`

3. **Role-Based Route**:

   - Log in as user without 'admin' role
   - Navigate to `/admin`
   - Should redirect to `/access-denied`

4. **Tier-Based Route**:

   - Log in with 'free' tier
   - Navigate to `/premium-features`
   - Should redirect to `/upgrade?tier=pro`

5. **SSE Authentication**:

   - Open DevTools Network tab
   - Start workflow that uses SSE
   - Verify EventSource URL includes `?token=...` parameter
   - Verify events stream successfully

6. **Logout**:
   - Click user profile dropdown
   - Click "Logout"
   - User state should clear
   - Should redirect to landing page

### Browser Testing

**Supported Browsers**:

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Cookie Testing**:

- Verify JWT cookie exists (DevTools → Application → Cookies)
- Verify cookie is HTTP-only
- Verify cookie SameSite=Lax

---

## Team-Leader Handoff

**Developer Type**: frontend-developer  
**Complexity**: Medium  
**Estimated Tasks**: 14 tasks

**Batch Strategy**: Layer-based (models → services → guards → components → integration)

**Suggested Batches**:

1. **Batch 1: Core Infrastructure** (3 tasks)

   - Create auth models
   - Create AuthService
   - Create auth interceptor

2. **Batch 2: Route Guards** (3 tasks)

   - Create authGuard
   - Create roleGuard
   - Create tierGuard

3. **Batch 3: UI Components** (3 tasks)

   - Create LoginButtonComponent
   - Create UserProfileComponent
   - Create TierBadgeComponent

4. **Batch 4: Integration** (3 tasks)

   - Update app.config.ts (interceptor + APP_INITIALIZER)
   - Update SSE services with ticket auth
   - Update app.routes.ts with protected routes

5. **Batch 5: Testing & Verification** (2 tasks)
   - Write unit tests (AuthService + guards)
   - Manual verification with backend

**Critical Dependencies**:

- TASK_2025_054 backend must be running
- Work OS OAuth must be configured
- Backend `/auth/login`, `/auth/callback`, `/auth/me`, `/auth/stream/ticket` endpoints operational

---

## Success Criteria

- [ ] User can log in via WorkOS OAuth
- [ ] User state loads on app startup
- [ ] Protected routes redirect unauthenticated users
- [ ] Role guards enforce role requirements
- [ ] Tier guards enforce tier requirements
- [ ] SSE connections use authenticated tickets
- [ ] User profile displays in header
- [ ] Logout clears state and redirects
- [ ] All unit tests pass (85%+ coverage)
- [ ] Manual verification steps complete
- [ ] No TypeScript errors
- [ ] No `any` types in auth code
