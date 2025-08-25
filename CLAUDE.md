# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

### Core Purpose

This NestJS AI SaaS Starter is a sophisticated monorepo designed for building enterprise-grade AI-powered applications. It provides:

- **Vector Database Integration**: Semantic search and embeddings via ChromaDB
- **Graph Database Integration**: Complex relationship modeling with Neo4j
- **AI Agent Workflows**: Advanced workflow orchestration using LangGraph
- **Modular Architecture**: Specialized modules for memory, checkpointing, multi-agent coordination, and more

### Target Applications

- AI-powered SaaS platforms
- Document processing and analysis systems
- Knowledge management platforms
- Multi-agent AI systems
- Graph-based recommendation engines
- RAG (Retrieval-Augmented Generation) applications

## ⚠️ CRITICAL RULES

### 🔴 TOP PRIORITY RULES (VIOLATIONS = IMMEDIATE FAILURE)

1. **ALWAYS USE AGENTS**: Every user request MUST go through appropriate agent - NO EXCEPTIONS unless user explicitly confirms "quick fix"
2. **NEVER CREATE TYPES**: Search @hive-academy/shared FIRST, document search in progress.md, extend don't duplicate
3. **NO BACKWARD COMPATIBILITY**: Never work on or target backward compatibility unless verbally asked for by the user
4. **NO RE-EXPORTS**: Never re-export a type or service from a library inside another library

### ENFORCEMENT RULES

1. **Type Safety**: NO 'any' types - will fail code review
2. **Import Aliases**: Always use @hive-academy/\* paths
3. **File Limits**: Services < 200 lines, modules < 500 lines
4. **Agent Protocol**: Never skip main thread orchestration
5. **Progress Updates**: Per ⏰ Progress Rule (30 minutes)
6. **Quality Gates**: Must pass 10/10 (see full checklist)
7. **Branch Strategy**: Sequential by default (see Git Branch Operations)
8. **Error Context**: Always include relevant debugging info
9. **Testing**: 80% coverage minimum
10. **Type Discovery**: Per Type Search Protocol

## Technical Architecture

### Monorepo Structure (Nx-based)

This is an Nx monorepo organized into three main library categories:

#### Core Database Libraries (3)

1. **@hive-academy/nestjs-chromadb** - Vector database for semantic search
2. **@hive-academy/nestjs-neo4j** - Graph database for relationships
3. **@hive-academy/nestjs-langgraph** - AI workflow orchestration (core)

#### LangGraph Specialized Modules (7)

Located under `@libs/langgraph-modules/`:

1. **memory** - Contextual memory management for AI agents
2. **checkpoint** - State persistence and recovery
3. **functional-api** - Functional programming patterns
4. **multi-agent** - Multi-agent coordination
5. **platform** - LangGraph Platform integration
6. **time-travel** - Workflow debugging and history
7. **monitoring** - Production observability

### Library-Specific Documentation

Each library has its own comprehensive CLAUDE.md file with detailed guidance:

- **ChromaDB**: [libs/nestjs-chromadb/CLAUDE.md](./libs/nestjs-chromadb/CLAUDE.md)
  - Vector database patterns, embedding strategies, semantic search
- **Neo4j**: [libs/nestjs-neo4j/CLAUDE.md](./libs/nestjs-neo4j/CLAUDE.md)
  - Graph modeling, transaction patterns, Cypher optimization
- **LangGraph Core**: [libs/nestjs-langgraph/CLAUDE.md](./libs/nestjs-langgraph/CLAUDE.md)
  - Workflow orchestration, streaming, tool autodiscovery, HITL
- **Memory Module**: [libs/langgraph-modules/memory/CLAUDE.md](./libs/langgraph-modules/memory/CLAUDE.md)
  - Context management, summarization, retention policies
- **Checkpoint Module**: [libs/langgraph-modules/checkpoint/CLAUDE.md](./libs/langgraph-modules/checkpoint/CLAUDE.md)
  - State persistence, recovery, multi-backend storage
- **Functional API**: [libs/langgraph-modules/functional-api/CLAUDE.md](./libs/langgraph-modules/functional-api/CLAUDE.md)
  - Pure functions, immutability, pipeline composition
- **Multi-Agent**: [libs/langgraph-modules/multi-agent/CLAUDE.md](./libs/langgraph-modules/multi-agent/CLAUDE.md)
  - Agent coordination, network topology, communication
- **Platform**: [libs/langgraph-modules/platform/CLAUDE.md](./libs/langgraph-modules/platform/CLAUDE.md)
  - LangGraph Platform integration, hosted assistants
- **Time Travel**: [libs/langgraph-modules/time-travel/CLAUDE.md](./libs/langgraph-modules/time-travel/CLAUDE.md)
  - Workflow debugging, state history, replay mechanisms
- **Monitoring**: [libs/langgraph-modules/monitoring/CLAUDE.md](./libs/langgraph-modules/monitoring/CLAUDE.md)
  - Observability, metrics, production monitoring

## Common Development Commands

### Essential Build & Test Commands

```bash
# Build all libraries
npm run build:libs

# Build specific library
npx nx build nestjs-chromadb
npx nx build nestjs-neo4j
npx nx build nestjs-langgraph

# Run tests
npx nx test <project-name>              # Test specific project
npx nx run-many -t test                 # Test all projects
npx nx affected:test                    # Test affected projects only
npx nx test <project> --coverage        # Test with coverage
npx nx test <project> --watch           # Test in watch mode

# Run specific test file
npx nx test <project> --testPathPattern=<filename>

# Linting and formatting
npm run lint:fix                        # Fix linting issues across all projects
npm run format                          # Format all files with Prettier
npm run format:check                    # Check formatting without changes
npx nx run-many -t lint                 # Lint all projects
```

### Development Workflow

```bash
# Start development services (Neo4j, ChromaDB, Redis)
npm run dev:services

# Start the demo application
npx nx serve nestjs-ai-saas-starter-demo

# View service logs
npm run dev:logs

# Stop all services
npm run dev:stop

# Reset all data (clean slate)
npm run dev:reset
```

### Publishing Libraries

```bash
# Test publish process (dry run)
npm run publish:dry-run

# Build and publish all libraries
npm run publish:libs

# Version libraries
npm run version:libs

# Generate documentation
npm run docs:generate
```

## Cross-Library Integration Patterns

### 1. Vector + Graph Database Integration

```typescript
// Store embeddings in ChromaDB, relationships in Neo4j
@Injectable()
export class HybridSearchService {
  async searchWithContext(query: string) {
    // Semantic search via ChromaDB
    const vectorResults = await this.chromaDB.queryDocuments('knowledge', {
      queryTexts: [query],
      nResults: 10,
    });

    // Graph traversal via Neo4j for relationships
    const graphResults = await this.neo4j.run(
      `
      MATCH (d:Document)-[r:RELATED_TO]->(related:Document)
      WHERE d.embeddingId IN $ids
      RETURN related
    `,
      { ids: vectorResults.ids }
    );

    return { vectorResults, graphResults };
  }
}
```

### 2. LangGraph Workflow with All Modules

```typescript
@Workflow({
  name: 'comprehensive-ai-workflow',
  modules: ['memory', 'checkpoint', 'multi-agent', 'monitoring'],
})
export class ComprehensiveWorkflow extends DeclarativeWorkflowBase {
  // Leverages memory for context, checkpointing for persistence,
  // multi-agent for coordination, and monitoring for observability
}
```

### 3. RAG Pipeline with Full Stack

```typescript
@Injectable()
export class RAGPipelineService {
  async generateAnswer(query: string, userId: string) {
    // 1. Retrieve from memory module
    const memories = await this.memoryService.retrieveContext(userId);

    // 2. Vector search via ChromaDB
    const vectorContext = await this.chromaDB.queryDocuments('knowledge', {
      queryTexts: [query],
      nResults: 5,
    });

    // 3. Graph search via Neo4j
    const graphContext = await this.neo4j.getRelatedEntities(query);

    // 4. LangGraph workflow for generation
    const workflow = new RAGWorkflow();
    const result = await workflow.execute({
      query,
      memories,
      vectorContext,
      graphContext,
    });

    // 5. Store in memory for future context
    await this.memoryService.storeEntry({
      content: result.answer,
      metadata: { userId, query },
    });

    return result;
  }
}
```

## Architecture Principles

### SOLID Principles

- **Single Responsibility**: Each service has one clear purpose
- **Open/Closed**: Extensible via factory patterns and interfaces
- **Liskov Substitution**: All implementations honor contracts
- **Interface Segregation**: Focused interfaces for specific use cases
- **Dependency Inversion**: Depend on abstractions via NestJS DI

### Design Patterns

- **Module Pattern**: Consistent `forRoot()` / `forRootAsync()` configuration
- **Service Facade**: Simplified interfaces for complex operations
- **Strategy Pattern**: Multiple providers (embedding, storage, etc.)
- **Factory Pattern**: Dynamic service creation
- **Decorator Pattern**: Cross-cutting concerns (@Transactional, @Tool, etc.)

## Environment Configuration

### Required Services

- **Neo4j**: Graph database on ports 7687 (Bolt) and 7474 (Browser)
- **ChromaDB**: Vector database on port 8000
- **Redis**: Cache/session store on port 6379

### Critical Environment Variables

```bash
# AI Services
OPENAI_API_KEY=your_openai_key_here

# Database Connections
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password
CHROMADB_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379

# LangGraph Platform (optional)
LANGGRAPH_API_KEY=your_langgraph_key
LANGGRAPH_ENDPOINT=your_endpoint
```

## Development Guidelines

### Code Organization

- Use TypeScript strict mode throughout
- Follow NestJS naming conventions
- Implement proper error boundaries
- Add comprehensive logging for debugging
- Write unit tests for new features
- Document breaking changes in CHANGELOG

### Testing Strategy

- **Unit Tests**: Mock external dependencies, test individual services
- **Integration Tests**: Test with real services running in Docker
- **E2E Tests**: Full application workflow testing
- **Performance Tests**: Measure and optimize critical paths

### Git Workflow

- Conventional commits enforced via Husky hooks
- Format: `type(scope): description`
- Scopes: `chromadb`, `neo4j`, `langgraph`, `memory`, `checkpoint`, etc.
- Pre-commit: Linting and formatting
- Pre-push: Tests and build validation

## Key Value Propositions

- **Rapid Development**: Pre-built integrations eliminate boilerplate
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Scalable Architecture**: Nx monorepo with modular library design
- **Production Ready**: Docker deployment, health monitoring, enterprise patterns
- **AI-First Design**: Built specifically for AI-powered applications
- **Flexible Integration**: Mix and match libraries based on your needs

## Getting Help

For detailed implementation guidance, always refer to the specific library CLAUDE.md files listed above. Each contains comprehensive documentation tailored to that library's domain and patterns.

# Important Instructions

**Do what has been asked; nothing more, nothing less.**

- **NEVER create files unless they're absolutely necessary for achieving your goal**
- **ALWAYS prefer editing an existing file to creating a new one**
- **NEVER proactively create documentation files (\*.md) or README files unless explicitly requested**
- **Only use emojis if the user explicitly requests it**

For library-specific work, always consult the relevant CLAUDE.md file first to understand the domain-specific patterns and best practices.

### 🔴 FUNDAMENTAL OPERATING PRINCIPLE

**EVERY user request MUST be processed through the appropriate agent system. Direct implementation without agents is FORBIDDEN unless the user explicitly requests "no agents, quick fix only".**

### ✨ NEW: ORCHESTRATOR COMMAND

**All agent workflows are now managed through the `/orchestrate` slash command:**

```bash
# Start new task
/orchestrate implement user authentication system

# Continue existing task
/orchestrate TASK_CMD_009

# Continue last incomplete
/orchestrate continue
```

**Benefits:**

- Prevents memory leaks (sequential execution only)
- Enforces quality gates at each step
- Automates agent transitions
- Tracks progress automatically
- Validates all outputs

### 🔴 TYPE CREATION PRINCIPLE

**NEVER create new TypeScript types without FIRST searching @hive-academy/shared and documenting the search. Extend existing types rather than duplicating.**

---

## 🚨 CRITICAL WORKFLOW PROTOCOL

### ⚡ RULE #1: ALWAYS USE AGENTS

**MANDATORY**: For EVERY user request, no matter how simple, ALWAYS utilize the appropriate agent. Direct implementation without agents is FORBIDDEN except for explicit "quick fixes" confirmed by user.

### MANDATORY: Before ANY User Request

1. **Check Task Registry** (ALWAYS FIRST)

   ```bash
   # TASK REGISTRY CHECK PROTOCOL
   registry=$(cat task-tracking/registry.md)
   branch=$(git branch --show-current)
   status=$(git status --short)

   # TASK ANALYSIS
   incomplete_tasks=$(grep -E "🔄|⚠️|❌" registry.md)
   ```

2. **Present Context & Options**

   ```markdown
   📊 Current Context:

   - Branch: [current_branch]
   - Active Tasks: [count of incomplete]
   - Uncommitted: [X files]

   Options:

   1. Continue task → /orchestrate TASK\_[ID]
   2. Start new task → /orchestrate [description]
   3. Quick fix (no tracking) → Requires explicit confirmation

   Use the orchestrator command for all agent workflows.
   ```

3. **Route Decision**
   - Any Agent Task → Use `/orchestrate` command
   - New Task → `/orchestrate [task description]`
   - Continue Task → `/orchestrate TASK_[ID]`
   - Quick Fix → **ONLY IF** user explicitly confirms no agent needed

---

## 🤖 AGENT ORCHESTRATION

### 📌 AGENT SELECTION MATRIX (USE FOR EVERY REQUEST)

| User Request Type         | Required Agent                                    | Example Triggers                    |
| ------------------------- | ------------------------------------------------- | ----------------------------------- |
| "Implement X"             | project-manager → architect → developer           | Any new feature/component           |
| "Fix bug in X"            | project-manager → developer → tester              | Bug reports, issues                 |
| "Research how to X"       | researcher-expert → architect                     | Technical questions, best practices |
| "Review my code"          | code-reviewer                                     | Code quality checks                 |
| "Test X functionality"    | senior-tester                                     | Testing requests                    |
| "Plan architecture for X" | software-architect                                | Design questions                    |
| "Continue working on X"   | Check progress.md → last agent                    | Task continuation                   |
| "Quick syntax question"   | ASK USER: "Should I use researcher-expert agent?" | Simple queries                      |

**⚠️ DEFAULT RULE**: When uncertain, ALWAYS start with project-manager

### Core Principles

1. **Sequential Execution**: One agent at a time
2. **Central Control**: Claude Code orchestrates all interactions
3. **No Direct Communication**: Agents return to main thread
4. **Structured Returns**: Agents use delegation protocol

### Available Agents

| Agent              | Symbol | Primary Role              | Invocation Trigger |
| ------------------ | ------ | ------------------------- | ------------------ |
| project-manager    | 🪃     | Requirements, planning    | Complex tasks      |
| researcher-expert  | 🔎     | Technical research        | Knowledge gaps     |
| software-architect | 🏗️     | Design, subtask breakdown | After requirements |
| senior-developer   | 💻     | Implementation            | Execution phase    |
| senior-tester      | 🧪     | Testing, validation       | New components     |
| code-reviewer      | 🔍     | Quality assurance         | Before completion  |

### Delegation Protocol

```markdown
## DELEGATION REQUEST

**Next Agent**: [agent-name]
**Task**: [specific task]
**Artifacts**: [files to pass]
**Expected Outcome**: [deliverable]
```

### Sequential Workflow Pattern

```mermaid
User → Claude Code → Check Registry → Route
    ↓
project-manager → Returns delegation
    ↓
Claude Code → software-architect → Returns delegation
    ↓
Claude Code → senior-developer → Implements
    ↓
Claude Code → senior-tester → Tests
    ↓
Claude Code → code-reviewer → Final review
    ↓
Complete → Update Registry → Return to User
```

### 🎯 ORCHESTRATOR COMMAND WORKFLOW

All agent workflows are now managed through the `/orchestrate` command which ensures:

- Sequential execution (no memory leaks)
- Quality gate validation at each step
- Automatic agent transitions
- Progress tracking
- Standards enforcement

#### Using the Orchestrator

```bash
# Start a new task
/orchestrate implement WebSocket integration

# Continue an existing task
/orchestrate TASK_CMD_009

# Continue last incomplete task
/orchestrate continue
```

---

## 📁 TASK MANAGEMENT

### Task ID Format

`TASK_[DOMAIN]_[NUMBER]`

- **Domains**: CMD (command center), INT (integration), WF (workflow), BUG (fixes), DOC (documentation)
- **Number**: Sequential (001, 002, 003)

### Standard Folder Structure

```
task-tracking/
  TASK_[ID]/
    ├── task-description.md    # Requirements, metrics, risks
    ├── implementation-plan.md  # Technical design, subtasks
    ├── progress.md            # ⏰ PROGRESS RULE: Update every 30 minutes
    ├── code-review.md         # Quality validation
    └── completion-report.md   # Final metrics
```

### Git Branch Strategy

#### Sequential Branching (DEFAULT)

```bash
main
  └── feature/TASK_001-initial
      └── feature/TASK_002-enhancement  # Builds on 001
          └── feature/TASK_003-refinement  # Builds on 002
```

#### GIT BRANCH OPERATIONS REFERENCE

```bash
# New Task (from current branch)
git add . && git commit -m "chore: checkpoint"
git push origin $(git branch --show-current)
git checkout -b feature/TASK_[ID]-[description]
git push -u origin feature/TASK_[ID]-[description]

# Continue Task
git add . && git commit -m "chore: checkpoint"
git checkout feature/TASK_[ID]-[description]
git pull origin feature/TASK_[ID]-[description] --rebase

# Complete Task
git add . && git commit -m "feat(TASK_[ID]): [description]"
git push origin feature/TASK_[ID]-[description]
gh pr create --title "feat(TASK_[ID]): [description]"

# Subtask Checkpoint (per ⏰ Progress Rule)
git add [files] && git commit -m "feat(TASK_[ID]): complete [subtask]"
git push origin feature/TASK_[ID]-[description]
```

---
