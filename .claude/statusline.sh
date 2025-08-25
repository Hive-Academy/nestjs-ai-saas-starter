#!/bin/bash

# Windows-compatible statusline script without jq/bc dependencies

# Configurable threshold (default: 160K tokens = 80% of 200K context)
THRESHOLD=${CLAUDE_AUTO_COMPACT_THRESHOLD:-160000}

# Read JSON input from stdin
input=$(cat)

# Extract values using grep and sed (Windows Git Bash compatible)
MODEL_DISPLAY=$(echo "$input" | grep -o '"display_name":"[^"]*"' | head -1 | sed 's/"display_name":"\([^"]*\)"/\1/')
PROJECT_DIR=$(echo "$input" | grep -o '"project_dir":"[^"]*"' | head -1 | sed 's/"project_dir":"\([^"]*\)"/\1/')
CURRENT_DIR=$(echo "$input" | grep -o '"current_dir":"[^"]*"' | head -1 | sed 's/"current_dir":"\([^"]*\)"/\1/')
SESSION_ID=$(echo "$input" | grep -o '"session_id":"[^"]*"' | head -1 | sed 's/"session_id":"\([^"]*\)"/\1/')

# Get directory names
PROJECT_NAME=$(basename "$PROJECT_DIR" 2>/dev/null)
CURRENT_NAME=$(basename "$CURRENT_DIR" 2>/dev/null)

# Calculate tokens from transcript
TOTAL_TOKENS=0
if [ -n "$SESSION_ID" ] && [ "$SESSION_ID" != "null" ]; then
    TRANSCRIPT_PATH=$(find ~/.claude/projects -name "${SESSION_ID}.jsonl" 2>/dev/null | head -1)
    if [ -f "$TRANSCRIPT_PATH" ]; then
        # Estimate tokens (rough approximation: 1 token per 4 characters)
        TOTAL_CHARS=$(wc -c < "$TRANSCRIPT_PATH" 2>/dev/null)
        TOTAL_TOKENS=$((TOTAL_CHARS / 4))
    fi
fi

# Calculate percentage using bash arithmetic
PERCENTAGE=$((TOTAL_TOKENS * 100 / THRESHOLD))
if [ $PERCENTAGE -gt 100 ]; then
    PERCENTAGE=100
fi

# Format token count with K notation using bash arithmetic
if [ $TOTAL_TOKENS -ge 1000 ]; then
    TOKEN_K=$((TOTAL_TOKENS / 1000))
    TOKEN_DECIMAL=$(((TOTAL_TOKENS % 1000) / 100))
    TOKEN_DISPLAY="${TOKEN_K}.${TOKEN_DECIMAL}K"
else
    TOKEN_DISPLAY="$TOTAL_TOKENS"
fi

# Get username and hostname (Windows compatible)
USERNAME=${USERNAME:-$(whoami 2>/dev/null)}
HOSTNAME=${COMPUTERNAME:-$(hostname -s 2>/dev/null)}

# Fallback values if extraction fails
MODEL_DISPLAY=${MODEL_DISPLAY:-"Claude"}
CURRENT_NAME=${CURRENT_NAME:-"~"}
USERNAME=${USERNAME:-"user"}
HOSTNAME=${HOSTNAME:-"pc"}

# Output statusline matching PS1 style: green username@hostname : blue directory + Claude info
# Using printf for better compatibility
printf "\033[01;32m%s@%s\033[00m:\033[01;34m%s\033[00m [%s | 🪙 %s | %d%%]" "$USERNAME" "$HOSTNAME" "$CURRENT_NAME" "$MODEL_DISPLAY" "$TOKEN_DISPLAY" "$PERCENTAGE"