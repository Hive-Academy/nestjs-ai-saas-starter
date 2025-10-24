# Requirements Document - TASK_2025_020

## Introduction

### Business Context

TASK_2025_020 is the **second phase** of the angular-langgraph.md comprehensive rewrite, building directly on TASK_2025_019's generic infrastructure (WorkflowRegistry, provider system, and 16 generic AG-UI event types). This task transforms ALL Angular components and directives from DevBrand-specific implementations into 100% generic, content-projection-based UI components.

**Value Proposition**:

- **Component Reusability**: Enable developers to use library components for ANY AI workflow domain without modification
- **Content Projection Excellence**: Every customizable UI area exposed as slot-based templates
- **Type-Safe Templates**: Template contexts fully typed with workflow generics
- **Zero Hardcoded UI**: Complete elimination of domain-specific strings, agent names, and metadata displays
- **WorkflowRegistry Integration**: All dynamic content sourced from registry, not hardcoded

**Dependency on TASK_2025_019**: This task REQUIRES the generic services architecture from TASK_2025_019 (WorkflowRegistry, provideLangGraph, LangGraphConnectionService patterns). All component rewrites must integrate with these approved patterns.

---

## Critical Architectural Decision

### Pattern Reuse Assessment

**DECISION REQUIRED**: Determine if component genericization requires NEW architectural patterns beyond TASK_2025_018/TASK_2025_019, or if existing patterns suffice.

**Evaluation Criteria**:

1. **Content Projection Slots**: Does WorkflowVisualizer require new slot patterns beyond standard `ng-content` + `TemplateRef`?
2. **Template Context Types**: Can existing generic types (`WorkflowDefinition<TInput, TOutput>`, `StateSnapshot<TState>`) serve as template contexts?
3. **Component-Registry Integration**: Do components need new integration patterns with WorkflowRegistry?

**If Patterns Suffice (SKIP ARCHITECT)**:

- Proceed directly to frontend-developer
- Reuse TASK_2025_018 content projection patterns
- Apply WorkflowRegistry integration from TASK_2025_019

**If New Patterns Needed (INVOKE ARCHITECT)**:

- Novel component composition approaches
- Complex template context requirements
- Advanced content projection scenarios

**Recommendation**: **SKIP architect** - Existing patterns from TASK_2025_018 (content projection) + TASK_2025_019 (WorkflowRegistry integration) provide complete architectural foundation. This task is **implementation-focused** applying approved patterns.

---

## Requirements

### Requirement 1: WorkflowVisualizer Component Genericization

**User Story**: As a developer building ANY AI workflow application, I want the WorkflowVisualizer component to display workflow progress using my custom agent definitions from WorkflowRegistry, so that I can visualize workflow execution without hardcoded agent data.

#### Target Code Section

**File**: `angular-langgraph.md`
**Lines**: 734-748 (WorkflowVisualizer implementation)
**Current Issues**:

- Line 739-743: Hardcoded agent array with DevBrand agents (`github-analyzer`, `brand-strategist`, `content-creator`)
- Line 631: Hardcoded title: `title = input('DevBrand Workflow')`

#### Acceptance Criteria

1. WHEN WorkflowVisualizer component documented THEN zero hardcoded agent definitions SHALL exist in default inputs
2. WHEN component receives agent data THEN agents SHALL be sourced from WorkflowRegistry metadata OR custom input
3. WHEN component renders THEN title SHALL be required generic input: `title = input.required<string>()`
4. WHEN developer uses component THEN WorkflowRegistry SHALL provide agent metadata via workflow definition
5. WHEN documentation shows examples THEN examples SHALL demonstrate 3+ different workflow types (content-generation, data-analysis, code-review)
6. WHEN component template customized THEN minimum 3 content projection slots SHALL exist: agent display, status indicator, event timeline
7. WHEN template context exposed THEN TypeScript interface SHALL define all available context variables
8. WHEN component state updated THEN all state changes SHALL propagate through Angular signals
9. WHEN agent list provided THEN generic type parameter SHALL enable type-safe agent interfaces: `agents = input.required<TAgent[]>()`
10. WHEN migration guide created THEN transformation example SHALL show before/after for DevBrand → generic

---

### Requirement 2: ApprovalModal Component Genericization

**User Story**: As a developer implementing HITL workflows for ANY domain, I want the ApprovalModal component to accept custom approval rendering templates, so that I can display domain-specific approval metadata without modifying library code.

#### Target Code Section

**File**: `angular-langgraph.md`
**Lines**: 762-844 (ApprovalModal implementation)
**Current Issues**:

- Lines 781-795: Hardcoded `@switch` statement for DevBrand agent metadata display:
  - `github-code-analyzer` with achievementCount, repositoriesAnalyzed, confidenceScore
  - `personal-brand-strategist` with strategyType, brandScore
  - `content-creator` with linkedinLength, devtoLength, linkedinEngagement

#### Acceptance Criteria

1. WHEN ApprovalModal component documented THEN zero hardcoded agent-specific metadata rendering SHALL exist
2. WHEN developer uses component THEN custom metadata template SHALL be accepted via `TemplateRef<ApprovalMetadataContext<TMetadata>>`
3. WHEN approval displayed THEN component SHALL provide content projection slot: `[lgApprovalMetadata]`
4. WHEN template context defined THEN generic type parameter SHALL enable typed metadata: `approval: ApprovalRequest<TMetadata>`
5. WHEN component renders THEN default template SHALL display generic metadata as JSON with expansion panel
6. WHEN documentation shows examples THEN examples SHALL demonstrate 3+ approval types with different metadata structures
7. WHEN approval actions triggered THEN action methods SHALL emit typed events: `onApprove = output<ApprovalDecision<TMetadata>>()`
8. WHEN feedback provided THEN feedback SHALL be optional and generic across all approval types
9. WHEN timeout displayed THEN timeout formatting SHALL be configurable via input
10. WHEN migration guide created THEN transformation example SHALL show extracting hardcoded metadata display to custom template

---

### Requirement 3: Chat Component Content Projection

**User Story**: As a developer building chat-based AI workflows, I want the chat component to accept custom message templates, so that I can render domain-specific message content without modifying library code.

#### Target Code Section

**File**: `angular-langgraph.md`
**Lines**: 631-732 (Chat component implementation - section before WorkflowVisualizer)

#### Acceptance Criteria

1. WHEN chat component documented THEN component SHALL accept message template: `messageTemplate = input.required<TemplateRef<MessageContext<TMessage>>>()`
2. WHEN message rendered THEN template context SHALL expose: `$implicit: TMessage`, `index: number`, `isFirst: boolean`, `isLast: boolean`
3. WHEN component provides slots THEN minimum 4 slots SHALL exist: `[lgChatHeader]`, `[lgChatInput]`, `[lgChatFooter]`, `[lgChatEmpty]`
4. WHEN messages typed THEN generic parameter SHALL enable type-safe messages: `messages = input.required<TMessage[]>()`
5. WHEN documentation shows examples THEN examples SHALL demonstrate 3+ message types (text, code, image)
6. WHEN message sent THEN output event SHALL be typed: `onSend = output<TMessage>()`
7. WHEN chat scrolling THEN auto-scroll behavior SHALL be configurable via input
8. WHEN typing indicator shown THEN indicator SHALL be customizable via content projection
9. WHEN empty state displayed THEN custom empty template SHALL be supported
10. WHEN migration guide created THEN transformation example SHALL show moving from hardcoded message rendering to template-based

---

### Requirement 4: Structural Directives Genericization

**User Story**: As a developer implementing custom workflow UI, I want structural directives for common workflow state patterns, so that I can write clean, readable templates for any workflow type.

#### Directive Requirements

1. **lgIfWorkflowState Directive**:

   ```typescript
   <div *lgIfWorkflowState="'running'; let state">
     <p>Current Agent: {{ state.currentAgent }}</p>
   </div>
   ```

2. **lgForAgents Directive**:

   ```typescript
   <div *lgForAgents="let agent; workflow: myWorkflow">
     <agent-card [agent]="agent" />
   </div>
   ```

3. **lgIfApprovalPending Directive**:
   ```typescript
   <approval-modal *lgIfApprovalPending="let approval">
     <custom-approval-ui [data]="approval" />
   </approval-modal>
   ```

#### Acceptance Criteria

1. WHEN directive documented THEN all directives SHALL use generic type parameters for type safety
2. WHEN lgIfWorkflowState used THEN directive SHALL accept workflow state enum values
3. WHEN lgForAgents used THEN directive SHALL source agents from WorkflowRegistry metadata
4. WHEN lgIfApprovalPending used THEN directive SHALL expose typed approval context
5. WHEN documentation shows examples THEN examples SHALL demonstrate 5+ common directive patterns
6. WHEN directive context exported THEN all context variables SHALL have TypeScript type definitions
7. WHEN directive state changes THEN Angular change detection SHALL trigger efficiently
8. WHEN directive selector defined THEN selectors SHALL follow `lg` prefix convention
9. WHEN directive used with signals THEN directives SHALL integrate with Angular signals API
10. WHEN migration guide created THEN transformation example SHALL show replacing manual state checks with directives

---

### Requirement 5: Component Integration Examples

**User Story**: As a developer learning the library, I want comprehensive integration examples showing components working together with WorkflowRegistry, so that I can understand complete workflow implementations.

#### Example Categories

1. **Content Generation Workflow Example**:

   - Workflow: Blog post generation (outline → draft → revision)
   - Components: Chat + WorkflowVisualizer + ApprovalModal
   - Demonstrates: Multi-stage workflow with HITL approvals

2. **Data Analysis Workflow Example**:

   - Workflow: CSV upload → analysis → visualization
   - Components: WorkflowVisualizer + custom chart components
   - Demonstrates: Streaming progress updates, custom agent display

3. **Code Review Workflow Example**:
   - Workflow: Repository analysis → issue detection → recommendations
   - Components: Chat + ApprovalModal with code diff rendering
   - Demonstrates: Custom metadata templates, typed approval decisions

#### Acceptance Criteria

1. WHEN examples documented THEN minimum 3 complete workflow integrations SHALL be shown
2. WHEN example shows workflow THEN WorkflowRegistry registration SHALL be demonstrated
3. WHEN example shows components THEN component integration with services SHALL be complete
4. WHEN example includes HITL THEN custom approval metadata template SHALL be shown
5. WHEN example demonstrates streaming THEN token update handling SHALL be included
6. WHEN example shows state THEN state snapshot subscription SHALL be demonstrated
7. WHEN example provides types THEN all workflow input/state/output types SHALL be defined
8. WHEN example includes providers THEN provider tree setup SHALL be shown
9. WHEN example demonstrates customization THEN content projection slots SHALL be used
10. WHEN example complete THEN example SHALL be copy-paste ready for developer use
11. WHEN documentation structured THEN examples SHALL progress from simple to complex
12. WHEN code shown THEN all imports SHALL use correct library paths: `@hive-academy/langgraph-angular`
13. WHEN example explained THEN inline comments SHALL clarify key integration points
14. WHEN example demonstrates features THEN minimum 8 library features SHALL be used per example
15. WHEN examples compared THEN each example SHALL showcase different component combinations

---

### Requirement 6: Template Context Type Definitions

**User Story**: As a developer using library components with TypeScript, I want complete type definitions for all template contexts, so that I get IDE autocomplete and type checking in custom templates.

#### Template Context Interfaces

1. **MessageContext<TMessage>**:

   ```typescript
   interface MessageContext<TMessage = Message> {
     $implicit: TMessage;
     index: number;
     count: number;
     isFirst: boolean;
     isLast: boolean;
     isEven: boolean;
     isOdd: boolean;
   }
   ```

2. **AgentContext<TAgent>**:

   ```typescript
   interface AgentContext<TAgent = AgentInfo> {
     $implicit: TAgent;
     index: number;
     isActive: boolean;
     isPending: boolean;
     isComplete: boolean;
     status: WorkflowStatus;
   }
   ```

3. **ApprovalMetadataContext<TMetadata>**:
   ```typescript
   interface ApprovalMetadataContext<TMetadata = any> {
     $implicit: TMetadata;
     approval: ApprovalRequest<TMetadata>;
     agentId: string;
     workflowId: string;
   }
   ```

#### Acceptance Criteria

1. WHEN template context defined THEN all interfaces SHALL be exported from library
2. WHEN context includes data THEN `$implicit` property SHALL enable template variable shorthand
3. WHEN context includes metadata THEN all auxiliary properties SHALL be typed
4. WHEN context used in template THEN TypeScript SHALL infer types correctly
5. WHEN documentation shows contexts THEN each interface SHALL include JSDoc with examples
6. WHEN context has generic THEN default type parameter SHALL be provided
7. WHEN context properties accessed THEN IDE autocomplete SHALL suggest all available properties
8. WHEN context type mismatch occurs THEN TypeScript compiler SHALL report error
9. WHEN context extends base THEN inheritance hierarchy SHALL be documented
10. WHEN migration guide created THEN transformation example SHALL show adding context types to templates

---

## Non-Functional Requirements

### Performance Requirements

- **Component Rendering**: Components SHALL render in <16ms (60fps) for 100 messages/agents
- **Change Detection**: Signal-based state changes SHALL trigger minimal component re-renders
- **Template Projection**: Content projection SHALL not degrade rendering performance by >5%
- **Memory Usage**: Component cleanup SHALL release all subscriptions and event listeners
- **Bundle Size**: Component code SHALL contribute <15KB (gzipped) to application bundle

### Type Safety Requirements

- **Generic Propagation**: All generic type parameters SHALL flow through component inputs/outputs
- **Template Type Checking**: All template contexts SHALL enable TypeScript template type checking
- **Type Inference**: Component usage SHALL infer types without explicit type annotations where possible
- **No 'any' Types**: Zero uses of `any` type in component implementations (use generics with defaults)
- **Strict Mode**: All component code SHALL compile under TypeScript strict mode

### Developer Experience Requirements

- **IDE Support**: Components SHALL provide IntelliSense autocomplete for all inputs/outputs
- **Error Messages**: Runtime errors SHALL include workflow ID and component context
- **Documentation Completeness**: Every component SHALL have minimum 5 usage examples
- **Copy-Paste Ready**: All examples SHALL run without modification after provider setup
- **Migration Clarity**: Migration guide SHALL provide before/after diff for every breaking change

### Documentation Quality Requirements

- **Code Examples**: Minimum 25 complete code examples across all components
- **Type Annotations**: All example code SHALL include explicit type annotations for clarity
- **Inline Comments**: Complex patterns SHALL include explanatory comments
- **Cross-References**: Component docs SHALL link to related services from TASK_2025_019
- **Consistency**: All components SHALL follow identical documentation structure pattern

---

## DevBrand Reference Elimination Checklist

### Hardcoded Strings to Remove

| Line | Current Code                                                              | Replacement Strategy                                          |
| ---- | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 220  | `POST /devbrand/execute`                                                  | **Already fixed in TASK_2025_019** - uses `workflow.endpoint` |
| 222  | `${this.config.apiUrl}/devbrand/execute`                                  | **Already fixed in TASK_2025_019**                            |
| 631  | `title = input('DevBrand Workflow')`                                      | `title = input.required<string>()`                            |
| 740  | `{ id: 'github-analyzer', name: 'GitHub Analyzer', status: 'pending' }`   | Remove - source from WorkflowRegistry metadata                |
| 741  | `{ id: 'brand-strategist', name: 'Brand Strategist', status: 'pending' }` | Remove - source from WorkflowRegistry metadata                |
| 742  | `{ id: 'content-creator', name: 'Content Creator', status: 'pending' }`   | Remove - source from WorkflowRegistry metadata                |
| 781  | `@case ('github-code-analyzer')`                                          | Remove entire switch - replace with content projection        |
| 785  | `@case ('personal-brand-strategist')`                                     | Remove - replace with content projection                      |
| 788  | `@case ('content-creator')`                                               | Remove - replace with content projection                      |
| 1142 | `// devbrand-workflow.component.ts`                                       | Move to examples package (TASK_2025_022)                      |
| 1148 | `selector: 'app-devbrand-workflow'`                                       | Move to examples package                                      |
| 1153 | `<h1>DevBrand AI Assistant</h1>`                                          | Move to examples package                                      |
| 1175 | `export class DevBrandWorkflowComponent`                                  | Move to examples package                                      |
| 1193 | `// devbrand-simple.component.ts`                                         | Move to examples package                                      |
| 1198 | `selector: 'app-devbrand-simple'`                                         | Move to examples package                                      |
| 1210 | `🚀 Start DevBrand Workflow`                                              | Move to examples package                                      |
| 1277 | `export class DevBrandSimpleComponent`                                    | Move to examples package                                      |

**Total DevBrand References**: 17 instances requiring removal/relocation

**Validation Method**: After rewrite, run: `grep -i "devbrand\|github-analyzer\|brand-strategist\|content-creator\|github-code-analyzer\|personal-brand-strategist" angular-langgraph.md` MUST return zero matches in library code sections.

---

## Content Projection Slot Specifications

### WorkflowVisualizer Component Slots

| Slot Selector         | Purpose            | Context Type              | Default Behavior    |
| --------------------- | ------------------ | ------------------------- | ------------------- |
| `[lgWorkflowHeader]`  | Custom header area | `WorkflowContext<TState>` | Shows workflow name |
| `[lgAgentDisplay]`    | Agent rendering    | `AgentContext<TAgent>`    | Generic agent card  |
| `[lgStatusIndicator]` | Status display     | `StatusContext`           | Status badge        |
| `[lgEventTimeline]`   | Event history      | `EventContext[]`          | Event list          |
| `[lgWorkflowFooter]`  | Custom footer area | `WorkflowContext<TState>` | Empty               |

### ApprovalModal Component Slots

| Slot Selector          | Purpose          | Context Type                         | Default Behavior       |
| ---------------------- | ---------------- | ------------------------------------ | ---------------------- |
| `[lgApprovalHeader]`   | Modal header     | `ApprovalContext<TMetadata>`         | Standard header        |
| `[lgApprovalMetadata]` | Metadata display | `ApprovalMetadataContext<TMetadata>` | JSON expansion panel   |
| `[lgApprovalActions]`  | Action buttons   | `ApprovalContext<TMetadata>`         | Approve/Reject buttons |
| `[lgApprovalFooter]`   | Modal footer     | `ApprovalContext<TMetadata>`         | Timeout indicator      |

### Chat Component Slots

| Slot Selector    | Purpose          | Context Type            | Default Behavior         |
| ---------------- | ---------------- | ----------------------- | ------------------------ |
| `[lgChatHeader]` | Chat header      | `ChatContext<TMessage>` | Empty                    |
| `[lgChatInput]`  | Input area       | `ChatInputContext`      | Text input + send button |
| `[lgChatFooter]` | Chat footer      | `ChatContext<TMessage>` | Empty                    |
| `[lgChatEmpty]`  | Empty state      | `ChatContext<TMessage>` | "No messages" text       |
| `[lgChatTyping]` | Typing indicator | `TypingContext`         | Animated dots            |

---

## Integration Requirements with TASK_2025_019

### Required Service Integrations

1. **WorkflowRegistry Integration**:

   - All components SHALL inject `WorkflowRegistry` service
   - Agent metadata SHALL be sourced from `workflow.metadata.agents`
   - Workflow display names SHALL come from `workflow.name`

2. **LangGraphConnectionService Integration**:

   - Components SHALL use connection service for state subscriptions
   - WebSocket reconnection SHALL be handled by service, not components
   - Component state SHALL update reactively via Angular signals

3. **Provider System Integration**:
   - All examples SHALL use `provideLangGraph()` for configuration
   - Multiple workflows SHALL be registered via `provideLangGraphWorkflow()`
   - Component examples SHALL demonstrate provider tree setup

### Type System Integration

1. **Generic Type Flow**:

   ```typescript
   WorkflowDefinition<TInput, TOutput>
     ↓ (flows into)
   LangGraphConnectionService.execute<TInput, TOutput>()
     ↓ (flows into)
   Component<TInput, TState, TOutput>
     ↓ (flows into)
   TemplateContext<TState>
   ```

2. **Event Type Compatibility**:
   - All 16 AG-UI event types from TASK_2025_019 SHALL be usable in components
   - Component event handlers SHALL accept typed events: `StateSnapshot<TState>`
   - Template contexts SHALL expose event type unions for filtering

---

## Success Metrics

### Quantitative Metrics

1. **Zero Hardcoded References**: 0 DevBrand-specific strings in component code
2. **Content Projection Coverage**: 100% of customizable UI areas exposed as slots
3. **Type Safety**: 100% of template contexts fully typed with generics
4. **Example Coverage**: Minimum 25 complete code examples
5. **Documentation Quality**: All components documented with 5+ usage examples each

### Qualitative Metrics

1. **Developer Can**: Use components for ANY workflow type without library modification
2. **Developer Can**: Customize ALL visual aspects via content projection
3. **Developer Can**: Get TypeScript autocomplete in ALL custom templates
4. **Developer Can**: Copy-paste examples and run with minimal setup
5. **Developer Can**: Migrate from DevBrand version using clear transformation guide

---

## Risk Analysis

### Technical Risks

#### Risk: Content Projection Complexity

- **Probability**: Medium
- **Impact**: High (Developer experience degradation)
- **Mitigation**:
  - Provide sensible default templates for all slots
  - Include "simple" and "advanced" examples for each component
  - Document common customization patterns with copy-paste snippets
- **Contingency**: Create helper components for common template patterns (e.g., `lg-default-agent-card`)

#### Risk: Type Inference Failures

- **Probability**: Medium
- **Impact**: Medium (Developer frustration with type annotations)
- **Mitigation**:
  - Use explicit type parameters in all example code
  - Provide helper types for common patterns: `ExtractWorkflowInput<T>`
  - Include troubleshooting section for type errors
- **Contingency**: Add simplified non-generic component variants with `any` types for rapid prototyping

#### Risk: Breaking Changes Impact

- **Probability**: High (Intentional complete rewrite)
- **Impact**: Critical (Existing implementations break)
- **Mitigation**:
  - Comprehensive migration guide with before/after diffs
  - Clear documentation of all breaking changes
  - Code transformation examples for every changed component
- **Contingency**: Provide automated migration script if manual migration proves too complex

### Documentation Risks

#### Risk: Examples Too Abstract

- **Probability**: Medium
- **Impact**: High (Developer adoption barrier)
- **Mitigation**:
  - Balance generic concepts with concrete, realistic examples
  - Use familiar domains: content generation, data analysis, code review
  - Pair every abstract pattern with working code snippet
- **Contingency**: Add "Quick Start Recipes" section with opinionated, copy-paste solutions

#### Risk: Migration Guide Insufficient

- **Probability**: Low
- **Impact**: Critical (Existing users cannot upgrade)
- **Mitigation**:
  - Document every single breaking change with transformation example
  - Provide side-by-side DevBrand before/after for all components
  - Include common migration pitfalls and solutions
- **Contingency**: Create video walkthrough of migration process

---

## Dependencies & Constraints

### External Dependencies

- **TASK_2025_019**: REQUIRED COMPLETE - WorkflowRegistry, provider functions, generic event types
- **TASK_2025_018**: Reference architecture for content projection patterns

### Internal Dependencies

- All component rewrites depend on TASK_2025_019 service patterns
- Migration guide depends on identifying all breaking changes
- Examples require complete component + service integration

### Constraints

- **Scope Limitation**: Documentation rewrite only - no implementation code changes
- **Feature Preservation**: All components (chat, workflow viz, HITL, etc.) must remain functional
- **Backward Compatibility**: ZERO backward compatibility - complete breaking change
- **Content Projection**: ALL customizable UI areas must use content projection, no configuration-based switching

### Assumptions

- WorkflowRegistry pattern from TASK_2025_019 is sufficient for component needs
- Content projection provides adequate customization flexibility
- TypeScript generics enable type-safe template contexts
- Developers are willing to migrate to content-projection-based approach

---

## Quality Gates

Before delegating to frontend-developer, verify:

- [x] All requirements follow SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound)
- [x] Acceptance criteria use WHEN/THEN/SHALL format (30+ criteria defined)
- [x] Dependencies on TASK_2025_019 clearly documented
- [x] DevBrand elimination checklist complete (17 references identified)
- [x] Content projection slots specified for all components
- [x] Template context type definitions provided
- [x] Integration examples scoped (minimum 25 examples)
- [x] Non-functional requirements specified (performance, type safety, DX)
- [x] Success metrics defined (quantitative + qualitative)
- [x] Risk assessment with mitigation strategies complete
- [x] Migration guide requirements documented

---

## Delegation Recommendation

**Recommended Agent**: frontend-developer

**Rationale**:

- **Skip software-architect**: Existing patterns from TASK_2025_018 (content projection) and TASK_2025_019 (WorkflowRegistry) provide complete architectural foundation
- **Implementation-Focused Task**: Applying approved patterns to component documentation
- **No Novel Patterns Required**: All content projection slots, template contexts, and registry integration patterns already established

**Next Steps**:

1. frontend-developer reads this requirements document
2. frontend-developer reads TASK_2025_019 output (angular-langgraph-services-REWRITE.md)
3. frontend-developer rewrites component sections with content projection patterns
4. frontend-developer creates 25+ integration examples
5. frontend-developer generates comprehensive migration guide
6. frontend-developer creates validation report against 30+ acceptance criteria

**Success Criteria for Delegation**:

- All 17 DevBrand references eliminated or moved to examples
- All components converted to content projection architecture
- All template contexts fully typed with generics
- Minimum 25 complete integration examples
- Migration guide with before/after for all components

---

## Future Recommendations

### Immediate Actions (Post-TASK_2025_020)

1. **TASK_2025_021**: Genericize composables and providers
2. **TASK_2025_022**: Create examples package with DevBrand as reference implementation
3. **TASK_2025_023**: Final documentation consolidation and validation

### Technical Debt

None introduced - this task eliminates technical debt by removing hardcoded implementations.

### Enhancement Opportunities

1. **Component Generator CLI**: Tool to scaffold custom workflow components with content projection
2. **Storybook Integration**: Interactive component playground for testing customization
3. **Component Theme System**: CSS custom properties for advanced styling customization
4. **Advanced Directives**: Additional structural directives for common workflow patterns (e.g., `*lgForEvents`, `*lgIfAgent`)
