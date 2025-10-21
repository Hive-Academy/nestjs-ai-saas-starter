# NestJS AI SaaS Starter

<!-- Center alignment div removed to satisfy markdown lint (MD033) -->

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Nx](https://img.shields.io/badge/nx-143055?style=flat&logo=nx&logoColor=white)](https://nx.dev)

**A modular NestJS + LangGraph AI platform: real-time streaming, checkpoint/replay, human gating, unified (vector + graph) memory, multi-agent orchestration — all delivered as publishable libraries.**

**Sections:** Quick Start · Platform Pillars · Demo Story · Architecture · Business Outcomes · Libraries · AI-Assisted Build · Quality Signals

</div>

---

## 🌟 Overview

This workspace now contains **14 focused libraries** (core contracts, workflow engine, streaming, checkpointing, multi-agent, HITL, memory fusion, time-travel, monitoring scaffold, platform API, plus persistence adapters). Together they enable:

- **⚙️ Orchestrated AI Workflows** (declarative + functional APIs)
- **⚡ Real-Time Streaming** (tokens / events / progress via decorators)
- **🛡️ Durable Execution** (checkpoint + deterministic replay)
- **🧠 Unified Memory Fusion** (semantic vector + graph relationships)
- **🧍 Human-in-the-Loop Safety** (approval gates, optional)
- **🧩 Optional Modularity** (all cross-cutting features injectable / no-op)
- **🏢 Enterprise Scaffold** (health indicators, adapters, DI boundaries)

> Full value matrix: see `docs/hackathon/04-value-prop-per-library.md`

### 🎯 AI Provider Support

- **OpenRouter** (Default): Access 100+ models (GPT-4, Claude, Gemini, Llama, etc.) through one API
- **Ollama**: Fully local LLM inference for privacy and offline usage
- **HuggingFace**: Local embeddings with sentence transformers (no API key required)

## 🧱 Platform Pillars

| Pillar              | What It Delivers                              | Primary Libraries                           | Differentiator                                  |
| ------------------- | --------------------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| Orchestration       | Graph-based agent execution w/ decorators     | `workflow-engine`, `functional-api`, `core` | Unified declarative + functional styles         |
| Streaming UX        | Token/event/progress WebSocket streaming      | `streaming`, `workflow-engine`              | Method-level decorators → DI adapter            |
| Durability & Replay | Resume after failure + deterministic timeline | `checkpoint`, `time-travel`                 | Replay re-emits original token cadence          |
| Memory Fusion       | Semantic + graph enriched context             | `memory`, `nestjs-chromadb`, `nestjs-neo4j` | Cascade retrieval (vector → graph expansion)    |
| Human Safety        | Approval / intervention gates                 | `hitl`, `workflow-engine`                   | Removable with zero code churn (no-op fallback) |

> For architectural narrative + diagrams: `docs/hackathon/05-architecture-overview-draft.md`

## 🧪 Demo Story (3‑min)

Sequence (each mapped to a pillar): orchestrate run → live token stream → forced restart (resume) → approval gate → memory fusion diff → replay flash. Script: `docs/hackathon/06-demo-script.md`.

| Step                | Visual                      | Pillar              | Criterion (Hackathon)     |
| ------------------- | --------------------------- | ------------------- | ------------------------- |
| 1. Orchestrate      | Terminal executionId        | Orchestration       | Implementation discipline |
| 2. Streaming tokens | UI token pane               | Streaming UX        | Innovation / UX           |
| 3. Restart resume   | Kill + resume               | Durability          | Reliability               |
| 4. Approval gate    | Modal pause                 | Human Safety        | Control / Trust           |
| 5. Memory fusion    | Baseline vs enriched answer | Memory Fusion       | Depth / Differentiation   |
| 6. Replay flash     | Timeline playback           | Durability & Replay | Debuggability             |

## 💼 Business Outcomes

| Outcome                     | Supported By                             | Story Hook                                 |
| --------------------------- | ---------------------------------------- | ------------------------------------------ |
| Assisted Support Resolution | streaming + workflow-engine + checkpoint | Faster perceived response, safe restart    |
| Code Review Summaries       | memory + chroma + neo4j + multi-agent    | Multi-agent roles w/ enriched context      |
| Knowledge Exploration       | memory fusion + time-travel              | Replay explorations, refine prompts        |
| Risk / Policy Enforcement   | hitl + checkpoint                        | Approval gates + immutable state snapshots |

## 🏗️ Architecture

### Workspace Structure (Current)

```text
apps/
  dev-brand-api/          # NestJS backend (API + orchestrated workflows)
  dev-brand-ui/           # Angular/Frontend consuming streaming + HITL
  dev-brand-ui-e2e/       # Playwright E2E tests for UI flows

libs/
  langgraph-modules/
    core/                 # Shared contracts, tokens, base types
    workflow-engine/      # Orchestrator + decorator runtime
    functional-api/       # Functional convenience layer
    streaming/            # Streaming adapter + event contracts
    checkpoint/           # Durable state + resume primitives
    time-travel/          # Deterministic replay / timeline utilities
    memory/               # Memory fusion (vector + graph cascade)
    hitl/                 # Human approval gate decorators/services
    multi-agent/          # Role / agent orchestration helpers
    monitoring/           # Health/telemetry scaffolding
    platform/             # Cross-cutting platform wiring & DI exports
  nestjs-chromadb/        # ChromaDB NestJS integration
  nestjs-neo4j/           # Neo4j NestJS integration

docs/                     # Guides, architecture, hackathon assets
scripts/                  # Tooling (migrate, sync, validation)
.github/workflows/        # CI/CD pipelines
docker-compose*.yml       # Local environment services
```

> NOTE: Legacy names like `nestjs-ai-saas-starter-demo` were refactored into the `dev-brand-*` app suite for clarity between API, UI, and E2E.

### Technology Stack

| Category         | Technology        | Purpose                        |
| ---------------- | ----------------- | ------------------------------ |
| **Framework**    | NestJS 11+        | Backend framework with DI      |
| **Build System** | Nx 21.3.11        | Monorepo management            |
| **Language**     | TypeScript 5.8.2  | Type-safe development          |
| **AI/ML**        | LangGraph         | AI agent workflows             |
| **Vector DB**    | ChromaDB          | Embeddings and semantic search |
| **Graph DB**     | Neo4j 5.26        | Relationship modeling          |
| **Cache**        | Redis             | Caching and sessions           |
| **Testing**      | Jest              | Unit and integration testing   |
| **Linting**      | ESLint + Prettier | Code quality                   |
| **CI/CD**        | GitHub Actions    | Automated workflows            |

## 🚀 Quick Start

> Want the narrative version? See **Demo Story** above. Below is the minimal hands-on path.

### Prerequisites

- **Node.js**: 18+ (recommended: 20+)
- **npm**: 8+ (comes with Node.js)
- **Docker**: For running databases
- **Git**: For version control

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/hive-academy/nestjs-ai-saas-starter.git
cd nestjs-ai-saas-starter

# Install dependencies
npm install

# This will automatically:
# - Install all dependencies
# - Set up Git hooks with Husky
# - Configure development environment
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Configure your AI providers:
# LLM Provider (choose one):
# - OpenRouter API key (default - recommended)
# - Or use Ollama for local LLM
#
# Embeddings:
# - HuggingFace (default - no API key needed for public models)
```

### 3. Start Development Services

```bash
# Start all database services (Neo4j, ChromaDB, Redis)
npm run dev:services

# In another terminal, start the application
npx nx serve nestjs-ai-saas-starter-demo

# The application will be available at http://localhost:3000
```

### 4. Verify Setup

```bash
# Check service health
curl http://localhost:3000/health

# View service logs
npm run dev:logs

# Stop services when done
npm run dev:stop
```

## 🔧 Development

### Common Commands

```bash
# Development
npm run dev:services          # Start database services
npm run dev:stop             # Stop all services
npm run dev:reset            # Reset all data (clean slate)
npm run dev:logs             # View service logs

# Building
npm run build:libs           # Build all libraries
npx nx build <project-name>  # Build specific project
npx nx run-many -t build     # Build all projects

# Testing
npx nx test <project-name>   # Test specific project
npx nx run-many -t test      # Test all projects
npx nx affected:test         # Test affected projects

# Linting & Formatting
npm run lint:fix             # Fix linting issues
npm run format               # Format all files
npx nx run-many -t lint      # Lint all projects

# Documentation
npm run docs:generate        # Generate API documentation
npm run docs:serve           # Serve documentation locally
```

### Project Commands

```bash
# Show project details
npx nx show project <project-name>

# View dependency graph
npx nx graph

# Generate new library
npx nx g @nx/node:lib <lib-name>

# Generate new NestJS app
npx nx g @nx/nest:app <app-name>
```

### Git Workflow

The project uses Git hooks for quality assurance:

```bash
# Commits must follow conventional format
git commit -m "feat(chromadb): add vector similarity search"
git commit -m "fix(neo4j): resolve connection timeout"
git commit -m "docs: update installation guide"

# Pre-commit hooks will:
# - Run linting and formatting
# - Build affected projects
# - Validate package.json files

# Pre-push hooks will:
# - Run tests for affected projects
# - Validate build process
# - Test publish process (dry-run)
```

## 📦 Published Libraries

This workspace contains modular packages; external NPM publications currently focus on infrastructure adapters (`nestjs-chromadb`, `nestjs-neo4j`) and emerging LangGraph integration. Internal (not all yet published) modules live under `langgraph-modules` and are versioned together.

> Maturity snapshot: Adapters = Beta, Core runtime & cross-cutting modules = Alpha (stabilizing toward a cohesive initial public release), Experimental = `time-travel`, `monitoring`.

Categories:

- Core Runtime: `core`, `workflow-engine`, `functional-api`
- Cross-Cutting: `streaming`, `checkpoint`, `time-travel`, `memory`, `hitl`, `multi-agent`, `monitoring`, `platform`
- External Adapters: `nestjs-chromadb`, `nestjs-neo4j`

For maturity and value details see `docs/hackathon/04-value-prop-per-library.md`.

### [@hive-academy/nestjs-chromadb](https://www.npmjs.com/package/@hive-academy/nestjs-chromadb)

#### Vector Database Integration

```bash
npm install @hive-academy/nestjs-chromadb chromadb
```

```typescript
import { ChromaDBModule } from '@hive-academy/nestjs-chromadb';

@Module({
  imports: [
    ChromaDBModule.forRoot({
      connection: { host: 'localhost', port: 8000 },
      embedding: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY },
    }),
  ],
})
export class AppModule {}
```

**Features:**

- Multiple embedding providers (OpenAI, Cohere, HuggingFace)
- Advanced querying with metadata filtering
- Health checks and connection management
- Comprehensive TypeScript support

#### Graph Database Integration

```bash
npm install @hive-academy/nestjs-neo4j neo4j-driver
```

```typescript
import { Neo4jModule } from '@hive-academy/nestjs-neo4j';

@Module({
  imports: [
    Neo4jModule.forRoot({
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'password',
    }),
  ],
})
export class AppModule {}
```

**Features:**

- Connection pooling and management
- Transaction support
- Health monitoring
- Cypher query builder utilities

### [@hive-academy/nestjs-langgraph](https://www.npmjs.com/package/@hive-academy/nestjs-langgraph)

#### AI Agent Workflows

```bash
npm install @hive-academy/nestjs-langgraph @langchain/langgraph
```

```typescript
import { NestjsLanggraphModule } from '@hive-academy/nestjs-langgraph';

@Module({
  imports: [
    NestjsLanggraphModule.forRoot({
      defaultLLM: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY },
    }),
  ],
})
export class AppModule {}
```

**Features:**

- Declarative workflow definitions
- Streaming support with WebSocket integration
- Human-in-the-loop (HITL) capabilities
- Tool registry and management
- Comprehensive testing utilities

## 🏭 Production Deployment

### Docker Deployment

```bash
# Build production image
docker build -f docker/Dockerfile -t hive-academy-agent:latest .

# Run production stack
docker compose -f docker-compose.yml up -d
```

### Environment Configuration

```bash
# Production environment variables
NODE_ENV=production
NEO4J_URI=bolt://neo4j:7687
CHROMADB_URL=http://chromadb:8000
REDIS_URL=redis://redis:6379
OPENAI_API_KEY=your_open_ai_key
```

### Health Monitoring

The application includes comprehensive health checks:

```bash
# Check application health
curl http://localhost:3000/health

# Check individual services
curl http://localhost:3000/health/chromadb
curl http://localhost:3000/health/neo4j
curl http://localhost:3000/health/redis
```

## 🔄 CI/CD Pipeline

### Automated Workflows

The project includes three GitHub Actions workflows:

1. **CI Workflow** (`ci.yml`): Runs on every push/PR

   - Installs dependencies
   - Runs linting and tests
   - Builds all projects

2. **Release Workflow** (`release.yml`): Handles publishing

   - Automatic versioning with conventional commits
   - Builds and publishes libraries to NPM
   - Creates GitHub releases
   - Generates changelogs

3. **PR Checks** (`pr-checks.yml`): Validates pull requests
   - Code quality checks
   - Security audits
   - Bundle size analysis
   - Conventional commit validation

### Publishing Libraries

```bash
# Automatic publishing (on main branch push)
git commit -m "feat(chromadb): add new feature"
git push origin main
# → Automatically versions and publishes

# Manual publishing
npm run publish:dry-run  # Test publishing
npm run publish:libs     # Publish all libraries
npm run version:libs     # Version libraries only
```

## 📚 Documentation

### Available Documentation

- **[API Documentation](docs/api/)**: Generated TypeDoc documentation
- **[CI/CD Setup Guide](docs/CI-CD-SETUP.md)**: Detailed CI/CD configuration
- **[Git Hooks Guide](docs/GIT-HOOKS-SETUP.md)**: Git hooks and code quality
- **[Publishing Guide](PUBLISHING.md)**: Library publishing process
- **[Changelog](CHANGELOG.md)**: Version history and changes
- **[Neo4j Examples Guide](libs/nestjs-neo4j/EXAMPLES_GUIDE.md)**: Comprehensive recipe-based usage of the Neo4j integration

### Generate Documentation

```bash
# Generate API documentation for all libraries
npm run docs:generate

# Serve documentation locally
npm run docs:serve

# Build complete documentation site
npm run docs:build-site
```

## 🧪 Testing

### Test Structure

```bash
# Unit tests
npx nx test <project-name>

# Integration tests
npx nx test <project-name> --testPathPattern=integration

# E2E tests
npx nx e2e nestjs-ai-saas-starter-demo-e2e

# Test affected projects only
npx nx affected:test

# Test with coverage
npx nx test <project-name> --coverage
```

### Testing Best Practices

- **Unit Tests**: Test individual services and components
- **Integration Tests**: Test database and external service integration
- **E2E Tests**: Test complete application workflows
- **Mocking**: Use comprehensive mocks for external dependencies

## 🔧 Configuration

### Environment Variables

```bash
# Database Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
CHROMADB_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379

# AI Service API Keys
OPENAI_API_KEY=your_openai_key
COHERE_API_KEY=your_cohere_key
HUGGINGFACE_API_KEY=your_hf_key

# Application Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

### Docker Services

```yaml
# docker-compose.dev.yml
services:
  neo4j:
    image: neo4j:5.26-community
    ports: ['7474:7474', '7687:7687']

  chromadb:
    image: chromadb/chroma:latest
    ports: ['8000:8000']

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feat/amazing-feature`
3. **Follow commit conventions**: `git commit -m "feat(scope): add amazing feature"`
4. **Push to branch**: `git push origin feat/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation for API changes
- Use conventional commit messages
- Ensure all CI checks pass

### Code Quality

The project enforces code quality through:

- **ESLint**: Code linting and style enforcement
- **Prettier**: Consistent code formatting
- **Husky**: Git hooks for pre-commit/push checks
- **Commitlint**: Conventional commit message validation
- **Jest**: Comprehensive test coverage

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Community

## 🧬 AI-Assisted Build (Kiro)

This codebase was iteratively shaped using internal orchestrated AI agents (Kiro workflow). Governance rules live in `CLAUDE.md` (mandatory `/orchestrate` command, type reuse, DI adapter discipline). We treat AI as a _co-engineer_—artifact trails: `docs/hackathon/01-inventory.md`, `04-value-prop-per-library.md`, `05-architecture-overview-draft.md`, `06-demo-script.md`.

Benefits:

- Faster architecture convergence (adapter patterns unified early)
- Automated standards enforcement (no re-exports, strict types)
- Traceable decision log for judges & contributors

## ✅ Quality Signals

| Signal               | Status                                                                | Notes                               |
| -------------------- | --------------------------------------------------------------------- | ----------------------------------- |
| Build (CI)           | ![CI](https://img.shields.io/badge/CI-passing-brightgreen?style=flat) | GitHub Actions (`ci.yml`)           |
| Lint / Typecheck     | (badge planned)                                                       | ESLint strict + TS strict mode      |
| Test Coverage        | (badge planned)                                                       | Target ≥ 80% (see upcoming summary) |
| Packages Published   | chromadb · neo4j · langgraph                                          | More modules maturing               |
| Streaming Adapter    | Implemented                                                           | DI no-op fallback pattern           |
| Checkpoint Replay    | Implemented                                                           | Deterministic resume path           |
| Memory Fusion        | In progress (pattern defined)                                         | Cascade retrieval design            |
| HITL Gating          | Implemented                                                           | Declarative decorator               |
| Replay (Time Travel) | PoC planned                                                           | Timeline emission spec drafted      |

> After polishing, badges (coverage, lint, types) will replace placeholders.

## 🔗 Quick Cross-Refs

| Need                   | Doc                                                |
| ---------------------- | -------------------------------------------------- |
| Library Value Matrix   | `docs/hackathon/04-value-prop-per-library.md`      |
| Architecture Narrative | `docs/hackathon/05-architecture-overview-draft.md` |
| Demo Script            | `docs/hackathon/06-demo-script.md`                 |
| Streaming Blueprint    | `STREAMING_INTEGRATION_BLUEPRINT.md`               |
| Operating Constraints  | `CLAUDE.md`                                        |
| Library Index          | `docs/hackathon/07-library-index.md`               |
| Architecture Diagrams  | `docs/hackathon/08-architecture-diagrams.md`       |

- **📖 Documentation**: [Full documentation site](https://hive-academy.github.io/nestjs-ai-saas-starter)
- **🐛 Issues**: [GitHub Issues](https://github.com/hive-academy/nestjs-ai-saas-starter/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/hive-academy/nestjs-ai-saas-starter/discussions)
- **📧 Email**: <support@hive-academy.dev>

## 🙏 Acknowledgments

Built with amazing open-source technologies:

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Nx](https://nx.dev/) - Smart monorepo tools
- [LangGraph](https://langchain-ai.github.io/langgraph/) - AI agent workflows
- [ChromaDB](https://www.trychroma.com/) - Vector database
- [Neo4j](https://neo4j.com/) - Graph database
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

---

**Star this repo if you find it helpful!**  
Made with ❤️ by the Anubis team · AI-assisted via Kiro orchestrator
