# Standard Task Folder Structure

All agents MUST use this exact structure:

```
task-tracking/
  ${TASK_ID}/
    ├── task-description.md      # Created by Project Manager
    ├── research-report.md       # Created by Researcher (if needed)
    ├── implementation-plan.md   # Created by Architect
    ├── progress.md             # Created by PM, updated by ALL
    ├── code-review.md          # Created by Code Reviewer
    └── completion-report.md    # Created by Project Manager
```

## File Ownership

| File | Creator | Updaters |
|------|---------|----------|
| task-description.md | Project Manager | None |
| research-report.md | Researcher | None |
| implementation-plan.md | Architect | None |
| progress.md | Project Manager | ALL agents |
| code-review.md | Code Reviewer | None |
| completion-report.md | Project Manager | None |

## Usage
```bash
TASK_FOLDER="task-tracking/${TASK_ID}"
mkdir -p "${TASK_FOLDER}"
```