# Agent Bootstrap System

## 🎯 Automatic Command Discovery & Loading

### Agent Initialization Pattern

Every agent should start with this bootstrap sequence:

````bash
# ===== AGENT BOOTSTRAP SEQUENCE =====
echo "🚀 Initializing Agent Environment..."

# 1. Source all available command utilities
for cmd_file in .claude/commands/*.md; do
    if [ -f "$cmd_file" ]; then
        # Extract bash functions from markdown command files
        sed -n '/```bash/,/```/p' "$cmd_file" | sed '1d;$d' > /tmp/$(basename "$cmd_file" .md).sh 2>/dev/null
        [ -s "/tmp/$(basename "$cmd_file" .md).sh" ] && source "/tmp/$(basename "$cmd_file" .md).sh" 2>/dev/null
    fi
done

# 2. Load task management functions specifically
if [ -f ".claude/commands/registry-utils.md" ]; then
    echo "📋 Loading task management functions..."
    # Extract and source registry utilities
    sed -n '/```bash/,/```/p' .claude/commands/registry-utils.md | sed '1d;$d' > /tmp/registry-utils.sh
    source /tmp/registry-utils.sh 2>/dev/null
    echo "✅ Task management functions loaded"
fi

# 3. Detect operation mode
if [ -d "task-tracking" ] && [ -n "$TASK_ID" ]; then
    OPERATION_MODE="ORCHESTRATION"
    echo "🎭 Mode: Orchestration (TASK_ID: $TASK_ID)"

    # Load task context if available
    if [ -f "task-tracking/$TASK_ID/context.md" ]; then
        echo "📖 Loading task context..."
        TASK_CONTEXT=$(cat "task-tracking/$TASK_ID/context.md")
    fi

    # Update registry status
    if type update_task_status >/dev/null 2>&1; then
        update_task_status "$TASK_ID" "🔄 Active"
        echo "📊 Registry updated"
    fi
else
    OPERATION_MODE="STANDALONE"
    echo "🎭 Mode: Standalone"
fi

# 4. Display available functions
echo "🛠️  Available Functions:"
echo "   - update_task_status(task_id, status)"
echo "   - complete_task(task_id)"
echo "   - get_registry_stats()"
echo ""

# ===== END BOOTSTRAP SEQUENCE =====
````

## 🔧 Function Auto-Discovery

### Extract Functions from Command Files

````bash
discover_agent_functions() {
    echo "🔍 Discovering available agent functions..."

    local functions_found=0

    # Scan all command files for bash functions
    for cmd_file in .claude/commands/*.md; do
        if [ -f "$cmd_file" ]; then
            local cmd_name=$(basename "$cmd_file" .md)
            echo "📄 Scanning: $cmd_name"

            # Extract function definitions
            local funcs=$(sed -n '/```bash/,/```/p' "$cmd_file" | grep -E '^[a-zA-Z_][a-zA-Z0-9_]*\(\)' | cut -d'(' -f1)

            if [ -n "$funcs" ]; then
                echo "   Functions: $funcs"
                functions_found=$((functions_found + 1))
            fi
        fi
    done

    echo "✅ Discovered $functions_found command files with functions"
}
````

## 📱 Agent Integration Pattern

### Standard Agent Header

Every agent should include this at the start:

`````markdown
## 🚀 Agent Initialization

**MANDATORY FIRST STEP**: Bootstrap agent environment

````bash
# Source the agent bootstrap system
if [ -f ".claude/commands/agent-bootstrap.md" ]; then
    # Extract and execute bootstrap sequence
    sed -n '/# ===== AGENT BOOTSTRAP SEQUENCE =====/,/# ===== END BOOTSTRAP SEQUENCE =====/p' .claude/commands/agent-bootstrap.md | \
        sed -n '/```bash/,/```/p' | sed '1d;$d' | bash
else
    echo "⚠️  Warning: Agent bootstrap not found - running in limited mode"
fi
````
`````

`````

### Agent-Specific Function Usage

After bootstrap, agents can use functions directly:

```bash
# Update task status (if in orchestration mode)
if [ "$OPERATION_MODE" = "ORCHESTRATION" ] && [ -n "$TASK_ID" ]; then
    update_task_status "$TASK_ID" "🔄 Active (Backend Development)"
fi

# Get registry statistics
if type get_registry_stats >/dev/null 2>&1; then
    get_registry_stats
fi

# Complete task (for final agent)
if [ "$FINAL_AGENT" = "true" ] && [ -n "$TASK_ID" ]; then
    complete_task "$TASK_ID"
fi
```

## 🎯 Command File Structure

### Standard Command File Format

All command files in `.claude/commands/` should follow this format:

````markdown
# Command Name

## Description

Brief description of what this command provides

## Functions

### function_name()

```bash
function_name() {
    # Function implementation
    echo "Function executed"
}
```
`````

### another_function()

```bash
another_function() {
    # Another function
    local param="$1"
    echo "Parameter: $param"
}
```

## Usage Examples

### Example 1

```bash
function_name
```

### Example 2

```bash
another_function "test"
```

````

## 🔄 Execution Flow

### Agent Startup Sequence

1. **Bootstrap Execution**: Agent runs bootstrap sequence
2. **Function Loading**: All command utilities are sourced
3. **Mode Detection**: Orchestration vs Standalone mode determined
4. **Context Loading**: Task context loaded if available
5. **Registry Update**: Initial status update if in orchestration mode
6. **Agent Work**: Agent performs its specific tasks
7. **Status Updates**: Registry updated throughout work
8. **Completion**: Final status update if last agent

### Error Handling

```bash
# Safe function execution with error handling
safe_execute() {
    local func_name="$1"
    shift

    if type "$func_name" >/dev/null 2>&1; then
        "$func_name" "$@"
    else
        echo "⚠️  Function '$func_name' not available"
    fi
}

# Usage
safe_execute update_task_status "$TASK_ID" "🔄 Active"
````

## 🎯 Benefits

### 1. Automatic Discovery

- Agents automatically discover all available functions
- No manual configuration required
- New commands are immediately available to all agents

### 2. Mode-Aware Operation

- Agents automatically detect orchestration vs standalone mode
- Registry updates only happen when appropriate
- Graceful degradation when functions aren't available

### 3. Consistent Interface

- All agents use the same bootstrap mechanism
- Consistent function naming and usage patterns
- Standardized error handling

### 4. Extensible Design

- Easy to add new command files
- Functions are automatically discovered and loaded
- No agent updates required for new commands

This system ensures agents can discover, load, and execute all available task management functions automatically!
