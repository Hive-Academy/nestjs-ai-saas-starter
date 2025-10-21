# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS AI SaaS Starter - A sophisticated Nx monorepo for building enterprise-grade AI-powered applications with:

- **Vector Database**: Semantic search via ChromaDB
- **Graph Database**: Relationship modeling with Neo4j
- **AI Workflows**: LangGraph orchestration with 11 specialized modules
- **Target Apps**: AI SaaS platforms, document processing, knowledge management, multi-agent systems, RAG applications

## ⚠️ CRITICAL RULES

### 🔴 TOP PRIORITY (VIOLATIONS = IMMEDIATE FAILURE)

1. **IMPLEMENT REAL BUSINESS LOGIC**: Production-ready code using full stack (ChromaDB + Neo4j + LangGraph). NO stubs/simulations
2. **WIRE EVERYTHING TOGETHER**: Real data flows, embeddings, graph relationships, functional AI workflows
3. **TYPE DISCOVERY FIRST**: Search codebase for existing types before creating new ones
4. **ANTI-BACKWARD COMPATIBILITY**: Never create v1/v2/legacy versions or compatibility layers
5. **NO RE-EXPORTS**: Don't re-export types/services between libraries
6. **NO CODE DUPLICATION**: One authoritative implementation per feature
7. **DIRECT REPLACEMENT**: Modernize in-place, never create parallel versions

### 🔴 ANTI-BACKWARD COMPATIBILITY

**ZERO TOLERANCE**:

- ❌ Multiple versions (ServiceV1, ServiceV2, ServiceLegacy, ServiceEnhanced)
- ❌ Compatibility adapters, version bridges, migration layers
- ❌ Feature flags for version support
- ❌ Versioned files (service.v1.ts, api.legacy.js)
- ❌ Versioned API paths (/api/v1/, /api/v2/)
- ✅ Direct replacement only
- ✅ In-place modernization
- ✅ Single authoritative implementation

**Example**:

```typescript
// ✅ CORRECT: Direct replacement
export class UserService {
  /* updated implementation */
}

// ❌ FORBIDDEN: Versioned implementations
export class UserServiceV1 {
  /* old */
}
export class UserServiceV2 {
  /* new */
}
```

### 🔴 ENFORCEMENT RULES

1. Type Safety: NO 'any' types
2. Import Aliases: Always use @hive-academy/\* paths
3. Real Implementations: NO stubs/mocks in production
4. Full Stack Integration: ChromaDB + Neo4j + LangGraph
5. Quality Gates: Must pass all validation
6. Testing: 80% coverage minimum with real integrations

---

## Technical Architecture

### Monorepo Structure (Nx-based)

**Core Database Libraries (2)**:

1. @hive-academy/nestjs-chromadb - Vector database
2. @hive-academy/nestjs-neo4j - Graph database

**LangGraph Modules (11)** under @libs/langgraph-modules/:

1. core - Workflow interfaces, state management
2. memory - Contextual memory for agents
3. checkpoint - State persistence
4. functional-api - Functional programming patterns
5. multi-agent - Agent coordination
6. platform - LangGraph Platform integration
7. time-travel - Workflow debugging
8. monitoring - Production observability
9. hitl - Human-in-the-loop patterns
10. streaming - Real-time processing
11. workflow-engine - Central orchestration

**Library-Specific Docs**: Each library has comprehensive CLAUDE.md:

- libs/nestjs-chromadb/CLAUDE.md
- libs/nestjs-neo4j/CLAUDE.md
- libs/langgraph-modules/{module}/CLAUDE.md

**Consult library-specific CLAUDE.md files for detailed implementation patterns.**

---

## Essential Commands

### Build & Test

```bash
npm run build:libs                          # Build all libraries
npx nx build @hive-academy/nestjs-chromadb  # Build specific library
npx nx test <project>                       # Run tests
npx nx test <project> --coverage            # With coverage
npm run lint:fix                            # Fix linting
npm run format                              # Format code
```

### Development

```bash
npm run dev:services              # Start Neo4j, ChromaDB, Redis
npx nx serve nestjs-ai-saas-starter-demo  # Start demo app
npm run dev:logs                  # View logs
npm run dev:stop                  # Stop services
npm run dev:reset                 # Reset data
```

---

## 🎯 ORCHESTRATOR WORKFLOW

### Architecture: Hybrid Orchestrator-Executor Pattern

**Components**:

1. **Slash Command** (.claude/commands/orchestrate.md): Triggers workflow
2. **Main Thread (you)**: Execution engine implementing iterative loop
3. **Orchestrator Agent** (.claude/agents/workflow-orchestrator.md): GPS coordinator
   - Executes Phase 0 (git, task setup)
   - Analyzes task type, creates dynamic strategy
   - Provides turn-by-turn guidance
4. **Specialist Agents**: project-manager, researcher, architect, developers, testers, reviewers
5. **Validation Agent**: business-analyst (quality gates)

**Key Insight**: Agents return to main thread, NOT to other agents. Orchestrator = GPS, Main thread = driver.

### Execution Flow

```
User: /orchestrate [task]
  ↓
You: Invoke workflow-orchestrator
  ↓
Orchestrator: "Phase 0 ✅ + INVOKE project-manager"
  ↓
You: Invoke project-manager
  ↓
PM: Returns requirements
  ↓
You: Return to orchestrator with results
  ↓
Orchestrator: "INVOKE business-analyst for validation"
  ↓
You: Invoke business-analyst
  ↓
BA: APPROVED ✅
  ↓
You: Return to orchestrator
  ↓
Orchestrator: "INVOKE software-architect"
  ↓
... repeat until "WORKFLOW COMPLETE"
```

### Dynamic Task-Type Strategies

- **FEATURE**: PM → Research → Architect → Dev → Test → Review → Modernization
- **BUGFIX**: Dev → Test → Review (skip planning)
- **REFACTORING**: Architect → Dev → Test → Review
- **DOCUMENTATION**: PM → Dev → Review
- **RESEARCH**: Researcher → conditional implementation

### Usage

```bash
/orchestrate implement WebSocket integration    # New feature
/orchestrate fix auth token bug                 # Bug fix
/orchestrate refactor user service              # Refactoring
/orchestrate TASK_2025_001                      # Continue task
```

**Workflow Steps**:

1. You receive command → invoke workflow-orchestrator
2. Orchestrator returns: "NEXT ACTION: INVOKE [agent] with [prompt]"
3. You invoke recommended agent
4. Agent returns results
5. You return to orchestrator with results
6. Repeat until "WORKFLOW COMPLETE"

---

## 🚨 WORKFLOW PROTOCOL

### Before ANY Request

1. **Check Registry**: `cat task-tracking/registry.md`
2. **Present Context**: Show active/pending/complete tasks
3. **Route Decision**:
   - Complex work → `/orchestrate [description]`
   - Continue task → `/orchestrate TASK_2025_XXX`
   - Quick fix → Only if user confirms

### Agent Selection Matrix

| Request Type | Agent Path                        | Trigger             |
| ------------ | --------------------------------- | ------------------- |
| Implement X  | project-manager → architect → dev | New features        |
| Fix bug      | dev → test → review               | Bug reports         |
| Research X   | researcher-expert → architect     | Technical questions |
| Review code  | code-reviewer                     | Quality checks      |
| Test X       | senior-tester                     | Testing             |
| Architecture | software-architect                | Design              |

**Default**: When uncertain, use `/orchestrate`

---

## 📁 Task Management

### Task ID Format

`TASK_YYYY_NNN` - Sequential format (TASK_2025_001, TASK_2025_002, etc.)

### Folder Structure

```
task-tracking/
  TASK_[ID]/
    ├── context.md            # User intent, conversation summary
    ├── task-description.md   # Requirements
    ├── implementation-plan.md # Design
    ├── progress.md           # Progress tracking
    ├── test-report.md        # Testing
    ├── code-review.md        # Review
    └── future-enhancements.md # Future work
```

### Git Operations

```bash
# New task (orchestrator handles this)
git checkout -b feature/XXX
git push -u origin feature/XXX

# Continue task
git checkout feature/XXX
git pull origin feature/XXX --rebase

# Complete task (orchestrator handles this)
gh pr create --title "feat(TASK_XXX): description"
```

---

## Environment Configuration

### Required Services

- Neo4j: ports 7687 (Bolt), 7474 (Browser)
- ChromaDB: port 8000
- Redis: port 6379

### Environment Variables

```bash
OPENAI_API_KEY=your_key
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
CHROMADB_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379
```

---

## Architecture Principles

### SOLID

- Single Responsibility, Open/Closed, Liskov Substitution
- Interface Segregation, Dependency Inversion

### Design Patterns

- Module Pattern: forRoot() / forRootAsync()
- Service Facade, Strategy, Factory, Decorator

### Integration Example

```typescript
@Injectable()
export class RAGPipelineService {
  async generateAnswer(query: string, userId: string) {
    // 1. Memory retrieval
    const memories = await this.memoryService.retrieveContext(userId);

    // 2. Vector search (ChromaDB)
    const vectorContext = await this.chromaDB.queryDocuments('knowledge', {
      queryTexts: [query],
      nResults: 5,
    });

    // 3. Graph search (Neo4j)
    const graphContext = await this.neo4j.getRelatedEntities(query);

    // 4. LangGraph workflow
    const workflow = new RAGWorkflow();
    return await workflow.execute({ query, memories, vectorContext, graphContext });
  }
}
```

---

## Development Guidelines

- TypeScript strict mode
- NestJS naming conventions
- Comprehensive logging
- 80% test coverage
- Real integrations (no mocks in production)
- Conventional commits: `type(scope): description`

---

## Key Principles

1. **Real Implementation**: Zero tolerance for stubs/placeholders
2. **Full Stack**: ChromaDB + Neo4j + LangGraph integration
3. **Type Safety**: Search before creating types
4. **Direct Replacement**: No backward compatibility
5. **Registry-First**: Track all work in task-tracking/
6. **Agent Pattern**: All agents return to main thread
7. **Dynamic Workflows**: Task-type determines agent sequence

---

## 🔴 FUNDAMENTAL OPERATING PRINCIPLE

**IMPLEMENT REAL SOLUTIONS DIRECTLY** when you have infrastructure and context. Use `/orchestrate` for complex multi-phase work requiring specialized agents.

---

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->
