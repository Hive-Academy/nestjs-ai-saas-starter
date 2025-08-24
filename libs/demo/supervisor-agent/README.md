# Supervisor Agent Module

A powerful demonstration of multi-agent coordination using the NestJS-LangGraph infrastructure with all 7 child modules.

## Overview

This module showcases the full power of our 4-day infrastructure investment by implementing a supervisor agent workflow that leverages:

- **CheckpointModule**: State persistence and recovery
- **MemoryModule**: Contextual memory management
- **MultiAgentModule**: Agent coordination and routing
- **MonitoringModule**: Production observability
- **TimeTravelModule**: Workflow debugging
- **StreamingModule**: Real-time token/event/progress streaming
- **HITLModule**: Human-in-the-loop approval workflows

## Configuration

The module configuration has been externalized to `src/lib/config/supervisor-agent.config.ts` for better maintainability.

### Environment Variables

All configuration is controlled via environment variables. See the root `.env.example` file for a complete list of available options.

Key variables:

- `OPENROUTER_API_KEY`: Required - Your OpenRouter API key
- `OPENROUTER_MODEL`: LLM model to use (default: `openai/gpt-3.5-turbo`)
- `CHECKPOINT_ENABLED`: Enable state checkpointing (default: `true`)
- `MEMORY_ENABLED`: Enable memory module (default: `true`)
- `MULTI_AGENT_ENABLED`: Enable multi-agent coordination (default: `true`)
- `MONITORING_ENABLED`: Enable monitoring (default: `true`)
- `TIME_TRAVEL_ENABLED`: Enable time travel debugging (default: `true`)
- `STREAMING_ENABLED`: Enable streaming (default: `true`)
- `HITL_ENABLED`: Enable human-in-the-loop (default: `true`)

## Usage

```typescript
import { SupervisorAgentModule } from '@libs/demo/supervisor-agent';

@Module({
  imports: [
    SupervisorAgentModule,
    // Other modules...
  ],
})
export class AppModule {}
```

## Architecture

The supervisor agent follows the Day 4 implementation plan:

1. **Leverages NestjsLanggraphModule.forRoot()** - Not recreating infrastructure
2. **Uses DeclarativeWorkflowBase** - Decorator-based workflow definition
3. **Integrates all 7 child modules** - Full infrastructure utilization
4. **Implements proper patterns** - Supervisor pattern for agent coordination

## Workflows

### SupervisorCoordinationWorkflow

The main workflow that coordinates multiple agents:

- **Supervisor Node**: Routes tasks to appropriate agents
- **Researcher Node**: Performs research with memory integration
- **Analyzer Node**: Analyzes data with monitoring
- **Approval Node**: Human-in-the-loop approval with risk assessment

## Running the Demo

1. Copy `.env.example` to `.env` in the root directory
2. Set your `OPENROUTER_API_KEY`
3. Start services: `npm run dev:services`
4. Run the demo: `npx nx serve nestjs-ai-saas-starter-demo`

## Integration with Frontend

The supervisor agent can be exposed to the frontend application through:

1. **REST API**: Standard NestJS controllers
2. **WebSocket**: Real-time streaming via port 3001
3. **GraphQL**: If configured in your application

## Monitoring

With monitoring enabled, you can track:

- Workflow execution metrics
- Agent performance
- Error rates and latency
- Resource usage

## Debugging

Time travel debugging allows you to:

- Capture workflow snapshots
- Replay executions
- Inspect state at any point
- Debug complex agent interactions

## Building

Run `nx build supervisor-agent` to build the library.

## Best Practices

1. **Always use the infrastructure** - Don't recreate what's already built
2. **Configure via environment** - Keep configuration external
3. **Monitor production** - Use the monitoring module
4. **Enable checkpointing** - For resilience and debugging
5. **Implement HITL** - For critical decisions

## References

- [Day 4 Implementation Plan](../../../task-tracking/TASK_INT_007/day-4-implementation-plan-revised.md)
- [Course Correction](../../../task-tracking/TASK_INT_007/day-4-course-correction.md)
- [NestJS-LangGraph Documentation](../../nestjs-langgraph/CLAUDE.md)