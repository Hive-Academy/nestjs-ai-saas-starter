# CLAUDE.md

This file provides essential guidance for building enterprise-grade AI applications in this sophisticated NestJS monorepo.

## 🚨 CRITICAL OPERATING CONSTRAINTS

### 🔴 ABSOLUTE REQUIREMENTS (VIOLATIONS = IMMEDIATE FAILURE)

1. **MANDATORY AGENT WORKFLOW**: Every request MUST use `/orchestrate` command - NO direct implementation unless user explicitly confirms "quick fix only"
2. **TYPE REUSE PROTOCOL**: Search `@hive-academy/shared` FIRST, document search in progress.md, extend existing types never duplicate
3. **NO BACKWARD COMPATIBILITY**: Never target backward compatibility unless explicitly requested
4. **NO LIBRARY RE-EXPORTS**: Libraries must not re-export types/services from other libraries

### 🎯 QUALITY ENFORCEMENT

- **Type Safety**: Zero `any` types, strict TypeScript mode
- **Import Standards**: Always use `@hive-academy/*` alias paths  
- **Code Limits**: Services <200 lines, modules <500 lines, functions <30 lines
- **Test Coverage**: Minimum 80% across line/branch/function coverage
- **Progress Tracking**: Update progress.md every 30 minutes during active work

## 🏗️ PROJECT MENTAL MODEL

### What You're Building
**Enterprise AI SaaS Starter** - A production-ready foundation for AI-powered applications combining vector search, graph relationships, and intelligent workflows.

**Core Value Stack:**
- **Semantic Intelligence**: ChromaDB for vector/embedding operations
- **Relationship Intelligence**: Neo4j for complex data relationships  
- **Workflow Intelligence**: LangGraph for AI agent orchestration
- **Modular Intelligence**: Specialized modules for memory, checkpointing, multi-agent systems

### Architecture Overview
```
┌─ Core Foundation (3 libraries) ─┐    ┌─ Specialized Modules (7 libraries) ─┐
│ @hive-academy/nestjs-chromadb   │    │ memory      │ checkpoint            │
│ @hive-academy/nestjs-neo4j      │ ←→ │ multi-agent │ functional-api        │
│ @hive-academy/nestjs-langgraph  │    │ platform    │ time-travel           │
└─────────────────────────────────┘    │ monitoring  │                       │
                                       └───────────────────────────────────────┘
```

**Integration Pattern**: Libraries work together (ChromaDB + Neo4j + LangGraph) to create intelligent data flows where semantic search informs graph traversal which drives workflow decisions.

### Common Use Cases
- **RAG Applications**: Semantic search (ChromaDB) → Relationship context (Neo4j) → AI generation (LangGraph)
- **Knowledge Platforms**: Document vectors (ChromaDB) → Entity graphs (Neo4j) → Intelligent workflows (LangGraph)  
- **Multi-Agent Systems**: Distributed intelligence with shared memory, checkpointing, and coordination

## ⚡ WORKFLOW ENTRY POINT

### How to Start Any Work
**MANDATORY**: Use the orchestrator command for all development tasks:

```bash
# Start new task
/orchestrate implement user authentication system

# Continue existing task  
/orchestrate TASK_CMD_009

# Resume last incomplete task
/orchestrate continue
```

**Why This Matters**: The orchestrator ensures sequential agent execution, quality gates, progress tracking, and standards compliance. It prevents memory leaks and enforces the complete workflow from requirements through deployment.

**Never Skip**: Direct implementation without `/orchestrate` violates core operating constraints unless user explicitly confirms "quick fix only".

## 🎨 DEVELOPMENT STANDARDS

### Architecture Principles
- **SOLID Compliance**: Single responsibility, dependency inversion via NestJS DI
- **Module Boundaries**: Each library has clear domain focus, minimal coupling
- **Service Facades**: Simplified interfaces for complex operations
- **Strategy Patterns**: Multiple providers (embedding, storage, LLM) with factory selection

### Code Quality Standards  
- **TypeScript Strict Mode**: No implicit any, strict null checks, full type coverage
- **Testing Strategy**: Unit tests (mock external deps) + integration tests (real services) 
- **Error Handling**: Comprehensive error boundaries with contextual information
- **Performance**: Measure critical paths, optimize for production workloads

### Integration Patterns
- **Hybrid Intelligence**: Vector search (ChromaDB) informs graph traversal (Neo4j) drives workflows (LangGraph)
- **State Management**: Memory for context + checkpointing for persistence + monitoring for observability  
- **Cross-Library Communication**: Event-driven architecture with clear contracts

## 📚 LIBRARY NAVIGATION

### When to Use Each Library

**Decision Framework:**
- Need semantic search/embeddings? → **@hive-academy/nestjs-chromadb**
- Need relationship/graph data? → **@hive-academy/nestjs-neo4j**  
- Need AI workflows/agents? → **@hive-academy/nestjs-langgraph**
- Need specialized AI capabilities? → **@libs/langgraph-modules/[domain]**

### Library-Specific Documentation

**Core Libraries:**
- **ChromaDB**: `./libs/nestjs-chromadb/CLAUDE.md` - Vector operations, embedding strategies
- **Neo4j**: `./libs/nestjs-neo4j/CLAUDE.md` - Graph modeling, Cypher patterns
- **LangGraph**: `./libs/nestjs-langgraph/CLAUDE.md` - Workflow orchestration, streaming

**Specialized Modules:**
- **Memory**: `./libs/langgraph-modules/memory/CLAUDE.md` - Context management, retention
- **Checkpoint**: `./libs/langgraph-modules/checkpoint/CLAUDE.md` - State persistence, recovery  
- **Multi-Agent**: `./libs/langgraph-modules/multi-agent/CLAUDE.md` - Agent coordination
- **Monitoring**: `./libs/langgraph-modules/monitoring/CLAUDE.md` - Production observability
- **Platform/Functional-API/Time-Travel**: See respective CLAUDE.md files

## ⚙️ QUICK REFERENCE

### Essential Commands
```bash
# Development workflow
npm run dev:services              # Start Neo4j, ChromaDB, Redis
npx nx serve nestjs-ai-saas-starter-demo  # Start demo app
npm run dev:stop                  # Stop all services

# Build and test
npm run build:libs               # Build all libraries  
npx nx affected:test --coverage  # Test with coverage
npm run lint:fix                 # Fix linting issues
```

### Environment Requirements
```bash
# Required Services
NEO4J_URI=bolt://localhost:7687
CHROMADB_URL=http://localhost:8000  
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your_key_here
```

### Development Principles
- **File Creation**: Never create unless absolutely necessary, prefer editing existing
- **Documentation**: Never proactively create .md files unless explicitly requested
- **Scope**: Do what's asked, nothing more or less
- **Emojis**: Only use if user explicitly requests

---

## 📋 SUMMARY

**This monorepo provides enterprise-grade AI application foundations through:**
1. **Vector Intelligence** (ChromaDB) + **Graph Intelligence** (Neo4j) + **Workflow Intelligence** (LangGraph)
2. **Strict Quality Standards** with comprehensive testing and type safety  
3. **Agent-Driven Development** via `/orchestrate` command ensuring quality gates
4. **Modular Architecture** allowing mix-and-match based on specific needs

**Always start with `/orchestrate` for any development work. Consult library-specific CLAUDE.md files for detailed domain guidance.**
