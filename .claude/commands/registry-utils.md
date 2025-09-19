# Registry Utilities for Sub-Agents

⚠️ **CRITICAL**: This file contains DIRECT bash commands for sub-agents. Do NOT try to extract functions.

## Direct Registry Commands

### Update Task Status (Direct Command)

```bash
# Update task status in registry - USE THIS EXACT PATTERN
if [ -n "$TASK_ID" ] && [ -f "task-tracking/registry.md" ]; then
    NEW_STATUS="🔄 Active (Agent Name)"  # Replace "Agent Name" with actual agent
    UPDATED_TIME=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Simple pattern - matches the first few columns only
    LC_ALL=C sed -i "s/\(^| $TASK_ID | [^|]*\) | [^|]* | \(.*\)$/\1 | $NEW_STATUS | \2/" task-tracking/registry.md
    echo "✅ Registry updated: $TASK_ID → $NEW_STATUS"
else
    echo "ℹ️ Standalone mode or no registry"
fi
```

### Mark Task Complete (Direct Command)

```bash
# Mark task complete - FOR FINAL AGENT ONLY
if [ -n "$TASK_ID" ] && [ -f "task-tracking/registry.md" ] && [ "$FINAL_AGENT" = "true" ]; then
    COMPLETED_TIME=$(date '+%Y-%m-%d %H:%M:%S')
    COMPLETED_DATE=$(date '+%Y-%m-%d')
    
    # Update status to complete
    LC_ALL=C sed -i "s/\(^| $TASK_ID | [^|]*\) | [^|]* | \(.*\)$/\1 | ✅ Complete | \2/" task-tracking/registry.md
    echo "✅ Task completed: $TASK_ID"
else
    echo "ℹ️ Not final agent or no task ID"
fi
```

### Get Registry Statistics (Direct Command)

```bash
# Get registry statistics
if [ -f "task-tracking/registry.md" ]; then
    TOTAL=$(grep -c "TASK_" task-tracking/registry.md 2>/dev/null || echo "0")
    ACTIVE=$(grep -c "🔄 Active" task-tracking/registry.md 2>/dev/null || echo "0")
    COMPLETE=$(grep -c "✅ Complete" task-tracking/registry.md 2>/dev/null || echo "0")
    PENDING=$(grep -c "⏳ Pending" task-tracking/registry.md 2>/dev/null || echo "0")
    
    echo "📊 Registry Stats: Total=$TOTAL, Active=$ACTIVE, Complete=$COMPLETE, Pending=$PENDING"
else
    echo "📊 No registry found"
fi
```

### Show Current Task Status (Direct Command)

```bash
# Display current task status
if [ -n "$TASK_ID" ] && [ -f "task-tracking/registry.md" ]; then
    TASK_LINE=$(grep "$TASK_ID" task-tracking/registry.md 2>/dev/null | head -1)
    if [ -n "$TASK_LINE" ]; then
        echo "📋 Current Status: $TASK_LINE"
    else
        echo "⚠️ Task $TASK_ID not found in registry"
    fi
else
    echo "⚠️ No task ID or registry file"
fi
```

## Sub-Agent Integration Patterns

### Mode Detection (Direct Command)

```bash
# Detect if we're in orchestration or standalone mode
if [ -d "task-tracking" ] && [ -n "$TASK_ID" ]; then
    echo "🎭 ORCHESTRATION MODE - Task: $TASK_ID"
    MODE="ORCHESTRATION"
else
    echo "🎭 STANDALONE MODE"
    MODE="STANDALONE"
fi
```

### Agent Initialization Template

```bash
# Complete initialization pattern for sub-agents
AGENT_NAME="backend-developer"  # Change per agent
echo "🤖 Agent: $AGENT_NAME starting..."

# 1. Detect mode
if [ -d "task-tracking" ] && [ -n "$TASK_ID" ]; then
    MODE="ORCHESTRATION"
    echo "📋 Task ID: $TASK_ID"
else
    MODE="STANDALONE"
    echo "📋 No task tracking"
fi

# 2. Update status (if orchestration)
if [ "$MODE" = "ORCHESTRATION" ] && [ -f "task-tracking/registry.md" ]; then
    LC_ALL=C sed -i "s/\(^| $TASK_ID | [^|]*\) | [^|]* | \(.*\)$/\1 | 🔄 Active ($AGENT_NAME) | \2/" task-tracking/registry.md
    echo "✅ Updated registry status"
fi

# 3. Load previous work (if orchestration)
if [ "$MODE" = "ORCHESTRATION" ] && [ -d "task-tracking/$TASK_ID" ]; then
    echo "📖 Loading previous work..."
    for file in task-tracking/$TASK_ID/*.md; do
        [ -f "$file" ] && echo "=== $(basename $file) ===" && cat "$file"
    done
fi

echo "💼 Starting $AGENT_NAME tasks..."
```

### Registry Operations

#### Orchestration Mode
- Sub-agents receive `$TASK_ID` environment variable
- Registry updates using direct sed commands
- Final agent marks task complete with `$FINAL_AGENT=true`

#### Standalone Mode  
- No `$TASK_ID` provided
- Sub-agents work without registry integration
- Direct results returned to user

### Critical Notes

⚠️ **DO NOT** try to extract these commands from markdown
⚠️ **DO NOT** use complex function definitions
⚠️ **ALWAYS** use `LC_ALL=C` with sed commands
⚠️ **ALWAYS** check file existence before operations

### Debug Commands

```bash
# Check registry format
head -5 task-tracking/registry.md

# Test task exists
grep "$TASK_ID" task-tracking/registry.md

# Test sed pattern
echo "| TASK_2025_001 | Test Title | 🔄 Active | Feature |" | \
    LC_ALL=C sed "s/| TASK_2025_001 | \([^|]*\) | [^|]* |/| TASK_2025_001 | \1 | ✅ Complete |/"
```

This provides SIMPLE, RELIABLE commands that sub-agents can execute without complex extraction mechanisms.

## Status Reference

- `⏳ Pending` - Not started
- `🔄 Active` - In progress (with agent name)
- `✅ Complete` - Finished
- `❌ Failed` - Blocked/failed
