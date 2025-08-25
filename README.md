# NestJS AI SaaS Starter

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Nx](https://img.shields.io/badge/nx-143055?style=flat&logo=nx&logoColor=white)](https://nx.dev)

**A comprehensive NestJS-based AI SaaS starter with enterprise-grade integrations for building sophisticated AI agent workflows and applications.**

[🚀 Quick Start](#quick-start) • [📚 Documentation](#documentation) • [🏗️ Architecture](#architecture) • [🔧 Development](#development) • [📦 Libraries](#published-libraries)

</div>

---

## 🌟 Overview

This monorepo provides a complete foundation for building AI-powered SaaS applications with NestJS, featuring:

- **🤖 AI Agent Workflows**: Build complex AI workflows using LangGraph integration
- **🔍 Vector Database**: Comprehensive ChromaDB integration for semantic search
- **📊 Graph Database**: Advanced Neo4j integration for relationship modeling
- **🏢 Enterprise Ready**: Production-ready with health checks, monitoring, and Docker deployment
- **📦 Publishable Libraries**: Three NPM packages ready for distribution
- **🔄 CI/CD Pipeline**: Automated testing, building, versioning, and publishing

### 🎯 AI Provider Support

- **OpenRouter** (Default): Access 100+ models (GPT-4, Claude, Gemini, Llama, etc.) through one API
- **Ollama**: Fully local LLM inference for privacy and offline usage
- **HuggingFace**: Local embeddings with sentence transformers (no API key required)

## 🏗️ Architecture

### Workspace Structure

```
nestjs-ai-saas-starter/
├── apps/
│   ├── nestjs-ai-saas-starter-demo/     # Main NestJS application
│   └── nestjs-ai-saas-starter-demo-e2e/ # E2E tests
├── libs/                                # Reusable libraries
│   ├── nestjs-chromadb/                 # ChromaDB integration
│   ├── nestjs-neo4j/                    # Neo4j integration
│   ├── nestjs-langgraph/                # LangGraph workflows
├── docs/                                # Documentation
├── docker/                              # Docker configurations
├── .github/workflows/                   # CI/CD pipelines
└── scripts/                             # Build and utility scripts
```

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

This workspace publishes three NPM packages under the `@hive-academy` scope:

### [@hive-academy/nestjs-chromadb](https://www.npmjs.com/package/@hive-academy/nestjs-chromadb)

**Vector Database Integration**

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

### [@hive-academy/nestjs-neo4j](https://www.npmjs.com/package/@hive-academy/nestjs-neo4j)

**Graph Database Integration**

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

**AI Agent Workflows**

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
OPENAI_API_KEY=your_openai_key
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

<div align="center">

**[⭐ Star this repo](https://github.com/hive-academy/nestjs-ai-saas-starter) if you find it helpful!**

Made with ❤️ by the Anubis team

</div>
