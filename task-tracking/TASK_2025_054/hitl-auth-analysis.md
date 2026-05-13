# HITL Auth Analysis - TASK_2025_054

## @RequiresApproval Decorator - Critical Auth Gap

**Location**: `libs/langgraph-modules/hitl/src/lib/decorators/approval.decorator.ts`

---

## Current State

The `@RequiresApproval` decorator supports **approval delegation** and **skip conditions** based on user roles, but has **NO AUTHENTICATION ENFORCEMENT**.

### Existing Role-Based Features

```typescript
export interface RequiresApprovalOptions {
  /**
   * Skip approval if conditions are met
   */
  skipConditions?: {
    /** Skip if user has role */
    userRole?: string[]; // ⚠️ EXISTS but NO AUTH CHECK
  };

  /**
   * Approval delegation options
   */
  delegation?: {
    /** Allowed delegate roles */
    allowedRoles?: string[]; // ⚠️ EXISTS but NO AUTH CHECK
  };
}
```

**Problem**: Options exist for role-based logic, but **NO USER CONTEXT EXTRACTION**.

---

## Critical Auth Gaps

| Feature                     | Status     | Impact                                                     | Priority     |
| --------------------------- | ---------- | ---------------------------------------------------------- | ------------ |
| **Approver Authorization**  | ❌ MISSING | Anyone can approve requests                                | **CRITICAL** |
| **Role Validation**         | ⚠️ PARTIAL | `skipConditions.userRole` exists but no enforcement        | **HIGH**     |
| **Delegation Permissions**  | ⚠️ PARTIAL | `allowedRoles` exists but no enforcement                   | **HIGH**     |
| **User Context Extraction** | ❌ MISSING | No call to `WorkflowAuthContextService.extractUserContext` | **CRITICAL** |
| **Approval Chain Auth**     | ❌ MISSING | No validation that approver is in chain                    | **HIGH**     |

---

## Security Risks

### Risk 1: Unauthorized Approval (CRITICAL)

**Scenario**: Malicious user approves their own high-risk request

```typescript
@Node('deploy_production')
@RequiresApproval({
  riskThreshold: ApprovalRiskLevel.CRITICAL,
  chainId: 'production-approvers'
})
async deployToProduction(state) {
  // No check that approver is in production-approvers chain!
  // No check that approver has 'admin' role!
}
```

**Impact**: Production deployments without proper authorization

---

### Risk 2: Delegation Bypass (HIGH)

**Scenario**: User delegates to self or unauthorized user

```typescript
@RequiresApproval({
  delegation: {
    enabled: true,
    allowedRoles: ['manager', 'director']
  }
})
async sensitiveOperation(state) {
  // No enforcement of allowedRoles during delegation
}
```

**Impact**: Delegation controls are decorative, not enforceable

---

### Risk 3: Skip Condition Abuse (MEDIUM)

**Scenario**: User claims to have admin role without verification

```typescript
@RequiresApproval({
  skipConditions: {
    userRole: ['admin']
  }
})
async privilegedAction(state) {
  // skipConditions.userRole is checked, but where is user context?
  // Currently: state.user? req.user? Not standardized!
}
```

**Impact**: Approval bypasses based on unverified claims

---

## Proposed Enhancement

### Phase 1: Add User Context Extraction

**Update decorator to extract user from RunnableConfig:**

```typescript
export function RequiresApproval(options: RequiresApprovalOptions = {}): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      this: any,
      state: WorkflowState,
      config?: RunnableConfig // ✅ NEW: Accept config parameter
    ): Promise<any> {
      // ✅ NEW: Extract user context
      const user = WorkflowAuthContextService.extractUserContext(config);

      if (!user) {
        throw new UnauthorizedException(`Approval operations require authentication`);
      }

      // ✅ NEW: Validate skip conditions with actual user
      if (options.skipConditions?.userRole) {
        const hasRole = options.skipConditions.userRole.some((role) => user.roles.includes(role));
        if (hasRole) {
          // Approval skipped - user has required role
          return originalMethod.call(this, state, config);
        }
      }

      // ✅ NEW: Validate delegation permissions
      if (options.delegation?.enabled && options.delegation.allowedRoles) {
        // Store user context for later delegation validation
        state._approvalContext = {
          requesterId: user.userId,
          requesterRoles: user.roles,
          allowedDelegateRoles: options.delegation.allowedRoles,
        };
      }

      // Continue with approval routing...
      return await evaluatorService.routeToApproval(state, options, String(propertyKey));
    };

    return descriptor;
  };
}
```

---

### Phase 2: Approver Authorization

**Add approver validation to `RequiresApprovalOptions`:**

```typescript
export interface RequiresApprovalOptions {
  // ... existing fields

  /**
   * ✅ NEW: Approver authorization requirements
   */
  approverAuth?: {
    /** Roles allowed to approve */
    roles?: string[];
    /** Permissions required to approve */
    permissions?: string[];
    /** Tier restrictions */
    tiers?: ('free' | 'pro' | 'enterprise')[];
    /** Must be in approval chain */
    requireChainMembership?: boolean;
  };
}
```

**Usage Example:**

```typescript
@Node('deploy_production')
@RequiresApproval({
  riskThreshold: ApprovalRiskLevel.CRITICAL,
  chainId: 'production-approvers',
  approverAuth: {
    roles: ['admin', 'deployment-manager'],
    permissions: ['deploy:production'],
    requireChainMembership: true
  }
})
async deployToProduction(state, config) {
  // Only users with admin/deployment-manager roles can approve
  // Only users in production-approvers chain can approve
}
```

---

### Phase 3: Approval Processing Validation

**Update `HumanApprovalService.processApproval` to validate approver:**

```typescript
@Injectable()
export class HumanApprovalService {
  async processApproval(
    executionId: string,
    approved: boolean,
    feedback?: string,
    approverContext?: UserContext // ✅ NEW: Require approver context
  ): Promise<void> {
    const request = await this.storage.getApproval(executionId);

    // ✅ NEW: Extract approval metadata
    const approvalMetadata = request.metadata?.approverAuth;

    if (!approverContext) {
      throw new UnauthorizedException('Approver authentication required');
    }

    // ✅ NEW: Validate approver roles
    if (approvalMetadata?.roles) {
      const hasRole = approvalMetadata.roles.some((role) => approverContext.roles.includes(role));
      if (!hasRole) {
        throw new UnauthorizedException(
          `Approver missing required roles: ${approvalMetadata.roles.join(', ')}`
        );
      }
    }

    // ✅ NEW: Validate approver is in approval chain
    if (approvalMetadata?.requireChainMembership && request.chainId) {
      const chain = await this.approvalChainService.getChain(request.chainId);
      const isInChain = chain.levels.some((level) =>
        level.approvers.some((a) => a.userId === approverContext.userId)
      );

      if (!isInChain) {
        throw new UnauthorizedException(`Approver not in approval chain: ${request.chainId}`);
      }
    }

    // Process approval...
  }
}
```

---

## Integration with Existing Auth

### Controller-Level Integration

```typescript
@Controller('approvals')
export class ApprovalController {
  @Post(':executionId/approve')
  @UseGuards(JwtAuthGuard) // ✅ Validate JWT
  async approveRequest(
    @Param('executionId') executionId: string,
    @Body() body: { approved: boolean; feedback?: string },
    @Request() req
  ) {
    // ✅ Extract user context from JWT
    const approverContext: UserContext = {
      userId: req.user.userId,
      tenantId: req.user.tenantId,
      roles: req.user.roles,
      tier: req.user.tier,
      permissions: req.user.permissions,
      email: req.user.email,
    };

    // ✅ Pass approver context to service
    return this.approvalService.processApproval(
      executionId,
      body.approved,
      body.feedback,
      approverContext
    );
  }
}
```

---

## Priority Matrix

| Enhancement                     | Priority     | Justification                     |
| ------------------------------- | ------------ | --------------------------------- |
| **User Context Extraction**     | **CRITICAL** | Foundation for all auth checks    |
| **Approver Authorization**      | **CRITICAL** | Prevents unauthorized approvals   |
| **Chain Membership Validation** | **HIGH**     | Enforces approval chain policies  |
| **Delegation Role Validation**  | **HIGH**     | Prevents delegation abuse         |
| **Skip Condition Enforcement**  | **MEDIUM**   | Makes existing feature functional |

---

## Implementation Checklist

### Phase 5A (HIGH PRIORITY)

- [ ] Add `config?: RunnableConfig` parameter to `@RequiresApproval` decorator
- [ ] Extract user context via `WorkflowAuthContextService.extractUserContext(config)`
- [ ] Enforce `skipConditions.userRole` with actual user context
- [ ] Add `approverAuth` field to `RequiresApprovalOptions`

### Phase 5B (HIGH PRIORITY)

- [ ] Update `HumanApprovalService.processApproval` to accept `approverContext`
- [ ] Validate approver roles before processing approval
- [ ] Validate approver is in approval chain (if `requireChainMembership`)
- [ ] Update controller to pass approver context from JWT

### Phase 5C (MEDIUM PRIORITY)

- [ ] Enforce `delegation.allowedRoles` during delegation
- [ ] Add audit logging for approval decisions
- [ ] Add unit tests for approver authorization
- [ ] Add integration tests for unauthorized approval attempts

---

## Code Examples

### 1. Production Deployment Approval

```typescript
@Node('deploy_production')
@RequiresApproval({
  riskThreshold: ApprovalRiskLevel.CRITICAL,
  chainId: 'production-approvers',
  message: 'Production deployment requires approval',
  approverAuth: {
    roles: ['admin', 'deployment-manager'],
    permissions: ['deploy:production'],
    requireChainMembership: true,
    tiers: ['enterprise'] // Only enterprise tier can approve
  },
  skipConditions: {
    userRole: ['cto', 'vp-engineering'] // CTO/VPs bypass approval
  }
})
async deployToProduction(state, config) {
  const user = WorkflowAuthContextService.extractUserContext(config);
  this.logger.log(`Deployment initiated by ${user.email}`);

  return { deployed: true, deployedBy: user.userId };
}
```

### 2. Financial Transaction Approval

```typescript
@Task({ dependsOn: ['calculateAmount'] })
@RequiresApproval({
  confidenceThreshold: 0.9,
  riskThreshold: ApprovalRiskLevel.HIGH,
  chainId: 'finance-approvers',
  message: (state) => `Approve transaction of $${state.amount}?`,
  approverAuth: {
    permissions: ['finance:approve'],
    requireChainMembership: true
  },
  skipConditions: {
    highConfidence: 0.99, // Skip if 99% confident
    custom: (state) => state.amount < 1000 // Auto-approve < $1k
  }
})
async processTransaction(context, config) {
  // Transaction processing with mandatory approval for high-value
}
```

---

## References

**Files Analyzed:**

- `libs/langgraph-modules/hitl/src/lib/decorators/approval.decorator.ts`
- `libs/langgraph-modules/hitl/src/lib/services/human-approval.service.ts`
- `libs/langgraph-modules/workflow-engine/src/lib/services/auth-context.service.ts`

**Key Finding**: `@RequiresApproval` has sophisticated HITL features but **ZERO authentication enforcement**, creating critical security vulnerabilities.

**Recommendation**: Add to Phase 5A as **CRITICAL PRIORITY** alongside `@Entrypoint` auth fix.
