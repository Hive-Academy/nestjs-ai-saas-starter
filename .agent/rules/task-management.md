---
trigger: always_on
---

## 📁 Task Management

### Task ID Format

`TASK_YYYY_NNN` - Sequential format (TASK_2025_001, TASK_2025_002, etc.)

### Folder Structure

```
task-tracking/
  TASK_[ID]/
    ├── context.md            # User intent, conversation summary
    ├── task-description.md   # Requirements
    ├── implementation-plan.md # Design
    ├── tasks.md              # Atomic task breakdown & assignments (team-leader managed)
    ├── test-report.md        # Testing
    ├── code-review.md        # Review
    └── future-enhancements.md # Future work
```

### Git Operations & Commit Standards

**CRITICAL**: All commits MUST follow commitlint rules to pass pre-commit hooks.

#### Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

#### Allowed Types (REQUIRED)

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, no logic change)
- `refactor`: Code restructuring (no bug fix or feature)
- `perf`: Performance improvements
- `test`: Adding/updating tests
- `build`: Build system/dependency changes
- `ci`: CI configuration changes
- `chore`: Maintenance tasks (no src/test changes)
- `revert`: Revert previous commit

#### Allowed Scopes (REQUIRED)

- `chromadb`: ChromaDB library changes
- `neo4j`: Neo4j library changes
- `langgraph`: LangGraph modules changes
- `deps`: Dependency updates
- `release`: Release-related changes
- `ci`: CI/CD changes
- `docs`: Documentation changes
- `hooks`: Git hooks changes
- `scripts`: Script changes
- `angular-3d`: Angular 3D UI changes

#### Commit Rules (ENFORCED)

- ✅ Type: lowercase, required, from allowed list
- ✅ Scope: lowercase, required, from allowed list
- ✅ Subject:
  - lowercase only (NOT Sentence-case, Start-case, UPPER-CASE)
  - 3-72 characters
  - No period at end
  - Imperative mood ("add" not "added")
- ✅ Header: max 100 characters total
- ✅ Body/Footer lines: max 100 characters each

#### Valid Examples

```bash
feat(chromadb): add semantic search for documents
fix(neo4j): resolve connection timeout issue
docs(langgraph): update workflow examples
refactor(hooks): simplify pre-commit validation
chore(deps): update langchain to v0.3.30
```

#### Invalid Examples (WILL FAIL)

```bash
❌ "Feature: Add search" # Wrong type, wrong case
❌ "feat: Add search"    # Missing scope
❌ "feat(search): Add search" # Invalid scope, wrong case
❌ "feat(chromadb): Add search." # Period at end
❌ "feat(chromadb): Add Search" # Uppercase in subject
```

#### Branch & PR Operations

```bash
# New task (orchestrator handles this)
git checkout -b feature/TASK_2025_XXX
git push -u origin feature/TASK_2025_XXX

# Continue task
git checkout feature/TASK_2025_XXX
git pull origin feature/TASK_2025_XXX --rebase

# Commit changes
git add .
git commit -m "type(scope): description"

# Complete task (orchestrator handles this)
gh pr create --title "type(scope): description"
```

#### Pre-commit Checks

All commits automatically run:

1. **lint-staged** (no auto-stash): Format & lint staged files
2. **typecheck:affected**: Type-check changed libraries
3. **commitlint**: Validate commit message format

#### Commit Hook Failure Protocol

**CRITICAL**: When a commit hook fails, ALWAYS stop and ask the user to choose:

```
⚠️ Pre-commit hook failed: [specific error]

Please choose how to proceed:

1. **Fix Issue** - I'll fix the issue if it's related to current work
   (Use for: lint errors, type errors, commit message format issues in current changes)

2. **Bypass Hook** - Commit with --no-verify flag
   (Use for: Unrelated errors in other files, blocking issues outside current scope)

3. **Stop & Report** - Mark as blocker and escalate
   (Use for: Critical infrastructure issues, complex errors requiring investigation)

Which option would you like? (1/2/3)
```

**Agent Behavior**:

- NEVER automatically bypass hooks with --no-verify
- NEVER automatically fix issues without user consent
- NEVER proceed with alternative approaches without user decision
- ALWAYS present the 3 options and wait for user choice
- Document the chosen option in task tracking if option 2 or 3 is selected

**Example Scenarios**:

```bash
# Scenario 1: Lint error in current file
User chooses: Option 1 (Fix Issue)
Action: Run npm run lint:fix, verify, retry commit

# Scenario 2: Type error in unrelated library
User chooses: Option 2 (Bypass Hook)
Action: git commit --no-verify -m "message"
Document: Add note to tasks.md about bypassed hook

# Scenario 3: Complex build failure
User chooses: Option 3 (Stop & Report)
Action: Mark current task as blocked, create detailed error report
```

**NEVER run destructive git commands** (reset, force push, rebase --hard, etc.) that cause data loss.

---

## Environment Configuration

### Required Services

- Neo4j: ports 7687 (Bolt), 7474 (Browser)
- ChromaDB: port 8000
- Redis: port 6379

### Environment Variables

```bash
OPENAI_API_KEY=your_key
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
CHROMADB_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379
```

---

## Architecture Principles

### SOLID

- Single Responsibility, Open/Closed, Liskov Substitution
- Interface Segregation, Dependency Inversion

### Design Patterns

- Module Pattern: forRoot() / forRootAsync()
- Service Facade, Strategy, Factory, Decorator

### Integration Example

```typescript
@Injectable()
export class RAGPipelineService {
  async generateAnswer(query: string, userId: string) {
    // 1. Memory retrieval
    const memories = await this.memoryService.retrieveContext(userId);

    // 2. Vector search (ChromaDB)
    const vectorContext = await this.chromaDB.queryDocuments('knowledge', {
      queryTexts: [query],
      nResults: 5,
    });

    // 3. Graph search (Neo4j)
    const graphContext = await this.neo4j.getRelatedEntities(query);

    // 4. LangGraph workflow
    const workflow = new RAGWorkflow();
    return await workflow.execute({ query, memories, vectorContext, graphContext });
  }
}
```

---

## Development Guidelines

- TypeScript strict mode
- NestJS naming conventions
- Comprehensive logging
- 80% test coverage
- Real integrations (no mocks in production)
- Conventional commits: `type(scope): description`

---

## Key Principles

1. **Real Implementation**: Zero tolerance for stubs/placeholders
2. **Full Stack**: ChromaDB + Neo4j + LangGraph integration
3. **Type Safety**: Search before creating types
4. **Direct Replacement**: No backward compatibility
5. **Registry-First**: Track all work in task-tracking/
6. **Agent Pattern**: All agents return to main thread (team-leader coordinates developers via main thread)
7. **Dynamic Workflows**: Task-type determines agent sequence
8. **Atomic Tasks**: Implementation plans decomposed into git-verifiable tasks via team-leader

---

## 🔴 FUNDAMENTAL OPERATING PRINCIPLE

**IMPLEMENT REAL SOLUTIONS DIRECTLY** when you have infrastructure and context. Use `/orchestrate` for complex multi-phase work requiring specialized agents.

---

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->
