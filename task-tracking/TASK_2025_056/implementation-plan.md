# Implementation Plan: nestjs-cls Integration (Required Dependency - Single Path)

## Problem Statement

Current security decorators use complex fallback detection with multiple code paths:

- ❌ 200+ lines of detection logic (ExecutionContext → REQUEST → req → httpArgumentsHost)
- ❌ Only works in HTTP contexts
- ❌ Multiple code paths to maintain and test
- ❌ Fragile coupling to NestJS internal structures

**Solution**: Make `nestjs-cls` a **required peer dependency** and use `ClsService.get('user')` as the **single source of truth**.

---

## Architecture Design

### Single Code Path with ClsService

```
┌──────────────────────────────────────┐
│ Security Decorators (Simplified)     │
├──────────────────────────────────────┤
│ ClsService.get('user') → AuthContext │
│ No fallbacks, no detection logic     │
│ Clear error if not configured        │
└──────────────────────────────────────┘
```

**Benefits**:

- ✅ **Simpler** - Single path, ~100 fewer lines of code
- ✅ **Works everywhere** - HTTP, WebSocket, cron jobs, event handlers
- ✅ **Testable** - Easy to mock ClsService
- ✅ **Maintainable** - No complex detection strategies
- ✅ **Better DX** - Fails fast with clear error message

---

## Proposed Changes

### 1. Update Package Dependencies

#### [MODIFY] libs/nestjs-neo4j/package.json

Add `nestjs-cls` as **required** peer dependency:

```json
"peerDependencies": {
  "@nestjs/common": "*",
  "@nestjs/config": "*",
  // ... existing deps
  "nestjs-cls": "*"  // ✅ REQUIRED (not optional)
}
```

**No `peerDependenciesMeta`** - dependency is required, not optional.

---

### 2. Simplify Security Decorators (Remove Fallback Logic)

#### [MODIFY] libs/nestjs-neo4j/src/lib/decorators/security.decorators.ts

**Location**: `getExecutionContext()` function (lines 664-756)

**BEFORE** (Complex detection with fallbacks):

```typescript
async function getExecutionContext(instance: any): Promise<AuthContext> {
  let executionContext: ExecutionContext | undefined;
  let request: any;

  // Strategy 1: Direct execution context
  if (instance.context && typeof instance.context.switchToHttp === 'function') {
    executionContext = instance.context;
    request = executionContext?.switchToHttp().getRequest();
  }
  // Strategy 2: REQUEST-scoped services
  else if (instance.request && typeof instance.request === 'object') {
    request = instance.request;
  }
  // Strategy 3: Legacy req alias
  else if (instance.req && typeof instance.req === 'object') {
    request = instance.req;
  }
  // Strategy 4: httpArgumentsHost
  else if (instance.httpArgumentsHost) {
    request = instance.httpArgumentsHost.getRequest();
  }

  if (!request) {
    throw new UnauthorizedException('Request context not available');
  }

  const user = await extractUserFromRequest(request);
  // ... build auth context
}
```

**AFTER** (Single ClsService path):

```typescript
import { ClsServiceManager } from 'nestjs-cls';

async function getExecutionContext(_instance: any): Promise<AuthContext> {
  try {
    const cls = ClsServiceManager.getClsService();
    const user = cls.get<RequestUser>('user');

    if (!user) {
      securityLogger.error(
        'No user found in ClsService. Ensure ClsModule is configured and guards set user context.'
      );
      throw new UnauthorizedException(
        'Authentication required. User not found in async context (ClsService).'
      );
    }

    // Build AuthContext from CLS user
    const userId = user.id || user.userId;
    if (!userId) {
      throw new UnauthorizedException('User ID is required for authentication');
    }

    const tenantId = user.tenantId || user.organizationId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for authorization');
    }

    const authContext: AuthContext = {
      userId,
      tenantId,
      roles: user.roles || [],
      permissions: await getUserPermissions(user),
      ipAddress: cls.get('ipAddress'), // Optional - set by middleware
      timestamp: new Date(),
      userEmail: user.email,
      organizationName: user.organizationId,
      sessionId: cls.get('sessionId') || `session_${Date.now()}`,
    };

    securityLogger.debug(
      `Authentication context extracted for user ${userId} in tenant ${tenantId}`
    );
    return authContext;
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    securityLogger.error(`Failed to get authentication context from ClsService: ${errorMessage}`);
    throw new UnauthorizedException(
      `Authentication context unavailable. Ensure ClsModule is configured in your application. Error: ${errorMessage}`
    );
  }
}
```

**Changes Summary**:

- ❌ **Removed**: All detection strategies (4 strategies → 0)
- ❌ **Removed**: 150+ lines of fallback logic
- ❌ **Removed**: `extractUserFromRequest()`, `extractTenantFromUser()`, `extractClientIP()` helpers
- ✅ **Added**: Direct `ClsServiceManager.getClsService()` call
- ✅ **Added**: Clear error messages mentioning ClsModule configuration

---

### 3. Remove Obsolete Helper Functions

#### [DELETE] libs/nestjs-neo4j/src/lib/decorators/security.decorators.ts

Remove these functions (no longer needed):

```typescript
// ❌ DELETE (lines 758-795)
async function extractTenantFromUser(user: RequestUser, request: any): Promise<string | null> { ... }

// ❌ DELETE (lines 797-820)
async function getUserPermissions(user: RequestUser): Promise<string[]> { ... }

// ❌ DELETE (lines 822-850)
function extractClientIP(request: any): string | undefined { ... }

// ❌ DELETE (lines 852-900)
async function extractUserFromRequest(request: any): Promise<RequestUser> { ... }
```

Keep only `getUserPermissions()` - still needed for permission resolution.

---

### 4. Update ThreadRegistryRepository (Remove REQUEST Scope)

#### [MODIFY] libs/langgraph-modules/adapters/src/lib/repositories/neo4j/thread-registry.repository.ts

**BEFORE** (REQUEST-scoped with injected REQUEST):

```typescript
@Injectable({ scope: Scope.REQUEST })
export class ThreadRegistryRepository extends Neo4jRepositoryBase<Thread> {
  constructor(
    neogma: NeogmaService,
    crud: Neo4jCrudService,
    @Inject(REQUEST) public readonly request: any // ❌ No longer needed
  ) {
    super(Thread, 'Thread', neogma, crud);
  }
}
```

**AFTER** (Singleton scope - more efficient):

```typescript
@Injectable() // ✅ Default singleton scope
export class ThreadRegistryRepository extends Neo4jRepositoryBase<Thread> {
  constructor(
    neogma: NeogmaService,
    crud: Neo4jCrudService
    // ❌ REMOVED: @Inject(REQUEST) - decorators use ClsService instead
  ) {
    super(Thread, 'Thread', neogma, crud);
  }
}
```

**Benefits**:

- ✅ Better performance (no per-request instantiation)
- ✅ Cleaner dependency injection
- ✅ Works in non-HTTP contexts

---

### 5. Application-Level Configuration Guide

#### [NEW] libs/nestjs-neo4j/docs/CLS-SETUP.md

````markdown
# ClsModule Setup (Required)

## Installation

```bash
npm install nestjs-cls
```
````

## Configuration

### 1. Import ClsModule in AppModule

```typescript
import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (cls, req) => {
          // Set user from request (populated by auth guard)
          if (req.user) {
            cls.set('user', req.user);
          }
          // Optional: Store additional context
          cls.set('ipAddress', req.ip);
          cls.set('sessionId', req.sessionID);
        },
      },
    }),
  ],
})
export class AppModule {}
```

### 2. Auth Guard Sets User

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly cls: ClsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = await this.validateJwt(request);

    // Store in CLS for security decorators
    this.cls.set('user', user);
    return true;
  }
}
```

### 3. Mocking in Tests

```typescript
describe('ThreadRegistryRepository', () => {
  let mockClsService: any;

  beforeEach(async () => {
    mockClsService = {
      get: jest.fn((key) => {
        if (key === 'user') {
          return {
            id: 'test-user-123',
            tenantId: 'tenant-1',
            roles: ['user'],
          };
        }
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ThreadRegistryRepository, { provide: ClsService, useValue: mockClsService }],
    }).compile();
  });
});
```

## Error Messages

If ClsModule is not configured, you'll see:

```
UnauthorizedException: Authentication required. User not found in async context (ClsService).
```

**Fix**: Import ClsModule and configure middleware as shown above.

````

---

## Verification Plan

### 1. Build Verification

```bash
npx nx build @hive-academy/nestjs-neo4j
npx nx build @hive-academy/langgraph-adapters
````

**Expected**: Both builds succeed without errors.

---

### 2. Unit Tests

#### [NEW] libs/nestjs-neo4j/src/lib/decorators/security.decorators.spec.ts

```typescript
import { ClsServiceManager } from 'nestjs-cls';
import { getExecutionContext } from './security.decorators';

jest.mock('nestjs-cls', () => ({
  ClsServiceManager: {
    getClsService: jest.fn(),
  },
}));

describe('getExecutionContext (ClsService only)', () => {
  let mockClsService: any;

  beforeEach(() => {
    mockClsService = {
      get: jest.fn(),
    };
    (ClsServiceManager.getClsService as jest.Mock).mockReturnValue(mockClsService);
  });

  it('should extract user from ClsService', async () => {
    mockClsService.get.mockImplementation((key: string) => {
      if (key === 'user') {
        return {
          id: 'user-123',
          tenantId: 'tenant-1',
          roles: ['admin'],
          email: 'test@example.com',
        };
      }
      return undefined;
    });

    const context = await getExecutionContext({});

    expect(context.userId).toBe('user-123');
    expect(context.tenantId).toBe('tenant-1');
    expect(context.roles).toEqual(['admin']);
    expect(mockClsService.get).toHaveBeenCalledWith('user');
  });

  it('should throw UnauthorizedException when user not in CLS', async () => {
    mockClsService.get.mockReturnValue(undefined);

    await expect(getExecutionContext({})).rejects.toThrow(
      'Authentication required. User not found in async context'
    );
  });

  it('should throw when userId missing', async () => {
    mockClsService.get.mockReturnValue({ tenantId: 'tenant-1' }); // Missing id

    await expect(getExecutionContext({})).rejects.toThrow('User ID is required for authentication');
  });

  it('should throw when tenantId missing', async () => {
    mockClsService.get.mockReturnValue({ id: 'user-123' }); // Missing tenantId

    await expect(getExecutionContext({})).rejects.toThrow(
      'Tenant context is required for authorization'
    );
  });
});
```

**Command**:

```bash
npx nx test @hive-academy/nestjs-neo4j --testFile=security.decorators.spec.ts
```

---

### 3. Integration Test (dev-brand-api)

#### [MODIFY] apps/dev-brand-api/src/app/app.module.ts

Add ClsModule configuration:

```typescript
import { ClsModule } from 'nestjs-cls';

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (cls, req) => {
          if (req.user) {
            cls.set('user', req.user);
          }
        },
      },
    }),
    // ... existing imports
  ],
})
export class AppModule {}
```

**Test**:

```bash
npm run dev:services
npx nx serve dev-brand-api

# Test conversation list endpoint
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/devbrand/conversation/list

# Expected: ✅ No "Request context not available" errors
```

---

## Breaking Changes

> [!WARNING] > **Breaking Change for Existing Users**
>
> - **Required**: `npm install nestjs-cls`
> - **Required**: Configure ClsModule in AppModule
> - **Required**: Auth guards must set user in ClsService
>
> **Migration Path**:
>
> 1. Install nestjs-cls
> 2. Add ClsModule.forRoot() to AppModule
> 3. Update guards to call `cls.set('user', authenticatedUser)`
> 4. Remove REQUEST-scoped configuration from repositories (optional performance improvement)

---

## Success Criteria

- ✅ Builds pass without nestjs-cls errors
- ✅ Security decorators get user from ClsService only
- ✅ Clear error when ClsModule not configured
- ✅ Unit tests cover ClsService integration
- ✅ Integration test confirms dev-brand-api works
- ✅ Code reduced by ~150 lines (fallback logic removed)
- ✅ ThreadRegistryRepository works as singleton (no REQUEST scope needed)
