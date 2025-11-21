---
trigger: always_on
---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## **IMPORTANT**: There's a file modification bug in Claude Code. The workaround is: always use complete absolute Windows paths with drive letters and backslashes for ALL file operations. Always use full paths for all of our Read/Write/Modify operations

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
4. **Team Leader Agent** (.claude/agents/team-leader.md): Task decomposition & assignment coordinator
   - DECOMPOSITION mode: Breaks implementation plans into atomic tasks
   - ASSIGNMENT mode: Assigns tasks to developers with git verification
   - COMPLETION mode: Validates all tasks complete, triggers final review
5. **Specialist Agents**: project-manager, researcher, architect, developers, testers, reviewers
6. **Validation Agent**: business-analyst (quality gates)

**Key Insight**: Agents return to main thread, NOT to other agents. Orchestrator = GPS, Team Leader = project manager, Main thread = driver.

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
You: Invoke software-architect
  ↓
Architect: Returns implementation-plan.md
  ↓
You: Return to orchestrator with results
  ↓
Orchestrator: "INVOKE team-leader"
  ↓
You: Invoke team-leader (DECOMPOSITION mode)
  ↓
Team Leader: Creates tasks.md with atomic tasks
  ↓
You: Return to orchestrator
  ↓
Orchestrator: "INVOKE team-leader (ASSIGNMENT)"
  ↓
You: Invoke team-leader (ASSIGNMENT mode)
  ↓
Team Leader: "ASSIGN TASK [N] to senior-developer"
  ↓
You: Invoke senior-developer with task
  ↓
Developer: Implements code
  ↓
You: Verify git commit exists
  ↓
You: Return to team-leader with results
  ↓
Team Leader: Updates tasks.md, assigns next task OR "COMPLETION"
  ↓
... repeat assignment loop until all tasks complete
  ↓
You: Return to orchestrator
  ↓
Orchestrator: "INVOKE senior-tester"
  ↓
... continue until "WORKFLOW COMPLETE"
```

### Dynamic Task-Type Strategies

- **FEATURE**: PM → Research → Architect → Team Leader (Decomposition) → Team Leader (Assignment Loop) → Test → Review → Modernization
- **BUGFIX**: Team Leader (Decomposition) → Team Leader (Assignment Loop) → Test → Review
- **REFACTORING**: Architect → Team Leader (Decomposition) → Team Leader (Assignment Loop) → Test → Review
- **DOCUMENTATION**: PM → Team Leader (Decomposition) → Team Leader (Assignment Loop) → Review
- **RESEARCH**: Researcher → conditional implementation (Team Leader if code needed)

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
6. **Team Leader Iterative Loop** (when in ASSIGNMENT mode):
   - Team Leader assigns task to developer
   - You invoke developer with task details
   - Developer implements and commits code
   - You verify git commit exists before returning to Team Leader
   - Team Leader updates tasks.md and assigns next task OR signals COMPLETION
   - Repeat until all tasks complete
7. Repeat orchestrator loop until "WORKFLOW COMPLETE"

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

| Request Type | Agent Path                                      | Trigger             |
| ------------ | ----------------------------------------------- | ------------------- |
| Implement X  | project-manager → architect → team-leader → dev | New features        |
| Fix bug      | team-leader → dev → test → review               | Bug reports         |
| Research X   | researcher-expert → architect                   | Technical questions |
| Review code  | code-reviewer                                   | Quality checks      |
| Test X       | senior-tester                                   | Testing             |
| Architecture | software-architect                              | Design              |

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
    ├── tasks.md              # Atomic task breakdown & assignments (team-leader managed)
    ├── test-report.md        # Testing
    ├── code-review.md        # Review
    └── future-enhancements.md # Future work
```

### Git Operations & Commit Standards

**CRITICAL**: All commits MUST follow commitlint rules to pass pre-commit hooks.

#### Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

#### Allowed Types (REQUIRED)

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, no logic change)
- `refactor`: Code restructuring (no bug fix or feature)
- `perf`: Performance improvements
- `test`: Adding/updating tests
- `build`: Build system/dependency changes
- `ci`: CI configuration changes
- `chore`: Maintenance tasks (no src/test changes)
- `revert`: Revert previous commit

#### Allowed Scopes (REQUIRED)

- `chromadb`: ChromaDB library changes
- `neo4j`: Neo4j library changes
- `langgraph`: LangGraph modules changes
- `deps`: Dependency updates
- `release`: Release-related changes
- `ci`: CI/CD changes
- `docs`: Documentation changes
- `hooks`: Git hooks changes
- `scripts`: Script changes
- `angular-3d`: Angular 3D UI changes

#### Commit Rules (ENFORCED)

- ✅ Type: lowercase, required, from allowed list
- ✅ Scope: lowercase, required, from allowed list
- ✅ Subject:
  - lowercase only (NOT Sentence-case, Start-case, UPPER-CASE)
  - 3-72 characters
  - No period at end
  - Imperative mood ("add" not "added")
- ✅ Header: max 100 characters total
- ✅ Body/Footer lines: max 100 characters each

#### Valid Examples

```bash
feat(chromadb): add semantic search for documents
fix(neo4j): resolve connection timeout issue
docs(langgraph): update workflow examples
refactor(hooks): simplify pre-commit validation
chore(deps): update langchain to v0.3.30
```

#### Invalid Examples (WILL FAIL)

```bash
❌ "Feature: Add search" # Wrong type, wrong case
❌ "feat: Add search"    # Missing scope
❌ "feat(search): Add search" # Invalid scope, wrong case
❌ "feat(chromadb): Add search." # Period at end
❌ "feat(chromadb): Add Search" # Uppercase in subject
```
