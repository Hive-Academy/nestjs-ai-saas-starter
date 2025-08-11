# NestJS-LangGraph Integration Examples

This directory contains clean, working examples demonstrating how to use the NestJS-LangGraph integration library.

## 📚 Available Examples

### 1. **simple-test-workflow.ts**
Basic workflow demonstrating:
- @Workflow and @Node decorators
- Simple state management
- Basic routing with @Edge decorators

### 2. **streaming-workflow-example.ts**
Advanced streaming example showing:
- @StreamToken for token-level streaming
- @StreamEvent for event-based updates
- @StreamProgress for progress tracking
- WebSocket integration

### 3. **phase2-demo-workflow.ts**
Comprehensive example featuring:
- All Phase 2 decorators
- Tool autodiscovery with @Tool
- HITL approval with @RequiresApproval
- Complex routing patterns

### 4. **hitl-approval-test.ts**
Human-in-the-Loop example demonstrating:
- Confidence-based approval routing
- Risk assessment
- Approval chains
- Timeout handling

## 🚀 Running Examples

```bash
# Run a specific example
nx run integrations-nestjs-langgraph:example --file=simple-test-workflow

# Test all examples
nx test integrations-nestjs-langgraph --testPathPattern=examples
```

## 📝 Creating New Examples

When adding new examples:
1. Keep them self-contained and runnable
2. Include clear comments explaining concepts
3. Follow the decorator patterns established in Phase 1 & 2
4. Test files go in `src/__tests__/`, not here

## ⚠️ Note

These are **examples** for learning, not production code. For production implementations, see the agent-system workflows in `libs/agent-system/backend/src/lib/workflows/`.