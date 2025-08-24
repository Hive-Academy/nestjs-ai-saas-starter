# Technology Stack & Build System

## Build System

- **Nx Monorepo**: Version 21.3.11 with workspace management
- **TypeScript**: Version 5.8.2 with strict mode enabled
- **Node.js**: Target version 18+ (ES2022 compilation target)
- **Package Manager**: npm with workspaces support

## Core Framework

- **NestJS**: Version 11+ with dependency injection and modular architecture
- **Express**: Platform adapter for HTTP server
- **Webpack**: Module bundling with SWC compilation
- **Jest**: Testing framework with SWC transformation

## AI & Database Stack

- **LangGraph**: AI agent workflow orchestration with streaming capabilities
- **ChromaDB**: Vector database for embeddings and semantic search
- **Neo4j**: Graph database (version 5.26-community) for relationship modeling
- **Redis**: Caching and session management

## Development Tools

- **ESLint**: Code linting with TypeScript ESLint integration
- **Prettier**: Code formatting with consistent style
- **SWC**: Fast TypeScript/JavaScript compilation
- **Docker**: Containerized development environment

## Common Commands

### Development

```bash
# Start all services (databases + API)
npm run dev

# Start only database services
npm run dev:services

# Start API locally (after databases are running)
nx serve nestjs-ai-saas-starter-demo

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

### Production Deployment

```bash
# Build production Docker image
docker build -f docker/Dockerfile -t anubis-agent:latest .

# Run production stack
docker compose -f docker-compose.yml up -d
```

## Environment Configuration

- **Development**: Uses `.env` file with local database connections
- **Production**: Uses `.env.production` with Docker service names
- **Required Variables**: NEO4J_URI, CHROMADB_URL, REDIS_URL, LLM API keys

## Module Architecture

- **Apps**: Main applications (nestjs-ai-saas-starter-demo)
- **Libs**: Reusable libraries (nestjs-chromadb, nestjs-langgraph, nestjs-neo4j)
- **Shared**: Common TypeScript configuration and utilities
