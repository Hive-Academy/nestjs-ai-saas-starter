---
description: Main entry point for the orchestration workflow. Routes to specific phases based on task status.
---

# Orchestration Router

This workflow acts as the central router for the development process. It analyzes the current state of the task and directs you to the appropriate phase.

## Step 1: Determine Context

1.  **Analyze the Input**:

    - Is the user asking to start a **NEW** task? (e.g., "Implement feature X", "Fix bug Y")
    - Is the user asking to **CONTINUE** an existing task? (e.g., "TASK_2025_001", "Continue working on...")

2.  **If NEW Task**:

    - **Action**: Initialize the task.
    - **Procedure**:
      1.  Read `task-tracking/registry.md` to find the next available `TASK_ID` (increment the highest number).
      2.  Create a new directory: `task-tracking/TASK_ID/`.
      3.  Create `task-tracking/TASK_ID/context.md` with:
          - User Intent (the original request)
          - Task Type (Feature, Bugfix, Refactor, etc.)
          - Creation Date
      4.  Update `task-tracking/registry.md` with the new task and status "Active (Planning)".
    - **Next Step**: Proceed to **Step 2 (Routing)** with the new `TASK_ID`.

3.  **If CONTINUATION**:
    - **Action**: Identify the `TASK_ID` from the user's request.
    - **Procedure**:
      1.  Verify `task-tracking/TASK_ID/context.md` exists.
    - **Next Step**: Proceed to **Step 2 (Routing)**.

## Step 2: Route to Phase

Analyze the contents of the `task-tracking/TASK_ID/` directory to determine the next phase.

| Condition                                       | Status               | Target Workflow                            |
| :---------------------------------------------- | :------------------- | :----------------------------------------- |
| `task-description.md` is MISSING                | Planning Needed      | **Run Workflow**: `/phase-1-planning`      |
| `implementation-plan.md` is MISSING             | Architecture Needed  | **Run Workflow**: `/phase-1-planning`      |
| `tasks.md` is MISSING                           | Decomposition Needed | **Run Workflow**: `/phase-2-decomposition` |
| `tasks.md` has "PENDING" or "IN PROGRESS" tasks | Execution Needed     | **Run Workflow**: `/phase-3-execution`     |
| `tasks.md` has ALL "COMPLETE" tasks             | Completion Needed    | **Run Workflow**: `/phase-4-completion`    |

## Step 3: Execution

**INSTRUCTION**: Based on the table above, explicitly tell the user which workflow to run next.

**Example Output**:

> "Task `TASK_2025_005` is currently in the **Execution** phase.
> Please run the following command to proceed:
>
> `/phase-3-execution TASK_2025_005`"
