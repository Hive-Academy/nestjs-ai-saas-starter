---
description: Lightweight multi-phase development workflow with dynamic task-type strategies, user validation checkpoints (PM & Architect only), and optional QA agents managed through an iterative coordinator pattern.
---

Orchestrate Development Workflow
Lightweight multi-phase development workflow with dynamic task-type strategies, user validation checkpoints (PM & Architect only), and optional QA agents managed through an iterative coordinator pattern.

Usage
/orchestrate [task description or TASK_ID]

Examples:

/orchestrate implement real-time messaging for user notifications
/orchestrate fix authentication token expiration bug
/orchestrate refactor user service to use repository pattern
/orchestrate TASK_2025_001 (continue existing task)
Architecture: Hybrid Orchestrator-Executor Pattern
This command implements a sophisticated orchestration pattern where:

workflow-orchestrator agent = Lightweight Coordinator

Analyzes task type and complexity
Executes Phase 0 (TASK_ID generation, context.md creation ONLY - no git)
Creates dynamic execution strategy based on task type
Provides next-step guidance for each phase
Does NOT validate outputs (user does for PM & Architect)
You (main Claude Code thread) = Execution Engine + User Interaction

Invokes workflow-orchestrator initially
Follows orchestrator's step-by-step guidance
Invokes recommended specialist agents
Asks USER for validation after PM and Architect complete
Asks USER for QA choice after developer completes
Returns agent results + user decisions to orchestrator
User = Validator & Decision Maker

Validates project-manager's task-description.md
Validates software-architect's implementation-plan.md
Chooses QA agents after development (tester/reviewer/both/skip)
Handles git operations when ready
Specialist agents = Domain Experts

Execute specific tasks (requirements, architecture, development, testing, review)
Return results to main thread
No awareness of orchestration context
Your Instructions (Main Thread Execution Loop)
You are executing the orchestrate command. Follow this iterative pattern:

Step 1: Initial Invocation
First, detect if this is a NEW task or CONTINUATION:

// Check if argument is a TASK*ID (format: TASK_2025_XXX)
if ($ARGUMENTS matches /^TASK_2025*\d{3}$/) {
MODE = "CONTINUATION"
TASK_ID = $ARGUMENTS
} else {
MODE = "NEW_TASK"
TASK_DESCRIPTION = $ARGUMENTS
}
Invoke the workflow-orchestrator agent using the Task tool with this prompt:

If MODE = "NEW_TASK":

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
  - FEATURE: PM → USER VALIDATES → [Research] → [UI/UX Designer] → Architect → USER VALIDATES → Team-Leader (3 modes) → USER CHOOSES QA → Modernization
  - BUGFIX: Team-Leader (3 modes) → USER CHOOSES QA (skip PM/Architect - requirements clear)
  - REFACTORING: Architect → USER VALIDATES → Team-Leader (3 modes) → USER CHOOSES QA
  - DOCUMENTATION: PM → USER VALIDATES → Dev
  - RESEARCH: Researcher → [conditional implementation]

**Team-Leader 3-Mode Operation**:

- MODE 1: DECOMPOSITION - Creates tasks.md from implementation plan
- MODE 2: ASSIGNMENT - Iterative: Assign task → Developer implements → Verify → Repeat
- MODE 3: COMPLETION - Final verification when all tasks complete

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
If MODE = "CONTINUATION":

You are the workflow-orchestrator agent. I'm invoking you to CONTINUE an existing workflow.

## Task Request

$ARGUMENTS (this is a TASK_ID, not a new request)

## Mode

CONTINUATION - Resume existing workflow

## Your Responsibilities

**Phase 0 for Continuation** - Analyze existing work:

1. Read task-tracking/$ARGUMENTS/context.md to understand original intent
2. Discover all existing documents using Glob(task-tracking/$ARGUMENTS/\*\*.md)
3. Read registry.md to check current task status
4. Determine completed phases by checking which documents exist:
   - context.md → Task initialized
   - task-description.md → PM completed
   - visual-design-specification.md → UI/UX Designer completed
   - implementation-plan.md → Architect completed
   - tasks.md (no IN PROGRESS) → All development tasks completed
   - tasks.md (has IN PROGRESS) → Development in progress, continue with team-leader MODE 2
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
Step 2: Follow Orchestrator Guidance
The orchestrator will return structured guidance containing:

Current Status: Phase progress, task ID, current phase
NEXT ACTION: One of:
INVOKE_AGENT: Specific agent to call with full prompt
ASK_USER: User validation required (PM or Architect deliverable)
USER_CHOICE: User chooses QA agents (after developer)
COMPLETE: Ready for task completion
Your Actions:

If NEXT ACTION = INVOKE_AGENT:
Use the Task tool to invoke the specified agent
Use the exact prompt provided by orchestrator
Wait for agent to complete and return results
Go to Step 3
SPECIAL CASE - Team-Leader Iterative Pattern:

The team-leader agent operates in 3 distinct modes with specific invocation patterns:

MODE 1 (DECOMPOSITION) - Invoked ONCE at start

Creates tasks.md with N atomic tasks
All tasks initially marked IN PROGRESS
Returns to orchestrator after completion
MODE 2 (ASSIGNMENT + VERIFICATION) - Invoked N times (iteratively)

Assignment phase: Assigns next task to developer, updates tasks.md (task → ASSIGNED)
Return to orchestrator → Orchestrator guides you to invoke developer
Developer implements task, commits to git, updates tasks.md (task → COMPLETED)
Return to orchestrator → Orchestrator guides you back to team-leader MODE 2
Verification phase: Verifies git commit exists, file implementation correct, tasks.md status updated
Pattern repeats for each remaining task
This iterative pattern prevents hallucination through atomic verification
MODE 3 (COMPLETION) - Invoked ONCE at end

Final verification that all N tasks are COMPLETED
All git commits verified
Implementation complete and ready for QA
Returns to orchestrator after completion
CRITICAL - After Developer Task Completion:

When a developer agent returns with a task completion report:

DO NOT invoke another agent immediately
DO NOT ask user for validation
DO NOT make assumptions about next steps
IMMEDIATELY return to orchestrator with the developer's complete report
Orchestrator will guide you to invoke team-leader MODE 2 for verification
This ensures atomic verification prevents hallucination and maintains integrity
If NEXT ACTION = ASK_USER:
Read the deliverable file specified (task-description.md or implementation-plan.md)
Show the content to the user
Ask the user: "Please review this deliverable. Reply with 'APPROVED ✅' to proceed or provide feedback for corrections."
Wait for user response
Go to Step 3 with user's validation decision
If NEXT ACTION = USER_CHOICE:
Ask the user: "Development complete. Choose QA option: 'tester', 'reviewer', 'both' (parallel), or 'skip'"
Wait for user choice
If user chose "both", invoke senior-tester and code-reviewer in PARALLEL using multiple Task tool calls in single message
Go to Step 3 with user's choice and any agent results
If NEXT ACTION = COMPLETE:
Notify user that all chosen phases are complete
User handles git operations when ready (branch, commit, push, PR)
Go to Step 3 to invoke modernization-detector for Phase 8
Step 3: Return to Orchestrator
Invoke the workflow-orchestrator agent again using the Task tool with this prompt:

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
SPECIAL TEMPLATE - Team-Leader MODE 2 Verification Results:

When returning team-leader MODE 2 verification results to orchestrator, use this enhanced format:

You are the workflow-orchestrator agent. I'm returning with team-leader MODE 2 verification results.

## Previous Step

team-leader MODE 2 (VERIFICATION) completed

## Verification Results

- Git commit verification: [SHA] ✅ exists in repository
- File implementation verification: [files] ✅ implementation correct
- tasks.md status verification: Task [N] marked COMPLETED ✅
- Remaining tasks: [count] tasks still IN PROGRESS

## Context

- Task ID: [TASK_ID]
- Current Phase: Development (Team-Leader MODE 2 iteration [N] of [TOTAL])
- Completed tasks: [N]
- Remaining tasks: [M]

## What I Need

If tasks remain:

- NEXT ACTION: INVOKE_AGENT (team-leader MODE 2 for next assignment)
  If all tasks complete:
- NEXT ACTION: INVOKE_AGENT (team-leader MODE 3 for final completion)
  Step 4: Repeat Steps 2-3
  Continue the loop:

Orchestrator provides next guidance
You invoke recommended agent
You return results to orchestrator
Repeat until orchestrator status = WORKFLOW COMPLETE
Step 5: Final Report to User
When orchestrator returns WORKFLOW COMPLETE, summarize for the user:

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
   Key Execution Principles
   Iterative Coordination: Always return to orchestrator after each step
   Exact Prompts: Use the prompts provided by orchestrator verbatim
   Full Results: Return complete agent responses to orchestrator, not summaries
   User Validation: Ask user to validate PM and Architect deliverables
   User QA Choice: Let user dec
