# Agents-Workflow Library Implementation Plan

## Executive Summary

**Objective**: Build a new `agents-workflow` library at `libs/agent-system/agents-workflow` to replace the current `agent-system/backend` library by eliminating 85-90% infrastructure code duplication with the `@anubis/nestjs-langgraph` library.

**Key Principles**:
- Preserve essential business logic (agent nodes, tools, domain logic)
- Leverage modern decorator patterns (@Workflow, @Node, @Edge, @Tool)
- Extend proper base classes from @anubis/nestjs-langgraph
- Enable incremental migration with zero downtime
- Import path: `@anubis/agent-system/agents-workflow`

## Current State Analysis

### Infrastructure Duplication Identified (85-90%)
- Custom workflow compilation and execution engines
- LLM provider management and binding
- Tool discovery and routing systems
- Error handling and retry mechanisms
- Streaming and event management
- Checkpoint persistence patterns
- Human-in-the-loop approval systems
- State management and transformation utilities

### Essential Business Logic to Preserve (10-15%)
- **Agent Workflows**: 5 agent types (Architect, Product Manager, Senior Developer, QA Engineer, Tech Lead)
- **Agent Nodes**: ~25 specialized business logic nodes
- **Domain Services**: Agent-specific business services (~15 services)
- **Agent Tools**: Domain-specific tool implementations
- **Context Types**: Agent-specific context and state structures
- **Routing Logic**: Business-specific conditional routing

## New Architecture Design

### Library Structure
```
libs/agent-system/agents-workflow/
├── src/
│   ├── lib/
│   │   ├── workflows/                    # Modern workflow implementations
│   │   │   ├── architect/
│   │   │   │   ├── architect.workflow.ts
│   │   │   │   ├── nodes/
│   │   │   │   │   ├── architecture-analysis.node.ts
│   │   │   │   │   ├── technical-decision.node.ts
│   │   │   │   │   ├── spec-generation.node.ts
│   │   │   │   │   └── ...
│   │   │   │   └── services/             # Domain-specific services
│   │   │   ├── product-manager/
│   │   │   ├── senior-developer/
│   │   │   ├── qa-engineer/
│   │   │   └── tech-lead/
│   │   ├── nodes/                        # Shared node utilities
│   │   │   ├── base/
│   │   │   │   ├── agent-node.base.ts   # Extends @anubis/nestjs-langgraph base
│   │   │   │   └── typed-node.base.ts   # Type-safe node wrapper
│   │   │   └── mixins/
│   │   │       ├── tool-routing.mixin.ts
│   │   │       └── context-access.mixin.ts
│   │   ├── services/                     # Shared business services
│   │   │   ├── context-accessor.service.ts
│   │   │   ├── agent-handoff.service.ts
│   │   │   └── workflow-orchestrator.service.ts
│   │   ├── tools/                        # Agent tools (preserved)
│   │   │   ├── base/
│   │   │   ├── architect/
│   │   │   ├── senior-developer/
│   │   │   └── ...
│   │   └── module.ts                     # Main module
│   ├── index.ts
│   └── public-api.ts                     # Clean API surface
├── project.json
├── tsconfig.lib.json
├── tsconfig.spec.json
└── README.md
```

### Core Architectural Patterns

#### 1. Modern Workflow Pattern
```typescript
@Workflow({
  name: 'architect-workflow',
  description: 'Technical architecture and decision-making workflow',
  streaming: true,
  hitl: { enabled: true, interruptNodes: ['human_approval'] },
  pattern: 'supervisor'
})
export class ArchitectWorkflow extends DeclarativeWorkflowBase<WorkflowState> {
  
  @StartNode({ 
    description: 'Analyze current architecture and requirements',
    timeout: 120000 
  })
  async architectureAnalysis(state: WorkflowState): Promise<Partial<WorkflowState>> {
    return this.architectureAnalysisNode.execute(state);
  }
  
  @Node({ 
    type: 'llm',
    requiresApproval: true,
    confidenceThreshold: 0.8
  })
  async technicalDecision(state: WorkflowState): Promise<Command<WorkflowState>> {
    return this.technicalDecisionNode.execute(state);
  }
  
  @ConditionalEdge('architectureAnalysis', {
    'high_confidence': 'technicalDecision',
    'needs_approval': 'human_approval',
    'needs_tools': 'tools'
  })
  routeAfterAnalysis(state: WorkflowState): string {
    return this.routingService.determineRoute(state);
  }
}
```

#### 2. Modern Node Pattern
```typescript
@Injectable()
export class ArchitectureAnalysisNode extends AgentNodeBase<WorkflowState> {
  protected readonly nodeConfig: AgentNodeConfig = {
    id: 'architecture_analysis',
    name: 'Architecture Analysis',
    description: 'Analyze current architecture and requirements',
    requiresApproval: false,
    confidenceThreshold: 0.7,
    maxRetries: 3,
    timeout: 120000
  };

  constructor(
    @Inject('LLM_SERVICE') private llmService: LLMService,
    private analysisService: ArchitectureAnalysisService
  ) {
    super();
  }

  protected requiresLLM(): boolean {
    return true;
  }

  protected async initializeLLM(): Promise<void> {
    this.llm = await this.llmService.getLLMForAgent(AgentType.ARCHITECT);
  }

  async execute(state: WorkflowState): Promise<Partial<WorkflowState> | Command<WorkflowState>> {
    const analysis = await this.analysisService.analyze(state);
    
    if (analysis.needsTools) {
      return this.createCommand(CommandType.TOOLS, {
        tools: analysis.requiredTools,
        update: { analysisInProgress: analysis }
      });
    }
    
    return {
      agentContext: {
        ...state.agentContext,
        architectureAnalysis: analysis.result
      },
      confidence: analysis.confidence
    };
  }
}
```

#### 3. Tool Integration Pattern
```typescript
@Tool({
  name: 'analyze_codebase_structure',
  description: 'Analyze the structure and patterns of a codebase',
  schema: z.object({
    projectPath: z.string(),
    analysisDepth: z.enum(['shallow', 'deep']).default('shallow')
  })
})
export class CodebaseStructureAnalysisTool {
  constructor(
    private treeService: TreeSitterAnalyzerService,
    private graphService: CodebaseGraphService
  ) {}

  async execute(params: { projectPath: string; analysisDepth: 'shallow' | 'deep' }) {
    // Tool implementation using intelligence services
    const structure = await this.treeService.analyzeProject(params.projectPath);
    const metrics = await this.graphService.calculateMetrics(structure);
    
    return {
      structure,
      metrics,
      recommendations: this.generateRecommendations(structure, metrics)
    };
  }
}
```

## Migration Strategy

### Phase 1: Foundation Setup (Week 1)
**Goal**: Create new library infrastructure with modern patterns

**Tasks**:
1. **Generate agents-workflow library**
   ```bash
   npx nx generate @nx/nest:library \
     --directory=libs/agent-system/agents-workflow \
     --linter=eslint \
     --unitTestRunner=jest \
     --importPath=@anubis/agent-system/agents-workflow \
     --name=agents-workflow \
     --setParserOptionsProject=true \
     --tags=domain:agent-system,type:workflow \
     --useProjectJson=true
   ```

2. **Setup base classes and patterns**
   - Create `AgentNodeBase` extending `@anubis/nestjs-langgraph/AgentNodeBase`
   - Create `TypedWorkflowBase` extending `DeclarativeWorkflowBase`
   - Setup tool integration patterns
   - Configure module structure

3. **Setup testing infrastructure**
   - Unit test patterns
   - Workflow test builders
   - Mock factories

**Acceptance Criteria**:
- [ ] Library generates successfully with proper Nx configuration
- [ ] Base classes compile without errors
- [ ] Import path `@anubis/agent-system/agents-workflow` resolves correctly
- [ ] Basic test suite runs successfully
- [ ] Module boundaries enforced (can import from nestjs-langgraph, intelligence, core)

### Phase 2: Core Workflow Migration (Week 2-3)
**Goal**: Migrate one complete workflow (Architect) to validate patterns

**Tasks**:
1. **Migrate Architect Workflow**
   - Convert to declarative pattern with @Workflow decorator
   - Implement all 6 nodes using modern node pattern
   - Setup conditional routing with @ConditionalEdge
   - Configure streaming and HITL

2. **Migrate Architecture Analysis Node**
   - Extend new AgentNodeBase
   - Integrate with intelligence services
   - Setup proper tool calling
   - Add comprehensive error handling

3. **Setup Service Integration**
   - Context accessor service
   - Tool routing service
   - Validation service

**Acceptance Criteria**:
- [ ] Architect workflow runs end-to-end with new patterns
- [ ] All 6 architect nodes execute successfully
- [ ] Streaming works correctly
- [ ] Human approval integration functions
- [ ] Tool calling works with new pattern
- [ ] Performance matches or exceeds current implementation
- [ ] All tests pass

### Phase 3: Parallel Workflow Migration (Week 3-4)
**Goal**: Migrate remaining workflows in parallel

**Tasks**:
1. **Product Manager Workflow**
   - Requirements analysis node
   - Scope definition node
   - Acceptance criteria node
   - Delivery planning node
   - Team coordination node

2. **Senior Developer Workflow**
   - Code generation node
   - Test writing node
   - Code review integration
   - RAG context service

3. **QA Engineer Workflow**
   - Test plan generation node
   - Test execution node
   - Coverage analysis node
   - Defect reporting node
   - Test validation node

4. **Tech Lead Workflow**
   - Agent selection node
   - Task orchestration node
   - Quality review node
   - Conflict resolution node
   - Result aggregation node

**Acceptance Criteria**:
- [ ] All 5 workflows migrate successfully
- [ ] All ~25 nodes function correctly with new patterns
- [ ] Inter-workflow handoffs work correctly
- [ ] Performance benchmarks met
- [ ] Memory usage optimized
- [ ] All integration tests pass

### Phase 4: Tool System Migration (Week 4-5)
**Goal**: Migrate agent tools to new @Tool decorator pattern

**Tasks**:
1. **Convert existing tools to new pattern**
   - File system tools
   - Code analysis tools
   - Knowledge retrieval tools
   - Communication tools

2. **Setup tool discovery and registration**
   - Automatic tool discovery
   - Type-safe tool calling
   - Tool validation and error handling

3. **Performance optimization**
   - Tool caching strategies
   - Parallel tool execution
   - Resource management

**Acceptance Criteria**:
- [ ] All agent tools work with new @Tool pattern
- [ ] Tool discovery automatically finds new tools
- [ ] Tool calling performance optimized
- [ ] Error handling robust
- [ ] Tool validation prevents runtime errors

### Phase 5: Integration & Testing (Week 5-6)
**Goal**: Complete integration testing and performance validation

**Tasks**:
1. **Comprehensive Integration Testing**
   - End-to-end workflow testing
   - Multi-agent coordination testing
   - Streaming performance testing
   - Error scenario testing

2. **Performance Benchmarking**
   - Workflow execution time comparison
   - Memory usage profiling
   - Concurrent workflow handling
   - Resource utilization monitoring

3. **Migration Testing**
   - Parallel running of old and new systems
   - Data consistency validation
   - State migration testing

**Acceptance Criteria**:
- [ ] All integration tests pass
- [ ] Performance equals or exceeds current system
- [ ] Memory usage reduced by target amount
- [ ] Error handling comprehensive
- [ ] Documentation complete

### Phase 6: Production Cutover (Week 6-7)
**Goal**: Complete migration to new library with zero downtime

**Tasks**:
1. **Gradual Traffic Migration**
   - Feature flag controlled rollout
   - Canary deployment testing
   - Monitoring and alerting setup
   - Rollback procedures validated

2. **Legacy System Deprecation**
   - Update all imports to new library
   - Remove old library code
   - Archive legacy tests
   - Update documentation

3. **Performance Monitoring**
   - Production metrics collection
   - Performance comparison
   - Issue detection and resolution

**Acceptance Criteria**:
- [ ] All production traffic successfully migrated
- [ ] Zero downtime achieved
- [ ] Performance metrics meet targets
- [ ] No critical issues detected
- [ ] Legacy system cleanly removed
- [ ] Team trained on new patterns

## Detailed Implementation Tasks

### Task 1: Library Generation and Setup
**Assignee**: nx-workspace-manager
**Estimated Time**: 4 hours

**Subtasks**:
1. Generate new Nx library with correct configuration
2. Setup tsconfig and project.json files
3. Configure module boundaries in nx.json
4. Setup initial folder structure
5. Create barrel exports (index.ts, public-api.ts)

**Acceptance Criteria**:
- [ ] `nx build agents-workflow` succeeds
- [ ] `nx test agents-workflow` runs (even with minimal tests)
- [ ] `nx lint agents-workflow` passes
- [ ] Import path `@anubis/agent-system/agents-workflow` resolves
- [ ] Module boundary rules enforce correct dependencies

### Task 2: Base Class Implementation
**Assignee**: nx-dev-agent-system
**Estimated Time**: 8 hours

**Subtasks**:
1. Create `AgentNodeBase` extending from nestjs-langgraph
2. Create `TypedWorkflowBase` with agent-specific typing
3. Implement context accessor utilities
4. Create tool routing mixins
5. Setup error handling patterns

**Files to Create**:
- `src/lib/nodes/base/agent-node.base.ts`
- `src/lib/workflows/base/typed-workflow.base.ts`
- `src/lib/services/context-accessor.service.ts`
- `src/lib/nodes/mixins/tool-routing.mixin.ts`

**Acceptance Criteria**:
- [ ] Base classes compile without TypeScript errors
- [ ] Proper inheritance from nestjs-langgraph base classes
- [ ] Type safety maintained with generics
- [ ] Error handling integrated
- [ ] Unit tests for base classes pass

### Task 3: Architect Workflow Migration
**Assignee**: nx-dev-agent-system
**Estimated Time**: 16 hours

**Subtasks**:
1. Convert ArchitectWorkflow to use @Workflow decorator
2. Migrate all 6 architect nodes to new pattern
3. Setup conditional routing with @ConditionalEdge decorators
4. Integrate with intelligence services
5. Setup streaming and HITL configuration
6. Migrate architect-specific services

**Files to Migrate**:
- `architect.workflow.ts` → declarative pattern
- `nodes/architecture-analysis.node.ts` → extends AgentNodeBase
- `nodes/technical-decision.node.ts` → extends AgentNodeBase
- `nodes/architecture-validation.node.ts` → extends AgentNodeBase
- `nodes/spec-generation.node.ts` → extends AgentNodeBase
- `nodes/task-decomposition.node.ts` → extends AgentNodeBase
- `nodes/technical-review.node.ts` → extends AgentNodeBase

**Acceptance Criteria**:
- [ ] Architect workflow executes end-to-end
- [ ] All nodes use modern patterns correctly
- [ ] Streaming works correctly
- [ ] Human approval integration functions
- [ ] Tool calling works
- [ ] Performance benchmarks met
- [ ] All unit tests pass
- [ ] Integration tests pass

### Task 4: Tool System Migration
**Assignee**: nx-dev-agent-system
**Estimated Time**: 12 hours

**Subtasks**:
1. Convert existing tools to @Tool decorator pattern
2. Setup tool registry and discovery
3. Implement type-safe tool calling
4. Create tool validation system
5. Setup error handling and retries

**Files to Create/Migrate**:
- `src/lib/tools/base/tool.base.ts`
- `src/lib/tools/architect/*.tool.ts`
- `src/lib/tools/senior-developer/*.tool.ts`
- `src/lib/tools/registry/tool-registry.service.ts`

**Acceptance Criteria**:
- [ ] All tools work with @Tool decorator
- [ ] Tool discovery automatically finds tools
- [ ] Type safety maintained in tool calling
- [ ] Error handling robust
- [ ] Performance optimized
- [ ] Tool tests pass

### Task 5-8: Remaining Workflow Migrations
**Assignee**: nx-dev-agent-system
**Estimated Time**: 12 hours each (48 hours total)

Each workflow follows the same pattern as the architect workflow:
1. Convert to declarative pattern
2. Migrate all nodes to extend AgentNodeBase
3. Setup routing with decorators
4. Integrate with services
5. Test end-to-end functionality

**Workflows**:
- Product Manager (5 nodes)
- Senior Developer (2 nodes)
- QA Engineer (5 nodes)  
- Tech Lead (5 nodes)

### Task 9: Integration Testing
**Assignee**: anubis-test-engineer
**Estimated Time**: 16 hours

**Subtasks**:
1. Create comprehensive integration test suite
2. Setup workflow orchestration tests
3. Create performance benchmarks
4. Implement load testing
5. Setup monitoring and alerting

**Test Areas**:
- End-to-end workflow execution
- Multi-agent coordination
- Streaming performance
- Error scenarios and recovery
- Resource utilization
- Concurrent execution

**Acceptance Criteria**:
- [ ] All integration tests pass
- [ ] Performance meets benchmarks
- [ ] Error scenarios handled correctly
- [ ] Resource usage optimized
- [ ] Load testing validates scalability

### Task 10: Production Migration
**Assignee**: anubis-architect (coordination)
**Estimated Time**: 8 hours

**Subtasks**:
1. Setup feature flags for gradual rollout
2. Implement monitoring and alerting
3. Create rollback procedures
4. Update all import paths
5. Remove legacy code

**Migration Steps**:
1. Deploy new library alongside old
2. Route 10% traffic to new library
3. Monitor performance and errors
4. Gradually increase traffic
5. Complete migration
6. Remove old library

**Acceptance Criteria**:
- [ ] Zero downtime migration
- [ ] All traffic successfully migrated
- [ ] Performance targets met
- [ ] No critical issues
- [ ] Legacy code removed
- [ ] Documentation updated

## Risk Assessment & Mitigation

### High-Risk Areas

#### 1. State Management Compatibility
**Risk**: Existing workflow state may not be compatible with new patterns
**Probability**: Medium
**Impact**: High
**Mitigation**: 
- Create state migration utilities
- Implement backward compatibility layer
- Extensive testing with existing state data
- Gradual migration with validation

#### 2. Performance Regression
**Risk**: New patterns may introduce performance overhead
**Probability**: Medium
**Impact**: High
**Mitigation**:
- Continuous performance benchmarking
- Profile memory usage and execution time
- Optimize critical paths
- Implement caching strategies

#### 3. Tool Integration Breaking
**Risk**: Existing tool integrations may break with new patterns
**Probability**: Medium
**Impact**: Medium
**Mitigation**:
- Comprehensive tool testing
- Backward compatibility wrappers
- Gradual tool migration
- Tool validation system

### Medium-Risk Areas

#### 4. Dependencies and Module Boundaries
**Risk**: Complex dependency chains may cause circular dependencies
**Probability**: Low
**Impact**: Medium
**Mitigation**:
- Strict module boundary enforcement
- Dependency graph analysis
- Interface-first development
- Regular dependency audits

#### 5. Team Learning Curve
**Risk**: Team unfamiliar with new decorator patterns
**Probability**: High
**Impact**: Low
**Mitigation**:
- Comprehensive documentation
- Code examples and patterns
- Team training sessions
- Pair programming for initial implementation

#### 6. Testing Coverage
**Risk**: Complex workflow logic may be difficult to test
**Probability**: Medium
**Impact**: Medium
**Mitigation**:
- Workflow test builders
- Mock factories for dependencies
- Integration test harness
- Performance test suite

### Low-Risk Areas

#### 7. Documentation Drift
**Risk**: Documentation may not reflect new patterns
**Probability**: High
**Impact**: Low
**Mitigation**:
- Documentation-driven development
- Automated documentation generation
- Regular documentation reviews
- Team documentation standards

## Success Metrics

### Performance Metrics
- **Workflow Execution Time**: ≤ current performance
- **Memory Usage**: 20-30% reduction from infrastructure elimination
- **CPU Utilization**: ≤ current utilization
- **Concurrent Workflow Capacity**: ≥ current capacity
- **Error Rate**: ≤ 0.1% in production

### Quality Metrics
- **Test Coverage**: ≥ 80% for all new code
- **TypeScript Strict Mode**: 100% compliance
- **Linting**: Zero violations
- **Code Complexity**: Reduced cyclomatic complexity
- **Technical Debt**: Elimination of identified duplication

### Development Metrics
- **Migration Time**: Complete within 7 weeks
- **Zero Downtime**: No production outages during migration
- **Breaking Changes**: Zero breaking changes to public APIs
- **Team Velocity**: No reduction in feature delivery speed
- **Documentation**: 100% of new patterns documented

### Business Metrics
- **Feature Delivery**: No impact on feature delivery timeline
- **System Reliability**: ≥ 99.9% uptime during migration
- **User Experience**: No degradation in response times
- **Maintenance Cost**: 50% reduction in infrastructure code maintenance

## Rollback Strategy

### Rollback Triggers
- Performance degradation > 20%
- Error rate > 1%
- Critical functionality broken
- Memory usage increase > 50%
- Any production outage

### Rollback Procedure
1. **Immediate**: Switch feature flag to route all traffic to old system
2. **Short-term**: Revert import changes in critical code paths
3. **Medium-term**: Remove new library deployment if necessary
4. **Long-term**: Analyze failure, fix issues, and restart migration

### Rollback Testing
- Automated rollback procedures tested in staging
- Rollback time target: < 5 minutes
- Zero data loss during rollback
- All monitoring and alerting functional

## Timeline Summary

| Phase | Duration | Key Deliverables | Dependencies |
|-------|----------|------------------|--------------|
| Phase 1: Foundation | Week 1 | Library setup, base classes | None |
| Phase 2: Architect Migration | Week 2-3 | Complete architect workflow | Phase 1 |
| Phase 3: Parallel Migration | Week 3-4 | All remaining workflows | Phase 2 |
| Phase 4: Tool Migration | Week 4-5 | All tools converted | Phase 3 |
| Phase 5: Integration Testing | Week 5-6 | Complete test suite | Phase 4 |
| Phase 6: Production Cutover | Week 6-7 | Live migration | Phase 5 |

**Total Duration**: 7 weeks
**Team Size**: 3-4 developers
**Total Effort**: ~160 person-hours

## Conclusion

This implementation plan provides a comprehensive, systematic approach to migrating from the current `agent-system/backend` library to a new `agents-workflow` library that leverages modern patterns from `@anubis/nestjs-langgraph`. 

The phased approach ensures minimal risk, zero downtime, and preservation of all essential business logic while eliminating 85-90% of infrastructure code duplication. The new architecture will be more maintainable, performant, and aligned with established patterns in the Anubis platform.

Key success factors:
- Incremental migration with extensive testing
- Performance monitoring throughout the process
- Team training and documentation
- Comprehensive rollback procedures
- Clear acceptance criteria for each phase

The investment in this migration will pay long-term dividends in reduced maintenance overhead, improved developer experience, and better system reliability.



  