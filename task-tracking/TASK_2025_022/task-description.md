# Requirements Document - TASK_2025_022

## Introduction

### Business Context

TASK_2025_022 transitions from documentation to **actual implementation** by creating 25+ working examples in the `apps/dev-brand-ui/` application that showcase the generic angular-langgraph library capabilities. This is a hybrid task combining implementation work with documentation patterns.

**Critical Scope Change**: This task creates **ACTUAL WORKING COMPONENTS** in the dev-brand-ui application, NOT just documentation. Every example is a runnable TypeScript implementation demonstrating library features.

**Value Proposition**:

- **Live Demonstrations**: Developers see working examples instead of abstract documentation
- **Copy-Paste Ready**: Complete implementations ready for adaptation
- **Best Practices Showcase**: Examples demonstrate proper usage patterns
- **Learning Resource**: Progressive examples from simple to advanced use cases
- **Testing Ground**: Examples serve as integration tests for library capabilities
- **Marketing Material**: Live examples showcase library capabilities to potential users

### Dependencies

**Required Predecessors** (ALL COMPLETED):

- **TASK_2025_019**: WorkflowRegistry, LangGraphConnectionService, Provider functions, 16 AG-UI event types
- **TASK_2025_020**: Components (WorkflowVisualizer, ApprovalModal, Chat), Directives, Template contexts
- **TASK_2025_021**: Composables (useLangGraphWorkflow, useLangGraphChat, useLangGraphApproval), RxJS operators, Type guards

**Critical Integration Requirements**:

- Examples MUST use generic library APIs (WorkflowRegistry, provideLangGraphWorkflow)
- Examples MUST demonstrate content projection patterns from TASK_2025_020
- Examples MUST use composables and RxJS operators from TASK_2025_021
- Examples MUST be 100% generic - NO DevBrand-specific logic in examples

### Scope

Create **ACTUAL WORKING IMPLEMENTATIONS** of 25+ example applications organized in 5 categories:

1. **Basic Integration Examples** (5 examples)
2. **Content Generation Examples** (5 examples)
3. **Data Analysis Examples** (5 examples)
4. **Code Review Examples** (5 examples)
5. **Advanced Patterns Examples** (5 examples)

**Location**: `apps/dev-brand-ui/src/app/examples/`

**Estimated Implementation Output**:

- ~2,000 lines of TypeScript component code
- ~500 lines of workflow definitions
- ~800 lines of mock data and utilities
- ~500 lines of routing and navigation
- **Total**: ~3,800 lines of production code

**Time Estimate**: L effort (10-12 hours) - Full implementation task

---

## Requirements

### Requirement 1: Directory Structure and Organization

**User Story**: As a developer exploring examples, I want a clear, logical directory structure that separates examples by category, so that I can quickly find relevant examples for my use case.

#### Acceptance Criteria

1. WHEN developer opens examples directory THEN structure SHALL follow category-based organization with 5 top-level folders
2. WHEN example implemented THEN each example SHALL have dedicated folder containing component, workflow, spec, and README
3. WHEN shared utilities needed THEN shared folder SHALL contain reusable mock data, workflow definitions, and helper functions
4. WHEN navigation configured THEN examples SHALL be accessible via routes: `/examples/:category/:example-name`
5. WHEN developer lists examples THEN folder naming SHALL use kebab-case convention
6. WHEN example contains multiple files THEN files SHALL follow naming pattern: `example-name.component.ts`, `example-name.workflow.ts`
7. WHEN developer views example THEN README.md SHALL exist explaining purpose, features demonstrated, and usage
8. WHEN documentation references examples THEN absolute path SHALL be used: `apps/dev-brand-ui/src/app/examples/`

#### Technical Specifications

**Directory Structure**:

```
apps/dev-brand-ui/src/app/examples/
├── basic/
│   ├── simple-execution/
│   │   ├── simple-execution.component.ts
│   │   ├── simple-execution.workflow.ts
│   │   ├── simple-execution.component.spec.ts
│   │   └── README.md
│   ├── custom-rendering/
│   ├── approval-handling/
│   ├── chat-interface/
│   └── complete-lifecycle/
├── content-generation/
│   ├── blog-post-generator/
│   ├── social-media-creator/
│   ├── email-template-generator/
│   ├── product-description-writer/
│   └── marketing-copy-generator/
├── data-analysis/
│   ├── csv-analyzer/
│   ├── json-transformer/
│   ├── statistical-analysis/
│   ├── data-quality-validator/
│   └── report-generator/
├── code-review/
│   ├── security-scanner/
│   ├── code-style-enforcer/
│   ├── performance-optimizer/
│   ├── dependency-auditor/
│   └── documentation-coverage/
├── advanced/
│   ├── multi-step-approvals/
│   ├── parallel-workflows/
│   ├── workflow-cancellation/
│   ├── error-recovery/
│   └── custom-event-pipeline/
└── shared/
    ├── workflows/
    │   ├── index.ts (exports all workflow definitions)
    │   ├── content-workflows.ts
    │   ├── data-workflows.ts
    │   └── code-workflows.ts
    ├── mock-data/
    │   ├── index.ts
    │   ├── sample-documents.ts
    │   ├── sample-datasets.ts
    │   └── sample-code.ts
    └── utilities/
        ├── index.ts
        ├── workflow-helpers.ts
        └── test-helpers.ts
```

**File Count**:

- 25 example components (25 × 4 files = 100 files)
- Shared utilities (~10 files)
- **Total**: ~110 TypeScript/Markdown files

---

### Requirement 2: Basic Integration Examples (Category 1)

**User Story**: As a developer new to the library, I want simple examples demonstrating core integration patterns, so that I can understand fundamental concepts before tackling advanced use cases.

#### Example 1.1: Simple Workflow Execution

**Purpose**: Demonstrate minimal workflow setup and execution

**Features Demonstrated**:

- WorkflowRegistry registration
- Component with single workflow execution
- State tracking with signals
- Result display

**Acceptance Criteria**:

1. WHEN component rendered THEN single "Execute" button SHALL be visible
2. WHEN button clicked THEN workflow SHALL execute using WorkflowRegistry lookup
3. WHEN workflow runs THEN loading state SHALL display via signal-based reactivity
4. WHEN workflow completes THEN result SHALL display in template
5. WHEN error occurs THEN error message SHALL display with retry button
6. WHEN component uses composable THEN useLangGraphWorkflow<TInput, TState, TOutput> SHALL be demonstrated
7. WHEN workflow registered THEN provideLangGraphWorkflow SHALL be used in route providers
8. WHEN developer reads README THEN it SHALL explain WorkflowRegistry pattern and signal reactivity

**Implementation Specifications**:

```typescript
// simple-execution.component.ts (~40 lines)
@Component({
  selector: 'app-simple-execution',
  standalone: true,
  template: `
    <div class="example-container">
      <h2>Simple Workflow Execution</h2>

      @if (loading()) {
      <p>Executing workflow...</p>
      } @if (result()) {
      <div class="result">
        <h3>Result:</h3>
        <pre>{{ result() | json }}</pre>
      </div>
      } @if (error()) {
      <div class="error">
        <p>Error: {{ error() }}</p>
        <button (click)="retry()">Retry</button>
      </div>
      }

      <button (click)="execute()" [disabled]="loading()">Execute Workflow</button>
    </div>
  `,
})
export class SimpleExecutionComponent {
  private workflow = useLangGraphWorkflow<SimpleInput, SimpleState, SimpleOutput>('simple-example');

  loading = computed(() => this.workflow.state()?.status === 'running');
  result = this.workflow.result;
  error = this.workflow.error;

  execute() {
    this.workflow.execute({ message: 'Hello from simple example' });
  }

  retry() {
    this.execute();
  }
}
```

```typescript
// simple-execution.workflow.ts (~20 lines)
export interface SimpleInput {
  message: string;
}

export interface SimpleState {
  status: 'idle' | 'running' | 'complete';
  currentStep: string;
}

export interface SimpleOutput {
  processedMessage: string;
  timestamp: string;
}

export const SIMPLE_WORKFLOW: WorkflowDefinition<SimpleInput, SimpleOutput> = {
  id: 'simple-example',
  name: 'Simple Example Workflow',
  description: 'Demonstrates basic workflow execution',
  endpoint: '/workflows/simple-example/execute',
  inputSchema: z.object({
    message: z.string(),
  }),
  metadata: {
    category: 'basic',
    tags: ['simple', 'execution', 'getting-started'],
  },
};
```

#### Example 1.2: Custom Agent Rendering

**Purpose**: Demonstrate content projection for custom agent display

**Features Demonstrated**:

- WorkflowVisualizer component usage
- Content projection slots (lgAgentDisplay)
- Custom agent card templates
- Template context typing

**Acceptance Criteria**:

1. WHEN component renders THEN WorkflowVisualizer SHALL display with custom agent cards
2. WHEN agent state changes THEN custom template SHALL update reactively
3. WHEN template uses context THEN AgentContext<TAgent> SHALL provide type safety
4. WHEN developer inspects template THEN custom styling SHALL demonstrate visual customization
5. WHEN workflow executes THEN agent progress SHALL update in custom cards
6. WHEN example demonstrates slots THEN minimum 2 content projection slots SHALL be used
7. WHEN component registered THEN agents SHALL be sourced from WorkflowRegistry metadata
8. WHEN developer reads README THEN content projection pattern SHALL be explained with diagrams

**Implementation Specifications**: (~50 lines component + ~30 lines workflow)

#### Example 1.3: Approval Handling (HITL)

**Purpose**: Demonstrate human-in-the-loop approval workflow

**Features Demonstrated**:

- ApprovalModal component integration
- useLangGraphApproval composable
- Custom approval metadata templates
- Approval decision handling

**Acceptance Criteria**:

1. WHEN workflow requires approval THEN ApprovalModal SHALL display automatically
2. WHEN approval shown THEN custom metadata template SHALL render approval-specific data
3. WHEN user approves THEN approval decision SHALL send to backend with feedback
4. WHEN user rejects THEN workflow SHALL handle rejection gracefully
5. WHEN timeout occurs THEN timeout indicator SHALL display countdown
6. WHEN composable used THEN useLangGraphApproval<TApprovalData> SHALL manage approval state
7. WHEN approval resolved THEN workflow SHALL resume execution
8. WHEN developer reads README THEN HITL pattern SHALL be explained with sequence diagram

**Implementation Specifications**: (~60 lines component + ~40 lines workflow + ~20 lines approval metadata)

#### Example 1.4: Chat Interface

**Purpose**: Demonstrate chat-based workflow interaction

**Features Demonstrated**:

- Chat component usage
- useLangGraphChat composable
- Message streaming with token updates
- Chat history management

**Acceptance Criteria**:

1. WHEN component renders THEN chat interface SHALL display with input area
2. WHEN user sends message THEN message SHALL add to history immediately (optimistic update)
3. WHEN workflow responds THEN tokens SHALL stream into chat with bufferWorkflowTokens operator
4. WHEN streaming THEN typing indicator SHALL display during response generation
5. WHEN composable used THEN useLangGraphChat<TMessage> SHALL manage chat state
6. WHEN messages displayed THEN custom message template SHALL render message content
7. WHEN chat scrolls THEN auto-scroll SHALL focus latest message
8. WHEN developer reads README THEN streaming pattern SHALL be explained with data flow diagram

**Implementation Specifications**: (~70 lines component + ~40 lines workflow + ~30 lines message types)

#### Example 1.5: Complete Lifecycle

**Purpose**: Demonstrate full workflow lifecycle with all events

**Features Demonstrated**:

- All 16 AG-UI event types
- Event timeline visualization
- State snapshot tracking
- Comprehensive error handling

**Acceptance Criteria**:

1. WHEN workflow executes THEN event timeline SHALL display all events in order
2. WHEN state changes THEN state snapshot SHALL update with diff highlighting
3. WHEN tool calls occur THEN tool events SHALL display with arguments and results
4. WHEN error happens THEN error event SHALL display with stack trace
5. WHEN workflow completes THEN completion event SHALL show final output
6. WHEN events filtered THEN filterWorkflowEvents operator SHALL enable type-safe filtering
7. WHEN developer inspects events THEN all 16 event types SHALL be demonstrated
8. WHEN developer reads README THEN event lifecycle SHALL be explained with state machine diagram

**Implementation Specifications**: (~80 lines component + ~50 lines workflow + ~40 lines event display)

---

### Requirement 3: Content Generation Examples (Category 2)

**User Story**: As a developer building content generation applications, I want examples demonstrating various content creation workflows, so that I can adapt patterns for my specific content needs.

#### Example 2.1: Blog Post Generator

**Purpose**: Multi-step content generation with outline → draft → revision

**Features Demonstrated**:

- Multi-agent workflow (Outliner → Writer → Editor)
- Progressive state updates
- HITL approval after each stage
- Content preview rendering

**Acceptance Criteria**:

1. WHEN workflow starts THEN outline stage SHALL generate post structure
2. WHEN outline approved THEN draft stage SHALL generate full content
3. WHEN draft approved THEN revision stage SHALL polish final version
4. WHEN each stage completes THEN preview SHALL render formatted content
5. WHEN user rejects THEN workflow SHALL return to previous stage with feedback
6. WHEN component uses visualization THEN WorkflowVisualizer SHALL show 3 agent cards
7. WHEN approval modal displays THEN custom template SHALL show content diff
8. WHEN developer reads README THEN multi-stage pattern SHALL be explained

**Implementation Specifications**: (~90 lines component + ~60 lines workflow + ~40 lines preview)

#### Example 2.2: Social Media Creator

**Purpose**: Platform-specific content generation

**Features Demonstrated**:

- Parallel content generation for multiple platforms
- Platform-specific formatting rules
- Character limit validation
- Preview for each platform

**Acceptance Criteria**:

1. WHEN workflow executes THEN content SHALL generate for LinkedIn, Twitter, Facebook simultaneously
2. WHEN platform content generated THEN character limits SHALL be enforced
3. WHEN preview displays THEN platform-specific styling SHALL render
4. WHEN validation fails THEN error SHALL show with suggestions
5. WHEN parallel workflows used THEN advanced patterns SHALL demonstrate concurrency
6. WHEN component displays results THEN tabs SHALL switch between platforms
7. WHEN developer inspects code THEN parallel workflow pattern SHALL be demonstrated
8. WHEN developer reads README THEN parallel execution SHALL be explained

**Implementation Specifications**: (~80 lines component + ~70 lines workflow + ~50 lines platform configs)

#### Example 2.3-2.5: Additional Content Examples

**2.3 Email Template Generator**: (~70 lines total)

- Template selection workflow
- Variable substitution
- Preview rendering

**2.4 Product Description Writer**: (~75 lines total)

- Feature extraction
- Benefit generation
- SEO optimization

**2.5 Marketing Copy Generator**: (~70 lines total)

- Tone adjustment
- CTA generation
- A/B variant creation

---

### Requirement 4: Data Analysis Examples (Category 3)

**User Story**: As a developer building data analysis applications, I want examples demonstrating data processing workflows, so that I can understand how to handle various data formats and analysis patterns.

#### Example 3.1: CSV Data Analyzer

**Purpose**: Upload, parse, and analyze CSV data

**Features Demonstrated**:

- File upload handling
- Streaming data processing
- Statistical analysis display
- Chart visualization integration

**Acceptance Criteria**:

1. WHEN user uploads CSV THEN file SHALL parse and validate structure
2. WHEN parsing completes THEN preview SHALL show first 10 rows
3. WHEN analysis runs THEN statistics SHALL calculate (mean, median, mode, stddev)
4. WHEN workflow streams results THEN progress indicator SHALL update
5. WHEN analysis completes THEN chart SHALL visualize key metrics
6. WHEN errors occur THEN validation errors SHALL display with row numbers
7. WHEN component uses streaming THEN useLangGraphStreaming SHALL demonstrate token buffering
8. WHEN developer reads README THEN data streaming pattern SHALL be explained

**Implementation Specifications**: (~100 lines component + ~60 lines workflow + ~40 lines chart integration)

#### Example 3.2: JSON Transformer

**Purpose**: Transform JSON structure with schema validation

**Features Demonstrated**:

- Schema-based transformation
- Zod validation integration
- Before/after comparison
- Transformation rule display

**Acceptance Criteria**:

1. WHEN input JSON provided THEN schema validation SHALL occur
2. WHEN validation passes THEN transformation SHALL apply rules
3. WHEN transformation completes THEN before/after SHALL display side-by-side
4. WHEN schema invalid THEN validation errors SHALL highlight specific fields
5. WHEN transformation rules shown THEN visual mapping SHALL illustrate transformations
6. WHEN component uses validation THEN validateWorkflowInput utility SHALL be demonstrated
7. WHEN developer inspects code THEN Zod schema integration SHALL be shown
8. WHEN developer reads README THEN schema validation pattern SHALL be explained

**Implementation Specifications**: (~85 lines component + ~55 lines workflow + ~35 lines schema)

#### Example 3.3-3.5: Additional Data Examples

**3.3 Statistical Analysis**: (~80 lines total)

- Correlation analysis
- Distribution visualization
- Outlier detection

**3.4 Data Quality Validator**: (~75 lines total)

- Missing value detection
- Data type validation
- Quality score calculation

**3.5 Report Generator**: (~90 lines total)

- Template-based report generation
- Data aggregation
- PDF export integration

---

### Requirement 5: Code Review Examples (Category 4)

**User Story**: As a developer building code analysis tools, I want examples demonstrating code review workflows, so that I can implement automated code quality checks.

#### Example 4.1: Security Scanner

**Purpose**: Scan code for security vulnerabilities

**Features Demonstrated**:

- Code parsing and AST analysis
- Security rule evaluation
- Vulnerability severity classification
- Remediation suggestion display

**Acceptance Criteria**:

1. WHEN code uploaded THEN AST SHALL parse for analysis
2. WHEN scanning runs THEN security rules SHALL evaluate against code
3. WHEN vulnerabilities found THEN results SHALL classify by severity (critical, high, medium, low)
4. WHEN vulnerability displayed THEN code context SHALL highlight problematic lines
5. WHEN remediation available THEN suggestion SHALL provide fix examples
6. WHEN workflow executes THEN progress SHALL show rules being evaluated
7. WHEN component uses visualization THEN custom agent card SHALL show scanning progress
8. WHEN developer reads README THEN security scanning pattern SHALL be explained

**Implementation Specifications**: (~95 lines component + ~70 lines workflow + ~45 lines vulnerability display)

#### Example 4.2: Code Style Enforcer

**Purpose**: Check code against style guidelines

**Features Demonstrated**:

- Linting rule application
- Auto-fix suggestions
- Style violation grouping
- Configuration customization

**Acceptance Criteria**:

1. WHEN code submitted THEN style rules SHALL evaluate
2. WHEN violations found THEN violations SHALL group by category
3. WHEN auto-fix available THEN preview SHALL show proposed changes
4. WHEN configuration changed THEN rules SHALL update dynamically
5. WHEN workflow runs THEN violation count SHALL update in real-time
6. WHEN component displays results THEN severity filters SHALL enable filtering
7. WHEN developer inspects code THEN RxJS operators SHALL demonstrate event filtering
8. WHEN developer reads README THEN linting pattern SHALL be explained

**Implementation Specifications**: (~85 lines component + ~60 lines workflow + ~40 lines rule config)

#### Example 4.3-4.5: Additional Code Review Examples

**4.3 Performance Optimizer**: (~85 lines total)

- Performance bottleneck detection
- Optimization suggestions
- Benchmark comparison

**4.4 Dependency Auditor**: (~80 lines total)

- Dependency vulnerability check
- License compliance verification
- Update recommendation

**4.5 Documentation Coverage**: (~75 lines total)

- JSDoc coverage analysis
- Missing documentation detection
- Documentation quality score

---

### Requirement 6: Advanced Patterns Examples (Category 5)

**User Story**: As an advanced developer, I want examples demonstrating complex workflow patterns, so that I can implement sophisticated multi-step and error-handling scenarios.

#### Example 6.1: Multi-Step Approvals

**Purpose**: Workflow with multiple approval checkpoints

**Features Demonstrated**:

- Sequential approval gates
- Approval chain visualization
- Approval history tracking
- Role-based approval routing

**Acceptance Criteria**:

1. WHEN workflow executes THEN multiple approval points SHALL trigger in sequence
2. WHEN approval pending THEN approval chain SHALL visualize progress
3. WHEN approval granted THEN workflow SHALL proceed to next stage
4. WHEN approval denied THEN workflow SHALL route based on rejection reason
5. WHEN history tracked THEN all approval decisions SHALL log with timestamps
6. WHEN component uses HITL THEN useLangGraphApproval SHALL manage multiple approvals
7. WHEN visualization shown THEN approval status SHALL indicate in workflow visualizer
8. WHEN developer reads README THEN multi-step HITL pattern SHALL be explained

**Implementation Specifications**: (~95 lines component + ~80 lines workflow + ~50 lines approval chain)

#### Example 6.2: Parallel Workflows

**Purpose**: Execute multiple workflows concurrently

**Features Demonstrated**:

- Concurrent workflow execution
- Progress aggregation across workflows
- Result synchronization
- Error isolation between workflows

**Acceptance Criteria**:

1. WHEN parallel execution starts THEN multiple workflows SHALL run simultaneously
2. WHEN workflows run THEN progress SHALL aggregate across all executions
3. WHEN workflow completes THEN results SHALL sync without blocking others
4. WHEN error occurs in one THEN other workflows SHALL continue unaffected
5. WHEN component displays state THEN parallel visualizations SHALL show all workflows
6. WHEN composition used THEN advanced patterns SHALL demonstrate concurrency
7. WHEN developer inspects code THEN RxJS merge/forkJoin SHALL be used
8. WHEN developer reads README THEN concurrency pattern SHALL be explained

**Implementation Specifications**: (~100 lines component + ~70 lines workflow + ~55 lines aggregation)

#### Example 6.3-6.5: Additional Advanced Examples

**6.3 Workflow Cancellation**: (~85 lines total)

- Graceful cancellation handling
- Cleanup operations
- Cancellation reason tracking

**6.4 Error Recovery**: (~90 lines total)

- Automatic retry with exponential backoff
- Circuit breaker pattern
- Fallback workflow execution

**6.5 Custom Event Pipeline**: (~95 lines total)

- Custom event type creation
- Event transformation pipeline
- Event filtering and routing

---

### Requirement 7: Shared Utilities and Mock Data

**User Story**: As a developer exploring examples, I want shared utilities and realistic mock data, so that examples are self-contained and don't require external services.

#### Acceptance Criteria

1. WHEN example uses workflow THEN workflow definition SHALL be importable from shared/workflows
2. WHEN mock data needed THEN realistic sample data SHALL be available in shared/mock-data
3. WHEN utility functions needed THEN helper functions SHALL exist in shared/utilities
4. WHEN developer imports utilities THEN barrel exports (index.ts) SHALL provide clean imports
5. WHEN mock data generated THEN data SHALL be type-safe and match workflow input schemas
6. WHEN workflow helpers used THEN functions SHALL demonstrate common patterns (retry, timeout, validation)
7. WHEN test helpers needed THEN provideLangGraphTesting utilities SHALL be available
8. WHEN developer reads README THEN shared utilities SHALL be documented with usage examples

#### Technical Specifications

**Shared Workflows** (~200 lines):

```typescript
// shared/workflows/content-workflows.ts
export const BLOG_POST_WORKFLOW: WorkflowDefinition<BlogInput, BlogOutput> = {
  id: 'blog-post-generator',
  name: 'Blog Post Generator',
  description: 'Multi-stage blog post creation workflow',
  endpoint: '/workflows/blog-post/execute',
  inputSchema: blogInputSchema,
  metadata: {
    agents: [
      { id: 'outliner', name: 'Content Outliner', role: 'planning' },
      { id: 'writer', name: 'Draft Writer', role: 'generation' },
      { id: 'editor', name: 'Content Editor', role: 'revision' },
    ],
    category: 'content-generation',
    tags: ['blog', 'content', 'multi-stage'],
  },
};

// Export all content generation workflows
export const CONTENT_WORKFLOWS = [
  BLOG_POST_WORKFLOW,
  SOCIAL_MEDIA_WORKFLOW,
  EMAIL_TEMPLATE_WORKFLOW,
  PRODUCT_DESCRIPTION_WORKFLOW,
  MARKETING_COPY_WORKFLOW,
];
```

**Mock Data** (~150 lines):

```typescript
// shared/mock-data/sample-documents.ts
export const SAMPLE_BLOG_TOPICS = [
  {
    topic: 'Getting Started with Angular Signals',
    target_audience: 'Angular developers',
    tone: 'educational',
    length: 'medium',
  },
  // ... more samples
];

export const SAMPLE_CSV_DATA = `
name,age,department,salary
John Doe,32,Engineering,95000
Jane Smith,28,Marketing,78000
...
`;

export const SAMPLE_CODE_SNIPPETS = {
  typescript: `
function unsafeFunction(data: any): any {
  // Security vulnerability: using 'any' type
  return eval(data); // Critical: eval usage
}
  `,
  // ... more samples
};
```

**Workflow Helpers** (~100 lines):

```typescript
// shared/utilities/workflow-helpers.ts
export function withRetry<T>(
  execute: () => Observable<T>,
  options: RetryOptions = {}
): Observable<T> {
  return execute().pipe(
    retryOnWorkflowError({
      maxAttempts: options.maxAttempts ?? 3,
      backoffMs: options.backoffMs ?? 1000,
    })
  );
}

export function withTimeout<T>(execute: () => Observable<T>, timeoutMs: number): Observable<T> {
  return execute().pipe(
    timeout(timeoutMs),
    catchWorkflowError((err) => {
      if (err.name === 'TimeoutError') {
        return throwError(() => new Error('Workflow execution timed out'));
      }
      return throwError(() => err);
    })
  );
}

export function createMockWorkflowResult<T>(data: T, delay: number = 1000): Observable<T> {
  return of(data).pipe(delay(delay));
}
```

---

### Requirement 8: Navigation and Routing

**User Story**: As a developer exploring examples, I want intuitive navigation that lets me browse examples by category and view individual examples, so that I can easily discover relevant patterns.

#### Acceptance Criteria

1. WHEN user navigates to /examples THEN landing page SHALL display 5 categories with descriptions
2. WHEN category clicked THEN category page SHALL list all examples in that category
3. WHEN example clicked THEN example SHALL load with side-by-side code/demo view
4. WHEN route configured THEN lazy loading SHALL be used for all example components
5. WHEN navigation displayed THEN breadcrumbs SHALL show current location
6. WHEN search available THEN examples SHALL be searchable by tag/keyword
7. WHEN example loaded THEN README content SHALL display alongside demo
8. WHEN developer inspects routing THEN provideLangGraphWorkflow SHALL be demonstrated in route providers

#### Technical Specifications

**Routing Configuration** (~80 lines):

```typescript
// examples.routes.ts
export const EXAMPLES_ROUTES: Routes = [
  {
    path: 'examples',
    loadComponent: () => import('./examples-landing.component'),
    title: 'Examples - Angular LangGraph Library',
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./examples-home.component'),
      },
      {
        path: 'basic',
        loadChildren: () => import('./basic/basic.routes'),
        providers: [
          // Register all basic example workflows
          provideLangGraphWorkflow(SIMPLE_WORKFLOW),
          provideLangGraphWorkflow(CUSTOM_RENDERING_WORKFLOW),
          // ... more workflows
        ],
      },
      {
        path: 'content-generation',
        loadChildren: () => import('./content-generation/content.routes'),
        providers: [
          provideLangGraphWorkflow(BLOG_POST_WORKFLOW),
          provideLangGraphWorkflow(SOCIAL_MEDIA_WORKFLOW),
          // ... more workflows
        ],
      },
      // ... other categories
    ],
  },
];
```

**Navigation Component** (~60 lines):

```typescript
// examples-navigation.component.ts
@Component({
  selector: 'app-examples-navigation',
  template: `
    <nav class="examples-nav">
      <div class="breadcrumbs">
        <a routerLink="/examples">Examples</a>
        @if (currentCategory()) {
        <span> / </span>
        <a [routerLink]="['/examples', currentCategory()]">
          {{ currentCategory() }}
        </a>
        } @if (currentExample()) {
        <span> / </span>
        <span>{{ currentExample() }}</span>
        }
      </div>

      <div class="search">
        <input [(ngModel)]="searchTerm" placeholder="Search examples..." (input)="onSearch()" />
      </div>

      <div class="categories">
        @for (category of categories; track category.id) {
        <a
          [routerLink]="['/examples', category.id]"
          routerLinkActive="active"
          class="category-link"
        >
          {{ category.name }} ({{ category.count }})
        </a>
        }
      </div>
    </nav>
  `,
})
export class ExamplesNavigationComponent {
  searchTerm = signal('');
  currentCategory = signal<string | null>(null);
  currentExample = signal<string | null>(null);

  categories = [
    { id: 'basic', name: 'Basic Integration', count: 5 },
    { id: 'content-generation', name: 'Content Generation', count: 5 },
    { id: 'data-analysis', name: 'Data Analysis', count: 5 },
    { id: 'code-review', name: 'Code Review', count: 5 },
    { id: 'advanced', name: 'Advanced Patterns', count: 5 },
  ];

  onSearch() {
    // Implement search logic
  }
}
```

---

### Requirement 9: Testing Infrastructure

**User Story**: As a developer maintaining examples, I want comprehensive test coverage for all examples, so that examples remain working as the library evolves.

#### Acceptance Criteria

1. WHEN example created THEN unit test spec file SHALL exist testing component logic
2. WHEN workflow executed THEN test SHALL mock workflow execution using provideLangGraphTesting
3. WHEN composable used THEN test SHALL verify composable integration
4. WHEN component renders THEN test SHALL verify template rendering
5. WHEN error handling tested THEN test SHALL simulate error scenarios
6. WHEN integration tested THEN test SHALL verify workflow registry integration
7. WHEN test utilities used THEN provideLangGraphTesting SHALL provide mock services
8. WHEN developer reads spec THEN test SHALL serve as additional usage example

#### Technical Specifications

**Test Template** (~50 lines per example):

```typescript
// simple-execution.component.spec.ts
describe('SimpleExecutionComponent', () => {
  let component: ComponentFixture<SimpleExecutionComponent>;
  let workflowRegistry: WorkflowRegistry;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleExecutionComponent],
      providers: [
        provideLangGraphTesting({
          workflows: [SIMPLE_WORKFLOW],
          mockResults: {
            'simple-example': {
              processedMessage: 'Mock result',
              timestamp: new Date().toISOString(),
            },
          },
        }),
      ],
    }).compileComponents();

    component = TestBed.createComponent(SimpleExecutionComponent);
    workflowRegistry = TestBed.inject(WorkflowRegistry);
  });

  it('should execute workflow when button clicked', fakeAsync(() => {
    const executeButton = component.nativeElement.querySelector('button');
    executeButton.click();

    tick(1000);

    expect(component.componentInstance.loading()).toBe(false);
    expect(component.componentInstance.result()).toBeTruthy();
    expect(component.componentInstance.result().processedMessage).toBe('Mock result');
  }));

  it('should handle errors gracefully', fakeAsync(() => {
    // Mock error scenario
    const mockError = new Error('Workflow failed');
    jest.spyOn(workflowRegistry, 'get').mockImplementation(() => {
      throw mockError;
    });

    const executeButton = component.nativeElement.querySelector('button');
    executeButton.click();

    tick(1000);

    expect(component.componentInstance.error()).toBeTruthy();
    expect(component.componentInstance.error()).toContain('Workflow failed');
  }));
});
```

---

## Non-Functional Requirements

### Performance Requirements

1. **Component Load Time**:

   - Example component lazy load: < 200ms
   - Workflow execution simulation: < 1s with mock data
   - Navigation between examples: < 100ms

2. **Bundle Size**:

   - Each example category bundle: < 50KB gzipped
   - Shared utilities bundle: < 15KB gzipped
   - Mock data bundle: < 10KB gzipped

3. **Runtime Performance**:
   - Example component render: < 16ms (60fps)
   - Workflow event processing: < 5ms per event
   - State update propagation: < 10ms

### Code Quality Requirements

1. **Type Safety**:

   - Zero 'any' types in example code
   - All workflow definitions fully typed
   - All mock data type-safe

2. **Code Style**:

   - ESLint compliant (no warnings)
   - Prettier formatted
   - Consistent naming conventions

3. **Test Coverage**:
   - Minimum 80% coverage per example
   - All error paths tested
   - Integration with library tested

### Documentation Quality Requirements

1. **README Standards**:

   - Each example has README.md
   - README includes: Purpose, Features, Usage, Code Explanation
   - README has diagram/screenshot where applicable

2. **Code Comments**:

   - Complex logic has inline comments
   - Type definitions have JSDoc
   - Component purpose documented

3. **Examples Completeness**:
   - All 25 examples implemented
   - Each example demonstrates minimum 5 library features
   - Examples progress from simple to complex

---

## Critical Anti-Patterns (ZERO TOLERANCE)

### Forbidden Patterns

1. **DevBrand-Specific Logic**:

   - ❌ NO hardcoded DevBrand agent names in examples
   - ❌ NO DevBrand-specific metadata displays
   - ❌ NO DevBrand API endpoints in workflows
   - ✅ ALL examples MUST be generic and reusable

2. **Code Duplication**:

   - ❌ NO copy-paste code between examples
   - ❌ NO duplicate workflow definitions
   - ❌ NO duplicate utility functions
   - ✅ USE shared utilities and workflows

3. **Hardcoded Configuration**:

   - ❌ NO hardcoded API URLs in components
   - ❌ NO hardcoded workflow IDs outside workflow definitions
   - ❌ NO hardcoded timeouts or retry logic
   - ✅ USE configuration via providers and workflow metadata

4. **Incomplete Examples**:
   - ❌ NO examples without README
   - ❌ NO examples without tests
   - ❌ NO examples with TODOs or placeholders
   - ✅ ALL examples MUST be complete and runnable

---

## Integration with Predecessor Tasks

### From TASK_2025_019 (Core Services)

**Required Integrations**:

- WorkflowRegistry for workflow lookups
- LangGraphConnectionService for execution
- provideLangGraph/provideLangGraphWorkflow for configuration
- All 16 AG-UI event types for event handling

**Example Usage**:

```typescript
// Every example MUST use WorkflowRegistry
const workflow = inject(WorkflowRegistry).get<TInput, TOutput>('workflow-id');

// Every example MUST use provider functions
providers: [
  provideLangGraph({ apiUrl: environment.apiUrl }),
  provideLangGraphWorkflow(MY_WORKFLOW),
];
```

### From TASK_2025_020 (Components & Directives)

**Required Integrations**:

- WorkflowVisualizer for workflow visualization
- ApprovalModal for HITL workflows
- Chat component for chat interfaces
- Structural directives for template logic

**Example Usage**:

```typescript
// Examples demonstrating components
<lg-workflow-visualizer
  [workflowId]="workflowId"
  [executionId]="execution()?.id"
>
  <!-- Custom agent display -->
  <ng-template lgAgentDisplay let-agent>
    <custom-agent-card [agent]="agent" />
  </ng-template>
</lg-workflow-visualizer>
```

### From TASK_2025_021 (Composables & Providers)

**Required Integrations**:

- useLangGraphWorkflow composable for workflow management
- useLangGraphChat composable for chat functionality
- useLangGraphApproval composable for HITL
- RxJS operators for event processing

**Example Usage**:

```typescript
// Examples using composables
private workflow = useLangGraphWorkflow<TInput, TState, TOutput>(
  'workflow-id'
);

// Examples using operators
this.workflow.events$.pipe(
  filterWorkflowEvents<TokenUpdateEvent>('token_update'),
  bufferWorkflowTokens({ bufferTime: 100 }),
  takeUntilWorkflowComplete()
).subscribe(tokens => {
  // Handle buffered tokens
});
```

---

## Success Metrics

### Quantitative Metrics

1. **Implementation Completeness**:

   - 25 example components implemented: 100%
   - All examples with README: 100%
   - All examples with tests: 100%
   - Test coverage: ≥ 80% per example

2. **Code Quality**:

   - Zero 'any' types
   - Zero ESLint warnings
   - Zero DevBrand references (automated validation)
   - All examples TypeScript strict mode compliant

3. **Documentation Quality**:
   - 25 README files created
   - Each README ≥ 100 lines
   - All examples have code explanations
   - All examples have usage instructions

### Qualitative Metrics

1. **Developer Experience**:

   - Examples are copy-paste ready
   - Examples demonstrate clear patterns
   - Examples progress logically (simple → complex)
   - Examples cover diverse use cases

2. **Integration Quality**:

   - All library features demonstrated
   - Examples use realistic scenarios
   - Examples follow best practices
   - Examples are maintainable

3. **Educational Value**:
   - Examples teach library concepts
   - Examples show common patterns
   - Examples include troubleshooting tips
   - Examples reference predecessor task docs

---

## Risk Analysis

### Technical Risks

#### Risk: Mock Data Complexity

- **Probability**: Medium
- **Impact**: Medium (Examples appear simplistic)
- **Mitigation**:
  - Create realistic, detailed mock data
  - Use variety of data structures
  - Simulate realistic delays and errors
  - Document mock data limitations
- **Contingency**: Provide optional integration with real backend

#### Risk: Example Maintenance Burden

- **Probability**: High
- **Impact**: Medium (Examples break with library changes)
- **Mitigation**:
  - Comprehensive test coverage (80%+)
  - Use library public APIs only
  - Automated testing in CI pipeline
  - Version compatibility documentation
- **Contingency**: Create example maintenance guide

#### Risk: Over-Engineering Examples

- **Probability**: Medium
- **Impact**: Medium (Examples too complex to understand)
- **Mitigation**:
  - Start simple, add complexity gradually
  - Include "simple" and "advanced" variants
  - Clear code comments explaining complexity
  - README sections explaining advanced concepts
- **Contingency**: Create "simplified" example variants

### Documentation Risks

#### Risk: Examples Don't Cover Edge Cases

- **Probability**: Medium
- **Impact**: High (Developers encounter undocumented scenarios)
- **Mitigation**:
  - Include error handling in all examples
  - Demonstrate timeout scenarios
  - Show cancellation patterns
  - Document limitations explicitly
- **Contingency**: Create "Troubleshooting" section in main README

#### Risk: Inconsistent Example Quality

- **Probability**: Low
- **Impact**: Medium (Confusing for developers)
- **Mitigation**:
  - Define example template structure
  - Code review all examples
  - Automated linting and formatting
  - Quality checklist validation
- **Contingency**: Create example quality audit process

---

## Dependencies & Constraints

### External Dependencies

- **TASK_2025_019**: REQUIRED COMPLETE - WorkflowRegistry, services, event types
- **TASK_2025_020**: REQUIRED COMPLETE - Components, directives, contexts
- **TASK_2025_021**: REQUIRED COMPLETE - Composables, operators, type guards

### Internal Dependencies

- All examples depend on shared utilities being implemented first
- Navigation depends on all category examples being complete
- Testing infrastructure depends on provideLangGraphTesting from TASK_2025_021

### Constraints

- **No Backend Integration**: Examples MUST work with mock data (no real API calls required)
- **Self-Contained**: Each example MUST be independently runnable
- **Generic Only**: ZERO DevBrand-specific logic allowed in examples
- **Bundle Size**: Each example category bundle < 50KB gzipped

---

## Quality Gates (BDD Format)

### Gate 1: Directory Structure

1. WHEN developer opens examples directory THEN 5 category folders SHALL exist with standardized structure
2. WHEN example folder opened THEN 4 files SHALL exist (component.ts, workflow.ts, spec.ts, README.md)
3. WHEN shared folder accessed THEN workflows, mock-data, utilities subfolders SHALL exist
4. WHEN barrel exports used THEN index.ts SHALL provide clean import paths

### Gate 2: Basic Integration Examples

5. WHEN simple-execution example runs THEN workflow SHALL execute with signal-based state tracking
6. WHEN custom-rendering example renders THEN custom agent cards SHALL display via content projection
7. WHEN approval-handling example triggers THEN ApprovalModal SHALL display with custom metadata
8. WHEN chat-interface example used THEN messages SHALL stream with token buffering
9. WHEN complete-lifecycle example runs THEN all 16 AG-UI event types SHALL be demonstrated

### Gate 3: Content Generation Examples

10. WHEN blog-post-generator executes THEN multi-stage workflow SHALL demonstrate outline → draft → revision
11. WHEN social-media-creator runs THEN parallel content generation SHALL create platform-specific posts
12. WHEN email-template-generator used THEN variable substitution SHALL customize templates
13. WHEN product-description-writer runs THEN SEO optimization SHALL enhance descriptions
14. WHEN marketing-copy-generator executes THEN A/B variants SHALL generate

### Gate 4: Data Analysis Examples

15. WHEN csv-analyzer processes file THEN statistics SHALL calculate and chart SHALL visualize
16. WHEN json-transformer runs THEN schema validation SHALL verify structure before transformation
17. WHEN statistical-analysis executes THEN correlation and distribution SHALL compute
18. WHEN data-quality-validator runs THEN missing values and type mismatches SHALL detect
19. WHEN report-generator executes THEN template-based report SHALL generate with data

### Gate 5: Code Review Examples

20. WHEN security-scanner analyzes code THEN vulnerabilities SHALL classify by severity with remediation
21. WHEN code-style-enforcer runs THEN violations SHALL group with auto-fix suggestions
22. WHEN performance-optimizer analyzes THEN bottlenecks SHALL identify with optimization suggestions
23. WHEN dependency-auditor runs THEN vulnerabilities and license issues SHALL detect
24. WHEN documentation-coverage checks THEN coverage score SHALL calculate

### Gate 6: Advanced Patterns Examples

25. WHEN multi-step-approvals executes THEN approval chain SHALL visualize with sequential gates
26. WHEN parallel-workflows run THEN concurrent execution SHALL aggregate progress
27. WHEN workflow-cancellation triggers THEN graceful cancellation SHALL cleanup resources
28. WHEN error-recovery activates THEN retry with exponential backoff SHALL attempt recovery
29. WHEN custom-event-pipeline processes THEN custom events SHALL filter and transform

### Gate 7: Shared Utilities

30. WHEN workflow definitions imported THEN barrel exports SHALL provide clean imports
31. WHEN mock data accessed THEN type-safe sample data SHALL match workflow schemas
32. WHEN workflow helpers used THEN retry, timeout, validation utilities SHALL be available
33. WHEN test helpers used THEN provideLangGraphTesting SHALL enable workflow mocking

### Gate 8: Navigation & Routing

34. WHEN /examples accessed THEN landing page SHALL display 5 categories with descriptions
35. WHEN category clicked THEN examples list SHALL display with metadata
36. WHEN example loaded THEN lazy loading SHALL minimize initial bundle
37. WHEN routing configured THEN provideLangGraphWorkflow SHALL register workflows in route providers

### Gate 9: Testing Infrastructure

38. WHEN example tested THEN unit test SHALL verify component logic and workflow integration
39. WHEN test runs THEN provideLangGraphTesting SHALL mock workflow execution
40. WHEN coverage checked THEN minimum 80% coverage SHALL be achieved
41. WHEN error scenarios tested THEN error handling SHALL verify graceful degradation

### Gate 10: Code Quality

42. WHEN TypeScript compiles THEN zero errors SHALL occur in strict mode
43. WHEN ESLint runs THEN zero warnings SHALL be reported
44. WHEN DevBrand search runs THEN zero matches SHALL exist (case-insensitive)
45. WHEN code reviewed THEN all examples SHALL follow consistent patterns

---

## Architect Invocation Decision

### DECISION: SKIP ARCHITECT - Proceed Directly to frontend-developer

**Rationale**:

1. **All Patterns Established**:

   - TASK_2025_019: WorkflowRegistry, providers, services
   - TASK_2025_020: Components, content projection, directives
   - TASK_2025_021: Composables, operators, type guards
   - NO NEW architectural patterns needed

2. **Implementation Task**:

   - This is pure implementation work applying established patterns
   - Each example follows same structure: component + workflow + spec + README
   - No novel integration patterns required

3. **Clear Requirements**:

   - Detailed specifications for all 25 examples
   - Established code structure and patterns
   - Comprehensive acceptance criteria

4. **Low Architectural Risk**:
   - Examples are independent (no complex dependencies)
   - Shared utilities follow standard patterns
   - Navigation uses standard Angular routing

**Conditions That Would Require Architect**:

- If examples needed novel component composition patterns
- If shared utilities required complex architecture
- If integration patterns were unclear or conflicting
- If performance optimization required architectural decisions

**Since none of these conditions exist, proceed directly to frontend-developer.**

---

## Delegation Package

### Next Agent: frontend-developer

**Agent Profile**: Senior Angular developer with expertise in component development, routing, and testing

**Task Summary**: Implement 25+ working example applications in dev-brand-ui showcasing the generic angular-langgraph library

**Input Artifacts**:

1. This requirements document (task-description.md)
2. TASK_2025_019 output (angular-langgraph-services-REWRITE.md)
3. TASK_2025_020 output (angular-langgraph-components-REWRITE.md)
4. TASK_2025_021 output (angular-langgraph-composables-REWRITE.md)
5. Current dev-brand-ui application structure

**Expected Deliverables**:

1. **Implementation Files** (~3,800 lines total):

   - 25 example components (25 × 40 = 1,000 lines)
   - 25 workflow definitions (25 × 20 = 500 lines)
   - 25 unit test specs (25 × 50 = 1,250 lines)
   - Shared utilities (~500 lines)
   - Mock data (~300 lines)
   - Navigation components (~150 lines)
   - Routing configuration (~100 lines)

2. **Documentation Files**:

   - 25 README files (25 × 100 = 2,500 lines)
   - Main examples README (~300 lines)
   - Category README files (5 × 50 = 250 lines)

3. **Testing Infrastructure**:

   - Test helpers in shared/utilities
   - Mock workflow results
   - Component test templates

4. **Validation Report**:
   - Zero DevBrand references proof
   - Test coverage report (≥80%)
   - Bundle size analysis
   - Quality checklist verification

**Success Criteria**:

- All 45 BDD acceptance criteria met
- All 25 examples implemented and tested
- Zero DevBrand-specific code in examples
- All examples use generic library APIs
- Navigation and routing fully functional
- Test coverage ≥ 80% per example

**Quality Bar**:

- TypeScript strict mode compliance
- Zero ESLint warnings
- Consistent code style
- Comprehensive README documentation
- Working examples (copy-paste ready)

**Time Budget**: L effort (10-12 hours)

- Basic examples (5): 2.5h
- Content generation examples (5): 2.5h
- Data analysis examples (5): 2h
- Code review examples (5): 2h
- Advanced patterns examples (5): 2.5h
- Shared utilities: 1h
- Navigation & routing: 1h
- Testing: 1.5h
- Documentation: 1h
- Validation: 0.5h

**Implementation Order**:

1. Shared utilities and mock data (foundation)
2. Basic integration examples (simplest patterns)
3. Content generation examples
4. Data analysis examples
5. Code review examples
6. Advanced patterns examples (most complex)
7. Navigation and routing
8. Testing infrastructure
9. Documentation polish
10. Validation and quality checks

---

## Future Enhancements

### Immediate Actions (Post-TASK_2025_022)

1. **TASK_2025_023**: Documentation consolidation and final review
2. Create video walkthrough of example applications
3. Deploy examples to live demo site

### Technical Debt

None introduced - examples are clean implementations following established patterns.

### Enhancement Opportunities

1. **Interactive Playground**: Live code editor for modifying examples in-browser
2. **Example Generator**: CLI tool to scaffold new examples following established patterns
3. **Backend Integration Guide**: Documentation for connecting examples to real backend
4. **Advanced Examples**: WebSocket streaming, real-time collaboration, agent orchestration
5. **Storybook Integration**: Component showcase with interactive props
6. **Example Tests as Docs**: Generate documentation from test descriptions

---

**END OF REQUIREMENTS DOCUMENT**
