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

## Technical Architecture

### Monorepo Structure (Nx-based)
This is an Nx monorepo organized into three main library categories:

#### Core Database Libraries (3)
1. **@hive-academy/nestjs-chromadb** - Vector database for semantic search
2. **@hive-academy/nestjs-neo4j** - Graph database for relationships
3. **@anubis/nestjs-langgraph** - AI workflow orchestration (core)

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
      queryTexts: [query], nResults: 10
    });
    
    // Graph traversal via Neo4j for relationships
    const graphResults = await this.neo4j.run(`
      MATCH (d:Document)-[r:RELATED_TO]->(related:Document)
      WHERE d.embeddingId IN $ids
      RETURN related
    `, { ids: vectorResults.ids });
    
    return { vectorResults, graphResults };
  }
}
```

### 2. LangGraph Workflow with All Modules
```typescript
@Workflow({
  name: 'comprehensive-ai-workflow',
  modules: ['memory', 'checkpoint', 'multi-agent', 'monitoring']
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
      queryTexts: [query], nResults: 5
    });
    
    // 3. Graph search via Neo4j
    const graphContext = await this.neo4j.getRelatedEntities(query);
    
    // 4. LangGraph workflow for generation
    const workflow = new RAGWorkflow();
    const result = await workflow.execute({
      query, memories, vectorContext, graphContext
    });
    
    // 5. Store in memory for future context
    await this.memoryService.storeEntry({
      content: result.answer,
      metadata: { userId, query }
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
- **NEVER proactively create documentation files (*.md) or README files unless explicitly requested**
- **Only use emojis if the user explicitly requests it**

For library-specific work, always consult the relevant CLAUDE.md file first to understand the domain-specific patterns and best practices.

## Specialized Agent System

This project includes a sophisticated agent system in `.claude/agents/` designed to streamline development workflows. **Always utilize these agents proactively for development tasks** unless the user specifically requests otherwise.

### Available Specialized Agents

#### 🎯 **kiro-orchestrator** - Project Workflow Orchestration
**Use for:** Managing spec-driven development lifecycle, coordinating multi-phase projects
```bash
# When to use: Complex features requiring requirements → design → implementation workflow
# Capabilities: Spec management, agent coordination, task tracking, phase transitions
```

#### 🏗️ **design-agent** - Technical Architecture Design
**Use for:** Creating system architectures, data models, API contracts
```bash
# When to use: New features, architectural decisions, system design
# Capabilities: Microservices design, AI/ML architectures, database schemas, integration patterns
```

#### ⚙️ **implementation-agent** - Code Implementation
**Use for:** Transforming designs into working code following NestJS patterns
```bash
# When to use: Feature implementation, code generation, NestJS development
# Capabilities: Service creation, module setup, TypeScript implementation, testing
```

#### 📚 **nx-library-agent** - Monorepo Management
**Use for:** Library operations, Nx workspace management, build optimization
```bash
# When to use: Creating libraries, managing dependencies, publishing packages
# Capabilities: Library creation, dependency management, build optimization, publishing
```

#### 🤖 **langgraph-workflow-agent** - AI Workflow Orchestration
**Use for:** LangGraph workflows, multi-agent systems, streaming implementations
```bash
# When to use: AI agent workflows, complex orchestrations, streaming features
# Capabilities: Workflow design, agent patterns, streaming, HITL implementations
```

#### 📋 **requirements-agent** - Requirements Analysis
**Use for:** Analyzing user stories, extracting acceptance criteria, requirements validation
```bash
# When to use: Feature planning, requirement clarification, spec creation
# Capabilities: User story analysis, acceptance criteria, requirements validation
```

#### 🔄 **resume-workflow-agent** - Project Context Recovery
**Use for:** Understanding existing context, resuming interrupted work
```bash
# When to use: Starting work on existing features, understanding project state
# Capabilities: Context analysis, state recovery, workflow continuation
```

### Agent Utilization Guidelines

#### 🎯 **Proactive Agent Usage**
Always use agents proactively based on the task type:

1. **For New Features**: Start with `kiro-orchestrator` or `requirements-agent`
2. **For Architecture Work**: Use `design-agent`
3. **For Implementation**: Use `implementation-agent`
4. **For Library Operations**: Use `nx-library-agent`
5. **For AI Workflows**: Use `langgraph-workflow-agent`
6. **When Resuming Work**: Use `resume-workflow-agent`

#### 📋 **Task-Based Agent Selection Matrix**

| Task Type | Primary Agent | Supporting Agents |
|-----------|---------------|-------------------|
| New Feature Development | `kiro-orchestrator` | `requirements-agent` → `design-agent` → `implementation-agent` |
| Library Creation | `nx-library-agent` | `design-agent` → `implementation-agent` |
| AI Workflow Implementation | `langgraph-workflow-agent` | `design-agent` → `implementation-agent` |
| Bug Fixes | `implementation-agent` | `resume-workflow-agent` |
| Architecture Updates | `design-agent` | `implementation-agent` |
| Requirements Analysis | `requirements-agent` | `design-agent` |
| Code Refactoring | `implementation-agent` | `nx-library-agent` |

#### 🔄 **Agent Workflow Patterns**

**Pattern 1: Full Feature Development**
```
requirements-agent → design-agent → implementation-agent → nx-library-agent
```

**Pattern 2: AI Workflow Development**
```
requirements-agent → langgraph-workflow-agent → implementation-agent
```

**Pattern 3: Library Enhancement**
```
resume-workflow-agent → nx-library-agent → implementation-agent
```

#### 💡 **Agent Usage Examples**

**Example 1: Adding Vector Search Feature**
```typescript
// 1. Use requirements-agent to analyze user stories
// 2. Use design-agent to architect vector search system
// 3. Use langgraph-workflow-agent for AI workflow patterns
// 4. Use implementation-agent for NestJS implementation
// 5. Use nx-library-agent for library integration
```

**Example 2: Creating New LangGraph Module**
```typescript
// 1. Use nx-library-agent to create module structure
// 2. Use langgraph-workflow-agent for workflow patterns
// 3. Use design-agent for module architecture
// 4. Use implementation-agent for service creation
```

**Example 3: Fixing Integration Issues**
```typescript
// 1. Use resume-workflow-agent to understand context
// 2. Use implementation-agent for code fixes
// 3. Use nx-library-agent for dependency resolution
```

### 🚀 **Best Practices for Agent Usage**

1. **Always Start with Context**: Use `resume-workflow-agent` when working on existing features
2. **Use Orchestrator for Complex Tasks**: Leverage `kiro-orchestrator` for multi-phase development
3. **Combine Agents Effectively**: Use multiple agents in sequence for comprehensive solutions
4. **Library-First Approach**: Use `nx-library-agent` for any library-related operations
5. **AI-Specific Tasks**: Always use `langgraph-workflow-agent` for LangGraph-related implementations

### 🎯 **Default Agent Selection Logic**

When in doubt, follow this decision tree:

```
Is it a new feature? → kiro-orchestrator
Is it library-related? → nx-library-agent
Is it AI workflow-related? → langgraph-workflow-agent
Is it implementation? → implementation-agent
Is it architecture? → design-agent
Need to understand context? → resume-workflow-agent
Need requirements analysis? → requirements-agent
```

**Remember: The agent system is designed to accelerate development and ensure consistency. Use them proactively to leverage their specialized expertise and maintain project quality standards.**