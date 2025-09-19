# Task Management System

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

## 🔧 Implementation Functions

### Get Next Task ID

```bash
get_next_task_id() {
    local year=$(date +%Y)
    local registry_file="task-tracking/registry.md"

    # Ensure registry exists
    if [ ! -f "$registry_file" ]; then
        create_registry_file
    fi

    # Find highest task number for current year
    local highest_num=$(grep "TASK_${year}_" "$registry_file" | \
        sed -n "s/.*TASK_${year}_\([0-9]\{3\}\).*/\1/p" | \
        sort -n | tail -1)

    # Calculate next number
    if [ -z "$highest_num" ]; then
        local next_num="001"
    else
        local next_num=$(printf "%03d" $((10#$highest_num + 1)))
    fi

    echo "TASK_${year}_${next_num}"
}
```

### Create Registry Entry

```bash
create_registry_entry() {
    local task_id="$1"
    local title="$2"
    local type="$3"
    local priority="$4"
    local effort="$5"
    local created_date=$(date '+%Y-%m-%d')
    local created_time=$(date '+%Y-%m-%d %H:%M:%S')
    local branch_name="feature/${task_id##*_}"

    # Add to registry
    echo "| $task_id | $title | 🔄 Active | $type | $priority | $effort | $created_date | $created_time | | $branch_name |" >> task-tracking/registry.md

    # Sort registry by task ID
    sort_registry
}
```

### Update Task Status

```bash
update_task_status() {
    local task_id="$1"
    local new_status="$2"
    local registry_file="task-tracking/registry.md"
    local updated_time=$(date '+%Y-%m-%d %H:%M:%S')

    # Update status and timestamp
    sed -i "s/| $task_id | \(.*\) | [^|]* | \(.*\) | \(.*\) | \(.*\) | \(.*\) | [^|]* | \(.*\) |/| $task_id | \1 | $new_status | \2 | \3 | \4 | \5 | $updated_time | \6 |/" "$registry_file"
}
```

### Complete Task

```bash
complete_task() {
    local task_id="$1"
    local registry_file="task-tracking/registry.md"
    local completed_time=$(date '+%Y-%m-%d %H:%M:%S')
    local completed_date=$(date '+%Y-%m-%d')

    # Update to completed status with completion timestamp
    sed -i "s/| $task_id | \(.*\) | [^|]* | \(.*\) | \(.*\) | \(.*\) | \(.*\) | \(.*\) | [^|]* | \(.*\) |/| $task_id | \1 | ✅ Complete | \2 | \3 | \4 | \5 | $completed_time | $completed_date | \6 |/" "$registry_file"
}
```

## 📊 Registry Management Commands

### View Active Tasks

```bash
view_active_tasks() {
    grep "🔄 Active" task-tracking/registry.md | head -20
}
```

### View Recent Tasks

```bash
view_recent_tasks() {
    tail -10 task-tracking/registry.md
}
```

### Task Statistics

```bash
task_stats() {
    local total=$(grep -c "TASK_" task-tracking/registry.md)
    local active=$(grep -c "🔄 Active" task-tracking/registry.md)
    local complete=$(grep -c "✅ Complete" task-tracking/registry.md)

    echo "Total Tasks: $total"
    echo "Active: $active"
    echo "Complete: $complete"
}
```

## 🔄 Agent Integration Points

### Task Creation (Orchestrator)

1. Generate next sequential ID
2. Create registry entry FIRST
3. Create task folder
4. Initialize git branch
5. Commit initial state

### Task Updates (All Agents)

1. Update registry status when starting work
2. Update registry timestamp during progress
3. Mark complete in registry when done
4. Never work outside registry tracking

### Task Completion (Final Agent)

1. Mark complete in registry
2. Set completion timestamp
3. Update final metrics
4. Archive if needed

## 🎯 Migration Strategy

### Current State Fix

1. Rename `TASK_CMD_010` → `TASK_2025_001`
2. Update registry with new format
3. Fix all references
4. Implement new ID generation

### Going Forward

1. All new tasks use sequential IDs
2. Registry-first workflow mandatory
3. Agents required to update registry
4. Regular registry maintenance

This creates a predictable, maintainable task management system that puts the registry at the center of all operations.
