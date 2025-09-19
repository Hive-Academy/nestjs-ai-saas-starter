# Registry Utilities

## Registry Update Functions for Agents

### Core Functions

```bash
# Update Task Status
update_task_status() {
    local task_id="$1"
    local new_status="$2"
    local registry_file="task-tracking/registry.md"
    local updated_time=$(date '+%Y-%m-%d %H:%M:%S')

    if [ -f "$registry_file" ] && [ -n "$task_id" ]; then
        # Update status and timestamp in registry
        sed -i "s/| $task_id | \(.*\) | [^|]* | \(.*\) | \(.*\) | \(.*\) | \(.*\) | [^|]* | \(.*\) | \(.*\) |/| $task_id | \1 | $new_status | \2 | \3 | \4 | \5 | $updated_time | \6 | \7 |/" "$registry_file"
        echo "✅ Registry updated: $task_id → $new_status"
    elif [ -z "$task_id" ]; then
        echo "ℹ️  Standalone mode: No registry update (no task ID)"
    else
        echo "⚠️  Registry file not found: $registry_file"
    fi
}

# Mark Task Complete
complete_task() {
    local task_id="$1"
    local registry_file="task-tracking/registry.md"
    local completed_time=$(date '+%Y-%m-%d %H:%M:%S')
    local completed_date=$(date '+%Y-%m-%d')

    if [ -f "$registry_file" ] && [ -n "$task_id" ]; then
        # Update to completed status with completion timestamp
        sed -i "s/| $task_id | \(.*\) | [^|]* | \(.*\) | \(.*\) | \(.*\) | \(.*\) | [^|]* | [^|]* | \(.*\) |/| $task_id | \1 | ✅ Complete | \2 | \3 | \4 | \5 | $completed_time | $completed_date | \6 |/" "$registry_file"
        echo "✅ Task completed in registry: $task_id"
    elif [ -z "$task_id" ]; then
        echo "ℹ️  Standalone mode: No task completion tracking"
    else
        echo "⚠️  Registry file not found: $registry_file"
    fi
}

# Registry Statistics
get_registry_stats() {
    local registry_file="task-tracking/registry.md"

    if [ -f "$registry_file" ]; then
        local total=$(grep -c "TASK_" "$registry_file" 2>/dev/null || echo "0")
        local active=$(grep -c "🔄 Active" "$registry_file" 2>/dev/null || echo "0")
        local complete=$(grep -c "✅ Complete" "$registry_file" 2>/dev/null || echo "0")
        local pending=$(grep -c "⏳ Pending" "$registry_file" 2>/dev/null || echo "0")

        echo "📊 Registry Stats: Total=$total, Active=$active, Complete=$complete, Pending=$pending"
    else
        echo "📊 Registry Stats: No registry found"
    fi
}

# Display Current Task Status
show_task_status() {
    local task_id="$1"
    local registry_file="task-tracking/registry.md"

    if [ -f "$registry_file" ] && [ -n "$task_id" ]; then
        local task_line=$(grep "$task_id" "$registry_file" 2>/dev/null)
        if [ -n "$task_line" ]; then
            echo "📋 Current Status: $task_line"
        else
            echo "⚠️  Task $task_id not found in registry"
        fi
    fi
}
```

## Integration Points

### Orchestration Mode

- Registry updates handled automatically by orchestration workflow
- Agents receive TASK_ID and can update status
- Final agent marks task complete

### Standalone Mode

- No registry updates (TASK_ID not provided)
- Agents work without registry integration
- Direct results returned to user

### Agent Detection Pattern

```bash
# Each agent can detect mode and update registry accordingly
if [ -n "$TASK_ID" ] && [ -f "task-tracking/registry.md" ]; then
    echo "Orchestration mode: Will update registry"
    update_task_status "$TASK_ID" "🔄 Active ([Agent Name] working)"
else
    echo "Standalone mode: No registry updates"
fi
```
