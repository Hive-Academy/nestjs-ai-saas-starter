# Requirements Document

## Introduction

The steering documents in `.kiro/steering/` need to be updated to accurately reflect the current state of the NestJS AI SaaS Starter codebase. The current documents contain outdated information about project structure, applications, libraries, dependencies, and development workflows. This update will ensure that the steering documents provide accurate guidance for AI assistants and developers working with the codebase.

## Requirements

### Requirement 1

**User Story:** As a developer using AI assistance, I want accurate steering documents that reflect the current project structure, so that I receive correct guidance about the codebase organization and available components.

#### Acceptance Criteria

1. WHEN reviewing the structure.md steering document THEN it SHALL accurately reflect the current apps and libs directory structure
2. WHEN examining the library organization THEN it SHALL include all current libraries including the new langgraph-modules structure
3. WHEN looking at application structure THEN it SHALL reflect the current dev-brand-api and devbrand-ui applications instead of outdated references
4. WHEN reviewing import paths THEN it SHALL show the correct @hive-academy scoped package names

### Requirement 2

**User Story:** As a developer working with the technology stack, I want the tech.md document to reflect current versions and dependencies, so that I understand the exact tools and versions being used.

#### Acceptance Criteria

1. WHEN checking dependency versions THEN the document SHALL reflect the current package.json versions (Nx 21.4.1, TypeScript 5.8.2, NestJS 11+, etc.)
2. WHEN reviewing AI stack information THEN it SHALL include current LangChain versions (@langchain/langgraph 0.4.3, @langchain/core 0.3.68, etc.)
3. WHEN examining development commands THEN they SHALL match the current npm scripts in package.json
4. WHEN looking at build system information THEN it SHALL reflect the current Nx workspace configuration and plugins

### Requirement 3

**User Story:** As a developer understanding the product scope, I want the product.md document to accurately describe the current project capabilities and focus areas, so that I understand what the system is designed to accomplish.

#### Acceptance Criteria

1. WHEN reading the product overview THEN it SHALL reflect the current "NestJS AI SaaS Starter" branding and description
2. WHEN examining key features THEN it SHALL include the comprehensive langgraph-modules ecosystem (checkpoint, time-travel, multi-agent, etc.)
3. WHEN reviewing target use cases THEN they SHALL align with the current AI agent workflow and vector database capabilities
4. WHEN checking technology focus THEN it SHALL emphasize the current AI provider support (OpenRouter, Ollama, HuggingFace)

### Requirement 4

**User Story:** As a developer following coding standards, I want the coding-standards.md document to reflect current project patterns and conventions, so that I write code that follows the established practices.

#### Acceptance Criteria

1. WHEN reviewing library naming conventions THEN they SHALL reflect the @hive-academy scope and current library names
2. WHEN examining file organization patterns THEN they SHALL match the current project structure with langgraph-modules
3. WHEN checking import examples THEN they SHALL use the correct package names and current dependency versions
4. WHEN reviewing testing standards THEN they SHALL reflect the current Jest configuration and testing patterns
5. WHEN examining NestJS patterns THEN they SHALL align with the current module structure and dependency injection patterns used in the codebase

### Requirement 5

**User Story:** As an AI assistant providing development guidance, I want steering documents that include current development workflows and commands, so that I can provide accurate instructions for common development tasks.

#### Acceptance Criteria

1. WHEN providing development commands THEN they SHALL match the current npm scripts (api, start, dev:services, etc.)
2. WHEN describing the monorepo structure THEN it SHALL include the current workspace configuration with proper app and lib organization
3. WHEN explaining publishing workflows THEN they SHALL reflect the current @hive-academy scoped packages and publishing process
4. WHEN describing Docker configuration THEN it SHALL match the current docker-compose.dev.yml and production setup
