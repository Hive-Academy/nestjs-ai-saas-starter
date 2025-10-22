# Orchestrate Development Workflow

Lightweight multi-phase development workflow with dynamic task-type strategies, user validation checkpoints (PM & Architect only), and optional QA agents managed through an iterative coordinator pattern.

## Usage

`/orchestrate [task description or TASK_ID]`

Examples:

- `/orchestrate implement real-time messaging for user notifications`
- `/orchestrate fix authentication token expiration bug`
- `/orchestrate refactor user service to use repository pattern`
- `/orchestrate TASK_2025_001` (continue existing task)

---

## Architecture: Hybrid Orchestrator-Executor Pattern

This command implements a sophisticated orchestration pattern where:

1. **workflow-orchestrator agent** = Lightweight Coordinator

   - Analyzes task type and complexity
   - Executes Phase 0 (TASK_ID generation, context.md creation ONLY - no git)
   - Creates dynamic execution strategy based on task type
   - Provides next-step guidance for each phase
   - Does NOT validate outputs (user does for PM & Architect)

2. **You (main Claude Code thread)** = Execution Engine + User Interaction

   - Invokes workflow-orchestrator initially
   - Follows orchestrator's step-by-step guidance
   - Invokes recommended specialist agents
   - **Asks USER for validation** after PM and Architect complete
   - **Asks USER for QA choice** after developer completes
   - Returns agent results + user decisions to orchestrator

3. **User** = Validator & Decision Maker

   - Validates project-manager's task-description.md
   - Validates software-architect's implementation-plan.md
   - Chooses QA agents after development (tester/reviewer/both/skip)
   - Handles git operations when ready

4. **Specialist agents** = Domain Experts
   - Execute specific tasks (requirements, architecture, development, testing, review)
   - Return results to main thread
   - No awareness of orchestration context

---

## Your Instructions (Main Thread Execution Loop)

You are executing the orchestrate command. Follow this iterative pattern:

### Step 1: Initial Invocation

**First, detect if this is a NEW task or CONTINUATION:**

```javascript
// Check if argument is a TASK_ID (format: TASK_2025_XXX)
if ($ARGUMENTS matches /^TASK_2025_\d{3}$/) {
  MODE = "CONTINUATION"
  TASK_ID = $ARGUMENTS
} else {
  MODE = "NEW_TASK"
  TASK_DESCRIPTION = $ARGUMENTS
}
```

Invoke the **workflow-orchestrator** agent using the Task tool with this prompt:

**If MODE = "NEW_TASK":**

```
You are the workflow-orchestrator agent. I'm invoking you to coordinate a NEW development task.

## Task Request
$ARGUMENTS

## Mode
NEW_TASK - Initialize a new workflow

## Your Responsibilities

**Phase 0** - Lightweight initialization (NO git operations):
1. Read task-tracking/registry.md to find next sequential TASK_2025_NNN ID
2. Create task-tracking/TASK_2025_XXX/context.md with user intent and conversation summary
3. That's it! User handles git operations when ready.

**Task Analysis**:
- Analyze task type (FEATURE, BUGFIX, REFACTORING, DOCUMENTATION, RESEARCH)
- Assess complexity (Simple, Medium, Complex)
- Determine if technical research is needed

**Execution Strategy**:
- Choose appropriate agent sequence based on task type:
  - FEATURE: PM → USER VALIDATES → [Research] → Architect → USER VALIDATES → Dev → USER CHOOSES QA → Modernization
  - BUGFIX: Dev → USER CHOOSES QA (skip PM/Architect - requirements clear)
  - REFACTORING: Architect → USER VALIDATES → Dev → USER CHOOSES QA
  - DOCUMENTATION: PM → USER VALIDATES → Dev
  - RESEARCH: Researcher → [conditional implementation]

**Return Format**:
Provide guidance using formats defined in your agent definition:
- Task information (ID, type, complexity)
- Phase 0 completion confirmation
- Chosen execution strategy
- **NEXT ACTION:** INVOKE_AGENT | ASK_USER | USER_CHOICE | COMPLETE
- Specific agent name and full prompt (if INVOKE_AGENT)
- User validation instructions (if ASK_USER)
- User QA choice options (if USER_CHOICE)

I will follow your guidance, handle user interactions, and return results to you.
```

**If MODE = "CONTINUATION":**

```
You are the workflow-orchestrator agent. I'm invoking you to CONTINUE an existing workflow.

## Task Request
$ARGUMENTS (this is a TASK_ID, not a new request)

## Mode
CONTINUATION - Resume existing workflow

## Your Responsibilities

**Phase 0 for Continuation** - Analyze existing work:
1. Read task-tracking/$ARGUMENTS/context.md to understand original intent
2. Discover all existing documents using Glob(task-tracking/$ARGUMENTS/**.md)
3. Read registry.md to check current task status
4. Determine completed phases by checking which documents exist:
   - context.md → Task initialized
   - task-description.md → PM completed
   - implementation-plan.md → Architect completed
   - progress.md → Developer working/completed
   - test-report.md → Tester completed
   - code-review.md → Reviewer completed
   - future-enhancements.md → Modernization completed
5. Identify NEXT phase that needs to be executed
6. Check for any user feedback or correction requests in existing documents

**Return Format**:
Provide continuation guidance:
- Task information (ID from folder, original type, status from registry)
- Summary of completed phases
- Summary of what work exists
- **NEXT ACTION:** INVOKE_AGENT | ASK_USER | USER_CHOICE | COMPLETE
- Specific agent to invoke next OR user interaction needed

I will follow your guidance to resume the workflow from where it left off.
```

### Step 2: Follow Orchestrator Guidance

The orchestrator will return structured guidance containing:

- **Current Status**: Phase progress, task ID, current phase
- **NEXT ACTION**: One of:
  - **INVOKE_AGENT**: Specific agent to call with full prompt
  - **ASK_USER**: User validation required (PM or Architect deliverable)
  - **USER_CHOICE**: User chooses QA agents (after developer)
  - **COMPLETE**: Ready for task completion

**Your Actions**:

#### If NEXT ACTION = INVOKE_AGENT:

1. Use the **Task tool** to invoke the specified agent
2. Use the **exact prompt** provided by orchestrator
3. Wait for agent to complete and return results
4. Go to **Step 3**

#### If NEXT ACTION = ASK_USER:

1. **Read** the deliverable file specified (task-description.md or implementation-plan.md)
2. **Show** the content to the user
3. **Ask** the user: "Please review this deliverable. Reply with 'APPROVED ✅' to proceed or provide feedback for corrections."
4. **Wait** for user response
5. Go to **Step 3** with user's validation decision

#### If NEXT ACTION = USER_CHOICE:

1. **Ask** the user: "Development complete. Choose QA option: 'tester', 'reviewer', 'both' (parallel), or 'skip'"
2. **Wait** for user choice
3. If user chose "both", invoke **senior-tester** and **code-reviewer** in PARALLEL using multiple Task tool calls in single message
4. Go to **Step 3** with user's choice and any agent results

#### If NEXT ACTION = COMPLETE:

1. Notify user that all chosen phases are complete
2. User handles git operations when ready (branch, commit, push, PR)
3. Go to **Step 3** to invoke modernization-detector for Phase 8

### Step 3: Return to Orchestrator

Invoke the **workflow-orchestrator** agent again using the Task tool with this prompt:

```
You are the workflow-orchestrator agent. I'm returning with results from the previous step.

## Previous Step
[AGENT_INVOKED | USER_VALIDATION | USER_CHOICE]

[If agent was invoked]
## Agent Results
[agent-name] completed.
[Copy the complete response from the agent, including files created and recommendations]

[If user validated]
## User Validation Result
User reviewed [task-description.md | implementation-plan.md]
User decision: [APPROVED ✅ | "specific feedback provided"]

[If user chose QA]
## User QA Choice
User chose: [tester | reviewer | both | skip]
[If agents ran: Include their complete results]

## Context
- Task ID: [TASK_ID]
- Current Phase: [Phase name]

## What I Need
Provide next step guidance:
- NEXT ACTION (INVOKE_AGENT | ASK_USER | USER_CHOICE | COMPLETE)
- Specific agent and prompt if needed
- User interaction instructions if needed

I will continue following your guidance until workflow is complete.
```

### Step 4: Repeat Steps 2-3

Continue the loop:

- Orchestrator provides next guidance
- You invoke recommended agent
- You return results to orchestrator
- Repeat until orchestrator status = **WORKFLOW COMPLETE**

### Step 5: Final Report to User

When orchestrator returns **WORKFLOW COMPLETE**, summarize for the user:

```markdown
🎉 Task [TASK_ID] completed successfully

## Summary

- **Task**: [Original user request]
- **Task ID**: [TASK_ID]
- **Branch**: [feature/XXX]
- **Pull Request**: [PR_URL]
- **Strategy**: [Execution strategy used]

## Completed Phases

[List of all phases completed with checkmarks]

## Deliverables

[List of all files created in task-tracking/TASK_ID/]

## Quality Gates

- All phases validated by business-analyst ✅
- Real implementation (no stubs) ✅
- Full stack integration ✅

## Next Steps

1. Review pull request: [PR_URL]
2. Merge PR if approved
3. Deploy changes if applicable
4. Consider future enhancements from future-work-dashboard.md
```

---

## Key Execution Principles

1. **Iterative Coordination**: Always return to orchestrator after each step
2. **Exact Prompts**: Use the prompts provided by orchestrator verbatim
3. **Full Results**: Return complete agent responses to orchestrator, not summaries
4. **User Validation**: Ask user to validate PM and Architect deliverables
5. **User QA Choice**: Let user decide on testing/review after development
6. **Parallel QA**: When user chooses "both", run tester + reviewer in parallel
7. **Context Preservation**: Maintain task ID and phase info across iterations

---

## Dynamic Task Type Handling

The orchestrator intelligently chooses the workflow based on task analysis:

### FEATURE (Full Workflow)

- Project manager → **USER VALIDATES** ✋
- Researcher (if needed)
- Software architect → **USER VALIDATES** ✋
- Developer
- **USER CHOOSES** → Tester and/or Reviewer (can run parallel) or skip
- Modernization detector

### BUGFIX (Streamlined)

- Developer
- **USER CHOOSES** → Tester and/or Reviewer or skip
- (Skip PM/Architect - requirements clear)

### REFACTORING (Focused)

- Software architect → **USER VALIDATES** ✋
- Developer
- **USER CHOOSES** → Tester (regression) and/or Reviewer or skip

### DOCUMENTATION (Minimal)

- Project manager → **USER VALIDATES** ✋
- Developer

### RESEARCH (Investigation)

- Researcher
- Conditional continuation with implementation

---

## Benefits of This Architecture

✅ **Lightweight**: No heavy orchestrator overhead, fast Phase 0
✅ **User-Driven**: User validates critical deliverables (PM & Architect)
✅ **Flexible QA**: User decides testing/review strategy
✅ **Parallel Capable**: Can run tester + reviewer simultaneously
✅ **Dynamic**: Different task types get appropriate workflows
✅ **Traceable**: Full progress tracking in task-tracking/
✅ **Standards-Enforced**: Real implementation mandate, anti-backward compatibility
✅ **No Git Burden**: User handles git when ready, not forced by orchestrator

---

## Troubleshooting

### If orchestrator doesn't provide clear NEXT ACTION:

- Return to orchestrator with: "Please provide NEXT ACTION (INVOKE_AGENT/ASK_USER/USER_CHOICE/COMPLETE)"

### If user rejects PM or Architect deliverable multiple times (>3):

- Consider escalating to user for manual requirements clarification
- May need to refine user's original request

### If you're unsure about user validation or QA choice:

- Always ask user explicitly as specified in orchestrator's guidance
- Wait for user's clear response before proceeding

---

## Example Execution Flow

**User**: `/orchestrate implement user notifications`

1. **You** → Invoke workflow-orchestrator
2. **Orchestrator** → Phase 0 complete, returns: "INVOKE project-manager"
3. **You** → Invoke project-manager
4. **Project-Manager** → Creates task-description.md
5. **You** → Return to orchestrator with PM results
6. **Orchestrator** → Returns: "ASK_USER to validate task-description.md"
7. **You** → Show task-description.md to user, ask for validation
8. **User** → "APPROVED ✅"
9. **You** → Return to orchestrator with user approval
10. **Orchestrator** → Returns: "INVOKE software-architect"
11. **You** → Invoke software-architect
12. **Architect** → Creates implementation-plan.md
13. **You** → Return to orchestrator with architect results
14. **Orchestrator** → Returns: "ASK_USER to validate implementation-plan.md"
15. **You** → Show implementation-plan.md to user, ask for validation
16. **User** → "APPROVED ✅"
17. **You** → Return to orchestrator with user approval
18. **Orchestrator** → Returns: "INVOKE backend-developer"
19. **You** → Invoke backend-developer
20. **Developer** → Implements feature
21. **You** → Return to orchestrator with dev results
22. **Orchestrator** → Returns: "USER_CHOICE for QA agents"
23. **You** → Ask user: "Choose QA: tester/reviewer/both/skip"
24. **User** → "both"
25. **You** → Invoke senior-tester AND code-reviewer in PARALLEL
26. **Both agents** → Complete and return results
27. **You** → Return to orchestrator with QA results
28. **Orchestrator** → Returns: "COMPLETE - user handles git"
29. **You** → Notify user, invoke modernization-detector for Phase 8
    ... workflow complete

---

**This lightweight, user-driven orchestration pattern ensures flexible, validated workflows with optional QA and no forced git operations.**
