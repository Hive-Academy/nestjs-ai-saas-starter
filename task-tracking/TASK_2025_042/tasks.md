# Development Tasks - TASK_2025_042

**Task Type**: Backend
**Developer Needed**: backend-developer
**Total Tasks**: 11
**Status**: 0/11 Complete (0%)
**Decomposed From**:

- implementation-plan.md (lines 1-1681)
- task-description.md (lines 1-621)
- context.md (lines 1-112)

---

## Task Breakdown

### Task 1: Create ToolRegistryService with discovery logic 🔄 IN PROGRESS - Assigned to backend-developer

**Assigned To**: backend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\services\tool-registry.service.ts
**Specification Reference**:

- implementation-plan.md:313-480 (Phase 1: Foundation - ToolRegistryService)
- implementation-plan.md:1596-1600 (Verification imports)

**Pattern to Follow**: MetadataProcessorService pattern (workflow-execution.service.ts:8)

**Implementation Details**:

- **Core Class**: ToolRegistryService (singleton with OnModuleInit)
- **Imports to Verify**:
  - `@Injectable`, `Logger`, `Inject` from `@nestjs/common`
  - `ModuleRef` from `@nestjs/core`
  - `StructuredTool` from `@langchain/core/tools`
  - `z` from `zod`
  - `getClassTools`, `ToolMetadata` from `../decorators/multi-agent/tool.decorator`
- **Key Methods**:
  - `onModuleInit()` - Iterate registered tool classes, call registerToolClass()
  - `registerToolClass(ToolClass)` - Extract tools via getClassTools(), convert to LangChain StructuredTool, store in Map
  - `convertToLangChainTool(metadata, instance)` - Wrap tool method in StructuredTool with error handling
  - `validateToolSchema(metadata)` - Validate tool name, description, schema
  - `getTools(toolNames?)` - Query tools by names or return all if '\*' included
  - `getStats()` - Return registry statistics
- **Data Structures**:
  - `private readonly tools = new Map<string, StructuredTool>()`
  - `private readonly toolClasses = new Map<string, any>()`
- **Error Handling**:
  - Throw on duplicate tool names with clear message
  - Throw on invalid schemas with tool name
  - Warn if tool missing description
  - Return error object from tool execution (no throw)
- **Performance**:
  - Log registration duration with performance.now()
  - Warn if registration > 100ms
- **Constructor Injection**: `@Inject('WORKFLOW_ENGINE_TOOL_CLASSES') private readonly registeredToolClasses: any[]`

**Expected Commit Pattern**: `feat(workflow-engine): add tool registry service with discovery logic`

**Verification Requirements**:

- ✅ File exists at D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\services\tool-registry.service.ts
- ✅ Git commit matches pattern
- ✅ All imports compile without errors
- ✅ Class implements OnModuleInit interface
- ✅ Uses Map<string, StructuredTool> for tool storage
- ✅ Build passes: `npx nx build @hive-academy/langgraph-workflow-engine`

---

### Task 2: Enhance WorkflowEngineModule with tools configuration ⏸️ PENDING

**Assigned To**: backend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\workflow-engine.module.ts
**Specification Reference**:

- implementation-plan.md:483-571 (Phase 2: Module Enhancement)
- workflow-engine.module.ts:12-64 (existing forRoot pattern)

**Pattern to Follow**: Existing forRoot() pattern (workflow-engine.module.ts:41-64)

**Implementation Details**:

- **Modify Interface**: Add `tools?: any[]` to WorkflowEngineModuleOptions (after line 33)
- **Modify forRoot()**:
  - Add provider for 'WORKFLOW_ENGINE_TOOL_CLASSES' using `options.tools || []`
  - Add ToolRegistryService to providers array
  - Add ToolRegistryService to exports array
- **Import Statement**: Add `import { ToolRegistryService } from './services/tool-registry.service'`
- **Preserve**: All existing options and providers unchanged
- **Documentation**: Add JSDoc comment explaining tools option

**Expected Commit Pattern**: `feat(workflow-engine): add tools configuration to module options`

**Verification Requirements**:

- ✅ File modified at D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\workflow-engine.module.ts
- ✅ Git commit matches pattern
- ✅ WorkflowEngineModuleOptions interface includes tools field
- ✅ forRoot() provides 'WORKFLOW_ENGINE_TOOL_CLASSES' token
- ✅ ToolRegistryService exported from module
- ✅ Build passes: `npx nx build @hive-academy/langgraph-workflow-engine`

---

### Task 3: Update WorkflowExecutionService with llm.bindTools() in buildAgentGraph() ⏸️ PENDING

**Assigned To**: backend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\execution\workflow-execution.service.ts
**Specification Reference**:

- implementation-plan.md:574-679 (Phase 3: Agent Tool Binding)
- workflow-execution.service.ts:237-271 (buildAgentGraph pattern reference)

**Pattern to Follow**: Existing buildAgentGraph() implementation

**Implementation Details**:

- **Modify Constructor**: Inject ToolRegistryService
  - Add `private readonly toolRegistry: ToolRegistryService` to constructor parameters
  - Import ToolRegistryService from `../services/tool-registry.service`
- **Enhance buildAgentGraph()** (private method):
  1. Extract agent config via `Reflect.getMetadata(AGENT_METADATA_KEY, AgentClass)`
  2. Get tool names from `agentConfig?.tools || []`
  3. Get tools from `this.toolRegistry.getTools(toolNames)`
  4. If tools.length > 0:
     - Inject LlmProviderService via `this.moduleRef.get(LlmProviderService, { strict: false })`
     - Get LLM instance via `llmProvider.getChatModel()`
     - Bind tools: `const llmWithTools = llm.bindTools(tools)`
     - Store in metadata: `agentDefinition.metadata = { ...metadata, llmWithTools, tools, toolNames }`
  5. Log tool binding with DEBUG level
- **Imports to Add**:
  - `AGENT_METADATA_KEY` from `../decorators/multi-agent/agent.decorator`
  - Import ModuleRef if not already imported
  - Import LlmProviderService type

**Expected Commit Pattern**: `feat(workflow-engine): add automatic tool binding in buildAgentGraph`

**Verification Requirements**:

- ✅ File modified at D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\execution\workflow-execution.service.ts
- ✅ Git commit matches pattern
- ✅ ToolRegistryService injected in constructor
- ✅ buildAgentGraph() calls llm.bindTools() when agent has tools
- ✅ Tools stored in agentDefinition.metadata
- ✅ Build passes: `npx nx build @hive-academy/langgraph-workflow-engine`

---

### Task 4: Add ToolNode injection in buildStateGraph() ⏸️ PENDING

**Assigned To**: backend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\execution\workflow-execution.service.ts
**Specification Reference**:

- implementation-plan.md:682-858 (Phase 4: ToolNode Injection)
- workflow-execution.service.ts:280-308 (buildStateGraph pattern reference)

**Pattern to Follow**: Existing buildStateGraph() implementation

**Implementation Details**:

- **Import ToolNode**: `import { ToolNode } from '@langchain/langgraph/prebuilt'`
- **Import END**: `import { END } from '@langchain/langgraph'`
- **Enhance buildStateGraph()**:
  1. Check if agent has tools: `const hasTools = definition.metadata?.tools && definition.metadata.tools.length > 0`
  2. After adding all nodes, if hasTools:
     - Create ToolNode: `const toolNode = new ToolNode(definition.metadata.tools)`
     - Add to graph: `graph.addNode('tools', toolNode)`
     - Log ToolNode addition
  3. Pass hasTools flag to addEdgesFromMetadata()
- **Enhance addEdgesFromMetadata()**:
  - Add `hasTools: boolean` parameter
  - After processing edges from metadata, if hasTools:
    - For each node in definition.nodes:
      - Get next node via getNextNode()
      - Add conditional edge: `graph.addConditionalEdges(node.id, this.shouldExecuteTools.bind(this), { tools: 'tools', continue: nextNode || END })`
    - Add edge back: `graph.addEdge('tools', definition.entryPoint)`
- **Add shouldExecuteTools() method**:
  ```typescript
  private shouldExecuteTools(state: WorkflowState): 'tools' | 'continue' {
    if (!state.messages || state.messages.length === 0) return 'continue';
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      this.logger.debug(`Tool calls detected: ${lastMessage.tool_calls.map(tc => tc.name).join(', ')}`);
      return 'tools';
    }
    return 'continue';
  }
  ```
- **Add getNextNode() helper**:
  ```typescript
  private getNextNode(node: WorkflowNode, definition: WorkflowDefinition): string | null {
    const edge = definition.edges.find(e => e.from === node.id);
    if (edge && typeof edge.to === 'string') return edge.to;
    return null;
  }
  ```

**Expected Commit Pattern**: `feat(workflow-engine): add automatic ToolNode injection in buildStateGraph`

**Verification Requirements**:

- ✅ File modified at D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\execution\workflow-execution.service.ts
- ✅ Git commit matches pattern
- ✅ ToolNode imported from @langchain/langgraph/prebuilt
- ✅ buildStateGraph() creates ToolNode when tools present
- ✅ Conditional routing implemented via shouldExecuteTools()
- ✅ Build passes: `npx nx build @hive-academy/langgraph-workflow-engine`

---

### Task 5: Implement shouldExecuteTools() routing logic ⏸️ PENDING

**Assigned To**: backend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\execution\workflow-execution.service.ts
**Specification Reference**:

- implementation-plan.md:112-147 (Decision 3: Tool Call Routing Strategy)
- implementation-plan.md:816-843 (shouldExecuteTools implementation)

**Pattern to Follow**: Conditional routing pattern from implementation plan

**Implementation Details**:

- **CRITICAL**: This task is MERGED with Task 4
- Task 4 already implements shouldExecuteTools() method
- This task exists for tracking purposes only
- No separate implementation needed

**Expected Commit Pattern**: N/A (merged with Task 4)

**Verification Requirements**:

- ✅ shouldExecuteTools() method exists in WorkflowExecutionService
- ✅ Method checks for tool_calls in last message
- ✅ Returns 'tools' if tool_calls present, 'continue' otherwise
- ✅ Build passes: `npx nx build @hive-academy/langgraph-workflow-engine`

---

### Task 6: Add streaming enhancement (streamMode: 'updates') ⏸️ PENDING

**Assigned To**: backend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\execution\workflow-execution.service.ts
**Specification Reference**:

- implementation-plan.md:860-929 (Phase 5: Streaming Enhancement)
- workflow-execution.service.ts:116-152 (streamWorkflow pattern reference)

**Pattern to Follow**: Existing streamWorkflow() implementation

**Implementation Details**:

- **Modify streamWorkflow() method**:
  1. Change default streamMode from 'values' to 'updates'
  2. Extract streamMode: `const streamMode = config?.streamMode || 'updates'`
  3. Add debug log: `this.logger.debug('Streaming mode: ${streamMode}')`
  4. Pass to graph.stream(): `await compiled.stream(input, { ...config, streamMode })`
- **Update JSDoc**: Document 'updates' mode benefits for tool visibility
- **Backward Compatibility**: Respect user-provided config.streamMode

**Expected Commit Pattern**: `feat(workflow-engine): default to updates streaming mode for tool visibility`

**Verification Requirements**:

- ✅ File modified at D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\execution\workflow-execution.service.ts
- ✅ Git commit matches pattern
- ✅ Default streamMode changed to 'updates'
- ✅ User-provided streamMode still respected
- ✅ Debug logging for streamMode present
- ✅ Build passes: `npx nx build @hive-academy/langgraph-workflow-engine`

---

### Task 7: Create unit tests for ToolRegistryService ⏸️ PENDING

**Assigned To**: backend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\services\tool-registry.service.spec.ts
**Specification Reference**:

- implementation-plan.md:932-990 (Unit Tests - ToolRegistryService)
- implementation-plan.md:1318-1327 (Coverage targets)

**Pattern to Follow**: NestJS testing utilities with Test.createTestingModule()

**Implementation Details**:

- **Test Suite Structure**:
  - `describe('ToolRegistryService')`
  - `beforeEach()` - Create testing module, inject service, call onModuleInit()
- **Test Cases**:
  1. `should extract tools from registered classes` - Verify tools.length > 0, tool names present
  2. `should throw on duplicate tool names` - Create duplicate, expect error during registration
  3. `should filter tools by names` - Call getTools(['tool1', 'tool2']), verify length and names
  4. `should return all tools when * is included` - Call getTools(['*']), verify returns all
  5. `should warn for missing tools` - Spy on logger.warn, call getTools(['nonexistent']), verify warning
- **Mocking Strategy**:
  - Mock ModuleRef with `useValue: mockModuleRef`
  - Provide 'WORKFLOW_ENGINE_TOOL_CLASSES' with test tool classes
  - NO mocks for Reflect API or @Tool decorator
- **Coverage Target**: 90%+

**Expected Commit Pattern**: `test(workflow-engine): add unit tests for ToolRegistryService`

**Verification Requirements**:

- ✅ File exists at D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\services\tool-registry.service.spec.ts
- ✅ Git commit matches pattern
- ✅ All test cases pass
- ✅ Coverage ≥ 90% for ToolRegistryService
- ✅ Tests pass: `npx nx test @hive-academy/langgraph-workflow-engine --coverage`

---

### Task 8: Create unit tests for tool binding ⏸️ PENDING

**Assigned To**: backend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\execution\workflow-execution.service.spec.ts
**Specification Reference**:

- implementation-plan.md:992-1061 (Integration Tests - Tool Execution)
- implementation-plan.md:1318-1327 (Coverage targets)

**Pattern to Follow**: Existing spec file pattern (modify existing file)

**Implementation Details**:

- **MODIFY EXISTING FILE**: workflow-execution.service.spec.ts
- **Add Test Suite**: `describe('LangGraph Tool Integration')`
- **Test Cases**:
  1. `should bind tools to LLM and execute via ToolNode` - Real workflow execution with tools, verify ToolMessage in results
  2. `should stream tool execution events` - Stream workflow with 'updates' mode, verify tool node events
  3. `should handle tool execution errors gracefully` - Mock tool error, verify error returned as tool output
- **Testing Strategy**:
  - Use real LangGraph + LangChain stack
  - Mock external APIs (GitHub, Tavily)
  - Create test agent class with @Agent decorator and tools config
  - Use Test.createTestingModule() with WorkflowEngineModule.forRoot({ tools: [...] })
- **Coverage Target**: 80%+ overall

**Expected Commit Pattern**: `test(workflow-engine): add integration tests for tool binding and execution`

**Verification Requirements**:

- ✅ File modified at D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\execution\workflow-execution.service.spec.ts
- ✅ Git commit matches pattern
- ✅ All test cases pass with real LangGraph stack
- ✅ Coverage ≥ 80% overall
- ✅ Tests pass: `npx nx test @hive-academy/langgraph-workflow-engine --coverage`

---

### Task 9: Create integration tests for tool execution ⏸️ PENDING

**Assigned To**: backend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\src\lib\execution\workflow-execution.service.spec.ts
**Specification Reference**:

- implementation-plan.md:992-1061 (Integration Tests - Tool Execution)

**Implementation Details**:

- **CRITICAL**: This task is MERGED with Task 8
- Task 8 already includes integration tests for tool execution
- This task exists for tracking purposes only
- No separate implementation needed

**Expected Commit Pattern**: N/A (merged with Task 8)

**Verification Requirements**:

- ✅ Integration tests exist in workflow-execution.service.spec.ts
- ✅ Tests verify real tool execution with LangGraph
- ✅ Tests verify streaming tool events
- ✅ Tests pass: `npx nx test @hive-academy/langgraph-workflow-engine`

---

### Task 10: Update CLAUDE.md documentation ⏸️ PENDING

**Assigned To**: backend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\CLAUDE.md
**Specification Reference**:

- implementation-plan.md:1073-1231 (Phase 7: Documentation)
- implementation-plan.md:1084-1221 (Documentation sections)

**Pattern to Follow**: Existing CLAUDE.md structure

**Implementation Details**:

- **Add New Section**: "Tool Integration System" after "Decorator Categories" section
- **Subsections to Add**:
  1. **Overview** - 4 bullet points on automatic tool discovery/binding/execution/streaming
  2. **Quick Start** - 4-step guide (create tool class, register in module, configure agent tools, execute and stream)
  3. **Tool Execution Flow** - ASCII diagram showing user query → agent → LLM → conditional routing → ToolNode → return to agent
  4. **Best Practices** - Schema design (use .describe(), keep simple, avoid deep nesting), tool naming (kebab-case, specific names), error handling (return error objects, include context)
  5. **Troubleshooting** - 2 common errors with causes and solutions (Tool Not Found, Duplicate Tool Name)
- **Code Examples**: Working TypeScript examples for each pattern
- **Markdown Formatting**: Use code blocks, bullet lists, diagrams
- **Length**: ~150-200 lines total for new section

**Expected Commit Pattern**: `docs(workflow-engine): add tool integration system documentation`

**Verification Requirements**:

- ✅ File modified at D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\CLAUDE.md
- ✅ Git commit matches pattern
- ✅ All code examples are syntactically valid TypeScript
- ✅ Section includes all 5 subsections
- ✅ Troubleshooting covers common errors
- ✅ Build passes: `npx nx build @hive-academy/langgraph-workflow-engine`

---

### Task 11: Create usage examples ⏸️ PENDING

**Assigned To**: backend-developer
**File(s)**: D:\projects\nestjs-ai-saas-starter\libs\langgraph-modules\workflow-engine\CLAUDE.md
**Specification Reference**:

- implementation-plan.md:1094-1167 (Example snippets in documentation)

**Implementation Details**:

- **CRITICAL**: This task is MERGED with Task 10
- Task 10 already includes code examples in Quick Start section
- This task exists for tracking purposes only
- No separate implementation needed

**Expected Commit Pattern**: N/A (merged with Task 10)

**Verification Requirements**:

- ✅ CLAUDE.md includes Quick Start section with examples
- ✅ Code examples are complete and working
- ✅ Examples demonstrate tool class, module registration, agent config, execution
- ✅ Build passes: `npx nx build @hive-academy/langgraph-workflow-engine`

---

## Verification Protocol

**After Each Task Completion**:

1. Developer implements task following specification
2. Developer commits to git with exact commit pattern
3. Developer updates task status to "✅ COMPLETE"
4. Developer adds git commit SHA to task
5. Team-leader verifies:
   - `git log --oneline -1` matches expected commit pattern
   - `Read([file-path])` confirms file exists/modified
   - Build passes (if applicable)
6. If verification passes: Assign next task
7. If verification fails: Mark task as "❌ FAILED", escalate to user

**Git Verification Commands**:

```bash
# Check latest commit
git log --oneline -1

# Verify file exists
ls -la [file-path]

# Run build
npx nx build @hive-academy/langgraph-workflow-engine

# Run tests
npx nx test @hive-academy/langgraph-workflow-engine --coverage
```

---

## Completion Criteria

**All tasks complete when**:

- All 11 task statuses are "✅ COMPLETE"
- All git commits verified and match patterns
- All files exist at specified paths
- Build passes: `npx nx build @hive-academy/langgraph-workflow-engine`
- Tests pass: `npx nx test @hive-academy/langgraph-workflow-engine --coverage`
- Coverage ≥ 80% overall, ≥ 90% for ToolRegistryService

**Return to orchestrator with**: "All 11 tasks completed and verified ✅"

---

## Task Consolidation Notes

**Merged Tasks** (tracking purposes only):

- Task 5 (shouldExecuteTools routing) → Merged into Task 4 (ToolNode injection)
- Task 9 (integration tests) → Merged into Task 8 (unit tests for tool binding)
- Task 11 (usage examples) → Merged into Task 10 (CLAUDE.md documentation)

**Effective Implementation Tasks**: 8 atomic tasks
**Tracking Tasks**: 11 total (3 merged)

This consolidation reflects the reality that some logical components are best implemented together rather than artificially split.
