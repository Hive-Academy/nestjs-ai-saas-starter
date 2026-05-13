# Requirements Document - TASK_2025_055

## Introduction

This task implements a complete frontend authentication integration for the Angular UI (`apps/dev-brand-ui`) to connect with the WorkOS-based backend authentication system delivered in TASK_2025_054. The backend provides JWT-based authentication with HTTP-only cookies, SSE streaming with short-lived tickets, and tier-based authorization (free/pro/enterprise). The frontend must provide a secure, type-safe, and user-friendly authentication experience following Angular best practices with signals, standalone components, and functional route guards.

**Business Value**: Enables secure user access to the Dev Brand SaaS platform with premium tier features, protected workflows, and authenticated real-time streaming.

## Task Classification

- **Type**: FEATURE (Frontend Integration)
- **Priority**: P1-High
- **Complexity**: Medium
- **Estimated Effort**: 6-8 hours

## Workflow Dependencies

- **Research Needed**: No (backend complete, patterns established)
- **UI/UX Design Needed**: No (authentication UI patterns are standard)

## Requirements

### Requirement 1: WorkOS Login/Logout Flow

**User Story**: As a platform user, I want to log in using WorkOS and log out securely, so that I can access protected features with my authenticated identity.

#### Acceptance Criteria

1. WHEN user clicks "Login" button THEN browser SHALL redirect to `/api/auth/login` endpoint
2. WHEN WorkOS callback completes (GET `/auth/callback`) THEN JWT cookie SHALL be automatically set by backend
3. WHEN user clicks "Logout" button THEN session SHALL be cleared and user SHALL be redirected to landing page
4. WHEN authentication error occurs THEN user SHALL see clear error message with recovery options
5. WHEN user is already authenticated THEN login button SHALL be hidden and user profile SHALL be displayed

### Requirement 2: Auth State Management

**User Story**: As a developer, I want centralized auth state management using Angular signals, so that components can reactively respond to authentication changes.

#### Acceptance Criteria

1. WHEN auth service initializes THEN user state SHALL be loaded from `/api/auth/me` endpoint
2. WHEN user authenticates THEN user signal SHALL emit user data `{ userId, email, roles, tier, permissions }`
3. WHEN user logs out THEN user signal SHALL emit `null` and all state SHALL be cleared
4. WHEN `/auth/me` returns 401 THEN user SHALL be treated as unauthenticated
5. WHEN token expires THEN auth service SHALL detect and clear user state automatically

### Requirement 3: Protected Route Guards

**User Story**: As a platform administrator, I want routes protected by role/permission/tier requirements, so that unauthorized users cannot access restricted areas.

#### Acceptance Criteria

1. WHEN unauthenticated user accesses protected route THEN router SHALL redirect to landing page with login prompt
2. WHEN authenticated user lacks required role THEN guard SHALL deny access and show "Access Denied" message
3. WHEN authenticated user lacks required tier (e.g., pro feature) THEN guard SHALL redirect to upgrade page
4. WHEN user has required permissions THEN route SHALL load normally
5. WHEN guard checks occur THEN auth state SHALL be validated from signal (no duplicate API calls)

### Requirement 4: SSE Ticket Authentication

**User Story**: As a user accessing real-time features, I want secure SSE connections using short-lived tickets, so that my streaming sessions are protected.

#### Acceptance Criteria

1. WHEN opening EventSource connection THEN client SHALL first call `POST /auth/stream/ticket` to obtain ticket
2. WHEN ticket is obtained THEN EventSource URL SHALL include `?token={ticket}` query parameter
3. WHEN ticket is invalid or expired THEN SSE connection SHALL fail with clear error message
4. WHEN ticket succeeds THEN events SHALL stream normally
5. WHEN multiple SSE connections needed THEN each connection SHALL obtain its own ticket

### Requirement 5: Tier-Based UI Elements

**User Story**: As a platform user, I want to see which features are available for my tier, so that I understand my current capabilities and upgrade options.

#### Acceptance Criteria

1. WHEN user has 'free' tier THEN premium UI elements SHALL show "Upgrade to Pro" badge
2. WHEN user has 'pro' tier THEN pro features SHALL be enabled and enterprise features SHALL show upgrade option
3. WHEN user has 'enterprise' tier THEN all features SHALL be fully enabled
4. WHEN tier check occurs THEN component SHALL read from auth service tier signal
5. WHEN tier changes (e.g., after upgrade) THEN UI elements SHALL update reactively

### Requirement 6: User Profile Display

**User Story**: As a logged-in user, I want to see my profile information in the header, so that I know I'm authenticated and can access account options.

#### Acceptance Criteria

1. WHEN user is authenticated THEN header SHALL display user email and avatar (or initials)
2. WHEN user clicks profile dropdown THEN options SHALL include "Account Settings" and "Logout"
3. WHEN user data updates THEN profile SHALL reactively update without page refresh
4. WHEN user clicks "Account Settings" THEN profile modal SHALL open with editable fields
5. WHEN user hovers over profile THEN tier badge SHALL be displayed (Free/Pro/Enterprise)

### Requirement 7: HTTP Interceptor for Cookie Auth

**User Story**: As a developer, I want API requests to automatically include JWT cookies, so that authenticated endpoints work seamlessly.

#### Acceptance Criteria

1. WHEN any HTTP request is made THEN cookies SHALL be automatically included (`withCredentials: true`)
2. WHEN 401 response received THEN interceptor SHALL log out user and redirect to landing page
3. WHEN 403 response received THEN interceptor SHALL show "Access Denied" notification
4. WHEN network error occurs THEN interceptor SHALL retry once before failing
5. WHEN interceptor handles error THEN error SHALL be logged to console with context

### Requirement 8: Type-Safe Auth Models

**User Story**: As a developer, I want TypeScript interfaces matching backend auth types, so that I have compile-time safety and IDE autocomplete.

#### Acceptance Criteria

1. WHEN defining user model THEN interface SHALL match backend `UserContext` exactly
2. WHEN defining auth config THEN types SHALL include `roles`, `permissions`, `tier` arrays
3. WHEN using tier enum THEN TypeScript SHALL enforce `'free' | 'pro' | 'enterprise'` values
4. WHEN auth methods called THEN return types SHALL be correctly inferred
5. WHEN models are exported THEN all auth-related types SHALL be available from central barrel file

## Non-Functional Requirements

### Performance Requirements

- **Auth State Load Time**: Initial `/auth/me` call SHALL complete within 200ms (95th percentile)
- **Route Guard Execution**: Guard checks SHALL complete within 10ms (already in memory)
- **SSE Ticket Generation**: Ticket endpoint SHALL respond within 100ms (95th percentile)
- **Memory Usage**: Auth service SHALL use <500KB memory
- **Bundle Size Impact**: Auth module SHALL add <15KB to production bundle

### Security Requirements

- **Authentication**: JWT cookies with HTTP-only flag (set by backend)
- **Authorization**: Role/permission/tier validation before route activation
- **Data Protection**: User data stored in memory signals only, cleared on logout
- **Compliance**: OWASP best practices for frontend auth (no token storage in localStorage)
- **SSE Security**: Short-lived tickets (30s TTL, single-use) for EventSource connections

### Scalability Requirements

- **Concurrent Users**: Support 1000+ concurrent authenticated users
- **Signal Performance**: Auth signal updates SHALL not cause performance degradation
- **Route Guards**: Scalable guard architecture for 50+ protected routes
- **Growth Planning**: Architecture SHALL support future OAuth providers without breaking changes

### Reliability Requirements

- **Uptime**: Auth service reliant on backend availability (99.9% target)
- **Error Handling**: Graceful degradation when backend unavailable (show offline mode)
- **Recovery Time**: Auto-retry failed `/auth/me` calls with exponential backoff
- **State Consistency**: Auth signal SHALL always reflect true backend state

## Stakeholder Analysis

### Primary Stakeholders

- **End Users**: Need secure, seamless authentication with clear tier boundaries
- **Frontend Developers**: Require clean API, type safety, and reactive state management
- **Backend Team**: Expect correct cookie handling and endpoint usage

### Secondary Stakeholders

- **Product Team**: Monitor conversion from free to pro tier based on upgrade prompts
- **Security Team**: Validate frontend follows OWASP auth best practices
- **Support Team**: Need clear error messages for troubleshooting auth issues

### Stakeholder Impact Matrix

| Stakeholder   | Impact Level | Involvement      | Success Criteria                     |
| ------------- | ------------ | ---------------- | ------------------------------------ |
| End Users     | High         | Testing/Feedback | Seamless login/logout experience     |
| Frontend Devs | High         | Implementation   | Clean API, signals, type safety      |
| Backend Team  | Medium       | API contract     | Correct endpoint usage               |
| Product Team  | Medium       | Requirements     | Tier upgrade conversion tracking     |
| Security Team | High         | Validation       | OWASP compliance, no token leaks     |
| Support Team  | Low          | Documentation    | Clear error messages and FAQ section |

## Risk Analysis

### Technical Risks

**Risk 1**: EventSource Cookie Limitation

- **Probability**: High (browser limitation)
- **Impact**: High (SSE won't work without ticket system)
- **Mitigation**: Use short-lived ticket pattern from TASK_2025_054 backend
- **Contingency**: Fallback to polling if EventSource fails

**Risk 2**: Signal Subscription Memory Leaks

- **Probability**: Medium
- **Impact**: Medium (performance degradation)
- **Mitigation**: Use Angular's automatic signal cleanup, avoid manual subscriptions
- **Contingency**: Add explicit cleanup in `ngOnDestroy` if needed

**Risk 3**: Route Guard Infinite Redirect Loop

- **Probability**: Low
- **Impact**: High (broken navigation)
- **Mitigation**: Track redirect attempts, add circuit breaker after 2 failures
- **Contingency**: Allow access to landing page without guards

**Risk 4**: Cookie Not Sent in Cross-Origin Requests

- **Probability**: Medium (if backend on different domain)
- **Impact**: Critical (auth won't work)
- **Mitigation**: Ensure `withCredentials: true` in HttpClient config, verify CORS settings
- **Contingency**: Document localhost vs production domain requirements

### Business Risks

- **User Experience Risk**: Complex auth flow may confuse users → Mitigation: Add onboarding tooltips
- **Tier Conversion Risk**: Aggressive upgrade prompts may annoy free users → Mitigation: Show value first, then upsell
- **Integration Risk**: Backend API changes may break frontend → Mitigation: Version API contract, add integration tests

### Risk Matrix

| Risk                          | Probability | Impact   | Score | Mitigation Strategy                       |
| ----------------------------- | ----------- | -------- | ----- | ----------------------------------------- |
| EventSource Cookie Limitation | High        | High     | 9     | Ticket system already implemented         |
| Signal Memory Leaks           | Medium      | Medium   | 6     | Follow Angular signal best practices      |
| Route Guard Redirect Loop     | Low         | High     | 4     | Circuit breaker + landing page fallback   |
| Cross-Origin Cookie Issue     | Medium      | Critical | 8     | `withCredentials: true` + CORS validation |

## Dependencies

### Technical Dependencies

- **Backend API**: TASK_2025_054 endpoints (`/auth/login`, `/auth/callback`, `/auth/stream/ticket`, `/auth/me`)
- **Angular Version**: v17+ (signals, standalone components)
- **HttpClient**: For cookie-based requests with interceptors
- **Router**: For functional route guards
- **EventSource API**: For SSE connections with ticket authentication

### Team Dependencies

- **Backend Team**: API contract validation, CORS configuration
- **DevOps**: Ensure backend endpoints accessible from frontend domain

### External Dependencies

- **WorkOS**: OAuth provider for login flow
- **Browser APIs**: EventSource, Cookies, Local Signals

## Success Metrics

- **Authentication Success Rate**: >99% of login attempts succeed
- **Route Guard Coverage**: 100% of protected routes have guards
- **Tier Upgrade Conversion**: Track "Upgrade to Pro" button click-through rate
- **SSE Connection Success**: >98% of SSE connections establish successfully
- **Error Rate**: <1% of API requests result in unhandled errors
- **User Satisfaction**: Auth flow rated >4.5/5 in UX testing

## Component Architecture

### Core Services

1. **AuthService**: Centralized auth state management

   - Signals: `user$`, `isAuthenticated$`, `userTier$`, `userRoles$`
   - Methods: `login()`, `logout()`, `loadUser()`, `getSseTicket()`
   - Location: `apps/dev-brand-ui/src/app/core/services/auth.service.ts`

2. **AuthInterceptor**: HTTP interceptor for cookie auth
   - Features: Add `withCredentials`, handle 401/403
   - Location: `apps/dev-brand-ui/src/app/core/interceptors/auth.interceptor.ts`

### Guards

3. **AuthGuard**: Functional route guard for authenticated routes

   - Logic: Check `isAuthenticated$` signal
   - Location: `apps/dev-brand-ui/src/app/core/guards/auth.guard.ts`

4. **RoleGuard**: Functional route guard for role-based access

   - Logic: Check user roles against route data
   - Location: `apps/dev-brand-ui/src/app/core/guards/role.guard.ts`

5. **TierGuard**: Functional route guard for tier-based access
   - Logic: Check user tier against route data
   - Location: `apps/dev-brand-ui/src/app/core/guards/tier.guard.ts`

### Components

6. **LoginButtonComponent**: Standalone component for login CTA

   - Location: `apps/dev-brand-ui/src/app/shared/components/login-button.component.ts`

7. **UserProfileComponent**: Header profile dropdown

   - Location: `apps/dev-brand-ui/src/app/shared/components/user-profile.component.ts`

8. **TierBadgeComponent**: Visual tier indicator
   - Location: `apps/dev-brand-ui/src/app/shared/components/tier-badge.component.ts`

### Models

9. **Auth Models**: TypeScript interfaces
   - `User`, `AuthConfig`, `UserTier`, `SseTicketResponse`
   - Location: `apps/dev-brand-ui/src/app/core/models/auth.ts`

## Implementation Notes

### Backend Endpoint Contract (from TASK_2025_054)

```typescript
// POST /auth/login
// Redirects to WorkOS OAuth

// GET /auth/callback?code={code}
// Sets JWT cookie, redirects to frontend

// GET /auth/me
// Returns: { userId, email, roles, tier, permissions }
// Requires: JWT cookie

// POST /auth/stream/ticket
// Returns: { ticket: string }
// Requires: JWT cookie
// Ticket TTL: 30s, single-use
```

### Angular Signal Pattern

```typescript
// AuthService excerpt
export class AuthService {
  private userSignal = signal<User | null>(null);
  readonly user$ = this.userSignal.asReadonly();
  readonly isAuthenticated$ = computed(() => this.user$() !== null);
  readonly userTier$ = computed(() => this.user$()?.tier ?? 'free');
}
```

### Functional Guard Pattern

```typescript
// auth.guard.ts excerpt
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated$()) {
    return true;
  }

  return router.createUrlTree(['/landing'], {
    queryParams: { returnUrl: state.url },
  });
};
```

## Quality Requirements

- **Code Quality**: Zero `any` types, 100% TypeScript strict mode
- **Test Coverage**: 85% unit test coverage for services and guards
- **Accessibility**: WCAG 2.1 AA compliance for auth UI components
- **Browser Support**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Performance**: Lighthouse score >90 for pages with auth components

## Acceptance Validation

### Manual Testing Checklist

- [ ] User can log in via WorkOS OAuth
- [ ] User can log out and session is cleared
- [ ] Protected routes redirect unauthenticated users
- [ ] Role-based routes enforce role requirements
- [ ] Tier-based UI elements show correct upgrade prompts
- [ ] SSE connections work with ticket authentication
- [ ] 401 response logs user out automatically
- [ ] Profile dropdown displays correct user info

### Automated Testing Requirements

- [ ] Unit tests for AuthService (signal state management)
- [ ] Unit tests for auth/role/tier guards
- [ ] Integration test for auth interceptor (401 handling)
- [ ] E2E test for complete login/logout flow
- [ ] E2E test for protected route access denial

---

**Next Phase**: Architecture (implementation-plan.md)
