# Technology Stack & Build System

## Build System

- **Nx Monorepo**: Version 21.4.1 with workspace management
- **TypeScript**: Version 5.8.2 with strict mode enabled
- **Node.js**: Target version 18+ (ES2022 compilation target)
- **Package Manager**: npm with workspaces support

## Core Framework

- **NestJS**: Version 11+ with dependency injection and modular architecture
- **Express**: Platform adapter for HTTP server
- **Webpack**: Module bundling with SWC compilation
- **Jest**: Testing framework with SWC transformation

## AI & Database Stack

- **LangGraph**: AI agent workflow orchestration with streaming capabilities (version 0.4.3)
- **LangChain Core**: Core LangChain functionality (version 0.3.68)
- **LangChain Providers**: OpenAI (0.6.7), Anthropic (0.3.26), Google GenAI (0.2.16)
- **LangChain Checkpoints**: Checkpoint management (0.1.0) and SQLite checkpoints (0.2.0)
- **ChromaDB**: Vector database for embeddings and semantic search (version 3.0.11)
- **Neo4j**: Graph database (version 5.28.1) for relationship modeling
- **Redis**: Caching and session management
- **AI Providers**: OpenAI (5.12.2), Cohere (7.18.0), HuggingFace Inference (4.6.1)

## Development Tools

- **ESLint**: Code linting with TypeScript ESLint integration
- **Prettier**: Code formatting with consistent style
- **SWC**: Fast TypeScript/JavaScript compilation
- **Docker**: Containerized development environment

## Common Commands

### Development

```bash
# Start API server
npm run api

# Start frontend application (ai-saas-frontend)
npm start

# Start only database services
npm run dev:services

# Start API locally (after databases are running)
nx serve dev-brand-api

# Stop all Docker services
npm run dev:stop

# Reset all data (clean slate)
npm run dev:reset

# View service logs
npm run dev:logs
```

### Building & Testing

```bash
# Build specific project
nx build <project-name>

# Test specific project
nx test <project-name>

# Lint specific project
nx lint <project-name>

# Build all projects
nx run-many -t build

# Test all projects
nx run-many -t test
```

### Library Development

```bash
# Generate new library
nx g @nx/node:lib <lib-name>

# Generate new NestJS application
nx g @nx/nest:app <app-name>

# Show project dependencies
nx graph

# Show project details
nx show project <project-name>
```

### Library Publishing

```bash
# Build all publishable libraries
npm run build:libs

# Test publishing (dry run)
npm run publish:dry-run

# Publish libraries to NPM
npm run publish:libs

# Version libraries using conventional commits
npm run version:libs

# Full release process
npm run publish:release
```

### Documentation

```bash
# Generate API documentation
npm run docs:generate

# Serve documentation locally
npm run docs:serve

# Build complete documentation site
npm run docs:build-site
```

### Production Deployment

```bash
# Build production Docker image
docker build -f docker/Dockerfile -t hive-academy-agent:latest .

# Run production stack
docker compose -f docker-compose.yml up -d

# Run production stack (alternative)
npm run docker:prod
```

## Environment Configuration

- **Development**: Uses `.env` file with local database connections
- **Production**: Uses `.env.production` with Docker service names
- **Required Variables**: NEO4J_URI, CHROMADB_URL, REDIS_URL, LLM API keys

## Module Architecture

- **Apps**: Main applications (dev-brand-api, devbrand-ui)
- **Core Libs**: Published libraries (nestjs-chromadb, nestjs-langgraph, nestjs-neo4j)
- **LangGraph Modules**: Specialized modules (checkpoint, time-travel, multi-agent, functional-api, memory, monitoring, platform, streaming, workflow-engine, hitl, core, memory)
- **Dev Brand**: Backend libraries (data-access, feature)
- **Shared**: Common TypeScript configuration and utilities
