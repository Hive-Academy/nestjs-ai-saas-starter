# Universal Agent Framework

**Purpose**: Drop-in agent orchestration system for any software development project  
**Compatibility**: Zero customization required - works with any technology stack, language, or project structure

---

## 🚨 UNIVERSAL CRITICAL CONSTRAINTS

### 🔴 ABSOLUTE REQUIREMENTS (VIOLATIONS = IMMEDIATE FAILURE)

1. **MANDATORY AGENT WORKFLOW**: Every development request MUST use `/orchestrate` command - NO direct implementation unless user explicitly confirms "quick fix only"
2. **TYPE/SCHEMA REUSE PROTOCOL**: Search existing shared/common libraries FIRST, document search in progress.md, extend existing never duplicate  
3. **NO BACKWARD COMPATIBILITY**: Never target backward compatibility unless explicitly requested by user
4. **NO CROSS-LIBRARY POLLUTION**: Libraries/modules must not re-export types/services from other libraries

### 🎯 QUALITY ENFORCEMENT STANDARDS

- **Type/Schema Safety**: Zero loose types (any, object, *, etc.) - strict typing always
- **Import Standards**: Use project-detected alias paths consistently
- **Code Size Limits**: Services <200 lines, modules <500 lines, functions <30 lines
- **Test Coverage**: Minimum 80% across line/branch/function coverage
- **Progress Tracking**: Update progress.md every 30 minutes during active development
- **Documentation**: Document architectural decisions and patterns used In their Respective files **DON'T GENERATE MORE FILES THAN NECESSARY ASK USERS BEFORE GENERATING ANY NEW DOCUMENT.**

---

## 🔧 UNIVERSAL AUTO-DETECTION

### Project Context Discovery (Automatic)

Agents automatically detect and adapt to project structure:

**Technology Stack Detection:**

```bash
# Auto-detect from common files
detect_project_context() {
  # Language & framework detection
  if [ -f "package.json" ]; then PROJECT_STACK="node"; fi
  if [ -f "requirements.txt" ]; then PROJECT_STACK="python"; fi
  if [ -f "Cargo.toml" ]; then PROJECT_STACK="rust"; fi
  if [ -f "go.mod" ]; then PROJECT_STACK="go"; fi
  
  # Build system detection  
  if [ -f "nx.json" ]; then BUILD_CMD="npx nx"; fi
  if [ -f "lerna.json" ]; then BUILD_CMD="lerna"; fi
  if [ -f "rush.json" ]; then BUILD_CMD="rush"; fi
  
  # Import alias detection
  IMPORT_PREFIX=$(find . -name "*.ts" -o -name "*.js" | head -3 | xargs grep -h "from ['\"]@" | grep -o '@[^/]*' | head -1 || echo "@shared")
  
  # Shared library detection
  SHARED_PATH=$(find . -type d -name "*shared*" -o -name "*common*" | head -1 || echo "src/shared")
}
```

**No Configuration Required**: Agents automatically adapt to discovered patterns

---

## ⚡ AGENT WORKFLOW ORCHESTRATION

### Sequential Execution Framework

**MANDATORY**: All agent workflows follow this pattern:

1. **User Request** → **Claude Code Main Thread** → **Registry Check**
2. **Route Decision** → **Agent Selection** → **Single Agent Execution**  
3. **Agent Completion** → **Quality Gate Validation** → **Return to Main Thread**
4. **Next Agent Selection** OR **Task Completion**

### Core Agent Roles (Technology Agnostic)

| Agent Role | Symbol | Primary Responsibility | When to Invoke |
|------------|--------|----------------------|----------------|
| **project-manager** | 🪃 | Requirements analysis, strategic planning | Complex tasks, new features |
| **researcher-expert** | 🔎 | Technical research, best practices | Knowledge gaps, technology evaluation |
| **software-architect** | 🏗️ | System design, architecture planning | After requirements clear |
| **backend-developer** | 💻 | Server-side implementation | API, services, data layer work |
| **frontend-developer** | 🎨 | Client-side implementation | UI, components, user interaction |
| **senior-tester** | 🧪 | Quality assurance, testing strategy | After implementation |
| **code-reviewer** | 🔍 | Final quality validation | Before task completion |

### Delegation Protocol

**Standard Format for Agent Handoffs:**

```markdown
## DELEGATION REQUEST

**Next Agent**: [agent-name]
**Task Focus**: [specific deliverable]
**Context**: [key information to pass]
**Success Criteria**: [what constitutes success]
**Quality Requirements**: [specific standards]
**Time Budget**: [expected duration]
```

---

## 🎨 DEVELOPMENT STANDARDS FRAMEWORK

### Universal Architecture Principles

**SOLID Compliance (Language Agnostic):**

- **Single Responsibility**: Each component has one clear purpose
- **Open/Closed**: Extensible through interfaces/protocols/traits
- **Liskov Substitution**: All implementations honor their contracts
- **Interface Segregation**: Focused contracts for specific use cases
- **Dependency Inversion**: Depend on abstractions, not concretions

**Design Pattern Guidelines:**

- **Module Pattern**: Consistent initialization and configuration
- **Factory Pattern**: Dynamic component creation
- **Strategy Pattern**: Multiple implementations with selection logic
- **Observer/Event Pattern**: Decoupled communication between components
- **Decorator/Wrapper Pattern**: Cross-cutting concerns (logging, validation, etc.)

### Code Quality Standards

**Type/Schema Safety:**

- Comprehensive type definitions for all data structures
- Runtime validation where static typing unavailable  
- Proper error handling and boundary conditions
- No escape hatches unless absolutely necessary with documentation

**Testing Strategy:**

- **Unit Tests**: Mock external dependencies, test individual components
- **Integration Tests**: Test component interactions with real services
- **E2E Tests**: Full workflow testing from user perspective
- **Performance Tests**: Validate response times and resource usage

### Error Handling Framework

**Universal Error Principles:**

- Comprehensive error boundaries at module/service levels
- Contextual error information (what failed, why, how to recover)
- Graceful degradation where possible
- Proper logging and monitoring for debugging
- User-friendly error messages with actionable guidance

---

## 📁 TASK MANAGEMENT FRAMEWORK

### Universal Task Structure

**Task ID Format**: `TASK_[DOMAIN]_[NUMBER]`

- **Domains**: CMD (command/core), INT (integration), FE (frontend), BE (backend), QA (quality), DOC (documentation)
- **Numbering**: Sequential (001, 002, 003...)

**Standard Folder Structure:**

```
task-tracking/
  TASK_[ID]/
    ├── task-description.md     # Business requirements, acceptance criteria
    ├── research-report.md      # Technical research (if needed)  
    ├── implementation-plan.md  # Architecture and design
    ├── progress.md            # Real-time progress updates
    ├── test-report.md         # Testing results and coverage
    ├── code-review.md         # Quality validation
    └── completion-report.md   # Final metrics and lessons
```

### Quality Gate Framework

**Mandatory Validation at Each Phase:**

1. **Requirements Phase** (Project Manager)
   - [ ] SMART criteria compliance (Specific, Measurable, Achievable, Relevant, Time-bound)
   - [ ] BDD format acceptance criteria (Given/When/Then)
   - [ ] Comprehensive risk assessment
   - [ ] Stakeholder impact analysis

2. **Research Phase** (Researcher Expert - if needed)
   - [ ] Multiple authoritative sources (minimum 3-5)
   - [ ] Comparative analysis of approaches
   - [ ] Performance and security implications
   - [ ] Production case studies or examples

3. **Architecture Phase** (Software Architect)  
   - [ ] SOLID principles compliance
   - [ ] Design pattern justification
   - [ ] Type/schema reuse documented
   - [ ] Integration strategy defined
   - [ ] Performance and scalability considerations

4. **Implementation Phase** (Developers)
   - [ ] Code compiles/builds successfully
   - [ ] Zero loose types or escape hatches
   - [ ] Comprehensive error handling
   - [ ] Unit tests written and passing
   - [ ] Performance within acceptable limits

5. **Testing Phase** (Senior Tester)
   - [ ] Coverage above minimum threshold
   - [ ] All acceptance criteria tested
   - [ ] Edge cases and error conditions covered
   - [ ] Performance benchmarks validated
   - [ ] Security testing completed

6. **Review Phase** (Code Reviewer)
   - [ ] All previous gates passed
   - [ ] Code follows project conventions
   - [ ] No critical security issues
   - [ ] Documentation adequate
   - [ ] Ready for production deployment

---

## 🚀 INSTANT DEPLOYMENT

### Zero-Configuration Setup

**For Any New Project:**

1. **Copy Complete `.claude/` Directory**: Framework adapts automatically
2. **Run `/orchestrate [task]`**: Agents detect project context and begin work
3. **That's It**: No customization, configuration, or setup required

**Auto-Detected Capabilities:**

- Language and framework detection
- Build system and tooling identification
- Import alias and shared library discovery
- Quality standards and testing framework detection

**Universal Compatibility:**

- **Languages**: TypeScript, JavaScript, Python, Go, Rust, Java, C#, PHP, etc.
- **Frameworks**: React, Angular, Vue, Django, Rails, Spring, NestJS, Express, etc.
- **Build Systems**: Nx, Lerna, Rush, Webpack, Vite, Cargo, Go modules, etc.
- **Project Types**: Web apps, mobile apps, desktop apps, libraries, microservices, monorepos

---

**The framework automatically adapts to ANY project structure with zero configuration required. Just copy the `.claude` directory and start using `/orchestrate`.**
