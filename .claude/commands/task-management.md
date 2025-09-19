# Task Management System for Sub-Agents

⚠️ **IMPORTANT**: This file contains DIRECT bash commands for sub-agents. Do NOT try to extract functions.

## 🎯 Sequential Task ID System

### ID Format

```
TASK_YYYY_NNN
```

**Components:**

- `TASK`: Fixed prefix
- `YYYY`: Current year (2025, 2026, etc.)
- `NNN`: Zero-padded sequential number (001, 002, 003...)

**Examples:**

- `TASK_2025_001` - First task of 2025
- `TASK_2025_025` - 25th task of 2025
- `TASK_2026_001` - First task of 2026

### Benefits

- ✅ **Globally Unique**: No collisions across years
- ✅ **Naturally Sequential**: Easy to predict next ID
- ✅ **Year Organization**: Natural archiving by year
- ✅ **Simple Generation**: Straightforward algorithm
- ✅ **Human Readable**: Clear chronological order

## 🗂️ Registry-First Task Management

### Core Principle

**The registry.md is the SINGLE SOURCE OF TRUTH for all task information.**

### Task Lifecycle

```mermaid
1. Check Registry → 2. Generate Next ID → 3. Create Registry Entry → 4. Create Task Folder → 5. Update Throughout Lifecycle → 6. Mark Complete in Registry
```

### Registry Schema

```markdown
| Task ID       | Title               | Status      | Type    | Priority | Effort | Created    | Updated    | Completed  | Branch      |
| ------------- | ------------------- | ----------- | ------- | -------- | ------ | ---------- | ---------- | ---------- | ----------- |
| TASK_2025_001 | User Authentication | 🔄 Active   | Feature | P1-High  | M      | 2025-01-15 | 2025-01-16 |            | feature/001 |
| TASK_2025_002 | Fix Login Bug       | ✅ Complete | Bug     | P0-Crit  | S      | 2025-01-16 | 2025-01-16 | 2025-01-16 | feature/002 |
```

## 🔧 Direct Commands for Sub-Agents

⚠️ **IMPORTANT**: Sub-agents should use these DIRECT commands instead of trying to extract functions.

### Get Next Task ID (Direct Command)

```bash
# Generate next sequential task ID
YEAR=$(date +%Y)
REGISTRY_FILE="task-tracking/registry.md"

if [ -f "$REGISTRY_FILE" ]; then
    HIGHEST_NUM=$(grep "TASK_${YEAR}_" "$REGISTRY_FILE" | \
        sed -n "s/.*TASK_${YEAR}_\([0-9]\{3\}\).*/\1/p" | \
        sort -n | tail -1)
    
    if [ -z "$HIGHEST_NUM" ]; then
        NEXT_NUM="001"
    else
        NEXT_NUM=$(printf "%03d" $((10#$HIGHEST_NUM + 1)))
    fi
else
    NEXT_NUM="001"
fi

NEXT_TASK_ID="TASK_${YEAR}_${NEXT_NUM}"
echo "📋 Next Task ID: $NEXT_TASK_ID"
```

### Create Registry Entry (Direct Command)

```bash
# Create new task entry in registry
TASK_ID="$1"  # e.g., TASK_2025_001
TITLE="$2"    # e.g., "Implement authentication"
TYPE="$3"     # e.g., "Feature"
PRIORITY="$4" # e.g., "P1-High"
EFFORT="$5"   # e.g., "M"

CREATED_DATE=$(date '+%Y-%m-%d')
CREATED_TIME=$(date '+%Y-%m-%d %H:%M:%S')
BRANCH_NAME="feature/${TASK_ID##*_}"

# Add to registry
echo "| $TASK_ID | $TITLE | 🔄 Active | $TYPE | $PRIORITY | $EFFORT | $CREATED_DATE | $CREATED_TIME | | $BRANCH_NAME |" >> task-tracking/registry.md
echo "✅ Registry entry created for $TASK_ID"
```

### Update Task Status (Direct Command)

```bash
# Update task status in registry
if [ -n "$TASK_ID" ] && [ -f "task-tracking/registry.md" ]; then
    NEW_STATUS="🔄 Active (Agent Name)"  # Change as needed
    UPDATED_TIME=$(date '+%Y-%m-%d %H:%M:%S')
    
    LC_ALL=C sed -i "s/\(^| $TASK_ID | [^|]*\) | [^|]* | \(.*\)$/\1 | $NEW_STATUS | \2/" task-tracking/registry.md
    echo "✅ Updated: $TASK_ID → $NEW_STATUS"
else
    echo "ℹ️ No task ID or registry file"
fi
```

### Complete Task (Direct Command)

```bash
# Mark task complete (for final agent only)
if [ -n "$TASK_ID" ] && [ -f "task-tracking/registry.md" ]; then
    COMPLETED_TIME=$(date '+%Y-%m-%d %H:%M:%S')
    COMPLETED_DATE=$(date '+%Y-%m-%d')
    
    LC_ALL=C sed -i "s/\(^| $TASK_ID | [^|]*\) | [^|]* | \(.*\)$/\1 | ✅ Complete | \2/" task-tracking/registry.md
    echo "✅ Completed: $TASK_ID"
else
    echo "ℹ️ No task ID or registry file"
fi
```

## 📊 Registry Management Commands (Direct)

### View Active Tasks (Direct Command)

```bash
# Show active tasks
if [ -f "task-tracking/registry.md" ]; then
    echo "📋 Active Tasks:"
    grep "🔄 Active" task-tracking/registry.md | head -20
else
    echo "⚠️ No registry found"
fi
```

### View Recent Tasks (Direct Command)

```bash
# Show recent tasks
if [ -f "task-tracking/registry.md" ]; then
    echo "📋 Recent Tasks:"
    tail -10 task-tracking/registry.md
else
    echo "⚠️ No registry found"
fi
```

### Task Statistics (Direct Command)

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

## 🔄 Sub-Agent Integration Points

### Task Creation (Orchestrator Only)

```bash
# 1. Generate next sequential ID (use direct command above)
# 2. Create registry entry FIRST (use direct command above)
# 3. Create task folder
mkdir -p "task-tracking/$TASK_ID"
# 4. Initialize git branch
git checkout -b "feature/${TASK_ID##*_}"
```

### Task Updates (All Sub-Agents)

```bash
# At start of agent work - update registry status
if [ -n "$TASK_ID" ] && [ -f "task-tracking/registry.md" ]; then
    AGENT_NAME="backend-developer"  # Change per agent
    LC_ALL=C sed -i "s/\(^| $TASK_ID | [^|]*\) | [^|]* | \(.*\)$/\1 | 🔄 Active ($AGENT_NAME) | \2/" task-tracking/registry.md
fi
```

### Task Completion (Final Agent Only)

```bash
# Mark complete in registry (use direct command above)
# No complex extraction - just direct sed commands
if [ "$FINAL_AGENT" = "true" ] && [ -n "$TASK_ID" ]; then
    # Use the complete task direct command from above
fi
```

## ⚠️ CRITICAL NOTES FOR SUB-AGENTS

### DO NOT Use Function Extraction

❌ **NEVER** try to extract functions from markdown files
❌ **NEVER** use complex sed patterns to extract bash code
❌ **NEVER** source functions from markdown

### DO Use Direct Commands

✅ **ALWAYS** use the direct bash commands shown above
✅ **ALWAYS** include `LC_ALL=C` with sed commands
✅ **ALWAYS** check if files exist before modifying
✅ **ALWAYS** use simple, direct patterns

### Registry Format Reference

```
| Task ID | Title | Status | Type | Priority | Effort | Created | Updated | Completed | Branch |
```

### Status Values

- `⏳ Pending` - Not started
- `🔄 Active` - In progress (with agent name)
- `✅ Complete` - Finished
- `❌ Failed` - Blocked/failed

### Debug Commands

```bash
# Check registry format
head -5 task-tracking/registry.md

# Check task exists
grep "$TASK_ID" task-tracking/registry.md

# Test sed command
echo "| TASK_2025_001 | Test | 🔄 Active | Feature |" | \
    LC_ALL=C sed "s/| TASK_2025_001 | \([^|]*\) | [^|]* |/| TASK_2025_001 | \1 | ✅ Complete |/"
```

This system provides SIMPLE, DIRECT commands that sub-agents can execute reliably without complex extraction mechanisms.
