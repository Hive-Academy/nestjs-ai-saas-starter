# Service Decomposition Plan - TASK_2025_007 Phase 1

**Task ID**: TASK_2025_007
**Phase**: Phase 1 - SOLID Enforcement
**Created**: 2025-01-11
**Architect**: software-architect
**Priority**: P0-CRITICAL

---

## 🚨 ARCHITECTURAL VIOLATION

### Current State

**File**: `libs/langgraph-modules/hitl/src/lib/services/approval-processing.service.ts`
**Lines of Code**: 1,135 LOC
**Violation**: **Exceeds 450 LOC limit by 685 lines (152% over limit)**

### SOLID Principle Violations

**Single Responsibility Principle (SRP) - VIOLATED**

The service currently handles **5 distinct responsibilities**:

1. **Core Approval Processing** - Workflow coordination, state transitions
2. **Approver Selection Intelligence** - Memory-based routing and ranking
3. **Expertise Calculation** - Pattern analysis and scoring algorithms
4. **Memory Pattern Analysis** - Historical data retrieval and interpretation
5. **Outcome Storage** - Execution tracking and learning data persistence

**Evidence**: 28 private methods (verified via grep analysis)

---

## 📊 CODEBASE INVESTIGATION SUMMARY

### Libraries Analyzed

**1. HITL Module**: `libs/langgraph-modules/hitl/`

- Verified exports: 16 services (CLAUDE.md lines 237-254)
- Pattern usage: Adapter-based storage, facade pattern
- Documentation: `libs/langgraph-modules/hitl/CLAUDE.md`

**2. Memory Library**: `@hive-academy/langgraph-core`

- Key interfaces: `IMemoryAdapter`, `AgentMemoryContext`, `UserMemoryPatterns`
- Real integration: approval-processing.service.ts lines 437-450 (getAgentContext, getUserPatterns)
- Pattern: Optional memory adapter with graceful degradation

**3. Storage Pattern**: Neo4j Adapter-Based

- Evidence: `apps/dev-brand-api/src/app/adapters/hitl/` (5 storage adapters)
- Pattern: `IApprovalChainStorageService` interface
- Usage: approval-chain.service.ts lines 232-240

### Patterns Identified

**Pattern 1: Optional Memory Adapter**

- Evidence: approval-processing.service.ts lines 36-39, 414-428
- Components: `@Optional()` decorator, graceful degradation
- Convention: Return default values when memory unavailable

**Pattern 2: Adapter-First Storage**

- Evidence: approval-chain.service.ts lines 227-283
- Components: Cache-backed by persistent storage
- Usage: All storage operations write to adapter first, then cache

**Pattern 3: Event-Driven Architecture**

- Evidence: approval-processing.service.ts lines 174-180
- Components: EventEmitter2, HITL_EVENTS constants
- Integration: Real-time notifications

### Integration Points

**IMemoryAdapter Service**: `@hive-academy/langgraph-core`

- Location: Injected via `@Optional() @Inject('IMemoryAdapter')`
- Interface: `getAgentContext()`, `getUserPatterns()`, `storeAgentExecution()`, `store()`
- Usage: Intelligent approver selection (lines 410-544), outcome storage (lines 550-614)

**FeedbackProcessorService**: `libs/langgraph-modules/hitl/src/lib/services/feedback-processor.service.ts`

- Interface: `submitFeedback()`
- Usage: Process approval/rejection feedback

**ApprovalChainService**: `libs/langgraph-modules/hitl/src/lib/services/approval-chain.service.ts`

- Interface: `getApprovalRequest()`, `processApproval()`
- Usage: Multi-level approval coordination

---

## 🏗️ ARCHITECTURE DESIGN (CODEBASE-ALIGNED)

### Design Philosophy

**Chosen Approach**: Service Decomposition with Shared Domain Types

**Rationale**:

1. Matches existing HITL module service structure (16 focused services)
2. Follows memory library refactoring pattern (TASK_2025_006: AgentMemoryBridgeService → 4 services)
3. Maintains optional memory adapter pattern for graceful degradation
4. Preserves adapter-based storage architecture

**Evidence**:

- HITL module already has 16 specialized services (CLAUDE.md lines 237-254)
- Memory library successfully split AgentMemoryBridgeService (task-tracking/registry.md line 12)
- Approval-chain.service.ts demonstrates focused service pattern (717 lines, single responsibility)

### Service Decomposition Structure

#### Service 1: ApprovalProcessingService (Core Coordinator)

**Purpose**: Orchestrate approval workflows and state transitions
**Pattern**: Facade pattern - coordinates other services
**Evidence**: Similar to HumanApprovalService facade (CLAUDE.md lines 340-362)

**Responsibilities**:

- Process approval requests and responses
- Manage workflow state transitions
- Coordinate with feedback processor and approval chain
- Emit lifecycle events

**Target LOC**: **200 lines** (down from 1,135)

**Public Interface** (verified against existing usage):

```typescript
// Pattern source: approval-processing.service.ts:44-107
async processApproval(
  request: {
    executionId: string;
    nodeId: string;
    approved: boolean;
    approvedBy: string;
    feedback?: string;
    timestamp: Date;
  },
  approvalRequests: Map<string, HumanApprovalRequest>
): Promise<{ success: boolean; shouldContinue?: boolean; error?: string }>;

// Pattern source: approval-processing.service.ts:112-192
async processApprovalResponse(
  requestId: string,
  response: HumanApprovalResponse,
  approvalRequests: Map<string, HumanApprovalRequest>
): Promise<{ success: boolean; nextState?: Partial<WorkflowState>; error?: string }>;
```

**Dependencies**:

- `EventEmitter2` - Event emission (verified: line 33)
- `FeedbackProcessorService` - Feedback handling (verified: line 34)
- `ApprovalChainService` - Chain coordination (verified: line 35)
- `ApproverIntelligenceService` - NEW: Approver selection
- `ApprovalOutcomeService` - NEW: Outcome tracking

**Methods to Keep** (8 methods):

1. `processApproval()` - Main entry point (lines 44-107)
2. `processApprovalResponse()` - Response handler (lines 112-192)
3. `handleApprovalSuccess()` - Success workflow (lines 197-235)
4. `handleApprovalRejection()` - Rejection workflow (lines 240-279)
5. `handleApprovalEscalation()` - Escalation workflow (lines 284-323)
6. `handleApprovalRetry()` - Retry workflow (lines 328-352)
7. `handleApprovalModification()` - Modification workflow (lines 357-389)
8. `storeApprovalMemoryForLearning()` - Delegate to ApprovalOutcomeService (lines 901-1039)

---

#### Service 2: ApproverIntelligenceService (Selection & Ranking)

**Purpose**: Intelligent approver selection using memory-based patterns
**Pattern**: Strategy pattern - encapsulates ranking algorithms
**Evidence**: Approver intelligence interfaces defined (approver-intelligence.interface.ts lines 1-71)

**Responsibilities**:

- Select best approver using IMemoryAdapter
- Rank approvers by expertise and context
- Analyze approver behavior patterns
- Build selection reasoning for audit trails

**Target LOC**: **250 lines**

**Public Interface**:

```typescript
// Pattern source: approval-processing.service.ts:410-544
// Verified interfaces: approver-intelligence.interface.ts:57-70
async selectBestApprover(
  request: HumanApprovalRequest,
  potentialApprovers: string[]
): Promise<ApproverRanking>;

// NEW: Extract approver profile from memory
async getApproverProfile(approverId: string, context: HumanApprovalRequest): Promise<ApproverProfile>;
```

**Dependencies**:

- `IMemoryAdapter` (Optional) - Memory pattern retrieval (verified: line 38)
- `ApproverExpertiseService` - NEW: Expertise calculation
- `Logger` - Logging (verified: line 30)

**Methods to Extract** (10 methods):

1. `selectBestApprover()` - Main selection logic (lines 410-544)
2. `rankApprovers()` - Ranking algorithm (lines 666-723)
3. `extractAvgResponseTime()` - Pattern extraction (lines 728-732)
4. `calculateApprovalRate()` - Rate calculation (lines 737-743)
5. `determineApproverStyle()` - Style detection (lines 748-760)
6. `buildSelectionReasoning()` - Reasoning builder (lines 848-857)
7. `getDefaultUserPatterns()` - Fallback patterns (lines 862-875)
8. `getDefaultExpertise()` - Fallback expertise (lines 880-888)
9. `calculateConfidenceAlignment()` - Alignment scoring (lines 818-843)
10. `inferRiskSpecialization()` - Risk analysis (lines 765-813)

---

#### Service 3: ApproverExpertiseService (Expertise Calculation)

**Purpose**: Calculate approver expertise from memory context and patterns
**Pattern**: Domain service - pure business logic
**Evidence**: ApproverExpertise interface defined (approver-intelligence.interface.ts lines 36-52)

**Responsibilities**:

- Calculate expertise scores from memory patterns
- Analyze workflow type experience
- Determine risk specialization
- Compute success rates

**Target LOC**: **200 lines**

**Public Interface**:

```typescript
// Pattern source: approval-processing.service.ts:619-661
// Verified interface: approver-intelligence.interface.ts:36-52
calculateApproverExpertise(
  context: AgentMemoryContext,
  patterns: UserMemoryPatterns,
  request: HumanApprovalRequest
): ApproverExpertise;

// NEW: Analyze historical patterns for expertise signals
analyzeHistoricalPatterns(
  patterns: UserMemoryPatterns,
  workflowType: string
): { relevantWorkflows: string[]; totalExperience: number };
```

**Dependencies**:

- None (pure calculation service)
- All inputs provided by caller

**Methods to Extract** (4 methods):

1. `calculateApproverExpertise()` - Main calculation (lines 619-661)
2. `inferRiskSpecialization()` - Risk analysis (lines 765-813) - SHARED with Intelligence
3. `analyzeHistoricalPatterns()` - Pattern extraction (NEW: extract from calculateApproverExpertise)
4. `computeExpertiseScore()` - Score formula (NEW: extract from calculateApproverExpertise)

---

#### Service 4: ApprovalOutcomeService (Outcome Storage & Tracking)

**Purpose**: Store approval outcomes for learning and tracking
**Pattern**: Repository pattern - data persistence abstraction
**Evidence**: storeAgentExecution pattern (lines 596-600)

**Responsibilities**:

- Store approval outcomes as agent executions
- Store approval memory for learning
- Track user-specific approval patterns
- Assess feedback quality and complexity

**Target LOC**: **150 lines**

**Public Interface**:

```typescript
// Pattern source: approval-processing.service.ts:550-614
async storeApprovalOutcome(
  request: HumanApprovalRequest,
  response: HumanApprovalResponse
): Promise<void>;

// Pattern source: approval-processing.service.ts:901-1039
async storeApprovalMemoryForLearning(
  request: HumanApprovalRequest,
  response: HumanApprovalResponse,
  decision: 'approved' | 'rejected'
): Promise<void>;
```

**Dependencies**:

- `IMemoryAdapter` (Optional) - Memory storage (verified: line 38)
- `Logger` - Logging (verified: line 30)

**Methods to Extract** (10 methods):

1. `storeApprovalOutcome()` - Main storage (lines 550-614)
2. `storeApprovalMemoryForLearning()` - Learning storage (lines 901-1039)
3. `assessRiskPredictionAccuracy()` - Risk accuracy (lines 1044-1060)
4. `assessFeedbackQuality()` - Feedback scoring (lines 1065-1069)
5. `analyzeApproverStyle()` - Style analysis (lines 1074-1083)
6. `categorizeConfidence()` - Confidence categorization (lines 1088-1094)
7. `assessRiskTolerance()` - Risk tolerance (lines 1099-1108)
8. `getTimeContext()` - Time context (lines 1113-1119)
9. `assessComplexity()` - Complexity assessment (lines 1124-1134)
10. `calculateConfidenceAlignment()` - SHARED with Intelligence service (lines 818-843)

---

## 📋 DEPENDENCY GRAPH

```
ApprovalProcessingService (Core Coordinator)
  ├─→ ApproverIntelligenceService (Approver Selection)
  │     └─→ ApproverExpertiseService (Expertise Calculation)
  ├─→ ApprovalOutcomeService (Outcome Storage)
  ├─→ FeedbackProcessorService (Existing)
  └─→ ApprovalChainService (Existing)

External Dependencies:
  - IMemoryAdapter (Optional) - Used by Intelligence & Outcome services
  - EventEmitter2 - Used by Processing service
```

**No Circular Dependencies**: All services follow unidirectional dependency flow

**Shared Methods**:

- `calculateConfidenceAlignment()` - Used by both Intelligence and Outcome services
- Solution: Extract to shared utility or duplicate (method is small, 25 lines)

---

## 🎯 RESPONSIBILITY MATRIX

| Service                         | Primary Responsibility                   | Key Methods                                                      | Max LOC | Key Dependencies                                                       |
| ------------------------------- | ---------------------------------------- | ---------------------------------------------------------------- | ------- | ---------------------------------------------------------------------- |
| **ApprovalProcessingService**   | Workflow coordination & state management | processApproval(), processApprovalResponse(), handle\*() methods | 200     | EventEmitter2, FeedbackProcessor, ApprovalChain, Intelligence, Outcome |
| **ApproverIntelligenceService** | Approver selection & ranking             | selectBestApprover(), rankApprovers(), getApproverProfile()      | 250     | IMemoryAdapter, Expertise                                              |
| **ApproverExpertiseService**    | Expertise calculation                    | calculateApproverExpertise(), inferRiskSpecialization()          | 200     | None (pure logic)                                                      |
| **ApprovalOutcomeService**      | Outcome storage & tracking               | storeApprovalOutcome(), storeApprovalMemoryForLearning()         | 150     | IMemoryAdapter                                                         |

**Total LOC**: 800 lines (down from 1,135 lines = 29.5% reduction)
**Service Count**: 4 services (from 1 monolithic service)
**Average LOC per service**: 200 lines (56% below 450 LOC limit)

---

## 📝 MIGRATION STRATEGY

### Step 1: Create Service Shells (30 minutes)

**Create 3 new service files** with empty implementations:

1. `libs/langgraph-modules/hitl/src/lib/services/approver-intelligence.service.ts`
2. `libs/langgraph-modules/hitl/src/lib/services/approver-expertise.service.ts`
3. `libs/langgraph-modules/hitl/src/lib/services/approval-outcome.service.ts`

**Initial structure** (verified pattern from approval-processing.service.ts:28-39):

```typescript
import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import type { IMemoryAdapter } from '@hive-academy/langgraph-core';

@Injectable()
export class ApproverIntelligenceService {
  private readonly logger = new Logger(ApproverIntelligenceService.name);

  constructor(
    @Optional()
    @Inject('IMemoryAdapter')
    private readonly memoryAdapter?: IMemoryAdapter
  ) {}

  // Methods will be extracted here
}
```

**Quality Gates**:

- [ ] All services compile without errors
- [ ] Correct import paths using @hive-academy aliases
- [ ] Logger initialized correctly
- [ ] Optional IMemoryAdapter injection where needed

---

### Step 2: Define Service Interfaces First (45 minutes)

**Before extracting implementation**, define clear public interfaces:

**Create**: `libs/langgraph-modules/hitl/src/lib/interfaces/approval-services.interface.ts`

```typescript
/**
 * Approval Services Interfaces
 * Phase 1 Refactoring - SOLID Enforcement
 */

import type { HumanApprovalRequest, HumanApprovalResponse } from '../services/approval-workflow.types';
import type { ApproverProfile, ApproverExpertise, ApproverRanking } from './approver-intelligence.interface';
import type { AgentMemoryContext, UserMemoryPatterns } from '@hive-academy/langgraph-core';

/**
 * Approver Intelligence Service Interface
 */
export interface IApproverIntelligenceService {
  selectBestApprover(request: HumanApprovalRequest, potentialApprovers: string[]): Promise<ApproverRanking>;

  getApproverProfile(approverId: string, context: HumanApprovalRequest): Promise<ApproverProfile>;
}

/**
 * Approver Expertise Service Interface
 */
export interface IApproverExpertiseService {
  calculateApproverExpertise(context: AgentMemoryContext, patterns: UserMemoryPatterns, request: HumanApprovalRequest): ApproverExpertise;

  analyzeHistoricalPatterns(patterns: UserMemoryPatterns, workflowType: string): { relevantWorkflows: string[]; totalExperience: number };
}

/**
 * Approval Outcome Service Interface
 */
export interface IApprovalOutcomeService {
  storeApprovalOutcome(request: HumanApprovalRequest, response: HumanApprovalResponse): Promise<void>;

  storeApprovalMemoryForLearning(request: HumanApprovalRequest, response: HumanApprovalResponse, decision: 'approved' | 'rejected'): Promise<void>;
}
```

**Quality Gates**:

- [ ] Interfaces compile without errors
- [ ] All imports resolve correctly
- [ ] Method signatures match current implementation
- [ ] No circular type dependencies

---

### Step 3: Extract ApproverExpertiseService First (2 hours)

**Why First?**: No dependencies on other new services (pure logic)

**Extraction Process**:

1. **Copy methods from approval-processing.service.ts**:

   - `calculateApproverExpertise()` (lines 619-661)
   - `inferRiskSpecialization()` (lines 765-813)
   - Helper methods for pattern analysis

2. **Make methods public** (remove `private` keyword)

3. **Update method signatures** to implement interface

4. **Test extraction**:
   ```bash
   npx nx test @hive-academy/langgraph-hitl --testFile=approver-expertise.service.spec.ts
   ```

**Quality Gates**:

- [ ] All extracted methods are public
- [ ] Service implements IApproverExpertiseService interface
- [ ] No references to other new services
- [ ] Unit tests pass
- [ ] No `any` types

---

### Step 4: Extract ApproverIntelligenceService (2.5 hours)

**Why Second?**: Depends on ApproverExpertiseService (now available)

**Extraction Process**:

1. **Inject ApproverExpertiseService**:

   ```typescript
   constructor(
     private readonly expertiseService: ApproverExpertiseService,
     @Optional() @Inject('IMemoryAdapter') private readonly memoryAdapter?: IMemoryAdapter
   ) {}
   ```

2. **Copy methods from approval-processing.service.ts**:

   - `selectBestApprover()` (lines 410-544)
   - `rankApprovers()` (lines 666-723)
   - Pattern extraction helpers (lines 728-875)

3. **Replace inline expertise calculation**:

   ```typescript
   // OLD: this.calculateApproverExpertise(context, userPatterns, request)
   // NEW: this.expertiseService.calculateApproverExpertise(context, userPatterns, request)
   ```

4. **Update imports** to use shared types:
   ```typescript
   import type { ApproverProfile, ApproverExpertise, ApproverRanking } from '../interfaces/approver-intelligence.interface';
   ```

**Quality Gates**:

- [ ] Service implements IApproverIntelligenceService interface
- [ ] Dependencies injected correctly
- [ ] Calls to expertiseService work correctly
- [ ] Unit tests pass
- [ ] Graceful degradation when memory unavailable

---

### Step 5: Extract ApprovalOutcomeService (2 hours)

**Why Third?**: Independent of Intelligence service

**Extraction Process**:

1. **Copy methods from approval-processing.service.ts**:

   - `storeApprovalOutcome()` (lines 550-614)
   - `storeApprovalMemoryForLearning()` (lines 901-1039)
   - Assessment helpers (lines 1044-1134)

2. **Inject IMemoryAdapter**:

   ```typescript
   constructor(
     @Optional() @Inject('IMemoryAdapter') private readonly memoryAdapter?: IMemoryAdapter
   ) {}
   ```

3. **Handle shared method `calculateConfidenceAlignment()`**:
   - Decision: Duplicate method (small, 25 lines)
   - Reason: Avoid tight coupling between Intelligence and Outcome services
   - Alternative: Extract to shared utility if needed later

**Quality Gates**:

- [ ] Service implements IApprovalOutcomeService interface
- [ ] IMemoryAdapter injection works
- [ ] Graceful degradation when memory unavailable
- [ ] Unit tests pass
- [ ] All assessment methods working

---

### Step 6: Refactor ApprovalProcessingService (3 hours)

**Final Step**: Update core service to use new dependencies

**Refactoring Process**:

1. **Add new service dependencies**:

   ```typescript
   constructor(
     private readonly eventEmitter: EventEmitter2,
     private readonly feedbackProcessor: FeedbackProcessorService,
     private readonly approvalChainService: ApprovalChainService,
     // NEW DEPENDENCIES
     private readonly approverIntelligence: ApproverIntelligenceService,
     private readonly approvalOutcome: ApprovalOutcomeService,
     // Remove: IMemoryAdapter (no longer needed here)
   ) {}
   ```

2. **Update method calls**:

   ```typescript
   // In handleApprovalSuccess() - line 216
   // OLD: await this.storeApprovalOutcome(request, response);
   // NEW: await this.approvalOutcome.storeApprovalOutcome(request, response);

   // OLD: await this.storeApprovalMemoryForLearning(request, response, 'approved');
   // NEW: await this.approvalOutcome.storeApprovalMemoryForLearning(request, response, 'approved');

   // NEW: Add approver selection capability
   // await this.approverIntelligence.selectBestApprover(request, potentialApprovers);
   ```

3. **Delete extracted methods** (28 private methods → 8 remaining):

   - Keep: 8 core workflow methods
   - Delete: 20 extracted methods

4. **Verify LOC reduction**:
   ```bash
   wc -l approval-processing.service.ts
   # Target: ~200 lines (down from 1,135)
   ```

**Quality Gates**:

- [ ] Service compiles without errors
- [ ] All new dependencies injected
- [ ] Method calls to new services work
- [ ] Unit tests updated and passing
- [ ] Integration tests passing
- [ ] LOC under 250 lines

---

### Step 7: Update Dependency Injection (1 hour)

**Update HITL Module Provider Configuration**:

**File**: `libs/langgraph-modules/hitl/src/lib/hitl.module.ts`

**Add new providers**:

```typescript
import { ApproverIntelligenceService } from './services/approver-intelligence.service';
import { ApproverExpertiseService } from './services/approver-expertise.service';
import { ApprovalOutcomeService } from './services/approval-outcome.service';

@Module({
  providers: [
    // Existing services
    HumanApprovalService,
    ApprovalProcessingService,
    FeedbackProcessorService,
    ApprovalChainService,
    // ... other existing services

    // NEW: Phase 1 Refactored Services
    ApproverIntelligenceService,
    ApproverExpertiseService,
    ApprovalOutcomeService,
  ],
  exports: [
    // Export new services if needed by other modules
    ApproverIntelligenceService,
    ApproverExpertiseService,
    ApprovalOutcomeService,
  ],
})
export class HitlModule {}
```

**Quality Gates**:

- [ ] Module compiles without errors
- [ ] All providers registered
- [ ] Dependencies resolve correctly
- [ ] Build passes: `npx nx build @hive-academy/langgraph-hitl`

---

### Step 8: Update Tests (2 hours)

**Create test files for new services**:

1. `approver-intelligence.service.spec.ts`
2. `approver-expertise.service.spec.ts`
3. `approval-outcome.service.spec.ts`

**Update existing tests**:

- `approval-processing.service.spec.ts` - Update mocks and dependencies

**Test Pattern** (verified from existing tests):

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ApproverIntelligenceService } from './approver-intelligence.service';
import { ApproverExpertiseService } from './approver-expertise.service';

describe('ApproverIntelligenceService', () => {
  let service: ApproverIntelligenceService;
  let expertiseService: ApproverExpertiseService;
  let memoryAdapter: IMemoryAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApproverIntelligenceService,
        ApproverExpertiseService,
        {
          provide: 'IMemoryAdapter',
          useValue: {
            getAgentContext: jest.fn(),
            getUserPatterns: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ApproverIntelligenceService>(ApproverIntelligenceService);
    expertiseService = module.get<ApproverExpertiseService>(ApproverExpertiseService);
    memoryAdapter = module.get<IMemoryAdapter>('IMemoryAdapter');
  });

  describe('selectBestApprover', () => {
    it('should select best approver with memory patterns', async () => {
      // Test implementation
    });

    it('should gracefully degrade when memory unavailable', async () => {
      // Test fallback behavior
    });
  });
});
```

**Quality Gates**:

- [ ] All new services have test files
- [ ] Test coverage ≥ 80%
- [ ] All tests pass: `npx nx test @hive-academy/langgraph-hitl`
- [ ] Integration tests pass
- [ ] No test stubs or mocks in production code

---

### Step 9: Verify Build & Lint (30 minutes)

**Run full build and lint checks**:

```bash
# Build HITL module
npx nx build @hive-academy/langgraph-hitl

# Run tests
npx nx test @hive-academy/langgraph-hitl --coverage

# Lint check
npx nx lint @hive-academy/langgraph-hitl

# Format check
npm run format:check
```

**Quality Gates**:

- [ ] Build passes without errors
- [ ] All tests pass (≥80% coverage)
- [ ] No linting errors
- [ ] No formatting issues
- [ ] No TypeScript errors
- [ ] No circular dependencies

---

### Step 10: Update Documentation (30 minutes)

**Update HITL CLAUDE.md**:

**File**: `libs/langgraph-modules/hitl/CLAUDE.md`

**Add new services documentation** (after line 254):

````markdown
### Phase 1 Refactored Services (2025-01-11)

#### ApproverIntelligenceService - Intelligent Approver Selection

**Purpose**: Memory-based intelligent approver routing

```typescript
import { ApproverIntelligenceService } from '@hive-academy/langgraph-hitl';

@Injectable()
export class MyService {
  constructor(private readonly intelligence: ApproverIntelligenceService) {}

  async routeApproval(request: HumanApprovalRequest, approvers: string[]) {
    // Intelligent selection using memory patterns
    const ranking = await this.intelligence.selectBestApprover(request, approvers);

    console.log(`Selected: ${ranking.selectedApproverId}`);
    console.log(`Reasoning: ${ranking.selectionReasoning}`);
  }
}
```
````

#### ApproverExpertiseService - Expertise Calculation

**Purpose**: Calculate approver expertise from memory patterns

```typescript
import { ApproverExpertiseService } from '@hive-academy/langgraph-hitl';

const expertiseService = new ApproverExpertiseService();

const expertise = expertiseService.calculateApproverExpertise(context, userPatterns, request);

console.log(`Expertise Score: ${expertise.score}/10`);
console.log(`Risk Specialization: ${expertise.riskSpecialization}`);
```

#### ApprovalOutcomeService - Outcome Storage

**Purpose**: Store approval outcomes for learning and analytics

```typescript
import { ApprovalOutcomeService } from '@hive-academy/langgraph-hitl';

@Injectable()
export class MyService {
  constructor(private readonly outcomeService: ApprovalOutcomeService) {}

  async trackApproval(request: HumanApprovalRequest, response: HumanApprovalResponse) {
    // Store as agent execution for ML learning
    await this.outcomeService.storeApprovalOutcome(request, response);

    // Store learning patterns
    await this.outcomeService.storeApprovalMemoryForLearning(request, response, response.decision === 'approved' ? 'approved' : 'rejected');
  }
}
```

```

**Quality Gates**:
- [ ] CLAUDE.md updated with new services
- [ ] Usage examples provided
- [ ] Import paths correct
- [ ] No references to old monolithic structure

---

## 🎯 IMPLEMENTATION CHECKLIST

### Pre-Implementation (30 minutes)
- [ ] Read this service decomposition plan thoroughly
- [ ] Review approval-processing.service.ts current implementation
- [ ] Verify access to all required files
- [ ] Ensure development environment is set up

### Step 1: Create Service Shells (30 minutes)
- [ ] Create approver-intelligence.service.ts
- [ ] Create approver-expertise.service.ts
- [ ] Create approval-outcome.service.ts
- [ ] Verify all compile without errors

### Step 2: Define Interfaces (45 minutes)
- [ ] Create approval-services.interface.ts
- [ ] Define IApproverIntelligenceService
- [ ] Define IApproverExpertiseService
- [ ] Define IApprovalOutcomeService
- [ ] Verify interfaces compile

### Step 3: Extract ApproverExpertiseService (2 hours)
- [ ] Copy calculateApproverExpertise method
- [ ] Copy inferRiskSpecialization method
- [ ] Make methods public
- [ ] Implement interface
- [ ] Write unit tests
- [ ] Verify tests pass

### Step 4: Extract ApproverIntelligenceService (2.5 hours)
- [ ] Inject ApproverExpertiseService
- [ ] Copy selectBestApprover method
- [ ] Copy rankApprovers method
- [ ] Copy helper methods
- [ ] Update expertise calculation calls
- [ ] Write unit tests
- [ ] Verify tests pass

### Step 5: Extract ApprovalOutcomeService (2 hours)
- [ ] Copy storeApprovalOutcome method
- [ ] Copy storeApprovalMemoryForLearning method
- [ ] Copy assessment helpers
- [ ] Handle calculateConfidenceAlignment duplication
- [ ] Write unit tests
- [ ] Verify tests pass

### Step 6: Refactor ApprovalProcessingService (3 hours)
- [ ] Add new service dependencies
- [ ] Update method calls to new services
- [ ] Delete extracted methods (20 methods)
- [ ] Verify LOC < 250
- [ ] Update unit tests
- [ ] Verify tests pass

### Step 7: Update Dependency Injection (1 hour)
- [ ] Update hitl.module.ts providers
- [ ] Add new service exports
- [ ] Verify module compiles
- [ ] Run build: npx nx build @hive-academy/langgraph-hitl

### Step 8: Update Tests (2 hours)
- [ ] Create test file for ApproverIntelligenceService
- [ ] Create test file for ApproverExpertiseService
- [ ] Create test file for ApprovalOutcomeService
- [ ] Update ApprovalProcessingService tests
- [ ] Achieve ≥80% coverage
- [ ] All tests pass

### Step 9: Verify Build & Lint (30 minutes)
- [ ] Build passes: npx nx build @hive-academy/langgraph-hitl
- [ ] Tests pass: npx nx test @hive-academy/langgraph-hitl --coverage
- [ ] Lint passes: npx nx lint @hive-academy/langgraph-hitl
- [ ] Format passes: npm run format:check
- [ ] No TypeScript errors
- [ ] No circular dependencies

### Step 10: Update Documentation (30 minutes)
- [ ] Update libs/langgraph-modules/hitl/CLAUDE.md
- [ ] Add new service documentation
- [ ] Add usage examples
- [ ] Update exports list
- [ ] Verify documentation accuracy

### Final Validation
- [ ] All services under 450 LOC (target: 200-250)
- [ ] No circular dependencies
- [ ] Build passes
- [ ] Tests pass (≥80% coverage)
- [ ] Lint passes
- [ ] SOLID principles validated
- [ ] No code duplication
- [ ] Real IMemoryAdapter integration maintained

**Total Estimated Time**: **16 hours** (2 days of focused development)

---

## 🎯 SUCCESS CRITERIA

### Code Metrics
- ✅ ApprovalProcessingService: **< 250 LOC** (target: 200)
- ✅ ApproverIntelligenceService: **< 300 LOC** (target: 250)
- ✅ ApproverExpertiseService: **< 250 LOC** (target: 200)
- ✅ ApprovalOutcomeService: **< 200 LOC** (target: 150)
- ✅ Total reduction: **29.5%** (1,135 → 800 LOC)

### SOLID Compliance
- ✅ **Single Responsibility**: Each service has ONE clear responsibility
- ✅ **Open/Closed**: Services extensible through interfaces
- ✅ **Liskov Substitution**: All services implement defined interfaces
- ✅ **Interface Segregation**: Lean, focused interfaces (3-4 methods each)
- ✅ **Dependency Inversion**: All dependencies are abstractions (IMemoryAdapter, interfaces)

### Quality Gates
- ✅ **No Circular Dependencies**: Verified dependency graph
- ✅ **Build Passes**: `npx nx build @hive-academy/langgraph-hitl` succeeds
- ✅ **Tests Pass**: ≥80% coverage, all tests green
- ✅ **Lint Clean**: No linting errors
- ✅ **Type Safety**: No `any` types
- ✅ **Real Implementation**: IMemoryAdapter integration maintained
- ✅ **Graceful Degradation**: Optional memory adapter pattern preserved

### Architectural Integrity
- ✅ **Pattern Consistency**: Matches existing HITL module service structure
- ✅ **Import Aliases**: All imports use @hive-academy/* paths
- ✅ **Documentation**: CLAUDE.md updated with new services
- ✅ **No Backward Compatibility**: Direct replacement, no versioned services

---

## 🤝 DEVELOPER HANDOFF

### Backend Developer Tasks

**Task B1**: Implement Service Decomposition Refactoring
**Complexity**: HIGH
**Estimated Time**: 16 hours (2 days)

**CRITICAL: Codebase Verification Required**

Before implementing, backend-developer MUST verify:

1. **Read this entire service decomposition plan**
   - Understand the 4-service architecture
   - Review dependency graph
   - Study migration steps 1-10

2. **Verify all patterns in codebase**
   - Read approval-processing.service.ts (lines 1-1135)
   - Read approver-intelligence.interface.ts (lines 1-71)
   - Read approval-chain.service.ts (lines 1-717) for pattern examples
   - Read HITL CLAUDE.md for service integration patterns

3. **Understand existing integrations**
   - IMemoryAdapter optional injection pattern (line 36-39)
   - EventEmitter2 usage (line 174-180)
   - Graceful degradation (lines 414-428)

4. **Prepare test environment**
   - Ensure IMemoryAdapter mock available
   - Set up test fixtures for HumanApprovalRequest
   - Prepare ApproverProfile test data

**Investigation Checklist for Developer**:
- [ ] Read approval-processing.service.ts completely
- [ ] Identify all 28 private methods
- [ ] Map methods to destination services (use Responsibility Matrix)
- [ ] Verify all interface definitions in approver-intelligence.interface.ts
- [ ] Check existing service patterns in approval-chain.service.ts
- [ ] Understand IMemoryAdapter usage patterns

**Implementation Steps** (follow exactly):

1. **Step 1-2**: Create shells and interfaces (1.25 hours)
2. **Step 3**: Extract ApproverExpertiseService (2 hours)
3. **Step 4**: Extract ApproverIntelligenceService (2.5 hours)
4. **Step 5**: Extract ApprovalOutcomeService (2 hours)
5. **Step 6**: Refactor ApprovalProcessingService (3 hours)
6. **Step 7-10**: Module updates, tests, docs (4.25 hours)

**After each step**:
- [ ] Run build: `npx nx build @hive-academy/langgraph-hitl`
- [ ] Run tests: `npx nx test @hive-academy/langgraph-hitl`
- [ ] Commit progress: `git commit -m "feat(hitl): Step N - [description]"`

**Acceptance Criteria**:
- [ ] All 4 services under 450 LOC limit
- [ ] No circular dependencies
- [ ] Build passes without errors
- [ ] Tests pass with ≥80% coverage
- [ ] Lint passes
- [ ] IMemoryAdapter integration maintained
- [ ] Graceful degradation preserved
- [ ] Documentation updated

**Risk Mitigation**:
- **Risk**: Breaking existing approvals
  - **Mitigation**: Extract services one at a time, test after each
- **Risk**: Missing IMemoryAdapter methods
  - **Mitigation**: Verify interface against core library before extraction
- **Risk**: Circular dependencies
  - **Mitigation**: Follow dependency graph strictly (Expertise → Intelligence → Outcome)

**Communication**:
- Report completion of each step (1-10) to task channel
- Flag any blockers immediately
- Request code review after Step 6 (before final validation)

---

## 📊 EVIDENCE CITATIONS

### Architecture Decisions

**Decision**: Use 4-service decomposition
**Evidence**:
- HITL module already has 16 services: `libs/langgraph-modules/hitl/CLAUDE.md:237-254`
- Memory library split pattern: `task-tracking/registry.md:12` (AgentMemoryBridgeService → 4 services)
- Approval-chain.service.ts as focused service example: `libs/langgraph-modules/hitl/src/lib/services/approval-chain.service.ts:1-717`

**Decision**: Optional IMemoryAdapter injection
**Evidence**:
- Pattern: `approval-processing.service.ts:36-39` (@Optional decorator)
- Graceful degradation: `approval-processing.service.ts:414-428`
- Usage: `approval-processing.service.ts:437-450` (getAgentContext, getUserPatterns)

**Decision**: Preserve adapter-based storage
**Evidence**:
- Pattern: `approval-chain.service.ts:232-240` (IApprovalChainStorageService)
- Implementation: `apps/dev-brand-api/src/app/adapters/hitl/` (5 Neo4j adapters)
- CLAUDE.md: `libs/langgraph-modules/hitl/CLAUDE.md:66-154`

**Decision**: Event-driven architecture
**Evidence**:
- Usage: `approval-processing.service.ts:174-180` (HITL_EVENTS)
- Integration: `approval-chain.service.ts:437-443` (approval.completed)

### Method Extractions

**ApproverExpertiseService methods**:
- calculateApproverExpertise: `approval-processing.service.ts:619-661`
- inferRiskSpecialization: `approval-processing.service.ts:765-813`

**ApproverIntelligenceService methods**:
- selectBestApprover: `approval-processing.service.ts:410-544`
- rankApprovers: `approval-processing.service.ts:666-723`
- Pattern helpers: `approval-processing.service.ts:728-875`

**ApprovalOutcomeService methods**:
- storeApprovalOutcome: `approval-processing.service.ts:550-614`
- storeApprovalMemoryForLearning: `approval-processing.service.ts:901-1039`
- Assessment helpers: `approval-processing.service.ts:1044-1134`

### Interface Definitions

**ApproverProfile interface**:
- Definition: `approver-intelligence.interface.ts:11-32`
- Used by: selectBestApprover (line 432-494)

**ApproverExpertise interface**:
- Definition: `approver-intelligence.interface.ts:36-52`
- Used by: calculateApproverExpertise (line 619-661)

**ApproverRanking interface**:
- Definition: `approver-intelligence.interface.ts:57-70`
- Return type: selectBestApprover (line 410)

---

## 🔒 ANTI-BACKWARD COMPATIBILITY ENFORCEMENT

**ZERO TOLERANCE FOR VERSIONING**:

- ❌ **FORBIDDEN**: ApprovalProcessingServiceV1, ApprovalProcessingServiceV2
- ❌ **FORBIDDEN**: ApprovalProcessingServiceLegacy, ApprovalProcessingServiceEnhanced
- ❌ **FORBIDDEN**: Feature flags for service versioning
- ❌ **FORBIDDEN**: Compatibility adapters between old and new services
- ✅ **CORRECT**: Direct replacement of ApprovalProcessingService with 4 focused services

**Migration Approach**: **DIRECT REPLACEMENT ONLY**

1. Extract new services with same functionality
2. Update ApprovalProcessingService to delegate to new services
3. Delete extracted code from ApprovalProcessingService
4. No parallel implementations

**Validation**:
- [ ] No service names contain: V1, V2, Legacy, Enhanced, Old, New
- [ ] No version-based routing logic
- [ ] Single provider configuration (no multi-version providers)
- [ ] No feature flags for service selection

---

**Plan Created**: 2025-01-11
**Architect**: software-architect
**Status**: Ready for backend-developer implementation
**Next Step**: Handoff to backend-developer with implementation checklist
```
