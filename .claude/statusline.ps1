# PowerShell statusline for Claude Code on Windows
# Handles input from Claude Code and displays status information

param(
    [Parameter(ValueFromPipeline=$true)]
    [string]$InputData
)

# Read all input if coming from pipeline
if (-not $InputData) {
    $InputData = $input | Out-String
}

try {
    $data = $InputData | ConvertFrom-Json -ErrorAction Stop
    
    # Basic info with fallbacks
    $currentDir = $null
    if ($data.workspace -and $data.workspace.current_dir) { 
        $currentDir = $data.workspace.current_dir 
    } elseif ($data.cwd) { 
        $currentDir = $data.cwd 
    } else { 
        $currentDir = "unknown" 
    }
    
    # Replace home directory with tilde
    $homePath = $env:USERPROFILE
    if ($homePath -and $currentDir.StartsWith($homePath)) {
        $currentDir = $currentDir.Replace($homePath, "~")
    }
    
    # Get other properties with null checks
    $modelName = if ($data.model -and $data.model.display_name) { $data.model.display_name } else { "Claude" }
    $modelVersion = if ($data.model -and $data.model.version -and $data.model.version -ne "null") { $data.model.version } else { $null }
    $sessionId = if ($data.session_id -and $data.session_id -ne "null") { $data.session_id } else { $null }
    $ccVersion = if ($data.version -and $data.version -ne "null") { $data.version } else { $null }
    $outputStyle = if ($data.output_style -and $data.output_style.name -and $data.output_style.name -ne "null") { $data.output_style.name } else { $null }
    
    # Git branch detection
    $gitBranch = $null
    try {
        $gitDir = git rev-parse --git-dir 2>$null
        if ($LASTEXITCODE -eq 0) {
            $gitBranch = git branch --show-current 2>$null
            if ([string]::IsNullOrWhiteSpace($gitBranch)) {
                $gitBranch = git rev-parse --short HEAD 2>$null
            }
        }
    } catch {
        # Git not available or not in a git repo
    }
    
    # Get cost breakdown directly from data object
    $totalCost = $null
    $totalDuration = $null
    $apiDuration = $null
    $linesAdded = $null
    $linesRemoved = $null
    
    if ($data.cost) {
        if ($data.cost.total_cost_usd -and $data.cost.total_cost_usd -ne "null") {
            $totalCost = [math]::Round([double]$data.cost.total_cost_usd, 4)
        }
        if ($data.cost.total_duration_ms -and $data.cost.total_duration_ms -ne "null") {
            $totalDuration = [math]::Round([double]$data.cost.total_duration_ms / 1000, 1)
        }
        if ($data.cost.total_api_duration_ms -and $data.cost.total_api_duration_ms -ne "null") {
            $apiDuration = [math]::Round([double]$data.cost.total_api_duration_ms / 1000, 1)
        }
        if ($data.cost.total_lines_added -and $data.cost.total_lines_added -ne "null") {
            $linesAdded = [int]$data.cost.total_lines_added
        }
        if ($data.cost.total_lines_removed -and $data.cost.total_lines_removed -ne "null") {
            $linesRemoved = [int]$data.cost.total_lines_removed
        }
    }
    
    # Context window calculation
    $contextPct = $null
    $contextBar = $null
    $maxContext = 200000  # Default to 200K
    
    # Determine max context based on model name
    switch -Regex ($modelName) {
        "Opus|opus" { $maxContext = 200000 }
        "Sonnet|sonnet" { $maxContext = 200000 }
        "Haiku 3\.5|haiku 3\.5|Haiku 4|haiku 4" { $maxContext = 200000 }
        "Claude 3 Haiku|claude 3 haiku" { $maxContext = 100000 }
        default { $maxContext = 200000 }
    }
    
    # Try to get token usage from session file
    if ($sessionId) {
        $projectDir = $currentDir.Replace("~", $env:USERPROFILE).Replace("\", "-").Replace("/", "-").TrimStart("-")
        $sessionFile = Join-Path $env:USERPROFILE ".claude\projects\-$projectDir\$sessionId.jsonl"
        
        if (Test-Path $sessionFile -ErrorAction SilentlyContinue) {
            try {
                $lines = Get-Content $sessionFile -Tail 20 -ErrorAction Stop
                foreach ($line in ($lines | Select-Object -Last 5)) {
                    try {
                        $entry = $line | ConvertFrom-Json -ErrorAction Stop
                        if ($entry.message -and $entry.message.usage) {
                            $inputTokens = 0
                            if ($entry.message.usage.input_tokens) {
                                $inputTokens += [int]$entry.message.usage.input_tokens
                            }
                            if ($entry.message.usage.cache_read_input_tokens) {
                                $inputTokens += [int]$entry.message.usage.cache_read_input_tokens
                            }
                            
                            if ($inputTokens -gt 0) {
                                $contextUsedPct = [math]::Round(($inputTokens * 100) / $maxContext)
                                $contextRemainingPct = 100 - $contextUsedPct
                                $contextPct = "$contextRemainingPct%"
                                
                                # Create progress bar
                                $barWidth = 10
                                $filled = [math]::Floor($contextRemainingPct * $barWidth / 100)
                                $empty = $barWidth - $filled
                                if ($filled -lt 0) { $filled = 0 }
                                if ($filled -gt $barWidth) { $filled = $barWidth }
                                if ($empty -lt 0) { $empty = 0 }
                                
                                $contextBar = "[" + ("=" * $filled) + ("-" * $empty) + "]"
                                break
                            }
                        }
                    } catch {
                        # Continue to next line
                    }
                }
            } catch {
                # Error reading session file
            }
        }
    }
    
    # Build statusline - Line 1
    $line1Parts = @()
    $line1Parts += "Model: $modelName"
    if ($modelVersion) { $line1Parts += "Version: $modelVersion" }
    
    $line1 = $line1Parts -join " | "
    Write-Host $line1
    
    # Line 2: Context and Cost
    $line2Parts = @()
    
    # Context remaining (only show if available)
    if ($contextPct) {
        $line2Parts += "Context: $contextPct $contextBar"
    }
    
    # Cost breakdown
    if ($totalCost) {
        $line2Parts += "Cost: `$$totalCost"
    }
    if ($totalDuration -and $apiDuration) {
        $line2Parts += "Time: ${totalDuration}s (API: ${apiDuration}s)"
    } elseif ($totalDuration) {
        $line2Parts += "Time: ${totalDuration}s"
    }
    
    # Only show line 2 if we have content
    if ($line2Parts.Count -gt 0) {
        $line2 = $line2Parts -join " | "
        Write-Host $line2
    }
    
    # Line 3: Code changes (if any)
    if ($linesAdded -or $linesRemoved) {
        $line3Parts = @()
        if ($linesAdded) { $line3Parts += "+$linesAdded lines" }
        if ($linesRemoved) { $line3Parts += "-$linesRemoved lines" }
        $line3 = "Code Changes: " + ($line3Parts -join ", ")
        Write-Host $line3
    }
    
    # Add separator line
    Write-Host ("-" * 60)
    
} catch {
    # Fallback if JSON parsing fails - show basic info
    $currentLocation = Get-Location
    Write-Host "Dir: $currentLocation | Model: Claude"
    Write-Host "Error parsing Claude Code data: $_"
}