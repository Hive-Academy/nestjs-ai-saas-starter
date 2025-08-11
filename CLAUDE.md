# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Essential Build & Test Commands
```bash
# Build all libraries
npm run build:libs

# Build specific library
npx nx build nestjs-chromadb
npx nx build nestjs-neo4j
npx nx build nestjs-langgraph
npx nx build shared

# Run tests
npx nx test <project-name>              # Test specific project
npx nx run-many -t test                  # Test all projects
npx nx affected:test                     # Test affected projects only
npx nx test <project> --coverage        # Test with coverage
npx nx test <project> --watch           # Test in watch mode

# Run specific test file
npx nx test <project> --testPathPattern=<filename>

# Linting and formatting
npm run lint:fix                         # Fix linting issues across all projects
npm run format                           # Format all files with Prettier
npm run format:check                     # Check formatting without changes
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

## High-Level Architecture

### Monorepo Structure (Nx-based)
This is an Nx monorepo with four publishable NPM libraries under the `@anubis` scope:

1. **@anubis/nestjs-chromadb** - Vector database integration for semantic search and embeddings
2. **@anubis/nestjs-neo4j** - Graph database integration for relationship modeling
3. **@anubis/nestjs-langgraph** - AI agent workflow orchestration using LangGraph
4. **@anubis/shared** - Shared types, interfaces, and utilities

### Library Architecture Patterns

#### Module Pattern
All libraries follow NestJS module pattern with:
- `forRoot()` for module initialization with configuration
- `forRootAsync()` for async configuration
- Service injection via decorators (`@InjectChromaDB()`, `@InjectNeo4j()`, etc.)

#### Service Abstraction
Each library provides:
- Core service for primary operations
- Health check service for monitoring
- Connection/client management
- Error handling utilities

### ChromaDB Library Architecture
- **EmbeddingService**: Manages multiple embedding providers (OpenAI, Cohere, HuggingFace, custom)
- **CollectionService**: Handles vector collection operations
- **ChromaDBService**: Main service for document operations, queries, and similarity search
- Uses strategy pattern for embedding provider selection

### Neo4j Library Architecture
- **Neo4jService**: Core service with connection pooling and query execution
- **Neo4jConnectionService**: Manages database connections and sessions
- **@Transactional()** decorator: Provides transaction support
- Query builder utilities for Cypher query construction

### LangGraph Library Architecture
- **Declarative workflow system** using decorators (`@Workflow`, `@Node`, `@Edge`)
- **Streaming support** with WebSocket integration
- **Human-in-the-loop (HITL)** capabilities with approval system
- **Tool registry** for dynamic tool discovery and registration
- **Compilation cache** for optimized workflow execution
- **Subgraph support** for modular workflow composition

Key components:
- `WorkflowGraphBuilderService`: Builds executable graphs from decorated classes
- `StreamingWorkflowService`: Handles real-time streaming of workflow execution
- `HumanApprovalService`: Manages HITL approval flows
- `ToolRegistryService`: Central registry for workflow tools

### Testing Strategy
- Unit tests: Mock external dependencies, test individual services
- Integration tests: Test with real services running in Docker
- E2E tests: Full application workflow testing
- Performance tests: Measure and optimize critical paths

### Configuration Management
- Environment-based configuration via `.env` files
- Module options interfaces for type-safe configuration
- Support for both sync and async module configuration
- Docker Compose for local development services

### Key Design Decisions
1. **Modular architecture**: Each library is self-contained and independently publishable
2. **Provider abstraction**: Support multiple AI/embedding providers without vendor lock-in
3. **Decorator-based APIs**: Intuitive, declarative interfaces following NestJS patterns
4. **Type safety**: Comprehensive TypeScript types and interfaces
5. **Health monitoring**: Built-in health checks for all external services
6. **Streaming-first**: Native support for real-time data streaming in workflows

### Database Services
- **Neo4j**: Graph database on port 7687 (Bolt) and 7474 (Browser)
- **ChromaDB**: Vector database on port 8000
- **Redis**: Cache/session store on port 6379

### Environment Variables
Critical environment variables that must be set:
- `OPENAI_API_KEY`: Required for OpenAI embeddings and LLM
- `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`: Neo4j connection
- `CHROMADB_URL`: ChromaDB connection
- `REDIS_URL`: Redis connection

### Git Workflow
- Conventional commits enforced via Husky hooks
- Format: `type(scope): description`
- Scopes: `chromadb`, `neo4j`, `langgraph`, `shared`, `deps`, `ci`, `docs`
- Pre-commit: Linting and formatting
- Pre-push: Tests and build validation

## Core Engineering Principles

### SOLID Principles
The codebase follows SOLID principles for maintainable, extensible code:
- **Single Responsibility**: Each service/class has one clear purpose
- **Open/Closed**: Use factory patterns and interfaces for extensibility
- **Liskov Substitution**: All implementations honor their interface contracts
- **Interface Segregation**: Focused interfaces for specific use cases
- **Dependency Inversion**: Depend on abstractions via NestJS DI

### Code Organization Standards
- **DRY**: Extract common functionality into shared services and base classes
- **KISS**: Clear method names, single-purpose methods, self-documenting code
- **Separation of Concerns**: Feature modules, repository pattern, service layer abstraction

### NestJS Best Practices
- Use dependency injection tokens for flexibility
- Group providers logically in module configuration
- Implement proper error handling with specific error types
- Use decorators for cross-cutting concerns (transactions, caching, logging)

### TypeScript Standards
- Explicit types and interfaces (avoid `any`)
- Constrained generics for type safety
- Comprehensive error handling with custom error classes
- Organized imports (node modules → internal libraries → relative imports)

### Testing Requirements
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies in unit tests
- Test edge cases and error conditions
- Maintain high test coverage for critical paths

### File Naming Conventions
```
*.service.ts        # Services
*.controller.ts     # Controllers
*.module.ts         # Modules
*.interface.ts      # Interfaces
*.dto.ts           # Data Transfer Objects
*.decorator.ts      # Custom decorators
*.spec.ts          # Test files
```

## Product Context

### Core Purpose
Building sophisticated AI agent workflows and applications with:
- **AI Agent Workflows**: Complex AI workflows using LangGraph with declarative patterns
- **Vector Database**: ChromaDB for semantic search and embeddings
- **Graph Database**: Neo4j for complex relationship modeling
- **Enterprise Features**: Production-ready with health checks, monitoring, Docker deployment

### Target Use Cases
- AI-powered SaaS applications
- Document processing and analysis systems
- Knowledge management platforms
- Intelligent automation workflows
- Multi-agent AI systems
- Graph-based recommendation engines

### Key Value Propositions
- **Rapid Development**: Pre-built integrations eliminate boilerplate
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Scalable Architecture**: Nx monorepo with modular library design
- **Production Ready**: Docker deployment, health monitoring, enterprise patterns
