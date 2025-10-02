# Task Context for TASK_2025_001

## User Intent
Systematically fix all dev-brand-api agent architecture issues:
1) Workflow options not passing to DeclarativeWorkflowBase
2) Implement type-safe metadata with generics
3) Add smart defaults to Agent decorator
4) Add tool validation
5) Test all fixes across 3 agents (GitHubCodeAnalyzer, PersonalBrandStrategist, ContentCreator)

## Conversation Summary
- User identified systematic issues in agent architecture through analysis
- Created comprehensive analysis document (AGENT_ARCHITECTURE_ANALYSIS.md)
- User wants to use agents extensively to address all issues
- Focus on fixing core architectural problems, not just documenting them
- All 3 agents need to be updated with the fixes
- Implementation should be done systematically with agent orchestration

## Technical Context
- Branch: feature/001
- Created: 2025-01-02
- Task Type: Feature
- Priority: P1-High
- Effort Estimate: L

## Key Issues Identified

### 1. Workflow Options Not Passing
- Metadata key mismatch between @Agent decorator and DeclarativeWorkflowBase
- @Agent writes to 'workflow:config', but getWorkflowMetadata() reads from WORKFLOW_METADATA_KEY
- Solution: Either fix the decorator or make base class read from both keys

### 2. Metadata Typing Issues
- Current pattern uses unsafe type assertions everywhere
- No compile-time type checking for metadata properties
- Solution: Implement TypedWorkflowAgentState<TMetadata> with generic metadata types

### 3. Agent Decorator Boilerplate
- 15+ properties required, very verbose
- Solution: Add smart defaults (derive id from class name, auto-detect type, sensible workflow defaults)

### 4. Tool Registration Gaps
- No validation between @Agent.tools array and actual @Tool decorators
- Manual synchronization required
- Solution: Add runtime validation in CentralRegistryService

### 5. Testing
- All fixes need to be tested across all 3 agents
- Ensure backward compatibility where appropriate

## Important Notes
- Use agents systematically through orchestration
- Fix issues in order of priority (workflow options → type safety → defaults → validation)
- Each fix should be tested before moving to next one
- Update all 3 agents to use new patterns

## Expected Outcomes
- Workflow configurations properly passed from @Agent to DeclarativeWorkflowBase
- Type-safe metadata access throughout all agents
- 80% reduction in decorator boilerplate
- Runtime validation for tool registration
- All agents working correctly with new architecture
