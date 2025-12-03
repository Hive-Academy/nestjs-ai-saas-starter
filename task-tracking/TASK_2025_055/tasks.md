# Development Tasks - TASK_2025_055

**Task Type**: Frontend
**Total Tasks**: 14
**Total Batches**: 5
**Batching Strategy**: Layer-based (models → services → interceptors → guards → components → integration)
**Status**: 0/5 batches complete (0%)

---

## Batch 1: Core Models & Services ✅ COMPLETE

**Assigned To**: frontend-developer
**Tasks in Batch**: 2
**Dependencies**: None (foundation layer)
**Estimated Commits**: 1 (one commit per batch)
**Batch 1 Git Commit**: 6c967654

### Task 1.1: Create Auth Models ✅ COMPLETE

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\models\auth.ts`
**Specification Reference**: implementation_plan.md:107-194
**Pattern to Follow**: `shared/models/conversation.model.ts` (export pattern)
**Expected Commit Pattern**: `feat(auth): add core auth models and types`

**Quality Requirements**:

- ✅ Export interfaces: `User`, `UserTier`, `AuthConfig`, `SseTicketResponse`, `AuthErrorType`
- ✅ Exact match with backend `UserContext` interface
- ✅ JSDoc comments for IDE autocomplete
- ✅ No `any` types, full TypeScript strict compliance
- ✅ UserTier as type union: `'free' | 'pro' | 'enterprise'`

**Implementation Details**:

- **Imports**: None (pure TypeScript interfaces)
- **Types**: 5 exports total (User, UserTier, AuthConfig, SseTicketResponse, AuthErrorType)
- **Backend Contract Match**: `userId`, `tenantId`, `email`, `roles`, `tier`, `permissions`

---

### Task 1.2: Create AuthService (Signal-Based) ✅ COMPLETE

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\services\auth.service.ts`
**Dependencies**: Task 1.1 (imports auth models)
**Specification Reference**: implementation_plan.md:197-388
**Pattern to Follow**:

- `devbrand-sse.service.ts:76-82` (signal state pattern)
- `conversation-api.service.ts:60-68` (service pattern)
  **Expected Commit Pattern**: `feat(auth): add signal-based AuthService`

**Quality Requirements**:

- ✅ `@Injectable({ providedIn: 'root' })`
- ✅ Signal-based state (NOT BehaviorSubject)
- ✅ Private `_user` signal, readonly `user$` accessor
- ✅ Computed signals: `isAuthenticated$`, `userTier$`, `userRoles$`
- ✅ Methods: `loadUser()`, `login()`, `logout()`, `getSseTicket()`, `hasRole()`, `hasTier()`
- ✅ HttpClient with RxJS operators (tap, catchError)

**Implementation Details**:

- **Imports**: `HttpClient`, `Router`, `signal`, `computed`, `inject`
- **Private Signals**: `_user = signal<User | null>(null)`
- **Public Signals**: `user$`, `isAuthenticated$`, `userTier$`, `userRoles$`
- **Backend Endpoints**: `/api/auth/me`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/stream/ticket`

---

**Batch 1 Verification Requirements**:

- ✅ All 2 files exist at specified paths
- ✅ One git commit for entire batch
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ No TypeScript errors
- ✅ auth.ts exports verified, AuthService injectable verified

---

## Batch 2: HTTP Interceptor & Guards ✅ COMPLETE

**Assigned To**: frontend-developer
**Tasks in Batch**: 4
**Dependencies**: Batch 1 complete (imports AuthService)
**Estimated Commits**: 1
**Batch 2 Git Commit**: 558ee03c

### Task 2.1: Create Auth HTTP Interceptor ✅ COMPLETE

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\interceptors\auth.interceptor.ts`
**Dependencies**: Task 1.2 (uses Router)
**Specification Reference**: implementation_plan.md:391-462
**Pattern to Follow**: Angular v17+ functional interceptor pattern
**Expected Commit Pattern**: `feat(auth): add HTTP cookie interceptor with error handling`

**Quality Requirements**:

- ✅ Functional interceptor (HttpInterceptorFn type)
- ✅ `withCredentials: true` for all requests
- ✅ Global 401 handling (redirect to `/landing?returnUrl=X&reason=session_expired`)
- ✅ Global 403 handling (console error)
- ✅ Uses `inject(Router)` for navigation

**Implementation Details**:

- **Imports**: `HttpInterceptorFn`, `HttpErrorResponse`, `Router`, `inject`
- **Behavior**: Clone request with `withCredentials: true`
- **Error Codes**: 401 → redirect, 403 → log error

---

### Task 2.2: Create Auth Guard ✅ COMPLETE

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\guards\auth.guard.ts`
**Dependencies**: Task 1.2 (imports AuthService)
**Specification Reference**: implementation_plan.md:473-518
**Pattern to Follow**: Angular v17+ functional guard pattern
**Expected Commit Pattern**: `feat(auth): add authentication route guard`

**Quality Requirements**:

- ✅ Functional guard (CanActivateFn type)
- ✅ Check `authService.isAuthenticated$()`
- ✅ Redirect to `/landing?returnUrl=X` if not authenticated
- ✅ Return `true` if authenticated

**Implementation Details**:

- **Imports**: `CanActivateFn`, `Router`, `inject`, `AuthService`
- **Logic**: `isAuthenticated$() ? true : router.createUrlTree(['/landing'], { queryParams })`

---

### Task 2.3: Create Role Guard ✅ COMPLETE

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\guards\role.guard.ts`
**Dependencies**: Task 1.2 (imports AuthService)
**Specification Reference**: implementation_plan.md:520-566
**Pattern to Follow**: Angular v17+ functional guard pattern
**Expected Commit Pattern**: `feat(auth): add role-based route guard`

**Quality Requirements**:

- ✅ Functional guard (CanActivateFn type)
- ✅ Read `route.data['roles']` as `string[]`
- ✅ Check if user has ANY required role (OR logic)
- ✅ Redirect to `/access-denied` if insufficient role

**Implementation Details**:

- **Imports**: `CanActivateFn`, `Router`, `inject`, `AuthService`
- **Logic**: `requiredRoles.some(role => authService.hasRole(role))`

---

### Task 2.4: Create Tier Guard ✅ COMPLETE

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\core\guards\tier.guard.ts`
**Dependencies**: Task 1.2 (imports AuthService), Task 1.1 (imports UserTier)
**Specification Reference**: implementation_plan.md:568-615
**Pattern to Follow**: Angular v17+ functional guard pattern
**Expected Commit Pattern**: `feat(auth): add tier-based route guard`

**Quality Requirements**:

- ✅ Functional guard (CanActivateFn type)
- ✅ Read `route.data['tier']` as `UserTier`
- ✅ Check if user tier >= required tier
- ✅ Redirect to `/upgrade?tier=X` if insufficient tier

**Implementation Details**:

- **Imports**: `CanActivateFn`, `Router`, `inject`, `AuthService`, `UserTier`
- **Logic**: `authService.hasTier(requiredTier)`

---

**Batch 2 Verification Requirements**:

- ✅ All 4 files exist at specified paths
- ✅ One git commit for entire batch
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ No TypeScript errors
- ✅ Guards use CanActivateFn type
- ✅ Interceptor uses withCredentials: true

---

## Batch 3: UI Components ✅ COMPLETE

**Assigned To**: frontend-developer
**Tasks in Batch**: 3
**Dependencies**: Batch 1 complete (imports AuthService for components)
**Estimated Commits**: 1
**Batch 3 Git Commit**: e1e5cb22

### Task 3.1: Create Login Button Component ✅ COMPLETE

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\shared\components\auth\login-button.component.ts`
**Dependencies**: Task 1.2 (imports AuthService)
**Specification Reference**: implementation_plan.md:640-685
**Pattern to Follow**: `token-stream-display.component.ts:41-45` (standalone component)
**Expected Commit Pattern**: `feat(auth): add login button UI component`

**Quality Requirements**:

- ✅ Standalone component with OnPush change detection
- ✅ Show button only if `!authService.isAuthenticated$()`
- ✅ Click handler calls `authService.login()`
- ✅ Gradient button style (purple gradient)
- ✅ Hover animation (translateY)

**Implementation Details**:

- **Selector**: `app-login-button`
- **Imports**: `CommonModule`, `AuthService`
- **Template**: `@if (!authService.isAuthenticated$()) { <button ...> }`
- **Styles**: Inline CSS with gradient background

---

### Task 3.2: Create User Profile Component ✅ COMPLETE

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\shared\components\auth\user-profile.component.ts`
**Dependencies**: Task 1.2 (imports AuthService), Task 3.3 (imports TierBadgeComponent)
**Specification Reference**: implementation_plan.md:687-746
**Pattern to Follow**: `token-stream-display.component.ts:94-95` (signal state)
**Expected Commit Pattern**: `feat(auth): add user profile dropdown component`

**Quality Requirements**:

- ✅ Standalone component with OnPush change detection
- ✅ Signal for dropdown state: `isDropdownOpen = signal(false)`
- ✅ Show profile only if `authService.isAuthenticated$()`
- ✅ Display user email initial as avatar
- ✅ Dropdown with tier badge, account settings, logout button

**Implementation Details**:

- **Selector**: `app-user-profile`
- **Imports**: `CommonModule`, `AuthService`, `TierBadgeComponent`
- **Signals**: `isDropdownOpen`
- **Methods**: `toggleDropdown()`, `getInitials()`, `openAccountSettings()`

---

### Task 3.3: Create Tier Badge Component ✅ COMPLETE

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\shared\components\auth\tier-badge.component.ts`
**Dependencies**: Task 1.1 (imports UserTier type)
**Specification Reference**: implementation_plan.md:749-802
**Pattern to Follow**: `token-stream-display.component.ts:88` (input signal)
**Expected Commit Pattern**: `feat(auth): add tier badge UI component`

**Quality Requirements**:

- ✅ Standalone component with OnPush change detection
- ✅ Input signal: `tier = input<UserTier>('free')`
- ✅ Computed CSS class based on tier
- ✅ Gradient styling: free (gray), pro (purple gradient), enterprise (pink gradient)
- ✅ Pill-shaped badge with uppercase tier name

**Implementation Details**:

- **Selector**: `app-tier-badge`
- **Imports**: `CommonModule`, `UserTier`
- **Input**: `tier = input<UserTier>('free')`
- **Method**: `tierClass(): string` returns `tier-${this.tier()}`

---

**Batch 3 Verification Requirements**:

- ✅ All 3 files exist at specified paths
- ✅ One git commit for entire batch
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ No TypeScript errors
- ✅ All components use `standalone: true`
- ✅ All components use `ChangeDetectionStrategy.OnPush`

---

## Batch 4: SSE Integration ✅ COMPLETE

**Assigned To**: frontend-developer
**Tasks in Batch**: 2
**Dependencies**: Batch 1 complete (uses AuthService.getSseTicket())
**Estimated Commits**: 1
**Batch 4 Git Commit**: bcd58d7b

### Task 4.1: Enhance DevBrand SSE Service with Ticket Auth ✅ COMPLETE

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\devbrand-poc\services\devbrand-sse.service.ts`
**Dependencies**: Task 1.2 (imports AuthService)
**Specification Reference**: implementation_plan.md:815-905
**Pattern to Follow**: Existing `devbrand-sse.service.ts:161-186` (modify connect method)
**Expected Commit Pattern**: `feat(auth): integrate SSE ticket authentication`

**Quality Requirements**:

- ✅ Import and inject `AuthService`
- ✅ Modify `connect()` method to obtain ticket before EventSource creation
- ✅ Append ticket to streamUrl as query parameter: `?token={ticket}`
- ✅ Handle ticket errors gracefully (update connection state to 'error')
- ✅ Preserve existing event handling logic

**Implementation Details**:

- **Line Range**: 161-186 (connect method)
- **Modification**: Wrap EventSource creation in `authService.getSseTicket().subscribe()`
- **URL Format**: `${streamUrl}?token=${ticket}`
- **Error Handling**: Set connection state to 'error' if ticket fails

---

### Task 4.2: Enhance Research SSE Service with Ticket Auth (if exists) ✅ COMPLETE

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\research-chat\services\research.service.ts`
**Dependencies**: Task 1.2 (imports AuthService)
**Specification Reference**: implementation_plan.md:907-920
**Pattern to Follow**: Same as Task 4.1 (if research service has SSE functionality)
**Expected Commit Pattern**: `feat(auth): integrate SSE ticket auth in research service`

**Quality Requirements**:

- ✅ Check if research.service.ts has EventSource/SSE logic
- ✅ If YES: Apply same ticket auth pattern as Task 4.1
- ✅ If NO: Skip this task (mark as N/A in commit message)

**Implementation Details**:

- **Check First**: Does research.service.ts use EventSource?
- **If Yes**: Apply ticket authentication pattern
- **If No**: Document in commit message: "N/A - research service does not use SSE"

---

**Batch 4 Verification Requirements**:

- ✅ All modified files exist
- ✅ One git commit for entire batch
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ No TypeScript errors
- ✅ SSE services obtain and use tickets correctly

---

## Batch 5: App Configuration & Routes ✅ COMPLETE

**Assigned To**: frontend-developer
**Tasks in Batch**: 3
**Dependencies**: Batch 2 complete (imports interceptor/guards)
**Estimated Commits**: 1
**Batch 5 Git Commit**: b5619787

### Task 5.1: Register Auth Interceptor in App Config ✅ COMPLETE

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\app.config.ts`
**Dependencies**: Task 2.1 (imports authInterceptor), Task 1.2 (imports AuthService)
**Specification Reference**: implementation_plan.md:926-1010
**Pattern to Follow**: Existing `app.config.ts:19` (HTTP provider)
**Expected Commit Pattern**: `feat(auth): register interceptor and app initializer`

**Quality Requirements**:

- ✅ Import `authInterceptor`, `AuthService`, `APP_INITIALIZER`
- ✅ Update `provideHttpClient` to include `withInterceptors([authInterceptor])`
- ✅ Add `APP_INITIALIZER` that calls `authService.loadUser()`
- ✅ Silently fail loadUser() if 401 (user not authenticated)
- ✅ Preserve existing config (ZoneJS, Router, Markdown)

**Implementation Details**:

- **Line Range**: 15-22 (providers array)
- **Additions**:
  - `withInterceptors([authInterceptor])` in provideHttpClient
  - APP_INITIALIZER factory function
- **Factory**: `() => authService.loadUser().pipe(catchError(() => of(null)))`

---

### Task 5.2: Apply Route Guards to Routes ✅ COMPLETE

**File(s)**: `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\app.routes.ts`
**Dependencies**: Task 2.2, 2.3, 2.4 (imports all guards)
**Specification Reference**: implementation_plan.md:1016-1106
**Pattern to Follow**: Existing `app.routes.ts:17-31` (route structure)
**Expected Commit Pattern**: `feat(auth): add protected route examples with guards`

**Quality Requirements**:

- ✅ Import `authGuard`, `roleGuard`, `tierGuard`
- ✅ Add example protected routes: `/dashboard`, `/admin`, `/premium-features`
- ✅ Add fallback routes: `/access-denied`, `/upgrade`
- ✅ Apply guards correctly with route data
- ✅ Preserve existing routes (landing, research-chat, devbrand-poc)

**Implementation Details**:

- **Line Range**: 3-38 (routes array)
- **New Routes**:
  - `/dashboard` with `canActivate: [authGuard]`
  - `/admin` with `canActivate: [authGuard, roleGuard], data: { roles: ['admin'] }`
  - `/premium-features` with `canActivate: [authGuard, tierGuard], data: { tier: 'pro' }`
  - `/access-denied` (static page)
  - `/upgrade` (static page)

---

### Task 5.3: Create Placeholder Access Denied & Upgrade Pages ⏸️ PENDING

**File(s)**:

- `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\shared\components\access-denied.component.ts`
- `d:\projects\nestjs-ai-saas-starter\apps\dev-brand-ui\src\app\features\upgrade\upgrade.component.ts`

**Dependencies**: None (standalone placeholder components)
**Specification Reference**: implementation_plan.md:1070-1090 (route references)
**Expected Commit Pattern**: `feat(auth): add placeholder access denied and upgrade pages`

**Quality Requirements**:

- ✅ Simple standalone components with OnPush
- ✅ `/access-denied`: Display "Access Denied" message with back button
- ✅ `/upgrade`: Display upgrade CTA with tier query param display
- ✅ Minimal styling (TailwindCSS)

**Implementation Details**:

- **access-denied.component.ts**: Simple template with error message
- **upgrade.component.ts**: Simple template with upgrade CTA
- **Behavior**: Both components should have minimal functionality (placeholders)

---

**Batch 5 Verification Requirements**:

- ✅ All 4 files created/modified
- ✅ One git commit for entire batch
- ✅ Build passes: `npx nx build dev-brand-ui`
- ✅ No TypeScript errors
- ✅ Interceptor registered correctly in app.config
- ✅ Routes use guards correctly
- ✅ Placeholder pages render without errors

---

## Batch Execution Protocol

**For Each Batch**:

1. Team-leader assigns entire batch to frontend-developer
2. Developer executes ALL tasks in batch (in order)
3. Developer stages files progressively (git add after each task)
4. Developer creates ONE commit for entire batch (after all tasks complete)
5. Developer returns with batch git commit SHA
6. Team-leader verifies entire batch
7. If verification passes: Assign next batch
8. If verification fails: Create fix batch

**Commit Strategy**:

- ONE commit per batch (not per task)
- Commit message format:

  ```
  feat(auth): batch [N] - [batch description]

  - Task 1.1: [description]
  - Task 1.2: [description]
  - Task 1.3: [description]
  ```

- Avoids running pre-commit hooks multiple times
- Maintains git history clarity

**Completion Criteria**:

- All batch statuses are "✅ COMPLETE"
- All batch commits verified (1 commit per batch, 5 total)
- All files exist
- Build passes: `npx nx build dev-brand-ui`

---

## Verification Protocol

**After Each Batch**:

1. Developer updates all task statuses in batch to "✅ COMPLETE"
2. Developer adds git commit SHA to batch header
3. Team-leader verifies:
   - Batch commit exists: `git log --oneline -1`
   - All files in batch exist: Read each file
   - Build passes: `npx nx build dev-brand-ui`
   - Dependencies respected: Task order maintained
4. If all pass: Update batch status to "✅ COMPLETE", assign next batch
5. If any fail: Mark batch as "❌ PARTIAL", create fix batch
