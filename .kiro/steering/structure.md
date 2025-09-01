# Project Structure & Organization

## Nx Monorepo Layout

```
├── apps/                           # Applications
│   ├── dev-brand-api/                  # Main NestJS API application
│   └── devbrand-ui/                    # Angular frontend application
├── libs/                           # Reusable libraries
│   ├── nestjs-chromadb/               # ChromaDB integration library (@hive-academy/nestjs-chromadb)
│   ├── nestjs-langgraph/              # LangGraph workflow library (@hive-academy/nestjs-langgraph)
│   ├── nestjs-neo4j/                  # Neo4j graph database library (@hive-academy/nestjs-neo4j)
│   ├── langgraph-modules/             # LangGraph specialized modules
│   │   ├── checkpoint/                # Checkpoint functionality
│   │   ├── core/                      # Core LangGraph utilities
│   │   ├── functional-api/            # Functional API patterns
│   │   ├── hitl/                      # Human-in-the-loop capabilities
│   │   ├── memory/                    # Memory management
│   │   ├── monitoring/                # Workflow monitoring
│   │   ├── multi-agent/               # Multi-agent systems
│   │   ├── memory/             # NestJS memory integration
│   │   ├── platform/                  # Platform utilities
│   │   ├── streaming/                 # Streaming capabilities
│   │   ├── time-travel/               # Time-travel debugging
│   │   └── workflow-engine/           # Workflow engine
│   └── dev-brand/                     # Dev Brand specific libraries
│       └── backend/                   # Backend libraries
│           ├── data-access/           # Data access layer
│           └── feature/               # Feature modules
├── docs/                           # Documentation
├── docker/                         # Docker configurations
├── .kiro/                          # Kiro AI assistant settings
├── .nx/                            # Nx cache and workspace data
└── node_modules/                   # Dependencies
```

## Library Architecture

### Core Integration Libraries

The three published libraries (@hive-academy scope) follow NestJS module patterns with:

- **Dynamic Module Configuration**: `forRoot()` and `forRootAsync()` methods
- **Feature Modules**: `forFeature()` for specific configurations
- **Dependency Injection**: Custom decorators for service injection
- **Health Checks**: Built-in health indicators
- **TypeScript Support**: Full type definitions and interfaces

### LangGraph Modules Ecosystem

The `libs/langgraph-modules/` directory contains specialized modules for AI workflow functionality:

- **checkpoint/**: Workflow state persistence and recovery
- **core/**: Fundamental LangGraph utilities and abstractions
- **functional-api/**: Functional programming patterns for workflows
- **hitl/**: Human-in-the-loop interaction capabilities
- **memory/**: Memory management and context handling
- **monitoring/**: Workflow execution monitoring and observability
- **multi-agent/**: Multi-agent coordination and communication
- **memory/**: NestJS-specific memory integration
- **platform/**: Platform-specific utilities and adapters
- **streaming/**: Real-time streaming and WebSocket support
- **time-travel/**: Debugging with state time-travel capabilities
- **workflow-engine/**: Core workflow execution engine

### Dev Brand Libraries

Domain-specific libraries for the Dev Brand application:

- **data-access/**: Repository patterns and database access
- **feature/**: Business logic and feature implementations

### Library Structure Pattern

```
libs/<library-name>/
├── src/
│   ├── lib/                        # Core library code
│   │   ├── <library-name>.module.ts    # Main module
│   │   ├── services/               # Service implementations
│   │   ├── decorators/             # Custom decorators
│   │   ├── interfaces/             # TypeScript interfaces
│   │   └── index.ts                # Public API exports
│   └── index.ts                    # Library entry point
├── README.md                       # Comprehensive documentation
├── package.json                    # Library-specific dependencies
├── project.json                    # Nx project configuration
└── tsconfig.*.json                 # TypeScript configurations
```

## Application Structure

### API Application Layout

```
apps/dev-brand-api/
├── src/
│   ├── app/                        # Application modules
│   │   ├── app.module.ts           # Root application module
│   │   ├── app.controller.ts       # Main controller
│   │   └── app.service.ts          # Main service
│   └── main.ts                     # Application bootstrap
├── webpack.config.js               # Webpack configuration
└── tsconfig.app.json               # App-specific TypeScript config
```

### Frontend Application Layout

```
apps/devbrand-ui/
├── src/
│   ├── app/                        # Angular application modules
│   │   ├── app.component.ts        # Root component
│   │   ├── app.module.ts           # Root module
│   │   └── app.routes.ts           # Application routes
│   ├── assets/                     # Static assets
│   └── main.ts                     # Application bootstrap
├── angular.json                    # Angular configuration
├── tailwind.config.js              # Tailwind CSS configuration
└── tsconfig.app.json               # App-specific TypeScript config
```

## Configuration Files

### Root Level Configuration

- **nx.json**: Nx workspace configuration with plugins and targets
- **package.json**: Root dependencies and npm scripts
- **tsconfig.base.json**: Base TypeScript configuration
- **eslint.config.mjs**: ESLint configuration
- **jest.config.ts**: Jest testing configuration
- **.prettierrc**: Code formatting rules

### Docker Configuration

- **docker-compose.dev.yml**: Development services (Neo4j, ChromaDB, Redis)
- **docker-compose.yml**: Production deployment configuration
- **docker/Dockerfile**: Production application container

## Development Patterns

### Module Organization

- **Feature Modules**: Group related functionality (e.g., user management, workflow processing)
- **Shared Modules**: Common utilities and services
- **Integration Modules**: Database and external service connections

### Service Patterns

- **Repository Pattern**: Data access abstraction
- **Factory Pattern**: Dynamic service creation
- **Decorator Pattern**: Cross-cutting concerns (transactions, caching, logging)

### File Naming Conventions

- **Modules**: `*.module.ts`
- **Services**: `*.service.ts`
- **Controllers**: `*.controller.ts`
- **Interfaces**: `*.interface.ts`
- **DTOs**: `*.dto.ts`
- **Decorators**: `*.decorator.ts`
- **Tests**: `*.spec.ts` or `*.test.ts`

## Import Path Conventions

### Library Imports

```typescript
// Import from published libraries
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';
import { NestjsLanggraphModule } from '@hive-academy/nestjs-langgraph';
```

### LangGraph Modules Imports

```typescript
// Import from LangGraph modules (workspace internal)
import { CheckpointService } from '@libs/langgraph-modules/checkpoint';
import { MultiAgentCoordinator } from '@libs/langgraph-modules/multi-agent';
import { WorkflowEngine } from '@libs/langgraph-modules/workflow-engine';
import { NestjsMemoryModule } from '@libs/langgraph-modules/memory';
```

### Internal Imports

```typescript
// Relative imports within same library/app
import { SomeService } from './services/some.service';
import { SomeInterface } from '../interfaces/some.interface';

// Dev Brand library imports
import { DataAccessModule } from '@libs/dev-brand/backend/data-access';
import { FeatureModule } from '@libs/dev-brand/backend/feature';
```

## Documentation Standards

### README Structure

Each library includes comprehensive documentation with:

- **Installation instructions**
- **Quick start guide**
- **API reference**
- **Examples and usage patterns**
- **Configuration options**
- **Best practices**

### Code Documentation

- **JSDoc comments** for all public APIs
- **Interface documentation** with property descriptions
- **Example usage** in method comments
- **Type annotations** for all parameters and return values

## Testing Organization

### Test Structure

```
src/
├── lib/
│   ├── services/
│   │   ├── example.service.ts
│   │   └── example.service.spec.ts    # Unit tests
│   └── integration/
│       └── example.integration.spec.ts # Integration tests
```

### Test Categories

- **Unit Tests**: Individual service and component testing
- **Integration Tests**: Database and external service integration
- **E2E Tests**: Full application workflow testing
