# ClsModule Setup Guide

This guide explains how to configure `nestjs-cls` for use with security decorators in `@hive-academy/nestjs-neo4j`.

## Overview

The security decorators (`@Authorize`, `@AuditLog`, `@RateLimit`, etc.) use `nestjs-cls` (Continuation Local Storage) to access the authenticated user context. This approach:

- **Simplifies architecture**: No need for REQUEST-scoped services
- **Improves performance**: Repositories can be singletons
- **Works everywhere**: HTTP, WebSockets, cron jobs, queues, etc.

## Installation

```bash
npm install nestjs-cls
```

## Configuration

### 1. Configure ClsModule in AppModule

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
          // Optional: Set additional context
          cls.set('ipAddress', req.ip || req.headers['x-forwarded-for']);
          cls.set('sessionId', req.sessionID || req.session?.id);
        },
      },
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

### 2. Update Authentication Guard

Your authentication guard should set the user in the CLS context:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly cls: ClsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Your authentication logic here...
    const user = await this.validateToken(request.headers.authorization);

    if (!user) {
      return false;
    }

    // Set user in request (for compatibility)
    request.user = user;

    // Set user in CLS (for security decorators)
    this.cls.set('user', user);

    return true;
  }
}
```

### 3. Expected User Structure

The security decorators expect the user object to have these properties:

```typescript
interface RequestUser {
  id: string; // Required: User ID
  userId?: string; // Alternative to id
  email?: string; // For audit logging
  tenantId?: string; // Required: Tenant/org ID
  organizationId?: string; // Alternative to tenantId
  roles?: string[]; // For role-based access
  permissions?: string[]; // For permission-based access
  tier?: 'free' | 'pro' | 'enterprise'; // For tier-based permissions
}
```

## Usage with Security Decorators

Once configured, security decorators will automatically extract user context:

```typescript
import { Injectable } from '@nestjs/common';
import { Authorize, AuditLog } from '@hive-academy/nestjs-neo4j';

@Injectable()
export class UserService {
  @Authorize({ roles: ['admin'] })
  @AuditLog({ enabled: true, logLevel: 'detailed' })
  async getUsers(): Promise<User[]> {
    // User context automatically available via ClsService
    // No need for REQUEST scope or manual context passing
  }
}
```

## Testing

### Mocking ClsService in Tests

```typescript
import { Test } from '@nestjs/testing';
import { ClsService, ClsModule } from 'nestjs-cls';

describe('MyService', () => {
  let service: MyService;
  let clsService: ClsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ClsModule],
      providers: [MyService],
    }).compile();

    service = module.get(MyService);
    clsService = module.get(ClsService);
  });

  it('should work with mocked user', async () => {
    // Run test within CLS context
    await clsService.run(async () => {
      clsService.set('user', {
        id: 'test-user-id',
        tenantId: 'test-tenant-id',
        roles: ['admin'],
      });

      const result = await service.someMethod();
      expect(result).toBeDefined();
    });
  });
});
```

## Troubleshooting

### Error: "Authentication required. User not found in async context (ClsService)."

**Cause**: ClsModule is not configured or user is not set in CLS.

**Solution**:

1. Ensure `ClsModule.forRoot()` is imported in your AppModule
2. Verify your auth guard calls `cls.set('user', user)`
3. Check that the middleware is mounted: `middleware: { mount: true }`

### Error: "User ID is required for authentication"

**Cause**: User object is missing `id` or `userId` property.

**Solution**: Ensure your authentication populates the user with an `id` field.

### Error: "Tenant context is required for authorization"

**Cause**: User object is missing `tenantId` or `organizationId`.

**Solution**: Ensure your authentication includes tenant information.

## Migration from REQUEST Scope

If you were previously using REQUEST-scoped repositories:

1. Remove `{ scope: Scope.REQUEST }` from `@Injectable()`
2. Remove `@Inject(REQUEST) public readonly request: any` from constructor
3. Remove the `REQUEST` import from `@nestjs/core`

The security decorators will now obtain context via ClsService automatically.
