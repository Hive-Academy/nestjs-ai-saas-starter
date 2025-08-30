# Design Document

## Overview

This design outlines the systematic update of the four steering documents in `.kiro/steering/` to accurately reflect the current state of the NestJS AI SaaS Starter codebase. The update will ensure consistency between the actual codebase structure, dependencies, and workflows with the guidance provided to AI assistants and developers.

## Architecture

### Document Structure Analysis

The steering documents follow a hierarchical information architecture:

1. **tech.md** - Technical foundation (versions, tools, commands)
2. **structure.md** - Project organization and file structure  
3. **product.md** - Business context and capabilities
4. **coding-standards.md** - Development practices and patterns

### Update Strategy

Each document will be updated using a **data-driven approach**:

- Extract current information from package.json, nx.json, and project structure
- Compare against existing steering content
- Update sections with accurate current information
- Maintain document formatting and organization
- Preserve valuable guidance while correcting outdated details

## Components and Interfaces

### Data Sources

**Primary Configuration Files:**
- `package.json` - Dependencies, scripts, workspace configuration
- `nx.json` - Workspace plugins, targets, release configuration
- `tsconfig.base.json` - TypeScript configuration
- Directory structure - Apps and libs organization

**Library Package Files:**
- `libs/nestjs-chromadb/package.json` - ChromaDB integration details
- `libs/nestjs-neo4j/package.json` - Neo4j integration details  
- `libs/nestjs-langgraph/package.json` - LangGraph integration details

**Application Configuration:**
- `apps/dev-brand-api/` - Current API application structure
- `apps/devbrand-ui/` - Current UI application structure

### Document Update Components

#### 1. Technology Stack Updates (tech.md)

**Current State Analysis:**
- Nx version: 21.4.1 (was 21.3.11)
- TypeScript: 5.8.2 (current)
- NestJS: 11+ (current)
- New AI dependencies: @langchain/langgraph 0.4.3, @langchain/core 0.3.68

**Update Areas:**
- Version numbers in build system section
- AI & Database Stack with current LangChain versions
- Development commands matching current npm scripts
- New commands: `api`, `start`, `dev:services`, etc.

#### 2. Project Structure Updates (structure.md)

**Current State Analysis:**
- Applications: `dev-brand-api`, `devbrand-ui` (not nestjs-ai-saas-starter-demo)
- New library structure: extensive `langgraph-modules/` ecosystem
- Package scoping: `@hive-academy/` instead of generic examples

**Update Areas:**
- Nx Monorepo Layout with current app names
- Library Architecture reflecting langgraph-modules structure
- Import Path Conventions using @hive-academy scope
- File naming conventions matching current patterns

#### 3. Product Scope Updates (product.md)

**Current State Analysis:**
- Project name: "NestJS AI SaaS Starter" (confirmed)
- Enhanced AI capabilities with comprehensive langgraph-modules
- Multi-provider AI support (OpenRouter, Ollama, HuggingFace)

**Update Areas:**
- Core Purpose emphasizing langgraph-modules ecosystem
- Key Value Propositions including new AI provider support
- Target Use Cases reflecting current capabilities
- Technology Focus on current AI/ML stack

#### 4. Coding Standards Updates (coding-standards.md)

**Current State Analysis:**
- Library organization follows @hive-academy scoping
- Enhanced module structure with langgraph-modules
- Current dependency injection patterns
- Updated testing configuration

**Update Areas:**
- Library naming with @hive-academy examples
- Import organization with current package names
- Module structure examples from actual codebase
- Testing standards matching current Jest setup

## Data Models

### Configuration Data Model

```typescript
interface ProjectConfiguration {
  dependencies: {
    nx: string;
    typescript: string;
    nestjs: string;
    langchain: {
      core: string;
      langgraph: string;
      openai: string;
      anthropic: string;
    };
  };
  
  structure: {
    apps: string[];
    coreLibs: string[];
    langgraphModules: string[];
  };
  
  scripts: Record<string, string>;
  
  publishedPackages: {
    scope: string;
    packages: string[];
  };
}
```

### Document Update Model

```typescript
interface DocumentUpdate {
  file: string;
  sections: {
    name: string;
    currentContent: string;
    updatedContent: string;
    changes: string[];
  }[];
}
```

## Error Handling

### Validation Strategy

1. **Content Consistency Checks**
   - Verify version numbers match package.json
   - Ensure directory references exist in actual structure
   - Validate command examples work with current scripts

2. **Reference Integrity**
   - Check that all mentioned libraries exist
   - Verify import paths are correct
   - Ensure example code uses current patterns

3. **Completeness Validation**
   - Confirm all major libraries are documented
   - Verify all npm scripts are covered
   - Check that new features are included

### Rollback Strategy

- Maintain backup of original steering documents
- Use git versioning for change tracking
- Implement incremental updates with validation at each step

## Testing Strategy

### Validation Approach

1. **Automated Verification**
   - Script to validate version numbers against package.json
   - Directory structure validation against actual filesystem
   - Command validation against npm scripts

2. **Content Review**
   - Manual review of updated content for accuracy
   - Cross-reference with actual codebase examples
   - Verify examples work in current environment

3. **Integration Testing**
   - Test that updated steering provides accurate guidance
   - Validate that AI assistants receive correct information
   - Ensure development workflows match documented processes

### Success Criteria

- All version numbers match current dependencies
- All directory references exist in actual structure  
- All command examples work with current npm scripts
- Library examples use correct import paths and scoping
- Documentation reflects current project capabilities and focus

## Implementation Approach

### Phase 1: Data Collection
- Extract current configuration from package.json and nx.json
- Analyze current directory structure
- Document current npm scripts and workflows

### Phase 2: Content Analysis
- Compare current data against existing steering documents
- Identify specific sections requiring updates
- Plan content changes for each document

### Phase 3: Document Updates
- Update tech.md with current versions and commands
- Revise structure.md with current project organization
- Refresh product.md with current capabilities
- Update coding-standards.md with current patterns

### Phase 4: Validation
- Verify all references are accurate
- Test command examples
- Review for consistency and completeness
