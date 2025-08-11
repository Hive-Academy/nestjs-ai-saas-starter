# Project Structure & Organization

## Nx Monorepo Layout

```
├── apps/                           # Applications
│   ├── nestjs-ai-saas-starter-demo/    # Main NestJS application
│   └── nestjs-ai-saas-starter-demo-e2e/ # E2E tests
├── libs/                           # Reusable libraries
│   ├── nestjs-chromadb/               # ChromaDB integration library
│   ├── nestjs-langgraph/              # LangGraph workflow library
│   └── nestjs-neo4j/                  # Neo4j graph database library
├── docs/                           # Documentation
├── docker/                         # Docker configurations
├── .kiro/                          # Kiro AI assistant settings
├── .nx/                            # Nx cache and workspace data
└── node_modules/                   # Dependencies
```

## Library Architecture

### Core Integration Libraries
Each library follows NestJS module patterns with:
- **Dynamic Module Configuration**: `forRoot()` and `forRootAsync()` methods
- **Feature Modules**: `forFeature()` for specific configurations
- **Dependency Injection**: Custom decorators for service injection
- **Health Checks**: Built-in health indicators
- **TypeScript Support**: Full type definitions and interfaces

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

### Main Application Layout
```
apps/nestjs-ai-saas-starter-demo/
├── src/
│   ├── app/                        # Application modules
│   │   ├── app.module.ts           # Root application module
│   │   ├── app.controller.ts       # Main controller
│   │   └── app.service.ts          # Main service
│   └── main.ts                     # Application bootstrap
├── webpack.config.js               # Webpack configuration
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
import { ChromaDBModule } from '@anubis/nestjs-chromadb';
import { Neo4jModule } from '@anubis/nestjs-neo4j';
import { NestjsLanggraphModule } from '@anubis/nestjs-langgraph';
```

### Internal Imports
```typescript
// Relative imports within same library/app
import { SomeService } from './services/some.service';
import { SomeInterface } from '../interfaces/some.interface';
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
