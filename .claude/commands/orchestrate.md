# Orchestrate Development Workflow

Orchestrates the complete Anubis development workflow with strict sequential agent execution, quality gates, and comprehensive validation at each phase.

## Usage

`/orchestrate [task description or TASK_ID]`

Examples:

- `/orchestrate implement WebSocket integration for real-time updates`
- `/orchestrate TASK_CMD_009`
- `/orchestrate continue` (continues last incomplete task)

---

## ⚠️ CRITICAL RULES

### 🔴 TOP PRIORITY RULES (VIOLATIONS = IMMEDIATE FAILURE)

1. **ALWAYS USE AGENTS**: Every user request MUST go through appropriate agent - NO EXCEPTIONS unless user explicitly confirms "quick fix"
2. **NEVER CREATE TYPES**: Search @hive-academy/shared FIRST, document search in progress.md, extend don't duplicate
3. **NO BACKWARD COMPATIBILITY**: Never work on or target backward compatibility unless verbally asked for by the user
4. **NO RE-EXPORTS**: Never re-export a type or service from a library inside another library

### ENFORCEMENT RULES

1. **Type Safety**: NO 'any' types - will fail code review
2. **Import Aliases**: Always use @hive-academy/\* paths
3. **File Limits**: Services < 200 lines, modules < 500 lines
4. **Agent Protocol**: Never skip main thread orchestration
5. **Progress Updates**: Per ⏰ Progress Rule (30 minutes)
6. **Quality Gates**: Must pass 10/10 (see full checklist)
7. **Branch Strategy**: Sequential by default (see Git Branch Operations)
8. **Error Context**: Always include relevant debugging info
9. **Testing**: 80% coverage minimum
10. **Type Discovery**: Per Type Search Protocol

## WORKFLOW INITIATION

### Task: $ARGUMENTS

!echo "=== ANUBIS ORCHESTRATOR INITIATED ==="
!echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
!git branch --show-current
!git status --short

## Phase 0: Pre-Flight Checks

### Git Operations Guide

### Task Branch Management

#### New Task Branch Creation

```bash
# Ensure clean state
git status --porcelain
git add . && git commit -m "chore: checkpoint before new task"

# Create feature branch
TASK_ID="TASK_[DOMAIN]_[NUMBER]"
git checkout -b feature/${TASK_ID}-description
git push -u origin feature/${TASK_ID}-description
```

#### Continue Existing Task

```bash
git checkout feature/TASK_[ID]-description
git pull origin feature/TASK_[ID]-description --rebase
```

#### Checkpoint Commits (After Subtasks)

```bash
git add .
git commit -m "feat(TASK_[ID]): complete [subtask/component]"
git push origin $(git branch --show-current)
```

#### Task Completion & PR

```bash
# Final commit
git add .
git commit -m "feat(TASK_[ID]): complete all acceptance criteria"
git push origin feature/TASK_[ID]-description

# Create PR
gh pr create \
  --title "feat(TASK_[ID]): [Task Name]" \
  --body "Completes TASK_[ID] with all criteria verified"
```

### Branch Strategy

- Sequential branching: New tasks branch from current, not main
- Document parent branch in task folder
- PR back to parent branch, not always main

### 1. Registry Status Check

!cat task-tracking/registry.md | tail -20
!echo "Incomplete tasks:" && grep -E "🔄|⚠️|❌" task-tracking/registry.md || echo "No incomplete tasks"

### 2. Context Analysis

Analyze the current state:

- Current branch and git status
- Task registry for incomplete work
- Determine if this is a new task or continuation

Based on the request: "$ARGUMENTS"

DECISION POINT:

- If TASK_ID provided → Load existing task context
- If "continue" → Resume last incomplete task
- Otherwise → Create new task with appropriate ID

### 3. Task Setup

Generate or retrieve TASK_ID following naming convention:

- TASK*[DOMAIN]*[NUMBER]
- Domains: CMD (command center), INT (integration), WF (workflow), BUG (fixes), DOC (documentation)

Create task folder structure if new:

```
task-tracking/
  TASK_[ID]/
    ├── task-description.md
    ├── implementation-plan.md
    ├── progress.md
    ├── code-review.md
    └── completion-report.md
```

---

## Phase 1: Project Manager

### Context Preparation

First, capture and read the user's original request:

```bash
# Store the original user request for all agents to reference
USER_REQUEST="$ARGUMENTS"
echo "User Request: $USER_REQUEST" > task-tracking/TASK_[ID]/context.md
```

### Agent Invocation

Use the Task tool to invoke the project-manager agent:

**Prompt for Project Manager:**

```
You are the project-manager for TASK_[ID].

## ORIGINAL USER REQUEST
The user has requested: "$ARGUMENTS"

## YOUR RESPONSIBILITIES

1. Analyze the USER'S ACTUAL REQUEST above and create comprehensive task-description.md with:
   - Business value derived from what the user asked for
   - SMART acceptance criteria that validate the user's requirements
   - Risk analysis for the specific features requested
   - Dependencies mentioned or implied by the user
   - Success metrics aligned with user's goals

2. IMPORTANT: Base EVERYTHING on the actual user request above, not generic templates

3. Save your analysis to: task-tracking/TASK_[ID]/task-description.md

4. Analyze complexity and determine next agent:
   - If knowledge gaps exist → Route to researcher-expert
   - If requirements clear → Route to software-architect

5. Return delegation package with:
   - Next agent selection
   - The user's key requirements to pass forward
   - Specific task for next agent

Remember: Everything must address the user's specific request: "$ARGUMENTS"
```

### Quality Gate 1: Project Manager Validation

After project-manager returns, validate output:

**MANDATORY CHECKS:**

- [ ] task-description.md created and complete
- [ ] Business value clearly articulated
- [ ] Acceptance criteria in BDD format (Given/When/Then)
- [ ] Risk matrix populated with mitigation strategies
- [ ] Dependencies documented
- [ ] Success metrics quantifiable
- [ ] Delegation request clear

**VALIDATION CRITERIA:**

```typescript
interface TaskDescriptionValidation {
  hasBusinessValue: boolean; // Must explain why
  hasAcceptanceCriteria: boolean; // Must be BDD format
  hasRiskAnalysis: boolean; // Must include mitigation
  hasDependencies: boolean; // Must list all deps
  hasMetrics: boolean; // Must be measurable
  hasDelegation: boolean; // Must specify next agent
}
```

If ANY validation fails → Request project-manager to revise
If ALL validations pass → Parse delegation and proceed

---

## Phase 2: Researcher Expert (Conditional)

### Activation Condition

Only invoke if project-manager delegation specifies researcher-expert

### Context Loading

```bash
# Read the original user request and previous work
USER_REQUEST=$(cat task-tracking/TASK_[ID]/context.txt | grep "User Request:" | cut -d: -f2-)
TASK_DESCRIPTION=$(cat task-tracking/TASK_[ID]/task-description.md)
```

### Agent Invocation

**Prompt for Researcher:**

```
You are the researcher-expert for TASK_[ID].

## ORIGINAL USER REQUEST
$USER_REQUEST

## PROJECT MANAGER'S ANALYSIS
$TASK_DESCRIPTION

## RESEARCH FOCUS
Based on the user's request and PM analysis, focus your research on the specific technologies and approaches needed.

## YOUR RESPONSIBILITIES

1. Research the SPECIFIC technologies/patterns mentioned in the user request
2. Evaluate approaches that meet the user's stated requirements
3. Create research-report.md with:
   - Executive summary addressing user's needs
   - Comparative analysis of solutions for user's use case
   - Risk assessment for the user's specific context
   - Recommended approach with justification
   - Knowledge gaps remaining

4. Save findings to: task-tracking/TASK_[ID]/research-report.md

5. Return delegation to software-architect with:
   - Key architectural considerations for user's requirements
   - Technology recommendations aligned with user's needs
   - Performance requirements from user's context
```

### Quality Gate 2: Research Validation

**MANDATORY CHECKS:**

- [ ] Multiple credible sources cited (minimum 5)
- [ ] Comparative analysis provided
- [ ] Clear recommendations with rationale
- [ ] Risk factors identified
- [ ] Trade-offs documented

---

## Phase 3: Software Architect

### Context Loading

```bash
# Read all previous context
USER_REQUEST=$(cat task-tracking/TASK_[ID]/context.txt | grep "User Request:" | cut -d: -f2-)
TASK_DESCRIPTION=$(cat task-tracking/TASK_[ID]/task-description.md)
RESEARCH_REPORT=$(cat task-tracking/TASK_[ID]/research-report.md 2>/dev/null || echo "No research phase")
```

### Agent Invocation

**Prompt for Architect:**

```
You are the software-architect for TASK_[ID].

## ORIGINAL USER REQUEST
$USER_REQUEST

## PROJECT MANAGER'S REQUIREMENTS
$TASK_DESCRIPTION

## RESEARCH FINDINGS
$RESEARCH_REPORT

## YOUR RESPONSIBILITIES

1. Design architecture that SPECIFICALLY addresses the user's request above
2. Create implementation-plan.md with:
   - Architectural blueprint for user's requirements
   - Design patterns justified for user's use case
   - Component architecture matching user's needs
   - Subtask breakdown of user's requested features
   - Integration strategy for user's context

3. CRITICAL: Follow Type Search Protocol
   - Search @hive-academy/shared for existing types
   - Document search results
   - Justify any new types

4. Apply SOLID principles while keeping user's requirements in focus
5. Create subtasks that map directly to user's requested features

6. Save to: task-tracking/TASK_[ID]/implementation-plan.md

7. Return delegation to appropriate developer with:
   - For backend tasks: backend-developer
   - For frontend tasks: frontend-developer
   - For full-stack: start with backend-developer, then frontend-developer
   - Include first subtask from user's requirements
   - Context needed to implement user's request
```

### Quality Gate 3: Architecture Validation

**MANDATORY CHECKS:**

- [ ] implementation-plan.md complete
- [ ] Design patterns justified (not just applied)
- [ ] SOLID principles evident
- [ ] No unnecessary complexity
- [ ] Type search documented
- [ ] Subtasks clear and < 4 hours each
- [ ] Integration points defined

**CODE QUALITY STANDARDS:**

```typescript
interface ArchitectureValidation {
  hasPatternJustification: boolean; // Why this pattern?
  followsSOLID: boolean; // Each principle checked
  appropriateComplexity: boolean; // KISS principle
  typeSearchDocumented: boolean; // MANDATORY
  subtasksActionable: boolean; // Clear deliverables
}
```

---

## Phase 4: Development (Backend/Frontend)

### Context Loading

```bash
# Read all context and determine developer type needed
USER_REQUEST=$(cat task-tracking/TASK_[ID]/context.txt | grep "User Request:" | cut -d: -f2-)
IMPLEMENTATION_PLAN=$(cat task-tracking/TASK_[ID]/implementation-plan.md)
ACCEPTANCE_CRITERIA=$(grep -A20 "Acceptance Criteria" task-tracking/TASK_[ID]/task-description.md)
PROGRESS=$(cat task-tracking/TASK_[ID]/progress.md 2>/dev/null || echo "Starting implementation")

# Determine which developer to use
TASK_TYPE=$(grep -i "Task Type:" task-tracking/TASK_[ID]/implementation-plan.md | cut -d: -f2)
```

### Developer Selection

**Decision Logic:**

- If task involves API, services, database, or backend logic → backend-developer
- If task involves UI, components, styling, or frontend → frontend-developer
- If task involves both → sequence both developers

### Agent Invocation

**For Backend Tasks - Prompt for Backend Developer:**

```
You are the backend-developer for TASK_[ID].

## ORIGINAL USER REQUEST
$USER_REQUEST

## IMPLEMENTATION PLAN
$IMPLEMENTATION_PLAN

## ACCEPTANCE CRITERIA TO MEET
$ACCEPTANCE_CRITERIA

## CURRENT PROGRESS
$PROGRESS

## YOUR RESPONSIBILITIES

1. Implement the backend features that the USER REQUESTED above
2. MANDATORY: Execute Type Search Protocol
   - Search @hive-academy/shared FIRST
   - Check core/backend infrastructure services
   - Document findings in progress.md
   - Extend existing types, don't duplicate

3. Implement with NestJS best practices:
   - Use dependency injection
   - Follow module boundaries
   - Implement proper error handling
   - Use existing Neo4j/ChromaDB services
   - Keep services under 200 lines

4. Update progress.md with:
   - What backend features you implemented
   - Services and repositories used
   - API endpoints created
   - What remains for frontend

5. Save code and update: task-tracking/TASK_[ID]/progress.md

Return status showing which backend requirements are complete.
```

**For Frontend Tasks - Prompt for Frontend Developer:**

```
You are the frontend-developer for TASK_[ID].

## ORIGINAL USER REQUEST
$USER_REQUEST

## IMPLEMENTATION PLAN
$IMPLEMENTATION_PLAN

## ACCEPTANCE CRITERIA TO MEET
$ACCEPTANCE_CRITERIA

## CURRENT PROGRESS
$PROGRESS

## YOUR RESPONSIBILITIES

1. Implement the frontend features that the USER REQUESTED above
2. MANDATORY: Execute Component Search Protocol
   - Search @hive-academy-studio/shared/ui FIRST for components
   - Check @hive-academy-studio/shared/data-access for services
   - Document findings in progress.md
   - Extend existing components, don't duplicate

3. Implement with Angular 18+ best practices:
   - Use signals for state management
   - Create beautiful UI with DaisyUI/TailwindCSS
   - Apply generous white space for clean design
   - Keep components under 100 lines
   - Ensure WCAG 2.1 accessibility

4. Update progress.md with:
   - What UI components you implemented
   - Existing components reused
   - Services integrated
   - What remains for implementation

5. Save code and update: task-tracking/TASK_[ID]/progress.md

Return status showing which frontend requirements are complete.
```

**For Full-Stack Tasks - Sequential Developer Execution:**

When a task requires both backend and frontend work:

1. **First: Backend Developer**

   - Implement API endpoints, services, database logic
   - Create DTOs and interfaces
   - Set up data flow architecture
   - Document API contracts in progress.md

2. **Then: Frontend Developer**

   - Consume the backend APIs
   - Create UI components and pages
   - Implement state management
   - Connect frontend to backend services

3. **Coordination Notes:**
   - Backend developer must document API contracts clearly
   - Frontend developer reads backend implementation first
   - Both update the same progress.md file
   - Maintain clear handoff documentation

### Quality Gate 4: Implementation Validation

**MANDATORY CHECKS:**

- [ ] Code compiles (nx affected:build)
- [ ] Zero 'any' types (grep -r "any" --include="\*.ts")
- [ ] Type search executed and documented
- [ ] Functions under 30 lines
- [ ] Error handling with context
- [ ] Progress.md updated
- [ ] Follows architectural plan

**AUTOMATED CHECKS:**

```bash
# Type safety check
nx affected:lint --fix=false
grep -r ": any" libs/ --include="*.ts" | grep -v ".spec.ts"

# Complexity check
npx complexity-report src/

# Build verification
nx affected:build
```

---

## Phase 5: Senior Tester

### Context Loading

```bash
# Read user request, acceptance criteria, and implementation
USER_REQUEST=$(cat task-tracking/TASK_[ID]/context.txt | grep "User Request:" | cut -d: -f2-)
ACCEPTANCE_CRITERIA=$(grep -A50 "Acceptance Criteria" task-tracking/TASK_[ID]/task-description.md)
IMPLEMENTATION=$(git diff --name-only)
```

### Agent Invocation

**Prompt for Tester:**

```
You are the senior-tester for TASK_[ID].

## ORIGINAL USER REQUEST
$USER_REQUEST

## ACCEPTANCE CRITERIA TO VERIFY
$ACCEPTANCE_CRITERIA

## IMPLEMENTED FILES
$IMPLEMENTATION

## YOUR RESPONSIBILITIES

1. Create tests that verify the USER'S REQUIREMENTS are met:
   - Unit tests for user's requested features
   - Integration tests for user's workflows
   - Edge cases relevant to user's context
   - Performance benchmarks for user's needs

2. Verify EACH acceptance criterion from user's request
3. Document test results showing:
   - Which user requirements are tested
   - Coverage of user's features
   - Any gaps in meeting user's needs

4. Save report to: task-tracking/TASK_[ID]/test-report.md

Return test report confirming user's requirements are met.
```

### Quality Gate 5: Test Validation

**MANDATORY CHECKS:**

- [ ] Coverage > 80% (line, branch, function)
- [ ] All acceptance criteria have tests
- [ ] Edge cases tested (null, boundary, concurrent)
- [ ] No flaky tests
- [ ] Performance tests included
- [ ] Test names descriptive

**VERIFICATION:**

```bash
# Coverage check
nx affected:test --coverage

# Acceptance criteria mapping
echo "Verify each AC has corresponding test"
```

---

## Phase 6: Code Reviewer

### Context Loading

```bash
# Load complete context for final review
USER_REQUEST=$(cat task-tracking/TASK_[ID]/context.txt | grep "User Request:" | cut -d: -f2-)
TASK_DESCRIPTION=$(cat task-tracking/TASK_[ID]/task-description.md)
IMPLEMENTATION_PLAN=$(cat task-tracking/TASK_[ID]/implementation-plan.md)
TEST_REPORT=$(cat task-tracking/TASK_[ID]/test-report.md)
ALL_CHANGES=$(git diff --stat)
```

### Agent Invocation

**Prompt for Reviewer:**

```
You are the code-reviewer for TASK_[ID].

## ORIGINAL USER REQUEST
$USER_REQUEST

## WHAT WAS SUPPOSED TO BE BUILT
$TASK_DESCRIPTION

## HOW IT WAS DESIGNED
$IMPLEMENTATION_PLAN

## TEST RESULTS
$TEST_REPORT

## CHANGES MADE
$ALL_CHANGES

## YOUR RESPONSIBILITIES

1. Verify the implementation MEETS THE USER'S ORIGINAL REQUEST:
   - Does it do what the user asked for?
   - Are all user requirements satisfied?
   - Any gaps between request and implementation?

2. Review quality across dimensions:
   - Technical correctness for user's use case
   - Architecture compliance with user's needs
   - Security for user's context
   - Performance for user's requirements
   - Code standards

3. Create code-review.md with:
   - Confirmation user's needs are met
   - Quality score (X/10)
   - Any gaps from user's request
   - Critical issues (if any)
   - Final decision

4. Save to: task-tracking/TASK_[ID]/code-review.md

Return APPROVED if user's requirements are met, otherwise NEEDS_REVISION.
```

### Quality Gate 6: Final Validation

**APPROVAL CRITERIA:**

- [ ] All previous quality gates passed
- [ ] No critical issues
- [ ] Security verified
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Ready for production

---

## Phase 7: Completion

### Task Closure

1. Update task registry with completion status
2. Create completion-report.md with:

   - Executive summary
   - Metrics achieved
   - Lessons learned
   - Future recommendations

3. Git operations:

```bash
git add task-tracking/TASK_[ID]/
git commit -m "feat(TASK_[ID]): [description]"
```

4. Final output:

```markdown
## TASK COMPLETED SUCCESSFULLY

**Task ID**: TASK\_[ID]
**Quality Score**: [X]/10
**Coverage**: [X]%
**Performance**: [Metrics]

**Deliverables**:

- [List of created/modified files]

**Next Steps**:

1. [Immediate actions]
2. [Future enhancements]

The task has passed all quality gates and is ready for deployment.
```

---

## ERROR HANDLING

If any phase fails:

1. Document failure in progress.md
2. Identify root cause
3. Determine recovery strategy
4. Re-invoke appropriate agent with corrections

## PROGRESS TRACKING

Throughout workflow:

- Update progress.md after each phase
- Track time spent per phase
- Document any blockers
- Maintain audit trail

## QUALITY METRICS

Track and report:

- Time per phase
- Quality gate pass rate
- Rework required
- Final quality score

---

Remember: This is a SEQUENTIAL workflow. Each phase must complete successfully before proceeding to the next. No parallel agent execution is permitted to prevent memory issues.
