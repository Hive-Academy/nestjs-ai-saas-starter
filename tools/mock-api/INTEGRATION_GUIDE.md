# Mock API Integration Guide

## Quick Start

### 1. Start the Mock API Server

```bash
# From project root
cd tools/mock-api

# Install dependencies (first time only)
npm install

# Start with default settings
node start-mock-api.js

# Or start with specific configuration
node start-mock-api.js --env development --scenario high_activity
```

### 2. Verify Server is Running

```bash
# Health check
curl http://localhost:3000/health

# Get agent list
curl http://localhost:3000/api/agents

# Check simulation status
curl http://localhost:3000/api/simulation/status
```

### 3. Connect Angular Application

The mock server provides the same WebSocket interface as the real backend:

```typescript
// No changes needed in AgentCommunicationService
// Just point to mock server URL: ws://localhost:3000
```

## Integration with Existing 3D Interface

### WebSocket Connection

The mock API server provides the exact same WebSocket interface as expected by `AgentCommunicationService`:

```typescript
// In your Angular service, update the WebSocket URL:
const MOCK_WEBSOCKET_URL = 'ws://localhost:3000';

// The service will receive the same message types:
// - agent_update
// - memory_update
// - tool_execution
// - system_status
```

### Message Format Compliance

All WebSocket messages match the existing TypeScript interfaces:

```typescript
// AgentUpdateMessage
{
  type: 'agent_update',
  timestamp: Date,
  data: {
    agentId: string,
    state: Partial<AgentState>
  }
}

// ToolExecutionMessage
{
  type: 'tool_execution',
  timestamp: Date,
  data: {
    agentId: string,
    toolExecution: ToolExecution
  }
}

// MemoryUpdateMessage
{
  type: 'memory_update',
  timestamp: Date,
  data: {
    contexts: MemoryContext[],
    operation: 'add' | 'update' | 'remove' | 'activate' | 'deactivate'
  }
}
```

## Mock Agent Population

The server initializes 8 realistic agents:

### Coordinators

- **Nova Prime** (agent_coordinator_001) - Primary workflow coordinator
- **Golden color, center position (0, 0, 0)**

### Specialists

- **Apex Engine** (agent_specialist_backend) - Backend development
- **Vector Interface** (agent_specialist_ui) - Frontend/UI development
- **Quantum Processor** (agent_specialist_data) - Data processing/ML

### Analysts

- **Insight Engine** (agent_analyst_system) - System analysis
- **Behavior Decoder** (agent_analyst_user) - User behavior analysis

### Creators

- **Dimension Forge** (agent_creator_003d) - 3D modeling/visualization
- **Narrative Synthesizer** (agent_creator_content) - Content generation

## Realistic Behavior Patterns

### State Transitions

- **Idle**: 3-8 seconds (base state)
- **Thinking**: 2-5 seconds (planning/analysis)
- **Executing**: 4-12 seconds (active work)
- **Waiting**: 1-4 seconds (coordination delays)
- **Error**: 2-3 seconds (error recovery)

### Tool Execution

- **10 different tools** with realistic execution times
- **Progress tracking** from 0-100% with incremental updates
- **Error scenarios** with appropriate error rates
- **Tool types**: web_search, data_analysis, code_generation, etc.

### Memory Operations

- **ChromaDB simulation**: 100-500ms delays for vector searches
- **Neo4j simulation**: 50-200ms delays for graph queries
- **Realistic memory contexts** matching MemoryContext interface
- **Relevance scoring** and memory type classification

### Multi-Agent Coordination

- **Workflow orchestration** with step-by-step coordination
- **Agent dependencies** and waiting states
- **Inter-agent communication** flows
- **Realistic coordination timing** (15-40 second intervals)

## Configuration Options

### Activity Levels

```bash
# Low activity (longer intervals, less frequent actions)
node start-mock-api.js --scenario minimal

# Medium activity (balanced for development)
node start-mock-api.js --scenario default

# High activity (intensive for stress testing)
node start-mock-api.js --scenario high_activity
```

### Error Testing

```bash
# Higher error rates for testing error handling
node start-mock-api.js --scenario error_testing
```

### Specialized Scenarios

```bash
# Focus on coordination workflows
node start-mock-api.js --scenario coordination_focus

# Heavy memory access patterns
node start-mock-api.js --scenario memory_intensive

# Creator-focused workflows
node start-mock-api.js --scenario creative_workflow
```

## API Endpoints

### REST API

- `GET /health` - Server health check
- `GET /api/agents` - List all agents
- `GET /api/agents/:id` - Get specific agent
- `GET /api/simulation/status` - Simulation status
- `GET /api/simulation/metrics` - Detailed metrics
- `POST /api/simulation/start` - Start simulation
- `POST /api/simulation/stop` - Stop simulation
- `POST /api/agents/:id/transition` - Force agent state change
- `POST /api/agents/:id/activity` - Trigger specific activity

### WebSocket Events

- **Incoming**: `agent_command`, `simulation_control`, `request_agent_data`
- **Outgoing**: `agent_update`, `memory_update`, `tool_execution`, `system_status`

## Environment Configuration

### Development

```bash
# Default development settings
NODE_ENV=development node start-mock-api.js
```

### Testing

```bash
# Optimized for testing (lower delays, minimal logging)
NODE_ENV=testing node start-mock-api.js --port 3002
```

### Custom CORS

```bash
# Custom CORS origins
node start-mock-api.js --cors "http://localhost:4200,http://localhost:3000"
```

## Transitioning to Real API

When backend integration issues are resolved:

1. **No code changes needed** in Angular components or services
2. **Update WebSocket URL** from `ws://localhost:3000` to real backend URL
3. **Environment variable switching** for seamless transition
4. **All interfaces remain identical** - zero refactoring required

## Troubleshooting

### Common Issues

**Port already in use:**

```bash
node start-mock-api.js --port 3002
```

**CORS errors:**

```bash
node start-mock-api.js --cors "http://localhost:4200"
```

**Connection issues:**

- Verify server is running: `curl http://localhost:3000/health`
- Check WebSocket URL in Angular application
- Ensure CORS origins include your Angular dev server URL

### Debug Mode

```bash
# Enable detailed logging
NODE_ENV=development node start-mock-api.js
```

### Manual Testing

```bash
# Test WebSocket connection with wscat (install with: npm install -g wscat)
wscat -c ws://localhost:3000
```

## Performance

- **Response times**: 50-500ms (realistic backend simulation)
- **Memory usage**: ~50-100MB (lightweight simulation)
- **Concurrent connections**: Supports multiple Angular dev instances
- **Activity scaling**: Configurable intensity levels for different testing needs

The mock API provides a comprehensive simulation environment that enables full development and testing of the 3D Agent Constellation interface while backend integration issues are resolved.
