# Agent Bootstrap Guide

## 🚀 SIMPLE BOOTSTRAP FOR SUB-AGENTS

Sub-agents should use these **direct bash commands** instead of trying to extract functions from markdown:

### 1. Check Operation Mode

```bash
# Detect if we're in orchestration or standalone mode
if [ -d "task-tracking" ] && [ -n "$TASK_ID" ]; then
    echo "🎭 ORCHESTRATION MODE - Task: $TASK_ID"
else
    echo "🎭 STANDALONE MODE"
fi
```

### 2. Update Task Status (Direct Command)

```bash
# Update registry directly (no function needed)
if [ -n "$TASK_ID" ] && [ -f "task-tracking/registry.md" ]; then
    LC_ALL=C sed -i "s/\(^| $TASK_ID | [^|]*\) | [^|]* | \(.*\)$/\1 | 🔄 Active (Backend Dev) | \2/" task-tracking/registry.md
    echo "✅ Updated: $TASK_ID"
fi
```

### 3. Read Previous Work (Direct Command)

```bash
# Read all previous agent outputs
if [ -n "$TASK_ID" ] && [ -d "task-tracking/$TASK_ID" ]; then
    for file in task-tracking/$TASK_ID/*.md; do
        [ -f "$file" ] && echo "=== $(basename $file) ===" && cat "$file"
    done
fi
```

### 4. Complete Task (Direct Command)

```bash
# Mark task complete (for final agent only)
if [ -n "$TASK_ID" ] && [ -f "task-tracking/registry.md" ]; then
    DATE=$(date '+%Y-%m-%d')
    LC_ALL=C sed -i "s/\(^| $TASK_ID | [^|]*\) | [^|]* | \(.*\)$/\1 | ✅ Complete | \2/" task-tracking/registry.md
    echo "✅ Completed: $TASK_ID"
fi
```

## 📋 AGENT TEMPLATE

Sub-agents should use this template at the start:

```bash
#!/bin/bash

# 1. IDENTIFY MYSELF
AGENT_NAME="backend-developer"
echo "🤖 Agent: $AGENT_NAME starting..."

# 2. CHECK MODE
if [ -d "task-tracking" ] && [ -n "$TASK_ID" ]; then
    MODE="ORCHESTRATION"
    echo "📋 Task ID: $TASK_ID"
else
    MODE="STANDALONE"
    echo "📋 No task tracking"
fi

# 3. UPDATE STATUS (if orchestration)
if [ "$MODE" = "ORCHESTRATION" ] && [ -f "task-tracking/registry.md" ]; then
    LC_ALL=C sed -i "s/\(^| $TASK_ID | [^|]*\) | [^|]* | \(.*\)$/\1 | 🔄 Active ($AGENT_NAME) | \2/" task-tracking/registry.md
fi

# 4. LOAD CONTEXT (if orchestration)
if [ "$MODE" = "ORCHESTRATION" ] && [ -d "task-tracking/$TASK_ID" ]; then
    echo "📖 Loading previous work..."
    cat task-tracking/$TASK_ID/*.md 2>/dev/null
fi

# 5. DO YOUR WORK
echo "💼 Starting $AGENT_NAME tasks..."
```

## ⚠️ IMPORTANT NOTES

1. **NO FUNCTION EXTRACTION**: Sub-agents should NOT try to extract functions from markdown
2. **DIRECT COMMANDS ONLY**: Use the exact bash commands shown above
3. **LC_ALL=C**: Always use `LC_ALL=C` with sed to avoid encoding issues
4. **CHECK FILES EXIST**: Always check if files exist before trying to read/modify them
5. **SIMPLE IS BETTER**: Complex extraction mechanisms fail in sub-agent contexts

## 🔧 TROUBLESHOOTING

If registry updates fail:

```bash
# Debug: Check registry format
head -2 task-tracking/registry.md

# Debug: Check task exists
grep "$TASK_ID" task-tracking/registry.md

# Debug: Test sed command
echo "| TASK_2025_001 | Test | 🔄 Active | Feature |" | LC_ALL=C sed "s/| TASK_2025_001 | \([^|]*\) | [^|]* |/| TASK_2025_001 | \1 | ✅ Complete |/"
```

## 📚 REFERENCE

Registry format:

```
| Task ID | Title | Status | Type | Priority | Effort | Created | Updated | Completed | Branch |
```

Status values:

- `⏳ Pending` - Not started
- `🔄 Active` - In progress
- `✅ Complete` - Finished
- `❌ Failed` - Blocked/failed

This guide provides DIRECT, SIMPLE commands that sub-agents can execute without complex extraction mechanisms.
