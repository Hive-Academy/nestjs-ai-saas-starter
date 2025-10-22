# Requirements Document - TASK_2025_019

## Introduction

### Business Context

TASK_2025_019 represents the foundational phase of transforming the Angular LangGraph integration library from a hardcoded DevBrand-specific implementation to a fully generic, workflow-agnostic infrastructure. This task establishes the architectural patterns that enable unlimited workflow types through the WorkflowRegistry pattern.

**Current State**: The angular-langgraph.md documentation contains hardcoded DevBrand-specific implementations in core services:
- Hardcoded REST endpoint: `POST /devbrand/execute` (line 222)
- Hardcoded component titles: `title = input('DevBrand Workflow')` (line 631)
- DevBrand-specific component examples (lines 1142-1277)
- Fixed workflow initialization logic

**Target State**: Generic infrastructure enabling developers to register custom workflows without modifying library code, matching the extensibility model of CopilotKit (React) but for Angular.

**Value Proposition**:
- **Market Differentiation**: Position as Angular's answer to CopilotKit
- **Developer Productivity**: Enable custom AI workflows in <50 lines of code
- **Architectural Excellence**: Type-safe, Observable-based, production-ready patterns
- **Extensibility**: Support unlimited workflow domains through registry pattern

### Parent Task Context

This task is the **first of 5 sequential sub-tasks** coordinated by TASK_2025_018 (Meta-Plan). Success here unblocks:
- TASK_2025_020: Components & Directives Rewrite (depends on WorkflowRegistry)
- TASK_2025_021: Composables & Providers Rewrite (depends on generic models)
- TASK_2025_022: Examples Package Creation (depends on all infrastructure)
- TASK_2025_023: Documentation Consolidation (depends on all tasks)

### Scope Definition

**IN SCOPE**:
- Documentation rewrite of core services (LangGraphConnectionService, LangGraphProtocolService)
- WorkflowRegistry pattern design and documentation
- Generic TypeScript model interfaces
- Configuration interface documentation
- Code examples using placeholder workflow names

**OUT OF SCOPE**:
- Implementation code changes (future work)
- Component genericization (TASK_2025_020)
- Composable function rewrite (TASK_2025_021)
- Examples package creation (TASK_2025_022)
- New feature additions (enhancement only, not rewrite)

---

## Requirements

### Requirement 1: Generic LangGraphConnectionService

**User Story**: As a developer integrating custom AI workflows, I want the connection service to support dynamic workflow endpoints, so that I can register multiple workflow types without modifying library code.

#### Acceptance Criteria

1. WHEN developer reviews connection service documentation THEN zero hardcoded endpoints SHALL exist (eliminate `POST /devbrand/execute`)
2. WHEN workflow execution initiated THEN connection service SHALL use configurable endpoint pattern `POST /:workflowId/execute`
3. WHEN WebSocket subscription created THEN subscription path SHALL support dynamic workflow IDs (e.g., `/streaming/:workflowId`)
4. WHEN authentication required THEN token handling SHALL be workflow-agnostic (no DevBrand-specific auth logic)
5. WHEN documentation shows REST examples THEN examples SHALL use placeholder workflows (e.g., "content-generation", "data-analysis")
6. WHEN developer calls `startWorkflow()` THEN method signature SHALL accept `workflowId: string` parameter

**Technical Specification**:
```typescript
// Current (DevBrand-specific)
startWorkflow(githubUsername: string, userId?: string): Observable<WorkflowExecution>

// Target (Generic)
startWorkflow<TInput, TOutput>(
  workflowId: string,
  input: TInput
): Observable<WorkflowExecution<TInput, TOutput>>
```

---

### Requirement 2: WorkflowRegistry Pattern Implementation

**User Story**: As a developer building multiple AI features, I want a registry to manage workflow definitions, so that I can register workflows at bootstrap without library modification.

#### Acceptance Criteria

1. WHEN developer registers workflow THEN `WorkflowRegistry.register()` SHALL accept `WorkflowDefinition<TInput, TOutput>` interface
2. WHEN workflow retrieved THEN `WorkflowRegistry.get(id)` SHALL return type-safe workflow definition
3. WHEN workflows listed THEN `WorkflowRegistry.list()` SHALL return all registered workflows
4. WHEN workflow input validated THEN registry SHALL support Zod schema validation
5. WHEN multiple workflows registered THEN registry SHALL maintain isolation (no workflow ID collisions)
6. WHEN documentation shows examples THEN examples SHALL demonstrate multi-workflow registration scenarios

**Technical Specification**:
```typescript
export interface WorkflowDefinition<TInput = any, TOutput = any> {
  id: string;                           // Unique workflow identifier
  name: string;                         // Human-readable name
  description: string;                  // Workflow purpose
  endpoint: string;                     // REST endpoint (e.g., '/workflows/content-gen/execute')
  websocketPath?: string;               // Optional WebSocket path override
  inputSchema: ZodSchema<TInput>;       // Input validation schema
  outputSchema?: ZodSchema<TOutput>;    // Optional output validation
  metadata?: Record<string, any>;       // Extensible metadata
}

export interface WorkflowRegistry {
  register<TInput, TOutput>(workflow: WorkflowDefinition<TInput, TOutput>): void;
  get<TInput = any, TOutput = any>(id: string): WorkflowDefinition<TInput, TOutput> | undefined;
  list(): WorkflowDefinition<any, any>[];
  has(id: string): boolean;
  unregister(id: string): void;
}
```

**Design Considerations**:
- **Singleton vs Injectable**: Document as Angular service (injectable) for DI integration
- **Validation Strategy**: Validate workflow IDs on registration (no duplicates)
- **Error Handling**: Define error types for missing workflows, invalid schemas
- **Type Safety**: Ensure generic type parameters propagate through get/register methods

---

### Requirement 3: Generic LangGraphProtocolService

**User Story**: As a developer implementing custom workflow logic, I want protocol service to handle events generically, so that workflow-specific behavior is externalized.

#### Acceptance Criteria

1. WHEN event processed THEN protocol service SHALL handle events without workflow-specific logic
2. WHEN state snapshot received THEN state SHALL be typed as generic `TState` parameter
3. WHEN interruption request processed THEN approval logic SHALL support custom approval types
4. WHEN documentation shows protocol examples THEN examples SHALL demonstrate generic event handling
5. WHEN developer extends protocol THEN extension SHALL not require modifying service code

**Technical Specification**:
```typescript
// Current (DevBrand-specific approval logic)
private processApprovalRequest(data: any): ProcessedEvent<any>

// Target (Generic HITL)
private processInterruptionRequest<TApprovalData>(
  data: InterruptionRequest<TApprovalData>
): ProcessedEvent<InterruptionRequest<TApprovalData>>
```

**Event Type Preservation**:
- All 16 AG-UI event types MUST remain supported
- Generic type parameters applied to: `STATE_SNAPSHOT`, `STATE_DELTA`, `INTERRUPTION_REQUEST`
- Event handlers MUST NOT contain workflow-specific conditional logic

---

### Requirement 4: Generic TypeScript Models

**User Story**: As a developer building type-safe workflows, I want generic model interfaces, so that TypeScript provides accurate IntelliSense for my workflow types.

#### Acceptance Criteria

1. WHEN developer defines workflow THEN models SHALL use generic type parameters for input/state/output
2. WHEN DevBrand metadata removed THEN generic `metadata?: Record<string, any>` SHALL replace specific fields
3. WHEN workflow execution tracked THEN `WorkflowExecution<TInput, TState, TOutput>` interface SHALL provide type safety
4. WHEN documentation shows model examples THEN examples SHALL demonstrate custom workflow type definitions
5. WHEN schema validation used THEN documentation SHALL show Zod schema integration patterns

**Technical Specification**:
```typescript
// Generic workflow execution interface
export interface WorkflowExecution<
  TInput = any,
  TState = any,
  TOutput = any
> {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  input: TInput;
  state?: TState;
  output?: TOutput;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// Generic state snapshot
export interface StateSnapshot<TState = any> {
  executionId: string;
  state: TState;
  timestamp: Date;
  agentId?: string;
}

// Generic interruption request
export interface InterruptionRequest<TApprovalData = any> {
  executionId: string;
  interruptionId: string;
  type: 'approval' | 'input' | 'confirmation';
  message: string;
  data: TApprovalData;
  timeout?: number;
}
```

**DevBrand-Specific Removals**:
- Remove: `brandData: BrandData` field from models
- Remove: `githubUsername: string` from workflow input
- Remove: DevBrand-specific enum values
- Replace: Specific metadata with generic `Record<string, any>`

---

### Requirement 5: Configuration Interfaces

**User Story**: As a developer setting up the library, I want clear configuration interfaces, so that I can register workflows at application bootstrap with type safety.

#### Acceptance Criteria

1. WHEN library initialized THEN `provideLangGraph(config)` SHALL accept `LangGraphConfig` interface
2. WHEN workflow registered THEN `provideLangGraphWorkflow()` SHALL enable multi-workflow registration
3. WHEN configuration documented THEN examples SHALL show complete application setup
4. WHEN developer misconfigures THEN TypeScript SHALL provide compile-time error messages
5. WHEN multi-workflow scenario documented THEN example SHALL show 3+ workflows registered

**Technical Specification**:
```typescript
export interface LangGraphConfig {
  apiUrl: string;                       // REST API base URL
  websocketUrl: string;                 // WebSocket server URL
  authToken?: string;                   // Optional JWT token
  reconnection?: {
    enabled: boolean;
    maxAttempts?: number;
    backoffStrategy?: 'linear' | 'exponential';
  };
  defaultWorkflowId?: string;           // Fallback workflow
}

// Provider function
export function provideLangGraph(config: LangGraphConfig) {
  return [
    { provide: LANGGRAPH_CONFIG, useValue: config },
    LangGraphConnectionService,
    LangGraphProtocolService,
    LangGraphStateService,
    WorkflowRegistry,
  ];
}

// Workflow registration provider
export function provideLangGraphWorkflow<TInput, TOutput>(
  workflow: WorkflowDefinition<TInput, TOutput>
) {
  return {
    provide: LANGGRAPH_WORKFLOWS,
    multi: true,
    useValue: workflow,
  };
}
```

**Bootstrap Integration Example**:
```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideLangGraph({
      apiUrl: 'http://localhost:3000/api',
      websocketUrl: 'http://localhost:8080',
    }),
    provideLangGraphWorkflow(contentGenerationWorkflow),
    provideLangGraphWorkflow(dataAnalysisWorkflow),
    provideLangGraphWorkflow(codeReviewWorkflow),
  ],
};
```

---

## Non-Functional Requirements

### Performance Requirements

- **Type Inference Speed**: Generic type parameters SHALL NOT degrade TypeScript IntelliSense performance
- **Registry Lookup**: Workflow retrieval SHALL execute in O(1) time (Map-based implementation)
- **Documentation Build**: Documentation examples SHALL compile without TypeScript errors
- **Bundle Size Impact**: Generic type system SHALL add zero runtime overhead (compile-time only)

### Security Requirements

- **Input Validation**: WorkflowRegistry SHALL validate input schemas against Zod definitions
- **Workflow Isolation**: Registered workflows SHALL NOT access other workflow's private data
- **Authentication**: Generic auth token handling SHALL support JWT standard (Bearer scheme)
- **XSS Prevention**: Documentation examples SHALL demonstrate safe HTML rendering practices

### Scalability Requirements

- **Workflow Capacity**: Registry SHALL support 100+ concurrent workflow definitions
- **Type Complexity**: Generic signatures SHALL support 3 levels of nested generics maximum
- **Documentation Size**: Rewritten sections SHALL NOT exceed 150% of original line count
- **Example Diversity**: Documentation SHALL demonstrate minimum 3 workflow domains

### Usability Requirements

- **Developer Onboarding**: New developers SHALL understand WorkflowRegistry in <10 minutes
- **Code Examples**: Every interface SHALL have minimum 1 usage example
- **Error Messages**: TypeScript errors SHALL provide actionable guidance
- **API Consistency**: All generic interfaces SHALL follow consistent naming conventions

### Maintainability Requirements

- **Code Comments**: Complex generic signatures SHALL include inline type explanations
- **Backward Compatibility**: ZERO backward compatibility (breaking change release)
- **Documentation Quality**: All code examples SHALL be copy-paste executable
- **Version Control**: Document version strategy (e.g., 2.0.0 for breaking change)

---

## Stakeholder Analysis

### Primary Stakeholders

**End Users (Angular Developers)**:
- **Needs**: Simple API, clear examples, type safety
- **Pain Points**: Current hardcoded implementation limits reusability
- **Success Criteria**: Can register custom workflow in <50 lines

**Business Owners (Hive Academy Product Team)**:
- **Needs**: Market differentiation, developer adoption, extensibility
- **Pain Points**: Library locked to DevBrand use case
- **Success Criteria**: Library positioned as Angular's CopilotKit alternative

**Development Team (Implementation Team)**:
- **Needs**: Clear requirements, feasible architecture, testable design
- **Pain Points**: Unclear generic type strategy
- **Success Criteria**: WorkflowRegistry design approved by architect

### Secondary Stakeholders

**Operations Team**:
- **Involvement**: None (documentation-only task)
- **Impact Level**: Low

**Support Team**:
- **Needs**: Documentation for troubleshooting
- **Success Criteria**: Migration guide addresses common issues

**Compliance/Security**:
- **Needs**: Input validation, secure authentication patterns
- **Success Criteria**: Zod schema validation documented

### Stakeholder Impact Matrix

| Stakeholder       | Impact Level | Involvement        | Success Criteria                              |
|-------------------|--------------|--------------------|--------------------------------------------- |
| Angular Developers| High         | Testing/Feedback   | Custom workflow registration <50 lines       |
| Product Team      | High         | Requirements       | Library as generic as CopilotKit             |
| Dev Team          | High         | Implementation     | WorkflowRegistry design feasible             |
| Architect         | Critical     | Design Review      | Type safety propagation validated            |
| QA/Testers        | Medium       | Example Validation | All code examples compile successfully       |

---

## Risk Analysis Framework

### Technical Risks

#### Risk 1: Generic Type Complexity Overwhelming

- **Risk**: Generic signatures become too complex for developers to understand
- **Probability**: Medium
- **Impact**: High (Developer experience degradation)
- **Score**: 6/9
- **Mitigation**:
  - Limit generic parameters to 3 maximum per interface
  - Provide helper types for common patterns: `type WorkflowInput<T> = { workflowId: string; input: T }`
  - Include "Type Parameter Guide" section in documentation
  - Show before/after examples demonstrating type inference
- **Contingency**: Simplify to single generic parameter if complexity too high during architect review

#### Risk 2: WorkflowRegistry Pattern Mismatch with Existing Infrastructure

- **Risk**: Registry pattern conflicts with existing WebSocket/REST architecture
- **Probability**: Low
- **Impact**: Critical (Architecture redesign required)
- **Score**: 3/9
- **Mitigation**:
  - Validate registry design against current infrastructure in TASK_2025_018/implementation-plan.md
  - Software architect SHALL review WorkflowRegistry design before documentation
  - Prototype registry integration with existing connection service
  - Review WebSocket subscription path compatibility
- **Contingency**: Fallback to configuration-object approach if registry proves incompatible

#### Risk 3: Type Parameter Propagation Breaks Observable Streams

- **Risk**: Generic types don't propagate correctly through RxJS Observable chains
- **Probability**: Medium
- **Impact**: High (Type safety lost)
- **Score**: 6/9
- **Mitigation**:
  - Document explicit return types for all methods: `Observable<WorkflowExecution<TInput, TOutput>>`
  - Test type inference with TypeScript playground examples
  - Provide type assertion helpers for edge cases
  - Include troubleshooting section for common type errors
- **Contingency**: Use type guards and manual assertions if automatic inference fails

### Business Risks

#### Risk 4: Documentation Becomes Too Abstract

- **Risk**: Removing DevBrand examples makes documentation too generic to understand
- **Probability**: Medium
- **Impact**: High (Developer adoption barrier)
- **Score**: 6/9
- **Mitigation**:
  - Use 3+ concrete placeholder workflows (content-generation, data-analysis, code-review)
  - Every abstract concept paired with concrete example
  - "Quick Start" section shows complete working example
  - Reference future examples package (TASK_2025_022) for detailed implementations
- **Contingency**: Add "Common Patterns" section with copy-paste recipes if too abstract

#### Risk 5: Breaking Changes Impact Adoption

- **Risk**: Existing DevBrand implementation breaks without migration path
- **Probability**: High (Intentional breaking change)
- **Impact**: Critical (User frustration, adoption resistance)
- **Score**: 9/9
- **Mitigation**:
  - Document breaking changes clearly in requirements
  - Reserve migration guide creation for TASK_2025_023
  - DevBrand reference implementation moves to examples package (TASK_2025_022)
  - Provide code transformation examples: "Before → After"
- **Contingency**: Create automated migration CLI tool if manual migration too complex (post-rewrite)

### Integration Risks

#### Risk 6: Scope Creep During Rewrite

- **Risk**: Feature additions creep into documentation rewrite
- **Probability**: Medium
- **Impact**: High (Timeline extension, quality degradation)
- **Score**: 6/9
- **Mitigation**:
  - Strict adherence to "rewrite without feature addition" principle
  - Validation gate after requirements: business-analyst SHALL reject scope expansions
  - Park new features in future-enhancements.md
  - Focus on 1:1 transformation of existing features to generic equivalents
- **Contingency**: Split into additional sub-task if scope expands beyond 10-12 hours

---

## Dependencies & Constraints

### External Dependencies
- **None**: Self-contained documentation rewrite

### Internal Dependencies
- **Blocks**: TASK_2025_020, TASK_2025_021, TASK_2025_022 (all depend on WorkflowRegistry pattern)
- **Depends On**: None (first task in sequence)

### Constraints
1. **Scope Limitation**: Documentation rewrite ONLY - no implementation code changes
2. **Feature Preservation**: All 16 AG-UI event types MUST remain supported
3. **Backward Compatibility**: ZERO backward compatibility (intentional breaking change)
4. **Timeline**: 10-12 hours estimated effort
5. **Type Safety**: NO 'any' types in public API documentation

### Assumptions
1. WorkflowRegistry pattern is architecturally sound (subject to architect validation)
2. RxJS Observables support generic type propagation
3. Zod schema validation is sufficient for input validation
4. TypeScript 5.0+ generics features available

---

## Quality Gates

### Validation Checklist (Business Analyst Review)

Before delegation to software-architect, verify:

- [ ] All requirements follow SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound)
- [ ] Acceptance criteria in WHEN/THEN/SHALL format
- [ ] Stakeholder analysis complete with impact matrix
- [ ] Risk assessment includes mitigation + contingency for each risk
- [ ] Success metrics clearly defined and measurable
- [ ] Dependencies identified and documented
- [ ] Non-functional requirements cover performance, security, scalability, usability
- [ ] No backward compatibility requirements (anti-pattern check passed)
- [ ] Zero DevBrand-specific requirements in generic infrastructure
- [ ] Type safety requirements specify generic parameter strategy

### Architecture Review Checklist (Software Architect)

Before implementation, architect SHALL validate:

- [ ] WorkflowRegistry design integrates with existing WebSocket/REST infrastructure
- [ ] Generic type parameter strategy enables type inference
- [ ] Configuration interfaces support multi-workflow registration
- [ ] Event handling supports all 16 AG-UI event types generically
- [ ] No architectural conflicts with existing langgraph-modules libraries

### Documentation Quality Checklist (Implementation)

After documentation rewrite, verify:

- [ ] Zero hardcoded endpoints in connection service docs
- [ ] All code examples compile successfully with TypeScript
- [ ] Minimum 3 placeholder workflow examples demonstrated
- [ ] Generic type signatures documented with inline comments
- [ ] No 'any' types in public API documentation
- [ ] All interfaces have usage examples

---

## Success Metrics

### Quantitative Metrics

1. **DevBrand References**: Zero occurrences of "devbrand" or "DevBrand" in rewritten service documentation
2. **Code Examples**: Minimum 5 working code examples demonstrating WorkflowRegistry pattern
3. **Type Safety**: 100% of public API methods have explicit generic type signatures
4. **Event Type Coverage**: All 16 AG-UI event types documented with generic handling
5. **Workflow Diversity**: Minimum 3 placeholder workflow domains demonstrated

### Qualitative Metrics

1. **Developer Experience**: Software architect approves WorkflowRegistry design as intuitive
2. **Clarity**: Business analyst confirms requirements are unambiguous
3. **Completeness**: All 5 deliverables (connection service, registry, protocol, models, config) documented
4. **Consistency**: All interfaces follow Angular/RxJS naming conventions

### Validation Criteria

- **Requirements Quality**: Business analyst approval (SMART criteria + BDD format)
- **Architectural Soundness**: Software architect approval (WorkflowRegistry design)
- **Documentation Quality**: All code examples compile without TypeScript errors
- **Scope Adherence**: Zero new features added (rewrite only)

---

## Execution Timeline

### Recommended Workflow

**Phase 0: Requirements Validation** (Complete)
- project-manager: Requirements creation
- business-analyst: SMART criteria validation
- **Checkpoint**: Requirements approved

**Phase 1: Architecture Design** (Next)
- software-architect: WorkflowRegistry design review
- software-architect: Type parameter propagation strategy
- software-architect: Configuration interface validation
- **Checkpoint**: Architecture approved

**Phase 2: Documentation Implementation** (After architect approval)
- Developer: Rewrite connection service documentation
- Developer: Document WorkflowRegistry interface + implementation
- Developer: Rewrite protocol service documentation
- Developer: Update TypeScript model interfaces
- Developer: Document configuration interfaces
- **Checkpoint**: Draft documentation complete

**Phase 3: Validation** (After implementation)
- senior-tester: Validate code examples compile
- senior-tester: Verify all 16 event types covered
- code-reviewer: Quality check documentation
- **Checkpoint**: Validation complete

**Phase 4: Completion** (Final)
- modernization-detector: Identify future enhancement opportunities
- project-manager: Create completion report
- **Checkpoint**: Task complete, unblocks TASK_2025_020

**Total Estimated Duration**: 10-12 hours

---

## Delegation Recommendation

**SKIP researcher-expert**: Requirements are clear, no research needed.

**NEXT AGENT**: software-architect

**Delegation Rationale**:
- WorkflowRegistry pattern requires architectural design review
- Generic type parameter strategy needs validation
- Configuration interface design impacts developer experience
- Integration with existing infrastructure must be verified
- Type safety propagation through Observables needs expert review

**Success Criteria for Architect**:
- WorkflowRegistry design approved as feasible
- Type parameter propagation strategy validated
- Configuration interfaces approved
- Integration points with existing services documented
- No architectural red flags identified

**Deliverables Expected from Architect**:
1. WorkflowRegistry implementation pattern (singleton vs service)
2. Type parameter propagation guidelines
3. Configuration interface recommendations
4. Integration validation with existing WebSocket/REST services
5. Green light for documentation implementation

**Time Budget**: 2-3 hours for architectural review

---

## Appendix: Code Examples

### Example 1: Generic Workflow Registration

```typescript
// content-generation.workflow.ts
import { WorkflowDefinition } from '@hive-academy/langgraph-angular';
import { z } from 'zod';

interface ContentGenInput {
  topic: string;
  tone: 'professional' | 'casual' | 'technical';
  length: number;
}

interface ContentGenOutput {
  content: string;
  metadata: { wordCount: number; readingTime: number };
}

export const contentGenerationWorkflow: WorkflowDefinition<
  ContentGenInput,
  ContentGenOutput
> = {
  id: 'content-generation',
  name: 'AI Content Generator',
  description: 'Generate blog posts and articles',
  endpoint: '/workflows/content-gen/execute',
  inputSchema: z.object({
    topic: z.string().min(3),
    tone: z.enum(['professional', 'casual', 'technical']),
    length: z.number().min(100).max(5000),
  }),
  outputSchema: z.object({
    content: z.string(),
    metadata: z.object({
      wordCount: z.number(),
      readingTime: z.number(),
    }),
  }),
};
```

### Example 2: Multi-Workflow Application Setup

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideLangGraph, provideLangGraphWorkflow } from '@hive-academy/langgraph-angular';
import { contentGenerationWorkflow } from './workflows/content-generation.workflow';
import { dataAnalysisWorkflow } from './workflows/data-analysis.workflow';
import { codeReviewWorkflow } from './workflows/code-review.workflow';

export const appConfig: ApplicationConfig = {
  providers: [
    // Core library configuration
    provideLangGraph({
      apiUrl: 'http://localhost:3000/api',
      websocketUrl: 'http://localhost:8080',
      authToken: 'your-jwt-token',
      reconnection: {
        enabled: true,
        maxAttempts: 5,
        backoffStrategy: 'exponential',
      },
    }),

    // Register multiple workflows
    provideLangGraphWorkflow(contentGenerationWorkflow),
    provideLangGraphWorkflow(dataAnalysisWorkflow),
    provideLangGraphWorkflow(codeReviewWorkflow),
  ],
};
```

### Example 3: Type-Safe Workflow Execution

```typescript
// Using the connection service with type safety
export class ContentGeneratorComponent {
  private connection = inject(LangGraphConnectionService);
  private registry = inject(WorkflowRegistry);

  generateContent(input: ContentGenInput) {
    const workflow = this.registry.get<ContentGenInput, ContentGenOutput>('content-generation');

    if (!workflow) {
      throw new Error('Content generation workflow not registered');
    }

    // Type-safe workflow execution
    this.connection
      .startWorkflow<ContentGenInput, ContentGenOutput>(workflow.id, input)
      .pipe(
        tap((execution) => console.log('Execution started:', execution.id)),
        switchMap((execution) =>
          this.connection.on<ContentGenOutput>('run_finished').pipe(
            filter((event) => event.executionId === execution.id),
            map((event) => event.data) // TypeScript knows this is ContentGenOutput
          )
        )
      )
      .subscribe((output) => {
        // output is typed as ContentGenOutput
        console.log('Generated content:', output.content);
        console.log('Word count:', output.metadata.wordCount);
      });
  }
}
```

---

## References

- **Parent Task**: task-tracking/TASK_2025_018/task-description.md (lines 27-85)
- **Source Documentation**: angular-langgraph.md (lines 105-233 for connection service)
- **AG-UI Protocol**: 16 event types specification (lines 246-270 in source)
- **Current Hardcoded Endpoints**: Lines 220-226 in angular-langgraph.md
- **DevBrand Component Examples**: Lines 1142-1277 in angular-langgraph.md
