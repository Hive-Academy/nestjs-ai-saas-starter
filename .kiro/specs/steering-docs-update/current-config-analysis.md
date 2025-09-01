# Current Project Configuration Analysis

## Extracted Configuration Data

### Key Dependency Versions (from package.json)

**Build System:**

- Nx: 21.4.1
- TypeScript: ~5.8.2
- Node.js Types: 20.19.9
- SWC Core: ~1.5.7

**NestJS Stack:**

- @nestjs/common: ^11.0.0
- @nestjs/core: ^11.0.0
- @nestjs/config: 4.0.2
- @nestjs/platform-express: ^11.0.0
- @nestjs/swagger: 11.2.0
- @nestjs/terminus: ^11.0.0

**AI/ML Stack:**

- @langchain/core: ^0.3.68
- @langchain/langgraph: ^0.4.3
- @langchain/langgraph-checkpoint: ^0.1.0
- @langchain/langgraph-checkpoint-sqlite: ^0.2.0
- @langchain/openai: ^0.6.7
- @langchain/anthropic: ^0.3.26
- @langchain/google-genai: ^0.2.16
- langchain: ^0.3.30
- openai: ^5.12.2
- cohere-ai: ^7.18.0
- @huggingface/inference: ^4.6.1

**Database Stack:**

- chromadb: ^3.0.11
- neo4j-driver: ^5.28.1

**Frontend Stack:**

- Angular: 20.1.6 (all Angular packages)

**Testing & Quality:**

- Jest: ^30.0.2
- ESLint: ^9.8.0
- Prettier: ^2.6.2
- Husky: ^9.0.0

### Current NPM Scripts

**Development Commands:**

- `api`: "npx nx run dev-brand-api:serve"
- `start`: "npx nx run ai-saas-frontend:serve:development"
- `dev:services`: "docker compose -f docker-compose.dev.yml up -d"
- `dev:stop`: "docker compose -f docker-compose.dev.yml down"
- `dev:reset`: "docker compose -f docker-compose.dev.yml down -v"
- `dev:logs`: "docker compose -f docker-compose.dev.yml logs -f"

**Build Commands:**

- `build:libs`: "nx run-many -t build -p nestjs-chromadb,nestjs-neo4j,nestjs-langgraph"
- `docker:prod`: "docker compose -f docker-compose.yml up -d"

**Publishing Commands:**

- `publish:dry-run`: "npm run build:libs && nx run-many -t publish --dry-run -p nestjs-chromadb,nestjs-neo4j,nestjs-langgraph"
- `publish:libs`: "npm run build:libs && nx run-many -t publish -p nestjs-chromadb,nestjs-neo4j,nestjs-langgraph"
- `version:libs`: "nx release version"
- `publish:release`: "nx release publish"

**Documentation Commands:**

- `docs:generate`: "nx run-many -t docs -p nestjs-chromadb,nestjs-neo4j,nestjs-langgraph"
- `docs:serve`: "npx http-server docs/api -p 8080 -o"
- `docs:build-site`: "npm run docs:generate && node scripts/build-docs-site.js"

**Quality Commands:**

- `lint:fix`: "nx run-many -t lint --fix"
- `format`: "prettier --write ."
- `format:check`: "prettier --check ."

### Current Directory Structure

**Applications:**

- `apps/dev-brand-api/` - Main NestJS API application
- `apps/devbrand-ui/` - Angular frontend application

**Core Libraries:**

- `libs/nestjs-chromadb/` - ChromaDB integration (@hive-academy/nestjs-chromadb)
- `libs/nestjs-neo4j/` - Neo4j integration (@hive-academy/nestjs-neo4j)
- `libs/langgraph-modules/nestjs-langgraph/` - LangGraph integration (@hive-academy/nestjs-langgraph)

**LangGraph Modules Ecosystem:**

- `libs/langgraph-modules/checkpoint/` - Checkpoint functionality
- `libs/langgraph-modules/core/` - Core LangGraph utilities
- `libs/langgraph-modules/functional-api/` - Functional API patterns
- `libs/langgraph-modules/hitl/` - Human-in-the-loop capabilities
- `libs/langgraph-modules/memory/` - Memory management
- `libs/langgraph-modules/monitoring/` - Workflow monitoring
- `libs/langgraph-modules/multi-agent/` - Multi-agent systems
- `libs/langgraph-modules/memory/` - NestJS memory integration
- `libs/langgraph-modules/platform/` - Platform utilities
- `libs/langgraph-modules/streaming/` - Streaming capabilities
- `libs/langgraph-modules/time-travel/` - Time-travel debugging
- `libs/langgraph-modules/workflow-engine/` - Workflow engine

**Dev Brand Libraries:**

- `libs/dev-brand/backend/data-access/` - Data access layer
- `libs/dev-brand/backend/feature/` - Feature modules

### Workspace Configuration (from nx.json)

**Nx Plugins:**

- @nx/js/typescript (with exclusions for core libs)
- @nx/webpack/plugin
- @nx/eslint/plugin
- @nx/jest/plugin

**Release Configuration:**

- Published packages: nestjs-chromadb, nestjs-neo4j, nestjs-langgraph, memory
- Conventional commits enabled
- Automatic changelog generation
- GitHub releases enabled

**Workspace Structure:**

- Uses npm workspaces
- Includes: apps/_, libs/_, libs/langgraph-modules/_, libs/demo/_, libs/dev-brand/backend/_, libs/core/_

### Published Package Information

**Scope:** @hive-academy
**Packages:**

- @hive-academy/nestjs-chromadb (v0.0.1)
- @hive-academy/nestjs-neo4j (v0.0.1)
- @hive-academy/nestjs-langgraph (v0.0.1)

**Repository:** <https://github.com/hive-academy/nestjs-ai-saas-starter.git>

## Key Changes from Current Steering Documents

1. **Applications:** Current steering references `nestjs-ai-saas-starter-demo` but actual apps are `dev-brand-api` and `devbrand-ui`
2. **Library Structure:** Extensive `langgraph-modules/` ecosystem (12 modules) not fully documented
3. **Dependencies:** Several version updates needed (Nx 21.4.1, LangChain packages, etc.)
4. **Commands:** New npm scripts like `api`, `start`, service management commands
5. **Package Scoping:** All examples should use @hive-academy scope
6. **Workspace:** Complex workspace structure with multiple workspace patterns
