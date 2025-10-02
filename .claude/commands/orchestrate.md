# Orchestrate Development Workflow

Orchestrates clean, sequential agent workflow with validation gates and trunk-based development.

## Usage

`/orchestrate [task description or TASK_ID]`

Examples:

- `/orchestrate implement real-time messaging for user notifications`
- `/orchestrate TASK_CMD_009`
- `/orchestrate continue` (continues last incomplete task)

---

## 🎯 WORKFLOW OVERVIEW

```pseudocode
Phase 0: Task Initialization (Registry + Git Setup)
    ↓
Phase 1: project-manager → business-analyst → [CONTINUE/REWORK]
    ↓
Phase 2: researcher-expert → business-analyst → [CONTINUE/REWORK]
    ↓
Phase 3: software-architect → business-analyst → [CONTINUE/REWORK]
    ↓
Phase 4: backend/frontend-developer → business-analyst → [CONTINUE/REWORK]
    ↓
Phase 5: senior-tester → business-analyst → [CONTINUE/REWORK]
    ↓
Phase 6: code-reviewer → business-analyst → [CONTINUE/REWORK]
    ↓
Phase 7: Task Completion (PR Creation + Registry Update)
    ↓
Phase 8: Future Work Consolidation (project-manager)
```

---

## Phase 0: Task Initialization

### Task Setup & Git Operations

```bash
# ===== ORCHESTRATOR BOOTSTRAP =====
echo "🚀 Initializing Orchestrator Environment..."

# Task initiation
USER_REQUEST="$ARGUMENTS"
echo "=== ORCHESTRATOR INITIATED ==="
echo "User Request: $USER_REQUEST"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"

# Git status check
git branch --show-current
git status --short

# Clean git state (commit AND PUSH any pending work)
if ! git diff --quiet; then
    echo "Committing pending work before new task..."
    git add .
    git commit -m "chore: checkpoint before starting new task"
    
    # CRITICAL: Push to remote to prevent local tangled commits
    echo "Pushing pending work to remote..."
    git push origin $(git branch --show-current)
    echo "✅ Pending work safely pushed to remote"
fi

# Also check for unpushed commits
UNPUSHED=$(git log @{u}.. --oneline 2>/dev/null | wc -l)
if [ "$UNPUSHED" -gt 0 ]; then
    echo "⚠️ Found $UNPUSHED unpushed commits, pushing to remote..."
    git push origin $(git branch --show-current)
    echo "✅ All commits pushed to remote"
fi

# Generate predictable sequential TASK_ID with format: TASK_YYYY_NNN
YEAR=$(date +%Y)
REGISTRY_FILE="task-tracking/registry.md"

# Ensure registry exists with proper headers
if [ ! -f "$REGISTRY_FILE" ]; then
    mkdir -p task-tracking
    echo "# Task Registry" > "$REGISTRY_FILE"
    echo "" >> "$REGISTRY_FILE"
    echo "Generated with sequential TASK_YYYY_NNN format for predictable task IDs." >> "$REGISTRY_FILE"
    echo "" >> "$REGISTRY_FILE"
    echo "| Task ID      | Title                    | Status      | Type    | Priority | Effort | Created    | Updated    | Completed  | Branch      |" >> "$REGISTRY_FILE"
    echo "| ------------ | ------------------------ | ----------- | ------- | -------- | ------ | ---------- | ---------- | ---------- | ----------- |" >> "$REGISTRY_FILE"
fi

# Find highest task number for current year using TASK_YYYY_NNN format
HIGHEST_NUM=$(grep "TASK_${YEAR}_" "$REGISTRY_FILE" | \
    sed -n "s/.*TASK_${YEAR}_\([0-9]\{3\}\).*/\1/p" | \
    sort -n | tail -1)

# Calculate next sequential number (ensures 3-digit zero-padded format)
if [ -z "$HIGHEST_NUM" ]; then
    NEXT_NUM="001"  # Start with 001 for first task of the year
else
    NEXT_NUM=$(printf "%03d" $((10#$HIGHEST_NUM + 1)))
fi

# Generate predictable task ID: TASK_YYYY_NNN
TASK_ID="TASK_${YEAR}_${NEXT_NUM}"

echo "📋 Generated Task ID: $TASK_ID (Format: TASK_YYYY_NNN)"

# Determine task type and priority
TASK_TYPE="Feature"  # Default, can be enhanced based on request analysis
TASK_PRIORITY="P2-Medium"  # Default, can be enhanced based on urgency
TASK_EFFORT="M"  # Default, can be enhanced based on complexity

# Create registry entry FIRST (registry-first approach)
CREATED_DATE=$(date '+%Y-%m-%d')
CREATED_TIME=$(date '+%Y-%m-%d %H:%M:%S')
BRANCH_NUMBER="${TASK_ID##*_}"  # Extract number part for short branch name
BRANCH_NAME="feature/${BRANCH_NUMBER}"

# Add to registry with complete information
echo "| $TASK_ID | $USER_REQUEST | 🔄 Active | $TASK_TYPE | $TASK_PRIORITY | $TASK_EFFORT | $CREATED_DATE | $CREATED_TIME | | $BRANCH_NAME |" >> "$REGISTRY_FILE"

# Create feature branch
git checkout -b "$BRANCH_NAME"
git push -u origin "$BRANCH_NAME"

# Create task folder structure
mkdir -p "task-tracking/$TASK_ID"

# Create comprehensive context file with user intent AND conversation summary
cat > "task-tracking/$TASK_ID/context.md" << EOF
# Task Context for $TASK_ID

## User Intent
$USER_REQUEST

## Conversation Summary
[ORCHESTRATOR NOTE: This section MUST be populated with actual conversation details when running /orchestrate]
- Key decisions made in the conversation
- Technical constraints discussed
- Specific requirements mentioned
- Any clarifications or scope adjustments
- Referenced files or components
- Previous attempts or approaches discussed
- User preferences and coding style requirements
- Any warnings or important context from the user

## Technical Context
- Branch: $BRANCH_NAME
- Created: $CREATED_TIME
- Task Type: $TASK_TYPE
- Priority: $TASK_PRIORITY
- Effort Estimate: $TASK_EFFORT

## Important Notes
- Any warnings or critical information from the conversation
- Dependencies or prerequisites discussed
- Expected outcomes or success criteria

---
*This context file provides agents with both the user's original request and valuable conversation history to ensure accurate implementation.*
EOF

# Commit task setup
git add .
git commit -m "feat($TASK_ID): initialize task - $USER_REQUEST"
git push origin "$BRANCH_NAME"

echo "✅ Task $TASK_ID initialized on branch $BRANCH_NAME"

# Export environment for agents
export TASK_ID="$TASK_ID"
export USER_REQUEST="$USER_REQUEST"
export OPERATION_MODE="ORCHESTRATION"
export REGISTRY_FILE="$REGISTRY_FILE"
```

---

## Phase 1: Project Manager → Validation

### 1.1 Invoke Project Manager

Use the Task tool to invoke the project-manager agent with this prompt:

```markdown
You are the project-manager for $TASK_ID in ORCHESTRATION mode.

## TASK CONTEXT

- Task ID: $TASK_ID
- User Request: "$USER_REQUEST"
- Full Context: task-tracking/$TASK_ID/context.md (includes conversation summary)
- Registry File: task-tracking/registry.md
- Task Folder: task-tracking/$TASK_ID/

## REGISTRY MANAGEMENT

Update your status in the registry file task-tracking/registry.md:

- Find the line that starts with "| $TASK_ID |"
- Change the status column (3rd column) to "🔄 Active (Project Manager)"
- Preserve all other columns unchanged

## YOUR DELIVERABLES

1. Create task-tracking/$TASK_ID/task-description.md with comprehensive requirements
2. Update registry status to "🔄 Active (Requirements)"
3. Return delegation to next agent (researcher-expert OR software-architect)

## INSTRUCTIONS

- Focus ONLY on the user's actual request - no scope expansion
- Create enterprise-grade requirements with acceptance criteria
- Analyze risks and dependencies
- Delegate to researcher-expert if technical research needed, otherwise software-architect
```

### 1.2 Validate Project Manager Work

Use the Task tool to invoke the business-analyst agent with this prompt:

```markdown
You are the business-analyst for $TASK_ID - Project Manager Validation Phase.

## VALIDATION TARGET

- Agent: project-manager
- Deliverable: task-tracking/$TASK_ID/task-description.md

## CONTEXT

- Original User Request: "$USER_REQUEST"
- Task Registry: task-tracking/registry.md

## VALIDATION CRITERIA

- Requirements directly address user's request
- Acceptance criteria are clear and testable
- Risk assessment is realistic
- Delegation choice is appropriate

## DECISION REQUIRED

- APPROVE ✅: Proceed to next phase
- REJECT ❌: Re-delegate to project-manager with corrections

Return validation decision with specific evidence.
```

### 1.3 Process Validation Result

Based on the business-analyst validation decision:

**If APPROVED ✅**: Proceed to Phase 2 (Researcher Expert) or Phase 3 (Software Architect) based on project-manager delegation

**If REJECTED ❌**: Re-invoke project-manager agent with the business-analyst feedback and corrections, then re-validate

---

## Phase 2: Researcher Expert → Validation

### 2.1 Invoke Researcher Expert (if needed)

Only invoke if project-manager delegation specified researcher-expert.

Use the Task tool to invoke the researcher-expert agent with this prompt:

```markdown
You are the researcher-expert for $TASK_ID in ORCHESTRATION mode.

## TASK CONTEXT

- Task ID: $TASK_ID
- User Request: "$USER_REQUEST"
- Full Context: task-tracking/$TASK_ID/context.md (includes conversation summary)
- Requirements: task-tracking/$TASK_ID/task-description.md

## REGISTRY MANAGEMENT

Update your status in the registry file task-tracking/registry.md:

- Find the line that starts with "| $TASK_ID |"
- Change the status column (3rd column) to "🔄 Active (Research)"
- Preserve all other columns unchanged

## YOUR DELIVERABLES

1. Create task-tracking/$TASK_ID/research-report.md with technical findings
2. Return delegation to software-architect

## INSTRUCTIONS

- Focus research on user's specific technical needs
- Research implementation patterns, libraries, best practices
- Identify potential technical challenges and solutions
- Provide actionable recommendations for architecture phase
```

### 2.2 Validate Researcher Work

Use the Task tool to invoke the business-analyst agent with this prompt:

```markdown
You are the business-analyst for $TASK_ID - Researcher Expert Validation Phase.

## VALIDATION TARGET

- Agent: researcher-expert
- Deliverable: task-tracking/$TASK_ID/research-report.md

## CONTEXT

- Original User Request: "$USER_REQUEST"
- Project Requirements: task-tracking/$TASK_ID/task-description.md

## VALIDATION CRITERIA

- Research addresses technical requirements
- Findings are actionable for implementation
- Recommendations are realistic and practical

## DECISION REQUIRED

- APPROVE ✅: Proceed to software-architect
- REJECT ❌: Re-delegate to researcher-expert

Return validation decision with architect guidance.
```

---

## Phase 3: Software Architect → Validation

### 3.1 Invoke Software Architect

Use the Task tool to invoke the software-architect agent with this prompt:

```markdown
You are the software-architect for $TASK_ID in ORCHESTRATION mode.

## TASK CONTEXT

- Task ID: $TASK_ID
- User Request: "$USER_REQUEST"
- Full Context: task-tracking/$TASK_ID/context.md (includes conversation summary)
- Requirements: task-tracking/$TASK_ID/task-description.md
- Research: task-tracking/$TASK_ID/research-report.md (if exists)

## REGISTRY MANAGEMENT

Update your status in the registry file task-tracking/registry.md:

- Find the line that starts with "| $TASK_ID |"
- Change the status column (3rd column) to "🔄 Active (Architecture)"
- Preserve all other columns unchanged

## YOUR DELIVERABLES

1. Create task-tracking/$TASK_ID/implementation-plan.md with technical design
2. Return delegation to appropriate developer (backend-developer/frontend-developer)

## INSTRUCTIONS

- Focus on optimal value delivery for user's needs
- Organize implementation by dependencies and complexity
- Only move architectural improvements (not user functionality) to future tasks
- Choose appropriate developer based on implementation needs
- Provide clear, actionable architecture plan
```

### 3.2 Validate Architect Work

Use the Task tool to invoke the business-analyst agent:

**Prompt:**

```markdown
You are the business-analyst for $TASK_ID - Software Architect Validation Phase.

## VALIDATION TARGET

**Agent**: software-architect
**Deliverable**: task-tracking/$TASK_ID/implementation-plan.md

## VALIDATION FOCUS

1. **User Focus**: Plan directly addresses user's request completely?
2. **Value Optimization**: Implementation strategy based on dependencies and complexity?
3. **Registry Usage**: Only architectural improvements moved to registry.md as future tasks?

## VALIDATION DECISION REQUIRED

- APPROVE ✅: Proceed to development phase
- REJECT ❌: Re-delegate to software-architect with value optimization corrections

Return validation decision with developer assignment.
```

---

## Phase 4: Development → Validation

### 4.1 Invoke Developer(s)

Determine developer type from architect delegation, then use the Task tool to invoke the appropriate agent:

```markdown
You are the [backend-developer|frontend-developer] for $TASK_ID in ORCHESTRATION mode.

## TASK CONTEXT

- Task ID: $TASK_ID
- User Request: "$USER_REQUEST"
- Full Context: task-tracking/$TASK_ID/context.md (includes conversation summary)
- Implementation Plan: task-tracking/$TASK_ID/implementation-plan.md
- Requirements: task-tracking/$TASK_ID/task-description.md

## REGISTRY MANAGEMENT

Update your status in the registry file task-tracking/registry.md:

- Find the line that starts with "| $TASK_ID |"
- Change the status column (3rd column) to "🔄 Active (Development)"
- Preserve all other columns unchanged

## YOUR DELIVERABLES

1. Implement code changes with REAL business logic (no stubs/simulations)
2. Create task-tracking/$TASK_ID/progress.md with implementation details
3. Update registry status when complete

## CRITICAL REQUIREMENTS

- Implement actual, working functionality using the full stack
- Use real database connections (ChromaDB + Neo4j + LangGraph)
- Create production-ready code that solves the user's request
- Follow the architecture plan exactly
- NO placeholder implementations or stubs
```

### 4.2 Validate Development Work

Use the Task tool to invoke the business-analyst agent:

**Prompt:**

```markdown
You are the business-analyst for $TASK_ID - Development Validation Phase.

## VALIDATION TARGET

**Agent**: $DEVELOPER_TYPE
**Deliverable**: Code implementation + progress.md

## VALIDATION FOCUS

1. **User Requirements**: Does implementation solve user's actual problem?
2. **Scope Adherence**: No unrelated technical improvements?
3. **Critical Issues**: High-priority research findings addressed?

## VALIDATION DECISION REQUIRED

- APPROVE ✅: Proceed to testing phase
- REJECT ❌: Re-delegate to developer with requirement focus

Return validation decision with testing guidance.
```

---

## Phase 5: Senior Tester → Validation

### 5.1 Invoke Senior Tester

Use the Task tool to invoke the senior-tester agent with this prompt:

```markdown
You are the senior-tester for $TASK_ID in ORCHESTRATION mode.

## TASK CONTEXT

- Task ID: $TASK_ID
- User Request: "$USER_REQUEST"
- Full Context: task-tracking/$TASK_ID/context.md (includes conversation summary)
- Implementation Plan: task-tracking/$TASK_ID/implementation-plan.md
- Progress Report: task-tracking/$TASK_ID/progress.md

## REGISTRY MANAGEMENT

Update your status in the registry file task-tracking/registry.md:

- Find the line that starts with "| $TASK_ID |"
- Change the status column (3rd column) to "🔄 Active (Testing)"
- Preserve all other columns unchanged

## YOUR DELIVERABLES

1. Implement tests that verify user's requirements are met
2. Create task-tracking/$TASK_ID/test-report.md with test results

## INSTRUCTIONS

- Test actual functionality implemented by developers
- Focus on user acceptance criteria from requirements
- Test real integrations (ChromaDB, Neo4j, LangGraph)
- Verify production-ready behavior, not theoretical edge cases
```

### 5.2 Validate Testing Work

Use the Task tool to invoke the business-analyst agent:

**Prompt:**

```markdown
You are the business-analyst for $TASK_ID - Senior Tester Validation Phase.

## VALIDATION TARGET

**Agent**: senior-tester
**Deliverable**: Tests + test-report.md

## VALIDATION FOCUS

User's acceptance criteria covered by tests?

## VALIDATION DECISION REQUIRED

- APPROVE ✅: Proceed to code review
- REJECT ❌: Re-delegate to senior-tester

Return validation decision.
```

---

## Phase 6: Code Reviewer → Validation

### 6.1 Invoke Code Reviewer

Use the Task tool to invoke the code-reviewer agent with this prompt:

```markdown
You are the code-reviewer for $TASK_ID in ORCHESTRATION mode.

## TASK CONTEXT

- Task ID: $TASK_ID
- User Request: "$USER_REQUEST"
- Full Context: task-tracking/$TASK_ID/context.md (includes conversation summary)
- Requirements: task-tracking/$TASK_ID/task-description.md
- Implementation Plan: task-tracking/$TASK_ID/implementation-plan.md
- Test Report: task-tracking/$TASK_ID/test-report.md

## REGISTRY MANAGEMENT

Update your status in the registry file task-tracking/registry.md:

- Find the line that starts with "| $TASK_ID |"
- Change the status column (3rd column) to "🔄 Active (Code Review)"
- Preserve all other columns unchanged

## YOUR DELIVERABLES

1. Create task-tracking/$TASK_ID/code-review.md with review results
2. Return APPROVED/NEEDS_REVISION decision

## REVIEW CRITERIA

- Implementation solves user's original request
- Code quality meets production standards
- Real functionality (no stubs or placeholders)
- Proper integration with full stack (ChromaDB + Neo4j + LangGraph)
- Tests validate user requirements
- No unrelated technical improvements
```

### 6.2 Final Validation

Use the Task tool to invoke the business-analyst agent:

**Prompt:**

```markdown
You are the business-analyst for $TASK_ID - Final Code Review Validation.

## VALIDATION TARGET

**Agent**: code-reviewer
**Deliverable**: task-tracking/$TASK_ID/code-review.md

## FINAL VALIDATION

Does the complete solution address the user's original request: "$USER_REQUEST"?

## VALIDATION DECISION REQUIRED

- APPROVE ✅: Ready for task completion
- REJECT ❌: Re-delegate for corrections

Return final validation decision.
```

---

## Phase 7: Task Completion

### 7.1 Create Pull Request

After all validations pass, complete the task:

1. **Final Commit**: Commit all remaining changes with message: `feat($TASK_ID): complete user request - $USER_REQUEST`
2. **Push Changes**: Push the feature branch to origin
3. **Create Pull Request** with:
   - Title: `feat($TASK_ID): $USER_REQUEST`
   - Body including:
     - Summary of completed task
     - Key implementation changes
     - Test coverage summary
     - Note that all phases were validated by business-analyst

### 7.2 Update Registry

Update the registry file task-tracking/registry.md:

- Find the line that starts with "| $TASK_ID |"
- Change the status column (3rd column) to "✅ Complete"
- Add completion date to the "Completed" column
- Preserve all other columns unchanged

### 7.3 Task Completion Summary

Report completion with:

- 🎉 Task $TASK_ID completed successfully
- 📋 User Request: $USER_REQUEST
- 🔗 Pull Request URL
- 🌿 Branch: $BRANCH_NAME
- 📊 Registry status: ✅ Complete

**Next Steps**: Review and merge PR, deploy if approved, close task branch after merge

---

## Phase 8: Future Work Consolidation

### 8.1 Invoke Modernization Detector for Future Work Consolidation

Use the Task tool to invoke the modernization-detector agent with this prompt:

```markdown
You are the modernization-detector for $TASK_ID in ORCHESTRATION mode.

## TASK CONTEXT

- Task ID: $TASK_ID
- User Request: "$USER_REQUEST"
- Full Context: task-tracking/$TASK_ID/context.md (includes conversation summary)
- All task deliverables in: task-tracking/$TASK_ID/

## REGISTRY MANAGEMENT

Update your status in the registry file task-tracking/registry.md:

- Find the line that starts with "| $TASK_ID |"
- Change the status column (3rd column) to "🔄 Active (Future Work)"
- Preserve all other columns unchanged

## YOUR DELIVERABLES

1. Create task-tracking/$TASK_ID/future-enhancements.md with consolidation
2. Update task-tracking/registry.md with properly categorized future tasks
3. Create/Update task-tracking/future-work-dashboard.md (project-wide view)

## INSTRUCTIONS

- Consolidate all future work opportunities from task deliverables
- Identify additional modernization opportunities from implemented code
- Properly categorize and prioritize future tasks
- Ensure each item has clear effort estimates and business value
```

### 8.2 Validate Future Work Consolidation

Use the Task tool to invoke the business-analyst agent with this prompt:

```markdown
You are the business-analyst for $TASK_ID - Future Work Consolidation Validation Phase.

## VALIDATION TARGET

- Agent: modernization-detector
- Deliverable: task-tracking/$TASK_ID/future-enhancements.md

## VALIDATION CRITERIA

- All future recommendations from task deliverables captured
- Future work properly categorized and prioritized
- Each item has clear effort estimates and business value
- Registry updated with actionable future tasks

## DECISION REQUIRED

- APPROVE ✅: Future work properly consolidated and visible
- REJECT ❌: Re-delegate to modernization-detector with improvements

Return validation decision confirming future work visibility.
```

### 8.3 Process Future Work Validation

**If APPROVED ✅**: Future work consolidation complete

- 📋 Future enhancements documented in task-tracking/$TASK_ID/future-enhancements.md
- 🎯 Registry updated with prioritized future tasks
- 📊 Project-wide dashboard updated for planning visibility

**If REJECTED ❌**: Re-invoke modernization-detector with business-analyst feedback

---

## Error Handling

### Re-delegation Protocol

When validation fails:

1. **Capture Feedback**: Get specific feedback from business-analyst validation
2. **Re-invoke Agent**: Call the same agent again with the validation feedback included
3. **Retry Validation**: Re-run business-analyst validation on the revised deliverable
4. **Limit Retries**: Maximum 3 attempts per agent to prevent infinite loops

### Failure Recovery

If multiple validation failures occur (>3 retries):

1. **Update Registry**: Change task status to "❌ Failed" in task-tracking/registry.md
2. **Document Issues**: Create detailed failure report in task-tracking/$TASK_ID/failure-report.md
3. **Manual Review**: Create GitHub issue with:
   - Title: "Task $TASK_ID failed: $USER_REQUEST"
   - Body: "Multiple validation failures - requires manual review"
   - Labels: "orchestration-failure", "manual-review-needed"

---

## Workflow Principles

1. **Predictable Task IDs**: Sequential TASK_YYYY_NNN format for easy tracking
2. **Registry-First Approach**: Single source of truth in task-tracking/registry.md
3. **Verbal Instructions**: Environment-agnostic instructions instead of bash commands
4. **Sequential Agent Execution**: No parallel execution to prevent conflicts
5. **Validation Gates**: Every agent output validated by business-analyst
6. **User Focus**: Original request drives all decisions without scope expansion
7. **Real Implementation**: Zero tolerance for stubs, placeholders, or simulations
8. **Full Stack Integration**: Every feature uses ChromaDB + Neo4j + LangGraph

## Key Improvements in This Version

### ✅ Removed Dependencies

- No more .claude/commands/agent-bootstrap.md
- No more .claude/commands/task-management.md
- No more .claude/commands/registry-utils.md
- No complex function extraction from markdown files

### ✅ Environment Agnostic

- Replaced bash commands with clear verbal instructions
- Works across different operating systems and environments
- Agents can interpret instructions in their own context

### ✅ Predictable Task Management

- Consistent TASK_YYYY_NNN format (e.g., TASK_2025_001, TASK_2025_002)
- Sequential numbering resets each year
- Zero-padded 3-digit numbers for natural sorting

### ✅ Simplified Agent Instructions

- Clear, direct prompts for each agent
- Consistent registry management pattern
- Standardized deliverable requirements

**Remember**: This orchestrates workflow only. All implementation details live in individual agent definitions under .claude/agents/
